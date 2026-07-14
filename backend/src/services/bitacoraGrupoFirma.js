import { query } from '../db/pool.js';
import { createBitacoraGrupoFirmaToken, buildFirmaUrl } from './signingToken.js';
import {
  hasFirmaAceptacion,
  loadFuncionarioDestinatario,
  saveBitacoraFirma,
  assertPuedeFirmarBitacora,
} from './bitacoraFirma.js';
import { getBiteClie, isSemanaClienteCerrada } from './bitacoraSemanaClienteEstado.js';
import { fetchBitacoraSemanaCliente, buildBitacoraPdf, bitacoraPdfFileNameForFuncionario } from './bitacoraPdf.js';

export function normalizeFuncionarioKey(nombre) {
  const n = String(nombre || '').trim().toLowerCase().replace(/\s+/g, ' ');
  return n || '__sin_funcionario__';
}

export function displayFuncionarioKey(key) {
  return key === '__sin_funcionario__' ? '(Sin funcionario)' : key;
}

export function groupSoportesByFuncionario(soportes) {
  const groups = new Map();
  for (const row of soportes || []) {
    const key = normalizeFuncionarioKey(row.funcionario);
    if (!groups.has(key)) {
      groups.set(key, {
        funcionarioKey: key,
        funcionario: row.funcionario || '',
        items: [],
      });
    }
    groups.get(key).items.push(row);
  }
  return [...groups.values()].sort((a, b) =>
    displayFuncionarioKey(a.funcionarioKey).localeCompare(displayFuncionarioKey(b.funcionarioKey), 'es'),
  );
}

export async function loadSoportesTerminadosSemanaCliente(cnsbite, cliente) {
  const res = await query(
    `SELECT b.*, c.nombrecliente
     FROM bita b
     LEFT JOIN clie c ON c.codigo = b.cliente
     WHERE b.cnsbite = $1 AND b.cliente = $2
       AND LOWER(COALESCE(b.estado, '')) = 'terminado'
     ORDER BY b.fecha ASC NULLS LAST, b.cnssoporte ASC`,
    [cnsbite, cliente],
  );
  return res.rows;
}

export async function evaluarEnvioFirmasSemanaCliente(cnsbite, cliente) {
  const clie = (await getBiteClie(cnsbite, cliente));
  if (isSemanaClienteCerrada(clie?.estado)) {
    const err = new Error('La semana de este cliente ya está cerrada');
    err.status = 409;
    throw err;
  }

  const soportes = await loadSoportesTerminadosSemanaCliente(cnsbite, cliente);
  if (!soportes.length) {
    const err = new Error('No hay soportes terminados para enviar a firma');
    err.status = 400;
    throw err;
  }

  const pendientes = soportes.filter((s) => !hasFirmaAceptacion(s));
  const groups = groupSoportesByFuncionario(soportes);

  return { soportes, pendientes, groups };
}

export function createBitacoraGrupoFirmaLink({ cnsbite, cliente, funcionarioKey, cnssoportes }) {
  const token = createBitacoraGrupoFirmaToken({ cnsbite, cliente, funcionarioKey, cnssoportes });
  return buildFirmaUrl(token);
}

export async function buildGrupoPdfAttachment(cnsbite, cliente, group) {
  const data = await fetchBitacoraSemanaCliente(cnsbite, cliente);
  if (!data) {
    const err = new Error('Semana o cliente no encontrado');
    err.status = 404;
    throw err;
  }
  const cnssSet = new Set(group.items.map((i) => i.cnssoporte));
  const soportes = data.soportes.filter((s) => cnssSet.has(s.cnssoporte));
  if (!soportes.length) {
    const err = new Error('No hay soportes para el PDF del funcionario');
    err.status = 404;
    throw err;
  }
  const content = await buildBitacoraPdf({ encabezado: data.encabezado, soportes });
  return {
    filename: bitacoraPdfFileNameForFuncionario(data.encabezado, group.funcionario || displayFuncionarioKey(group.funcionarioKey)),
    content,
    cnssoportes: soportes.map((s) => s.cnssoporte),
  };
}

export async function loadFuncionarioByKey(cliente, funcionarioKey, sampleRow) {
  if (funcionarioKey === '__sin_funcionario__') return null;
  const fakeBita = { cliente, funcionario: sampleRow?.funcionario || displayFuncionarioKey(funcionarioKey) };
  return loadFuncionarioDestinatario(fakeBita);
}

function normalizeDocumento(value) {
  return String(value || '').trim().replace(/\D/g, '');
}

