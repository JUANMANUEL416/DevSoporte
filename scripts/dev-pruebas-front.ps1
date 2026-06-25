# Frontend de pruebas — puerto 9021, API en 3301 (no interrumpe PM2 en 3300).
$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot

$port = 9021
$inUse = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
if ($inUse) {
  Write-Host "Puerto $port ocupado (PID $($inUse.OwningProcess)). Libere ese proceso o cierre otra instancia de Quasar." -ForegroundColor Red
  throw "No se puede iniciar pruebas UI en http://localhost:$port"
}

$env:BACKEND_URL = 'http://localhost:3301'
$env:QUASAR_DEV_PORT = "$port"
Set-Location (Join-Path $Root 'frontend')
Write-Host "Pruebas UI: http://localhost:$port  ->  API: http://localhost:3301" -ForegroundColor Cyan
Write-Host "Produccion sigue en http://localhost:3300 (PM2)" -ForegroundColor DarkGray
npm run dev
