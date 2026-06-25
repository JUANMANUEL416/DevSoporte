import { readFile, readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import pg from 'pg';
import { persistSemanasRango } from '../../services/generarSemanas.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbRoot = join(__dirname, '..');

function poolConfig(database) {
  return {
    host: process.env.PGHOST || 'localhost',
    port: Number(process.env.PGPORT) || 5432,
    database,
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || 'postgres',
  };
}

export async function withPool(database, fn) {
  const pool = new pg.Pool(poolConfig(database));
  try {
    return await fn((text, params) => pool.query(text, params));
  } finally {
    await pool.end();
  }
}

export async function ensureDatabase(targetDb) {
  const adminDb = process.env.PGADMINDB || 'postgres';
  await withPool(adminDb, async (query) => {
    const exists = await query('SELECT 1 FROM pg_database WHERE datname = $1', [targetDb]);
    if (exists.rows.length) {
      console.log(`Base de datos "${targetDb}" ya existe.`);
      return;
    }
    await query(`CREATE DATABASE "${targetDb}"`);
    console.log(`Base de datos "${targetDb}" creada.`);
  });
}

async function readSql(name) {
  return readFile(join(dbRoot, name), 'utf8');
}

async function runMigrations(query) {
  const dir = join(dbRoot, 'migrations');
  const files = (await readdir(dir))
    .filter((f) => f.endsWith('.sql'))
    .sort();
  for (const file of files) {
    const sql = await readFile(join(dir, file), 'utf8');
    console.log(`  Migración ${file}...`);
    await query(sql);
  }
}

export async function applySchemaAndMigrations(query) {
  console.log('Aplicando schema.sql...');
  await query(await readSql('schema.sql'));
  console.log('Aplicando migraciones...');
  await runMigrations(query);
}

export async function loadDatosPruebas(query) {
  console.log('Cargando datos de prueba...');
  await query(await readFile(join(__dirname, 'datos-pruebas.sql'), 'utf8'));
}

export async function resetDatosBase(query) {
  console.log('Limpiando datos...');
  await query(await readSql('scripts/limpiar_datos.sql'));
  console.log('Cargando datos base...');
  await query(await readSql('seed-minimal.sql'));
  await loadDatosPruebas(query);

  const hash = await bcrypt.hash('admin123', 10);
  await query('UPDATE ususu SET clave = $1 WHERE usuario = $2', [hash, 'ADMIN']);

  const year = new Date().getFullYear();
  console.log(`Generando semanas TSEMA (${year}–${year + 1})...`);
  await persistSemanasRango(query, year, year + 1);
}

export async function initPruebasDatabase() {
  const targetDb = process.env.PGDATABASE || 'devsoporte_pruebas';
  await ensureDatabase(targetDb);
  await withPool(targetDb, async (query) => {
    await applySchemaAndMigrations(query);
    await resetDatosBase(query);
  });
  console.log(`\nEntorno de pruebas listo en "${targetDb}". Usuario: ADMIN / admin123`);
}

export async function restorePruebasDatabase() {
  const targetDb = process.env.PGDATABASE || 'devsoporte_pruebas';
  await withPool(targetDb, async (query) => {
    await resetDatosBase(query);
  });
  console.log(`\nBase "${targetDb}" restaurada al estado de prueba inicial.`);
}
