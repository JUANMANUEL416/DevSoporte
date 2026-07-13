import { query } from '../db/pool.js';
import { sendMail } from './mailer.js';
import { listDestinatariosNotificacion } from './clienteNotificaciones.js';
import {
  applyNombreTemplate,
  extractIntroFromBody,
  stripLeadingGreeting,
  buildNotificationEmailHtml,
  buildPlainNotificationEmail,
} from './emailTemplate.js';
import { emailSkipReasonMessage } from './firmaEmail.js';
import {
  loadAsistenteActreun,
  createActreunFirmaLink,
  loadActreunContext,
  ESTADOS_ACTREUN,
} from './actreunFirma.js';
import { fetchActreunReport, buildActreunPdf, actreunPdfFileName } from './actreunPdf.js';

function fmtFecha(value) {
  if (!value) return '—';
  const dt = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(dt.getTime())) return '—';
  return dt.toLocaleDateString('es-CO');
}

function collectEmailList(body) {
  const emails = [];
  const seen = new Set();
  const add = (raw) => {
    const email = String(raw || '').trim();
    if (!email) return;
    const key = email.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    emails.push(email);
  };
  if (Array.isArray(body?.emails)) body.emails.forEach(add);
  if (Array.isArray(body?.extraEmails)) body.extraEmails.forEach(add);
  return emails;
}

function resolveDestinatarios(cliente, emailList) {
  if (!emailList.length) return [];
  const known = listDestinatariosNotificacion(cliente, 'all');
  const map = new Map(known.map((d) => [d.email.toLowerCase(), d]));
  return emailList.map((email) => map.get(email.toLowerCase()) || { email, nombre: '' });
}

async function buildActreunPdfAttachment(consecutivo) {
  const report = await fetchActreunReport(consecutivo);
  if (!report) {
    const err = new Error('Acta no encontrada para generar el PDF');
    err.status = 404;
    throw err;
  }
  const pdfBuffer = await buildActreunPdf(report);
  return {
    filename: actreunPdfFileName(report.header),
    content: pdfBuffer,
    contentType: 'application/pdf',
  };
}

export async function sendActreunFirmaLinkEmail(asistente, options = {}) {
  const row = await loadAsistenteActreun(asistente.consecutivo, asistente.item);
  if (!row) return { sent: false, reason: 'no_encontrado' };

  const email = row.funcionario_email?.trim();
  if (!email) {
    return { sent: false, reason: 'sin_email', nombres: row.nombre };
  }
  if (!row.documento?.trim()) {
    return { sent: false, reason: 'sin_documento', nombres: row.nombre };
  }

  const url = createActreunFirmaLink(row.consecutivo, row.item, row.documento);
  const defaults = buildFirmaDefaultContent(row);
  const subjectTpl = String(options.subject || '').trim() || defaults.subject;
  const bodyTpl = String(options.body || '').trim() || defaults.body;
  const subject = applyNombreTemplate(subjectTpl, row.nombre || 'participante')
    .replace(/\{\{url\}\}/gi, url);
  const intro = applyNombreTemplate(bodyTpl, row.nombre || 'participante')
    .replace(/\{\{url\}\}/gi, url);

  const text = `${intro.trim()}\n\nEnlace de firma:\n${url}\n\nDevSoporte`.trim();
  const html = `
<p>${String(intro).trim().replace(/\n/g, '<br>')}</p>
<p><a href="${url}">Haga clic aquí para firmar</a></p>
<p style="font-size:12px;color:#666;">Si el enlace no abre, copie y pegue esta URL:<br>${url}</p>
<p>DevSoporte</p>
  `.trim();

  let attachment = options.pdfAttachment || null;
  if (!attachment) {
    attachment = await buildActreunPdfAttachment(row.consecutivo);
  }

  const mail = await sendMail({
    to: email,
    subject,
    text,
    html,
    attachments: [attachment],
    meta: {
      cliente: row.cliente || null,
      nombrecliente: row.nombrecliente || null,
      contexto: 'actreun_firma',
      referencia: row.consecutivo,
      cuerpo: text,
    },
  });
  if (mail.skipped) {
    return { sent: false, reason: 'smtp_no_configurado', nombres: row.nombre, email };
  }
  return { sent: true, email, nombres: row.nombre };
}

function buildFirmaDefaultContent(row) {
  const nombreCliente = row?.nombrecliente || row?.cliente || '—';
  return {
    subject: `Firma acta de reunión — ${nombreCliente}`,
    body: `Estimado(a) {{nombre}},

Se requiere su firma digital como asistente al acta de reunión:

  Cliente:      ${nombreCliente}
  Fecha:        ${fmtFecha(row?.fecha)}
  Consecutivo:  ${row?.consecutivo || '—'}

Adjunto encontrará el PDF del acta para que revise los compromisos y acuerdos antes de firmar.

Deberá ingresar su número de documento antes de firmar.
El enlace es personal y válido por ${Number(process.env.SIGNING_TOKEN_EXPIRES_DAYS) || 14} días.`,
  };
}

