import bcrypt from 'bcryptjs';
import { query } from '../db/pool.js';
import { createPasswordResetToken, buildPasswordResetUrl, verifySigningToken } from './signingToken.js';
import { sendPasswordResetEmail } from './passwordResetEmail.js';
import { isMailConfigured } from './mailer.js';

const GENERIC_MSG =
  'Si el usuario corresponde a un técnico de soporte activo con correo registrado, recibirá un enlace para restablecer su contraseña.';

function httpError(message, status = 400) {
  const err = new Error(message);
  err.status = status;
  return err;
}

export async function requestPasswordReset(usuario) {
  const login = String(usuario || '').trim().toUpperCase();
  if (!login) throw httpError('Indique su usuario de acceso');

  const sopRes = await query(
    `SELECT codigo, nombre, usuario, email, estado
     FROM soport
     WHERE UPPER(TRIM(usuario)) = $1`,
    [login],
  );
  const soporte = sopRes.rows[0];

  if (!soporte || soporte.estado !== 'A' || !String(soporte.email || '').trim()) {
    return { message: GENERIC_MSG, sent: false };
  }

  if (!isMailConfigured()) {
    throw httpError('El envío de correo no está configurado. Contacte al administrador.', 503);
  }

  const token = createPasswordResetToken({ codigo: soporte.codigo, usuario: soporte.usuario });
  await sendPasswordResetEmail({
    to: soporte.email,
    nombre: soporte.nombre,
    usuario: soporte.usuario,
    url: buildPasswordResetUrl(token),
  });

  return { message: GENERIC_MSG, sent: true };
}

async function loadSoporteFromToken(token) {
  let payload;
  try {
    payload = verifySigningToken(token);
  } catch (err) {
    throw err;
  }
  if (payload.scope !== 'password_reset') throw new Error('Token inválido');

  const sopRes = await query(
    `SELECT codigo, nombre, usuario, estado
     FROM soport
     WHERE codigo = $1 AND UPPER(TRIM(usuario)) = $2`,
    [payload.codigo, payload.usuario],
  );
  const soporte = sopRes.rows[0];
  if (!soporte || soporte.estado !== 'A') {
    throw httpError('El enlace ya no es válido o el usuario está inactivo', 410);
  }
  return soporte;
}

export async function validatePasswordResetToken(token) {
  const soporte = await loadSoporteFromToken(token);
  return {
    nombre: soporte.nombre,
    usuario: soporte.usuario,
  };
}

export async function resetPasswordWithToken(token, clave, clave2) {
  const soporte = await loadSoporteFromToken(token);

  const password = String(clave || '');
  const confirm = String(clave2 ?? clave ?? '');
  if (password.length < 6) {
    throw httpError('La contraseña debe tener al menos 6 caracteres');
  }
  if (password !== confirm) {
    throw httpError('Las contraseñas no coinciden');
  }

  const hash = await bcrypt.hash(password, 10);
  await query('UPDATE soport SET clave = $1 WHERE codigo = $2', [hash, soporte.codigo]);

  return { message: 'Contraseña actualizada. Ya puede iniciar sesión.' };
}
