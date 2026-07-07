import { query } from '../db/pool.js';

const ESTADOS_FINALES = new Set(['Cerrada']);

export async function ensureBiteClie(cnsbite, cliente) {
  if (!cnsbite || !cliente) return null;
  const res = await query(
    `INSERT INTO bite_clie (cnsbite, cliente, estado)
     VALUES ($1, $2, 'Abierta')
     ON CONFLICT (cnsbite, cliente) DO UPDATE SET cnsbite = EXCLUDED.cnsbite
     RETURNING *`,
    [cnsbite, cliente],
  );
  return res.rows[0];
}

export async function getBiteClie(cnsbite, cliente) {
  if (!cnsbite || !cliente) return null;
  const res = await query(
    'SELECT * FROM bite_clie WHERE cnsbite = $1 AND cliente = $2',
    [cnsbite, cliente],
  );
  return res.rows[0] || null;
}

export async function listBiteClieBySemana(cnsbite) {
  if (!cnsbite) return [];
  const res = await query(
    `SELECT bc.*, c.nombrecliente
     FROM bite_clie bc
     LEFT JOIN clie c ON c.codigo = bc.cliente
     WHERE bc.cnsbite = $1`,
    [cnsbite],
  );
  return res.rows;
}

async function countBitaCliente(cnsbite, cliente) {
  const res = await query(
    'SELECT COUNT(*)::int AS total FROM bita WHERE cnsbite = $1 AND cliente = $2',
    [cnsbite, cliente],
  );
  return res.rows[0]?.total ?? 0;
}

async function countBitaSinFirma(cnsbite, cliente) {
  const res = await query(
    `SELECT COUNT(*)::int AS total FROM bita
     WHERE cnsbite = $1 AND cliente = $2
       AND LOWER(COALESCE(estado, '')) = 'terminado'
       AND (firma IS NULL OR TRIM(firma) = '')
       AND firma_fecha IS NULL`,
    [cnsbite, cliente],
  );
  return res.rows[0]?.total ?? 0;
}

async function countBitaPendientes(cnsbite, cliente) {
  const res = await query(
    `SELECT COUNT(*)::int AS total FROM bita
     WHERE cnsbite = $1 AND cliente = $2
       AND LOWER(COALESCE(estado, '')) <> 'terminado'`,
    [cnsbite, cliente],
  );
  return res.rows[0]?.total ?? 0;
}

export async function syncBiteClieFromBita(cnsbite) {
  if (!cnsbite) return [];
  await query(
    `INSERT INTO bite_clie (cnsbite, cliente, estado)
     SELECT DISTINCT b.cnsbite, b.cliente, 'Abierta'
     FROM bita b
     WHERE b.cnsbite = $1 AND b.cliente IS NOT NULL AND TRIM(b.cliente) <> ''
     ON CONFLICT (cnsbite, cliente) DO NOTHING`,
    [cnsbite],
  );
  return listBiteClieBySemana(cnsbite);
}

export async function evaluarCierreSemanaCliente(cnsbite, cliente) {
  const row = (await getBiteClie(cnsbite, cliente)) || (await ensureBiteClie(cnsbite, cliente));
  if (!row) {
    const err = new Error('Semana/cliente no encontrado');
    err.status = 404;
    throw err;
  }

  const actual = row.estado || 'Abierta';
  if (ESTADOS_FINALES.has(actual)) {
    const err = new Error('La semana de este cliente ya está cerrada');
    err.status = 409;
    throw err;
  }

  const total = await countBitaCliente(cnsbite, cliente);
  if (total === 0) {
    const err = new Error('Debe registrar al menos un soporte antes de cerrar la semana');
    err.status = 400;
    throw err;
  }

  const pendientes = await countBitaPendientes(cnsbite, cliente);
  const sinFirma = await countBitaSinFirma(cnsbite, cliente);
  if (pendientes > 0) {
    const err = new Error('Todos los soportes deben estar terminados antes de cerrar la semana');
    err.status = 400;
    throw err;
  }
  if (sinFirma > 0) {
    const err = new Error(`Faltan ${sinFirma} soporte(s) por firmar antes de cerrar la semana`);
    err.status = 400;
    throw err;
  }

  return row;
}

export async function getEstadoOpcionesSemanaCliente(cnsbite, cliente) {
  const row = (await getBiteClie(cnsbite, cliente)) || (await ensureBiteClie(cnsbite, cliente));
  const actual = row?.estado || 'Abierta';
  const total = await countBitaCliente(cnsbite, cliente);
  const pendientes = await countBitaPendientes(cnsbite, cliente);
  const sinFirma = await countBitaSinFirma(cnsbite, cliente);

  let puedeCerrar = actual === 'Abierta';
  let motivoCerrar = '';

  if (actual !== 'Abierta') {
    puedeCerrar = false;
    motivoCerrar = 'La semana de este cliente ya está cerrada';
  } else if (total === 0) {
    puedeCerrar = false;
    motivoCerrar = 'Registre al menos un soporte';
  } else if (pendientes > 0) {
    puedeCerrar = false;
    motivoCerrar = `${pendientes} soporte(s) aún no terminado(s)`;
  } else if (sinFirma > 0) {
    puedeCerrar = false;
    motivoCerrar = `${sinFirma} soporte(s) pendiente(s) de firma`;
  }

  return {
    cnsbite,
    cliente,
    estado: actual,
    totalSoportes: total,
    pendientes,
    sinFirma,
    puedeCerrar,
    motivoCerrar,
    fechacierre: row?.fechacierre || null,
  };
}

export async function cerrarSemanaCliente(cnsbite, cliente) {
  await evaluarCierreSemanaCliente(cnsbite, cliente);
  const res = await query(
    `UPDATE bite_clie
     SET estado = 'Cerrada', fechacierre = NOW()
     WHERE cnsbite = $1 AND cliente = $2
     RETURNING *`,
    [cnsbite, cliente],
  );
  return res.rows[0];
}

export function isSemanaClienteCerrada(estado) {
  return ESTADOS_FINALES.has(estado || '');
}
