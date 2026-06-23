import { query } from '../db/pool.js';
import { validateFirmaDataUrl } from '../routes/firmaPublica.js';

export const DEFAULT_CUERPO_TEMPLATE = `{{saludo}}

Es un gusto saludarlos. A través de DevSoporte reafirmamos nuestro compromiso con la continuidad, calidad y evolución de sus soluciones tecnológicas.

[Escriba aquí el contenido principal: contexto, novedades, acuerdos o solicitudes.]

Quedamos atentos para resolver inquietudes, ampliar información o coordinar los próximos pasos que consideren pertinentes.

Atentamente,`;

export const DEFAULT_FIRMA_TEXTO = 'Equipo de Soporte — DevSoporte';

const MAX_FIRMA_HTML = 800000;

export function buildSaludo(nombreCliente) {
  const nombre = String(nombreCliente || '').trim();
  return nombre ? `Estimados señores ${nombre},` : 'Estimado(a),';
}

export function applyCuerpoTemplate(template, nombreCliente) {
  const saludo = buildSaludo(nombreCliente);
  return String(template || DEFAULT_CUERPO_TEMPLATE).replace(/\{\{saludo\}\}/g, saludo);
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const PLACEHOLDER_RE = /^\[([^\]]+)\]$/;

export function formatCuerpoHtml(cuerpo) {
  const text = String(cuerpo || '').trim();
  if (!text) return '';

  const blocks = text.split(/\n\n+/);
  const parts = [];
  let blockIndex = 0;

  for (const block of blocks) {
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
    if (!lines.length) continue;

    if (lines.length === 1 && lines[0] === '---') {
      parts.push('<hr style="border:none;border-top:1px solid #e2e8f0;margin:22px 0;" />');
      blockIndex += 1;
      continue;
    }

    if (lines.length === 1 && PLACEHOLDER_RE.test(lines[0])) {
      const inner = escapeHtml(lines[0].slice(1, -1));
      parts.push(
        `<div style="margin:18px 0;padding:14px 18px;background:linear-gradient(135deg,#f8fafc 0%,#f1f5f9 100%);border-left:3px solid #1565c0;border-radius:0 10px 10px 0;color:#64748b;font-size:13px;font-style:italic;line-height:1.55;">${inner}</div>`,
      );
      blockIndex += 1;
      continue;
    }

    const bulletLines = lines.filter((l) => /^[•\-–]\s/.test(l));
    if (bulletLines.length === lines.length) {
      const items = lines
        .map(
          (l) =>
            `<li style="margin-bottom:8px;">${escapeHtml(l.replace(/^[•\-–]\s+/, ''))}</li>`,
        )
        .join('');
      parts.push(
        `<ul style="margin:0 0 18px;padding-left:22px;color:#334155;line-height:1.65;">${items}</ul>`,
      );
      blockIndex += 1;
      continue;
    }

    const content = lines.map((l) => escapeHtml(l)).join('<br>');
    if (blockIndex === 0 && /^estimad/i.test(lines[0])) {
      parts.push(
        `<p style="margin:0 0 20px;font-size:15px;font-weight:600;color:#0f172a;letter-spacing:0.01em;">${content}</p>`,
      );
    } else if (/^atentamente|^cordialmente|^saludos cordiales/i.test(lines[0])) {
      parts.push(
        `<p style="margin:8px 0 0;color:#475569;font-weight:500;">${content}</p>`,
      );
    } else {
      parts.push(
        `<p style="margin:0 0 16px;color:#334155;line-height:1.68;">${content}</p>`,
      );
    }
    blockIndex += 1;
  }

  return parts.join('');
}

