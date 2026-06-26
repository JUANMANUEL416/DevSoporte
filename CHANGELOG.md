# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/).

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

[1.2.0]: https://github.com/JUANMANUEL416/DevSoporte/compare/v1.1.5...v1.2.0
[1.1.5]: https://github.com/JUANMANUEL416/DevSoporte/compare/v1.1.4...v1.1.5
[1.1.4]: https://github.com/JUANMANUEL416/DevSoporte/compare/v1.1.3...v1.1.4
[1.1.3]: https://github.com/JUANMANUEL416/DevSoporte/compare/v1.1.0...v1.1.3
[1.1.0]: https://github.com/JUANMANUEL416/DevSoporte/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/JUANMANUEL416/DevSoporte/releases/tag/v1.0.0
