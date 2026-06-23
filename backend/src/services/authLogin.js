import bcrypt from 'bcryptjs';
import { query } from '../db/pool.js';

function authError(message, status = 401) {
  const err = new Error(message);
  err.status = status;
  return err;
}

export async function authenticateUsuario(usuario, clave) {
  const login = String(usuario || '').trim().toUpperCase();
  const password = String(clave || '');
  if (!login || !password) {
    throw authError('Usuario y clave son obligatorios', 400);
  }

  const sysRes = await query('SELECT usuario, nombre, clave, principal FROM ususu WHERE usuario = $1', [login]);
  const sysUser = sysRes.rows[0];
  if (sysUser) {
    const ok = await bcrypt.compare(password, sysUser.clave);
    if (!ok) throw authError('Credenciales inválidas');
    return {
      tokenPayload: {
        usuario: sysUser.usuario,
        nombre: sysUser.nombre,
        principal: sysUser.principal ?? 0,
        tipo: 'sistema',
      },
      user: {
        usuario: sysUser.usuario,
        nombre: sysUser.nombre,
        principal: sysUser.principal ?? 0,
        tipo: 'sistema',
      },
    };
  }

  const sopRes = await query(
    `SELECT codigo, nombre, usuario, clave, estado
     FROM soport
     WHERE UPPER(TRIM(usuario)) = $1`,
    [login],
  );
  const soporte = sopRes.rows[0];
  if (!soporte) throw authError('Credenciales inválidas');

  if (soporte.estado !== 'A') {
    throw authError('Usuario inactivo. Contacte al administrador.', 403);
  }
  if (!soporte.clave) {
    throw authError('Credenciales inválidas');
  }

  const ok = await bcrypt.compare(password, soporte.clave);
  if (!ok) throw authError('Credenciales inválidas');

  return {
    tokenPayload: {
      usuario: soporte.usuario,
      nombre: soporte.nombre || soporte.usuario,
      principal: 0,
      tipo: 'soporte',
      codigo: soporte.codigo,
    },
    user: {
      usuario: soporte.usuario,
      nombre: soporte.nombre || soporte.usuario,
      principal: 0,
      tipo: 'soporte',
      codigo: soporte.codigo,
    },
  };
}
