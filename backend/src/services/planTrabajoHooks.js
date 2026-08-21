import { query } from '../db/pool.js';
import { generarConsecutivo } from './consecutivo.js';
import { ensureCronogramaEditable } from './cronogramaHooks.js';
import {
  PLAN_ITEM_AREA_SQL,
  PLAN_ITEM_GRUPO_LATERAL,
  listPlanItemsModuloArea,
  listPlanItemsModuloAgrupador,
  listPlanSeccionesArea,
  planItemArea,
  planItemSubtitulo,
  buildPlanItemNombre,
  temaCodigoArea,
} from './planTrabajoAreas.js';

function isGrouperTipo(tipo) {
  return /titulo/i.test(String(tipo || ''));
}

const PLAN_ESTADOS = ['Borrador', 'En curso', 'Cerrado', 'Cancelado'];
const ITEM_ESTADOS = ['Pendiente', 'En curso', 'Realizado', 'Cancelado'];
const PLAN_BLOQUEADOS = ['Cerrado', 'Cancelado'];
const DEFAULT_DURACION_MIN = 15;

function compareCodigoNum(a, b) {
  const pa = String(a || '').split('.').map((n) => Number(n) || 0);
  const pb = String(b || '').split('.').map((n) => Number(n) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i += 1) {
    const na = pa[i] ?? 0;
    const nb = pb[i] ?? 0;
    if (na !== nb) return na - nb;
  }
  return 0;
}

/** Profundidad jerárquica: 24.1 → 1, 24.1.1 → 2, 24.1.14.1 → 3 */
function prioridadFromCodigoNum(codigoNum) {
  const parts = String(codigoNum || '').split('.').filter(Boolean);
  return Math.max(1, parts.length - 1);
}

export async function ensurePlanEditable(cnplan) {
  const res = await query('SELECT estado FROM plantrab WHERE cnplan = $1', [cnplan]);
  const row = res.rows[0];
  if (!row) {
    const err = new Error('Plan de trabajo no encontrado');
    err.status = 404;
    throw err;
  }
  if (PLAN_BLOQUEADOS.includes(row.estado)) {
    const err = new Error('El plan está cerrado o cancelado; no se permiten cambios');
    err.status = 409;
    throw err;
  }
  return row;
}

async function nextItem(cnplan) {
  const res = await query(
    'SELECT COALESCE(MAX(item), 0)::int + 1 AS next_item FROM plantrabd WHERE cnplan = $1',
    [cnplan],
  );
  return res.rows[0]?.next_item || 1;
}

async function nextOrden(cnplan) {
  const res = await query(
    'SELECT COALESCE(MAX(orden), 0)::int + 1 AS next_orden FROM plantrabd WHERE cnplan = $1',
    [cnplan],
  );
  return res.rows[0]?.next_orden || 1;
}

export function beforePlanTrabajoCreate(body) {
  body.estado = 'Borrador';
  if (!body.fecha) {
    body.fecha = new Date().toISOString().slice(0, 10);
  }
}

export async function beforePlanTrabajoUpdate(body, ids) {
  delete body.estado;
  await ensurePlanEditable(ids[0]);
}

export async function beforePlanTrabajoItemCreate(body) {
  if (!body.cnplan) {
    const err = new Error('Plan de trabajo requerido');
    err.status = 400;
    throw err;
  }
  await ensurePlanEditable(body.cnplan);
  if (body.item === undefined || body.item === null || String(body.item).trim() === '') {
    body.item = await nextItem(body.cnplan);
  }
  if (body.orden === undefined || body.orden === null || String(body.orden).trim() === '') {
    body.orden = await nextOrden(body.cnplan);
  }
  if (!body.estado) body.estado = 'Pendiente';
  if (body.prioridad === undefined || body.prioridad === null) body.prioridad = 1;
}

export async function beforePlanTrabajoItemUpdate(body, ids) {
  const cnplan = body.cnplan || ids[0];
  await ensurePlanEditable(cnplan);
  if (body.estado && !ITEM_ESTADOS.includes(body.estado)) {
    const err = new Error(`Estado no válido: ${body.estado}`);
    err.status = 400;
    throw err;
  }
}

export async function beforePlanTrabajoItemDelete(ids) {
  await ensurePlanEditable(ids[0]);
}

