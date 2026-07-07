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
    path: '/recuperar-clave/:token(.*)',
    component: () => import('pages/RecuperarClavePage.vue'),
    meta: { public: true },
  },
  {
    path: '/admin',
    component: () => import('layouts/AdminLayout.vue'),
    meta: { requiresAuth: true, requiresAdmin: true },
    children: [
      { path: '', component: () => import('pages/admin/AdminHomePage.vue') },
      {
        path: 'clientes-vip',
        component: () => import('pages/admin/AdminEntityPage.vue'),
        props: { resource: 'vip_clientes' },
      },
      {
        path: 'cuentas-cobro',
        component: () => import('pages/admin/AdminEntityPage.vue'),
        props: { resource: 'vip_cuentas_cobro' },
      },
    ],
  },
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      { path: '', component: () => import('pages/DashboardPage.vue') },
      { path: 'capacitaciones', component: () => import('pages/CapacitacionesPage.vue') },
      { path: 'cronograma', component: () => import('pages/CronogramaPage.vue') },
      { path: 'temas_capacitacion', component: () => import('pages/TemasCapacitacionPage.vue') },
      { path: 'clientes', component: () => import('pages/ClientesPage.vue') },
      { path: 'bitacora', component: () => import('pages/BitacoraPage.vue') },
      { path: 'correos', component: () => import('pages/BandejaCorreosPage.vue') },
      { path: 'actividades_proyecto', component: () => import('pages/ActividadesProyectoPage.vue') },
      { path: 'control_versiones', component: () => import('pages/ControlVersionesPage.vue') },
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
