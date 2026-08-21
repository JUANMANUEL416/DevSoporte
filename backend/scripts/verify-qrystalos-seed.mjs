import { query } from '../src/db/pool.js';

const m = await query('SELECT COUNT(*)::int AS c FROM qrysmod');
const p = await query('SELECT COUNT(*)::int AS c FROM qrysproc');
const g = await query('SELECT COUNT(*)::int AS c FROM qrysgrupo');
console.log('modulos', m.rows[0].c, 'procesos', p.rows[0].c, 'grupos', g.rows[0].c);

const caja = await query(`
  SELECT g.nombre AS grupo, p.nombre AS proceso, m.nombre AS modulo
  FROM qrysgrupod d
  JOIN qrysgrupo g ON g.codigo = d.grupo
  JOIN qrysproc p ON p.codigo = d.proceso
  LEFT JOIN qrysmod m ON m.codigo = p.modulo
  WHERE LOWER(g.nombre) LIKE '%caja%'
  LIMIT 10
`);
console.log('grupo caja', caja.rows);

process.exit(0);
