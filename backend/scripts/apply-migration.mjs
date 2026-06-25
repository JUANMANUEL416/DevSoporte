import { readFile } from 'node:fs/promises';
import { query } from '../src/db/pool.js';

const file = process.argv[2];
if (!file) {
  console.error('Uso: node scripts/apply-migration.mjs <archivo.sql>');
  process.exit(1);
}

const sql = await readFile(file, 'utf8');
await query(sql);
console.log(`Migración aplicada: ${file}`);
