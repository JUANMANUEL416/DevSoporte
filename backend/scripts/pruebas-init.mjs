import 'dotenv/config';
import { initPruebasDatabase } from '../src/db/pruebas/lib.js';

initPruebasDatabase().catch((err) => {
  console.error('Error inicializando base de pruebas:', err);
  process.exit(1);
});
