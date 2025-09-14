@echo off
setlocal enabledelayedexpansion

echo 🚀 HesaabPlus Production Deployment
echo ==================================

REM Check if docker is installed
docker --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker is not installed. Please install Docker Desktop first.
    pause
    exit /b 1
)

REM Check if docker-compose is installed
docker-compose --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker Compose is not installed. Please install Docker Compose first.
    pause
    exit /b 1
)

REM Check if .env.production exists
if not exist ".env.production" (
    echo ⚠️  .env.production not found. Creating from template...
    copy .env.production.template .env.production
    echo 📝 Please edit .env.production with your actual values:
    echo    - POSTGRES_PASSWORD
    echo    - JWT_SECRET_KEY
    echo    - Cloudflare R2 or Backblaze B2 credentials
    echo    - Email and SMS configuration
    echo.
    echo After editing .env.production, run this script again.
    pause
    exit /b 0
)

echo 📋 Environment file found: .env.production

REM Create necessary directories
echo 📁 Creating directories...
if not exist "nginx\ssl" mkdir nginx\ssl
if not exist "backend\logs" mkdir backend\logs
if not exist "backend\uploads" mkdir backend\uploads

REM Build and start services
echo 🏗️  Building and starting services...
docker-compose -f docker-compose.prod.yml --env-file .env.production down
docker-compose -f docker-compose.prod.yml --env-file .env.production build --no-cache
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d

REM Wait for services to be ready
echo ⏳ Waiting for services to start...
timeout /t 30 /nobreak >nul

REM Check service health
echo 🔍 Checking service health...
docker-compose -f docker-compose.prod.yml ps

echo.
echo 🌐 Application URLs:
echo    Admin Panel: http://localhost:3000
echo    Tenant App:  http://localhost:3001
echo    Backend API: http://localhost:8000
echo    API Docs:    http://localhost:8000/docs
echo.
echo 📊 With nginx proxy (add to C:\Windows\System32\drivers\etc\hosts):
echo    127.0.0.1 admin.hesaabplus.local
echo    127.0.0.1 app.hesaabplus.local
echo    127.0.0.1 api.hesaabplus.local
echo.
echo    Admin Panel: http://admin.hesaabplus.local
echo    Tenant App:  http://app.hesaabplus.local
echo    Backend API: http://api.hesaabplus.local

echo.
echo 📝 Monitor logs:
echo    docker-compose -f docker-compose.prod.yml logs -f
echo.
echo 🎉 Deployment complete! Your HesaabPlus application is ready.
echo    Features:
echo    ✅ Real-time cache invalidation (no more frontend restarts!)
echo    ✅ WebSocket connections for live updates
echo    ✅ Production-optimized builds
echo    ✅ Health monitoring and auto-restart
echo    ✅ Service worker for offline support

pause