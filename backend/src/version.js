import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

let cachedVersion = null;

export function getAppVersion() {
  if (cachedVersion) return cachedVersion;
  try {
    cachedVersion = readFileSync(join(__dirname, '../../VERSION'), 'utf8').trim();
  } catch {
    cachedVersion = '0.0.0';
  }
  return cachedVersion;
}
