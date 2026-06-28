-- Registro release 1.2.3: login moderno, recuperar contraseña y UI ticket.

INSERT INTO devcamb (
  consecutivo, tipo, rama, titulo, descripcion, cambios, estado,
  f_inicio, f_integracion, f_terminacion, usuario
) VALUES (
  'devdes011',
  'feature',
  'feature/login-recuperar-clave',
  'Login moderno, recuperar contraseña y tarjetas ticket',
  'Nuevo login con recuperación de contraseña por correo para técnicos de soporte. Campo email en soport. Panel de inicio y menú lateral con tarjetas estilo ticket compactas.',
  E'Migracion 036 email en soport.\nPOST/GET recuperar-clave con enlace JWT.\nLoginPage y RecuperarClavePage.\nDashboard y sidebar estilo ticket sin scroll vertical.',
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

UPDATE acns SET consecutivo = GREATEST(consecutivo, 11) WHERE prefijo = 'DEVDES';
