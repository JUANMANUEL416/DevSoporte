import { Router } from 'express';
import { query } from '../db/pool.js';
import { persistSemanasRango } from '../services/generarSemanas.js';

const router = Router();

router.post('/generar', async (req, res, next) => {
  try {
    const body = req.body || {};
    const now = new Date().getFullYear();
    const from = Number(body.desde) || Number(body.anio) || now;
    const to = Number(body.hasta) || Number(body.anio) || from;

    if (!Number.isInteger(from) || !Number.isInteger(to) || from < 1970 || to > 2100) {
      return res.status(400).json({ error: 'Año inválido' });
    }

    const count = await persistSemanasRango((sql, params) => query(sql, params), from, to);
    res.json({ ok: true, desde: from, hasta: to, semanas: count });
  } catch (err) {
    next(err);
  }
});

export default router;
