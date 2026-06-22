import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { query } from '../db/pool.js';

/**
 * Réplica del reporte Clarion Rpt:RegistroAsistencia (agen2045.clw).
 * Coordenadas en milésimas de pulgada; ancho del reporte = 8000 (8").
 */
const REPORT_W = 8000;
const REPORT_H = 10800;
const HEADER_H = 5292;
const DETAIL_H = 281;
const FOOTER_Y = 10500;
const MIN_DETAIL_ROWS = 16;
const MARGIN_LEFT = 250;
const MARGIN_RIGHT = 250;

// Clarion FILL(0066CCFFh) en BGR → naranja/dorado IX; bordes negros como el original impreso.
const LABEL_FILL = '#FFCC66';
const BOX_BORDER = '#000000';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOGO_CANDIDATES = [
  process.env.CAPACITACION_LOGO_PATH,
  path.join(__dirname, '../../assets/reports/logo-ixcalidad.jpg'),
  path.join(__dirname, '../../assets/reports/logo-ixcalidad.png'),
  path.join(__dirname, '../../assets/reports/Logoixcalidad.jpg'),
  path.join('c:', 'DEV11.1', 'Agenda', 'imagenes', 'Logoixcalidad.jpg'),
  path.join('c:', 'DEV11.1', 'Agenda', 'Imagenes', 'Logoixcalidad.jpg'),
].filter(Boolean);

function resolveLogoPath() {
  for (const p of LOGO_CANDIDATES) {
    if (p && fs.existsSync(p)) return p;
  }
  return null;
}

