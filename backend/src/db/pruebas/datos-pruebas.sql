-- Datos fijos para pruebas (restaurables con npm run db:pruebas:restore).
-- Cliente demo con funcionario documentado para firma de bitácora.

INSERT INTO clie (codigo, nombrecliente, ciudad, prefijo, email, noticliente, liderproyecto) VALUES
(
  'PRU001',
  'Cliente Pruebas S.A.',
  'Bogotá',
  'PRU',
  'lider.pruebas@example.com',
  '[{"nombre":"Contacto Cliente","cargo":"Coordinador","email":"contacto.pruebas@example.com"}]',
  '[{"nombre":"Analista Soporte","cargo":"Equipo IX","email":"equipo.pruebas@example.com"}]'
)
ON CONFLICT (codigo) DO UPDATE SET
  nombrecliente = EXCLUDED.nombrecliente,
  email = EXCLUDED.email,
  noticliente = EXCLUDED.noticliente,
  liderproyecto = EXCLUDED.liderproyecto;

INSERT INTO clief (codigo, documento, nombre, cargo, estado, email) VALUES
  ('PRU001', '900123456', 'Funcionario Pruebas', 'Coordinador TI', 'Activo', 'funcionario.pruebas@example.com'),
  ('PRU001', '900654321', 'Otro Contacto', 'Auxiliar', 'Activo', 'otro.pruebas@example.com')
ON CONFLICT (codigo, documento) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  cargo = EXCLUDED.cargo,
  estado = EXCLUDED.estado,
  email = EXCLUDED.email;

INSERT INTO soport (codigo, nombre, estado, usuario) VALUES
  ('PRU01', 'Técnico Pruebas', 'A', 'TECPRU')
ON CONFLICT (codigo) DO UPDATE SET nombre = EXCLUDED.nombre, estado = EXCLUDED.estado;

UPDATE ususu SET clave = clave WHERE usuario = 'ADMIN';
