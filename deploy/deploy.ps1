#Requires -Version 5.1
<#
.SYNOPSIS
  Construye frontend + backend e instala/actualiza el servicio PM2 DevSoporte.
.PARAMETER SkipPull
  No ejecuta git pull (útil si ya actualizó el código).
.EXAMPLE
  .\deploy\deploy.ps1
#>
param(
  [switch]$SkipPull
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

function Write-Step($msg) {
  Write-Host "`n==> $msg" -ForegroundColor Cyan
}

Write-Step "DevSoporte - despliegue produccion"
$branch = git rev-parse --abbrev-ref HEAD
if ($branch -ne 'master') {
  throw "El despliegue solo se permite desde la rama master (actual: $branch)."
}

$envFile = Join-Path $Root 'backend\.env'
if (Test-Path $envFile) {
  $envText = Get-Content $envFile -Raw
  if ($envText -match '(?m)^\s*APP_ENV\s*=\s*pruebas\s*$') {
    throw "backend\.env tiene APP_ENV=pruebas. Restaure APP_ENV=production antes de desplegar."
  }
}

$version = (Get-Content (Join-Path $Root 'VERSION') -Raw).Trim()
Write-Host "Rama: $branch  Version: $version"

Push-Location (Join-Path $Root 'backend')
try {
  $integradosJson = node --input-type=module -e "import { listIntegrados } from './src/services/controlVersionesPublish.js'; const rows = await listIntegrados(); console.log(JSON.stringify(rows.map(r => r.consecutivo))); process.exit(0);"
  $integrados = @()
  if ($integradosJson) {
    $integrados = $integradosJson | ConvertFrom-Json
  }
  if ($integrados -and $integrados.Count -gt 0) {
    Write-Host "AVISO: Hay $($integrados.Count) cambio(s) integrado(s) sin publicar en Control de Versiones." -ForegroundColor Yellow
    Write-Host "  Ejecute npm run release antes del deploy para actualizar devver/devcamb y el tag Git." -ForegroundColor Yellow
    Write-Host "  Pendientes: $($integrados -join ', ')" -ForegroundColor DarkYellow
  }
} catch {
  Write-Host "AVISO: No se pudo verificar cambios integrados pendientes." -ForegroundColor DarkGray
}
Pop-Location

if (-not $SkipPull) {
  Write-Step "Actualizando codigo (git pull origin master)"
  git pull origin master
}

Write-Step "Instalando dependencias backend"
Set-Location (Join-Path $Root 'backend')
npm install --omit=dev

Write-Step "Instalando dependencias frontend"
Set-Location (Join-Path $Root 'frontend')
npm install
npm run build

if (-not (Test-Path (Join-Path $Root 'frontend\dist\spa\index.html'))) {
  throw 'Build del frontend falló: no se encontró frontend/dist/spa/index.html'
}

Set-Location $Root
New-Item -ItemType Directory -Force -Path (Join-Path $Root 'deploy\logs') | Out-Null

Write-Step "PM2 - servicio devsoporte"
$pm2 = Get-Command pm2 -ErrorAction SilentlyContinue
if (-not $pm2) {
  Write-Host "Instalando PM2 globalmente..."
  npm install -g pm2
}

$env:NODE_ENV = 'production'
pm2 start (Join-Path $Root 'deploy\ecosystem.config.cjs') --env production --update-env
pm2 save

Write-Step "Estado del servicio"
pm2 status devsoporte
pm2 logs devsoporte --lines 15 --nostream

Write-Host "`nDespliegue completado." -ForegroundColor Green
Write-Host "URL local: http://localhost:3300"
Write-Host "Health:    http://localhost:3300/api/health"
Write-Host "`nPara arranque automático al iniciar Windows (ejecutar una vez como Administrador):"
Write-Host "  npm install -g pm2-windows-startup"
Write-Host "  pm2-startup install"
Write-Host "  pm2 save"
