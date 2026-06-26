import PDFDocument from 'pdfkit';
import { query } from '../db/pool.js';
import { getLogoPath } from './capacitacionPdf.js';

const REPORT_W = 8000;
const MARGIN_LEFT = 250;
const MARGIN_RIGHT = 250;
const LABEL_FILL = '#FFCC66';
const BOX_BORDER = '#000000';
const OUTER_BORDER = 1.5;
const INNER_BORDER = 1;
const HEADER_INNER_PAD = 24;
const HEADER_ROW_GAP = 40;
const SECTION_OUTER_PAD = 24;
const HEADER_TEMA_GAP = 120;
const TEMA_SECTION_GAP = 80;
const TEMA_DIRIGIDO_GAP = 48;
const VALUE_TEXT_PAD_LEFT = 48;
const VALUE_TEXT_PAD_TOP = 40;
const BASE_ROW_H = 320;
const BASE_DESC_H = 280;
const BASE_TEMA_H = 300;
const HDR_LEFT = 21;
const HDR_W = 7920;
const HDR_RIGHT = HDR_LEFT + HDR_W;
const CONTENT_RIGHT = HDR_RIGHT;
const LETTER_PORTRAIT_W = 612;
const SCALE_BUFFER_PT = 10;
const CELL_TEXT_PAD = 32;
const LOGO_DIV = 1720;
const ISO_W = 1380;
const ISO_X = HDR_RIGHT - ISO_W;
const TITLE_X = LOGO_DIV;
const TITLE_W = ISO_X - LOGO_DIV;

