-- Bandeja / bitácora de correos enviados.
-- Registra cada envío realizado por el sistema (fecha, destinatario, éxito).
CREATE TABLE IF NOT EXISTS correos (
    id                SERIAL PRIMARY KEY,
    fecha             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    cliente           VARCHAR(20),                 -- código de CLIE (puede ser NULL)
    nombrecliente     VARCHAR(100),                -- snapshot del nombre del cliente
    contexto          VARCHAR(30) NOT NULL DEFAULT 'bandeja', -- bandeja|capacitacion|bitacora|bitacora_semana|firma|invitacion|sistema
    referencia        VARCHAR(40),                 -- consecutivo relacionado (cnssoporte, cnscapacita, ...)
    para              TEXT,                         -- destinatarios principales
    cc                TEXT,                         -- copia
    asunto            TEXT,
    cuerpo            TEXT,                         -- texto plano del mensaje
    adjuntos          TEXT,                         -- JSON [{ filename, size }]
    num_destinatarios INTEGER DEFAULT 0,
    exito             BOOLEAN NOT NULL DEFAULT FALSE,
    error             TEXT,
    usuario           VARCHAR(20)                  -- usuario del sistema que disparó el envío
);

CREATE INDEX IF NOT EXISTS correos_cliente ON correos (cliente, fecha DESC);
CREATE INDEX IF NOT EXISTS correos_fecha ON correos (fecha DESC);
CREATE INDEX IF NOT EXISTS correos_contexto ON correos (contexto, fecha DESC);
