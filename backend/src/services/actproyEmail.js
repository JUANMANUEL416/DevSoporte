import { query } from '../db/pool.js';
import { sendMail } from './mailer.js';
import { listDestinatariosNotificacion, parseEquipoTrabajo } from './clienteNotificaciones.js';
import {
  applyNombreTemplate,
  extractIntroFromBody,
  stripLeadingGreeting,
  buildNotificationEmailHtml,
  buildPlainNotificationEmail,
} from './emailTemplate.js';
import { loadActproyContext, createActproyFirmaLink, hasFirmaCliente } from './actproyFirma.js';
import { fetchActproyReport, buildActproyPdf, actproyPdfFileName } from './actproyPdf.js';

function fmtFecha(value) {
  if (!value) return '—';
  const dt = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(dt.getTime())) return '—';
  return dt.toLocaleDateString('es-CO');
}

async function loadClienteContactos(codigo) {
  if (!codigo) return null;
  const res = await query(
    'SELECT codigo, nombrecliente, email, liderproyecto, noticliente FROM clie WHERE codigo = $1',
    [codigo],
  );
  return res.rows[0] || null;
}

function collectEmailList(body, field = 'emails', extraField = 'extraEmails') {
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
  if (Array.isArray(body?.[field])) body[field].forEach(add);
  if (Array.isArray(body?.[extraField])) body[extraField].forEach(add);
  return emails;
}

function resolveDestinatarios(cliente, emailList) {
  if (!emailList.length) return [];
  const known = listDestinatariosNotificacion(cliente, 'all');
  const map = new Map(known.map((d) => [d.email.toLowerCase(), d]));
  return emailList.map((email) => map.get(email.toLowerCase()) || { email, nombre: '' });
}

function resolveEquipoDestinatarios(cliente, emailList) {
  if (!emailList.length) return [];
  const known = parseEquipoTrabajo(cliente?.liderproyecto, cliente).filter((c) => c.email);
  const map = new Map(known.map((d) => [d.email.toLowerCase(), d]));
  return emailList.map((email) => map.get(email.toLowerCase()) || { email, nombre: '' });
}

function buildActproyInformeDefaultContent(row) {
  const nombreCliente = row.nombrecliente || row.cliente || '—';
  return {
    subject: `Informe de actividades en proyecto — ${nombreCliente}`,
    body: `Hola {{nombre}},

Adjuntamos el informe de actividades realizadas en su proyecto, firmado digitalmente por su representante.

Quedamos atentos a cualquier inquietud.`,
  };
}

function buildActproyInformeEmailBundle(row, bodyTemplate, { pdfFilename } = {}) {
  const defaults = buildActproyInformeDefaultContent(row);
  const sourceBody = String(bodyTemplate || '').trim() || defaults.body;
  const introTemplate = extractIntroFromBody(sourceBody, defaults.body);
  const nombre = '{{nombre}}';
  const introForPreview = applyNombreTemplate(introTemplate, nombre);
  const nombreCliente = row.nombrecliente || row.cliente || '—';
  const rows = [
    { label: 'Proyecto', value: nombreCliente },
    { label: 'Consecutivo', value: row.consecutivo },
    { label: 'Fecha', value: fmtFecha(row.fecha) },
    { label: 'Ingeniero', value: row.ingeniero || '—' },
    { label: 'Firmado por', value: row.firma_cli_nombre || 'Cliente' },
    { label: 'Fecha firma', value: fmtFecha(row.firma_cli_fecha) },
  ];
  const calloutText = pdfFilename
    ? `Adjunto: ${pdfFilename}`
    : 'El informe firmado en PDF va incluido en este correo.';

  return {
    subject: defaults.subject,
    body: introForPreview,
    buildForRecipient(destinatario) {
      const saludo = destinatario?.nombre || 'estimado(a)';
      const introText = stripLeadingGreeting(applyNombreTemplate(introTemplate, saludo));
      const greeting = `Hola ${saludo},`;
      const html = buildNotificationEmailHtml({
        preheader: `Informe de actividades — ${nombreCliente}`,
        title: 'Informe de actividades en proyecto',
        subtitle: nombreCliente,
        badge: 'Firmado',
        accent: '#2e7d32',
        greeting,
        introText,
        rows,
        calloutTitle: 'Documento adjunto',
        calloutText,
        footerNote: 'El equipo de trabajo recibe este mensaje en copia (CC).',
      });
      const text = buildPlainNotificationEmail({
        greeting,
        introText,
        rows,
        calloutText,
      });
      return { text, html };
    },
  };
}

async function assertInformeFirmado(row) {
  if (!row) {
    const err = new Error('Informe no encontrado');
    err.status = 404;
    throw err;
  }
  if (!hasFirmaCliente(row)) {
    const err = new Error('Solo se puede enviar por correo un informe ya firmado por el cliente');
    err.status = 400;
    throw err;
  }
}

export async function previewInformeActproy(consecutivo) {
  const row = await loadActproyContext(consecutivo);
  await assertInformeFirmado(row);
  const bundle = buildActproyInformeEmailBundle(row, '', {});
  return { subject: bundle.subject, body: bundle.body };
}

/**
 * Envía el informe firmado por correo con PDF adjunto.
 */
