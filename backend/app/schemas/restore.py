"""
Restore system Pydantic schemas
"""

from pydantic import BaseModel, Field, validator
from typing import List, Dict, Optional, Any
from datetime import datetime


# Request Schemas
class SingleTenantRestoreRequest(BaseModel):
    """Request schema for single tenant restore"""
    backup_id: str = Field(..., description="Backup ID to restore from")
    storage_provider: str = Field(default="backblaze_b2", description="Storage provider to restore from")
    skip_validation: bool = Field(default=False, description="Skip backup integrity validation")
    
    @validator('storage_provider')
    def validate_storage_provider(cls, v):
        if v not in ['backblaze_b2', 'cloudflare_r2']:
            raise ValueError('storage_provider must be either backblaze_b2 or cloudflare_r2')
        return v
    
    class Config:
        json_schema_extra = {
            "example": {
                "backup_id": "backup-123e4567-e89b-12d3-a456-426614174000",
                "storage_provider": "backblaze_b2",
                "skip_validation": False
            }
        }


class TenantBackupPair(BaseModel):
    """Schema for tenant-backup pair"""
    tenant_id: str = Field(..., description="Tenant ID")
    backup_id: str = Field(..., description="Backup ID")
    
    class Config:
        json_schema_extra = {
            "example": {
                "tenant_id": "123e4567-e89b-12d3-a456-426614174000",
                "backup_id": "backup-123e4567-e89b-12d3-a456-426614174000"
            }
        }


class MultipleTenantRestoreRequest(BaseModel):
    """Request schema for multiple tenant restore"""
    tenant_backup_pairs: List[TenantBackupPair] = Field(..., description="List of tenant-backup pairs")
    storage_provider: str = Field(default="backblaze_b2", description="Storage provider to restore from")
    skip_validation: bool = Field(default=False, description="Skip backup integrity validation")
    
    @validator('storage_provider')
    def validate_storage_provider(cls, v):
        if v not in ['backblaze_b2', 'cloudflare_r2']:
            raise ValueError('storage_provider must be either backblaze_b2 or cloudflare_r2')
        return v
    
    @validator('tenant_backup_pairs')
    def validate_pairs_not_empty(cls, v):
        if not v:
            raise ValueError('tenant_backup_pairs cannot be empty')
        return v
    
    class Config:
        json_schema_extra = {
            "example": {
                "tenant_backup_pairs": [
                    {
                        "tenant_id": "123e4567-e89b-12d3-a456-426614174000",
                        "backup_id": "backup-123e4567-e89b-12d3-a456-426614174000"
                    },
                    {
                        "tenant_id": "456e7890-e89b-12d3-a456-426614174001",
                        "backup_id": "backup-456e7890-e89b-12d3-a456-426614174001"
                    }
                ],
                "storage_provider": "backblaze_b2",
                "skip_validation": False
            }
        }


class AllTenantsRestoreRequest(BaseModel):
    """Request schema for all tenants restore"""
    storage_provider: str = Field(default="backblaze_b2", description="Storage provider to restore from")
    backup_date: Optional[str] = Field(None, description="Restore from backups before this date (ISO format)")
    skip_validation: bool = Field(default=False, description="Skip backup integrity validation")
    
    @validator('storage_provider')
    def validate_storage_provider(cls, v):
        if v not in ['backblaze_b2', 'cloudflare_r2']:
            raise ValueError('storage_provider must be either backblaze_b2 or cloudflare_r2')
        return v
    
    @validator('backup_date')
    def validate_backup_date(cls, v):
        if v is not None:
            try:
                datetime.fromisoformat(v.replace('Z', '+00:00'))
            except ValueError:
                raise ValueError('backup_date must be in ISO format (e.g., 2024-01-01T12:00:00Z)')
        return v
    
    class Config:
        json_schema_extra = {
            "example": {
                "storage_provider": "backblaze_b2",
                "backup_date": "2024-01-01T12:00:00Z",
                "skip_validation": False
            }
        }


# Response Schemas
class RestoreResponse(BaseModel):
    """Response schema for restore operations"""
    status: str = Field(..., description="Operation status")
    message: str = Field(..., description="Status message")
    task_id: str = Field(..., description="Celery task ID")
    tenant_id: Optional[str] = Field(None, description="Tenant ID (for single tenant restore)")
    backup_id: Optional[str] = Field(None, description="Backup ID (for single tenant restore)")
    storage_provider: str = Field(..., description="Storage provider used")
    tenant_count: Optional[int] = Field(None, description="Number of tenants being restored")
    backup_date: Optional[str] = Field(None, description="Backup date filter (for all tenants restore)")
    
    class Config:
        json_schema_extra = {
            "example": {
                "status": "started",
                "message": "Restore task started for tenant Example Corp",
                "task_id": "abc123-def456-ghi789",
                "tenant_id": "123e4567-e89b-12d3-a456-426614174000",
                "backup_id": "backup-123e4567-e89b-12d3-a456-426614174000",
                "storage_provider": "backblaze_b2"
            }
        }


class ValidationResponse(BaseModel):
    """Response schema for backup validation"""
    status: str = Field(..., description="Operation status")
    message: str = Field(..., description="Status message")
    task_id: str = Field(..., description="Celery task ID")
    backup_id: str = Field(..., description="Backup ID being validated")
    storage_provider: str = Field(..., description="Storage provider being validated")
    
    class Config:
        json_schema_extra = {
            "example": {
                "status": "started",
                "message": "Backup validation started for backup-123",
                "task_id": "abc123-def456-ghi789",
                "backup_id": "backup-123e4567-e89b-12d3-a456-426614174000",
                "storage_provider": "backblaze_b2"
            }
        }


