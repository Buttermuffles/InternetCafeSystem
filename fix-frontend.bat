@echo off
echo ==========================================================
echo    Fixing Frontend Dependencies
echo ==========================================================
echo.

cd "%~dp0\frontend"
echo Removing broken node_modules folder...
if exist node_modules rmdir /s /q node_modules
if exist package-lock.json del package-lock.json

echo.
echo Installing fresh npm packages...
echo This might take a minute, please wait...
call npm install --no-fund --no-audit

echo.
echo Launching React Dashboard App...
call npm run dev

pause
