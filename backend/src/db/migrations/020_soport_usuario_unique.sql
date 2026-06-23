-- Usuario de acceso único por técnico (login)
CREATE UNIQUE INDEX IF NOT EXISTS soport_usuario_unique
  ON soport (UPPER(TRIM(usuario)))
  WHERE usuario IS NOT NULL AND TRIM(usuario) <> '';
