INSERT INTO acns (prefijo, consecutivo) VALUES ('RASIST', 0)
ON CONFLICT (prefijo) DO NOTHING;
