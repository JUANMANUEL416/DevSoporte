-- Cronograma de capacitaciones: catálogo de temas e ítems + cronograma por cliente

CREATE TABLE IF NOT EXISTS captema (
    codigo      VARCHAR(20) PRIMARY KEY,
    nombre      VARCHAR(120) NOT NULL,
    estado      VARCHAR(1) DEFAULT 'A',
    observacion VARCHAR(500)
);
CREATE INDEX IF NOT EXISTS captema_nombre ON captema (nombre);

CREATE TABLE IF NOT EXISTS captemad (
    codigo      VARCHAR(20) NOT NULL,
    item        SMALLINT NOT NULL,
    descripcion VARCHAR(500) NOT NULL,
    duracion    SMALLINT,
    estado      VARCHAR(1) DEFAULT 'A',
    PRIMARY KEY (codigo, item)
);
CREATE INDEX IF NOT EXISTS captemad_codigo ON captemad (codigo);

DO $$ BEGIN
  ALTER TABLE captemad
    ADD CONSTRAINT fk_captemad_captema
    FOREIGN KEY (codigo) REFERENCES captema(codigo) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS cronocap (
    cnscrono    VARCHAR(20) PRIMARY KEY,
    cliente     VARCHAR(20) NOT NULL,
    fecha       DATE DEFAULT CURRENT_DATE,
    descripcion VARCHAR(500),
    estado      VARCHAR(20) DEFAULT 'Borrador',
    observacion VARCHAR(1000),
    usuario     VARCHAR(50)
);
CREATE INDEX IF NOT EXISTS cronocap_cliente ON cronocap (cliente);
CREATE INDEX IF NOT EXISTS cronocap_fecha ON cronocap (fecha DESC);

DO $$ BEGIN
  ALTER TABLE cronocap
    ADD CONSTRAINT fk_cronocap_clie
    FOREIGN KEY (cliente) REFERENCES clie(codigo);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS cronocapd (
    cnscrono        VARCHAR(20) NOT NULL,
    item            SMALLINT NOT NULL,
    tema_codigo     VARCHAR(20) NOT NULL,
    tema_nombre     VARCHAR(120) NOT NULL,
    descripcion     VARCHAR(500) NOT NULL,
    duracion        SMALLINT,
    fecha_probable  DATE,
    estado          VARCHAR(20) DEFAULT 'Programado',
    fecha_real      DATE,
    observacion     VARCHAR(1000),
    PRIMARY KEY (cnscrono, item)
);
CREATE INDEX IF NOT EXISTS cronocapd_cnscrono ON cronocapd (cnscrono);
CREATE INDEX IF NOT EXISTS cronocapd_tema ON cronocapd (tema_codigo);

DO $$ BEGIN
  ALTER TABLE cronocapd
    ADD CONSTRAINT fk_cronocapd_cronocap
    FOREIGN KEY (cnscrono) REFERENCES cronocap(cnscrono) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

INSERT INTO acns (prefijo, consecutivo) VALUES ('CAPTEMA', 0)
ON CONFLICT (prefijo) DO NOTHING;

INSERT INTO acns (prefijo, consecutivo) VALUES ('CRONOCAP', 0)
ON CONFLICT (prefijo) DO NOTHING;

COMMENT ON TABLE captema IS 'Temas mayores de capacitación (catálogo)';
COMMENT ON TABLE captemad IS 'Ítems/detalle de cada tema de capacitación';
COMMENT ON TABLE cronocap IS 'Encabezado cronograma de capacitaciones por cliente';
COMMENT ON TABLE cronocapd IS 'Ítems programados del cronograma con estados';
