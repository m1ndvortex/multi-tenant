@echo off
REM Safe Test Runner - Ensures main app is running, then runs tests
REM This script will NOT touch your main application containers

echo 🚀 HesaabPlus Safe Test Runner (Windows)
echo ================================================================

REM Colors for Windows (limited support)
set "GREEN=[92m"
set "RED=[91m"
set "YELLOW=[93m"
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

REM Navigate to project root
cd /d "%~dp0..\.."

REM Step 1: Ensure main application is running
echo %BLUE%🚀 Step 1: Starting/Checking main application...%NC%
echo ================================================================

REM Start main application (this will only start if not already running)
docker-compose up -d

REM Wait a moment for services to start
timeout /t 5 /nobreak >nul

REM Check if main services are running
echo %BLUE%🔍 Checking main application status...%NC%

docker ps --filter "name=hesaabplus_postgres" --format "table {{.Names}}\t{{.Status}}" | findstr hesaabplus_postgres >nul
if %errorlevel% equ 0 (
    echo %GREEN%✅ Main PostgreSQL is running%NC%
) else (
    echo %YELLOW%⚠️  Main PostgreSQL not found, but continuing...%NC%
)

docker ps --filter "name=hesaabplus_redis" --format "table {{.Names}}\t{{.Status}}" | findstr hesaabplus_redis >nul
if %errorlevel% equ 0 (
    echo %GREEN%✅ Main Redis is running%NC%
) else (
    echo %YELLOW%⚠️  Main Redis not found, but continuing...%NC%
)

docker ps --filter "name=hesaabplus_backend" --format "table {{.Names}}\t{{.Status}}" | findstr hesaabplus_backend >nul
if %errorlevel% equ 0 (
    echo %GREEN%✅ Main Backend is running%NC%
) else (
    echo %YELLOW%⚠️  Main Backend not found, but continuing...%NC%
)

echo.
echo %BLUE%🧪 Step 2: Running comprehensive tests...%NC%
echo ================================================================

REM Stop any existing test containers (ONLY test containers)
echo %BLUE%🔧 Cleaning up any existing test containers...%NC%
docker stop hesaabplus_test_postgres hesaabplus_test_redis hesaabplus_test_backend 2>nul
docker rm hesaabplus_test_postgres hesaabplus_test_redis hesaabplus_test_backend 2>nul

REM Remove test volumes to ensure clean state
echo %BLUE%🧹 Cleaning up test volumes...%NC%
docker volume rm hesaabplus_test_postgres_data 2>nul
docker volume rm hesaabplus_test_redis_data 2>nul

REM Build test images
echo %BLUE%🔨 Building test images...%NC%
docker-compose -f docker-compose.test.yml build --no-cache
if %errorlevel% neq 0 (
    echo %RED%❌ Failed to build test images%NC%
    pause
    exit /b 1
)

REM Start test services
echo %BLUE%🚀 Starting test services...%NC%
docker-compose -f docker-compose.test.yml up -d test-postgres test-redis
if %errorlevel% neq 0 (
    echo %RED%❌ Failed to start test services%NC%
    pause
    exit /b 1
)

REM Wait for PostgreSQL to be ready
echo %BLUE%⏳ Waiting for test PostgreSQL to be ready...%NC%
set /a counter=0
:wait_postgres
docker exec hesaabplus_test_postgres pg_isready -U test_user -d hesaabplus_test >nul 2>&1
if %errorlevel% equ 0 goto postgres_ready
set /a counter+=1
if %counter% geq 60 (
    echo %RED%❌ Test PostgreSQL failed to start within 60 seconds%NC%
    docker-compose -f docker-compose.test.yml logs test-postgres
    pause
    exit /b 1
)
timeout /t 1 /nobreak >nul
goto wait_postgres

:postgres_ready
echo %GREEN%✅ Test PostgreSQL is ready%NC%

REM Wait for Redis to be ready
echo %BLUE%⏳ Waiting for test Redis to be ready...%NC%
set /a counter=0
:wait_redis
docker exec hesaabplus_test_redis redis-cli ping >nul 2>&1
if %errorlevel% equ 0 goto redis_ready
set /a counter+=1
if %counter% geq 30 (
    echo %RED%❌ Test Redis failed to start within 30 seconds%NC%
    docker-compose -f docker-compose.test.yml logs test-redis
    pause
    exit /b 1
)
timeout /t 1 /nobreak >nul
goto wait_redis

:redis_ready
echo %GREEN%✅ Test Redis is ready%NC%

REM Start test backend
echo %BLUE%🚀 Starting test backend...%NC%
docker-compose -f docker-compose.test.yml up -d test-backend
if %errorlevel% neq 0 (
    echo %RED%❌ Failed to start test backend%NC%
    pause
    exit /b 1
)

