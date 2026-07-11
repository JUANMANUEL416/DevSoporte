-- Registro release 1.2.7: correcciones actas de reunion (PDF asistentes y edicion compromisos).

INSERT INTO devcamb (
  consecutivo, tipo, rama, titulo, descripcion, cambios, estado,
  f_inicio, f_integracion, f_terminacion, usuario
) VALUES (
  'devdes015',
  'fix',
  'fix/actreun-pdf-asistentes',
  'Actas de reunion: PDF asistentes y edicion de compromisos',
  'Corrige la tabla de asistentes del PDF al formato IXIMS-REG-026 con check IX/Cliente por fila. Agrega edicion de compromisos, texto multilinea y botones de accion a la izquierda.',
  E'PDF actreun: una fila por asistente con check en IX Colombia o Cliente.\nUI: editar compromisos, wrap multilinea del texto, botones Editar/Eliminar/Agregar a la izquierda.',
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

UPDATE acns SET consecutivo = GREATEST(consecutivo, 15) WHERE prefijo = 'DEVDES';
