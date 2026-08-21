-- Vínculo temas de capacitación ↔ agrupadores Qrystalos; plan → cronograma generado

ALTER TABLE captema ADD COLUMN IF NOT EXISTS qrys_grupo VARCHAR(20);
CREATE INDEX IF NOT EXISTS captema_qrys_grupo ON captema (qrys_grupo);

DO $$ BEGIN
  ALTER TABLE captema
    ADD CONSTRAINT fk_captema_qrysgrupo
    FOREIGN KEY (qrys_grupo) REFERENCES qrysgrupo(codigo);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE plantrab ADD COLUMN IF NOT EXISTS cnscrono VARCHAR(20);
CREATE INDEX IF NOT EXISTS plantrab_cnscrono ON plantrab (cnscrono);

COMMENT ON COLUMN captema.qrys_grupo IS 'Agrupador Qrystalos origen del tema de capacitación';
COMMENT ON COLUMN plantrab.cnscrono IS 'Cronograma de capacitación generado desde este plan';
