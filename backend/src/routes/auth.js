import { Router } from 'express';
import { signToken, requireAuth } from '../middleware/auth.js';
import { authenticateUsuario } from '../services/authLogin.js';
import {
  requestPasswordReset,
  resetPasswordWithToken,
  validatePasswordResetToken,
} from '../services/authPasswordReset.js';

const router = Router();

function tokenError(err, res) {
  if (err.name === 'TokenExpiredError') {
    return res.status(410).json({ error: 'El enlace ha expirado. Solicite uno nuevo desde el login.' });
  }
  if (err.name === 'JsonWebTokenError') {
    return res.status(400).json({ error: 'Enlace inválido' });
  }
  if (err.status) return res.status(err.status).json({ error: err.message });
  return null;
}

// Login: usuarios del sistema (ususu) o técnicos de soporte (soport).
router.post('/login', async (req, res, next) => {
  try {
    const { usuario, clave } = req.body;
    const session = await authenticateUsuario(usuario, clave);
    const token = signToken(session.tokenPayload);
    res.json({ token, user: session.user });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

// Solicitud de recuperación (solo técnicos de soporte con correo registrado).
router.post('/recuperar-clave', async (req, res, next) => {
  try {
    const result = await requestPasswordReset(req.body.usuario);
    res.json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

// Valida enlace de recuperación.
router.get('/recuperar-clave/:token', async (req, res, next) => {
  try {
    const info = await validatePasswordResetToken(req.params.token);
    res.json(info);
  } catch (err) {
    const handled = tokenError(err, res);
    if (handled !== null) return handled;
    next(err);
  }
});

// Restablece contraseña desde enlace del correo.
router.post('/recuperar-clave/:token', async (req, res, next) => {
  try {
    const { clave, clave2 } = req.body;
    const result = await resetPasswordWithToken(req.params.token, clave, clave2);
    res.json(result);
  } catch (err) {
    const handled = tokenError(err, res);
    if (handled !== null) return handled;
    next(err);
  }
});

// Datos del usuario autenticado.
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

export default router;
