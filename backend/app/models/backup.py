"""
Backup and recovery system models
"""

from sqlalchemy import Column, String, DateTime, Boolean, Enum, Text, Numeric, Integer, Index, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from datetime import datetime, timezone
from .base import BaseModel


class BackupType(enum.Enum):
    """Backup type enumeration"""
    TENANT_DAILY = "tenant_daily"
    FULL_PLATFORM = "full_platform"
    MANUAL = "manual"
    CUSTOMER_SELF = "customer_self"


class BackupStatus(enum.Enum):
    """Backup status enumeration"""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class StorageProvider(enum.Enum):
    """Storage provider enumeration"""
    CLOUDFLARE_R2 = "cloudflare_r2"
    BACKBLAZE_B2 = "backblaze_b2"
    LOCAL = "local"


class BackupLog(BaseModel):
    """
    Backup operation log
    """
    __tablename__ = "backup_logs"
    
    # Backup Information
    backup_type = Column(
        Enum(BackupType), 
        nullable=False,
        comment="Type of backup"
    )
    
    status = Column(
        Enum(BackupStatus), 
        default=BackupStatus.PENDING,
        nullable=False,
        comment="Backup status"
    )
    
    # Tenant Information (for tenant-specific backups)
    tenant_id = Column(
        UUID(as_uuid=True), 
        ForeignKey("tenants.id"),
        nullable=True,
        comment="Tenant ID (for tenant-specific backups)"
    )
    
    # Backup Details
    backup_name = Column(
        String(255), 
        nullable=False,
        comment="Backup file name"
    )
    
    backup_path = Column(
        String(500), 
        nullable=True,
        comment="Local backup file path"
    )
    
    # File Information
    file_size = Column(
        Numeric(15, 0), 
        nullable=True,
        comment="Backup file size in bytes"
    )
    
    compressed_size = Column(
        Numeric(15, 0), 
        nullable=True,
        comment="Compressed file size in bytes"
    )
    
    checksum = Column(
        String(255), 
        nullable=True,
        comment="File checksum for integrity verification"
    )
    
    # Timing Information
    started_at = Column(
        DateTime(timezone=True),
        default=func.now(),
        nullable=False,
        comment="Backup start time"
    )
    
    completed_at = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="Backup completion time"
    )
    
    duration_seconds = Column(
        Integer, 
        nullable=True,
        comment="Backup duration in seconds"
    )
    
    # Storage Information
    storage_locations = Column(
        JSONB, 
        default=list,
        nullable=True,
        comment="List of storage locations where backup is stored"
    )
    
    # Error Information
    error_message = Column(
        Text, 
        nullable=True,
        comment="Error message if backup failed"
    )
    
    # Metadata
    backup_metadata = Column(
        JSONB, 
        nullable=True,
        comment="Additional backup metadata"
    )
    
    # Relationships
    tenant = relationship("Tenant")
    
    def __repr__(self):
        return f"<BackupLog(id={self.id}, type='{self.backup_type.value}', status='{self.status.value}')>"
    
    def start_backup(self):
        """Mark backup as started"""
        self.status = BackupStatus.IN_PROGRESS
        self.started_at = datetime.now(timezone.utc)
    
    def complete_backup(self, file_size: int = None, compressed_size: int = None, 
                       checksum: str = None, storage_locations: list = None):
        """Mark backup as completed"""
        self.status = BackupStatus.COMPLETED
        self.completed_at = datetime.now(timezone.utc)
        
        if self.started_at:
            delta = self.completed_at - self.started_at
            self.duration_seconds = int(delta.total_seconds())
        
        if file_size:
            self.file_size = file_size
        
        if compressed_size:
            self.compressed_size = compressed_size
        
        if checksum:
            self.checksum = checksum
        
        if storage_locations:
            self.storage_locations = storage_locations
    
    def fail_backup(self, error_message: str):
        """Mark backup as failed"""
        self.status = BackupStatus.FAILED
        self.error_message = error_message
        self.completed_at = datetime.now(timezone.utc)
        
        if self.started_at:
            delta = self.completed_at - self.started_at
            self.duration_seconds = int(delta.total_seconds())
    
    def cancel_backup(self):
        """Cancel backup operation"""
        self.status = BackupStatus.CANCELLED
        self.completed_at = datetime.now(timezone.utc)
    
    @property
    def compression_ratio(self) -> float:
        """Calculate compression ratio"""
        if self.file_size and self.compressed_size:
            return (1 - (self.compressed_size / self.file_size)) * 100
        return 0.0
    
    @property
    def is_successful(self) -> bool:
        """Check if backup was successful"""
        return self.status == BackupStatus.COMPLETED


