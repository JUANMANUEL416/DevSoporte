-- Contactos de notificación del cliente (JSON: nombre, cargo, email)
ALTER TABLE clie ADD COLUMN IF NOT EXISTS noticliente TEXT;
