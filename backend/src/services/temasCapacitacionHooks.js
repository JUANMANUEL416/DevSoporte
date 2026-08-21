import { query } from '../db/pool.js';
import { generarConsecutivo } from './consecutivo.js';
import {
  listPlanItemsModuloArea,
  planItemSubtitulo,
} from './planTrabajoAreas.js';
import { listProcesosGrupo } from './planTrabajoHooks.js';

const DEFAULT_DURACION_MIN = 15;

function isGrouperTipo(tipo) {
  return /titulo/i.test(String(tipo || ''));
}

function duracionPlanMinutos(tiempoEstimado) {
  const n = Number(tiempoEstimado);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_DURACION_MIN;
}

export async function importTemaDesdeGrupo({
  grupo,
  nombre,
  dirigidoa = '',
  observacion = '',
} = {}) {
  const codigoGrupo = String(grupo || '').trim();
  if (!codigoGrupo) {
    const err = new Error('Indique el agrupador Qrystalos');
    err.status = 400;
    throw err;
  }

  const grpRes = await query(
    'SELECT codigo, nombre FROM qrysgrupo WHERE codigo = $1 AND COALESCE(estado, $2) = $2',
    [codigoGrupo, 'A'],
  );
  const grp = grpRes.rows[0];
  if (!grp) {
    const err = new Error('Agrupador no encontrado o inactivo');
    err.status = 404;
    throw err;
  }

  const dup = await query(
    `SELECT codigo, nombre FROM captema
     WHERE qrys_grupo = $1 AND cnplan IS NULL AND COALESCE(estado, 'A') = 'A'`,
    [codigoGrupo],
  );
  if (dup.rows[0]) {
    const err = new Error(`Ya existe el tema «${dup.rows[0].nombre}» para este agrupador`);
    err.status = 409;
    throw err;
  }

  const procs = (await listProcesosGrupo(codigoGrupo)).filter((p) => !isGrouperTipo(p.tipo));
  if (!procs.length) {
    const err = new Error('El agrupador no tiene procesos seleccionables (sin títulos vacíos)');
    err.status = 400;
    throw err;
  }

  const codigo = await generarConsecutivo({ acnsPrefijo: 'CAPTEMA', pad: 6 });
  const temaNombre = String(nombre || grp.nombre).trim() || grp.nombre;

  await query(
    `INSERT INTO captema (codigo, nombre, estado, observacion, dirigidoa, qrys_grupo)
     VALUES ($1, $2, 'A', $3, $4, $5)`,
    [codigo, temaNombre, observacion || '', dirigidoa || '', codigoGrupo],
  );

  const items = [];
  let itemNum = 1;
  for (const p of procs) {
    const ins = await query(
      `INSERT INTO captemad (codigo, item, descripcion, duracion, estado)
       VALUES ($1, $2, $3, $4, 'A') RETURNING *`,
      [codigo, itemNum, p.nombre, p.duracion_sugerida || null],
    );
    items.push(ins.rows[0]);
    itemNum += 1;
  }

  return {
    codigo,
    nombre: temaNombre,
    qrys_grupo: codigoGrupo,
    count: items.length,
    items,
  };
}

/**
 * Inactiva temas activos del área en el módulo del plan y crea uno nuevo con sus ítems.
 */
export async function crearTemaDesdePlanArea(cnplan, codigoModulo, area) {
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

  const prevRes = await query(
    `UPDATE captema SET estado = 'I'
     WHERE cnplan = $1 AND modulo_codigo = $2 AND nombre = $3 AND COALESCE(estado, 'A') = 'A'
     RETURNING codigo`,
    [cnplan, codigoModulo, areaNombre],
  );

  const dirRes = await query(
    `SELECT dirigidoa FROM captema
     WHERE cnplan = $1 AND modulo_codigo = $2 AND nombre = $3
       AND TRIM(COALESCE(dirigidoa, '')) <> ''
     ORDER BY codigo DESC LIMIT 1`,
    [cnplan, codigoModulo, areaNombre],
  );
  const dirigidoa = dirRes.rows[0]?.dirigidoa || '';

  const codigo = await generarConsecutivo({ acnsPrefijo: 'CAPTEMA', pad: 6 });
  await query(
    `INSERT INTO captema (
       codigo, nombre, estado, observacion, dirigidoa, qrys_grupo,
       cnplan, modulo_codigo, modulo_nombre, modulo_orden
     ) VALUES ($1, $2, 'A', $3, $4, NULL, $5, $6, $7, $8)`,
    [
      codigo,
      areaNombre,
      `Generado desde plan ${cnplan}`,
      dirigidoa,
      cnplan,
      mod.codigo,
      mod.nombre,
      mod.orden ?? null,
    ],
  );

  let itemNum = 1;
  const items = [];
  for (const row of planItems) {
    const descripcion = planItemSubtitulo(row.nombre, row.proc_nombre, row.grupo_nombre);
    if (!descripcion) continue;
    const duracion = duracionPlanMinutos(row.tiempo_estimado);
    const ins = await query(
      `INSERT INTO captemad (codigo, item, descripcion, duracion, estado)
       VALUES ($1, $2, $3, $4, 'A') RETURNING *`,
      [codigo, itemNum, descripcion, duracion],
    );
    items.push(ins.rows[0]);
    itemNum += 1;
  }

  if (!items.length) {
    await query("UPDATE captema SET estado = 'I' WHERE codigo = $1", [codigo]);
    const err = new Error(
      `El área «${areaNombre}» no tiene actividades válidas en el plan (módulo ${mod.nombre})`,
    );
    err.status = 400;
    throw err;
  }

  return {
    codigo,
    nombre: areaNombre,
    cnplan,
    modulo_codigo: mod.codigo,
    modulo_nombre: mod.nombre,
    inactivados: prevRes.rowCount,
    count: items.length,
    items,
  };
}
