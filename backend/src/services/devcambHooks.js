import { generarCodigoRama } from './devcambRama.js';

export async function beforeDevcambCreate(body) {
  if (!body.estado) body.estado = 'en_desarrollo';
  if (!body.tipo) {
    const err = new Error('Indique el tipo de rama (feature, fix o hotfix)');
    err.status = 400;
    throw err;
  }
  if (!body.consecutivo || !body.rama) {
    const generated = await generarCodigoRama(body.tipo);
    if (!body.consecutivo) body.consecutivo = generated.consecutivo;
    if (!body.rama) body.rama = generated.rama;
  }
  if (!body.f_inicio) body.f_inicio = new Date().toISOString();
}

export async function beforeDevcambUpdate(body, ids) {
  if (body.estado === 'integrado') {
    if (body.f_integracion === undefined) body.f_integracion = new Date().toISOString();
    if (body.f_terminacion === undefined) body.f_terminacion = new Date().toISOString();
  }
  if (body.estado === 'publicado' && body.f_publicacion === undefined) {
    body.f_publicacion = new Date().toISOString();
    if (body.f_terminacion === undefined) body.f_terminacion = new Date().toISOString();
  }
  delete body.consecutivo;
  delete body.rama;
  delete body.tipo;
  delete body.f_inicio;
}
