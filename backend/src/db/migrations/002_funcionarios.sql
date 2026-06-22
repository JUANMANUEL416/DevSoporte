-- Migración: Funcionarios por cliente (CLIEF)

CREATE TABLE IF NOT EXISTS clief (
    codigo     VARCHAR(20) NOT NULL,
    documento  VARCHAR(20) NOT NULL,
    nombre     VARCHAR(120),
    cargo      VARCHAR(20),
    estado     VARCHAR(10),
    PRIMARY KEY (codigo, documento)
);

CREATE INDEX IF NOT EXISTS clief_codigo ON clief (codigo);

DO $$ BEGIN
  ALTER TABLE clief
    ADD CONSTRAINT fk_clief_clie
    FOREIGN KEY (codigo) REFERENCES clie(codigo) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
