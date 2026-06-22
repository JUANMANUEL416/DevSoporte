import PDFDocument from 'pdfkit';
import { query } from '../db/pool.js';
import { getLogoPath } from './capacitacionPdf.js';

/**
 * Réplica ISO del reporte Clarion Rpt:Bitacora (agen2016.clw).
 * Coordenadas en milésimas de pulgada, carta horizontal.
 */
const REPORT_W = 10500;
const REPORT_H = 8500;
const MARGIN_LEFT = 80;
const MARGIN_RIGHT = 80;
const MARGIN_TOP = 40;
const MARGIN_BOTTOM = 50;

const PROYECTO_Y = 1219;
const PROYECTO_H = 260;
const COL_HEADER_Y = PROYECTO_Y + PROYECTO_H;
const COL_HEADER_H = 437;
const COL_HEADER_BOTTOM = COL_HEADER_Y + COL_HEADER_H;
const DETAIL_BASE_H = 302;
const DETAIL_FIRST_GAP = 70;
const FOOTER_Y = 8229;

const HEADER_TOP = 323;
const HEADER_H = 854;
const LOGO_X = 156;
const LOGO_W = 1281;
const LOGO_DIVIDER_X = LOGO_X + LOGO_W + 57;

const TABLE_LEFT = 115;
const TABLE_RIGHT = 10365;
const COL_X = [TABLE_LEFT, 885, 1917, 3208, 5448, 8083, 9156, TABLE_RIGHT];

const PROYECTO_SPLIT = [TABLE_LEFT, 1448, 5635, 7323, TABLE_RIGHT];

const LABEL_FILL = '#FFCC66';
const BOX_BORDER = '#000000';

const MESES = [
  'ENERO', 'FEBRIO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
  'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE',
];

