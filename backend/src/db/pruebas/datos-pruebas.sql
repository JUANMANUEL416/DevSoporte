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

INSERT INTO soport (codigo, nombre, estado, usuario, email) VALUES
  ('PRU01', 'Técnico Pruebas', 'A', 'TECPRU', 'jose.jimenez@ixcolombia.com')
ON CONFLICT (codigo) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  estado = EXCLUDED.estado,
  usuario = EXCLUDED.usuario,
  email = EXCLUDED.email;

UPDATE ususu SET clave = clave WHERE usuario = 'ADMIN';

INSERT INTO agcon (codigo, nombre, cargo, email, empresa, categoria, estado) VALUES
  ('AGC0001', 'Analista Soporte Pruebas', 'Coordinador', 'equipo.pruebas@example.com', 'IX Colombia', 'equipo', 'A'),
  ('AGC0002', 'Contacto Cliente Pruebas', 'Coordinador TI', 'contacto.pruebas@example.com', 'Cliente Pruebas S.A.', 'cliente', 'A')
ON CONFLICT (codigo) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  cargo = EXCLUDED.cargo,
  email = EXCLUDED.email,
  empresa = EXCLUDED.empresa,
  categoria = EXCLUDED.categoria,
  estado = EXCLUDED.estado;

UPDATE acns SET consecutivo = GREATEST(consecutivo, 2) WHERE prefijo = 'AGC';
