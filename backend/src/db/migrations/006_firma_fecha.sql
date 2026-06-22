-- Fecha/hora en que el asistente firmó (enlace público o desde el sistema).
ALTER TABLE rasistd ADD COLUMN IF NOT EXISTS firma_fecha TIMESTAMPTZ;
