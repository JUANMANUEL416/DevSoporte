-- Registro release 1.2.12: filas de compromisos con altura dinamica en PDF acta.

INSERT INTO devcamb (
  consecutivo, tipo, rama, titulo, descripcion, cambios, estado,
  f_inicio, f_integracion, f_terminacion, usuario
) VALUES (
  'devdes022',
  'fix',
  'fix/actreun-pdf-compromisos-altura',
  'Actas PDF: compromisos con texto completo',
  'Las filas de compromisos en el PDF ya no tienen altura fija de 28px; se ajustan al texto y continuan en pagina nueva si hace falta.',
  E'actreunPdf.js: rowHeightForValues, valueCell y ensurePageSpace en drawCompromisosTable.',
  'integrado',
  NOW() - INTERVAL '15 minutes',
  NOW() - INTERVAL '5 minutes',
  NOW() - INTERVAL '5 minutes',
  'ADMIN'
) ON CONFLICT (consecutivo) DO UPDATE SET
  titulo = EXCLUDED.titulo,
  descripcion = EXCLUDED.descripcion,
  cambios = EXCLUDED.cambios,
  estado = 'integrado',
  f_integracion = COALESCE(devcamb.f_integracion, EXCLUDED.f_integracion),
  f_terminacion = COALESCE(devcamb.f_terminacion, EXCLUDED.f_terminacion);

UPDATE acns SET consecutivo = GREATEST(consecutivo, 22) WHERE prefijo = 'DEVDES';
