function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const PLACEHOLDER_RE = /^\[([^\]]+)\]$/;

export const PLANTILLA_CUERPO_SUGERIDA = `{{saludo}}

Es un gusto saludarlos. A través de DevSoporte reafirmamos nuestro compromiso con la continuidad, calidad y evolución de sus soluciones tecnológicas.

[Escriba aquí el contenido principal: contexto, novedades, acuerdos o solicitudes.]

Quedamos atentos para resolver inquietudes, ampliar información o coordinar los próximos pasos que consideren pertinentes.

Atentamente,`;

export function formatCuerpoHtml(cuerpo) {
  const text = String(cuerpo || '').trim();
  if (!text) return '<span style="color:#94a3b8;">(mensaje vacío)</span>';

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

export function buildCorreoPreviewShell(asunto, bodyHtml, firmaHtml) {
  const titulo = asunto
    ? `<h2 style="margin:0 0 18px;font-size:19px;font-weight:600;color:#0d47a1;letter-spacing:-0.02em;">${escapeHtml(asunto)}</h2>`
    : '';
  return `
<div style="font-family:'Segoe UI',Arial,Helvetica,sans-serif;font-size:14px;color:#1e293b;line-height:1.6;max-width:640px;margin:0 auto;">
  <div style="border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;background:#ffffff;box-shadow:0 4px 24px rgba(15,23,42,0.06);">
    <div style="height:4px;background:linear-gradient(90deg,#0d47a1,#1565c0,#42a5f5);"></div>
    <div style="padding:24px 28px;">
      ${titulo}
      <div>${bodyHtml}</div>
      ${firmaHtml || ''}
    </div>
  </div>
</div>`.trim();
}
