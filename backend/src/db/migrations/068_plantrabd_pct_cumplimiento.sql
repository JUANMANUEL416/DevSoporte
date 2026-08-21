-- Porcentaje de cumplimiento por actividad del plan de trabajo
ALTER TABLE plantrabd ADD COLUMN IF NOT EXISTS pct_cumplimiento SMALLINT;

DO $$ BEGIN
  ALTER TABLE plantrabd
    ADD CONSTRAINT plantrabd_pct_cumplimiento_range
    CHECK (pct_cumplimiento IS NULL OR (pct_cumplimiento >= 0 AND pct_cumplimiento <= 100));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON COLUMN plantrabd.pct_cumplimiento IS 'Porcentaje de cumplimiento de la actividad (0-100)';
