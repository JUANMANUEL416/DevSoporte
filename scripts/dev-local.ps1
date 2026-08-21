# DevSoporte local: backend de pruebas (3301) + frontend Quasar (9021).
$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
$backendScript = Join-Path $Root 'scripts\dev-pruebas-backend.ps1'
$frontScript = Join-Path $Root 'scripts\dev-pruebas-front.ps1'

Write-Host "Iniciando DevSoporte..." -ForegroundColor Cyan
Write-Host "  API:  http://localhost:3301" -ForegroundColor DarkGray
Write-Host "  UI:   http://localhost:9021" -ForegroundColor DarkGray

Start-Process powershell -ArgumentList @(
  '-NoProfile', '-ExecutionPolicy', 'Bypass', '-NoExit', '-File', $backendScript
) -WindowStyle Minimized | Out-Null

Start-Sleep -Seconds 4
& $frontScript
