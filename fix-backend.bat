@echo off
setlocal enabledelayedexpansion

echo ==========================================================
echo    Fixing Laravel Backend Installation
echo ==========================================================
echo.

cd "%~dp0"

echo [1/3] Erasing old backend data...
if exist "backend" rmdir /s /q "backend"
if exist "backend" (
    echo [ERROR] Could not delete backend folder. It might be open in another program.
    pause
    exit /b
)

echo [2/3] Downloading fresh Laravel 11...
call composer create-project laravel/laravel:^11.0 backend

if not exist "backend\artisan" (
    echo [ERROR] Composer failed to install Laravel. Do you have PHP and Composer installed?
    pause
    exit /b
)

echo [3/3] Merging custom Internet Cafe Code...
xcopy /Y /S /I "laravel-backend\*" "backend\" >nul

cd backend
echo Setting up .env file...
echo DB_CONNECTION=mysql >> .env
echo DB_HOST=127.0.0.1 >> .env
echo DB_PORT=3306 >> .env
echo DB_DATABASE=internet_cafe_monitor >> .env
echo DB_USERNAME=root >> .env
echo DB_PASSWORD= >> .env
echo ICAFE_API_KEY=icafe-monitor-api-key-2024-secure-token-abc123xyz >> .env

echo Wiring API Routing...
php -r " $content = file_get_contents('bootstrap/app.php'); if(strpos($content, 'api.auth')===false){ file_put_contents('bootstrap/app.php', str_replace('->withMiddleware(function (Middleware $middleware) {', \"->withMiddleware(function (Middleware $middleware) {\n        \$middleware->alias(['api.auth' => \App\Http\Middleware\VerifyApiKey::class]);\", $content)); } "

echo.
echo ==========================================================
echo SUCCESS! Backend completely installed.
echo Starting the API Server now...
echo ==========================================================

start "Laravel API" cmd /k "php artisan serve --host 0.0.0.0 --port 8000"
pause
