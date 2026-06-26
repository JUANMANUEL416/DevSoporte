-- Campo "dirigidoa": personal requerido para la capacitación

ALTER TABLE captema ADD COLUMN IF NOT EXISTS dirigidoa VARCHAR(500);

ALTER TABLE cronocapd ADD COLUMN IF NOT EXISTS dirigidoa VARCHAR(500);

COMMENT ON COLUMN captema.dirigidoa IS 'Personal al que va dirigida la capacitación';
COMMENT ON COLUMN cronocapd.dirigidoa IS 'Personal requerido (copiado del tema, editable en cronograma)';