class RestoreLog(BaseModel):
    """
    Restore operation log
    """
    __tablename__ = "restore_logs"
    
    # Restore Information
    backup_log_id = Column(
        UUID(as_uuid=True), 
        ForeignKey("backup_logs.id"),
        nullable=False,
        comment="Source backup log ID"
    )
    
    tenant_id = Column(
        UUID(as_uuid=True), 
        ForeignKey("tenants.id"),
        nullable=True,
        comment="Target tenant ID"
    )
    
    status = Column(
        Enum(BackupStatus), 
        default=BackupStatus.PENDING,
        nullable=False,
        comment="Restore status"
    )
    
    # Admin Information
    initiated_by = Column(
        UUID(as_uuid=True), 
        nullable=False,
        comment="Admin user who initiated restore"
    )
    
    # Timing Information
    started_at = Column(
        DateTime(timezone=True),
        default=func.now(),
        nullable=False,
        comment="Restore start time"
    )
    
    completed_at = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="Restore completion time"
    )
    
    duration_seconds = Column(
        Integer, 
        nullable=True,
        comment="Restore duration in seconds"
    )
    
    # Restore Details
    restore_point = Column(
        DateTime(timezone=True),
        nullable=False,
        comment="Backup date being restored"
    )
    
    # Error Information
    error_message = Column(
        Text, 
        nullable=True,
        comment="Error message if restore failed"
    )
    
    # Audit Information
    pre_restore_snapshot = Column(
        JSONB, 
        nullable=True,
        comment="Snapshot of data before restore"
    )
    
    # Relationships
    backup_log = relationship("BackupLog")
    tenant = relationship("Tenant")
    
    def __repr__(self):
        return f"<RestoreLog(id={self.id}, backup_id={self.backup_log_id}, status='{self.status.value}')>"
    
    def start_restore(self):
        """Mark restore as started"""
        self.status = BackupStatus.IN_PROGRESS
        self.started_at = datetime.now(timezone.utc)
    
    def complete_restore(self):
        """Mark restore as completed"""
        self.status = BackupStatus.COMPLETED
        self.completed_at = datetime.now(timezone.utc)
        
        if self.started_at:
            delta = self.completed_at - self.started_at
            self.duration_seconds = int(delta.total_seconds())
    
    def fail_restore(self, error_message: str):
        """Mark restore as failed"""
        self.status = BackupStatus.FAILED
        self.error_message = error_message
        self.completed_at = datetime.now(timezone.utc)
        
        if self.started_at:
            delta = self.completed_at - self.started_at
            self.duration_seconds = int(delta.total_seconds())


