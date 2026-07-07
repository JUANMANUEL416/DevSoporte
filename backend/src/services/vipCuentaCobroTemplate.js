import {
  fmtFechaCorta,
  fmtFechaLarga,
  fmtValorPesos,
  getEmisorConfig,
} from './vipCuentaCobro.js';

export const VIP_CC_VARIABLES = [
  { key: 'numero', label: 'Número de la cuenta', ejemplo: '2026-05' },
  { key: 'fecha_emision', label: 'Fecha de emisión (larga)', ejemplo: '3 de julio de 2026' },
  { key: 'fecha_emision_corta', label: 'Fecha de emisión (corta)', ejemplo: '03/07/2026' },
  { key: 'ciudad_emision', label: 'Ciudad del documento', ejemplo: 'Juan de Acosta – Atlántico' },
  { key: 'cliente_nombre', label: 'Nombre del cliente (mayúsculas)', ejemplo: 'CLINICA ESPERANZA S.A.S' },
  { key: 'cliente_nit', label: 'N.I.T. del cliente (con etiqueta)', ejemplo: 'N.I.T. 900815840-3' },
  { key: 'nit', label: 'N.I.T. sin etiqueta', ejemplo: '900815840-3' },
  { key: 'emisor_nombre', label: 'Nombre del emisor', ejemplo: 'JOSE MANUEL JIMENEZ BUSTOS' },
  { key: 'emisor_documento', label: 'Documento del emisor', ejemplo: 'C.C. 11235943 de Tabio (Cund)' },
  { key: 'valor', label: 'Valor formateado', ejemplo: '$1.500.000' },
  { key: 'valor_letras', label: 'Valor en letras', ejemplo: 'UN MILLON QUINIENTOS MIL PESOS MTE.' },
  { key: 'concepto', label: 'Concepto del cobro', ejemplo: 'servicios de asesoría y soporte' },
  { key: 'periodo', label: 'Texto del periodo', ejemplo: ' durante el periodo del 01/05/2026 al 31/05/2026.' },
  { key: 'periodo_desde', label: 'Periodo desde', ejemplo: '01/05/2026' },
  { key: 'periodo_hasta', label: 'Periodo hasta', ejemplo: '31/05/2026' },
  { key: 'cuenta_banco', label: 'Número de cuenta bancaria', ejemplo: '335-365865-69' },
  { key: 'banco_nombre', label: 'Nombre del banco', ejemplo: 'Bancolombia' },
  { key: 'cuerpo', label: 'Párrafo completo del concepto (texto estándar)', ejemplo: 'La suma de ($1.500.000) ...' },
];

export const DEFAULT_CC_PLANTILLA = `<p style="text-align: right">{{ciudad_emision}}, {{fecha_emision}}</p>
<p><strong>Nro.: {{numero}}</strong></p>
<p style="text-align: center"><strong>{{cliente_nombre}}</strong></p>
<p style="text-align: center">{{cliente_nit}}</p>
<p><strong>DEBE A:</strong></p>
<p style="text-align: center"><strong>{{emisor_nombre}}</strong></p>
<p style="text-align: center">{{emisor_documento}}</p>
<p>{{cuerpo}}</p>
<p>Favor consignar en la cuenta de ahorros Nro. {{cuenta_banco}} de {{banco_nombre}}.</p>
<p>Atentamente,</p>
<p><br></p>
<p style="text-align: center"><strong>{{emisor_nombre}}</strong></p>
<p style="text-align: center">{{emisor_documento}}</p>`;

