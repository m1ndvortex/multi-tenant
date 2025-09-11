"""
Enhanced User Impersonation API endpoints

Provides enhanced secure user impersonation functionality for Super Admin users
with new window/tab opening, automatic session cleanup, and comprehensive session management.
"""

from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Request, BackgroundTasks
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
import uuid

from ..core.database import get_db
from ..core.auth import get_super_admin_user, get_current_user
from ..models.user import User
from ..services.enhanced_impersonation_service import EnhancedImpersonationService


router = APIRouter(prefix="/enhanced-impersonation", tags=["Enhanced Impersonation"])


# Enhanced Pydantic models for request/response
class EnhancedImpersonationStartRequest(BaseModel):
    """Enhanced start impersonation request model"""
    target_user_id: str = Field(..., description="Target user ID to impersonate")
    duration_hours: Optional[int] = Field(2, ge=1, le=8, description="Session duration in hours (1-8)")
    reason: Optional[str] = Field(None, max_length=500, description="Reason for impersonation")
    is_window_based: bool = Field(True, description="Open in new window/tab (default: true)")


class EnhancedImpersonationStartResponse(BaseModel):
    """Enhanced start impersonation response model"""
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    session_id: str
    target_user: dict
    admin_user: dict
    expires_at: str
    is_window_based: bool
    window_url: str  # New: URL for opening in new window


class EnhancedImpersonationEndRequest(BaseModel):
    """Enhanced end impersonation request model"""
    session_id: Optional[str] = Field(None, description="Specific session ID to end (optional)")
    termination_reason: str = Field("manual", description="Reason for termination")


class EnhancedImpersonationEndResponse(BaseModel):
    """Enhanced end impersonation response model"""
    message: str
    session_id: str
    termination_reason: str
    ended_at: str


class WindowClosureDetectionRequest(BaseModel):
    """Window closure detection request model"""
    session_id: str = Field(..., description="Session ID to mark as window closed")


class WindowClosureDetectionResponse(BaseModel):
    """Window closure detection response model"""
    message: str
    session_id: str
    cleanup_at: str


class EnhancedActiveSessionResponse(BaseModel):
    """Enhanced active session response model"""
    id: str
    session_id: str
    admin_user_id: str
    target_user_id: str
    target_tenant_id: Optional[str]
    started_at: str
    expires_at: str
    ended_at: Optional[str]
    is_active: bool
    is_window_based: bool
    window_closed_detected: bool
    ip_address: Optional[str]
    user_agent: Optional[str]
    reason: Optional[str]
    last_activity_at: Optional[str]
    activity_count: int
    termination_reason: Optional[str]
    terminated_by_admin_id: Optional[str]
    duration_minutes: Optional[int]
    created_at: str
    updated_at: str


class SessionValidationResponse(BaseModel):
    """Session validation response model"""
    session_id: str
    is_valid: bool
    session_data: Optional[dict]
    validated_at: str


class SessionCleanupResponse(BaseModel):
    """Session cleanup response model"""
    cleaned_sessions: int
    cleanup_at: str


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