function fmtDate(d) {
  if (!d) return '';
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return String(d);
  return `${dt.getDate()}/${dt.getMonth() + 1}/${dt.getFullYear()}`;
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

function toPt(units) {
  return (units / 1000) * 72;
}

function createLayout(doc) {
  const left = toPt(MARGIN_LEFT);
  const top = toPt(MARGIN_TOP);
  const areaW = doc.page.width - left - toPt(MARGIN_RIGHT);
  const areaH = doc.page.height - top - toPt(MARGIN_BOTTOM);
  const scale = Math.min(areaW / toPt(REPORT_W), areaH / toPt(REPORT_H));

  const px = (x) => left + toPt(x) * scale;
  const py = (y) => top + toPt(y) * scale;
  const pw = (w) => toPt(w) * scale;
  const ph = (h) => toPt(h) * scale;

  return { px, py, pw, ph, scale, contentBottom: py(FOOTER_Y - 40) };
}

function stroke(doc) {
  doc.strokeColor(BOX_BORDER);
}

function drawBox(doc, x, y, w, h, { fill = null, lineWidth = 1 } = {}) {
  doc.save();
  doc.lineWidth(lineWidth);
  stroke(doc);
  if (fill) {
    doc.fillColor(fill).rect(x, y, w, h).fillAndStroke(fill, BOX_BORDER);
    doc.fillColor('#000000');
  } else {
    doc.rect(x, y, w, h).stroke();
  }
  doc.restore();
}

/** Relleno sin borde — evita líneas dobles en celdas adyacentes. */
function fillRect(doc, x, y, w, h, color) {
  doc.save();
  doc.fillColor(color).rect(x, y, w, h).fill();
  doc.fillColor('#000000');
  doc.restore();
}

function hLine(doc, x1, x2, y) {
  doc.save();
  stroke(doc);
  doc.lineWidth(1);
  doc.moveTo(x1, y).lineTo(x2, y).stroke();
  doc.restore();
}

function vLine(doc, x, y1, y2) {
  doc.save();
  stroke(doc);
  doc.lineWidth(1);
  doc.moveTo(x, y1).lineTo(x, y2).stroke();
  doc.restore();
}

function textIn(doc, str, x, y, w, { size = 9, bold = false, align = 'left', font = 'Helvetica' } = {}) {
  doc
    .font(bold ? `${font}-Bold` : font)
    .fontSize(size)
    .fillColor('#000000')
    .text(str || '', x, y, { width: w, align, lineBreak: true });
}

function labelText(doc, L, xU, yU, wU, hU, lines, fontSize = 9) {
  const x = L.px(xU);
  const y = L.py(yU);
  const w = L.pw(wU);
  const h = L.ph(hU);
  const labels = Array.isArray(lines) ? lines : [lines];
  const blockH = labels.length * (fontSize + 2);
  let ty = y + (h - blockH) / 2;
  for (const line of labels) {
    textIn(doc, line, x, ty, w, { size: fontSize, bold: true, align: 'center' });
    ty += fontSize + 2;
  }
}

function drawVerticalGrid(doc, L, yBottomPt) {
  const yColTop = L.py(COL_HEADER_Y);
  const ySideTop = L.py(PROYECTO_Y);

  vLine(doc, L.px(TABLE_LEFT), ySideTop, yBottomPt);
  vLine(doc, L.px(TABLE_RIGHT), ySideTop, yBottomPt);

  for (let i = 1; i < COL_X.length - 1; i += 1) {
    vLine(doc, L.px(COL_X[i]), yColTop, yBottomPt);
  }
}

/** Cierra el cuadro de la tabla con línea inferior y verticales hasta ese punto. */
function closeTableBox(doc, L, yBottomPt) {
  hLine(doc, L.px(TABLE_LEFT), L.px(TABLE_RIGHT), yBottomPt);
  drawVerticalGrid(doc, L, yBottomPt);
}

function drawProyectoGrid(doc, L) {
  const yTop = L.py(PROYECTO_Y);
  const yBot = L.py(PROYECTO_Y + PROYECTO_H);
  const xLeft = L.px(TABLE_LEFT);
  const xRight = L.px(TABLE_RIGHT);

  hLine(doc, xLeft, xRight, yTop);
  hLine(doc, xLeft, xRight, yBot);

  for (let i = 1; i < PROYECTO_SPLIT.length - 1; i += 1) {
    vLine(doc, L.px(PROYECTO_SPLIT[i]), yTop, yBot);
  }

  fillRect(doc, L.px(PROYECTO_SPLIT[0]), yTop, L.pw(PROYECTO_SPLIT[1] - PROYECTO_SPLIT[0]), L.ph(PROYECTO_H), LABEL_FILL);
  fillRect(doc, L.px(PROYECTO_SPLIT[2]), yTop, L.pw(PROYECTO_SPLIT[3] - PROYECTO_SPLIT[2]), L.ph(PROYECTO_H), LABEL_FILL);
}

function drawColumnHeaderGrid(doc, L) {
  const yTop = L.py(COL_HEADER_Y);
  const yBot = L.py(COL_HEADER_BOTTOM);

  hLine(doc, L.px(TABLE_LEFT), L.px(TABLE_RIGHT), yTop);
  hLine(doc, L.px(TABLE_LEFT), L.px(TABLE_RIGHT), yBot);

  for (let i = 0; i < COL_X.length - 1; i += 1) {
    fillRect(
      doc,
      L.px(COL_X[i]),
      yTop,
      L.pw(COL_X[i + 1] - COL_X[i]),
      L.ph(COL_HEADER_H),
      LABEL_FILL,
    );
  }
}

function drawHeader(doc, L, encabezado) {
  const logoPath = getLogoPath();

  drawBox(doc, L.px(94), L.py(323), L.pw(10250), L.ph(854));

  if (logoPath) {
    try {
      doc.image(logoPath, L.px(LOGO_X), L.py(365), { fit: [L.pw(LOGO_W), L.ph(771)] });
    } catch {
      textIn(doc, 'IxColombia', L.px(LOGO_X), L.py(520), L.pw(LOGO_W), { size: 12, bold: true, align: 'center' });
    }
  }

  vLine(doc, L.px(LOGO_DIVIDER_X), L.py(HEADER_TOP), L.py(HEADER_TOP + HEADER_H));

  textIn(doc, 'BITÁCORA SOPORTE EN SITIO', L.px(1594), L.py(700), L.pw(6458), {
    size: 14,
    bold: true,
    align: 'center',
  });

  const metaX = L.px(8042);
  const metaY = L.py(333);
  const metaW = L.pw(2281);
  const metaH = L.ph(823);
  drawBox(doc, metaX, metaY, metaW, metaH);
  hLine(doc, metaX, metaX + metaW, metaY + metaH / 3);
  hLine(doc, metaX, metaX + metaW, metaY + (metaH * 2) / 3);
  vLine(doc, L.px(9187), metaY, metaY + metaH);

  const metaRows = [
    ['CODIFICACIÓN', 'IXIMS-REG-008'],
    ['VIGENCIA', '29-Nov-2012'],
    ['VERSIÓN', '01'],
  ];
  metaRows.forEach(([a, b], i) => {
    const ry = metaY + (metaH / 3) * i;
    textIn(doc, a, metaX + 4, ry + L.ph(40), metaW / 2 - 8, { size: 8, align: 'center' });
    textIn(doc, b, metaX + metaW / 2 + 4, ry + L.ph(40), metaW / 2 - 8, { size: 8, align: 'center' });
  });

  drawProyectoGrid(doc, L);
  labelText(doc, L, PROYECTO_SPLIT[0], PROYECTO_Y, PROYECTO_SPLIT[1] - PROYECTO_SPLIT[0], PROYECTO_H, 'PROYECTO:');
  textIn(
    doc,
    encabezado.nombrecliente || encabezado.cliente,
    L.px(PROYECTO_SPLIT[1]) + L.pw(52),
    L.py(PROYECTO_Y + 50),
    L.pw(PROYECTO_SPLIT[2] - PROYECTO_SPLIT[1] - 104),
    { size: 10 },
  );
  labelText(
    doc,
    L,
    PROYECTO_SPLIT[2],
    PROYECTO_Y,
    PROYECTO_SPLIT[3] - PROYECTO_SPLIT[2],
    PROYECTO_H,
    'REALIZADO POR:',
  );
  textIn(
    doc,
    encabezado.realizado_por || 'DEPARTAMENTO SISTEMAS',
    L.px(PROYECTO_SPLIT[3]) + L.pw(52),
    L.py(PROYECTO_Y + 50),
    L.pw(PROYECTO_SPLIT[4] - PROYECTO_SPLIT[3] - 104),
    { size: 10 },
  );

  drawColumnHeaderGrid(doc, L);
  labelText(doc, L, COL_X[0], COL_HEADER_Y, COL_X[1] - COL_X[0], COL_HEADER_H, ['FECHA DE', 'INICIO']);
  labelText(doc, L, COL_X[1], COL_HEADER_Y, COL_X[2] - COL_X[1], COL_HEADER_H, ['PERSONA', 'SOLICITANTE']);
  labelText(doc, L, COL_X[2], COL_HEADER_Y, COL_X[3] - COL_X[2], COL_HEADER_H, ['ÁREA O', 'DEPARTAMENTO']);
  labelText(doc, L, COL_X[3], COL_HEADER_Y, COL_X[4] - COL_X[3], COL_HEADER_H, 'DESCRIPCIÓN DEL PROBLEMA');
  labelText(doc, L, COL_X[4], COL_HEADER_Y, COL_X[5] - COL_X[4], COL_HEADER_H, 'SOLUCIÓN DEL PROBLEMA');
  labelText(doc, L, COL_X[5], COL_HEADER_Y, COL_X[6] - COL_X[5], COL_HEADER_H, ['FECHA', 'TERMINACIÓN']);
  labelText(doc, L, COL_X[6], COL_HEADER_Y, COL_X[7] - COL_X[6], COL_HEADER_H, 'FIRMA RECIBIDA');
}

function colWidth(index, L) {
  return L.pw(COL_X[index + 1] - COL_X[index]);
}

function colX(index, L) {
  return L.px(COL_X[index]);
}

function measureRowHeight(doc, L, row) {
  const pad = L.ph(16);
  const minH = L.ph(DETAIL_BASE_H);
  if (!row) return minH;

  doc.font('Helvetica').fontSize(8);
  const hSolicitud = doc.heightOfString(row.solicitud || ' ', { width: colWidth(3, L) - L.pw(20) });
  const hRespuesta = doc.heightOfString(row.respuesta || ' ', { width: colWidth(4, L) - L.pw(20) });
  const hArea = doc.heightOfString(row.area_nombre || row.clase || row.soporte || ' ', {
    width: colWidth(2, L) - L.pw(16),
  });
  const hFunc = doc.heightOfString(row.funcionario || ' ', { width: colWidth(1, L) - L.pw(16) });

  return Math.max(minH, hSolicitud + pad, hRespuesta + pad, hArea + pad, hFunc + pad);
}

function drawDetailRow(doc, L, yPt, row) {
  const rowH = measureRowHeight(doc, L, row);
  const x0 = L.px(TABLE_LEFT);
  const xEnd = L.px(TABLE_RIGHT);

  hLine(doc, x0, xEnd, yPt + rowH);

  if (!row) return rowH;

  const padX = L.pw(8);
  const padY = L.ph(14);

  textIn(doc, fmtDate(row.fecha), colX(0, L) + padX, yPt + padY, colWidth(0, L) - padX * 2, {
    size: 8,
    align: 'center',
    font: 'Helvetica',
  });

  textIn(doc, row.funcionario || '', colX(1, L) + padX, yPt + padY, colWidth(1, L) - padX * 2, {
    size: 8,
  });

  textIn(
    doc,
    row.area_nombre || row.clase || row.soporte || '',
    colX(2, L) + padX,
    yPt + padY,
    colWidth(2, L) - padX * 2,
    { size: 9 },
  );

  textIn(doc, row.solicitud || '', colX(3, L) + padX, yPt + padY, colWidth(3, L) - padX * 2, {
    size: 8,
    font: 'Helvetica',
  });

  textIn(doc, row.respuesta || '', colX(4, L) + padX, yPt + padY, colWidth(4, L) - padX * 2, {
    size: 8,
    font: 'Helvetica',
  });

  textIn(doc, fmtDate(row.fechar), colX(5, L) + padX, yPt + padY, colWidth(5, L) - padX * 2, {
    size: 8,
    align: 'center',
    font: 'Helvetica',
  });

  const firmaBuf = firmaToBuffer(row.firma);
  if (firmaBuf) {
    try {
      const cellX = colX(6, L);
      const cellW = colWidth(6, L);
      const pad = L.pw(4);
      const innerX = cellX + pad;
      const innerY = yPt + L.ph(4);
      const innerW = cellW - pad * 2;
      const innerH = rowH - L.ph(8);

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
      console.error('[bitacoraPdf] firma:', err.message);
    }
  }

  return rowH;
}

function drawFooter(doc, L, pageNum) {
  const now = new Date();
  const y = L.py(FOOTER_Y + 52);

  textIn(doc, 'Fecha:', L.px(115), y, L.pw(344), { size: 8 });
  textIn(doc, fmtDate(now), L.px(490), y, L.pw(927), { size: 8 });
  textIn(doc, 'Hora:', L.px(1625), y, L.pw(271), { size: 8 });
  textIn(doc, fmtTime(now), L.px(1927), y, L.pw(927), { size: 8 });
  textIn(doc, `Página ${pageNum}`, L.px(6948), y, L.pw(698), { size: 8 });
}

export async function fetchBitacoraSemanaCliente(cnsbite, cliente) {
  const head = await query(
    `SELECT b.cnsbite, b.idsemana, b.soporte AS realizado_por,
            t.fechaini, t.fechafin, t.observacion,
            c.codigo AS cliente, c.nombrecliente, c.prefijo
     FROM bite b
     INNER JOIN tsema t ON t.idsemana = b.idsemana
     LEFT JOIN clie c ON c.codigo = $2
     WHERE b.cnsbite = $1`,
    [cnsbite, cliente],
  );
  if (!head.rows.length) return null;

  const soportes = await query(
    `SELECT b.*, sa.nombre AS area_nombre
     FROM bita b
     LEFT JOIN soparea sa ON sa.codigo = b.soporte
     WHERE b.cnsbite = $1 AND b.cliente = $2
     ORDER BY b.fecha ASC NULLS LAST, b.cnssoporte ASC`,
    [cnsbite, cliente],
  );

  return {
    encabezado: head.rows[0],
    soportes: soportes.rows,
  };
}

export function bitacoraPdfFileName(encabezado) {
  const ini = encabezado.fechaini ? new Date(encabezado.fechaini) : new Date();
  const fin = encabezado.fechafin ? new Date(encabezado.fechafin) : ini;
  const mes = MESES[ini.getMonth()] || '';
  const acronym = safeName(encabezado.prefijo || encabezado.cliente || encabezado.nombrecliente)
    .replace(/\s/g, '')
    .slice(0, 6)
    .toUpperCase();
  return `SOPORTE SEMANA DEL ${ini.getDate()} AL ${fin.getDate()} DE ${mes} ${acronym}.pdf`;
}

export function buildBitacoraPdf({ encabezado, soportes }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'LETTER',
      layout: 'landscape',
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
      info: {
        Title: 'BITÁCORA SOPORTE EN SITIO',
        Author: 'DevSoporte',
        Subject: encabezado.nombrecliente || encabezado.cliente,
      },
    });

    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    let pageNum = 1;
    const rows = soportes.length ? soportes : [null];

    const startPage = () => {
      const L = createLayout(doc);
      drawHeader(doc, L, encabezado);
      return {
        L,
        y: L.py(COL_HEADER_BOTTOM) + L.ph(DETAIL_FIRST_GAP),
      };
    };

    let { L, y } = startPage();

    for (const row of rows) {
      const rowH = measureRowHeight(doc, L, row);
      if (y + rowH > L.contentBottom) {
        closeTableBox(doc, L, y);
        drawFooter(doc, L, pageNum);
        doc.addPage({ size: 'LETTER', layout: 'landscape' });
        pageNum += 1;
        ({ L, y } = startPage());
      }
      drawDetailRow(doc, L, y, row);
      y += rowH;
    }

    closeTableBox(doc, L, y);
    drawFooter(doc, L, pageNum);
    doc.end();
  });
}
