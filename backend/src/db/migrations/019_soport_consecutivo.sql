-- Consecutivo numérico para técnicos de soporte (0001, 0002, ...)
INSERT INTO acns (prefijo, consecutivo) VALUES ('SOP', 0)
ON CONFLICT (prefijo) DO NOTHING;

-- Sincroniza contador si ya hay códigos numéricos de 4 dígitos
UPDATE acns
SET consecutivo = GREATEST(
  consecutivo,
  COALESCE((
    SELECT MAX(codigo::int)
    FROM soport
    WHERE codigo ~ '^[0-9]+$'
  ), 0)
)
WHERE prefijo = 'SOP';
