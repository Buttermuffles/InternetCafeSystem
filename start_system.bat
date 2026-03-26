@echo off
setlocal enabledelayedexpansion
title Internet Cafe Monitoring System - Setup and Startup

set "ROOT=%~dp0"

echo ==========================================================
echo    Internet Cafe Monitoring System - Setup and Startup
echo ==========================================================
echo.

if not exist "%ROOT%backend" (
    echo [ERROR] Missing backend folder.
    goto :fail
)
if not exist "%ROOT%frontend" (
    echo [ERROR] Missing frontend folder.
    goto :fail
)
if not exist "%ROOT%client-agent" (
    echo [ERROR] Missing client-agent folder.
    goto :fail
)

call :require_cmd php "PHP"
if errorlevel 1 goto :fail
call :require_cmd npm "npm"
if errorlevel 1 goto :fail
call :require_cmd node "Node.js"
if errorlevel 1 goto :fail

echo [1/3] Preparing Laravel Backend...
pushd "%ROOT%"
if not exist "backend\artisan" (
    call :require_cmd composer "Composer"
    if errorlevel 1 (
        popd
        goto :fail
    )

    echo Downloading Laravel 11 framework...
    call composer create-project laravel/laravel:^11.0 backend --no-interaction
    if errorlevel 1 (
        echo [ERROR] Laravel download failed.
        popd
        goto :fail
    )

    if exist "laravel-backend" (
        echo Copying custom backend files...
        xcopy /Y /S /I "laravel-backend\*" "backend\" >nul
    )
)
popd

pushd "%ROOT%backend"
if not exist ".env" if exist ".env.example" copy /Y ".env.example" ".env" >nul

findstr /B /C:"ICAFE_API_KEY=" ".env" >nul || echo ICAFE_API_KEY=icafe-monitor-api-key-2024-secure-token-abc123xyz>>".env"

echo Starting Laravel API on port 8000...
start "Laravel API" cmd /k "php artisan serve --host 0.0.0.0 --port 8000"
popd

echo.
echo [2/3] Preparing Frontend...
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
echo Starting React Dashboard...
start "React Dashboard" cmd /k "npm run dev -- --host --port 5173"
popd

echo.
echo [3/3] Preparing Client Agent...
pushd "%ROOT%client-agent"
if not exist node_modules (
    echo Installing client-agent dependencies...
    call npm install --no-fund --no-audit
    if errorlevel 1 (
        popd
        echo [ERROR] Client-agent dependency install failed.
        goto :fail
    )
)

echo Starting lightweight Node agent (minimized)...
start /min "Client Agent" cmd /c "npm run agent-only"
popd

echo.
echo ==========================================================
echo  System launch completed
echo ==========================================================
echo  React Frontend : http://localhost:5173
echo  Laravel API    : http://localhost:8000
echo.
echo  If needed, package the client executable with:
echo  client-agent\build-agent.bat
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

:fail
echo.
echo Startup stopped due to previous error.
pause
exit /b 1
