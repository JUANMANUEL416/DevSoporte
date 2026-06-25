const TRATAMIENTOS = new Set(['doctor', 'doctora', 'sr.', 'sra.', 'srta.', 'señorita', 'senorita']);

export function formatNombreConTratamiento(tratamiento, nombre) {
  const name = String(nombre || '').trim();
  if (!name) return 'estimado(a)';

  const trat = String(tratamiento || '').trim();
  if (!trat) return name;

  const key = trat.toLowerCase();
  if (!TRATAMIENTOS.has(key)) return `${trat} ${name}`;

  if (key === 'doctor' || key === 'doctora') {
    return `${trat.charAt(0).toUpperCase()}${trat.slice(1).toLowerCase()} ${name}`;
  }

  return `${trat} ${name}`;
}
