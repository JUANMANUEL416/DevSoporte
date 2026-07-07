// Módulos del área administrativa VIP (clientes personales / atención especial).



export const adminModules = [

  {

    resource: 'vip_clientes',

    path: 'clientes-vip',

    title: 'Clientes VIP',

    icon: 'stars',

    description: 'Terceros personales con numeración propia de cuenta de cobro.',

    entity: 'vip_clientes',

  },

  {

    resource: 'vip_cuentas_cobro',

    path: 'cuentas-cobro',

    title: 'Cuentas de cobro',

    icon: 'receipt_long',

    description: 'Emisión y PDF de cuentas de cobro por cliente VIP.',

    entity: 'vip_cuentas_cobro',

  },

];



export function findAdminModule(resourceOrPath) {

  return adminModules.find((m) => m.resource === resourceOrPath || m.path === resourceOrPath);

}



export function adminModulePaths() {

  return new Set(adminModules.map((m) => m.path));

}

