-- Firma de aceptación de solución (BITA)
ALTER TABLE bita ADD COLUMN IF NOT EXISTS firma TEXT;
ALTER TABLE bita ADD COLUMN IF NOT EXISTS firma_fecha TIMESTAMPTZ;
