import {
  cambiarEstadoCapacitacion,
  countAsistentes,
  getCapacitacionEstado,
  asistentesPendientesFirma,
} from '../services/capacitacionEstado.js';

export async function cambiarEstadoHandler(req, res, next) {
  try {
    const { id } = req.params;
    const { estado } = req.body || {};
    if (!estado) return res.status(400).json({ error: 'Estado requerido' });
    const row = await cambiarEstadoCapacitacion(id, estado);
    res.json(row);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
}

export async function estadoOpcionesHandler(req, res, next) {
  try {
    const { id } = req.params;
    const cap = await getCapacitacionEstado(id);
    if (!cap) return res.status(404).json({ error: 'Capacitación no encontrada' });

    const actual = cap.estado || 'Abierta';
    const total = await countAsistentes(id);
    const pendientes = await asistentesPendientesFirma(id);

    const puedeAnular = actual === 'Abierta' && total === 0;
    const puedeCerrar = actual === 'Abierta' && total > 0 && pendientes === 0;

    let motivoAnular = '';
    let motivoCerrar = '';
    if (actual !== 'Abierta') {
      motivoAnular = `La capacitación ya está ${actual.toLowerCase()}`;
      motivoCerrar = motivoAnular;
    } else {
      if (total > 0) motivoAnular = 'Solo se puede anular sin participantes';
      if (total === 0) motivoCerrar = 'Registre al menos un participante';
      else if (pendientes > 0) motivoCerrar = `Faltan ${pendientes} firma(s) pendiente(s)`;
    }

    res.json({
      estado: actual,
      participantes: total,
      firmasPendientes: pendientes,
      puedeAnular,
      puedeCerrar,
      motivoAnular,
      motivoCerrar,
    });
  } catch (err) {
    next(err);
  }
}
