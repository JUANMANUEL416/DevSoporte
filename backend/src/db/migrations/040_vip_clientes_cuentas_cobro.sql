-- Clientes VIP (personales) y cuentas de cobro con numeración por tercero.

CREATE TABLE IF NOT EXISTS vipclie (
    codigo          VARCHAR(20) PRIMARY KEY,
    nombrecliente   VARCHAR(120) NOT NULL,
    nit             VARCHAR(20),
    ciudad          VARCHAR(80),
    email           VARCHAR(120),
    notas           TEXT,
    cc_formato      VARCHAR(15) NOT NULL DEFAULT 'anio_mes',
    cc_separador    VARCHAR(1) DEFAULT '-',
    cc_relleno      SMALLINT NOT NULL DEFAULT 3,
    cc_consecutivo  INTEGER NOT NULL DEFAULT 0,
    cc_prefijo_num  VARCHAR(10) DEFAULT '',
    cuenta_banco    VARCHAR(40),
    banco_nombre    VARCHAR(60) DEFAULT 'Bancolombia'
);

COMMENT ON TABLE vipclie IS 'Clientes VIP personales (independientes del menú operativo clie)';
COMMENT ON COLUMN vipclie.cc_formato IS 'secuencial | anio_mes';
COMMENT ON COLUMN vipclie.cc_consecutivo IS 'Último consecutivo usado (formato secuencial)';

CREATE TABLE IF NOT EXISTS vipcc (
    cns             SERIAL PRIMARY KEY,
    codigo_cliente  VARCHAR(20) NOT NULL REFERENCES vipclie(codigo) ON DELETE RESTRICT,
    numero          VARCHAR(20) NOT NULL,
    fecha_emision   DATE NOT NULL DEFAULT CURRENT_DATE,
    periodo_desde   DATE,
    periodo_hasta   DATE,
    valor           NUMERIC(14,2) NOT NULL,
    concepto        TEXT NOT NULL,
    valor_letras    VARCHAR(255),
    ciudad_emision  VARCHAR(80),
    estado          VARCHAR(15) NOT NULL DEFAULT 'Emitida',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS vipcc_cliente_numero ON vipcc (codigo_cliente, numero);
CREATE INDEX IF NOT EXISTS vipcc_cliente ON vipcc (codigo_cliente);
CREATE INDEX IF NOT EXISTS vipcc_fecha ON vipcc (fecha_emision DESC);

COMMENT ON TABLE vipcc IS 'Cuentas de cobro emitidas a clientes VIP';

INSERT INTO acns (prefijo, consecutivo) VALUES ('VIPC', 0)
ON CONFLICT (prefijo) DO NOTHING;

-- Terceros iniciales (ajustar NIT/datos según corresponda).
INSERT INTO vipclie (
    codigo, nombrecliente, nit, ciudad, cc_formato, cc_separador, cc_relleno, cc_consecutivo, notas
) VALUES
(
    'BIT',
    'BIT',
    NULL,
    NULL,
    'secuencial',
    '',
    3,
    65,
    'Numeración secuencial (ej. 065, 066).'
),
(
    'CESPER',
    'CLINICA ESPERANZA S.A.S',
    '900815840-3',
    NULL,
    'anio_mes',
    '-',
    3,
    0,
    'Numeración año-mes con guión (ej. 2026-05).'
),
(
    'SERMULTI',
    'Sermultisalud',
    NULL,
    NULL,
    'anio_mes',
    '-',
    3,
    0,
    'Numeración año-mes con guión (ej. 2026-04). Sin guión: cc_separador vacío → 202604.'
)
ON CONFLICT (codigo) DO NOTHING;
