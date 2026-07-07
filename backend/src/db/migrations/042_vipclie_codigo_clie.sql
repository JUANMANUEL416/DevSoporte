-- Vincula cliente VIP con cliente operativo (clie) para soportes de bitácora en el periodo.

ALTER TABLE vipclie
  ADD COLUMN IF NOT EXISTS codigo_clie VARCHAR(20);

COMMENT ON COLUMN vipclie.codigo_clie IS
  'Código del cliente operativo (clie) para listar y adjuntar soportes del periodo al enviar la cuenta de cobro.';
