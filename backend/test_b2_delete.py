#!/usr/bin/env python3
"""
Test script to verify B2 file deletion functionality
"""

import os
import sys
import tempfile
from pathlib import Path

# Set B2 environment variables directly
os.environ['BACKBLAZE_B2_ACCESS_KEY'] = '005acba9882c2b80000000001'
os.environ['BACKBLAZE_B2_SECRET_KEY'] = 'K005LzPhrovqG5Eq37oYWxIQiIKIHh8'
os.environ['BACKBLAZE_B2_BUCKET'] = 'securesyntax'

# Add the app directory to Python path
sys.path.insert(0, '/app')

from app.services.cloud_storage_service import CloudStorageService
from app.core.config import settings

def test_b2_delete_functionality():
    """Test B2 file upload and deletion"""
    print("Testing B2 Delete Functionality...")
    
    # Initialize cloud storage service
    cloud_storage = CloudStorageService()
    
    # Test connectivity first
    print("\n1. Testing connectivity...")
    connectivity = cloud_storage.test_connectivity()
    if not connectivity['backblaze_b2']['available']:
        print(f"❌ B2 not available: {connectivity['backblaze_b2']['error']}")
        return False
    
    print("✅ B2 connection successful")
    
    # Create test files for upload and deletion
    test_files = []
    object_keys = []
    
    try:
        # Create multiple test files
        for i in range(3):
            with tempfile.NamedTemporaryFile(mode='w', suffix=f'_test_{i}.txt', delete=False) as temp_file:
                temp_file.write(f"Test backup file {i} for deletion testing")
                temp_file_path = Path(temp_file.name)
                test_files.append(temp_file_path)
                
                # Upload to B2
                object_key = f"test_delete/backup_test_{i}_{os.getpid()}.txt"
                object_keys.append(object_key)
                
                print(f"\n2.{i+1}. Uploading test file {i+1}...")
                location = cloud_storage.upload_to_b2(temp_file_path, object_key)
                print(f"✅ Upload successful: {location}")
        
        # List files to verify they exist
        print(f"\n3. Listing files in test_delete/ prefix...")
        objects = cloud_storage.list_b2_objects("test_delete/")
        uploaded_objects = [obj for obj in objects if any(key in obj['key'] for key in object_keys)]
        print(f"Found {len(uploaded_objects)} test objects")
        
        for obj in uploaded_objects:
            print(f"  - {obj['key']} ({obj['size']} bytes)")
        
        # Test deletion of each file
        print(f"\n4. Testing file deletion...")
        deletion_results = []
        
        for i, object_key in enumerate(object_keys):
            print(f"\n4.{i+1}. Deleting {object_key}...")
            success = cloud_storage.delete_from_b2(object_key)
            deletion_results.append(success)
            
            if success:
                print(f"✅ Successfully deleted {object_key}")
            else:
                print(f"❌ Failed to delete {object_key}")
        
        # Verify files are deleted by listing again
        print(f"\n5. Verifying deletion...")
        objects_after = cloud_storage.list_b2_objects("test_delete/")
        remaining_objects = [obj for obj in objects_after if any(key in obj['key'] for key in object_keys)]
        
        if len(remaining_objects) == 0:
            print("✅ All test files successfully deleted")
        else:
            print(f"❌ {len(remaining_objects)} files still exist after deletion:")
            for obj in remaining_objects:
                print(f"  - {obj['key']}")
        
        # Test deletion of non-existent file
        print(f"\n6. Testing deletion of non-existent file...")
        fake_key = f"test_delete/non_existent_file_{os.getpid()}.txt"
        success = cloud_storage.delete_from_b2(fake_key)
        
        if not success:
            print("✅ Correctly handled deletion of non-existent file")
        else:
            print("⚠️  Deletion of non-existent file returned success (unexpected)")
        
        # Summary
        successful_deletions = sum(deletion_results)
        total_files = len(object_keys)
        
        print(f"\n📊 Summary:")
        print(f"  - Files uploaded: {total_files}")
        print(f"  - Files deleted successfully: {successful_deletions}")
        print(f"  - Files remaining: {len(remaining_objects)}")
        
        if successful_deletions == total_files and len(remaining_objects) == 0:
            print("\n✅ All B2 deletion tests passed!")
            return True
        else:
            print("\n❌ Some deletion tests failed!")
            return False
            
    except Exception as e:
        print(f"\n❌ B2 deletion test failed: {e}")
        return False
        
    finally:
        # Clean up local files
        for temp_file_path in test_files:
            if temp_file_path.exists():
                temp_file_path.unlink()

if __name__ == "__main__":
    success = test_b2_delete_functionality()
    sys.exit(0 if success else 1)