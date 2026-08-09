-- Registro release 1.2.11: correccion error 500 al generar PDF de acta.

INSERT INTO devcamb (
  consecutivo, tipo, rama, titulo, descripcion, cambios, estado,
  f_inicio, f_integracion, f_terminacion, usuario
) VALUES (
  'devdes021',
  'fix',
  'fix/actreun-pdf-paginacion',
  'Actas: corregir error 500 al ver PDF',
  'Elimina switchToPage invalido en PDFKit al paginar motivo/desarrollo largo. Pagina el texto manualmente por bloques.',
  E'actreunPdf.js: textFittingHeight y drawBorderedFlowText sin switchToPage.',
  'integrado',
  NOW() - INTERVAL '20 minutes',
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

UPDATE acns SET consecutivo = GREATEST(consecutivo, 21) WHERE prefijo = 'DEVDES';
