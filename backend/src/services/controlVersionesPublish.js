import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { query } from '../db/pool.js';

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '../../..');

export function readVersionFile() {
  return readFileSync(join(rootDir, 'VERSION'), 'utf8').trim();
}

function syncPackageJsonVersion(version) {
  for (const rel of ['package.json', 'backend/package.json', 'frontend/package.json']) {
    const path = join(rootDir, rel);
    try {
      const pkg = JSON.parse(readFileSync(path, 'utf8'));
      if (pkg.version !== version) {
        pkg.version = version;
        writeFileSync(path, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8');
      }
    } catch {
      // omitir si no existe
    }
  }
}

export function writeVersionFile(version) {
  writeFileSync(join(rootDir, 'VERSION'), `${version}\n`, 'utf8');
  syncPackageJsonVersion(version);
}

export async function listIntegrados(consecutivos = null) {
  if (consecutivos?.length) {
    const res = await query(
      `SELECT * FROM devcamb
       WHERE consecutivo = ANY($1::text[]) AND estado = 'integrado'
       ORDER BY f_inicio`,
      [consecutivos],
    );
    return res.rows;
  }
  const res = await query(
    `SELECT * FROM devcamb WHERE estado = 'integrado' ORDER BY f_inicio`,
  );
  return res.rows;
}

export async function publicarVersion({
  version,
  resumen = null,
  changelog = null,
  consecutivos,
  usuario = null,
}) {
  if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
    const err = new Error('Indique una versión semver válida (ej. 1.2.0)');
    err.status = 400;
    throw err;
  }
  if (!Array.isArray(consecutivos) || !consecutivos.length) {
    const err = new Error('Seleccione al menos un cambio integrado');
    err.status = 400;
    throw err;
  }

  const integrados = await listIntegrados(consecutivos);
  if (integrados.length !== consecutivos.length) {
    const err = new Error('Solo se pueden publicar cambios en estado integrado');
    err.status = 400;
    throw err;
  }

  const resumenFinal = resumen
    || integrados.map((r) => r.titulo).join('; ');
  const changelogFinal = changelog
    || integrados.map((r) => `- ${r.titulo}: ${r.cambios || r.descripcion || ''}`).join('\n');

  await query(
    `INSERT INTO devver (version, resumen, changelog, usuario)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (version) DO UPDATE
     SET resumen = EXCLUDED.resumen,
         changelog = EXCLUDED.changelog,
         fecha = NOW(),
         usuario = EXCLUDED.usuario`,
    [version, resumenFinal, changelogFinal, usuario],
  );

  const published = await query(
    `UPDATE devcamb
     SET estado = 'publicado',
         version = $1,
         f_publicacion = NOW(),
         f_terminacion = COALESCE(f_terminacion, NOW())
     WHERE consecutivo = ANY($2::text[])
     RETURNING *`,
    [version, consecutivos],
  );

  writeVersionFile(version);

  return {
    version,
    resumen: resumenFinal,
    changelog: changelogFinal,
    publicados: published.rows.length,
    cambios: published.rows,
  };
}
