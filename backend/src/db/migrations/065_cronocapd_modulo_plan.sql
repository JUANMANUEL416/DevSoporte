-- Módulo Qrystalos en ítems de cronograma (cronogramas generados desde plan de trabajo)
ALTER TABLE cronocapd ADD COLUMN IF NOT EXISTS modulo_codigo VARCHAR(20);
ALTER TABLE cronocapd ADD COLUMN IF NOT EXISTS modulo_nombre VARCHAR(120);
ALTER TABLE cronocapd ADD COLUMN IF NOT EXISTS modulo_orden SMALLINT;

CREATE INDEX IF NOT EXISTS cronocapd_modulo ON cronocapd (cnscrono, modulo_orden, modulo_codigo);

COMMENT ON COLUMN cronocapd.modulo_codigo IS 'Módulo Qrystalos (plan de trabajo → cronograma)';
COMMENT ON COLUMN cronocapd.modulo_nombre IS 'Nombre del módulo Qrystalos';
COMMENT ON COLUMN cronocapd.modulo_orden IS 'Orden del módulo en catálogo Qrystalos';
