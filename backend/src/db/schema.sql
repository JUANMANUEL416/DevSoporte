-- ============================================================================
-- DevSoporte - Esquema PostgreSQL
-- Migrado desde el diccionario Clarion: C:\DEV11.1\Agenda\Agenda.dct
--
-- Conversión de tipos Clarion -> PostgreSQL:
--   CSTRING(n)      -> VARCHAR(n-1)   (CSTRING reserva 1 byte para el nulo)
--   STRING(n)       -> VARCHAR(n)
--   SHORT           -> SMALLINT
--   LONG            -> INTEGER
--   DECIMAL(14,2)   -> NUMERIC(14,2)
--   DATE/TIME group -> DATE / TIME (las columnas STRING(8) "FECHA" se modelan como DATE)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Usuarios del Sistema (USUSU)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ususu (
    usuario     VARCHAR(20) PRIMARY KEY,
    clave       VARCHAR(255) NOT NULL,           -- en Clarion era texto plano; aquí guardamos hash
    nombre      VARCHAR(100),
    principal   SMALLINT DEFAULT 0
);

-- ----------------------------------------------------------------------------
-- Consecutivos (ACNS)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS acns (
    prefijo     VARCHAR(9) PRIMARY KEY,
    consecutivo INTEGER DEFAULT 0
);

-- ----------------------------------------------------------------------------
-- Tabla Genérica (TGEN) - catálogos / listas de valores
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tgen (
    tabla       VARCHAR(15) NOT NULL,
    campo       VARCHAR(20) NOT NULL,
    codigo      VARCHAR(20) NOT NULL,
    descripcion VARCHAR(60),
    valor1      NUMERIC(14,2),
    dato1       VARCHAR(255),
    PRIMARY KEY (tabla, campo, codigo)
);
CREATE UNIQUE INDEX IF NOT EXISTS tgen_codigo ON tgen (codigo, tabla, campo);

-- ----------------------------------------------------------------------------
-- Clientes (CLIE)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clie (
    codigo        VARCHAR(20) PRIMARY KEY,
    nombrecliente VARCHAR(100),
    contrato      VARCHAR(15),
    ciudad        VARCHAR(21),
    prefijo       VARCHAR(10),
    rutaexport    VARCHAR(100),
    email         VARCHAR(120),
    noticliente   TEXT,
    liderproyecto TEXT
);

-- ----------------------------------------------------------------------------
-- Funcionarios del Cliente (CLIEF)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clief (
    codigo     VARCHAR(20) NOT NULL,
    documento  VARCHAR(20) NOT NULL,
    nombre     VARCHAR(120),
    cargo      VARCHAR(20),
    estado     VARCHAR(10),
    email      VARCHAR(120),
    tratamiento VARCHAR(20),
    PRIMARY KEY (codigo, documento)
);
CREATE INDEX IF NOT EXISTS clief_codigo ON clief (codigo);

DO $$ BEGIN
  ALTER TABLE clief
    ADD CONSTRAINT fk_clief_clie
    FOREIGN KEY (codigo) REFERENCES clie(codigo) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ----------------------------------------------------------------------------
-- Soportes Técnicos (SOPORT) - técnicos de soporte
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS soport (
    codigo VARCHAR(20) PRIMARY KEY,
    nombre VARCHAR(100),
    documento VARCHAR(20),
    estado VARCHAR(10),
    usuario VARCHAR(20),
    clave VARCHAR(255),
    email VARCHAR(120),
    firma TEXT,
    firma_fecha TIMESTAMPTZ
);

-- ----------------------------------------------------------------------------
-- Áreas de soporte (SOPAREA) - catálogo para bitácora
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS soparea (
    codigo  VARCHAR(20) PRIMARY KEY,
    nombre  VARCHAR(100) NOT NULL,
    estado  VARCHAR(10) DEFAULT 'A'
);

-- ----------------------------------------------------------------------------
-- Compañías / Conexión (LOGIN)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS login (
    compania    VARCHAR(4) PRIMARY KEY,
    razonsocial VARCHAR(100),
    servidor    VARCHAR(20),
    bdatos      VARCHAR(20),
    logo        VARCHAR(100),
    nit         VARCHAR(20),
    codigohab   VARCHAR(20),
    direccion   VARCHAR(50),
    telefono    VARCHAR(20)
);

