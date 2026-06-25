@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion

REM ============================================================
REM  DevSoporte - Arranque produccion (PM2 + ngrok)
REM  Cree un acceso directo a este archivo en el Escritorio.
REM ============================================================

set "ROOT=%~dp0"
set "PORT=3300"
set "NGROK_DOMAIN=crested-gently-landowner.ngrok-free.dev"
set "PUBLIC_URL=https://%NGROK_DOMAIN%"

cd /d "%ROOT%"

echo.
echo ========================================
echo   DevSoporte v1.1 - Inicio produccion
echo ========================================
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js no esta en el PATH.
  goto :fin_error
)

where npm >nul 2>&1
if errorlevel 1 (
  echo [ERROR] npm no encontrado.
  goto :fin_error
)

where pm2 >nul 2>&1
if errorlevel 1 (
  echo [ERROR] PM2 no encontrado. Ejecute: npm install -g pm2
  goto :fin_error
)

where ngrok >nul 2>&1
if errorlevel 1 (
  echo [ERROR] ngrok no encontrado. Instale desde https://ngrok.com/download
  goto :fin_error
)

echo [1/4] Compilando frontend (ultimos cambios de diseno)...
cd /d "%ROOT%frontend"
call npm run build
if errorlevel 1 (
  echo [ERROR] Fallo la compilacion del frontend.
  cd /d "%ROOT%"
  goto :fin_error
)
cd /d "%ROOT%"
echo       OK - frontend actualizado.

echo.
echo [2/4] Servicio PM2 (devsoporte)...
call pm2 ping >nul 2>&1
if errorlevel 1 (
  echo       Iniciando PM2 y aplicacion...
  call pm2 start "%ROOT%deploy\ecosystem.config.cjs" --env production --only devsoporte
) else (
  call pm2 describe devsoporte >nul 2>&1
  if errorlevel 1 (
    echo       Recuperando procesos guardados...
    call pm2 resurrect >nul 2>&1
    call pm2 describe devsoporte >nul 2>&1
    if errorlevel 1 (
      call pm2 start "%ROOT%deploy\ecosystem.config.cjs" --env production --only devsoporte
    )
  ) else (
    echo       Reiniciando devsoporte...
    call pm2 restart devsoporte --update-env
  )
)

echo       Esperando API en puerto %PORT%...
set /a INTENTOS=0
:espera_api
powershell -NoProfile -Command "try { $r = Invoke-RestMethod -Uri 'http://localhost:%PORT%/api/health' -TimeoutSec 3; if ($r.ok) { exit 0 } else { exit 1 } } catch { exit 1 }"
if !errorlevel!==0 goto api_ok
set /a INTENTOS+=1
if !INTENTOS! GEQ 20 (
  echo [ERROR] La API no respondio en http://localhost:%PORT%
  echo         Revise: pm2 logs devsoporte
  goto :fin_error
)
timeout /t 2 /nobreak >nul
goto espera_api

:api_ok
echo       OK - API activa.

echo.
echo [3/4] Tunel ngrok (PM2)...
powershell -NoProfile -ExecutionPolicy Bypass -File "%ROOT%deploy\start-ngrok.ps1" -Domain "%NGROK_DOMAIN%"
if errorlevel 1 (
  echo [ERROR] No se pudo iniciar ngrok.
  goto :fin_error
)

echo.
echo [4/4] Abriendo navegador...
timeout /t 3 /nobreak >nul
start "" "%PUBLIC_URL%"

echo.
echo ========================================
echo   DevSoporte en linea
echo ========================================
echo   Local:   http://localhost:%PORT%
echo   Publico: %PUBLIC_URL%
echo   Health:  http://localhost:%PORT%/api/health
echo.
echo   Comandos utiles:
echo     pm2 status
echo     pm2 logs devsoporte
echo     pm2 logs ngrok-devsoporte
echo.
goto :fin_ok

:fin_error
echo.
pause
exit /b 1

:fin_ok
pause
exit /b 0
