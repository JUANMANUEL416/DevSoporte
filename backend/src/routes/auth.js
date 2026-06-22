import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../db/pool.js';
import { signToken, requireAuth } from '../middleware/auth.js';

const router = Router();

// Login: equivale a la pantalla de acceso (LOGIN) del sistema Clarion.
router.post('/login', async (req, res, next) => {
  try {
    const { usuario, clave } = req.body;
    if (!usuario || !clave) {
      return res.status(400).json({ error: 'Usuario y clave son obligatorios' });
    }
    const result = await query('SELECT * FROM ususu WHERE usuario = $1', [usuario.toUpperCase()]);
    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: 'Credenciales inválidas' });

    const ok = await bcrypt.compare(clave, user.clave);
    if (!ok) return res.status(401).json({ error: 'Credenciales inválidas' });

    const token = signToken({ usuario: user.usuario, nombre: user.nombre, principal: user.principal });
    res.json({
      token,
      user: { usuario: user.usuario, nombre: user.nombre, principal: user.principal },
    });
  } catch (err) {
    next(err);
  }
});

// Datos del usuario autenticado.
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

export default router;
