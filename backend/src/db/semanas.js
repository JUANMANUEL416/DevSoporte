// Genera y persiste semanas TSEMA para uno o más años.
// Uso:
//   npm run db:semanas              → año actual y el siguiente
//   npm run db:semanas -- 2026        → solo 2026
//   npm run db:semanas -- 2025 2027   → rango 2025-2027
import 'dotenv/config';
import { pool } from './pool.js';
import { persistSemanasAnio, persistSemanasRango } from '../services/generarSemanas.js';

function parseYears(argv) {
  const args = argv.filter((a) => /^\d{4}$/.test(a)).map(Number);
  if (args.length === 0) {
    const now = new Date().getFullYear();
    return { from: now, to: now + 1 };
  }
  if (args.length === 1) return { from: args[0], to: args[0] };
  const from = Math.min(args[0], args[1]);
  const to = Math.max(args[0], args[1]);
  return { from, to };
}

async function run() {
  const { from, to } = parseYears(process.argv.slice(2));
  console.log(`Generando semanas TSEMA (${from}${from === to ? '' : ` → ${to}`})...`);

  const total = await persistSemanasRango((sql, params) => pool.query(sql, params), from, to);
  console.log(`${total} semana(s) guardadas en tsema.`);
  await pool.end();
}

run().catch((err) => {
  console.error('Error generando semanas:', err);
  process.exit(1);
});
