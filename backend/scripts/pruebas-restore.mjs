import 'dotenv/config';
import { restorePruebasDatabase } from '../src/db/pruebas/lib.js';

restorePruebasDatabase().catch((err) => {
  console.error('Error restaurando base de pruebas:', err);
  process.exit(1);
});
