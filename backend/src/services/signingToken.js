import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'dev-secret';

export function createSigningToken({ cnscapacita, item, documento }) {
  const days = Number(process.env.SIGNING_TOKEN_EXPIRES_DAYS) || 14;
  return jwt.sign(
    {
      scope: 'firma',
      cnscapacita: String(cnscapacita),
      item: Number(item),
      documento: String(documento),
    },
    SECRET,
    { expiresIn: `${days}d` },
  );
}

export function createInviteToken({ cnscapacita, inviteId, email }) {
  const days = Number(process.env.SIGNING_TOKEN_EXPIRES_DAYS) || 14;
  return jwt.sign(
    {
      scope: 'invite',
      cnscapacita: String(cnscapacita),
      inviteId: Number(inviteId),
      email: String(email).trim().toLowerCase(),
    },
    SECRET,
    { expiresIn: `${days}d` },
  );
}

export function verifySigningToken(token) {
  const payload = jwt.verify(token, SECRET);
  if (payload.scope === 'registro') {
    if (!payload.cnscapacita) throw new Error('Token inválido');
    return payload;
  }
  if (payload.scope === 'invite') {
    if (!payload.cnscapacita || payload.inviteId == null || !payload.email) {
      throw new Error('Token inválido');
    }
    return payload;
  }
  if (payload.scope === 'firma') {
    if (!payload.cnscapacita || payload.item == null || !payload.documento) {
      throw new Error('Token inválido');
    }
    return payload;
  }
  if (payload.scope === 'bitacora_firma') {
    if (!payload.cnssoporte) throw new Error('Token inválido');
    return payload;
  }
  if (payload.scope === 'actproy_firma') {
    if (!payload.consecutivo) throw new Error('Token inválido');
    return payload;
  }
  throw new Error('Token inválido');
}

export function createRegistroToken(cnscapacita) {
  const days = Number(process.env.REGISTRO_TOKEN_EXPIRES_DAYS) || 365;
  return jwt.sign(
    { scope: 'registro', cnscapacita: String(cnscapacita) },
    SECRET,
    { expiresIn: `${days}d` },
  );
}

export function createBitacoraFirmaToken({ cnssoporte, documento }) {
  const days = Number(process.env.SIGNING_TOKEN_EXPIRES_DAYS) || 14;
  const payload = {
    scope: 'bitacora_firma',
    cnssoporte: String(cnssoporte),
  };
  if (documento) payload.documento = String(documento);
  return jwt.sign(payload, SECRET, { expiresIn: `${days}d` });
}

export function createActproyFirmaToken({ consecutivo }) {
  const days = Number(process.env.SIGNING_TOKEN_EXPIRES_DAYS) || 14;
  return jwt.sign(
    {
      scope: 'actproy_firma',
      consecutivo: String(consecutivo),
    },
    SECRET,
    { expiresIn: `${days}d` },
  );
}

export function buildRegistroUrl(token) {
  const base = (process.env.PUBLIC_APP_URL || 'http://localhost:9020').replace(/\/$/, '');
  return `${base}/?registro=${encodeURIComponent(token)}`;
}

export function buildFirmaUrl(token) {
  const base = (process.env.PUBLIC_APP_URL || 'http://localhost:9020').replace(/\/$/, '');
  // Query ?firma= se conserva en clientes de correo (Gmail suele perder el fragmento #/...).
  return `${base}/?firma=${encodeURIComponent(token)}`;
}