export function htmlToPlainText(html) {
  return String(html || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function sanitizeFirmaHtml(html) {
  if (html === null || html === undefined || html === '') return null;
  const trimmed = String(html).trim();
  if (!trimmed) return null;
  if (trimmed.length > MAX_FIRMA_HTML) {
    const err = new Error('La firma HTML es demasiado grande (máx. ~800 KB)');
    err.status = 400;
    throw err;
  }
  return trimmed
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/javascript:/gi, '');
}

function firmaImagenHtml(firmaImagen) {
  if (!firmaImagen || !validateFirmaDataUrl(firmaImagen)) return '';
  return `<div style="margin-top:8px;"><img src="${firmaImagen}" alt="Firma" style="max-width:480px;max-height:160px;display:block;" /></div>`;
}

export function buildFirmaHtml(firmaTexto, firmaImagen, firmaHtml) {
  const html = sanitizeFirmaHtml(firmaHtml);
  if (html) {
    return `
<div style="margin-top:18px;padding-top:12px;border-top:1px solid #e2e8f0;">
  ${html}
</div>`;
  }
  const text = escapeHtml(firmaTexto || '').replace(/\n/g, '<br>');
  if (!text && !firmaImagen) return '';
  return `
<div style="margin-top:18px;padding-top:12px;border-top:1px solid #e2e8f0;color:#475569;font-size:13px;line-height:1.5;">
  ${text ? `<div>${text}</div>` : ''}
  ${firmaImagenHtml(firmaImagen)}
</div>`;
}

export function buildFirmaText(firmaTexto, firmaHtml) {
  const html = sanitizeFirmaHtml(firmaHtml);
  if (html) {
    const plain = htmlToPlainText(html);
    return plain ? `\n\n${plain}` : '';
  }
  const text = String(firmaTexto || '').trim();
  return text ? `\n\n${text}` : '';
}

export function buildCorreoHtml(asunto, cuerpo, plantilla) {
  const body = formatCuerpoHtml(cuerpo);
  const titulo = asunto
    ? `<h2 style="margin:0 0 18px;font-size:19px;font-weight:600;color:#0d47a1;letter-spacing:-0.02em;">${escapeHtml(asunto)}</h2>`
    : '';
  const firma = buildFirmaHtml(plantilla?.firma_texto, plantilla?.firma_imagen, plantilla?.firma_html);
  return `
<div style="font-family:'Segoe UI',Arial,Helvetica,sans-serif;font-size:14px;color:#1e293b;line-height:1.6;max-width:640px;margin:0 auto;">
  <div style="border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;background:#ffffff;box-shadow:0 4px 24px rgba(15,23,42,0.06);">
    <div style="height:4px;background:linear-gradient(90deg,#0d47a1,#1565c0,#42a5f5);"></div>
    <div style="padding:24px 28px;">
      ${titulo}
      <div>${body}</div>
      ${firma}
    </div>
  </div>
</div>`.trim();
}

export function buildCorreoText(cuerpo, plantilla) {
  return `${cuerpo}${buildFirmaText(plantilla?.firma_texto, plantilla?.firma_html)}`;
}

export async function getCorreoPlantilla() {
  const res = await query(
    `SELECT id, cuerpo_template, firma_texto, firma_imagen, firma_html, updated_at, updated_by
     FROM correo_plantilla WHERE id = 1`,
  );
  if (res.rows[0]) return res.rows[0];
  return {
    id: 1,
    cuerpo_template: DEFAULT_CUERPO_TEMPLATE,
    firma_texto: DEFAULT_FIRMA_TEXTO,
    firma_imagen: null,
    firma_html: null,
    updated_at: null,
    updated_by: null,
  };
}

export async function saveCorreoPlantilla(payload, usuario) {
  const cuerpoTemplate = String(payload.cuerpo_template || '').trim();
  if (!cuerpoTemplate) {
    const err = new Error('La plantilla del mensaje es obligatoria');
    err.status = 400;
    throw err;
  }
  const firmaTexto = String(payload.firma_texto || '').trim() || null;
  let firmaHtml = sanitizeFirmaHtml(payload.firma_html);
  let firmaImagen = payload.firma_imagen;
  if (firmaImagen === '') firmaImagen = null;

  if (firmaHtml) {
    firmaImagen = null;
  } else if (firmaImagen && !validateFirmaDataUrl(firmaImagen)) {
    const err = new Error('Imagen de firma inválida (PNG/JPG, máx. ~600 KB)');
    err.status = 400;
    throw err;
  }

  const res = await query(
    `INSERT INTO correo_plantilla (id, cuerpo_template, firma_texto, firma_imagen, firma_html, updated_at, updated_by)
     VALUES (1, $1, $2, $3, $4, NOW(), $5)
     ON CONFLICT (id) DO UPDATE SET
       cuerpo_template = EXCLUDED.cuerpo_template,
       firma_texto = EXCLUDED.firma_texto,
       firma_imagen = EXCLUDED.firma_imagen,
       firma_html = EXCLUDED.firma_html,
       updated_at = NOW(),
       updated_by = EXCLUDED.updated_by
     RETURNING id, cuerpo_template, firma_texto, firma_imagen, firma_html, updated_at, updated_by`,
    [cuerpoTemplate, firmaTexto, firmaImagen, firmaHtml, usuario || null],
  );
  return res.rows[0];
}
