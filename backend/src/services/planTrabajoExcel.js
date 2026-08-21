import ExcelJS from 'exceljs';
import { query } from '../db/pool.js';
import { fetchPlanTrabajo } from './planTrabajoPdf.js';
import { ensurePlanEditable } from './planTrabajoHooks.js';
import { planItemActividadLabel, planItemArea, planItemAgrupadorPadre } from './planTrabajoAreas.js';

const ITEM_ESTADOS = ['Pendiente', 'En curso', 'Realizado', 'Cancelado'];

export const PLAN_EXCEL_HEADERS = [
  { key: 'cnplan', header: 'cnplan', width: 14 },
  { key: 'item', header: 'item', width: 8 },
  { key: 'area', header: 'area', width: 18 },
  { key: 'agrupador', header: 'agrupador', width: 22 },
  { key: 'actividad', header: 'actividad', width: 36 },
  { key: 'tiempo_estimado', header: 'min', width: 8 },
  { key: 'estado', header: 'estado', width: 14 },
  { key: 'fecha_real', header: 'f_real', width: 14 },
  { key: 'pct_cumplimiento', header: 'pct_cumplimiento', width: 16 },
  { key: 'observacion', header: 'observacion', width: 40 },
];

const EDITABLE_KEYS = new Set([
  'tiempo_estimado',
  'estado',
  'fecha_real',
  'pct_cumplimiento',
  'observacion',
]);

