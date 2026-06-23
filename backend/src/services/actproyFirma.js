import { query } from '../db/pool.js';
import { createActproyFirmaToken, buildFirmaUrl } from './signingToken.js';

export function hasFirmaCliente(row) {
  return Boolean(row?.firma_cli && String(row.firma_cli).trim()) || Boolean(row?.firma_cli_fecha);
}

export async function loadActproyContext(consecutivo) {
  const res = await query(
    `SELECT a.*, c.nombrecliente
     FROM actproy a
     LEFT JOIN clie c ON c.codigo = a.cliente
     WHERE a.consecutivo = $1`,
    [consecutivo],
  );
  return res.rows[0] || null;
}

export function createActproyFirmaLink(consecutivo) {
  return buildFirmaUrl(createActproyFirmaToken({ consecutivo }));
}

export async function getActproyFirmaEstado(consecutivo) {
  const row = await loadActproyContext(consecutivo);
  if (!row) return null;

  let puedeFirmar = true;
  let bloqueoMotivo = '';
  if (hasFirmaCliente(row)) {
    puedeFirmar = false;
    bloqueoMotivo = 'Este informe ya fue firmado por el cliente y no se puede volver a firmar.';
  }
  return { row, puedeFirmar, bloqueoMotivo };
}

export async function saveActproyFirma(consecutivo, firma, nombre) {
  const estado = await getActproyFirmaEstado(consecutivo);
  if (!estado) {
    const err = new Error('Informe no encontrado');
    err.status = 404;
    throw err;
  }
  if (!estado.puedeFirmar) {
    const err = new Error(estado.bloqueoMotivo || 'No se puede firmar este informe');
    err.status = 409;
    throw err;
  }
  const res = await query(
    `UPDATE actproy
     SET firma_cli = $1, firma_cli_fecha = NOW(), firma_cli_nombre = $2
     WHERE consecutivo = $3
     RETURNING consecutivo, firma_cli_fecha`,
    [firma, nombre || null, consecutivo],
  );
  return res.rows[0];
}
