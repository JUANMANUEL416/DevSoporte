// Limpia la BD conservando correo_plantilla y recarga datos base.
// Uso: npm run db:clean
import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import { pool } from './pool.js';
import { persistSemanasRango } from '../services/generarSemanas.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function run() {
  const limpiar = await readFile(join(__dirname, 'scripts/limpiar_datos.sql'), 'utf8');
  console.log('Limpiando datos (conservando correo_plantilla)...');
  await pool.query(limpiar);

  const seed = await readFile(join(__dirname, 'seed-minimal.sql'), 'utf8');
  console.log('Cargando datos base (admin, catálogos, consecutivos en cero)...');
  await pool.query(seed);

  const hash = await bcrypt.hash('admin123', 10);
  await pool.query('UPDATE ususu SET clave = $1 WHERE usuario = $2', [hash, 'ADMIN']);

  const year = new Date().getFullYear();
  console.log(`Generando semanas TSEMA (${year}–${year + 1})...`);
  await persistSemanasRango((sql, params) => pool.query(sql, params), year, year + 1);

  const { rows } = await pool.query(
    `SELECT id,
            LEFT(cuerpo_template, 50) AS plantilla_preview,
            firma_texto IS NOT NULL AS tiene_firma_texto,
            firma_imagen IS NOT NULL AS tiene_firma_imagen,
            firma_html IS NOT NULL AS tiene_firma_html
     FROM correo_plantilla WHERE id = 1`,
  );
  console.log('Plantilla de correo conservada:', rows[0]);
  console.log('Listo. Usuario: ADMIN / admin123');
  await pool.end();
}

run().catch((err) => {
  console.error('Error limpiando la base de datos:', err);
  process.exit(1);
});
