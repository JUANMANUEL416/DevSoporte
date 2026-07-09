import { query } from '../db/pool.js';
import { createActreunFirmaToken, buildFirmaUrl } from './signingToken.js';

export const ESTADOS_ACTREUN = {
  ABIERTA: 'Abierta',
  EN_FIRMA: 'En firma',
  TERMINADA: 'Terminada',
};

export function isActaEditable(estado) {
  return (estado || ESTADOS_ACTREUN.ABIERTA) === ESTADOS_ACTREUN.ABIERTA;
}

export function hasFirma(asistente) {
  return Boolean(asistente?.firma && String(asistente.firma).trim()) || Boolean(asistente?.firma_fecha);
}

export async function loadActreunContext(consecutivo) {
  const res = await query(
    `SELECT a.*, c.nombrecliente
     FROM actreun a
     LEFT JOIN clie c ON c.codigo = a.cliente
     WHERE a.consecutivo = $1`,
    [consecutivo],
  );
  return res.rows[0] || null;
}

export async function loadAsistenteActreun(consecutivo, item) {
  const res = await query(
    `SELECT d.*, a.fecha, a.cliente, a.estado, a.desarrollo,
            c.nombrecliente,
            f.email AS funcionario_email,
            s.email AS soporte_email
     FROM actreund d
     JOIN actreun a ON a.consecutivo = d.consecutivo
     LEFT JOIN clie c ON c.codigo = a.cliente
     LEFT JOIN clief f ON f.codigo = a.cliente AND f.documento = d.documento
     LEFT JOIN soport s ON (
       (d.documento LIKE 'SOP#%' AND s.codigo = SUBSTRING(d.documento FROM 5))
       OR (s.documento IS NOT NULL AND TRIM(s.documento) <> '' AND s.documento = d.documento)
     )
     WHERE d.consecutivo = $1 AND d.item = $2`,
    [consecutivo, item],
  );
  const row = res.rows[0] || null;
  if (row) {
    row.funcionario_email = row.funcionario_email || row.soporte_email || null;
  }
  return row;
}

export function createActreunFirmaLink(consecutivo, item, documento) {
  return buildFirmaUrl(createActreunFirmaToken({ consecutivo, item, documento }));
}

export async function countAsistentes(consecutivo) {
  const res = await query(
    'SELECT COUNT(*)::int AS total FROM actreund WHERE consecutivo = $1',
    [consecutivo],
  );
  return res.rows[0]?.total ?? 0;
}

export async function asistentesPendientesFirma(consecutivo) {
  const res = await query(
    `SELECT COUNT(*)::int AS total FROM actreund
     WHERE consecutivo = $1 AND (firma IS NULL OR TRIM(firma) = '')`,
    [consecutivo],
  );
  return res.rows[0]?.total ?? 0;
}

export async function getActreunFirmaEstado(consecutivo, item) {
  const row = await loadAsistenteActreun(consecutivo, item);
  if (!row) return null;

  let puedeFirmar = true;
  let bloqueoMotivo = '';
  const estado = row.estado || ESTADOS_ACTREUN.ABIERTA;

  if (estado === ESTADOS_ACTREUN.ABIERTA) {
    puedeFirmar = false;
    bloqueoMotivo = 'La reunión aún no ha sido finalizada. Espere a que el organizador cierre el acta.';
  } else if (estado === ESTADOS_ACTREUN.TERMINADA) {
    puedeFirmar = false;
    bloqueoMotivo = 'El acta ya está terminada.';
  } else if (!row.documento || !String(row.documento).trim()) {
    puedeFirmar = false;
    bloqueoMotivo = 'El asistente no tiene documento registrado; contacte al organizador.';
  } else if (hasFirma(row)) {
    puedeFirmar = false;
    bloqueoMotivo = 'Este acta ya fue firmada por usted.';
  }

  return { row, puedeFirmar, bloqueoMotivo, requiereDocumento: true };
}

