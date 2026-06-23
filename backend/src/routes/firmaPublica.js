import { Router } from 'express';
import { query } from '../db/pool.js';
import { verifySigningToken } from '../services/signingToken.js';
import {
  loadAsistenteContext,
  sendFirmaLinkEmail,
  sendFirmasPendientes,
  emailSkipReasonMessage,
} from '../services/firmaEmail.js';
import { loadInvitePublicContext, registerAsistenteFromInvite } from '../services/registroAsistente.js';
import { loadBitacoraFirmaContext, saveBitacoraFirma, getBitacoraFirmaEstado } from '../services/bitacoraFirma.js';
import { getActproyFirmaEstado, saveActproyFirma } from '../services/actproyFirma.js';

function validateFirmaDataUrl(firma) {
  if (!firma || typeof firma !== 'string') return false;
  if (!/^data:image\/(jpe?g|png);base64,/i.test(firma)) return false;
  if (firma.length > 600000) return false;
  return true;
}

async function saveFirma({ cnscapacita, item, documento, firma }) {
  const check = await query(
    `SELECT documento FROM rasistd WHERE cnscapacita = $1 AND item = $2`,
    [cnscapacita, item],
  );
  if (!check.rows.length) {
    const err = new Error('Asistente no encontrado');
    err.status = 404;
    throw err;
  }
  if (String(check.rows[0].documento) !== String(documento)) {
    const err = new Error('Token no válido para este asistente');
    err.status = 403;
    throw err;
  }

  const result = await query(
    `UPDATE rasistd SET firma = $1, firma_fecha = NOW()
     WHERE cnscapacita = $2 AND item = $3
     RETURNING cnscapacita, item, documento, nombres, firma_fecha`,
    [firma, cnscapacita, item],
  );
  return result.rows[0];
}

export const publicFirmaRouter = Router();

publicFirmaRouter.get('/:token', async (req, res, next) => {
  try {
    const payload = verifySigningToken(req.params.token);

    if (payload.scope === 'invite') {
      const row = await loadInvitePublicContext(payload.inviteId, payload.cnscapacita);
      if (!row) return res.status(404).json({ error: 'Invitación no encontrada' });

      return res.json({
        mode: 'invite',
        email: row.email,
        documento: row.documento || '',
        nombres: row.nombres || '',
        cargo: row.cargo || '',
        tema: row.tema,
        fecha: row.fecha,
        capacitador: row.capacitador,
        cliente: row.nombrecliente || row.cliente,
        registrado: Boolean(row.registrado),
        firmado: Boolean(row.firma && String(row.firma).trim()),
        firma_fecha: row.firma_fecha || null,
      });
    }

    if (payload.scope === 'bitacora_firma') {
      const estado = await getBitacoraFirmaEstado(payload.cnssoporte);
      if (!estado) return res.status(404).json({ error: 'Registro de soporte no encontrado' });
      const row = estado.row;

      return res.json({
        mode: 'bitacora',
        cnssoporte: row.cnssoporte,
        cliente: row.nombrecliente || row.cliente,
        funcionario: row.funcionario || '',
        fecha: row.fecha,
        fechar: row.fechar,
        clase: row.clase,
        medio: row.medio,
        soporte: row.soporte,
        solicitud: row.solicitud,
        respuesta: row.respuesta,
        observaciones: row.observaciones,
        estado: row.estado,
        firmado: Boolean(row.firma && String(row.firma).trim()),
        firma_fecha: row.firma_fecha || null,
        puedeFirmar: estado.puedeFirmar,
        bloqueoMotivo: estado.bloqueoMotivo || '',
      });
    }

    if (payload.scope === 'actproy_firma') {
      const estado = await getActproyFirmaEstado(payload.consecutivo);
      if (!estado) return res.status(404).json({ error: 'Informe no encontrado' });
      const row = estado.row;
      return res.json({
        mode: 'actproy',
        consecutivo: row.consecutivo,
        cliente: row.nombrecliente || row.cliente,
        ingeniero: row.ingeniero || '',
        fecha: row.fecha,
        ciudad: row.ciudad || '',
        duracion: row.duracion || '',
        actividades: row.actividades || '',
        pendientes: row.pendientes || '',
        firmado: Boolean(row.firma_cli && String(row.firma_cli).trim()),
        firma_fecha: row.firma_cli_fecha || null,
        puedeFirmar: estado.puedeFirmar,
        bloqueoMotivo: estado.bloqueoMotivo || '',
      });
    }

    if (payload.scope !== 'firma') {
      return res.status(400).json({ error: 'Enlace de firma inválido' });
    }

    const row = await loadAsistenteContext(payload.cnscapacita, payload.item);
    if (!row) return res.status(404).json({ error: 'Asistente no encontrado' });

    res.json({
      mode: 'firma',
      nombres: row.nombres,
      documento: row.documento,
      cargo: row.cargo,
      tema: row.tema,
      fecha: row.fecha,
      capacitador: row.capacitador,
      cliente: row.nombrecliente || row.cliente,
      firmado: Boolean(row.firma && String(row.firma).trim()),
      firma_fecha: row.firma_fecha || null,
    });
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(410).json({ error: 'El enlace de firma ha expirado' });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(400).json({ error: 'Enlace de firma inválido' });
    }
    next(err);
  }
});

