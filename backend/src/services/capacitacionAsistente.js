import { query } from '../db/pool.js';

/** Prefijo en rasistd.documento para participantes que son técnicos de soporte (tabla soport). */
export const SOPORTE_ASISTENTE_PREFIX = 'SOP#';

export function soporteAsistenteDocumento(codigo) {
  return `${SOPORTE_ASISTENTE_PREFIX}${String(codigo || '').trim()}`;
}

export function isSoporteAsistenteDocumento(documento) {
  return String(documento || '').startsWith(SOPORTE_ASISTENTE_PREFIX);
}

export function soporteCodigoFromDocumento(documento) {
  if (!isSoporteAsistenteDocumento(documento)) return '';
  return String(documento).slice(SOPORTE_ASISTENTE_PREFIX.length);
}

export async function findSoporteActivoPorDocumento(documento) {
  const doc = String(documento || '').trim();
  if (!doc) return null;
  const res = await query(
    `SELECT codigo, nombre, documento, estado FROM soport
     WHERE documento = $1`,
    [doc],
  );
  return res.rows[0] || null;
}

export async function applySoporteAsistenteFromDocumento(body, documento) {
  const sop = await findSoporteActivoPorDocumento(documento);
  if (!sop) return false;
  if (String(sop.estado || '').toUpperCase() !== 'A') {
    const err = new Error('El técnico de soporte no está activo');
    err.status = 400;
    throw err;
  }
  if (!body.nombres) body.nombres = sop.nombre;
  if (!body.cargo) body.cargo = 'Técnico de soporte';
  return true;
}

export function documentoAsistenteDesdeSoporte(sop) {
  const doc = String(sop?.documento || '').trim();
  if (doc) return doc;
  return soporteAsistenteDocumento(sop?.codigo);
}

export function isSoporteParticipanteRow(row) {
  if (String(row?.cargo || '').trim() === 'Técnico de soporte') return true;
  return isSoporteAsistenteDocumento(row?.documento);
}
