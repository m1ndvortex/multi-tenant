#!/usr/bin/env python3
"""
Comprehensive test script to verify B2 upload, download, and delete operations
"""

import os
import sys
import tempfile
import hashlib
from pathlib import Path

# Set B2 environment variables directly
os.environ['BACKBLAZE_B2_ACCESS_KEY'] = '005acba9882c2b80000000001'
os.environ['BACKBLAZE_B2_SECRET_KEY'] = 'K005LzPhrovqG5Eq37oYWxIQiIKIHh8'
os.environ['BACKBLAZE_B2_BUCKET'] = 'securesyntax'

# Add the app directory to Python path
sys.path.insert(0, '/app')

from app.services.cloud_storage_service import CloudStorageService
from app.core.config import settings

def calculate_file_hash(file_path):
    """Calculate SHA256 hash of a file"""
    sha256_hash = hashlib.sha256()
    with open(file_path, "rb") as f:
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)
    return sha256_hash.hexdigest()

def test_b2_comprehensive():
    """Comprehensive test of B2 operations"""
    print("🚀 Comprehensive B2 Operations Test")
    print("=" * 50)
    
    # Initialize cloud storage service
    cloud_storage = CloudStorageService()
    
    # Test connectivity
    print("\n1️⃣ Testing B2 Connectivity...")
    connectivity = cloud_storage.test_connectivity()
    if not connectivity['backblaze_b2']['available']:
        print(f"❌ B2 not available: {connectivity['backblaze_b2']['error']}")
        return False
    
    print("✅ B2 connection successful")
    
    # Test data with different sizes
    test_cases = [
        ("small", "This is a small test file for B2 testing."),
        ("medium", "This is a medium test file. " * 100),  # ~3KB
        ("large", "This is a large test file content. " * 1000),  # ~30KB
    ]
    
    uploaded_files = []
    
    try:
        for test_name, content in test_cases:
            print(f"\n2️⃣ Testing {test_name} file ({len(content)} bytes)...")
            
            # Create test file
            with tempfile.NamedTemporaryFile(mode='w', suffix=f'_{test_name}.txt', delete=False) as temp_file:
                temp_file.write(content)
                temp_file_path = Path(temp_file.name)
            
            # Calculate original hash
            original_hash = calculate_file_hash(temp_file_path)
            original_size = temp_file_path.stat().st_size
            
            print(f"  📄 Created {test_name} file: {original_size} bytes, hash: {original_hash[:16]}...")
            
            # Upload to B2
            object_key = f"test_comprehensive/{test_name}_file_{os.getpid()}.txt"
            
            print(f"  ⬆️  Uploading to B2...")
            try:
                location = cloud_storage.upload_to_b2(temp_file_path, object_key)
                print(f"  ✅ Upload successful: {location}")
                uploaded_files.append((object_key, temp_file_path, original_hash, original_size))
            except Exception as e:
                print(f"  ❌ Upload failed: {e}")
                temp_file_path.unlink()
                return False
        
        # Verify uploads by listing
        print(f"\n3️⃣ Verifying uploads...")
        objects = cloud_storage.list_b2_objects("test_comprehensive/")
        uploaded_objects = [obj for obj in objects if any(key in obj['key'] for key, _, _, _ in uploaded_files)]
        
        print(f"  📋 Found {len(uploaded_objects)} objects in B2:")
        for obj in uploaded_objects:
            print(f"    - {obj['key']}: {obj['size']} bytes")
        
        # Test downloads and verify integrity
        print(f"\n4️⃣ Testing downloads and integrity...")
        download_results = []
        
        for object_key, original_file, original_hash, original_size in uploaded_files:
            print(f"\n  📥 Downloading {object_key}...")
            
            # Create download path
            with tempfile.NamedTemporaryFile(suffix='_download.txt', delete=False) as download_file:
                download_path = Path(download_file.name)
            
            try:
                # Download from B2
                cloud_storage.download_from_b2(object_key, download_path)
                
                # Verify file exists and has content
                if not download_path.exists():
                    print(f"    ❌ Downloaded file doesn't exist")
                    download_results.append(False)
                    continue
                
                # Check size
                downloaded_size = download_path.stat().st_size
                if downloaded_size != original_size:
                    print(f"    ❌ Size mismatch: expected {original_size}, got {downloaded_size}")
                    download_results.append(False)
                    continue
                
                # Check hash
                downloaded_hash = calculate_file_hash(download_path)
                if downloaded_hash != original_hash:
                    print(f"    ❌ Hash mismatch: expected {original_hash[:16]}..., got {downloaded_hash[:16]}...")
                    download_results.append(False)
                    continue
                
                print(f"    ✅ Download successful: {downloaded_size} bytes, hash matches")
                download_results.append(True)
                
            except Exception as e:
                print(f"    ❌ Download failed: {e}")
                download_results.append(False)
            finally:
                # Clean up download file
                if download_path.exists():
                    download_path.unlink()
        
        # Test deletion
        print(f"\n5️⃣ Testing file deletion...")
        deletion_results = []
        
        for object_key, original_file, _, _ in uploaded_files:
            print(f"\n  🗑️  Deleting {object_key}...")
            
            try:
                # Check if file exists before deletion
                objects_before = cloud_storage.list_b2_objects("test_comprehensive/")
                exists_before = any(obj['key'] == object_key for obj in objects_before)
                
                if not exists_before:
                    print(f"    ⚠️  File doesn't exist before deletion")
                
                # Delete file
                success = cloud_storage.delete_from_b2(object_key)
                
                # Check if file exists after deletion
                objects_after = cloud_storage.list_b2_objects("test_comprehensive/")
                exists_after = any(obj['key'] == object_key for obj in objects_after)
                
                if success and exists_before and not exists_after:
                    print(f"    ✅ Successfully deleted {object_key}")
                    deletion_results.append(True)
                elif success and not exists_before:
                    print(f"    ⚠️  Delete returned success but file didn't exist")
                    deletion_results.append(True)  # This is actually OK for S3
                elif not success:
                    print(f"    ❌ Delete operation returned failure")
                    deletion_results.append(False)
                elif exists_after:
                    print(f"    ❌ File still exists after deletion")
                    deletion_results.append(False)
                else:
                    print(f"    ✅ Delete operation completed")
                    deletion_results.append(True)
                
            except Exception as e:
                print(f"    ❌ Delete failed with exception: {e}")
                deletion_results.append(False)
        
        # Test deletion of non-existent file (this should not fail)
        print(f"\n6️⃣ Testing deletion of non-existent file...")
        fake_key = f"test_comprehensive/non_existent_file_{os.getpid()}.txt"
        
        try:
            success = cloud_storage.delete_from_b2(fake_key)
            if success:
                print(f"    ✅ Correctly handled deletion of non-existent file (idempotent)")
            else:
                print(f"    ⚠️  Delete of non-existent file returned failure (unexpected but not critical)")
        except Exception as e:
            print(f"    ❌ Delete of non-existent file threw exception: {e}")
        
        # Final verification - ensure all test files are cleaned up
        print(f"\n7️⃣ Final cleanup verification...")
        final_objects = cloud_storage.list_b2_objects("test_comprehensive/")
        remaining_test_files = [obj for obj in final_objects if any(key in obj['key'] for key, _, _, _ in uploaded_files)]
        
        if len(remaining_test_files) == 0:
            print(f"    ✅ All test files cleaned up successfully")
        else:
            print(f"    ⚠️  {len(remaining_test_files)} test files still remain:")
            for obj in remaining_test_files:
                print(f"      - {obj['key']}")
        
        # Summary
        print(f"\n📊 Test Summary:")
        print(f"  - Files uploaded: {len(uploaded_files)}")
        print(f"  - Successful uploads: {len(uploaded_files)}")
        print(f"  - Successful downloads: {sum(download_results)}")
        print(f"  - Successful deletions: {sum(deletion_results)}")
        print(f"  - Files remaining: {len(remaining_test_files)}")
        
        # Determine overall success
        all_uploads_ok = len(uploaded_files) == len(test_cases)
        all_downloads_ok = all(download_results)
        all_deletions_ok = all(deletion_results)
        no_files_remaining = len(remaining_test_files) == 0
        
        if all_uploads_ok and all_downloads_ok and all_deletions_ok and no_files_remaining:
            print(f"\n🎉 All B2 operations working perfectly!")
            return True
        else:
            print(f"\n❌ Some B2 operations failed:")
            if not all_uploads_ok:
                print(f"  - Upload issues detected")
            if not all_downloads_ok:
                print(f"  - Download issues detected")
            if not all_deletions_ok:
                print(f"  - Deletion issues detected")
            if not no_files_remaining:
                print(f"  - Cleanup issues detected")
            return False
            
    except Exception as e:
        print(f"\n💥 Test failed with exception: {e}")
        return False
        
    finally:
        # Clean up local files
        for object_key, original_file, _, _ in uploaded_files:
            if original_file.exists():
                original_file.unlink()

if __name__ == "__main__":
    success = test_b2_comprehensive()
    sys.exit(0 if success else 1)