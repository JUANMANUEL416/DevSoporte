import { query } from '../db/pool.js';
import { sendMail, getMailFrom, isMailConfigured } from './mailer.js';
import { fetchVipCuentaCobro, fmtFechaCorta, fmtFechaLarga, fmtValorPesos } from './vipCuentaCobro.js';
import { buildVipCuentaPdf, vipCuentaPdfFileName } from './vipCuentaCobroPdf.js';
import {
  fetchBitacoraSemanaCliente,
  buildBitacoraPdf,
  bitacoraPdfFileName,
} from './bitacoraPdf.js';
import {
  applyNombreTemplate,
  extractIntroFromBody,
  stripLeadingGreeting,
  buildNotificationEmailHtml,
  buildPlainNotificationEmail,
} from './emailTemplate.js';

async function loadVipCliente(codigo) {
  if (!codigo) return null;
  const res = await query(
    'SELECT codigo, nombrecliente, nit, email, codigo_clie FROM vipclie WHERE codigo = $1',
    [codigo],
  );
  return res.rows[0] || null;
}

export async function listVipDestinatarios(codigoVip) {
  const vip = await loadVipCliente(codigoVip);
  if (!vip) return null;

  const contactos = [];
  const seen = new Set();
  const push = (c) => {
    const email = String(c.email || '').trim();
    if (!email) return;
    const key = email.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    contactos.push({
      id: c.id || key,
      nombre: c.nombre || email,
      cargo: c.cargo || '',
      email,
    });
  };

  push({
    id: 'vip-destino',
    nombre: vip.nombrecliente,
    cargo: 'Destino cuenta de cobro',
    email: vip.email,
  });

  return {
    codigo: vip.codigo,
    nombrecliente: vip.nombrecliente,
    codigo_clie: vip.codigo_clie || null,
    remitente: getMailFrom('cxc'),
    contactos,
    contactosConEmail: contactos.filter((c) => c.email),
    conEmail: contactos.filter((c) => c.email),
  };
}

