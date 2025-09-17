"""
DisasterRecoveryBackup and RollbackPoint models for system snapshot capabilities
"""

from sqlalchemy import Column, String, DateTime, Boolean, Enum, Text, Numeric, Integer, Index, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List
from ..base import BaseModel


class DisasterRecoveryType(enum.Enum):
    """Disaster recovery backup type enumeration"""
    FULL_SYSTEM = "full_system"
    CONTAINERS_ONLY = "containers_only"
    VOLUMES_ONLY = "volumes_only"
    CONFIGS_ONLY = "configs_only"
    DATABASE_ONLY = "database_only"


class DisasterRecoveryBackup(BaseModel):
    """
    Disaster recovery backup model with system snapshot capabilities
    """
    __tablename__ = "disaster_recovery_backups"
    
    # Reference to base backup operation
    backup_operation_id = Column(
        UUID(as_uuid=True), 
        ForeignKey("backup_operations.id"),
        nullable=False,
        comment="Reference to base backup operation"
    )
    
    # Backup Configuration
    backup_type = Column(
        Enum(DisasterRecoveryType), 
        nullable=False,
        comment="Type of disaster recovery backup"
    )
    
    # Backup Content Flags
    includes_containers = Column(
        Boolean, 
        default=True,
        nullable=False,
        comment="Whether backup includes Docker containers"
    )
    
    includes_volumes = Column(
        Boolean, 
        default=True,
        nullable=False,
        comment="Whether backup includes Docker volumes"
    )
    
    includes_configs = Column(
        Boolean, 
        default=True,
        nullable=False,
        comment="Whether backup includes configuration files"
    )
    
    includes_database = Column(
        Boolean, 
        default=True,
        nullable=False,
        comment="Whether backup includes database"
    )
    
    # System Snapshot Information
    docker_compose_version = Column(
        String(50), 
        nullable=True,
        comment="Docker Compose version at backup time"
    )
    
    container_versions = Column(
        JSONB, 
        nullable=True,
        comment="Container image versions and tags"
    )
    
    volume_mappings = Column(
        JSONB, 
        nullable=True,
        comment="Docker volume mappings and configurations"
    )
    
    environment_variables = Column(
        JSONB, 
        nullable=True,
        comment="Environment variables and configurations"
    )
    
    network_configurations = Column(
        JSONB, 
        nullable=True,
        comment="Docker network configurations"
    )
    
    # System State
    system_state = Column(
        JSONB, 
        nullable=True,
        comment="Complete system state snapshot"
    )
    
    container_states = Column(
        JSONB, 
        nullable=True,
        comment="Individual container states and configurations"
    )
    
    # Backup File Information
    containers_backup_path = Column(
        String(500), 
        nullable=True,
        comment="Path to containers backup file"
    )
    
    volumes_backup_path = Column(
        String(500), 
        nullable=True,
        comment="Path to volumes backup file"
    )
    
    configs_backup_path = Column(
        String(500), 
        nullable=True,
        comment="Path to configurations backup file"
    )
    
    database_backup_path = Column(
        String(500), 
        nullable=True,
        comment="Path to database backup file"
    )
    
    # Size Information
    containers_size = Column(
        Numeric(15, 0), 
        nullable=True,
        comment="Size of containers backup in bytes"
    )
    
    volumes_size = Column(
        Numeric(15, 0), 
        nullable=True,
        comment="Size of volumes backup in bytes"
    )
    
    configs_size = Column(
        Numeric(15, 0), 
        nullable=True,
        comment="Size of configurations backup in bytes"
    )
    
    database_size = Column(
        Numeric(15, 0), 
        nullable=True,
        comment="Size of database backup in bytes"
    )
    
    # Rollback Point
    created_rollback_point_id = Column(
        UUID(as_uuid=True), 
        ForeignKey("rollback_points.id"),
        nullable=True,
        comment="Rollback point created during this backup"
    )
    
    # Platform Information
    platform_version = Column(
        String(100), 
        nullable=True,
        comment="HesaabPlus platform version at backup time"
    )
    
    os_information = Column(
        JSONB, 
        nullable=True,
        comment="Operating system information"
    )
    
    # Relationships
    backup_operation = relationship("BackupOperation", back_populates="disaster_recovery_backup")
    created_rollback_point = relationship("RollbackPoint", foreign_keys=[created_rollback_point_id])
    
    def __repr__(self):
        return f"<DisasterRecoveryBackup(id={self.id}, type='{self.backup_type.value}')>"
    
    def get_total_size(self) -> int:
        """Calculate total backup size"""
        total = 0
        if self.containers_size:
            total += self.containers_size
        if self.volumes_size:
            total += self.volumes_size
        if self.configs_size:
            total += self.configs_size
        if self.database_size:
            total += self.database_size
        return total
    
    def get_backup_components(self) -> List[str]:
        """Get list of included backup components"""
        components = []
        if self.includes_containers:
            components.append("containers")
        if self.includes_volumes:
            components.append("volumes")
        if self.includes_configs:
            components.append("configs")
        if self.includes_database:
            components.append("database")
        return components
    
    def is_complete_backup(self) -> bool:
        """Check if this is a complete system backup"""
        return (self.includes_containers and 
                self.includes_volumes and 
                self.includes_configs and 
                self.includes_database)


