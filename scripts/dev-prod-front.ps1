# Frontend produccion — puerto 9020, API en 3300.
$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot

$port = 9020
$apiPort = 3300

$inUse = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
if ($inUse) {
  Write-Host "Puerto $port ocupado (PID $($inUse.OwningProcess)). Libere ese proceso o cierre otra instancia de Quasar." -ForegroundColor Red
  throw "No se puede iniciar produccion UI en http://localhost:$port"
}

try {
  Invoke-RestMethod -Uri "http://localhost:$apiPort/api/health" -TimeoutSec 3 | Out-Null
} catch {
  Write-Host "La API en http://localhost:$apiPort no responde. Espere a que el backend arranque." -ForegroundColor Yellow
}

$env:BACKEND_URL = "http://localhost:$apiPort"
$env:QUASAR_DEV_PORT = "$port"
Set-Location (Join-Path $Root 'frontend')
Write-Host "Produccion UI: http://localhost:$port  ->  API: http://localhost:$apiPort" -ForegroundColor Cyan
npm run dev