publicFirmaRouter.post('/:token', async (req, res, next) => {
  try {
    const payload = verifySigningToken(req.params.token);
    const { firma, documento, nombres, cargo } = req.body || {};

    if (payload.scope === 'invite') {
      if (!validateFirmaDataUrl(firma)) {
        return res.status(400).json({ error: 'Firma inválida' });
      }
      const saved = await registerAsistenteFromInvite({
        inviteId: payload.inviteId,
        cnscapacita: payload.cnscapacita,
        email: payload.email,
        documento,
        nombres,
        cargo,
        firma,
      });
      return res.json({
        ok: true,
        message: 'Registro y firma guardados correctamente',
        firma_fecha: saved.firma_fecha,
      });
    }

    if (!validateFirmaDataUrl(firma)) {
      return res.status(400).json({ error: 'Firma inválida' });
    }

    if (payload.scope === 'bitacora_firma') {
      if (!validateFirmaDataUrl(firma)) {
        return res.status(400).json({ error: 'Firma inválida' });
      }
      const saved = await saveBitacoraFirma(payload.cnssoporte, firma);
      return res.json({
        ok: true,
        message: 'Firma de aceptación registrada correctamente',
        firma_fecha: saved.firma_fecha,
      });
    }

    if (payload.scope === 'actproy_firma') {
      if (!validateFirmaDataUrl(firma)) {
        return res.status(400).json({ error: 'Firma inválida' });
      }
      const saved = await saveActproyFirma(payload.consecutivo, firma, nombres);
      return res.json({
        ok: true,
        message: 'Firma del informe registrada correctamente',
        firma_fecha: saved.firma_fecha,
      });
    }

    if (payload.scope !== 'firma') {
      return res.status(400).json({ error: 'Enlace de firma inválido' });
    }

    const saved = await saveFirma({ ...payload, firma });
    res.json({
      ok: true,
      message: 'Firma registrada correctamente',
      firma_fecha: saved.firma_fecha,
    });
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(410).json({ error: 'El enlace de firma ha expirado' });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(400).json({ error: 'Enlace de firma inválido' });
    }
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

export async function enviarFirmaAsistenteHandler(req, res, next) {
  try {
    const parts = String(req.params.id).split('~');
    if (parts.length !== 2) return res.status(400).json({ error: 'Id inválido' });
    const [cnscapacita, item] = parts;

    const exists = await query(
      'SELECT cnscapacita, item, documento, nombres FROM rasistd WHERE cnscapacita = $1 AND item = $2',
      [cnscapacita, Number(item)],
    );
    if (!exists.rows.length) return res.status(404).json({ error: 'Asistente no encontrado' });

    const result = await sendFirmaLinkEmail(exists.rows[0]);
    if (!result.sent) {
      const msg = emailSkipReasonMessage(result.reason);
      const status = result.reason === 'smtp_no_configurado' ? 503 : 422;
      return res.status(status).json({ error: msg, reason: result.reason });
    }
    res.json({ ok: true, email: result.email, nombres: result.nombres });
  } catch (err) {
    next(err);
  }
}

export async function enviarFirmasCapacitacionHandler(req, res, next) {
  try {
    const cnscapacita = req.params.id;
    const cap = await query('SELECT 1 FROM rasist WHERE cnscapacita = $1', [cnscapacita]);
    if (!cap.rows.length) return res.status(404).json({ error: 'Capacitación no encontrada' });

    const result = await sendFirmasPendientes(cnscapacita);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export { saveFirma, validateFirmaDataUrl };