export async function listProcesosGrupo(codigoGrupo) {
  const res = await query(
    `SELECT g.proceso, p.nombre, p.modulo, m.nombre AS modulo_nombre,
            p.descripcion, p.duracion_sugerida, p.tipo, p.codigo_num
     FROM qrysgrupod g
     JOIN qrysproc p ON p.codigo = g.proceso
     LEFT JOIN qrysmod m ON m.codigo = p.modulo
     WHERE g.grupo = $1 AND COALESCE(p.estado, 'A') = 'A'
     ORDER BY m.orden, p.codigo_num, p.codigo`,
    [codigoGrupo],
  );
  return res.rows;
}

export async function agregarProcesosPlan(cnplan, procesoCodigos = []) {
  await ensurePlanEditable(cnplan);
  const codes = [...new Set((procesoCodigos || []).map((c) => String(c || '').trim()).filter(Boolean))];
  if (!codes.length) {
    const err = new Error('Seleccione al menos un proceso');
    err.status = 400;
    throw err;
  }

  const existing = await query(
    'SELECT proceso_codigo FROM plantrabd WHERE cnplan = $1 AND proceso_codigo = ANY($2::text[])',
    [cnplan, codes],
  );
  const ya = new Set(existing.rows.map((r) => r.proceso_codigo));

  const procRes = await query(
    `SELECT p.codigo, p.nombre, p.descripcion, p.duracion_sugerida, p.tipo,
            p.codigo_num, p.modulo, m.orden AS modulo_orden
     FROM qrysproc p
     LEFT JOIN qrysmod m ON m.codigo = p.modulo
     WHERE p.codigo = ANY($1::text[]) AND COALESCE(p.estado, 'A') = 'A'`,
    [codes],
  );

  const toInsert = procRes.rows
    .filter((p) => !ya.has(p.codigo) && !isGrouperTipo(p.tipo))
    .sort((a, b) => {
      const mo = (a.modulo_orden ?? 999) - (b.modulo_orden ?? 999);
      if (mo !== 0) return mo;
      return compareCodigoNum(a.codigo_num, b.codigo_num);
    });

  const inserted = [];
  for (const proc of toInsert) {
    const item = await nextItem(cnplan);
    const ins = await query(
      `INSERT INTO plantrabd (
         cnplan, item, proceso_codigo, nombre, descripcion, orden, prioridad,
         tiempo_estimado, estado
       ) VALUES ($1, $2, $3, $4, $5, 0, $6, $7, 'Pendiente')
       RETURNING *`,
      [
        cnplan,
        item,
        proc.codigo,
        proc.nombre,
        proc.descripcion || proc.nombre,
        prioridadFromCodigoNum(proc.codigo_num),
        proc.duracion_sugerida || null,
      ],
    );
    inserted.push(ins.rows[0]);
  }

  if (!inserted.length) {
    const err = new Error('No se agregaron procesos (ya existen o no están activos)');
    err.status = 400;
    throw err;
  }

  await reorganizarPlanPorModulo(cnplan);

  const head = await query('SELECT estado FROM plantrab WHERE cnplan = $1', [cnplan]);
  if (head.rows[0]?.estado === 'Borrador') {
    await query("UPDATE plantrab SET estado = 'En curso' WHERE cnplan = $1", [cnplan]);
  }

  const finalRes = await query(
    `SELECT d.* FROM plantrabd d
     LEFT JOIN qrysproc pr ON pr.codigo = d.proceso_codigo
     LEFT JOIN qrysmod m ON m.codigo = pr.modulo
     WHERE d.cnplan = $1
     ORDER BY d.orden ASC, pr.codigo_num ASC, d.item ASC`,
    [cnplan],
  );

  return { count: inserted.length, items: finalRes.rows.filter((r) => inserted.some((i) => i.item === r.item)) };
}

function duracionPlanMinutos(tiempoEstimado) {
  const n = Number(tiempoEstimado);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_DURACION_MIN;
}

/** Duración en cronograma: vacío si el plan no define tiempo (no mostrar 15 min por defecto). */
function duracionCronogramaMinutos(tiempoEstimado) {
  const n = Number(tiempoEstimado);
  return Number.isFinite(n) && n > 0 ? n : null;
}

async function nextCronoItem(cnscrono) {
  const res = await query(
    'SELECT COALESCE(MAX(item), 0)::int + 1 AS next_item FROM cronocapd WHERE cnscrono = $1',
    [cnscrono],
  );
  return res.rows[0].next_item;
}


