-- Firma HTML completa (p. ej. importada desde Outlook)
ALTER TABLE correo_plantilla
    ADD COLUMN IF NOT EXISTS firma_html TEXT;
