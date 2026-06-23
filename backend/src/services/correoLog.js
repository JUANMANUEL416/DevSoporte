import { query } from '../db/pool.js';

// Normaliza una lista de correos (string o array) a un texto separado por comas.
function joinEmails(value) {
  if (!value) return null;
  if (Array.isArray(value)) {
    const list = value.map((v) => String(v || '').trim()).filter(Boolean);
    return list.length ? list.join(', ') : null;
  }
  const text = String(value).trim();
  return text || null;
}

function countDestinatarios(...parts) {
  const seen = new Set();
  for (const part of parts) {
    if (!part) continue;
    String(part)
      .split(/[,;]+/)
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
      .forEach((e) => seen.add(e));
  }
  return seen.size;
}

function serializeAdjuntos(attachments) {
  if (!Array.isArray(attachments) || !attachments.length) return null;
  const list = attachments.map((a) => ({
    filename: a.filename || 'adjunto',
    size: a.content?.length ?? a.size ?? null,
  }));
  return JSON.stringify(list);
}

/**
 * Registra un envío de correo en la tabla `correos`.
 * Nunca lanza: si falla el registro, sólo deja traza en consola para no
 * interrumpir el flujo de envío.
 */
export async function registrarCorreo({
  cliente = null,
  nombrecliente = null,
  contexto = 'sistema',
  referencia = null,
  para = null,
  cc = null,
  asunto = null,
  cuerpo = null,
  attachments = null,
  exito = false,
  error = null,
  usuario = null,
} = {}) {
  try {
    const paraText = joinEmails(para);
    const ccText = joinEmails(cc);
    await query(
      `INSERT INTO correos
        (cliente, nombrecliente, contexto, referencia, para, cc, asunto, cuerpo, adjuntos, num_destinatarios, exito, error, usuario)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [
        cliente,
        nombrecliente,
        contexto,
        referencia,
        paraText,
        ccText,
        asunto,
        cuerpo,
        serializeAdjuntos(attachments),
        countDestinatarios(paraText, ccText),
        Boolean(exito),
        error ? String(error).slice(0, 2000) : null,
        usuario,
      ],
    );
  } catch (err) {
    console.error('[correoLog] No se pudo registrar el correo:', err.message);
  }
}
