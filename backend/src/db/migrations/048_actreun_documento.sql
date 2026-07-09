-- Documento del asistente para validación en firma pública (IXIMS-REG-026).
ALTER TABLE actreund ADD COLUMN IF NOT EXISTS documento VARCHAR(30);

CREATE INDEX IF NOT EXISTS actreund_documento ON actreund (consecutivo, documento);
