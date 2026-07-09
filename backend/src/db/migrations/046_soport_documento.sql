-- Documento de identidad en técnicos de soporte (asistencia a capacitaciones).

ALTER TABLE soport ADD COLUMN IF NOT EXISTS documento VARCHAR(20);

CREATE UNIQUE INDEX IF NOT EXISTS soport_documento_uq
  ON soport (documento)
  WHERE documento IS NOT NULL AND TRIM(documento) <> '';

COMMENT ON COLUMN soport.documento IS 'Número de documento para registro en actas de capacitación';
