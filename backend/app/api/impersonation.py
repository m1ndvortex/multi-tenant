"""
User Impersonation API endpoints

Provides secure user impersonation functionality for Super Admin users
with comprehensive audit logging and session management.
"""

from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
import uuid

from ..core.database import get_db
from ..core.auth import get_super_admin_user, get_current_user
from ..models.user import User
from ..services.impersonation_service import ImpersonationService


router = APIRouter(prefix="/impersonation", tags=["impersonation"])


# Pydantic models for request/response
class ImpersonationStartRequest(BaseModel):
    """Start impersonation request model"""
    target_user_id: str = Field(..., description="Target user ID to impersonate")
    duration_hours: Optional[int] = Field(2, ge=1, le=8, description="Session duration in hours (1-8)")
    reason: Optional[str] = Field(None, max_length=500, description="Reason for impersonation")


class ImpersonationStartResponse(BaseModel):
    """Start impersonation response model"""
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    session_id: str
    target_user: dict
    admin_user: dict
    expires_at: str


class ImpersonationEndRequest(BaseModel):
    """End impersonation request model"""
    session_id: Optional[str] = Field(None, description="Specific session ID to end (optional)")


class ImpersonationEndResponse(BaseModel):
    """End impersonation response model"""
    message: str
    ended_at: str


class ActiveSessionResponse(BaseModel):
    """Active session response model"""
    session_id: str
    admin_user_id: str
    target_user_id: str
    target_tenant_id: Optional[str]
    started_at: str
    expires_at: str
    ip_address: Optional[str]
    user_agent: Optional[str]
    reason: Optional[str]
    status: str


class AuditLogResponse(BaseModel):
    """Audit log response model"""
    id: str
    action: str
    status: str
    admin_user_id: str
    target_user_id: Optional[str]
    session_id: Optional[str]
    ip_address: Optional[str]
    reason: Optional[str]
    created_at: str
    details: dict


def get_client_ip(request: Request) -> Optional[str]:
    """Extract client IP address from request"""
    # Check for forwarded headers first (for reverse proxy setups)
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip
    
    # Fallback to direct client IP
    return request.client.host if request.client else None


def get_user_agent(request: Request) -> Optional[str]:
    """Extract user agent from request"""
    return request.headers.get("User-Agent")