-- ----------------------------------------------------------------------------
-- Eventos detalle (EVENTD)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS eventd (
    idevento    VARCHAR(10) NOT NULL,
    codigo      VARCHAR(10) NOT NULL,
    descripcion VARCHAR(50),
    PRIMARY KEY (idevento, codigo)
);

-- ----------------------------------------------------------------------------
-- Agenda (AGEN)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS agen (
    cnsevento   VARCHAR(20) PRIMARY KEY,
    descripcion VARCHAR(50),
    usuario     VARCHAR(20),
    idevento    VARCHAR(10),
    codigo      VARCHAR(10),
    fecha       TIMESTAMP,
    f_limite    TIMESTAMP,
    estado      VARCHAR(10)
);
CREATE INDEX IF NOT EXISTS agen_idevento ON agen (idevento, cnsevento);
CREATE INDEX IF NOT EXISTS agen_usuario ON agen (usuario, cnsevento);

-- ----------------------------------------------------------------------------
-- Semanas (TSEMA)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tsema (
    idsemana    VARCHAR(11) PRIMARY KEY,
    fechaini    TIMESTAMP,
    fechafin    TIMESTAMP,
    observacion VARCHAR(101)
);

-- ----------------------------------------------------------------------------
-- Bitácora encabezado semanal (BITE)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bite (
    cnsbite  VARCHAR(20) PRIMARY KEY,
    idsemana VARCHAR(11) REFERENCES tsema (idsemana),
    soporte  VARCHAR(101)
);
CREATE INDEX IF NOT EXISTS bite_idsemana ON bite (idsemana, cnsbite);

CREATE TABLE IF NOT EXISTS bite_clie (
    cnsbite     VARCHAR(20) NOT NULL,
    cliente     VARCHAR(20) NOT NULL,
    estado      VARCHAR(20) NOT NULL DEFAULT 'Abierta',
    fechacierre TIMESTAMPTZ,
    PRIMARY KEY (cnsbite, cliente)
);
CREATE INDEX IF NOT EXISTS bite_clie_cnsbite ON bite_clie (cnsbite);

-- ----------------------------------------------------------------------------
-- Bitácora de Soporte (BITA)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bita (
    cnssoporte    VARCHAR(20) PRIMARY KEY,
    fecha         TIMESTAMP,
    cliente       VARCHAR(20),
    soporte       VARCHAR(20),
    funcionario   VARCHAR(40),
    clase         VARCHAR(20),
    solicitud     VARCHAR(1000),
    respuesta     VARCHAR(1000),
    estado        VARCHAR(10),
    fechar        TIMESTAMP,
    observaciones VARCHAR(1000),
    medio         VARCHAR(10),
    cnsbite       VARCHAR(20),
    firma         TEXT,
    firma_fecha   TIMESTAMPTZ,
    imagenes_soporte TEXT
);
CREATE INDEX IF NOT EXISTS bita_cliente ON bita (cliente, cnssoporte);
CREATE INDEX IF NOT EXISTS bita_cnsbite ON bita (cnsbite, cnssoporte);

-- ----------------------------------------------------------------------------
-- Informes Diarios (INFOR)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS infor (
    consecutivo VARCHAR(20) PRIMARY KEY,
    fecha       TIMESTAMP,
    cliente     VARCHAR(20),
    informe     VARCHAR(1200),
    pendientes  VARCHAR(1200),
    ciudad      VARCHAR(20)
);
CREATE INDEX IF NOT EXISTS infor_cliente ON infor (cliente, consecutivo);

-- ----------------------------------------------------------------------------
-- Desarrollo Requerimientos (DESA)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS desa (
    consecutivo   VARCHAR(20) PRIMARY KEY,
    cliente       VARCHAR(20),
    fecha         TIMESTAMP,
    requerimiento VARCHAR(1200),
    desarrollo    VARCHAR(1200),
    modulo        VARCHAR(40),
    estado        VARCHAR(10),
    cnsixver      VARCHAR(20),
    para          VARCHAR(10),
    f_entrega     TIMESTAMP,
    usuario       VARCHAR(20)
);
CREATE INDEX IF NOT EXISTS desa_cliente ON desa (cliente, consecutivo);

