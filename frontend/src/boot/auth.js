import { boot } from 'quasar/wrappers';
import { createPinia } from 'pinia';

// Inicializa Pinia para el manejo de estado (sesión, etc.).
export default boot(({ app }) => {
  app.use(createPinia());
});
