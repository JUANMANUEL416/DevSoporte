-- Plan de trabajo Qrystalos: catálogo de procesos + plan por cliente

CREATE TABLE IF NOT EXISTS qrysmod (
    codigo      VARCHAR(10) PRIMARY KEY,
    nombre      VARCHAR(200) NOT NULL,
    orden       SMALLINT DEFAULT 0,
    estado      VARCHAR(1) DEFAULT 'A'
);
CREATE INDEX IF NOT EXISTS qrysmod_orden ON qrysmod (orden, codigo);

CREATE TABLE IF NOT EXISTS qrysproc (
    codigo            VARCHAR(40) PRIMARY KEY,
    modulo            VARCHAR(10) NOT NULL,
    tipo              VARCHAR(40),
    nombre            VARCHAR(500) NOT NULL,
    codigo_num        VARCHAR(40),
    descripcion       VARCHAR(2000),
    duracion_sugerida SMALLINT,
    estado            VARCHAR(1) DEFAULT 'A'
);
CREATE INDEX IF NOT EXISTS qrysproc_modulo ON qrysproc (modulo, codigo_num);
CREATE INDEX IF NOT EXISTS qrysproc_nombre ON qrysproc (nombre);

DO $$ BEGIN
  ALTER TABLE qrysproc
    ADD CONSTRAINT fk_qrysproc_qrysmod
    FOREIGN KEY (modulo) REFERENCES qrysmod(codigo);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS qrysgrupo (
    codigo      VARCHAR(20) PRIMARY KEY,
    nombre      VARCHAR(120) NOT NULL,
    descripcion VARCHAR(500),
    estado      VARCHAR(1) DEFAULT 'A'
);

CREATE TABLE IF NOT EXISTS qrysgrupod (
    grupo   VARCHAR(20) NOT NULL,
    proceso VARCHAR(40) NOT NULL,
    PRIMARY KEY (grupo, proceso)
);

DO $$ BEGIN
  ALTER TABLE qrysgrupod
    ADD CONSTRAINT fk_qrysgrupod_grupo
    FOREIGN KEY (grupo) REFERENCES qrysgrupo(codigo) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE qrysgrupod
    ADD CONSTRAINT fk_qrysgrupod_proceso
    FOREIGN KEY (proceso) REFERENCES qrysproc(codigo) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS plantrab (
    cnplan        VARCHAR(20) PRIMARY KEY,
    cliente       VARCHAR(20) NOT NULL,
    nombre        VARCHAR(200) NOT NULL,
    fecha         DATE DEFAULT CURRENT_DATE,
    fecha_inicial DATE,
    fecha_final   DATE,
    descripcion   VARCHAR(1000),
    estado        VARCHAR(20) DEFAULT 'Borrador',
    observacion   VARCHAR(1000),
    usuario       VARCHAR(50)
);
CREATE INDEX IF NOT EXISTS plantrab_cliente ON plantrab (cliente);
CREATE INDEX IF NOT EXISTS plantrab_fecha_inicial ON plantrab (fecha_inicial DESC);

DO $$ BEGIN
  ALTER TABLE plantrab
    ADD CONSTRAINT fk_plantrab_clie
    FOREIGN KEY (cliente) REFERENCES clie(codigo);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS plantrabd (
    cnplan           VARCHAR(20) NOT NULL,
    item             SMALLINT NOT NULL,
    proceso_codigo   VARCHAR(40),
    nombre           VARCHAR(500) NOT NULL,
    descripcion      VARCHAR(2000),
    orden            SMALLINT DEFAULT 0,
    prioridad        SMALLINT DEFAULT 1,
    tiempo_estimado  SMALLINT,
    estado           VARCHAR(20) DEFAULT 'Pendiente',
    fecha_real       DATE,
    observacion      VARCHAR(1000),
    PRIMARY KEY (cnplan, item)
);
CREATE INDEX IF NOT EXISTS plantrabd_cnplan ON plantrabd (cnplan);
CREATE INDEX IF NOT EXISTS plantrabd_proceso ON plantrabd (proceso_codigo);

DO $$ BEGIN
  ALTER TABLE plantrabd
    ADD CONSTRAINT fk_plantrabd_plantrab
    FOREIGN KEY (cnplan) REFERENCES plantrab(cnplan) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE plantrabd
    ADD CONSTRAINT fk_plantrabd_qrysproc
    FOREIGN KEY (proceso_codigo) REFERENCES qrysproc(codigo);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

INSERT INTO acns (prefijo, consecutivo) VALUES ('PLANTRAB', 0)
ON CONFLICT (prefijo) DO NOTHING;

INSERT INTO acns (prefijo, consecutivo) VALUES ('QRYSGRUP', 0)
ON CONFLICT (prefijo) DO NOTHING;

COMMENT ON TABLE qrysmod IS 'Módulos principales Qrystalos (catálogo)';
COMMENT ON TABLE qrysproc IS 'Procesos/submódulos Qrystalos por módulo';
COMMENT ON TABLE qrysgrupo IS 'Agrupadores funcionales (ej. Caja operativo + config)';
COMMENT ON TABLE plantrab IS 'Plan de trabajo / implantación por cliente';
COMMENT ON TABLE plantrabd IS 'Actividades del plan de trabajo';
