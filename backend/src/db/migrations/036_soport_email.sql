-- Correo del técnico de soporte (recuperación de contraseña)
ALTER TABLE soport ADD COLUMN IF NOT EXISTS email VARCHAR(120);

COMMENT ON COLUMN soport.email IS 'Correo para recuperación de contraseña y notificaciones internas';
