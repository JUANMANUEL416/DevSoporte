/**
 * Genera las semanas de un año para TSEMA (formato Clarion: WWYYYY, p. ej. 252026).
 * Cada semana va de lunes a domingo; la semana 1 es la que contiene el 1 de enero.
 */

const MESES_CORTO = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function mondayOfWeekContaining(date) {
  const d = startOfDay(date);
  const day = d.getDay(); // 0=domingo
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(d, diff);
}

function formatObservacion(weekNum, fechaini, fechafin, year) {
  const ini = `${fechaini.getDate()} ${MESES_CORTO[fechaini.getMonth()]}`;
  const fin = `${fechafin.getDate()} ${MESES_CORTO[fechafin.getMonth()]}`;
  return `Sem. ${weekNum} Del ${ini} al ${fin} ${year}`;
}

export function buildSemanasAnio(year) {
  if (!Number.isInteger(year) || year < 1970 || year > 2100) {
    throw new Error('Año inválido');
  }

  const weeks = [];
  let weekStart = mondayOfWeekContaining(new Date(year, 0, 1));
  let weekNum = 1;

  while (weekNum <= 53) {
    const fechaini = startOfDay(weekStart);
    const fechafin = startOfDay(addDays(weekStart, 6));

    if (fechaini.getFullYear() > year) break;
    if (fechafin.getFullYear() < year) {
      weekStart = addDays(weekStart, 7);
      weekNum += 1;
      continue;
    }

    const idsemana = `${String(weekNum).padStart(2, '0')}${year}`;
    weeks.push({
      idsemana,
      fechaini,
      fechafin,
      observacion: formatObservacion(weekNum, fechaini, fechafin, year),
    });

    weekStart = addDays(weekStart, 7);
    weekNum += 1;
  }

  return weeks;
}

export async function persistSemanasAnio(queryFn, year) {
  const rows = buildSemanasAnio(year);
  for (const row of rows) {
    await queryFn(
      `INSERT INTO tsema (idsemana, fechaini, fechafin, observacion)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (idsemana) DO UPDATE SET
         fechaini = EXCLUDED.fechaini,
         fechafin = EXCLUDED.fechafin,
         observacion = EXCLUDED.observacion`,
      [row.idsemana, row.fechaini, row.fechafin, row.observacion],
    );
  }
  return rows.length;
}

export async function persistSemanasRango(queryFn, fromYear, toYear) {
  let total = 0;
  for (let year = fromYear; year <= toYear; year += 1) {
    total += await persistSemanasAnio(queryFn, year);
  }
  return total;
}