/** Estilos compartidos: vista previa en UI y generación PDF (Chromium). */
export const VIP_CUENTA_HTML_DOCUMENT_STYLES = `
  @page { size: letter; margin: 0.65in; }
  html, body {
    margin: 0;
    padding: 0;
    color: #111;
    font-family: "Times New Roman", Times, serif;
    font-size: 12pt;
    line-height: 1.35;
  }
  body { padding: 0; background: #fff; }
  .vip-doc-sheet {
    box-sizing: border-box;
    min-height: 100%;
  }
  .vip-doc-frame {
    box-sizing: border-box;
    border: 2px solid #1e3a5f;
    outline: 1px solid #94a3b8;
    outline-offset: 4px;
    padding: 26px 30px 32px;
    min-height: calc(100vh - 1.3in);
    position: relative;
  }
  .vip-doc-frame::before {
    content: "";
    position: absolute;
    top: 10px;
    left: 10px;
    right: 10px;
    bottom: 10px;
    border: 1px solid #cbd5e1;
    pointer-events: none;
  }
  .vip-doc-frame__inner {
    position: relative;
    z-index: 1;
    border-top: 3px solid #1565c0;
    padding-top: 16px;
  }
  table { border-collapse: collapse; width: 100%; }
  td, th { vertical-align: top; padding: 2px 4px; }
  p { margin: 0 0 8px; }
  img { max-width: 100%; height: auto; }
  .doc-title { font-size: 14pt; font-weight: bold; text-align: center; margin-bottom: 12px; }
`;

