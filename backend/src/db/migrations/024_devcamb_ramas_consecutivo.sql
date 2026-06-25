-- Ramas con consecutivo por tipo (feature/devdes001, fix/devfix001, hotfix/devhot001)
-- y fechas de inicio / terminación.

ALTER TABLE devcamb ADD COLUMN IF NOT EXISTS f_inicio TIMESTAMP;
ALTER TABLE devcamb ADD COLUMN IF NOT EXISTS f_terminacion TIMESTAMP;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'devcamb' AND column_name = 'f_solicitud'
  ) THEN
    UPDATE devcamb SET f_inicio = COALESCE(f_inicio, f_solicitud, NOW()) WHERE f_inicio IS NULL;
  ELSE
    UPDATE devcamb SET f_inicio = COALESCE(f_inicio, NOW()) WHERE f_inicio IS NULL;
  END IF;
END $$;

INSERT INTO acns (prefijo, consecutivo) VALUES
  ('DEVDES', 0),
  ('DEVFIX', 0),
  ('DEVHOT', 0)
ON CONFLICT (prefijo) DO NOTHING;

-- Migrar registro inicial al nuevo formato.
DELETE FROM devcamb WHERE consecutivo IN ('DEVC-00000001', 'devdes001');

INSERT INTO devcamb (
  consecutivo, tipo, rama, titulo, descripcion, estado, f_inicio, usuario
) VALUES (
  'devdes001',
  'feature',
  'feature/devdes001',
  'Control de versiones y cambios',
  'Tabla y pantalla en DevSoporte para registrar ramas (feature/fix/hotfix), cambios realizados e historial de publicaciones.',
  'en_desarrollo',
  NOW(),
  'ADMIN'
) ON CONFLICT (consecutivo) DO UPDATE SET
  rama = EXCLUDED.rama,
  titulo = EXCLUDED.titulo,
  descripcion = EXCLUDED.descripcion;

UPDATE acns SET consecutivo = GREATEST(consecutivo, 1) WHERE prefijo = 'DEVDES';
