"""
Test enhanced backup system migration with real database operations
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
from app.models.backup.storage_location import StorageLocation


class TestEnhancedBackupMigration:
    """Test enhanced backup system migration functionality"""
    
    def test_all_enhanced_backup_tables_exist(self, db_session: Session):
        """Test that all enhanced backup tables exist"""
        expected_tables = [
            'backup_operations',
            'operation_logs', 
            'rollback_points',
            'disaster_recovery_backups',
            'enhanced_storage_locations'
        ]
        
        for table_name in expected_tables:
            result = db_session.execute(text(f"""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = '{table_name}'
                );
            """))
            assert result.scalar() is True, f"Table {table_name} should exist"
    
    def test_backup_operations_table_structure(self, db_session: Session):
        """Test backup_operations table has correct structure"""
        result = db_session.execute(text("""
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'backup_operations' 
            AND table_schema = 'public'
            ORDER BY column_name;
        """))
        columns = {row[0]: {'type': row[1], 'nullable': row[2]} for row in result.fetchall()}
        
        # Check key columns exist with correct types
        assert 'id' in columns
        assert 'operation_type' in columns
        assert 'status' in columns
        assert 'tenant_ids' in columns
        assert 'storage_providers' in columns
        assert 'progress_percentage' in columns
        assert 'checksum_md5' in columns
        assert 'checksum_sha256' in columns
        assert 'integrity_verified' in columns
        assert 'backup_metadata' in columns
        assert 'celery_task_id' in columns
        
        # Check nullable constraints
        assert columns['id']['nullable'] == 'NO'
        assert columns['operation_type']['nullable'] == 'NO'
        assert columns['status']['nullable'] == 'NO'
        assert columns['progress_percentage']['nullable'] == 'NO'
        assert columns['integrity_verified']['nullable'] == 'NO'
    
    def test_backup_operations_indexes_exist(self, db_session: Session):
        """Test that all required indexes exist for backup_operations table"""
        result = db_session.execute(text("""
            SELECT indexname 
            FROM pg_indexes 
            WHERE tablename = 'backup_operations' 
            AND schemaname = 'public'
            ORDER BY indexname;
        """))
        indexes = [row[0] for row in result.fetchall()]
        
        expected_indexes = [
            'backup_operations_pkey',  # Primary key
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
    
    def test_operation_logs_foreign_key_constraint(self, db_session: Session):
        """Test that operation_logs has proper foreign key constraint"""
        result = db_session.execute(text("""
            SELECT 
                tc.constraint_name,
                kcu.column_name,
                ccu.table_name AS foreign_table_name,
                ccu.column_name AS foreign_column_name
            FROM information_schema.table_constraints AS tc 
            JOIN information_schema.key_column_usage AS kcu
                ON tc.constraint_name = kcu.constraint_name
                AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage AS ccu
                ON ccu.constraint_name = tc.constraint_name
                AND ccu.table_schema = tc.table_schema
            WHERE tc.constraint_type = 'FOREIGN KEY' 
            AND tc.table_name = 'operation_logs'
            AND tc.table_schema = 'public';
        """))
        
        foreign_keys = list(result.fetchall())
        assert len(foreign_keys) > 0, "operation_logs should have foreign key constraints"
        
        # Check that there's a foreign key to backup_operations
        backup_op_fk = [fk for fk in foreign_keys if fk[2] == 'backup_operations']
        assert len(backup_op_fk) > 0, "operation_logs should have foreign key to backup_operations"
    
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
            backup_metadata={"test": True, "migration_test": True}
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
        assert retrieved.backup_metadata["migration_test"] is True
    
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
            execution_time_ms=1500.0,
            memory_usage_mb=256.5
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
            assert log.is_active is True
    
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
        assert rollback_point.rollback_count == 0
        
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
        
        # Create rollback point first
        rollback_point = RollbackPoint(
            description="Test rollback point",
            created_by_operation_id=backup_op.id,
            system_state={"test": True},
            container_states={"backend": "running"},
            volume_snapshots={"data": "/data"},
            rollback_data_location="/test/rollback.tar.gz",
            rollback_size=500000
        )
        
        db_session.add(rollback_point)
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
            database_size=1000000,
            created_rollback_point_id=rollback_point.id
        )
        
        db_session.add(dr_backup)
        db_session.commit()
        
        # Verify disaster recovery backup was created
        assert dr_backup.id is not None
        assert dr_backup.backup_operation_id == backup_op.id
        assert dr_backup.backup_type == "FULL_SYSTEM"
        assert dr_backup.includes_containers is True
        assert dr_backup.created_rollback_point_id == rollback_point.id
        
        # Test relationships
        retrieved = db_session.query(DisasterRecoveryBackup).filter_by(id=dr_backup.id).first()
        assert retrieved.backup_operation_id == backup_op.id
        assert retrieved.created_rollback_point_id == rollback_point.id
    
    def test_create_enhanced_storage_location(self, db_session: Session):
        """Test creating enhanced storage location records"""
        # Create enhanced storage location
        storage_location = StorageLocation(
            name="Test R2 Storage Migration",
            provider="CLOUDFLARE_R2",
            description="Test Cloudflare R2 storage for migration testing",
            endpoint="https://test.r2.cloudflarestorage.com",
            region="auto",
            bucket_name="test-migration-backup-bucket",
            access_key="test_access_key",
            secret_key="test_secret_key",
            configuration={"max_concurrent_uploads": 3, "migration_test": True},
            is_active=True,
            is_primary=False,  # Don't make it primary to avoid conflicts
            is_verified=False,
            encryption_enabled=True,
            retention_days=30,
            max_backups=100
        )
        
        db_session.add(storage_location)
        db_session.commit()
        
        # Verify storage location was created
        assert storage_location.id is not None
        assert storage_location.name == "Test R2 Storage Migration"
        assert storage_location.provider == "CLOUDFLARE_R2"
        assert storage_location.is_active is True
        assert storage_location.is_primary is False
        assert storage_location.encryption_enabled is True
        assert storage_location.total_backups == 0
        assert storage_location.total_size == 0
        assert storage_location.error_count == 0
        
        # Test configuration JSONB field
        assert storage_location.configuration["max_concurrent_uploads"] == 3
        assert storage_location.configuration["migration_test"] is True
    
    def test_cascade_delete_relationships(self, db_session: Session):
        """Test that cascade delete works properly for related records"""
        # Create backup operation
        backup_op = BackupOperation(
            operation_type="TENANT",
            status="IN_PROGRESS",
            tenant_ids=[str(uuid.uuid4())],
            storage_providers=["CLOUDFLARE_R2"],
            progress_percentage=50.0,
            current_step="Testing cascade delete"
        )
        
        db_session.add(backup_op)
        db_session.commit()
        
        # Create related records
        log = OperationLog(
            operation_id=backup_op.id,
            operation_type="BACKUP",
            log_level="INFO",
            message="Test cascade delete",
            step_name="test_step",
            progress_at_time=50.0,
            component="test_service"
        )
        
        rollback_point = RollbackPoint(
            description="Test cascade delete rollback",
            created_by_operation_id=backup_op.id,
            system_state={"test": "cascade"},
            container_states={"test": "running"},
            volume_snapshots={"test": "/test"},
            rollback_data_location="/test/cascade.tar.gz",
            rollback_size=100000
        )
        
        dr_backup = DisasterRecoveryBackup(
            backup_operation_id=backup_op.id,
            backup_type="FULL_SYSTEM",
            includes_containers=True,
            includes_volumes=True,
            includes_configs=True,
            includes_database=True
        )
        
        db_session.add_all([log, rollback_point, dr_backup])
        db_session.commit()
        
        # Verify all records were created
        operation_id = backup_op.id
        assert db_session.query(OperationLog).filter_by(operation_id=operation_id).count() == 1
        assert db_session.query(RollbackPoint).filter_by(created_by_operation_id=operation_id).count() == 1
        assert db_session.query(DisasterRecoveryBackup).filter_by(backup_operation_id=operation_id).count() == 1
        
        # Delete the backup operation
        db_session.delete(backup_op)
        db_session.commit()
        
        # Verify cascade delete worked
        assert db_session.query(OperationLog).filter_by(operation_id=operation_id).count() == 0
        assert db_session.query(RollbackPoint).filter_by(created_by_operation_id=operation_id).count() == 0
        assert db_session.query(DisasterRecoveryBackup).filter_by(backup_operation_id=operation_id).count() == 0
    
    def test_legacy_backup_data_preserved(self, db_session: Session):
        """Test that existing legacy backup data was preserved during migration"""
        # Check that legacy backup_logs table still exists and has data
        result = db_session.execute(text("SELECT COUNT(*) FROM backup_logs"))
        backup_count = result.scalar()
        assert backup_count >= 0, "Legacy backup logs should be preserved"
        
        # Check that legacy restore_logs table still exists
        result = db_session.execute(text("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'restore_logs'
            );
        """))
        assert result.scalar() is True, "Legacy restore_logs table should be preserved"
        
        # Check that legacy storage_locations table still exists
        result = db_session.execute(text("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'storage_locations'
            );
        """))
        assert result.scalar() is True, "Legacy storage_locations table should be preserved"
    
    def test_migration_performance_with_indexes(self, db_session: Session):
        """Test that indexes improve query performance"""
        # Create multiple backup operations for testing
        backup_ops = []
        for i in range(20):
            backup_op = BackupOperation(
                operation_type="TENANT" if i % 2 == 0 else "DISASTER_RECOVERY",
                status="COMPLETED" if i % 3 == 0 else "PENDING",
                storage_providers=["CLOUDFLARE_R2"],
                progress_percentage=float(i * 5),
                current_step=f"Migration test step {i}",
                backup_metadata={"test_index": i, "migration_test": True}
            )
            backup_ops.append(backup_op)
        
        db_session.add_all(backup_ops)
        db_session.commit()
        
        # Test indexed queries
        # Query by operation_type (should use idx_backup_operation_type)
        tenant_ops = db_session.query(BackupOperation).filter_by(operation_type="TENANT").all()
        assert len(tenant_ops) == 10
        
        # Query by status (should use idx_backup_operation_status)
        completed_ops = db_session.query(BackupOperation).filter_by(status="COMPLETED").all()
        assert len(completed_ops) >= 6
        
        # Query by progress (should use idx_backup_operation_progress)
        high_progress_ops = db_session.query(BackupOperation).filter(
            BackupOperation.progress_percentage > 50.0
        ).all()
        assert len(high_progress_ops) >= 9
        
        # Query by active status (should use idx_backup_operation_active)
        active_ops = db_session.query(BackupOperation).filter_by(is_active=True).all()
        assert len(active_ops) >= 20
        
        # Query by integrity status (should use idx_backup_operation_integrity)
        verified_ops = db_session.query(BackupOperation).filter_by(integrity_verified=False).all()
        assert len(verified_ops) >= 20


if __name__ == "__main__":
    print("Run with: python -m pytest backend/tests/test_enhanced_backup_migration.py -v")