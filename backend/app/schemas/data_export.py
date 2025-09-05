"""
Data export schemas for request/response validation
"""

from pydantic import BaseModel, Field, validator
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum


class ExportFormatEnum(str, Enum):
    """Export format enumeration"""
    CSV = "csv"
    JSON = "json"


class ExportTypeEnum(str, Enum):
    """Export type enumeration"""
    MANUAL = "manual"
    SCHEDULED = "scheduled"
    AUTOMATED = "automated"


class ExportStatusEnum(str, Enum):
    """Export status enumeration"""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class DataExportRequest(BaseModel):
    """Request schema for creating data export"""
    export_format: ExportFormatEnum = Field(..., description="Export format (CSV or JSON)")
    export_type: ExportTypeEnum = Field(default=ExportTypeEnum.MANUAL, description="Export type")
    tables: Optional[List[str]] = Field(
        default=None, 
        description="List of tables to export (default: all available tables)"
    )
    
    @validator('tables')
    def validate_tables(cls, v):
        if v is not None:
            allowed_tables = ["customers", "products", "invoices", "installments", "accounting"]
            for table in v:
                if table not in allowed_tables:
                    raise ValueError(f"Invalid table '{table}'. Allowed tables: {allowed_tables}")
        return v


class BulkDataExportRequest(BaseModel):
    """Request schema for bulk data export"""
    tenant_ids: List[str] = Field(..., description="List of tenant IDs to export")
    export_format: ExportFormatEnum = Field(..., description="Export format (CSV or JSON)")
    export_type: ExportTypeEnum = Field(default=ExportTypeEnum.MANUAL, description="Export type")
    tables: Optional[List[str]] = Field(
        default=None, 
        description="List of tables to export (default: all available tables)"
    )
    
    @validator('tenant_ids')
    def validate_tenant_ids(cls, v):
        if not v or len(v) == 0:
            raise ValueError("At least one tenant ID is required")
        if len(v) > 100:  # Reasonable limit for bulk operations
            raise ValueError("Maximum 100 tenants allowed per bulk export")
        return v
    
    @validator('tables')
    def validate_tables(cls, v):
        if v is not None:
            allowed_tables = ["customers", "products", "invoices", "installments", "accounting"]
            for table in v:
                if table not in allowed_tables:
                    raise ValueError(f"Invalid table '{table}'. Allowed tables: {allowed_tables}")
        return v


class ExportFileInfo(BaseModel):
    """Export file information"""
    table: str = Field(..., description="Table name")
    file: str = Field(..., description="File name")
    records: int = Field(..., description="Number of records")


class DataExportResponse(BaseModel):
    """Response schema for data export creation"""
    status: str = Field(..., description="Export status")
    export_id: str = Field(..., description="Export ID")
    tenant_id: str = Field(..., description="Tenant ID")
    export_name: str = Field(..., description="Export name")
    export_format: str = Field(..., description="Export format")
    export_type: str = Field(..., description="Export type")
    exported_files: List[ExportFileInfo] = Field(..., description="List of exported files")
    total_records: int = Field(..., description="Total number of records exported")
    file_size: int = Field(..., description="Total file size in bytes")
    compressed_size: int = Field(..., description="Compressed file size in bytes")
    checksum: str = Field(..., description="File checksum")
    download_token: str = Field(..., description="Download token")
    download_expires_at: datetime = Field(..., description="Download expiration time")
    duration_seconds: Optional[int] = Field(None, description="Export duration in seconds")


class BulkExportResult(BaseModel):
    """Individual tenant export result in bulk operation"""
    tenant_id: str = Field(..., description="Tenant ID")
    status: str = Field(..., description="Export status (success/failed)")
    export_id: Optional[str] = Field(None, description="Export ID if successful")
    total_records: Optional[int] = Field(None, description="Total records if successful")
    compressed_size: Optional[int] = Field(None, description="Compressed size if successful")
    error: Optional[str] = Field(None, description="Error message if failed")


class BulkDataExportResponse(BaseModel):
    """Response schema for bulk data export"""
    status: str = Field(..., description="Overall status")
    total_tenants: int = Field(..., description="Total number of tenants")
    successful_exports: int = Field(..., description="Number of successful exports")
    failed_exports: int = Field(..., description="Number of failed exports")
    export_results: List[BulkExportResult] = Field(..., description="Individual export results")
    message: str = Field(..., description="Summary message")


class ExportStatusResponse(BaseModel):
    """Response schema for export status"""
    export_id: str = Field(..., description="Export ID")
    export_name: str = Field(..., description="Export name")
    export_format: str = Field(..., description="Export format")
    export_type: str = Field(..., description="Export type")
    status: str = Field(..., description="Export status")
    created_at: datetime = Field(..., description="Creation time")
    completed_at: Optional[datetime] = Field(None, description="Completion time")
    exported_tables: Optional[List[str]] = Field(None, description="Exported tables")
    total_records: int = Field(default=0, description="Total records exported")
    file_size: Optional[int] = Field(None, description="File size in bytes")
    compressed_size: Optional[int] = Field(None, description="Compressed size in bytes")
    checksum: Optional[str] = Field(None, description="File checksum")
    download_token: Optional[str] = Field(None, description="Download token")
    download_expires_at: Optional[datetime] = Field(None, description="Download expiration")
    downloaded_at: Optional[datetime] = Field(None, description="Download time")
    is_download_expired: bool = Field(default=True, description="Whether download has expired")
    duration_seconds: Optional[int] = Field(None, description="Duration in seconds")
    error_message: Optional[str] = Field(None, description="Error message if failed")


