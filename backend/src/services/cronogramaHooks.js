import { query } from '../db/pool.js';
import { generarConsecutivo } from './consecutivo.js';

const ITEM_ESTADOS = ['Programado', 'Realizado', 'No cumplido', 'Cancelado'];
const CRONO_ESTADOS = ['Borrador', 'Programado', 'Cerrado'];

function normalizeHora(value) {
  if (value === undefined || value === null || String(value).trim() === '') return null;
  const s = String(value).trim();
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(s)) {
    const err = new Error('Hora sugerida inválida (use formato HH:MM)');
    err.status = 400;
    throw err;
  }
  return s;
}

function toDateKey(value) {
  if (!value) return '';
  const s = String(value).trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  const dt = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(dt.getTime())) return '';
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

function validateCronogramaFechas(body) {
  const ini = toDateKey(body.fecha_inicial);
  const fin = toDateKey(body.fecha_final);
  if (!ini || !fin) {
    const err = new Error('Indique la fecha inicial y la fecha final del cronograma');
    err.status = 400;
    throw err;
  }
  if (fin < ini) {
    const err = new Error('La fecha final no puede ser anterior a la fecha inicial');
    err.status = 400;
    throw err;
  }
}

function assertDateInRange(dateVal, ini, fin, fieldLabel) {
  const d = toDateKey(dateVal);
  if (!d) return;
  const iniKey = toDateKey(ini);
  const finKey = toDateKey(fin);
  if (d < iniKey || d > finKey) {
    const err = new Error(`${fieldLabel} debe estar entre ${iniKey} y ${finKey}`);
    err.status = 400;
    throw err;
  }
}

async function getCronogramaRango(cnscrono) {
  const res = await query(
    'SELECT fecha_inicial, fecha_final FROM cronocap WHERE cnscrono = $1',
    [cnscrono],
  );
  const row = res.rows[0];
  if (!row) {
    const err = new Error('Cronograma no encontrado');
    err.status = 404;
    throw err;
  }
  return row;
}

async function validateItemFechasEnRango(cnscrono, { fecha_probable: fechaProbable } = {}) {
  const rango = await getCronogramaRango(cnscrono);
  if (fechaProbable) {
    assertDateInRange(fechaProbable, rango.fecha_inicial, rango.fecha_final, 'La fecha probable');
  }
}

export async function ensureCronogramaEditable(cnscrono) {
  const res = await query('SELECT estado FROM cronocap WHERE cnscrono = $1', [cnscrono]);
  const row = res.rows[0];
  if (!row) {
    const err = new Error('Cronograma no encontrado');
    err.status = 404;
    throw err;
  }
  if (row.estado === 'Cerrado') {
    const err = new Error('El cronograma está cerrado; no se permiten cambios');
    err.status = 409;
    throw err;
  }
  return row;
}

function assertItemEditable(prev) {
  if ((prev?.estado || 'Programado') === 'Realizado') {
    const err = new Error('El ítem ya está cumplido (Realizado); no se permiten cambios');
    err.status = 409;
    throw err;
  }
}

export async function beforeCronogramaItemDelete(ids) {
  const cnscrono = ids[0];
  const item = ids[1];
  await ensureCronogramaEditable(cnscrono);
  const current = await query(
    'SELECT estado FROM cronocapd WHERE cnscrono = $1 AND item = $2',
    [cnscrono, item],
  );
  const prev = current.rows[0];
  if (!prev) return;
  assertItemEditable(prev);
}

async function nextItem(table, pkCol, pkVal) {
  const res = await query(
    `SELECT COALESCE(MAX(item), 0)::int + 1 AS next_item FROM ${table} WHERE ${pkCol} = $1`,
    [pkVal],
  );
  return res.rows[0]?.next_item || 1;
}

export async function beforeTemaItemCreate(body) {
  if (!body.codigo) {
    const err = new Error('Código de tema requerido');
    err.status = 400;
    throw err;
  }
  if (body.item === undefined || body.item === null || String(body.item).trim() === '') {
    body.item = await nextItem('captemad', 'codigo', body.codigo);
  }
  if (!body.estado) body.estado = 'A';
}

export function beforeCronogramaCreate(body) {
  body.estado = 'Borrador';
  validateCronogramaFechas(body);
  if (!body.fecha) {
    body.fecha = body.fecha_inicial || new Date().toISOString().slice(0, 10);
  }
}

export async function beforeCronogramaUpdate(body, ids) {
  delete body.estado;
  await ensureCronogramaEditable(ids[0]);
  if (body.fecha_inicial !== undefined || body.fecha_final !== undefined) {
    const current = await query(
      'SELECT fecha_inicial, fecha_final FROM cronocap WHERE cnscrono = $1',
      [ids[0]],
    );
    validateCronogramaFechas({ ...current.rows[0], ...body });
  }
}

