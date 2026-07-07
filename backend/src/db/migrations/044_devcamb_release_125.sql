-- Registro release 1.2.5: menu administrativo, cuentas de cobro VIP y firmas grupales bitacora.

INSERT INTO devcamb (
  consecutivo, tipo, rama, titulo, descripcion, cambios, estado,
  f_inicio, f_integracion, f_terminacion, usuario
) VALUES (
  'devdes013',
  'feature',
  'feature/menu-administrativo',
  'Menu administrativo y cuentas de cobro VIP',
  'Modulo administrativo con clientes VIP y cuentas de cobro: plantilla Word/PDF, duplicar periodo, envio por correo con adjuntos PDF y remitente SMTP CXC separado. Firmas grupales de bitacora por funcionario al cerrar semana.',
  E'Migraciones 040-043 tablas vipclie y vipcc.\nMenu Administrativo (AdminLayout, clientes VIP, cuentas de cobro).\nPlantilla Word con variables, preview HTML/PDF (Puppeteer).\nEnvio correo CXC: perfil SMTP_FROM_CXC, adjuntos PDF manuales.\nDuplicar cuenta de cobro avanzando un mes.\nFirmas grupales bitacora: PDF por funcionario y enlace publico grupal.\nBandeja correos: mejoras compose y agenda contactos.',
  'integrado',
  NOW() - INTERVAL '2 hours',
  NOW() - INTERVAL '1 hour',
  NOW() - INTERVAL '1 hour',
  'ADMIN'
) ON CONFLICT (consecutivo) DO UPDATE SET
  titulo = EXCLUDED.titulo,
  descripcion = EXCLUDED.descripcion,
  cambios = EXCLUDED.cambios,
  estado = 'integrado',
  f_integracion = COALESCE(devcamb.f_integracion, EXCLUDED.f_integracion),
  f_terminacion = COALESCE(devcamb.f_terminacion, EXCLUDED.f_terminacion);

UPDATE acns SET consecutivo = GREATEST(consecutivo, 13) WHERE prefijo = 'DEVDES';
