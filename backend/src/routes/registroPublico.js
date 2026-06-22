import { Router } from 'express';
import { verifySigningToken, buildRegistroUrl } from '../services/signingToken.js';
import {
  loadRegistroPublicContext,
  registerAsistentePublico,
  getOrCreateRegistroToken,
} from '../services/registroAsistente.js';
import { validateFirmaDataUrl } from './firmaPublica.js';
import { query } from '../db/pool.js';

export const publicRegistroRouter = Router();

publicRegistroRouter.get('/:token', async (req, res, next) => {
  try {
    const payload = verifySigningToken(req.params.token);
    if (payload.scope !== 'registro') {
      return res.status(400).json({ error: 'Enlace inválido' });
    }

    const row = await loadRegistroPublicContext(payload.cnscapacita);
    if (!row) return res.status(404).json({ error: 'Capacitación no encontrada' });

    res.json({
      cnscapacita: row.cnscapacita,
      tema: row.tema,
      fecha: row.fecha,
      capacitador: row.capacitador,
      cliente: row.nombrecliente || row.cliente,
    });
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(410).json({ error: 'El enlace ha expirado. Solicite uno nuevo al administrador.' });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(400).json({ error: 'Enlace inválido' });
    }
    next(err);
  }
});

publicRegistroRouter.post('/:token', async (req, res, next) => {
  try {
    const payload = verifySigningToken(req.params.token);
    if (payload.scope !== 'registro') {
      return res.status(400).json({ error: 'Enlace inválido' });
    }

    const { documento, nombres, cargo, email, firma } = req.body || {};
    if (!validateFirmaDataUrl(firma)) {
      return res.status(400).json({ error: 'Firma inválida' });
    }

    const result = await registerAsistentePublico({
      cnscapacita: payload.cnscapacita,
      documento,
      nombres,
      cargo,
      email,
      firma,
    });

    res.json({
      ok: true,
      message: result.yaRegistrado
        ? 'Ya estaba en la capacitación; firma actualizada'
        : 'Registro y firma guardados correctamente',
      yaRegistrado: result.yaRegistrado,
      firma_fecha: result.firma_fecha,
    });
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(410).json({ error: 'El enlace ha expirado' });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(400).json({ error: 'Enlace inválido' });
    }
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

export async function registroLinkHandler(req, res, next) {
  try {
    const cnscapacita = req.params.id;
    const cap = await query('SELECT cliente FROM rasist WHERE cnscapacita = $1', [cnscapacita]);
    if (!cap.rows.length) return res.status(404).json({ error: 'Capacitación no encontrada' });
    if (!cap.rows[0].cliente) {
      return res.status(422).json({ error: 'Asigne un cliente a la capacitación antes de compartir el enlace' });
    }

    const token = await getOrCreateRegistroToken(cnscapacita);
    if (!token) return res.status(404).json({ error: 'Capacitación no encontrada' });

    res.json({ url: buildRegistroUrl(token), token });
  } catch (err) {
    next(err);
  }
}
