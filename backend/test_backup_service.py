#!/usr/bin/env python3
"""
Comprehensive test script for backup service functionality
Tests backup creation, restore, and deletion on both B2 and R2 storage
"""

import os
import sys
import asyncio
import logging
from pathlib import Path
from datetime import datetime, timezone
import tempfile
import uuid
from typing import Dict

# Add the backend directory to Python path
sys.path.insert(0, str(Path(__file__).parent))

from app.core.database import SessionLocal, engine
from app.services.backup_service import BackupService
from app.services.cloud_storage_service import CloudStorageService
from app.models.tenant import Tenant, TenantStatus
from app.models.backup import BackupLog, BackupType, BackupStatus
from app.core.config import settings

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class BackupServiceTester:
    """Comprehensive tester for backup service functionality"""
    
    def __init__(self):
        self.db = SessionLocal()
        self.backup_service = BackupService(self.db)
        self.cloud_storage = CloudStorageService()
        self.test_tenant_id = None
        self.test_backup_ids = []
        
    def __enter__(self):
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.cleanup()
        self.db.close()
    
    def cleanup(self):
        """Clean up test data"""
        try:
            # Delete test backups
            for backup_id in self.test_backup_ids:
                try:
                    self.backup_service.delete_backup(backup_id, delete_from_storage=True)
                    logger.info(f"Cleaned up test backup: {backup_id}")
                except Exception as e:
                    logger.warning(f"Failed to clean up backup {backup_id}: {e}")
            
            # Delete test tenant
            if self.test_tenant_id:
                try:
                    tenant = self.db.query(Tenant).filter(Tenant.id == self.test_tenant_id).first()
                    if tenant:
                        self.db.delete(tenant)
                        self.db.commit()
                        logger.info(f"Cleaned up test tenant: {self.test_tenant_id}")
                except Exception as e:
                    logger.warning(f"Failed to clean up tenant {self.test_tenant_id}: {e}")
                    
        except Exception as e:
            logger.error(f"Cleanup failed: {e}")
    
    def create_test_tenant(self) -> str:
        """Create a test tenant for backup testing"""
        try:
            tenant_id = str(uuid.uuid4())
            tenant = Tenant(
                id=tenant_id,
                name=f"Test Tenant {tenant_id[:8]}",
                domain=f"test-{tenant_id[:8]}.example.com",
                email=f"test-{tenant_id[:8]}@example.com",
                status=TenantStatus.ACTIVE,
                is_active=True,
                created_at=datetime.now(timezone.utc)
            )
            
            self.db.add(tenant)
            self.db.commit()
            
            self.test_tenant_id = tenant_id
            logger.info(f"Created test tenant: {tenant_id}")
            return tenant_id
            
        except Exception as e:
            logger.error(f"Failed to create test tenant: {e}")
            raise
    
    def test_cloud_storage_connectivity(self) -> Dict:
        """Test connectivity to both cloud storage providers"""
        logger.info("Testing cloud storage connectivity...")
        
        try:
            connectivity = self.cloud_storage.test_connectivity()
            
            logger.info("Cloud Storage Connectivity Results:")
            for provider, result in connectivity.items():
                status = "✓ CONNECTED" if result["available"] else "✗ FAILED"
                response_time = f" ({result['response_time']:.3f}s)" if result["response_time"] else ""
                error = f" - {result['error']}" if result["error"] else ""
                logger.info(f"  {provider}: {status}{response_time}{error}")
            
            return connectivity
            
        except Exception as e:
            logger.error(f"Connectivity test failed: {e}")
            raise
    
    def test_backup_creation(self, tenant_id: str) -> str:
        """Test backup creation for a tenant"""
        logger.info(f"Testing backup creation for tenant: {tenant_id}")
        
        try:
            # Create backup
            result = self.backup_service.backup_tenant(tenant_id)
            backup_id = result["backup_id"]
            self.test_backup_ids.append(backup_id)
            
            logger.info(f"✓ Backup created successfully:")
            logger.info(f"  Backup ID: {backup_id}")
            logger.info(f"  File Size: {result['file_size']} bytes")
            logger.info(f"  Compressed Size: {result['compressed_size']} bytes")
            logger.info(f"  Duration: {result['duration_seconds']} seconds")
            logger.info(f"  Storage Locations: {len(result['storage_locations'])}")
            
            for location in result['storage_locations']:
                logger.info(f"    - {location['provider']}: {location['location']}")
            
            return backup_id
            
        except Exception as e:
            logger.error(f"✗ Backup creation failed: {e}")
            raise
    
    def test_backup_verification(self, backup_id: str) -> bool:
        """Test backup integrity verification"""
        logger.info(f"Testing backup verification for: {backup_id}")
        
        try:
            # Test verification on both providers
            providers = ["backblaze_b2", "cloudflare_r2"]
            verification_results = {}
            
            for provider in providers:
                try:
                    is_valid = self.backup_service.verify_backup_integrity(backup_id, provider)
                    verification_results[provider] = is_valid
                    status = "✓ VALID" if is_valid else "✗ INVALID"
                    logger.info(f"  {provider}: {status}")
                except Exception as e:
                    verification_results[provider] = False
                    logger.warning(f"  {provider}: ✗ VERIFICATION FAILED - {e}")
            
            # Return True if at least one provider verification succeeded
            overall_success = any(verification_results.values())
            logger.info(f"Overall verification: {'✓ PASSED' if overall_success else '✗ FAILED'}")
            
            return overall_success
            
        except Exception as e:
            logger.error(f"✗ Backup verification failed: {e}")
            raise
    
    def test_backup_restore(self, backup_id: str, target_tenant_id: str = None) -> bool:
        """Test backup restore functionality"""
        logger.info(f"Testing backup restore for: {backup_id}")
        
        try:
            # Test restore from both providers
            providers = ["backblaze_b2", "cloudflare_r2"]
            restore_results = {}
            
            for provider in providers:
                try:
                    result = self.backup_service.restore_tenant_backup(
                        backup_id, 
                        target_tenant_id, 
                        provider
                    )
                    restore_results[provider] = True
                    logger.info(f"  {provider}: ✓ RESTORE SUCCESS")
                    logger.info(f"    Restored Size: {result['file_size']} bytes")
                    logger.info(f"    Target Tenant: {result['target_tenant_id']}")
                    break  # Only test one successful restore to avoid conflicts
                    
                except Exception as e:
                    restore_results[provider] = False
                    logger.warning(f"  {provider}: ✗ RESTORE FAILED - {e}")
            
            # Return True if at least one provider restore succeeded
            overall_success = any(restore_results.values())
            logger.info(f"Overall restore: {'✓ PASSED' if overall_success else '✗ FAILED'}")
            
            return overall_success
            
        except Exception as e:
            logger.error(f"✗ Backup restore failed: {e}")
            raise
    
    def test_backup_deletion(self, backup_id: str) -> bool:
        """Test backup deletion from storage and database"""
        logger.info(f"Testing backup deletion for: {backup_id}")
        
        try:
            result = self.backup_service.delete_backup(backup_id, delete_from_storage=True)
            
            logger.info(f"✓ Backup deleted successfully:")
            logger.info(f"  Backup Name: {result['backup_info']['backup_name']}")
            logger.info(f"  Deleted from Storage: {result['deleted_from_storage']}")
            
            if result['storage_errors']:
                logger.warning(f"  Storage Errors: {result['storage_errors']}")
            
            # Remove from test cleanup list since it's already deleted
            if backup_id in self.test_backup_ids:
                self.test_backup_ids.remove(backup_id)
            
            return True
            
        except Exception as e:
            logger.error(f"✗ Backup deletion failed: {e}")
            raise
    
    def test_folder_structure(self) -> bool:
        """Test that backups are organized in proper folder structure"""
        logger.info("Testing backup folder structure...")
        
        try:
            # List objects in both storage providers to verify folder structure
            providers_tested = []
            
            # Test B2 folder structure
            if self.cloud_storage.b2_client:
                try:
                    b2_objects = self.cloud_storage.list_b2_objects()
                    logger.info(f"B2 Objects found: {len(b2_objects)}")
                    
                    for obj in b2_objects[:5]:  # Show first 5 objects
                        key = obj['key']
                        logger.info(f"  B2: {key}")
                        
                        # Verify folder structure (should be like: tenant-backups/2024/01/15/tenant_xxx/filename)
                        if key.startswith(('tenant-backups/', 'emergency-backups/', 'disaster-recovery/')):
                            parts = key.split('/')
                            if len(parts) >= 4:  # backup-type/year/month/day/...
                                logger.info(f"    ✓ Proper folder structure: {'/'.join(parts[:4])}")
                            else:
                                logger.warning(f"    ✗ Invalid folder structure: {key}")
                    
                    providers_tested.append("B2")
                    
                except Exception as e:
                    logger.warning(f"Failed to test B2 folder structure: {e}")
            
            # Test R2 folder structure
            if self.cloud_storage.r2_client:
                try:
                    r2_objects = self.cloud_storage.list_r2_objects()
                    logger.info(f"R2 Objects found: {len(r2_objects)}")
                    
                    for obj in r2_objects[:5]:  # Show first 5 objects
                        key = obj['key']
                        logger.info(f"  R2: {key}")
                        
                        # Verify folder structure
                        if key.startswith(('tenant-backups/', 'emergency-backups/', 'disaster-recovery/')):
                            parts = key.split('/')
                            if len(parts) >= 4:
                                logger.info(f"    ✓ Proper folder structure: {'/'.join(parts[:4])}")
                            else:
                                logger.warning(f"    ✗ Invalid folder structure: {key}")
                    
                    providers_tested.append("R2")
                    
                except Exception as e:
                    logger.warning(f"Failed to test R2 folder structure: {e}")
            
            success = len(providers_tested) > 0
            logger.info(f"Folder structure test: {'✓ PASSED' if success else '✗ FAILED'}")
            logger.info(f"Providers tested: {', '.join(providers_tested)}")
            
            return success
            
        except Exception as e:
            logger.error(f"✗ Folder structure test failed: {e}")
            raise
    
    def run_comprehensive_test(self) -> Dict:
        """Run comprehensive backup service test suite"""
        logger.info("=" * 60)
        logger.info("STARTING COMPREHENSIVE BACKUP SERVICE TEST")
        logger.info("=" * 60)
        
        test_results = {
            "connectivity": False,
            "tenant_creation": False,
            "backup_creation": False,
            "backup_verification": False,
            "backup_restore": False,
            "backup_deletion": False,
            "folder_structure": False,
            "overall_success": False
        }
        
        try:
            # Test 1: Cloud Storage Connectivity
            logger.info("\n1. Testing Cloud Storage Connectivity")
            logger.info("-" * 40)
            connectivity = self.test_cloud_storage_connectivity()
            test_results["connectivity"] = any(result["available"] for result in connectivity.values())
            
            if not test_results["connectivity"]:
                logger.error("✗ No cloud storage providers available. Aborting tests.")
                return test_results
            
            # Test 2: Create Test Tenant
            logger.info("\n2. Creating Test Tenant")
            logger.info("-" * 40)
            tenant_id = self.create_test_tenant()
            test_results["tenant_creation"] = True
            
            # Test 3: Backup Creation
            logger.info("\n3. Testing Backup Creation")
            logger.info("-" * 40)
            backup_id = self.test_backup_creation(tenant_id)
            test_results["backup_creation"] = True
            
            # Test 4: Backup Verification
            logger.info("\n4. Testing Backup Verification")
            logger.info("-" * 40)
            test_results["backup_verification"] = self.test_backup_verification(backup_id)
            
            # Test 5: Backup Restore
            logger.info("\n5. Testing Backup Restore")
            logger.info("-" * 40)
            test_results["backup_restore"] = self.test_backup_restore(backup_id, tenant_id)
            
            # Test 6: Folder Structure
            logger.info("\n6. Testing Folder Structure")
            logger.info("-" * 40)
            test_results["folder_structure"] = self.test_folder_structure()
            
            # Test 7: Backup Deletion
            logger.info("\n7. Testing Backup Deletion")
            logger.info("-" * 40)
            test_results["backup_deletion"] = self.test_backup_deletion(backup_id)
            
            # Calculate overall success
            critical_tests = ["connectivity", "backup_creation", "backup_verification"]
            test_results["overall_success"] = all(test_results[test] for test in critical_tests)
            
        except Exception as e:
            logger.error(f"Test suite failed with error: {e}")
            test_results["error"] = str(e)
        
        # Print final results
        logger.info("\n" + "=" * 60)
        logger.info("TEST RESULTS SUMMARY")
        logger.info("=" * 60)
        
        for test_name, result in test_results.items():
            if test_name == "overall_success":
                continue
            status = "✓ PASS" if result else "✗ FAIL"
            logger.info(f"{test_name.replace('_', ' ').title():<25}: {status}")
        
        logger.info("-" * 60)
        overall_status = "✓ SUCCESS" if test_results["overall_success"] else "✗ FAILED"
        logger.info(f"{'OVERALL RESULT':<25}: {overall_status}")
        logger.info("=" * 60)
        
        return test_results


def main():
    """Main test execution function"""
    try:
        with BackupServiceTester() as tester:
            results = tester.run_comprehensive_test()
            
            # Exit with appropriate code
            exit_code = 0 if results["overall_success"] else 1
            sys.exit(exit_code)
            
    except Exception as e:
        logger.error(f"Test execution failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()