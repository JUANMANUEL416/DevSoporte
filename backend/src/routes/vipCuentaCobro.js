import { query } from '../db/pool.js';
import multer from 'multer';
import {
  VIP_CC_VARIABLES,
  DEFAULT_CC_PLANTILLA,
  VIP_CUENTA_HTML_DOCUMENT_STYLES,
  applyVipCuentaPlantilla,
  buildVipCuentaVariables,
} from '../services/vipCuentaCobroTemplate.js';
import { getEmisorConfig, buildVipClienteSampleCuenta } from '../services/vipCuentaCobro.js';
import {
  listVipDestinatarios,
  previewNotificacionVipCuentaCobro,
  enviarNotificacionVipCuentaCobro,
} from '../services/vipCuentaCobroEmail.js';

const vipEnviarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024, files: 10 },
});

export { vipEnviarUpload };

function parseEnviarBody(req) {
  const raw = req.body?.payload ?? req.body?.data;
  if (typeof raw === 'string' && raw.trim()) {
    try {
      return JSON.parse(raw);
    } catch {
      const err = new Error('Datos del correo inválidos');
      err.status = 400;
      throw err;
    }
  }
  return req.body || {};
}

export async function vipCuentaCobroPdfHandler(req, res, next) {
  try {
    const { buildVipCuentaPdfById } = await import('../services/vipCuentaCobroPdf.js');
    const result = await buildVipCuentaPdfById(req.params.id);
    if (!result) return res.status(404).json({ error: 'Cuenta de cobro no encontrada' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${result.filename}"`);
    res.send(result.pdf);
  } catch (err) {
    next(err);
  }
}

export async function vipCuentaPreviewHtmlHandler(req, res, next) {
  try {
    const { buildVipCuentaPreviewHtmlById } = await import('../services/vipCuentaCobroPdf.js');
    const result = await buildVipCuentaPreviewHtmlById(req.params.id);
    if (!result) return res.status(404).json({ error: 'Cuenta de cobro no encontrada' });
    res.json({ html: result.html });
  } catch (err) {
    next(err);
  }
}

export function vipPlantillaVariablesHandler(req, res) {
  res.json({
    variables: VIP_CC_VARIABLES,
    plantilla_default: DEFAULT_CC_PLANTILLA,
    document_styles: VIP_CUENTA_HTML_DOCUMENT_STYLES,
  });
}

export async function vipClientePlantillaPreviewHandler(req, res, next) {
  try {
    const codigo = req.params.codigo;
    const clRes = await query('SELECT * FROM vipclie WHERE codigo = $1', [codigo]);
    if (!clRes.rows.length) return res.status(404).json({ error: 'Cliente VIP no encontrado' });
    const cl = clRes.rows[0];

    const plantilla = String(req.body?.cc_plantilla ?? cl.cc_plantilla ?? '').trim() || DEFAULT_CC_PLANTILLA;
    const sample = buildVipClienteSampleCuenta(cl, { cc_plantilla: plantilla });
    const vars = buildVipCuentaVariables(sample, getEmisorConfig());
    const html = applyVipCuentaPlantilla(plantilla, vars);
    res.json({ html, variables: vars });
  } catch (err) {
    next(err);
  }
}

export async function vipClientePlantillaPreviewPdfHandler(req, res, next) {
  try {
    const codigo = req.params.codigo;
    const clRes = await query('SELECT * FROM vipclie WHERE codigo = $1', [codigo]);
    if (!clRes.rows.length) return res.status(404).json({ error: 'Cliente VIP no encontrado' });
    const cl = clRes.rows[0];

    const plantilla = String(req.body?.cc_plantilla ?? cl.cc_plantilla ?? '').trim() || DEFAULT_CC_PLANTILLA;
    const sample = buildVipClienteSampleCuenta(cl, { cc_plantilla: plantilla });
    const { buildVipCuentaPdf, vipCuentaPdfFileName } = await import('../services/vipCuentaCobroPdf.js');
    const pdf = await buildVipCuentaPdf(sample);
    const filename = vipCuentaPdfFileName(sample);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.send(pdf);
  } catch (err) {
    next(err);
  }
}

export async function vipCuentaSiguienteNumeroHandler(req, res, next) {
  try {
    const { codigo_cliente, periodo_hasta, periodo_desde, fecha_emision } = req.query;
    if (!codigo_cliente) return res.status(400).json({ error: 'codigo_cliente requerido' });

    const clRes = await query(
      'SELECT cc_formato, cc_consecutivo, cc_relleno, cc_prefijo_num, cc_separador FROM vipclie WHERE codigo = $1',
      [codigo_cliente],
    );
    if (!clRes.rows.length) return res.status(404).json({ error: 'Cliente VIP no encontrado' });
    const cl = clRes.rows[0];

    let preview;
    if ((cl.cc_formato || '').toLowerCase() === 'secuencial') {
      const next = Number(cl.cc_consecutivo || 0) + 1;
      const pad = Math.max(1, Number(cl.cc_relleno) || 3);
      preview = `${cl.cc_prefijo_num || ''}${String(next).padStart(pad, '0')}`;
    } else {
      const ref = periodo_hasta || periodo_desde || fecha_emision || new Date().toISOString().slice(0, 10);
      const d = new Date(ref);
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      preview = `${d.getFullYear()}${cl.cc_separador ?? '-'}${mm}`;
    }

    res.json({
      preview,
      formato: cl.cc_formato,
      consecutivo_actual: cl.cc_consecutivo,
      separador: cl.cc_separador,
    });
  } catch (err) {
    next(err);
  }
}

export async function vipClienteDestinatariosHandler(req, res, next) {
  try {
    const data = await listVipDestinatarios(req.params.codigo);
    if (!data) return res.status(404).json({ error: 'Cliente VIP no encontrado' });
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function vipCuentaPreviewNotificacionHandler(req, res, next) {
  try {
    const data = await previewNotificacionVipCuentaCobro(req.params.id);
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function vipCuentaEnviarNotificacionHandler(req, res, next) {
  try {
    const body = parseEnviarBody(req);
    const extraAttachments = (req.files || []).map((f) => ({
      filename: f.originalname,
      content: f.buffer,
      contentType: f.mimetype || 'application/pdf',
    }));
    const result = await enviarNotificacionVipCuentaCobro(
      req.params.id,
      body,
      req.user?.usuario,
      { extraAttachments },
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
}
