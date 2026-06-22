import { query } from '../db/pool.js';
import { sendMail } from './mailer.js';
import { createInviteToken, buildFirmaUrl } from './signingToken.js';
import { emailSkipReasonMessage } from './firmaEmail.js';

function fmtFecha(d) {
  if (!d) return '—';
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return '—';
  return dt.toLocaleString('es-CO');
}

export function parseEmailList(input) {
  const raw = Array.isArray(input) ? input.join('\n') : String(input || '');
  const emails = [
    ...new Set(
      raw
        .split(/[\s,;]+/)
        .map((e) => e.trim().toLowerCase())
        .filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)),
    ),
  ];
  return emails;
}

export async function sendInviteLinkEmail(invite) {
  const row = await query(
    `SELECT i.id, i.cnscapacita, i.email,
            r.tema, r.fecha, r.capacitador, r.cliente,
            c.nombrecliente
     FROM rasist_invite i
     JOIN rasist r ON r.cnscapacita = i.cnscapacita
     LEFT JOIN clie c ON c.codigo = r.cliente
     WHERE i.id = $1`,
    [invite.id],
  );
  const inv = row.rows[0];
  if (!inv?.email) return { sent: false, reason: 'sin_email' };

  const token = createInviteToken({
    cnscapacita: inv.cnscapacita,
    inviteId: inv.id,
    email: inv.email,
  });
  const url = buildFirmaUrl(token);
  const subject = `Invitación capacitación — ${inv.tema || inv.cnscapacita}`;
  const text = `
Estimado(a),

Está invitado(a) a registrar su asistencia y firmar digitalmente la capacitación:

  Cliente:      ${inv.nombrecliente || inv.cliente}
  Tema:         ${inv.tema || '—'}
  Fecha:        ${fmtFecha(inv.fecha)}
  Capacitador:  ${inv.capacitador || '—'}

Al abrir el enlace deberá ingresar sus datos (documento, nombre, cargo) y firmar.
No necesita usuario ni contraseña del sistema.

${url}

DevSoporte
  `.trim();

  const html = `
<p>Está invitado(a) a registrar su asistencia y firmar la capacitación:</p>
<ul>
  <li><strong>Cliente:</strong> ${inv.nombrecliente || inv.cliente}</li>
  <li><strong>Tema:</strong> ${inv.tema || '—'}</li>
  <li><strong>Fecha:</strong> ${fmtFecha(inv.fecha)}</li>
</ul>
<p>Al abrir el enlace ingrese sus datos y firme. <strong>No necesita login.</strong></p>
<p><a href="${url}">Abrir registro y firma</a></p>
<p style="font-size:12px;color:#666;">${url}</p>
  `.trim();

  const mail = await sendMail({ to: inv.email, subject, text, html });
  if (mail.skipped) {
    return { sent: false, reason: 'smtp_no_configurado', email: inv.email };
  }

  await query('UPDATE rasist_invite SET enviado = NOW() WHERE id = $1', [inv.id]);
  return { sent: true, email: inv.email };
}

export { emailSkipReasonMessage };
