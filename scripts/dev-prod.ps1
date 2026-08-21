# DevSoporte produccion: backend (3300) + frontend Quasar (9020).
$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
$backendScript = Join-Path $Root 'scripts\dev-prod-backend.ps1'
$frontScript = Join-Path $Root 'scripts\dev-prod-front.ps1'

Write-Host "Iniciando DevSoporte (PRODUCCION)..." -ForegroundColor Cyan
Write-Host "  API:  http://localhost:3300" -ForegroundColor DarkGray
Write-Host "  UI:   http://localhost:9020" -ForegroundColor DarkGray

$apiReady = $false
try {
  Invoke-RestMethod -Uri 'http://localhost:3300/api/health' -TimeoutSec 2 | Out-Null
  $apiReady = $true
  Write-Host "API produccion ya activa en http://localhost:3300" -ForegroundColor Yellow
} catch {
  $apiReady = $false
}

if (-not $apiReady) {
  Start-Process powershell -ArgumentList @(
    '-NoProfile', '-ExecutionPolicy', 'Bypass', '-NoExit', '-File', $backendScript
  ) -WindowStyle Minimized | Out-Null

  $deadline = (Get-Date).AddSeconds(60)
  while ((Get-Date) -lt $deadline) {
    try {
      Invoke-RestMethod -Uri 'http://localhost:3300/api/health' -TimeoutSec 2 | Out-Null
      $apiReady = $true
      break
    } catch {
      Start-Sleep -Seconds 2
    }
  }
  if (-not $apiReady) {
    throw 'La API de produccion no respondio en http://localhost:3300 a tiempo.'
  }
}

& $frontScript
