import nodemailer from 'nodemailer';
import { registrarCorreo } from './correoLog.js';
import { saveSentCopy } from './saveSentCopy.js';
import { isPruebas } from '../config/env.js';

/** Perfiles: default (soporte/bitácora) | cxc (cuentas de cobro VIP). */
export function getMailProfileConfig(profile = 'default') {
  const useCxcSmtp = profile === 'cxc'
    && process.env.SMTP_CXC_HOST
    && process.env.SMTP_CXC_USER;

  if (useCxcSmtp) {
    return {
      profile: 'cxc',
      host: process.env.SMTP_CXC_HOST,
      port: Number(process.env.SMTP_CXC_PORT) || 587,
      secure: process.env.SMTP_CXC_SECURE === 'true',
      auth: {
        user: process.env.SMTP_CXC_USER,
        pass: process.env.SMTP_CXC_PASS,
      },
      from: process.env.SMTP_FROM_CXC || process.env.SMTP_CXC_USER,
    };
  }

  const from = profile === 'cxc'
    ? (process.env.SMTP_FROM_CXC || process.env.SMTP_FROM || process.env.SMTP_USER)
    : (process.env.SMTP_FROM || process.env.SMTP_USER);

  return {
    profile: profile === 'cxc' ? 'cxc' : 'default',
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    from,
  };
}

export function isMailConfigured(profile = 'default') {
  const cfg = getMailProfileConfig(profile);
  return Boolean(cfg.host && cfg.auth.user);
}

export function getMailFrom(profile = 'default') {
  return getMailProfileConfig(profile).from || '';
}

function createTransport(profile = 'default') {
  const cfg = getMailProfileConfig(profile);
  return nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: cfg.auth,
  });
}

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

export async function sendMail({
  to,
  cc,
  subject,
  text,
  html,
  attachments,
  meta,
  mailProfile = 'default',
}) {
  const profile = meta?.mailProfile || mailProfile || 'default';

  if (!isMailConfigured(profile)) {
    console.log('[email] SMTP no configurado — omitiendo envío a:', to);
    await logEnvio({ to, cc, subject, text, attachments }, meta, {
      exito: false,
      error: 'SMTP no configurado',
    });
    return { skipped: true };
  }

  const cfg = getMailProfileConfig(profile);
  const transporter = createTransport(profile);
  const from = meta?.from || cfg.from;
  const subjectFinal = isPruebas && subject && !subject.startsWith('[PRUEBAS]')
    ? `[PRUEBAS] ${subject}`
    : subject;
  const mailOptions = {
    from,
    to,
    cc: cc || undefined,
    subject: subjectFinal,
    text,
    html,
    attachments: attachments?.length ? attachments : undefined,
  };

  try {
    await transporter.sendMail(mailOptions);
    await saveSentCopy(mailOptions, profile);
    await logEnvio({ to, cc, subject, text, attachments }, meta, { exito: true, error: null });
    return { sent: true, from };
  } catch (err) {
    await logEnvio({ to, cc, subject, text, attachments }, meta, {
      exito: false,
      error: err.message,
    });
    throw err;
  }
}