export async function listPendientesFirmaActreun(consecutivo) {
  const res = await query(
    `SELECT d.consecutivo, d.item, d.nombre, d.documento, d.lado, d.cargo,
            f.email AS funcionario_email,
            s.email AS soporte_email
     FROM actreund d
     JOIN actreun a ON a.consecutivo = d.consecutivo
     LEFT JOIN clief f ON f.codigo = a.cliente AND f.documento = d.documento
     LEFT JOIN soport s ON (
       (d.documento LIKE 'SOP#%' AND s.codigo = SUBSTRING(d.documento FROM 5))
       OR (s.documento IS NOT NULL AND TRIM(s.documento) <> '' AND s.documento = d.documento)
     )
     WHERE d.consecutivo = $1
       AND (d.firma IS NULL OR TRIM(d.firma) = '')
     ORDER BY d.item`,
    [consecutivo],
  );
  return res.rows.map((r) => {
    const email = String(r.funcionario_email || r.soporte_email || '').trim() || null;
    const documento = String(r.documento || '').trim();
    let motivo = '';
    if (!documento) motivo = 'Sin documento';
    else if (!email) motivo = 'Sin correo';
    return {
      consecutivo: r.consecutivo,
      item: r.item,
      nombre: r.nombre || '',
      cargo: r.cargo || '',
      documento,
      lado: r.lado || 'ix',
      email,
      puedeEnviar: Boolean(documento && email),
      motivo,
    };
  });
}

export async function previewFirmasActreun(consecutivo) {
  const row = await loadActreunContext(consecutivo);
  if (!row) {
    const err = new Error('Acta no encontrada');
    err.status = 404;
    throw err;
  }
  if (row.estado !== ESTADOS_ACTREUN.EN_FIRMA) {
    const err = new Error('El acta debe estar en estado «En firma» para enviar enlaces de firma');
    err.status = 400;
    throw err;
  }

  const pendientes = await listPendientesFirmaActreun(consecutivo);
  const defaults = buildFirmaDefaultContent(row);
  return {
    consecutivo: row.consecutivo,
    cliente: row.cliente,
    nombrecliente: row.nombrecliente,
    fecha: row.fecha,
    subject: defaults.subject,
    body: defaults.body,
    adjuntoPdf: true,
    pendientes,
    enviables: pendientes.filter((p) => p.puedeEnviar),
    omitidos: pendientes.filter((p) => !p.puedeEnviar),
  };
}

export async function sendActreunFirmasPendientes(consecutivo, body = {}) {
  const pendientes = await listPendientesFirmaActreun(consecutivo);
  let candidates = pendientes.filter((p) => p.puedeEnviar);

  const items = Array.isArray(body.items)
    ? body.items.map((n) => Number(n)).filter((n) => Number.isFinite(n))
    : null;
  if (items?.length) {
    const set = new Set(items);
    candidates = candidates.filter((p) => set.has(Number(p.item)));
  }

  const emails = collectEmailList(body);
  if (emails.length && !items?.length) {
    const set = new Set(emails.map((e) => e.toLowerCase()));
    candidates = candidates.filter((p) => p.email && set.has(p.email.toLowerCase()));
  }

  let pdfAttachment = null;
  if (candidates.length > 0) {
    pdfAttachment = await buildActreunPdfAttachment(consecutivo);
  }

  const options = {
    subject: body.subject,
    body: body.body,
    pdfAttachment,
  };

  const details = [];
  let sent = 0;
  for (const row of candidates) {
    const result = await sendActreunFirmaLinkEmail(row, options);
    details.push({
      nombres: row.nombre,
      item: row.item,
      ok: result.sent,
      email: result.email || row.email || null,
      message: result.sent ? 'Enviado' : emailSkipReasonMessage(result.reason),
      reason: result.reason || null,
    });
    if (result.sent) sent += 1;
  }

  const omitidos = pendientes.filter((p) => !p.puedeEnviar);

  return {
    total: candidates.length,
    sent,
    details,
    omitidos,
    error: sent === 0 && candidates.length > 0
      ? 'No se envió ningún correo de firma'
      : candidates.length === 0
        ? (pendientes.length === 0
          ? 'No hay firmas pendientes'
          : 'Ningún asistente pendiente tiene correo y documento válidos')
        : null,
  };
}

