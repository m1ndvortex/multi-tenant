"""
Enhanced Pydantic schemas for Real-Time Error Logging
"""

from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any, Union
from datetime import datetime
from enum import Enum
import uuid

from ..models.api_error_log import ErrorSeverity, ErrorCategory


class WebSocketMessageType(str, Enum):
    """WebSocket message types"""
    CONNECTION_ESTABLISHED = "connection_established"
    ERROR_UPDATE = "error_update"
    STATISTICS_UPDATE = "statistics_update"
    ERROR_RESOLVED = "error_resolved"
    PING = "ping"
    PONG = "pong"
    REQUEST_STATISTICS = "request_statistics"
    INITIAL_STATISTICS = "initial_statistics"


class WebSocketMessage(BaseModel):
    """Base WebSocket message schema"""
    type: WebSocketMessageType = Field(..., description="Message type")
    timestamp: datetime = Field(..., description="Message timestamp")
    data: Optional[Dict[str, Any]] = Field(None, description="Message data")


class ErrorUpdateMessage(WebSocketMessage):
    """WebSocket message for error updates"""
    type: WebSocketMessageType = Field(WebSocketMessageType.ERROR_UPDATE, description="Message type")
    data: Dict[str, Any] = Field(..., description="Error data")


class StatisticsUpdateMessage(WebSocketMessage):
    """WebSocket message for statistics updates"""
    type: WebSocketMessageType = Field(WebSocketMessageType.STATISTICS_UPDATE, description="Message type")
    data: Dict[str, Any] = Field(..., description="Statistics data")


class ErrorResolvedMessage(WebSocketMessage):
    """WebSocket message for error resolution"""
    type: WebSocketMessageType = Field(WebSocketMessageType.ERROR_RESOLVED, description="Message type")
    error_id: uuid.UUID = Field(..., description="Resolved error ID")
    data: Dict[str, Any] = Field(..., description="Resolution data")


class ActiveErrorsRequest(BaseModel):
    """Request schema for active errors"""
    tenant_id: Optional[uuid.UUID] = Field(None, description="Filter by tenant ID")
    severity: Optional[ErrorSeverity] = Field(None, description="Filter by severity")
    category: Optional[ErrorCategory] = Field(None, description="Filter by category")
    endpoint: Optional[str] = Field(None, description="Filter by endpoint")
    error_type: Optional[str] = Field(None, description="Filter by error type")
    hours_back: int = Field(24, ge=1, le=168, description="Hours to look back")
    limit: int = Field(50, ge=1, le=100, description="Maximum records")


class RealTimeStatisticsRequest(BaseModel):
    """Request schema for real-time statistics"""
    tenant_id: Optional[uuid.UUID] = Field(None, description="Filter by tenant ID")
    hours_back: int = Field(24, ge=1, le=168, description="Hours to look back")


class EnhancedErrorLogResponse(BaseModel):
    """Enhanced error log response with real-time data"""
    id: uuid.UUID = Field(..., description="Error log ID")
    error_message: str = Field(..., description="Error message")
    error_type: str = Field(..., description="Error type")
    endpoint: str = Field(..., description="API endpoint")
    method: str = Field(..., description="HTTP method")
    status_code: int = Field(..., description="HTTP status code")
    severity: ErrorSeverity = Field(..., description="Error severity")
    category: ErrorCategory = Field(..., description="Error category")
    
    # Context information
    tenant_id: Optional[uuid.UUID] = Field(None, description="Tenant ID")
    user_id: Optional[uuid.UUID] = Field(None, description="User ID")
    session_id: Optional[str] = Field(None, description="Session ID")
    request_id: Optional[str] = Field(None, description="Request ID")
    ip_address: Optional[str] = Field(None, description="Client IP")
    
    # Error details
    stack_trace: Optional[str] = Field(None, description="Stack trace")
    additional_context: Optional[Dict[str, Any]] = Field(None, description="Additional context")
    
    # Resolution tracking
    is_resolved: bool = Field(..., description="Resolution status")
    resolved_at: Optional[datetime] = Field(None, description="Resolution timestamp")
    resolved_by: Optional[uuid.UUID] = Field(None, description="Resolved by admin ID")
    resolved_by_name: Optional[str] = Field(None, description="Resolved by admin name")
    resolution_notes: Optional[str] = Field(None, description="Resolution notes")
    
    # Occurrence tracking
    occurrence_count: int = Field(..., description="Occurrence count")
    first_occurrence: datetime = Field(..., description="First occurrence")
    last_occurrence: datetime = Field(..., description="Last occurrence")
    
    # Real-time specific fields
    time_since_last_occurrence: Optional[str] = Field(None, description="Time since last occurrence")
    is_active: bool = Field(..., description="Whether error is currently active")
    priority_score: Optional[int] = Field(None, description="Priority score for dashboard")
    
    # Timestamps
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Update timestamp")
    
    class Config:
        from_attributes = True


