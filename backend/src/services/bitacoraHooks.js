import {
  getSemanaByCnsbite,
  validateBitacoraFechas,
  assertDateInSemana,
  toDateKey,
} from './bitacoraSemana.js';
import { ensureBiteClie, getBiteClie, isSemanaClienteCerrada } from './bitacoraSemanaClienteEstado.js';
import { hasFirmaAceptacion } from './bitacoraFirma.js';
import { query } from '../db/pool.js';
import { normalizeImagenesSoporte } from './bitacoraImagenes.js';

async function loadBitaGuard(cnssoporte) {
  const res = await query(
    'SELECT cnssoporte, cnsbite, cliente, estado, firma, firma_fecha FROM bita WHERE cnssoporte = $1',
    [cnssoporte],
  );
  return res.rows[0] || null;
}

async function assertBitaModificable(cnssoporte) {
  const row = await loadBitaGuard(cnssoporte);
  if (!row) return null;

  if (hasFirmaAceptacion(row)) {
    const err = new Error('El soporte ya fue firmado y no se puede modificar');
    err.status = 409;
    throw err;
  }

  if (row.cnsbite && row.cliente) {
    const clie = await getBiteClie(row.cnsbite, row.cliente);
    if (isSemanaClienteCerrada(clie?.estado)) {
      const err = new Error('La semana de este cliente está cerrada');
      err.status = 409;
      throw err;
    }
  }

  return row;
}

function defaultFechaEnSemana(fechaini, fechafin) {
  const ini = toDateKey(fechaini);
  const fin = toDateKey(fechafin);
  const today = toDateKey(new Date());
  if (today >= ini && today <= fin) return today;
  return ini;
}

export async function beforeBitacoraCreate(body) {
  delete body.respuesta;
  delete body.fechar;
  body.estado = 'Proceso';
  if (!body.clase) body.clase = 'Soporte';
  if (!body.medio) body.medio = 'Remoto';
  if (body.imagenes_soporte !== undefined) {
    body.imagenes_soporte = normalizeImagenesSoporte(body.imagenes_soporte);
  }

  if (!body.cnsbite) return;

  const sem = await getSemanaByCnsbite(body.cnsbite);
  if (!sem) return;

  if (!body.fecha) {
    body.fecha = defaultFechaEnSemana(sem.fechaini, sem.fechafin);
  } else {
    body.fecha = toDateKey(body.fecha);
  }
  assertDateInSemana(body.fecha, sem, 'La fecha del soporte');

  if (body.cliente) {
    const clie = await getBiteClie(body.cnsbite, body.cliente);
    if (isSemanaClienteCerrada(clie?.estado)) {
      const err = new Error('La semana de este cliente está cerrada; no se pueden agregar soportes');
      err.status = 409;
      throw err;
    }
    await ensureBiteClie(body.cnsbite, body.cliente);
  }
}

export async function beforeBitacoraUpdate(body, ids) {
  delete body.respuesta;
  delete body.estado;
  delete body.fechar;
  delete body.firma;
  delete body.firma_fecha;

  if (body.imagenes_soporte !== undefined) {
    body.imagenes_soporte = normalizeImagenesSoporte(body.imagenes_soporte);
  }

  const existing = await assertBitaModificable(ids[0]);
  if (!existing) return;

  if ((existing.estado || '').toLowerCase() === 'terminado') {
    const err = new Error('El soporte está cerrado y no se puede modificar');
    err.status = 409;
    throw err;
  }

  const cnsbite = body.cnsbite || existing.cnsbite;
  await validateBitacoraFechas(body, cnsbite, ids[0]);
}

export async function beforeBitacoraDelete(ids) {
  await assertBitaModificable(ids[0]);
}
