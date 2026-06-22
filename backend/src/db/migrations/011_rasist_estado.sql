-- Estado de capacitación: Abierta | Cerrada | Anulada
ALTER TABLE rasist ADD COLUMN IF NOT EXISTS estado VARCHAR(20) DEFAULT 'Abierta';

UPDATE rasist SET estado = 'Abierta' WHERE estado IS NULL OR TRIM(estado) = '';
