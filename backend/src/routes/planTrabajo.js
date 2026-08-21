import {
  agregarGrupoPlan,
  agregarProcesosPlan,
  generarCronogramaDesdePlan,
  sincronizarCronogramaDesdePlan,
  listProcesosGrupo,
  reorganizarPlanPorModulo,
  reorganizarPlanPorAgrupador,
  reordenarPlanItems,
  moverBloqueAgrupadorPlan,
} from '../services/planTrabajoHooks.js';
import { importTemaDesdeGrupo } from '../services/temasCapacitacionHooks.js';

export async function procesosGrupoHandler(req, res, next) {
  try {
    const rows = await listProcesosGrupo(req.params.id);
    res.json(rows);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
}

export async function agregarProcesosHandler(req, res, next) {
  try {
    const procesos = req.body?.procesos || req.body?.proceso_codigos || [];
    const result = await agregarProcesosPlan(req.params.id, procesos);
    res.status(201).json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
}

export async function agregarGrupoHandler(req, res, next) {
  try {
    const result = await agregarGrupoPlan(req.params.id, req.body || {});
    res.status(201).json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
}

export async function reorganizarModuloHandler(req, res, next) {
  try {
    const result = await reorganizarPlanPorModulo(req.params.id);
    res.json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
}

export async function reorganizarAgrupadorHandler(req, res, next) {
  try {
    const result = await reorganizarPlanPorAgrupador(req.params.id);
    res.json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
}

export async function reordenarHandler(req, res, next) {
  try {
    const result = await reordenarPlanItems(req.params.id, req.body?.items || []);
    res.json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
}

export async function moverAgrupadorHandler(req, res, next) {
  try {
    const result = await moverBloqueAgrupadorPlan(req.params.id, req.body || {});
    res.json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
}

export async function generarCronogramaHandler(req, res, next) {
  try {
    const result = await generarCronogramaDesdePlan(req.params.id, {
      ...req.body,
      usuario: req.user?.usuario,
    });
    res.status(201).json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
}

export async function sincronizarCronogramaHandler(req, res, next) {
  try {
    const result = await sincronizarCronogramaDesdePlan(req.params.id);
    res.json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
}

export async function importTemaGrupoHandler(req, res, next) {
  try {
    const result = await importTemaDesdeGrupo(req.body || {});
    res.status(201).json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
}
