-- Registro release 1.2.13: dialogo informe actividades maximizado con scroll.

INSERT INTO devcamb (
  consecutivo, tipo, rama, titulo, descripcion, cambios, estado,
  f_inicio, f_integracion, f_terminacion, usuario
) VALUES (
  'devdes023',
  'fix',
  'fix/actproy-form-dialog-scroll',
  'Informe actividades: dialogo maximizado y boton guardar visible',
  'El formulario de informe de actividades abre en pantalla completa, el cuerpo tiene scroll y los botones Cancelar/Guardar quedan fijos abajo.',
  E'ActproyFormDialog.vue: maximized, flex column, body overflow-y auto, actions flex-shrink 0.',
  'integrado',
  NOW() - INTERVAL '15 minutes',
  NOW() - INTERVAL '5 minutes',
  NOW() - INTERVAL '5 minutes',
  'ADMIN'
) ON CONFLICT (consecutivo) DO UPDATE SET
  titulo = EXCLUDED.titulo,
  descripcion = EXCLUDED.descripcion,
  cambios = EXCLUDED.cambios,
  estado = 'integrado',
  f_integracion = COALESCE(devcamb.f_integracion, EXCLUDED.f_integracion),
  f_terminacion = COALESCE(devcamb.f_terminacion, EXCLUDED.f_terminacion);

UPDATE acns SET consecutivo = GREATEST(consecutivo, 23) WHERE prefijo = 'DEVDES';