class ExportListResponse(BaseModel):
    """Response schema for export list"""
    exports: List[ExportStatusResponse] = Field(..., description="List of exports")
    total: int = Field(..., description="Total number of exports")


class TaskProgressResponse(BaseModel):
    """Response schema for task progress"""
    state: str = Field(..., description="Task state")
    current: int = Field(..., description="Current progress")
    total: int = Field(..., description="Total progress")
    status: str = Field(..., description="Status message")
    result: Optional[Dict[str, Any]] = Field(None, description="Task result if completed")
    error: Optional[str] = Field(None, description="Error message if failed")


class ExportScheduleRequest(BaseModel):
    """Request schema for creating export schedule"""
    name: str = Field(..., description="Schedule name", max_length=255)
    description: Optional[str] = Field(None, description="Schedule description")
    export_format: ExportFormatEnum = Field(..., description="Export format")
    tables_to_export: List[str] = Field(..., description="Tables to export")
    cron_expression: str = Field(..., description="Cron expression for schedule")
    timezone: str = Field(default="UTC", description="Timezone for schedule")
    is_active: bool = Field(default=True, description="Whether schedule is active")
    
    @validator('tables_to_export')
    def validate_tables_to_export(cls, v):
        if not v or len(v) == 0:
            raise ValueError("At least one table must be specified")
        allowed_tables = ["customers", "products", "invoices", "installments", "accounting"]
        for table in v:
            if table not in allowed_tables:
                raise ValueError(f"Invalid table '{table}'. Allowed tables: {allowed_tables}")
        return v
    
    @validator('cron_expression')
    def validate_cron_expression(cls, v):
        # Basic cron validation - should have 5 parts
        parts = v.strip().split()
        if len(parts) != 5:
            raise ValueError("Cron expression must have 5 parts: minute hour day month weekday")
        return v


class ExportScheduleResponse(BaseModel):
    """Response schema for export schedule"""
    id: str = Field(..., description="Schedule ID")
    tenant_id: str = Field(..., description="Tenant ID")
    name: str = Field(..., description="Schedule name")
    description: Optional[str] = Field(None, description="Schedule description")
    export_format: str = Field(..., description="Export format")
    tables_to_export: List[str] = Field(..., description="Tables to export")
    cron_expression: str = Field(..., description="Cron expression")
    timezone: str = Field(..., description="Timezone")
    is_active: bool = Field(..., description="Whether schedule is active")
    last_run_at: Optional[datetime] = Field(None, description="Last execution time")
    next_run_at: Optional[datetime] = Field(None, description="Next execution time")
    last_export_id: Optional[str] = Field(None, description="Last export ID")
    total_runs: int = Field(..., description="Total executions")
    successful_runs: int = Field(..., description="Successful executions")
    failed_runs: int = Field(..., description="Failed executions")
    success_rate: float = Field(..., description="Success rate percentage")
    created_at: datetime = Field(..., description="Creation time")
    updated_at: datetime = Field(..., description="Last update time")


class ExportScheduleListResponse(BaseModel):
    """Response schema for export schedule list"""
    schedules: List[ExportScheduleResponse] = Field(..., description="List of schedules")
    total: int = Field(..., description="Total number of schedules")


class ExportDownloadResponse(BaseModel):
    """Response schema for export download"""
    message: str = Field(..., description="Download message")
    filename: str = Field(..., description="Downloaded filename")
    size: int = Field(..., description="File size in bytes")


class ExportStatsResponse(BaseModel):
    """Response schema for export statistics"""
    total_exports: int = Field(..., description="Total number of exports")
    successful_exports: int = Field(..., description="Successful exports")
    failed_exports: int = Field(..., description="Failed exports")
    total_records_exported: int = Field(..., description="Total records exported")
    total_size_exported: int = Field(..., description="Total size exported in bytes")
    average_export_time: Optional[float] = Field(None, description="Average export time in seconds")
    success_rate: float = Field(..., description="Success rate percentage")
    exports_by_format: Dict[str, int] = Field(..., description="Exports count by format")
    exports_by_type: Dict[str, int] = Field(..., description="Exports count by type")
    recent_exports: List[ExportStatusResponse] = Field(..., description="Recent exports")


class CleanupResponse(BaseModel):
    """Response schema for cleanup operations"""
    status: str = Field(..., description="Cleanup status")
    cleaned_files: int = Field(..., description="Number of files cleaned")
    message: str = Field(..., description="Cleanup message")