class StorageLocation(BaseModel):
    """
    Storage location configuration
    """
    __tablename__ = "storage_locations"
    
    # Location Information
    name = Column(
        String(255), 
        nullable=False,
        comment="Storage location name"
    )
    
    provider = Column(
        Enum(StorageProvider), 
        nullable=False,
        comment="Storage provider"
    )
    
    # Configuration
    endpoint = Column(
        String(500), 
        nullable=True,
        comment="Storage endpoint URL"
    )
    
    bucket_name = Column(
        String(255), 
        nullable=True,
        comment="Bucket or container name"
    )
    
    access_key = Column(
        String(255), 
        nullable=True,
        comment="Access key (encrypted)"
    )
    
    secret_key = Column(
        String(255), 
        nullable=True,
        comment="Secret key (encrypted)"
    )
    
    # Status
    is_active = Column(
        Boolean, 
        default=True,
        nullable=False,
        comment="Whether location is active"
    )
    
    is_primary = Column(
        Boolean, 
        default=False,
        nullable=False,
        comment="Whether this is the primary storage location"
    )
    
    # Usage Statistics
    total_backups = Column(
        Integer, 
        default=0,
        nullable=False,
        comment="Total number of backups stored"
    )
    
    total_size = Column(
        Numeric(15, 0), 
        default=0,
        nullable=False,
        comment="Total storage used in bytes"
    )
    
    last_backup_at = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="Last backup timestamp"
    )
    
    def __repr__(self):
        return f"<StorageLocation(id={self.id}, name='{self.name}', provider='{self.provider.value}')>"


# Create indexes for performance optimization
Index('idx_backup_log_type', BackupLog.backup_type)
Index('idx_backup_log_status', BackupLog.status)
Index('idx_backup_log_tenant', BackupLog.tenant_id)
Index('idx_backup_log_started_at', BackupLog.started_at)
Index('idx_backup_log_completed_at', BackupLog.completed_at)

Index('idx_restore_log_backup', RestoreLog.backup_log_id)
Index('idx_restore_log_tenant', RestoreLog.tenant_id)
Index('idx_restore_log_status', RestoreLog.status)
Index('idx_restore_log_initiated_by', RestoreLog.initiated_by)
Index('idx_restore_log_started_at', RestoreLog.started_at)

class CustomerBackupLog(BaseModel):
    """
    Customer self-backup operation log
    """
    __tablename__ = "customer_backup_logs"
    
    # Tenant Information
    tenant_id = Column(
        UUID(as_uuid=True), 
        ForeignKey("tenants.id"),
        nullable=False,
        comment="Tenant ID"
    )
    
    # User Information
    initiated_by = Column(
        UUID(as_uuid=True), 
        ForeignKey("users.id"),
        nullable=False,
        comment="User who initiated the backup"
    )
    
    # Task Information
    task_id = Column(
        String(255), 
        nullable=True,
        comment="Celery task ID for tracking backup progress"
    )
    
    # Backup Details
    backup_name = Column(
        String(255), 
        nullable=False,
        comment="Backup file name"
    )
    
    status = Column(
        Enum(BackupStatus), 
        default=BackupStatus.PENDING,
        nullable=False,
        comment="Backup status"
    )
    
    # File Information
    local_file_path = Column(
        String(500), 
        nullable=True,
        comment="Local temporary file path"
    )
    
    file_size = Column(
        Numeric(15, 0), 
        nullable=True,
        comment="Backup file size in bytes"
    )
    
    compressed_size = Column(
        Numeric(15, 0), 
        nullable=True,
        comment="Compressed file size in bytes"
    )
    
    checksum = Column(
        String(255), 
        nullable=True,
        comment="File checksum for integrity verification"
    )
    
    # Download Information
    download_token = Column(
        String(255), 
        nullable=True,
        unique=True,
        comment="Secure download token"
    )
    
    download_expires_at = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="Download link expiration time"
    )
    
    downloaded_at = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="When the backup was downloaded"
    )
    
    # Timing Information
    started_at = Column(
        DateTime(timezone=True),
        default=func.now(),
        nullable=False,
        comment="Backup start time"
    )
    
    completed_at = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="Backup completion time"
    )
    
    duration_seconds = Column(
        Integer, 
        nullable=True,
        comment="Backup duration in seconds"
    )
    
    # Error Information
    error_message = Column(
        Text, 
        nullable=True,
        comment="Error message if backup failed"
    )
    
    # Metadata
    backup_metadata = Column(
        JSONB, 
        nullable=True,
        comment="Additional backup metadata"
    )
    
    # Relationships
    tenant = relationship("Tenant")
    user = relationship("User")
    
    def __repr__(self):
        return f"<CustomerBackupLog(id={self.id}, tenant_id={self.tenant_id}, status='{self.status.value}')>"
    
    def start_backup(self):
        """Mark backup as started"""
        self.status = BackupStatus.IN_PROGRESS
        self.started_at = datetime.now(timezone.utc)
    
    def complete_backup(self, file_size: int = None, compressed_size: int = None, 
                       checksum: str = None, download_token: str = None, 
                       download_expires_at: datetime = None):
        """Mark backup as completed"""
        self.status = BackupStatus.COMPLETED
        self.completed_at = datetime.now(timezone.utc)
        
        if self.started_at:
            delta = self.completed_at - self.started_at
            self.duration_seconds = int(delta.total_seconds())
        
        if file_size:
            self.file_size = file_size
        
        if compressed_size:
            self.compressed_size = compressed_size
        
        if checksum:
            self.checksum = checksum
        
        if download_token:
            self.download_token = download_token
        
        if download_expires_at:
            self.download_expires_at = download_expires_at
    
    def fail_backup(self, error_message: str):
        """Mark backup as failed"""
        self.status = BackupStatus.FAILED
        self.error_message = error_message
        self.completed_at = datetime.now(timezone.utc)
        
        if self.started_at:
            delta = self.completed_at - self.started_at
            self.duration_seconds = int(delta.total_seconds())
    
    def mark_downloaded(self):
        """Mark backup as downloaded"""
        self.downloaded_at = datetime.now(timezone.utc)
    
    @property
    def is_download_expired(self) -> bool:
        """Check if download link has expired"""
        if not self.download_expires_at:
            return True
        return datetime.now(timezone.utc) > self.download_expires_at
    
    @property
    def is_successful(self) -> bool:
        """Check if backup was successful"""
        return self.status == BackupStatus.COMPLETED