/**
 * Agrega al cronograma un área del plan (ej. Inventario) dentro de un módulo, con sus ítems.
 */
export async function agregarModuloAreaPlanACronograma(cnscrono, cnplan, codigoModulo, area) {
  await ensureCronogramaEditable(cnscrono);

  const areaNombre = String(area || '').trim();
  if (!areaNombre) return null;

  const modRes = await query(
    'SELECT codigo, nombre, orden FROM qrysmod WHERE codigo = $1',
    [codigoModulo],
  );
  const mod = modRes.rows[0];
  if (!mod) {
    const err = new Error(`Módulo ${codigoModulo} no encontrado`);
    err.status = 404;
    throw err;
  }

  const planItems = await listPlanItemsModuloArea(cnplan, codigoModulo, areaNombre);
  if (!planItems.length) return null;

  const dirRes = await query(
    `SELECT dirigidoa FROM captema
     WHERE cnplan = $1 AND modulo_codigo = $2 AND nombre = $3
       AND TRIM(COALESCE(dirigidoa, '')) <> ''
     ORDER BY codigo DESC LIMIT 1`,
    [cnplan, codigoModulo, areaNombre],
  );
  const dirigidoa = dirRes.rows[0]?.dirigidoa || '';

  const temaCodigo = temaCodigoArea(codigoModulo, areaNombre);
  let nextItem = await nextCronoItem(cnscrono);
  const inserted = [];

  for (const row of planItems) {
    const descripcion = planItemSubtitulo(row.nombre, row.proc_nombre, row.grupo_nombre);
    if (!descripcion) continue;
    const ins = await query(
      `INSERT INTO cronocapd (
         cnscrono, item, tema_codigo, tema_nombre, descripcion, duracion, dirigidoa,
         fecha_probable, hora_sugerida, estado, modulo_codigo, modulo_nombre, modulo_orden
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, NULL, NULL, 'Programado', $8, $9, $10)
       RETURNING *`,
      [
        cnscrono,
        nextItem,
        temaCodigo,
        areaNombre,
        descripcion,
        duracionCronogramaMinutos(row.tiempo_estimado),
        dirigidoa,
        mod.codigo,
        mod.nombre,
        mod.orden ?? null,
      ],
    );
    inserted.push(ins.rows[0]);
    nextItem += 1;
  }

  if (!inserted.length) return null;

  return {
    modulo: mod.nombre,
    area: areaNombre,
    tema_codigo: temaCodigo,
    count: inserted.length,
    items: inserted,
  };
}

/** @deprecated Use agregarModuloAreaPlanACronograma */
export async function agregarModuloAgrupadorPlanACronograma(
  cnscrono,
  cnplan,
  codigoModulo,
  codigoGrupo,
) {
  await ensureCronogramaEditable(cnscrono);

  const modRes = await query(
    'SELECT codigo, nombre, orden FROM qrysmod WHERE codigo = $1',
    [codigoModulo],
  );
  const mod = modRes.rows[0];
  if (!mod) {
    const err = new Error(`Módulo ${codigoModulo} no encontrado`);
    err.status = 404;
    throw err;
  }

  const grpRes = await query(
    'SELECT codigo, nombre FROM qrysgrupo WHERE codigo = $1 AND COALESCE(estado, $2) = $2',
    [codigoGrupo, 'A'],
  );
  const grp = grpRes.rows[0];
  if (!grp) {
    const err = new Error(`Agrupador ${codigoGrupo} no encontrado o inactivo`);
    err.status = 404;
    throw err;
  }

  const planItems = await listPlanItemsModuloAgrupador(cnplan, codigoModulo, codigoGrupo);
  if (!planItems.length) return null;

  const dirRes = await query(
    `SELECT dirigidoa FROM captema
     WHERE qrys_grupo = $1 AND TRIM(COALESCE(dirigidoa, '')) <> ''
     ORDER BY codigo DESC LIMIT 1`,
    [codigoGrupo],
  );
  const dirigidoa = dirRes.rows[0]?.dirigidoa || '';

  const temaCodigo = `${codigoModulo}|${codigoGrupo}`;
  let nextItem = await nextCronoItem(cnscrono);
  const inserted = [];

  for (const row of planItems) {
    const descripcion = String(row.nombre || row.proc_nombre || '').trim();
    if (!descripcion) continue;
    const ins = await query(
      `INSERT INTO cronocapd (
         cnscrono, item, tema_codigo, tema_nombre, descripcion, duracion, dirigidoa,
         fecha_probable, hora_sugerida, estado, modulo_codigo, modulo_nombre, modulo_orden
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, NULL, NULL, 'Programado', $8, $9, $10)
       RETURNING *`,
      [
        cnscrono,
        nextItem,
        temaCodigo,
        grp.nombre,
        descripcion,
        duracionPlanMinutos(row.tiempo_estimado),
        dirigidoa,
        mod.codigo,
        mod.nombre,
        mod.orden ?? null,
      ],
    );
    inserted.push(ins.rows[0]);
    nextItem += 1;
  }

  if (!inserted.length) return null;

  return {
    modulo: mod.nombre,
    agrupador: grp.nombre,
    tema_codigo: temaCodigo,
    count: inserted.length,
    items: inserted,
  };
}

