import { buildPlanTrabajoPdf, fetchPlanTrabajo, planTrabajoPdfFileName } from '../services/planTrabajoPdf.js';
import {
  previewNotificacionPlanTrabajo,
  enviarNotificacionPlanTrabajo,
} from '../services/planTrabajoEmail.js';

export async function planTrabajoPdfHandler(req, res, next) {
  try {
    const data = await fetchPlanTrabajo(req.params.id);
    if (!data) return res.status(404).json({ error: 'Plan de trabajo no encontrado' });
    if (!data.items.length) {
      return res.status(404).json({ error: 'El plan no tiene actividades' });
    }

    const pdf = await buildPlanTrabajoPdf(data);
    const filename = planTrabajoPdfFileName(data.encabezado);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(filename)}"`);
    res.send(pdf);
  } catch (err) {
    next(err);
  }
}

export async function previewPlanTrabajoHandler(req, res, next) {
  try {
    const content = await previewNotificacionPlanTrabajo(req.params.id);
    res.json(content);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
}

export async function enviarPlanTrabajoHandler(req, res, next) {
  try {
    const result = await enviarNotificacionPlanTrabajo(req.params.id, req.body || {}, req.user?.usuario);
    if (result.error) return res.status(400).json(result);
    res.json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
}