function buildActreunDefaultContent(row) {
  const nombreCliente = row.nombrecliente || row.cliente || '—';
  return {
    subject: `Acta de reunión — ${nombreCliente}`,
    body: `Hola {{nombre}},

Adjuntamos el acta de reunión con el cliente, firmada por todos los participantes.

Quedamos atentos a cualquier inquietud.`,
  };
}

export async function previewActaActreun(consecutivo) {
  const row = await loadActreunContext(consecutivo);
  if (!row) {
    const err = new Error('Acta no encontrada');
    err.status = 404;
    throw err;
  }
  if (row.estado !== ESTADOS_ACTREUN.TERMINADA) {
    const err = new Error('El acta debe estar terminada (todas las firmas) antes de enviar al cliente');
    err.status = 400;
    throw err;
  }

  const cliente = await query(
    'SELECT codigo, nombrecliente, email, liderproyecto, noticliente FROM clie WHERE codigo = $1',
    [row.cliente],
  );
  const cl = cliente.rows[0] || null;
  const defaults = buildActreunDefaultContent(row);
  const destinatarios = listDestinatariosNotificacion(cl, 'all');

  return {
    consecutivo: row.consecutivo,
    cliente: row.cliente,
    nombrecliente: row.nombrecliente,
    subject: defaults.subject,
    body: defaults.body,
    destinatarios,
    pdfFilename: actreunPdfFileName(row),
  };
}

export async function enviarActaActreun(consecutivo, body = {}, usuario = null) {
  const row = await loadActreunContext(consecutivo);
  if (!row) {
    const err = new Error('Acta no encontrada');
    err.status = 404;
    throw err;
  }
  if (row.estado !== ESTADOS_ACTREUN.TERMINADA) {
    const err = new Error('El acta debe estar terminada antes de enviar al equipo del cliente');
    err.status = 400;
    throw err;
  }

  const clienteRes = await query(
    'SELECT codigo, nombrecliente, email, liderproyecto, noticliente FROM clie WHERE codigo = $1',
    [row.cliente],
  );
  const cliente = clienteRes.rows[0];
  const emailList = collectEmailList(body);
  if (!emailList.length) {
    const err = new Error('Seleccione al menos un destinatario');
    err.status = 400;
    throw err;
  }

  const fullRow = await fetchActreunReport(consecutivo);
  const pdfBuffer = await buildActreunPdf(fullRow);
  const pdfFilename = actreunPdfFileName(fullRow);

  const defaults = buildActreunDefaultContent(row);
  const subject = String(body.subject || '').trim() || defaults.subject;
  const introTemplate = extractIntroFromBody(String(body.body || '').trim() || defaults.body, defaults.body);
  const destinatarios = resolveDestinatarios(cliente, emailList);

  let sent = 0;
  const details = [];

  for (const dest of destinatarios) {
    const saludo = dest.nombre || 'estimado(a)';
    const introText = stripLeadingGreeting(applyNombreTemplate(introTemplate, saludo));
    const greeting = `Hola ${saludo},`;
    const html = buildNotificationEmailHtml({
      preheader: `Acta de reunión — ${row.nombrecliente || row.cliente}`,
      title: 'Acta de reunión con el cliente',
      greeting,
      intro: introText,
      rows: [
        { label: 'Cliente', value: row.nombrecliente || row.cliente },
        { label: 'Consecutivo', value: row.consecutivo },
        { label: 'Fecha reunión', value: fmtFecha(row.fecha) },
      ],
      callout: `Adjunto: ${pdfFilename}`,
    });
    const text = buildPlainNotificationEmail({
      greeting,
      intro: introText,
      rows: [
        { label: 'Cliente', value: row.nombrecliente || row.cliente },
        { label: 'Consecutivo', value: row.consecutivo },
        { label: 'Fecha reunión', value: fmtFecha(row.fecha) },
      ],
      callout: `Adjunto: ${pdfFilename}`,
    });

    const mail = await sendMail({
      to: dest.email,
      subject,
      text,
      html,
      attachments: [{ filename: pdfFilename, content: pdfBuffer, contentType: 'application/pdf' }],
      meta: {
        cliente: row.cliente,
        nombrecliente: row.nombrecliente,
        contexto: 'actreun',
        referencia: consecutivo,
        usuario,
        cuerpo: text,
      },
    });

    const ok = !mail.skipped;
    details.push({ email: dest.email, nombre: dest.nombre, ok, message: ok ? 'Enviado' : 'SMTP no configurado' });
    if (ok) sent += 1;
  }

  return {
    sent,
    total: destinatarios.length,
    pdfAttached: true,
    details,
    error: sent === 0 ? 'No se envió ningún correo' : null,
  };
}
