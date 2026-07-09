import { query } from '../db/pool.js';
import { sendMail } from './mailer.js';
import { createSigningToken, buildFirmaUrl } from './signingToken.js';

async function loadAsistenteContext(cnscapacita, item) {
  const res = await query(
    `SELECT d.cnscapacita, d.item, d.documento, d.nombres, d.cargo, d.firma, d.firma_fecha,
            r.tema, r.fecha, r.capacitador, r.cliente,
            c.nombrecliente,
            f.email AS funcionario_email,
            s.email AS soporte_email
     FROM rasistd d
     JOIN rasist r ON r.cnscapacita = d.cnscapacita
     LEFT JOIN clie c ON c.codigo = r.cliente
     LEFT JOIN clief f ON f.codigo = r.cliente AND f.documento = d.documento
     LEFT JOIN soport s ON (
       (d.documento LIKE 'SOP#%' AND s.codigo = SUBSTRING(d.documento FROM 5))
       OR (s.documento IS NOT NULL AND TRIM(s.documento) <> '' AND s.documento = d.documento)
     )
     WHERE d.cnscapacita = $1 AND d.item = $2`,
    [cnscapacita, item],
  );
  const row = res.rows[0] || null;
  if (row) {
    row.funcionario_email = row.funcionario_email || row.soporte_email || null;
  }
  return row;
}

function fmtFecha(d) {
  if (!d) return '—';
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return '—';
  return dt.toLocaleString('es-CO');
}

export function emailSkipReasonMessage(reason) {
  switch (reason) {
    case 'sin_email':
      return 'El participante no tiene correo (funcionario del cliente o técnico de soporte)';
    case 'sin_documento':
      return 'El asistente no tiene número de documento registrado';
    case 'smtp_no_configurado':
      return 'Correo no configurado (revise SMTP_HOST y SMTP_USER en .env)';
    case 'no_encontrado':
      return 'Asistente no encontrado';
    default:
      return reason || 'No se pudo enviar';
  }
}

export async function sendFirmaLinkEmail(asistente) {
  const row = await loadAsistenteContext(asistente.cnscapacita, asistente.item);
  if (!row) return { sent: false, reason: 'no_encontrado' };

  const email = row.funcionario_email?.trim();
  if (!email) {
    console.log('[email] Firma', row.cnscapacita, row.item, '— funcionario sin email');
    return { sent: false, reason: 'sin_email', nombres: row.nombres };
  }

  const token = createSigningToken({
    cnscapacita: row.cnscapacita,
    item: row.item,
    documento: row.documento,
  });
  const url = buildFirmaUrl(token);
  const subject = `Firma de asistencia — ${row.tema || row.cnscapacita}`;
  const text = `
Estimado(a) ${row.nombres || 'funcionario'},

Se requiere su firma digital como asistente a la capacitación:

  Cliente:      ${row.nombrecliente || row.cliente}
  Tema:         ${row.tema || '—'}
  Fecha:        ${fmtFecha(row.fecha)}
  Capacitador:  ${row.capacitador || '—'}

Abra el siguiente enlace desde su celular o computador para firmar (válido por ${Number(process.env.SIGNING_TOKEN_EXPIRES_DAYS) || 14} días).
No necesita usuario ni contraseña del sistema; solo abra el enlace y firme:

${url}

DevSoporte
  `.trim();

  const html = `
<p>Estimado(a) <strong>${row.nombres || 'funcionario'}</strong>,</p>
<p>Se requiere su firma digital como asistente a la capacitación:</p>
<ul>
  <li><strong>Cliente:</strong> ${row.nombrecliente || row.cliente}</li>
  <li><strong>Tema:</strong> ${row.tema || '—'}</li>
  <li><strong>Fecha:</strong> ${fmtFecha(row.fecha)}</li>
  <li><strong>Capacitador:</strong> ${row.capacitador || '—'}</li>
</ul>
<p><a href="${url}">Haga clic aquí para firmar</a></p>
<p style="font-size:12px;color:#666;">Si el enlace no abre, copie y pegue esta URL en su navegador:<br>${url}</p>
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
      contexto: 'firma',
      referencia: row.cnscapacita,
      cuerpo: text,
    },
  });
  if (mail.skipped) {
    console.log('[email] Firma', row.cnscapacita, row.item, '— SMTP no configurado');
    return { sent: false, reason: 'smtp_no_configurado', nombres: row.nombres, email };
  }
  console.log(`[email] Enlace de firma enviado a ${email} (${row.cnscapacita}/${row.item})`);
  return { sent: true, email, nombres: row.nombres };
}

export async function sendFirmasPendientes(cnscapacita) {
  const pending = await query(
    `SELECT cnscapacita, item, documento, nombres
     FROM rasistd
     WHERE cnscapacita = $1 AND (firma IS NULL OR TRIM(firma) = '')`,
    [cnscapacita],
  );

  const result = { sent: 0, skipped: 0, details: [] };
  for (const row of pending.rows) {
    try {
      const r = await sendFirmaLinkEmail(row);
      if (r.sent) {
        result.sent++;
        result.details.push({ item: row.item, nombres: row.nombres, ok: true, email: r.email });
      } else {
        result.skipped++;
        result.details.push({
          item: row.item,
          nombres: row.nombres,
          ok: false,
          reason: r.reason,
          message: emailSkipReasonMessage(r.reason),
        });
      }
    } catch (err) {
      result.skipped++;
      result.details.push({ item: row.item, nombres: row.nombres, ok: false, reason: 'error', message: err.message });
    }
  }
  return result;
}

export { loadAsistenteContext };
