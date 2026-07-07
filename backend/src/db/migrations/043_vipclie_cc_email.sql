-- Correo y contactos exclusivos para envío de cuenta de cobro (independientes de soporte).

ALTER TABLE vipclie
  ADD COLUMN IF NOT EXISTS cc_email VARCHAR(120);

ALTER TABLE vipclie
  ADD COLUMN IF NOT EXISTS cc_contactos TEXT;

COMMENT ON COLUMN vipclie.cc_email IS
  'Correo principal (Para) al enviar la cuenta de cobro. No usar el email de soporte/bitácora.';

COMMENT ON COLUMN vipclie.cc_contactos IS
  'JSON [{nombre,cargo,email}] de contactos adicionales para cuenta de cobro (Para/CC).';
