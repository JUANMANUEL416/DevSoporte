import { pool } from '../db/pool.js';
import { query } from '../db/pool.js';
import { createRegistroToken, verifySigningToken } from './signingToken.js';

export async function nextAsistenteItem(cnscapacita, client = pool) {
  const q = client.query.bind(client);
  const res = await q(
    `SELECT COALESCE(MAX(item), 0) + 1 AS next FROM rasistd WHERE cnscapacita = $1`,
    [cnscapacita],
  );
  return Number(res.rows[0].next);
}

async function upsertAsistenteCapacitacion(client, { cnscapacita, cliente, documento, nombres, cargo, email, firma }) {
  const doc = String(documento || '').trim();
  const nom = String(nombres || '').trim();
  const car = String(cargo || '').trim();
  const mail = email ? String(email).trim() : null;

  if (!doc || !nom) {
    const err = new Error('Documento y nombres son obligatorios');
    err.status = 400;
    throw err;
  }

  await client.query(
    `INSERT INTO clief (codigo, documento, nombre, cargo, estado, email)
     VALUES ($1, $2, $3, $4, 'Activo', $5)
     ON CONFLICT (codigo, documento) DO UPDATE SET
       nombre = EXCLUDED.nombre,
       cargo = COALESCE(NULLIF(EXCLUDED.cargo, ''), clief.cargo),
       email = COALESCE(NULLIF(EXCLUDED.email, ''), clief.email),
       estado = 'Activo'`,
    [cliente, doc, nom, car || null, mail],
  );

  const dup = await client.query(
    `SELECT item, firma FROM rasistd WHERE cnscapacita = $1 AND documento = $2`,
    [cnscapacita, doc],
  );

  let item;
  let yaRegistrado = false;

  if (dup.rows.length) {
    yaRegistrado = true;
    item = dup.rows[0].item;
    await client.query(
      `UPDATE rasistd SET nombres = $1, cargo = $2, firma = $3, firma_fecha = NOW()
       WHERE cnscapacita = $4 AND item = $5`,
      [nom, car || null, firma, cnscapacita, item],
    );
  } else {
    item = await nextAsistenteItem(cnscapacita, client);
    await client.query(
      `INSERT INTO rasistd (cnscapacita, item, documento, nombres, cargo, firma, firma_fecha)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [cnscapacita, item, doc, nom, car || null, firma],
    );
  }

  return { cnscapacita, item, documento: doc, nombres: nom, yaRegistrado, firma_fecha: new Date() };
}

export async function registerAsistentePublico({ cnscapacita, documento, nombres, cargo, email, firma }) {
  const mail = String(email || '').trim();
  if (!mail) {
    const err = new Error('El correo es obligatorio');
    err.status = 400;
    throw err;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) {
    const err = new Error('Correo inválido');
    err.status = 400;
    throw err;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const capRes = await client.query(
      `SELECT r.cliente FROM rasist r WHERE r.cnscapacita = $1`,
      [cnscapacita],
    );
    if (!capRes.rows.length) {
      const err = new Error('Capacitación no encontrada');
      err.status = 404;
      throw err;
    }
    const { cliente } = capRes.rows[0];
    if (!cliente) {
      const err = new Error('La capacitación no tiene cliente asignado');
      err.status = 422;
      throw err;
    }

    const result = await upsertAsistenteCapacitacion(client, {
      cnscapacita,
      cliente,
      documento,
      nombres,
      cargo,
      email: mail,
      firma,
    });

    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function loadRegistroPublicContext(cnscapacita) {
  const res = await query(
    `SELECT r.cnscapacita, r.tema, r.fecha, r.capacitador, r.cliente,
            c.nombrecliente
     FROM rasist r
     LEFT JOIN clie c ON c.codigo = r.cliente
     WHERE r.cnscapacita = $1`,
    [cnscapacita],
  );
  return res.rows[0] || null;
}

export async function getOrCreateRegistroToken(cnscapacita) {
  const existing = await query('SELECT registro_token FROM rasist WHERE cnscapacita = $1', [cnscapacita]);
  if (!existing.rows.length) return null;

  const saved = existing.rows[0].registro_token;
  if (saved) {
    try {
      const payload = verifySigningToken(saved);
      if (payload.scope === 'registro' && payload.cnscapacita === cnscapacita) {
        return saved;
      }
    } catch {
      /* regenerar si expiró o es inválido */
    }
  }

  const token = createRegistroToken(cnscapacita);
  await query('UPDATE rasist SET registro_token = $1 WHERE cnscapacita = $2', [token, cnscapacita]);
  return token;
}

export async function registerAsistenteFromInvite({
  inviteId,
  email,
  documento,
  nombres,
  cargo,
  firma,
}) {
  const doc = String(documento || '').trim();
  const nom = String(nombres || '').trim();
  const car = String(cargo || '').trim();
  if (!doc || !nom) {
    const err = new Error('Documento y nombres son obligatorios');
    err.status = 400;
    throw err;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const invRes = await client.query(
      `SELECT * FROM rasist_invite WHERE id = $1 AND cnscapacita = $2 FOR UPDATE`,
      [inviteId, cnscapacita],
    );
    if (!invRes.rows.length) {
      const err = new Error('Invitación no encontrada');
      err.status = 404;
      throw err;
    }
    const invite = invRes.rows[0];
    if (invite.email.trim().toLowerCase() !== String(email).trim().toLowerCase()) {
      const err = new Error('Token no válido para esta invitación');
      err.status = 403;
      throw err;
    }

    const capRes = await client.query(
      `SELECT r.cliente, c.nombrecliente
       FROM rasist r
       LEFT JOIN clie c ON c.codigo = r.cliente
       WHERE r.cnscapacita = $1`,
      [cnscapacita],
    );
    if (!capRes.rows.length) {
      const err = new Error('Capacitación no encontrada');
      err.status = 404;
      throw err;
    }
    const { cliente } = capRes.rows[0];
    if (!cliente) {
      const err = new Error('La capacitación no tiene cliente asignado');
      err.status = 422;
      throw err;
    }

    const result = await upsertAsistenteCapacitacion(client, {
      cnscapacita,
      cliente,
      documento: doc,
      nombres: nom,
      cargo: car,
      email: invite.email.trim(),
      firma,
    });

    await client.query(
      `UPDATE rasist_invite SET documento = $1, item = $2, registrado = NOW()
       WHERE id = $3`,
      [result.documento, result.item, inviteId],
    );

    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function loadInvitePublicContext(inviteId, cnscapacita) {
  const res = await query(
    `SELECT i.id, i.email, i.documento, i.item, i.registrado, i.enviado,
            r.tema, r.fecha, r.capacitador, r.cliente,
            c.nombrecliente,
            d.nombres, d.cargo, d.firma, d.firma_fecha
     FROM rasist_invite i
     JOIN rasist r ON r.cnscapacita = i.cnscapacita
     LEFT JOIN clie c ON c.codigo = r.cliente
     LEFT JOIN rasistd d ON d.cnscapacita = i.cnscapacita AND d.item = i.item
     WHERE i.id = $1 AND i.cnscapacita = $2`,
    [inviteId, cnscapacita],
  );
  return res.rows[0] || null;
}
