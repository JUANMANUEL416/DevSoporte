-- Actas de reunión con el cliente — formato IXIMS-REG-026.
CREATE TABLE IF NOT EXISTS actreun (
    consecutivo   VARCHAR(20) PRIMARY KEY,
    fecha         TIMESTAMP,
    cliente       VARCHAR(20),
    desarrollo    TEXT,
    codificacion  VARCHAR(30) DEFAULT 'IXIMS-REG-026',
    vigencia      DATE DEFAULT '2012-11-29',
    version       VARCHAR(10) DEFAULT '1',
    estado        VARCHAR(20) DEFAULT 'Abierta'
);

CREATE TABLE IF NOT EXISTS actreunc (
    consecutivo    VARCHAR(20) NOT NULL,
    item           INT NOT NULL,
    lado           VARCHAR(10) NOT NULL DEFAULT 'ix',
    compromiso     TEXT,
    responsable    VARCHAR(120),
    fecha_inicio   DATE,
    fecha_entrega  DATE,
    PRIMARY KEY (consecutivo, item)
);

CREATE TABLE IF NOT EXISTS actreund (
    consecutivo   VARCHAR(20) NOT NULL,
    item          INT NOT NULL,
    lado          VARCHAR(10) NOT NULL DEFAULT 'ix',
    nombre        VARCHAR(120),
    cargo         VARCHAR(80),
    firma         TEXT,
    firma_fecha   TIMESTAMPTZ,
    PRIMARY KEY (consecutivo, item)
);

CREATE INDEX IF NOT EXISTS actreun_cliente ON actreun (cliente, consecutivo);
CREATE INDEX IF NOT EXISTS actreun_fecha ON actreun (fecha DESC);
CREATE INDEX IF NOT EXISTS actreunc_consecutivo ON actreunc (consecutivo);
CREATE INDEX IF NOT EXISTS actreund_consecutivo ON actreund (consecutivo);

DO $$ BEGIN
  ALTER TABLE actreunc
    ADD CONSTRAINT fk_actreunc_actreun
    FOREIGN KEY (consecutivo) REFERENCES actreun(consecutivo) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE actreund
    ADD CONSTRAINT fk_actreund_actreun
    FOREIGN KEY (consecutivo) REFERENCES actreun(consecutivo) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
