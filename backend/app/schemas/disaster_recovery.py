"""
Disaster Recovery Pydantic schemas
"""

from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from datetime import datetime
from enum import Enum


class BackupStatus(str, Enum):
    """Backup status enumeration"""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class StorageProvider(str, Enum):
    """Storage provider enumeration"""
    BACKBLAZE_B2 = "backblaze_b2"
    CLOUDFLARE_R2 = "cloudflare_r2"


class StorageLocation(BaseModel):
    """Storage location information"""
    provider: str = Field(..., description="Storage provider name")
    location: str = Field(..., description="Storage location URL")
    uploaded_at: str = Field(..., description="Upload timestamp")


class DisasterRecoveryBackupResponse(BaseModel):
    """Disaster recovery backup response"""
    backup_id: str = Field(..., description="Unique backup identifier")
    backup_name: str = Field(..., description="Backup name")
    created_at: str = Field(..., description="Backup creation timestamp")
    file_size: Optional[int] = Field(None, description="Original file size in bytes")
    compressed_size: Optional[int] = Field(None, description="Compressed file size in bytes")
    compression_ratio: Optional[float] = Field(None, description="Compression ratio percentage")
    checksum: Optional[str] = Field(None, description="File checksum for integrity")
    storage_locations: Optional[List[Dict[str, Any]]] = Field(None, description="Storage locations")
    duration_seconds: Optional[int] = Field(None, description="Backup duration in seconds")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional backup metadata")


class DisasterRecoveryBackupInfoResponse(BaseModel):
    """Detailed disaster recovery backup information"""
    backup_id: str = Field(..., description="Unique backup identifier")
    backup_name: str = Field(..., description="Backup name")
    backup_type: str = Field(..., description="Backup type")
    status: str = Field(..., description="Backup status")
    created_at: str = Field(..., description="Backup creation timestamp")
    completed_at: Optional[str] = Field(None, description="Backup completion timestamp")
    file_size: Optional[int] = Field(None, description="Original file size in bytes")
    compressed_size: Optional[int] = Field(None, description="Compressed file size in bytes")
    compression_ratio: Optional[float] = Field(None, description="Compression ratio percentage")
    checksum: Optional[str] = Field(None, description="File checksum for integrity")
    storage_locations: Optional[List[Dict[str, Any]]] = Field(None, description="Storage locations")
    duration_seconds: Optional[int] = Field(None, description="Backup duration in seconds")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional backup metadata")
    error_message: Optional[str] = Field(None, description="Error message if backup failed")


class DisasterRecoveryBackupListResponse(BaseModel):
    """List of disaster recovery backups"""
    backups: List[DisasterRecoveryBackupResponse] = Field(..., description="List of backups")
    total_count: int = Field(..., description="Total number of backups")


class DisasterRecoveryVerificationRequest(BaseModel):
    """Disaster recovery backup verification request"""
    backup_id: str = Field(..., description="Backup ID to verify")
    storage_provider: StorageProvider = Field(StorageProvider.BACKBLAZE_B2, description="Storage provider to verify against")


class DisasterRecoveryVerificationResponse(BaseModel):
    """Disaster recovery backup verification response"""
    status: str = Field(..., description="Verification status")
    backup_id: str = Field(..., description="Backup ID")
    storage_provider: str = Field(..., description="Storage provider")
    is_valid: bool = Field(..., description="Whether backup is valid")
    message: str = Field(..., description="Verification message")
    verified_at: str = Field(..., description="Verification timestamp")


class DisasterRecoveryMonitoringResponse(BaseModel):
    """Disaster recovery monitoring response"""
    status: str = Field(..., description="Overall monitoring status")
    timestamp: str = Field(..., description="Monitoring timestamp")
    backup_metrics: Dict[str, Any] = Field(..., description="Backup metrics")
    storage_connectivity: Dict[str, Any] = Field(..., description="Storage connectivity status")
    storage_usage: Dict[str, Any] = Field(..., description="Storage usage statistics")
    alerts: List[Dict[str, Any]] = Field(..., description="System alerts")


class DisasterRecoveryHealthResponse(BaseModel):
    """Disaster recovery health check response"""
    status: str = Field(..., description="Overall health status")
    health_score: int = Field(..., description="Health score (0-100)")
    total_backups: int = Field(..., description="Total number of backups")
    latest_backup: Optional[Dict[str, Any]] = Field(None, description="Latest backup information")
    storage_connectivity: Dict[str, Any] = Field(..., description="Storage connectivity status")
    issues: List[str] = Field(..., description="Identified issues")
    recommendations: List[str] = Field(..., description="Recommendations")


