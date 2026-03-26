@echo off
setlocal enabledelayedexpansion

:: ──── AUTO-ELEVATE TO ADMINISTRATOR ────
:: This will automatically prompt for Admin access without right-clicking
NET SESSION >nul 2>&1
if %errorLevel% neq 0 (
    echo [INFO] Requesting Administrative Access...
    powershell -Command "Start-Process -FilePath '%0' -Verb RunAs"
    exit /b
)
:: ───────────────────────────────────────

echo ==========================================================
echo    Internet Cafe Monitoring System - Agent Builder
echo    Builds .exe + USB Installer Package
echo ==========================================================
echo.

cd "%~dp0"

:: 1. Force kill any running agent
echo [1/5] Stopping any running agents...
taskkill /F /IM ICafeAgent.exe /T >nul 2>&1
echo Done.

:: 2. Ensure dependencies are installed
if not exist node_modules (
    echo [2/5] Installing dependencies...
    call npm install
) else (
    echo [2/5] Dependencies already installed.
)

:: 3. Build the Executable
echo [3/5] Packaging via Electron Builder...
call npm run build

:: electron-builder outputs to dist folder. Find the portable exe.
for /f "delims=" %%i in ('dir /b /s "dist\ICafe Monitor Agent*Portable.exe" 2^>nul') do (
    set "EXE_PATH=%%i"
)
if not defined EXE_PATH (
    :: Fallback search if Portable isn't there
    for /f "delims=" %%i in ('dir /b /a-d "dist\*.exe" 2^>nul') do (
        set "EXE_PATH=dist\%%i"
    )
)

if not exist "!EXE_PATH!" (
    echo.
    echo [ERROR] Failed to build GUI Agent executable.
    echo Please check the error messages above.
    pause
    exit /b
)

:: Copy it to the current folder as ICafeAgent.exe to match the installer
copy /Y "!EXE_PATH!" "ICafeAgent.exe" >nul

:: 4. Ask for the default server IP to pre-configure
echo.
echo -----------------------------------------------------------
echo  Configure the default server connection for client PCs
echo -----------------------------------------------------------
set "DEFAULT_IP=192.168.1.200"
set /p "SERVER_IP=  Your Laptop's Static IP [%DEFAULT_IP%]: "
if "%SERVER_IP%"=="" set "SERVER_IP=%DEFAULT_IP%"

set /p "SERVER_PORT=  Laravel API Port [8000]: "
if "%SERVER_PORT%"=="" set "SERVER_PORT=8000"

:: 5. Prepare the USB installer folder
echo.
echo [4/5] Creating USB_Client_Installer package...
if not exist "USB_Client_Installer" mkdir "USB_Client_Installer"

echo Copying agent executable...
copy /Y ICafeAgent.exe "USB_Client_Installer\" >nul

echo Copying installer script...
copy /Y Install_Client_PC.bat "USB_Client_Installer\" >nul

echo Copying uninstall script...
copy /Y Uninstall_Client_PC.bat "USB_Client_Installer\" >nul

:: Generate pre-configured config.json for USB
echo Writing pre-configured config.json...
(
echo {
echo     "serverUrl": "http://%SERVER_IP%:%SERVER_PORT%",
echo     "apiKey": "icafe-monitor-api-key-2024-secure-token-abc123xyz",
echo     "pcName": "",
echo     "heartbeatInterval": 4000,
echo     "commandPollInterval": 2500,
echo     "enableScreenshot": true,
echo     "screenshotIntervalMs": 15000,
echo     "screenshotQuality": 40,
echo     "screenshotWidth": 640,
echo     "requestTimeout": 5000,
echo     "maxRetries": 3,
echo     "retryDelay": 2000
echo }
) > "USB_Client_Installer\config.json"

:: 5b. Create a quick README for the USB
echo Creating README...
(
echo =====================================================
echo   Internet Cafe Monitor - Client PC Installer
echo =====================================================
echo.
echo HOW TO USE:
echo   1. Plug this USB into the client PC
echo   2. Double-click "Install_Client_PC.bat" 
echo      (It will automatically ask for Admin access)
echo   3. Follow the prompts
echo   4. Unplug USB - the agent runs permanently!
echo.
echo TO REMOVE LATER:
echo   1. Double-click "Uninstall_Client_PC.bat"
echo      (It will automatically ask for Admin access)
echo.
echo FILES:
echo   ICafeAgent.exe        - The monitoring agent
echo   Install_Client_PC.bat - One-click installer
echo   Uninstall_Client_PC.bat - One-click uninstall
echo   config.json           - Server connection settings
echo.
echo TO CHANGE SERVER IP LATER:
echo   Edit config.json on this USB before installing,
echo   or edit C:\Program Files\ICafeMonitor\config.json
echo   on the client PC after installation.
echo.
echo SERVER: http://%SERVER_IP%:%SERVER_PORT%
echo =====================================================
) > "USB_Client_Installer\README.txt"

echo.
echo [5/5] Build complete!
echo.
echo ==========================================================
echo  SUCCESS! USB Installer Package Ready
echo ==========================================================
echo.
echo  Folder: %cd%\USB_Client_Installer\
echo.
echo  Contents:
echo    ICafeAgent.exe         - Agent executable
echo    Install_Client_PC.bat  - One-click installer
echo    Uninstall_Client_PC.bat - One-click uninstall
echo    config.json            - Pre-configured for %SERVER_IP%:%SERVER_PORT%
echo    README.txt             - Instructions
echo.
echo  DEPLOYMENT STEPS:
echo    1. Copy "USB_Client_Installer" folder to your USB
echo    2. Plug USB into each client PC
echo    3. Double-click Install_Client_PC.bat (it will automatically ask for Admin)
echo    4. The PC will instantly appear on your dashboard!
echo.
echo  TIP: Each PC auto-detects its hostname as its name.
echo       To set custom names (PC-01, PC-02...), edit the
echo       config.json "pcName" field before each install.
echo ==========================================================
echo.
pause
