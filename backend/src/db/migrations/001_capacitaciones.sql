-- Migración: Control de Capacitaciones (RASIST / RASISTD)
-- Ejecutar si la BD ya existía antes de incluir estas tablas.

CREATE TABLE IF NOT EXISTS rasist (
    cnscapacita VARCHAR(20) PRIMARY KEY,
    fecha       TIMESTAMP,
    capacitador VARCHAR(255),
    tema        VARCHAR(100),
    tema1       VARCHAR(100),
    tema2       VARCHAR(100),
    tema3       VARCHAR(100),
    duracion    SMALLINT,
    cliente     VARCHAR(20),
    compromiso  VARCHAR(2000),
    compromiso1 VARCHAR(200),
    compromiso2 VARCHAR(200)
);

CREATE TABLE IF NOT EXISTS rasistd (
    cnscapacita VARCHAR(20) NOT NULL,
    item        SMALLINT NOT NULL,
    documento   VARCHAR(20),
    nombres     VARCHAR(200),
    cargo       VARCHAR(50),
    PRIMARY KEY (cnscapacita, item)
);

CREATE INDEX IF NOT EXISTS rasistd_cnscapacita ON rasistd (cnscapacita);

DO $$ BEGIN
  ALTER TABLE rasistd
    ADD CONSTRAINT fk_rasistd_rasist
    FOREIGN KEY (cnscapacita) REFERENCES rasist(cnscapacita) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

INSERT INTO acns (prefijo, consecutivo) VALUES ('CAP', 0)
ON CONFLICT (prefijo) DO NOTHING;
