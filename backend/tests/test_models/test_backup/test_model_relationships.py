"""
Unit tests for backup model relationships and integration with real database operations
"""

import pytest
import uuid
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from app.models.backup.backup_operation import BackupOperation, BackupType, OperationStatus
from app.models.backup.disaster_recovery import DisasterRecoveryBackup, DisasterRecoveryType, RollbackPoint
from app.models.backup.operation_log import OperationLog, LogLevel
from app.models.backup.storage_location import StorageLocation, StorageProvider
from app.models.tenant import Tenant


class TestBackupModelRelationships:
    """Test relationships between backup models"""
    
    def test_backup_operation_to_disaster_recovery_relationship(self, db_session: Session):
        """Test BackupOperation to DisasterRecoveryBackup relationship"""
        # Create backup operation
        backup_op = BackupOperation(
            operation_type=BackupType.DISASTER_RECOVERY,
            storage_providers=["cloudflare_r2", "backblaze_b2"]
        )
        db_session.add(backup_op)
        db_session.commit()
        
        # Create disaster recovery backup
        dr_backup = DisasterRecoveryBackup(
            backup_operation_id=backup_op.id,
            backup_type=DisasterRecoveryType.FULL_SYSTEM,
            includes_containers=True,
            includes_volumes=True,
            includes_configs=True,
            includes_database=True
        )
        db_session.add(dr_backup)
        db_session.commit()
        
        # Test relationship from backup operation
        db_session.refresh(backup_op)
        assert backup_op.disaster_recovery_backup is not None
        assert backup_op.disaster_recovery_backup.id == dr_backup.id
        assert backup_op.disaster_recovery_backup.backup_type == DisasterRecoveryType.FULL_SYSTEM
        
        # Test relationship from disaster recovery backup
        db_session.refresh(dr_backup)
        assert dr_backup.backup_operation is not None
        assert dr_backup.backup_operation.id == backup_op.id
        assert dr_backup.backup_operation.operation_type == BackupType.DISASTER_RECOVERY
    
    def test_backup_operation_to_logs_relationship(self, db_session: Session):
        """Test BackupOperation to OperationLog relationship"""
        # Create backup operation
        backup_op = BackupOperation(
            operation_type=BackupType.TENANT,
            storage_providers=["cloudflare_r2"]
        )
        db_session.add(backup_op)
        db_session.commit()
        
        # Create multiple operation logs
        logs = [
            OperationLog.log_info(
                str(backup_op.id), "BACKUP", f"Log message {i}", f"Step {i}", i*10.0
            )
            for i in range(5)
        ]
        
        db_session.add_all(logs)
        db_session.commit()
        
        # Test relationship from backup operation
        db_session.refresh(backup_op)
        assert len(backup_op.logs) == 5
        
        # Verify log content
        log_messages = [log.message for log in backup_op.logs]
        for i in range(5):
            assert f"Log message {i}" in log_messages
        
        # Test relationship from logs
        for log in logs:
            db_session.refresh(log)
            assert log.operation is not None
            assert log.operation.id == backup_op.id
    
    def test_rollback_point_to_backup_operation_relationship(self, db_session: Session):
        """Test RollbackPoint to BackupOperation relationship"""
        # Create backup operation
        backup_op = BackupOperation(
            operation_type=BackupType.DISASTER_RECOVERY,
            storage_providers=["backblaze_b2"]
        )
        db_session.add(backup_op)
        db_session.commit()
        
        # Create rollback point
        rollback_point = RollbackPoint(
            description="Test rollback point",
            created_by_operation_id=backup_op.id,
            system_state={"test": "data"},
            container_states={"test": "data"},
            volume_snapshots={"test": "data"},
            rollback_data_location="/rollback/test",
            rollback_size=1000000
        )
        db_session.add(rollback_point)
        db_session.commit()
        
        # Test relationship
        db_session.refresh(rollback_point)
        assert rollback_point.created_by_operation is not None
        assert rollback_point.created_by_operation.id == backup_op.id
        assert rollback_point.created_by_operation.operation_type == BackupType.DISASTER_RECOVERY
    
    def test_disaster_recovery_to_rollback_point_relationship(self, db_session: Session):
        """Test DisasterRecoveryBackup to RollbackPoint relationship"""
        # Create backup operation
        backup_op = BackupOperation(
            operation_type=BackupType.DISASTER_RECOVERY,
            storage_providers=["cloudflare_r2"]
        )
        db_session.add(backup_op)
        db_session.commit()
        
        # Create rollback point first
        rollback_point = RollbackPoint(
            description="Pre-disaster recovery rollback",
            created_by_operation_id=backup_op.id,
            system_state={"test": "data"},
            container_states={"test": "data"},
            volume_snapshots={"test": "data"},
            rollback_data_location="/rollback/pre_dr",
            rollback_size=2000000
        )
        db_session.add(rollback_point)
        db_session.commit()
        
        # Create disaster recovery backup with rollback point reference
        dr_backup = DisasterRecoveryBackup(
            backup_operation_id=backup_op.id,
            backup_type=DisasterRecoveryType.FULL_SYSTEM,
            created_rollback_point_id=rollback_point.id
        )
        db_session.add(dr_backup)
        db_session.commit()
        
        # Test relationship
        db_session.refresh(dr_backup)
        assert dr_backup.created_rollback_point is not None
        assert dr_backup.created_rollback_point.id == rollback_point.id
        assert dr_backup.created_rollback_point.description == "Pre-disaster recovery rollback"
    
    def test_complete_backup_workflow_with_relationships(self, db_session: Session):
        """Test complete backup workflow with all model relationships"""
        # Create tenants
        tenants = []
        for i in range(3):
            tenant = Tenant(
                name=f"Test Tenant {i+1}",
                domain=f"tenant{i+1}.example.com",
                is_active=True
            )
            db_session.add(tenant)
            tenants.append(tenant)
        
        db_session.commit()
        tenant_ids = [tenant.id for tenant in tenants]
        
        # Create storage locations
        r2_storage = StorageLocation(
            name="Primary R2",
            provider=StorageProvider.CLOUDFLARE_R2,
            bucket_name="primary-r2",
            is_active=True,
            is_verified=True,
            is_primary=True
        )
        
        b2_storage = StorageLocation(
            name="Secondary B2",
            provider=StorageProvider.BACKBLAZE_B2,
            bucket_name="secondary-b2",
            is_active=True,
            is_verified=True
        )
        
        db_session.add_all([r2_storage, b2_storage])
        db_session.commit()
        
        # Create backup operation
        backup_op = BackupOperation(
            operation_type=BackupType.TENANT,
            tenant_ids=tenant_ids,
            storage_providers=["cloudflare_r2", "backblaze_b2"],
            backup_metadata={
                "backup_reason": "Scheduled daily backup",
                "includes_files": True,
                "compression_level": 6
            }
        )
        db_session.add(backup_op)
        db_session.commit()
        
        # Start backup and create logs
        backup_op.start_operation()
        
        # Create operation logs for different steps
        log_steps = [
            ("Initializing backup", 5.0, LogLevel.INFO),
            ("Collecting tenant data", 15.0, LogLevel.INFO),
            ("Compressing backup files", 35.0, LogLevel.INFO),
            ("Uploading to Cloudflare R2", 60.0, LogLevel.INFO),
            ("Uploading to Backblaze B2", 85.0, LogLevel.INFO),
            ("Verifying backup integrity", 95.0, LogLevel.INFO),
            ("Backup completed successfully", 100.0, LogLevel.INFO)
        ]
        
        logs = []
        for step_name, progress, level in log_steps:
            log = OperationLog(
                operation_id=backup_op.id,
                operation_type="BACKUP",
                log_level=level,
                message=f"Step: {step_name}",
                step_name=step_name,
                progress_at_time=progress,
                component="BackupService"
            )
            logs.append(log)
            backup_op.update_progress(progress, step_name)
        
        db_session.add_all(logs)
        
        # Complete backup
        backup_op.complete_operation(
            compressed_size=1073741824,  # 1GB
            uncompressed_size=2147483648,  # 2GB
            checksum_md5="abc123def456",
            checksum_sha256="sha256hash",
            r2_location="r2://primary-r2/backup_20240101.tar.gz",
            b2_location="b2://secondary-b2/backup_20240101.tar.gz"
        )
        
        # Update storage location stats
        r2_storage.update_usage_stats(1073741824)
        b2_storage.update_usage_stats(1073741824)
        
        db_session.commit()
        
        # Verify complete workflow
        db_session.refresh(backup_op)
        
        # Check backup operation
        assert backup_op.status == OperationStatus.COMPLETED
        assert backup_op.progress_percentage == 100.0
        assert backup_op.get_tenant_count() == 3
        assert backup_op.compression_ratio == 50.0  # 50% compression
        
        # Check logs
        assert len(backup_op.logs) == 7
        log_messages = [log.message for log in backup_op.logs]
        assert "Step: Initializing backup" in log_messages
        assert "Step: Backup completed successfully" in log_messages
        
        # Check storage locations
        db_session.refresh(r2_storage)
        db_session.refresh(b2_storage)
        
        assert r2_storage.total_backups == 1
        assert r2_storage.total_size == 1073741824
        assert b2_storage.total_backups == 1
        assert b2_storage.total_size == 1073741824
        
        # Verify tenant relationships (if tenant backup models exist)
        for tenant_id in tenant_ids:
            assert tenant_id in backup_op.tenant_ids
    
    def test_disaster_recovery_workflow_with_rollback(self, db_session: Session):
        """Test disaster recovery workflow with rollback point creation"""
        # Create backup operation for disaster recovery
        backup_op = BackupOperation(
            operation_type=BackupType.DISASTER_RECOVERY,
            storage_providers=["cloudflare_r2", "backblaze_b2"]
        )
        db_session.add(backup_op)
        db_session.commit()
        
        # Start operation
        backup_op.start_operation()
        
        # Create rollback point first (before DR backup)
        rollback_point = RollbackPoint(
            description="Pre-disaster recovery system state",
            created_by_operation_id=backup_op.id,
            system_state={
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "services": ["backend", "postgres", "redis"],
                "uptime_hours": 168
            },
            container_states={
                "backend": {"status": "running", "image": "hesaabplus:v2.0"},
                "postgres": {"status": "running", "image": "postgres:15"},
                "redis": {"status": "running", "image": "redis:7"}
            },
            volume_snapshots={
                "postgres_data": {"size_gb": 5, "path": "/snapshots/postgres.tar.gz"},
                "redis_data": {"size_gb": 1, "path": "/snapshots/redis.tar.gz"}
            },
            rollback_data_location="/rollback/pre_dr_20240101",
            rollback_size=6442450944  # 6GB
        )
        db_session.add(rollback_point)
        db_session.commit()
        
        # Create disaster recovery backup
        dr_backup = DisasterRecoveryBackup(
            backup_operation_id=backup_op.id,
            backup_type=DisasterRecoveryType.FULL_SYSTEM,
            includes_containers=True,
            includes_volumes=True,
            includes_configs=True,
            includes_database=True,
            docker_compose_version="2.20.0",
            container_versions={
                "backend": "hesaabplus:v2.0",
                "postgres": "postgres:15-alpine",
                "redis": "redis:7-alpine"
            },
            volume_mappings={
                "postgres_data": "/var/lib/postgresql/data",
                "redis_data": "/data"
            },
            system_state={
                "platform_version": "2.0.0",
                "backup_timestamp": datetime.now(timezone.utc).isoformat()
            },
            created_rollback_point_id=rollback_point.id,
            containers_size=1073741824,  # 1GB
            volumes_size=5368709120,     # 5GB
            configs_size=10485760,       # 10MB
            database_size=2147483648     # 2GB
        )
        db_session.add(dr_backup)
        db_session.commit()
        
        # Create operation logs for DR process
        dr_logs = [
            OperationLog.log_info(
                str(backup_op.id), "DISASTER_RECOVERY", 
                "Creating system rollback point", "Create Rollback", 10.0
            ),
            OperationLog.log_info(
                str(backup_op.id), "DISASTER_RECOVERY", 
                "Backing up container configurations", "Backup Containers", 30.0
            ),
            OperationLog.log_info(
                str(backup_op.id), "DISASTER_RECOVERY", 
                "Backing up volume data", "Backup Volumes", 60.0
            ),
            OperationLog.log_info(
                str(backup_op.id), "DISASTER_RECOVERY", 
                "Backing up system configurations", "Backup Configs", 80.0
            ),
            OperationLog.log_info(
                str(backup_op.id), "DISASTER_RECOVERY", 
                "Disaster recovery backup completed", "DR Complete", 100.0
            )
        ]
        
        db_session.add_all(dr_logs)
        
        # Complete backup operation
        backup_op.complete_operation(
            compressed_size=8589934592,  # 8GB compressed
            uncompressed_size=17179869184,  # 16GB uncompressed
            checksum_sha256="dr_backup_sha256_hash",
            r2_location="r2://dr-backups/dr_20240101.tar.gz",
            b2_location="b2://dr-backups/dr_20240101.tar.gz"
        )
        
        db_session.commit()
        
        # Verify complete disaster recovery workflow
        db_session.refresh(backup_op)
        db_session.refresh(dr_backup)
        db_session.refresh(rollback_point)
        
        # Check backup operation
        assert backup_op.status == OperationStatus.COMPLETED
        assert backup_op.operation_type == BackupType.DISASTER_RECOVERY
        assert backup_op.compression_ratio == 50.0  # 50% compression
        
        # Check disaster recovery backup
        assert dr_backup.backup_operation.id == backup_op.id
        assert dr_backup.created_rollback_point.id == rollback_point.id
        assert dr_backup.is_complete_backup() is True
        assert dr_backup.get_total_size() == 8589934592  # Sum of all component sizes
        
        # Check rollback point
        assert rollback_point.created_by_operation.id == backup_op.id
        assert rollback_point.system_state["services"] == ["backend", "postgres", "redis"]
        assert rollback_point.can_perform_rollback() is False  # Not verified yet
        
        # Verify rollback point integrity
        rollback_point.verify_integrity("rollback_sha256_checksum")
        db_session.commit()
        
        assert rollback_point.can_perform_rollback() is True
        
        # Check operation logs
        assert len(backup_op.logs) == 5
        log_steps = [log.step_name for log in backup_op.logs]
        assert "Create Rollback" in log_steps
        assert "DR Complete" in log_steps
    
    def test_cascade_delete_relationships(self, db_session: Session):
        """Test cascade delete behavior for related models"""
        # Create backup operation with related models
        backup_op = BackupOperation(
            operation_type=BackupType.DISASTER_RECOVERY,
            storage_providers=["cloudflare_r2"]
        )
        db_session.add(backup_op)
        db_session.commit()
        
        # Create disaster recovery backup
        dr_backup = DisasterRecoveryBackup(
            backup_operation_id=backup_op.id,
            backup_type=DisasterRecoveryType.FULL_SYSTEM
        )
        db_session.add(dr_backup)
        
        # Create operation logs
        logs = [
            OperationLog.log_info(
                str(backup_op.id), "BACKUP", f"Log {i}", f"Step {i}", i*20.0
            )
            for i in range(3)
        ]
        db_session.add_all(logs)
        db_session.commit()
        
        # Verify relationships exist
        db_session.refresh(backup_op)
        assert backup_op.disaster_recovery_backup is not None
        assert len(backup_op.logs) == 3
        
        # Delete backup operation (should cascade to logs but not DR backup)
        backup_op_id = backup_op.id
        dr_backup_id = dr_backup.id
        
        db_session.delete(backup_op)
        db_session.commit()
        
        # Verify cascade behavior
        # Logs should be deleted (cascade="all, delete-orphan")
        remaining_logs = db_session.query(OperationLog).filter(
            OperationLog.operation_id == backup_op_id
        ).all()
        assert len(remaining_logs) == 0
        
        # DR backup should still exist (no cascade delete configured)
        remaining_dr_backup = db_session.query(DisasterRecoveryBackup).filter(
            DisasterRecoveryBackup.id == dr_backup_id
        ).first()
        assert remaining_dr_backup is not None
    
    def test_query_operations_with_joins(self, db_session: Session):
        """Test querying operations with joined related data"""
        # Create multiple backup operations with different types
        tenant_backup = BackupOperation(
            operation_type=BackupType.TENANT,
            storage_providers=["cloudflare_r2"],
            status=OperationStatus.COMPLETED
        )
        
        dr_backup_op = BackupOperation(
            operation_type=BackupType.DISASTER_RECOVERY,
            storage_providers=["backblaze_b2"],
            status=OperationStatus.IN_PROGRESS
        )
        
        db_session.add_all([tenant_backup, dr_backup_op])
        db_session.commit()
        
        # Create disaster recovery backup for DR operation
        dr_backup = DisasterRecoveryBackup(
            backup_operation_id=dr_backup_op.id,
            backup_type=DisasterRecoveryType.FULL_SYSTEM
        )
        db_session.add(dr_backup)
        
        # Create logs for both operations
        tenant_logs = [
            OperationLog.log_info(
                str(tenant_backup.id), "BACKUP", "Tenant log", "Tenant Step", 50.0
            )
        ]
        
        dr_logs = [
            OperationLog.log_info(
                str(dr_backup_op.id), "DISASTER_RECOVERY", "DR log", "DR Step", 25.0
            )
        ]
        
        db_session.add_all(tenant_logs + dr_logs)
        db_session.commit()
        
        # Query operations with joined logs
        operations_with_logs = db_session.query(BackupOperation).join(
            OperationLog
        ).all()
        
        assert len(operations_with_logs) == 2
        
        # Query only disaster recovery operations with DR backup data
        dr_operations = db_session.query(BackupOperation).join(
            DisasterRecoveryBackup
        ).filter(
            BackupOperation.operation_type == BackupType.DISASTER_RECOVERY
        ).all()
        
        assert len(dr_operations) == 1
        assert dr_operations[0].id == dr_backup_op.id
        
        # Query operations by status with log count
        from sqlalchemy import func
        
        operations_with_log_count = db_session.query(
            BackupOperation,
            func.count(OperationLog.id).label('log_count')
        ).outerjoin(OperationLog).group_by(BackupOperation.id).all()
        
        assert len(operations_with_log_count) == 2
        
        # Each operation should have 1 log
        for operation, log_count in operations_with_log_count:
            assert log_count == 1