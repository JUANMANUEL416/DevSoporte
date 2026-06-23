-- Limpia todos los datos excepto correo_plantilla (plantilla y firma de correos).
-- Uso: desde backend con node o psql contra la BD devsoporte.

DO $$
DECLARE
  tables_sql TEXT;
BEGIN
  SELECT string_agg(format('%I', tablename), ', ' ORDER BY tablename)
  INTO tables_sql
  FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename <> 'correo_plantilla';

  IF tables_sql IS NOT NULL THEN
    EXECUTE 'TRUNCATE TABLE ' || tables_sql || ' RESTART IDENTITY CASCADE';
  END IF;
END $$;

-- Confirmación
SELECT 'correo_plantilla conservada' AS estado,
       (SELECT COUNT(*) FROM correo_plantilla) AS filas_plantilla;
