import { query } from '../db/pool.js';

/** Expresión SQL: área del ítem (ej. «Inventario» en «Inventario / Bodegas»). Prioriza el proceso. */
export const PLAN_ITEM_AREA_SQL = `TRIM(SPLIT_PART(COALESCE(NULLIF(TRIM(pr.nombre), ''), NULLIF(TRIM(d.nombre), ''), ''), ' / ', 1))`;

/** Primer agrupador Qrystalos del proceso (si pertenece a varios). */
export const PLAN_ITEM_GRUPO_LATERAL = `
  LEFT JOIN LATERAL (
    SELECT g.codigo AS grupo_codigo, g.nombre AS grupo_nombre
    FROM qrysgrupod gd
    JOIN qrysgrupo g ON g.codigo = gd.grupo
    WHERE gd.proceso = d.proceso_codigo AND COALESCE(g.estado, 'A') = 'A'
    ORDER BY g.codigo
    LIMIT 1
  ) grp ON true
`;

export function planItemArea(nombre, procNombre) {
  const text = String(procNombre || nombre || '').trim();
  const idx = text.indexOf(' / ');
  if (idx > 0) return text.slice(0, idx).trim();
  return '';
}

export function planItemSubtitulo(nombre, procNombre, grupoNombre) {
  const text = String(procNombre || nombre || '').trim();
  const idx = text.indexOf(' / ');
  if (idx > 0) return text.slice(idx + 3).trim();
  return String(grupoNombre || text).trim();
}

export function planItemActividadLabel(item) {
  const subt = planItemSubtitulo(item?.nombre, item?.proc_nombre, '');
  return subt || item?.nombre || item?.proc_nombre || '—';
}

/** Agrupador padre del plan (Inventario, Financiero…) — prefijo del proceso, no el qrysgrupo suelto. */
export function planItemAgrupadorPadre(item) {
  return planItemArea(item?.nombre, item?.proc_nombre) || 'General';
}

export function buildPlanItemNombre(row) {
  const area = planItemArea(row.nombre, row.proc_nombre);
  const subt = planItemSubtitulo(row.nombre, row.proc_nombre, '');
  if (area && subt) return `${area} / ${subt}`;
  return row.proc_nombre || row.nombre || area || '—';
}

export function temaCodigoArea(codigoModulo, area) {
  return `${codigoModulo}|${area}`;
}

export async function listPlanItemsModuloArea(cnplan, codigoModulo, area) {
  const res = await query(
    `SELECT d.nombre, d.tiempo_estimado, d.orden, pr.nombre AS proc_nombre, pr.codigo_num,
            grp.grupo_codigo AS grupo, grp.grupo_nombre
     FROM plantrabd d
     JOIN qrysproc pr ON pr.codigo = d.proceso_codigo
     ${PLAN_ITEM_GRUPO_LATERAL}
     WHERE d.cnplan = $1
       AND pr.modulo = $2
       AND ${PLAN_ITEM_AREA_SQL} = $3
       AND d.estado <> 'Cancelado'
       AND d.proceso_codigo IS NOT NULL
     ORDER BY d.orden ASC, pr.codigo_num ASC, d.item ASC`,
    [cnplan, codigoModulo, area],
  );
  return res.rows;
}

/** Secciones (módulo + área) del plan para cronograma y temas de capacitación. */
export async function listPlanSeccionesArea(cnplan) {
  const res = await query(
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
  return res.rows;
}

export async function listPlanItemsModuloAgrupador(cnplan, codigoModulo, codigoGrupo) {
  const res = await query(
    `SELECT d.nombre, d.tiempo_estimado, d.orden, pr.nombre AS proc_nombre, pr.codigo_num,
            g.codigo AS grupo, g.nombre AS grupo_nombre
     FROM plantrabd d
     JOIN qrysproc pr ON pr.codigo = d.proceso_codigo
     JOIN qrysgrupod gd ON gd.proceso = d.proceso_codigo AND gd.grupo = $3
     JOIN qrysgrupo g ON g.codigo = gd.grupo
     WHERE d.cnplan = $1
       AND pr.modulo = $2
       AND d.estado <> 'Cancelado'
       AND d.proceso_codigo IS NOT NULL
     ORDER BY d.orden ASC, pr.codigo_num ASC, d.item ASC`,
    [cnplan, codigoModulo, codigoGrupo],
  );
  return res.rows;
}
