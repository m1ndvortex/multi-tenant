#!/bin/bash
"""
Docker Test Environment Setup Script
Sets up and runs comprehensive API integration tests in Docker environment
"""

set -e  # Exit on any error

echo "🐳 Setting up Docker Test Environment for HesaabPlus API Tests"
echo "================================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker and try again."
    exit 1
fi

print_success "Docker is running"

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    print_error "docker-compose is not installed. Please install docker-compose and try again."
    exit 1
fi

print_success "docker-compose is available"

# Navigate to project root
cd "$(dirname "$0")/../.."

# Stop any existing test containers
print_status "Stopping existing test containers..."
docker-compose -f docker-compose.test.yml down --remove-orphans || true

# Remove test volumes to ensure clean state
print_status "Cleaning up test volumes..."
docker volume rm hesaabplus_test_postgres_data 2>/dev/null || true
docker volume rm hesaabplus_test_redis_data 2>/dev/null || true

# Build test images
print_status "Building test images..."
docker-compose -f docker-compose.test.yml build --no-cache

# Start test services
print_status "Starting test services..."
docker-compose -f docker-compose.test.yml up -d test-postgres test-redis

# Wait for services to be ready
print_status "Waiting for PostgreSQL to be ready..."
timeout=60
counter=0
while ! docker exec hesaabplus_test_postgres pg_isready -U test_user -d hesaabplus_test > /dev/null 2>&1; do
    if [ $counter -ge $timeout ]; then
        print_error "PostgreSQL failed to start within $timeout seconds"
        docker-compose -f docker-compose.test.yml logs test-postgres
        exit 1
    fi
    sleep 1
    counter=$((counter + 1))
done

print_success "PostgreSQL is ready"

print_status "Waiting for Redis to be ready..."
counter=0
while ! docker exec hesaabplus_test_redis redis-cli ping > /dev/null 2>&1; do
    if [ $counter -ge $timeout ]; then
        print_error "Redis failed to start within $timeout seconds"
        docker-compose -f docker-compose.test.yml logs test-redis
        exit 1
    fi
    sleep 1
    counter=$((counter + 1))
done

print_success "Redis is ready"

# Start test backend
print_status "Starting test backend..."
docker-compose -f docker-compose.test.yml up -d test-backend

# Wait for backend to be ready
print_status "Waiting for backend to be ready..."
sleep 10

# Check backend health
counter=0
while ! docker exec hesaabplus_test_backend python -c "
import requests
try:
    response = requests.get('http://localhost:8000/api/health/', timeout=5)
    if response.status_code == 200:
        exit(0)
    else:
        exit(1)
except:
    exit(1)
" > /dev/null 2>&1; do
    if [ $counter -ge 30 ]; then
        print_warning "Backend health check failed, but continuing with tests..."
        break
    fi
    sleep 2
    counter=$((counter + 1))
done

if [ $counter -lt 30 ]; then
    print_success "Backend is ready"
fi

# Run comprehensive tests
print_status "Running comprehensive API integration tests..."
echo "================================================================"

# Run tests inside the backend container
docker exec hesaabplus_test_backend python -m pytest tests/test_comprehensive_api_integration.py -v --tb=short --maxfail=10 --disable-warnings

test_exit_code=$?

if [ $test_exit_code -eq 0 ]; then
    print_success "All comprehensive API tests passed!"
else
    print_error "Some tests failed (exit code: $test_exit_code)"
fi

# Run accounting tests
print_status "Running accounting API tests..."
docker exec hesaabplus_test_backend python -m pytest tests/test_accounting_api_comprehensive.py -v --tb=short --maxfail=5 --disable-warnings

accounting_exit_code=$?

if [ $accounting_exit_code -eq 0 ]; then
    print_success "All accounting API tests passed!"
else
    print_error "Some accounting tests failed (exit code: $accounting_exit_code)"
fi

# Run installments tests
print_status "Running installments API tests..."
docker exec hesaabplus_test_backend python -m pytest tests/test_installments_api_comprehensive.py -v --tb=short --maxfail=5 --disable-warnings

installments_exit_code=$?

if [ $installments_exit_code -eq 0 ]; then
    print_success "All installments API tests passed!"
else
    print_error "Some installments tests failed (exit code: $installments_exit_code)"
fi

# Calculate overall result
overall_exit_code=0
if [ $test_exit_code -ne 0 ] || [ $accounting_exit_code -ne 0 ] || [ $installments_exit_code -ne 0 ]; then
    overall_exit_code=1
fi

# Print summary
echo "================================================================"
print_status "TEST SUMMARY"
echo "================================================================"

if [ $test_exit_code -eq 0 ]; then
    print_success "✅ Comprehensive API Tests: PASSED"
else
    print_error "❌ Comprehensive API Tests: FAILED"
fi

if [ $accounting_exit_code -eq 0 ]; then
    print_success "✅ Accounting API Tests: PASSED"
else
    print_error "❌ Accounting API Tests: FAILED"
fi

if [ $installments_exit_code -eq 0 ]; then
    print_success "✅ Installments API Tests: PASSED"
else
    print_error "❌ Installments API Tests: FAILED"
fi

echo "================================================================"

if [ $overall_exit_code -eq 0 ]; then
    print_success "🎉 ALL TESTS PASSED!"
else
    print_error "💥 SOME TESTS FAILED"
fi

# Option to keep containers running for debugging
if [ "$1" = "--keep-running" ]; then
    print_status "Keeping test containers running for debugging..."
    print_status "To stop containers: docker-compose -f docker-compose.test.yml down"
    print_status "To view logs: docker-compose -f docker-compose.test.yml logs [service-name]"
else
    print_status "Cleaning up test containers..."
    docker-compose -f docker-compose.test.yml down --remove-orphans
    
    # Clean up test volumes
    docker volume rm hesaabplus_test_postgres_data 2>/dev/null || true
    docker volume rm hesaabplus_test_redis_data 2>/dev/null || true
    
    print_success "Cleanup completed"
fi

exit $overall_exit_code