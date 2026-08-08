/** Normaliza a YYYY-MM-DD válido para inputs type=date, o cadena vacía si no es fecha. */
export function normalizeDateInput(value) {
  if (value == null || value === '') return '';
  const s = String(value).trim();
  if (!s) return '';

  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    if (dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d) return s;
    return '';
  }

  const dt = new Date(s);
  if (Number.isNaN(dt.getTime())) return '';
  return dt.toISOString().slice(0, 10);
}

/** Igual que normalizeDateInput pero devuelve null si no hay fecha válida. */
export function dateInputOrNull(value) {
  const n = normalizeDateInput(value);
  return n || null;
}
