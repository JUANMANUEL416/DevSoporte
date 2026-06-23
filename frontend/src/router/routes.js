const routes = [
  {
    path: '/login',
    component: () => import('pages/LoginPage.vue'),
  },
  {
    path: '/firmar/:token(.*)',
    component: () => import('pages/FirmaPublicaPage.vue'),
    meta: { public: true },
  },
  {
    path: '/registrar/:token(.*)',
    component: () => import('pages/RegistroPublicoPage.vue'),
    meta: { public: true },
  },
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      { path: '', component: () => import('pages/DashboardPage.vue') },
      { path: 'capacitaciones', component: () => import('pages/CapacitacionesPage.vue') },
      { path: 'clientes', component: () => import('pages/ClientesPage.vue') },
      { path: 'bitacora', component: () => import('pages/BitacoraPage.vue') },
      { path: 'correos', component: () => import('pages/BandejaCorreosPage.vue') },
      { path: 'actividades_proyecto', component: () => import('pages/ActividadesProyectoPage.vue') },
      // Listado genérico por recurso (cada Browse de Clarion).
      { path: ':resource', component: () => import('pages/GenericListPage.vue'), props: true },
    ],
  },
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue'),
  },
];

export default routes;
