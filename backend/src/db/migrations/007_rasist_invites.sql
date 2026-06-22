-- Invitaciones por correo (asistentes que se registran al abrir el enlace).
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

DO $$ BEGIN
  ALTER TABLE rasist_invite
    ADD CONSTRAINT fk_rasist_invite_rasist
    FOREIGN KEY (cnscapacita) REFERENCES rasist(cnscapacita) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
