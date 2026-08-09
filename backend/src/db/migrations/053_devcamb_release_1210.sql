-- Registro release 1.2.10: sliding session JWT y PDF acta con motivo completo.

INSERT INTO devcamb (
  consecutivo, tipo, rama, titulo, descripcion, cambios, estado,
  f_inicio, f_integracion, f_terminacion, usuario
) VALUES (
  'devdes020',
  'feature',
  'feature/sliding-session-acta-pdf',
  'Sesion renovable y PDF acta con desarrollo completo',
  'Renueva el JWT en cada peticion autenticada (sliding session). El PDF del acta muestra todo el motivo/desarrollo sin limite fijo de 220px, con paginacion automatica.',
  E'auth.js: cabecera X-Refresh-Token en requireAuth.\naxios.js: interceptor guarda token renovado y redirige al login si expira.\nactreunPdf.js: drawBorderedFlowText sin tope de altura.',
  'integrado',
  NOW() - INTERVAL '45 minutes',
  NOW() - INTERVAL '15 minutes',
  NOW() - INTERVAL '15 minutes',
  'ADMIN'
) ON CONFLICT (consecutivo) DO UPDATE SET
  titulo = EXCLUDED.titulo,
  descripcion = EXCLUDED.descripcion,
  cambios = EXCLUDED.cambios,
  estado = 'integrado',
  f_integracion = COALESCE(devcamb.f_integracion, EXCLUDED.f_integracion),
  f_terminacion = COALESCE(devcamb.f_terminacion, EXCLUDED.f_terminacion);

UPDATE acns SET consecutivo = GREATEST(consecutivo, 20) WHERE prefijo = 'DEVDES';
