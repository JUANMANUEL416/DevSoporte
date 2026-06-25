-- Control de versiones y cambios de desarrollo (ramas feature/fix/hotfix).

CREATE TABLE IF NOT EXISTS devver (
    version     VARCHAR(20) PRIMARY KEY,
    fecha       TIMESTAMP DEFAULT NOW(),
    resumen     VARCHAR(500),
    changelog   TEXT,
    usuario     VARCHAR(20)
);

CREATE TABLE IF NOT EXISTS devcamb (
    consecutivo   VARCHAR(20) PRIMARY KEY,
    tipo          VARCHAR(10) NOT NULL CHECK (tipo IN ('feature', 'fix', 'hotfix')),
    rama          VARCHAR(100) NOT NULL,
    titulo        VARCHAR(200) NOT NULL,
    descripcion   TEXT,
    cambios       TEXT,
    estado        VARCHAR(20) NOT NULL DEFAULT 'en_desarrollo'
                  CHECK (estado IN ('en_desarrollo', 'integrado', 'publicado')),
    version       VARCHAR(20) REFERENCES devver(version),
    f_inicio      TIMESTAMP DEFAULT NOW(),
    f_terminacion TIMESTAMP,
    f_integracion TIMESTAMP,
    f_publicacion TIMESTAMP,
    usuario       VARCHAR(20)
);

CREATE INDEX IF NOT EXISTS devcamb_estado ON devcamb (estado, f_inicio DESC);
CREATE INDEX IF NOT EXISTS devcamb_version ON devcamb (version);
CREATE INDEX IF NOT EXISTS devver_fecha ON devver (fecha DESC);

INSERT INTO acns (prefijo, consecutivo) VALUES
  ('DEVDES', 0),
  ('DEVFIX', 0),
  ('DEVHOT', 0)
ON CONFLICT (prefijo) DO NOTHING;

-- Registro inicial: módulo de control de versiones.
INSERT INTO devcamb (
    consecutivo, tipo, rama, titulo, descripcion, estado, f_inicio, usuario
) VALUES (
    'devdes001',
    'feature',
    'feature/devdes001',
    'Control de versiones y cambios',
    'Tabla y pantalla en DevSoporte para registrar ramas (feature/fix/hotfix), cambios realizados e historial de publicaciones.',
    'en_desarrollo',
    NOW(),
    'ADMIN'
) ON CONFLICT (consecutivo) DO NOTHING;
