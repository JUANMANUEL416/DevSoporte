-- Registro release 1.2.17: IA respuesta bitacora organiza texto sin formato correo.

INSERT INTO devcamb (
  consecutivo, tipo, rama, titulo, descripcion, cambios, estado,
  f_inicio, f_integracion, f_terminacion, usuario
) VALUES (
  'devdes027',
  'fix',
  'fix/bitacora-respuesta-ia-organizar',
  'Bitacora: IA organiza respuesta como texto tecnico no como correo',
  'El prompt de bitacora_respuesta corrige ortografia y claridad conservando el sentido, sin saludos ni formato de correo.',
  E'aiOrganizarTexto.js: prompt bitacora_respuesta alineado con organizacion de observacion.',
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

UPDATE acns SET consecutivo = GREATEST(consecutivo, 27) WHERE prefijo = 'DEVDES';
