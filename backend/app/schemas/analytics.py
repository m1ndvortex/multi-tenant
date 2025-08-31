"""
Pydantic schemas for analytics and monitoring
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime
from enum import Enum


class TimeRange(str, Enum):
    """Time range options for analytics"""
    LAST_24_HOURS = "24h"
    LAST_7_DAYS = "7d"
    LAST_30_DAYS = "30d"
    LAST_90_DAYS = "90d"
    LAST_YEAR = "1y"
    CUSTOM = "custom"


class AnalyticsRequest(BaseModel):
    """Request model for analytics queries"""
    time_range: TimeRange = Field(default=TimeRange.LAST_30_DAYS, description="Time range for analytics")
    start_date: Optional[datetime] = Field(None, description="Start date for custom range")
    end_date: Optional[datetime] = Field(None, description="End date for custom range")
    
    class Config:
        use_enum_values = True


class PlatformAnalyticsResponse(BaseModel):
    """Response model for platform analytics"""
    # Signup metrics
    total_signups: int = Field(..., description="Total number of signups")
    signups_this_month: int = Field(..., description="Signups in current month")
    signups_last_month: int = Field(..., description="Signups in previous month")
    signup_growth_rate: float = Field(..., description="Month-over-month signup growth rate")
    
    # Subscription metrics
    total_active_subscriptions: int = Field(..., description="Total active subscriptions")
    free_subscriptions: int = Field(..., description="Number of free subscriptions")
    pro_subscriptions: int = Field(..., description="Number of pro subscriptions")
    subscription_conversion_rate: float = Field(..., description="Free to Pro conversion rate")
    
    # Revenue metrics
    monthly_recurring_revenue: float = Field(..., description="Current MRR")
    mrr_growth_rate: float = Field(..., description="Month-over-month MRR growth")
    average_revenue_per_user: float = Field(..., description="ARPU")
    
    # Activity metrics
    total_invoices_created: int = Field(..., description="Total invoices created")
    invoices_this_month: int = Field(..., description="Invoices created this month")
    active_tenants_last_30_days: int = Field(..., description="Tenants active in last 30 days")
    
    # Time series data
    signup_trend: List[Dict[str, Any]] = Field(..., description="Daily signup trend data")
    revenue_trend: List[Dict[str, Any]] = Field(..., description="Daily revenue trend data")
    
    # Metadata
    generated_at: datetime = Field(..., description="When analytics were generated")
    time_range: str = Field(..., description="Time range for the analytics")


class UserActivityResponse(BaseModel):
    """Response model for user activity tracking"""
    total_active_users: int = Field(..., description="Total users active in last 5 minutes")
    active_users_by_tenant: Dict[str, int] = Field(..., description="Active users grouped by tenant")
    user_sessions: List[Dict[str, Any]] = Field(..., description="Active user sessions")
    peak_concurrent_users: int = Field(..., description="Peak concurrent users today")
    average_session_duration: float = Field(..., description="Average session duration in minutes")
    
    # Real-time data
    last_updated: datetime = Field(..., description="When data was last updated")
    refresh_interval: int = Field(default=30, description="Refresh interval in seconds")


class SystemHealthResponse(BaseModel):
    """Response model for system health monitoring"""
    # Overall status
    status: str = Field(..., description="Overall system status (healthy/degraded/unhealthy)")
    
    # Component health
    database_status: bool = Field(..., description="Database connection status")
    redis_status: bool = Field(..., description="Redis connection status")
    celery_status: bool = Field(..., description="Celery worker status")
    
    # System metrics
    cpu_usage_percent: float = Field(..., description="CPU usage percentage")
    memory_usage_percent: float = Field(..., description="Memory usage percentage")
    disk_usage_percent: float = Field(..., description="Disk usage percentage")
    
    # Database metrics
    database_connections: int = Field(..., description="Active database connections")
    database_response_time_ms: float = Field(..., description="Database response time in milliseconds")
    
    # Celery metrics
    celery_active_tasks: int = Field(..., description="Number of active Celery tasks")
    celery_pending_tasks: int = Field(..., description="Number of pending Celery tasks")
    celery_failed_tasks: int = Field(..., description="Number of failed Celery tasks")
    celery_workers: int = Field(..., description="Number of active Celery workers")
    
    # Performance metrics
    average_response_time_ms: float = Field(..., description="Average API response time")
    requests_per_minute: float = Field(..., description="Requests per minute")
    error_rate_percent: float = Field(..., description="Error rate percentage")
    
    # Timestamps
    last_health_check: datetime = Field(..., description="Last health check timestamp")
    uptime_seconds: int = Field(..., description="System uptime in seconds")


class APIErrorLogResponse(BaseModel):
    """Response model for API error logs"""
    errors: List[Dict[str, Any]] = Field(..., description="List of API errors")
    total_errors: int = Field(..., description="Total number of errors")
    error_rate: float = Field(..., description="Error rate percentage")
    most_common_errors: List[Dict[str, Any]] = Field(..., description="Most common error types")
    errors_by_endpoint: Dict[str, int] = Field(..., description="Errors grouped by endpoint")
    errors_by_tenant: Dict[str, int] = Field(..., description="Errors grouped by tenant")
    
    # Time range info
    time_range: str = Field(..., description="Time range for error logs")
    generated_at: datetime = Field(..., description="When report was generated")


class APIErrorLogRequest(BaseModel):
    """Request model for API error log queries"""
    time_range: TimeRange = Field(default=TimeRange.LAST_24_HOURS, description="Time range for error logs")
    start_date: Optional[datetime] = Field(None, description="Start date for custom range")
    end_date: Optional[datetime] = Field(None, description="End date for custom range")
    tenant_id: Optional[str] = Field(None, description="Filter by specific tenant")
    endpoint: Optional[str] = Field(None, description="Filter by specific endpoint")
    error_type: Optional[str] = Field(None, description="Filter by error type")
    severity: Optional[str] = Field(None, description="Filter by severity level")
    limit: int = Field(100, ge=1, le=1000, description="Maximum number of errors to return")
    offset: int = Field(0, ge=0, description="Number of errors to skip")
    
    class Config:
        use_enum_values = True


class HeartbeatRequest(BaseModel):
    """Request model for user heartbeat"""
    user_id: str = Field(..., description="User ID")
    tenant_id: str = Field(..., description="Tenant ID")
    session_id: Optional[str] = Field(None, description="Session ID")
    page: Optional[str] = Field(None, description="Current page/route")
    
    
class HeartbeatResponse(BaseModel):
    """Response model for heartbeat acknowledgment"""
    success: bool = Field(..., description="Whether heartbeat was recorded")
    next_heartbeat_in: int = Field(..., description="Seconds until next heartbeat required")
    server_time: datetime = Field(..., description="Current server time")


class CeleryTaskInfo(BaseModel):
    """Model for Celery task information"""
    task_id: str = Field(..., description="Task ID")
    task_name: str = Field(..., description="Task name")
    state: str = Field(..., description="Task state")
    worker: Optional[str] = Field(None, description="Worker name")
    timestamp: Optional[datetime] = Field(None, description="Task timestamp")
    runtime: Optional[float] = Field(None, description="Task runtime in seconds")
    args: Optional[List[Any]] = Field(None, description="Task arguments")
    kwargs: Optional[Dict[str, Any]] = Field(None, description="Task keyword arguments")
    result: Optional[Any] = Field(None, description="Task result")
    traceback: Optional[str] = Field(None, description="Error traceback if failed")


class CeleryMonitoringResponse(BaseModel):
    """Response model for Celery monitoring"""
    active_tasks: List[CeleryTaskInfo] = Field(..., description="Currently active tasks")
    pending_tasks: List[CeleryTaskInfo] = Field(..., description="Pending tasks")
    failed_tasks: List[CeleryTaskInfo] = Field(..., description="Recently failed tasks")
    completed_tasks: List[CeleryTaskInfo] = Field(..., description="Recently completed tasks")
    
    # Summary statistics
    total_active: int = Field(..., description="Total active tasks")
    total_pending: int = Field(..., description="Total pending tasks")
    total_failed: int = Field(..., description="Total failed tasks")
    total_completed: int = Field(..., description="Total completed tasks")
    
    # Worker information
    active_workers: List[Dict[str, Any]] = Field(..., description="Active worker information")
    worker_count: int = Field(..., description="Number of active workers")
    
    # Performance metrics
    average_task_duration: float = Field(..., description="Average task duration in seconds")
    tasks_per_minute: float = Field(..., description="Tasks processed per minute")
    failure_rate: float = Field(..., description="Task failure rate percentage")
    
    # Timestamps
    last_updated: datetime = Field(..., description="When data was last updated")