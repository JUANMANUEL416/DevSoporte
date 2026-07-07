export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function applyNombreTemplate(template, nombre) {
  return String(template).replace(/\{\{nombre\}\}/g, nombre || 'estimado(a)');
}

export function stripLeadingGreeting(text) {
  return String(text || '')
    .replace(/^Hola\s+(\{\{nombre\}\}|[^,\n]+),?\s*\n?/i, '')
    .trim();
}

/** Separa saludo/intro del bloque de datos en texto plano editable. */
export function extractIntroFromBody(body, fallbackIntro) {
  const lines = String(body || '').split('\n');
  const introLines = [];
  for (const line of lines) {
    if (/^\s{2,}\S/.test(line) || /^(Cliente|Consecutivo|Fecha|Funcionario|Solicitud|Respuesta|Observaciones|Tema|Capacitador|Duración)\s*:/i.test(line.trim())) {
      break;
    }
    introLines.push(line);
  }
  const intro = introLines.join('\n').trim();
  return intro || fallbackIntro;
}

export function textToHtmlParagraphs(text) {
  const blocks = String(text || '')
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (!blocks.length) return '';

  return blocks
    .map(
      (p) =>
        `<p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#334155;">${escapeHtml(p).replace(/\n/g, '<br>')}</p>`,
    )
    .join('');
}

function renderDetailRows(rows) {
  return rows
    .map(
      ({ label, value }) => `
        <tr>
          <td style="padding:10px 14px;border-bottom:1px solid #eef2f7;font-size:12px;font-weight:600;color:#64748b;width:38%;vertical-align:top;">${escapeHtml(label)}</td>
          <td style="padding:10px 14px;border-bottom:1px solid #eef2f7;font-size:14px;color:#0f172a;vertical-align:top;">${escapeHtml(value ?? '—')}</td>
        </tr>`,
    )
    .join('');
}

function renderLinkRows(rows) {
  return rows
    .map(
      ({ label, href }) => `
        <tr>
          <td style="padding:10px 14px;border-bottom:1px solid #eef2f7;font-size:12px;font-weight:600;color:#64748b;width:38%;vertical-align:top;">${escapeHtml(label)}</td>
          <td style="padding:10px 14px;border-bottom:1px solid #eef2f7;font-size:14px;color:#0f172a;vertical-align:top;">
            <a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer" style="color:#1565c0;word-break:break-all;">Firmar soportes</a>
          </td>
        </tr>`,
    )
    .join('');
}

function renderCallout({ title, text, accent }) {
  if (!text) return '';
  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:20px 0 0;">
      <tr>
        <td style="padding:14px 16px;background:${accent}12;border:1px solid ${accent}33;border-radius:10px;">
          ${title ? `<p style="margin:0 0 6px;font-size:13px;font-weight:700;color:${accent};">${escapeHtml(title)}</p>` : ''}
          <p style="margin:0;font-size:14px;line-height:1.55;color:#334155;">${escapeHtml(text)}</p>
        </td>
      </tr>
    </table>`;
}

function renderActionButton({ href, label, accent }) {
  if (!href || !label) return '';
  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:20px 0 0;">
      <tr>
        <td align="center" style="padding:8px 0;">
          <a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer"
             style="display:inline-block;padding:14px 28px;background:${accent};color:#ffffff;text-decoration:none;border-radius:10px;font-size:15px;font-weight:700;letter-spacing:0.02em;">
            ${escapeHtml(label)}
          </a>
        </td>
      </tr>
      <tr>
        <td align="center" style="padding:8px 0 0;">
          <p style="margin:0;font-size:12px;line-height:1.5;color:#64748b;word-break:break-all;">${escapeHtml(href)}</p>
        </td>
      </tr>
    </table>`;
}

