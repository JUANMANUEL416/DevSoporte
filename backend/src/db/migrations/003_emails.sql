-- Migración: campos email en clientes y funcionarios

ALTER TABLE clie ADD COLUMN IF NOT EXISTS email VARCHAR(120);
ALTER TABLE clief ADD COLUMN IF NOT EXISTS email VARCHAR(120);
