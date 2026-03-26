@echo off
setlocal enabledelayedexpansion

set "ROOT=%~dp0"

echo ==========================================================
echo    Internet Cafe Monitoring System - LAN SERVER MODE
echo ==========================================================
echo.

if not exist "%ROOT%backend\artisan" (
    echo [ERROR] backend is missing or not initialized.
    goto :fail
)
if not exist "%ROOT%frontend\package.json" (
    echo [ERROR] frontend is missing.
    goto :fail
)

call :require_cmd php "PHP"
if errorlevel 1 goto :fail
call :require_cmd npm "npm"
if errorlevel 1 goto :fail
call :require_cmd node "Node.js"
if errorlevel 1 goto :fail

set "LAPTOP_IP="
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4" ^| findstr "192.168."') do (
    if not defined LAPTOP_IP (
        set "LAPTOP_IP=%%a"
        set "LAPTOP_IP=!LAPTOP_IP: =!"
    )
)
if not defined LAPTOP_IP set "LAPTOP_IP=192.168.1.200"

echo  Detected LAN IP: %LAPTOP_IP%
echo.

echo [1/4] Releasing app ports if occupied...
call :kill_port 8000
call :kill_port 5173
echo Done.

echo [2/4] Preparing backend...
pushd "%ROOT%backend"
if not exist ".env" if exist ".env.example" copy /Y ".env.example" ".env" >nul
findstr /B /C:"ICAFE_API_KEY=" ".env" >nul || echo ICAFE_API_KEY=icafe-monitor-api-key-2024-secure-token-abc123xyz>>".env"

echo Ensuring database exists...
call php -r "try { (new PDO('mysql:host=localhost;port=3306', 'root', ''))->exec('CREATE DATABASE IF NOT EXISTS internet_cafe_monitor'); echo \"Database verified.\n\"; } catch (Exception $e) { echo \"MySQL Error: start Laragon/XAMPP first.\n\"; }"

call php artisan key:generate --force >nul 2>&1
call php artisan migrate --force
if errorlevel 1 (
    popd
    echo [ERROR] Laravel migration failed.
    goto :fail
)
call php artisan config:clear >nul 2>&1

echo Starting Laravel API...
start "Laravel API" cmd /k "php artisan serve --host=0.0.0.0 --port=8000"
popd

echo [3/4] Preparing frontend...
pushd "%ROOT%frontend"
if not exist node_modules (
    echo Installing frontend dependencies...
    call npm install --no-fund --no-audit
    if errorlevel 1 (
        popd
        echo [ERROR] Frontend dependency install failed.
        goto :fail
    )
)

(
    echo VITE_API_URL=http://%LAPTOP_IP%:8000
    echo VITE_API_KEY=icafe-monitor-api-key-2024-secure-token-abc123xyz
)> .env

echo Starting React dashboard...
start "React Dashboard" cmd /k "npm run dev -- --host --port 5173"
popd

echo [4/4] Applying firewall rules...
netsh advfirewall firewall delete rule name="ICafe Laravel API" >nul 2>&1
netsh advfirewall firewall add rule name="ICafe Laravel API" dir=in action=allow protocol=tcp localport=8000 >nul 2>&1
netsh advfirewall firewall delete rule name="ICafe React Dashboard" >nul 2>&1
netsh advfirewall firewall add rule name="ICafe React Dashboard" dir=in action=allow protocol=tcp localport=5173 >nul 2>&1

echo.
echo ==========================================================
echo  SERVER STARTED SUCCESSFULLY
echo ==========================================================
echo  Laptop IP          : %LAPTOP_IP%
echo  Dashboard (Local)  : http://localhost:5173
echo  Dashboard (LAN)    : http://%LAPTOP_IP%:5173
echo  Laravel API (LAN)  : http://%LAPTOP_IP%:8000
echo.
echo  CLIENT PCs CONNECT TO: http://%LAPTOP_IP%:8000
echo ==========================================================
pause
exit /b 0

:require_cmd
where %~1 >nul 2>&1
if errorlevel 1 (
    echo [ERROR] %~2 is not found in PATH.
    exit /b 1
)
exit /b 0

:kill_port
for /f "tokens=5" %%p in ('netstat -ano ^| findstr /R /C:":%~1 .*LISTENING"') do (
    taskkill /PID %%p /F >nul 2>&1
)
exit /b 0

:fail
echo.
echo Startup stopped due to previous error.
pause
exit /b 1
