# Backend de pruebas — puerto 3301, BD devsoporte_pruebas (PM2/produccion no se toca).
$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
Set-Location (Join-Path $Root 'backend')
Write-Host "Pruebas API: http://localhost:3301  |  BD: devsoporte_pruebas" -ForegroundColor Cyan
Write-Host "Produccion sigue en http://localhost:3300 (PM2, BD devsoporte)" -ForegroundColor DarkGray
npm run dev:pruebas