export async function agregarGrupoPlan(cnplan, { grupo, procesos } = {}) {
  const codigoGrupo = String(grupo || '').trim();
  if (!codigoGrupo) {
    const err = new Error('Indique el agrupador');
    err.status = 400;
    throw err;
  }
  const rows = await listProcesosGrupo(codigoGrupo);
  if (!rows.length) {
    const err = new Error('El agrupador no tiene procesos');
    err.status = 404;
    throw err;
  }
  let codes = rows.filter((r) => !isGrouperTipo(r.tipo)).map((r) => r.proceso);
  if (Array.isArray(procesos) && procesos.length) {
    const pick = new Set(procesos.map((c) => String(c).trim()));
    codes = codes.filter((c) => pick.has(c));
  }
  return agregarProcesosPlan(cnplan, codes).then(async (result) => {
    await reorganizarPlanPorAgrupador(cnplan);
    return result;
  });
}

export async function generarCronogramaDesdePlan(cnplan, payload = {}) {
  const planRes = await query(
    'SELECT cnplan, cliente, nombre, fecha_inicial, fecha_final, descripcion, cnscrono, estado FROM plantrab WHERE cnplan = $1',
    [cnplan],
  );
  const plan = planRes.rows[0];
  if (!plan) {
    const err = new Error('Plan de trabajo no encontrado');
    err.status = 404;
    throw err;
  }
  if (plan.cnscrono) {
    const err = new Error(`Este plan ya tiene cronograma ${plan.cnscrono}`);
    err.status = 409;
    throw err;
  }

  const itemsRes = await query(
    `SELECT proceso_codigo FROM plantrabd
     WHERE cnplan = $1 AND estado <> 'Cancelado' AND proceso_codigo IS NOT NULL`,
    [cnplan],
  );
  const procesoCodigos = [...new Set(itemsRes.rows.map((r) => r.proceso_codigo).filter(Boolean))];
  if (!procesoCodigos.length) {
    const err = new Error('El plan no tiene actividades con procesos Qrystalos');
    err.status = 400;
    throw err;
  }

  const seccionesRes = await query(
    `SELECT m.codigo AS modulo, m.nombre AS modulo_nombre, m.orden AS modulo_orden,
            ${PLAN_ITEM_AREA_SQL} AS area,
            MIN(d.orden) AS plan_orden
     FROM plantrabd d
     JOIN qrysproc pr ON pr.codigo = d.proceso_codigo
     JOIN qrysmod m ON m.codigo = pr.modulo
     WHERE d.cnplan = $1
       AND d.estado <> 'Cancelado'
       AND d.proceso_codigo IS NOT NULL
     GROUP BY m.codigo, m.nombre, m.orden, ${PLAN_ITEM_AREA_SQL}
     HAVING TRIM(${PLAN_ITEM_AREA_SQL}) <> ''
     ORDER BY m.orden ASC, plan_orden ASC, area ASC`,
    [cnplan],
  );
  if (!seccionesRes.rows.length) {
    const err = new Error('El plan no tiene actividades con área definida (ej. Inventario, Financiero)');
    err.status = 400;
    throw err;
  }

  const cnscrono = await generarConsecutivo({ acnsPrefijo: 'CRONOCAP', pad: 8 });
  const fechaIni = payload.fecha_inicial || plan.fecha_inicial || new Date().toISOString().slice(0, 10);
  const fechaFin = payload.fecha_final || plan.fecha_final || fechaIni;
  const descripcion =
    payload.descripcion ||
    `Capacitaciones según plan ${plan.cnplan}${plan.nombre ? ` — ${plan.nombre}` : ''}`;

  await query(
    `INSERT INTO cronocap (
       cnscrono, cliente, fecha, fecha_inicial, fecha_final, descripcion, estado, usuario
     ) VALUES ($1, $2, CURRENT_DATE, $3, $4, $5, 'Borrador', $6)`,
    [cnscrono, plan.cliente, fechaIni, fechaFin, descripcion, payload.usuario || ''],
  );

  const temas = [];
  const temasInactivados = [];
  const omitidos = [];
  const seccionesSync = new Set();
  const { crearTemaDesdePlanArea } = await import('./temasCapacitacionHooks.js');
  for (const sec of seccionesRes.rows) {
    const syncKey = `${sec.modulo}|${sec.area}`;
    if (!seccionesSync.has(syncKey)) {
      const creado = await crearTemaDesdePlanArea(cnplan, sec.modulo, sec.area);
      if (creado?.inactivados > 0) {
        temasInactivados.push({
          area: sec.area,
          modulo: sec.modulo_nombre,
          count: creado.inactivados,
        });
      }
      seccionesSync.add(syncKey);
    }
    const agregado = await agregarModuloAreaPlanACronograma(
      cnscrono,
      cnplan,
      sec.modulo,
      sec.area,
    );
    if (agregado) {
      temas.push({
        codigo: agregado.tema_codigo,
        nombre: agregado.area,
        modulo: agregado.modulo,
        items: agregado.count,
      });
    } else {
      omitidos.push(`${sec.modulo_nombre} / ${sec.area}`);
    }
  }

  if (!temas.length) {
    await query('DELETE FROM cronocap WHERE cnscrono = $1', [cnscrono]);
    const err = new Error(
      omitidos.length
        ? `Ninguna área del plan tiene actividades válidas: ${omitidos.join(', ')}`
        : 'No se pudieron crear ítems del cronograma desde el plan',
    );
    err.status = 400;
    throw err;
  }

  const totalItems = temas.reduce((s, t) => s + (t.items || 0), 0);

  if (totalItems > 0) {
    await query("UPDATE cronocap SET estado = 'Programado' WHERE cnscrono = $1", [cnscrono]);
  }

  await query('UPDATE plantrab SET cnscrono = $2 WHERE cnplan = $1', [cnplan, cnscrono]);

  return {
    cnscrono,
    temas: temas.length,
    items: totalItems,
    temasInactivados,
    omitidos,
    advertencia: omitidos.length
      ? `Áreas sin actividades en el plan (omitidas): ${omitidos.join(', ')}`
      : null,
  };
}

