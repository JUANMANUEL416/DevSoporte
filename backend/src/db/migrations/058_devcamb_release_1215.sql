-- Registro release 1.2.15: contexto de solicitud y observacion al cerrar soporte en bitacora.

INSERT INTO devcamb (
  consecutivo, tipo, rama, titulo, descripcion, cambios, estado,
  f_inicio, f_integracion, f_terminacion, usuario
) VALUES (
  'devdes025',
  'feature',
  'feature/bitacora-cerrar-contexto',
  'Bitacora: ver solicitud y observacion al finalizar soporte',
  'Al cerrar un soporte desde la bitacora se muestran en el dialogo el soporte solicitado y la observacion para redactar la respuesta con contexto.',
  E'BitacoraPage.vue: bloques de solo lectura solicitud y observaciones en dialogo Finalizar soporte.',
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

UPDATE acns SET consecutivo = GREATEST(consecutivo, 25) WHERE prefijo = 'DEVDES';
