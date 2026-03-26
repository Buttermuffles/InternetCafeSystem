@echo off
setlocal enabledelayedexpansion

:: Check for Admin
NET SESSION >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERROR] Administrative permissions required!
    echo Please right-click this file and select "Run as Administrator".
    pause
    exit /b
)

echo ==========================================================
echo    Internet Cafe Monitor - Client PC UNINSTALLER
echo ==========================================================
echo.

set "SERVICE_NAME=ICafeMonitorAgent"
set "INSTALL_DIR=C:\Program Files\ICafeMonitor"

echo This will completely remove the monitoring agent from this PC.
echo.
set /p "CONFIRM=Are you sure? (Y/N): "
if /i not "%CONFIRM%"=="Y" (
    echo Cancelled.
    pause
    exit /b
)

echo.
echo [1/3] Stopping agent...
taskkill /F /IM "ICafe Monitor Agent.exe" /T >nul 2>&1
taskkill /F /IM ICafeAgent.exe /T >nul 2>&1
timeout /t 2 /nobreak >nul

echo [2/3] Removing from Auto-Start...
schtasks /Delete /TN "ICafeMonitorAgent" /F >nul 2>&1
reg delete "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Run" /v "ICafeMonitorAgent" /f >nul 2>&1

echo [3/3] Deleting files...
if exist "%INSTALL_DIR%" (
    rd /s /q "%INSTALL_DIR%" >nul 2>&1
)

:: Remove firewall rule
netsh advfirewall firewall delete rule name="ICafe Monitor Agent" >nul 2>&1

echo.
echo ==========================================================
echo  UNINSTALL COMPLETE
echo  The monitoring agent has been removed from this PC.
echo ==========================================================
pause
