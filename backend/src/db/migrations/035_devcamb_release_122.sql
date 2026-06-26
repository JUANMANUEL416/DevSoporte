-- Registro release 1.2.2: hora sugerida, duplicar cronograma, filtros y PDF bitacora.

INSERT INTO devcamb (
  consecutivo, tipo, rama, titulo, descripcion, cambios, estado,
  f_inicio, f_integracion, f_terminacion, usuario
) VALUES (
  'devdes010',
  'feature',
  'feature/cronograma-hora-duplicar',
  'Hora sugerida, duplicar cronograma, filtros y mejoras PDF',
  'Hora sugerida al agregar temas al cronograma. Duplicar cronograma para refuerzos. Filtro por fecha inicio (mes actual). Orden por consecutivo. Correo cronograma solo fecha. PDF cronograma fecha y hora unificada. Espaciado PDF bitacora.',
  E'Migracion 034 hora_sugerida en cronocapd.\nPOST /api/cronograma/:id/duplicar.\nFiltros fechaini/fechafin y orden cnscrono ASC.\nLayout CronogramaPage.\nbitacoraPdf espaciado filas y celdas.',
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

UPDATE acns SET consecutivo = GREATEST(consecutivo, 10) WHERE prefijo = 'DEVDES';
