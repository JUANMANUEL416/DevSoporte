import { agregarTemaCronograma, cambiarEstadoItemCronograma, cambiarEstadoTemaCronograma } from '../services/cronogramaHooks.js';

export async function agregarTemaHandler(req, res, next) {
  try {
    const result = await agregarTemaCronograma(req.params.id, req.body || {});
    res.json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
}

export async function cambiarEstadoItemHandler(req, res, next) {
  try {
    const item = Number(req.params.item);
    if (!Number.isFinite(item)) {
      return res.status(400).json({ error: 'Ítem inválido' });
    }
    const row = await cambiarEstadoItemCronograma(req.params.id, item, req.body || {});
    res.json(row);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
}

export async function cambiarEstadoTemaHandler(req, res, next) {
  try {
    const result = await cambiarEstadoTemaCronograma(req.params.id, req.body || {});
    res.json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
}
