import { query } from '../db/pool.js';
import { sendMail } from './mailer.js';
import { listDestinatariosNotificacion, parseEquipoTrabajo } from './clienteNotificaciones.js';
import {
  fetchCapacitacionReport,
  buildCapacitacionPdf,
  pdfFileName,
} from './capacitacionPdf.js';
import {
  fetchBitacoraSemanaCliente,
  buildBitacoraPdf,
  bitacoraPdfFileName,
} from './bitacoraPdf.js';
import { getBiteClie } from './bitacoraSemanaClienteEstado.js';
import {
  createBitacoraFirmaLink,
  loadFuncionarioDestinatario,
  hasFirmaAceptacion,
} from './bitacoraFirma.js';
import { formatNombreConTratamiento } from './saludo.js';
import { buildImagenesEmailPayload, parseImagenesSoporte } from './bitacoraImagenes.js';
import {
  buildCronogramaPdf,
  cronogramaPdfFileName,
  fetchCronograma,
} from './cronogramaPdf.js';
import { listActasCerradasPorCronograma } from './cronogramaCapacitacion.js';
import {
  applyNombreTemplate,
  extractIntroFromBody,
  stripLeadingGreeting,
  buildNotificationEmailHtml,
  buildPlainNotificationEmail,
} from './emailTemplate.js';

async function loadCliente(codigo) {
  if (!codigo) return null;
  const res = await query(
    'SELECT codigo, nombrecliente, email, liderproyecto, noticliente FROM clie WHERE codigo = $1',
    [codigo],
  );
  return res.rows[0] || null;
}

function fmtFecha(value) {
  if (!value) return '—';
  const dt = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(dt.getTime())) return '—';
  return dt.toLocaleString('es-CO');
}

