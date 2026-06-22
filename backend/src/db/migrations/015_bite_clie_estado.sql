-- Estado semanal por cliente (cierre de bitácora y reporte a equipos)
CREATE TABLE IF NOT EXISTS bite_clie (
    cnsbite     VARCHAR(20) NOT NULL,
    cliente     VARCHAR(20) NOT NULL,
    estado      VARCHAR(20) NOT NULL DEFAULT 'Abierta',
    fechacierre TIMESTAMPTZ,
    PRIMARY KEY (cnsbite, cliente)
);

CREATE INDEX IF NOT EXISTS bite_clie_cnsbite ON bite_clie (cnsbite);
