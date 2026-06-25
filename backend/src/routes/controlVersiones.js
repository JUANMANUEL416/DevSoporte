import { Router } from 'express';
import { query } from '../db/pool.js';
import { getAppVersion } from '../version.js';

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
    if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
      return res.status(400).json({ error: 'Indique una versión semver válida (ej. 1.2.0)' });
    }
    if (!Array.isArray(consecutivos) || !consecutivos.length) {
      return res.status(400).json({ error: 'Seleccione al menos un cambio integrado' });
    }

    const integrados = await query(
      `SELECT consecutivo FROM devcamb
       WHERE consecutivo = ANY($1::text[]) AND estado = 'integrado'`,
      [consecutivos],
    );
    if (integrados.rows.length !== consecutivos.length) {
      return res.status(400).json({
        error: 'Solo se pueden publicar cambios en estado integrado',
      });
    }

    await query(
      `INSERT INTO devver (version, resumen, changelog, usuario)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (version) DO UPDATE
       SET resumen = EXCLUDED.resumen,
           changelog = EXCLUDED.changelog,
           fecha = NOW(),
           usuario = EXCLUDED.usuario`,
      [version, resumen || null, changelog || null, req.user?.usuario || null],
    );

    const published = await query(
      `UPDATE devcamb
       SET estado = 'publicado',
           version = $1,
           f_publicacion = NOW(),
           f_terminacion = COALESCE(f_terminacion, NOW())
       WHERE consecutivo = ANY($2::text[])
       RETURNING *`,
      [version, consecutivos],
    );

    res.json({
      version,
      publicados: published.rows.length,
      cambios: published.rows,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
