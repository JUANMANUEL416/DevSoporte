import { query } from '../db/pool.js';

const ESTADOS_FINALES = new Set(['Cerrada', 'Anulada']);

export async function getCapacitacionEstado(cnscapacita) {
  const capRes = await query('SELECT cnscapacita, estado, cliente FROM rasist WHERE cnscapacita = $1', [
    cnscapacita,
  ]);
  return capRes.rows[0] || null;
}

export async function countAsistentes(cnscapacita) {
  const res = await query(
    'SELECT COUNT(*)::int AS total FROM rasistd WHERE cnscapacita = $1',
    [cnscapacita],
  );
  return res.rows[0]?.total ?? 0;
}

export async function asistentesPendientesFirma(cnscapacita) {
  const res = await query(
    `SELECT COUNT(*)::int AS total FROM rasistd
     WHERE cnscapacita = $1 AND (firma IS NULL OR TRIM(firma) = '')`,
    [cnscapacita],
  );
  return res.rows[0]?.total ?? 0;
}

export async function evaluarCambioEstado(cnscapacita, nuevoEstado) {
  const cap = await getCapacitacionEstado(cnscapacita);
  if (!cap) {
    const err = new Error('Capacitación no encontrada');
    err.status = 404;
    throw err;
  }

  const actual = cap.estado || 'Abierta';
  if (ESTADOS_FINALES.has(actual)) {
    const err = new Error(`La capacitación ya está ${actual.toLowerCase()}`);
    err.status = 409;
    throw err;
  }

  if (nuevoEstado !== 'Cerrada' && nuevoEstado !== 'Anulada') {
    const err = new Error('Estado no válido');
    err.status = 400;
    throw err;
  }

  const total = await countAsistentes(cnscapacita);

  if (nuevoEstado === 'Anulada') {
    if (total > 0) {
      const err = new Error('Solo se puede anular si no tiene participantes');
      err.status = 400;
      throw err;
    }
  }

  if (nuevoEstado === 'Cerrada') {
    if (total === 0) {
      const err = new Error('Debe registrar al menos un participante antes de cerrar');
      err.status = 400;
      throw err;
    }
    const pendientes = await asistentesPendientesFirma(cnscapacita);
    if (pendientes > 0) {
      const err = new Error('Todos los participantes deben firmar antes de cerrar');
      err.status = 400;
      throw err;
    }
  }

  return cap;
}

export async function cambiarEstadoCapacitacion(cnscapacita, nuevoEstado) {
  await evaluarCambioEstado(cnscapacita, nuevoEstado);
  const res = await query(
    'UPDATE rasist SET estado = $1 WHERE cnscapacita = $2 RETURNING *',
    [nuevoEstado, cnscapacita],
  );
  return res.rows[0];
}
