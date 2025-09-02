#!/usr/bin/env python3
"""
Simple test script to verify B2 connection and upload functionality
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

def test_b2_connection():
    """Test B2 connection and basic operations"""
    print("Testing B2 Connection...")
    print(f"B2 Access Key: {settings.backblaze_b2_access_key}")
    print(f"B2 Bucket: {settings.backblaze_b2_bucket}")
    
    # Initialize cloud storage service
    cloud_storage = CloudStorageService()
    
    # Test connectivity
    print("\n1. Testing connectivity...")
    connectivity = cloud_storage.test_connectivity()
    print(f"B2 Available: {connectivity['backblaze_b2']['available']}")
    if connectivity['backblaze_b2']['error']:
        print(f"B2 Error: {connectivity['backblaze_b2']['error']}")
        return False
    
    # Test upload
    print("\n2. Testing upload...")
    try:
        # Create a test file
        with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as temp_file:
            temp_file.write("This is a test backup file for B2 upload verification")
            temp_file_path = Path(temp_file.name)
        
        # Upload to B2
        object_key = f"test_uploads/test_backup_{os.getpid()}.txt"
        location = cloud_storage.upload_to_b2(temp_file_path, object_key)
        print(f"Upload successful: {location}")
        
        # Test download
        print("\n3. Testing download...")
        with tempfile.NamedTemporaryFile(suffix='.txt', delete=False) as download_file:
            download_path = Path(download_file.name)
        
        downloaded_path = cloud_storage.download_from_b2(object_key, download_path)
        
        # Verify content
        with open(downloaded_path, 'r') as f:
            downloaded_content = f.read()
        
        with open(temp_file_path, 'r') as f:
            original_content = f.read()
        
        if downloaded_content == original_content:
            print("Download successful - content matches!")
        else:
            print("Download failed - content mismatch!")
            return False
        
        # Test listing
        print("\n4. Testing object listing...")
        objects = cloud_storage.list_b2_objects("test_uploads/")
        print(f"Found {len(objects)} objects in test_uploads/ prefix")
        
        # Clean up test file
        print("\n5. Cleaning up...")
        if cloud_storage.delete_from_b2(object_key):
            print("Test file deleted successfully")
        
        # Clean up local files
        temp_file_path.unlink()
        download_path.unlink()
        
        print("\n✅ All B2 tests passed!")
        return True
        
    except Exception as e:
        print(f"\n❌ B2 test failed: {e}")
        return False

if __name__ == "__main__":
    success = test_b2_connection()
    sys.exit(0 if success else 1)