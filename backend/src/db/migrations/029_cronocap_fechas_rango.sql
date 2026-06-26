-- Rango de fechas del cronograma (inicial / final)

ALTER TABLE cronocap ADD COLUMN IF NOT EXISTS fecha_inicial DATE;
ALTER TABLE cronocap ADD COLUMN IF NOT EXISTS fecha_final DATE;

UPDATE cronocap
SET fecha_inicial = COALESCE(fecha_inicial, fecha, CURRENT_DATE)
WHERE fecha_inicial IS NULL;

UPDATE cronocap
SET fecha_final = COALESCE(fecha_final, fecha_inicial, fecha, CURRENT_DATE)
WHERE fecha_final IS NULL;

ALTER TABLE cronocap ALTER COLUMN fecha_inicial SET NOT NULL;
ALTER TABLE cronocap ALTER COLUMN fecha_final SET NOT NULL;

CREATE INDEX IF NOT EXISTS cronocap_fecha_inicial ON cronocap (fecha_inicial DESC);

COMMENT ON COLUMN cronocap.fecha_inicial IS 'Inicio del periodo planificado del cronograma';
COMMENT ON COLUMN cronocap.fecha_final IS 'Fin del periodo planificado del cronograma';
