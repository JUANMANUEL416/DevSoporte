import { query } from '../db/pool.js';

function truncate100(value) {
  return String(value || '').trim().slice(0, 100) || null;
}

function maxDate(values) {
  const dates = values.filter(Boolean).map((v) => new Date(v)).filter((d) => !Number.isNaN(d.getTime()));
  if (!dates.length) return null;
  dates.sort((a, b) => b.getTime() - a.getTime());
  return dates[0].toISOString().slice(0, 10);
}

export async function listCronogramasParaActa(cliente) {
  if (!cliente) {
    const err = new Error('Cliente requerido');
    err.status = 400;
    throw err;
  }
  const res = await query(
    `SELECT c.cnscrono, c.descripcion, c.estado, c.fecha_inicial, c.fecha_final,
            COUNT(d.item)::int AS num_items
     FROM cronocap c
     LEFT JOIN cronocapd d ON d.cnscrono = c.cnscrono
     WHERE c.cliente = $1
     GROUP BY c.cnscrono, c.descripcion, c.estado, c.fecha_inicial, c.fecha_final
     HAVING COUNT(d.item) > 0
     ORDER BY c.fecha_inicial DESC NULLS LAST, c.cnscrono DESC`,
    [cliente],
  );
  return res.rows;
}

export async function listTemasParaActa(cnscrono) {
  const res = await query(
    `SELECT tema_codigo,
            MAX(tema_nombre) AS tema_nombre,
            COUNT(*)::int AS num_items,
            COALESCE(SUM(COALESCE(duracion, 0)), 0)::int AS duracion_total,
            MAX(fecha_probable) AS fecha_probable,
            MAX(fecha_real) AS fecha_real
     FROM cronocapd
     WHERE cnscrono = $1 AND COALESCE(tema_codigo, '') <> ''
     GROUP BY tema_codigo
     ORDER BY MAX(tema_nombre), tema_codigo`,
    [cnscrono],
  );
  return res.rows;
}

export async function prefillActaDesdeCronograma(cnscrono, temaCodigo) {
  const head = await query('SELECT * FROM cronocap WHERE cnscrono = $1', [cnscrono]);
  if (!head.rows.length) {
    const err = new Error('Cronograma no encontrado');
    err.status = 404;
    throw err;
  }

  const items = await query(
    `SELECT * FROM cronocapd
     WHERE cnscrono = $1 AND tema_codigo = $2
     ORDER BY item`,
    [cnscrono, temaCodigo],
  );
  if (!items.rows.length) {
    const err = new Error('Tema no encontrado en el cronograma');
    err.status = 404;
    throw err;
  }

  const descripciones = items.rows.map((i) => String(i.descripcion || '').trim()).filter(Boolean);
  const duracion = items.rows.reduce((s, i) => s + (Number(i.duracion) || 0), 0);
  const fecha = maxDate(items.rows.map((i) => i.fecha_real))
    || maxDate(items.rows.map((i) => i.fecha_probable));

  return {
    cnscrono,
    tema_codigo: temaCodigo,
    cliente: head.rows[0].cliente,
    tema: truncate100(items.rows[0].tema_nombre || 'Sin tema'),
    tema1: truncate100(descripciones[0]),
    tema2: truncate100(descripciones[1]),
    tema3: truncate100(descripciones[2]),
    duracion: duracion || null,
    fecha,
  };
}

export async function listActasCerradasPorCronograma(cnscrono) {
  const res = await query(
    `SELECT cnscapacita, tema, tema_codigo, fecha
     FROM rasist
     WHERE cnscrono = $1 AND estado = 'Cerrada'
     ORDER BY fecha DESC NULLS LAST, cnscapacita`,
    [cnscrono],
  );
  return res.rows;
}
