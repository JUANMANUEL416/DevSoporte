-- Agenda de contactos para envío de correos (equipo de trabajo y contactos frecuentes)

CREATE TABLE IF NOT EXISTS agcon (
    codigo   VARCHAR(20) PRIMARY KEY,
    nombre   VARCHAR(100) NOT NULL,
    cargo    VARCHAR(80),
    email    VARCHAR(120) NOT NULL,
    empresa  VARCHAR(100),
    telefono VARCHAR(30),
    categoria VARCHAR(20) DEFAULT 'equipo',
    cliente  VARCHAR(20) REFERENCES clie(codigo) ON DELETE SET NULL,
    estado   VARCHAR(10) DEFAULT 'A',
    notas    TEXT
);

CREATE INDEX IF NOT EXISTS agcon_estado ON agcon (estado, categoria);
CREATE INDEX IF NOT EXISTS agcon_email ON agcon (LOWER(email));
CREATE UNIQUE INDEX IF NOT EXISTS agcon_email_unique ON agcon (LOWER(TRIM(email)));

INSERT INTO acns (prefijo, consecutivo) VALUES ('AGC', 0)
ON CONFLICT (prefijo) DO NOTHING;

COMMENT ON TABLE agcon IS 'Agenda de contactos para correos (equipo de trabajo, clientes frecuentes)';
COMMENT ON COLUMN agcon.categoria IS 'equipo | cliente | externo';
