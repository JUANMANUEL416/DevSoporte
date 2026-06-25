import { Router } from 'express';
import { query } from '../db/pool.js';
import { getAppVersion } from '../version.js';
import { publicarVersion } from '../services/controlVersionesPublish.js';

const router = Router();

router.get('/resumen', async (req, res, next) => {
  try {
    const [pendientes, integrados, versiones] = await Promise.all([
      query(
        `SELECT COUNT(*)::int AS total FROM devcamb WHERE estado = 'en_desarrollo'`,
      ),
      query(`SELECT COUNT(*)::int AS total FROM devcamb WHERE estado = 'integrado'`),
      query(`SELECT version, fecha, resumen FROM devver ORDER BY fecha DESC LIMIT 5`),
    ]);
    res.json({
      versionActual: getAppVersion(),
      pendientes: pendientes.rows[0]?.total ?? 0,
      listosPublicar: integrados.rows[0]?.total ?? 0,
      ultimasVersiones: versiones.rows,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/:consecutivo/integrar', async (req, res, next) => {
  try {
    const { consecutivo } = req.params;
    const { cambios } = req.body || {};
    const existing = await query('SELECT * FROM devcamb WHERE consecutivo = $1', [consecutivo]);
    if (!existing.rows.length) {
      return res.status(404).json({ error: 'Cambio no encontrado' });
    }
    const row = existing.rows[0];
    if (row.estado === 'publicado') {
      return res.status(409).json({ error: 'El cambio ya está publicado' });
    }
    const result = await query(
      `UPDATE devcamb
       SET estado = 'integrado',
           f_integracion = COALESCE(f_integracion, NOW()),
           f_terminacion = COALESCE(f_terminacion, NOW()),
           cambios = COALESCE($2, cambios)
       WHERE consecutivo = $1
       RETURNING *`,
      [consecutivo, cambios || null],
    );
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

router.post('/publicar', async (req, res, next) => {
  try {
    const { version, resumen, changelog, consecutivos } = req.body || {};
    const result = await publicarVersion({
      version,
      resumen,
      changelog,
      consecutivos,
      usuario: req.user?.usuario || null,
    });
    res.json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

export default router;
