#!/usr/bin/env python3
"""
Comprehensive Test Runner for HesaabPlus API Integration Tests
Runs all API endpoint tests with real database and Docker environment
"""

import subprocess
import sys
import os
import time
from pathlib import Path

# Test configuration
TEST_FILES = [
    "test_comprehensive_api_integration.py",
    "test_accounting_api_comprehensive.py", 
    "test_installments_api_comprehensive.py",
    "test_reports_api_comprehensive.py",
    "test_notifications_api_comprehensive.py",
    "test_inventory_api_comprehensive.py",
]

PYTEST_OPTIONS = [
    "-v",  # Verbose output
    "--tb=short",  # Short traceback format
    "--maxfail=5",  # Stop after 5 failures
    "--disable-warnings",  # Disable warnings for cleaner output
    "--durations=10",  # Show 10 slowest tests
]

def check_docker_services():
    """Check if required Docker services are running"""
    print("🔍 Checking Docker services...")
    
    services_to_check = [
        "hesaabplus_test_postgres",
        "hesaabplus_test_redis", 
        "hesaabplus_test_backend"
    ]
    
    for service in services_to_check:
        try:
            result = subprocess.run(
                ["docker", "ps", "--filter", f"name={service}", "--format", "{{.Names}}"],
                capture_output=True,
                text=True,
                check=True
            )
            
            if service not in result.stdout:
                print(f"❌ Service {service} is not running")
                print("Please start the test environment with: docker-compose -f docker-compose.test.yml up -d")
                return False
            else:
                print(f"✅ Service {service} is running")
                
        except subprocess.CalledProcessError as e:
            print(f"❌ Error checking Docker service {service}: {e}")
            return False
    
    return True

def wait_for_services():
    """Wait for services to be ready"""
    print("⏳ Waiting for services to be ready...")
    
    # Wait for database to be ready
    max_attempts = 30
    for attempt in range(max_attempts):
        try:
            result = subprocess.run(
                ["docker", "exec", "hesaabplus_test_postgres", "pg_isready", "-U", "test_user", "-d", "hesaabplus_test"],
                capture_output=True,
                text=True,
                check=True
            )
            
            if "accepting connections" in result.stdout:
                print("✅ PostgreSQL is ready")
                break
                
        except subprocess.CalledProcessError:
            if attempt == max_attempts - 1:
                print("❌ PostgreSQL failed to become ready")
                return False
            time.sleep(2)
    
    # Wait for Redis to be ready
    for attempt in range(max_attempts):
        try:
            result = subprocess.run(
                ["docker", "exec", "hesaabplus_test_redis", "redis-cli", "ping"],
                capture_output=True,
                text=True,
                check=True
            )
            
            if "PONG" in result.stdout:
                print("✅ Redis is ready")
                break
                
        except subprocess.CalledProcessError:
            if attempt == max_attempts - 1:
                print("❌ Redis failed to become ready")
                return False
            time.sleep(1)
    
    # Additional wait for backend to be fully ready
    print("⏳ Waiting for backend to be ready...")
    time.sleep(5)
    
    return True

def run_test_file(test_file):
    """Run a specific test file"""
    print(f"\n🧪 Running {test_file}...")
    print("=" * 80)
    
    cmd = ["python", "-m", "pytest"] + PYTEST_OPTIONS + [test_file]
    
    try:
        result = subprocess.run(
            cmd,
            cwd=Path(__file__).parent,
            check=False  # Don't raise exception on test failures
        )
        
        if result.returncode == 0:
            print(f"✅ {test_file} - ALL TESTS PASSED")
            return True
        else:
            print(f"❌ {test_file} - SOME TESTS FAILED (exit code: {result.returncode})")
            return False
            
    except Exception as e:
        print(f"❌ Error running {test_file}: {e}")
        return False

def run_all_tests():
    """Run all comprehensive tests"""
    print("🚀 Starting Comprehensive API Integration Tests")
    print("=" * 80)
    
    # Check Docker services
    if not check_docker_services():
        return False
    
    # Wait for services to be ready
    if not wait_for_services():
        return False
    
    # Run tests
    results = {}
    total_tests = len(TEST_FILES)
    passed_tests = 0
    
    start_time = time.time()
    
    for test_file in TEST_FILES:
        if os.path.exists(os.path.join(Path(__file__).parent, test_file)):
            success = run_test_file(test_file)
            results[test_file] = success
            if success:
                passed_tests += 1
        else:
            print(f"⚠️  Test file {test_file} not found, skipping...")
            results[test_file] = None
    
    end_time = time.time()
    duration = end_time - start_time
    
    # Print summary
    print("\n" + "=" * 80)
    print("📊 TEST SUMMARY")
    print("=" * 80)
    
    for test_file, result in results.items():
        if result is True:
            print(f"✅ {test_file}")
        elif result is False:
            print(f"❌ {test_file}")
        else:
            print(f"⚠️  {test_file} (skipped)")
    
    print(f"\n📈 Results: {passed_tests}/{total_tests} test files passed")
    print(f"⏱️  Total duration: {duration:.2f} seconds")
    
    if passed_tests == total_tests:
        print("\n🎉 ALL COMPREHENSIVE TESTS PASSED!")
        return True
    else:
        print(f"\n💥 {total_tests - passed_tests} test file(s) failed")
        return False

def run_specific_test(test_name):
    """Run a specific test or test file"""
    print(f"🧪 Running specific test: {test_name}")
    
    # Check if it's a file name
    if test_name in TEST_FILES:
        return run_test_file(test_name)
    
    # Check if it's a test pattern
    cmd = ["python", "-m", "pytest"] + PYTEST_OPTIONS + ["-k", test_name]
    
    try:
        result = subprocess.run(
            cmd,
            cwd=Path(__file__).parent,
            check=False
        )
        
        return result.returncode == 0
        
    except Exception as e:
        print(f"❌ Error running test {test_name}: {e}")
        return False

def main():
    """Main function"""
    if len(sys.argv) > 1:
        # Run specific test
        test_name = sys.argv[1]
        success = run_specific_test(test_name)
    else:
        # Run all tests
        success = run_all_tests()
    
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()