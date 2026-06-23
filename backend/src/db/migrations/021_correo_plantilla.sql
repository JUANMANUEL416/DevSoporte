-- Plantilla y firma global para correos de la bandeja
CREATE TABLE IF NOT EXISTS correo_plantilla (
    id               SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    cuerpo_template  TEXT NOT NULL,
    firma_texto      TEXT,
    firma_imagen     TEXT,
    updated_at       TIMESTAMPTZ DEFAULT NOW(),
    updated_by       VARCHAR(20)
);

INSERT INTO correo_plantilla (id, cuerpo_template, firma_texto)
VALUES (
    1,
    '{{saludo}}

Reciba un cordial saludo de parte del equipo de DevSoporte.

[Escriba aquí el contenido de su mensaje.]

Quedamos atentos a cualquier inquietud.

Cordialmente,',
    'Equipo de Soporte — DevSoporte'
)
ON CONFLICT (id) DO NOTHING;
