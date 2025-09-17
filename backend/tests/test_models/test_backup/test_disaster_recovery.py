"""
Unit tests for DisasterRecoveryBackup and RollbackPoint models with real database operations
"""

import pytest
import uuid
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from app.models.backup.backup_operation import BackupOperation, BackupType, OperationStatus
from app.models.backup.disaster_recovery import (
    DisasterRecoveryBackup, DisasterRecoveryType, RollbackPoint
)


class TestDisasterRecoveryBackup:
    """Test DisasterRecoveryBackup model functionality"""
    
    def test_create_disaster_recovery_backup(self, db_session: Session):
        """Test creating a disaster recovery backup"""
        # Create base backup operation
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
            includes_database=True,
            docker_compose_version="2.20.0",
            container_versions={
                "postgres": "15-alpine",
                "redis": "7-alpine",
                "backend": "latest"
            },
            volume_mappings={
                "postgres_data": "/var/lib/postgresql/data",
                "redis_data": "/data"
            },
            environment_variables={
                "DATABASE_URL": "postgresql://...",
                "REDIS_URL": "redis://..."
            }
        )
        
        db_session.add(dr_backup)
        db_session.commit()
        db_session.refresh(dr_backup)
        
        # Verify creation
        assert dr_backup.id is not None
        assert dr_backup.backup_operation_id == backup_op.id
        assert dr_backup.backup_type == DisasterRecoveryType.FULL_SYSTEM
        assert dr_backup.includes_containers is True
        assert dr_backup.includes_volumes is True
        assert dr_backup.includes_configs is True
        assert dr_backup.includes_database is True
        assert dr_backup.docker_compose_version == "2.20.0"
        assert dr_backup.container_versions["postgres"] == "15-alpine"
        assert dr_backup.volume_mappings["postgres_data"] == "/var/lib/postgresql/data"
    
    def test_partial_disaster_recovery_backup(self, db_session: Session):
        """Test creating a partial disaster recovery backup"""
        # Create base backup operation
        backup_op = BackupOperation(
            operation_type=BackupType.DISASTER_RECOVERY,
            storage_providers=["cloudflare_r2"]
        )
        db_session.add(backup_op)
        db_session.commit()
        
        # Create containers-only backup
        dr_backup = DisasterRecoveryBackup(
            backup_operation_id=backup_op.id,
            backup_type=DisasterRecoveryType.CONTAINERS_ONLY,
            includes_containers=True,
            includes_volumes=False,
            includes_configs=False,
            includes_database=False
        )
        
        db_session.add(dr_backup)
        db_session.commit()
        
        # Verify partial backup
        assert dr_backup.backup_type == DisasterRecoveryType.CONTAINERS_ONLY
        assert dr_backup.includes_containers is True
        assert dr_backup.includes_volumes is False
        assert dr_backup.includes_configs is False
        assert dr_backup.includes_database is False
        assert dr_backup.is_complete_backup() is False
    
    def test_backup_file_paths_and_sizes(self, db_session: Session):
        """Test backup file paths and sizes"""
        # Create base backup operation
        backup_op = BackupOperation(
            operation_type=BackupType.DISASTER_RECOVERY,
            storage_providers=["backblaze_b2"]
        )
        db_session.add(backup_op)
        db_session.commit()
        
        # Create disaster recovery backup with file information
        dr_backup = DisasterRecoveryBackup(
            backup_operation_id=backup_op.id,
            backup_type=DisasterRecoveryType.FULL_SYSTEM,
            containers_backup_path="/backups/containers.tar.gz",
            volumes_backup_path="/backups/volumes.tar.gz",
            configs_backup_path="/backups/configs.tar.gz",
            database_backup_path="/backups/database.sql.gz",
            containers_size=500000000,  # 500MB
            volumes_size=1000000000,    # 1GB
            configs_size=10000000,      # 10MB
            database_size=200000000     # 200MB
        )
        
        db_session.add(dr_backup)
        db_session.commit()
        
        # Verify file information
        assert dr_backup.containers_backup_path == "/backups/containers.tar.gz"
        assert dr_backup.volumes_backup_path == "/backups/volumes.tar.gz"
        assert dr_backup.configs_backup_path == "/backups/configs.tar.gz"
        assert dr_backup.database_backup_path == "/backups/database.sql.gz"
        
        # Test total size calculation
        total_size = dr_backup.get_total_size()
        expected_total = 500000000 + 1000000000 + 10000000 + 200000000
        assert total_size == expected_total
    
    def test_backup_components(self, db_session: Session):
        """Test backup components functionality"""
        # Create base backup operation
        backup_op = BackupOperation(
            operation_type=BackupType.DISASTER_RECOVERY,
            storage_providers=["cloudflare_r2"]
        )
        db_session.add(backup_op)
        db_session.commit()
        
        # Create selective backup
        dr_backup = DisasterRecoveryBackup(
            backup_operation_id=backup_op.id,
            backup_type=DisasterRecoveryType.FULL_SYSTEM,
            includes_containers=True,
            includes_volumes=False,
            includes_configs=True,
            includes_database=True
        )
        
        db_session.add(dr_backup)
        db_session.commit()
        
        # Test component listing
        components = dr_backup.get_backup_components()
        expected_components = ["containers", "configs", "database"]
        assert set(components) == set(expected_components)
        assert "volumes" not in components
        
        # Test complete backup check
        assert dr_backup.is_complete_backup() is False
        
        # Make it complete
        dr_backup.includes_volumes = True
        db_session.commit()
        assert dr_backup.is_complete_backup() is True
    
    def test_system_state_information(self, db_session: Session):
        """Test system state and platform information"""
        # Create base backup operation
        backup_op = BackupOperation(
            operation_type=BackupType.DISASTER_RECOVERY,
            storage_providers=["cloudflare_r2", "backblaze_b2"]
        )
        db_session.add(backup_op)
        db_session.commit()
        
        # Create disaster recovery backup with system information
        system_state = {
            "cpu_count": 4,
            "memory_gb": 16,
            "disk_space_gb": 500,
            "docker_version": "24.0.0"
        }
        
        container_states = {
            "backend": {
                "image": "hesaabplus/backend:latest",
                "status": "running",
                "ports": ["8000:8000"]
            },
            "postgres": {
                "image": "postgres:15-alpine",
                "status": "running",
                "ports": ["5432:5432"]
            }
        }
        
        network_configs = {
            "hesaabplus_network": {
                "driver": "bridge",
                "subnet": "172.20.0.0/16"
            }
        }
        
        dr_backup = DisasterRecoveryBackup(
            backup_operation_id=backup_op.id,
            backup_type=DisasterRecoveryType.FULL_SYSTEM,
            system_state=system_state,
            container_states=container_states,
            network_configurations=network_configs,
            platform_version="2.1.0",
            os_information={
                "name": "Ubuntu",
                "version": "22.04",
                "architecture": "x86_64"
            }
        )
        
        db_session.add(dr_backup)
        db_session.commit()
        
        # Verify system information
        assert dr_backup.system_state["cpu_count"] == 4
        assert dr_backup.container_states["backend"]["image"] == "hesaabplus/backend:latest"
        assert dr_backup.network_configurations["hesaabplus_network"]["driver"] == "bridge"
        assert dr_backup.platform_version == "2.1.0"
        assert dr_backup.os_information["name"] == "Ubuntu"
    
    def test_disaster_recovery_backup_repr(self, db_session: Session):
        """Test string representation"""
        # Create base backup operation
        backup_op = BackupOperation(
            operation_type=BackupType.DISASTER_RECOVERY,
            storage_providers=["cloudflare_r2"]
        )
        db_session.add(backup_op)
        db_session.commit()
        
        dr_backup = DisasterRecoveryBackup(
            backup_operation_id=backup_op.id,
            backup_type=DisasterRecoveryType.CONTAINERS_ONLY
        )
        
        db_session.add(dr_backup)
        db_session.commit()
        
        repr_str = repr(dr_backup)
        assert "DisasterRecoveryBackup" in repr_str
        assert "containers_only" in repr_str
        assert str(dr_backup.id) in repr_str


