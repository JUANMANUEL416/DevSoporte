-- Registro de cambios recientes (imágenes bitácora, tratamiento, evidencias UI)

INSERT INTO devcamb (
  consecutivo, tipo, rama, titulo, descripcion, cambios, estado,
  f_inicio, f_integracion, f_terminacion, usuario
) VALUES (
  'devdes005',
  'feature',
  'feature/bitacora-imagenes-tratamiento',
  'Imagenes de soporte en bitacora y tratamiento del funcionario',
  'Adjuntar evidencias graficas al registro de soporte y al correo de bitacora. Campo tratamiento (Doctor, Sra., etc.) en funcionarios del cliente.',
  'Campo imagenes_soporte en bita, tratamiento en clief, galeria en formulario y correo HTML con adjuntos.',
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
  f_integracion = COALESCE(devcamb.f_integracion, NOW()),
  f_terminacion = COALESCE(devcamb.f_terminacion, NOW());

INSERT INTO devcamb (
  consecutivo, tipo, rama, titulo, descripcion, cambios, estado,
  f_inicio, f_integracion, f_terminacion, usuario
) VALUES (
  'devfix001',
  'fix',
  'fix/bitacora-evidencias-ui',
  'Evidencias graficas en soportes cerrados',
  'Boton dedicado para subir imagenes en soportes terminados antes de enviar el correo.',
  'Dialogo de evidencias en BitacoraPage y actualizacion parcial de imagenes_soporte en backend.',
  'integrado',
  NOW() - INTERVAL '30 minutes',
  NOW() - INTERVAL '15 minutes',
  NOW() - INTERVAL '15 minutes',
  'ADMIN'
) ON CONFLICT (consecutivo) DO UPDATE SET
  titulo = EXCLUDED.titulo,
  descripcion = EXCLUDED.descripcion,
  cambios = EXCLUDED.cambios,
  estado = 'integrado',
  f_integracion = COALESCE(devcamb.f_integracion, NOW()),
  f_terminacion = COALESCE(devcamb.f_terminacion, NOW());

UPDATE acns SET consecutivo = GREATEST(consecutivo, 5) WHERE prefijo = 'DEVDES';
UPDATE acns SET consecutivo = GREATEST(consecutivo, 1) WHERE prefijo = 'DEVFIX';
