import { configure } from 'quasar/wrappers';

export default configure(() => {
  return {
    boot: ['axios', 'auth'],
    css: ['app.scss'],
    extras: ['material-icons'],

    build: {
      target: { browser: ['es2022', 'edge88', 'firefox78', 'chrome87', 'safari13.1'] },
      vueRouterMode: 'history',
      env: {
        // Ruta relativa: en dev el proxy de Quasar reenvía /api al backend (3300).
        // Con ngrok basta un túnel al puerto 9020 para firma remota.
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
      port: 9020,
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
