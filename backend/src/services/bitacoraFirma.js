import { query } from '../db/pool.js';
import { createBitacoraFirmaToken, buildFirmaUrl } from './signingToken.js';
import { getBiteClie, isSemanaClienteCerrada } from './bitacoraSemanaClienteEstado.js';

export function hasFirmaAceptacion(bita) {
  return Boolean(bita?.firma && String(bita.firma).trim()) || Boolean(bita?.firma_fecha);
}

export async function loadFuncionarioDestinatario(bita) {
  if (!bita?.cliente || !bita?.funcionario) return null;
  const res = await query(
    `SELECT nombre, email, documento, cargo, tratamiento
     FROM clief
     WHERE codigo = $1
       AND LOWER(TRIM(nombre)) = LOWER(TRIM($2))
       AND email IS NOT NULL AND TRIM(email) <> ''
     ORDER BY documento
     LIMIT 1`,
    [bita.cliente, bita.funcionario],
  );
  return res.rows[0] || null;
}

export async function loadBitacoraFirmaContext(cnssoporte) {
  const res = await query(
    `SELECT b.*, c.nombrecliente
     FROM bita b
     LEFT JOIN clie c ON c.codigo = b.cliente
     WHERE b.cnssoporte = $1`,
    [cnssoporte],
  );
  return res.rows[0] || null;
}

export function createBitacoraFirmaLink(cnssoporte) {
  const token = createBitacoraFirmaToken({ cnssoporte });
  return buildFirmaUrl(token);
}

function normalizeDocumento(value) {
  return String(value || '').trim().replace(/\D/g, '');
}

export async function documentoAutorizadoFirmar(cnssoporte, documento) {
  const row = await loadBitacoraFirmaContext(cnssoporte);
  if (!row) {
    return { autorizado: false, motivo: 'Registro no encontrado' };
  }
  const func = await loadFuncionarioDestinatario(row);
  if (!func?.documento) {
    return {
      autorizado: false,
      motivo: 'No hay funcionario autorizado configurado para firmar este soporte.',
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

export async function validarDocumentoFirmanteBitacora(cnssoporte, documento) {
  const docCheck = await documentoAutorizadoFirmar(cnssoporte, documento);
  if (!docCheck.autorizado) {
    return { valido: false, motivo: docCheck.motivo };
  }
  const estado = await getBitacoraFirmaEstado(cnssoporte);
  if (!estado) {
    return { valido: false, motivo: 'Registro no encontrado' };
  }
  if (!estado.puedeFirmar) {
    return { valido: false, motivo: estado.bloqueoMotivo || 'No se puede firmar este soporte.' };
  }
  return { valido: true };
}

export async function getBitacoraFirmaEstado(cnssoporte) {
  const row = await loadBitacoraFirmaContext(cnssoporte);
  if (!row) return null;

  let bloqueoMotivo = '';
  let puedeFirmar = true;

  if (hasFirmaAceptacion(row)) {
    puedeFirmar = false;
    bloqueoMotivo = 'Este soporte ya fue firmado y no se puede volver a firmar.';
  } else if (row.cnsbite && row.cliente) {
    const clie = await getBiteClie(row.cnsbite, row.cliente);
    if (isSemanaClienteCerrada(clie?.estado)) {
      puedeFirmar = false;
      bloqueoMotivo = 'La semana de soporte ya fue cerrada y no se puede firmar.';
    }
  }

  return { row, puedeFirmar, bloqueoMotivo };
}

export async function assertPuedeFirmarBitacora(cnssoporte, { documentoIngresado } = {}) {
  if (documentoIngresado !== undefined && documentoIngresado !== null) {
    const docCheck = await documentoAutorizadoFirmar(cnssoporte, documentoIngresado);
    if (!docCheck.autorizado) {
      const err = new Error(docCheck.motivo || 'Documento no autorizado para firmar');
      err.status = 403;
      throw err;
    }
  }

  const estado = await getBitacoraFirmaEstado(cnssoporte);
  if (!estado) {
    const err = new Error('Registro no encontrado');
    err.status = 404;
    throw err;
  }
  if (!estado.puedeFirmar) {
    const err = new Error(estado.bloqueoMotivo || 'No se puede firmar este soporte');
    err.status = 409;
    throw err;
  }
  return estado.row;
}

export async function saveBitacoraFirma(cnssoporte, firma, options = {}) {
  await assertPuedeFirmarBitacora(cnssoporte, options);
  const res = await query(
    `UPDATE bita
     SET firma = $1, firma_fecha = NOW()
     WHERE cnssoporte = $2
     RETURNING cnssoporte, firma_fecha`,
    [firma, cnssoporte],
  );
  if (!res.rows.length) {
    const err = new Error('Registro no encontrado');
    err.status = 404;
    throw err;
  }
  return res.rows[0];
}
