import {
  listCronogramasParaActa,
  listTemasParaActa,
  prefillActaDesdeCronograma,
} from '../services/cronogramaCapacitacion.js';

export async function cronogramasClienteActaHandler(req, res, next) {
  try {
    const rows = await listCronogramasParaActa(req.params.cliente);
    res.json(rows);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
}

export async function temasActaHandler(req, res, next) {
  try {
    const rows = await listTemasParaActa(req.params.id);
    res.json(rows);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
}

export async function prefillActaHandler(req, res, next) {
  try {
    const data = await prefillActaDesdeCronograma(req.params.id, req.params.temaCodigo);
    res.json(data);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
}