export async function validarDocumentoFirmanteActreun(consecutivo, item, documentoIngresado) {
  const estado = await getActreunFirmaEstado(consecutivo, item);
  if (!estado) {
    return { valido: false, motivo: 'Asistente no encontrado' };
  }
  if (!estado.puedeFirmar && estado.row.estado !== ESTADOS_ACTREUN.EN_FIRMA) {
    return { valido: false, motivo: estado.bloqueoMotivo || 'No puede firmar' };
  }
  const esperado = String(estado.row.documento || '').trim();
  const ingresado = String(documentoIngresado || '').trim();
  if (!ingresado) {
    return { valido: false, motivo: 'Ingrese su número de documento' };
  }
  if (esperado !== ingresado) {
    return {
      valido: false,
      motivo: 'El documento no coincide con el registrado para este asistente',
    };
  }
  return { valido: true, nombres: estado.row.nombre };
}

export async function tryMarkTerminada(consecutivo) {
  const row = await loadActreunContext(consecutivo);
  if (!row || row.estado !== ESTADOS_ACTREUN.EN_FIRMA) return row;

  const total = await countAsistentes(consecutivo);
  if (total === 0) return row;

  const pendientes = await asistentesPendientesFirma(consecutivo);
  if (pendientes > 0) return row;

  const res = await query(
    `UPDATE actreun SET estado = $1 WHERE consecutivo = $2 AND estado = $3 RETURNING *`,
    [ESTADOS_ACTREUN.TERMINADA, consecutivo, ESTADOS_ACTREUN.EN_FIRMA],
  );
  return res.rows[0] || row;
}

export async function saveActreunFirma(consecutivo, item, firma, documentoIngresado) {
  const validacion = await validarDocumentoFirmanteActreun(consecutivo, item, documentoIngresado);
  if (!validacion.valido) {
    const err = new Error(validacion.motivo || 'Documento no válido');
    err.status = 403;
    throw err;
  }

  const estado = await getActreunFirmaEstado(consecutivo, item);
  if (!estado) {
    const err = new Error('Asistente no encontrado');
    err.status = 404;
    throw err;
  }
  if (!estado.puedeFirmar) {
    const err = new Error(estado.bloqueoMotivo || 'No se puede firmar');
    err.status = 409;
    throw err;
  }

  const res = await query(
    `UPDATE actreund SET firma = $1, firma_fecha = NOW()
     WHERE consecutivo = $2 AND item = $3
     RETURNING consecutivo, item, nombre, firma_fecha`,
    [firma, consecutivo, item],
  );
  if (!res.rows.length) {
    const err = new Error('Asistente no encontrado');
    err.status = 404;
    throw err;
  }

  await tryMarkTerminada(consecutivo);
  return res.rows[0];
}

export async function finalizarActreun(consecutivo) {
  const row = await loadActreunContext(consecutivo);
  if (!row) {
    const err = new Error('Acta no encontrada');
    err.status = 404;
    throw err;
  }
  if (!isActaEditable(row.estado)) {
    const err = new Error(`El acta ya está en estado «${row.estado}»`);
    err.status = 409;
    throw err;
  }
  const total = await countAsistentes(consecutivo);
  if (total === 0) {
    const err = new Error('Registre al menos un asistente antes de finalizar la reunión');
    err.status = 400;
    throw err;
  }
  const sinDoc = await query(
    `SELECT COUNT(*)::int AS total FROM actreund
     WHERE consecutivo = $1 AND (documento IS NULL OR TRIM(documento) = '')`,
    [consecutivo],
  );
  if (sinDoc.rows[0]?.total > 0) {
    const err = new Error('Todos los asistentes deben tener número de documento para la firma');
    err.status = 400;
    throw err;
  }

  const res = await query(
    `UPDATE actreun SET estado = $1 WHERE consecutivo = $2 AND estado = $3 RETURNING *`,
    [ESTADOS_ACTREUN.EN_FIRMA, consecutivo, ESTADOS_ACTREUN.ABIERTA],
  );
  return res.rows[0];
}

export async function getActreunResumenFirmas(consecutivo) {
  const row = await loadActreunContext(consecutivo);
  if (!row) return null;
  const total = await countAsistentes(consecutivo);
  const pendientes = await asistentesPendientesFirma(consecutivo);
  return {
    consecutivo,
    estado: row.estado,
    total,
    firmados: total - pendientes,
    pendientes,
    todasFirmadas: total > 0 && pendientes === 0,
  };
}