export async function beforeCronogramaItemCreate(body) {
  if (!body.cnscrono) {
    const err = new Error('Consecutivo de cronograma requerido');
    err.status = 400;
    throw err;
  }
  await ensureCronogramaEditable(body.cnscrono);
  await validateItemFechasEnRango(body.cnscrono, {
    fecha_probable: body.fecha_probable,
  });
  if (body.item === undefined || body.item === null || String(body.item).trim() === '') {
    body.item = await nextItem('cronocapd', 'cnscrono', body.cnscrono);
  }
  if (!body.estado) body.estado = 'Programado';
  if (body.hora_sugerida !== undefined) {
    body.hora_sugerida = normalizeHora(body.hora_sugerida);
  }
}

export async function beforeCronogramaItemUpdate(body, ids) {
  const cnscrono = body.cnscrono || ids[0];
  const item = body.item ?? ids[1];
  await ensureCronogramaEditable(cnscrono);

  const current = await query(
    'SELECT estado, observacion, fecha_real, tema_codigo FROM cronocapd WHERE cnscrono = $1 AND item = $2',
    [cnscrono, item],
  );
  const prev = current.rows[0];
  if (!prev) return;

  assertItemEditable(prev);

  const nextEstado = body.estado !== undefined ? body.estado : prev.estado;
  if (nextEstado && !ITEM_ESTADOS.includes(nextEstado)) {
    const err = new Error(`Estado no válido: ${nextEstado}`);
    err.status = 400;
    throw err;
  }

  if (nextEstado === 'Realizado') {
    if (body.fecha_real === undefined || body.fecha_real === null || body.fecha_real === '') {
      body.fecha_real = new Date().toISOString().slice(0, 10);
    }
    if (body.observacion === undefined) body.observacion = prev.observacion || '';
  } else if (nextEstado === 'No cumplido' || nextEstado === 'Cancelado') {
    const obs = body.observacion !== undefined ? String(body.observacion || '').trim() : String(prev.observacion || '').trim();
    if (!obs) {
      const err = new Error('Indique la observación o motivo para este estado');
      err.status = 400;
      throw err;
    }
    body.observacion = obs;
    body.fecha_real = null;
  } else if (nextEstado === 'Programado') {
    if (body.fecha_real === undefined) body.fecha_real = null;
    if (body.observacion === undefined && nextEstado !== prev.estado) body.observacion = '';
  }

  if (body.fecha_probable !== undefined && prev.tema_codigo) {
    const fecha = body.fecha_probable === null || body.fecha_probable === ''
      ? null
      : body.fecha_probable;
    if (fecha) {
      await validateItemFechasEnRango(cnscrono, { fecha_probable: fecha });
    }
    await query(
      `UPDATE cronocapd SET fecha_probable = $3
       WHERE cnscrono = $1 AND tema_codigo = $2 AND COALESCE(estado, 'Programado') <> 'Realizado'`,
      [cnscrono, prev.tema_codigo, fecha],
    );
  }

  if (body.dirigidoa !== undefined && prev.tema_codigo) {
    await query(
      `UPDATE cronocapd SET dirigidoa = $3
       WHERE cnscrono = $1 AND tema_codigo = $2 AND COALESCE(estado, 'Programado') <> 'Realizado'`,
      [cnscrono, prev.tema_codigo, body.dirigidoa ?? ''],
    );
  }

  if (body.hora_sugerida !== undefined && prev.tema_codigo) {
    await query(
      `UPDATE cronocapd SET hora_sugerida = $3
       WHERE cnscrono = $1 AND tema_codigo = $2 AND COALESCE(estado, 'Programado') <> 'Realizado'`,
      [cnscrono, prev.tema_codigo, normalizeHora(body.hora_sugerida)],
    );
  }
}

export async function agregarTemaCronograma(
  cnscrono,
  { tema_codigo: temaCodigo, fecha_probable: fechaProbable, hora_sugerida: horaSugerida } = {},
) {
  await ensureCronogramaEditable(cnscrono);
  if (fechaProbable) {
    await validateItemFechasEnRango(cnscrono, { fecha_probable: fechaProbable });
  }
  const hora = normalizeHora(horaSugerida);

  const temaRes = await query(
    'SELECT codigo, nombre, dirigidoa FROM captema WHERE codigo = $1 AND estado = $2',
    [temaCodigo, 'A'],
  );
  const tema = temaRes.rows[0];
  if (!tema) {
    const err = new Error('Tema no encontrado o inactivo');
    err.status = 404;
    throw err;
  }

  const itemsRes = await query(
    `SELECT item, descripcion, duracion FROM captemad
     WHERE codigo = $1 AND estado = 'A'
     ORDER BY item`,
    [temaCodigo],
  );
  if (!itemsRes.rows.length) {
    const err = new Error('El tema no tiene ítems activos');
    err.status = 400;
    throw err;
  }

  let nextItemNum = await nextItem('cronocapd', 'cnscrono', cnscrono);
  const inserted = [];

  for (const row of itemsRes.rows) {
    const ins = await query(
      `INSERT INTO cronocapd (
         cnscrono, item, tema_codigo, tema_nombre, descripcion, duracion, dirigidoa,
         fecha_probable, hora_sugerida, estado
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'Programado')
       RETURNING *`,
      [
        cnscrono,
        nextItemNum,
        tema.codigo,
        tema.nombre,
        row.descripcion,
        row.duracion,
        tema.dirigidoa || '',
        fechaProbable || null,
        hora,
      ],
    );
    inserted.push(ins.rows[0]);
    nextItemNum += 1;
  }

  if ((await query('SELECT estado FROM cronocap WHERE cnscrono = $1', [cnscrono])).rows[0]?.estado === 'Borrador') {
    await query("UPDATE cronocap SET estado = 'Programado' WHERE cnscrono = $1", [cnscrono]);
  }

  return { tema: tema.nombre, count: inserted.length, items: inserted };
}

