-- Plantilla HTML enriquecida por cliente VIP para el formato de cuenta de cobro.

ALTER TABLE vipclie
  ADD COLUMN IF NOT EXISTS cc_plantilla TEXT;

COMMENT ON COLUMN vipclie.cc_plantilla IS
  'Plantilla HTML de la cuenta de cobro. Variables: {{numero}}, {{fecha_emision}}, {{ciudad_emision}}, {{cliente_nombre}}, {{cliente_nit}}, {{emisor_nombre}}, {{emisor_documento}}, {{valor}}, {{valor_letras}}, {{concepto}}, {{periodo}}, {{cuenta_banco}}, {{banco_nombre}}, {{cuerpo}}, etc.';
