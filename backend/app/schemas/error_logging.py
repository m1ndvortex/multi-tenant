"""
Pydantic schemas for API Error Logging
"""

from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum
import uuid

from ..models.api_error_log import ErrorSeverity, ErrorCategory


class ErrorSeverityEnum(str, Enum):
    """Error severity enum for API"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class ErrorCategoryEnum(str, Enum):
    """Error category enum for API"""
    AUTHENTICATION = "authentication"
    AUTHORIZATION = "authorization"
    VALIDATION = "validation"
    DATABASE = "database"
    EXTERNAL_API = "external_api"
    BUSINESS_LOGIC = "business_logic"
    SYSTEM = "system"
    NETWORK = "network"
    PERFORMANCE = "performance"
    SECURITY = "security"
    UNKNOWN = "unknown"


class ErrorLogBase(BaseModel):
    """Base error log schema"""
    error_message: str = Field(..., description="Error message")
    error_type: str = Field(..., description="Error type/class name")
    endpoint: str = Field(..., description="API endpoint path")
    method: str = Field(..., description="HTTP method")
    status_code: int = Field(..., description="HTTP status code")
    severity: ErrorSeverityEnum = Field(default=ErrorSeverityEnum.MEDIUM, description="Error severity")
    category: ErrorCategoryEnum = Field(default=ErrorCategoryEnum.UNKNOWN, description="Error category")


class ErrorLogCreate(ErrorLogBase):
    """Schema for creating error logs"""
    tenant_id: Optional[uuid.UUID] = Field(None, description="Tenant ID")
    user_id: Optional[uuid.UUID] = Field(None, description="User ID")
    session_id: Optional[str] = Field(None, description="Session ID")
    error_code: Optional[str] = Field(None, description="Application-specific error code")
    request_id: Optional[str] = Field(None, description="Request tracking ID")
    user_agent: Optional[str] = Field(None, description="User agent string")
    ip_address: Optional[str] = Field(None, description="Client IP address")
    stack_trace: Optional[str] = Field(None, description="Full stack trace")
    request_data: Optional[Dict[str, Any]] = Field(None, description="Request payload (sanitized)")
    response_data: Optional[Dict[str, Any]] = Field(None, description="Response data (sanitized)")
    additional_context: Optional[Dict[str, Any]] = Field(None, description="Additional error context")


class ErrorLogResponse(ErrorLogBase):
    """Schema for error log responses"""
    id: uuid.UUID = Field(..., description="Error log ID")
    tenant_id: Optional[uuid.UUID] = Field(None, description="Tenant ID")
    user_id: Optional[uuid.UUID] = Field(None, description="User ID")
    session_id: Optional[str] = Field(None, description="Session ID")
    error_code: Optional[str] = Field(None, description="Application-specific error code")
    request_id: Optional[str] = Field(None, description="Request tracking ID")
    user_agent: Optional[str] = Field(None, description="User agent string")
    ip_address: Optional[str] = Field(None, description="Client IP address")
    stack_trace: Optional[str] = Field(None, description="Full stack trace")
    request_data: Optional[Dict[str, Any]] = Field(None, description="Request payload (sanitized)")
    response_data: Optional[Dict[str, Any]] = Field(None, description="Response data (sanitized)")
    additional_context: Optional[Dict[str, Any]] = Field(None, description="Additional error context")
    
    # Resolution tracking
    is_resolved: bool = Field(..., description="Whether error is resolved")
    resolved_at: Optional[datetime] = Field(None, description="Resolution timestamp")
    resolved_by: Optional[uuid.UUID] = Field(None, description="Admin user who resolved")
    resolution_notes: Optional[str] = Field(None, description="Resolution notes")
    
    # Notification tracking
    notification_sent: bool = Field(..., description="Whether notification was sent")
    notification_sent_at: Optional[datetime] = Field(None, description="Notification timestamp")
    
    # Occurrence tracking
    occurrence_count: int = Field(..., description="Number of occurrences")
    first_occurrence: datetime = Field(..., description="First occurrence timestamp")
    last_occurrence: datetime = Field(..., description="Last occurrence timestamp")
    
    # Timestamps
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")
    
    class Config:
        from_attributes = True


class ErrorLogListResponse(BaseModel):
    """Schema for paginated error log list"""
    errors: List[ErrorLogResponse] = Field(..., description="List of error logs")
    total: int = Field(..., description="Total number of errors")
    skip: int = Field(..., description="Number of records skipped")
    limit: int = Field(..., description="Maximum number of records returned")
    has_more: bool = Field(..., description="Whether there are more records")


class ErrorLogFilters(BaseModel):
    """Schema for error log filtering"""
    tenant_id: Optional[uuid.UUID] = Field(None, description="Filter by tenant ID")
    user_id: Optional[uuid.UUID] = Field(None, description="Filter by user ID")
    severity: Optional[ErrorSeverityEnum] = Field(None, description="Filter by severity")
    category: Optional[ErrorCategoryEnum] = Field(None, description="Filter by category")
    endpoint: Optional[str] = Field(None, description="Filter by endpoint (partial match)")
    error_type: Optional[str] = Field(None, description="Filter by error type (partial match)")
    status_code: Optional[int] = Field(None, description="Filter by HTTP status code")
    is_resolved: Optional[bool] = Field(None, description="Filter by resolution status")
    start_date: Optional[datetime] = Field(None, description="Filter errors after this date")
    end_date: Optional[datetime] = Field(None, description="Filter errors before this date")
    search_term: Optional[str] = Field(None, description="Search in error messages")
    skip: int = Field(0, ge=0, description="Number of records to skip")
    limit: int = Field(50, ge=1, le=100, description="Maximum number of records to return")
    order_by: str = Field("created_at", description="Field to sort by")
    order_desc: bool = Field(True, description="Sort in descending order")


class ErrorResolutionRequest(BaseModel):
    """Schema for marking errors as resolved"""
    notes: Optional[str] = Field(None, description="Resolution notes")


class ErrorStatisticsResponse(BaseModel):
    """Schema for error statistics"""
    total_errors: int = Field(..., description="Total number of errors")
    severity_breakdown: Dict[str, int] = Field(..., description="Errors by severity")
    category_breakdown: Dict[str, int] = Field(..., description="Errors by category")
    recent_critical_errors: int = Field(..., description="Critical errors in last 24 hours")
    unresolved_errors: int = Field(..., description="Number of unresolved errors")
    top_error_endpoints: List[Dict[str, Any]] = Field(..., description="Top error endpoints")


class ErrorTrendsResponse(BaseModel):
    """Schema for error trends"""
    daily_counts: List[Dict[str, Any]] = Field(..., description="Daily error counts")
    severity_trends: Dict[str, List[Dict[str, Any]]] = Field(..., description="Severity trends over time")
    period: Dict[str, Any] = Field(..., description="Time period information")


class CriticalErrorAlert(BaseModel):
    """Schema for critical error alerts"""
    id: uuid.UUID = Field(..., description="Error log ID")
    error_message: str = Field(..., description="Error message")
    error_type: str = Field(..., description="Error type")
    endpoint: str = Field(..., description="API endpoint")
    severity: ErrorSeverityEnum = Field(..., description="Error severity")
    category: ErrorCategoryEnum = Field(..., description="Error category")
    tenant_id: Optional[uuid.UUID] = Field(None, description="Tenant ID")
    occurrence_count: int = Field(..., description="Number of occurrences")
    first_occurrence: datetime = Field(..., description="First occurrence")
    last_occurrence: datetime = Field(..., description="Last occurrence")


class ErrorNotificationSettings(BaseModel):
    """Schema for error notification settings"""
    critical_errors_enabled: bool = Field(True, description="Send notifications for critical errors")
    high_frequency_threshold: int = Field(10, description="Occurrence threshold for notifications")
    notification_cooldown_minutes: int = Field(60, description="Cooldown period between notifications")
    email_recipients: List[str] = Field(default_factory=list, description="Email recipients for notifications")
    slack_webhook_url: Optional[str] = Field(None, description="Slack webhook URL for notifications")


class BulkErrorActionRequest(BaseModel):
    """Schema for bulk error actions"""
    error_ids: List[uuid.UUID] = Field(..., description="List of error IDs")
    action: str = Field(..., description="Action to perform (resolve, delete)")
    notes: Optional[str] = Field(None, description="Action notes")
    
    @validator('action')
    def validate_action(cls, v):
        allowed_actions = ['resolve', 'delete']
        if v not in allowed_actions:
            raise ValueError(f'Action must be one of: {allowed_actions}')
        return v


class BulkErrorActionResponse(BaseModel):
    """Schema for bulk error action results"""
    success_count: int = Field(..., description="Number of successful operations")
    failed_count: int = Field(..., description="Number of failed operations")
    successful_error_ids: List[uuid.UUID] = Field(..., description="Successfully processed error IDs")
    failed_operations: List[Dict[str, Any]] = Field(..., description="Failed operations with reasons")
    message: str = Field(..., description="Summary message")


class ErrorExportRequest(BaseModel):
    """Schema for error export requests"""
    filters: ErrorLogFilters = Field(..., description="Export filters")
    format: str = Field("csv", description="Export format (csv, json, xlsx)")
    include_stack_traces: bool = Field(False, description="Include stack traces in export")
    
    @validator('format')
    def validate_format(cls, v):
        allowed_formats = ['csv', 'json', 'xlsx']
        if v not in allowed_formats:
            raise ValueError(f'Format must be one of: {allowed_formats}')
        return v


class ErrorExportResponse(BaseModel):
    """Schema for error export response"""
    download_url: str = Field(..., description="Download URL for exported file")
    filename: str = Field(..., description="Generated filename")
    total_records: int = Field(..., description="Total number of exported records")
    expires_at: datetime = Field(..., description="Download URL expiration time")