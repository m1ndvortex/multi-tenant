#!/usr/bin/env python3
"""
Test script for Cloudflare R2 connectivity and basic operations
"""

import os
import sys
import tempfile
from pathlib import Path
from datetime import datetime

# Add the backend directory to Python path
sys.path.insert(0, '/app')

from app.services.cloud_storage_service import CloudStorageService
from app.core.config import settings

def test_r2_operations():
    """Test R2 upload, download, list, and delete operations"""
    print("🔧 Testing Cloudflare R2 Operations")
    print("=" * 50)
    
    # Initialize storage service
    storage_service = CloudStorageService()
    
    # Check R2 configuration
    print(f"R2 Access Key: {settings.cloudflare_r2_access_key[:10]}..." if settings.cloudflare_r2_access_key else "Not configured")
    print(f"R2 Secret Key: {'*' * 20}" if settings.cloudflare_r2_secret_key else "Not configured")
    print(f"R2 Bucket: {settings.cloudflare_r2_bucket}")
    print(f"R2 Endpoint: {settings.cloudflare_r2_endpoint}")
    print()
    
    # Test connectivity
    print("🔍 Testing R2 Connectivity...")
    connectivity = storage_service.test_connectivity()
    r2_status = connectivity.get("cloudflare_r2", {})
    
    if r2_status.get("available"):
        print(f"✅ R2 is available (response time: {r2_status.get('response_time', 0):.3f}s)")
    else:
        print(f"❌ R2 is not available: {r2_status.get('error', 'Unknown error')}")
        return False
    
    print()
    
    # Create a test file
    test_content = f"Test backup file created at {datetime.now()}\nThis is a test for R2 storage operations."
    test_filename = f"test_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
    
    with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as temp_file:
        temp_file.write(test_content)
        temp_file_path = Path(temp_file.name)
    
    download_path = None
    try:
        # Test upload
        print("📤 Testing R2 Upload...")
        upload_result = storage_service.upload_to_r2(
            file_path=temp_file_path,
            object_key=test_filename,
            metadata={"test": "true", "created_by": "test_script"},
            backup_type="emergency",
            tenant_id="test_tenant"
        )
        print(f"✅ Upload successful: {upload_result}")
        print()
        
        # Test list objects
        print("📋 Testing R2 List Objects...")
        objects = storage_service.list_r2_objects(prefix="emergency-backups/")
        print(f"✅ Found {len(objects)} objects in emergency-backups/")
        for obj in objects[:5]:  # Show first 5 objects
            print(f"   - {obj['key']} ({obj['size']} bytes, {obj['last_modified']})")
        print()
        
        # Test download
        print("📥 Testing R2 Download...")
        download_path = temp_file_path.parent / f"downloaded_{test_filename}"
        # Use the full object key inside the bucket
        # upload_result is like: s3://<bucket>/<folder-path>/<filename>
        # We need everything after the bucket name (i.e., the key) for downloads
        if upload_result.startswith("s3://"):
            # Split into ['s3:', '', '<bucket>', '<key...>'] and rejoin from index 3
            object_key_full = "/".join(upload_result.split("/", 3)[3:])
        else:
            object_key_full = upload_result

        downloaded_file = storage_service.download_from_r2(
            object_key=object_key_full,
            local_path=download_path
        )
        
        # Verify downloaded content
        with open(downloaded_file, 'r') as f:
            downloaded_content = f.read()
        
        if downloaded_content == test_content:
            print("✅ Download successful and content matches")
        else:
            print("❌ Download successful but content doesn't match")
        print()
        
        # Test delete
        print("🗑️ Testing R2 Delete...")
        delete_success = storage_service.delete_from_r2(upload_result)
        if delete_success:
            print("✅ Delete successful")
        else:
            print("❌ Delete failed")
        print()
        
        # Test storage usage
        print("📊 Testing Storage Usage...")
        usage = storage_service.get_storage_usage()
        r2_usage = usage.get("cloudflare_r2", {})
        if r2_usage.get("available"):
            print(f"✅ R2 Usage: {r2_usage['object_count']} objects, {r2_usage['total_size']} bytes")
        else:
            print("❌ Could not get R2 usage statistics")
        print()
        
        # Test health status
        print("🏥 Testing Health Status...")
        health = storage_service.get_health_status()
        r2_health = health["providers"]["cloudflare_r2"]
        print(f"✅ R2 Health Status: {r2_health['status']}")
        print(f"   Available: {r2_health['available']}")
        print(f"   Response Time: {r2_health['response_time']:.3f}s" if r2_health['response_time'] else "N/A")
        print()
        
        print("🎉 All R2 tests completed successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
        return False
        
    finally:
        # Clean up temporary files
        if temp_file_path.exists():
            temp_file_path.unlink()
        if download_path and download_path.exists():
            download_path.unlink()

def test_failover_operations():
    """Test failover upload functionality"""
    print("\n🔄 Testing Failover Operations")
    print("=" * 50)
    
    storage_service = CloudStorageService()
    
    # Create a test file
    test_content = f"Failover test file created at {datetime.now()}"
    test_filename = f"failover_test_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
    
    with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as temp_file:
        temp_file.write(test_content)
        temp_file_path = Path(temp_file.name)
    
    try:
        # Test dual upload
        print("📤 Testing Dual Upload (both B2 and R2)...")
        upload_result = storage_service.upload_with_failover(
            file_path=temp_file_path,
            object_key=test_filename,
            metadata={"test": "failover", "strategy": "dual_upload"}
        )
        
        print(f"Upload Success: {upload_result['success']}")
        print(f"Strategy Used: {upload_result['strategy_used']}")
        print(f"Primary Upload (B2): {upload_result['primary_upload']}")
        print(f"Secondary Upload (R2): {upload_result['secondary_upload']}")
        if upload_result['errors']:
            print(f"Errors: {upload_result['errors']}")
        
        # Clean up uploaded files
        if upload_result['primary_upload']:
            storage_service.delete_from_b2(upload_result['primary_upload'])
        if upload_result['secondary_upload']:
            storage_service.delete_from_r2(upload_result['secondary_upload'])
        
        print("✅ Failover test completed")
        
    except Exception as e:
        print(f"❌ Failover test failed: {e}")
        import traceback
        traceback.print_exc()
        
    finally:
        if temp_file_path.exists():
            temp_file_path.unlink()

if __name__ == "__main__":
    print("🚀 Starting R2 Connectivity Tests")
    print("=" * 50)
    
    # Test basic R2 operations
    r2_success = test_r2_operations()
    
    if r2_success:
        # Test failover operations
        test_failover_operations()
    
    print("\n" + "=" * 50)
    print("🏁 Test completed!")