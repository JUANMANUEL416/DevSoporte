import { fetchActproyReport, buildActproyPdf, actproyPdfFileName } from '../services/actproyPdf.js';
import { enviarFirmaActproy, previewInformeActproy, enviarInformeActproy } from '../services/actproyEmail.js';
import { getActproyFirmaEstado, createActproyFirmaLink } from '../services/actproyFirma.js';

export async function actproyPdfHandler(req, res, next) {
  try {
    const row = await fetchActproyReport(req.params.id);
    if (!row) return res.status(404).json({ error: 'Informe no encontrado' });
    const pdf = await buildActproyPdf(row);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(actproyPdfFileName(row))}"`,
    );
    res.send(pdf);
  } catch (err) {
    next(err);
  }
}

export async function actproyFirmaEstadoHandler(req, res, next) {
  try {
    const estado = await getActproyFirmaEstado(req.params.id);
    if (!estado) return res.status(404).json({ error: 'Informe no encontrado' });
    res.json({
      consecutivo: estado.row.consecutivo,
      firmado: !estado.puedeFirmar && Boolean(estado.row.firma_cli_fecha),
      firma_fecha: estado.row.firma_cli_fecha || null,
      firma_nombre: estado.row.firma_cli_nombre || null,
      puedeFirmar: estado.puedeFirmar,
      bloqueoMotivo: estado.bloqueoMotivo || '',
      url: createActproyFirmaLink(estado.row.consecutivo),
    });
  } catch (err) {
    next(err);
  }
}

export async function actproyEnviarFirmaHandler(req, res, next) {
  try {
    const result = await enviarFirmaActproy(req.params.id, {
      emails: req.body?.emails || null,
      usuario: req.user?.usuario || null,
    });
    if (result.error && !result.sent) return res.status(400).json(result);
    res.json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
}

export async function actproyPreviewInformeHandler(req, res, next) {
  try {
    const data = await previewInformeActproy(req.params.id);
    res.json(data);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
}

export async function actproyEnviarInformeHandler(req, res, next) {
  try {
    const result = await enviarInformeActproy(req.params.id, req.body || {}, req.user?.usuario || null);
    if (result.error && !result.sent) return res.status(400).json(result);
    res.json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
}
