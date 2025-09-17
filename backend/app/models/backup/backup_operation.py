"""
Enhanced BackupOperation model with progress tracking and dual storage support
"""

from sqlalchemy import Column, String, DateTime, Boolean, Enum, Text, Numeric, Integer, Index, ForeignKey, Float
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from ..base import BaseModel


class BackupType(enum.Enum):
    """Enhanced backup type enumeration"""
    TENANT = "tenant"
    DISASTER_RECOVERY = "disaster_recovery"
    MANUAL = "manual"
    SCHEDULED = "scheduled"


class OperationStatus(enum.Enum):
    """Operation status enumeration"""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    PAUSED = "paused"


class StorageProvider(enum.Enum):
    """Storage provider enumeration"""
    CLOUDFLARE_R2 = "cloudflare_r2"
    BACKBLAZE_B2 = "backblaze_b2"
    LOCAL = "local"


class BackupOperation(BaseModel):
    """
    Enhanced backup operation model with progress tracking and dual storage support
    """
    __tablename__ = "backup_operations"
    
    # Operation Information
    operation_type = Column(
        Enum(BackupType), 
        nullable=False,
        comment="Type of backup operation"
    )
    
    status = Column(
        Enum(OperationStatus), 
        default=OperationStatus.PENDING,
        nullable=False,
        comment="Current operation status"
    )
    
    # Tenant Information (for tenant-specific backups)
    tenant_ids = Column(
        ARRAY(UUID(as_uuid=True)), 
        nullable=True,
        comment="List of tenant IDs included in backup"
    )
    
    # Storage Provider Configuration
    storage_providers = Column(
        ARRAY(String), 
        nullable=False,
        default=["cloudflare_r2", "backblaze_b2"],
        comment="List of storage providers to use"
    )
    
    # Progress Tracking
    progress_percentage = Column(
        Float, 
        default=0.0,
        nullable=False,
        comment="Current progress percentage (0-100)"
    )
    
    current_step = Column(
        String(255), 
        default="",
        nullable=False,
        comment="Current operation step description"
    )
    
    estimated_completion = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="Estimated completion time"
    )
    
    # File Information
    backup_file_path = Column(
        String(500), 
        nullable=True,
        comment="Local backup file path"
    )
    
    compressed_size = Column(
        Numeric(15, 0), 
        nullable=True,
        comment="Compressed backup file size in bytes"
    )
    
    uncompressed_size = Column(
        Numeric(15, 0), 
        nullable=True,
        comment="Uncompressed backup file size in bytes"
    )
    
    # Storage Locations
    r2_location = Column(
        String(500), 
        nullable=True,
        comment="Cloudflare R2 storage location"
    )
    
    b2_location = Column(
        String(500), 
        nullable=True,
        comment="Backblaze B2 storage location"
    )
    
    # Integrity Verification
    checksum_md5 = Column(
        String(32), 
        nullable=True,
        comment="MD5 checksum for integrity verification"
    )
    
    checksum_sha256 = Column(
        String(64), 
        nullable=True,
        comment="SHA256 checksum for integrity verification"
    )
    
    integrity_verified = Column(
        Boolean, 
        default=False,
        nullable=False,
        comment="Whether backup integrity has been verified"
    )
    
    # Timestamps
    started_at = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="Operation start time"
    )
    
    completed_at = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="Operation completion time"
    )
    
    # Error Handling
    error_message = Column(
        Text, 
        nullable=True,
        comment="Error message if operation failed"
    )
    
    retry_count = Column(
        Integer, 
        default=0,
        nullable=False,
        comment="Number of retry attempts"
    )
    
    max_retries = Column(
        Integer, 
        default=3,
        nullable=False,
        comment="Maximum number of retry attempts"
    )
    
    # Metadata
    backup_metadata = Column(
        JSONB, 
        nullable=True,
        comment="Additional backup metadata and configuration"
    )
    
    # Task Information
    celery_task_id = Column(
        String(255), 
        nullable=True,
        comment="Celery task ID for tracking"
    )
    
    # Relationships
    disaster_recovery_backup = relationship("DisasterRecoveryBackup", back_populates="backup_operation", uselist=False)
    logs = relationship("OperationLog", back_populates="operation", cascade="all, delete-orphan")
    rollback_points = relationship("RollbackPoint", back_populates="created_by_operation", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<BackupOperation(id={self.id}, type='{self.operation_type.value}', status='{self.status.value}')>"
    
    def start_operation(self):
        """Mark operation as started"""
        self.status = OperationStatus.IN_PROGRESS
        self.started_at = datetime.now(timezone.utc)
        self.current_step = "Starting backup operation"
        self.progress_percentage = 0.0
    
    def update_progress(self, percentage: float, step: str, estimated_completion: Optional[datetime] = None):
        """Update operation progress"""
        self.progress_percentage = min(100.0, max(0.0, percentage))
        self.current_step = step
        if estimated_completion:
            self.estimated_completion = estimated_completion
    
    def complete_operation(self, compressed_size: Optional[int] = None, 
                          uncompressed_size: Optional[int] = None,
                          checksum_md5: Optional[str] = None,
                          checksum_sha256: Optional[str] = None,
                          r2_location: Optional[str] = None,
                          b2_location: Optional[str] = None):
        """Mark operation as completed"""
        self.status = OperationStatus.COMPLETED
        self.completed_at = datetime.now(timezone.utc)
        self.progress_percentage = 100.0
        self.current_step = "Backup completed successfully"
        
        if compressed_size:
            self.compressed_size = compressed_size
        if uncompressed_size:
            self.uncompressed_size = uncompressed_size
        if checksum_md5:
            self.checksum_md5 = checksum_md5
        if checksum_sha256:
            self.checksum_sha256 = checksum_sha256
        if r2_location:
            self.r2_location = r2_location
        if b2_location:
            self.b2_location = b2_location
    
    def fail_operation(self, error_message: str):
        """Mark operation as failed"""
        self.status = OperationStatus.FAILED
        self.error_message = error_message
        self.completed_at = datetime.now(timezone.utc)
        self.current_step = f"Operation failed: {error_message}"
    
    def cancel_operation(self):
        """Cancel operation"""
        self.status = OperationStatus.CANCELLED
        self.completed_at = datetime.now(timezone.utc)
        self.current_step = "Operation cancelled by user"
    
    def pause_operation(self):
        """Pause operation"""
        self.status = OperationStatus.PAUSED
        self.current_step = "Operation paused"
    
    def resume_operation(self):
        """Resume paused operation"""
        if self.status == OperationStatus.PAUSED:
            self.status = OperationStatus.IN_PROGRESS
            self.current_step = "Operation resumed"
    
    def increment_retry(self):
        """Increment retry count"""
        self.retry_count += 1
    
    def can_retry(self) -> bool:
        """Check if operation can be retried"""
        return self.retry_count < self.max_retries and self.status == OperationStatus.FAILED
    
    def verify_integrity(self):
        """Mark integrity as verified"""
        self.integrity_verified = True
    
    @property
    def duration_seconds(self) -> Optional[int]:
        """Calculate operation duration in seconds"""
        if self.started_at and self.completed_at:
            delta = self.completed_at - self.started_at
            return int(delta.total_seconds())
        return None
    
    @property
    def compression_ratio(self) -> Optional[float]:
        """Calculate compression ratio percentage"""
        if self.uncompressed_size and self.compressed_size:
            return (1 - (self.compressed_size / self.uncompressed_size)) * 100
        return None
    
    @property
    def is_successful(self) -> bool:
        """Check if operation was successful"""
        return self.status == OperationStatus.COMPLETED
    
    @property
    def is_running(self) -> bool:
        """Check if operation is currently running"""
        return self.status in [OperationStatus.PENDING, OperationStatus.IN_PROGRESS]
    
    @property
    def storage_locations(self) -> Dict[str, Optional[str]]:
        """Get all storage locations as dictionary"""
        return {
            "cloudflare_r2": self.r2_location,
            "backblaze_b2": self.b2_location
        }
    
    def get_tenant_count(self) -> int:
        """Get number of tenants in backup"""
        return len(self.tenant_ids) if self.tenant_ids else 0


# Create indexes for performance optimization
Index('idx_backup_operation_type', BackupOperation.operation_type)
Index('idx_backup_operation_status', BackupOperation.status)
Index('idx_backup_operation_started_at', BackupOperation.started_at)
Index('idx_backup_operation_completed_at', BackupOperation.completed_at)
Index('idx_backup_operation_celery_task', BackupOperation.celery_task_id)
Index('idx_backup_operation_tenant_ids', BackupOperation.tenant_ids, postgresql_using='gin')
Index('idx_backup_operation_progress', BackupOperation.progress_percentage)
Index('idx_backup_operation_integrity', BackupOperation.integrity_verified)