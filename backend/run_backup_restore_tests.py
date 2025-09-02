#!/usr/bin/env python3
"""
Run backup and restore tests with real B2 integration
"""

import os
import sys
import subprocess
import tempfile
from pathlib import Path

# Set B2 environment variables
os.environ['BACKBLAZE_B2_ACCESS_KEY'] = '005acba9882c2b80000000001'
os.environ['BACKBLAZE_B2_SECRET_KEY'] = 'K005LzPhrovqG5Eq37oYWxIQiIKIHh8'
os.environ['BACKBLAZE_B2_BUCKET'] = 'securesyntax'
os.environ['DATABASE_URL'] = 'postgresql://hesaab:secure_password_2024@postgres:5432/hesaabplus'
os.environ['REDIS_URL'] = 'redis://redis:6379/0'
os.environ['JWT_SECRET_KEY'] = 'your_jwt_secret_key_change_in_production'
os.environ['TESTING'] = 'true'
os.environ['PYTHONPATH'] = '/app'

def run_tests():
    """Run backup and restore tests"""
    print("🚀 Running Backup and Restore Tests with Real B2 Integration")
    print("=" * 60)
    
    # Test files to run
    test_files = [
        "tests/test_backup_system.py",
        "tests/test_restore_system.py"
    ]
    
    for test_file in test_files:
        print(f"\n📋 Running {test_file}...")
        print("-" * 40)
        
        try:
            # Run pytest with verbose output
            result = subprocess.run([
                "python", "-m", "pytest", 
                test_file,
                "-v",
                "--tb=short",
                "--maxfail=5",
                "--disable-warnings",
                "-s"  # Don't capture output so we can see real-time results
            ], 
            cwd="/app",
            capture_output=False,
            text=True
            )
            
            if result.returncode == 0:
                print(f"✅ {test_file} - All tests passed!")
            else:
                print(f"❌ {test_file} - Some tests failed!")
                return False
                
        except Exception as e:
            print(f"❌ Error running {test_file}: {e}")
            return False
    
    print("\n🎉 All backup and restore tests completed successfully!")
    return True

if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)