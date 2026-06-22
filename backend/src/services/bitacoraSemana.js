import { query } from '../db/pool.js';
import { hasFirmaAceptacion } from './bitacoraFirma.js';

/** Normaliza a YYYY-MM-DD sin desfase por zona horaria. */
export function toDateKey(value) {
  if (value == null || value === '') return '';
  const s = String(value).trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;

  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';

  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${mo}-${day}`;
}

/** Convierte YYYY-MM-DD a Date local al mediodía (evita saltos al guardar en TIMESTAMP). */
export function parseDateForDb(value) {
  const key = toDateKey(value);
  if (!key) return new Date();
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

export function isDateInSemana(dateVal, fechaini, fechafin) {
  if (!dateVal || !fechaini || !fechafin) return true;
  const d = toDateKey(dateVal);
  const ini = toDateKey(fechaini);
  const fin = toDateKey(fechafin);
  if (!d || !ini || !fin) return true;
  return d >= ini && d <= fin;
}

export async function getSemanaByCnsbite(cnsbite) {
  if (!cnsbite) return null;
  const res = await query(
    `SELECT t.fechaini, t.fechafin, t.idsemana
     FROM bite b
     INNER JOIN tsema t ON t.idsemana = b.idsemana
     WHERE b.cnsbite = $1`,
    [cnsbite],
  );
  return res.rows[0] || null;
}

export async function getSemanaForBitacora(cnssoporte) {
  const res = await query(
    `SELECT b.cnsbite, b.fecha, b.fechar, b.estado, b.respuesta, b.firma, b.firma_fecha, t.fechaini, t.fechafin, t.idsemana
     FROM bita b
     LEFT JOIN bite be ON be.cnsbite = b.cnsbite
     LEFT JOIN tsema t ON t.idsemana = be.idsemana
     WHERE b.cnssoporte = $1`,
    [cnssoporte],
  );
  return res.rows[0] || null;
}

export function assertDateInSemana(dateVal, sem, label) {
  if (!sem?.fechaini || !sem?.fechafin) return;
  if (!isDateInSemana(dateVal, sem.fechaini, sem.fechafin)) {
    const err = new Error(
      `${label} debe estar entre la semana ${sem.idsemana || ''} (${formatDay(sem.fechaini)} - ${formatDay(sem.fechafin)})`,
    );
    err.status = 400;
    throw err;
  }
}

function formatDay(value) {
  return toDateKey(value);
}

export async function validateBitacoraFechas(body, cnsbite, cnssoporte = null) {
  let biteKey = cnsbite;
  if (!biteKey && cnssoporte) {
    const row = await query('SELECT cnsbite, fecha FROM bita WHERE cnssoporte = $1', [cnssoporte]);
    if (!row.rows.length) return;
    biteKey = row.rows[0].cnsbite;
    if (body.fecha === undefined) body.fecha = row.rows[0].fecha;
  }
  const sem = await getSemanaByCnsbite(biteKey);
  if (!sem) return;

  if (body.fecha !== undefined && body.fecha !== null && body.fecha !== '') {
    body.fecha = toDateKey(body.fecha);
    assertDateInSemana(body.fecha, sem, 'La fecha del soporte');
  }
  if (body.fechar !== undefined && body.fechar !== null && body.fechar !== '') {
    body.fechar = toDateKey(body.fechar);
    assertDateInSemana(body.fechar, sem, 'La fecha de cierre');
  }
}

export async function cerrarBitacora(cnssoporte, { respuesta, fechar }) {
  const bita = await getSemanaForBitacora(cnssoporte);
  if (!bita) {
    const err = new Error('Registro no encontrado');
    err.status = 404;
    throw err;
  }
  if ((bita.estado || '').toLowerCase() === 'terminado') {
    const err = new Error('El soporte ya está cerrado');
    err.status = 409;
    throw err;
  }
  if (hasFirmaAceptacion(bita)) {
    const err = new Error('El soporte ya fue firmado y no se puede modificar');
    err.status = 409;
    throw err;
  }
  if (!String(respuesta || '').trim()) {
    const err = new Error('La respuesta es obligatoria para cerrar el soporte');
    err.status = 400;
    throw err;
  }

  const closeDate = fechar ? parseDateForDb(fechar) : parseDateForDb(toDateKey(new Date()));
  assertDateInSemana(bita.fecha, bita, 'La fecha del soporte');
  assertDateInSemana(closeDate, bita, 'La fecha de cierre');

  const res = await query(
    `UPDATE bita
     SET respuesta = $1, fechar = $2, estado = 'Terminado'
     WHERE cnssoporte = $3
     RETURNING *`,
    [String(respuesta).trim(), closeDate, cnssoporte],
  );
  return res.rows[0];
}
