-- Hora sugerida al programar temas en el cronograma (formato HH:MM).

ALTER TABLE cronocapd ADD COLUMN IF NOT EXISTS hora_sugerida VARCHAR(5);

COMMENT ON COLUMN cronocapd.hora_sugerida IS 'Hora sugerida de la capacitacion (HH:MM)';
