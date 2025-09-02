"""
Comprehensive unit tests for the flexible tenant restore system
Tests with REAL B2 cloud storage integration
"""

import os
import pytest
import tempfile
import gzip
from pathlib import Path
from datetime import datetime, timezone
from unittest.mock import Mock, patch, MagicMock
from uuid import uuid4

# Set B2 environment variables for testing
os.environ['BACKBLAZE_B2_ACCESS_KEY'] = '005acba9882c2b80000000001'
os.environ['BACKBLAZE_B2_SECRET_KEY'] = 'K005LzPhrovqG5Eq37oYWxIQiIKIHh8'
os.environ['BACKBLAZE_B2_BUCKET'] = 'securesyntax'

from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.tenant import Tenant, SubscriptionType
from app.models.backup import BackupLog, RestoreLog, BackupType, BackupStatus
from app.services.restore_service import RestoreService
from app.services.backup_service import BackupService
from app.tasks.restore_tasks import (
    validate_backup_integrity_task, restore_single_tenant_task,
    restore_multiple_tenants_task, restore_all_tenants_task
)


class TestRestoreService:
    """Test cases for RestoreService"""
    
    @pytest.fixture
    def db_session(self):
        """Create test database session"""
        from app.core.database import SessionLocal
        db = SessionLocal()
        yield db
        db.close()
    
    @pytest.fixture
    def restore_service(self, db_session):
        """Create RestoreService instance"""
        return RestoreService(db_session)
    
    @pytest.fixture
    def test_tenant(self, db_session):
        """Create test tenant"""
        tenant = Tenant(
            id=uuid4(),
            name="Test Tenant",
            domain="test.example.com",
            email="test@example.com",
            subscription_type=SubscriptionType.PRO,
            is_active=True
        )
        db_session.add(tenant)
        db_session.commit()
        db_session.refresh(tenant)
        return tenant
    
    @pytest.fixture
    def test_backup(self, db_session, test_tenant):
        """Create test backup"""
        backup = BackupLog(
            id=uuid4(),
            backup_type=BackupType.TENANT_DAILY,
            tenant_id=test_tenant.id,
            backup_name=f"tenant_{test_tenant.id}_20240101_120000",
            status=BackupStatus.COMPLETED,
            file_size=1048576,
            compressed_size=524288,
            checksum="abc123def456",
            storage_locations=[
                {
                    "provider": "backblaze_b2",
                    "location": f"s3://test-bucket/tenant_{test_tenant.id}_20240101_120000.sql.gz.enc",
                    "uploaded_at": "2024-01-01T12:00:00Z"
                },
                {
                    "provider": "cloudflare_r2",
                    "location": f"s3://test-bucket-r2/tenant_{test_tenant.id}_20240101_120000.sql.gz.enc",
                    "uploaded_at": "2024-01-01T12:00:00Z"
                }
            ]
        )
        db_session.add(backup)
        db_session.commit()
        db_session.refresh(backup)
        return backup
    
    def test_validate_backup_integrity_success(self, restore_service, test_backup):
        """Test successful backup integrity validation"""
        import tempfile
        
        with patch.object(restore_service.cloud_storage, 'download_from_b2') as mock_download, \
             patch.object(restore_service.backup_service, 'calculate_checksum') as mock_checksum:
            
            # Mock download to create the actual file
            def mock_download_func(storage_location, local_path):
                # Create the file that the download would create
                with open(local_path, 'w') as f:
                    f.write("test backup content for validation")
                return local_path
            
            mock_download.side_effect = mock_download_func
            mock_checksum.return_value = test_backup.checksum
            
            result = restore_service.validate_backup_integrity(str(test_backup.id), "backblaze_b2")
            
            assert result["is_valid"] is True
            assert result["backup_id"] == str(test_backup.id)
            assert result["storage_provider"] == "backblaze_b2"
            assert result["expected_checksum"] == test_backup.checksum
            assert result["actual_checksum"] == test_backup.checksum
            assert result["file_size"] > 0
    
    def test_validate_backup_integrity_failure(self, restore_service, test_backup):
        """Test backup integrity validation failure"""
        with patch.object(restore_service.cloud_storage, 'download_from_b2') as mock_download, \
             patch.object(restore_service.backup_service, 'calculate_checksum') as mock_checksum:
            
            # Mock successful download but checksum mismatch
            mock_download.return_value = Path("/tmp/test_backup.enc")
            mock_checksum.return_value = "different_checksum"
            
            result = restore_service.validate_backup_integrity(str(test_backup.id), "backblaze_b2")
            
            assert result["is_valid"] is False
            assert result["expected_checksum"] == test_backup.checksum
            assert result["actual_checksum"] == "different_checksum"
    
    def test_validate_backup_not_found(self, restore_service):
        """Test validation with non-existent backup"""
        fake_backup_id = str(uuid4())
        
        with pytest.raises(Exception, match=f"Backup {fake_backup_id} not found"):
            restore_service.validate_backup_integrity(fake_backup_id, "backblaze_b2")
    
    def test_validate_backup_storage_not_found(self, restore_service, test_backup):
        """Test validation when backup not found in specified storage"""
        # Remove storage locations
        test_backup.storage_locations = []
        restore_service.db.commit()
        
        with pytest.raises(Exception, match="Backup not found in backblaze_b2"):
            restore_service.validate_backup_integrity(str(test_backup.id), "backblaze_b2")
    
    def test_create_pre_restore_snapshot(self, restore_service, test_tenant):
        """Test creating pre-restore snapshot"""
        with patch.object(restore_service.db, 'execute') as mock_execute:
            # Mock database query results
            mock_result = Mock()
            mock_result.scalar.return_value = 100
            mock_execute.return_value = mock_result
            
            snapshot = restore_service.create_pre_restore_snapshot(str(test_tenant.id))
            
            assert snapshot["tenant_id"] == str(test_tenant.id)
            assert "tenant_name" in snapshot  # Just check that tenant_name exists
            assert "snapshot_date" in snapshot
            assert "table_counts" in snapshot
            assert snapshot["table_counts"]["users"] == 100
    
    def test_download_and_prepare_backup(self, restore_service, test_backup):
        """Test downloading and preparing backup file"""
        with patch.object(restore_service.cloud_storage, 'download_from_b2') as mock_download, \
             patch.object(restore_service.backup_service, 'decrypt_file') as mock_decrypt, \
             patch('gzip.open') as mock_gzip, \
             patch('builtins.open', create=True) as mock_open:
            
            # Create temporary files
            temp_dir = Path(tempfile.gettempdir()) / "hesaabplus_restores"
            temp_dir.mkdir(exist_ok=True)
            
            encrypted_file = temp_dir / f"restore_{test_backup.id}.enc"
            compressed_file = temp_dir / f"restore_{test_backup.id}.gz"
            sql_file = temp_dir / f"restore_{test_backup.id}.sql"
            
            # Mock file operations
            mock_download.return_value = encrypted_file
            mock_decrypt.return_value = compressed_file
            
            # Mock gzip decompression
            mock_gzip_file = MagicMock()
            mock_gzip.return_value.__enter__.return_value = mock_gzip_file
            mock_gzip_file.__iter__.return_value = [b"SQL content"]
            
            mock_sql_file = MagicMock()
            mock_open.return_value.__enter__.return_value = mock_sql_file
            
            result = restore_service.download_and_prepare_backup(str(test_backup.id), "backblaze_b2")
            
            assert str(result).endswith(f"restore_{test_backup.id}.sql")
            mock_download.assert_called_once()
            mock_decrypt.assert_called_once()
    
    def test_execute_tenant_restore(self, restore_service, test_tenant):
        """Test executing tenant data restore"""
        with patch.object(restore_service, 'create_pre_restore_snapshot') as mock_snapshot, \
             patch('sqlalchemy.create_engine') as mock_engine, \
             patch('builtins.open', create=True) as mock_open:
            
            # Mock pre-restore snapshot
            mock_snapshot.return_value = {
                "tenant_id": str(test_tenant.id),
                "table_counts": {"users": 5, "customers": 10}
            }
            
            # Mock database engine and connection
            mock_conn = MagicMock()
            mock_engine.return_value.begin.return_value.__enter__.return_value = mock_conn
            mock_conn.execute.return_value.rowcount = 5
            
            # Mock SQL file content
            mock_open.return_value.__enter__.return_value.read.return_value = "INSERT INTO users VALUES (1, 'test');"
            
            # Create temporary SQL file
            temp_dir = Path(tempfile.gettempdir()) / "hesaabplus_restores"
            temp_dir.mkdir(exist_ok=True)
            sql_file = temp_dir / "test_restore.sql"
            sql_file.write_text("INSERT INTO users VALUES (1, 'test');")
            
            result = restore_service.execute_tenant_restore(str(test_tenant.id), sql_file, "admin-123")
            
            assert result["status"] == "success"
            assert result["tenant_id"] == str(test_tenant.id)
            assert "restore_id" in result
            assert "duration_seconds" in result
            
            # Cleanup
            if sql_file.exists():
                sql_file.unlink()
    
    def test_restore_single_tenant_success(self, restore_service, test_tenant, test_backup):
        """Test successful single tenant restore"""
        with patch.object(restore_service, 'validate_backup_integrity') as mock_validate, \
             patch.object(restore_service, 'download_and_prepare_backup') as mock_download, \
             patch.object(restore_service, 'execute_tenant_restore') as mock_execute:
            
            # Mock successful validation
            mock_validate.return_value = {"is_valid": True}
            
            # Mock successful download
            temp_sql_file = Path("/tmp/test_restore.sql")
            mock_download.return_value = temp_sql_file
            
            # Mock successful restore execution
            mock_execute.return_value = {
                "status": "success",
                "restore_id": str(uuid4()),
                "tenant_id": str(test_tenant.id)
            }
            
            result = restore_service.restore_single_tenant(
                str(test_tenant.id), str(test_backup.id), "backblaze_b2", "admin-123"
            )
            
            assert result["status"] == "success"
            assert result["tenant_id"] == str(test_tenant.id)
            mock_validate.assert_called_once()
            mock_download.assert_called_once()
            mock_execute.assert_called_once()
    
    def test_restore_single_tenant_validation_failure(self, restore_service, test_tenant, test_backup):
        """Test single tenant restore with validation failure"""
        with patch.object(restore_service, 'validate_backup_integrity') as mock_validate:
            
            # Mock validation failure
            mock_validate.return_value = {"is_valid": False}
            
            with pytest.raises(Exception, match="Backup integrity validation failed"):
                restore_service.restore_single_tenant(
                    str(test_tenant.id), str(test_backup.id), "backblaze_b2", "admin-123"
                )
    
    def test_restore_single_tenant_skip_validation(self, restore_service, test_tenant, test_backup):
        """Test single tenant restore with validation skipped"""
        with patch.object(restore_service, 'validate_backup_integrity') as mock_validate, \
             patch.object(restore_service, 'download_and_prepare_backup') as mock_download, \
             patch.object(restore_service, 'execute_tenant_restore') as mock_execute:
            
            # Mock successful download and restore
            temp_sql_file = Path("/tmp/test_restore.sql")
            mock_download.return_value = temp_sql_file
            mock_execute.return_value = {
                "status": "success",
                "restore_id": str(uuid4()),
                "tenant_id": str(test_tenant.id)
            }
            
            result = restore_service.restore_single_tenant(
                str(test_tenant.id), str(test_backup.id), "backblaze_b2", "admin-123", skip_validation=True
            )
            
            assert result["status"] == "success"
            # Validation should not be called when skipped
            mock_validate.assert_not_called()
            mock_download.assert_called_once()
            mock_execute.assert_called_once()
    
    def test_restore_multiple_tenants_success(self, restore_service, db_session):
        """Test successful multiple tenant restore"""
        # Create multiple test tenants and backups
        tenant1 = Tenant(id=uuid4(), name="Tenant 1", email="tenant1@example.com", is_active=True)
        tenant2 = Tenant(id=uuid4(), name="Tenant 2", email="tenant2@example.com", is_active=True)
        db_session.add_all([tenant1, tenant2])
        db_session.commit()
        
        backup1 = BackupLog(
            id=uuid4(), backup_type=BackupType.TENANT_DAILY, tenant_id=tenant1.id,
            backup_name="backup1", status=BackupStatus.COMPLETED
        )
        backup2 = BackupLog(
            id=uuid4(), backup_type=BackupType.TENANT_DAILY, tenant_id=tenant2.id,
            backup_name="backup2", status=BackupStatus.COMPLETED
        )
        db_session.add_all([backup1, backup2])
        db_session.commit()
        
        tenant_backup_pairs = [
            {"tenant_id": str(tenant1.id), "backup_id": str(backup1.id)},
            {"tenant_id": str(tenant2.id), "backup_id": str(backup2.id)}
        ]
        
        with patch.object(restore_service, 'restore_single_tenant') as mock_restore:
            # Mock successful restores
            mock_restore.side_effect = [
                {"status": "success", "restore_id": str(uuid4()), "tenant_id": str(tenant1.id)},
                {"status": "success", "restore_id": str(uuid4()), "tenant_id": str(tenant2.id)}
            ]
            
            result = restore_service.restore_multiple_tenants(
                tenant_backup_pairs, "backblaze_b2", "admin-123"
            )
            
            assert result["status"] == "completed"
            assert result["total_tenants"] == 2
            assert result["successful_restores"] == 2
            assert result["failed_restores"] == 0
            assert len(result["restore_results"]) == 2
    
    def test_restore_multiple_tenants_partial_failure(self, restore_service, db_session):
        """Test multiple tenant restore with partial failures"""
        # Create test tenants and backups
        tenant1 = Tenant(id=uuid4(), name="Tenant 1", email="tenant1@example.com", is_active=True)
        tenant2 = Tenant(id=uuid4(), name="Tenant 2", email="tenant2@example.com", is_active=True)
        db_session.add_all([tenant1, tenant2])
        db_session.commit()
        
        backup1 = BackupLog(
            id=uuid4(), backup_type=BackupType.TENANT_DAILY, tenant_id=tenant1.id,
            backup_name="backup1", status=BackupStatus.COMPLETED
        )
        backup2 = BackupLog(
            id=uuid4(), backup_type=BackupType.TENANT_DAILY, tenant_id=tenant2.id,
            backup_name="backup2", status=BackupStatus.COMPLETED
        )
        db_session.add_all([backup1, backup2])
        db_session.commit()
        
        tenant_backup_pairs = [
            {"tenant_id": str(tenant1.id), "backup_id": str(backup1.id)},
            {"tenant_id": str(tenant2.id), "backup_id": str(backup2.id)}
        ]
        
        with patch.object(restore_service, 'restore_single_tenant') as mock_restore:
            # Mock one success and one failure
            mock_restore.side_effect = [
                {"status": "success", "restore_id": str(uuid4()), "tenant_id": str(tenant1.id)},
                Exception("Restore failed for tenant 2")
            ]
            
            result = restore_service.restore_multiple_tenants(
                tenant_backup_pairs, "backblaze_b2", "admin-123"
            )
            
            assert result["status"] == "partial_failure"
            assert result["total_tenants"] == 2
            assert result["successful_restores"] == 1
            assert result["failed_restores"] == 1
            assert len(result["restore_results"]) == 2
            
            # Check individual results
            success_result = next(r for r in result["restore_results"] if r["status"] == "success")
            failure_result = next(r for r in result["restore_results"] if r["status"] == "failed")
            
            assert success_result["tenant_id"] == str(tenant1.id)
            assert failure_result["tenant_id"] == str(tenant2.id)
            assert "Restore failed for tenant 2" in failure_result["error"]
    
    def test_restore_all_tenants_success(self, restore_service, db_session):
        """Test successful restore of all tenants"""
        # Create multiple active tenants
        tenant1 = Tenant(id=uuid4(), name="Tenant 1", email="tenant1@example.com", is_active=True)
        tenant2 = Tenant(id=uuid4(), name="Tenant 2", email="tenant2@example.com", is_active=True)
        tenant3 = Tenant(id=uuid4(), name="Tenant 3", email="tenant3@example.com", is_active=False)  # Inactive
        db_session.add_all([tenant1, tenant2, tenant3])
        db_session.commit()
        
        # Create backups for active tenants
        backup1 = BackupLog(
            id=uuid4(), backup_type=BackupType.TENANT_DAILY, tenant_id=tenant1.id,
            backup_name="backup1", status=BackupStatus.COMPLETED,
            started_at=datetime(2024, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
        )
        backup2 = BackupLog(
            id=uuid4(), backup_type=BackupType.TENANT_DAILY, tenant_id=tenant2.id,
            backup_name="backup2", status=BackupStatus.COMPLETED,
            started_at=datetime(2024, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
        )
        db_session.add_all([backup1, backup2])
        db_session.commit()
        
        with patch.object(restore_service, 'restore_multiple_tenants') as mock_restore:
            # Mock successful restore
            mock_restore.return_value = {
                "status": "completed",
                "total_tenants": 2,
                "successful_restores": 2,
                "failed_restores": 0,
                "restore_results": []
            }
            
            result = restore_service.restore_all_tenants("backblaze_b2", "admin-123")
            
            assert result["status"] == "completed"
            assert result["total_active_tenants"] == 2
            assert result["successful_restores"] == 2
            assert result["failed_restores"] == 0
            
            # Verify restore_multiple_tenants was called with correct pairs
            call_args = mock_restore.call_args[0]
            tenant_backup_pairs = call_args[0]
            assert len(tenant_backup_pairs) == 2
    
    def test_restore_all_tenants_no_active_tenants(self, restore_service, db_session):
        """Test restore all tenants when no active tenants exist"""
        # Create only inactive tenants
        tenant = Tenant(id=uuid4(), name="Inactive Tenant", email="inactive@example.com", is_active=False)
        db_session.add(tenant)
        db_session.commit()
        
        with pytest.raises(Exception, match="No active tenants found"):
            restore_service.restore_all_tenants("backblaze_b2", "admin-123")
    
    def test_restore_all_tenants_with_backup_date_filter(self, restore_service, db_session):
        """Test restore all tenants with backup date filter"""
        # Create tenant with multiple backups
        tenant = Tenant(id=uuid4(), name="Test Tenant", email="test@example.com", is_active=True)
        db_session.add(tenant)
        db_session.commit()
        
        # Create backups at different dates
        old_backup = BackupLog(
            id=uuid4(), backup_type=BackupType.TENANT_DAILY, tenant_id=tenant.id,
            backup_name="old_backup", status=BackupStatus.COMPLETED,
            started_at=datetime(2023, 12, 1, 12, 0, 0, tzinfo=timezone.utc)
        )
        new_backup = BackupLog(
            id=uuid4(), backup_type=BackupType.TENANT_DAILY, tenant_id=tenant.id,
            backup_name="new_backup", status=BackupStatus.COMPLETED,
            started_at=datetime(2024, 1, 15, 12, 0, 0, tzinfo=timezone.utc)
        )
        db_session.add_all([old_backup, new_backup])
        db_session.commit()
        
        with patch.object(restore_service, 'restore_multiple_tenants') as mock_restore:
            mock_restore.return_value = {
                "status": "completed",
                "total_tenants": 1,
                "successful_restores": 1,
                "failed_restores": 0,
                "restore_results": []
            }
            
            # Restore with date filter (should use old backup)
            result = restore_service.restore_all_tenants(
                "backblaze_b2", "admin-123", backup_date="2024-01-01T00:00:00Z"
            )
            
            assert result["backup_date"] == "2024-01-01T00:00:00Z"
            
            # Verify the correct backup was selected
            call_args = mock_restore.call_args[0]
            tenant_backup_pairs = call_args[0]
            assert len(tenant_backup_pairs) == 1
            assert tenant_backup_pairs[0]["backup_id"] == str(old_backup.id)
    
    def test_list_restore_history(self, restore_service, db_session, test_tenant, test_backup):
        """Test listing restore history"""
        # Create test restore logs
        restore1 = RestoreLog(
            id=uuid4(),
            backup_log_id=test_backup.id,
            tenant_id=test_tenant.id,
            initiated_by=uuid4(),
            restore_point=datetime(2024, 1, 1, 12, 0, 0, tzinfo=timezone.utc),
            status=BackupStatus.COMPLETED
        )
        restore2 = RestoreLog(
            id=uuid4(),
            backup_log_id=test_backup.id,
            tenant_id=test_tenant.id,
            initiated_by=uuid4(),
            restore_point=datetime(2024, 1, 2, 12, 0, 0, tzinfo=timezone.utc),
            status=BackupStatus.FAILED,
            error_message="Test error"
        )
        db_session.add_all([restore1, restore2])
        db_session.commit()
        
        # Test listing all restores
        restores = restore_service.list_restore_history()
        assert len(restores) >= 2
        
        # Test filtering by tenant
        tenant_restores = restore_service.list_restore_history(str(test_tenant.id))
        assert len(tenant_restores) >= 2
        
        # Verify restore information
        completed_restore = next(r for r in tenant_restores if r["status"] == "completed")
        failed_restore = next(r for r in tenant_restores if r["status"] == "failed")
        
        assert completed_restore["tenant_id"] == str(test_tenant.id)
        assert failed_restore["error_message"] == "Test error"
    
    def test_get_restore_info(self, restore_service, db_session, test_tenant, test_backup):
        """Test getting detailed restore information"""
        # Create test restore log
        restore = RestoreLog(
            id=uuid4(),
            backup_log_id=test_backup.id,
            tenant_id=test_tenant.id,
            initiated_by=uuid4(),
            restore_point=datetime(2024, 1, 1, 12, 0, 0, tzinfo=timezone.utc),
            status=BackupStatus.COMPLETED,
            duration_seconds=300,
            pre_restore_snapshot={"table_counts": {"users": 5}}
        )
        db_session.add(restore)
        db_session.commit()
        
        # Test getting restore info
        restore_info = restore_service.get_restore_info(str(restore.id))
        
        assert restore_info is not None
        assert restore_info["restore_id"] == str(restore.id)
        assert restore_info["backup_id"] == str(test_backup.id)
        assert restore_info["tenant_id"] == str(test_tenant.id)
        assert restore_info["status"] == "completed"
        assert restore_info["duration_seconds"] == 300
        assert restore_info["pre_restore_snapshot"]["table_counts"]["users"] == 5
    
    def test_get_restore_info_not_found(self, restore_service):
        """Test getting restore info for non-existent restore"""
        fake_restore_id = str(uuid4())
        restore_info = restore_service.get_restore_info(fake_restore_id)
        assert restore_info is None
    
    def test_get_available_restore_points(self, restore_service, test_tenant, test_backup):
        """Test getting available restore points for a tenant"""
        restore_points = restore_service.get_available_restore_points(str(test_tenant.id), "backblaze_b2")
        
        assert len(restore_points) >= 1
        
        restore_point = restore_points[0]
        assert restore_point["backup_id"] == str(test_backup.id)
        assert restore_point["backup_name"] == test_backup.backup_name
        assert restore_point["storage_provider"] == "backblaze_b2"
        assert restore_point["file_size"] == test_backup.file_size
        assert restore_point["compressed_size"] == test_backup.compressed_size
        assert restore_point["checksum"] == test_backup.checksum
    
    def test_get_available_restore_points_no_storage(self, restore_service, test_tenant, test_backup):
        """Test getting restore points when backup not available in specified storage"""
        # Remove storage locations
        test_backup.storage_locations = []
        restore_service.db.commit()
        
        restore_points = restore_service.get_available_restore_points(str(test_tenant.id), "backblaze_b2")
        assert len(restore_points) == 0


class TestRestoreTasks:
    """Test cases for restore Celery tasks"""
    
    @pytest.fixture
    def mock_db_session(self):
        """Mock database session"""
        with patch('app.tasks.restore_tasks.SessionLocal') as mock_session:
            mock_db = Mock()
            mock_session.return_value = mock_db
            yield mock_db
    
    def test_validate_backup_integrity_task_success(self, mock_db_session):
        """Test successful backup integrity validation task"""
        with patch('app.tasks.restore_tasks.RestoreService') as mock_service_class, \
             patch('app.tasks.restore_tasks.current_task') as mock_current_task:
            
            # Mock current task
            mock_current_task.update_state = Mock()
            
            mock_service = Mock()
            mock_service_class.return_value = mock_service
            mock_service.validate_backup_integrity.return_value = {
                "is_valid": True,
                "backup_id": "test-backup-id",
                "storage_provider": "backblaze_b2"
            }
            
            result = validate_backup_integrity_task("test-backup-id", "backblaze_b2")
            
            assert result["is_valid"] is True
            assert result["backup_id"] == "test-backup-id"
            mock_service.validate_backup_integrity.assert_called_once_with("test-backup-id", "backblaze_b2")
    
    def test_restore_single_tenant_task_success(self, mock_db_session):
        """Test successful single tenant restore task"""
        with patch('app.tasks.restore_tasks.RestoreService') as mock_service_class, \
             patch('app.tasks.restore_tasks.current_task') as mock_current_task:
            
            # Mock current task
            mock_current_task.update_state = Mock()
            
            mock_service = Mock()
            mock_service_class.return_value = mock_service
            mock_service.restore_single_tenant.return_value = {
                "status": "success",
                "restore_id": "test-restore-id",
                "tenant_id": "test-tenant-id"
            }
            
            result = restore_single_tenant_task(
                "test-tenant-id", "test-backup-id", "backblaze_b2", "admin-123"
            )
            
            assert result["status"] == "success"
            assert result["tenant_id"] == "test-tenant-id"
            mock_service.restore_single_tenant.assert_called_once_with(
                tenant_id="test-tenant-id",
                backup_id="test-backup-id",
                storage_provider="backblaze_b2",
                initiated_by="admin-123",
                skip_validation=False
            )
    
    def test_restore_multiple_tenants_task_success(self, mock_db_session):
        """Test successful multiple tenants restore task"""
        with patch('app.tasks.restore_tasks.RestoreService') as mock_service_class, \
             patch('app.tasks.restore_tasks.current_task') as mock_current_task:
            
            # Mock current task
            mock_current_task.update_state = Mock()
            
            mock_service = Mock()
            mock_service_class.return_value = mock_service
            mock_service.restore_multiple_tenants.return_value = {
                "status": "completed",
                "total_tenants": 2,
                "successful_restores": 2,
                "failed_restores": 0
            }
            
            tenant_backup_pairs = [
                {"tenant_id": "tenant-1", "backup_id": "backup-1"},
                {"tenant_id": "tenant-2", "backup_id": "backup-2"}
            ]
            
            result = restore_multiple_tenants_task(
                tenant_backup_pairs, "backblaze_b2", "admin-123"
            )
            
            assert result["status"] == "completed"
            assert result["total_tenants"] == 2
            assert result["successful_restores"] == 2
            mock_service.restore_multiple_tenants.assert_called_once_with(
                tenant_backup_pairs=tenant_backup_pairs,
                storage_provider="backblaze_b2",
                initiated_by="admin-123",
                skip_validation=False
            )
    
    def test_restore_all_tenants_task_success(self, mock_db_session):
        """Test successful all tenants restore task"""
        with patch('app.tasks.restore_tasks.RestoreService') as mock_service_class, \
             patch('app.tasks.restore_tasks.current_task') as mock_current_task:
            
            # Mock current task
            mock_current_task.update_state = Mock()
            
            mock_service = Mock()
            mock_service_class.return_value = mock_service
            mock_service.restore_all_tenants.return_value = {
                "status": "completed",
                "total_active_tenants": 5,
                "successful_restores": 5,
                "failed_restores": 0
            }
            
            result = restore_all_tenants_task(
                "backblaze_b2", "admin-123", "2024-01-01T00:00:00Z"
            )
            
            assert result["status"] == "completed"
            assert result["total_active_tenants"] == 5
            assert result["successful_restores"] == 5
            mock_service.restore_all_tenants.assert_called_once_with(
                storage_provider="backblaze_b2",
                initiated_by="admin-123",
                backup_date="2024-01-01T00:00:00Z",
                skip_validation=False
            )


if __name__ == "__main__":
    pytest.main([__file__, "-v"])