/** Agrega al cronograma existente las áreas del plan que aún no tienen tema. */
export async function sincronizarCronogramaDesdePlan(cnplan) {
  const planRes = await query(
    'SELECT cnplan, cnscrono, estado FROM plantrab WHERE cnplan = $1',
    [cnplan],
  );
  const plan = planRes.rows[0];
  if (!plan) {
    const err = new Error('Plan de trabajo no encontrado');
    err.status = 404;
    throw err;
  }
  if (!plan.cnscrono) {
    const err = new Error('Este plan no tiene cronograma; use «Generar cronograma» primero');
    err.status = 400;
    throw err;
  }

  const cnscrono = plan.cnscrono;
  await ensureCronogramaEditable(cnscrono);

  const secciones = await listPlanSeccionesArea(cnplan);
  if (!secciones.length) {
    const err = new Error('El plan no tiene actividades con área definida');
    err.status = 400;
    throw err;
  }

  const existRes = await query(
    `SELECT DISTINCT modulo_codigo, tema_nombre
     FROM cronocapd WHERE cnscrono = $1`,
    [cnscrono],
  );
  const existentes = new Set(
    existRes.rows.map((r) => `${r.modulo_codigo}|${String(r.tema_nombre || '').trim()}`),
  );

  const { crearTemaDesdePlanArea } = await import('./temasCapacitacionHooks.js');
  const temas = [];
  const omitidos = [];

  for (const sec of secciones) {
    const key = `${sec.modulo}|${sec.area}`;
    if (existentes.has(key)) continue;

    await crearTemaDesdePlanArea(cnplan, sec.modulo, sec.area);
    const agregado = await agregarModuloAreaPlanACronograma(
      cnscrono,
      cnplan,
      sec.modulo,
      sec.area,
    );
    if (agregado) {
      temas.push({
        codigo: agregado.tema_codigo,
        nombre: agregado.area,
        modulo: agregado.modulo,
        items: agregado.count,
      });
      existentes.add(key);
    } else {
      omitidos.push(`${sec.modulo_nombre} / ${sec.area}`);
    }
  }

  const totalItems = temas.reduce((s, t) => s + (t.items || 0), 0);
  return {
    cnscrono,
    agregados: temas.length,
    items: totalItems,
    temas,
    omitidos,
    advertencia: omitidos.length
      ? `Áreas sin actividades válidas (omitidas): ${omitidos.join(', ')}`
      : null,
    mensaje: temas.length
      ? `Se agregaron ${temas.length} tema(s) y ${totalItems} ítem(s) al cronograma`
      : 'El cronograma ya incluye todas las áreas del plan',
  };
}

