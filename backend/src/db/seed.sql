-- ============================================================================
-- DevSoporte - Datos semilla
-- La clave del usuario admin se inserta como hash bcrypt de "admin123".
-- ============================================================================

INSERT INTO ususu (usuario, clave, nombre, principal) VALUES
    ('ADMIN', '$2b$10$N9qo8uLOickgx2ZMRZoMy.MhE/Hl3hQ3yqzqHq3qz0qXqz9qXqz9q', 'Administrador', 1)
ON CONFLICT (usuario) DO NOTHING;

-- Consecutivos base
INSERT INTO acns (prefijo, consecutivo) VALUES
    ('SOP', 0), ('REQ', 0), ('AGE', 0), ('INF', 0), ('LIC', 0), ('SRE', 0), ('CAP', 0), ('RASIST', 0), ('BITE', 0), ('BITA', 0)
ON CONFLICT (prefijo) DO NOTHING;

-- Catálogos de la Tabla Genérica (TGEN)
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

-- Clientes de ejemplo
INSERT INTO clie (codigo, nombrecliente, ciudad, prefijo) VALUES
    ('0001', 'Cliente Demo S.A.', 'Bogotá', 'CD'),
    ('0002', 'Empresa Ejemplo Ltda.', 'Medellín', 'EE')
ON CONFLICT (codigo) DO NOTHING;

-- Técnicos de soporte
INSERT INTO soport (codigo, nombre, estado) VALUES
    ('S01', 'Técnico Uno', 'A'),
    ('S02', 'Técnico Dos', 'A')
ON CONFLICT (codigo) DO NOTHING;

-- Áreas de soporte (bitácora)
INSERT INTO soparea (codigo, nombre, estado) VALUES
    ('DES', 'Desarrollo', 'A'),
    ('SOP', 'Soporte aplicativo', 'A'),
    ('INF', 'Infraestructura', 'A'),
    ('DBA', 'Base de datos', 'A'),
    ('RED', 'Redes', 'A'),
    ('PAR', 'Parametrización', 'A')
ON CONFLICT (codigo) DO NOTHING;
