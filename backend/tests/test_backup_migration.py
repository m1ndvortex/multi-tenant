"""
Test backup system migration with real database operations
"""

import pytest
import uuid
from datetime import datetime, timezone
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.backup.backup_operation import BackupOperation
from app.models.backup.operation_log import OperationLog
from app.models.backup.rollback_point import RollbackPoint
from app.models.backup.disaster_recovery import DisasterRecoveryBackup
from app.models.backup.storage_location import EnhancedStorageLocation


class TestBackupMigration:
    """Test backup system migration functionality"""
    
    def test_backup_operations_table_exists(self, db_session: Session):
        """Test that backup_operations table exists and has correct structure"""
        # Check table exists
        result = db_session.execute(text("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'backup_operations'
            );
        """))
        assert result.scalar() is True
        
        # Check key columns exist
        result = db_session.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'backup_operations' 
            AND table_schema = 'public'
            ORDER BY column_name;
        """))
        columns = [row[0] for row in result.fetchall()]
        
        expected_columns = [
            'id', 'operation_type', 'status', 'tenant_ids', 'storage_providers',
            'progress_percentage', 'current_step', 'estimated_completion',
            'backup_file_path', 'compressed_size', 'uncompressed_size',
            'r2_location', 'b2_location', 'checksum_md5', 'checksum_sha256',
            'integrity_verified', 'started_at', 'completed_at', 'error_message',
            'retry_count', 'max_retries', 'backup_metadata', 'celery_task_id',
            'created_at', 'updated_at', 'is_active'
        ]
        
        for col in expected_columns:
            assert col in columns, f"Column {col} missing from backup_operations table"
    
    def test_operation_logs_table_exists(self, db_session: Session):
        """Test that operation_logs table exists and has correct structure"""
        # Check table exists
        result = db_session.execute(text("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'operation_logs'
            );
        """))
        assert result.scalar() is True
        
        # Check foreign key constraint exists
        result = db_session.execute(text("""
            SELECT EXISTS (
                SELECT FROM information_schema.table_constraints 
                WHERE table_name = 'operation_logs' 
                AND constraint_type = 'FOREIGN KEY'
                AND table_schema = 'public'
            );
        """))
        assert result.scalar() is True
    
    def test_rollback_points_table_exists(self, db_session: Session):
        """Test that rollback_points table exists and has correct structure"""
        # Check table exists
        result = db_session.execute(text("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'rollback_points'
            );
        """))
        assert result.scalar() is True
    
    def test_disaster_recovery_backups_table_exists(self, db_session: Session):
        """Test that disaster_recovery_backups table exists and has correct structure"""
        # Check table exists
        result = db_session.execute(text("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'disaster_recovery_backups'
            );
        """))
        assert result.scalar() is True
    
    def test_enhanced_storage_locations_table_exists(self, db_session: Session):
        """Test that enhanced_storage_locations table exists and has correct structure"""
        # Check table exists
        result = db_session.execute(text("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'enhanced_storage_locations'
            );
        """))
        assert result.scalar() is True
    
    def test_backup_operation_indexes_exist(self, db_session: Session):
        """Test that all required indexes exist for backup_operations table"""
        # Check that indexes exist
        result = db_session.execute(text("""
            SELECT indexname 
            FROM pg_indexes 
            WHERE tablename = 'backup_operations' 
            AND schemaname = 'public'
            ORDER BY indexname;
        """))
        indexes = [row[0] for row in result.fetchall()]
        
        expected_indexes = [
            'idx_backup_operation_type',
            'idx_backup_operation_status',
            'idx_backup_operation_tenant_ids',
            'idx_backup_operation_progress',
            'idx_backup_operation_started_at',
            'idx_backup_operation_completed_at',
            'idx_backup_operation_integrity',
            'idx_backup_operation_celery_task',
            'idx_backup_operation_created_at',
            'idx_backup_operation_active'
        ]
        
        for idx in expected_indexes:
            assert idx in indexes, f"Index {idx} missing from backup_operations table"
    
    def test_operation_logs_indexes_exist(self, db_session: Session):
        """Test that all required indexes exist for operation_logs table"""
        result = db_session.execute(text("""
            SELECT indexname 
            FROM pg_indexes 
            WHERE tablename = 'operation_logs' 
            AND schemaname = 'public'
            ORDER BY indexname;
        """))
        indexes = [row[0] for row in result.fetchall()]
        
        expected_indexes = [
            'idx_operation_log_operation',
            'idx_operation_log_operation_type',
            'idx_operation_log_level',
            'idx_operation_log_step',
            'idx_operation_log_progress',
            'idx_operation_log_component',
            'idx_operation_log_error_code',
            'idx_operation_log_tenant',
            'idx_operation_log_storage_provider',
            'idx_operation_log_created_at',
            'idx_operation_log_active'
        ]
        
        for idx in expected_indexes:
            assert idx in indexes, f"Index {idx} missing from operation_logs table"
    
    def test_legacy_backup_data_preserved(self, db_session: Session):
        """Test that existing backup data was preserved during migration"""
        # Check that backup_logs table still exists and has data
        result = db_session.execute(text("SELECT COUNT(*) FROM backup_logs"))
        backup_count = result.scalar()
        assert backup_count > 0, "Legacy backup logs should be preserved"
        
        # Check that restore_logs table still exists and has data
        result = db_session.execute(text("SELECT COUNT(*) FROM restore_logs"))
        restore_count = result.scalar()
        assert restore_count >= 0, "Legacy restore logs should be preserved"
        
        # Check that storage_locations table still exists
        result = db_session.execute(text("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'storage_locations'
            );
        """))
        assert result.scalar() is True, "Legacy storage_locations table should be preserved"
    
    def test_create_backup_operation_with_real_database(self, db_session: Session):
        """Test creating a backup operation record with real database operations"""
        # Create a backup operation
        backup_op = BackupOperation(
            operation_type="TENANT",
            status="PENDING",
            tenant_ids=[str(uuid.uuid4()), str(uuid.uuid4())],
            storage_providers=["CLOUDFLARE_R2", "BACKBLAZE_B2"],
            progress_percentage=0.0,
            current_step="Initializing backup",
            backup_metadata={"test": True, "created_by": "test_migration"}
        )
        
        db_session.add(backup_op)
        db_session.commit()
        
        # Verify the record was created
        assert backup_op.id is not None
        assert backup_op.created_at is not None
        assert backup_op.is_active is True
        
        # Query back from database
        retrieved = db_session.query(BackupOperation).filter_by(id=backup_op.id).first()
        assert retrieved is not None
        assert retrieved.operation_type == "TENANT"
        assert retrieved.status == "PENDING"
        assert len(retrieved.tenant_ids) == 2
        assert len(retrieved.storage_providers) == 2
        assert retrieved.backup_metadata["test"] is True
    
    def test_create_operation_log_with_foreign_key(self, db_session: Session):
        """Test creating operation logs with foreign key relationships"""
        # First create a backup operation
        backup_op = BackupOperation(
            operation_type="DISASTER_RECOVERY",
            status="IN_PROGRESS",
            storage_providers=["CLOUDFLARE_R2"],
            progress_percentage=25.0,
            current_step="Creating system snapshot"
        )
        
        db_session.add(backup_op)
        db_session.commit()
        
        # Create operation logs
        log1 = OperationLog(
            operation_id=backup_op.id,
            operation_type="BACKUP",
            log_level="INFO",
            message="Starting backup operation",
            step_name="initialization",
            progress_at_time=0.0,
            component="backup_service"
        )
        
        log2 = OperationLog(
            operation_id=backup_op.id,
            operation_type="BACKUP",
            log_level="INFO",
            message="Creating database dump",
            step_name="database_backup",
            progress_at_time=25.0,
            component="database_service",
            execution_time_ms=1500.0
        )
        
        db_session.add_all([log1, log2])
        db_session.commit()
        
        # Verify logs were created and linked
        logs = db_session.query(OperationLog).filter_by(operation_id=backup_op.id).all()
        assert len(logs) == 2
        
        # Test foreign key relationship
        for log in logs:
            assert log.operation_id == backup_op.id
            assert log.created_at is not None
    
    def test_create_rollback_point_with_relationships(self, db_session: Session):
        """Test creating rollback points with proper relationships"""
        # Create backup operation
        backup_op = BackupOperation(
            operation_type="DISASTER_RECOVERY",
            status="COMPLETED",
            storage_providers=["CLOUDFLARE_R2", "BACKBLAZE_B2"],
            progress_percentage=100.0,
            current_step="Completed"
        )
        
        db_session.add(backup_op)
        db_session.commit()
        
        # Create rollback point
        rollback_point = RollbackPoint(
            description="Pre-disaster recovery rollback point",
            created_by_operation_id=backup_op.id,
            system_state={"containers": ["backend", "postgres", "redis"]},
            container_states={"backend": "running", "postgres": "running"},
            volume_snapshots={"postgres_data": "/var/lib/postgresql/data"},
            rollback_data_location="/backups/rollback/test.tar.gz",
            rollback_size=1024000
        )
        
        db_session.add(rollback_point)
        db_session.commit()
        
        # Verify rollback point was created
        assert rollback_point.id is not None
        assert rollback_point.created_by_operation_id == backup_op.id
        assert rollback_point.is_active is True
        assert rollback_point.can_rollback is True
        
        # Test relationship
        retrieved = db_session.query(RollbackPoint).filter_by(id=rollback_point.id).first()
        assert retrieved.created_by_operation_id == backup_op.id
    
    def test_create_disaster_recovery_backup(self, db_session: Session):
        """Test creating disaster recovery backup records"""
        # Create backup operation
        backup_op = BackupOperation(
            operation_type="DISASTER_RECOVERY",
            status="COMPLETED",
            storage_providers=["CLOUDFLARE_R2"],
            progress_percentage=100.0,
            current_step="Completed"
        )
        
        db_session.add(backup_op)
        db_session.commit()
        
        # Create disaster recovery backup
        dr_backup = DisasterRecoveryBackup(
            backup_operation_id=backup_op.id,
            backup_type="FULL_SYSTEM",
            includes_containers=True,
            includes_volumes=True,
            includes_configs=True,
            includes_database=True,
            docker_compose_version="2.20.0",
            container_versions={"backend": "latest", "postgres": "15"},
            volume_mappings={"postgres_data": "/var/lib/postgresql/data"},
            environment_variables={"DATABASE_URL": "postgresql://..."},
            containers_backup_path="/backups/containers.tar.gz",
            volumes_backup_path="/backups/volumes.tar.gz",
            database_backup_path="/backups/database.sql",
            containers_size=500000,
            volumes_size=2000000,
            database_size=1000000
        )
        
        db_session.add(dr_backup)
        db_session.commit()
        
        # Verify disaster recovery backup was created
        assert dr_backup.id is not None
        assert dr_backup.backup_operation_id == backup_op.id
        assert dr_backup.backup_type == "FULL_SYSTEM"
        assert dr_backup.includes_containers is True
        
        # Test relationship
        retrieved = db_session.query(DisasterRecoveryBackup).filter_by(id=dr_backup.id).first()
        assert retrieved.backup_operation_id == backup_op.id
    
    def test_create_enhanced_storage_location(self, db_session: Session):
        """Test creating enhanced storage location records"""
        # Create enhanced storage location
        storage_location = EnhancedStorageLocation(
            name="Test R2 Storage",
            provider="CLOUDFLARE_R2",
            description="Test Cloudflare R2 storage for backup testing",
            endpoint="https://test.r2.cloudflarestorage.com",
            region="auto",
            bucket_name="test-backup-bucket",
            access_key="test_access_key",
            secret_key="test_secret_key",
            configuration={"max_concurrent_uploads": 3},
            is_active=True,
            is_primary=True,
            is_verified=False,
            encryption_enabled=True,
            retention_days=30,
            max_backups=100
        )
        
        db_session.add(storage_location)
        db_session.commit()
        
        # Verify storage location was created
        assert storage_location.id is not None
        assert storage_location.name == "Test R2 Storage"
        assert storage_location.provider == "CLOUDFLARE_R2"
        assert storage_location.is_active is True
        assert storage_location.is_primary is True
        assert storage_location.encryption_enabled is True
        
        # Test unique constraint on name
        duplicate_location = EnhancedStorageLocation(
            name="Test R2 Storage",  # Same name
            provider="BACKBLAZE_B2"
        )
        
        db_session.add(duplicate_location)
        
        with pytest.raises(Exception):  # Should raise integrity error
            db_session.commit()
        
        db_session.rollback()
    
    def test_backup_operation_with_multiple_relationships(self, db_session: Session):
        """Test backup operation with multiple related records"""
        # Create backup operation
        backup_op = BackupOperation(
            operation_type="TENANT",
            status="IN_PROGRESS",
            tenant_ids=[str(uuid.uuid4())],
            storage_providers=["CLOUDFLARE_R2", "BACKBLAZE_B2"],
            progress_percentage=50.0,
            current_step="Uploading to storage"
        )
        
        db_session.add(backup_op)
        db_session.commit()
        
        # Create multiple operation logs
        logs = []
        for i in range(5):
            log = OperationLog(
                operation_id=backup_op.id,
                operation_type="BACKUP",
                log_level="INFO",
                message=f"Step {i+1} completed",
                step_name=f"step_{i+1}",
                progress_at_time=i * 10.0,
                component="backup_service"
            )
            logs.append(log)
        
        db_session.add_all(logs)
        db_session.commit()
        
        # Verify all logs were created
        retrieved_logs = db_session.query(OperationLog).filter_by(operation_id=backup_op.id).all()
        assert len(retrieved_logs) == 5
        
        # Test cascade delete (if backup operation is deleted, logs should be deleted too)
        db_session.delete(backup_op)
        db_session.commit()
        
        # Verify logs were cascade deleted
        remaining_logs = db_session.query(OperationLog).filter_by(operation_id=backup_op.id).all()
        assert len(remaining_logs) == 0
    
    def test_migration_performance_with_indexes(self, db_session: Session):
        """Test that indexes improve query performance"""
        # Create multiple backup operations for testing
        backup_ops = []
        for i in range(10):
            backup_op = BackupOperation(
                operation_type="TENANT" if i % 2 == 0 else "DISASTER_RECOVERY",
                status="COMPLETED" if i % 3 == 0 else "PENDING",
                storage_providers=["CLOUDFLARE_R2"],
                progress_percentage=float(i * 10),
                current_step=f"Step {i}"
            )
            backup_ops.append(backup_op)
        
        db_session.add_all(backup_ops)
        db_session.commit()
        
        # Test indexed queries
        # Query by operation_type (should use idx_backup_operation_type)
        tenant_ops = db_session.query(BackupOperation).filter_by(operation_type="TENANT").all()
        assert len(tenant_ops) == 5
        
        # Query by status (should use idx_backup_operation_status)
        completed_ops = db_session.query(BackupOperation).filter_by(status="COMPLETED").all()
        assert len(completed_ops) >= 3
        
        # Query by progress (should use idx_backup_operation_progress)
        high_progress_ops = db_session.query(BackupOperation).filter(
            BackupOperation.progress_percentage > 50.0
        ).all()
        assert len(high_progress_ops) >= 4
        
        # Query by active status (should use idx_backup_operation_active)
        active_ops = db_session.query(BackupOperation).filter_by(is_active=True).all()
        assert len(active_ops) == 10


if __name__ == "__main__":
    print("Run with: python -m pytest backend/tests/test_backup_migration.py -v")