export async function cambiarEstadoItemCronograma(cnscrono, item, payload = {}) {
  await ensureCronogramaEditable(cnscrono);
  const { estado, observacion, fecha_real: fechaReal } = payload;
  if (!estado || !ITEM_ESTADOS.includes(estado)) {
    const err = new Error('Estado no válido');
    err.status = 400;
    throw err;
  }

  const body = { estado, observacion, fecha_real: fechaReal };
  await beforeCronogramaItemUpdate(body, [cnscrono, item]);

  const res = await query(
    `UPDATE cronocapd SET estado = $3, observacion = $4, fecha_real = $5
     WHERE cnscrono = $1 AND item = $2 RETURNING *`,
    [cnscrono, item, body.estado, body.observacion ?? '', body.fecha_real ?? null],
  );
  if (!res.rows.length) {
    const err = new Error('Ítem no encontrado');
    err.status = 404;
    throw err;
  }
  return res.rows[0];
}

export async function cambiarEstadoTemaCronograma(
  cnscrono,
  { tema_codigo: temaCodigo, tema_nombre: temaNombre, estado, observacion, fecha_real: fechaReal } = {},
) {
  await ensureCronogramaEditable(cnscrono);

  if (!temaCodigo && !temaNombre) {
    const err = new Error('Indique el tema a actualizar');
    err.status = 400;
    throw err;
  }

  const params = [cnscrono];
  let whereTema = '';
  if (temaCodigo) {
    params.push(temaCodigo);
    whereTema = ' AND tema_codigo = $2';
  } else {
    params.push(temaNombre);
    whereTema = ' AND tema_nombre = $2';
  }

  const itemsRes = await query(
    `SELECT item, estado FROM cronocapd WHERE cnscrono = $1${whereTema} ORDER BY item`,
    params,
  );
  if (!itemsRes.rows.length) {
    const err = new Error('No hay ítems para el tema indicado');
    err.status = 404;
    throw err;
  }

  const editables = itemsRes.rows.filter((r) => (r.estado || 'Programado') !== 'Realizado');
  if (!editables.length) {
    const err = new Error('Todos los ítems del tema ya están cumplidos (Realizado); no se permiten cambios');
    err.status = 409;
    throw err;
  }

  const payload = { estado, observacion, fecha_real: fechaReal };
  const updated = [];
  for (const row of editables) {
    updated.push(await cambiarEstadoItemCronograma(cnscrono, row.item, payload));
  }

  return {
    tema: temaNombre || temaCodigo,
    count: updated.length,
    omitidosRealizados: itemsRes.rows.length - editables.length,
    items: updated,
  };
}

export async function duplicarCronograma(cnscrono, { descripcion, usuario } = {}) {
  const headRes = await query('SELECT * FROM cronocap WHERE cnscrono = $1', [cnscrono]);
  const head = headRes.rows[0];
  if (!head) {
    const err = new Error('Cronograma no encontrado');
    err.status = 404;
    throw err;
  }

  const itemsRes = await query(
    'SELECT * FROM cronocapd WHERE cnscrono = $1 ORDER BY item',
    [cnscrono],
  );

  const newCnscrono = await generarConsecutivo({ acnsPrefijo: 'CRONOCAP', pad: 8 });
  const descBase = String(head.descripcion || '').trim();
  const descFinal = String(descripcion || '').trim()
    || (descBase ? `${descBase} (refuerzo)` : 'Cronograma refuerzo');

  await query(
    `INSERT INTO cronocap (
       cnscrono, cliente, fecha, fecha_inicial, fecha_final, descripcion, estado, observacion, usuario
     ) VALUES ($1, $2, CURRENT_DATE, $3, $4, $5, 'Borrador', $6, $7)`,
    [
      newCnscrono,
      head.cliente,
      head.fecha_inicial,
      head.fecha_final,
      descFinal,
      head.observacion || '',
      usuario || head.usuario || null,
    ],
  );

  for (const row of itemsRes.rows) {
    await query(
      `INSERT INTO cronocapd (
         cnscrono, item, tema_codigo, tema_nombre, descripcion, duracion, dirigidoa,
         fecha_probable, hora_sugerida, estado
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'Programado')`,
      [
        newCnscrono,
        row.item,
        row.tema_codigo,
        row.tema_nombre,
        row.descripcion,
        row.duracion,
        row.dirigidoa || '',
        row.fecha_probable,
        row.hora_sugerida,
      ],
    );
  }

  return {
    cnscrono: newCnscrono,
    origen: cnscrono,
    items: itemsRes.rows.length,
    descripcion: descFinal,
  };
}

export { ITEM_ESTADOS, CRONO_ESTADOS };
