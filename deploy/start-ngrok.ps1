#Requires -Version 5.1
<#
.SYNOPSIS
  Inicia túnel ngrok hacia DevSoporte en producción (puerto 3300).
.PARAMETER Domain
  Dominio reservado ngrok (opcional).
.EXAMPLE
  .\deploy\start-ngrok.ps1
  .\deploy\start-ngrok.ps1 -Domain crested-gently-landowner.ngrok-free.dev
#>
param(
  [string]$Domain = 'crested-gently-landowner.ngrok-free.dev'
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
$Port = 3300

try {
  Invoke-RestMethod -Uri "http://localhost:$Port/api/health" -TimeoutSec 3 | Out-Null
} catch {
  throw "DevSoporte no responde en http://localhost:$Port. Ejecute: pm2 status"
}

$ngrok = Get-Command ngrok -ErrorAction Stop
$existing = Get-Process ngrok -ErrorAction SilentlyContinue
if ($existing) {
  Write-Host "Deteniendo ngrok anterior (PID $($existing.Id))..." -ForegroundColor Yellow
  Stop-Process -Id $existing.Id -Force
  Start-Sleep -Seconds 1
}

$args = @('http', $Port)
if ($Domain) {
  $args += @('--domain', $Domain)
}

Write-Host "Iniciando ngrok -> localhost:$Port" -ForegroundColor Cyan
if ($Domain) {
  Write-Host "Dominio: https://$Domain"
}

Start-Process -FilePath $ngrok.Source -ArgumentList $args -WindowStyle Normal

Start-Sleep -Seconds 3
Write-Host "`nVerifique la URL en la ventana de ngrok o en http://127.0.0.1:4040" -ForegroundColor Green
Write-Host "PUBLIC_APP_URL y CORS_ORIGIN deben coincidir con esa URL en backend\.env"
Write-Host "Luego: pm2 restart devsoporte --update-env"
