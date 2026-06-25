-- Tratamiento/cortesía del funcionario (Doctor, Sra., etc.) y evidencias gráficas en bitácora

ALTER TABLE clief ADD COLUMN IF NOT EXISTS tratamiento VARCHAR(20);

ALTER TABLE bita ADD COLUMN IF NOT EXISTS imagenes_soporte TEXT;

COMMENT ON COLUMN clief.tratamiento IS 'Cortesía para correos: Doctor, Doctora, Sr., Sra., Srta.';
COMMENT ON COLUMN bita.imagenes_soporte IS 'JSON [{ nombre, tipo, data }] imágenes de soporte del trabajo';