class RealTimeErrorStatistics(BaseModel):
    """Real-time error statistics response"""
    # Basic counts
    total_errors: int = Field(..., description="Total errors in time range")
    active_errors_count: int = Field(..., description="Currently active (unresolved) errors")
    resolved_errors_count: int = Field(..., description="Resolved errors in time range")
    
    # Severity breakdown
    severity_breakdown: Dict[str, int] = Field(..., description="Errors by severity")
    severity_trends: Dict[str, List[Dict[str, Any]]] = Field(default_factory=dict, description="Severity trends")
    
    # Category breakdown
    category_breakdown: Dict[str, int] = Field(..., description="Errors by category")
    
    # Time-based metrics
    recent_critical_errors: int = Field(..., description="Critical errors in last 24 hours")
    critical_errors_last_hour: int = Field(..., description="Critical errors in last hour")
    errors_per_hour: List[Dict[str, Any]] = Field(default_factory=list, description="Hourly error counts")
    
    # Top error sources
    top_error_endpoints: List[Dict[str, Any]] = Field(..., description="Top error endpoints")
    top_error_types: List[Dict[str, Any]] = Field(default_factory=list, description="Top error types")
    top_affected_tenants: List[Dict[str, Any]] = Field(default_factory=list, description="Most affected tenants")
    
    # Real-time metrics
    error_rate_per_minute: float = Field(default=0.0, description="Current error rate per minute")
    average_resolution_time: Optional[float] = Field(None, description="Average resolution time in minutes")
    
    # Time range information
    time_range: Dict[str, Any] = Field(..., description="Statistics time range")
    last_updated: datetime = Field(..., description="Last update timestamp")
    
    # Health indicators
    system_health_score: Optional[int] = Field(None, description="System health score (0-100)")
    alert_level: str = Field(default="normal", description="Current alert level")


class CriticalErrorAlert(BaseModel):
    """Critical error alert for real-time monitoring"""
    id: uuid.UUID = Field(..., description="Error ID")
    error_message: str = Field(..., description="Error message")
    error_type: str = Field(..., description="Error type")
    endpoint: str = Field(..., description="Affected endpoint")
    severity: ErrorSeverity = Field(..., description="Error severity")
    category: ErrorCategory = Field(..., description="Error category")
    tenant_id: Optional[uuid.UUID] = Field(None, description="Affected tenant")
    tenant_name: Optional[str] = Field(None, description="Tenant name")
    occurrence_count: int = Field(..., description="Number of occurrences")
    first_occurrence: datetime = Field(..., description="First occurrence")
    last_occurrence: datetime = Field(..., description="Last occurrence")
    time_since_last: str = Field(..., description="Time since last occurrence")
    is_escalated: bool = Field(default=False, description="Whether alert is escalated")
    requires_immediate_attention: bool = Field(..., description="Requires immediate attention")


class ErrorResolutionWithTracking(BaseModel):
    """Enhanced error resolution request with tracking"""
    notes: Optional[str] = Field(None, description="Resolution notes")
    resolution_category: Optional[str] = Field(None, description="Resolution category")
    estimated_fix_time: Optional[int] = Field(None, description="Estimated fix time in minutes")
    requires_deployment: bool = Field(default=False, description="Requires deployment")
    follow_up_required: bool = Field(default=False, description="Follow-up required")
    related_ticket_id: Optional[str] = Field(None, description="Related support ticket ID")


class ErrorResolutionResponse(BaseModel):
    """Error resolution response with tracking information"""
    error_id: uuid.UUID = Field(..., description="Error ID")
    resolved_by: uuid.UUID = Field(..., description="Resolved by admin ID")
    resolved_by_name: str = Field(..., description="Admin name")
    resolved_at: datetime = Field(..., description="Resolution timestamp")
    resolution_notes: Optional[str] = Field(None, description="Resolution notes")
    resolution_time_minutes: Optional[float] = Field(None, description="Time to resolve in minutes")
    was_critical: bool = Field(..., description="Whether error was critical")
    affected_users_count: Optional[int] = Field(None, description="Number of affected users")
    broadcast_sent: bool = Field(..., description="Whether real-time update was sent")


class WebSocketConnectionInfo(BaseModel):
    """WebSocket connection information"""
    admin_user_id: uuid.UUID = Field(..., description="Connected admin user ID")
    admin_name: Optional[str] = Field(None, description="Admin name")
    connected_at: datetime = Field(..., description="Connection timestamp")
    last_ping: datetime = Field(..., description="Last ping timestamp")
    connection_duration: str = Field(..., description="Connection duration")
    is_active: bool = Field(..., description="Connection status")