REM Wait for backend to be ready
echo %BLUE%⏳ Waiting for test backend to be ready...%NC%
timeout /t 10 /nobreak >nul

REM Run comprehensive tests
echo %BLUE%🧪 Running comprehensive API integration tests...%NC%
echo ================================================================

set "test_results=0"

REM Test 1: Comprehensive API Integration Tests
echo.
echo %BLUE%📋 Running: Comprehensive API Integration Tests%NC%
docker exec hesaabplus_test_backend python -m pytest tests/test_comprehensive_api_integration.py -v --tb=short --maxfail=10 --disable-warnings
if %errorlevel% equ 0 (
    echo %GREEN%✅ Comprehensive API Tests: PASSED%NC%
) else (
    echo %RED%❌ Comprehensive API Tests: FAILED%NC%
    set /a test_results+=1
)

REM Test 2: Accounting API Tests
echo.
echo %BLUE%📋 Running: Accounting API Tests%NC%
docker exec hesaabplus_test_backend python -m pytest tests/test_accounting_api_comprehensive.py -v --tb=short --maxfail=5 --disable-warnings
if %errorlevel% equ 0 (
    echo %GREEN%✅ Accounting API Tests: PASSED%NC%
) else (
    echo %RED%❌ Accounting API Tests: FAILED%NC%
    set /a test_results+=1
)

REM Test 3: Installments API Tests
echo.
echo %BLUE%📋 Running: Installments API Tests%NC%
docker exec hesaabplus_test_backend python -m pytest tests/test_installments_api_comprehensive.py -v --tb=short --maxfail=5 --disable-warnings
if %errorlevel% equ 0 (
    echo %GREEN%✅ Installments API Tests: PASSED%NC%
) else (
    echo %RED%❌ Installments API Tests: FAILED%NC%
    set /a test_results+=1
)

REM Test 4: Reports API Tests
echo.
echo %BLUE%📋 Running: Reports API Tests%NC%
docker exec hesaabplus_test_backend python -m pytest tests/test_reports_api_comprehensive.py -v --tb=short --maxfail=5 --disable-warnings
if %errorlevel% equ 0 (
    echo %GREEN%✅ Reports API Tests: PASSED%NC%
) else (
    echo %RED%❌ Reports API Tests: FAILED%NC%
    set /a test_results+=1
)

REM Test 5: Notifications API Tests
echo.
echo %BLUE%📋 Running: Notifications API Tests%NC%
docker exec hesaabplus_test_backend python -m pytest tests/test_notifications_api_comprehensive.py -v --tb=short --maxfail=5 --disable-warnings
if %errorlevel% equ 0 (
    echo %GREEN%✅ Notifications API Tests: PASSED%NC%
) else (
    echo %RED%❌ Notifications API Tests: FAILED%NC%
    set /a test_results+=1
)

REM Test 6: Inventory API Tests
echo.
echo %BLUE%📋 Running: Inventory API Tests%NC%
docker exec hesaabplus_test_backend python -m pytest tests/test_inventory_api_comprehensive.py -v --tb=short --maxfail=5 --disable-warnings
if %errorlevel% equ 0 (
    echo %GREEN%✅ Inventory API Tests: PASSED%NC%
) else (
    echo %RED%❌ Inventory API Tests: FAILED%NC%
    set /a test_results+=1
)

REM Print summary
echo.
echo ================================================================
echo %BLUE%📊 TEST SUMMARY%NC%
echo ================================================================

if %test_results% equ 0 (
    echo %GREEN%🎉 ALL TESTS PASSED!%NC%
    echo %GREEN%✅ All 6 test suites completed successfully%NC%
) else (
    echo %RED%💥 %test_results% TEST SUITE(S) FAILED%NC%
    echo %YELLOW%⚠️  Please check the output above for details%NC%
)

echo ================================================================

REM Step 3: Cleanup test containers (keep main app running)
echo.
echo %BLUE%🧹 Step 3: Cleaning up test containers (keeping main app running)...%NC%
docker stop hesaabplus_test_postgres hesaabplus_test_redis hesaabplus_test_backend 2>nul
docker rm hesaabplus_test_postgres hesaabplus_test_redis hesaabplus_test_backend 2>nul

REM Clean up test volumes
docker volume rm hesaabplus_test_postgres_data 2>nul
docker volume rm hesaabplus_test_redis_data 2>nul

echo %GREEN%✅ Test cleanup completed%NC%

REM Show main app status
echo.
echo %BLUE%📋 Main Application Status (still running):%NC%
docker ps --filter "name=hesaabplus" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo.
echo %BLUE%🏁 Test execution completed - Main application is still running%NC%
pause

if %test_results% equ 0 (
    exit /b 0
) else (
    exit /b 1
)