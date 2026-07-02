import { query } from '../db/pool.js';

function httpError(message, status = 400) {
  const err = new Error(message);
  err.status = status;
  return err;
}

const CATEGORIAS = new Set(['equipo', 'cliente', 'externo']);

function normalize(body) {
  if (body.nombre !== undefined) {
    body.nombre = String(body.nombre || '').trim();
    if (!body.nombre) throw httpError('El nombre es obligatorio');
  }
  if (body.email !== undefined) {
    const email = String(body.email || '').trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw httpError('Correo electrónico inválido');
    }
    body.email = email;
  }
  if (body.categoria !== undefined) {
    const cat = String(body.categoria || 'equipo').trim().toLowerCase();
    body.categoria = CATEGORIAS.has(cat) ? cat : 'equipo';
  }
  if (body.estado !== undefined) {
    body.estado = String(body.estado || 'A').trim().toUpperCase();
  }
  if (body.cliente !== undefined) {
    const cliente = String(body.cliente || '').trim();
    body.cliente = cliente || null;
  }
  if (body.empresa !== undefined) {
    const empresa = String(body.empresa || '').trim();
    body.empresa = empresa || null;
  }
  if (body.telefono !== undefined) {
    const telefono = String(body.telefono || '').trim();
    body.telefono = telefono || null;
  }
  if (body.cargo !== undefined) {
    const cargo = String(body.cargo || '').trim();
    body.cargo = cargo || null;
  }
  if (body.notas !== undefined) {
    const notas = String(body.notas || '').trim();
    body.notas = notas || null;
  }
}

async function assertEmailUnique(email, codigoActual = '') {
  const dup = await query(
    `SELECT 1 FROM agcon
     WHERE LOWER(TRIM(email)) = $1
       AND ($2 = '' OR codigo <> $2)`,
    [email, codigoActual || ''],
  );
  if (dup.rows.length) throw httpError('Ese correo ya está registrado en la agenda', 409);
}

export async function beforeAgconCreate(body) {
  normalize(body);
  await assertEmailUnique(body.email);
}

export async function beforeAgconUpdate(body, ids) {
  normalize(body);
  if (body.email !== undefined) await assertEmailUnique(body.email, ids[0]);
}
