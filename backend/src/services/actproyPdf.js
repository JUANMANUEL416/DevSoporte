import PDFDocument from 'pdfkit';
import { query } from '../db/pool.js';
import { getLogoPath } from './capacitacionPdf.js';

const LABEL_FILL = '#FFCC66';
const BORDER = '#000000';

const MESES = [
  'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
  'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE',
];

function fmtDateTime(d) {
  if (!d) return '';
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return String(d);
  const fecha = `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}`;
  let h = dt.getHours();
  const m = String(dt.getMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? 'p.m.' : 'a.m.';
  h = h % 12 || 12;
  return `${fecha} ${h}:${m} ${ampm}`;
}

function safeName(s) {
  return String(s || '')
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
}

function firmaToBuffer(firma) {
  if (!firma || typeof firma !== 'string') return null;
  const m = firma.match(/^data:image\/\w+;base64,(.+)$/);
  const b64 = m ? m[1] : firma;
  try {
    return Buffer.from(b64, 'base64');
  } catch {
    return null;
  }
}

function box(doc, x, y, w, h, { fill = null } = {}) {
  doc.save().lineWidth(1).strokeColor(BORDER);
  if (fill) {
    doc.fillColor(fill).rect(x, y, w, h).fillAndStroke(fill, BORDER);
  } else {
    doc.rect(x, y, w, h).stroke();
  }
  doc.restore();
}

function label(doc, text, x, y, w, h, { size = 8, align = 'center' } = {}) {
  box(doc, x, y, w, h, { fill: LABEL_FILL });
  doc.font('Helvetica-Bold').fontSize(size).fillColor('#000');
  doc.text(text, x + 2, y + h / 2 - size / 2 - 1, { width: w - 4, align });
}

function value(doc, text, x, y, w, { size = 9, bold = false, align = 'left' } = {}) {
  doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(size).fillColor('#000');
  doc.text(text == null ? '' : String(text), x + 4, y, { width: w - 8, align });
}

function textFittingHeight(doc, text, width, maxHeight) {
  if (!text || maxHeight <= 0) return '';
  if (doc.heightOfString(text, { width }) <= maxHeight) return text;

  let lo = 0;
  let hi = text.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (doc.heightOfString(text.slice(0, mid), { width }) <= maxHeight) lo = mid;
    else hi = mid - 1;
  }

  let cut = Math.max(1, lo);
  if (cut < text.length) {
    const slice = text.slice(0, cut);
    const lastNl = slice.lastIndexOf('\n');
    const lastSp = slice.lastIndexOf(' ');
    const brk = Math.max(lastNl, lastSp);
    if (brk > cut * 0.55) cut = brk + (lastNl >= lastSp && lastNl >= 0 ? 1 : 0);
  }
  return text.slice(0, cut);
}

function drawBorderedFlowText(doc, L, W, y, text, { pad = 8, minH = 80 } = {}) {
  const textW = W - pad * 2;
  const pageBottom = doc.page.height - doc.page.margins.bottom;
  const pageTop = doc.page.margins.top;

  doc.font('Helvetica').fontSize(10).fillColor('#000');
  const fullTextH = doc.heightOfString(text, { width: textW });
  const devH = Math.max(minH, fullTextH + pad * 2);

  if (devH <= pageBottom - y) {
    box(doc, L, y, W, devH);
    doc.text(text, L + pad, y + pad, { width: textW });
    return y + devH + 8;
  }

  let remaining = text;
  let isFirst = true;
  let boxY = y;

  while (remaining.length > 0) {
    if (isFirst && pageBottom - boxY - pad * 2 < 40) {
      doc.addPage();
      boxY = pageTop;
      isFirst = false;
    }

    const maxTextH = (boxY === pageTop && !isFirst ? pageBottom - pageTop : pageBottom - boxY) - pad * 2;
    const chunk = textFittingHeight(doc, remaining, textW, maxTextH);
    const chunkText = chunk || remaining.slice(0, 1);
    const chunkH = Math.max(isFirst ? minH : 48, doc.heightOfString(chunkText, { width: textW }) + pad * 2);

    box(doc, L, boxY, W, chunkH);
    doc.text(chunkText, L + pad, boxY + pad, { width: textW });
    remaining = remaining.slice(chunkText.length).replace(/^\s+/, '');
    isFirst = false;

    if (remaining.length > 0) {
      doc.addPage();
      boxY = pageTop;
    } else {
      return boxY + chunkH + 8;
    }
  }

  return boxY + 8;
}

function ensurePageSpace(doc, y, needed, pageTop) {
  const pageBottom = doc.page.height - doc.page.margins.bottom;
  if (y + needed <= pageBottom) return y;
  doc.addPage();
  return pageTop;
}

