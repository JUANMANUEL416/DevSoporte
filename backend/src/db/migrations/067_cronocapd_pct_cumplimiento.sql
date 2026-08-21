-- Porcentaje de cumplimiento por ítem del cronograma (seguimiento / Excel)
ALTER TABLE cronocapd ADD COLUMN IF NOT EXISTS pct_cumplimiento SMALLINT;

DO $$ BEGIN
  ALTER TABLE cronocapd
    ADD CONSTRAINT cronocapd_pct_cumplimiento_range
    CHECK (pct_cumplimiento IS NULL OR (pct_cumplimiento >= 0 AND pct_cumplimiento <= 100));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON COLUMN cronocapd.pct_cumplimiento IS 'Porcentaje de cumplimiento del ítem (0-100)';