@router.post("/start", response_model=ImpersonationStartResponse)
async def start_impersonation(
    impersonation_data: ImpersonationStartRequest,
    request: Request,
    admin_user: User = Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    """
    Start user impersonation session (Super Admin only)
    
    Creates a new impersonation session with comprehensive audit logging.
    The session is stored in Redis and has a configurable expiration time.
    
    - **target_user_id**: ID of user to impersonate
    - **duration_hours**: Session duration in hours (1-8, default: 2)
    - **reason**: Optional reason for impersonation (for audit purposes)
    
    Returns impersonation token and session information.
    """
    # Get client information
    ip_address = get_client_ip(request)
    user_agent = get_user_agent(request)
    
    # Create impersonation service
    impersonation_service = ImpersonationService(db)
    
    # Start impersonation session
    result = impersonation_service.start_impersonation(
        admin_user=admin_user,
        target_user_id=impersonation_data.target_user_id,
        duration_hours=impersonation_data.duration_hours,
        ip_address=ip_address,
        user_agent=user_agent,
        reason=impersonation_data.reason
    )
    
    return ImpersonationStartResponse(
        access_token=result["access_token"],
        token_type=result["token_type"],
        expires_in=result["expires_in"],
        session_id=result["session_id"],
        target_user=result["target_user"],
        admin_user=result["admin_user"],
        expires_at=result["expires_at"]
    )


@router.post("/end", response_model=ImpersonationEndResponse)
async def end_impersonation(
    end_data: ImpersonationEndRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    End current impersonation session
    
    Ends the active impersonation session and logs the action.
    Can be called from within an impersonation session or by super admin
    to end a specific session.
    
    - **session_id**: Optional specific session ID to end
    
    Returns confirmation of session termination.
    """
    # Get client information
    ip_address = get_client_ip(request)
    user_agent = get_user_agent(request)
    
    # Create impersonation service
    impersonation_service = ImpersonationService(db)
    
    # End impersonation session
    result = impersonation_service.end_impersonation(
        current_user=current_user,
        session_id=end_data.session_id,
        ip_address=ip_address,
        user_agent=user_agent
    )
    
    return ImpersonationEndResponse(
        message=result["message"],
        ended_at=datetime.utcnow().isoformat()
    )


@router.get("/sessions", response_model=List[ActiveSessionResponse])
async def get_active_sessions(
    admin_user_id: Optional[str] = None,
    target_user_id: Optional[str] = None,
    admin_user: User = Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get active impersonation sessions (Super Admin only)
    
    Returns list of currently active impersonation sessions.
    Can be filtered by admin user ID or target user ID.
    
    - **admin_user_id**: Filter by admin user ID (optional)
    - **target_user_id**: Filter by target user ID (optional)
    
    Returns list of active sessions with details.
    """
    # Create impersonation service
    impersonation_service = ImpersonationService(db)
    
    # Get active sessions
    sessions = impersonation_service.get_active_sessions(
        admin_user_id=admin_user_id,
        target_user_id=target_user_id
    )
    
    return [
        ActiveSessionResponse(
            session_id=session["session_id"],
            admin_user_id=session["admin_user_id"],
            target_user_id=session["target_user_id"],
            target_tenant_id=session.get("target_tenant_id"),
            started_at=session["started_at"],
            expires_at=session["expires_at"],
            ip_address=session.get("ip_address"),
            user_agent=session.get("user_agent"),
            reason=session.get("reason"),
            status=session["status"]
        )
        for session in sessions
    ]


@router.get("/audit-log", response_model=List[AuditLogResponse])
async def get_impersonation_audit_log(
    admin_user_id: Optional[str] = None,
    target_user_id: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    limit: int = 100,
    offset: int = 0,
    admin_user: User = Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get impersonation audit log (Super Admin only)
    
    Returns comprehensive audit log of all impersonation activities.
    Supports filtering by various criteria and pagination.
    
    - **admin_user_id**: Filter by admin user ID (optional)
    - **target_user_id**: Filter by target user ID (optional)
    - **start_date**: Filter by start date (optional)
    - **end_date**: Filter by end date (optional)
    - **limit**: Maximum number of results (1-1000, default: 100)
    - **offset**: Number of results to skip (default: 0)
    
    Returns paginated list of audit log entries.
    """
    # Validate parameters
    if limit < 1 or limit > 1000:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Limit must be between 1 and 1000"
        )
    
    if offset < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Offset must be non-negative"
        )
    # Create impersonation service
    impersonation_service = ImpersonationService(db)
    
    # Get audit log
    logs = impersonation_service.get_impersonation_audit_log(
        admin_user_id=admin_user_id,
        target_user_id=target_user_id,
        start_date=start_date,
        end_date=end_date,
        limit=limit,
        offset=offset
    )
    
    return [
        AuditLogResponse(
            id=log["id"],
            action=log["action"],
            status=log["status"],
            admin_user_id=log["details"].get("admin_user_id", ""),
            target_user_id=log["details"].get("target_user_id"),
            session_id=log["details"].get("session_id"),
            ip_address=log.get("ip_address"),
            reason=log["details"].get("reason"),
            created_at=log["created_at"],
            details=log["details"]
        )
        for log in logs
    ]


@router.get("/validate-session/{session_id}")
async def validate_impersonation_session(
    session_id: str,
    admin_user: User = Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    """
    Validate an impersonation session (Super Admin only)
    
    Checks if a specific impersonation session is valid and active.
    
    - **session_id**: Session ID to validate
    
    Returns session validation status and details.
    """
    # Create impersonation service
    impersonation_service = ImpersonationService(db)
    
    # Get session data
    session_data = impersonation_service._get_session_data(session_id)
    
    if not session_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    # Validate session
    is_valid = impersonation_service.validate_impersonation_session(
        session_id=session_id,
        admin_user_id=session_data["admin_user_id"],
        target_user_id=session_data["target_user_id"]
    )
    
    return {
        "session_id": session_id,
        "is_valid": is_valid,
        "session_data": session_data if is_valid else None,
        "validated_at": datetime.utcnow().isoformat()
    }


@router.delete("/sessions/{session_id}")
async def terminate_session(
    session_id: str,
    request: Request,
    admin_user: User = Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    """
    Terminate a specific impersonation session (Super Admin only)
    
    Forcefully terminates an active impersonation session.
    This is useful for emergency session termination.
    
    - **session_id**: Session ID to terminate
    
    Returns confirmation of session termination.
    """
    # Get client information
    ip_address = get_client_ip(request)
    user_agent = get_user_agent(request)
    
    # Create impersonation service
    impersonation_service = ImpersonationService(db)
    
    # Get session data first
    session_data = impersonation_service._get_session_data(session_id)
    
    if not session_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    # Get target user for logging
    target_user = db.query(User).filter(User.id == session_data["target_user_id"]).first()
    
    # Remove session from Redis
    redis_key = f"impersonation_session:{session_id}"
    impersonation_service.redis_client.delete(redis_key)
    
    # Log session termination
    impersonation_service._log_impersonation_attempt(
        admin_user=admin_user,
        target_user=target_user,
        action="impersonation_terminated",
        status="success",
        session_id=session_id,
        ip_address=ip_address,
        user_agent=user_agent,
        reason="Terminated by super admin"
    )
    
    return {
        "message": "Session terminated successfully",
        "session_id": session_id,
        "terminated_at": datetime.utcnow().isoformat(),
        "terminated_by": str(admin_user.id)
    }


@router.get("/current-session")
async def get_current_impersonation_session(
    current_user: User = Depends(get_current_user)
):
    """
    Get current impersonation session information
    
    Returns information about the current impersonation session if active.
    Can be called from within an impersonation session to get session details.
    
    Returns current session information or error if not in impersonation.
    """
    # Check if currently in impersonation
    if not hasattr(current_user, 'is_impersonation') or not current_user.is_impersonation:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Not currently in an impersonation session"
        )
    
    admin_user_id = getattr(current_user, 'admin_user_id', None)
    if not admin_user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid impersonation session context"
        )
    
    return {
        "is_impersonation": True,
        "admin_user_id": admin_user_id,
        "target_user_id": str(current_user.id),
        "target_tenant_id": str(current_user.tenant_id) if current_user.tenant_id else None,
        "current_time": datetime.utcnow().isoformat()
    }


# Health check endpoint for impersonation service
@router.get("/health")
async def impersonation_health_check():
    """Impersonation service health check"""
    return {
        "status": "healthy",
        "service": "impersonation",
        "timestamp": datetime.utcnow().isoformat()
    }