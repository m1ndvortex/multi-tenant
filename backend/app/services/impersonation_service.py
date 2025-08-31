"""
User Impersonation Service

Handles secure user impersonation with comprehensive audit logging,
session management, and security controls for Super Admin users.
"""

from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
import uuid
import json

from ..core.auth import create_impersonation_token, verify_token, AuthenticationError
from ..models.user import User, UserStatus
from ..models.tenant import Tenant, TenantStatus
from ..models.activity_log import ActivityLog
from ..core.redis_client import redis_client


class ImpersonationService:
    """Service for managing user impersonation sessions"""
    
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
        reason: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Start a new impersonation session
        
        Args:
            admin_user: Super admin user starting impersonation
            target_user_id: ID of user to impersonate
            duration_hours: Session duration in hours (1-8)
            ip_address: Request IP address
            user_agent: Request user agent
            reason: Reason for impersonation (optional)
            
        Returns:
            Dict with impersonation token and session info
            
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
        if not 1 <= duration_hours <= 8:
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
        
        # Create impersonation token
        expires_delta = timedelta(hours=duration_hours)
        impersonation_token = create_impersonation_token(
            admin_user_id=str(admin_user.id),
            target_user_id=str(target_user.id),
            target_tenant_id=str(target_user.tenant_id) if target_user.tenant_id else "",
            expires_delta=expires_delta
        )
        
        # Store session in Redis
        session_data = {
            "admin_user_id": str(admin_user.id),
            "target_user_id": str(target_user.id),
            "target_tenant_id": str(target_user.tenant_id) if target_user.tenant_id else None,
            "started_at": datetime.utcnow().isoformat(),
            "expires_at": (datetime.utcnow() + expires_delta).isoformat(),
            "ip_address": ip_address,
            "user_agent": user_agent,
            "reason": reason,
            "status": "active"
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
            reason=reason,
            duration_hours=duration_hours
        )
        
        return {
            "access_token": impersonation_token,
            "token_type": "bearer",
            "expires_in": duration_hours * 3600,  # Convert to seconds
            "session_id": session_id,
            "target_user": self._serialize_user(target_user),
            "admin_user": self._serialize_user(admin_user),
            "expires_at": (datetime.utcnow() + expires_delta).isoformat()
        }
    
    def end_impersonation(
        self,
        current_user: User,
        session_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> Dict[str, str]:
        """
        End an active impersonation session
        
        Args:
            current_user: Current user (should be in impersonation)
            session_id: Session ID to end (optional)
            ip_address: Request IP address
            user_agent: Request user agent
            
        Returns:
            Dict with success message
            
        Raises:
            HTTPException: If not in impersonation or session not found
        """
        # Validate impersonation context
        if not hasattr(current_user, 'is_impersonation') or not current_user.is_impersonation:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Not currently in an impersonation session"
            )
        
        admin_user_id = getattr(current_user, 'admin_user_id', None)
        if not admin_user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid impersonation session"
            )
        
        # Get admin user
        admin_user = self.db.query(User).filter(User.id == admin_user_id).first()
        
        # If session_id provided, validate and end specific session
        if session_id:
            session_data = self._get_session_data(session_id)
            if not session_data:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Impersonation session not found"
                )
            
            # Validate session belongs to current context
            if (session_data.get("admin_user_id") != admin_user_id or 
                session_data.get("target_user_id") != str(current_user.id)):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Cannot end session that doesn't belong to current context"
                )
            
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
            user_agent=user_agent
        )
        
        return {"message": "Impersonation session ended successfully"}
    
    def validate_impersonation_session(
        self,
        session_id: str,
        admin_user_id: str,
        target_user_id: str
    ) -> bool:
        """
        Validate an active impersonation session
        
        Args:
            session_id: Session ID to validate
            admin_user_id: Admin user ID
            target_user_id: Target user ID
            
        Returns:
            bool: True if session is valid and active
        """
        session_data = self._get_session_data(session_id)
        
        if not session_data:
            return False
        
        # Validate session data
        if (session_data.get("admin_user_id") != admin_user_id or
            session_data.get("target_user_id") != target_user_id or
            session_data.get("status") != "active"):
            return False
        
        # Check expiration
        expires_at = datetime.fromisoformat(session_data.get("expires_at", ""))
        if datetime.utcnow() > expires_at:
            # Clean up expired session
            redis_key = f"impersonation_session:{session_id}"
            self.redis_client.delete(redis_key)
            return False
        
        return True
    
    def get_active_sessions(
        self,
        admin_user_id: Optional[str] = None,
        target_user_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Get active impersonation sessions
        
        Args:
            admin_user_id: Filter by admin user ID (optional)
            target_user_id: Filter by target user ID (optional)
            
        Returns:
            List of active session data
        """
        # Get all impersonation session keys
        pattern = "impersonation_session:*"
        session_keys = self.redis_client.keys(pattern)
        
        active_sessions = []
        
        for key in session_keys:
            session_data = self._get_session_data(key.decode().split(":")[-1])
            
            if not session_data or session_data.get("status") != "active":
                continue
            
            # Apply filters
            if admin_user_id and session_data.get("admin_user_id") != admin_user_id:
                continue
            
            if target_user_id and session_data.get("target_user_id") != target_user_id:
                continue
            
            # Check if session is still valid (not expired)
            expires_at = datetime.fromisoformat(session_data.get("expires_at", ""))
            if datetime.utcnow() > expires_at:
                # Clean up expired session
                self.redis_client.delete(key)
                continue
            
            # Add session ID to data
            session_data["session_id"] = key.decode().split(":")[-1]
            active_sessions.append(session_data)
        
        return active_sessions
    
    def get_impersonation_audit_log(
        self,
        admin_user_id: Optional[str] = None,
        target_user_id: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        limit: int = 100,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """
        Get impersonation audit log
        
        Args:
            admin_user_id: Filter by admin user ID (optional)
            target_user_id: Filter by target user ID (optional)
            start_date: Filter by start date (optional)
            end_date: Filter by end date (optional)
            limit: Maximum number of results
            offset: Number of results to skip
            
        Returns:
            List of audit log entries
        """
        # Query activity logs for impersonation actions
        query = self.db.query(ActivityLog).filter(
            ActivityLog.action.in_([
                "impersonation_started",
                "impersonation_ended",
                "impersonation_start_failed"
            ])
        )
        
        if admin_user_id:
            query = query.filter(ActivityLog.user_id == admin_user_id)
        
        if start_date:
            query = query.filter(ActivityLog.created_at >= start_date)
        
        if end_date:
            query = query.filter(ActivityLog.created_at <= end_date)
        
        # If filtering by target user, check details JSON
        if target_user_id:
            query = query.filter(
                ActivityLog.details.op('->>')('target_user_id') == target_user_id
            )
        
        logs = query.order_by(ActivityLog.created_at.desc()).offset(offset).limit(limit).all()
        
        return [log.to_dict() for log in logs]
    
    def _validate_impersonation_target(self, target_user: User) -> None:
        """
        Validate that a user can be impersonated
        
        Args:
            target_user: User to validate
            
        Raises:
            HTTPException: If user cannot be impersonated
        """
        if target_user.is_super_admin:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot impersonate super admin users"
            )
        
        if target_user.status != UserStatus.ACTIVE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot impersonate inactive users"
            )
        
        # Check tenant status if user has tenant
        if target_user.tenant and target_user.tenant.status != TenantStatus.ACTIVE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot impersonate users from inactive tenants"
            )
    
    def _get_session_data(self, session_id: str) -> Optional[Dict[str, Any]]:
        """
        Get session data from Redis
        
        Args:
            session_id: Session ID
            
        Returns:
            Session data dict or None if not found
        """
        redis_key = f"impersonation_session:{session_id}"
        session_json = self.redis_client.get(redis_key)
        
        if not session_json:
            return None
        
        try:
            return json.loads(session_json)
        except json.JSONDecodeError:
            return None
    
    def _log_impersonation_attempt(
        self,
        admin_user: User,
        target_user: Optional[User] = None,
        target_user_id: Optional[str] = None,
        action: str = "impersonation_attempt",
        status: str = "success",
        error_message: Optional[str] = None,
        session_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        reason: Optional[str] = None,
        duration_hours: Optional[int] = None
    ) -> None:
        """
        Log impersonation attempt to audit trail
        
        Args:
            admin_user: Admin user performing impersonation
            target_user: Target user (optional)
            target_user_id: Target user ID (optional)
            action: Action type
            status: Action status
            error_message: Error message if failed
            session_id: Session ID
            ip_address: Request IP address
            user_agent: Request user agent
            reason: Reason for impersonation
            duration_hours: Session duration
        """
        # Prepare details
        details = {
            "admin_user_id": str(admin_user.id),
            "admin_email": admin_user.email,
            "target_user_id": target_user_id or (str(target_user.id) if target_user else None),
            "target_email": target_user.email if target_user else None,
            "target_tenant_id": str(target_user.tenant_id) if target_user and target_user.tenant_id else None,
            "session_id": session_id,
            "reason": reason,
            "duration_hours": duration_hours,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # For super admin impersonation logs, we need to handle the tenant_id requirement
        # Since ActivityLog requires tenant_id due to TenantMixin, we'll use a workaround:
        # 1. If target user exists, use their tenant_id
        # 2. If admin has tenant_id, use that
        # 3. Otherwise, create a system tenant or skip detailed logging
        
        if target_user and target_user.tenant_id:
            tenant_id = target_user.tenant_id
        elif admin_user.tenant_id:
            tenant_id = admin_user.tenant_id
        else:
            # For system-level logs (super admin actions), we'll create or use a system tenant
            # Let's create a system tenant if it doesn't exist
            from ..models.tenant import Tenant, TenantStatus, SubscriptionType
            
            system_tenant = self.db.query(Tenant).filter(
                Tenant.name == "System"
            ).first()
            
            if not system_tenant:
                system_tenant = Tenant(
                    name="System",
                    email="system@hesaabplus.com",
                    subscription_type=SubscriptionType.ENTERPRISE,
                    status=TenantStatus.ACTIVE
                )
                self.db.add(system_tenant)
                self.db.flush()
            
            tenant_id = system_tenant.id
        
        # Create activity log entry
        ActivityLog.log_action(
            db=self.db,
            tenant_id=tenant_id,
            action=action,
            user_id=admin_user.id,
            resource_type="user",
            resource_id=target_user.id if target_user else None,
            details=details,
            ip_address=ip_address,
            user_agent=user_agent,
            session_id=session_id,
            status=status,
            error_message=error_message
        )
    
    def _serialize_user(self, user: User) -> Dict[str, Any]:
        """
        Serialize user object for API response
        
        Args:
            user: User object
            
        Returns:
            Serialized user data
        """
        return {
            "id": str(user.id),
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "full_name": user.full_name,
            "role": user.role.value,
            "status": user.status.value,
            "is_super_admin": user.is_super_admin,
            "tenant_id": str(user.tenant_id) if user.tenant_id else None,
            "last_login_at": user.last_login_at.isoformat() if user.last_login_at else None
        }