export function wrapVipCuentaHtmlDocument(bodyHtml) {
  const content = String(bodyHtml || '');
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <style>${VIP_CUENTA_HTML_DOCUMENT_STYLES}</style>
</head>
<body>
  <div class="vip-doc-sheet">
    <div class="vip-doc-frame">
      <div class="vip-doc-frame__inner">${content}</div>
    </div>
  </div>
</body>
</html>`;
}

function periodoTexto(row) {
  return row.periodo_desde && row.periodo_hasta
    ? ` durante el periodo del ${fmtFechaCorta(row.periodo_desde)} al ${fmtFechaCorta(row.periodo_hasta)}.`
    : '.';
}

export function buildVipCuentaVariables(row, emisor = getEmisorConfig()) {
  const valorFmt = fmtValorPesos(row.valor);
  const concepto = String(row.concepto || '').trim();
  const periodo = periodoTexto(row);
  const cuenta = row.cuenta_banco || emisor.cuenta;
  const banco = row.banco_nombre || emisor.banco;
  const ciudadDoc = row.ciudad_emision || emisor.ciudad;

  return {
    numero: row.numero || '',
    fecha_emision: fmtFechaLarga(row.fecha_emision),
    fecha_emision_corta: fmtFechaCorta(row.fecha_emision),
    ciudad_emision: ciudadDoc,
    cliente_nombre: String(row.nombrecliente || '').toUpperCase(),
    cliente_nit: row.nit ? `N.I.T. ${row.nit}` : '',
    nit: row.nit || '',
    cliente_ciudad: row.ciudad || '',
    emisor_nombre: emisor.nombre,
    emisor_documento: emisor.documento,
    emisor_ciudad: emisor.ciudad,
    cuenta_banco: cuenta,
    banco_nombre: banco,
    valor: valorFmt,
    valor_letras: row.valor_letras || '',
    concepto,
    periodo,
    periodo_desde: fmtFechaCorta(row.periodo_desde),
    periodo_hasta: fmtFechaCorta(row.periodo_hasta),
    cuerpo: `La suma de (${valorFmt}) ${row.valor_letras || ''} Por concepto de ${concepto}${periodo}`,
  };
}

export function applyVipCuentaPlantilla(template, vars) {
  let html = String(template || '');
  for (const [key, value] of Object.entries(vars)) {
    html = html.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'gi'), String(value ?? ''));
  }
  return html;
}

function decodeHtmlEntities(text) {
  return String(text || '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

function extractAlign(attrs = '') {
  const styleMatch = attrs.match(/text-align\s*:\s*(left|center|right)/i);
  if (styleMatch) return styleMatch[1].toLowerCase();
  const alignMatch = attrs.match(/align\s*=\s*"(left|center|right)"/i);
  if (alignMatch) return alignMatch[1].toLowerCase();
  return 'left';
}

function normalizeWordHtml(html) {
  return String(html || '')
    .replace(/<span[^>]*font-weight\s*:\s*bold[^>]*>([\s\S]*?)<\/span>/gi, '<strong>$1</strong>')
    .replace(/<span[^>]*font-weight\s*:\s*700[^>]*>([\s\S]*?)<\/span>/gi, '<strong>$1</strong>')
    .replace(/<span[^>]*font-style\s*:\s*italic[^>]*>([\s\S]*?)<\/span>/gi, '<em>$1</em>')
    .replace(/<span[^>]*>([\s\S]*?)<\/span>/gi, '$1');
}

function parseInlineSegments(html) {
  const normalized = normalizeWordHtml(html);
  const segments = [];
  const re = /<(strong|b|em|i)>(.*?)<\/\1>|([^<]+)/gis;
  let match;
  while ((match = re.exec(normalized)) !== null) {
    if (match[1]) {
      const tag = match[1].toLowerCase();
      segments.push({
        text: decodeHtmlEntities(match[2].replace(/<[^>]+>/g, '').trim()),
        bold: tag === 'strong' || tag === 'b',
        italic: tag === 'em' || tag === 'i',
      });
    } else if (match[3]) {
      const text = decodeHtmlEntities(match[3].replace(/<[^>]+>/g, ''));
      if (text) segments.push({ text, bold: false, italic: false });
    }
  }
  return segments.filter((s) => s.text);
}

function parseTableRows(tableHtml) {
  const rows = [];
  const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch;
  while ((rowMatch = rowRe.exec(tableHtml)) !== null) {
    const cells = [];
    const cellRe = /<t[dh]([^>]*)>([\s\S]*?)<\/t[dh]>/gi;
    let cellMatch;
    while ((cellMatch = cellRe.exec(rowMatch[1])) !== null) {
      cells.push({
        align: extractAlign(cellMatch[1] || ''),
        segments: parseInlineSegments(cellMatch[2] || ''),
      });
    }
    if (cells.length) rows.push(cells);
  }
  return rows;
}

function splitHtmlBlocks(html) {
  const source = normalizeWordHtml(html);
  const blocks = [];
  const parts = [];
  const tableRe = /<table[\s\S]*?<\/table>/gi;
  let lastIndex = 0;
  let tableMatch;
  while ((tableMatch = tableRe.exec(source)) !== null) {
    if (tableMatch.index > lastIndex) {
      parts.push({ type: 'html', content: source.slice(lastIndex, tableMatch.index) });
    }
    parts.push({ type: 'table', content: tableMatch[0] });
    lastIndex = tableRe.lastIndex;
  }
  if (lastIndex < source.length) {
    parts.push({ type: 'html', content: source.slice(lastIndex) });
  }
  if (!parts.length) parts.push({ type: 'html', content: source });

  for (const part of parts) {
    if (part.type === 'table') {
      const rows = parseTableRows(part.content);
      if (rows.length) blocks.push({ type: 'table', rows });
      continue;
    }

    const normalized = part.content
      .replace(/\r\n/g, '\n')
      .replace(/<br\s*\/?>/gi, '<br/>')
      .replace(/<\/(p|div|h[1-6]|li)>/gi, '</$1>\n')
      .replace(/<li>/gi, '<li>• ');

    const blockRe = /<(p|div|h[1-6]|li)([^>]*)>(.*?)<\/\1>|<br\s*\/?>/gis;
    let match;
    let partLast = 0;
    while ((match = blockRe.exec(normalized)) !== null) {
      if (match[0].startsWith('<br')) {
        blocks.push({ align: 'left', segments: [{ text: '', bold: false, italic: false }], spacer: 10 });
        partLast = blockRe.lastIndex;
        continue;
      }
      blocks.push({
        align: extractAlign(match[2] || ''),
        segments: parseInlineSegments(match[3] || ''),
        heading: /^h[1-3]$/i.test(match[1]),
      });
      partLast = blockRe.lastIndex;
    }

    const tail = normalized.slice(partLast).replace(/<[^>]+>/g, '').trim();
    if (tail) {
      blocks.push({ align: 'left', segments: [{ text: decodeHtmlEntities(tail), bold: false, italic: false }] });
    }
  }

  if (!blocks.length) {
    const plain = decodeHtmlEntities(String(source).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
    if (plain) blocks.push({ align: 'left', segments: [{ text: plain, bold: false, italic: false }] });
  }

  return blocks;
}

function measureSegmentsHeight(doc, segments, width, align, fontSize = 11) {
  const text = segments.map((s) => s.text).join('');
  if (!text.trim()) return fontSize + 4;
  const pdfAlign = align === 'center' ? 'center' : align === 'right' ? 'right' : 'left';
  const font = segments.some((s) => s.bold)
    ? 'Helvetica-Bold'
    : segments.some((s) => s.italic)
      ? 'Helvetica-Oblique'
      : 'Helvetica';
  doc.font(font).fontSize(fontSize);
  return doc.heightOfString(text, { width, align: pdfAlign, lineGap: 4 }) + 4;
}

function renderTable(doc, rows, x, y, pageWidth) {
  if (!rows.length) return y;
  const cols = Math.max(...rows.map((r) => r.length));
  const colWidth = pageWidth / cols;
  let currentY = y;
  const fontSize = 11;

  for (const row of rows) {
    let rowHeight = 0;
    for (let c = 0; c < cols; c += 1) {
      const cell = row[c] || { align: 'left', segments: [{ text: '', bold: false, italic: false }] };
      rowHeight = Math.max(
        rowHeight,
        measureSegmentsHeight(doc, cell.segments, colWidth - 8, cell.align, fontSize),
      );
    }
    for (let c = 0; c < cols; c += 1) {
      const cell = row[c] || { align: 'left', segments: [{ text: '', bold: false, italic: false }] };
      const cx = x + c * colWidth;
      renderSegments(doc, cell.segments, cx + 4, currentY, colWidth - 8, cell.align, fontSize);
    }
    currentY += rowHeight + 6;
  }

  return currentY;
}

function renderSegments(doc, segments, x, y, width, align, fontSize = 11) {
  if (!segments.length) return y + 8;

  const text = segments.map((s) => s.text).join('');
  if (!text.trim()) return y + 8;

  const pdfAlign = align === 'center' ? 'center' : align === 'right' ? 'right' : 'left';
  const singleStyle = segments.length === 1;

  if (pdfAlign !== 'left' || singleStyle) {
    const seg = segments[0];
    const font = singleStyle && seg.bold
      ? 'Helvetica-Bold'
      : singleStyle && seg.italic
        ? 'Helvetica-Oblique'
        : 'Helvetica';
    doc.font(font).fontSize(fontSize).fillColor('#000');
    doc.text(text, x, y, { width, align: pdfAlign, lineGap: 4 });
    return doc.y + 4;
  }

  let cursorX = x;
  let cursorY = y;
  const lineGap = 4;

  for (const seg of segments) {
    if (!seg.text) continue;
    const font = seg.bold ? 'Helvetica-Bold' : seg.italic ? 'Helvetica-Oblique' : 'Helvetica';
    doc.font(font).fontSize(fontSize).fillColor('#000');

    const words = seg.text.split(/(\s+)/);
    for (const word of words) {
      if (!word) continue;
      const wordWidth = doc.widthOfString(word);
      const maxX = x + width;
      if (cursorX + wordWidth > maxX && cursorX > x) {
        cursorX = x;
        cursorY = doc.y + lineGap;
      }
      doc.text(word, cursorX, cursorY, { lineBreak: false });
      cursorX += wordWidth;
    }
  }

  doc.y = Math.max(doc.y, cursorY + fontSize + 2);
  return doc.y;
}

export function renderVipPlantillaHtmlToPdf(doc, html, { x = 72, y = 72, width } = {}) {
  const pageWidth = width || doc.page.width - 144;
  let currentY = y;
  const blocks = splitHtmlBlocks(html);

  for (const block of blocks) {
    if (block.type === 'table') {
      currentY = renderTable(doc, block.rows, x, currentY, pageWidth);
      continue;
    }
    if (block.spacer) {
      currentY += block.spacer;
      continue;
    }
    if (!block.segments?.length) continue;
    doc.y = currentY;
    const fontSize = block.heading ? 12 : 11;
    currentY = renderSegments(doc, block.segments, x, currentY, pageWidth, block.align || 'left', fontSize);
    currentY += block.heading ? 10 : 6;
  }

  return currentY;
}

export function resolveVipCuentaPlantilla(row) {
  const plantilla = String(row.cc_plantilla || '').trim();
  return plantilla || DEFAULT_CC_PLANTILLA;
}

export function buildVipCuentaHtml(row) {
  const emisor = getEmisorConfig();
  const vars = buildVipCuentaVariables(row, emisor);
  const template = resolveVipCuentaPlantilla(row);
  return applyVipCuentaPlantilla(template, vars);
}
