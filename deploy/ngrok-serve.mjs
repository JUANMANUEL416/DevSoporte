/**
 * Ejecuta ngrok en primer plano para que PM2 mantenga el proceso vivo (Windows-friendly).
 * Lee NGROK_DOMAIN / NGROK_PORT / NGROK_AUTOSTART del entorno o de backend/.env
 */
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const deployDir = dirname(fileURLToPath(import.meta.url));
const rootDir = join(deployDir, '..');

function readBackendEnv(key) {
  const envFile = join(rootDir, 'backend', '.env');
  if (!existsSync(envFile)) return null;
  for (const line of readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = line.match(
      new RegExp(`^\\s*${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*=\\s*(.+)\\s*$`),
    );
    if (m) return m[1].trim().replace(/^["']|["']$/g, '');
  }
  return null;
}

function isAutostartEnabled() {
  const flag = process.env.NGROK_AUTOSTART ?? readBackendEnv('NGROK_AUTOSTART');
  if (!flag) return true;
  return ['1', 'true', 'yes', 'si', 'sí'].includes(flag.toLowerCase());
}

if (!isAutostartEnabled()) {
  console.log('NGROK_AUTOSTART=false — omitiendo ngrok.');
  process.exit(0);
}

const port = process.env.NGROK_PORT ? parseInt(process.env.NGROK_PORT, 10) : 3300;
let domain = process.env.NGROK_DOMAIN ?? readBackendEnv('NGROK_DOMAIN');
if (!domain) {
  const publicUrl = readBackendEnv('PUBLIC_APP_URL');
  const m = publicUrl?.match(/^https?:\/\/([^/]+)/);
  if (m) domain = m[1];
}
if (!domain) domain = 'crested-gently-landowner.ngrok-free.dev';

console.log(`ngrok -> localhost:${port}  dominio: https://${domain}`);

const child = spawn('ngrok', ['http', String(port), '--url', domain], {
  stdio: 'inherit',
  shell: true,
  windowsHide: false,
});

child.on('error', (err) => {
  console.error('Error al iniciar ngrok:', err.message);
  process.exit(1);
});

child.on('exit', (code, signal) => {
  if (signal) {
    console.error(`ngrok terminado por señal: ${signal}`);
    process.exit(1);
  }
  process.exit(code ?? 0);
});
