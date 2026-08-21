# Backend produccion — puerto 3300, BD devsoporte (.env).
$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
$Backend = Join-Path $Root 'backend'
$EnvFile = Join-Path $Backend '.env'
$EnvExample = Join-Path $Backend '.env.example'

Set-Location $Backend

if (-not (Test-Path $EnvFile)) {
  if (-not (Test-Path $EnvExample)) {
    throw "Falta backend\.env. Copie backend\.env.example a backend\.env"
  }
  Copy-Item $EnvExample $EnvFile
  Write-Host "Creado backend\.env desde .env.example" -ForegroundColor Yellow
}

$port = 3300
$inUse = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
if ($inUse) {
  Write-Host "Puerto $port ocupado (PID $($inUse.OwningProcess)). Cierre PM2 u otra instancia antes de iniciar otro backend." -ForegroundColor Red
  throw "No se puede iniciar produccion API en http://localhost:$port"
}

Write-Host "Produccion API: http://localhost:3300  |  BD: devsoporte" -ForegroundColor Cyan
npm run dev