function fmtDate(value) {
  if (!value) return '—';
  const dt = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(dt.getTime())) return String(value);
  return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}`;
}

function safeName(s) {
  return String(s || '')
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
}

function capitalizeFirst(str) {
  const s = String(str || '').trim();
  if (!s || s === '—') return s || '—';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function toPt(units) {
  return (units / 1000) * 72;
}

function createLayout(doc) {
  const left = toPt(MARGIN_LEFT);
  const right = toPt(MARGIN_RIGHT);
  const top = toPt(80);
  const bottom = toPt(120);
  const areaH = doc.page.height - top - bottom;
  const refAreaW = LETTER_PORTRAIT_W - left - right - SCALE_BUFFER_PT;
  const scale = Math.min(refAreaW / toPt(CONTENT_RIGHT), areaH / toPt(10800));

  const px = (x) => left + toPt(x) * scale;
  const py = (y) => top + toPt(y) * scale;
  const pw = (w) => toPt(w) * scale;
  const ph = (h) => toPt(h) * scale;

  return { px, py, pw, ph, scale, pageBottom: 10200 };
}

function drawBox(doc, x, y, w, h, { fill = null, lineWidth = INNER_BORDER } = {}) {
  doc.save();
  doc.lineWidth(lineWidth).strokeColor(BOX_BORDER);
  if (fill) {
    doc.fillColor(fill).rect(x, y, w, h).fillAndStroke(fill, BOX_BORDER);
    doc.fillColor('#000000');
  } else {
    doc.rect(x, y, w, h).stroke();
  }
  doc.restore();
}

function drawOuterBox(doc, L, xU, yU, wU, hU) {
  drawBox(doc, L.px(xU), L.py(yU), L.pw(wU), L.ph(hU), { lineWidth: OUTER_BORDER });
}

function drawInnerBox(doc, L, xU, yU, wU, hU, opts = {}) {
  drawBox(doc, L.px(xU), L.py(yU), L.pw(wU), L.ph(hU), { lineWidth: INNER_BORDER, ...opts });
}

function vLine(doc, x, y1, y2, lineWidth = INNER_BORDER) {
  doc.save().lineWidth(lineWidth).strokeColor(BOX_BORDER).moveTo(x, y1).lineTo(x, y2).stroke().restore();
}

function textIn(doc, str, x, y, w, { size = 9, bold = false, align = 'left', lineBreak = false } = {}) {
  doc
    .font(bold ? 'Helvetica-Bold' : 'Helvetica')
    .fontSize(size)
    .fillColor('#000000')
    .text(str || '', x, y, {
      width: w,
      align,
      lineBreak,
      lineGap: lineBreak ? 1 : 0,
      height: lineBreak ? undefined : size + 2,
    });
}

function labelBox(doc, L, xU, yU, wU, hU, label, fontSize = 9, { align = 'center', textPadU = 0 } = {}) {
  const x = L.px(xU);
  const y = L.py(yU);
  const w = L.pw(wU);
  const h = L.ph(hU);
  drawInnerBox(doc, L, xU, yU, wU, hU, { fill: LABEL_FILL });
  const textX = align === 'left' ? x + L.pw(textPadU) : x;
  const textW = align === 'left' ? w - L.pw(textPadU) - L.pw(12) : w;
  textIn(doc, label, textX, y + h * 0.58 - fontSize / 2, textW, {
    size: fontSize,
    bold: true,
    align,
  });
}

function isTextColumn(label) {
  return label === 'Descripcion' || label === 'Observacion';
}

function textHeightUnits(doc, L, text, valueWU, fontSize = 9, minHU = BASE_ROW_H) {
  doc.font('Helvetica').fontSize(fontSize);
  const hPt = doc.heightOfString(String(text || '—'), { width: L.pw(valueWU - 12) });
  return Math.max(minHU, Math.ceil(hPt / L.ph(1)) + 90);
}

function cellContentWidthUnits(colWU) {
  return colWU - CELL_TEXT_PAD - 12;
}

function rowHeightForCellTexts(doc, L, cells, minHU = 220) {
  let maxHU = minHU;
  for (const cell of cells) {
    const fontSize = cell.fontSize || 8;
    doc.font('Helvetica').fontSize(fontSize);
    const widthPt = L.pw(cellContentWidthUnits(cell.colWU));
    const hPt = doc.heightOfString(String(cell.text || '—'), { width: widthPt });
    const hU = Math.max(minHU, Math.ceil(hPt / L.ph(1)) + 96);
    maxHU = Math.max(maxHU, hU);
  }
  return maxHU;
}

function estimateItemRowHeight(doc, L, item, tipo, cols) {
  const cells = [{ text: capitalizeFirst(item.descripcion || '—'), colWU: cols[1].w }];
  if (tipo === 'seguimiento') {
    cells.push({ text: item.observacion || '—', colWU: cols[5].w });
  }
  return rowHeightForCellTexts(doc, L, cells);
}

function drawTopBanner(doc, L) {
  const logoPath = getLogoPath();
  const boxTop = L.py(-10);
  const boxH = L.ph(979);

  drawBox(doc, L.px(HDR_LEFT), boxTop, L.pw(HDR_W), boxH);

  if (logoPath) {
    try {
      doc.image(logoPath, L.px(52), L.py(90), { fit: [L.pw(1580), L.ph(780)] });
    } catch {
      textIn(doc, 'IxColombia', L.px(52), L.py(350), L.pw(1580), { size: 12, bold: true, align: 'center' });
    }
  }

  vLine(doc, L.px(LOGO_DIV), boxTop, boxTop + boxH);

  const titleSize = 13;
  doc.font('Helvetica-Bold').fontSize(titleSize).fillColor('#000000');
  doc.text('CRONOGRAMA DE CAPACITACIONES', L.px(TITLE_X), boxTop + boxH / 2 - titleSize / 2 - 2, {
    width: L.pw(TITLE_W),
    align: 'center',
    lineBreak: false,
  });

  vLine(doc, L.px(ISO_X), boxTop, boxTop + boxH);
}

function drawHeader(doc, L, enc) {
  drawTopBanner(doc, L);

  const innerLeft = HDR_LEFT + HEADER_INNER_PAD;
  const innerRight = HDR_RIGHT - HEADER_INNER_PAD;
  const innerW = innerRight - innerLeft;
  const innerLabelX = innerLeft + 10;
  const cellInset = 16;

  const fechasH = BASE_ROW_H;
  const iniLabelW = 900;
  const iniValW = 1500;
  const finLabelW = 900;
  const finValW = 1500;
  const estadoLabelW = 800;
  const estadoValW = innerRight - (innerLabelX + iniLabelW + iniValW + finLabelW + finValW + estadoLabelW);
  const iniLabelX = innerLabelX;
  const iniValX = iniLabelX + iniLabelW;
  const finLabelX = iniValX + iniValW;
  const finValX = finLabelX + finLabelW;
  const estadoLabelX = finValX + finValW;
  const estadoValX = estadoLabelX + estadoLabelW;

  const halfW = Math.floor(innerW / 2);
  const midX = innerLeft + halfW;
  const sideLabelW = 1000;
  const clienteValW = midX - (innerLabelX + sideLabelW);
  const descLabelX = midX + 10;
  const descValX = descLabelX + sideLabelW;
  const descValW = innerRight - descValX;

  const cliente = enc.nombrecliente || enc.cliente || '—';
  const descText = enc.descripcion || '—';
  const clienteH = textHeightUnits(doc, L, cliente, clienteValW, 9, BASE_ROW_H);
  const descH = textHeightUnits(doc, L, descText, descValW, 9, BASE_ROW_H);
  const rowH = Math.max(clienteH, descH);

  const outerY = 1010;
  const outerH = HEADER_INNER_PAD * 2 + fechasH + HEADER_ROW_GAP + rowH;
  const row1Y = outerY + HEADER_INNER_PAD;
  const row2Y = row1Y + fechasH + HEADER_ROW_GAP;
  const innerBoxH = (hU) => hU - cellInset * 2;

  labelBox(doc, L, iniLabelX, row1Y + cellInset, iniLabelW, innerBoxH(fechasH), 'F. INICIAL', 8);
  drawInnerBox(doc, L, iniValX, row1Y + cellInset, iniValW, innerBoxH(fechasH));
  textIn(
    doc,
    fmtDate(enc.fecha_inicial || enc.fecha),
    L.px(iniValX + 8),
    L.py(row1Y) + L.ph(fechasH) * 0.35,
    L.pw(iniValW - 16),
    { size: 9, align: 'center' },
  );
  labelBox(doc, L, finLabelX, row1Y + cellInset, finLabelW, innerBoxH(fechasH), 'F. FINAL', 8);
  drawInnerBox(doc, L, finValX, row1Y + cellInset, finValW, innerBoxH(fechasH));
  textIn(
    doc,
    fmtDate(enc.fecha_final || enc.fecha_inicial || enc.fecha),
    L.px(finValX + 8),
    L.py(row1Y) + L.ph(fechasH) * 0.35,
    L.pw(finValW - 16),
    { size: 9, align: 'center' },
  );
  labelBox(doc, L, estadoLabelX, row1Y + cellInset, estadoLabelW, innerBoxH(fechasH), 'ESTADO', 8);
  drawInnerBox(doc, L, estadoValX, row1Y + cellInset, estadoValW, innerBoxH(fechasH));
  textIn(
    doc,
    enc.estado || '—',
    L.px(estadoValX + 8),
    L.py(row1Y) + L.ph(fechasH) * 0.35,
    L.pw(estadoValW - 16),
    { size: 9, align: 'center', lineBreak: true },
  );

  labelBox(doc, L, innerLabelX, row2Y + cellInset, sideLabelW, innerBoxH(rowH), 'CLIENTE', 8);
  drawInnerBox(doc, L, innerLabelX + sideLabelW, row2Y + cellInset, clienteValW, innerBoxH(rowH));
  textIn(
    doc,
    cliente,
    L.px(innerLabelX + sideLabelW + VALUE_TEXT_PAD_LEFT),
    L.py(row2Y + cellInset + VALUE_TEXT_PAD_TOP),
    L.pw(clienteValW - VALUE_TEXT_PAD_LEFT - 24),
    { size: 9, lineBreak: true },
  );

  labelBox(doc, L, descLabelX, row2Y + cellInset, sideLabelW, innerBoxH(rowH), 'DESCRIPCION', 8);
  drawInnerBox(doc, L, descValX, row2Y + cellInset, descValW, innerBoxH(rowH));
  textIn(
    doc,
    descText,
    L.px(descValX + VALUE_TEXT_PAD_LEFT),
    L.py(row2Y + cellInset + VALUE_TEXT_PAD_TOP),
    L.pw(descValW - VALUE_TEXT_PAD_LEFT - 24),
    { size: 9, lineBreak: true },
  );

  return outerY + outerH + HEADER_TEMA_GAP;
}

function parseProbableDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.getTime();
}

function temaFechaProbableSortKey(items) {
  const stamps = items.map((i) => parseProbableDate(i.fecha_probable)).filter((d) => d != null);
  if (!stamps.length) return Number.MAX_SAFE_INTEGER;
  return Math.min(...stamps);
}

function sortGruposByFechaProbable(grupos) {
  return grupos.sort((a, b) => {
    const diff = temaFechaProbableSortKey(a.items) - temaFechaProbableSortKey(b.items);
    if (diff !== 0) return diff;
    return (a.tema_codigo || a.tema_nombre || '').localeCompare(
      b.tema_codigo || b.tema_nombre || '',
      'es',
    );
  });
}

function groupByTema(items) {
  const map = new Map();
  for (const item of items) {
    const key = item.tema_codigo || item.tema_nombre || '_';
    if (!map.has(key)) {
      map.set(key, {
        tema_codigo: item.tema_codigo,
        tema_nombre: item.tema_nombre || 'Sin tema',
        items: [],
      });
    }
    map.get(key).items.push(item);
  }
  const grupos = Array.from(map.values()).map((g) => ({
    ...g,
    items: g.items.sort((a, b) => (Number(a.item) || 0) - (Number(b.item) || 0)),
    fecha_hora_sugerida: temaFechaHoraSugerida(g.items),
    dirigidoa: g.items[0]?.dirigidoa || '',
  }));
  return sortGruposByFechaProbable(grupos);
}

function temaFechaHoraSugerida(items) {
  const dates = items.map((i) => i.fecha_probable).filter(Boolean);
  const hora = items.find((i) => i.hora_sugerida)?.hora_sugerida || '';
  if (!dates.length && !hora) return '—';
  const sorted = [...dates].sort((a, b) => parseProbableDate(a) - parseProbableDate(b));
  const fechaStr = dates.length ? fmtDate(sorted[0]) : '';
  if (fechaStr && hora) return `${fechaStr} ${hora}`;
  return fechaStr || hora || '—';
}

const SEGUIMIENTO_FIXED_COLS_W = 450 + 550 + 850 + 758;
const SEGUIMIENTO_DESC_BASE_W = 4960;

function itemColumns(tipo, tableW = HDR_W) {
  if (tipo === 'seguimiento') {
    const fixed = 450 + 550 + 850 + 758;
    const textBudget = tableW - fixed;
    const descW = Math.round(SEGUIMIENTO_DESC_BASE_W * 0.7 * (tableW / HDR_W));
    const obsW = textBudget - descW;
    return [
      { label: 'Id', w: 450 },
      { label: 'Descripcion', w: descW },
      { label: 'Min', w: 550 },
      { label: 'Estado', w: 850 },
      { label: 'F. real', w: 758 },
      { label: 'Observacion', w: obsW },
    ];
  }
  return [
    { label: 'Id', w: 450 },
    { label: 'Descripcion', w: tableW - 450 - 1458 },
    { label: 'Min', w: 1458 },
  ];
}

function drawItemHeader(doc, L, yU, tipo, tableLeft = HDR_LEFT, tableW = HDR_W) {
  const cols = itemColumns(tipo, tableW);
  const hU = 250;
  let xU = tableLeft;
  for (const col of cols) {
    const labelOpts = isTextColumn(col.label)
      ? { align: 'left', textPadU: CELL_TEXT_PAD }
      : {};
    labelBox(doc, L, xU, yU, col.w, hU, col.label, 8, labelOpts);
    xU += col.w;
  }
  return yU + hU;
}

function drawItemRow(doc, L, yU, item, tipo, cols, idNum, tableLeft = HDR_LEFT) {
  const descText = capitalizeFirst(item.descripcion || '—');
  const descWidthPt = L.pw(cellContentWidthUnits(cols[1].w));
  const rowHU = estimateItemRowHeight(doc, L, item, tipo, cols);
  const hPt = L.ph(rowHU);
  let xU = tableLeft;

  for (const col of cols) {
    drawInnerBox(doc, L, xU, yU, col.w, rowHU);
    xU += col.w;
  }

  xU = tableLeft;
  const yText = L.py(yU) + 8;
  const yMid = L.py(yU) + hPt / 2 - 4;
  textIn(doc, String(idNum), L.px(xU), yMid, L.pw(cols[0].w), { size: 8, align: 'center' });
  xU += cols[0].w;
  textIn(doc, descText, L.px(xU + CELL_TEXT_PAD), yText, descWidthPt, {
    size: 8,
    lineBreak: true,
  });
  xU += cols[1].w;
  textIn(doc, item.duracion ?? '—', L.px(xU), yMid, L.pw(cols[2].w), {
    size: 8,
    align: 'center',
  });

  if (tipo === 'seguimiento') {
    xU += cols[2].w;
    textIn(doc, item.estado || '—', L.px(xU), yMid, L.pw(cols[3].w), {
      size: 8,
      align: 'center',
    });
    xU += cols[3].w;
    textIn(doc, fmtDate(item.fecha_real), L.px(xU), yMid, L.pw(cols[4].w), {
      size: 8,
      align: 'center',
    });
    xU += cols[4].w;
    const obsWidthPt = L.pw(cellContentWidthUnits(cols[5].w));
    textIn(doc, item.observacion || '—', L.px(xU + CELL_TEXT_PAD), yText, obsWidthPt, {
      size: 8,
      lineBreak: true,
    });
  }

  return yU + rowHU;
}

function drawTemaResumenBox(doc, L, yU, grupo, tableLeft = HDR_LEFT, tableW = HDR_W) {
  const totalMin = grupo.items.reduce((s, i) => s + (Number(i.duracion) || 0), 0);
  const hU = 220;
  drawInnerBox(doc, L, tableLeft, yU, tableW, hU);

  const resumenText = `Total items: ${grupo.items.length} | Duracion total estimada: ${totalMin} min`;

  textIn(doc, resumenText, L.px(tableLeft + 31), L.py(yU) + L.ph(hU) * 0.35, L.pw(tableW - 62), {
    size: 9,
    bold: true,
  });

  return yU + hU;
}

function measureDirigidoa(doc, L, dirigidoaText, tableLeft, tableW) {
  const labelW = 1000;
  const valX = tableLeft + 10 + labelW;
  const valWU = tableLeft + tableW - valX;
  const text = String(dirigidoaText || '—').trim() || '—';
  return textHeightUnits(doc, L, text, valWU - VALUE_TEXT_PAD_LEFT - 24, 9, 220);
}

function drawDirigidoaRow(doc, L, yU, dirigidoaText, tableLeft, tableW) {
  const labelW = 1000;
  const labelX = tableLeft + 10;
  const valX = labelX + labelW;
  const valWU = tableLeft + tableW - valX;
  const text = String(dirigidoaText || '—').trim() || '—';
  const hU = measureDirigidoa(doc, L, text, tableLeft, tableW);
  const cellInset = 16;

  labelBox(doc, L, labelX, yU + cellInset, labelW, hU - cellInset * 2, 'DIRIGIDO A', 8);
  drawInnerBox(doc, L, valX, yU + cellInset, valWU, hU - cellInset * 2);
  textIn(
    doc,
    text,
    L.px(valX + VALUE_TEXT_PAD_LEFT),
    L.py(yU + cellInset + VALUE_TEXT_PAD_TOP),
    L.pw(valWU - VALUE_TEXT_PAD_LEFT - 24),
    { size: 9, lineBreak: true },
  );

  return yU + hU;
}

function measureTemaHeader(doc, L, temaName, tableLeft, tableW) {
  const fhLabelW = 1500;
  const fhValW = 1648;
  const temaValW = tableW - 10 - 1000 - fhLabelW - fhValW;
  return textHeightUnits(doc, L, temaName, temaValW - VALUE_TEXT_PAD_LEFT - 12, 10, BASE_TEMA_H);
}

function drawTemaHeaderRow(doc, L, yU, grupo, tableLeft, tableW) {
  const temaName = grupo.tema_nombre || '—';
  const labelW = 1000;
  const labelX = tableLeft + 10;
  const temaValX = labelX + labelW;
  const fhLabelW = 1500;
  const fhValW = 1648;
  const temaValW = tableW - 10 - labelW - fhLabelW - fhValW;
  const temaH = measureTemaHeader(doc, L, temaName, tableLeft, tableW);
  const cellInset = 16;

  labelBox(doc, L, labelX, yU + cellInset, labelW, temaH - cellInset * 2, 'TEMA', 9);
  drawInnerBox(doc, L, temaValX, yU + cellInset, temaValW, temaH - cellInset * 2);
  textIn(
    doc,
    temaName,
    L.px(temaValX + VALUE_TEXT_PAD_LEFT),
    L.py(yU + cellInset + VALUE_TEXT_PAD_TOP),
    L.pw(temaValW - VALUE_TEXT_PAD_LEFT - 12),
    { size: 10, bold: true, lineBreak: true },
  );

  const fhLabelX = temaValX + temaValW;
  labelBox(
    doc,
    L,
    fhLabelX,
    yU + cellInset,
    fhLabelW,
    temaH - cellInset * 2,
    'Fecha y hora sugerida',
    8,
  );
  drawInnerBox(doc, L, fhLabelX + fhLabelW, yU + cellInset, fhValW, temaH - cellInset * 2);
  textIn(
    doc,
    grupo.fecha_hora_sugerida || '—',
    L.px(fhLabelX + fhLabelW + 4),
    L.py(yU) + L.ph(temaH) * 0.38,
    L.pw(fhValW - 8),
    { size: 10, bold: true, align: 'center' },
  );

  return yU + temaH;
}

function drawTemaSection(doc, L, grupo, yU, tipo) {
  const tableLeft = HDR_LEFT + SECTION_OUTER_PAD;
  const tableW = HDR_W - SECTION_OUTER_PAD * 2;
  const cols = itemColumns(tipo, tableW);
  const cellGap = 12;

  let outerStart = yU;
  let y = yU + SECTION_OUTER_PAD;

  const closeOuterSegment = (endY) => {
    const h = endY - outerStart;
    if (h > 0) {
      drawOuterBox(doc, L, HDR_LEFT, outerStart, HDR_W, h);
    }
  };

  y = drawTemaHeaderRow(doc, L, y, grupo, tableLeft, tableW);
  y += TEMA_DIRIGIDO_GAP;
  y = drawDirigidoaRow(doc, L, y, grupo.dirigidoa, tableLeft, tableW);
  y += cellGap;
  y = drawItemHeader(doc, L, y, tipo, tableLeft, tableW);

  for (let i = 0; i < grupo.items.length; i += 1) {
    const rowH = estimateItemRowHeight(doc, L, grupo.items[i], tipo, cols);
    if (y + rowH > L.pageBottom - SECTION_OUTER_PAD) {
      closeOuterSegment(y);
      doc.addPage({ size: 'LETTER', layout: 'portrait' });
      outerStart = 120;
      y = 120 + SECTION_OUTER_PAD;
      y = drawItemHeader(doc, L, y, tipo, tableLeft, tableW);
    }
    y = drawItemRow(doc, L, y, grupo.items[i], tipo, cols, i + 1, tableLeft);
  }

  y = drawTemaResumenBox(doc, L, y, grupo, tableLeft, tableW);
  closeOuterSegment(y + SECTION_OUTER_PAD);

  return y + SECTION_OUTER_PAD + TEMA_SECTION_GAP;
}

function drawResumenGlobal(doc, L, yU, grupos, items) {
  const totalMin = items.reduce((s, i) => s + (Number(i.duracion) || 0), 0);
  const hU = 220;
  drawInnerBox(doc, L, HDR_LEFT, yU, HDR_W, hU);
  const resumenText =
    `Total temas: ${grupos.length} | Total items: ${items.length} | Tiempo estimado: ${totalMin} min`;
  textIn(doc, resumenText, L.px(31), L.py(yU) + L.ph(hU) * 0.35, L.pw(HDR_W - 62), {
    size: 9,
    bold: true,
  });
}

export async function fetchCronograma(cnscrono) {
  const head = await query(
    `SELECT c.*, cl.nombrecliente
     FROM cronocap c
     LEFT JOIN clie cl ON cl.codigo = c.cliente
     WHERE c.cnscrono = $1`,
    [cnscrono],
  );
  if (!head.rows.length) return null;

  const items = await query(
    `SELECT * FROM cronocapd
     WHERE cnscrono = $1
     ORDER BY fecha_probable NULLS LAST, tema_codigo, item`,
    [cnscrono],
  );

  return { encabezado: head.rows[0], items: items.rows };
}

export function cronogramaPdfFileName(enc, tipo = 'programacion') {
  const cliente = safeName(enc.nombrecliente || enc.cliente || '');
  const suffix = tipo === 'seguimiento' ? 'SEGUIMIENTO' : 'PROGRAMACION';
  return `CRONOGRAMA ${suffix} ${cliente} ${enc.cnscrono}.pdf`;
}

export function buildCronogramaPdf({ encabezado, items, tipo = 'programacion' }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'LETTER',
      layout: 'portrait',
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
      info: {
        Title: 'Cronograma de capacitaciones',
        Author: 'DevSoporte',
        Subject: encabezado.nombrecliente || encabezado.cliente || '',
      },
    });

    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const L = createLayout(doc);
    let y = drawHeader(doc, L, encabezado);
    const grupos = groupByTema(items);

    for (const grupo of grupos) {
      const blockEstimate =
        BASE_TEMA_H + TEMA_DIRIGIDO_GAP + 320 + 250 + grupo.items.length * 240 + 320
        + SECTION_OUTER_PAD * 2 + TEMA_SECTION_GAP;
      if (y + blockEstimate > L.pageBottom) {
        doc.addPage({ size: 'LETTER', layout: 'portrait' });
        y = 120;
      }
      y = drawTemaSection(doc, L, grupo, y, tipo);
    }

    if (grupos.length > 1) {
      if (y + 260 > L.pageBottom) {
        doc.addPage({ size: 'LETTER', layout: 'portrait' });
        y = 120;
      }
      drawResumenGlobal(doc, L, y, grupos, items);
    }

    doc.end();
  });
}
