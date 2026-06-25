#Requires -Version 5.1
<#
.SYNOPSIS
  Inicia o reinicia el túnel ngrok vía PM2 (puerto 3300).
.PARAMETER Domain
  Dominio reservado ngrok (opcional; si no, lee backend\.env).
.EXAMPLE
  .\deploy\start-ngrok.ps1
  .\deploy\start-ngrok.ps1 -Domain crested-gently-landowner.ngrok-free.dev
#>
param(
  [string]$Domain = ''
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
$Port = 3300

Set-Location $Root

try {
  Invoke-RestMethod -Uri "http://localhost:$Port/api/health" -TimeoutSec 3 | Out-Null
} catch {
  throw "DevSoporte no responde en http://localhost:$Port. Ejecute: pm2 start deploy\ecosystem.config.cjs"
}

if (-not (Get-Command ngrok -ErrorAction SilentlyContinue)) {
  throw 'ngrok no está instalado. https://ngrok.com/download'
}

if (-not (Get-Command pm2 -ErrorAction SilentlyContinue)) {
  throw 'PM2 no está instalado. npm install -g pm2'
}

$env:NGROK_PORT = "$Port"
if ($Domain) {
  $env:NGROK_DOMAIN = $Domain
}

# Evita ERR_NGROK_334 si quedó un ngrok manual u otro túnel con el mismo dominio.
pm2 stop ngrok-devsoporte 2>$null | Out-Null
Get-Process ngrok -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1

$desc = pm2 describe ngrok-devsoporte 2>$null
if ($LASTEXITCODE -eq 0) {
  Write-Host 'Reiniciando ngrok-devsoporte (PM2)...' -ForegroundColor Cyan
  pm2 restart ngrok-devsoporte --update-env
} else {
  Write-Host 'Iniciando ngrok-devsoporte (PM2)...' -ForegroundColor Cyan
  pm2 start (Join-Path $Root 'deploy\ecosystem.config.cjs') --env production --only ngrok-devsoporte --update-env
}

pm2 save | Out-Null
Start-Sleep -Seconds 3

Write-Host "`nTunel ngrok gestionado por PM2." -ForegroundColor Green
Write-Host "Estado: pm2 status ngrok-devsoporte"
Write-Host "Logs:   pm2 logs ngrok-devsoporte"
Write-Host "Panel:  http://127.0.0.1:4040"
Write-Host "PUBLIC_APP_URL y CORS_ORIGIN deben coincidir con la URL en backend\.env"
