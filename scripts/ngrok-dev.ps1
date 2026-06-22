# Expone el frontend (Quasar :9020) a internet con ngrok.
# El proxy de Quasar reenvía /api al backend local (:3300).
#
# Requisitos:
#   1. Backend corriendo:  cd backend && npm run dev
#   2. Frontend corriendo: cd frontend && npm run dev
#   3. ngrok instalado:    https://ngrok.com/download
#      (primera vez: ngrok config add-authtoken SU_TOKEN)
#
# Uso:
#   .\scripts\ngrok-dev.ps1
#
# Después de iniciar, copie la URL https://....ngrok-free.app en backend/.env:
#   PUBLIC_APP_URL=https://....ngrok-free.app
#   CORS_ORIGIN=http://localhost:9020,https://....ngrok-free.app
# Reinicie el backend y reenvíe el correo de bitácora (el enlace anterior queda obsoleto).

$ErrorActionPreference = 'Stop'

Write-Host ''
Write-Host '=== DevSoporte + ngrok ===' -ForegroundColor Cyan
Write-Host 'Tunel al frontend (puerto 9020). API via proxy /api -> localhost:3300'
Write-Host ''

if (-not (Get-Command ngrok -ErrorAction SilentlyContinue)) {
  Write-Host 'ngrok no esta instalado. Descarguelo en https://ngrok.com/download' -ForegroundColor Red
  exit 1
}

try {
  Invoke-WebRequest 'http://localhost:9020/' -TimeoutSec 3 -UseBasicParsing | Out-Null
  Write-Host 'Frontend OK en :9020' -ForegroundColor Green
} catch {
  Write-Host 'Advertencia: frontend no responde en :9020. Inicie: cd frontend && npm run dev' -ForegroundColor Yellow
}

try {
  $api = Invoke-RestMethod 'http://localhost:3300/api/health' -TimeoutSec 3
  Write-Host "Backend OK en :3300 (mailConfigured=$($api.mailConfigured))" -ForegroundColor Green
} catch {
  Write-Host 'Advertencia: backend no responde en :3300. Inicie: cd backend && npm run dev' -ForegroundColor Yellow
}

Write-Host ''
Write-Host 'Pasos:' -ForegroundColor Cyan
Write-Host '  1. Copie la URL "Forwarding" que muestra ngrok (https://....ngrok-free.app)'
Write-Host '  2. backend/.env -> PUBLIC_APP_URL y CORS_ORIGIN (ver comentarios arriba)'
Write-Host '  3. Reinicie el backend (npm run dev)'
Write-Host '  4. Reenvie el correo de bitacora para generar un enlace nuevo'
Write-Host ''

ngrok http 9020
