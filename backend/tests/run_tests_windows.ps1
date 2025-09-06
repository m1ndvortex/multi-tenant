# HesaabPlus Comprehensive API Integration Tests - PowerShell Version
# Runs all API endpoint tests with real database and Docker environment

Write-Host "🚀 Starting HesaabPlus Comprehensive API Integration Tests (PowerShell)" -ForegroundColor Blue
Write-Host "================================================================" -ForegroundColor Blue

# Function to write colored output
function Write-Success { param($Message) Write-Host "✅ $Message" -ForegroundColor Green }
function Write-Error { param($Message) Write-Host "❌ $Message" -ForegroundColor Red }
function Write-Warning { param($Message) Write-Host "⚠️  $Message" -ForegroundColor Yellow }
function Write-Info { param($Message) Write-Host "ℹ️  $Message" -ForegroundColor Cyan }

# Check if Docker is running
try {
    docker info | Out-Null
    Write-Success "Docker is running"
} catch {
    Write-Error "Docker is not running. Please start Docker Desktop and try again."
    Read-Host "Press Enter to exit"
    exit 1
}

# Check if docker-compose is available
try {
    docker-compose --version | Out-Null
    Write-Success "docker-compose is available"
} catch {
    Write-Error "docker-compose is not available. Please install Docker Desktop with docker-compose."
    Read-Host "Press Enter to exit"
    exit 1
}

# Navigate to project root (assuming script is in backend/tests)
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent (Split-Path -Parent $scriptPath)
Set-Location $projectRoot

Write-Info "Project root: $projectRoot"

# Stop any existing test containers (ONLY test containers, not main app)
Write-Info "🔧 Stopping existing test containers (keeping main app running)..."
docker stop hesaabplus_test_postgres hesaabplus_test_redis hesaabplus_test_backend 2>$null
docker rm hesaabplus_test_postgres hesaabplus_test_redis hesaabplus_test_backend 2>$null

# Remove test volumes to ensure clean state
Write-Info "🧹 Cleaning up test volumes..."
docker volume rm hesaabplus_test_postgres_data 2>$null
docker volume rm hesaabplus_test_redis_data 2>$null

# Build test images
Write-Info "🔨 Building test images..."
$buildResult = docker-compose -f docker-compose.test.yml build --no-cache
if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to build test images"
    Read-Host "Press Enter to exit"
    exit 1
}

# Start test services
Write-Info "🚀 Starting test services..."
$startResult = docker-compose -f docker-compose.test.yml up -d test-postgres test-redis
if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to start test services"
    Read-Host "Press Enter to exit"
    exit 1
}

# Wait for PostgreSQL to be ready
Write-Info "⏳ Waiting for PostgreSQL to be ready..."
$counter = 0
do {
    $pgReady = docker exec hesaabplus_test_postgres pg_isready -U test_user -d hesaabplus_test 2>$null
    if ($LASTEXITCODE -eq 0) { break }
    
    $counter++
    if ($counter -ge 60) {
        Write-Error "PostgreSQL failed to start within 60 seconds"
        docker-compose -f docker-compose.test.yml logs test-postgres
        Read-Host "Press Enter to exit"
        exit 1
    }
    Start-Sleep -Seconds 1
} while ($true)

Write-Success "PostgreSQL is ready"

# Wait for Redis to be ready
Write-Info "⏳ Waiting for Redis to be ready..."
$counter = 0
do {
    $redisReady = docker exec hesaabplus_test_redis redis-cli ping 2>$null
    if ($LASTEXITCODE -eq 0) { break }
    
    $counter++
    if ($counter -ge 30) {
        Write-Error "Redis failed to start within 30 seconds"
        docker-compose -f docker-compose.test.yml logs test-redis
        Read-Host "Press Enter to exit"
        exit 1
    }
    Start-Sleep -Seconds 1
} while ($true)

Write-Success "Redis is ready"

# Start test backend
Write-Info "🚀 Starting test backend..."
$backendResult = docker-compose -f docker-compose.test.yml up -d test-backend
if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to start test backend"
    Read-Host "Press Enter to exit"
    exit 1
}

# Wait for backend to be ready
Write-Info "⏳ Waiting for backend to be ready..."
Start-Sleep -Seconds 10

# Run comprehensive tests
Write-Info "🧪 Running comprehensive API integration tests..."
Write-Host "================================================================" -ForegroundColor Blue

$testResults = 0
$testSuites = @(
    @{Name="Comprehensive API Integration Tests"; File="test_comprehensive_api_integration.py"},
    @{Name="Accounting API Tests"; File="test_accounting_api_comprehensive.py"},
    @{Name="Installments API Tests"; File="test_installments_api_comprehensive.py"},
    @{Name="Reports API Tests"; File="test_reports_api_comprehensive.py"},
    @{Name="Notifications API Tests"; File="test_notifications_api_comprehensive.py"},
    @{Name="Inventory API Tests"; File="test_inventory_api_comprehensive.py"}
)

foreach ($testSuite in $testSuites) {
    Write-Host ""
    Write-Info "📋 Running: $($testSuite.Name)"
    
    $testCommand = "python -m pytest tests/$($testSuite.File) -v --tb=short --maxfail=5 --disable-warnings"
    $testResult = docker exec hesaabplus_test_backend $testCommand
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "$($testSuite.Name): PASSED"
    } else {
        Write-Error "$($testSuite.Name): FAILED"
        $testResults++
    }
}

# Print summary
Write-Host ""
Write-Host "================================================================" -ForegroundColor Blue
Write-Info "📊 TEST SUMMARY"
Write-Host "================================================================" -ForegroundColor Blue

if ($testResults -eq 0) {
    Write-Host "🎉 ALL TESTS PASSED!" -ForegroundColor Green
    Write-Success "All $($testSuites.Count) test suites completed successfully"
} else {
    Write-Host "💥 $testResults TEST SUITE(S) FAILED" -ForegroundColor Red
    Write-Warning "Please check the output above for details"
}

Write-Host "================================================================" -ForegroundColor Blue

# Ask user if they want to keep containers running
Write-Host ""
$keepRunning = Read-Host "Keep test containers running for debugging? (y/N)"
if ($keepRunning -eq "y" -or $keepRunning -eq "Y") {
    Write-Info "🔧 Keeping test containers running for debugging..."
    Write-Info "💡 To stop containers: docker-compose -f docker-compose.test.yml down"
    Write-Info "💡 To view logs: docker-compose -f docker-compose.test.yml logs [service-name]"
    Write-Info "💡 Available services: test-postgres, test-redis, test-backend"
} else {
    Write-Info "🧹 Cleaning up test containers (keeping main app running)..."
    docker stop hesaabplus_test_postgres hesaabplus_test_redis hesaabplus_test_backend 2>$null
    docker rm hesaabplus_test_postgres hesaabplus_test_redis hesaabplus_test_backend 2>$null
    
    # Clean up test volumes
    docker volume rm hesaabplus_test_postgres_data 2>$null
    docker volume rm hesaabplus_test_redis_data 2>$null
    
    Write-Success "Cleanup completed"
}

Write-Host ""
Write-Info "🏁 Test execution completed"
Read-Host "Press Enter to exit"

if ($testResults -eq 0) {
    exit 0
} else {
    exit 1
}