class RestoreInfoSchema(BaseModel):
    """Schema for detailed restore information"""
    restore_id: str = Field(..., description="Restore operation ID")
    backup_id: str = Field(..., description="Source backup ID")
    tenant_id: Optional[str] = Field(None, description="Target tenant ID")
    status: str = Field(..., description="Restore status")
    initiated_by: str = Field(..., description="Admin user who initiated restore")
    started_at: str = Field(..., description="Restore start timestamp")
    completed_at: Optional[str] = Field(None, description="Restore completion timestamp")
    duration_seconds: Optional[int] = Field(None, description="Restore duration in seconds")
    restore_point: str = Field(..., description="Backup date being restored")
    error_message: Optional[str] = Field(None, description="Error message if failed")
    pre_restore_snapshot: Optional[Dict[str, Any]] = Field(None, description="Pre-restore data snapshot")
    
    class Config:
        json_schema_extra = {
            "example": {
                "restore_id": "restore-123e4567-e89b-12d3-a456-426614174000",
                "backup_id": "backup-123e4567-e89b-12d3-a456-426614174000",
                "tenant_id": "123e4567-e89b-12d3-a456-426614174000",
                "status": "completed",
                "initiated_by": "admin-456e7890-e89b-12d3-a456-426614174001",
                "started_at": "2024-01-01T12:00:00Z",
                "completed_at": "2024-01-01T12:05:30Z",
                "duration_seconds": 330,
                "restore_point": "2024-01-01T06:00:00Z",
                "error_message": None,
                "pre_restore_snapshot": {
                    "tenant_id": "123e4567-e89b-12d3-a456-426614174000",
                    "table_counts": {
                        "users": 5,
                        "customers": 150,
                        "products": 200,
                        "invoices": 500
                    }
                }
            }
        }


class RestoreHistoryResponse(BaseModel):
    """Response schema for restore history"""
    status: str = Field(..., description="Operation status")
    restores: List[RestoreInfoSchema] = Field(..., description="List of restore operations")
    total_count: int = Field(..., description="Total number of restore operations")
    tenant_id: Optional[str] = Field(None, description="Tenant ID filter")
    
    class Config:
        json_schema_extra = {
            "example": {
                "status": "success",
                "restores": [
                    {
                        "restore_id": "restore-123",
                        "backup_id": "backup-123",
                        "tenant_id": "123e4567-e89b-12d3-a456-426614174000",
                        "status": "completed",
                        "initiated_by": "admin-456",
                        "started_at": "2024-01-01T12:00:00Z",
                        "completed_at": "2024-01-01T12:05:30Z",
                        "duration_seconds": 330,
                        "restore_point": "2024-01-01T06:00:00Z"
                    }
                ],
                "total_count": 1,
                "tenant_id": "123e4567-e89b-12d3-a456-426614174000"
            }
        }


class RestoreInfoResponse(BaseModel):
    """Response schema for restore information"""
    status: str = Field(..., description="Operation status")
    restore: RestoreInfoSchema = Field(..., description="Restore information")
    
    class Config:
        json_schema_extra = {
            "example": {
                "status": "success",
                "restore": {
                    "restore_id": "restore-123e4567-e89b-12d3-a456-426614174000",
                    "backup_id": "backup-123e4567-e89b-12d3-a456-426614174000",
                    "tenant_id": "123e4567-e89b-12d3-a456-426614174000",
                    "status": "completed"
                }
            }
        }


class RestorePointSchema(BaseModel):
    """Schema for restore point information"""
    backup_id: str = Field(..., description="Backup ID")
    backup_name: str = Field(..., description="Backup name")
    backup_date: str = Field(..., description="Backup creation date")
    file_size: Optional[int] = Field(None, description="Original file size in bytes")
    compressed_size: Optional[int] = Field(None, description="Compressed file size in bytes")
    checksum: Optional[str] = Field(None, description="File checksum")
    storage_provider: str = Field(..., description="Storage provider")
    duration_seconds: Optional[int] = Field(None, description="Backup duration in seconds")
    
    class Config:
        json_schema_extra = {
            "example": {
                "backup_id": "backup-123e4567-e89b-12d3-a456-426614174000",
                "backup_name": "tenant_123_20240101_060000",
                "backup_date": "2024-01-01T06:00:00Z",
                "file_size": 1048576,
                "compressed_size": 524288,
                "checksum": "abc123def456...",
                "storage_provider": "backblaze_b2",
                "duration_seconds": 330
            }
        }


class RestorePointsResponse(BaseModel):
    """Response schema for restore points"""
    status: str = Field(..., description="Operation status")
    tenant_id: str = Field(..., description="Tenant ID")
    tenant_name: str = Field(..., description="Tenant name")
    storage_provider: str = Field(..., description="Storage provider")
    restore_points: List[RestorePointSchema] = Field(..., description="Available restore points")
    total_count: int = Field(..., description="Total number of restore points")
    
    class Config:
        json_schema_extra = {
            "example": {
                "status": "success",
                "tenant_id": "123e4567-e89b-12d3-a456-426614174000",
                "tenant_name": "Example Corp",
                "storage_provider": "backblaze_b2",
                "restore_points": [
                    {
                        "backup_id": "backup-123",
                        "backup_name": "tenant_123_20240101_060000",
                        "backup_date": "2024-01-01T06:00:00Z",
                        "file_size": 1048576,
                        "compressed_size": 524288,
                        "checksum": "abc123def456...",
                        "storage_provider": "backblaze_b2",
                        "duration_seconds": 330
                    }
                ],
                "total_count": 1
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
                    "restore_id": "restore-123",
                    "tenant_id": "123e4567-e89b-12d3-a456-426614174000"
                }
            }
        }