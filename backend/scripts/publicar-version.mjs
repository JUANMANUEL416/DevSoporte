import { publicarVersion, listIntegrados, readVersionFile } from '../src/services/controlVersionesPublish.js';

function parseArgs(argv) {
  const opts = {
    version: '',
    resumen: '',
    changelog: '',
    consecutivos: [],
    autoIntegrados: false,
    usuario: 'DEPLOY',
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--auto-integrados') opts.autoIntegrados = true;
    else if (arg === '--version') opts.version = argv[++i] || '';
    else if (arg === '--resumen') opts.resumen = argv[++i] || '';
    else if (arg === '--changelog') opts.changelog = argv[++i] || '';
    else if (arg === '--usuario') opts.usuario = argv[++i] || 'DEPLOY';
    else if (arg === '--consecutivos') {
      opts.consecutivos = String(argv[++i] || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }

  return opts;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  let consecutivos = opts.consecutivos;

  if (opts.autoIntegrados) {
    const rows = await listIntegrados();
    consecutivos = rows.map((r) => r.consecutivo);
    if (!consecutivos.length) {
      console.log('Sin cambios integrados pendientes de publicar.');
      process.exit(0);
    }
  }

  const version = opts.version || readVersionFile();
  if (!version) {
    console.error('Indique --version o defina el archivo VERSION.');
    process.exit(1);
  }

  const result = await publicarVersion({
    version,
    resumen: opts.resumen || undefined,
    changelog: opts.changelog || undefined,
    consecutivos,
    usuario: opts.usuario,
  });

  console.log(`Publicado v${result.version} (${result.publicados} cambio(s))`);
  for (const c of result.cambios) {
    console.log(`  - ${c.consecutivo}: ${c.titulo}`);
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
