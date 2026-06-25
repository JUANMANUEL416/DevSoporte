# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/).

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

[1.1.0]: https://github.com/JUANMANUEL416/DevSoporte/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/JUANMANUEL416/DevSoporte/releases/tag/v1.0.0
