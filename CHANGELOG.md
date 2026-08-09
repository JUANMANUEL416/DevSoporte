# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/).

## [1.2.17] - 2026-08-09

### Corregido
- **Bitácora:** la IA al organizar la respuesta de cierre corrige y estructura el texto técnico, sin redactarlo como correo.

## [1.2.16] - 2026-08-09

### Corregido
- **Bitácora:** diálogo de finalizar soporte con scroll; solicitud y observación siempre visibles en bloques independientes; área de respuesta más amplia.

## [1.2.15] - 2026-08-09

### Agregado
- **Bitácora:** al finalizar un soporte, el diálogo muestra el soporte solicitado y la observación antes de ingresar la respuesta.

## [1.2.14] - 2026-08-08

### Corregido
- **Informe de actividades:** campo Duración en el formulario; PDF con cuadros de altura dinámica y paginación para mostrar todo el texto de actividades realizadas y pendientes.

## [1.2.13] - 2026-08-08

### Corregido
- **Informe de actividades:** diálogo maximizado con scroll en el contenido; botones Cancelar y Guardar siempre visibles abajo.

## [1.2.12] - 2026-08-08

### Corregido
- **PDF del acta:** filas de compromisos con altura dinámica; el texto largo ya no se corta en la celda.

## [1.2.11] - 2026-08-08

### Corregido
- **PDF del acta:** error 500 al ver PDF cuando el motivo/desarrollo es largo (paginación sin `switchToPage` inválido).

## [1.2.10] - 2026-08-08

### Agregado
- **Sesión renovable (sliding session):** cada petición autenticada extiende la vigencia del JWT; aviso al login si la sesión expiró.

### Corregido
- **PDF del acta:** el motivo/desarrollo ya no se corta a 220 px; muestra todo el texto con paginación automática.

## [1.2.9] - 2026-08-08

### Agregado
- **Dictado por voz** e **integración OpenAI** en actas, compromisos, bitácora, cronograma, bandeja de correos, notificaciones y formularios genéricos.
- **Vista previa editable** de compromisos extraídos por IA: responsable, fechas de inicio/entrega y lado cliente/IX antes de agregar al acta.

### Corregido
- Inserción de compromisos sugeridos por IA en actas abiertas (item duplicado y fechas inválidas).

### Cambiado
- Edición de actas en **pantalla completa**.
- Clientes/proyectos ordenados por **código** en configuración.
- **Documento del funcionario** editable al modificar el registro en el detalle del cliente.

## [1.2.8] - 2026-07-13

### Corregido
- **Actas de reunión**: no se puede agregar el mismo asistente dos veces; el selector oculta funcionarios y técnicos ya asignados.

## [1.2.7] - 2026-07-11

### Corregido
- **PDF de actas**: tabla de asistentes con check en IX Colombia o Cliente (formato IXIMS-REG-026), sin columnas duplicadas.

### Agregado
- **Edición de compromisos** en actas abiertas, con texto multilínea visible en la lista.

### Cambiado
- Botones de acción de compromisos y asistentes alineados a la izquierda.

## [1.2.6] - 2026-07-09

### Agregado
- **Actas de reunión** con el cliente (formato IXIMS-REG-026): PDF, compromisos, asistentes y flujo de firmas.
- **Finalizar reunión**, envío de enlaces de firma por correo y validación de documento en firma pública.
- Estado **Terminada** automático al completar firmas; envío del acta firmada al equipo del cliente.
- **Capacitaciones**: asistentes técnicos de soporte (documento) y vínculo de soportes de bitácora al acta.

### Cambiado
- UI de actas: formulario fullscreen, botones de acción en una fila alineados a la izquierda.

## [1.2.5] - 2026-07-06

### Agregado
- **Menú Administrativo** con acceso restringido: clientes VIP y cuentas de cobro.
- **Clientes VIP**: plantilla Word/HTML para cuenta de cobro, variables arrastrables, vista previa y PDF (Puppeteer).
- **Cuentas de cobro**: numeración configurable, duplicar avanzando un mes, envío por correo con PDF automático y **adjuntos PDF adicionales**.
- **Correo CXC**: remitente independiente (`SMTP_FROM_CXC`) y perfil SMTP opcional (`SMTP_CXC_*`).
- **Firmas grupales bitácora**: al cerrar semana, PDF por funcionario y enlace público para firmar varios soportes.

### Cambiado
- Bandeja de correos: mejoras en redacción, adjuntos y uso de agenda de contactos.

## [1.2.4] - 2026-06-28

### Agregado
- **Agenda de contactos**: catálogo de correos frecuentes (equipo de trabajo, clientes, externos).
- Integración en **Bandeja de Correos**: selector de agenda, carga automática del equipo en CC y acceso rápido al catálogo.

## [1.2.3] - 2026-06-28

### Agregado
- **Recuperar contraseña** para técnicos de soporte: enlace por correo y página pública para definir nueva clave.
- Campo **correo electrónico** en técnicos de soporte (requerido para recuperación).

