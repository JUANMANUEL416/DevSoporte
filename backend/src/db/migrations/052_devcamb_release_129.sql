-- Registro release 1.2.9: IA/dictado, vista previa compromisos actas, clientes y funcionarios.

INSERT INTO devcamb (
  consecutivo, tipo, rama, titulo, descripcion, cambios, estado,
  f_inicio, f_integracion, f_terminacion, usuario
) VALUES (
  'devdes017',
  'feature',
  'feature/ia-dictado-modulos',
  'Dictado por voz e IA OpenAI en modulos de texto',
  'Web Speech API para dictado y OpenAI para organizar textos en actas, compromisos, bitacora, cronograma, bandeja, notificaciones y formularios genericos.',
  E'DictadoButton y OrganizarTextoButton reutilizables.\nServicio aiOrganizarTexto con acciones por contexto.\nRuta POST /api/ai/procesar.',
  'integrado',
  NOW() - INTERVAL '3 hours',
  NOW() - INTERVAL '2 hours',
  NOW() - INTERVAL '2 hours',
  'ADMIN'
) ON CONFLICT (consecutivo) DO UPDATE SET
  titulo = EXCLUDED.titulo,
  descripcion = EXCLUDED.descripcion,
  cambios = EXCLUDED.cambios,
  estado = 'integrado',
  f_integracion = COALESCE(devcamb.f_integracion, EXCLUDED.f_integracion),
  f_terminacion = COALESCE(devcamb.f_terminacion, EXCLUDED.f_terminacion);

INSERT INTO devcamb (
  consecutivo, tipo, rama, titulo, descripcion, cambios, estado,
  f_inicio, f_integracion, f_terminacion, usuario
) VALUES (
  'devdes018',
  'fix',
  'fix/actreun-compromisos-preview',
  'Actas: vista previa editable de compromisos IA',
  'Tras extraer compromisos con IA se muestra formulario para ajustar responsable y fechas antes de insertar. Dialogo de edicion del acta maximizado y normalizacion de fechas invalidas.',
  E'ActaCompromisosPreviewDialog con LookupSelect de responsable.\nutils/dateInput.js para fechas YYYY-MM-DD.\ninsertCompromisosSugeridos con validacion de responsable.',
  'integrado',
  NOW() - INTERVAL '90 minutes',
  NOW() - INTERVAL '45 minutes',
  NOW() - INTERVAL '45 minutes',
  'ADMIN'
) ON CONFLICT (consecutivo) DO UPDATE SET
  titulo = EXCLUDED.titulo,
  descripcion = EXCLUDED.descripcion,
  cambios = EXCLUDED.cambios,
  estado = 'integrado',
  f_integracion = COALESCE(devcamb.f_integracion, EXCLUDED.f_integracion),
  f_terminacion = COALESCE(devcamb.f_terminacion, EXCLUDED.f_terminacion);

INSERT INTO devcamb (
  consecutivo, tipo, rama, titulo, descripcion, cambios, estado,
  f_inicio, f_integracion, f_terminacion, usuario
) VALUES (
  'devdes019',
  'feature',
  'feature/clientes-orden-documento',
  'Clientes ordenados por codigo y documento editable',
  'Lista de clientes/proyectos ordenada por codigo. En funcionarios del cliente se permite editar el numero de documento al modificar el registro.',
  E'clientes.orderBy = codigo en entities.js.\nGenericForm editableOnEdit y crudRouter editablePk.\nValidacion de documento duplicado en beforeFuncionarioUpdate.',
  'integrado',
  NOW() - INTERVAL '30 minutes',
  NOW() - INTERVAL '10 minutes',
  NOW() - INTERVAL '10 minutes',
  'ADMIN'
) ON CONFLICT (consecutivo) DO UPDATE SET
  titulo = EXCLUDED.titulo,
  descripcion = EXCLUDED.descripcion,
  cambios = EXCLUDED.cambios,
  estado = 'integrado',
  f_integracion = COALESCE(devcamb.f_integracion, EXCLUDED.f_integracion),
  f_terminacion = COALESCE(devcamb.f_terminacion, EXCLUDED.f_terminacion);

UPDATE acns SET consecutivo = GREATEST(consecutivo, 19) WHERE prefijo = 'DEVDES';
