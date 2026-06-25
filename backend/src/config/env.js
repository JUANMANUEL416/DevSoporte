/**
 * Entorno de ejecución de DevSoporte.
 *
 * APP_ENV:
 *   production  — despliegue real (master)
 *   pruebas     — base devsoporte_pruebas, restaurable
 *   development — desarrollo local (default)
 */
const raw = String(process.env.APP_ENV || '').trim().toLowerCase();
const nodeEnv = String(process.env.NODE_ENV || 'development').trim().toLowerCase();

export const appEnv = raw || (nodeEnv === 'production' ? 'production' : 'development');

export const isProduction = appEnv === 'production';
export const isPruebas = appEnv === 'pruebas';
export const isDevelopment = appEnv === 'development';

export function getAppEnvLabel() {
  if (isPruebas) return 'Pruebas';
  if (isProduction) return 'Producción';
  return 'Desarrollo';
}

export function getDatabaseName() {
  return process.env.PGDATABASE || 'devsoporte';
}

/** Evita usar la BD de producción por error en entorno pruebas. */
export function assertPruebasIsolation() {
  if (!isPruebas) return;
  const db = getDatabaseName();
  if (db === 'devsoporte') {
    throw new Error(
      'APP_ENV=pruebas no puede usar PGDATABASE=devsoporte. Use devsoporte_pruebas en .env.pruebas',
    );
  }
}
