# Frontend de pruebas — puerto 9021, API en 3301 (no interrumpe PM2 en 3300).
$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
$env:BACKEND_URL = 'http://localhost:3301'
$env:QUASAR_DEV_PORT = '9021'
Set-Location (Join-Path $Root 'frontend')
Write-Host "Pruebas UI: http://localhost:9021  ->  API: http://localhost:3301" -ForegroundColor Cyan
Write-Host "Produccion sigue en http://localhost:3300 (PM2)" -ForegroundColor DarkGray
npm run dev
