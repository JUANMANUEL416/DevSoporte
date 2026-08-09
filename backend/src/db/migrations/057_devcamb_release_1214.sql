-- Registro release 1.2.14: duracion en formulario informe actividades y PDF con cuadros dinamicos.

INSERT INTO devcamb (
  consecutivo, tipo, rama, titulo, descripcion, cambios, estado,
  f_inicio, f_integracion, f_terminacion, usuario
) VALUES (
  'devdes024',
  'fix',
  'fix/actproy-duracion-pdf',
  'Informe actividades: campo duracion y PDF con todo el contenido',
  'Se agrega el campo Duracion al formulario del informe. El PDF ajusta la altura de los cuadros de actividades y pendientes y pagina el texto largo sin cortarlo.',
  E'ActproyFormDialog.vue: campo duracion.\nactproyPdf.js: drawBorderedFlowText con paginacion automatica para actividades y pendientes.',
  'integrado',
  NOW() - INTERVAL '10 minutes',
  NOW() - INTERVAL '2 minutes',
  NOW() - INTERVAL '2 minutes',
  'ADMIN'
) ON CONFLICT (consecutivo) DO UPDATE SET
  titulo = EXCLUDED.titulo,
  descripcion = EXCLUDED.descripcion,
  cambios = EXCLUDED.cambios,
  estado = 'integrado',
  f_integracion = COALESCE(devcamb.f_integracion, EXCLUDED.f_integracion),
  f_terminacion = COALESCE(devcamb.f_terminacion, EXCLUDED.f_terminacion);

UPDATE acns SET consecutivo = GREATEST(consecutivo, 24) WHERE prefijo = 'DEVDES';
