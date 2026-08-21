import ExcelJS from 'exceljs';
import { query } from '../db/pool.js';
import { fetchCronograma } from './cronogramaPdf.js';
import { ensureCronogramaEditable } from './cronogramaHooks.js';

const ITEM_ESTADOS = ['Programado', 'Realizado', 'No cumplido', 'Cancelado'];

export const EXCEL_HEADERS = [
  { key: 'cnscrono', header: 'cnscrono', width: 14 },
  { key: 'item', header: 'item', width: 8 },
  { key: 'modulo_nombre', header: 'modulo', width: 28 },
  { key: 'tema_nombre', header: 'tema', width: 22 },
  { key: 'descripcion', header: 'descripcion', width: 36 },
  { key: 'duracion', header: 'min', width: 8 },
  { key: 'fecha_probable', header: 'f_probable', width: 14 },
  { key: 'hora_sugerida', header: 'hora', width: 10 },
  { key: 'estado', header: 'estado', width: 14 },
  { key: 'fecha_real', header: 'f_real', width: 14 },
  { key: 'pct_cumplimiento', header: 'pct_cumplimiento', width: 16 },
  { key: 'observacion', header: 'observacion', width: 40 },
];

const EDITABLE_KEYS = new Set([
  'duracion',
  'fecha_probable',
  'hora_sugerida',
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
  if (m) {
    return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  }
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
}

function parsePct(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(String(value).replace('%', '').trim());
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function normalizeHora(value) {
  if (value === null || value === undefined || value === '') return null;
  const s = String(value).trim();
  const m = s.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  return `${m[1].padStart(2, '0')}:${m[2]}`;
}

function safeName(s) {
  return String(s || '')
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60);
}

export function cronogramaExcelFileName(enc) {
  const cliente = safeName(enc.nombrecliente || enc.cliente || '');
  return `CRONOGRAMA SEGUIMIENTO ${cliente} ${enc.cnscrono}.xlsx`;
}

function sortItems(items) {
  return [...items].sort((a, b) => {
    const mo = (a.modulo_orden ?? 999) - (b.modulo_orden ?? 999);
    if (mo !== 0) return mo;
    const tc = (a.tema_nombre || '').localeCompare(b.tema_nombre || '', 'es');
    if (tc !== 0) return tc;
    return (Number(a.item) || 0) - (Number(b.item) || 0);
  });
}

function itemToRow(enc, item) {
  return {
    cnscrono: enc.cnscrono,
    item: item.item,
    modulo_nombre: item.modulo_nombre || '',
    tema_nombre: item.tema_nombre || '',
    descripcion: item.descripcion || '',
    duracion: item.duracion ?? '',
    fecha_probable: fmtDateExcel(item.fecha_probable),
    hora_sugerida: item.hora_sugerida ? String(item.hora_sugerida).slice(0, 5) : '',
    estado: item.estado || 'Programado',
    fecha_real: fmtDateExcel(item.fecha_real),
    pct_cumplimiento: item.pct_cumplimiento ?? '',
    observacion: item.observacion || '',
  };
}

export async function buildCronogramaExcel(cnscrono) {
  const data = await fetchCronograma(cnscrono);
  if (!data) {
    const err = new Error('Cronograma no encontrado');
    err.status = 404;
    throw err;
  }
  if (!data.items.length) {
    const err = new Error('El cronograma no tiene ítems');
    err.status = 404;
    throw err;
  }

  const wb = new ExcelJS.Workbook();
  wb.creator = 'DevSoporte';
  const ws = wb.addWorksheet('Seguimiento', {
    views: [{ state: 'frozen', ySplit: 2 }],
  });

  ws.addRow([
    'Descargue, complete pct_cumplimiento / estado / observación y vuelva a subir el mismo archivo.',
  ]);
  ws.mergeCells(1, 1, 1, EXCEL_HEADERS.length);
  ws.getRow(1).font = { italic: true, size: 10 };

  ws.addRow(EXCEL_HEADERS.map((h) => h.header));
  ws.getRow(2).font = { bold: true };
  ws.getRow(2).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFFCC66' },
  };

  EXCEL_HEADERS.forEach((col, idx) => {
    ws.getColumn(idx + 1).width = col.width;
  });

  for (const item of sortItems(data.items)) {
    const row = itemToRow(data.encabezado, item);
    ws.addRow(EXCEL_HEADERS.map((h) => row[h.key]));
  }

  const headerRow = 2;
  const firstData = 3;
  const lastData = ws.rowCount;
  for (let r = firstData; r <= lastData; r += 1) {
    for (let c = 1; c <= EXCEL_HEADERS.length; c += 1) {
      const key = EXCEL_HEADERS[c - 1].key;
      const cell = ws.getRow(r).getCell(c);
      if (EDITABLE_KEYS.has(key)) {
        cell.protection = { locked: false };
      } else {
        cell.protection = { locked: true };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF5F5F5' },
        };
      }
    }
  }

  await ws.protect('', {
    selectLockedCells: true,
    selectUnlockedCells: true,
  });

  ws.autoFilter = {
    from: { row: headerRow, column: 1 },
    to: { row: lastData, column: EXCEL_HEADERS.length },
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

export async function importCronogramaExcel(cnscrono, buffer) {
  await ensureCronogramaEditable(cnscrono);

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  const ws = wb.getWorksheet('Seguimiento') || wb.worksheets[0];
  if (!ws) {
    const err = new Error('El archivo no contiene hoja de seguimiento');
    err.status = 400;
    throw err;
  }

  let headerRowNum = 2;
  let headers = headerIndexMap(ws.getRow(headerRowNum));
  if (!headers.has('item')) {
    headerRowNum = 1;
    headers = headerIndexMap(ws.getRow(headerRowNum));
  }
  if (!headers.has('item') || !headers.has('cnscrono')) {
    const err = new Error('Formato inválido: faltan columnas cnscrono e item');
    err.status = 400;
    throw err;
  }

  const existingRes = await query(
    'SELECT item, estado FROM cronocapd WHERE cnscrono = $1',
    [cnscrono],
  );
  const existing = new Map(existingRes.rows.map((r) => [Number(r.item), r]));

  let updated = 0;
  let omitidos = 0;
  const errores = [];

  for (let r = headerRowNum + 1; r <= ws.rowCount; r += 1) {
    const row = ws.getRow(r);
    const rowCnscrono = String(cellVal(row, headers.get('cnscrono')) || '').trim();
    const item = Number(cellVal(row, headers.get('item')));
    if (!rowCnscrono && !item) continue;
    if (rowCnscrono && rowCnscrono !== cnscrono) {
      errores.push(`Fila ${r}: cnscrono ${rowCnscrono} no coincide`);
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

    if (estado === 'No cumplido' || estado === 'Cancelado') {
      if (!obs) {
        errores.push(`Fila ${r}: observación requerida para estado ${estado}`);
        continue;
      }
    }

    const pct = parsePct(cellVal(row, headers.get('pct_cumplimiento')));
    const fechaReal = parseExcelDate(cellVal(row, headers.get('f_real')));
    const fechaProbable = parseExcelDate(cellVal(row, headers.get('f_probable')));
    const hora = normalizeHora(cellVal(row, headers.get('hora')));
    const durRaw = cellVal(row, headers.get('min'));
    const duracion =
      durRaw === null || durRaw === undefined || durRaw === '' ? null : Number(durRaw);

    let fechaRealFinal = fechaReal;
    if (estado === 'Realizado' && !fechaRealFinal) {
      fechaRealFinal = new Date().toISOString().slice(0, 10);
    }
    if (estado === 'Programado') fechaRealFinal = null;

    await query(
      `UPDATE cronocapd SET
         duracion = $3,
         fecha_probable = $4,
         hora_sugerida = $5,
         estado = $6,
         fecha_real = $7,
         pct_cumplimiento = $8,
         observacion = COALESCE($9, observacion)
       WHERE cnscrono = $1 AND item = $2`,
      [
        cnscrono,
        item,
        Number.isFinite(duracion) && duracion > 0 ? duracion : null,
        fechaProbable,
        hora,
        estado || 'Programado',
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
