import { Router } from 'express';
import { query } from '../db/pool.js';
import { applyClienteNotificaciones } from '../services/clienteNotificaciones.js';

const router = Router();

router.post('/:codigo/copiar-equipo-trabajo', async (req, res, next) => {
  try {
    const destino = String(req.params.codigo || '').trim();
    const origen = String(req.body?.origen || '').trim();
    if (!destino || !origen) {
      return res.status(400).json({ error: 'Indique cliente origen y destino' });
    }
    if (destino === origen) {
      return res.status(400).json({ error: 'El cliente origen y destino deben ser diferentes' });
    }

    const rows = await query(
      'SELECT codigo, liderproyecto, email, nombrecliente FROM clie WHERE codigo = ANY($1::text[])',
      [[destino, origen]],
    );
    const destRow = rows.rows.find((r) => r.codigo === destino);
    const origRow = rows.rows.find((r) => r.codigo === origen);
    if (!destRow) return res.status(404).json({ error: 'Cliente destino no encontrado' });
    if (!origRow) return res.status(404).json({ error: 'Cliente origen no encontrado' });
    if (!origRow.liderproyecto || !String(origRow.liderproyecto).trim()) {
      return res.status(400).json({ error: 'El cliente origen no tiene equipo de trabajo configurado' });
    }

    const body = applyClienteNotificaciones({
      liderproyecto: origRow.liderproyecto,
      email: destRow.email,
      nombrecliente: destRow.nombrecliente,
    });

    const result = await query(
      `UPDATE clie SET liderproyecto = $1, email = COALESCE($2, email)
       WHERE codigo = $3
       RETURNING codigo, nombrecliente, email, liderproyecto`,
      [body.liderproyecto, body.email || null, destino],
    );
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

export default router;