export async function enviarInformeActproy(consecutivo, body = {}, usuario = null) {
  const row = await loadActproyContext(consecutivo);
  await assertInformeFirmado(row);
  if (!row.cliente) {
    const err = new Error('El informe no tiene cliente asignado');
    err.status = 400;
    throw err;
  }

  const cliente = await loadClienteContactos(row.cliente);
  const toEmails = collectEmailList(body, 'emails', 'extraEmails');
  const ccEmails = collectEmailList(body, 'ccEmails', 'extraCcEmails');
  if (!toEmails.length) {
    const err = new Error('Seleccione al menos un destinatario del cliente (Para)');
    err.status = 400;
    throw err;
  }

  const toList = resolveDestinatarios(cliente, toEmails);
  const ccList = resolveEquipoDestinatarios(cliente, ccEmails);
  const fullRow = await fetchActproyReport(consecutivo);
  const pdfContent = await buildActproyPdf(fullRow);
  const pdfFilename = actproyPdfFileName(fullRow);
  const attachments = [{
    filename: pdfFilename,
    content: pdfContent,
    contentType: 'application/pdf',
  }];
  const bundle = buildActproyInformeEmailBundle(fullRow, body.body, { pdfFilename });
  const subject = String(body.subject || '').trim() || bundle.subject;
  const to = toList.map((d) => d.email).join(', ');
  const cc = ccList.length ? ccList.map((d) => d.email).join(', ') : undefined;
  const saludoNombre = toList[0]?.nombre || 'estimado(a)';
  const { text, html } = bundle.buildForRecipient({ nombre: saludoNombre });

  try {
    await sendMail({
      to,
      cc,
      subject,
      text,
      html,
      attachments,
      meta: {
        cliente: row.cliente,
        nombrecliente: row.nombrecliente || null,
        contexto: 'actproy',
        referencia: consecutivo,
        usuario,
        cuerpo: text,
      },
    });
    return {
      sent: 1,
      total: toList.length + ccList.length,
      pdfAttached: true,
      pdfFilename,
      details: [
        ...toList.map((d) => ({ email: d.email, nombre: d.nombre, rol: 'Para', ok: true })),
        ...ccList.map((d) => ({ email: d.email, nombre: d.nombre, rol: 'Copia', ok: true })),
      ],
    };
  } catch (err) {
    return {
      sent: 0,
      total: toList.length + ccList.length,
      error: err.message,
    };
  }
}

/**
 * Envía al cliente el enlace para firmar digitalmente el informe de actividades.
 * `emails` opcional: si se omite, usa los contactos de notificación del cliente.
 */
export async function enviarFirmaActproy(consecutivo, { emails = null, usuario = null } = {}) {
  const row = await loadActproyContext(consecutivo);
  if (!row) {
    const err = new Error('Informe no encontrado');
    err.status = 404;
    throw err;
  }
  if (!row.cliente) {
    const err = new Error('El informe no tiene cliente asignado');
    err.status = 400;
    throw err;
  }
  if (hasFirmaCliente(row)) {
    const err = new Error('El informe ya fue firmado por el cliente');
    err.status = 409;
    throw err;
  }

  const cliente = await loadClienteContactos(row.cliente);
  const contactos = listDestinatariosNotificacion(cliente, 'all');
  let destinatarios = contactos;
  if (Array.isArray(emails) && emails.length) {
    const set = new Set(emails.map((e) => String(e).trim().toLowerCase()));
    destinatarios = contactos.filter((c) => set.has(c.email.toLowerCase()));
    // Permite correos manuales que no estén en los contactos.
    for (const e of emails) {
      const email = String(e).trim();
      if (email && !destinatarios.some((c) => c.email.toLowerCase() === email.toLowerCase())) {
        destinatarios.push({ email, nombre: '' });
      }
    }
  }

  if (!destinatarios.length) {
    return { sent: 0, total: 0, error: 'El cliente no tiene contactos con correo. Agregue uno en Clientes → Contacto cliente.' };
  }

  const url = createActproyFirmaLink(consecutivo);
  const nombreCliente = row.nombrecliente || row.cliente;
  const subject = `Firma de informe de actividades — ${nombreCliente}`;
  const rows = [
    { label: 'Proyecto', value: nombreCliente },
    { label: 'Consecutivo', value: row.consecutivo },
    { label: 'Fecha', value: fmtFecha(row.fecha) },
    { label: 'Ingeniero', value: row.ingeniero || '—' },
  ];
  const to = destinatarios.map((d) => d.email).join(', ');
  const greeting = 'Estimado(a),';
  const introText = `Le compartimos el informe de actividades realizadas en su proyecto para su revisión y firma de aceptación. Por favor abra el enlace y firme digitalmente; no necesita usuario ni contraseña.`;
  const html = buildNotificationEmailHtml({
    preheader: `Informe de actividades — ${nombreCliente}`,
    title: 'Informe de actividades en proyecto',
    subtitle: nombreCliente,
    badge: 'Firma requerida',
    accent: '#5e35b1',
    greeting,
    introText,
    rows,
    calloutTitle: 'Aceptación del informe',
    calloutText: 'Confirme la conformidad del informe firmando digitalmente en el enlace.',
    actionButton: { href: url, label: 'Firmar informe de actividades' },
    footerNote: 'Si el botón no funciona, copie y pegue el enlace en su navegador.',
  });
  const text = buildPlainNotificationEmail({
    greeting,
    introText,
    rows,
    calloutText: 'Abra el enlace para firmar el informe.',
    actionUrl: url,
    actionLabel: 'Firmar informe de actividades',
  });

  try {
    await sendMail({
      to,
      subject,
      text,
      html,
      meta: {
        cliente: row.cliente,
        nombrecliente: nombreCliente,
        contexto: 'actproy',
        referencia: consecutivo,
        usuario,
        cuerpo: text,
      },
    });
    return { sent: 1, total: destinatarios.length, emails: destinatarios.map((d) => d.email), url };
  } catch (err) {
    return { sent: 0, total: destinatarios.length, error: err.message };
  }
}