class WebSocketConnectionStatus(BaseModel):
    """WebSocket connection status response"""
    active_connections: int = Field(..., description="Number of active connections")
    connections: List[WebSocketConnectionInfo] = Field(..., description="Connection details")
    status: str = Field(..., description="Overall connection status")
    timestamp: datetime = Field(..., description="Status timestamp")
    total_messages_sent: Optional[int] = Field(None, description="Total messages sent")
    last_broadcast: Optional[datetime] = Field(None, description="Last broadcast timestamp")


class ErrorSimulationRequest(BaseModel):
    """Request schema for error simulation"""
    error_message: str = Field(..., description="Error message to simulate")
    severity: ErrorSeverity = Field(ErrorSeverity.HIGH, description="Error severity")
    category: ErrorCategory = Field(ErrorCategory.SYSTEM, description="Error category")
    tenant_id: Optional[uuid.UUID] = Field(None, description="Tenant ID for simulation")
    simulate_multiple: bool = Field(default=False, description="Simulate multiple occurrences")
    occurrence_count: int = Field(1, ge=1, le=10, description="Number of occurrences to simulate")


class ErrorSimulationResponse(BaseModel):
    """Response schema for error simulation"""
    success: bool = Field(..., description="Simulation success")
    message: str = Field(..., description="Result message")
    error_id: uuid.UUID = Field(..., description="Simulated error ID")
    broadcasted_to_clients: int = Field(..., description="Number of clients notified")
    simulation_details: Dict[str, Any] = Field(..., description="Simulation details")


class ErrorTrendAnalysis(BaseModel):
    """Error trend analysis for dashboard"""
    period: str = Field(..., description="Analysis period")
    total_errors: int = Field(..., description="Total errors in period")
    error_growth_rate: float = Field(..., description="Error growth rate percentage")
    most_common_error_type: str = Field(..., description="Most common error type")
    peak_error_hour: int = Field(..., description="Hour with most errors")
    resolution_rate: float = Field(..., description="Resolution rate percentage")
    average_resolution_time: float = Field(..., description="Average resolution time")
    critical_error_frequency: float = Field(..., description="Critical errors per day")
    trend_direction: str = Field(..., description="Overall trend direction")
    recommendations: List[str] = Field(..., description="Improvement recommendations")


class ErrorDashboardData(BaseModel):
    """Complete error dashboard data"""
    statistics: RealTimeErrorStatistics = Field(..., description="Current statistics")
    active_errors: List[EnhancedErrorLogResponse] = Field(..., description="Active errors")
    critical_alerts: List[CriticalErrorAlert] = Field(..., description="Critical alerts")
    trend_analysis: ErrorTrendAnalysis = Field(..., description="Trend analysis")
    connection_status: WebSocketConnectionStatus = Field(..., description="WebSocket status")
    last_refresh: datetime = Field(..., description="Last data refresh")
    auto_refresh_enabled: bool = Field(default=True, description="Auto refresh status")
    refresh_interval_seconds: int = Field(default=30, description="Refresh interval")


# Validation helpers
class ErrorFilterValidation:
    """Validation helpers for error filtering"""
    
    @staticmethod
    def validate_time_range(hours_back: int) -> int:
        """Validate time range parameter"""
        if hours_back < 1:
            return 1
        elif hours_back > 168:  # 7 days max
            return 168
        return hours_back
    
    @staticmethod
    def validate_limit(limit: int) -> int:
        """Validate limit parameter"""
        if limit < 1:
            return 1
        elif limit > 100:
            return 100
        return limit


# WebSocket message factories
class WebSocketMessageFactory:
    """Factory for creating WebSocket messages"""
    
    @staticmethod
    def create_error_update(error_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create error update message"""
        return {
            "type": WebSocketMessageType.ERROR_UPDATE,
            "data": error_data,
            "timestamp": datetime.utcnow().isoformat()
        }
    
    @staticmethod
    def create_statistics_update(stats_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create statistics update message"""
        return {
            "type": WebSocketMessageType.STATISTICS_UPDATE,
            "data": stats_data,
            "timestamp": datetime.utcnow().isoformat()
        }
    
    @staticmethod
    def create_error_resolved(error_id: uuid.UUID, resolution_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create error resolved message"""
        return {
            "type": WebSocketMessageType.ERROR_RESOLVED,
            "error_id": str(error_id),
            "data": resolution_data,
            "timestamp": datetime.utcnow().isoformat()
        }
    
    @staticmethod
    def create_connection_established() -> Dict[str, Any]:
        """Create connection established message"""
        return {
            "type": WebSocketMessageType.CONNECTION_ESTABLISHED,
            "message": "Connected to real-time error logging",
            "timestamp": datetime.utcnow().isoformat()
        }
    
    @staticmethod
    def create_pong() -> Dict[str, Any]:
        """Create pong response message"""
        return {
            "type": WebSocketMessageType.PONG,
            "timestamp": datetime.utcnow().isoformat()
        }