#!/usr/bin/env python3
"""
Run restore tests with real B2 integration
Sets environment variables before importing modules
"""

import os
import sys
import subprocess

# Set B2 environment variables BEFORE importing any modules
os.environ['BACKBLAZE_B2_ACCESS_KEY'] = '005acba9882c2b80000000001'
os.environ['BACKBLAZE_B2_SECRET_KEY'] = 'K005LzPhrovqG5Eq37oYWxIQiIKIHh8'
os.environ['BACKBLAZE_B2_BUCKET'] = 'securesyntax'
os.environ['DATABASE_URL'] = 'postgresql://hesaab:secure_password_2024@postgres:5432/hesaabplus'
os.environ['REDIS_URL'] = 'redis://redis:6379/0'
os.environ['JWT_SECRET_KEY'] = 'your_jwt_secret_key_change_in_production'
os.environ['PYTHONPATH'] = '/app'

def run_restore_tests():
    """Run restore tests with B2 configuration"""
    print("🚀 Running Restore Tests with Real B2 Integration")
    print("=" * 60)
    
    # First test B2 connectivity
    print("\n🔗 Testing B2 connectivity...")
    try:
        result = subprocess.run([
            "python", "test_b2_connection.py"
        ], 
        cwd="/app",
        capture_output=True,
        text=True
        )
        
        if result.returncode == 0:
            print("✅ B2 connectivity test passed!")
        else:
            print(f"❌ B2 connectivity test failed: {result.stderr}")
            return False
            
    except Exception as e:
        print(f"❌ Error testing B2 connectivity: {e}")
        return False
    
    # Run the restore tests
    print("\n📋 Running restore system tests...")
    try:
        result = subprocess.run([
            "python", "-m", "pytest", 
            "tests/test_restore_real_b2.py",
            "-v",
            "--tb=short",
            "--maxfail=5",
            "--disable-warnings",
            "-s"
        ], 
        cwd="/app",
        env=os.environ.copy()  # Pass the environment variables
        )
        
        if result.returncode == 0:
            print("✅ All restore tests passed!")
            return True
        else:
            print("❌ Some restore tests failed!")
            return False
            
    except Exception as e:
        print(f"❌ Error running restore tests: {e}")
        return False

if __name__ == "__main__":
    success = run_restore_tests()
    sys.exit(0 if success else 1)