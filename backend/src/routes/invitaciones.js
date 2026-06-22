import { Router } from 'express';
import { query } from '../db/pool.js';
import { parseEmailList, sendInviteLinkEmail, emailSkipReasonMessage } from '../services/invitacionEmail.js';

export const invitacionesRouter = Router({ mergeParams: true });

invitacionesRouter.get('/', async (req, res, next) => {
  try {
    const cnscapacita = req.params.id;
    const rows = await query(
      `SELECT i.id, i.email, i.documento, i.item, i.enviado, i.registrado, i.created_at,
              (d.firma IS NOT NULL AND TRIM(d.firma) <> '') AS firmado,
              d.nombres
       FROM rasist_invite i
       LEFT JOIN rasistd d ON d.cnscapacita = i.cnscapacita AND d.item = i.item
       WHERE i.cnscapacita = $1
       ORDER BY i.created_at DESC`,
      [cnscapacita],
    );
    res.json({ data: rows.rows });
  } catch (err) {
    next(err);
  }
});

invitacionesRouter.post('/', async (req, res, next) => {
  try {
    const cnscapacita = req.params.id;
    const cap = await query('SELECT 1 FROM rasist WHERE cnscapacita = $1', [cnscapacita]);
    if (!cap.rows.length) return res.status(404).json({ error: 'Capacitación no encontrada' });

    const emails = parseEmailList(req.body?.emails ?? req.body?.text ?? '');
    if (!emails.length) return res.status(400).json({ error: 'Indique al menos un correo válido' });

    const inserted = [];
    const skipped = [];
    for (const email of emails) {
      try {
        const r = await query(
          `INSERT INTO rasist_invite (cnscapacita, email) VALUES ($1, $2)
           ON CONFLICT (cnscapacita, email) DO NOTHING
           RETURNING id, email`,
          [cnscapacita, email],
        );
        if (r.rows.length) inserted.push(r.rows[0]);
        else skipped.push({ email, reason: 'duplicado' });
      } catch (err) {
        skipped.push({ email, reason: err.message });
      }
    }
    res.status(201).json({ inserted: inserted.length, skipped: skipped.length, emails: inserted, skippedDetails: skipped });
  } catch (err) {
    next(err);
  }
});

invitacionesRouter.delete('/:inviteId', async (req, res, next) => {
  try {
    const cnscapacita = req.params.id;
    const r = await query(
      'DELETE FROM rasist_invite WHERE id = $1 AND cnscapacita = $2 RETURNING id',
      [Number(req.params.inviteId), cnscapacita],
    );
    if (!r.rows.length) return res.status(404).json({ error: 'Invitación no encontrada' });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

invitacionesRouter.post('/enviar', async (req, res, next) => {
  try {
    const cnscapacita = req.params.id;
    const pending = await query(
      `SELECT id, email FROM rasist_invite i
       WHERE i.cnscapacita = $1
         AND (i.item IS NULL OR NOT EXISTS (
           SELECT 1 FROM rasistd d
           WHERE d.cnscapacita = i.cnscapacita AND d.item = i.item
             AND d.firma IS NOT NULL AND TRIM(d.firma) <> ''
         ))`,
      [cnscapacita],
    );

    const result = { sent: 0, skipped: 0, details: [] };
    for (const row of pending.rows) {
      try {
        const r = await sendInviteLinkEmail(row);
        if (r.sent) {
          result.sent++;
          result.details.push({ email: row.email, ok: true });
        } else {
          result.skipped++;
          result.details.push({
            email: row.email,
            ok: false,
            message: emailSkipReasonMessage(r.reason),
          });
        }
      } catch (err) {
        result.skipped++;
        result.details.push({ email: row.email, ok: false, message: err.message });
      }
    }
    res.json(result);
  } catch (err) {
    next(err);
  }
});

invitacionesRouter.post('/:inviteId/enviar', async (req, res, next) => {
  try {
    const cnscapacita = req.params.id;
    const r = await query(
      'SELECT id, email FROM rasist_invite WHERE id = $1 AND cnscapacita = $2',
      [Number(req.params.inviteId), cnscapacita],
    );
    if (!r.rows.length) return res.status(404).json({ error: 'Invitación no encontrada' });

    const result = await sendInviteLinkEmail(r.rows[0]);
    if (!result.sent) {
      const msg = emailSkipReasonMessage(result.reason);
      const status = result.reason === 'smtp_no_configurado' ? 503 : 422;
      return res.status(status).json({ error: msg, reason: result.reason });
    }
    res.json({ ok: true, email: result.email });
  } catch (err) {
    next(err);
  }
});
