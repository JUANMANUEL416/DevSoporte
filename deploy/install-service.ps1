#Requires -Version 5.1
<#
.SYNOPSIS
  Registra DevSoporte para iniciar con Windows vía PM2.
  Ejecutar PowerShell como Administrador.
#>
$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot

Write-Host "Instalando PM2 y pm2-windows-startup..." -ForegroundColor Cyan
npm install -g pm2 pm2-windows-startup

Set-Location $Root
& (Join-Path $Root 'deploy\deploy.ps1') -SkipPull

Write-Host "`nRegistrando inicio automático con Windows..." -ForegroundColor Cyan
pm2-startup install
pm2 save

Write-Host "`nServicio DevSoporte instalado y configurado para producción." -ForegroundColor Green
Write-Host "Al iniciar Windows, PM2 levanta devsoporte + ngrok-devsoporte (si NGROK_AUTOSTART no es false)."
Write-Host "Comandos útiles:"
Write-Host "  pm2 status"
Write-Host "  pm2 restart devsoporte"
Write-Host "  pm2 restart ngrok-devsoporte"
Write-Host "  pm2 logs devsoporte"
Write-Host "  pm2 logs ngrok-devsoporte"
