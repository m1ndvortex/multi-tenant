"""
Unit tests for BackupOperation model with real database operations
"""

import pytest
import uuid
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from app.models.backup.backup_operation import BackupOperation, BackupType, OperationStatus
from app.models.tenant import Tenant
from app.core.database import get_db


class TestBackupOperation:
    """Test BackupOperation model functionality"""
    
    def test_create_backup_operation(self, db_session: Session):
        """Test creating a new backup operation"""
        # Create test tenant
        tenant = Tenant(
            name="Test Tenant",
            domain="test.example.com",
            is_active=True
        )
        db_session.add(tenant)
        db_session.commit()
        
        # Create backup operation
        backup_op = BackupOperation(
            operation_type=BackupType.TENANT,
            tenant_ids=[tenant.id],
            storage_providers=["cloudflare_r2", "backblaze_b2"],
            backup_metadata={"test": "data"}
        )
        
        db_session.add(backup_op)
        db_session.commit()
        db_session.refresh(backup_op)
        
        # Verify creation
        assert backup_op.id is not None
        assert backup_op.operation_type == BackupType.TENANT
        assert backup_op.status == OperationStatus.PENDING
        assert backup_op.tenant_ids == [tenant.id]
        assert backup_op.storage_providers == ["cloudflare_r2", "backblaze_b2"]
        assert backup_op.progress_percentage == 0.0
        assert backup_op.retry_count == 0
        assert backup_op.max_retries == 3
        assert backup_op.backup_metadata == {"test": "data"}
    
    def test_start_operation(self, db_session: Session):
        """Test starting a backup operation"""
        backup_op = BackupOperation(
            operation_type=BackupType.MANUAL,
            storage_providers=["cloudflare_r2"]
        )
        
        db_session.add(backup_op)
        db_session.commit()
        
        # Start operation
        backup_op.start_operation()
        db_session.commit()
        
        # Verify status change
        assert backup_op.status == OperationStatus.IN_PROGRESS
        assert backup_op.started_at is not None
        assert backup_op.current_step == "Starting backup operation"
        assert backup_op.progress_percentage == 0.0
    
    def test_update_progress(self, db_session: Session):
        """Test updating operation progress"""
        backup_op = BackupOperation(
            operation_type=BackupType.DISASTER_RECOVERY,
            storage_providers=["backblaze_b2"]
        )
        
        db_session.add(backup_op)
        db_session.commit()
        
        # Update progress
        estimated_completion = datetime.now(timezone.utc) + timedelta(minutes=30)
        backup_op.update_progress(45.5, "Processing database backup", estimated_completion)
        db_session.commit()
        
        # Verify progress update
        assert backup_op.progress_percentage == 45.5
        assert backup_op.current_step == "Processing database backup"
        assert backup_op.estimated_completion == estimated_completion
    
    def test_complete_operation(self, db_session: Session):
        """Test completing a backup operation"""
        backup_op = BackupOperation(
            operation_type=BackupType.TENANT,
            storage_providers=["cloudflare_r2", "backblaze_b2"]
        )
        
        db_session.add(backup_op)
        db_session.commit()
        
        # Start and complete operation
        backup_op.start_operation()
        backup_op.complete_operation(
            compressed_size=1024000,
            uncompressed_size=2048000,
            checksum_md5="abc123",
            checksum_sha256="def456",
            r2_location="r2://bucket/backup.tar.gz",
            b2_location="b2://bucket/backup.tar.gz"
        )
        db_session.commit()
        
        # Verify completion
        assert backup_op.status == OperationStatus.COMPLETED
        assert backup_op.completed_at is not None
        assert backup_op.progress_percentage == 100.0
        assert backup_op.current_step == "Backup completed successfully"
        assert backup_op.compressed_size == 1024000
        assert backup_op.uncompressed_size == 2048000
        assert backup_op.checksum_md5 == "abc123"
        assert backup_op.checksum_sha256 == "def456"
        assert backup_op.r2_location == "r2://bucket/backup.tar.gz"
        assert backup_op.b2_location == "b2://bucket/backup.tar.gz"
    
    def test_fail_operation(self, db_session: Session):
        """Test failing a backup operation"""
        backup_op = BackupOperation(
            operation_type=BackupType.SCHEDULED,
            storage_providers=["cloudflare_r2"]
        )
        
        db_session.add(backup_op)
        db_session.commit()
        
        # Start and fail operation
        backup_op.start_operation()
        backup_op.fail_operation("Storage connection failed")
        db_session.commit()
        
        # Verify failure
        assert backup_op.status == OperationStatus.FAILED
        assert backup_op.error_message == "Storage connection failed"
        assert backup_op.completed_at is not None
        assert backup_op.current_step == "Operation failed: Storage connection failed"
    
    def test_cancel_operation(self, db_session: Session):
        """Test cancelling a backup operation"""
        backup_op = BackupOperation(
            operation_type=BackupType.MANUAL,
            storage_providers=["backblaze_b2"]
        )
        
        db_session.add(backup_op)
        db_session.commit()
        
        # Start and cancel operation
        backup_op.start_operation()
        backup_op.cancel_operation()
        db_session.commit()
        
        # Verify cancellation
        assert backup_op.status == OperationStatus.CANCELLED
        assert backup_op.completed_at is not None
        assert backup_op.current_step == "Operation cancelled by user"
    
    def test_pause_resume_operation(self, db_session: Session):
        """Test pausing and resuming a backup operation"""
        backup_op = BackupOperation(
            operation_type=BackupType.TENANT,
            storage_providers=["cloudflare_r2"]
        )
        
        db_session.add(backup_op)
        db_session.commit()
        
        # Start, pause, and resume operation
        backup_op.start_operation()
        backup_op.pause_operation()
        db_session.commit()
        
        assert backup_op.status == OperationStatus.PAUSED
        assert backup_op.current_step == "Operation paused"
        
        backup_op.resume_operation()
        db_session.commit()
        
        assert backup_op.status == OperationStatus.IN_PROGRESS
        assert backup_op.current_step == "Operation resumed"
    
    def test_retry_functionality(self, db_session: Session):
        """Test retry functionality"""
        backup_op = BackupOperation(
            operation_type=BackupType.DISASTER_RECOVERY,
            storage_providers=["cloudflare_r2"],
            max_retries=2
        )
        
        db_session.add(backup_op)
        db_session.commit()
        
        # Test retry increment and can_retry
        assert backup_op.can_retry() is False  # Not failed yet
        
        backup_op.fail_operation("First failure")
        assert backup_op.can_retry() is True
        
        backup_op.increment_retry()
        assert backup_op.retry_count == 1
        assert backup_op.can_retry() is True
        
        backup_op.increment_retry()
        assert backup_op.retry_count == 2
        assert backup_op.can_retry() is False  # Exceeded max retries
    
    def test_verify_integrity(self, db_session: Session):
        """Test integrity verification"""
        backup_op = BackupOperation(
            operation_type=BackupType.TENANT,
            storage_providers=["backblaze_b2"]
        )
        
        db_session.add(backup_op)
        db_session.commit()
        
        # Verify integrity
        backup_op.verify_integrity()
        db_session.commit()
        
        assert backup_op.integrity_verified is True
    
    def test_duration_calculation(self, db_session: Session):
        """Test duration calculation"""
        backup_op = BackupOperation(
            operation_type=BackupType.MANUAL,
            storage_providers=["cloudflare_r2"]
        )
        
        db_session.add(backup_op)
        db_session.commit()
        
        # Test without timestamps
        assert backup_op.duration_seconds is None
        
        # Start and complete with known duration
        start_time = datetime.now(timezone.utc)
        backup_op.started_at = start_time
        backup_op.completed_at = start_time + timedelta(seconds=120)
        db_session.commit()
        
        assert backup_op.duration_seconds == 120
    
    def test_compression_ratio_calculation(self, db_session: Session):
        """Test compression ratio calculation"""
        backup_op = BackupOperation(
            operation_type=BackupType.TENANT,
            storage_providers=["cloudflare_r2"]
        )
        
        db_session.add(backup_op)
        db_session.commit()
        
        # Test without sizes
        assert backup_op.compression_ratio is None
        
        # Set sizes and test calculation
        backup_op.uncompressed_size = 2000000  # 2MB
        backup_op.compressed_size = 1000000    # 1MB
        db_session.commit()
        
        assert backup_op.compression_ratio == 50.0  # 50% compression
    
    def test_property_methods(self, db_session: Session):
        """Test property methods"""
        backup_op = BackupOperation(
            operation_type=BackupType.TENANT,
            tenant_ids=[uuid.uuid4(), uuid.uuid4(), uuid.uuid4()],
            storage_providers=["cloudflare_r2", "backblaze_b2"]
        )
        
        db_session.add(backup_op)
        db_session.commit()
        
        # Test is_successful
        assert backup_op.is_successful is False
        backup_op.status = OperationStatus.COMPLETED
        assert backup_op.is_successful is True
        
        # Test is_running
        backup_op.status = OperationStatus.IN_PROGRESS
        assert backup_op.is_running is True
        backup_op.status = OperationStatus.PENDING
        assert backup_op.is_running is True
        backup_op.status = OperationStatus.COMPLETED
        assert backup_op.is_running is False
        
        # Test storage_locations
        backup_op.r2_location = "r2://test"
        backup_op.b2_location = "b2://test"
        locations = backup_op.storage_locations
        assert locations["cloudflare_r2"] == "r2://test"
        assert locations["backblaze_b2"] == "b2://test"
        
        # Test get_tenant_count
        assert backup_op.get_tenant_count() == 3
    
    def test_multiple_tenants_backup(self, db_session: Session):
        """Test backup operation with multiple tenants"""
        # Create multiple test tenants
        tenants = []
        for i in range(3):
            tenant = Tenant(
                name=f"Test Tenant {i+1}",
                domain=f"test{i+1}.example.com",
                is_active=True
            )
            db_session.add(tenant)
            tenants.append(tenant)
        
        db_session.commit()
        
        # Create backup operation for multiple tenants
        tenant_ids = [tenant.id for tenant in tenants]
        backup_op = BackupOperation(
            operation_type=BackupType.TENANT,
            tenant_ids=tenant_ids,
            storage_providers=["cloudflare_r2", "backblaze_b2"]
        )
        
        db_session.add(backup_op)
        db_session.commit()
        
        # Verify multi-tenant backup
        assert backup_op.get_tenant_count() == 3
        assert set(backup_op.tenant_ids) == set(tenant_ids)
    
    def test_disaster_recovery_backup(self, db_session: Session):
        """Test disaster recovery backup operation"""
        backup_op = BackupOperation(
            operation_type=BackupType.DISASTER_RECOVERY,
            storage_providers=["cloudflare_r2", "backblaze_b2"],
            backup_metadata={
                "includes_containers": True,
                "includes_volumes": True,
                "includes_configs": True,
                "includes_database": True
            }
        )
        
        db_session.add(backup_op)
        db_session.commit()
        
        # Verify disaster recovery specific attributes
        assert backup_op.operation_type == BackupType.DISASTER_RECOVERY
        assert backup_op.tenant_ids is None  # DR backups don't have specific tenants
        assert backup_op.backup_metadata["includes_containers"] is True
    
    def test_celery_task_tracking(self, db_session: Session):
        """Test Celery task ID tracking"""
        task_id = "celery-task-123-456"
        backup_op = BackupOperation(
            operation_type=BackupType.SCHEDULED,
            storage_providers=["cloudflare_r2"],
            celery_task_id=task_id
        )
        
        db_session.add(backup_op)
        db_session.commit()
        
        # Verify task tracking
        assert backup_op.celery_task_id == task_id
        
        # Query by task ID
        found_op = db_session.query(BackupOperation).filter(
            BackupOperation.celery_task_id == task_id
        ).first()
        
        assert found_op is not None
        assert found_op.id == backup_op.id
    
    def test_backup_operation_repr(self, db_session: Session):
        """Test string representation"""
        backup_op = BackupOperation(
            operation_type=BackupType.MANUAL,
            status=OperationStatus.IN_PROGRESS,
            storage_providers=["cloudflare_r2"]
        )
        
        db_session.add(backup_op)
        db_session.commit()
        
        repr_str = repr(backup_op)
        assert "BackupOperation" in repr_str
        assert "manual" in repr_str
        assert "in_progress" in repr_str
        assert str(backup_op.id) in repr_str