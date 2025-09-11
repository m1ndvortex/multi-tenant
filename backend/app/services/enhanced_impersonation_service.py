"""
Enhanced User Impersonation Service

Handles secure user impersonation with new window/tab functionality,
automatic session cleanup, enhanced session tracking, and comprehensive audit logging.
"""

from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
import uuid
import json
import hashlib

from ..core.auth import create_impersonation_token, verify_token, AuthenticationError
from ..models.user import User, UserStatus
from ..models.tenant import Tenant, TenantStatus
from ..models.impersonation_session import ImpersonationSession
# from ..models.activity_log import ActivityLog  # Temporarily disabled due to migration issues
from ..core.redis_client import redis_client


class EnhancedImpersonationService:
    """Enhanced service for managing user impersonation sessions with new window support"""
    
    def __init__(self, db: Session):
        self.db = db
        self.redis_client = redis_client.redis_client
    
    def start_impersonation(
        self,
        admin_user: User,
        target_user_id: str,
        duration_hours: int = 2,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        reason: Optional[str] = None,
        is_window_based: bool = True  # New: default to window-based for new functionality
    ) -> Dict[str, Any]:
        """
        Start a new enhanced impersonation session with window support
        
        Args:
            admin_user: Super admin user starting impersonation
            target_user_id: ID of user to impersonate
            duration_hours: Session duration in hours (1-8)
            ip_address: Request IP address
            user_agent: Request user agent
            reason: Reason for impersonation (optional)
            is_window_based: Whether session is opened in new window/tab
            
        Returns:
            Dict with impersonation token and session info for new window opening
            
        Raises:
            HTTPException: If impersonation is not allowed
        """
        # Validate admin user
        if not admin_user.is_super_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only super admin users can start impersonation"
            )
        
        # Validate duration
        if not (1 <= duration_hours <= 8):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Impersonation duration must be between 1 and 8 hours"
            )
        
        # Get target user
        target_user = self.db.query(User).filter(User.id == target_user_id).first()
        
        if not target_user:
            # Log failed attempt
            self._log_impersonation_attempt(
                admin_user=admin_user,
                target_user_id=target_user_id,
                action="impersonation_start_failed",
                status="failed",
                error_message="Target user not found",
                ip_address=ip_address,
                user_agent=user_agent,
                reason=reason
            )
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Target user not found"
            )
        
        # Validate target user
        self._validate_impersonation_target(target_user)
        
        # Generate session ID
        session_id = str(uuid.uuid4())
        
        # Create impersonation token with enhanced payload for new window
        expires_delta = timedelta(hours=duration_hours)
        expires_at = datetime.now(timezone.utc) + expires_delta
        
        impersonation_token = create_impersonation_token(
            admin_user_id=str(admin_user.id),
            target_user_id=str(target_user.id),
            target_tenant_id=str(target_user.tenant_id) if target_user.tenant_id else "",
            expires_delta=expires_delta
        )
        
        # Create JWT token hash for validation
        jwt_token_hash = hashlib.sha256(impersonation_token.encode()).hexdigest()
        
        # Create database session record for enhanced tracking
        db_session = ImpersonationSession(
            session_id=session_id,
            admin_user_id=admin_user.id,
            target_user_id=target_user.id,
            target_tenant_id=target_user.tenant_id,
            started_at=datetime.now(timezone.utc),
            expires_at=expires_at,
            is_active=True,
            is_window_based=is_window_based,
            ip_address=ip_address,
            user_agent=user_agent,
            reason=reason,
            jwt_token_hash=jwt_token_hash,
            last_activity_at=datetime.now(timezone.utc),
            activity_count=1
        )
        
        self.db.add(db_session)
        self.db.commit()
        
        # Store session data in Redis for fast access
        session_data = {
            "session_id": session_id,
            "admin_user_id": str(admin_user.id),
            "target_user_id": str(target_user.id),
            "target_tenant_id": str(target_user.tenant_id) if target_user.tenant_id else None,
            "started_at": datetime.now(timezone.utc).isoformat(),
            "expires_at": expires_at.isoformat(),
            "is_window_based": is_window_based,
            "ip_address": ip_address,
            "user_agent": user_agent,
            "reason": reason,
            "jwt_token_hash": jwt_token_hash
        }
        
        # Store in Redis with expiration
        redis_key = f"impersonation_session:{session_id}"
        self.redis_client.setex(
            redis_key,
            int(expires_delta.total_seconds()),
            json.dumps(session_data)
        )
        
        # Log successful impersonation start
        self._log_impersonation_attempt(
            admin_user=admin_user,
            target_user=target_user,
            action="impersonation_started",
            status="success",
            session_id=session_id,
            ip_address=ip_address,
            user_agent=user_agent,
            reason=reason
        )
        
        return {
            "access_token": impersonation_token,
            "token_type": "bearer",
            "expires_in": duration_hours * 3600,  # Convert to seconds
            "session_id": session_id,
            "target_user": self._serialize_user(target_user),
            "admin_user": self._serialize_user(admin_user),
            "expires_at": expires_at.isoformat(),
            "is_window_based": is_window_based,
            "window_url": self._generate_window_url(target_user, impersonation_token)  # New: URL for new window
        }
    
    def end_impersonation(
        self,
        current_user: User,
        session_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        termination_reason: str = "manual"
    ) -> Dict[str, str]:
        """
        End an active impersonation session with enhanced cleanup
        
        Args:
            current_user: Current user (should be in impersonation)
            session_id: Session ID to end (optional)
            ip_address: Request IP address
            user_agent: Request user agent
            termination_reason: Reason for termination (manual, window_closed, expired, admin_terminated)
            
        Returns:
            Dict with termination confirmation
            
        Raises:
            HTTPException: If not in impersonation or session not found
        """
        # Validate impersonation context
        if not hasattr(current_user, 'is_impersonation') or not current_user.is_impersonation:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Not currently in an impersonation session"
            )
        
        # Get session ID from context if not provided
        if not session_id:
            session_id = getattr(current_user, 'impersonation_session_id', None)
            if not session_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid impersonation session"
                )
        
        # Get admin user for logging
        admin_user_id = getattr(current_user, 'admin_user_id', None)
        admin_user = None
        if admin_user_id:
            admin_user = self.db.query(User).filter(User.id == admin_user_id).first()
        
        # Update database session record
        db_session = self.db.query(ImpersonationSession).filter(
            ImpersonationSession.session_id == session_id,
            ImpersonationSession.is_active == True
        ).first()
        
        if db_session:
            db_session.end_session(reason=termination_reason, terminated_by_admin_id=admin_user_id)
            self.db.commit()
            
            # Remove session from Redis
            redis_key = f"impersonation_session:{session_id}"
            self.redis_client.delete(redis_key)
        
        # Log impersonation end
        self._log_impersonation_attempt(
            admin_user=admin_user,
            target_user=current_user,
            action="impersonation_ended",
            status="success",
            session_id=session_id,
            ip_address=ip_address,
            user_agent=user_agent,
            reason=f"Session ended: {termination_reason}"
        )
        
        return {
            "message": "Impersonation session ended successfully",
            "session_id": session_id,
            "termination_reason": termination_reason,
            "ended_at": datetime.now(timezone.utc).isoformat()
        }
    
    def detect_window_closure(
        self,
        session_id: str,
        admin_user: User
    ) -> Dict[str, Any]:
        """
        Detect and handle automatic window closure cleanup
        
        Args:
            session_id: Session ID to mark as window closed
            admin_user: Admin user for logging
            
        Returns:
            Dict with cleanup confirmation
        """
        # Update database session record
        db_session = self.db.query(ImpersonationSession).filter(
            ImpersonationSession.session_id == session_id,
            ImpersonationSession.is_active == True
        ).first()
        
        if db_session:
            db_session.detect_window_closure()
            self.db.commit()
            
            # Remove session from Redis
            redis_key = f"impersonation_session:{session_id}"
            self.redis_client.delete(redis_key)
            
            # Log automatic cleanup
            self._log_impersonation_attempt(
                admin_user=admin_user,
                target_user_id=str(db_session.target_user_id),
                action="impersonation_window_closed",
                status="success",
                session_id=session_id,
                reason="Automatic cleanup - window/tab closed"
            )
            
            return {
                "message": "Window closure detected and session cleaned up",
                "session_id": session_id,
                "cleanup_at": datetime.now(timezone.utc).isoformat()
            }
        
        return {
            "message": "Session not found or already ended",
            "session_id": session_id
        }
    
    def get_enhanced_active_sessions(
        self,
        admin_user_id: Optional[str] = None,
        target_user_id: Optional[str] = None,
        include_window_based: bool = True
    ) -> List[Dict[str, Any]]:
        """
        Get enhanced active impersonation sessions with better tracking
        
        Args:
            admin_user_id: Filter by admin user ID (optional)
            target_user_id: Filter by target user ID (optional)
            include_window_based: Include window-based sessions
            
        Returns:
            List of enhanced active session data
        """
        query = self.db.query(ImpersonationSession).filter(
            ImpersonationSession.is_active == True
        )
        
        if admin_user_id:
            query = query.filter(ImpersonationSession.admin_user_id == admin_user_id)
        
        if target_user_id:
            query = query.filter(ImpersonationSession.target_user_id == target_user_id)
        
        if not include_window_based:
            query = query.filter(ImpersonationSession.is_window_based == False)
        
        sessions = query.order_by(ImpersonationSession.started_at.desc()).all()
        
        active_sessions = []
        for session in sessions:
            # Check if session is expired and clean up if needed
            if session.is_expired:
                session.end_session(reason="expired")
                self.db.commit()
                
                # Remove from Redis
                redis_key = f"impersonation_session:{session.session_id}"
                self.redis_client.delete(redis_key)
                continue
            
            active_sessions.append(session.to_dict())
        
        return active_sessions
    
    def validate_enhanced_session(
        self,
        session_id: str,
        jwt_token: Optional[str] = None
    ) -> bool:
        """
        Enhanced session validation with JWT token verification
        
        Args:
            session_id: Session ID to validate
            jwt_token: JWT token to verify (optional)
            
        Returns:
            True if session is valid and active
        """
        # Check database session
        db_session = self.db.query(ImpersonationSession).filter(
            ImpersonationSession.session_id == session_id,
            ImpersonationSession.is_active == True
        ).first()
        
        if not db_session:
            return False
        
        # Check if expired
        if db_session.is_expired:
            db_session.end_session(reason="expired")
            self.db.commit()
            
            # Clean up Redis
            redis_key = f"impersonation_session:{session_id}"
            self.redis_client.delete(redis_key)
            return False
        
        # Verify JWT token if provided
        if jwt_token and db_session.jwt_token_hash:
            token_hash = hashlib.sha256(jwt_token.encode()).hexdigest()
            if token_hash != db_session.jwt_token_hash:
                return False
        
        # Mark activity
        db_session.mark_activity()
        self.db.commit()
        
        return True
    
    def cleanup_expired_sessions(self) -> Dict[str, int]:
        """
        Clean up expired sessions from database and Redis
        
        Returns:
            Dict with cleanup statistics
        """
        # Find expired sessions
        expired_sessions = self.db.query(ImpersonationSession).filter(
            ImpersonationSession.is_active == True,
            ImpersonationSession.expires_at < datetime.now(timezone.utc)
        ).all()
        
        cleaned_count = 0
        for session in expired_sessions:
            session.end_session(reason="expired")
            
            # Remove from Redis
            redis_key = f"impersonation_session:{session.session_id}"
            self.redis_client.delete(redis_key)
            
            cleaned_count += 1
        
        if cleaned_count > 0:
            self.db.commit()
        
        return {
            "cleaned_sessions": cleaned_count,
            "cleanup_at": datetime.now(timezone.utc).isoformat()
        }
    
    def _generate_window_url(self, target_user: User, token: str) -> str:
        """
        Generate URL for opening impersonation in new window
        
        Args:
            target_user: Target user being impersonated
            token: JWT impersonation token
            
        Returns:
            URL for new window opening
        """
        # This would be the tenant frontend URL with impersonation token
        if target_user.tenant_id:
            tenant = self.db.query(Tenant).filter(Tenant.id == target_user.tenant_id).first()
            if tenant and tenant.domain:
                return f"https://{tenant.domain}?impersonation_token={token}"
        
        # Fallback to default tenant frontend
        return f"http://localhost:3001?impersonation_token={token}"
    
    def _validate_impersonation_target(self, target_user: User):
        """Validate that target user can be impersonated"""
        if target_user.is_super_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot impersonate super admin users"
            )
        
        if target_user.status != UserStatus.ACTIVE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot impersonate inactive users"
            )
        
        # Check tenant status if user has tenant
        if target_user.tenant_id:
            tenant = self.db.query(Tenant).filter(Tenant.id == target_user.tenant_id).first()
            if not tenant or tenant.status != TenantStatus.ACTIVE:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot impersonate users from inactive tenants"
                )
    
    def _serialize_user(self, user: User) -> Dict[str, Any]:
        """Serialize user for API response"""
        return {
            "id": str(user.id),
            "email": user.email,
            "name": f"{user.first_name} {user.last_name}",
            "role": user.role.value if user.role else None,
            "tenant_id": str(user.tenant_id) if user.tenant_id else None,
            "is_super_admin": user.is_super_admin
        }
    
    def _log_impersonation_attempt(
        self,
        admin_user: Optional[User] = None,
        target_user: Optional[User] = None,
        target_user_id: Optional[str] = None,
        action: str = "impersonation_attempt",
        status: str = "success",
        session_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        reason: Optional[str] = None,
        error_message: Optional[str] = None
    ):
        """Log impersonation attempt with enhanced details"""
        try:
            details = {
                "admin_user_id": str(admin_user.id) if admin_user else None,
                "target_user_id": target_user_id or (str(target_user.id) if target_user else None),
                "session_id": session_id,
                "reason": reason,
                "error_message": error_message,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            
            # TODO: Re-enable activity logging once ActivityLog table is restored
            # Create activity log entry
            # log_entry = ActivityLog(
            #     user_id=admin_user.id if admin_user else None,
            #     action=action,
            #     resource_type="impersonation_session",
            #     resource_id=session_id,
            #     details=details,
            #     ip_address=ip_address,
            #     user_agent=user_agent,
            #     status=status,
            #     error_message=error_message,
            #     tenant_id=admin_user.tenant_id if admin_user else None
            # )
            # 
            # self.db.add(log_entry)
            # self.db.commit()
            
            # For now, just print the log for debugging
            print(f"Impersonation log: {action} - {status} - {details}")
            
        except Exception as e:
            # Don't fail the main operation if logging fails
            print(f"Failed to log impersonation attempt: {e}")