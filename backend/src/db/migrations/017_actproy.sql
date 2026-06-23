-- Actividades Realizadas en Proyectos (Informe) — formato IXIMS-REG-029.
-- Documento de soporte por proyecto/cliente, con firma digital del cliente.
CREATE TABLE IF NOT EXISTS actproy (
    consecutivo      VARCHAR(20) PRIMARY KEY,
    fecha            TIMESTAMP,
    cliente          VARCHAR(20),
    ciudad           VARCHAR(60),
    ingeniero        VARCHAR(100),          -- técnico/ingeniero de soporte (SOPORT)
    duracion         VARCHAR(40),
    actividades      TEXT,                   -- ACTIVIDADES REALIZADAS
    pendientes       TEXT,                   -- ACTIVIDADES PENDIENTES
    estado           VARCHAR(20) DEFAULT 'Abierto',
    firma_cli        TEXT,                   -- firma digital del cliente (data URL)
    firma_cli_fecha  TIMESTAMPTZ,
    firma_cli_nombre VARCHAR(120)
);

CREATE INDEX IF NOT EXISTS actproy_cliente ON actproy (cliente, consecutivo);
CREATE INDEX IF NOT EXISTS actproy_fecha ON actproy (fecha DESC);
