"""
Schemas for Online Users Monitoring System
"""
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, validator
from datetime import datetime
from uuid import UUID


class UserActivityUpdateRequest(BaseModel):
    """Request schema for updating user activity"""
    session_id: str = Field(..., description="User session identifier")
    user_agent: Optional[str] = Field(None, description="User agent string")
    ip_address: Optional[str] = Field(None, description="User IP address")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class OnlineUserResponse(BaseModel):
    """Response schema for online user information"""
    id: UUID
    user_id: UUID
    tenant_id: UUID
    user_email: str
    user_full_name: str
    tenant_name: str
    is_online: bool
    last_activity: datetime
    session_id: str
    user_agent: Optional[str] = None
    ip_address: Optional[str] = None
    session_duration_minutes: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda v: v.isoformat(),
            UUID: lambda v: str(v)
        }


class OnlineUsersStatsResponse(BaseModel):
    """Response schema for online users statistics"""
    total_online_users: int = Field(..., description="Total number of online users")
    total_offline_users: int = Field(..., description="Total number of offline users")
    online_by_tenant: Dict[str, int] = Field(..., description="Online users count by tenant")
    recent_activity_count: int = Field(..., description="Users active in last 5 minutes")
    peak_online_today: int = Field(..., description="Peak online users today")
    average_session_duration: float = Field(..., description="Average session duration in minutes")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class TenantOnlineUsersResponse(BaseModel):
    """Response schema for tenant-specific online users"""
    tenant_id: UUID
    tenant_name: str
    online_users_count: int
    offline_users_count: int
    users: List[OnlineUserResponse]
    
    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda v: v.isoformat(),
            UUID: lambda v: str(v)
        }


class OnlineUsersFilterRequest(BaseModel):
    """Request schema for filtering online users"""
    tenant_id: Optional[UUID] = Field(None, description="Filter by specific tenant")
    is_online: Optional[bool] = Field(None, description="Filter by online status")
    last_activity_minutes: Optional[int] = Field(None, description="Filter by last activity within X minutes")
    limit: int = Field(50, ge=1, le=500, description="Maximum number of results")
    offset: int = Field(0, ge=0, description="Offset for pagination")
    
    class Config:
        json_encoders = {
            UUID: lambda v: str(v)
        }


class UserSessionResponse(BaseModel):
    """Response schema for user session information"""
    user_id: UUID
    tenant_id: UUID
    session_id: str
    is_online: bool
    last_activity: datetime
    session_start: datetime
    session_duration_minutes: int
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    
    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda v: v.isoformat(),
            UUID: lambda v: str(v)
        }


class OnlineUsersWebSocketMessage(BaseModel):
    """WebSocket message schema for real-time updates"""
    type: str = Field(..., description="Message type: 'user_online', 'user_offline', 'activity_update', 'stats_update'")
    data: Dict[str, Any] = Field(..., description="Message data")
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class BulkUserStatusResponse(BaseModel):
    """Response schema for bulk user status operations"""
    success: bool
    message: str
    updated_count: int
    failed_count: int
    errors: List[str] = Field(default_factory=list)
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class UserOnlineStatusCreateRequest(BaseModel):
    """Request schema for creating user online status"""
    user_id: UUID
    session_id: str
    user_agent: Optional[str] = None
    ip_address: Optional[str] = None
    
    class Config:
        json_encoders = {
            UUID: lambda v: str(v)
        }


class UserOnlineStatusUpdateRequest(BaseModel):
    """Request schema for updating user online status"""
    is_online: Optional[bool] = None
    user_agent: Optional[str] = None
    ip_address: Optional[str] = None
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class OnlineUsersHistoryResponse(BaseModel):
    """Response schema for online users history"""
    date: datetime
    peak_online: int
    average_online: float
    total_sessions: int
    average_session_duration: float
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class RealtimeConnectionStatus(BaseModel):
    """Schema for WebSocket connection status"""
    connected: bool
    connection_id: str
    connected_at: datetime
    last_ping: Optional[datetime] = None
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }