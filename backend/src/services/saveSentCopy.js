import { ImapFlow } from 'imapflow';
import MailComposer from 'nodemailer/lib/mail-composer/index.js';

function isEnabled() {
  return process.env.SMTP_SAVE_SENT_COPY !== 'false';
}

function imapHost(smtpHost) {
  if (process.env.IMAP_HOST && !smtpHost) return process.env.IMAP_HOST.trim();
  const smtp = (smtpHost || process.env.SMTP_HOST || '').trim();
  if (!smtp) return null;
  if (/^smtp\./i.test(smtp)) return smtp.replace(/^smtp\./i, 'mail.');
  return smtp;
}

function buildRawMessage(mailOptions) {
  return new Promise((resolve, reject) => {
    const composer = new MailComposer(mailOptions);
    composer.compile().build((err, message) => {
      if (err) reject(err);
      else resolve(message);
    });
  });
}

async function resolveSentFolder(client) {
  const configured = (process.env.IMAP_SENT_FOLDER || '').trim();
  if (configured) return configured;

  const boxes = await client.list();
  const bySpecial = boxes.find(
    (box) =>
      box.specialUse === '\\Sent'
      || (Array.isArray(box.specialUse) && box.specialUse.includes('\\Sent')),
  );
  if (bySpecial?.path) return bySpecial.path;

  const byName = boxes.find((box) =>
    /^(INBOX\.)?(Sent|Sent Items|Elementos enviados|Enviados|Sent Mail)$/i.test(box.name),
  );
  if (byName?.path) return byName.path;

  return 'Sent';
}

/**
 * Guarda una copia en la carpeta Enviados del buzón (IMAP).
 * Los clientes de correo (Outlook, webmail) no archivan en Enviados
 * los mensajes enviados por SMTP desde aplicaciones externas.
 */
export async function saveSentCopy(mailOptions, profile = 'default') {
  if (!isEnabled()) return { skipped: true, reason: 'disabled' };

  const useCxc = profile === 'cxc'
    && process.env.SMTP_CXC_USER
    && process.env.SMTP_CXC_PASS;
  const user = (useCxc
    ? process.env.SMTP_CXC_USER
    : (process.env.IMAP_USER || process.env.SMTP_USER))?.trim();
  const pass = (useCxc
    ? process.env.SMTP_CXC_PASS
    : (process.env.IMAP_PASS || process.env.SMTP_PASS))?.trim();

  if (!user || !pass) {
    return { skipped: true, reason: 'no-auth' };
  }

  const host = imapHost(useCxc ? process.env.SMTP_CXC_HOST : null);
  if (!host) return { skipped: true, reason: 'no-imap-host' };

  const client = new ImapFlow({
    host,
    port: Number(process.env.IMAP_PORT) || 993,
    secure: process.env.IMAP_SECURE !== 'false',
    auth: { user, pass },
    logger: false,
  });

  try {
    const raw = await buildRawMessage(mailOptions);
    await client.connect();
    const sentFolder = await resolveSentFolder(client);
    await client.append(sentFolder, raw, ['\\Seen'], new Date());
    return { saved: true, folder: sentFolder };
  } catch (err) {
    console.warn('[email] No se pudo guardar copia en Enviados (IMAP):', err.message);
    return { saved: false, error: err.message };
  } finally {
    try {
      await client.logout();
    } catch {
      /* ignore */
    }
  }
}
