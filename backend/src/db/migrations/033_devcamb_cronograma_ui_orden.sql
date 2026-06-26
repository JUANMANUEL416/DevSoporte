-- Registro del ajuste de orden y colapsar temas en cronograma (release 1.2.1).

INSERT INTO devcamb (
  consecutivo, tipo, rama, titulo, descripcion, cambios, estado,
  f_inicio, f_integracion, f_terminacion, usuario
) VALUES (
  'devdes009',
  'feature',
  'feature/cronograma-ui-orden',
  'Orden temas por codigo, colapsar temas en cronograma y PDF por fecha probable',
  'Temas de capacitacion ordenados por codigo. Temas del cronograma expandibles/colapsables. PDF e interfaz ordenados por fecha probable ascendente.',
  'orderBy codigo en captema. groupByTema con sort por fecha_probable en CronogramaPage y cronogramaPdf.js.',
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

UPDATE acns SET consecutivo = GREATEST(consecutivo, 9) WHERE prefijo = 'DEVDES';