Index('idx_storage_location_provider', StorageLocation.provider)
Index('idx_storage_location_active', StorageLocation.is_active)
Index('idx_storage_location_primary', StorageLocation.is_primary)

# Customer backup indexes
Index('idx_customer_backup_tenant', CustomerBackupLog.tenant_id)
Index('idx_customer_backup_user', CustomerBackupLog.initiated_by)
Index('idx_customer_backup_status', CustomerBackupLog.status)
Index('idx_customer_backup_started_at', CustomerBackupLog.started_at)
Index('idx_customer_backup_download_token', CustomerBackupLog.download_token)
Index('idx_customer_backup_expires_at', CustomerBackupLog.download_expires_at)


class ExportFormat(enum.Enum):
    """Export format enumeration"""
    CSV = "csv"
    JSON = "json"


class ExportType(enum.Enum):
    """Export type enumeration"""
    MANUAL = "manual"
    SCHEDULED = "scheduled"
    AUTOMATED = "automated"


class ExportStatus(enum.Enum):
    """Export status enumeration"""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class DataExportLog(BaseModel):
    """
    Data export operation log for CSV/JSON exports
    """
    __tablename__ = "data_export_logs"
    
    # Tenant Information
    tenant_id = Column(
        UUID(as_uuid=True), 
        ForeignKey("tenants.id"),
        nullable=False,
        comment="Tenant ID"
    )
    
    # User Information
    initiated_by = Column(
        UUID(as_uuid=True), 
        ForeignKey("users.id"),
        nullable=False,
        comment="User who initiated the export"
    )
    
    # Task Information
    task_id = Column(
        String(255), 
        nullable=True,
        comment="Celery task ID for tracking export progress"
    )
    
    # Export Details
    export_name = Column(
        String(255), 
        nullable=False,
        comment="Export file name"
    )
    
    export_format = Column(
        Enum(ExportFormat), 
        nullable=False,
        comment="Export format (CSV or JSON)"
    )
    
    export_type = Column(
        Enum(ExportType), 
        nullable=False,
        comment="Export type (manual, scheduled, automated)"
    )
    
    status = Column(
        Enum(ExportStatus), 
        default=ExportStatus.PENDING,
        nullable=False,
        comment="Export status"
    )
    
    # Export Configuration
    exported_tables = Column(
        JSONB, 
        nullable=True,
        comment="List of tables included in export"
    )
    
    total_records = Column(
        Integer, 
        default=0,
        nullable=False,
        comment="Total number of records exported"
    )
    
    # File Information
    local_file_path = Column(
        String(500), 
        nullable=True,
        comment="Local temporary file path"
    )
    
    file_size = Column(
        Numeric(15, 0), 
        nullable=True,
        comment="Export file size in bytes"
    )
    
    compressed_size = Column(
        Numeric(15, 0), 
        nullable=True,
        comment="Compressed file size in bytes"
    )
    
    checksum = Column(
        String(255), 
        nullable=True,
        comment="File checksum for integrity verification"
    )
    
    # Download Information
    download_token = Column(
        String(255), 
        nullable=True,
        unique=True,
        comment="Secure download token"
    )
    
    download_expires_at = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="Download link expiration time"
    )
    
    downloaded_at = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="When the export was downloaded"
    )
    
    # Timing Information
    started_at = Column(
        DateTime(timezone=True),
        default=func.now(),
        nullable=False,
        comment="Export start time"
    )
    
    completed_at = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="Export completion time"
    )
    
    duration_seconds = Column(
        Integer, 
        nullable=True,
        comment="Export duration in seconds"
    )
    
    # Error Information
    error_message = Column(
        Text, 
        nullable=True,
        comment="Error message if export failed"
    )
    
    # Metadata
    export_metadata = Column(
        JSONB, 
        nullable=True,
        comment="Additional export metadata"
    )
    
    # Relationships
    tenant = relationship("Tenant")
    user = relationship("User")
    
    def __repr__(self):
        return f"<DataExportLog(id={self.id}, tenant_id={self.tenant_id}, format='{self.export_format.value}', status='{self.status.value}')>"
    
    def start_export(self):
        """Mark export as started"""
        self.status = ExportStatus.IN_PROGRESS
        self.started_at = datetime.now(timezone.utc)
    
    def complete_export(self, file_size: int = None, compressed_size: int = None, 
                       checksum: str = None, download_token: str = None, 
                       download_expires_at: datetime = None, exported_tables: list = None,
                       total_records: int = None):
        """Mark export as completed"""
        self.status = ExportStatus.COMPLETED
        self.completed_at = datetime.now(timezone.utc)
        
        if self.started_at:
            delta = self.completed_at - self.started_at
            self.duration_seconds = int(delta.total_seconds())
        
        if file_size:
            self.file_size = file_size
        
        if compressed_size:
            self.compressed_size = compressed_size
        
        if checksum:
            self.checksum = checksum
        
        if download_token:
            self.download_token = download_token
        
        if download_expires_at:
            self.download_expires_at = download_expires_at
        
        if exported_tables:
            self.exported_tables = exported_tables
        
        if total_records is not None:
            self.total_records = total_records
    
    def fail_export(self, error_message: str):
        """Mark export as failed"""
        self.status = ExportStatus.FAILED
        self.error_message = error_message
        self.completed_at = datetime.now(timezone.utc)
        
        if self.started_at:
            delta = self.completed_at - self.started_at
            self.duration_seconds = int(delta.total_seconds())
    
    def mark_downloaded(self):
        """Mark export as downloaded"""
        self.downloaded_at = datetime.now(timezone.utc)
    
    @property
    def is_download_expired(self) -> bool:
        """Check if download link has expired"""
        if not self.download_expires_at:
            return True
        return datetime.now(timezone.utc) > self.download_expires_at
    
    @property
    def is_successful(self) -> bool:
        """Check if export was successful"""
        return self.status == ExportStatus.COMPLETED
    
    @property
    def compression_ratio(self) -> float:
        """Calculate compression ratio"""
        if self.file_size and self.compressed_size:
            return (1 - (self.compressed_size / self.file_size)) * 100
        return 0.0


