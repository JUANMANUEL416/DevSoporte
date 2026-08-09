import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'cambie-este-secreto-en-produccion';
const EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';

export const REFRESH_TOKEN_HEADER = 'X-Refresh-Token';

function expiresInToSeconds(value) {
  const m = String(value || '8h').trim().match(/^(\d+(?:\.\d+)?)([smhd])?$/i);
  if (!m) return 8 * 3600;
  const n = parseFloat(m[1]);
  const unit = (m[2] || 's').toLowerCase();
  const mult = { s: 1, m: 60, h: 3600, d: 86400 };
  return Math.floor(n * (mult[unit] || 1));
}

export function signToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN });
}

/** Renueva el JWT con la misma vigencia desde ahora (sliding session). */
export function refreshTokenPayload(payload) {
  const { iat, exp, nbf, ...rest } = payload;
  return signToken(rest);
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'No autenticado' });
  }
  try {
    req.user = jwt.verify(token, SECRET);
    const renewed = refreshTokenPayload(req.user);
    res.setHeader(REFRESH_TOKEN_HEADER, renewed);
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

export { expiresInToSeconds, EXPIRES_IN };
