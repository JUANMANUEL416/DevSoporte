/**
 * Prueba rápida: orden temas por código, cronograma por fecha probable, PDF.
 * Uso: node --env-file=.env.pruebas scripts/test-cronograma-ui-orden.mjs
 */
const BASE = 'http://localhost:3301';

async function login() {
  const attempts = [
    { usuario: 'ADMIN', clave: 'admin123' },
  ];
  for (const cred of attempts) {
    const res = await fetch(`${BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cred),
    });
    if (res.ok) {
      const data = await res.json();
      return { token: data.token, usuario: cred.usuario };
    }
  }
  throw new Error('No se pudo iniciar sesión en pruebas (revise credenciales)');
}

async function apiGet(path, token) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`${path} → ${res.status} ${await res.text()}`);
  return res.json();
}

function isSortedAsc(values, label) {
  for (let i = 1; i < values.length; i += 1) {
    if (values[i - 1] > values[i]) {
      return { ok: false, label, values };
    }
  }
  return { ok: true, label, values };
}

function parseDate(v) {
  if (!v) return Number.MAX_SAFE_INTEGER;
  const t = new Date(v).getTime();
  return Number.isNaN(t) ? Number.MAX_SAFE_INTEGER : t;
}

function groupByTemaPdfStyle(items) {
  const map = new Map();
  for (const item of items) {
    const key = item.tema_codigo || item.tema_nombre || '_';
    if (!map.has(key)) map.set(key, { tema_codigo: item.tema_codigo, items: [] });
    map.get(key).items.push(item);
  }
  return Array.from(map.values())
    .map((g) => ({
      tema_codigo: g.tema_codigo,
      sortKey: Math.min(...g.items.map((i) => parseDate(i.fecha_probable))),
    }))
    .sort((a, b) => {
      if (a.sortKey !== b.sortKey) return a.sortKey - b.sortKey;
      return (a.tema_codigo || '').localeCompare(b.tema_codigo || '', 'es');
    });
}

async function main() {
  const { token, usuario } = await login();
  console.log(`Sesión OK (${usuario})\n`);

  const temas = await apiGet('/api/temas_capacitacion?limit=100', token);
  const codigos = (temas.data || []).map((r) => r.codigo);
  const temasSort = isSortedAsc(codigos, 'Temas por código (API)');
  console.log(temasSort.ok ? '✓' : '✗', temasSort.label);
  console.log('  ', codigos.slice(0, 8).join(', '), codigos.length > 8 ? `… (${codigos.length} total)` : '');

  const cronos = await apiGet('/api/cronograma?limit=5', token);
  const cnscrono = cronos.data?.[0]?.cnscrono;
  if (!cnscrono) {
    console.log('\n⚠ Sin cronogramas en pruebas — omitiendo prueba de orden/PDF');
    return;
  }

  const itemsRes = await apiGet(`/api/cronograma_items?cnscrono=${encodeURIComponent(cnscrono)}&limit=500`, token);
  const items = itemsRes.data || [];
  const grupos = groupByTemaPdfStyle(items);
  const sortKeys = grupos.map((g) => g.sortKey);
  const cronoSort = isSortedAsc(sortKeys, `Cronograma ${cnscrono} grupos por fecha probable ASC`);
  console.log(cronoSort.ok ? '\n✓' : '\n✗', cronoSort.label);
  console.log('   temas:', grupos.map((g) => g.tema_codigo || '?').join(', '));

  const pdfRes = await fetch(`${BASE}/api/cronograma/${cnscrono}/pdf?tipo=programacion`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!pdfRes.ok) throw new Error(`PDF → ${pdfRes.status}`);
  const buf = Buffer.from(await pdfRes.arrayBuffer());
  console.log(pdfRes.ok ? '\n✓' : '\n✗', `PDF programación generado (${buf.length} bytes)`);

  console.log('\n---');
  console.log('UI manual: http://localhost:9021');
  console.log('- Temas Capacitación: verificar orden por código');
  console.log('- Cronograma: expandir/recoger temas en detalle');
}

main().catch((err) => {
  console.error('Error:', err.message || err);
  process.exit(1);
});