/** Convierte HTML del editor en texto plano para el PDF. */
function htmlToPlain(html) {
  if (!html) return '';
  return String(html)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export async function fetchActproyReport(consecutivo) {
  const res = await query(
    `SELECT a.*, c.nombrecliente, c.prefijo,
            s.firma AS ingeniero_firma, s.firma_fecha AS ingeniero_firma_fecha
     FROM actproy a
     LEFT JOIN clie c ON c.codigo = a.cliente
     LEFT JOIN soport s ON TRIM(s.nombre) = TRIM(a.ingeniero) OR s.codigo = a.ingeniero
     WHERE a.consecutivo = $1`,
    [consecutivo],
  );
  return res.rows[0] || null;
}

export function actproyPdfFileName(row) {
  const fecha = row.fecha ? new Date(row.fecha) : new Date();
  const cliente = safeName(row.nombrecliente || row.cliente || '');
  return `INFORME ACTIVIDADES ${cliente} ${fecha.getDate()}-${fecha.getMonth() + 1}-${fecha.getFullYear()}.pdf`;
}

export function buildActproyPdf(row) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'LETTER',
      margins: { top: 36, bottom: 36, left: 36, right: 36 },
      info: {
        Title: 'ACTIVIDADES REALIZADAS EN PROYECTOS',
        Author: 'DevSoporte',
        Subject: row.nombrecliente || row.cliente || '',
      },
    });

    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const L = 36;
    const R = 576;
    const W = R - L;

    // ---------- Encabezado ----------
    const headTop = 36;
    const headH = 70;
    const codW = 168;
    const logoW = 120;
    box(doc, L, headTop, W, headH);
    // Logo
    const logoPath = getLogoPath();
    if (logoPath) {
      try {
        doc.image(logoPath, L + 6, headTop + 6, { fit: [logoW - 12, headH - 12] });
      } catch {
        doc.font('Helvetica-Bold').fontSize(11).fillColor('#000')
          .text('IxColombia', L + 6, headTop + headH / 2 - 6, { width: logoW - 12, align: 'center' });
      }
    }
    doc.moveTo(L + logoW, headTop).lineTo(L + logoW, headTop + headH).stroke();
    // Título
    doc.font('Helvetica-Bold').fontSize(13).fillColor('#000');
    doc.text('ACTIVIDADES REALIZADAS EN PROYECTOS\n(INFORME)', L + logoW + 6, headTop + 18, {
      width: W - logoW - codW - 12,
      align: 'center',
    });
    // Caja de codificación (derecha, 4 filas)
    const codX = R - codW;
    box(doc, codX, headTop, codW, headH);
    const rows = [
      ['Codificación', 'IXIMS-REG-029'],
      ['Vigencia', '29-Nov-2012'],
      ['Versión', '01'],
      ['Página', '1'],
    ];
    const rh = headH / rows.length;
    const codSplit = codX + codW * 0.45;
    rows.forEach(([a, b], i) => {
      const ry = headTop + rh * i;
      if (i > 0) doc.moveTo(codX, ry).lineTo(codX + codW, ry).stroke();
      doc.moveTo(codSplit, ry).lineTo(codSplit, ry + rh).stroke();
      doc.font('Helvetica').fontSize(7).fillColor('#000');
      doc.text(a, codX + 3, ry + rh / 2 - 4, { width: codSplit - codX - 6 });
      doc.font('Helvetica-Bold').fontSize(7);
      doc.text(b, codSplit + 3, ry + rh / 2 - 4, { width: codX + codW - codSplit - 6, align: 'center' });
    });

    // ---------- Datos del soporte ----------
    let y = headTop + headH + 8;
    const fecha = row.fecha ? new Date(row.fecha) : null;
    const dia = fecha ? String(fecha.getDate()).padStart(2, '0') : '';
    const mes = fecha ? MESES[fecha.getMonth()] : '';
    const anio = fecha ? String(fecha.getFullYear()) : '';

    // Fila 1: Fecha Soporte (Día / Mes / Año)
    const rowH = 22;
    label(doc, 'Fecha Soporte', L, y, 90, rowH);
    label(doc, 'Día', L + 90, y, 40, rowH);
    box(doc, L + 130, y, 55, rowH); value(doc, dia, L + 130, y + 7, 55, { align: 'center' });
    label(doc, 'Mes', L + 185, y, 40, rowH);
    box(doc, L + 225, y, 110, rowH); value(doc, mes, L + 225, y + 7, 110, { align: 'center' });
    label(doc, 'Año', L + 335, y, 40, rowH);
    box(doc, L + 375, y, R - (L + 375), rowH); value(doc, anio, L + 375, y + 7, R - (L + 375), { align: 'center' });
    y += rowH;

    // Fila 2: Proyecto / Ciudad
    label(doc, 'Proyecto', L, y, 90, rowH);
    box(doc, L + 90, y, 245, rowH); value(doc, row.nombrecliente || row.cliente || '', L + 90, y + 7, 245);
    label(doc, 'Ciudad', L + 335, y, 50, rowH);
    box(doc, L + 385, y, R - (L + 385), rowH); value(doc, row.ciudad || '', L + 385, y + 7, R - (L + 385));
    y += rowH;

    // Fila 3: Ingeniero asignado / Duración
    label(doc, 'Ingeniero asignado de soporte', L, y, 160, rowH, { size: 7 });
    box(doc, L + 160, y, 245, rowH); value(doc, row.ingeniero || '', L + 160, y + 7, 245);
    label(doc, 'Duración', L + 405, y, 55, rowH);
    box(doc, L + 460, y, R - (L + 460), rowH); value(doc, row.duracion || '', L + 460, y + 7, R - (L + 460), { align: 'center' });
    y += rowH + 8;

    const pageTop = doc.page.margins.top;

    // ---------- Actividades realizadas ----------
    y = ensurePageSpace(doc, y, 120, pageTop);
    label(doc, 'ACTIVIDADES REALIZADAS', L, y, W, 20, { size: 10 });
    y += 20;
    y = drawBorderedFlowText(doc, L, W, y, htmlToPlain(row.actividades), { minH: 120 });

    // ---------- Actividades pendientes ----------
    y = ensurePageSpace(doc, y, 80, pageTop);
    label(doc, 'ACTIVIDADES PENDIENTES', L, y, W, 20, { size: 10 });
    y += 20;
    y = drawBorderedFlowText(doc, L, W, y, htmlToPlain(row.pendientes), { minH: 60 });

    // ---------- Firmas ----------
    const sigW = (W - 16) / 2;
    const sigH = 96;
    const sigY = ensurePageSpace(doc, y + 14, sigH, pageTop);

    // Empresa (IX COLOMBIA SAS) = ingeniero
    box(doc, L, sigY, sigW, sigH);
    const firmaIngBuf = firmaToBuffer(row.ingeniero_firma);
    if (firmaIngBuf) {
      try {
        doc.image(firmaIngBuf, L + 12, sigY + 6, { fit: [sigW - 24, sigH - 46], align: 'center', valign: 'top' });
      } catch { /* ignora imagen inválida */ }
    }
    doc.font('Helvetica').fontSize(9).fillColor('#000');
    doc.text(row.ingeniero || '', L + 6, sigY + sigH - 36, { width: sigW - 12, align: 'center' });
    doc.moveTo(L + 14, sigY + sigH - 22).lineTo(L + sigW - 14, sigY + sigH - 22).stroke();
    doc.font('Helvetica-Bold').fontSize(8);
    doc.text('Nombre y firma\n(IX COLOMBIA SAS)', L + 6, sigY + sigH - 18, { width: sigW - 12, align: 'center' });
    if (row.ingeniero_firma_fecha) {
      doc.font('Helvetica').fontSize(6).fillColor('#555');
      doc.text(`Firmado: ${fmtDateTime(row.ingeniero_firma_fecha)}`, L + 6, sigY + 2, { width: sigW - 12, align: 'right' });
    }

    // Cliente (PERSONAL) = firma digital
    const cliX = L + sigW + 16;
    box(doc, cliX, sigY, sigW, sigH);
    const firmaBuf = firmaToBuffer(row.firma_cli);
    if (firmaBuf) {
      try {
        doc.image(firmaBuf, cliX + 12, sigY + 6, { fit: [sigW - 24, sigH - 46], align: 'center', valign: 'top' });
      } catch { /* ignora imagen inválida */ }
    }
    doc.font('Helvetica').fontSize(8).fillColor('#000');
    const firmante = row.firma_cli_nombre || '';
    const firmaFechaTxt = row.firma_cli_fecha ? `Firmado digitalmente: ${fmtDateTime(row.firma_cli_fecha)}` : '';
    doc.text(firmante, cliX + 6, sigY + sigH - 36, { width: sigW - 12, align: 'center' });
    doc.moveTo(cliX + 14, sigY + sigH - 22).lineTo(cliX + sigW - 14, sigY + sigH - 22).stroke();
    doc.font('Helvetica-Bold').fontSize(8);
    doc.text('Nombre y firma\n(PERSONAL)', cliX + 6, sigY + sigH - 18, { width: sigW - 12, align: 'center' });
    if (firmaFechaTxt) {
      doc.font('Helvetica').fontSize(6).fillColor('#555');
      doc.text(firmaFechaTxt, cliX + 6, sigY + 2, { width: sigW - 12, align: 'right' });
    }

    doc.end();
  });
}
