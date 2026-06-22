-- Semanas (TSEMA), encabezados semanales (BITE) y consecutivos de bitácora

CREATE TABLE IF NOT EXISTS tsema (
    idsemana    VARCHAR(11) PRIMARY KEY,
    fechaini    TIMESTAMP,
    fechafin    TIMESTAMP,
    observacion VARCHAR(101)
);

CREATE TABLE IF NOT EXISTS bite (
    cnsbite  VARCHAR(20) PRIMARY KEY,
    idsemana VARCHAR(11) REFERENCES tsema (idsemana),
    soporte  VARCHAR(101)
);

CREATE INDEX IF NOT EXISTS bite_idsemana ON bite (idsemana, cnsbite);
CREATE INDEX IF NOT EXISTS bita_cnsbite ON bita (cnsbite, cnssoporte);

INSERT INTO acns (prefijo, consecutivo) VALUES
    ('BITE', 0),
    ('BITA', 0)
ON CONFLICT (prefijo) DO NOTHING;
