"""
REAL Restore System Tests with B2 Integration
NO MOCKS - Only real database and B2 operations
"""

import os
import pytest
import tempfile
import hashlib
from pathlib import Path
from datetime import datetime, timezone
from uuid import uuid4

# Set B2 environment variables for testing
os.environ['BACKBLAZE_B2_ACCESS_KEY'] = '005acba9882c2b80000000001'
os.environ['BACKBLAZE_B2_SECRET_KEY'] = 'K005LzPhrovqG5Eq37oYWxIQiIKIHh8'
os.environ['BACKBLAZE_B2_BUCKET'] = 'securesyntax'

from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.tenant import Tenant, SubscriptionType
from app.models.backup import BackupLog, RestoreLog, BackupType, BackupStatus
from app.services.restore_service import RestoreService
from app.services.backup_service import BackupService
from app.services.cloud_storage_service import CloudStorageService


class TestRealRestoreWithB2:
    """Real restore tests with actual B2 cloud storage"""
    
    @pytest.fixture
    def db_session(self):
        """Create real database session"""
        db = SessionLocal()
        yield db
        db.close()
    
    @pytest.fixture
    def restore_service(self, db_session):
        """Create RestoreService instance"""
        return RestoreService(db_session)
    
    @pytest.fixture
    def backup_service(self, db_session):
        """Create BackupService instance"""
        return BackupService(db_session)
    
    @pytest.fixture
    def cloud_storage(self):
        """Create CloudStorageService instance"""
        return CloudStorageService()
    
    def test_b2_connectivity(self, cloud_storage):
        """Test real B2 connectivity"""
        print("\n🔗 Testing B2 connectivity...")
        
        connectivity = cloud_storage.test_connectivity()
        
        assert connectivity["backblaze_b2"]["available"] is True
        assert connectivity["backblaze_b2"]["error"] is None
        
        print("✅ B2 connectivity test passed!")
    
    def test_real_backup_validation_success(self, restore_service, backup_service, cloud_storage, db_session):
        """Test backup validation with real B2 upload/download"""
        print("\n📋 Testing real backup validation (success case)...")
        
        # Create test tenant
        tenant = Tenant(
            id=uuid4(),
            name="Real Restore Test Tenant",
            email="real-restore@example.com",
            subscription_type=SubscriptionType.PRO,
            is_active=True
        )
        db_session.add(tenant)
        db_session.commit()
        db_session.refresh(tenant)
        
        # Create test backup content
        test_content = b"This is a REAL backup file for restore validation testing with B2"
        test_checksum = hashlib.sha256(test_content).hexdigest()
        
        # Create temporary file
        with tempfile.NamedTemporaryFile(mode='wb', suffix='.enc', delete=False) as temp_file:
            temp_file.write(test_content)
            temp_file_path = Path(temp_file.name)
        
        try:
            # Upload to REAL B2
            object_key = f"test_restore/real_validation_{os.getpid()}_{tenant.id}.enc"
            print(f"📤 Uploading to B2: {object_key}")
            location = cloud_storage.upload_to_b2(temp_file_path, object_key)
            print(f"✅ Upload successful: {location}")
            
            # Create backup log entry in REAL database
            backup = BackupLog(
                id=uuid4(),
                backup_type=BackupType.TENANT_DAILY,
                tenant_id=tenant.id,
                backup_name=f"real_test_{tenant.id}",
                status=BackupStatus.COMPLETED,
                file_size=len(test_content),
                compressed_size=len(test_content),
                checksum=test_checksum,
                storage_locations=[{
                    "provider": "backblaze_b2",
                    "location": location,
                    "uploaded_at": datetime.now(timezone.utc).isoformat()
                }]
            )
            db_session.add(backup)
            db_session.commit()
            db_session.refresh(backup)
            print(f"💾 Backup log created: {backup.id}")
            
            # Test REAL validation
            print("🔍 Validating backup integrity...")
            result = restore_service.validate_backup_integrity(str(backup.id), "backblaze_b2")
            
            # Verify results
            assert result["is_valid"] is True
            assert result["backup_id"] == str(backup.id)
            assert result["storage_provider"] == "backblaze_b2"
            assert result["expected_checksum"] == test_checksum
            assert result["actual_checksum"] == test_checksum
            assert result["file_size"] == len(test_content)
            
            print("✅ Real B2 backup validation SUCCESS test passed!")
            
        finally:
            # Clean up B2
            print("🧹 Cleaning up B2...")
            cloud_storage.delete_from_b2(object_key)
            
            # Clean up local file
            if temp_file_path.exists():
                temp_file_path.unlink()
            
            # Clean up database
            db_session.delete(backup)
            db_session.delete(tenant)
            db_session.commit()
    
    def test_real_backup_validation_failure(self, restore_service, cloud_storage, db_session):
        """Test backup validation failure with real B2 (checksum mismatch)"""
        print("\n❌ Testing real backup validation (failure case)...")
        
        # Create test tenant
        tenant = Tenant(
            id=uuid4(),
            name="Real Restore Fail Tenant",
            email="real-restore-fail@example.com",
            subscription_type=SubscriptionType.PRO,
            is_active=True
        )
        db_session.add(tenant)
        db_session.commit()
        db_session.refresh(tenant)
        
        # Create test backup content
        test_content = b"This is a REAL backup file for restore validation FAILURE testing"
        wrong_checksum = "intentionally_wrong_checksum_for_testing"
        
        # Create temporary file
        with tempfile.NamedTemporaryFile(mode='wb', suffix='.enc', delete=False) as temp_file:
            temp_file.write(test_content)
            temp_file_path = Path(temp_file.name)
        
        try:
            # Upload to REAL B2
            object_key = f"test_restore/real_validation_fail_{os.getpid()}_{tenant.id}.enc"
            print(f"📤 Uploading to B2: {object_key}")
            location = cloud_storage.upload_to_b2(temp_file_path, object_key)
            print(f"✅ Upload successful: {location}")
            
            # Create backup log entry with WRONG checksum
            backup = BackupLog(
                id=uuid4(),
                backup_type=BackupType.TENANT_DAILY,
                tenant_id=tenant.id,
                backup_name=f"real_fail_test_{tenant.id}",
                status=BackupStatus.COMPLETED,
                file_size=len(test_content),
                compressed_size=len(test_content),
                checksum=wrong_checksum,  # Intentionally wrong
                storage_locations=[{
                    "provider": "backblaze_b2",
                    "location": location,
                    "uploaded_at": datetime.now(timezone.utc).isoformat()
                }]
            )
            db_session.add(backup)
            db_session.commit()
            db_session.refresh(backup)
            print(f"💾 Backup log created with wrong checksum: {backup.id}")
            
            # Test REAL validation (should fail)
            print("🔍 Validating backup integrity (expecting failure)...")
            result = restore_service.validate_backup_integrity(str(backup.id), "backblaze_b2")
            
            # Verify results
            assert result["is_valid"] is False
            assert result["backup_id"] == str(backup.id)
            assert result["storage_provider"] == "backblaze_b2"
            assert result["expected_checksum"] == wrong_checksum
            assert result["actual_checksum"] != wrong_checksum
            
            print("✅ Real B2 backup validation FAILURE test passed!")
            
        finally:
            # Clean up B2
            print("🧹 Cleaning up B2...")
            cloud_storage.delete_from_b2(object_key)
            
            # Clean up local file
            if temp_file_path.exists():
                temp_file_path.unlink()
            
            # Clean up database
            db_session.delete(backup)
            db_session.delete(tenant)
            db_session.commit()
    
    def test_real_backup_download_and_prepare(self, restore_service, backup_service, cloud_storage, db_session):
        """Test downloading and preparing backup from real B2"""
        print("\n📥 Testing real backup download and prepare...")
        
        # Create test tenant
        tenant = Tenant(
            id=uuid4(),
            name="Download Test Tenant",
            email="download-test@example.com",
            subscription_type=SubscriptionType.PRO,
            is_active=True
        )
        db_session.add(tenant)
        db_session.commit()
        db_session.refresh(tenant)
        
        # Create test SQL content
        sql_content = """
        -- Test SQL backup content
        INSERT INTO users (id, name, email) VALUES (1, 'Test User', 'test@example.com');
        INSERT INTO customers (id, name, phone) VALUES (1, 'Test Customer', '123-456-7890');
        """
        
        # Compress the SQL content
        with tempfile.NamedTemporaryFile(mode='w', suffix='.sql', delete=False) as sql_file:
            sql_file.write(sql_content)
            sql_file_path = Path(sql_file.name)
        
        try:
            # Compress using backup service
            compressed_file = backup_service.compress_file(sql_file_path)
            print(f"🗜️ Compressed file: {compressed_file}")
            
            # Encrypt using backup service
            encrypted_file = backup_service.encrypt_file(compressed_file, str(tenant.id))
            print(f"🔐 Encrypted file: {encrypted_file}")
            
            # Calculate checksum
            checksum = backup_service.calculate_checksum(encrypted_file)
            print(f"🔍 Checksum: {checksum}")
            
            # Upload to REAL B2
            object_key = f"test_restore/real_download_{os.getpid()}_{tenant.id}.enc"
            print(f"📤 Uploading to B2: {object_key}")
            location = cloud_storage.upload_to_b2(encrypted_file, object_key)
            print(f"✅ Upload successful: {location}")
            
            # Create backup log entry
            backup = BackupLog(
                id=uuid4(),
                backup_type=BackupType.TENANT_DAILY,
                tenant_id=tenant.id,
                backup_name=f"download_test_{tenant.id}",
                status=BackupStatus.COMPLETED,
                file_size=encrypted_file.stat().st_size,
                compressed_size=compressed_file.stat().st_size,
                checksum=checksum,
                storage_locations=[{
                    "provider": "backblaze_b2",
                    "location": location,
                    "uploaded_at": datetime.now(timezone.utc).isoformat()
                }]
            )
            db_session.add(backup)
            db_session.commit()
            db_session.refresh(backup)
            print(f"💾 Backup log created: {backup.id}")
            
            # Test REAL download and prepare
            print("📥 Downloading and preparing backup...")
            prepared_sql_file = restore_service.download_and_prepare_backup(str(backup.id), "backblaze_b2")
            
            # Verify the prepared file exists and has content
            assert prepared_sql_file.exists()
            assert prepared_sql_file.stat().st_size > 0
            
            # Read and verify content
            with open(prepared_sql_file, 'r') as f:
                restored_content = f.read()
            
            assert "Test User" in restored_content
            assert "Test Customer" in restored_content
            assert "INSERT INTO" in restored_content
            
            print("✅ Real B2 download and prepare test passed!")
            
        finally:
            # Clean up B2
            print("🧹 Cleaning up B2...")
            cloud_storage.delete_from_b2(object_key)
            
            # Clean up local files
            for file_path in [sql_file_path, compressed_file, encrypted_file]:
                if file_path and file_path.exists():
                    file_path.unlink()
            
            if 'prepared_sql_file' in locals() and prepared_sql_file.exists():
                prepared_sql_file.unlink()
            
            # Clean up database
            db_session.delete(backup)
            db_session.delete(tenant)
            db_session.commit()
    
    def test_real_restore_points_listing(self, restore_service, cloud_storage, db_session):
        """Test listing available restore points with real database"""
        print("\n📋 Testing real restore points listing...")
        
        # Create test tenant
        tenant = Tenant(
            id=uuid4(),
            name="Restore Points Test Tenant",
            email="restore-points@example.com",
            subscription_type=SubscriptionType.PRO,
            is_active=True
        )
        db_session.add(tenant)
        db_session.commit()
        db_session.refresh(tenant)
        
        try:
            # Create multiple backup entries
            backups = []
            for i in range(3):
                backup = BackupLog(
                    id=uuid4(),
                    backup_type=BackupType.TENANT_DAILY,
                    tenant_id=tenant.id,
                    backup_name=f"restore_points_test_{i}_{tenant.id}",
                    status=BackupStatus.COMPLETED,
                    file_size=1024 * (i + 1),
                    compressed_size=512 * (i + 1),
                    checksum=f"checksum_{i}",
                    storage_locations=[{
                        "provider": "backblaze_b2",
                        "location": f"s3://securesyntax/test_backup_{i}.enc",
                        "uploaded_at": datetime.now(timezone.utc).isoformat()
                    }],
                    started_at=datetime.now(timezone.utc)
                )
                backups.append(backup)
                db_session.add(backup)
            
            db_session.commit()
            print(f"💾 Created {len(backups)} backup entries")
            
            # Test getting available restore points
            restore_points = restore_service.get_available_restore_points(str(tenant.id), "backblaze_b2")
            
            # Verify results
            assert len(restore_points) == 3
            
            for i, point in enumerate(restore_points):
                assert point["backup_name"].startswith("restore_points_test_")
                assert point["storage_provider"] == "backblaze_b2"
                assert point["file_size"] > 0
                assert point["compressed_size"] > 0
                assert "checksum" in point
            
            print("✅ Real restore points listing test passed!")
            
        finally:
            # Clean up database
            for backup in backups:
                db_session.delete(backup)
            db_session.delete(tenant)
            db_session.commit()
    
    def test_real_restore_history(self, restore_service, db_session):
        """Test restore history with real database operations"""
        print("\n📚 Testing real restore history...")
        
        # Create test tenant
        tenant = Tenant(
            id=uuid4(),
            name="Restore History Test Tenant",
            email="restore-history@example.com",
            subscription_type=SubscriptionType.PRO,
            is_active=True
        )
        db_session.add(tenant)
        db_session.commit()
        db_session.refresh(tenant)
        
        try:
            # Create test backup
            backup = BackupLog(
                id=uuid4(),
                backup_type=BackupType.TENANT_DAILY,
                tenant_id=tenant.id,
                backup_name=f"history_test_{tenant.id}",
                status=BackupStatus.COMPLETED
            )
            db_session.add(backup)
            db_session.commit()
            db_session.refresh(backup)
            
            # Create test restore logs
            restore_logs = []
            for i in range(2):
                restore_log = RestoreLog(
                    id=uuid4(),
                    backup_log_id=backup.id,
                    tenant_id=tenant.id,
                    initiated_by=uuid4(),
                    restore_point=datetime.now(timezone.utc),
                    status=BackupStatus.COMPLETED if i == 0 else BackupStatus.FAILED,
                    duration_seconds=120 + i * 60,
                    error_message="Test error" if i == 1 else None
                )
                restore_logs.append(restore_log)
                db_session.add(restore_log)
            
            db_session.commit()
            print(f"💾 Created {len(restore_logs)} restore log entries")
            
            # Test listing restore history
            history = restore_service.list_restore_history(str(tenant.id))
            
            # Verify results
            assert len(history) >= 2
            
            completed_restore = next(r for r in history if r["status"] == "completed")
            failed_restore = next(r for r in history if r["status"] == "failed")
            
            assert completed_restore["tenant_id"] == str(tenant.id)
            assert failed_restore["error_message"] == "Test error"
            
            # Test getting specific restore info
            restore_info = restore_service.get_restore_info(str(restore_logs[0].id))
            
            assert restore_info is not None
            assert restore_info["restore_id"] == str(restore_logs[0].id)
            assert restore_info["backup_id"] == str(backup.id)
            assert restore_info["duration_seconds"] == 120
            
            print("✅ Real restore history test passed!")
            
        finally:
            # Clean up database
            for restore_log in restore_logs:
                db_session.delete(restore_log)
            db_session.delete(backup)
            db_session.delete(tenant)
            db_session.commit()
    
    def test_complete_backup_restore_cycle(self, restore_service, backup_service, cloud_storage, db_session):
        """Test complete backup and restore cycle with real B2 and database"""
        print("\n🔄 Testing complete backup-restore cycle...")
        
        # Create test tenant
        tenant = Tenant(
            id=uuid4(),
            name="Complete Cycle Test Tenant",
            email="complete-cycle@example.com",
            subscription_type=SubscriptionType.PRO,
            is_active=True
        )
        db_session.add(tenant)
        db_session.commit()
        db_session.refresh(tenant)
        
        # Create realistic SQL backup content
        sql_content = f"""
        -- Complete backup for tenant {tenant.id}
        -- Generated on {datetime.now(timezone.utc).isoformat()}
        
        SET search_path TO tenant_{str(tenant.id).replace('-', '_')};
        
        -- Users table
        INSERT INTO users (id, name, email, created_at) VALUES 
        (1, 'John Doe', 'john@example.com', NOW()),
        (2, 'Jane Smith', 'jane@example.com', NOW());
        
        -- Customers table  
        INSERT INTO customers (id, name, phone, address, created_at) VALUES
        (1, 'ABC Company', '555-0123', '123 Main St', NOW()),
        (2, 'XYZ Corp', '555-0456', '456 Oak Ave', NOW());
        
        -- Products table
        INSERT INTO products (id, name, price, category, created_at) VALUES
        (1, 'Gold Ring', 299.99, 'jewelry', NOW()),
        (2, 'Silver Necklace', 149.99, 'jewelry', NOW());
        
        -- Orders table
        INSERT INTO orders (id, customer_id, total_amount, status, created_at) VALUES
        (1, 1, 299.99, 'completed', NOW()),
        (2, 2, 149.99, 'pending', NOW());
        """
        
        # Create temporary SQL file
        with tempfile.NamedTemporaryFile(mode='w', suffix='.sql', delete=False) as sql_file:
            sql_file.write(sql_content)
            sql_file_path = Path(sql_file.name)
        
        try:
            print(f"📝 Created SQL backup file: {sql_file_path}")
            
            # Step 1: Compress the backup
            compressed_file = backup_service.compress_file(sql_file_path)
            print(f"🗜️ Compressed backup: {compressed_file}")
            
            # Step 2: Encrypt the backup
            encrypted_file = backup_service.encrypt_file(compressed_file, str(tenant.id))
            print(f"🔐 Encrypted backup: {encrypted_file}")
            
            # Step 3: Calculate checksum
            checksum = backup_service.calculate_checksum(encrypted_file)
            print(f"🔍 Backup checksum: {checksum}")
            
            # Step 4: Upload to B2
            object_key = f"test_restore/complete_cycle_{os.getpid()}_{tenant.id}.enc"
            print(f"📤 Uploading to B2: {object_key}")
            location = cloud_storage.upload_to_b2(encrypted_file, object_key)
            print(f"✅ B2 upload successful: {location}")
            
            # Step 5: Create backup log
            backup = BackupLog(
                id=uuid4(),
                backup_type=BackupType.TENANT_DAILY,
                tenant_id=tenant.id,
                backup_name=f"complete_cycle_{tenant.id}",
                status=BackupStatus.COMPLETED,
                file_size=encrypted_file.stat().st_size,
                compressed_size=compressed_file.stat().st_size,
                checksum=checksum,
                storage_locations=[{
                    "provider": "backblaze_b2",
                    "location": location,
                    "uploaded_at": datetime.now(timezone.utc).isoformat()
                }],
                started_at=datetime.now(timezone.utc)
            )
            db_session.add(backup)
            db_session.commit()
            db_session.refresh(backup)
            print(f"💾 Backup log created: {backup.id}")
            
            # Step 6: Validate backup integrity
            print("🔍 Validating backup integrity...")
            validation_result = restore_service.validate_backup_integrity(str(backup.id), "backblaze_b2")
            
            assert validation_result["is_valid"] is True
            assert validation_result["expected_checksum"] == checksum
            assert validation_result["actual_checksum"] == checksum
            print("✅ Backup integrity validation passed!")
            
            # Step 7: Download and prepare for restore
            print("📥 Downloading and preparing backup for restore...")
            prepared_sql_file = restore_service.download_and_prepare_backup(str(backup.id), "backblaze_b2")
            
            assert prepared_sql_file.exists()
            assert prepared_sql_file.stat().st_size > 0
            
            # Step 8: Verify restored content
            with open(prepared_sql_file, 'r') as f:
                restored_content = f.read()
            
            assert f"tenant_{str(tenant.id).replace('-', '_')}" in restored_content
            assert "John Doe" in restored_content
            assert "ABC Company" in restored_content
            assert "Gold Ring" in restored_content
            assert "INSERT INTO" in restored_content
            
            print("✅ Backup content verification passed!")
            
            # Step 9: Test restore points listing
            restore_points = restore_service.get_available_restore_points(str(tenant.id), "backblaze_b2")
            
            assert len(restore_points) >= 1
            found_backup = next((rp for rp in restore_points if rp["backup_id"] == str(backup.id)), None)
            assert found_backup is not None
            assert found_backup["storage_provider"] == "backblaze_b2"
            
            print("✅ Restore points listing passed!")
            
            print("🎉 Complete backup-restore cycle test PASSED!")
            
        finally:
            # Clean up B2
            print("🧹 Cleaning up B2...")
            cloud_storage.delete_from_b2(object_key)
            
            # Clean up local files
            for file_path in [sql_file_path, compressed_file, encrypted_file]:
                if file_path and file_path.exists():
                    file_path.unlink()
            
            if 'prepared_sql_file' in locals() and prepared_sql_file.exists():
                prepared_sql_file.unlink()
            
            # Clean up database
            db_session.delete(backup)
            db_session.delete(tenant)
            db_session.commit()
            
            print("✅ Cleanup completed!")


if __name__ == "__main__":
    # Run tests directly
    pytest.main([__file__, "-v", "-s"])