function buildCapacitacionEmailBundle(cap, cliente, bodyTemplate, { pdfFilename } = {}) {
  const defaults = buildCapacitacionNotificacionContent(cap, cliente);
  const sourceBody = String(bodyTemplate || '').trim() || defaults.body;
  const introTemplate = extractIntroFromBody(sourceBody, defaults.body);
  const nombre = '{{nombre}}';
  const introForPreview = applyNombreTemplate(introTemplate, nombre);
  const nombreCliente = cliente?.nombrecliente || cap.cliente || '—';
  const rows = [
    { label: 'Cliente', value: nombreCliente },
    { label: 'Consecutivo', value: cap.cnscapacita },
    { label: 'Fecha', value: fmtFecha(cap.fecha) },
    { label: 'Capacitador', value: cap.capacitador || '—' },
    { label: 'Tema', value: cap.tema || '—' },
    { label: 'Duración', value: cap.duracion != null ? `${cap.duracion} minutos` : '—' },
  ];
  const calloutText = pdfFilename
    ? `Adjunto: ${pdfFilename}`
    : 'El registro de asistencia en PDF va incluido en este correo.';

  return {
    subject: defaults.subject,
    body: introForPreview,
    buildForRecipient(destinatario) {
      const saludo = destinatario?.nombre || 'estimado(a)';
      const introText = stripLeadingGreeting(applyNombreTemplate(introTemplate, saludo));
      const greeting = `Hola ${saludo},`;
      const html = buildNotificationEmailHtml({
        preheader: `Acta de capacitación — ${cap.tema || cap.cnscapacita}`,
        title: 'Acta de capacitación',
        subtitle: nombreCliente,
        badge: 'Cerrada',
        accent: '#1565c0',
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

function buildBitacoraEmailBundle(bita, cliente, bodyTemplate, { firmaUrl, incluyeFirma = Boolean(firmaUrl), imagenesPayload = null } = {}) {
  const defaults = buildBitacoraNotificacionContent(bita, cliente, { incluyeFirma });
  const sourceBody = String(bodyTemplate || '').trim() || defaults.body;
  const introTemplate = extractIntroFromBody(sourceBody, defaults.body);
  const nombre = '{{nombre}}';
  const introForPreview = applyNombreTemplate(introTemplate, nombre);
  const nombreCliente = cliente?.nombrecliente || bita.cliente || '—';
  const rows = [
    { label: 'Cliente', value: nombreCliente },
    { label: 'Consecutivo', value: bita.cnssoporte },
    { label: 'Fecha soporte', value: fmtFecha(bita.fecha) },
    { label: 'Fecha cierre', value: fmtFecha(bita.fechar) },
    { label: 'Funcionario', value: bita.funcionario || '—' },
    { label: 'Solicitud', value: bita.solicitud || '—' },
    { label: 'Respuesta', value: bita.respuesta || '—' },
    { label: 'Observaciones', value: bita.observaciones || '—' },
  ];
  const actionButton = firmaUrl
    ? { href: firmaUrl, label: 'Firma aceptación de la solución' }
    : null;
  const imageGallery = imagenesPayload?.gallery?.length ? imagenesPayload.gallery : [];

  return {
    subject: defaults.subject,
    body: introForPreview,
    buildForRecipient(destinatario) {
      const saludo = destinatario?.displayName
        || formatNombreConTratamiento(destinatario?.tratamiento, destinatario?.nombre)
        || destinatario?.nombre
        || 'estimado(a)';
      const introText = stripLeadingGreeting(applyNombreTemplate(introTemplate, saludo));
      const greeting = `Hola ${saludo},`;
      const html = buildNotificationEmailHtml({
        preheader: `Bitácora de soporte — ${bita.cnssoporte}`,
        title: 'Bitácora de soporte',
        subtitle: nombreCliente,
        badge: bita.estado || 'Registro',
        accent: '#00897b',
        greeting,
        introText,
        rows,
        calloutTitle: firmaUrl ? 'Aceptación de la solución' : 'Información',
        calloutText: firmaUrl
          ? 'Al abrir el enlace ingrese su documento. Solo el funcionario que solicitó el soporte verá el espacio para firmar.'
          : imageGallery.length
            ? 'Las evidencias aparecen en miniatura en el cuerpo del correo. Las imágenes completas van adjuntas para abrirlas en tamaño real.'
            : 'Este correo resume el registro de soporte atendido por nuestro equipo.',
        actionButton,
        imageGallery,
        footerNote: firmaUrl
          ? 'Todos los destinatarios reciben el enlace; la firma solo está disponible tras validar el documento del solicitante.'
          : 'Copia informativa del registro de soporte.',
      });
      const text = buildPlainNotificationEmail({
        greeting,
        introText,
        rows,
        calloutText: firmaUrl
          ? 'Confirme la solución firmando en el enlace indicado. Puede dibujar la firma o subir una imagen.'
          : 'Registro de bitácora de soporte.',
        actionUrl: firmaUrl || '',
        actionLabel: firmaUrl ? 'Firma aceptación de la solución' : '',
      });
      return { text, html };
    },
  };
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

function resolveDestinatarios(cliente, emailList, listFn) {
  if (!emailList.length) return [];
  const known = listFn(cliente, 'all');
  const map = new Map(known.map((d) => [d.email.toLowerCase(), d]));
  return emailList.map((email) => map.get(email.toLowerCase()) || { email, nombre: '' });
}

function resolveEquipoDestinatarios(cliente, emailList) {
  if (!emailList.length) return [];
  const known = parseEquipoTrabajo(cliente?.liderproyecto, cliente).filter((c) => c.email);
  const map = new Map(known.map((d) => [d.email.toLowerCase(), d]));
  return emailList.map((email) => map.get(email.toLowerCase()) || { email, nombre: '' });
}

function resolveFuncionarioDestinatarios(funcionario, emailList) {
  if (!emailList.length) return [];
  const displayName = formatNombreConTratamiento(funcionario?.tratamiento, funcionario?.nombre);
  return emailList.map((email) => {
    if (funcionario?.email && email.toLowerCase() === funcionario.email.toLowerCase()) {
      return {
        email: funcionario.email,
        nombre: funcionario.nombre || funcionario.email,
        tratamiento: funcionario.tratamiento || '',
        displayName: displayName || funcionario.nombre || funcionario.email,
      };
    }
    return { email, nombre: '', tratamiento: '', displayName: '' };
  });
}

async function sendToDestinatarios({ destinatarios, subject, buildMessage, meta }) {
  if (!destinatarios.length) {
    return { sent: 0, total: 0, details: [], error: 'Sin destinatarios con email' };
  }

  let sent = 0;
  const details = [];

  for (const d of destinatarios) {
    try {
      const { text, html } = buildMessage(d);
      await sendMail({ to: d.email, subject, text, html, meta: { ...meta, cuerpo: text } });
      sent++;
      details.push({ email: d.email, nombre: d.nombre, ok: true });
    } catch (err) {
      details.push({ email: d.email, nombre: d.nombre, ok: false, message: err.message });
    }
  }

  return { sent, total: destinatarios.length, details };
}

async function buildCapacitacionPdfAttachment(cnscapacita) {
  const data = await fetchCapacitacionReport(cnscapacita);
  if (!data) {
    const err = new Error('No se pudo generar el PDF de la capacitación');
    err.status = 404;
    throw err;
  }
  const content = await buildCapacitacionPdf(data);
  return {
    filename: pdfFileName(data.capacitacion),
    content,
  };
}

async function sendActaCapacitacionEmail({
  toList,
  ccList,
  subject,
  buildMessage,
  attachments = [],
  meta,
}) {
  if (!toList.length) {
    return { sent: 0, total: 0, details: [], error: 'Seleccione al menos un destinatario (Para)' };
  }

  const to = toList.map((d) => d.email).join(', ');
  const cc = ccList.length ? ccList.map((d) => d.email).join(', ') : undefined;
  const saludoNombre = toList[0]?.nombre || 'estimado(a)';

  try {
    const { text, html } = buildMessage({ nombre: saludoNombre });
    await sendMail({ to, cc, subject, text, html, attachments, meta: { ...meta, cuerpo: text } });
    const details = [
      ...toList.map((d) => ({ email: d.email, nombre: d.nombre, rol: 'Para', ok: true })),
      ...ccList.map((d) => ({ email: d.email, nombre: d.nombre, rol: 'Copia', ok: true })),
    ];
    return {
      sent: 1,
      total: toList.length + ccList.length,
      details,
      pdfAttached: attachments.length > 0,
      pdfFilename: attachments[0]?.filename || null,
      pdfCount: attachments.length,
    };
  } catch (err) {
    return {
      sent: 0,
      total: toList.length + ccList.length,
      details: [{ ok: false, message: err.message }],
      error: err.message,
    };
  }
}

export function buildCronogramaNotificacionContent(enc, cliente, tipo = 'programacion') {
  const nombreCliente = cliente?.nombrecliente || enc.cliente || '—';
  if (tipo === 'seguimiento') {
    return {
      subject: `Seguimiento cronograma de capacitaciones — ${nombreCliente}`,
      body: `Hola {{nombre}},

Adjuntamos el cronograma de capacitaciones con el estado de cumplimiento de cada tema programado (realizados, no cumplidos y cancelados).

Quedamos atentos a cualquier inquietud.`,
    };
  }
  return {
    subject: `Cronograma de capacitaciones — ${nombreCliente}`,
    body: `Hola {{nombre}},

Adjuntamos el cronograma de capacitaciones programadas para su organización, con los temas, duración estimada y fechas probables de ejecución.

Quedamos atentos a cualquier inquietud.`,
  };
}

function buildCronogramaEmailBundle(enc, cliente, bodyTemplate, {
  pdfFilename,
  tipo = 'programacion',
  conSoportes = false,
  soportesCount = 0,
} = {}) {
  const defaults = buildCronogramaNotificacionContent(enc, cliente, tipo);
  const sourceBody = String(bodyTemplate || '').trim() || defaults.body;
  const introTemplate = extractIntroFromBody(sourceBody, defaults.body);
  const nombreCliente = cliente?.nombrecliente || enc.cliente || '—';
  const rows = [
    { label: 'Cliente', value: nombreCliente },
    { label: 'Consecutivo', value: enc.cnscrono },
    { label: 'Fecha', value: fmtFecha(enc.fecha) },
    { label: 'Estado', value: enc.estado || '—' },
    { label: 'Descripcion', value: enc.descripcion || '—' },
  ];
  let calloutText = pdfFilename
    ? `Adjunto: ${pdfFilename}`
    : 'El PDF del cronograma va incluido en este correo.';
  if (conSoportes && soportesCount > 0) {
    calloutText += `\n\nAdemás se incluyen ${soportesCount} acta(s) de capacitación cerrada(s) como soporte.`;
  } else if (conSoportes) {
    calloutText += '\n\nSe solicitó incluir soportes, pero no hay actas cerradas vinculadas a este cronograma.';
  }
  const title = tipo === 'seguimiento' ? 'Seguimiento cronograma' : 'Cronograma de capacitaciones';
  const badge = tipo === 'seguimiento' ? 'Seguimiento' : 'Programacion';

  return {
    subject: defaults.subject,
    body: applyNombreTemplate(introTemplate, '{{nombre}}'),
    buildForRecipient(destinatario) {
      const saludo = destinatario?.nombre || 'estimado(a)';
      const introText = stripLeadingGreeting(applyNombreTemplate(introTemplate, saludo));
      const greeting = `Hola ${saludo},`;
      const html = buildNotificationEmailHtml({
        preheader: `${title} — ${nombreCliente}`,
        title,
        subtitle: nombreCliente,
        badge,
        accent: '#6a1b9a',
        greeting,
        introText,
        rows,
        calloutTitle: 'Documento adjunto',
        calloutText,
        footerNote: 'El equipo de trabajo recibe este mensaje en copia (CC).',
      });
      const text = buildPlainNotificationEmail({ greeting, introText, rows, calloutText });
      return { text, html };
    },
  };
}

async function buildCronogramaPdfAttachment(cnscrono, tipo = 'programacion') {
  const data = await fetchCronograma(cnscrono);
  if (!data?.items?.length) {
    const err = new Error('No se pudo generar el PDF del cronograma');
    err.status = 404;
    throw err;
  }
  const content = await buildCronogramaPdf({
    encabezado: data.encabezado,
    items: data.items,
    tipo,
  });
  return {
    filename: cronogramaPdfFileName(data.encabezado, tipo),
    content,
  };
}

export async function previewNotificacionCronograma(cnscrono, tipo = 'programacion') {
  const data = await fetchCronograma(cnscrono);
  if (!data) {
    const err = new Error('Cronograma no encontrado');
    err.status = 404;
    throw err;
  }
  const cliente = data.encabezado.cliente ? await loadCliente(data.encabezado.cliente) : null;
  const bundle = buildCronogramaEmailBundle(data.encabezado, cliente, '', { tipo });
  return { subject: bundle.subject, body: bundle.body, tipo };
}

export async function enviarNotificacionCronograma(cnscrono, body = {}, usuario = null) {
  const tipo = String(body.tipo || 'programacion').toLowerCase();
  if (!['programacion', 'seguimiento'].includes(tipo)) {
    const err = new Error('tipo debe ser programacion o seguimiento');
    err.status = 400;
    throw err;
  }

  const data = await fetchCronograma(cnscrono);
  if (!data) {
    const err = new Error('Cronograma no encontrado');
    err.status = 404;
    throw err;
  }
  const enc = data.encabezado;
  if (!enc.cliente) {
    const err = new Error('El cronograma no tiene cliente asignado');
    err.status = 400;
    throw err;
  }
  if (!data.items.length) {
    const err = new Error('El cronograma no tiene items');
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

  const toList = resolveDestinatarios(cliente, toEmails, listDestinatariosNotificacion);
  const ccList = resolveEquipoDestinatarios(cliente, ccEmails);
  const conSoportes = Boolean(body.conSoportes) && tipo === 'seguimiento';
  const pdf = await buildCronogramaPdfAttachment(cnscrono, tipo);
  const attachments = [{
    filename: pdf.filename,
    content: pdf.content,
    contentType: 'application/pdf',
  }];

  if (conSoportes) {
    const actas = await listActasCerradasPorCronograma(cnscrono);
    for (const acta of actas) {
      const actaPdf = await buildCapacitacionPdfAttachment(acta.cnscapacita);
      attachments.push({
        filename: actaPdf.filename,
        content: actaPdf.content,
        contentType: 'application/pdf',
      });
    }
  }

  const bodyTemplate = String(body.body || '').trim();
  const bundle = buildCronogramaEmailBundle(enc, cliente, bodyTemplate, {
    pdfFilename: pdf.filename,
    tipo,
    conSoportes,
    soportesCount: attachments.length - 1,
  });
  const subject = String(body.subject || '').trim() || bundle.subject;

  return sendActaCapacitacionEmail({
    toList,
    ccList,
    subject,
    buildMessage: () => bundle.buildForRecipient({
      nombre: toList[0]?.nombre || cliente?.nombrecliente || 'estimado(a)',
    }),
    attachments,
    meta: {
      cliente: enc.cliente,
      nombrecliente: cliente?.nombrecliente || null,
      contexto: 'cronograma',
      referencia: cnscrono,
      usuario,
      conSoportes,
      soportesAdjuntos: attachments.length - 1,
    },
  });
}

export function buildCapacitacionNotificacionContent(cap, cliente) {
  const subject = `Acta de capacitación cerrada — ${cap.tema || cap.cnscapacita}`;
  const body = `Hola {{nombre}},

Le informamos que la capacitación ha sido cerrada correctamente. Adjuntamos el registro de asistencia en PDF para su archivo y revisión.

Quedamos atentos a cualquier inquietud.`;
  return { subject, body };
}

export function buildBitacoraNotificacionContent(bita, cliente, { incluyeFirma = true } = {}) {
  const subject = `Bitácora de soporte — ${bita.cnssoporte}`;
  const body = incluyeFirma
    ? `Hola {{nombre}},

Le compartimos el resumen del soporte atendido, con el detalle de la solicitud y la respuesta brindada.

Por favor confirme su conformidad firmando digitalmente. Al abrir el enlace deberá ingresar su número de documento; solo el funcionario que solicitó el soporte podrá firmar.

Gracias por confiar en nosotros.`
    : `Hola {{nombre}},

Le compartimos el resumen del soporte atendido, con el detalle de la solicitud y la respuesta brindada (copia informativa).

Gracias por confiar en nosotros.`;
  return { subject, body };
}

export async function previewNotificacionCapacitacion(cnscapacita) {
  const capRes = await query('SELECT * FROM rasist WHERE cnscapacita = $1', [cnscapacita]);
  const cap = capRes.rows[0];
  if (!cap) {
    const err = new Error('Capacitación no encontrada');
    err.status = 404;
    throw err;
  }
  const cliente = cap.cliente ? await loadCliente(cap.cliente) : null;
  const bundle = buildCapacitacionEmailBundle(cap, cliente, '');
  return { subject: bundle.subject, body: bundle.body };
}

export async function previewNotificacionBitacora(cnssoporte) {
  const bitaRes = await query('SELECT * FROM bita WHERE cnssoporte = $1', [cnssoporte]);
  const bita = bitaRes.rows[0];
  if (!bita) {
    const err = new Error('Registro de bitácora no encontrado');
    err.status = 404;
    throw err;
  }
  const cliente = bita.cliente ? await loadCliente(bita.cliente) : null;
  const funcionario = await loadFuncionarioDestinatario(bita);
  const firmaUrl = createBitacoraFirmaLink(cnssoporte);
  const imagenesPayload = await buildImagenesEmailPayload(bita.imagenes_soporte);
  const bundle = buildBitacoraEmailBundle(bita, cliente, '', {
    firmaUrl,
    incluyeFirma: true,
    imagenesPayload,
  });
  return {
    subject: bundle.subject,
    body: bundle.body,
    funcionario: funcionario
      ? {
          nombre: funcionario.nombre,
          email: funcionario.email,
          documento: funcionario.documento,
          tratamiento: funcionario.tratamiento || '',
          displayName: formatNombreConTratamiento(funcionario.tratamiento, funcionario.nombre),
        }
      : null,
    firmaUrl,
    imagenesCount: imagenesPayload.gallery.length,
    imagenes: parseImagenesSoporte(bita.imagenes_soporte).map(({ nombre, data }) => ({ nombre, data })),
  };
}

export async function enviarNotificacionCapacitacion(cnscapacita, body = {}, usuario = null) {
  const capRes = await query('SELECT * FROM rasist WHERE cnscapacita = $1', [cnscapacita]);
  const cap = capRes.rows[0];
  if (!cap) {
    const err = new Error('Capacitación no encontrada');
    err.status = 404;
    throw err;
  }
  if (!cap.cliente) {
    const err = new Error('La capacitación no tiene cliente asignado');
    err.status = 400;
    throw err;
  }
  if ((cap.estado || 'Abierta') !== 'Cerrada') {
    const err = new Error('Solo se puede notificar una capacitación cerrada');
    err.status = 400;
    throw err;
  }

  const cliente = await loadCliente(cap.cliente);
  const toEmails = collectEmailList(body, 'emails', 'extraEmails');
  const ccEmails = collectEmailList(body, 'ccEmails', 'extraCcEmails');

  if (!toEmails.length) {
    const err = new Error('Seleccione al menos un destinatario del cliente (Para)');
    err.status = 400;
    throw err;
  }

  const toList = resolveDestinatarios(cliente, toEmails, listDestinatariosNotificacion);
  const ccList = resolveEquipoDestinatarios(cliente, ccEmails);
  const pdf = await buildCapacitacionPdfAttachment(cnscapacita);
  const attachments = [{
    filename: pdf.filename,
    content: pdf.content,
    contentType: 'application/pdf',
  }];
  const bodyTemplate = String(body.body || '').trim();
  const bundle = buildCapacitacionEmailBundle(cap, cliente, bodyTemplate, {
    pdfFilename: pdf.filename,
  });
  const subject = String(body.subject || '').trim() || bundle.subject;

  return sendActaCapacitacionEmail({
    toList,
    ccList,
    subject,
    buildMessage: () => bundle.buildForRecipient({
      nombre: toList[0]?.nombre || cliente?.nombrecliente || 'estimado(a)',
    }),
    attachments,
    meta: {
      cliente: cap.cliente,
      nombrecliente: cliente?.nombrecliente || null,
      contexto: 'capacitacion',
      referencia: cnscapacita,
      usuario,
    },
  });
}

export async function enviarNotificacionBitacora(cnssoporte, body = {}, usuario = null) {
  const bitaRes = await query('SELECT * FROM bita WHERE cnssoporte = $1', [cnssoporte]);
  const bita = bitaRes.rows[0];
  if (!bita) {
    const err = new Error('Registro de bitácora no encontrado');
    err.status = 404;
    throw err;
  }
  if (!bita.cliente) {
    const err = new Error('El registro no tiene cliente asignado');
    err.status = 400;
    throw err;
  }
  if ((bita.estado || '').toLowerCase() !== 'terminado') {
    const err = new Error('Solo se puede notificar un soporte cerrado');
    err.status = 400;
    throw err;
  }
  if (hasFirmaAceptacion(bita)) {
    const err = new Error('El soporte ya fue firmado');
    err.status = 409;
    throw err;
  }

  const cliente = await loadCliente(bita.cliente);
  const funcionario = await loadFuncionarioDestinatario(bita);
  const toEmails = collectEmailList(body, 'emails', 'extraEmails');
  const ccEmails = collectEmailList(body, 'ccEmails', 'extraCcEmails');

  if (!toEmails.length) {
    const err = new Error('Seleccione al menos un destinatario (funcionario solicitante)');
    err.status = 400;
    throw err;
  }

  const toList = resolveFuncionarioDestinatarios(funcionario, toEmails);
  const ccList = resolveEquipoDestinatarios(cliente, ccEmails);
  const firmaUrl = createBitacoraFirmaLink(cnssoporte);
  const imagenesPayload = await buildImagenesEmailPayload(bita.imagenes_soporte);
  const bodyTemplate = String(body.body || '').trim();
  const bundle = buildBitacoraEmailBundle(bita, cliente, bodyTemplate, {
    firmaUrl,
    incluyeFirma: true,
    imagenesPayload,
  });
  const subject = String(body.subject || '').trim() || bundle.subject;
  const imageAttachments = imagenesPayload.attachments.map((a) => ({
    filename: a.filename,
    content: a.content,
    contentType: a.contentType,
    cid: a.cid,
    contentDisposition: a.contentDisposition,
  }));

  return sendActaCapacitacionEmail({
    toList,
    ccList,
    subject,
    buildMessage: () => bundle.buildForRecipient({
      nombre: funcionario?.nombre || toList[0]?.nombre || 'estimado(a)',
      tratamiento: funcionario?.tratamiento || toList[0]?.tratamiento || '',
      displayName: formatNombreConTratamiento(funcionario?.tratamiento, funcionario?.nombre)
        || toList[0]?.displayName
        || toList[0]?.nombre
        || 'estimado(a)',
    }),
    attachments: imageAttachments,
    meta: {
      cliente: bita.cliente,
      nombrecliente: cliente?.nombrecliente || null,
      contexto: 'bitacora',
      referencia: cnssoporte,
      usuario,
    },
  });
}

function buildSemanaClienteEmailBundle(encabezado, clienteRow, bodyTemplate, { pdfFilename, idsemana } = {}) {
  const nombreCliente = clienteRow?.nombrecliente || encabezado?.nombrecliente || encabezado?.cliente || '—';
  const subject = `Bitácora semanal de soporte — ${nombreCliente}`;
  const defaultBody = `Hola {{nombre}},

Le informamos que la bitácora de soporte de la semana ${idsemana || ''} para ${nombreCliente} ha sido cerrada. Adjuntamos el PDF con el detalle de los soportes brindados.

Quedamos atentos a cualquier inquietud.`;
  const introTemplate = extractIntroFromBody(String(bodyTemplate || '').trim() || defaultBody, defaultBody);
  const rows = [
    { label: 'Cliente', value: nombreCliente },
    { label: 'Semana', value: idsemana || encabezado?.idsemana || '—' },
    { label: 'Consecutivo', value: encabezado?.cnsbite || '—' },
    { label: 'Realizado por', value: encabezado?.realizado_por || encabezado?.soporte || '—' },
    { label: 'Periodo', value: `${fmtFecha(encabezado?.fechaini)} — ${fmtFecha(encabezado?.fechafin)}` },
  ];
  const calloutText = pdfFilename
    ? `Adjunto: ${pdfFilename}`
    : 'El PDF de la bitácora semanal va incluido en este correo.';

  return {
    subject,
    body: applyNombreTemplate(introTemplate, '{{nombre}}'),
    buildForRecipient(destinatario) {
      const saludo = destinatario?.nombre || 'estimado(a)';
      const introText = stripLeadingGreeting(applyNombreTemplate(introTemplate, saludo));
      const greeting = `Hola ${saludo},`;
      const html = buildNotificationEmailHtml({
        preheader: `Bitácora semanal — ${nombreCliente}`,
        title: 'Bitácora de soporte semanal',
        subtitle: nombreCliente,
        badge: 'Cerrada',
        accent: '#3949ab',
        greeting,
        introText,
        rows,
        calloutTitle: 'Documento adjunto',
        calloutText,
        footerNote: 'Resumen de soportes brindados al cliente en la semana indicada.',
      });
      const text = buildPlainNotificationEmail({ greeting, introText, rows, calloutText });
      return { text, html };
    },
  };
}

async function buildBitacoraSemanaPdfAttachment(cnsbite, cliente) {
  const data = await fetchBitacoraSemanaCliente(cnsbite, cliente);
  if (!data?.soportes?.length) {
    const err = new Error('No hay soportes para generar el PDF');
    err.status = 404;
    throw err;
  }
  const content = await buildBitacoraPdf(data);
  return {
    filename: bitacoraPdfFileName(data.encabezado),
    content,
  };
}

export async function previewNotificacionSemanaCliente(cnsbite, cliente) {
  const data = await fetchBitacoraSemanaCliente(cnsbite, cliente);
  if (!data) {
    const err = new Error('Semana o cliente no encontrado');
    err.status = 404;
    throw err;
  }
  const biteClie = await getBiteClie(cnsbite, cliente);
  if ((biteClie?.estado || 'Abierta') !== 'Cerrada') {
    const err = new Error('Solo se puede reportar una semana de cliente cerrada');
    err.status = 400;
    throw err;
  }
  const clienteRow = await loadCliente(cliente);
  const bundle = buildSemanaClienteEmailBundle(
    { ...data.encabezado, idsemana: data.encabezado.idsemana },
    clienteRow,
    '',
    { idsemana: data.encabezado.idsemana },
  );
  return { subject: bundle.subject, body: bundle.body };
}

export async function enviarNotificacionSemanaCliente(cnsbite, cliente, body = {}, usuario = null) {
  const biteClie = await getBiteClie(cnsbite, cliente);
  if ((biteClie?.estado || 'Abierta') !== 'Cerrada') {
    const err = new Error('Solo se puede reportar una semana de cliente cerrada');
    err.status = 400;
    throw err;
  }

  const data = await fetchBitacoraSemanaCliente(cnsbite, cliente);
  if (!data) {
    const err = new Error('Semana o cliente no encontrado');
    err.status = 404;
    throw err;
  }

  const clienteRow = await loadCliente(cliente);
  const toEmails = collectEmailList(body, 'emails', 'extraEmails');
  if (!toEmails.length) {
    const err = new Error('Seleccione al menos un destinatario del equipo (Para)');
    err.status = 400;
    throw err;
  }

  const toList = resolveEquipoDestinatarios(clienteRow, toEmails);
  const pdf = await buildBitacoraSemanaPdfAttachment(cnsbite, cliente);
  const attachments = [{
    filename: pdf.filename,
    content: pdf.content,
    contentType: 'application/pdf',
  }];
  const bundle = buildSemanaClienteEmailBundle(
    data.encabezado,
    clienteRow,
    String(body.body || '').trim(),
    { pdfFilename: pdf.filename, idsemana: data.encabezado.idsemana },
  );
  const subject = String(body.subject || '').trim() || bundle.subject;

  return sendActaCapacitacionEmail({
    toList,
    ccList: [],
    subject,
    buildMessage: () => bundle.buildForRecipient({
      nombre: toList[0]?.nombre || 'equipo',
    }),
    attachments,
    meta: {
      cliente,
      nombrecliente: clienteRow?.nombrecliente || null,
      contexto: 'bitacora_semana',
      referencia: cnsbite,
      usuario,
    },
  });
}
