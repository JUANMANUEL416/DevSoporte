-- Backfill devver/devcamb 1.1.4 y 1.1.5 (publicados en Git sin registro en BD).
-- Registro del cronograma integrado, pendiente de publicar como 1.2.0.

INSERT INTO devver (version, fecha, resumen, changelog, usuario) VALUES (
  '1.1.4',
  '2026-06-25 19:00:00',
  'Miniaturas en correo de bitacora y UX evidencias graficas',
  E'### Agregado\n- Miniaturas de evidencias en el cuerpo del correo de bitacora; imagenes completas como adjuntos.\n- Badge y contador de imagenes en listado de bitacora; mejoras UX del modal de evidencias.\n\n### Cambiado\n- Saludo del correo con tratamiento del funcionario solicitante; listado de imagenes con opcion Quitar.',
  'DEPLOY'
) ON CONFLICT (version) DO UPDATE SET
  resumen = EXCLUDED.resumen,
  changelog = EXCLUDED.changelog,
  fecha = EXCLUDED.fecha;

INSERT INTO devver (version, fecha, resumen, changelog, usuario) VALUES (
  '1.1.5',
  '2026-06-25 20:00:00',
  'Autostart ngrok con PM2 en deploy',
  E'### Agregado\n- Autostart de ngrok con PM2 (ngrok-devsoporte) en npm run deploy e inicio de produccion.\n- Variables NGROK_AUTOSTART y NGROK_DOMAIN en ejemplos de .env.\n\n### Cambiado\n- start-ngrok.ps1 gestiona el tunel via PM2 y limpia procesos ngrok huerfanos.',
  'DEPLOY'
) ON CONFLICT (version) DO UPDATE SET
  resumen = EXCLUDED.resumen,
  changelog = EXCLUDED.changelog,
  fecha = EXCLUDED.fecha;

INSERT INTO devcamb (
  consecutivo, tipo, rama, titulo, descripcion, cambios, estado, version,
  f_inicio, f_integracion, f_terminacion, f_publicacion, usuario
) VALUES (
  'devdes006',
  'feature',
  'feature/bitacora-evidencias-ui',
  'Miniaturas en correo de bitacora y UX evidencias graficas',
  'Miniaturas inline en correo de bitacora, badge y contador en listado, mejoras del modal de evidencias y saludo con tratamiento del funcionario.',
  'Thumbnails en HTML del correo, adjuntos completos, badge imagenes en BitacoraPage, opcion Quitar en galeria.',
  'publicado',
  '1.1.4',
  '2026-06-25 18:30:00',
  '2026-06-25 18:45:00',
  '2026-06-25 18:45:00',
  '2026-06-25 19:00:00',
  'ADMIN'
) ON CONFLICT (consecutivo) DO UPDATE SET
  titulo = EXCLUDED.titulo,
  descripcion = EXCLUDED.descripcion,
  cambios = EXCLUDED.cambios,
  estado = 'publicado',
  version = '1.1.4',
  f_publicacion = COALESCE(devcamb.f_publicacion, EXCLUDED.f_publicacion);

INSERT INTO devcamb (
  consecutivo, tipo, rama, titulo, descripcion, cambios, estado, version,
  f_inicio, f_integracion, f_terminacion, f_publicacion, usuario
) VALUES (
  'devdes007',
  'feature',
  'feature/ngrok-autostart',
  'Autostart ngrok con PM2 en deploy',
  'Tunel ngrok gestionado por PM2 al desplegar e iniciar produccion.',
  'Script start-ngrok.ps1, proceso ngrok-devsoporte, variables NGROK_AUTOSTART y NGROK_DOMAIN.',
  'publicado',
  '1.1.5',
  '2026-06-25 19:30:00',
  '2026-06-25 19:45:00',
  '2026-06-25 19:45:00',
  '2026-06-25 20:00:00',
  'ADMIN'
) ON CONFLICT (consecutivo) DO UPDATE SET
  titulo = EXCLUDED.titulo,
  descripcion = EXCLUDED.descripcion,
  cambios = EXCLUDED.cambios,
  estado = 'publicado',
  version = '1.1.5',
  f_publicacion = COALESCE(devcamb.f_publicacion, EXCLUDED.f_publicacion);

INSERT INTO devcamb (
  consecutivo, tipo, rama, titulo, descripcion, cambios, estado,
  f_inicio, f_integracion, f_terminacion, usuario
) VALUES (
  'devdes008',
  'feature',
  'feature/cronograma-capacitaciones',
  'Cronograma de capacitaciones, PDF, correo y vinculo con actas',
  'Modulo de cronograma de capacitaciones por cliente: catalogo de temas, programacion y seguimiento, PDF, notificacion por correo e integracion con actas de capacitacion.',
  E'Migraciones 028-031 (captema, cronocap, dirigidoa, cnscrono en rasist).\nPaginas Cronograma y Temas de capacitacion.\nPDF programacion/seguimiento con soportes de actas cerradas.\nCapacitaciones desde cronograma con prefill de tema, duracion y fecha.\nNotificacion por correo con PDF adjunto.',
  'integrado',
  '2026-06-26 10:00:00',
  '2026-06-26 12:00:00',
  '2026-06-26 12:00:00',
  'ADMIN'
) ON CONFLICT (consecutivo) DO UPDATE SET
  titulo = EXCLUDED.titulo,
  descripcion = EXCLUDED.descripcion,
  cambios = EXCLUDED.cambios,
  estado = 'integrado',
  f_integracion = COALESCE(devcamb.f_integracion, EXCLUDED.f_integracion),
  f_terminacion = COALESCE(devcamb.f_terminacion, EXCLUDED.f_terminacion);

UPDATE acns SET consecutivo = GREATEST(consecutivo, 8) WHERE prefijo = 'DEVDES';
