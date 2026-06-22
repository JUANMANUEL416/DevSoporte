import { query } from '../db/pool.js';
import { listDestinatariosNotificacion, listDestinatariosCierreCapacitacion, parseEquipoTrabajo, parseNoticliente } from '../services/clienteNotificaciones.js';

export default async function destinatariosHandler(req, res, next) {
  try {
    const { codigo } = req.params;
    const incluirEquipo = req.query.incluirEquipo === '1' || req.query.incluirEquipo === 'true';
    const result = await query(
      'SELECT codigo, nombrecliente, email, liderproyecto, noticliente FROM clie WHERE codigo = $1',
      [codigo],
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Cliente no encontrado' });
    const row = result.rows[0];
    const lider = parseEquipoTrabajo(row.liderproyecto, row);
    const notificacion = parseNoticliente(row.noticliente);
    const contactosConEmail = notificacion.filter((c) => c.email);
    const equipoConEmail = lider.filter((c) => c.email);
    const conEmail = incluirEquipo
      ? listDestinatariosCierreCapacitacion(row, 'all')
      : listDestinatariosNotificacion(row, 'all');
    res.json({
      codigo: row.codigo,
      nombrecliente: row.nombrecliente,
      equipo: lider,
      lider,
      contactos: notificacion,
      contactosConEmail,
      equipoConEmail,
      conEmail,
    });
  } catch (err) {
    next(err);
  }
}
