"""
Customer self-backup Pydantic schemas
"""

from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from datetime import datetime
from enum import Enum


class CustomerBackupStatusEnum(str, Enum):
    """Customer backup status enumeration"""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


# Request Schemas
class CustomerBackupCreateRequest(BaseModel):
    """Request schema for creating a customer backup"""
    # No additional fields needed - tenant_id and user_id come from auth
    
    class Config:
        json_schema_extra = {
            "example": {}
        }


# Response Schemas
class CustomerBackupResponse(BaseModel):
    """Response schema for customer backup operations"""
    status: str = Field(..., description="Operation status")
    message: str = Field(..., description="Status message")
    task_id: Optional[str] = Field(None, description="Celery task ID")
    tenant_id: Optional[str] = Field(None, description="Tenant ID")
    backup_id: Optional[str] = Field(None, description="Backup ID")
    
    class Config:
        json_schema_extra = {
            "example": {
                "status": "started",
                "message": "Customer backup task started",
                "task_id": "abc123-def456-ghi789",
                "tenant_id": "123e4567-e89b-12d3-a456-426614174000"
            }
        }


class CustomerBackupInfoSchema(BaseModel):
    """Schema for detailed customer backup information"""
    backup_id: str = Field(..., description="Backup ID")
    backup_name: str = Field(..., description="Backup name")
    status: str = Field(..., description="Backup status")
    created_at: str = Field(..., description="Creation timestamp")
    completed_at: Optional[str] = Field(None, description="Completion timestamp")
    file_size: Optional[int] = Field(None, description="Original file size in bytes")
    compressed_size: Optional[int] = Field(None, description="Compressed file size in bytes")
    checksum: Optional[str] = Field(None, description="File checksum")
    download_token: Optional[str] = Field(None, description="Download token (only when completed)")
    download_expires_at: Optional[str] = Field(None, description="Download expiration timestamp")
    downloaded_at: Optional[str] = Field(None, description="Download timestamp")
    is_download_expired: Optional[bool] = Field(None, description="Whether download link has expired")
    duration_seconds: Optional[int] = Field(None, description="Backup duration in seconds")
    error_message: Optional[str] = Field(None, description="Error message if failed")
    
    class Config:
        json_schema_extra = {
            "example": {
                "backup_id": "backup-123e4567-e89b-12d3-a456-426614174000",
                "backup_name": "customer_backup_123_20240101_120000",
                "status": "completed",
                "created_at": "2024-01-01T12:00:00Z",
                "completed_at": "2024-01-01T12:05:30Z",
                "file_size": 1048576,
                "compressed_size": 524288,
                "checksum": "abc123def456...",
                "download_token": "secure_download_token_123",
                "download_expires_at": "2024-01-02T12:05:30Z",
                "downloaded_at": None,
                "is_download_expired": False,
                "duration_seconds": 330
            }
        }


class CustomerBackupStatusResponse(BaseModel):
    """Response schema for customer backup status"""
    status: str = Field(..., description="Operation status")
    backup: CustomerBackupInfoSchema = Field(..., description="Backup information")
    
    class Config:
        json_schema_extra = {
            "example": {
                "status": "success",
                "backup": {
                    "backup_id": "backup-123e4567-e89b-12d3-a456-426614174000",
                    "backup_name": "customer_backup_123_20240101_120000",
                    "status": "completed"
                }
            }
        }


class CustomerBackupListResponse(BaseModel):
    """Response schema for customer backup list"""
    status: str = Field(..., description="Operation status")
    tenant_id: str = Field(..., description="Tenant ID")
    backups: List[Dict[str, Any]] = Field(..., description="List of customer backups")
    total_count: int = Field(..., description="Total number of backups")
    
    class Config:
        json_schema_extra = {
            "example": {
                "status": "success",
                "tenant_id": "123e4567-e89b-12d3-a456-426614174000",
                "backups": [
                    {
                        "backup_id": "backup-123",
                        "backup_name": "customer_backup_123_20240101_120000",
                        "status": "completed",
                        "created_at": "2024-01-01T12:00:00Z",
                        "file_size": 1048576,
                        "compressed_size": 524288,
                        "checksum": "abc123def456...",
                        "download_expires_at": "2024-01-02T12:05:30Z",
                        "is_download_expired": False,
                        "duration_seconds": 330
                    }
                ],
                "total_count": 1
            }
        }


class CustomerBackupTaskStatusResponse(BaseModel):
    """Response schema for customer backup task status"""
    status: str = Field(..., description="Task status")
    message: str = Field(..., description="Status message")
    task_id: str = Field(..., description="Task ID")
    result: Optional[Dict[str, Any]] = Field(None, description="Task result if completed")
    error: Optional[str] = Field(None, description="Error message if failed")
    progress: Optional[Dict[str, Any]] = Field(None, description="Progress information")
    
    class Config:
        json_schema_extra = {
            "example": {
                "status": "completed",
                "message": "Backup task completed successfully",
                "task_id": "abc123-def456-ghi789",
                "result": {
                    "status": "success",
                    "backup_id": "backup-123",
                    "tenant_id": "123e4567-e89b-12d3-a456-426614174000",
                    "download_token": "secure_download_token_123"
                }
            }
        }


class CustomerBackupCleanupResponse(BaseModel):
    """Response schema for backup cleanup operation"""
    status: str = Field(..., description="Operation status")
    message: str = Field(..., description="Status message")
    cleaned_count: int = Field(..., description="Number of files cleaned up")
    
    class Config:
        json_schema_extra = {
            "example": {
                "status": "success",
                "message": "Cleaned up 5 expired backup files",
                "cleaned_count": 5
            }
        }