-- Código de cliente automático (001, 002, ...) vía tabla ACNS prefijo CLIE.

INSERT INTO acns (prefijo, consecutivo) VALUES ('CLIE', 0)
ON CONFLICT (prefijo) DO NOTHING;

UPDATE acns
SET consecutivo = GREATEST(
  consecutivo,
  COALESCE((
    SELECT MAX(CAST(NULLIF(regexp_replace(codigo, '\D', '', 'g'), '') AS INTEGER))
    FROM clie
    WHERE codigo ~ '^\d+$'
  ), 0)
)
WHERE prefijo = 'CLIE';
