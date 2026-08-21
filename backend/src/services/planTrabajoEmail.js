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
import {
  buildPlanTrabajoPdf,
  fetchPlanTrabajo,
  planTrabajoPdfFileName,
} from './planTrabajoPdf.js';

function fmtFecha(value) {
  if (!value) return '—';
  const s = String(value).trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  const dt = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(dt.getTime())) return '—';
  return dt.toLocaleDateString('es-CO');
}

async function loadCliente(codigo) {
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

export function buildPlanTrabajoNotificacionContent(enc) {
  const nombreCliente = enc.nombrecliente || enc.cliente || '—';
  return {
    subject: `Plan de trabajo Qrystalos — ${nombreCliente}`,
    body: `Hola {{nombre}},

Adjuntamos el plan de implantación Qrystalos para su proyecto, con las actividades organizadas por módulo, prioridad y estado de avance.

Quedamos atentos a cualquier inquietud.`,
  };
}

function buildPlanTrabajoEmailBundle(enc, bodyTemplate, { pdfFilename } = {}) {
  const defaults = buildPlanTrabajoNotificacionContent(enc);
  const sourceBody = String(bodyTemplate || '').trim() || defaults.body;
  const introTemplate = extractIntroFromBody(sourceBody, defaults.body);
  const nombreCliente = enc.nombrecliente || enc.cliente || '—';
  const rows = [
    { label: 'Proyecto / Cliente', value: nombreCliente },
    { label: 'Plan', value: enc.nombre || enc.cnplan },
    { label: 'Consecutivo', value: enc.cnplan },
    { label: 'Desde', value: fmtFecha(enc.fecha_inicial) },
    { label: 'Hasta', value: fmtFecha(enc.fecha_final) },
    { label: 'Estado', value: enc.estado || '—' },
    { label: 'Descripcion', value: enc.descripcion || '—' },
  ];
  const calloutText = pdfFilename
    ? `Adjunto: ${pdfFilename}`
    : 'El PDF del plan de trabajo va incluido en este correo.';

  return {
    subject: defaults.subject,
    body: applyNombreTemplate(introTemplate, '{{nombre}}'),
    buildForRecipient(destinatario) {
      const saludo = destinatario?.nombre || 'estimado(a)';
      const introText = stripLeadingGreeting(applyNombreTemplate(introTemplate, saludo));
      const greeting = `Hola ${saludo},`;
      const html = buildNotificationEmailHtml({
        preheader: `Plan de trabajo — ${nombreCliente}`,
        title: 'Plan de trabajo Qrystalos',
        subtitle: nombreCliente,
        badge: enc.estado || 'Plan',
        accent: '#00695c',
        greeting,
        introText,
        rows,
        calloutTitle: 'Documento adjunto',
        calloutText,
        footerNote: 'El equipo de soporte recibe este mensaje en copia (CC).',
      });
      const text = buildPlainNotificationEmail({ greeting, introText, rows, calloutText });
      return { text, html };
    },
  };
}

export async function previewNotificacionPlanTrabajo(cnplan) {
  const data = await fetchPlanTrabajo(cnplan);
  if (!data) {
    const err = new Error('Plan de trabajo no encontrado');
    err.status = 404;
    throw err;
  }
  const bundle = buildPlanTrabajoEmailBundle(data.encabezado, '', {});
  return { subject: bundle.subject, body: bundle.body };
}

export async function enviarNotificacionPlanTrabajo(cnplan, body = {}, usuario = null) {
  const data = await fetchPlanTrabajo(cnplan);
  if (!data) {
    const err = new Error('Plan de trabajo no encontrado');
    err.status = 404;
    throw err;
  }
  const enc = data.encabezado;
  if (!enc.cliente) {
    const err = new Error('El plan no tiene cliente asignado');
    err.status = 400;
    throw err;
  }
  if (!data.items.length) {
    const err = new Error('El plan no tiene actividades');
    err.status = 400;
    throw err;
  }

  const cliente = await loadCliente(enc.cliente);
  const toEmails = collectEmailList(body, 'emails', 'extraEmails');
  const ccEmails = collectEmailList(body, 'ccEmails', 'extraCcEmails');
  if (!toEmails.length) {
    const err = new Error('Seleccione al menos un destinatario del cliente (Para)');
    err.status = 400;
    throw err;
  }

  const toList = resolveDestinatarios(cliente, toEmails);
  const ccList = resolveEquipoDestinatarios(cliente, ccEmails);
  const pdfContent = await buildPlanTrabajoPdf(data);
  const pdfFilename = planTrabajoPdfFileName(enc);
  const attachments = [{
    filename: pdfFilename,
    content: pdfContent,
    contentType: 'application/pdf',
  }];

  const bundle = buildPlanTrabajoEmailBundle(enc, body.body, { pdfFilename });
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
        cliente: enc.cliente,
        nombrecliente: enc.nombrecliente || null,
        contexto: 'plan_trabajo',
        referencia: cnplan,
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