class ExportSchedule(BaseModel):
    """
    Scheduled export configuration
    """
    __tablename__ = "export_schedules"
    
    # Tenant Information
    tenant_id = Column(
        UUID(as_uuid=True), 
        ForeignKey("tenants.id"),
        nullable=False,
        comment="Tenant ID"
    )
    
    # Schedule Configuration
    name = Column(
        String(255), 
        nullable=False,
        comment="Schedule name"
    )
    
    description = Column(
        Text, 
        nullable=True,
        comment="Schedule description"
    )
    
    export_format = Column(
        Enum(ExportFormat), 
        nullable=False,
        comment="Export format (CSV or JSON)"
    )
    
    # Tables to Export
    tables_to_export = Column(
        JSONB, 
        nullable=False,
        comment="List of tables to include in export"
    )
    
    # Schedule Configuration
    cron_expression = Column(
        String(100), 
        nullable=False,
        comment="Cron expression for schedule"
    )
    
    timezone = Column(
        String(50), 
        default="UTC",
        nullable=False,
        comment="Timezone for schedule"
    )
    
    # Status
    is_active = Column(
        Boolean, 
        default=True,
        nullable=False,
        comment="Whether schedule is active"
    )
    
    # Execution Information
    last_run_at = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="Last execution time"
    )
    
    next_run_at = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="Next scheduled execution time"
    )
    
    last_export_id = Column(
        UUID(as_uuid=True), 
        ForeignKey("data_export_logs.id"),
        nullable=True,
        comment="Last export log ID"
    )
    
    # Statistics
    total_runs = Column(
        Integer, 
        default=0,
        nullable=False,
        comment="Total number of executions"
    )
    
    successful_runs = Column(
        Integer, 
        default=0,
        nullable=False,
        comment="Number of successful executions"
    )
    
    failed_runs = Column(
        Integer, 
        default=0,
        nullable=False,
        comment="Number of failed executions"
    )
    
    # Relationships
    tenant = relationship("Tenant")
    last_export = relationship("DataExportLog")
    
    def __repr__(self):
        return f"<ExportSchedule(id={self.id}, tenant_id={self.tenant_id}, name='{self.name}', active={self.is_active})>"
    
    def update_execution_stats(self, success: bool):
        """Update execution statistics"""
        self.total_runs += 1
        self.last_run_at = datetime.now(timezone.utc)
        
        if success:
            self.successful_runs += 1
        else:
            self.failed_runs += 1
    
    @property
    def success_rate(self) -> float:
        """Calculate success rate percentage"""
        if self.total_runs == 0:
            return 0.0
        return (self.successful_runs / self.total_runs) * 100


# Data export indexes
Index('idx_data_export_tenant', DataExportLog.tenant_id)
Index('idx_data_export_user', DataExportLog.initiated_by)
Index('idx_data_export_status', DataExportLog.status)
Index('idx_data_export_format', DataExportLog.export_format)
Index('idx_data_export_type', DataExportLog.export_type)
Index('idx_data_export_started_at', DataExportLog.started_at)
Index('idx_data_export_download_token', DataExportLog.download_token)
Index('idx_data_export_expires_at', DataExportLog.download_expires_at)

# Export schedule indexes
Index('idx_export_schedule_tenant', ExportSchedule.tenant_id)
Index('idx_export_schedule_active', ExportSchedule.is_active)
Index('idx_export_schedule_next_run', ExportSchedule.next_run_at)