import { configure } from 'quasar/wrappers';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = dirname(fileURLToPath(import.meta.url));
const appVersion = readFileSync(join(rootDir, '../VERSION'), 'utf8').trim();

export default configure(() => {
  return {
    boot: ['axios', 'auth'],
    css: ['app.scss'],
    extras: ['material-icons'],

    build: {
      target: { browser: ['es2022', 'edge88', 'firefox78', 'chrome87', 'safari13.1'] },
      vueRouterMode: 'history',
      env: {
        APP_VERSION: appVersion,
        API_URL: process.env.API_URL || '/api',
      },
      extendViteConf(viteConf) {
        viteConf.server ??= {};
        // Vite bloquea hosts externos (ngrok). VITE_ALLOWED_HOSTS=host1,host2 o "all"
        const allowed = process.env.VITE_ALLOWED_HOSTS;
        if (!allowed || allowed === 'all') {
          viteConf.server.allowedHosts = true;
        } else {
          viteConf.server.allowedHosts = allowed
            .split(',')
            .map((h) => h.trim())
            .filter(Boolean);
        }
      },
    },

    devServer: {
      port: Number(process.env.QUASAR_DEV_PORT) || 9020,
      open: true,
      proxy: {
        '/api': {
          target: process.env.BACKEND_URL || 'http://localhost:3300',
          changeOrigin: true,
        },
      },
    },

    framework: {
      config: {
        notify: {},
      },
      plugins: ['Notify', 'Dialog', 'Loading'],
    },

    animations: [],
  };
});