export async function documentoAutorizadoGrupo({ cnsbite, cliente, funcionarioKey, cnssoportes }, documento) {
  const rows = await query(
    `SELECT * FROM bita WHERE cnsbite = $1 AND cliente = $2 AND cnssoporte = ANY($3::varchar[])`,
    [cnsbite, cliente, cnssoportes],
  );
  if (!rows.rows.length) {
    return { autorizado: false, motivo: 'No se encontraron soportes para firmar' };
  }
  const sample = rows.rows[0];
  const func = await loadFuncionarioByKey(cliente, funcionarioKey, sample);
  if (!func?.documento) {
    return {
      autorizado: false,
      motivo: 'No hay funcionario registrado con documento para validar la firma.',
    };
  }
  const ingresado = normalizeDocumento(documento);
  const esperado = normalizeDocumento(func.documento);
  if (!ingresado || ingresado !== esperado) {
    return {
      autorizado: false,
      motivo: 'El documento ingresado no corresponde al funcionario autorizado para firmar.',
    };
  }
  return { autorizado: true, funcionario: func };
}

export async function getBitacoraGrupoFirmaEstado(payload) {
  const { cnsbite, cliente, funcionarioKey, cnssoportes } = payload;
  const clie = await getBiteClie(cnsbite, cliente);
  if (isSemanaClienteCerrada(clie?.estado)) {
    return {
      puedeFirmar: false,
      bloqueoMotivo: 'La semana de soporte ya fue cerrada y no se puede firmar.',
      soportes: [],
      pendientes: 0,
      funcionario: displayFuncionarioKey(funcionarioKey),
      cliente,
      cnsbite,
    };
  }

  const res = await query(
    `SELECT b.*, c.nombrecliente
     FROM bita b
     LEFT JOIN clie c ON c.codigo = b.cliente
     WHERE b.cnsbite = $1 AND b.cliente = $2 AND b.cnssoporte = ANY($3::varchar[])
     ORDER BY b.fecha ASC NULLS LAST, b.cnssoporte ASC`,
    [cnsbite, cliente, cnssoportes],
  );

  const soportes = res.rows.map((row) => {
    const firmado = hasFirmaAceptacion(row);
    return {
      cnssoporte: row.cnssoporte,
      fecha: row.fecha,
      fechar: row.fechar,
      clase: row.clase,
      solicitud: row.solicitud,
      respuesta: row.respuesta,
      observaciones: row.observaciones,
      firmado,
      firma_fecha: row.firma_fecha || null,
      puedeFirmar: !firmado,
    };
  });

  const pendientes = soportes.filter((s) => s.puedeFirmar).length;

  return {
    cliente: res.rows[0]?.nombrecliente || cliente,
    cnsbite,
    funcionario: res.rows[0]?.funcionario || displayFuncionarioKey(funcionarioKey),
    funcionarioKey,
    soportes,
    pendientes,
    puedeFirmar: pendientes > 0,
    bloqueoMotivo: pendientes === 0 ? 'Todos los soportes de este enlace ya fueron firmados.' : '',
  };
}

export async function validarDocumentoFirmanteGrupo(payload, documento) {
  const docCheck = await documentoAutorizadoGrupo(payload, documento);
  if (!docCheck.autorizado) {
    return { valido: false, motivo: docCheck.motivo };
  }
  const estado = await getBitacoraGrupoFirmaEstado(payload);
  if (!estado.puedeFirmar) {
    return { valido: false, motivo: estado.bloqueoMotivo || 'No hay soportes pendientes de firma.' };
  }
  return { valido: true };
}

export async function saveBitacoraGrupoFirma(payload, firma, { documento, cnssoporte, firmarTodos = false }) {
  const docCheck = await documentoAutorizadoGrupo(payload, documento);
  if (!docCheck.autorizado) {
    const err = new Error(docCheck.motivo || 'Documento no autorizado');
    err.status = 403;
    throw err;
  }

  const estado = await getBitacoraGrupoFirmaEstado(payload);
  if (!estado.puedeFirmar && !firmarTodos && !cnssoporte) {
    const err = new Error(estado.bloqueoMotivo || 'No hay soportes pendientes de firma');
    err.status = 409;
    throw err;
  }

  const allowed = new Set(payload.cnssoportes.map(String));
  let targets = [];

  if (firmarTodos) {
    targets = estado.soportes.filter((s) => s.puedeFirmar).map((s) => s.cnssoporte);
  } else if (cnssoporte) {
    if (!allowed.has(String(cnssoporte))) {
      const err = new Error('Soporte no incluido en este enlace de firma');
      err.status = 400;
      throw err;
    }
    const item = estado.soportes.find((s) => s.cnssoporte === cnssoporte);
    if (!item?.puedeFirmar) {
      const err = new Error('Este soporte ya fue firmado');
      err.status = 409;
      throw err;
    }
    targets = [cnssoporte];
  } else {
    const err = new Error('Indique el soporte a firmar o use firmar todos');
    err.status = 400;
    throw err;
  }

  const saved = [];
  for (const id of targets) {
    await assertPuedeFirmarBitacora(id, { documentoIngresado: documento });
    const row = await saveBitacoraFirma(id, firma, { documentoIngresado: documento });
    saved.push(row);
  }

  return {
    firmados: saved.length,
    cnssoportes: saved.map((r) => r.cnssoporte),
    firma_fecha: saved[0]?.firma_fecha || null,
  };
}
