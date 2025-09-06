@echo off
REM Quick script to restore/start your main HesaabPlus application

echo 🚀 Restoring HesaabPlus Main Application
echo ================================================================

REM Colors for Windows
set "GREEN=[92m"
set "RED=[91m"
set "BLUE=[94m"
set "NC=[0m"

REM Check if Docker is running
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo %RED%❌ Docker is not running. Please start Docker Desktop and try again.%NC%
    pause
    exit /b 1
)

echo %GREEN%✅ Docker is running%NC%

REM Start main application
echo %BLUE%🚀 Starting main HesaabPlus application...%NC%
docker-compose up -d

REM Wait for services to start
echo %BLUE%⏳ Waiting for services to start...%NC%
timeout /t 10 /nobreak >nul

REM Show status
echo %BLUE%📋 Application Status:%NC%
docker ps --filter "name=hesaabplus" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo.
echo %GREEN%✅ Main application restored!%NC%
echo %BLUE%💡 Your application should be available at:%NC%
echo %BLUE%   - Backend: http://localhost:8000%NC%
echo %BLUE%   - Super Admin: http://localhost:3000%NC%
echo %BLUE%   - Tenant Frontend: http://localhost:3001%NC%

pause