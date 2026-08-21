-- tema_codigo almacena «modulo|area» (ej. 33|Gestión de Radicaciones) y puede superar 20 caracteres.

ALTER TABLE cronocapd ALTER COLUMN tema_codigo TYPE VARCHAR(80);

ALTER TABLE rasist ALTER COLUMN tema_codigo TYPE VARCHAR(80);

COMMENT ON COLUMN cronocapd.tema_codigo IS 'Clave del tema: modulo|area del plan o código legacy del catálogo';