class DisasterRecoveryStorageStatusResponse(BaseModel):
    """Storage provider status response"""
    status: str = Field(..., description="Overall status")
    connectivity: Dict[str, Any] = Field(..., description="Connectivity test results")
    usage: Dict[str, Any] = Field(..., description="Storage usage statistics")
    providers: Dict[str, Any] = Field(..., description="Provider information")


class DisasterRecoveryTaskResponse(BaseModel):
    """Disaster recovery task response"""
    status: str = Field(..., description="Task status")
    message: str = Field(..., description="Task message")
    task_id: str = Field(..., description="Celery task ID")
    estimated_duration: Optional[str] = Field(None, description="Estimated completion time")


class DisasterRecoveryBackupCreateRequest(BaseModel):
    """Request to create disaster recovery backup"""
    include_configuration: bool = Field(True, description="Include container configuration")
    include_database: bool = Field(True, description="Include full database dump")
    retention_days: Optional[int] = Field(90, description="Backup retention in days")


class DisasterRecoveryRestoreRequest(BaseModel):
    """Request to restore from disaster recovery backup"""
    backup_id: str = Field(..., description="Backup ID to restore from")
    storage_provider: StorageProvider = Field(StorageProvider.BACKBLAZE_B2, description="Storage provider to restore from")
    restore_database: bool = Field(True, description="Restore database")
    restore_configuration: bool = Field(True, description="Restore configuration")
    confirmation_phrase: str = Field(..., description="Confirmation phrase (must be 'RESTORE PLATFORM')")


class DisasterRecoveryRestoreResponse(BaseModel):
    """Disaster recovery restore response"""
    status: str = Field(..., description="Restore status")
    message: str = Field(..., description="Restore message")
    task_id: str = Field(..., description="Celery task ID")
    backup_id: str = Field(..., description="Backup being restored")
    estimated_duration: str = Field(..., description="Estimated completion time")
    warnings: List[str] = Field(..., description="Important warnings")


class DisasterRecoveryMetrics(BaseModel):
    """Disaster recovery metrics"""
    total_backups: int = Field(..., description="Total number of backups")
    successful_backups: int = Field(..., description="Number of successful backups")
    failed_backups: int = Field(..., description="Number of failed backups")
    average_backup_size: Optional[float] = Field(None, description="Average backup size in bytes")
    average_compression_ratio: Optional[float] = Field(None, description="Average compression ratio")
    storage_usage_b2: Optional[int] = Field(None, description="Backblaze B2 storage usage in bytes")
    storage_usage_r2: Optional[int] = Field(None, description="Cloudflare R2 storage usage in bytes")
    last_backup_date: Optional[str] = Field(None, description="Last backup date")
    next_scheduled_backup: Optional[str] = Field(None, description="Next scheduled backup")


class DisasterRecoveryAlert(BaseModel):
    """Disaster recovery alert"""
    level: str = Field(..., description="Alert level (info, warning, critical)")
    message: str = Field(..., description="Alert message")
    recommendation: Optional[str] = Field(None, description="Recommended action")
    created_at: str = Field(..., description="Alert creation timestamp")
    resolved: bool = Field(False, description="Whether alert is resolved")


class DisasterRecoveryConfiguration(BaseModel):
    """Disaster recovery configuration"""
    backup_schedule: str = Field("0 2 * * *", description="Backup schedule (cron format)")
    retention_days: int = Field(90, description="Backup retention in days")
    verification_schedule: str = Field("0 3 * * 0", description="Verification schedule (cron format)")
    storage_providers: List[str] = Field(["backblaze_b2", "cloudflare_r2"], description="Enabled storage providers")
    encryption_enabled: bool = Field(True, description="Whether encryption is enabled")
    compression_enabled: bool = Field(True, description="Whether compression is enabled")
    monitoring_enabled: bool = Field(True, description="Whether monitoring is enabled")
    alert_thresholds: Dict[str, Any] = Field(
        {
            "backup_age_hours": 25,
            "success_rate_percentage": 90,
            "storage_connectivity_failures": 3
        },
        description="Alert thresholds"
    )