function fmtDateExcel(value) {
  if (!value) return '';
  const dt = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(dt.getTime())) return String(value);
  return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}`;
}

function parseExcelDate(value) {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  const s = String(value).trim();
  if (!s) return null;
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

function parsePct(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(String(value).replace('%', '').trim());
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function safeName(s) {
  return String(s || '')
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60);
}

export function planTrabajoExcelFileName(enc) {
  const cliente = safeName(enc.nombrecliente || enc.cliente || '');
  return `PLAN TRABAJO ${cliente} ${enc.cnplan}.xlsx`;
}

function sortItems(items) {
  return [...items].sort((a, b) => {
    const aa = planItemArea(a.nombre, a.proc_nombre).localeCompare(
      planItemArea(b.nombre, b.proc_nombre),
      'es',
    );
    if (aa !== 0) return aa;
    return (Number(a.orden) || 0) - (Number(b.orden) || 0);
  });
}

function itemToRow(enc, item) {
  const area = planItemAgrupadorPadre(item);
  return {
    cnplan: enc.cnplan,
    item: item.item,
    area,
    agrupador: area,
    actividad: planItemActividadLabel(item),
    tiempo_estimado: item.tiempo_estimado ?? '',
    estado: item.estado || 'Pendiente',
    fecha_real: fmtDateExcel(item.fecha_real),
    pct_cumplimiento: item.pct_cumplimiento ?? '',
    observacion: item.observacion || '',
  };
}

function addInstruccionesSheet(wb, enc) {
  const ws = wb.addWorksheet('Instrucciones');
  ws.getColumn(1).width = 92;
  const rows = [
    ['INSTRUCCIONES — AVANCE DEL PLAN DE TRABAJO'],
    [''],
    [`Plan ${enc.cnplan}${enc.nombre ? ` — ${enc.nombre}` : ''}`],
    [''],
    ['1. Abra la hoja «Avance».'],
    ['2. Complete solo las celdas editables (sin fondo gris):'],
    ['   • pct_cumplimiento: porcentaje de cumplimiento (0 a 100)'],
    ['   • estado: Pendiente | En curso | Realizado | Cancelado'],
    ['   • f_real: fecha real de la actividad (dd/mm/aaaa)'],
    ['   • observacion: comentarios de seguimiento'],
    ['   • min: tiempo estimado en minutos (opcional)'],
    ['3. No modifique cnplan, item, area, agrupador ni actividad.'],
    ['4. Las actividades ya «Realizado» se omiten al importar.'],
    ['5. Guarde el archivo y súbalo con «Subir avance» en DevSoporte.'],
  ];
  rows.forEach((cells, idx) => {
    const row = ws.addRow(cells);
    if (idx === 0) row.font = { bold: true, size: 12, color: { argb: 'FF00695C' } };
    if (idx === 2) row.font = { italic: true, size: 10 };
  });
}

export async function buildPlanTrabajoExcel(cnplan) {
  const data = await fetchPlanTrabajo(cnplan);
  if (!data) {
    const err = new Error('Plan de trabajo no encontrado');
    err.status = 404;
    throw err;
  }
  if (!data.items.length) {
    const err = new Error('El plan no tiene actividades');
    err.status = 404;
    throw err;
  }

  const wb = new ExcelJS.Workbook();
  wb.creator = 'DevSoporte';
  addInstruccionesSheet(wb, data.encabezado);
  const ws = wb.addWorksheet('Avance', { views: [{ state: 'frozen', ySplit: 2 }] });

  ws.addRow([
    'Descargue, complete pct_cumplimiento / estado / observación y vuelva a subir el mismo archivo.',
  ]);
  ws.mergeCells(1, 1, 1, PLAN_EXCEL_HEADERS.length);
  ws.getRow(1).font = { italic: true, size: 10 };

  ws.addRow(PLAN_EXCEL_HEADERS.map((h) => h.header));
  ws.getRow(2).font = { bold: true };
  ws.getRow(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFCC66' } };

  PLAN_EXCEL_HEADERS.forEach((col, idx) => {
    ws.getColumn(idx + 1).width = col.width;
  });

  for (const item of sortItems(data.items)) {
    const row = itemToRow(data.encabezado, item);
    ws.addRow(PLAN_EXCEL_HEADERS.map((h) => row[h.key]));
  }

  const headerRow = 2;
  const firstData = 3;
  const lastData = ws.rowCount;
  for (let r = firstData; r <= lastData; r += 1) {
    for (let c = 1; c <= PLAN_EXCEL_HEADERS.length; c += 1) {
      const key = PLAN_EXCEL_HEADERS[c - 1].key;
      const cell = ws.getRow(r).getCell(c);
      if (EDITABLE_KEYS.has(key)) {
        cell.protection = { locked: false };
      } else {
        cell.protection = { locked: true };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
      }
    }
  }

  await ws.protect('', { selectLockedCells: true, selectUnlockedCells: true });

  ws.autoFilter = {
    from: { row: headerRow, column: 1 },
    to: { row: lastData, column: PLAN_EXCEL_HEADERS.length },
  };

  const buffer = await wb.xlsx.writeBuffer();
  return { buffer, encabezado: data.encabezado };
}

function headerIndexMap(headerRow) {
  const map = new Map();
  headerRow.eachCell((cell, col) => {
    const key = String(cell.value || '').trim().toLowerCase();
    if (key) map.set(key, col);
  });
  return map;
}

function cellVal(row, col) {
  if (!col) return undefined;
  const v = row.getCell(col).value;
  if (v && typeof v === 'object' && v.text !== undefined) return v.text;
  return v;
}

export async function importPlanTrabajoExcel(cnplan, buffer) {
  await ensurePlanEditable(cnplan);

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  const ws = wb.getWorksheet('Avance') || wb.worksheets[0];
  if (!ws) {
    const err = new Error('El archivo no contiene hoja de avance');
    err.status = 400;
    throw err;
  }

  let headerRowNum = 2;
  let headers = headerIndexMap(ws.getRow(headerRowNum));
  if (!headers.has('item')) {
    headerRowNum = 1;
    headers = headerIndexMap(ws.getRow(headerRowNum));
  }
  if (!headers.has('item') || !headers.has('cnplan')) {
    const err = new Error('Formato inválido: faltan columnas cnplan e item');
    err.status = 400;
    throw err;
  }

  const existingRes = await query(
    'SELECT item, estado FROM plantrabd WHERE cnplan = $1',
    [cnplan],
  );
  const existing = new Map(existingRes.rows.map((r) => [Number(r.item), r]));

  let updated = 0;
  let omitidos = 0;
  const errores = [];

  for (let r = headerRowNum + 1; r <= ws.rowCount; r += 1) {
    const row = ws.getRow(r);
    const rowCnplan = String(cellVal(row, headers.get('cnplan')) || '').trim();
    const item = Number(cellVal(row, headers.get('item')));
    if (!rowCnplan && !item) continue;
    if (rowCnplan && rowCnplan !== cnplan) {
      errores.push(`Fila ${r}: cnplan ${rowCnplan} no coincide`);
      continue;
    }
    if (!Number.isFinite(item) || !existing.has(item)) {
      errores.push(`Fila ${r}: ítem ${item} no encontrado`);
      continue;
    }

    const prev = existing.get(item);
    if (prev.estado === 'Realizado') {
      omitidos += 1;
      continue;
    }

    const estadoRaw = cellVal(row, headers.get('estado'));
    const estado = estadoRaw ? String(estadoRaw).trim() : prev.estado;
    if (estado && !ITEM_ESTADOS.includes(estado)) {
      errores.push(`Fila ${r}: estado «${estado}» no válido`);
      continue;
    }

    const observacion = cellVal(row, headers.get('observacion'));
    const obs = observacion !== undefined && observacion !== null ? String(observacion).trim() : null;

    const pct = parsePct(cellVal(row, headers.get('pct_cumplimiento')));
    const fechaReal = parseExcelDate(cellVal(row, headers.get('f_real')));
    const minRaw = cellVal(row, headers.get('min'));
    const tiempo =
      minRaw === null || minRaw === undefined || minRaw === '' ? null : Number(minRaw);

    let fechaRealFinal = fechaReal;
    if (estado === 'Realizado' && !fechaRealFinal) {
      fechaRealFinal = new Date().toISOString().slice(0, 10);
    }
    if (estado === 'Pendiente' || estado === 'En curso') fechaRealFinal = null;

    await query(
      `UPDATE plantrabd SET
         tiempo_estimado = $3,
         estado = $4,
         fecha_real = $5,
         pct_cumplimiento = $6,
         observacion = COALESCE($7, observacion)
       WHERE cnplan = $1 AND item = $2`,
      [
        cnplan,
        item,
        Number.isFinite(tiempo) && tiempo > 0 ? tiempo : null,
        estado || 'Pendiente',
        fechaRealFinal,
        pct,
        obs,
      ],
    );
    updated += 1;
  }

  if (errores.length && !updated) {
    const err = new Error(errores.slice(0, 5).join('; '));
    err.status = 400;
    throw err;
  }

  return { updated, omitidos, errores };
}
