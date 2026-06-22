import { Router } from 'express';
import { cerrarBitacora, getSemanaForBitacora } from '../services/bitacoraSemana.js';

const router = Router();

router.get('/:id/cerrar-info', async (req, res, next) => {
  try {
    const bita = await getSemanaForBitacora(req.params.id);
    if (!bita) return res.status(404).json({ error: 'No encontrado' });

    const terminado = (bita.estado || '').toLowerCase() === 'terminado';
    res.json({
      cnssoporte: req.params.id,
      estado: bita.estado,
      fechaini: bita.fechaini,
      fechafin: bita.fechafin,
      idsemana: bita.idsemana,
      puedeCerrar: !terminado,
      motivo: terminado ? 'El soporte ya está cerrado' : '',
    });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/cerrar', async (req, res, next) => {
  try {
    const row = await cerrarBitacora(req.params.id, req.body || {});
    res.json(row);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

export default router;
