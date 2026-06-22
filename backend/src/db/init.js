// Inicializa la base de datos: crea las tablas y carga datos semilla.
// Uso: npm run db:init
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import { pool } from './pool.js';
import { persistSemanasRango } from '../services/generarSemanas.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function run() {
  const schema = await readFile(join(__dirname, 'schema.sql'), 'utf8');
  console.log('Creando esquema...');
  await pool.query(schema);

  const seed = await readFile(join(__dirname, 'seed.sql'), 'utf8');
  console.log('Cargando datos semilla...');
  await pool.query(seed);

  // Asegura que el usuario ADMIN tenga un hash válido de "admin123".
  const hash = await bcrypt.hash('admin123', 10);
  await pool.query('UPDATE ususu SET clave = $1 WHERE usuario = $2', [hash, 'ADMIN']);

  const year = new Date().getFullYear();
  console.log(`Generando semanas TSEMA (${year}–${year + 1})...`);
  await persistSemanasRango((sql, params) => pool.query(sql, params), year, year + 1);

  console.log('Base de datos inicializada. Usuario: ADMIN / admin123');
  await pool.end();
}

run().catch((err) => {
  console.error('Error inicializando la base de datos:', err);
  process.exit(1);
});
