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

export async function sendActreunFirmaLinkEmail(asistente) {
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
  const subject = `Firma acta de reunión — ${row.nombrecliente || row.cliente}`;
  const text = `
Estimado(a) ${row.nombre || 'participante'},

Se requiere su firma digital como asistente al acta de reunión:

  Cliente:      ${row.nombrecliente || row.cliente}
  Fecha:        ${fmtFecha(row.fecha)}
  Consecutivo:  ${row.consecutivo}

Abra el enlace, ingrese su número de documento y firme (válido por ${Number(process.env.SIGNING_TOKEN_EXPIRES_DAYS) || 14} días):

${url}

DevSoporte
  `.trim();

  const html = `
<p>Estimado(a) <strong>${row.nombre || 'participante'}</strong>,</p>
<p>Se requiere su firma digital como asistente al acta de reunión:</p>
<ul>
  <li><strong>Cliente:</strong> ${row.nombrecliente || row.cliente}</li>
  <li><strong>Fecha:</strong> ${fmtFecha(row.fecha)}</li>
  <li><strong>Consecutivo:</strong> ${row.consecutivo}</li>
</ul>
<p>Deberá ingresar su <strong>número de documento</strong> antes de firmar.</p>
<p><a href="${url}">Haga clic aquí para firmar</a></p>
<p style="font-size:12px;color:#666;">Si el enlace no abre, copie y pegue esta URL:<br>${url}</p>
<p>DevSoporte</p>
  `.trim();

  const mail = await sendMail({
    to: email,
    subject,
    text,
    html,
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

export async function sendActreunFirmasPendientes(consecutivo) {
  const pendientes = await query(
    `SELECT consecutivo, item, nombre, documento FROM actreund
     WHERE consecutivo = $1 AND (firma IS NULL OR TRIM(firma) = '')`,
    [consecutivo],
  );

  const details = [];
  let sent = 0;
  for (const row of pendientes.rows) {
    const result = await sendActreunFirmaLinkEmail(row);
    details.push({
      nombres: row.nombre,
      ok: result.sent,
      email: result.email || null,
      message: result.sent ? 'Enviado' : emailSkipReasonMessage(result.reason),
      reason: result.reason || null,
    });
    if (result.sent) sent += 1;
  }

  return {
    total: pendientes.rows.length,
    sent,
    details,
    error: sent === 0 && pendientes.rows.length > 0
      ? 'No se envió ningún correo de firma'
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
