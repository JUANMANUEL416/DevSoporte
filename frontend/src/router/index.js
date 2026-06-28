import { route } from 'quasar/wrappers';
import { createRouter, createMemoryHistory, createWebHistory, createWebHashHistory } from 'vue-router';
import routes from './routes';
import { useAuthStore } from 'src/stores/auth';

export default route(function () {
  const createHistory = process.env.SERVER
    ? createMemoryHistory
    : process.env.VUE_ROUTER_MODE === 'history'
      ? createWebHistory
      : createWebHashHistory;

  const Router = createRouter({
    scrollBehavior: () => ({ left: 0, top: 0 }),
    routes,
    history: createHistory(process.env.VUE_ROUTER_BASE),
  });

  // Guardia de navegación: exige sesión en las rutas protegidas.
  Router.beforeEach((to) => {
    // Enlace de firma por correo (?firma=...) — no requiere login ni menú del sistema.
    if (to.query.firma) {
      return { path: `/firmar/${to.query.firma}` };
    }
    if (to.query.registro) {
      return { path: `/registrar/${to.query.registro}` };
    }
    if (to.query.recuperar) {
      return { path: `/recuperar-clave/${to.query.recuperar}` };
    }
    if (to.meta.public || to.path.startsWith('/firmar') || to.path.startsWith('/registrar') || to.path.startsWith('/recuperar-clave')) {
      return true;
    }

    const auth = useAuthStore();
    if (to.meta.requiresAuth && !auth.isAuthenticated) {
      return { path: '/login' };
    }
    if (to.path === '/login' && auth.isAuthenticated) {
      return { path: '/' };
    }
  });

  return Router;
});