export { listPlanItemsModuloArea, listPlanItemsModuloAgrupador, listPlanSeccionesArea } from './planTrabajoAreas.js';

export async function reorganizarPlanPorModulo(cnplan) {
  await ensurePlanEditable(cnplan);
  const res = await query(
    `SELECT d.cnplan, d.item, pr.codigo_num, m.orden AS modulo_orden
     FROM plantrabd d
     LEFT JOIN qrysproc pr ON pr.codigo = d.proceso_codigo
     LEFT JOIN qrysmod m ON m.codigo = pr.modulo
     WHERE d.cnplan = $1`,
    [cnplan],
  );

  const rows = [...res.rows].sort((a, b) => {
    const mo = (a.modulo_orden ?? 999) - (b.modulo_orden ?? 999);
    if (mo !== 0) return mo;
    return compareCodigoNum(a.codigo_num, b.codigo_num);
  });

  let orden = 1;
  const updated = [];
  for (const row of rows) {
    const prioridad = prioridadFromCodigoNum(row.codigo_num);
    const up = await query(
      `UPDATE plantrabd SET orden = $3, prioridad = $4
       WHERE cnplan = $1 AND item = $2 RETURNING *`,
      [cnplan, row.item, orden, prioridad],
    );
    if (up.rows[0]) updated.push(up.rows[0]);
    orden += 1;
  }

  return { count: updated.length, items: updated };
}

export async function reorganizarPlanPorAgrupador(cnplan) {
  await ensurePlanEditable(cnplan);
  const res = await query(
    `SELECT d.cnplan, d.item, d.nombre, pr.codigo_num, pr.nombre AS proc_nombre,
            m.orden AS modulo_orden, grp.grupo_codigo, grp.grupo_nombre
     FROM plantrabd d
     LEFT JOIN qrysproc pr ON pr.codigo = d.proceso_codigo
     LEFT JOIN qrysmod m ON m.codigo = pr.modulo
     ${PLAN_ITEM_GRUPO_LATERAL}
     WHERE d.cnplan = $1`,
    [cnplan],
  );

  const rows = [...res.rows].sort((a, b) => {
    const mo = (a.modulo_orden ?? 999) - (b.modulo_orden ?? 999);
    if (mo !== 0) return mo;
    const aa = planItemArea(a.nombre, a.proc_nombre).localeCompare(
      planItemArea(b.nombre, b.proc_nombre),
      'es',
    );
    if (aa !== 0) return aa;
    return compareCodigoNum(a.codigo_num, b.codigo_num);
  });

  let orden = 1;
  const updated = [];
  for (const row of rows) {
    const prioridad = prioridadFromCodigoNum(row.codigo_num);
    const nombre = buildPlanItemNombre(row);
    const up = await query(
      `UPDATE plantrabd SET orden = $3, prioridad = $4, nombre = $5
       WHERE cnplan = $1 AND item = $2 RETURNING *`,
      [cnplan, row.item, orden, prioridad, nombre],
    );
    if (up.rows[0]) updated.push(up.rows[0]);
    orden += 1;
  }

  return { count: updated.length, items: updated };
}

export async function reordenarPlanItems(cnplan, items = []) {
  await ensurePlanEditable(cnplan);
  if (!Array.isArray(items) || !items.length) {
    const err = new Error('Indique el nuevo orden de las actividades');
    err.status = 400;
    throw err;
  }
  const updated = [];
  for (const row of items) {
    const item = Number(row.item);
    const orden = Number(row.orden);
    if (!Number.isFinite(item) || !Number.isFinite(orden)) continue;
    const res = await query(
      'UPDATE plantrabd SET orden = $3 WHERE cnplan = $1 AND item = $2 RETURNING *',
      [cnplan, item, orden],
    );
    if (res.rows[0]) updated.push(res.rows[0]);
  }
  return { count: updated.length, items: updated };
}

