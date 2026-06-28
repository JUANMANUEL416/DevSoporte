import bcrypt from 'bcryptjs';
import { query } from '../db/pool.js';
import { validateFirmaDataUrl } from '../routes/firmaPublica.js';

function httpError(message, status = 400) {
  const err = new Error(message);
  err.status = status;
  return err;
}

async function hashClaveIfPresent(body) {
  if (body.clave === undefined) return;
  const clave = String(body.clave || '').trim();
  if (!clave) {
    delete body.clave;
    return;
  }
  if (!body.usuario || !String(body.usuario).trim()) {
    throw httpError('Debe indicar el usuario de acceso al asignar contraseña');
  }
  body.clave = await bcrypt.hash(clave, 10);
}

async function normalizeUsuario(body, codigoActual = '') {
  if (body.usuario === undefined) return;
  const usuario = String(body.usuario || '').trim().toUpperCase();
  body.usuario = usuario || null;

  if (!usuario) {
    if (body.clave !== undefined && String(body.clave || '').trim()) {
      throw httpError('Debe indicar el usuario de acceso al asignar contraseña');
    }
    return;
  }

  const dupSys = await query('SELECT 1 FROM ususu WHERE usuario = $1', [usuario]);
  if (dupSys.rows.length) {
    throw httpError('Ese usuario ya está registrado en usuarios del sistema', 409);
  }

  const dupSop = await query(
    `SELECT 1 FROM soport
     WHERE UPPER(TRIM(usuario)) = $1
       AND ($2 = '' OR codigo <> $2)`,
    [usuario, codigoActual || ''],
  );
  if (dupSop.rows.length) {
    throw httpError('Ese usuario ya está asignado a otro técnico', 409);
  }
}

function applyFirmaRules(body) {
  if (body.firma === undefined) return;
  const firma = body.firma;
  if (firma === null || String(firma).trim() === '') {
    body.firma = null;
    body.firma_fecha = null;
    return;
  }
  if (!validateFirmaDataUrl(firma)) {
    throw httpError('Imagen de firma inválida (PNG/JPG, máx. ~600 KB)');
  }
  body.firma_fecha = new Date().toISOString();
}

function normalizeEmail(body) {
  if (body.email === undefined) return;
  const email = String(body.email || '').trim().toLowerCase();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw httpError('Correo electrónico inválido');
  }
  body.email = email || null;
}

export async function beforeSoportCreate(body) {
  await normalizeUsuario(body);
  normalizeEmail(body);
  await hashClaveIfPresent(body);
  applyFirmaRules(body);
}

export async function beforeSoportUpdate(body, ids) {
  await normalizeUsuario(body, ids[0]);
  normalizeEmail(body);
  await hashClaveIfPresent(body);
  if (body.firma !== undefined) {
    const current = await query('SELECT firma FROM soport WHERE codigo = $1', [ids[0]]);
    const prev = current.rows[0]?.firma || '';
    const next = body.firma || '';
    if (String(prev) === String(next)) {
      delete body.firma;
    } else {
      applyFirmaRules(body);
    }
  }
}