export async function listSoportesVipPeriodo(codigoClie, periodoDesde, periodoHasta) {
  if (!codigoClie || !periodoDesde || !periodoHasta) return [];
  const res = await query(
    `SELECT b.cnssoporte, b.cnsbite, b.fecha, b.funcionario, b.solicitud, b.estado, b.fechar
     FROM bita b
     WHERE b.cliente = $1
       AND b.fecha >= $2::date
       AND b.fecha <= $3::date
     ORDER BY b.fecha ASC NULLS LAST, b.cnssoporte ASC`,
    [codigoClie, periodoDesde, periodoHasta],
  );
  return res.rows;
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

function resolveDestinatariosVip(destData, emailList) {
  const known = destData?.conEmail || [];
  const map = new Map(known.map((d) => [d.email.toLowerCase(), d]));
  return emailList.map((email) => map.get(email.toLowerCase()) || { email, nombre: '' });
}

function buildVipCuentaCobroEmailBundle(row, vip, bodyTemplate, { pdfFilename, extraFilenames = [] } = {}) {
  const periodoTxt = row.periodo_desde && row.periodo_hasta
    ? `${fmtFechaCorta(row.periodo_desde)} al ${fmtFechaCorta(row.periodo_hasta)}`
    : '—';
  const subject = `Cuenta de cobro No. ${row.numero} — ${vip?.nombrecliente || row.nombrecliente || ''}`;
  const defaultBody = `Hola {{nombre}},

Adjunto la cuenta de cobro No. ${row.numero} por valor de ${fmtValorPesos(row.valor)}, correspondiente al periodo ${periodoTxt}.

Concepto: ${row.concepto || '—'}

Quedo atento a cualquier inquietud.`;
  const introTemplate = extractIntroFromBody(String(bodyTemplate || '').trim() || defaultBody, defaultBody);
  const rows = [
    { label: 'Cliente', value: vip?.nombrecliente || row.nombrecliente || '—' },
    { label: 'N.I.T.', value: vip?.nit || row.nit || '—' },
    { label: 'Número', value: row.numero || '—' },
    { label: 'Fecha emisión', value: fmtFechaLarga(row.fecha_emision) },
    { label: 'Periodo', value: periodoTxt },
    { label: 'Valor', value: fmtValorPesos(row.valor) },
    { label: 'Concepto', value: row.concepto || '—' },
  ];
  const adjuntos = [pdfFilename, ...extraFilenames].filter(Boolean);
  const calloutText = adjuntos.length
    ? `Adjuntos: ${adjuntos.join(', ')}`
    : 'La cuenta de cobro en PDF va incluida en este correo.';

  return {
    subject,
    body: applyNombreTemplate(introTemplate, '{{nombre}}'),
    buildForRecipient(destinatario) {
      const saludo = destinatario?.nombre || 'estimado(a)';
      const introText = stripLeadingGreeting(applyNombreTemplate(introTemplate, saludo));
      const greeting = `Hola ${saludo},`;
      const html = buildNotificationEmailHtml({
        preheader: `Cuenta de cobro ${row.numero}`,
        title: 'Cuenta de cobro',
        subtitle: vip?.nombrecliente || row.nombrecliente || '',
        badge: row.estado || 'Emitida',
        accent: '#e65100',
        greeting,
        introText,
        rows,
        calloutTitle: 'Documentos adjuntos',
        calloutText,
        footerNote: 'Correo informativo con la cuenta de cobro y los documentos adjuntos.',
      });
      const text = buildPlainNotificationEmail({ greeting, introText, rows, calloutText });
      return { text, html };
    },
  };
}

async function buildSoportePdfAttachments(cnssoportes, codigoClie) {
  if (!cnssoportes?.length || !codigoClie) return [];

  const res = await query(
    `SELECT cnssoporte, cnsbite FROM bita
     WHERE cliente = $1 AND cnssoporte = ANY($2::varchar[])`,
    [codigoClie, cnssoportes],
  );
  const byWeek = new Map();
  for (const row of res.rows) {
    if (!byWeek.has(row.cnsbite)) byWeek.set(row.cnsbite, []);
    byWeek.get(row.cnsbite).push(row.cnssoporte);
  }

  const attachments = [];
  const usedNames = new Set();

  for (const [cnsbite, ids] of byWeek.entries()) {
    const data = await fetchBitacoraSemanaCliente(cnsbite, codigoClie);
    if (!data) continue;
    const idSet = new Set(ids.map(String));
    const soportes = data.soportes.filter((s) => idSet.has(String(s.cnssoporte)));
    if (!soportes.length) continue;

    const content = await buildBitacoraPdf({ encabezado: data.encabezado, soportes });
    let filename = bitacoraPdfFileName(data.encabezado);
    if (soportes.length === 1) {
      filename = `Soporte ${soportes[0].cnssoporte}.pdf`;
    } else if (byWeek.size > 1) {
      filename = bitacoraPdfFileName(data.encabezado).replace(/\.pdf$/i, ` (${cnsbite}).pdf`);
    }
    let unique = filename;
    let n = 2;
    while (usedNames.has(unique.toLowerCase())) {
      unique = filename.replace(/\.pdf$/i, ` (${n}).pdf`);
      n += 1;
    }
    usedNames.add(unique.toLowerCase());
    attachments.push({ filename: unique, content, contentType: 'application/pdf' });
  }

  return attachments;
}

export async function previewNotificacionVipCuentaCobro(cns) {
  const row = await fetchVipCuentaCobro(cns);
  if (!row) {
    const err = new Error('Cuenta de cobro no encontrada');
    err.status = 404;
    throw err;
  }

  const vip = await loadVipCliente(row.codigo_cliente);
  const pdfFilename = vipCuentaPdfFileName(row);
  const bundle = buildVipCuentaCobroEmailBundle(row, vip, '', { pdfFilename });

  let soportes = [];
  if (vip?.codigo_clie && row.periodo_desde && row.periodo_hasta) {
    soportes = await listSoportesVipPeriodo(vip.codigo_clie, row.periodo_desde, row.periodo_hasta);
  }

  return {
    subject: bundle.subject,
    body: bundle.body,
    pdfFilename,
    remitente: getMailFrom('cxc'),
    mailConfigured: isMailConfigured('cxc'),
    codigo_clie: vip?.codigo_clie || null,
    soportesDisponibles: soportes.length,
  };
}

export async function enviarNotificacionVipCuentaCobro(cns, body = {}, usuario = null, { extraAttachments = [] } = {}) {
  const row = await fetchVipCuentaCobro(cns);
  if (!row) {
    const err = new Error('Cuenta de cobro no encontrada');
    err.status = 404;
    throw err;
  }

  const vip = await loadVipCliente(row.codigo_cliente);
  const destData = await listVipDestinatarios(row.codigo_cliente);

  if (!isMailConfigured('cxc')) {
    const err = new Error('Configure SMTP_FROM_CXC (o SMTP_CXC_*) en el servidor para enviar cuentas de cobro');
    err.status = 400;
    throw err;
  }

  const toEmails = collectEmailList(body, 'emails', 'extraEmails');
  const ccEmails = collectEmailList(body, 'ccEmails', 'extraCcEmails');
  if (!toEmails.length) {
    const err = new Error('Seleccione al menos un destinatario (Para)');
    err.status = 400;
    throw err;
  }

  const toList = resolveDestinatariosVip(destData, toEmails);
  const ccList = resolveDestinatariosVip(destData, ccEmails);

  const pdfBuffer = await buildVipCuentaPdf(row);
  const pdfFilename = vipCuentaPdfFileName(row);
  const attachments = [{
    filename: pdfFilename,
    content: pdfBuffer,
    contentType: 'application/pdf',
  }];

  for (const att of extraAttachments) {
    if (!att?.content) continue;
    attachments.push({
      filename: att.filename || 'adjunto.pdf',
      content: att.content,
      contentType: att.contentType || 'application/pdf',
    });
  }

  const extraFilenames = extraAttachments.map((a) => a.filename).filter(Boolean);

  const bundle = buildVipCuentaCobroEmailBundle(
    row,
    vip,
    String(body.body || '').trim(),
    { pdfFilename, extraFilenames },
  );
  const subject = String(body.subject || '').trim() || bundle.subject;
  const saludoNombre = toList[0]?.nombre || vip?.nombrecliente || 'estimado(a)';
  const { text, html } = bundle.buildForRecipient({ nombre: saludoNombre });

  try {
    await sendMail({
      to: toList.map((d) => d.email).join(', '),
      cc: ccList.length ? ccList.map((d) => d.email).join(', ') : undefined,
      subject,
      text,
      html,
      attachments,
      meta: {
        cliente: vip?.codigo_clie || row.codigo_cliente,
        nombrecliente: vip?.nombrecliente || row.nombrecliente || null,
        contexto: 'vip_cuenta_cobro',
        referencia: String(cns),
        usuario,
        cuerpo: text,
        mailProfile: 'cxc',
      },
    });

    return {
      sent: 1,
      total: toList.length + ccList.length,
      from: getMailFrom('cxc'),
      pdfAttached: true,
      pdfFilename,
      extraCount: extraFilenames.length,
      extraFilenames,
      attachmentCount: attachments.length,
      details: [
        ...toList.map((d) => ({ email: d.email, nombre: d.nombre, rol: 'Para', ok: true })),
        ...ccList.map((d) => ({ email: d.email, nombre: d.nombre, rol: 'Copia', ok: true })),
      ],
    };
  } catch (err) {
    const error = new Error(`No se pudo enviar el correo: ${err.message}`);
    error.status = 502;
    throw error;
  }
}
