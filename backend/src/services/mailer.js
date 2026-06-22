import nodemailer from 'nodemailer';

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

export async function sendMail({ to, cc, subject, text, html, attachments }) {
  if (!isMailConfigured()) {
    console.log('[email] SMTP no configurado — omitiendo envío a:', to);
    return { skipped: true };
  }

  const transporter = createTransport();
  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    cc: cc || undefined,
    subject,
    text,
    html,
    attachments: attachments?.length ? attachments : undefined,
  });
  return { sent: true };
}
