@echo off
setlocal enabledelayedexpansion

echo ============================================
echo   Diagnostic Tool: Checking Your Connection
echo ============================================
echo.

echo [1] Checking required commands...
call :check_cmd php "PHP"
call :check_cmd node "Node.js"
call :check_cmd npm "npm"

echo.
echo [2] Checking MySQL connection...
php -r "new PDO('mysql:host=127.0.0.1;port=3306', 'root', ''); echo \"MySQL connection successful.\n\";" 2>nul
if errorlevel 1 (
    echo [ERROR] Cannot connect to MySQL. Make sure Laragon/XAMPP is running.
) else (
    echo [OK] MySQL is reachable.
)

echo.
echo [3] Checking API port 8000...
call :port_status 8000 "Laravel API"

echo.
echo [4] Checking dashboard port 5173...
call :port_status 5173 "React Dashboard"

echo.
echo [5] Local network summary...
ipconfig | findstr /i "IPv4"

echo.
echo ============================================
pause
exit /b 0

:check_cmd
where %~1 >nul 2>&1
if errorlevel 1 (
    echo [ERROR] %~2 is NOT found in PATH.
) else (
    echo [OK] %~2 is available.
)
exit /b 0

:port_status
set "PORT=%~1"
set "NAME=%~2"
netstat -ano | findstr /R /C:":%PORT% .*LISTENING" >nul
if errorlevel 1 (
    echo [STATUS] %NAME% is not listening on port %PORT%.
) else (
    echo [STATUS] %NAME% is listening on port %PORT%.
    netstat -ano | findstr /R /C:":%PORT% .*LISTENING"
)
exit /b 0
