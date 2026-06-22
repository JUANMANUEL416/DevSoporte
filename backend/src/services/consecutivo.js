import { pool } from '../db/pool.js';

// Genera consecutivo atómico usando la tabla ACNS (como FnGeneraConsecutivo en Clarion).
// Ejemplo capacitaciones: leadingPrefix '01' + 8 dígitos => '0100000001'
export async function generarConsecutivo({ acnsPrefijo, leadingPrefix = '', pad = 8 }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let res = await client.query(
      'UPDATE acns SET consecutivo = consecutivo + 1 WHERE prefijo = $1 RETURNING consecutivo',
      [acnsPrefijo],
    );

    if (!res.rows.length) {
      res = await client.query(
        'INSERT INTO acns (prefijo, consecutivo) VALUES ($1, 1) RETURNING consecutivo',
        [acnsPrefijo],
      );
    }

    await client.query('COMMIT');
    const num = String(res.rows[0].consecutivo).padStart(pad, '0');
    return `${leadingPrefix}${num}`;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
