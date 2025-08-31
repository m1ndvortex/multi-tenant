#!/bin/bash

# HesaabPlus SaaS - Docker-First Test Runner
# Runs all tests following production-ready standards

set -e

echo "🧪 HesaabPlus SaaS - Comprehensive Test Suite"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results tracking
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

run_test() {
    local test_name="$1"
    local test_command="$2"
    
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}Running: $test_name${NC}"
    echo -e "${BLUE}========================================${NC}"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    if eval "$test_command"; then
        echo -e "${GREEN}✅ $test_name - PASSED${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        return 0
    else
        echo -e "${RED}❌ $test_name - FAILED${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        return 1
    fi
}

cleanup() {
    echo -e "\n${YELLOW}🧹 Cleaning up test environment...${NC}"
    docker-compose -f docker-compose.test.yml down --volumes --remove-orphans 2>/dev/null || true
}

# Trap to ensure cleanup on exit
trap cleanup EXIT

echo -e "${YELLOW}🚀 Setting up test environment...${NC}"

# Clean up any existing containers
cleanup

# Build test images
echo -e "${YELLOW}🔨 Building test images...${NC}"
docker-compose -f docker-compose.test.yml build

# Start test services
echo -e "${YELLOW}🚀 Starting test services...${NC}"
docker-compose -f docker-compose.test.yml up -d test-postgres test-redis

# Wait for services to be ready
echo -e "${YELLOW}⏳ Waiting for services to be ready...${NC}"
sleep 15

# Start test backend
docker-compose -f docker-compose.test.yml up -d test-backend

# Wait for backend to be ready
sleep 10

echo -e "\n${BLUE}🐍 Running Backend Tests...${NC}"

# Backend Unit Tests
run_test "Backend Unit Tests - Main" \
    "docker-compose -f docker-compose.test.yml exec -T test-backend python -m pytest tests/test_main.py -v --tb=short"

run_test "Backend Unit Tests - Models" \
    "docker-compose -f docker-compose.test.yml exec -T test-backend python -m pytest tests/test_models/ -v --tb=short"

run_test "Backend Unit Tests - Auth" \
    "docker-compose -f docker-compose.test.yml exec -T test-backend python -m pytest tests/test_auth/ -v --tb=short"

# Backend Integration Tests
run_test "Backend Integration - Tenant API" \
    "docker-compose -f docker-compose.test.yml exec -T test-backend python -m pytest tests/test_tenant_api.py -v --tb=short"

run_test "Backend Integration - Tenant Isolation Simple" \
    "docker-compose -f docker-compose.test.yml exec -T test-backend python -m pytest tests/test_tenant_isolation_simple.py -v --tb=short"

run_test "Backend Integration - Tenant Isolation Full" \
    "docker-compose -f docker-compose.test.yml exec -T test-backend python -m pytest tests/test_tenant_isolation.py -v --tb=short"

run_test "Backend Integration - Tenant Full Integration" \
    "docker-compose -f docker-compose.test.yml exec -T test-backend python -m pytest tests/test_tenant_integration.py -v --tb=short"

# Coverage Report
run_test "Backend Coverage Report" \
    "docker-compose -f docker-compose.test.yml exec -T test-backend python -m pytest --cov=app --cov-report=term-missing --cov-fail-under=70"

echo -e "\n${BLUE}⚛️ Running Frontend Tests...${NC}"

# Frontend Tests
run_test "Super Admin Frontend Tests" \
    "docker-compose -f docker-compose.test.yml run --rm test-super-admin-frontend"

run_test "Tenant Frontend Tests" \
    "docker-compose -f docker-compose.test.yml run --rm test-tenant-frontend"

# Final Summary
echo -e "\n${BLUE}============================================${NC}"
echo -e "${BLUE}🏁 TEST RESULTS SUMMARY${NC}"
echo -e "${BLUE}============================================${NC}"

echo -e "Total Tests: $TOTAL_TESTS"
echo -e "${GREEN}Passed: $PASSED_TESTS ✅${NC}"
echo -e "${RED}Failed: $FAILED_TESTS ❌${NC}"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "\n${GREEN}🎉 ALL TESTS PASSED! Your changes are safe to deploy.${NC}"
    exit 0
else
    echo -e "\n${RED}⚠️  SOME TESTS FAILED! Please review and fix before deploying.${NC}"
    exit 1
fi