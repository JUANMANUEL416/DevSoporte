-- Registro release 1.2.4: agenda de contactos para bandeja de correos.

INSERT INTO devcamb (
  consecutivo, tipo, rama, titulo, descripcion, cambios, estado,
  f_inicio, f_integracion, f_terminacion, usuario
) VALUES (
  'devdes012',
  'feature',
  'feature/agenda-contactos',
  'Agenda de contactos en bandeja de correos',
  'Catálogo de contactos (equipo, cliente, externo) integrado con la bandeja de correos para seleccionar destinatarios Para/CC con un clic.',
  E'Migracion 038 tabla agcon.\nModulo Agenda de Contactos.\nSelector en BandejaCorreos con carga automatica de equipo en CC.\nValidacion email unico y hooks.',
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

UPDATE acns SET consecutivo = GREATEST(consecutivo, 12) WHERE prefijo = 'DEVDES';
