import {
  previewNotificacionBitacora,
  previewNotificacionCapacitacion,
} from '../services/notificacionEmail.js';

export async function previewCapacitacionHandler(req, res, next) {
  try {
    const content = await previewNotificacionCapacitacion(req.params.id);
    res.json(content);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
}

export async function previewBitacoraHandler(req, res, next) {
  try {
    const content = await previewNotificacionBitacora(req.params.id);
    res.json(content);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
}