### Cambiado
- **Login** rediseñado con aspecto moderno y flujo integrado de olvidé mi contraseña.
- **Panel de inicio** y **menú lateral**: tarjetas estilo ticket, más compactas y sin scroll vertical en desktop.

## [1.2.2] - 2026-06-26

### Agregado
- **Hora sugerida** al agregar temas al cronograma (campo HH:MM en ítems y PDF).
- **Duplicar cronograma** para capacitaciones de refuerzo (copia en Borrador).
- Filtro de cronogramas por **fecha de inicio** (Desde/Hasta), mes actual por defecto.

### Cambiado
- Cronogramas ordenados por **consecutivo** (`cnscrono`).
- PDF cronograma: columna unificada **Fecha y hora sugerida**.
- Correo de cronograma: fechas **sin hora** (solo día).
- Layout cronograma: mejor uso del ancho; botones duplicar/editar en la misma fila.
- PDF bitácora: más espacio entre registros y entre texto y líneas verticales.

## [1.2.1] - 2026-06-26

### Cambiado
- **Temas de capacitación:** listado ordenado por código de tema.
- **Cronograma:** temas expandibles/colapsables en el detalle; orden por fecha probable ascendente.
- **PDF cronograma:** temas ordenados por fecha probable ascendente.

## [1.2.0] - 2026-06-26

### Agregado
- Módulo **Cronograma de capacitaciones** por cliente (programación y seguimiento).
- Catálogo de **Temas de capacitación** con ítems y campo *Dirigido a*.
- PDF de cronograma (modos programación y seguimiento), con opción de adjuntar soportes de actas cerradas.
- Notificación por correo con PDF de cronograma (programación o seguimiento).
- Capacitaciones **desde cronograma**: prefill de tema, duración, fecha y vínculo `cnscrono` / `tema_codigo` en actas.

### Cambiado
- Control de versiones: backfill de registros `devver`/`devcamb` para versiones 1.1.4 y 1.1.5.

## [1.1.5] - 2026-06-25

### Agregado
- Autostart de ngrok con PM2 (`ngrok-devsoporte`) en `npm run deploy` e inicio de producción.
- Variables `NGROK_AUTOSTART` y `NGROK_DOMAIN` en ejemplos de `.env`.

### Cambiado
- `start-ngrok.ps1` gestiona el túnel vía PM2 y limpia procesos ngrok huérfanos.

## [1.1.4] - 2026-06-25

### Agregado
- Miniaturas de evidencias en el cuerpo del correo de bitácora; imágenes completas como adjuntos.
- Badge y contador de imágenes en listado de bitácora; mejoras UX del modal de evidencias.

### Cambiado
- Saludo del correo con tratamiento del funcionario solicitante; listado de imágenes con opción Quitar.

## [1.1.3] - 2026-06-25

### Agregado
- Imágenes de soporte en bitácora (formulario, detalle y correo con adjuntos e inline).
- Campo **Tratamiento** en funcionarios (Doctor, Sra., etc.) para saludo en correos.
- Botón de evidencias en soportes cerrados antes de enviar el correo.

### Cambiado
- `npm run release` publica cambios integrados en `devver` / `devcamb` y actualiza `VERSION`.

## [1.1.0] - 2026-06-23

### Agregado
- Bandeja de correos con envío SMTP, historial y adjuntos.
- Plantilla elegante de correo, firma Outlook (HTML) e importación desde carpeta de firmas.
- Actividades de proyecto (ACTPROY) con PDF, firma pública e informe por correo.
- Credenciales y firma para técnicos de soporte; login dual `ususu` / `soport`.
- Script `npm run db:clean` (conserva `correo_plantilla`).
- Despliegue en producción: build SPA, servicio PM2 y scripts `deploy/`.

### Cambiado
- Render HTML de correos con diseño moderno (tarjeta, párrafos, bloques guía).

## [1.0.0] - 2026-06-22

### Agregado
- Migración inicial Clarion → web (bitácora, capacitaciones, firmas, clientes, catálogos).

[1.2.4]: https://github.com/JUANMANUEL416/DevSoporte/compare/v1.2.3...v1.2.4
[1.2.3]: https://github.com/JUANMANUEL416/DevSoporte/compare/v1.2.2...v1.2.3
[1.2.2]: https://github.com/JUANMANUEL416/DevSoporte/compare/v1.2.1...v1.2.2
[1.2.1]: https://github.com/JUANMANUEL416/DevSoporte/compare/v1.2.0...v1.2.1
[1.2.0]: https://github.com/JUANMANUEL416/DevSoporte/compare/v1.1.5...v1.2.0
[1.1.5]: https://github.com/JUANMANUEL416/DevSoporte/compare/v1.1.4...v1.1.5
[1.1.4]: https://github.com/JUANMANUEL416/DevSoporte/compare/v1.1.3...v1.1.4
[1.1.3]: https://github.com/JUANMANUEL416/DevSoporte/compare/v1.1.0...v1.1.3
[1.1.0]: https://github.com/JUANMANUEL416/DevSoporte/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/JUANMANUEL416/DevSoporte/releases/tag/v1.0.0
