-- Vinculo acta de capacitacion con cronograma y tema

ALTER TABLE rasist ADD COLUMN IF NOT EXISTS cnscrono VARCHAR(20);
ALTER TABLE rasist ADD COLUMN IF NOT EXISTS tema_codigo VARCHAR(20);

CREATE INDEX IF NOT EXISTS rasist_cnscrono ON rasist (cnscrono);
CREATE INDEX IF NOT EXISTS rasist_cnscrono_tema ON rasist (cnscrono, tema_codigo);

COMMENT ON COLUMN rasist.cnscrono IS 'Cronograma de origen (opcional)';
COMMENT ON COLUMN rasist.tema_codigo IS 'Codigo del tema mayor en el cronograma (opcional)';
