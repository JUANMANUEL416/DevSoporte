import PDFDocument from 'pdfkit';
import { query } from '../db/pool.js';
import { getLogoPath } from './capacitacionPdf.js';
import { planItemActividadLabel, planItemArea } from './planTrabajoAreas.js';

const LABEL_FILL = '#FFCC66';
const BORDER = '#000000';
const ACCENT = '#00695c';

function fmtDate(value) {
  if (!value) return '—';
  const s = String(value).trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  const dt = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(dt.getTime())) return '—';
  return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}`;
}

function fmtDuracionPdf(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return '—';
  return String(n);
}

function fmtObservacion(item) {
  const parts = [];
  const pct = item.pct_cumplimiento;
  if (pct !== null && pct !== undefined && pct !== '') {
    parts.push(`Cumplimiento: ${pct}%`);
  }
  const obs = String(item.observacion || '').trim();
  if (obs) parts.push(obs);
  return parts.length ? parts.join(' — ') : '—';
}

function safeName(s) {
  return String(s || '')
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
}

function box(doc, x, y, w, h, { fill = null, lineWidth = 1 } = {}) {
  doc.save().lineWidth(lineWidth).strokeColor(BORDER);
  if (fill) {
    doc.fillColor(fill).rect(x, y, w, h).fillAndStroke(fill, BORDER);
  } else {
    doc.rect(x, y, w, h).stroke();
  }
  doc.restore();
}

function labelCell(doc, text, x, y, w, h, { size = 8 } = {}) {
  box(doc, x, y, w, h, { fill: LABEL_FILL });
  doc.font('Helvetica-Bold').fontSize(size).fillColor('#000');
  doc.text(text, x + 2, y + h / 2 - size / 2 - 1, { width: w - 4, align: 'center' });
}

function textCell(doc, text, x, y, w, h, { size = 8, align = 'left' } = {}) {
  doc.font('Helvetica').fontSize(size).fillColor('#000');
  const pad = 3;
  doc.text(String(text ?? '—'), x + pad, y + pad, {
    width: w - pad * 2,
    height: h - pad * 2,
    align,
    lineBreak: true,
  });
}

function cellContentHeight(doc, text, width, { size = 8, minH = 18, pad = 3 } = {}) {
  doc.font('Helvetica').fontSize(size);
  const contentH = doc.heightOfString(String(text ?? '—'), { width: width - pad * 2 });
  return Math.max(minH, Math.ceil(contentH + pad * 2));
}

function rowHeight(doc, texts, widths, minH = 16) {
  let maxH = minH;
  doc.font('Helvetica').fontSize(8);
  texts.forEach((t, i) => {
    maxH = Math.max(maxH, cellContentHeight(doc, t, widths[i], { minH }));
  });
  return maxH;
}

function drawBanner(doc, L, W) {
  const top = doc.page.margins.top;
  const h = 52;
  box(doc, L, top, W, h);
  const logoPath = getLogoPath();
  if (logoPath) {
    try {
      doc.image(logoPath, L + 8, top + 6, { fit: [90, 40] });
    } catch {
      doc.font('Helvetica-Bold').fontSize(11).text('IxColombia', L + 12, top + 18);
    }
  }
  doc.font('Helvetica-Bold').fontSize(14).fillColor(ACCENT);
  doc.text('PLAN DE TRABAJO QRYSTALOS', L + 110, top + 18, { width: W - 120, align: 'center' });
  doc.fillColor('#000');
  return top + h + 10;
}

function drawHeader(doc, L, W, y, enc) {
  const rowH = 18;
  const rowGap = 2;
  const colW = W / 4;

  let x = L;
  labelCell(doc, 'F. INICIAL', x, y, colW, rowH, { size: 7 });
  box(doc, x + colW, y, colW, rowH);
  textCell(doc, fmtDate(enc.fecha_inicial), x + colW, y, colW, rowH, { align: 'center', size: 7 });
  labelCell(doc, 'F. FINAL', x + colW * 2, y, colW, rowH, { size: 7 });
  box(doc, x + colW * 3, y, colW, rowH);
  textCell(doc, fmtDate(enc.fecha_final), x + colW * 3, y, colW, rowH, { align: 'center', size: 7 });
  y += rowH + rowGap;

  labelCell(doc, 'ESTADO', x, y, colW, rowH, { size: 7 });
  box(doc, x + colW, y, colW, rowH);
  textCell(doc, enc.estado || '—', x + colW, y, colW, rowH, { align: 'center', size: 7 });
  labelCell(doc, 'CONSECUTIVO', x + colW * 2, y, colW, rowH, { size: 7 });
  box(doc, x + colW * 3, y, colW, rowH);
  textCell(doc, enc.cnplan || '—', x + colW * 3, y, colW, rowH, { align: 'center', size: 7 });
  y += rowH + rowGap;

  const labelW = Math.round(W * 0.28);
  const valueW = W - labelW;

  const clienteH = cellContentHeight(doc, enc.nombrecliente || enc.cliente || '—', valueW, { size: 7 });
  labelCell(doc, 'CLIENTE / PROYECTO', L, y, labelW, clienteH, { size: 7 });
  box(doc, L + labelW, y, valueW, clienteH);
  textCell(doc, enc.nombrecliente || enc.cliente || '—', L + labelW, y, valueW, clienteH, { size: 7 });
  y += clienteH + rowGap;

  const nombreH = cellContentHeight(doc, enc.nombre || '—', valueW, { size: 7 });
  labelCell(doc, 'NOMBRE DEL PLAN', L, y, labelW, nombreH, { size: 7 });
  box(doc, L + labelW, y, valueW, nombreH);
  textCell(doc, enc.nombre || '—', L + labelW, y, valueW, nombreH, { size: 7 });
  y += nombreH + rowGap;

  const descText = enc.descripcion || '—';
  const descH = cellContentHeight(doc, descText, valueW, { size: 7 });
  labelCell(doc, 'DESCRIPCION', L, y, labelW, descH, { size: 7 });
  box(doc, L + labelW, y, valueW, descH);
  textCell(doc, descText, L + labelW, y, valueW, descH, { size: 7 });
  y += descH + 8;

  return y;
}

function groupItemsByModuloAndArea(items) {
  const modMap = new Map();
  for (const item of items) {
    const modKey = item.modulo || '_';
    if (!modMap.has(modKey)) {
      modMap.set(modKey, {
        modulo: item.modulo,
        modulo_nombre: item.modulo_nombre || item.modulo || 'Sin módulo',
        modulo_orden: item.modulo_orden ?? 999,
        areas: new Map(),
      });
    }
    const mod = modMap.get(modKey);
    const area = planItemArea(item.nombre, item.proc_nombre, item.modulo_nombre) || 'General';
    if (!mod.areas.has(area)) {
      mod.areas.set(area, { area, minOrden: item.orden ?? 999, items: [] });
    }
    const areaBlock = mod.areas.get(area);
    areaBlock.minOrden = Math.min(areaBlock.minOrden, item.orden ?? 999);
    areaBlock.items.push(item);
  }

  return [...modMap.values()]
    .map((g) => {
      const areas = [...g.areas.values()]
        .sort((a, b) => {
          const diff = (a.minOrden ?? 999) - (b.minOrden ?? 999);
          if (diff !== 0) return diff;
          return a.area.localeCompare(b.area, 'es');
        })
        .map(({ area, items }) => ({ area, items }));
      const minOrden = areas.length
        ? Math.min(...areas.map((a) => a.items[0]?.orden ?? 999))
        : 999;
      return { ...g, areas, minOrden };
    })
    .sort((a, b) => {
      const diff = (a.minOrden ?? 999) - (b.minOrden ?? 999);
      if (diff !== 0) return diff;
      return a.modulo_orden - b.modulo_orden;
    });
}

function drawTableHeader(doc, L, y, cols) {
  let x = L;
  for (const col of cols) {
    labelCell(doc, col.label, x, y, col.w, 20, { size: 7 });
    x += col.w;
  }
  return y + 20;
}

function drawAreaSection(doc, L, W, y, areaGrupo, cols, pageBottom) {
  const areaH = 18;
  if (y + areaH + 40 > pageBottom) {
    doc.addPage();
    y = doc.page.margins.top;
  }
  box(doc, L, y, W, areaH, { fill: '#f1f5f9' });
  doc.font('Helvetica-Bold').fontSize(9).fillColor('#374151');
  doc.text(areaGrupo.area, L + 8, y + 5, { width: W - 16 });
  doc.fillColor('#000');
  y += areaH + 2;

  if (y + 40 > pageBottom) {
    doc.addPage();
    y = doc.page.margins.top;
  }
  y = drawTableHeader(doc, L, y, cols);

  for (const item of areaGrupo.items) {
    const texts = [
      item.orden ?? '—',
      planItemActividadLabel(item),
      fmtDuracionPdf(item.tiempo_estimado),
      item.estado || '—',
      fmtObservacion(item),
    ];
    const widths = cols.map((c) => c.w);
    const h = rowHeight(doc, texts, widths);
    if (y + h > pageBottom) {
      doc.addPage();
      y = doc.page.margins.top;
      y = drawTableHeader(doc, L, y, cols);
    }
    let x = L;
    for (let i = 0; i < cols.length; i += 1) {
      box(doc, x, y, cols[i].w, h);
      textCell(doc, texts[i], x, y, cols[i].w, h, { align: i >= 2 && i <= 3 ? 'center' : 'left' });
      x += cols[i].w;
    }
    y += h;
  }

  return y + 6;
}

function drawModuleSection(doc, L, W, y, grupo) {
  const pageBottom = doc.page.height - doc.page.margins.bottom;
  const titleH = 24;
  if (y + titleH + 40 > pageBottom) {
    doc.addPage();
    y = doc.page.margins.top;
  }

  box(doc, L, y, W, titleH, { fill: '#e0f2f1', lineWidth: 1.2 });
  doc.font('Helvetica-Bold').fontSize(10).fillColor(ACCENT);
  doc.text(grupo.modulo_nombre, L + 8, y + 7, { width: W - 16 });
  doc.fillColor('#000');
  y += titleH + 4;

  const cols = [
    { label: 'Ord.', w: 36 },
    { label: 'Actividad', w: W - 36 - 48 - 72 - 140 },
    { label: 'Min', w: 48 },
    { label: 'Estado', w: 72 },
    { label: 'Observaciones', w: 140 },
  ];

  for (const areaGrupo of grupo.areas) {
    y = drawAreaSection(doc, L, W, y, areaGrupo, cols, pageBottom);
  }

  const allItems = grupo.areas.flatMap((a) => a.items);
  const totalMin = allItems.reduce((s, i) => {
    const n = Number(i.tiempo_estimado);
    return s + (Number.isFinite(n) && n > 0 ? n : 0);
  }, 0);
  const sumH = 20;
  box(doc, L, y, W, sumH, { fill: '#f8fafc' });
  doc.font('Helvetica-Bold').fontSize(8).text(
    `${allItems.length} actividad(es) · Tiempo estimado: ${totalMin || '—'} min`,
    L + 8,
    y + 6,
  );
  return y + sumH + 14;
}

function drawResumen(doc, L, W, y, items, grupos) {
  const pageBottom = doc.page.height - doc.page.margins.bottom;
  if (y + 28 > pageBottom) {
    doc.addPage();
    y = doc.page.margins.top;
  }
  const totalMin = items.reduce((s, i) => {
    const n = Number(i.tiempo_estimado);
    return s + (Number.isFinite(n) && n > 0 ? n : 0);
  }, 0);
  const pend = items.filter((i) => i.estado === 'Pendiente').length;
  const real = items.filter((i) => i.estado === 'Realizado').length;
  box(doc, L, y, W, 28, { fill: LABEL_FILL });
  doc.font('Helvetica-Bold').fontSize(9).fillColor('#000');
  doc.text(
    `Total: ${grupos.length} módulo(s) · ${items.length} actividades · ${totalMin || 0} min estimados · Realizadas: ${real} · Pendientes: ${pend}`,
    L + 8,
    y + 9,
    { width: W - 16 },
  );
}

export async function fetchPlanTrabajo(cnplan) {
  const head = await query(
    `SELECT p.*, cl.nombrecliente
     FROM plantrab p
     LEFT JOIN clie cl ON cl.codigo = p.cliente
     WHERE p.cnplan = $1`,
    [cnplan],
  );
  if (!head.rows.length) return null;

  const items = await query(
    `SELECT d.*, pr.codigo_num, pr.modulo, pr.nombre AS proc_nombre,
            m.nombre AS modulo_nombre, m.orden AS modulo_orden
     FROM plantrabd d
     LEFT JOIN qrysproc pr ON pr.codigo = d.proceso_codigo
     LEFT JOIN qrysmod m ON m.codigo = pr.modulo
     WHERE d.cnplan = $1
     ORDER BY COALESCE(m.orden, 999), d.orden ASC, pr.codigo_num ASC, d.item ASC`,
    [cnplan],
  );

  return { encabezado: head.rows[0], items: items.rows };
}

export function planTrabajoPdfFileName(enc) {
  const cliente = safeName(enc.nombrecliente || enc.cliente || '');
  const plan = safeName(enc.nombre || enc.cnplan || '');
  return `PLAN TRABAJO ${cliente} ${plan || enc.cnplan}.pdf`;
}

export function buildPlanTrabajoPdf({ encabezado, items }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'LETTER',
      layout: 'portrait',
      margins: { top: 36, bottom: 40, left: 36, right: 36 },
      info: {
        Title: 'Plan de trabajo Qrystalos',
        Author: 'DevSoporte',
        Subject: encabezado.nombrecliente || encabezado.cliente || '',
      },
    });

    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const L = doc.page.margins.left;
    const W = doc.page.width - L - doc.page.margins.right;

    let y = drawBanner(doc, L, W);
    y = drawHeader(doc, L, W, y, encabezado);

    const grupos = groupItemsByModuloAndArea(items);
    for (const grupo of grupos) {
      y = drawModuleSection(doc, L, W, y, grupo);
    }

    if (items.length) {
      drawResumen(doc, L, W, y, items, grupos);
    }

    doc.end();
  });
}