-- ----------------------------------------------------------------------------
-- Desarrollo Requerimientos Export (DESAR)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS desar (
    consecutivo   VARCHAR(20) PRIMARY KEY,
    cliente       VARCHAR(20),
    fecha         TIMESTAMP,
    requerimiento VARCHAR(1200),
    desarrollo    VARCHAR(1200),
    modulo        VARCHAR(40),
    estado        VARCHAR(10),
    cnsixver      VARCHAR(20),
    para          VARCHAR(10),
    f_entrega     TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- Entregas a Desarrollo (ENT)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ent (
    cnsentrega VARCHAR(20) PRIMARY KEY,
    fecha      TIMESTAMP,
    usuario    VARCHAR(20),
    clase      VARCHAR(10),
    estado     VARCHAR(10),
    usuariorec VARCHAR(20),
    fecharec   TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- Detalle Entregas (ENTD)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS entd (
    cnsentrega  VARCHAR(20) NOT NULL,
    consecutivo VARCHAR(20) NOT NULL,
    PRIMARY KEY (cnsentrega, consecutivo)
);

-- ----------------------------------------------------------------------------
-- Asignación de Proyectos (ASIGP)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS asigp (
    consecutivo VARCHAR(20) PRIMARY KEY,
    semana      VARCHAR(100),
    fecha       TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- Detalle Asignación de Proyectos (ASIGPD)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS asigpd (
    consecutivo VARCHAR(20) NOT NULL,
    item        SMALLINT NOT NULL,
    soporte     VARCHAR(20) NOT NULL,
    lunes       VARCHAR(20),
    martes      VARCHAR(20),
    miercoles   VARCHAR(20),
    jueves      VARCHAR(20),
    viernes     VARCHAR(20),
    sabado      VARCHAR(20),
    PRIMARY KEY (consecutivo, item, soporte)
);

-- ----------------------------------------------------------------------------
-- Anexo Asignación de Proyectos (ASIGPA)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS asigpa (
    consecutivo VARCHAR(20) NOT NULL,
    item        SMALLINT NOT NULL,
    soporte     VARCHAR(20) NOT NULL,
    cliente     VARCHAR(20),
    actividad   VARCHAR(1200),
    PRIMARY KEY (soporte, consecutivo, item)
);

-- ----------------------------------------------------------------------------
-- Licencias (LICEN)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS licen (
    consecutivo   VARCHAR(20) PRIMARY KEY,
    fecha         TIMESTAMP,
    cliente       VARCHAR(20),
    usuario       VARCHAR(20),
    f_corte       TIMESTAMP,
    observaciones VARCHAR(1019)
);
CREATE INDEX IF NOT EXISTS licen_cliente ON licen (consecutivo, cliente);

-- ----------------------------------------------------------------------------
-- Requerimientos Web / Ixver (IXVER)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ixver (
    idreq         VARCHAR(20) PRIMARY KEY,
    fecha         DATE,
    usuario       VARCHAR(20),
    idmodulo      VARCHAR(20),
    requerimiento VARCHAR(2019),
    estado        VARCHAR(10),
    proyecto      VARCHAR(100),
    idapp         VARCHAR(10),
    idproc        VARCHAR(100)
);

-- ----------------------------------------------------------------------------
-- Solicitudes de Requerimientos (SREQ)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sreq (
    cnssolicitud  VARCHAR(20) PRIMARY KEY,
    usuario       VARCHAR(20),
    requerimiento VARCHAR(1024),
    observaciones VARCHAR(1024),
    estado        VARCHAR(10),
    respuesta     VARCHAR(1024),
    solicita      VARCHAR(100),
    autoriza      VARCHAR(20),
    fecha         TIMESTAMP,
    f_cierre      TIMESTAMP,
    modulo        VARCHAR(20),
    devuelto      SMALLINT,
    razondevol    VARCHAR(2048),
    idapp         VARCHAR(10),
    procedimiento VARCHAR(100),
    ruta          VARCHAR(100),
    usuarioasig   VARCHAR(20),
    planteamiento VARCHAR(2048),
    asignado      SMALLINT
);

-- ----------------------------------------------------------------------------
-- Solicitudes Adjuntos (SREQA)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sreqa (
    cnssolicitud VARCHAR(20) NOT NULL,
    item         SMALLINT NOT NULL,
    nombre       VARCHAR(100),
    ruta         VARCHAR(2055),
    PRIMARY KEY (cnssolicitud, item)
);

-- ----------------------------------------------------------------------------
-- Solicitudes Notas (SREQN)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sreqn (
    cnssolicitud VARCHAR(20) NOT NULL,
    item         SMALLINT NOT NULL,
    usuario      VARCHAR(20),
    fecha        TIMESTAMP,
    nota         VARCHAR(1024),
    PRIMARY KEY (cnssolicitud, item)
);

-- ----------------------------------------------------------------------------
-- Códigos Pruebas de Desarrollo (CODIP)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS codip (
    codigo      VARCHAR(20) PRIMARY KEY,
    descripcion VARCHAR(255),
    clase       VARCHAR(20)
);

-- ----------------------------------------------------------------------------
-- Pruebas de Desarrollo (DESAP)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS desap (
    consecutivo   VARCHAR(20) NOT NULL,
    codigo        VARCHAR(20),
    cumple        VARCHAR(4) NOT NULL,
    observaciones VARCHAR(255),
    PRIMARY KEY (consecutivo, cumple)
);

-- ----------------------------------------------------------------------------
-- Pruebas Desarrollo (DESAPR)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS desapr (
    cnsprueba   VARCHAR(20) PRIMARY KEY,
    fecha       TIMESTAMP,
    usuario     VARCHAR(20),
    cnsreq      VARCHAR(20),
    codigop     VARCHAR(20),
    cumple      VARCHAR(10),
    observacion VARCHAR(1024)
);

-- ----------------------------------------------------------------------------
-- Variables Globales del Sistema (USVGS)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usvgs (
    idvariable   VARCHAR(20) PRIMARY KEY,
    descripcion  VARCHAR(100),
    tp_variable  VARCHAR(12),
    dato         VARCHAR(120),
    indvigencia  SMALLINT,
    observacion  VARCHAR(4096),
    tabla        VARCHAR(30),
    campo_codigo VARCHAR(30)
);
CREATE INDEX IF NOT EXISTS usvgs_descripcion ON usvgs (descripcion, idvariable);

-- ----------------------------------------------------------------------------
-- Registro de Asistencia Capacitaciones (RASIST)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rasist (
    cnscapacita VARCHAR(20) PRIMARY KEY,
    fecha       TIMESTAMP,
    capacitador VARCHAR(255),
    tema        VARCHAR(100),
    tema1       VARCHAR(100),
    tema2       VARCHAR(100),
    tema3       VARCHAR(100),
    duracion    SMALLINT,
    cliente     VARCHAR(20),
    compromiso  VARCHAR(2000),
    compromiso1 VARCHAR(200),
    compromiso2 VARCHAR(200),
    registro_token TEXT,
    estado       VARCHAR(20) DEFAULT 'Abierta',
    cnscrono     VARCHAR(20),
    tema_codigo  VARCHAR(20)
);
CREATE INDEX IF NOT EXISTS rasist_cnscrono ON rasist (cnscrono);
CREATE INDEX IF NOT EXISTS rasist_cnscrono_tema ON rasist (cnscrono, tema_codigo);

-- ----------------------------------------------------------------------------
-- Asistentes a Capacitaciones (RASISTD)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rasistd (
    cnscapacita VARCHAR(20) NOT NULL,
    item        SMALLINT NOT NULL,
    documento   VARCHAR(20),
    nombres     VARCHAR(200),
    cargo       VARCHAR(50),
    firma       TEXT,
    firma_fecha TIMESTAMPTZ,
    PRIMARY KEY (cnscapacita, item)
);
CREATE INDEX IF NOT EXISTS rasistd_cnscapacita ON rasistd (cnscapacita);

DO $$ BEGIN
  ALTER TABLE rasistd
    ADD CONSTRAINT fk_rasistd_rasist
    FOREIGN KEY (cnscapacita) REFERENCES rasist(cnscapacita) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Invitaciones por correo (asistentes remotos)
CREATE TABLE IF NOT EXISTS rasist_invite (
    id          SERIAL PRIMARY KEY,
    cnscapacita VARCHAR(20) NOT NULL,
    email       VARCHAR(120) NOT NULL,
    documento   VARCHAR(20),
    item        SMALLINT,
    enviado     TIMESTAMPTZ,
    registrado  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (cnscapacita, email)
);
CREATE INDEX IF NOT EXISTS rasist_invite_cnscapacita ON rasist_invite (cnscapacita);

-- ----------------------------------------------------------------------------
-- Agenda de contactos (AGCON) — equipo de trabajo y contactos frecuentes
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS agcon (
    codigo    VARCHAR(20) PRIMARY KEY,
    nombre    VARCHAR(100) NOT NULL,
    cargo     VARCHAR(80),
    email     VARCHAR(120) NOT NULL,
    empresa   VARCHAR(100),
    telefono  VARCHAR(30),
    categoria VARCHAR(20) DEFAULT 'equipo',
    cliente   VARCHAR(20) REFERENCES clie(codigo) ON DELETE SET NULL,
    estado    VARCHAR(10) DEFAULT 'A',
    notas     TEXT
);
CREATE INDEX IF NOT EXISTS agcon_estado ON agcon (estado, categoria);
CREATE UNIQUE INDEX IF NOT EXISTS agcon_email_unique ON agcon (LOWER(TRIM(email)));

-- ----------------------------------------------------------------------------
-- Bandeja / bitácora de correos enviados (CORREOS)
-- Registra cada envío realizado por el sistema (fecha, destinatario, éxito).
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS correos (
    id                SERIAL PRIMARY KEY,
    fecha             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    cliente           VARCHAR(20),
    nombrecliente     VARCHAR(100),
    contexto          VARCHAR(30) NOT NULL DEFAULT 'bandeja',
    referencia        VARCHAR(40),
    para              TEXT,
    cc                TEXT,
    asunto            TEXT,
    cuerpo            TEXT,
    adjuntos          TEXT,
    num_destinatarios INTEGER DEFAULT 0,
    exito             BOOLEAN NOT NULL DEFAULT FALSE,
    error             TEXT,
    usuario           VARCHAR(20)
);
CREATE INDEX IF NOT EXISTS correos_cliente ON correos (cliente, fecha DESC);
CREATE INDEX IF NOT EXISTS correos_fecha ON correos (fecha DESC);
CREATE INDEX IF NOT EXISTS correos_contexto ON correos (contexto, fecha DESC);

-- Plantilla y firma global para correos de la bandeja
CREATE TABLE IF NOT EXISTS correo_plantilla (
    id               SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    cuerpo_template  TEXT NOT NULL,
    firma_texto      TEXT,
    firma_imagen     TEXT,
    firma_html       TEXT,
    updated_at       TIMESTAMPTZ DEFAULT NOW(),
    updated_by       VARCHAR(20)
);

-- ----------------------------------------------------------------------------
-- Actividades Realizadas en Proyectos / Informe (ACTPROY) — IXIMS-REG-029
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS actproy (
    consecutivo      VARCHAR(20) PRIMARY KEY,
    fecha            TIMESTAMP,
    cliente          VARCHAR(20),
    ciudad           VARCHAR(60),
    ingeniero        VARCHAR(100),
    duracion         VARCHAR(40),
    actividades      TEXT,
    pendientes       TEXT,
    estado           VARCHAR(20) DEFAULT 'Abierto',
    firma_cli        TEXT,
    firma_cli_fecha  TIMESTAMPTZ,
    firma_cli_nombre VARCHAR(120)
);
CREATE INDEX IF NOT EXISTS actproy_cliente ON actproy (cliente, consecutivo);
CREATE INDEX IF NOT EXISTS actproy_fecha ON actproy (fecha DESC);

-- ----------------------------------------------------------------------------
-- Actas de reunión con el cliente (ACTREUN) — IXIMS-REG-026
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS actreun (
    consecutivo   VARCHAR(20) PRIMARY KEY,
    fecha         TIMESTAMP,
    cliente       VARCHAR(20),
    desarrollo    TEXT,
    codificacion  VARCHAR(30) DEFAULT 'IXIMS-REG-026',
    vigencia      DATE DEFAULT '2012-11-29',
    version       VARCHAR(10) DEFAULT '1',
    estado        VARCHAR(20) DEFAULT 'Abierta'
);

CREATE TABLE IF NOT EXISTS actreunc (
    consecutivo    VARCHAR(20) NOT NULL,
    item           INT NOT NULL,
    lado           VARCHAR(10) NOT NULL DEFAULT 'ix',
    compromiso     TEXT,
    responsable    VARCHAR(120),
    fecha_inicio   DATE,
    fecha_entrega  DATE,
    PRIMARY KEY (consecutivo, item)
);

CREATE TABLE IF NOT EXISTS actreund (
    consecutivo   VARCHAR(20) NOT NULL,
    item          INT NOT NULL,
    lado          VARCHAR(10) NOT NULL DEFAULT 'ix',
    nombre        VARCHAR(120),
    cargo         VARCHAR(80),
    firma         TEXT,
    firma_fecha   TIMESTAMPTZ,
    documento     VARCHAR(30),
    PRIMARY KEY (consecutivo, item)
);

CREATE INDEX IF NOT EXISTS actreun_cliente ON actreun (cliente, consecutivo);
CREATE INDEX IF NOT EXISTS actreun_fecha ON actreun (fecha DESC);
CREATE INDEX IF NOT EXISTS actreunc_consecutivo ON actreunc (consecutivo);
CREATE INDEX IF NOT EXISTS actreund_consecutivo ON actreund (consecutivo);

DO $$ BEGIN
  ALTER TABLE actreunc
    ADD CONSTRAINT fk_actreunc_actreun
    FOREIGN KEY (consecutivo) REFERENCES actreun(consecutivo) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE actreund
    ADD CONSTRAINT fk_actreund_actreun
    FOREIGN KEY (consecutivo) REFERENCES actreun(consecutivo) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ----------------------------------------------------------------------------
-- Control de versiones y cambios de desarrollo
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- Temas de capacitación (catálogo) y cronograma por cliente
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS captema (
    codigo      VARCHAR(20) PRIMARY KEY,
    nombre      VARCHAR(120) NOT NULL,
    estado      VARCHAR(1) DEFAULT 'A',
    observacion VARCHAR(500),
    dirigidoa   VARCHAR(500)
);
CREATE INDEX IF NOT EXISTS captema_nombre ON captema (nombre);

CREATE TABLE IF NOT EXISTS captemad (
    codigo      VARCHAR(20) NOT NULL,
    item        SMALLINT NOT NULL,
    descripcion VARCHAR(500) NOT NULL,
    duracion    SMALLINT,
    estado      VARCHAR(1) DEFAULT 'A',
    PRIMARY KEY (codigo, item)
);
CREATE INDEX IF NOT EXISTS captemad_codigo ON captemad (codigo);

DO $$ BEGIN
  ALTER TABLE captemad
    ADD CONSTRAINT fk_captemad_captema
    FOREIGN KEY (codigo) REFERENCES captema(codigo) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS cronocap (
    cnscrono    VARCHAR(20) PRIMARY KEY,
    cliente     VARCHAR(20) NOT NULL,
    fecha       DATE DEFAULT CURRENT_DATE,
    fecha_inicial DATE NOT NULL DEFAULT CURRENT_DATE,
    fecha_final   DATE NOT NULL DEFAULT CURRENT_DATE,
    descripcion VARCHAR(500),
    estado      VARCHAR(20) DEFAULT 'Borrador',
    observacion VARCHAR(1000),
    usuario     VARCHAR(50)
);
CREATE INDEX IF NOT EXISTS cronocap_cliente ON cronocap (cliente);
CREATE INDEX IF NOT EXISTS cronocap_fecha ON cronocap (fecha DESC);
CREATE INDEX IF NOT EXISTS cronocap_fecha_inicial ON cronocap (fecha_inicial DESC);

DO $$ BEGIN
  ALTER TABLE cronocap
    ADD CONSTRAINT fk_cronocap_clie
    FOREIGN KEY (cliente) REFERENCES clie(codigo);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS cronocapd (
    cnscrono        VARCHAR(20) NOT NULL,
    item            SMALLINT NOT NULL,
    tema_codigo     VARCHAR(20) NOT NULL,
    tema_nombre     VARCHAR(120) NOT NULL,
    descripcion     VARCHAR(500) NOT NULL,
    duracion        SMALLINT,
    dirigidoa       VARCHAR(500),
    fecha_probable  DATE,
    hora_sugerida   VARCHAR(5),
    estado          VARCHAR(20) DEFAULT 'Programado',
    fecha_real      DATE,
    observacion     VARCHAR(1000),
    PRIMARY KEY (cnscrono, item)
);
CREATE INDEX IF NOT EXISTS cronocapd_cnscrono ON cronocapd (cnscrono);
CREATE INDEX IF NOT EXISTS cronocapd_tema ON cronocapd (tema_codigo);

DO $$ BEGIN
  ALTER TABLE cronocapd
    ADD CONSTRAINT fk_cronocapd_cronocap
    FOREIGN KEY (cnscrono) REFERENCES cronocap(cnscrono) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
