"""
Backup system Pydantic schemas
"""

from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from datetime import datetime
from enum import Enum


class BackupTypeEnum(str, Enum):
    """Backup type enumeration"""
    TENANT_DAILY = "tenant_daily"
    FULL_PLATFORM = "full_platform"
    MANUAL = "manual"
    CUSTOMER_SELF = "customer_self"


class BackupStatusEnum(str, Enum):
    """Backup status enumeration"""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class StorageProviderEnum(str, Enum):
    """Storage provider enumeration"""
    BACKBLAZE_B2 = "backblaze_b2"
    CLOUDFLARE_R2 = "cloudflare_r2"
    LOCAL = "local"


# Request Schemas
class BackupCreateRequest(BaseModel):
    """Request schema for creating a backup"""
    tenant_id: str = Field(..., description="Tenant ID to backup")
    backup_type: BackupTypeEnum = Field(default=BackupTypeEnum.MANUAL, description="Type of backup")
    
    class Config:
        json_schema_extra = {
            "example": {
                "tenant_id": "123e4567-e89b-12d3-a456-426614174000",
                "backup_type": "manual"
            }
        }


class BackupVerifyRequest(BaseModel):
    """Request schema for backup verification"""
    storage_provider: StorageProviderEnum = Field(default=StorageProviderEnum.BACKBLAZE_B2, description="Storage provider to verify from")
    
    class Config:
        json_schema_extra = {
            "example": {
                "storage_provider": "backblaze_b2"
            }
        }


# Response Schemas
class BackupResponse(BaseModel):
    """Response schema for backup operations"""
    status: str = Field(..., description="Operation status")
    message: str = Field(..., description="Status message")
    task_id: Optional[str] = Field(None, description="Celery task ID")
    tenant_id: Optional[str] = Field(None, description="Tenant ID")
    backup_id: Optional[str] = Field(None, description="Backup ID")
    
    class Config:
        json_schema_extra = {
            "example": {
                "status": "started",
                "message": "Backup task started for tenant Example Corp",
                "task_id": "abc123-def456-ghi789",
                "tenant_id": "123e4567-e89b-12d3-a456-426614174000"
            }
        }


class StorageLocationSchema(BaseModel):
    """Schema for storage location information"""
    provider: str = Field(..., description="Storage provider name")
    location: str = Field(..., description="Storage location/URL")
    uploaded_at: str = Field(..., description="Upload timestamp")
    
    class Config:
        json_schema_extra = {
            "example": {
                "provider": "backblaze_b2",
                "location": "s3://securesyntax/tenant_123_20240101_120000.sql.gz.enc",
                "uploaded_at": "2024-01-01T12:00:00Z"
            }
        }


class BackupInfoSchema(BaseModel):
    """Schema for detailed backup information"""
    backup_id: str = Field(..., description="Backup ID")
    backup_type: str = Field(..., description="Backup type")
    tenant_id: Optional[str] = Field(None, description="Tenant ID")
    backup_name: str = Field(..., description="Backup name")
    status: str = Field(..., description="Backup status")
    created_at: str = Field(..., description="Creation timestamp")
    completed_at: Optional[str] = Field(None, description="Completion timestamp")
    file_size: Optional[int] = Field(None, description="Original file size in bytes")
    compressed_size: Optional[int] = Field(None, description="Compressed file size in bytes")
    checksum: Optional[str] = Field(None, description="File checksum")
    storage_locations: Optional[List[StorageLocationSchema]] = Field(None, description="Storage locations")
    duration_seconds: Optional[int] = Field(None, description="Backup duration in seconds")
    error_message: Optional[str] = Field(None, description="Error message if failed")
    
    class Config:
        json_schema_extra = {
            "example": {
                "backup_id": "backup-123e4567-e89b-12d3-a456-426614174000",
                "backup_type": "tenant_daily",
                "tenant_id": "123e4567-e89b-12d3-a456-426614174000",
                "backup_name": "tenant_123_20240101_120000",
                "status": "completed",
                "created_at": "2024-01-01T12:00:00Z",
                "completed_at": "2024-01-01T12:05:30Z",
                "file_size": 1048576,
                "compressed_size": 524288,
                "checksum": "abc123def456...",
                "storage_locations": [
                    {
                        "provider": "backblaze_b2",
                        "location": "s3://securesyntax/tenant_123_20240101_120000.sql.gz.enc",
                        "uploaded_at": "2024-01-01T12:05:00Z"
                    }
                ],
                "duration_seconds": 330
            }
        }


