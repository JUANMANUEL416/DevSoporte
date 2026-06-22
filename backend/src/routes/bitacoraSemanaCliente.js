import { Router } from 'express';
import {
  getEstadoOpcionesSemanaCliente,
  cerrarSemanaCliente,
  syncBiteClieFromBita,
} from '../services/bitacoraSemanaClienteEstado.js';
import {
  previewNotificacionSemanaCliente,
  enviarNotificacionSemanaCliente,
} from '../services/notificacionEmail.js';

const router = Router();

router.get('/semana/:cnsbite/clientes-estado', async (req, res, next) => {
  try {
    const rows = await syncBiteClieFromBita(req.params.cnsbite);
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

router.get('/semana/:cnsbite/cliente/:cliente/estado-opciones', async (req, res, next) => {
  try {
    const data = await getEstadoOpcionesSemanaCliente(req.params.cnsbite, req.params.cliente);
    res.json(data);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

router.post('/semana/:cnsbite/cliente/:cliente/cerrar', async (req, res, next) => {
  try {
    const row = await cerrarSemanaCliente(req.params.cnsbite, req.params.cliente);
    res.json(row);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

router.get('/semana/:cnsbite/cliente/:cliente/preview-reporte', async (req, res, next) => {
  try {
    const data = await previewNotificacionSemanaCliente(req.params.cnsbite, req.params.cliente);
    res.json(data);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

router.post('/semana/:cnsbite/cliente/:cliente/enviar-reporte', async (req, res, next) => {
  try {
    const result = await enviarNotificacionSemanaCliente(
      req.params.cnsbite,
      req.params.cliente,
      req.body || {},
    );
    if (result.error) return res.status(400).json(result);
    res.json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

export default router;
