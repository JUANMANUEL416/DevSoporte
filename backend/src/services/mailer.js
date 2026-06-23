import nodemailer from 'nodemailer';
import { registrarCorreo } from './correoLog.js';

export function isMailConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER);
}

function createTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

// Datos de auditoría del envío. `meta` permite a cada flujo enriquecer el
// registro (cliente, contexto, referencia, usuario). El cuerpo, asunto,
// destinatarios y adjuntos se toman del propio correo.
async function logEnvio({ to, cc, subject, text, attachments }, meta, { exito, error }) {
  await registrarCorreo({
    cliente: meta?.cliente ?? null,
    nombrecliente: meta?.nombrecliente ?? null,
    contexto: meta?.contexto ?? 'sistema',
    referencia: meta?.referencia ?? null,
    para: to,
    cc,
    asunto: subject,
    cuerpo: meta?.cuerpo ?? text ?? null,
    attachments,
    exito,
    error,
    usuario: meta?.usuario ?? null,
  });
}

export async function sendMail({ to, cc, subject, text, html, attachments, meta }) {
  if (!isMailConfigured()) {
    console.log('[email] SMTP no configurado — omitiendo envío a:', to);
    await logEnvio({ to, cc, subject, text, attachments }, meta, {
      exito: false,
      error: 'SMTP no configurado',
    });
    return { skipped: true };
  }

  const transporter = createTransport();
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      cc: cc || undefined,
      subject,
      text,
      html,
      attachments: attachments?.length ? attachments : undefined,
    });
    await logEnvio({ to, cc, subject, text, attachments }, meta, { exito: true, error: null });
    return { sent: true };
  } catch (err) {
    await logEnvio({ to, cc, subject, text, attachments }, meta, {
      exito: false,
      error: err.message,
    });
    throw err;
  }
}
