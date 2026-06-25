# Alternativa manual en PowerShell (PM2 usa ngrok-serve.mjs en ecosystem.config.cjs).
# Ejecuta ngrok en primer plano. Lee NGROK_DOMAIN / NGROK_PORT del entorno o de backend\.env
$ErrorActionPreference = 'Stop'

$Root = Split-Path -Parent $PSScriptRoot
$Port = if ($env:NGROK_PORT) { [int]$env:NGROK_PORT } else { 3300 }

function Read-BackendEnv([string]$Key) {
  $envFile = Join-Path $Root 'backend\.env'
  if (-not (Test-Path $envFile)) { return $null }
  foreach ($line in Get-Content $envFile -Encoding UTF8) {
    if ($line -match "^\s*$([regex]::Escape($Key))\s*=\s*(.+)\s*$") {
      return $Matches[1].Trim().Trim('"').Trim("'")
    }
  }
  return $null
}

function Test-NgrokAutostartEnabled {
  $flag = $env:NGROK_AUTOSTART
  if (-not $flag) { $flag = Read-BackendEnv 'NGROK_AUTOSTART' }
  if (-not $flag) { return $true }
  return @('1', 'true', 'yes', 'si', 'sí') -contains $flag.ToLower()
}

if (-not (Test-NgrokAutostartEnabled)) {
  Write-Host 'NGROK_AUTOSTART=false - omitiendo ngrok.'
  exit 0
}

$Domain = $env:NGROK_DOMAIN
if (-not $Domain) { $Domain = Read-BackendEnv 'NGROK_DOMAIN' }
if (-not $Domain) {
  $publicUrl = Read-BackendEnv 'PUBLIC_APP_URL'
  if ($publicUrl -match '^https?://([^/]+)') { $Domain = $Matches[1] }
}
if (-not $Domain) { $Domain = 'crested-gently-landowner.ngrok-free.dev' }

$ngrok = Get-Command ngrok -ErrorAction SilentlyContinue
if (-not $ngrok) {
  throw 'ngrok no está instalado o no está en el PATH. https://ngrok.com/download'
}

$args = @('http', "$Port", '--url', $Domain)
Write-Host "ngrok -> localhost:$Port  dominio: https://$Domain"
& $ngrok.Source @args
