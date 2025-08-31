#!/usr/bin/env python3
"""
Comprehensive test runner for HesaabPlus SaaS application.
Runs all tests in Docker containers following production-ready standards.
"""

import subprocess
import sys
import time
import os
from typing import List, Dict, Tuple

class TestRunner:
    def __init__(self):
        self.results: Dict[str, bool] = {}
        self.test_output: Dict[str, str] = {}
        
    def run_command(self, command: List[str], description: str) -> Tuple[bool, str]:
        """Run a command and capture output."""
        print(f"\n{'='*60}")
        print(f"Running: {description}")
        print(f"Command: {' '.join(command)}")
        print(f"{'='*60}")
        
        try:
            result = subprocess.run(
                command,
                capture_output=True,
                text=True,
                timeout=600  # 10 minutes timeout
            )
            
            output = f"STDOUT:\n{result.stdout}\n\nSTDERR:\n{result.stderr}"
            success = result.returncode == 0
            
            if success:
                print(f"✅ {description} - PASSED")
            else:
                print(f"❌ {description} - FAILED")
                print(f"Exit code: {result.returncode}")
                
            return success, output
            
        except subprocess.TimeoutExpired:
            print(f"⏰ {description} - TIMEOUT")
            return False, "Test timed out after 10 minutes"
        except Exception as e:
            print(f"💥 {description} - ERROR: {str(e)}")
            return False, f"Exception: {str(e)}"
    
    def setup_test_environment(self) -> bool:
        """Set up the test environment."""
        print("\n🚀 Setting up test environment...")
        
        # Clean up any existing test containers
        success, output = self.run_command(
            ["docker-compose", "-f", "docker-compose.test.yml", "down", "--volumes"],
            "Cleaning up existing test containers"
        )
        
        # Build test images
        success, output = self.run_command(
            ["docker-compose", "-f", "docker-compose.test.yml", "build"],
            "Building test images"
        )
        
        if not success:
            print("❌ Failed to build test images")
            return False
            
        # Start test services
        success, output = self.run_command(
            ["docker-compose", "-f", "docker-compose.test.yml", "up", "-d", "test-postgres", "test-redis"],
            "Starting test database and Redis"
        )
        
        if not success:
            print("❌ Failed to start test services")
            return False
            
        # Wait for services to be ready
        print("⏳ Waiting for services to be ready...")
        time.sleep(10)
        
        return True
    
    def run_backend_tests(self) -> bool:
        """Run all backend tests."""
        print("\n🐍 Running Backend Tests...")
        
        test_categories = [
            ("Unit Tests - Main", ["python", "-m", "pytest", "tests/test_main.py", "-v"]),
            ("Unit Tests - Models", ["python", "-m", "pytest", "tests/test_models/", "-v"]),
            ("Unit Tests - Auth", ["python", "-m", "pytest", "tests/test_auth/", "-v"]),
            ("Integration Tests - Tenant API", ["python", "-m", "pytest", "tests/test_tenant_api.py", "-v"]),
            ("Integration Tests - Tenant Isolation", ["python", "-m", "pytest", "tests/test_tenant_isolation.py", "-v"]),
            ("Integration Tests - Tenant Simple", ["python", "-m", "pytest", "tests/test_tenant_isolation_simple.py", "-v"]),
            ("Integration Tests - Tenant Full", ["python", "-m", "pytest", "tests/test_tenant_integration.py", "-v"]),
            ("Coverage Report", ["python", "-m", "pytest", "--cov=app", "--cov-report=term-missing", "--cov-fail-under=80"])
        ]
        
        all_passed = True
        
        for description, test_cmd in test_categories:
            # Run test in Docker container
            docker_cmd = [
                "docker-compose", "-f", "docker-compose.test.yml", "exec", "-T", "test-backend"
            ] + test_cmd
            
            success, output = self.run_command(docker_cmd, f"Backend {description}")
            self.results[f"Backend {description}"] = success
            self.test_output[f"Backend {description}"] = output
            
            if not success:
                all_passed = False
                
        return all_passed
    
    def run_frontend_tests(self) -> bool:
        """Run frontend tests."""
        print("\n⚛️ Running Frontend Tests...")
        
        # Super Admin Frontend Tests
        success_super, output_super = self.run_command(
            ["docker-compose", "-f", "docker-compose.test.yml", "run", "--rm", "test-super-admin-frontend"],
            "Super Admin Frontend Tests"
        )
        self.results["Super Admin Frontend"] = success_super
        self.test_output["Super Admin Frontend"] = output_super
        
        # Tenant Frontend Tests
        success_tenant, output_tenant = self.run_command(
            ["docker-compose", "-f", "docker-compose.test.yml", "run", "--rm", "test-tenant-frontend"],
            "Tenant Frontend Tests"
        )
        self.results["Tenant Frontend"] = success_tenant
        self.test_output["Tenant Frontend"] = output_tenant
        
        return success_super and success_tenant
    
    def run_integration_tests(self) -> bool:
        """Run end-to-end integration tests."""
        print("\n🔗 Running Integration Tests...")
        
        # Start full test environment
        success, output = self.run_command(
            ["docker-compose", "-f", "docker-compose.test.yml", "up", "-d"],
            "Starting full test environment"
        )
        
        if not success:
            return False
            
        # Wait for all services
        time.sleep(15)
        
        # Run comprehensive integration tests
        success, output = self.run_command(
            ["docker-compose", "-f", "docker-compose.test.yml", "exec", "-T", "test-backend", 
             "python", "-m", "pytest", "tests/", "-v", "--tb=short", "-x"],
            "Full Integration Test Suite"
        )
        
        self.results["Full Integration"] = success
        self.test_output["Full Integration"] = output
        
        return success
    
    def cleanup(self):
        """Clean up test environment."""
        print("\n🧹 Cleaning up test environment...")
        self.run_command(
            ["docker-compose", "-f", "docker-compose.test.yml", "down", "--volumes"],
            "Cleaning up test containers"
        )
    
    def print_summary(self):
        """Print test results summary."""
        print("\n" + "="*80)
        print("🏁 TEST RESULTS SUMMARY")
        print("="*80)
        
        total_tests = len(self.results)
        passed_tests = sum(1 for result in self.results.values() if result)
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests} ✅")
        print(f"Failed: {failed_tests} ❌")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        print("\nDetailed Results:")
        for test_name, result in self.results.items():
            status = "✅ PASS" if result else "❌ FAIL"
            print(f"  {test_name}: {status}")
        
        if failed_tests > 0:
            print("\n❌ FAILED TEST DETAILS:")
            for test_name, result in self.results.items():
                if not result:
                    print(f"\n--- {test_name} ---")
                    print(self.test_output.get(test_name, "No output available"))
        
        return failed_tests == 0

