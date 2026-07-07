import { pool } from '../db/pool.js';

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

const UNIDADES = [
  '', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE',
  'DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISEIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE',
];
const DECENAS = ['', '', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
const CENTENAS = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

function leerCentenas(n) {
  if (n === 0) return '';
  if (n === 100) return 'CIEN';
  const c = Math.floor(n / 100);
  const rest = n % 100;
  const d = Math.floor(rest / 10);
  const u = rest % 10;
  const parts = [];
  if (c) parts.push(CENTENAS[c]);
  if (rest >= 10 && rest <= 19) {
    parts.push(UNIDADES[rest]);
  } else {
    if (d === 2 && u > 0) parts.push(`VEINTI${UNIDADES[u]}`);
    else {
      if (d) parts.push(DECENAS[d]);
      if (u) parts.push(d > 0 ? `Y ${UNIDADES[u]}` : UNIDADES[u]);
    }
  }
  return parts.join(' ').replace('VEINTIUN', 'VEINTIUNO').trim();
}

function leerMilesMillones(n) {
  if (n === 0) return 'CERO';
  const millones = Math.floor(n / 1_000_000);
  const miles = Math.floor((n % 1_000_000) / 1000);
  const resto = n % 1000;
  const parts = [];
  if (millones) {
    parts.push(millones === 1 ? 'UN MILLON' : `${leerCentenas(millones)} MILLONES`);
  }
  if (miles) {
    parts.push(miles === 1 ? 'MIL' : `${leerCentenas(miles)} MIL`);
  }
  if (resto) parts.push(leerCentenas(resto));
  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

export function valorEnLetras(valor) {
  const n = Math.round(Number(valor) || 0);
  if (n <= 0) return 'CERO PESOS MTE.';
  return `${leerMilesMillones(n)} PESOS MTE.`;
}

export function fmtFechaLarga(fecha) {
  if (!fecha) return '';
  const d = fecha instanceof Date ? fecha : new Date(fecha);
  if (Number.isNaN(d.getTime())) return String(fecha);
  return `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
}

export function fmtFechaCorta(fecha) {
  if (!fecha) return '';
  const d = fecha instanceof Date ? fecha : new Date(fecha);
  if (Number.isNaN(d.getTime())) return String(fecha);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

export function fmtValorPesos(valor) {
  const n = Math.round(Number(valor) || 0);
  return `$${n.toLocaleString('es-CO')}`;
}

function periodoFromBody(body) {
  const ref = body.periodo_hasta || body.periodo_desde || body.fecha_emision || new Date();
  const d = ref instanceof Date ? ref : new Date(ref);
  return { anio: d.getFullYear(), mes: d.getMonth() + 1 };
}

export async function generarNumeroCuentaCobro(client, codigoCliente, body = {}) {
  const res = await client.query('SELECT * FROM vipclie WHERE codigo = $1 FOR UPDATE', [codigoCliente]);
  if (!res.rows.length) {
    const err = new Error('Cliente VIP no encontrado');
    err.status = 404;
    throw err;
  }
  const cl = res.rows[0];
  const formato = (cl.cc_formato || 'anio_mes').toLowerCase();

  if (formato === 'secuencial') {
    const next = Number(cl.cc_consecutivo || 0) + 1;
    const pad = Math.max(1, Number(cl.cc_relleno) || 3);
    const numero = `${cl.cc_prefijo_num || ''}${String(next).padStart(pad, '0')}`;
    await client.query('UPDATE vipclie SET cc_consecutivo = $1 WHERE codigo = $2', [next, codigoCliente]);
    return numero;
  }

  const { anio, mes } = periodoFromBody(body);
  const sep = cl.cc_separador ?? '-';
  const mm = String(mes).padStart(2, '0');
  const numero = `${anio}${sep}${mm}`;

  const dup = await client.query(
    'SELECT 1 FROM vipcc WHERE codigo_cliente = $1 AND numero = $2',
    [codigoCliente, numero],
  );
  if (dup.rows.length) {
    const err = new Error(`Ya existe la cuenta de cobro Nro. ${numero} para este cliente`);
    err.status = 409;
    throw err;
  }
  return numero;
}

export function getEmisorConfig() {
  return {
    nombre: process.env.VIP_EMISOR_NOMBRE || 'JOSE MANUEL JIMENEZ BUSTOS',
    documento: process.env.VIP_EMISOR_DOCUMENTO || 'C.C. 11235943 de Tabio (Cund)',
    ciudad: process.env.VIP_EMISOR_CIUDAD || 'Juan de Acosta – Atlántico',
    cuenta: process.env.VIP_EMISOR_CUENTA || '335-365865-69',
    banco: process.env.VIP_EMISOR_BANCO || 'Bancolombia',
  };
}

/** Fila de ejemplo para vista previa de plantilla por cliente VIP. */
export function buildVipClienteSampleCuenta(cl, { cc_plantilla } = {}) {
  const valor = 1500000;
  const plantilla = String(cc_plantilla ?? cl?.cc_plantilla ?? '').trim() || null;
  return {
    numero: '2026-05',
    fecha_emision: new Date().toISOString().slice(0, 10),
    periodo_desde: '2026-05-01',
    periodo_hasta: '2026-05-31',
    valor,
    concepto: 'servicios de asesoría, análisis de datos y soporte técnico',
    valor_letras: valorEnLetras(valor),
    ciudad_emision: getEmisorConfig().ciudad,
    nombrecliente: cl?.nombrecliente || 'CLIENTE VIP',
    nit: cl?.nit || null,
    ciudad: cl?.ciudad || null,
    cuenta_banco: cl?.cuenta_banco || null,
    banco_nombre: cl?.banco_nombre || null,
    cc_plantilla: plantilla,
  };
}

export async function beforeVipCuentaCreate(body) {
  if (!body.codigo_cliente) {
    const err = new Error('Seleccione el cliente VIP');
    err.status = 400;
    throw err;
  }
  if (!body.valor || Number(body.valor) <= 0) {
    const err = new Error('Indique el valor a cobrar');
    err.status = 400;
    throw err;
  }
  if (!String(body.concepto || '').trim()) {
    const err = new Error('Indique el concepto');
    err.status = 400;
    throw err;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (!body.numero || !String(body.numero).trim()) {
      body.numero = await generarNumeroCuentaCobro(client, body.codigo_cliente, body);
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  body.valor_letras = valorEnLetras(body.valor);
  if (!body.ciudad_emision) {
    body.ciudad_emision = getEmisorConfig().ciudad;
  }
  if (!body.fecha_emision) {
    body.fecha_emision = new Date().toISOString().slice(0, 10);
  }
  if (!body.estado) body.estado = 'Emitida';
}

export async function beforeVipCuentaUpdate(body) {
  delete body.numero;
  delete body.codigo_cliente;
  if (body.valor !== undefined) {
    body.valor_letras = valorEnLetras(body.valor);
  }
}

export async function fetchVipCuentaCobro(cns) {
  const res = await pool.query(
    `SELECT c.*, cl.nombrecliente, cl.nit, cl.ciudad, cl.cuenta_banco, cl.banco_nombre, cl.cc_plantilla
     FROM vipcc c
     JOIN vipclie cl ON cl.codigo = c.codigo_cliente
     WHERE c.cns = $1`,
    [cns],
  );
  return res.rows[0] || null;
}
