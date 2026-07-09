import { fetchActreunReport, buildActreunPdf, actreunPdfFileName } from '../services/actreunPdf.js';
import {
  finalizarActreun,
  getActreunResumenFirmas,
  createActreunFirmaLink,
} from '../services/actreunFirma.js';
import {
  sendActreunFirmasPendientes,
  sendActreunFirmaLinkEmail,
  previewActaActreun,
  enviarActaActreun,
} from '../services/actreunEmail.js';
import { emailSkipReasonMessage } from '../services/firmaEmail.js';
import { query } from '../db/pool.js';

export async function actreunPdfHandler(req, res, next) {
  try {
    const row = await fetchActreunReport(req.params.id);
    if (!row) return res.status(404).json({ error: 'Acta no encontrada' });
    const pdf = await buildActreunPdf(row);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(actreunPdfFileName(row))}"`,
    );
    res.send(pdf);
  } catch (err) {
    next(err);
  }
}

export async function actreunFirmaEstadoHandler(req, res, next) {
  try {
    const resumen = await getActreunResumenFirmas(req.params.id);
    if (!resumen) return res.status(404).json({ error: 'Acta no encontrada' });
    res.json(resumen);
  } catch (err) {
    next(err);
  }
}

export async function actreunFinalizarHandler(req, res, next) {
  try {
    const row = await finalizarActreun(req.params.id);
    res.json({ ok: true, consecutivo: row.consecutivo, estado: row.estado });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
}

export async function actreunEnviarFirmasHandler(req, res, next) {
  try {
    const result = await sendActreunFirmasPendientes(req.params.id);
    if (result.error && !result.sent) return res.status(400).json(result);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function actreunEnviarFirmaAsistenteHandler(req, res, next) {
  try {
    const parts = String(req.params.id).split('~');
    if (parts.length !== 2) return res.status(400).json({ error: 'Id inválido' });
    const [consecutivo, item] = parts;

    const exists = await query(
      'SELECT consecutivo, item, nombre, documento FROM actreund WHERE consecutivo = $1 AND item = $2',
      [consecutivo, Number(item)],
    );
    if (!exists.rows.length) return res.status(404).json({ error: 'Asistente no encontrado' });

    const result = await sendActreunFirmaLinkEmail(exists.rows[0]);
    if (!result.sent) {
      const msg = emailSkipReasonMessage(result.reason);
      const status = result.reason === 'smtp_no_configurado' ? 503 : 422;
      return res.status(status).json({ error: msg, reason: result.reason });
    }
    res.json({ ok: true, email: result.email, nombres: result.nombres });
  } catch (err) {
    next(err);
  }
}

export async function actreunPreviewActaHandler(req, res, next) {
  try {
    const data = await previewActaActreun(req.params.id);
    res.json(data);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
}

export async function actreunEnviarActaHandler(req, res, next) {
  try {
    const result = await enviarActaActreun(req.params.id, req.body || {}, req.user?.usuario || null);
    if (result.error && !result.sent) return res.status(400).json(result);
    res.json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
}

export async function actreunFirmaLinkHandler(req, res, next) {
  try {
    const parts = String(req.params.id).split('~');
    if (parts.length !== 2) return res.status(400).json({ error: 'Id inválido' });
    const [consecutivo, item] = parts;
    const row = await query(
      'SELECT consecutivo, item, documento FROM actreund WHERE consecutivo = $1 AND item = $2',
      [consecutivo, Number(item)],
    );
    if (!row.rows.length || !row.rows[0].documento) {
      return res.status(404).json({ error: 'Asistente sin documento' });
    }
    const { documento } = row.rows[0];
    res.json({ url: createActreunFirmaLink(consecutivo, item, documento) });
  } catch (err) {
    next(err);
  }
}