class BackupListResponse(BaseModel):
    """Response schema for backup list"""
    status: str = Field(..., description="Operation status")
    tenant_id: str = Field(..., description="Tenant ID")
    tenant_name: str = Field(..., description="Tenant name")
    backups: List[Dict[str, Any]] = Field(..., description="List of backups")
    total_count: int = Field(..., description="Total number of backups")
    
    class Config:
        json_schema_extra = {
            "example": {
                "status": "success",
                "tenant_id": "123e4567-e89b-12d3-a456-426614174000",
                "tenant_name": "Example Corp",
                "backups": [
                    {
                        "backup_id": "backup-123",
                        "backup_name": "tenant_123_20240101_120000",
                        "created_at": "2024-01-01T12:00:00Z",
                        "file_size": 1048576,
                        "compressed_size": 524288,
                        "checksum": "abc123def456...",
                        "storage_locations": [],
                        "duration_seconds": 330
                    }
                ],
                "total_count": 1
            }
        }


class BackupInfoResponse(BaseModel):
    """Response schema for backup information"""
    status: str = Field(..., description="Operation status")
    backup: BackupInfoSchema = Field(..., description="Backup information")
    
    class Config:
        json_schema_extra = {
            "example": {
                "status": "success",
                "backup": {
                    "backup_id": "backup-123e4567-e89b-12d3-a456-426614174000",
                    "backup_type": "tenant_daily",
                    "tenant_id": "123e4567-e89b-12d3-a456-426614174000",
                    "backup_name": "tenant_123_20240101_120000",
                    "status": "completed"
                }
            }
        }


class StorageUsageSchema(BaseModel):
    """Schema for storage usage information"""
    available: bool = Field(..., description="Whether storage provider is available")
    object_count: int = Field(..., description="Number of objects stored")
    total_size: int = Field(..., description="Total storage used in bytes")
    
    class Config:
        json_schema_extra = {
            "example": {
                "available": True,
                "object_count": 150,
                "total_size": 1073741824
            }
        }


class StorageUsageResponse(BaseModel):
    """Response schema for storage usage"""
    status: str = Field(..., description="Operation status")
    storage_usage: Dict[str, StorageUsageSchema] = Field(..., description="Storage usage by provider")
    
    class Config:
        json_schema_extra = {
            "example": {
                "status": "success",
                "storage_usage": {
                    "backblaze_b2": {
                        "available": True,
                        "object_count": 150,
                        "total_size": 1073741824
                    },
                    "cloudflare_r2": {
                        "available": True,
                        "object_count": 150,
                        "total_size": 1073741824
                    }
                }
            }
        }


class ConnectivitySchema(BaseModel):
    """Schema for connectivity test results"""
    available: bool = Field(..., description="Whether provider is available")
    error: Optional[str] = Field(None, description="Error message if unavailable")
    
    class Config:
        json_schema_extra = {
            "example": {
                "available": True,
                "error": None
            }
        }


class ConnectivityTestResponse(BaseModel):
    """Response schema for connectivity test"""
    status: str = Field(..., description="Operation status")
    connectivity: Dict[str, ConnectivitySchema] = Field(..., description="Connectivity results by provider")
    
    class Config:
        json_schema_extra = {
            "example": {
                "status": "success",
                "connectivity": {
                    "backblaze_b2": {
                        "available": True,
                        "error": None
                    },
                    "cloudflare_r2": {
                        "available": True,
                        "error": None
                    }
                }
            }
        }


class TaskStatusResponse(BaseModel):
    """Response schema for task status"""
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
                "message": "Task completed successfully",
                "task_id": "abc123-def456-ghi789",
                "result": {
                    "status": "success",
                    "backup_id": "backup-123",
                    "tenant_id": "123e4567-e89b-12d3-a456-426614174000"
                }
            }
        }