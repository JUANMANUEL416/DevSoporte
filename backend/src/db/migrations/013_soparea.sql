-- Áreas de soporte (catálogo para BITA.SOPORTE)

CREATE TABLE IF NOT EXISTS soparea (
    codigo  VARCHAR(20) PRIMARY KEY,
    nombre  VARCHAR(100) NOT NULL,
    estado  VARCHAR(10) DEFAULT 'A'
);

INSERT INTO soparea (codigo, nombre, estado) VALUES
    ('DES', 'Desarrollo', 'A'),
    ('SOP', 'Soporte aplicativo', 'A'),
    ('INF', 'Infraestructura', 'A'),
    ('DBA', 'Base de datos', 'A'),
    ('RED', 'Redes', 'A'),
    ('PAR', 'Parametrización', 'A')
ON CONFLICT (codigo) DO NOTHING;
