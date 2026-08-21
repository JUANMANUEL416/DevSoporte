-- Módulo y plan en temas de capacitación (misma lógica que cronograma desde plan)
ALTER TABLE captema ADD COLUMN IF NOT EXISTS cnplan VARCHAR(20);
ALTER TABLE captema ADD COLUMN IF NOT EXISTS modulo_codigo VARCHAR(20);
ALTER TABLE captema ADD COLUMN IF NOT EXISTS modulo_nombre VARCHAR(200);
ALTER TABLE captema ADD COLUMN IF NOT EXISTS modulo_orden SMALLINT;

CREATE INDEX IF NOT EXISTS captema_cnplan ON captema (cnplan);
CREATE INDEX IF NOT EXISTS captema_modulo_plan ON captema (cnplan, modulo_codigo, qrys_grupo);

DO $$ BEGIN
  ALTER TABLE captema
    ADD CONSTRAINT fk_captema_plantrab
    FOREIGN KEY (cnplan) REFERENCES plantrab(cnplan);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE captema
    ADD CONSTRAINT fk_captema_qrysmod
    FOREIGN KEY (modulo_codigo) REFERENCES qrysmod(codigo);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON COLUMN captema.cnplan IS 'Plan de trabajo origen (temas generados automáticamente)';
COMMENT ON COLUMN captema.modulo_codigo IS 'Módulo Qrystalos del plan (contexto de capacitación)';
COMMENT ON COLUMN captema.modulo_nombre IS 'Nombre del módulo en el momento de generación';
COMMENT ON COLUMN captema.modulo_orden IS 'Orden del módulo para agrupación en UI';

-- Backfill temas ya generados desde plan
UPDATE captema c
SET
  cnplan = b.cnplan,
  modulo_codigo = b.modulo_codigo,
  modulo_nombre = b.modulo_nombre,
  modulo_orden = b.modulo_orden
FROM (
  SELECT DISTINCT ON (c2.codigo)
    c2.codigo,
    d.cnplan,
    m.codigo AS modulo_codigo,
    m.nombre AS modulo_nombre,
    m.orden AS modulo_orden
  FROM captema c2
  JOIN plantrabd d ON d.cnplan = (regexp_match(c2.observacion, 'Generado desde plan ([0-9]+)'))[1]
  JOIN qrysproc pr ON pr.codigo = d.proceso_codigo
  JOIN qrysmod m ON m.codigo = pr.modulo
  JOIN qrysgrupod gd ON gd.proceso = d.proceso_codigo AND gd.grupo = c2.qrys_grupo
  WHERE c2.observacion LIKE 'Generado desde plan %'
    AND c2.qrys_grupo IS NOT NULL
    AND d.estado <> 'Cancelado'
  ORDER BY c2.codigo, m.orden ASC, d.orden ASC
) b
WHERE c.codigo = b.codigo
  AND c.modulo_codigo IS NULL;
