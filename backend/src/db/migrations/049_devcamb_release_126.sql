-- Registro release 1.2.6: actas de reunion con firmas y vinculo capacitacion-soportes.

INSERT INTO devcamb (
  consecutivo, tipo, rama, titulo, descripcion, cambios, estado,
  f_inicio, f_integracion, f_terminacion, usuario
) VALUES (
  'devdes014',
  'feature',
  'feature/capacitacion-soportes',
  'Actas de reunion con firmas y vinculo capacitacion-soportes',
  'Modulo de actas de reunion con el cliente (IXIMS-REG-026): PDF, compromisos, asistentes, finalizar reunion, firmas por correo con validacion de documento, estado Terminada y envio al equipo del cliente. Vinculo de soportes de bitacora a capacitaciones y documento en tecnicos de soporte.',
  E'Migraciones 045-048: rasist_bita, soport.documento, tablas actreun/actreunc/actreund.\nActas de reunion: CRUD, PDF, finalizar, enviar firmas, firma publica, enviar acta firmada.\nCapacitaciones: asistentes tecnicos de soporte y vinculo con bitacora.\nUI: ActaReunionPage, formulario fullscreen, botones de accion alineados a la izquierda.',
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

UPDATE acns SET consecutivo = GREATEST(consecutivo, 14) WHERE prefijo = 'DEVDES';
