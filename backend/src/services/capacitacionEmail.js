import { query } from '../db/pool.js';
import { sendMail } from './mailer.js';

// Notifica por correo al líder del cliente y a los funcionarios con email registrado.
export async function notifyCapacitacion(cap) {
  if (!cap?.cliente) return { notified: 0, total: 0 };

  const [clienteRes, funcsRes] = await Promise.all([
    query('SELECT codigo, nombrecliente, email FROM clie WHERE codigo = $1', [cap.cliente]),
    query(
      `SELECT nombre, email FROM clief
       WHERE codigo = $1 AND email IS NOT NULL AND TRIM(email) <> ''`,
      [cap.cliente],
    ),
  ]);

  const cliente = clienteRes.rows[0];
  const recipients = new Map();

  if (cliente?.email?.trim()) {
    recipients.set(cliente.email.trim().toLowerCase(), cliente.nombrecliente || 'Líder del proyecto');
  }

  for (const f of funcsRes.rows) {
    const mail = f.email?.trim();
    if (mail) recipients.set(mail.toLowerCase(), f.nombre || 'Funcionario');
  }

  if (!recipients.size) {
    console.log('[email] Capacitación', cap.cnscapacita, '— sin destinatarios con email');
    return { notified: 0, total: 0 };
  }

  const fecha = cap.fecha ? new Date(cap.fecha).toLocaleString('es-CO') : '—';
  const subject = `Capacitación registrada — ${cap.tema || cap.cnscapacita}`;
  const body = `
Estimado(a),

Se ha registrado una capacitación:

  Cliente:      ${cliente?.nombrecliente || cap.cliente}
  Consecutivo:  ${cap.cnscapacita}
  Fecha:        ${fecha}
  Capacitador:  ${cap.capacitador || '—'}
  Tema:         ${cap.tema || '—'}
  Duración:     ${cap.duracion ?? '—'} minutos

DevSoporte
  `.trim();

  let notified = 0;
  for (const [to, nombre] of recipients) {
    try {
      const text = `Hola ${nombre},\n\n${body}`;
      await sendMail({ to, subject, text });
      notified++;
    } catch (err) {
      console.error('[email] Error enviando a', to, ':', err.message);
    }
  }

  console.log(`[email] Capacitación ${cap.cnscapacita}: ${notified}/${recipients.size} correos enviados`);
  return { notified, total: recipients.size };
}
