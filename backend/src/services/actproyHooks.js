import { query } from '../db/pool.js';

// Antes de crear un informe de actividades: estado inicial y ciudad por defecto
// tomada del cliente (igual que aparece en el formato impreso).
export async function beforeActproyCreate(body) {
  body.estado = 'Abierto';
  if (body.cliente && (!body.ciudad || !String(body.ciudad).trim())) {
    const res = await query('SELECT ciudad FROM clie WHERE codigo = $1', [body.cliente]);
    if (res.rows.length && res.rows[0].ciudad) {
      body.ciudad = res.rows[0].ciudad;
    }
  }
}

// En edición no se permite cambiar el estado por CRUD (se maneja aparte).
export function beforeActproyUpdate(body) {
  delete body.estado;
  delete body.firma_cli;
  delete body.firma_cli_fecha;
  delete body.firma_cli_nombre;
}
