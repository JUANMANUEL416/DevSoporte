import { query } from '../db/pool.js';
import { isActaEditable } from './actreunFirma.js';

export async function beforeActreunCreate(body) {
  body.estado = 'Abierta';
  if (!body.codificacion || !String(body.codificacion).trim()) {
    body.codificacion = 'IXIMS-REG-026';
  }
  if (!body.vigencia) body.vigencia = '2012-11-29';
  if (!body.version || !String(body.version).trim()) body.version = '1';
}

async function assertActaEditable(consecutivo) {
  const res = await query('SELECT estado FROM actreun WHERE consecutivo = $1', [consecutivo]);
  if (!res.rows.length) {
    const err = new Error('Acta no encontrada');
    err.status = 404;
    throw err;
  }
  if (!isActaEditable(res.rows[0].estado)) {
    const err = new Error('El acta no está abierta; no se pueden modificar compromisos ni asistentes');
    err.status = 409;
    throw err;
  }
}

export async function beforeActreunUpdate(body, ids) {
  delete body.estado;
  const consecutivo = ids?.[0] || body.consecutivo;
  if (consecutivo) {
    const res = await query('SELECT estado FROM actreun WHERE consecutivo = $1', [consecutivo]);
    if (res.rows.length && !isActaEditable(res.rows[0].estado)) {
      const err = new Error('Solo se puede editar un acta en estado Abierta');
      err.status = 409;
      throw err;
    }
  }
}

export async function beforeActreunCompromisoCreate(body) {
  if (!body.lado) body.lado = 'ix';
  await assertActaEditable(body.consecutivo);
}

export async function beforeActreunCompromisoUpdate(body, ids) {
  if (ids?.[0]) await assertActaEditable(ids[0]);
}

export async function beforeActreunCompromisoDelete(ids) {
  if (ids?.[0]) await assertActaEditable(ids[0]);
}

function documentoDesdeSoporte(sop) {
  const doc = String(sop?.documento || '').trim();
  if (doc) return doc;
  if (sop?.codigo) return `SOP#${sop.codigo}`;
  return '';
}

export async function beforeActreunAsistenteCreate(body) {
  if (!body.lado) body.lado = 'ix';
  await assertActaEditable(body.consecutivo);

  if (!body.documento || !String(body.documento).trim()) {
    if (body.lado === 'ix' && body._soporteCodigo) {
      const sop = await query('SELECT codigo, documento FROM soport WHERE codigo = $1', [body._soporteCodigo]);
      if (sop.rows.length) body.documento = documentoDesdeSoporte(sop.rows[0]);
      delete body._soporteCodigo;
    } else if (body.lado === 'cliente' && body._funcionarioDocumento) {
      body.documento = String(body._funcionarioDocumento).trim();
      delete body._funcionarioDocumento;
    }
  }
  delete body._soporteCodigo;
  delete body._funcionarioDocumento;
}

export async function beforeActreunAsistenteUpdate(body, ids) {
  delete body.firma;
  delete body.firma_fecha;
  if (ids?.[0]) await assertActaEditable(ids[0]);
}

export async function beforeActreunAsistenteDelete(ids) {
  if (ids?.[0]) await assertActaEditable(ids[0]);
}
