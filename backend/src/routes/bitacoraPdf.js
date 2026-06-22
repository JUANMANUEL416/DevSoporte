import {
  fetchBitacoraSemanaCliente,
  buildBitacoraPdf,
  bitacoraPdfFileName,
} from '../services/bitacoraPdf.js';

export async function bitacoraPdfHandler(req, res, next) {
  try {
    const { cnsbite, cliente } = req.params;
    const data = await fetchBitacoraSemanaCliente(cnsbite, cliente);
    if (!data) return res.status(404).json({ error: 'Semana o cliente no encontrado' });
    if (!data.soportes.length) {
      return res.status(404).json({ error: 'No hay soportes para este cliente en la semana' });
    }

    const pdf = await buildBitacoraPdf(data);
    const filename = bitacoraPdfFileName(data.encabezado);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.send(pdf);
  } catch (err) {
    next(err);
  }
}
