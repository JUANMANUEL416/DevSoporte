import {
  fetchCapacitacionReport,
  buildCapacitacionPdf,
  pdfFileName,
} from '../services/capacitacionPdf.js';

export async function capacitacionPdfHandler(req, res, next) {
  try {
    const data = await fetchCapacitacionReport(req.params.id);
    if (!data) return res.status(404).json({ error: 'Capacitación no encontrada' });

    const pdf = await buildCapacitacionPdf(data);
    const filename = pdfFileName(data.capacitacion);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.send(pdf);
  } catch (err) {
    next(err);
  }
}
