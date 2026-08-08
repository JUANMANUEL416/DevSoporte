import { Router } from 'express';
import { isAiOrganizarConfigured, organizarTexto, procesarAi } from '../services/aiOrganizarTexto.js';

const router = Router();

router.get('/status', (req, res) => {
  res.json({ configured: isAiOrganizarConfigured() });
});

router.post('/organizar-texto', async (req, res, next) => {
  try {
    const { texto, modo, contexto } = req.body || {};
    const result = await organizarTexto(texto, { modo, contexto });
    res.json({ texto: result });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    next(err);
  }
});

router.post('/procesar', async (req, res, next) => {
  try {
    const { accion, ...payload } = req.body || {};
    if (!accion) {
      return res.status(400).json({ error: 'Acción requerida' });
    }
    const result = await procesarAi(accion, payload);
    res.json(result);
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    next(err);
  }
});

export default router;