function buildPlanAreaBlocks(items) {
  const blockMap = new Map();
  for (const item of items) {
    const modulo = item.modulo || '_';
    const area = planItemArea(item.nombre, item.proc_nombre) || 'General';
    const key = `${modulo}|${area}`;
    if (!blockMap.has(key)) {
      blockMap.set(key, {
        modulo,
        area,
        modulo_orden: item.modulo_orden ?? 999,
        items: [],
      });
    }
    blockMap.get(key).items.push(item);
  }
  for (const block of blockMap.values()) {
    block.items.sort((a, b) => (Number(a.orden) || 0) - (Number(b.orden) || 0));
    block.minOrden = block.items[0]?.orden ?? 999;
  }
  return blockMap;
}

/** Mueve un bloque completo de agrupador (área) hacia arriba o abajo dentro del mismo módulo. */
export async function moverBloqueAgrupadorPlan(cnplan, { modulo, area, delta }) {
  await ensurePlanEditable(cnplan);
  const shift = Number(delta);
  if (!Number.isFinite(shift) || shift === 0) {
    const err = new Error('Indique la dirección del movimiento (delta distinto de cero)');
    err.status = 400;
    throw err;
  }
  const areaName = String(area || '').trim();
  if (!areaName) {
    const err = new Error('Indique el agrupador (área) a mover');
    err.status = 400;
    throw err;
  }

  const res = await query(
    `SELECT d.cnplan, d.item, d.nombre, d.orden, pr.modulo, pr.nombre AS proc_nombre,
            m.orden AS modulo_orden
     FROM plantrabd d
     LEFT JOIN qrysproc pr ON pr.codigo = d.proceso_codigo
     LEFT JOIN qrysmod m ON m.codigo = pr.modulo
     WHERE d.cnplan = $1`,
    [cnplan],
  );
  if (!res.rows.length) {
    const err = new Error('El plan no tiene actividades');
    err.status = 404;
    throw err;
  }

  const modKey = modulo != null && String(modulo).trim() !== '' ? String(modulo).trim() : '_';
  const blockMap = buildPlanAreaBlocks(res.rows);
  const byMod = new Map();
  for (const block of blockMap.values()) {
    if (!byMod.has(block.modulo)) byMod.set(block.modulo, []);
    byMod.get(block.modulo).push(block);
  }

  const modBlocks = (byMod.get(modKey) || []).sort((a, b) => {
    const diff = (a.minOrden ?? 999) - (b.minOrden ?? 999);
    if (diff !== 0) return diff;
    return a.area.localeCompare(b.area, 'es');
  });
  const idx = modBlocks.findIndex((b) => b.area === areaName);
  if (idx < 0) {
    const err = new Error(`Agrupador «${areaName}» no encontrado en el módulo`);
    err.status = 404;
    throw err;
  }
  const newIdx = idx + shift;
  if (newIdx < 0 || newIdx >= modBlocks.length) {
    const err = new Error('No se puede mover el agrupador más en esa dirección');
    err.status = 400;
    throw err;
  }

  [modBlocks[idx], modBlocks[newIdx]] = [modBlocks[newIdx], modBlocks[idx]];

  const modulos = [...byMod.keys()].sort((a, b) => {
    const ao = byMod.get(a)[0]?.modulo_orden ?? 999;
    const bo = byMod.get(b)[0]?.modulo_orden ?? 999;
    if (ao !== bo) return ao - bo;
    return String(a).localeCompare(String(b), 'es');
  });

  const allBlocks = [];
  for (const mod of modulos) {
    const blocks = mod === modKey
      ? modBlocks
      : byMod.get(mod).sort((a, b) => {
        const diff = (a.minOrden ?? 999) - (b.minOrden ?? 999);
        if (diff !== 0) return diff;
        return a.area.localeCompare(b.area, 'es');
      });
    allBlocks.push(...blocks);
  }

  let orden = 1;
  const updates = [];
  for (const block of allBlocks) {
    for (const item of block.items) {
      updates.push({ item: item.item, orden });
      orden += 1;
    }
  }

  return reordenarPlanItems(cnplan, updates);
}

export { PLAN_ESTADOS, ITEM_ESTADOS };
