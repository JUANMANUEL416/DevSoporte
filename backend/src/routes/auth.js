import { Router } from 'express';
import { signToken, requireAuth } from '../middleware/auth.js';
import { authenticateUsuario } from '../services/authLogin.js';

const router = Router();

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

// Datos del usuario autenticado.
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

export default router;