class TestRollbackPoint:
    """Test RollbackPoint model functionality"""
    
    def test_create_rollback_point(self, db_session: Session):
        """Test creating a rollback point"""
        # Create base backup operation
        backup_op = BackupOperation(
            operation_type=BackupType.DISASTER_RECOVERY,
            storage_providers=["cloudflare_r2"]
        )
        db_session.add(backup_op)
        db_session.commit()
        
        # Create rollback point
        system_state = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "services_running": ["backend", "postgres", "redis"],
            "active_connections": 25
        }
        
        container_states = {
            "backend": {"status": "running", "uptime": "2d 5h"},
            "postgres": {"status": "running", "uptime": "2d 5h"},
            "redis": {"status": "running", "uptime": "2d 5h"}
        }
        
        volume_snapshots = {
            "postgres_data": {
                "size_mb": 1024,
                "snapshot_path": "/snapshots/postgres_data.tar.gz"
            },
            "redis_data": {
                "size_mb": 256,
                "snapshot_path": "/snapshots/redis_data.tar.gz"
            }
        }
        
        rollback_point = RollbackPoint(
            description="Pre-upgrade rollback point",
            created_by_operation_id=backup_op.id,
            system_state=system_state,
            container_states=container_states,
            volume_snapshots=volume_snapshots,
            rollback_data_location="/rollback/point_001",
            rollback_size=1342177280,  # ~1.25GB
            expires_at=datetime.now(timezone.utc) + timedelta(days=30)
        )
        
        db_session.add(rollback_point)
        db_session.commit()
        db_session.refresh(rollback_point)
        
        # Verify creation
        assert rollback_point.id is not None
        assert rollback_point.description == "Pre-upgrade rollback point"
        assert rollback_point.created_by_operation_id == backup_op.id
        assert rollback_point.system_state["services_running"] == ["backend", "postgres", "redis"]
        assert rollback_point.container_states["backend"]["status"] == "running"
        assert rollback_point.volume_snapshots["postgres_data"]["size_mb"] == 1024
        assert rollback_point.rollback_data_location == "/rollback/point_001"
        assert rollback_point.rollback_size == 1342177280
        assert rollback_point.is_active is True
        assert rollback_point.can_rollback is True
        assert rollback_point.integrity_verified is False
        assert rollback_point.rollback_count == 0
    
    def test_rollback_point_expiration(self, db_session: Session):
        """Test rollback point expiration functionality"""
        # Create base backup operation
        backup_op = BackupOperation(
            operation_type=BackupType.DISASTER_RECOVERY,
            storage_providers=["backblaze_b2"]
        )
        db_session.add(backup_op)
        db_session.commit()
        
        # Create expired rollback point
        expired_rollback = RollbackPoint(
            description="Expired rollback point",
            created_by_operation_id=backup_op.id,
            system_state={"test": "data"},
            container_states={"test": "data"},
            volume_snapshots={"test": "data"},
            rollback_data_location="/rollback/expired",
            rollback_size=1000000,
            expires_at=datetime.now(timezone.utc) - timedelta(days=1)  # Expired yesterday
        )
        
        db_session.add(expired_rollback)
        db_session.commit()
        
        # Test expiration
        assert expired_rollback.is_expired() is True
        assert expired_rollback.can_perform_rollback() is False
        
        # Create non-expired rollback point
        active_rollback = RollbackPoint(
            description="Active rollback point",
            created_by_operation_id=backup_op.id,
            system_state={"test": "data"},
            container_states={"test": "data"},
            volume_snapshots={"test": "data"},
            rollback_data_location="/rollback/active",
            rollback_size=1000000,
            expires_at=datetime.now(timezone.utc) + timedelta(days=30)
        )
        
        db_session.add(active_rollback)
        db_session.commit()
        
        # Test non-expiration
        assert active_rollback.is_expired() is False
        
        # Test rollback capability (needs verification first)
        active_rollback.verify_integrity("sha256checksum")
        db_session.commit()
        assert active_rollback.can_perform_rollback() is True
    
    def test_rollback_point_usage_tracking(self, db_session: Session):
        """Test rollback point usage tracking"""
        # Create base backup operation
        backup_op = BackupOperation(
            operation_type=BackupType.DISASTER_RECOVERY,
            storage_providers=["cloudflare_r2"]
        )
        db_session.add(backup_op)
        db_session.commit()
        
        # Create rollback point
        rollback_point = RollbackPoint(
            description="Usage tracking test",
            created_by_operation_id=backup_op.id,
            system_state={"test": "data"},
            container_states={"test": "data"},
            volume_snapshots={"test": "data"},
            rollback_data_location="/rollback/usage_test",
            rollback_size=1000000
        )
        
        db_session.add(rollback_point)
        db_session.commit()
        
        # Test initial state
        assert rollback_point.rollback_count == 0
        assert rollback_point.last_rollback_at is None
        
        # Mark as used
        rollback_point.mark_rollback_used()
        db_session.commit()
        
        # Verify usage tracking
        assert rollback_point.rollback_count == 1
        assert rollback_point.last_rollback_at is not None
        
        # Use again
        rollback_point.mark_rollback_used()
        db_session.commit()
        
        assert rollback_point.rollback_count == 2
    
    def test_rollback_point_integrity_verification(self, db_session: Session):
        """Test integrity verification functionality"""
        # Create base backup operation
        backup_op = BackupOperation(
            operation_type=BackupType.DISASTER_RECOVERY,
            storage_providers=["backblaze_b2"]
        )
        db_session.add(backup_op)
        db_session.commit()
        
        # Create rollback point
        rollback_point = RollbackPoint(
            description="Integrity test",
            created_by_operation_id=backup_op.id,
            system_state={"test": "data"},
            container_states={"test": "data"},
            volume_snapshots={"test": "data"},
            rollback_data_location="/rollback/integrity_test",
            rollback_size=1000000
        )
        
        db_session.add(rollback_point)
        db_session.commit()
        
        # Test initial state
        assert rollback_point.integrity_verified is False
        assert rollback_point.verification_checksum is None
        assert rollback_point.can_perform_rollback() is False
        
        # Verify integrity
        checksum = "sha256:abcdef123456789"
        rollback_point.verify_integrity(checksum)
        db_session.commit()
        
        # Test verified state
        assert rollback_point.integrity_verified is True
        assert rollback_point.verification_checksum == checksum
        assert rollback_point.can_perform_rollback() is True
    
    def test_disable_rollback_functionality(self, db_session: Session):
        """Test disabling rollback functionality"""
        # Create base backup operation
        backup_op = BackupOperation(
            operation_type=BackupType.DISASTER_RECOVERY,
            storage_providers=["cloudflare_r2"]
        )
        db_session.add(backup_op)
        db_session.commit()
        
        # Create rollback point
        rollback_point = RollbackPoint(
            description="Disable test",
            created_by_operation_id=backup_op.id,
            system_state={"test": "data"},
            container_states={"test": "data"},
            volume_snapshots={"test": "data"},
            rollback_data_location="/rollback/disable_test",
            rollback_size=1000000
        )
        
        db_session.add(rollback_point)
        db_session.commit()
        
        # Verify and enable rollback
        rollback_point.verify_integrity("checksum")
        db_session.commit()
        assert rollback_point.can_perform_rollback() is True
        
        # Disable rollback
        rollback_point.disable_rollback("System incompatibility detected")
        db_session.commit()
        
        # Test disabled state
        assert rollback_point.can_rollback is False
        assert rollback_point.can_perform_rollback() is False
        assert rollback_point.system_state["disabled_reason"] == "System incompatibility detected"
    
    def test_get_system_info(self, db_session: Session):
        """Test system information summary"""
        # Create base backup operation
        backup_op = BackupOperation(
            operation_type=BackupType.DISASTER_RECOVERY,
            storage_providers=["cloudflare_r2"]
        )
        db_session.add(backup_op)
        db_session.commit()
        
        # Create rollback point with detailed information
        container_states = {
            "backend": {"status": "running"},
            "postgres": {"status": "running"},
            "redis": {"status": "running"}
        }
        
        volume_snapshots = {
            "postgres_data": {"size_mb": 1024},
            "redis_data": {"size_mb": 256}
        }
        
        rollback_point = RollbackPoint(
            description="System info test",
            created_by_operation_id=backup_op.id,
            system_state={"test": "data"},
            container_states=container_states,
            volume_snapshots=volume_snapshots,
            rollback_data_location="/rollback/system_info_test",
            rollback_size=1342177280,  # ~1.25GB
            expires_at=datetime.now(timezone.utc) + timedelta(days=7)
        )
        
        db_session.add(rollback_point)
        db_session.commit()
        
        # Mark as used twice
        rollback_point.mark_rollback_used()
        rollback_point.mark_rollback_used()
        db_session.commit()
        
        # Get system info
        system_info = rollback_point.get_system_info()
        
        # Verify system info
        assert system_info["containers"] == 3
        assert system_info["volumes"] == 2
        assert abs(system_info["size_mb"] - 1280.0) < 1.0  # ~1.25GB in MB
        assert system_info["rollback_count"] == 2
        assert system_info["created_at"] == rollback_point.created_at
        assert system_info["expires_at"] == rollback_point.expires_at
    
    def test_rollback_point_repr(self, db_session: Session):
        """Test string representation"""
        # Create base backup operation
        backup_op = BackupOperation(
            operation_type=BackupType.DISASTER_RECOVERY,
            storage_providers=["cloudflare_r2"]
        )
        db_session.add(backup_op)
        db_session.commit()
        
        rollback_point = RollbackPoint(
            description="This is a very long description that should be truncated in the repr method",
            created_by_operation_id=backup_op.id,
            system_state={"test": "data"},
            container_states={"test": "data"},
            volume_snapshots={"test": "data"},
            rollback_data_location="/rollback/repr_test",
            rollback_size=1000000
        )
        
        db_session.add(rollback_point)
        db_session.commit()
        
        repr_str = repr(rollback_point)
        assert "RollbackPoint" in repr_str
        assert str(rollback_point.id) in repr_str
        assert "This is a very long description that should be trun" in repr_str
        assert "..." in repr_str