class RollbackPoint(BaseModel):
    """
    Rollback point model for disaster recovery rollback functionality
    """
    __tablename__ = "rollback_points"
    
    # Basic Information
    description = Column(
        String(500), 
        nullable=False,
        comment="Description of the rollback point"
    )
    
    created_by_operation_id = Column(
        UUID(as_uuid=True), 
        ForeignKey("backup_operations.id"),
        nullable=False,
        comment="Backup operation that created this rollback point"
    )
    
    # System State Snapshot
    system_state = Column(
        JSONB, 
        nullable=False,
        comment="Complete system state at rollback point creation"
    )
    
    container_states = Column(
        JSONB, 
        nullable=False,
        comment="Container states and configurations"
    )
    
    volume_snapshots = Column(
        JSONB, 
        nullable=False,
        comment="Volume snapshots and data locations"
    )
    
    database_state = Column(
        JSONB, 
        nullable=True,
        comment="Database state and schema information"
    )
    
    # Storage Information
    rollback_data_location = Column(
        String(500), 
        nullable=False,
        comment="Location of rollback data files"
    )
    
    rollback_size = Column(
        Numeric(15, 0), 
        nullable=False,
        comment="Total size of rollback data in bytes"
    )
    
    # Timestamps
    expires_at = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="Rollback point expiration time"
    )
    
    # Status
    is_active = Column(
        Boolean, 
        default=True,
        nullable=False,
        comment="Whether rollback point is active"
    )
    
    can_rollback = Column(
        Boolean, 
        default=True,
        nullable=False,
        comment="Whether rollback is possible"
    )
    
    # Verification
    integrity_verified = Column(
        Boolean, 
        default=False,
        nullable=False,
        comment="Whether rollback point integrity is verified"
    )
    
    verification_checksum = Column(
        String(64), 
        nullable=True,
        comment="Checksum for rollback point verification"
    )
    
    # Usage Information
    rollback_count = Column(
        Integer, 
        default=0,
        nullable=False,
        comment="Number of times this rollback point was used"
    )
    
    last_rollback_at = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="Last time this rollback point was used"
    )
    
    # Relationships
    created_by_operation = relationship("BackupOperation")
    
    def __repr__(self):
        return f"<RollbackPoint(id={self.id}, description='{self.description[:50]}...')>"
    
    def is_expired(self) -> bool:
        """Check if rollback point has expired"""
        if not self.expires_at:
            return False
        return datetime.now(timezone.utc) > self.expires_at
    
    def can_perform_rollback(self) -> bool:
        """Check if rollback can be performed"""
        return (self.is_active and 
                self.can_rollback and 
                not self.is_expired() and 
                self.integrity_verified)
    
    def mark_rollback_used(self):
        """Mark rollback point as used"""
        self.rollback_count += 1
        self.last_rollback_at = datetime.now(timezone.utc)
    
    def verify_integrity(self, checksum: str):
        """Verify rollback point integrity"""
        self.verification_checksum = checksum
        self.integrity_verified = True
    
    def disable_rollback(self, reason: str = None):
        """Disable rollback capability"""
        self.can_rollback = False
        if reason and self.system_state:
            self.system_state["disabled_reason"] = reason
    
    def get_system_info(self) -> Dict[str, Any]:
        """Get system information summary"""
        return {
            "containers": len(self.container_states) if self.container_states else 0,
            "volumes": len(self.volume_snapshots) if self.volume_snapshots else 0,
            "size_mb": float(self.rollback_size) / (1024 * 1024) if self.rollback_size else 0,
            "created_at": self.created_at,
            "expires_at": self.expires_at,
            "rollback_count": self.rollback_count
        }


# Create indexes for performance optimization
Index('idx_disaster_recovery_backup_operation', DisasterRecoveryBackup.backup_operation_id)
Index('idx_disaster_recovery_type', DisasterRecoveryBackup.backup_type)
Index('idx_disaster_recovery_includes_containers', DisasterRecoveryBackup.includes_containers)
Index('idx_disaster_recovery_includes_volumes', DisasterRecoveryBackup.includes_volumes)
Index('idx_disaster_recovery_includes_database', DisasterRecoveryBackup.includes_database)
Index('idx_disaster_recovery_rollback_point', DisasterRecoveryBackup.created_rollback_point_id)

Index('idx_rollback_point_operation', RollbackPoint.created_by_operation_id)
Index('idx_rollback_point_active', RollbackPoint.is_active)
Index('idx_rollback_point_can_rollback', RollbackPoint.can_rollback)
Index('idx_rollback_point_expires_at', RollbackPoint.expires_at)
Index('idx_rollback_point_verified', RollbackPoint.integrity_verified)
Index('idx_rollback_point_created_at', RollbackPoint.created_at)