function renderImageGallery(images = []) {
  if (!images.length) return '';
  const cells = images
    .map(
      ({ cid, alt, filename }) => `
        <td width="50%" style="padding:6px 8px 10px;vertical-align:top;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
            <tr>
              <td align="center" style="padding:8px;background:#f1f5f9;">
                <img src="cid:${escapeHtml(cid)}" alt="${escapeHtml(alt || 'Evidencia de soporte')}"
                     width="200" style="display:block;max-width:200px;width:100%;height:auto;border-radius:4px;" />
              </td>
            </tr>
            <tr>
              <td style="padding:8px 10px;">
                <p style="margin:0;font-size:11px;font-weight:600;color:#475569;word-break:break-all;">${escapeHtml(filename || alt || 'Evidencia')}</p>
                <p style="margin:4px 0 0;font-size:10px;line-height:1.4;color:#94a3b8;">Vista previa — tamaño completo en adjuntos</p>
              </td>
            </tr>
          </table>
        </td>`,
    )
    .join('');
  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:20px 0 0;">
      <tr>
        <td style="padding:14px 16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;">
          <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#0f172a;">Evidencias del soporte</p>
          <p style="margin:0 0 12px;font-size:12px;line-height:1.45;color:#64748b;">Miniaturas en este mensaje. Las imágenes completas van adjuntas al correo.</p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>${cells}</tr>
          </table>
        </td>
      </tr>
    </table>`;
}

/**
 * Plantilla HTML responsive compatible con clientes de correo (tablas + estilos inline).
 */
export function buildNotificationEmailHtml({
  preheader = '',
  title,
  subtitle = '',
  badge = '',
  accent = '#1565c0',
  greeting = '',
  introText = '',
  rows = [],
  linkRows = [],
  calloutTitle = '',
  calloutText = '',
  actionButton = null,
  imageGallery = [],
  footerNote = '',
  footerBrand = 'DevSoporte',
}) {
  const introHtml = textToHtmlParagraphs(introText);
  const greetingHtml = greeting
    ? `<p style="margin:0 0 12px;font-size:16px;font-weight:600;color:#0f172a;">${escapeHtml(greeting)}</p>`
    : '';
  const badgeHtml = badge
    ? `<span style="display:inline-block;margin-top:10px;padding:4px 10px;border-radius:999px;background:rgba(255,255,255,0.18);font-size:11px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;">${escapeHtml(badge)}</span>`
    : '';
  const subtitleHtml = subtitle
    ? `<p style="margin:6px 0 0;font-size:14px;line-height:1.4;color:rgba(255,255,255,0.92);">${escapeHtml(subtitle)}</p>`
    : '';
  const footerNoteHtml = footerNote
    ? `<p style="margin:0 0 8px;font-size:13px;line-height:1.5;color:#64748b;">${escapeHtml(footerNote)}</p>`
    : '';

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:#eef2f7;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eef2f7;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 10px 30px rgba(15,23,42,0.08);">
          <tr>
            <td style="padding:22px 24px;background:linear-gradient(135deg, ${accent} 0%, #0f172a 140%);color:#ffffff;">
              <p style="margin:0;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;opacity:0.85;">${escapeHtml(footerBrand)}</p>
              <h1 style="margin:8px 0 0;font-size:22px;line-height:1.25;font-weight:700;color:#ffffff;">${escapeHtml(title)}</h1>
              ${subtitleHtml}
              ${badgeHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:24px;">
              ${greetingHtml}
              ${introHtml}
              ${
                rows.length || linkRows.length
                  ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:8px;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;background:#f8fafc;">
                ${renderDetailRows(rows)}
                ${renderLinkRows(linkRows)}
              </table>`
                  : ''
              }
              ${renderCallout({ title: calloutTitle, text: calloutText, accent })}
              ${renderImageGallery(imageGallery)}
              ${actionButton ? renderActionButton({ ...actionButton, accent: actionButton.accent || accent }) : ''}
            </td>
          </tr>
          <tr>
            <td style="padding:16px 24px 22px;border-top:1px solid #eef2f7;background:#fafbfc;">
              ${footerNoteHtml}
              <p style="margin:0;font-size:12px;color:#94a3b8;">Este mensaje fue generado automáticamente por ${escapeHtml(footerBrand)}.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function buildPlainNotificationEmail({
  greeting,
  introText,
  rows = [],
  calloutText = '',
  actionUrl = '',
  actionLabel = '',
  footerBrand = 'DevSoporte',
}) {
  const parts = [];
  if (greeting) parts.push(greeting, '');
  if (introText) parts.push(introText, '');
  if (rows.length) {
    rows.forEach(({ label, value }) => {
      parts.push(`${label}: ${value ?? '—'}`);
    });
    parts.push('');
  }
  if (calloutText) parts.push(calloutText, '');
  if (actionUrl) {
    parts.push(actionLabel || 'Abrir enlace', actionUrl, '');
  }
  parts.push(footerBrand);
  return parts.join('\n').trim();
}
