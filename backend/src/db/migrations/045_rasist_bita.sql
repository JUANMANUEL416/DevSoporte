-- Vincular soportes de bitácora a actas de capacitación.

CREATE TABLE IF NOT EXISTS rasist_bita (
    cnscapacita VARCHAR(20) NOT NULL REFERENCES rasist(cnscapacita) ON DELETE CASCADE,
    cnssoporte  VARCHAR(20) NOT NULL REFERENCES bita(cnssoporte) ON DELETE CASCADE,
    PRIMARY KEY (cnscapacita, cnssoporte)
);

CREATE UNIQUE INDEX IF NOT EXISTS rasist_bita_cnssoporte_uq ON rasist_bita (cnssoporte);
CREATE INDEX IF NOT EXISTS rasist_bita_cnscapacita ON rasist_bita (cnscapacita);

COMMENT ON TABLE rasist_bita IS 'Soportes técnicos de bitácora vinculados a una acta de capacitación';
