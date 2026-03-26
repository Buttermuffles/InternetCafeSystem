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
echo    Internet Cafe Monitoring - CLIENT PC INSTALLER
echo    Installs invisible agent + connects to your Server
echo ==========================================================
echo.

set "SERVICE_NAME=ICafeMonitorAgent"
set "INSTALL_DIR=C:\Program Files\ICafeMonitor"
set "BIN_NAME=ICafeAgent.exe"
set "CONFIG_FILE=config.json"

:: 1. Check if source exists
if not exist "%~dp0%BIN_NAME%" (
    echo [ERROR] %BIN_NAME% not found!
    echo Make sure this file is in the same folder as Install_Client_PC.bat
    pause
    exit /b
)

:: 2. Ask for Server IP (your laptop's static IP)
echo.
echo -----------------------------------------------------------
echo  STEP 1: Enter the SERVER (Laptop) IP Address
echo -----------------------------------------------------------
echo.

:: Check if a config.json already exists (pre-configured from USB)
if exist "%~dp0%CONFIG_FILE%" (
    echo [INFO] Found pre-configured config.json - using it!
    echo.
    goto :SkipIPInput
)

:: Check if the default config already has the right IP baked in
set "DEFAULT_IP=192.168.1.200"
set /p "SERVER_IP=  Your Laptop's Static IP [%DEFAULT_IP%]: "
if "%SERVER_IP%"=="" set "SERVER_IP=%DEFAULT_IP%"

echo.
set /p "SERVER_PORT=  Laravel API Port [8000]: "
if "%SERVER_PORT%"=="" set "SERVER_PORT=8000"

echo.
set /p "PC_LABEL=  Name for this PC (e.g. PC-01) [auto-detect]: "
if "%PC_LABEL%"=="" set "PC_LABEL="

:: Generate config.json in the current folder (will be copied later)
echo [INFO] Creating config.json for this PC...
(
echo {
echo     "serverUrl": "http://%SERVER_IP%:%SERVER_PORT%",
echo     "apiKey": "icafe-monitor-api-key-2024-secure-token-abc123xyz",
echo     "pcName": "%PC_LABEL%",
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
) > "%~dp0config_temp.json"

:SkipIPInput

:: 3. Create permanent folder on C: drive
echo.
echo -----------------------------------------------------------
echo  STEP 2: Installing Agent
echo -----------------------------------------------------------
echo.
echo [1/5] Creating system folder at %INSTALL_DIR%...
if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%"

:: 4. Stop old service and clear tasks
echo [2/5] Clearing old versions...
sc stop "%SERVICE_NAME%" >nul 2>&1
sc delete "%SERVICE_NAME%" >nul 2>&1
taskkill /F /IM "%BIN_NAME%" /T >nul 2>&1
:: Ping locally for 1 second instead of a 2+ second lag
ping 127.0.0.1 -n 2 >nul 2>&1

:: 5. Copy the EXE from installer to C: drive
echo [3/5] Copying Agent GUI to C: drive...
copy /Y "%~dp0%BIN_NAME%" "%INSTALL_DIR%\%BIN_NAME%" >nul
if %errorlevel% neq 0 (
    echo [ERROR] Failed to copy EXE. Check if it's locked.
    pause
    exit /b
)

:: 6. Copy config.json
echo [4/5] Writing configuration...
if exist "%~dp0%CONFIG_FILE%" (
    copy /Y "%~dp0%CONFIG_FILE%" "%INSTALL_DIR%\%CONFIG_FILE%" >nul
) else if exist "%~dp0config_temp.json" (
    copy /Y "%~dp0config_temp.json" "%INSTALL_DIR%\%CONFIG_FILE%" >nul
    del "%~dp0config_temp.json" >nul 2>&1
)

:: 7. Register for auto-start in the Registry + Task Scheduler (Redundancy)
echo [5/5] Registering High-Priority Persistence...
set "EXE_PATH=%INSTALL_DIR%\%BIN_NAME%"
:: Task Scheduler for admin-level bypass and reliable startup
schtasks /Delete /TN "ICafeMonitorAgent" /F >nul 2>&1
schtasks /Create /TN "ICafeMonitorAgent" /SC ONLOGON /DELAY 000:00:05 /RL HIGHEST /F /TR "\"%EXE_PATH%\"" >nul 2>&1

:: Windows Registry Run key as a fallback
reg add "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Run" /v "ICafeMonitorAgent" /t REG_SZ /d "\"%EXE_PATH%\"" /f >nul 2>&1

echo [EXTRA] Adding firewall exceptions...
netsh advfirewall firewall delete rule name="ICafe Monitor Agent" >nul 2>&1
netsh advfirewall firewall delete rule name="ICafe Agent Push Port" >nul 2>&1
netsh advfirewall firewall add rule name="ICafe Monitor Agent" dir=out action=allow program="%INSTALL_DIR%\%BIN_NAME%" enable=yes >nul 2>&1
netsh advfirewall firewall add rule name="ICafe Agent Push Port" dir=in action=allow protocol=TCP localport=9900 enable=yes >nul 2>&1

:: 9. Start the UI immediately in the background
echo [EXTRA] Starting Client Agent UI...
start "ICafeAgent" /D "%INSTALL_DIR%" "%INSTALL_DIR%\%BIN_NAME%"

echo.
echo ==========================================================
echo  INSTALLATION COMPLETE!
echo ==========================================================
echo.
echo  Agent Location : %INSTALL_DIR%\%BIN_NAME%
if defined SERVER_IP (
    echo  Connects To    : http://%SERVER_IP%:%SERVER_PORT%
) else (
    echo  Config         : %INSTALL_DIR%\%CONFIG_FILE%
)
if defined PC_LABEL (
    echo  PC Name        : %PC_LABEL%
) else (
    echo  PC Name        : Auto-detected from hostname
)
echo.
echo  The agent GUI is now open. You can:
echo    - See live stats 
echo    - Set a Static IP directly in the app
echo    - Minimize it to the system tray
echo.
echo  It will auto-start silently on boot in the system tray.
echo  You can safely UNPLUG the USB now!
echo  Auto-closing installer in a few seconds...
echo ==========================================================
ping 127.0.0.1 -n 4 >nul 2>&1
exit
