-- Registro release 1.2.16: mejoras UX dialogo finalizar soporte en bitacora.

INSERT INTO devcamb (
  consecutivo, tipo, rama, titulo, descripcion, cambios, estado,
  f_inicio, f_integracion, f_terminacion, usuario
) VALUES (
  'devdes026',
  'fix',
  'fix/bitacora-cerrar-dialog-ux',
  'Bitacora: dialogo cerrar soporte con scroll y observacion visible',
  'El dialogo de finalizar soporte muestra siempre solicitud y observacion en bloques con scroll, cuerpo desplazable y area de respuesta mas amplia.',
  E'BitacoraPage.vue: layout flex con scroll, bloques contexto apilados max-height, respuesta textarea 4 filas.',
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

UPDATE acns SET consecutivo = GREATEST(consecutivo, 26) WHERE prefijo = 'DEVDES';