def main():
    """Main test execution function."""
    runner = TestRunner()
    
    try:
        print("🧪 HesaabPlus SaaS - Comprehensive Test Suite")
        print("=" * 60)
        
        # Setup test environment
        if not runner.setup_test_environment():
            print("❌ Failed to setup test environment")
            return 1
        
        # Start test backend service
        success, _ = runner.run_command(
            ["docker-compose", "-f", "docker-compose.test.yml", "up", "-d", "test-backend"],
            "Starting test backend service"
        )
        
        if not success:
            print("❌ Failed to start test backend")
            return 1
            
        # Wait for backend to be ready
        time.sleep(10)
        
        # Run all test categories
        backend_success = runner.run_backend_tests()
        frontend_success = runner.run_frontend_tests()
        
        # Print final summary
        all_success = runner.print_summary()
        
        if all_success:
            print("\n🎉 ALL TESTS PASSED! Your changes are safe to deploy.")
            return 0
        else:
            print("\n⚠️  SOME TESTS FAILED! Please review and fix before deploying.")
            return 1
            
    except KeyboardInterrupt:
        print("\n⏹️  Test execution interrupted by user")
        return 1
    except Exception as e:
        print(f"\n💥 Unexpected error: {str(e)}")
        return 1
    finally:
        runner.cleanup()

if __name__ == "__main__":
    sys.exit(main())