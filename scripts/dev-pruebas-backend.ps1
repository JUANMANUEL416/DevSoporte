# Backend de pruebas — puerto 3301, BD devsoporte_pruebas (PM2/produccion no se toca).
$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
$Backend = Join-Path $Root 'backend'
$EnvPruebas = Join-Path $Backend '.env.pruebas'
$EnvExample = Join-Path $Backend '.env.pruebas.example'

Set-Location $Backend

if (-not (Test-Path $EnvPruebas)) {
  if (-not (Test-Path $EnvExample)) {
    throw "Falta backend\.env.pruebas. Copie backend\.env.pruebas.example a backend\.env.pruebas"
  }
  Copy-Item $EnvExample $EnvPruebas
  Write-Host "Creado backend\.env.pruebas desde .env.pruebas.example" -ForegroundColor Yellow
}

Write-Host "Pruebas API: http://localhost:3301  |  BD: devsoporte_pruebas" -ForegroundColor Cyan
Write-Host "Produccion sigue en http://localhost:3300 (PM2, BD devsoporte)" -ForegroundColor DarkGray
npm run dev:pruebas
