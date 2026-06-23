import { Router } from 'express';
import multer from 'multer';
import { query } from '../db/pool.js';
import { sendMail, isMailConfigured } from '../services/mailer.js';
import {
  getCorreoPlantilla,
  saveCorreoPlantilla,
  buildCorreoHtml,
  buildCorreoText,
} from '../services/correoPlantilla.js';

// Adjuntos en memoria (no se persiste el binario; sólo se reenvía y se
// registra el nombre/tamaño en la bitácora de correos).
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024, files: 10 },
});

const router = Router();

function parseEmails(input) {
  if (!input) return [];
  let raw = input;
  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (trimmed.startsWith('[')) {
      try {
        raw = JSON.parse(trimmed);
      } catch {
        raw = trimmed;
      }
    }
  }
  const text = Array.isArray(raw) ? raw.join(',') : String(raw);
  return [
    ...new Set(
      text
        .split(/[\s,;]+/)
        .map((e) => e.trim())
        .filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)),
    ),
  ];
}


async function loadCliente(codigo) {
  if (!codigo) return null;
  const res = await query(
    'SELECT codigo, nombrecliente, email, liderproyecto, noticliente FROM clie WHERE codigo = $1',
    [codigo],
  );
  return res.rows[0] || null;
}

// ENVIAR un correo desde la bandeja (con adjuntos opcionales).
router.post('/enviar', upload.array('adjuntos', 10), async (req, res, next) => {
  try {
    const cliente = (req.body.cliente || '').trim() || null;
    const asunto = (req.body.asunto || '').trim();
    const cuerpo = (req.body.cuerpo || '').toString();
    const para = parseEmails(req.body.para);
    const cc = parseEmails(req.body.cc);

    if (!asunto) return res.status(400).json({ error: 'El asunto es obligatorio' });
    if (!cuerpo.trim()) return res.status(400).json({ error: 'El mensaje es obligatorio' });
    if (!para.length) {
      return res.status(400).json({ error: 'Indique al menos un destinatario (Para) válido' });
    }
    if (!isMailConfigured()) {
      return res.status(400).json({ error: 'El servidor de correo (SMTP) no está configurado' });
    }

    const clienteRow = cliente ? await loadCliente(cliente) : null;
    const plantilla = await getCorreoPlantilla();

    const attachments = (req.files || []).map((f) => ({
      filename: f.originalname,
      content: f.buffer,
      contentType: f.mimetype,
    }));

    const meta = {
      cliente,
      nombrecliente: clienteRow?.nombrecliente || null,
      contexto: 'bandeja',
      referencia: null,
      usuario: req.user?.usuario || null,
      cuerpo,
    };

    try {
      await sendMail({
        to: para.join(', '),
        cc: cc.length ? cc.join(', ') : undefined,
        subject: asunto,
        text: buildCorreoText(cuerpo, plantilla),
        html: buildCorreoHtml(asunto, cuerpo, plantilla),
        attachments,
        meta,
      });
      res.json({
        sent: true,
        para,
        cc,
        adjuntos: attachments.map((a) => a.filename),
      });
    } catch (err) {
      res.status(502).json({ error: `No se pudo enviar el correo: ${err.message}` });
    }
  } catch (err) {
    next(err);
  }
});

router.get('/plantilla', async (req, res, next) => {
  try {
    res.json(await getCorreoPlantilla());
  } catch (err) {
    next(err);
  }
});

router.put('/plantilla', async (req, res, next) => {
  try {
    const saved = await saveCorreoPlantilla(req.body || {}, req.user?.usuario || null);
    res.json(saved);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

// LISTAR historial de correos (con filtros).
router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 25));
    const params = [];
    const clauses = [];

    const q = (req.query.q || '').trim();
    if (q) {
      params.push(`%${q}%`);
      clauses.push(
        '(CAST(asunto AS TEXT) ILIKE $1 OR CAST(para AS TEXT) ILIKE $1 OR CAST(nombrecliente AS TEXT) ILIKE $1)',
      );
    }
    if (req.query.cliente) {
      params.push(req.query.cliente);
      clauses.push(`cliente = $${params.length}`);
    }
    if (req.query.contexto && req.query.contexto !== 'Todos') {
      params.push(req.query.contexto);
      clauses.push(`contexto = $${params.length}`);
    }
    if (req.query.exito === 'true' || req.query.exito === 'false') {
      params.push(req.query.exito === 'true');
      clauses.push(`exito = $${params.length}`);
    }
    if ((req.query.desde || '').trim()) {
      params.push(req.query.desde.trim());
      clauses.push(`fecha >= $${params.length}::date`);
    }
    if ((req.query.hasta || '').trim()) {
      params.push(req.query.hasta.trim());
      clauses.push(`fecha < ($${params.length}::date + 1)`);
    }

    const where = clauses.length ? 'WHERE ' + clauses.join(' AND ') : '';
    const totalRes = await query(`SELECT COUNT(*)::int AS total FROM correos ${where}`, params);
    const total = totalRes.rows[0].total;

    params.push(limit, (page - 1) * limit);
    const rows = await query(
      `SELECT id, fecha, cliente, nombrecliente, contexto, referencia, para, cc, asunto,
              adjuntos, num_destinatarios, exito, error, usuario
       FROM correos ${where}
       ORDER BY fecha DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );

    res.json({ data: rows.rows, total, page, limit });
  } catch (err) {
    next(err);
  }
});

// DETALLE de un correo (incluye el cuerpo).
router.get('/:id', async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM correos WHERE id = $1', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Correo no encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

export default router;