@router.post("/start", response_model=EnhancedImpersonationStartResponse)
async def start_enhanced_impersonation(
    impersonation_data: EnhancedImpersonationStartRequest,
    request: Request,
    admin_user: User = Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    """
    Start enhanced user impersonation session with new window support (Super Admin only)
    
    Creates a new impersonation session with enhanced features:
    - New window/tab opening support
    - Enhanced session tracking in database
    - Automatic cleanup detection
    - Comprehensive audit logging
    
    - **target_user_id**: ID of user to impersonate
    - **duration_hours**: Session duration in hours (1-8, default: 2)
    - **reason**: Optional reason for impersonation (for audit purposes)
    - **is_window_based**: Open in new window/tab (default: true)
    
    Returns enhanced impersonation token and session information with window URL.
    """
    # Get client information
    ip_address = get_client_ip(request)
    user_agent = get_user_agent(request)
    
    # Create enhanced impersonation service
    impersonation_service = EnhancedImpersonationService(db)
    
    # Start enhanced impersonation session
    result = impersonation_service.start_impersonation(
        admin_user=admin_user,
        target_user_id=impersonation_data.target_user_id,
        duration_hours=impersonation_data.duration_hours,
        ip_address=ip_address,
        user_agent=user_agent,
        reason=impersonation_data.reason,
        is_window_based=impersonation_data.is_window_based
    )
    
    return EnhancedImpersonationStartResponse(
        access_token=result["access_token"],
        token_type=result["token_type"],
        expires_in=result["expires_in"],
        session_id=result["session_id"],
        target_user=result["target_user"],
        admin_user=result["admin_user"],
        expires_at=result["expires_at"],
        is_window_based=result["is_window_based"],
        window_url=result["window_url"]
    )


@router.post("/end", response_model=EnhancedImpersonationEndResponse)
async def end_enhanced_impersonation(
    end_data: EnhancedImpersonationEndRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    End current enhanced impersonation session
    
    Ends the active impersonation session with enhanced cleanup and logging.
    Can be called from within an impersonation session or by super admin
    to end a specific session.
    
    - **session_id**: Optional specific session ID to end
    - **termination_reason**: Reason for termination (manual, window_closed, etc.)
    
    Returns confirmation of session termination with enhanced details.
    """
    # Get client information
    ip_address = get_client_ip(request)
    user_agent = get_user_agent(request)
    
    # Create enhanced impersonation service
    impersonation_service = EnhancedImpersonationService(db)
    
    # End enhanced impersonation session
    result = impersonation_service.end_impersonation(
        current_user=current_user,
        session_id=end_data.session_id,
        ip_address=ip_address,
        user_agent=user_agent,
        termination_reason=end_data.termination_reason
    )
    
    return EnhancedImpersonationEndResponse(
        message=result["message"],
        session_id=result["session_id"],
        termination_reason=result["termination_reason"],
        ended_at=result["ended_at"]
    )


@router.post("/detect-window-closure", response_model=WindowClosureDetectionResponse)
async def detect_window_closure(
    closure_data: WindowClosureDetectionRequest,
    admin_user: User = Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    """
    Detect and handle automatic window closure cleanup (Super Admin only)
    
    This endpoint is called when the frontend detects that an impersonation
    window/tab has been closed, triggering automatic session cleanup.
    
    - **session_id**: Session ID to mark as window closed
    
    Returns confirmation of automatic cleanup.
    """
    # Create enhanced impersonation service
    impersonation_service = EnhancedImpersonationService(db)
    
    # Handle window closure detection
    result = impersonation_service.detect_window_closure(
        session_id=closure_data.session_id,
        admin_user=admin_user
    )
    
    return WindowClosureDetectionResponse(
        message=result["message"],
        session_id=result["session_id"],
        cleanup_at=result.get("cleanup_at", datetime.utcnow().isoformat())
    )


@router.get("/sessions", response_model=List[EnhancedActiveSessionResponse])
async def get_enhanced_active_sessions(
    admin_user_id: Optional[str] = None,
    target_user_id: Optional[str] = None,
    include_window_based: bool = True,
    admin_user: User = Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get enhanced active impersonation sessions (Super Admin only)
    
    Returns list of currently active impersonation sessions with enhanced tracking.
    Can be filtered by admin user ID or target user ID.
    
    - **admin_user_id**: Filter by admin user ID (optional)
    - **target_user_id**: Filter by target user ID (optional)
    - **include_window_based**: Include window-based sessions (default: true)
    
    Returns list of enhanced active sessions with comprehensive details.
    """
    # Create enhanced impersonation service
    impersonation_service = EnhancedImpersonationService(db)
    
    # Get enhanced active sessions
    sessions = impersonation_service.get_enhanced_active_sessions(
        admin_user_id=admin_user_id,
        target_user_id=target_user_id,
        include_window_based=include_window_based
    )
    
    return [
        EnhancedActiveSessionResponse(
            id=session["id"],
            session_id=session["session_id"],
            admin_user_id=session["admin_user_id"],
            target_user_id=session["target_user_id"],
            target_tenant_id=session.get("target_tenant_id"),
            started_at=session["started_at"],
            expires_at=session["expires_at"],
            ended_at=session.get("ended_at"),
            is_active=session["is_active"],
            is_window_based=session["is_window_based"],
            window_closed_detected=session["window_closed_detected"],
            ip_address=session.get("ip_address"),
            user_agent=session.get("user_agent"),
            reason=session.get("reason"),
            last_activity_at=session.get("last_activity_at"),
            activity_count=session["activity_count"],
            termination_reason=session.get("termination_reason"),
            terminated_by_admin_id=session.get("terminated_by_admin_id"),
            duration_minutes=session.get("duration_minutes"),
            created_at=session["created_at"],
            updated_at=session["updated_at"]
        )
        for session in sessions
    ]


@router.get("/validate-session/{session_id}", response_model=SessionValidationResponse)
async def validate_enhanced_session(
    session_id: str,
    jwt_token: Optional[str] = None,
    admin_user: User = Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    """
    Validate an enhanced impersonation session (Super Admin only)
    
    Checks if a specific impersonation session is valid and active with
    enhanced validation including JWT token verification.
    
    - **session_id**: Session ID to validate
    - **jwt_token**: JWT token to verify (optional)
    
    Returns enhanced session validation status and details.
    """
    # Create enhanced impersonation service
    impersonation_service = EnhancedImpersonationService(db)
    
    # Validate enhanced session
    is_valid = impersonation_service.validate_enhanced_session(
        session_id=session_id,
        jwt_token=jwt_token
    )
    
    # Get session data if valid
    session_data = None
    if is_valid:
        sessions = impersonation_service.get_enhanced_active_sessions()
        session_data = next((s for s in sessions if s["session_id"] == session_id), None)
    
    return SessionValidationResponse(
        session_id=session_id,
        is_valid=is_valid,
        session_data=session_data,
        validated_at=datetime.utcnow().isoformat()
    )


@router.delete("/sessions/{session_id}")
async def terminate_enhanced_session(
    session_id: str,
    request: Request,
    admin_user: User = Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    """
    Terminate a specific enhanced impersonation session (Super Admin only)
    
    Forcefully terminates an active impersonation session with enhanced cleanup.
    This is useful for emergency session termination.
    
    - **session_id**: Session ID to terminate
    
    Returns confirmation of session termination.
    """
    # Get client information
    ip_address = get_client_ip(request)
    user_agent = get_user_agent(request)
    
    # Create enhanced impersonation service
    impersonation_service = EnhancedImpersonationService(db)
    
    # Get session data first
    sessions = impersonation_service.get_enhanced_active_sessions()
    session_data = next((s for s in sessions if s["session_id"] == session_id), None)
    
    if not session_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    # Terminate the session directly (admin termination)
    result = impersonation_service.admin_terminate_session(
        admin_user=admin_user,
        session_id=session_id,
        ip_address=ip_address,
        user_agent=user_agent
    )
    
    return {
        "message": "Session terminated successfully",
        "session_id": session_id,
        "terminated_at": datetime.utcnow().isoformat(),
        "terminated_by": str(admin_user.id)
    }


@router.post("/cleanup-expired", response_model=SessionCleanupResponse)
async def cleanup_expired_sessions(
    background_tasks: BackgroundTasks,
    admin_user: User = Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    """
    Clean up expired impersonation sessions (Super Admin only)
    
    Manually trigger cleanup of expired sessions from database and Redis.
    This is useful for maintenance and ensuring clean session state.
    
    Returns cleanup statistics.
    """
    # Create enhanced impersonation service
    impersonation_service = EnhancedImpersonationService(db)
    
    # Clean up expired sessions
    result = impersonation_service.cleanup_expired_sessions()
    
    return SessionCleanupResponse(
        cleaned_sessions=result["cleaned_sessions"],
        cleanup_at=result["cleanup_at"]
    )


@router.get("/current-session")
async def get_current_enhanced_session(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get current enhanced impersonation session information
    
    Returns information about the current impersonation session if active.
    Can be called from within an impersonation session to get enhanced session details.
    
    Returns current enhanced session information or error if not in impersonation.
    """
    # Check if currently in impersonation
    if not hasattr(current_user, 'is_impersonation') or not current_user.is_impersonation:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Not currently in an impersonation session"
        )
    
    admin_user_id = getattr(current_user, 'admin_user_id', None)
    session_id = getattr(current_user, 'impersonation_session_id', None)
    
    if not admin_user_id or not session_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid impersonation session context"
        )
    
    # Get enhanced session data
    impersonation_service = EnhancedImpersonationService(db)
    sessions = impersonation_service.get_enhanced_active_sessions()
    session_data = next((s for s in sessions if s["session_id"] == session_id), None)
    
    return {
        "is_impersonation": True,
        "admin_user_id": admin_user_id,
        "target_user_id": str(current_user.id),
        "target_tenant_id": str(current_user.tenant_id) if current_user.tenant_id else None,
        "session_id": session_id,
        "session_data": session_data,
        "current_time": datetime.utcnow().isoformat()
    }


# Health check endpoint for enhanced impersonation service
@router.get("/health")
async def enhanced_impersonation_health_check():
    """Enhanced impersonation service health check"""
    return {
        "status": "healthy",
        "service": "enhanced_impersonation",
        "features": [
            "new_window_support",
            "automatic_cleanup",
            "enhanced_session_tracking",
            "jwt_token_validation",
            "comprehensive_audit_logging"
        ],
        "timestamp": datetime.utcnow().isoformat()
    }