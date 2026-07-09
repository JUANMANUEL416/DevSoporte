import PDFDocument from 'pdfkit';
import { query } from '../db/pool.js';
import { getLogoPath } from './capacitacionPdf.js';

const LABEL_FILL = '#FFCC66';
const BORDER = '#000000';

const MESES = [
  'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
  'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE',
];

function fmtDate(d) {
  if (!d) return '';
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return String(d);
  return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}`;
}

function fmtVigencia(d) {
  if (!d) return '';
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return String(d);
  const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  return `${dt.getDate()}-${meses[dt.getMonth()]}-${dt.getFullYear()}`;
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

function value(doc, text, x, y, w, h, { size = 9, bold = false, align = 'left' } = {}) {
  box(doc, x, y, w, h);
  doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(size).fillColor('#000');
  doc.text(text == null ? '' : String(text), x + 4, y + 4, { width: w - 8, height: h - 8, align });
}

function drawHeader(doc, L, R, W, row) {
  const headTop = 36;
  const headH = 70;
  const codW = 168;
  const logoW = 120;
  box(doc, L, headTop, W, headH);
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
  doc.font('Helvetica-Bold').fontSize(12).fillColor('#000');
  doc.text('ACTA DE REUNION CON EL CLIENTE', L + logoW + 6, headTop + 24, {
    width: W - logoW - codW - 12,
    align: 'center',
  });
  const codX = R - codW;
  box(doc, codX, headTop, codW, headH);
  const vigenciaTxt = fmtVigencia(row.vigencia);
  const rows = [
    ['Codificación', row.codificacion || 'IXIMS-REG-026'],
    ['Vigencia', vigenciaTxt],
    ['Versión', row.version || '1'],
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
  return headTop + headH + 8;
}

function drawCompromisosTable(doc, L, R, y, title, compromisos, minRows = 2) {
  const W = R - L;
  const rowH = 28;
  label(doc, title, L, y, W, 18, { size: 9, align: 'left' });
  y += 18;

  const cols = [
    { label: 'COMPROMISO', w: W * 0.46 },
    { label: 'RESPONSABLE', w: W * 0.22 },
    { label: 'FECHA INICIO', w: W * 0.16 },
    { label: 'FECHA ENTREGA', w: W * 0.16 },
  ];
  let x = L;
  for (const col of cols) {
    label(doc, col.label, x, y, col.w, 18, { size: 7 });
    x += col.w;
  }
  y += 18;

  const rows = [...compromisos];
  while (rows.length < minRows) rows.push(null);

  for (const row of rows) {
    x = L;
    const vals = row
      ? [
          row.compromiso || '',
          row.responsable || '',
          fmtDate(row.fecha_inicio),
          row.fecha_entrega ? fmtDate(row.fecha_entrega) : 'nd',
        ]
      : ['', '', '', ''];
    cols.forEach((col, i) => {
      value(doc, vals[i], x, y, col.w, rowH, { size: 8 });
      x += col.w;
    });
    y += rowH;
  }
  return y + 6;
}

function drawAsistentes(doc, L, R, y, asistentesIx, asistentesCli) {
  const W = R - L;
  label(doc, 'ASISTENTES', L, y, W, 18, { size: 9, align: 'left' });
  y += 18;

  const half = W / 2;
  const sigW = half * 0.22;
  const nameW = half - sigW - 52;
  const sideW = 52;

  // Encabezado izquierda (IX)
  label(doc, 'IX COLOMBIA', L, y, sideW, 16, { size: 7 });
  label(doc, 'NOMBRE Y CARGO', L + sideW, y, nameW, 16, { size: 7 });
  label(doc, 'FIRMA', L + sideW + nameW, y, sigW, 16, { size: 7 });
  // Encabezado derecha (CLIENTE)
  const rx = L + half;
  label(doc, 'CLIENTE', rx, y, sideW, 16, { size: 7 });
  label(doc, 'NOMBRE Y CARGO', rx + sideW, y, nameW, 16, { size: 7 });
  label(doc, 'FIRMA', rx + sideW + nameW, y, sigW, 16, { size: 7 });
  y += 16;

  const maxRows = Math.max(asistentesIx.length, asistentesCli.length, 3);
  const rowH = 36;

  for (let i = 0; i < maxRows; i += 1) {
    const ix = asistentesIx[i] || null;
    const cli = asistentesCli[i] || null;

    box(doc, L, y, sideW, rowH);
    box(doc, L + sideW, y, nameW, rowH);
    box(doc, L + sideW + nameW, y, sigW, rowH);
    box(doc, rx, y, sideW, rowH);
    box(doc, rx + sideW, y, nameW, rowH);
    box(doc, rx + sideW + nameW, y, sigW, rowH);

    if (ix) {
      doc.font('Helvetica').fontSize(8).fillColor('#000');
      const nombreCargo = [ix.nombre, ix.cargo].filter(Boolean).join('\n');
      doc.text(nombreCargo, L + sideW + 4, y + 4, { width: nameW - 8, height: rowH - 8 });
      const firmaBuf = firmaToBuffer(ix.firma);
      if (firmaBuf) {
        try {
          doc.image(firmaBuf, L + sideW + nameW + 2, y + 2, { fit: [sigW - 4, rowH - 4] });
        } catch { /* ignora */ }
      }
    }

    if (cli) {
      doc.font('Helvetica').fontSize(8).fillColor('#000');
      const nombreCargo = [cli.nombre, cli.cargo].filter(Boolean).join('\n');
      doc.text(nombreCargo, rx + sideW + 4, y + 4, { width: nameW - 8, height: rowH - 8 });
      const firmaBuf = firmaToBuffer(cli.firma);
      if (firmaBuf) {
        try {
          doc.image(firmaBuf, rx + sideW + nameW + 2, y + 2, { fit: [sigW - 4, rowH - 4] });
        } catch { /* ignora */ }
      }
    }

    y += rowH;
  }
  return y;
}

export async function fetchActreunReport(consecutivo) {
  const res = await query(
    `SELECT a.*, c.nombrecliente
     FROM actreun a
     LEFT JOIN clie c ON c.codigo = a.cliente
     WHERE a.consecutivo = $1`,
    [consecutivo],
  );
  if (!res.rows.length) return null;
  const row = res.rows[0];

  const comp = await query(
    `SELECT * FROM actreunc WHERE consecutivo = $1 ORDER BY item`,
    [consecutivo],
  );
  const asis = await query(
    `SELECT * FROM actreund WHERE consecutivo = $1 ORDER BY item`,
    [consecutivo],
  );

  return {
    ...row,
    compromisos_ix: comp.rows.filter((r) => r.lado === 'ix'),
    compromisos_cliente: comp.rows.filter((r) => r.lado === 'cliente'),
    asistentes_ix: asis.rows.filter((r) => r.lado === 'ix'),
    asistentes_cliente: asis.rows.filter((r) => r.lado === 'cliente'),
  };
}

export function actreunPdfFileName(row) {
  const fecha = row.fecha ? new Date(row.fecha) : new Date();
  const cliente = safeName(row.nombrecliente || row.cliente || '');
  return `ACTA REUNION ${cliente} ${fecha.getDate()}-${fecha.getMonth() + 1}-${fecha.getFullYear()}.pdf`;
}

export function buildActreunPdf(row) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'LETTER',
      margins: { top: 36, bottom: 36, left: 36, right: 36 },
      info: {
        Title: 'ACTA DE REUNION CON EL CLIENTE',
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
    const rowH = 22;

    let y = drawHeader(doc, L, R, W, row);

    // CLIENTE
    label(doc, 'CLIENTE:', L, y, 70, rowH, { align: 'left' });
    box(doc, L + 70, y, W - 70, rowH);
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#000');
    doc.text(row.nombrecliente || row.cliente || '', L + 74, y + 6, { width: W - 78 });
    y += rowH + 6;

    // FECHA DE REUNION
    const fecha = row.fecha ? new Date(row.fecha) : null;
    const dia = fecha ? String(fecha.getDate()).padStart(2, '0') : '';
    const mes = fecha ? MESES[fecha.getMonth()] : '';
    const anio = fecha ? String(fecha.getFullYear()) : '';

    label(doc, 'FECHA DE REUNION:', L, y, 110, rowH, { size: 7, align: 'left' });
    label(doc, 'DÍA', L + 110, y, 36, rowH, { size: 7 });
    box(doc, L + 146, y, 44, rowH);
    doc.font('Helvetica').fontSize(9).fillColor('#000');
    doc.text(dia, L + 146, y + 6, { width: 44, align: 'center' });
    label(doc, 'MES', L + 190, y, 36, rowH, { size: 7 });
    box(doc, L + 226, y, 100, rowH);
    doc.text(mes, L + 226, y + 6, { width: 100, align: 'center' });
    label(doc, 'AÑO', L + 326, y, 36, rowH, { size: 7 });
    box(doc, L + 362, y, R - (L + 362), rowH);
    doc.text(anio, L + 362, y + 6, { width: R - (L + 362), align: 'center' });
    y += rowH + 8;

    // MOTIVO / desarrollo
    label(doc, 'MOTIVO DE LA REUNIÓN', L, y, W, 18, { size: 9, align: 'left' });
    y += 18;
    const devText = htmlToPlain(row.desarrollo);
    doc.font('Helvetica').fontSize(10);
    const devH = Math.min(220, Math.max(80, doc.heightOfString(devText, { width: W - 16 }) + 20));
    box(doc, L, y, W, devH);
    doc.font('Helvetica').fontSize(10).fillColor('#000');
    doc.text(devText, L + 8, y + 8, { width: W - 16, height: devH - 16 });
    y += devH + 10;

    // COMPROMISOS
    label(doc, 'COMPROMISOS ADQUIRIDOS', L, y, W, 18, { size: 9, align: 'left' });
    y += 22;
    y = drawCompromisosTable(doc, L, R, y, 'POR IX COLOMBIA SAS', row.compromisos_ix || [], 2);
    y = drawCompromisosTable(doc, L, R, y, 'POR EL CLIENTE', row.compromisos_cliente || [], 1);

    if (y > 620) {
      doc.addPage();
      y = 36;
    }

    drawAsistentes(doc, L, R, y, row.asistentes_ix || [], row.asistentes_cliente || []);

    doc.end();
  });
}
