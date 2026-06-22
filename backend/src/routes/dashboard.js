import { Router } from 'express';
import { query } from '../db/pool.js';

const router = Router();

router.get('/stats', async (req, res, next) => {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const [clientesRes, bitacorasRes, capacitacionesRes] = await Promise.all([
      query('SELECT COUNT(*)::int AS total FROM clie'),
      query(
        'SELECT COUNT(*)::int AS total FROM bita WHERE fecha >= $1 AND fecha < $2',
        [monthStart, monthEnd],
      ),
      query(
        'SELECT COUNT(*)::int AS total FROM rasist WHERE fecha >= $1 AND fecha < $2',
        [monthStart, monthEnd],
      ),
    ]);

    res.json({
      clientes: clientesRes.rows[0].total,
      bitacorasMes: bitacorasRes.rows[0].total,
      capacitacionesMes: capacitacionesRes.rows[0].total,
      mes: now.getMonth() + 1,
      anio: now.getFullYear(),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
