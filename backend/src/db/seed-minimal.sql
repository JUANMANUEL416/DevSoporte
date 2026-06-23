-- Datos mínimos para arrancar (sin clientes ni técnicos demo).
-- La clave ADMIN se corrige en clean.js con bcrypt.

INSERT INTO ususu (usuario, clave, nombre, principal) VALUES
    ('ADMIN', '$2b$10$placeholder', 'Administrador', 1)
ON CONFLICT (usuario) DO UPDATE SET nombre = EXCLUDED.nombre, principal = EXCLUDED.principal;

INSERT INTO acns (prefijo, consecutivo) VALUES
    ('SOP', 0), ('REQ', 0), ('AGE', 0), ('INF', 0), ('LIC', 0), ('SRE', 0), ('CAP', 0), ('RASIST', 0), ('BITE', 0), ('BITA', 0)
ON CONFLICT (prefijo) DO UPDATE SET consecutivo = 0;

INSERT INTO tgen (tabla, campo, codigo, descripcion) VALUES
    ('BITA', 'ESTADO', 'A', 'Abierto'),
    ('BITA', 'ESTADO', 'C', 'Cerrado'),
    ('BITA', 'ESTADO', 'P', 'Pendiente'),
    ('BITA', 'MEDIO', 'TEL', 'Teléfono'),
    ('BITA', 'MEDIO', 'EMA', 'Correo'),
    ('BITA', 'MEDIO', 'PRE', 'Presencial'),
    ('BITA', 'MEDIO', 'REM', 'Remoto'),
    ('DESA', 'ESTADO', 'A', 'Abierto'),
    ('DESA', 'ESTADO', 'D', 'Desarrollo'),
    ('DESA', 'ESTADO', 'E', 'Entregado'),
    ('SREQ', 'ESTADO', 'P', 'Pendiente'),
    ('SREQ', 'ESTADO', 'A', 'Aprobado'),
    ('SREQ', 'ESTADO', 'R', 'Rechazado')
ON CONFLICT (tabla, campo, codigo) DO NOTHING;

INSERT INTO soparea (codigo, nombre, estado) VALUES
    ('DES', 'Desarrollo', 'A'),
    ('SOP', 'Soporte aplicativo', 'A'),
    ('INF', 'Infraestructura', 'A'),
    ('DBA', 'Base de datos', 'A'),
    ('RED', 'Redes', 'A'),
    ('PAR', 'Parametrización', 'A')
ON CONFLICT (codigo) DO NOTHING;
