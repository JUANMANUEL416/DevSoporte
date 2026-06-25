import { generarConsecutivo } from './consecutivo.js';

const TIPO_RAMA = {
  feature: { acnsPrefijo: 'DEVDES', codigoPrefix: 'devdes', gitPrefix: 'feature' },
  fix: { acnsPrefijo: 'DEVFIX', codigoPrefix: 'devfix', gitPrefix: 'fix' },
  hotfix: { acnsPrefijo: 'DEVHOT', codigoPrefix: 'devhot', gitPrefix: 'hotfix' },
};

export function cfgRamaPorTipo(tipo) {
  return TIPO_RAMA[tipo] || null;
}

/** Genera consecutivo y nombre de rama Git: feature/devdes001, fix/devfix001, hotfix/devhot001 */
export async function generarCodigoRama(tipo) {
  const cfg = cfgRamaPorTipo(tipo);
  if (!cfg) {
    const err = new Error('Tipo de rama inválido (feature, fix o hotfix)');
    err.status = 400;
    throw err;
  }
  const num = await generarConsecutivo({ acnsPrefijo: cfg.acnsPrefijo, pad: 3 });
  const consecutivo = `${cfg.codigoPrefix}${num}`;
  const rama = `${cfg.gitPrefix}/${consecutivo}`;
  return { consecutivo, rama };
}
