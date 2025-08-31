#!/usr/bin/env python3
"""
Test runner script for HesaabPlus backend
"""

import os
import sys
import subprocess
from pathlib import Path

def run_tests():
    """Run all tests with coverage"""
    
    # Set environment variables for testing
    os.environ["DATABASE_URL"] = "postgresql://test_user:test_password@postgres:5432/hesaabplus_test"
    os.environ["REDIS_URL"] = "redis://redis:6379/1"
    os.environ["JWT_SECRET_KEY"] = "test_secret_key_for_testing_only"
    
    # Change to backend directory
    backend_dir = Path(__file__).parent
    os.chdir(backend_dir)
    
    # Run pytest with coverage
    cmd = [
        sys.executable, "-m", "pytest",
        "tests/",
        "-v",
        "--cov=app",
        "--cov-report=term-missing",
        "--cov-report=html:htmlcov",
        "--tb=short"
    ]
    
    print("Running tests with command:", " ".join(cmd))
    result = subprocess.run(cmd)
    
    return result.returncode

if __name__ == "__main__":
    exit_code = run_tests()
    sys.exit(exit_code)