function fmtDate(d) {
  if (!d) return '';
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return String(d);
  return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}`;
}

function fmtTime(d = new Date()) {
  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? 'p.' : 'a.';
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}

function safeName(s) {
  return String(s || '')
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
}

function toPt(units) {
  return (units / 1000) * 72;
}

function createLayout(doc) {
  const left = toPt(MARGIN_LEFT);
  const right = toPt(MARGIN_RIGHT);
  const top = toPt(80);
  const bottom = toPt(120);
  const areaW = doc.page.width - left - right;
  const areaH = doc.page.height - top - bottom;
  const scale = Math.min(areaW / toPt(REPORT_W), areaH / toPt(REPORT_H));

  const px = (x) => left + toPt(x) * scale;
  const py = (y) => top + toPt(y) * scale;
  const pw = (w) => toPt(w) * scale;
  const ph = (h) => toPt(h) * scale;

  return { px, py, pw, ph, scale };
}

function stroke(doc) {
  doc.strokeColor(BOX_BORDER);
}

function drawBox(doc, x, y, w, h, { fill = null } = {}) {
  doc.save();
  doc.lineWidth(1);
  stroke(doc);
  if (fill) {
    doc.fillColor(fill).rect(x, y, w, h).fillAndStroke(fill, BOX_BORDER);
    doc.fillColor('#000000');
  } else {
    doc.rect(x, y, w, h).stroke();
  }
  doc.restore();
}

function hLine(doc, x1, x2, y) {
  doc.save();
  stroke(doc);
  doc.moveTo(x1, y).lineTo(x2, y).stroke();
  doc.restore();
}

function vLine(doc, x, y1, y2) {
  doc.save();
  stroke(doc);
  doc.moveTo(x, y1).lineTo(x, y2).stroke();
  doc.restore();
}

function textIn(doc, str, x, y, w, { size = 9, bold = false, align = 'left' } = {}) {
  doc
    .font(bold ? 'Helvetica-Bold' : 'Helvetica')
    .fontSize(size)
    .fillColor('#000000')
    .text(str || '', x, y, { width: w, align, lineBreak: false, height: size + 2 });
}

/** Caja de etiqueta naranja; x/y/w/h en unidades Clarion (milésimas). */
function labelBox(doc, L, xU, yU, wU, hU, label, fontSize = 10) {
  const x = L.px(xU);
  const y = L.py(yU);
  const w = L.pw(wU);
  const h = L.ph(hU);
  drawBox(doc, x, y, w, h, { fill: LABEL_FILL });
  textIn(doc, label, x, y + h * 0.58 - fontSize / 2, w, {
    size: fontSize,
    bold: true,
    align: 'center',
  });
}

function drawHeader(doc, L, cap) {
  const logoPath = resolveLogoPath();

  drawBox(doc, L.px(21), L.py(-10), L.pw(7958), L.ph(979));

  if (logoPath) {
    try {
      doc.image(logoPath, L.px(52), L.py(73), { fit: [L.pw(1969), L.ph(833)] });
    } catch {
      textIn(doc, 'IxColombia', L.px(52), L.py(350), L.pw(1969), { size: 12, bold: true, align: 'center' });
    }
  }

  textIn(doc, 'REGISTRO DE ASISTENCIA', L.px(2083), L.py(380), L.pw(2958), {
    size: 16,
    bold: true,
    align: 'center',
  });

  const cx = L.px(5344);
  const cy = L.py(73);
  const cw = L.pw(2552);
  const ch = L.ph(833);
  drawBox(doc, cx, cy, cw, ch);
  hLine(doc, cx, cx + cw, cy + ch / 3);
  hLine(doc, cx, cx + cw, cy + (ch * 2) / 3);
  vLine(doc, cx + cw / 2, cy, cy + ch);

  const codRows = [
    ['CÓDIFICACION', 'IXTHM-REG-001'],
    ['VIGENCIA', '6/ dic/ 2012'],
    ['VERSION', '01'],
  ];
  codRows.forEach(([a, b], i) => {
    const ry = cy + (ch / 3) * i;
    textIn(doc, a, cx + 4, ry + ch / 6 - 3, cw / 2 - 8, { size: 8, align: 'center' });
    textIn(doc, b, cx + cw / 2 + 4, ry + ch / 6 - 3, cw / 2 - 8, { size: 8, align: 'center' });
  });

  // GROUP1 — moderador / fecha: 4 celdas en una sola fila (como el reporte impreso)
  const modY = 1010;
  const modH = 760;
  const c1x = 31;
  const c1w = 1656;
  const c2x = c1x + c1w;
  const c3w = 900;
  const c4w = 1150;
  const c2w = 7979 - c1x - c1w - c3w - c4w;
  const c3x = c2x + c2w;
  const c4x = c3x + c3w;

  const modRowY = L.py(modY);
  const modRowH = L.ph(modH);

  drawBox(doc, L.px(c1x), modRowY, L.pw(c1w), modRowH, { fill: LABEL_FILL });
  drawBox(doc, L.px(c2x), modRowY, L.pw(c2w), modRowH);
  drawBox(doc, L.px(c3x), modRowY, L.pw(c3w), modRowH, { fill: LABEL_FILL });
  drawBox(doc, L.px(c4x), modRowY, L.pw(c4w), modRowH);

  textIn(doc, 'NOMBRE DEL (OS)', L.px(c1x), modRowY + modRowH * 0.32, L.pw(c1w), {
    size: 10,
    bold: true,
    align: 'center',
  });
  textIn(doc, 'MODERADOR (ES)', L.px(c1x), modRowY + modRowH * 0.58, L.pw(c1w), {
    size: 10,
    bold: true,
    align: 'center',
  });

  const capY = modRowY + modRowH / 2 - 5;
  textIn(doc, cap.capacitador, L.px(c2x), capY, L.pw(c2w), {
    size: 10,
    bold: true,
    align: 'center',
  });

  textIn(doc, 'FECHA', L.px(c3x), modRowY + modRowH / 2 - 5, L.pw(c3w), {
    size: 10,
    bold: true,
    align: 'center',
  });

  textIn(doc, fmtDate(cap.fecha), L.px(c4x), modRowY + modRowH / 2 - 6, L.pw(c4w), {
    size: 11,
    bold: true,
    align: 'center',
  });

  drawBox(doc, L.px(21), L.py(1833), L.pw(7958), L.ph(1052));
  labelBox(doc, L, 31, 1865, 1635, 250, 'TEMAS(S)', 10);
  textIn(doc, cap.tema, L.px(1708), L.py(1925), L.pw(6177), { size: 9 });
  textIn(doc, cap.tema1, L.px(94), L.py(2195), L.pw(7385), { size: 9 });
  textIn(doc, cap.tema2, L.px(94), L.py(2425), L.pw(7385), { size: 9 });
  textIn(doc, cap.tema3, L.px(94), L.py(2655), L.pw(7385), { size: 9 });
  hLine(doc, L.px(21), L.px(7875), L.py(2114));
  hLine(doc, L.px(21), L.px(7875), L.py(2354));
  hLine(doc, L.px(21), L.px(7875), L.py(2593));

  drawBox(doc, L.px(21), L.py(2948), L.pw(7958), L.ph(823));
  labelBox(doc, L, 21, 3000, 1635, 240, 'DURACIÓN', 10);
  labelBox(doc, L, 4542, 3000, 1635, 240, 'PROYECTO', 10);
  vLine(doc, L.px(4542), L.py(2979), L.py(3760));
  textIn(doc, String(cap.duracion ?? ''), L.px(1854), L.py(3050), L.pw(600), { size: 10, align: 'right' });
  textIn(doc, 'Minutos', L.px(2510), L.py(3050), L.pw(500), { size: 10 });
  textIn(doc, cap.nombrecliente, L.px(4625), L.py(3300), L.pw(3208), { size: 9 });
  hLine(doc, L.px(31), L.px(7885), L.py(3240));
  hLine(doc, L.px(31), L.px(7885), L.py(3479));

  drawBox(doc, L.px(21), L.py(3823), L.pw(7958), L.ph(823));
  labelBox(doc, L, 21, 3854, 1635, 250, 'COMPROMISOS', 10);
  textIn(doc, cap.compromiso, L.px(1760), L.py(3905), L.pw(6094), { size: 10 });
  textIn(doc, cap.compromiso1, L.px(73), L.py(4165), L.pw(7781), { size: 10 });
  textIn(doc, cap.compromiso2, L.px(73), L.py(4425), L.pw(7740), { size: 10 });
  hLine(doc, L.px(31), L.px(7885), L.py(4115));
  hLine(doc, L.px(21), L.px(7886), L.py(4375));

  labelBox(doc, L, 10, 4677, 6219, 281, 'ASISTENTES', 10);
  labelBox(doc, L, 6250, 4677, 1719, 583, 'FIRMA RECIBIDO', 10);
  labelBox(doc, L, 10, 4979, 1698, 281, 'NUMERO DE CEDULA', 10);
  labelBox(doc, L, 1781, 4979, 2687, 281, 'NOMBRES Y APELLIDOS', 10);
  labelBox(doc, L, 4531, 4979, 1698, 281, 'CARGO', 10);
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

function drawDetailRow(doc, L, yUnits, row) {
  const y = L.py(yUnits);
  const h = L.ph(250);

  drawBox(doc, L.px(10), y, L.pw(1698), h);
  drawBox(doc, L.px(1781), y, L.pw(2687), h);
  drawBox(doc, L.px(4531), y, L.pw(1698), h);
  drawBox(doc, L.px(6250), y, L.pw(1719), h);

  if (row) {
    textIn(doc, row.documento, L.px(125), y + L.ph(52), L.pw(1500), { size: 8 });
    textIn(doc, row.nombres, L.px(1854), y + L.ph(52), L.pw(2573), { size: 8 });
    textIn(doc, row.cargo, L.px(4573), y + L.ph(52), L.pw(1625), { size: 8 });

    const firmaBuf = firmaToBuffer(row.firma);
    if (firmaBuf) {
      try {
        const cellX = L.px(6250);
        const cellW = L.pw(1719);
        const pad = L.pw(2);
        const innerX = cellX + pad;
        const innerY = y + L.ph(2);
        const innerW = cellW - pad * 2;
        const innerH = h - L.ph(4);

        const sigW = innerW * 0.7;
        const textW = innerW * 0.3;
        const sigX = innerX;
        const textX = innerX + sigW;

        doc.save();
        doc.rect(innerX, innerY, innerW, innerH).fill('#FFFFFF');

        doc.save();
        doc.rect(sigX, innerY, sigW, innerH).clip();
        doc.image(firmaBuf, sigX, innerY, { width: sigW, height: innerH, align: 'left', valign: 'top' });
        doc.restore();

        const fontSize = 5;
        const dateSize = 4;
        const lineGap = 1;
        const fechaStr = row.firma_fecha ? fmtDate(row.firma_fecha) : '';
        const horaStr = row.firma_fecha ? fmtTime(new Date(row.firma_fecha)) : '';
        const textLines = fechaStr
          ? [
              { text: 'F.Digital', size: fontSize },
              { text: fechaStr, size: dateSize },
              { text: horaStr, size: dateSize },
            ]
          : [{ text: 'F.Digital', size: fontSize }];
        const textBlockH = textLines.reduce((sum, l) => sum + l.size, 0) + lineGap * (textLines.length - 1);
        let textY = innerY + (innerH - textBlockH) / 2;
        for (const line of textLines) {
          textIn(doc, line.text, textX, textY, textW, { size: line.size, align: 'center' });
          textY += line.size + lineGap;
        }
        doc.restore();
      } catch (err) {
        console.error('[capacitacionPdf] firma:', err.message);
      }
    }
  }
}

function drawFooter(doc, L, pageNum) {
  const now = new Date();
  const yBrand = L.py(FOOTER_Y + 31);
  const yLine = L.py(FOOTER_Y + 52);

  doc.font('Helvetica-BoldOblique').fontSize(8).fillColor('#000000');
  doc.text('IxColombia ', L.px(4583), yBrand, { lineBreak: false, width: L.pw(1200) });

  const footerText =
    `Fecha Impresión: ${fmtDate(now)}  Hora: ${fmtTime(now)}  Pagina ${pageNum}`;
  doc.font('Helvetica').fontSize(8);
  doc.text(footerText, L.px(115), yLine, { lineBreak: false, width: L.pw(7600) });
}

export async function fetchCapacitacionReport(cnscapacita) {
  const cap = await query(
    `SELECT r.*, c.nombrecliente
     FROM rasist r
     LEFT JOIN clie c ON c.codigo = r.cliente
     WHERE r.cnscapacita = $1`,
    [cnscapacita],
  );
  if (!cap.rows.length) return null;

  const asis = await query(
    `SELECT documento, nombres, cargo, firma, firma_fecha FROM rasistd
     WHERE cnscapacita = $1 ORDER BY item`,
    [cnscapacita],
  );

  return { capacitacion: cap.rows[0], asistentes: asis.rows };
}

export function buildCapacitacionPdf({ capacitacion, asistentes }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'LETTER',
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
      info: { Title: 'REGISTRO DE ASISTENCIA', Author: 'DevSoporte', Subject: 'Capacitación' },
    });

    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const L = createLayout(doc);
    drawHeader(doc, L, capacitacion);

    const rows = [...asistentes];
    const emptyLeft = Math.max(0, MIN_DETAIL_ROWS - rows.length);
    rows.forEach((row, i) => drawDetailRow(doc, L, HEADER_H + i * DETAIL_H, row));
    for (let i = 0; i < emptyLeft; i += 1) {
      drawDetailRow(doc, L, HEADER_H + (rows.length + i) * DETAIL_H, null);
    }

    drawFooter(doc, L, 1);
    doc.end();
  });
}

export function pdfFileName(capacitacion) {
  const fecha = capacitacion.fecha ? new Date(capacitacion.fecha) : new Date();
  const cliente = safeName(capacitacion.nombrecliente || capacitacion.cliente);
  const tema = safeName(capacitacion.tema);
  return `CAPACITACION ${cliente}_${fecha.getDate()}-${fecha.getMonth() + 1}-${fecha.getFullYear()}_${tema}.pdf`;
}

export function getLogoPath() {
  return resolveLogoPath();
}
