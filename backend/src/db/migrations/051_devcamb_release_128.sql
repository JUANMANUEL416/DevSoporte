-- Registro release 1.2.8: validacion asistentes duplicados en actas de reunion.

INSERT INTO devcamb (
  consecutivo, tipo, rama, titulo, descripcion, cambios, estado,
  f_inicio, f_integracion, f_terminacion, usuario
) VALUES (
  'devdes016',
  'fix',
  'fix/actreun-asistentes-duplicados',
  'Actas: no permitir asistentes duplicados',
  'Filtra del selector de funcionarios y soportes a quienes ya estan en el acta, valida al agregar y rechaza duplicados por documento en backend.',
  E'LookupSelect: excludeValues/excludeFields.\nActaReunionAsistentesPanel: filtro y validacion UI.\nactreunHooks: unique documento por acta al crear.',
  'integrado',
  NOW() - INTERVAL '1 hour',
  NOW() - INTERVAL '30 minutes',
  NOW() - INTERVAL '30 minutes',
  'ADMIN'
) ON CONFLICT (consecutivo) DO UPDATE SET
  titulo = EXCLUDED.titulo,
  descripcion = EXCLUDED.descripcion,
  cambios = EXCLUDED.cambios,
  estado = 'integrado',
  f_integracion = COALESCE(devcamb.f_integracion, EXCLUDED.f_integracion),
  f_terminacion = COALESCE(devcamb.f_terminacion, EXCLUDED.f_terminacion);

UPDATE acns SET consecutivo = GREATEST(consecutivo, 16) WHERE prefijo = 'DEVDES';
