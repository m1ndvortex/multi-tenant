"""
Authentication Logging Service
Provides comprehensive logging for authentication events with tenant isolation
"""

from datetime import datetime, timezone
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
import json

from ..models.authentication_log import AuthenticationLog


class AuthLoggingService:
    """
    Service for logging authentication events with tenant isolation
    """
    
    def __init__(self, db: Session):
        self.db = db
    
    def log_successful_login(
        self,
        user_id: str,
        tenant_id: str,
        email: str = None,
        ip_address: str = None,
        user_agent: str = None,
        metadata: Dict[str, Any] = None,
        auto_commit: bool = False
    ) -> AuthenticationLog:
        """Log successful login attempt"""
        
        log_entry = AuthenticationLog(
            email=email,
            user_id=user_id,
            tenant_id=tenant_id,
            event_type="login_success",
            success=True,
            ip_address=ip_address,
            user_agent=user_agent,
            additional_data=json.dumps(metadata) if metadata else None
        )
        
        self.db.add(log_entry)
        
        if auto_commit:
            try:
                self.db.commit()
                self.db.refresh(log_entry)
            except Exception as e:
                self.db.rollback()
                # Log error but don't fail authentication
                print(f"Warning: Failed to log successful login: {e}")
        
        return log_entry
    
    def log_failed_login(
        self,
        email: str,
        tenant_id: str = None,
        reason: str = None,
        ip_address: str = None,
        user_agent: str = None,
        error_details: str = None,
        metadata: Dict[str, Any] = None,
        auto_commit: bool = False
    ) -> AuthenticationLog:
        """Log failed login attempt"""
        
        log_entry = AuthenticationLog(
            email=email,
            tenant_id=tenant_id,
            event_type="login_failed",
            success=False,
            failure_reason=reason,
            ip_address=ip_address,
            user_agent=user_agent,
            error_details=error_details,
            additional_data=json.dumps(metadata) if metadata else None
        )
        
        self.db.add(log_entry)
        
        if auto_commit:
            try:
                self.db.commit()
                self.db.refresh(log_entry)
            except Exception as e:
                self.db.rollback()
                # Log error but don't fail authentication
                print(f"Warning: Failed to log failed login: {e}")
        
        return log_entry
    
    def log_logout(
        self,
        user_id: str,
        tenant_id: str = None,
        email: str = None,
        ip_address: str = None,
        user_agent: str = None,
        metadata: Dict[str, Any] = None,
        auto_commit: bool = False
    ) -> AuthenticationLog:
        """Log logout event"""
        
        log_entry = AuthenticationLog(
            email=email,
            user_id=user_id,
            tenant_id=tenant_id,
            event_type="logout",
            success=True,
            ip_address=ip_address,
            user_agent=user_agent,
            additional_data=json.dumps(metadata) if metadata else None
        )
        
        self.db.add(log_entry)
        
        if auto_commit:
            try:
                self.db.commit()
                self.db.refresh(log_entry)
            except Exception as e:
                self.db.rollback()
                # Log error but don't fail authentication
                print(f"Warning: Failed to log logout: {e}")
        
        return log_entry
    
    def get_failed_login_attempts(
        self,
        email: str = None,
        tenant_id: str = None,
        hours: int = 24
    ) -> int:
        """Get count of failed login attempts within specified hours"""
        
        from datetime import timedelta
        
        cutoff_time = datetime.now(timezone.utc) - timedelta(hours=hours)
        
        query = self.db.query(AuthenticationLog).filter(
            AuthenticationLog.success == False,
            AuthenticationLog.event_type == "login_failed",
            AuthenticationLog.created_at >= cutoff_time
        )
        
        if email:
            query = query.filter(AuthenticationLog.email == email)
        
        if tenant_id:
            query = query.filter(AuthenticationLog.tenant_id == tenant_id)
        
        return query.count()
    
    def get_recent_login_attempts(
        self,
        tenant_id: str = None,
        limit: int = 100
    ) -> list:
        """Get recent login attempts for a tenant"""
        
        query = self.db.query(AuthenticationLog).order_by(
            AuthenticationLog.created_at.desc()
        )
        
        if tenant_id:
            query = query.filter(AuthenticationLog.tenant_id == tenant_id)
        
        return query.limit(limit).all()
    
    def is_account_locked(
        self,
        email: str,
        tenant_id: str = None,
        max_attempts: int = 5,
        lockout_hours: int = 1
    ) -> bool:
        """Check if account should be locked due to failed attempts"""
        
        failed_attempts = self.get_failed_login_attempts(
            email=email,
            tenant_id=tenant_id,
            hours=lockout_hours
        )
        
        return failed_attempts >= max_attempts
    
    def get_login_statistics(
        self,
        tenant_id: str = None,
        days: int = 30
    ) -> Dict[str, Any]:
        """Get login statistics for a tenant"""
        
        from datetime import timedelta
        from sqlalchemy import func
        
        cutoff_time = datetime.now(timezone.utc) - timedelta(days=days)
        
        query = self.db.query(AuthenticationLog).filter(
            AuthenticationLog.created_at >= cutoff_time
        )
        
        if tenant_id:
            query = query.filter(AuthenticationLog.tenant_id == tenant_id)
        
        total_attempts = query.count()
        successful_logins = query.filter(AuthenticationLog.success == True).count()
        failed_attempts = query.filter(AuthenticationLog.success == False).count()
        
        # Get unique users who logged in
        unique_users = query.filter(
            AuthenticationLog.success == True,
            AuthenticationLog.user_id.isnot(None)
        ).distinct(AuthenticationLog.user_id).count()
        
        return {
            "total_attempts": total_attempts,
            "successful_logins": successful_logins,
            "failed_attempts": failed_attempts,
            "success_rate": (successful_logins / total_attempts * 100) if total_attempts > 0 else 0,
            "unique_users": unique_users,
            "period_days": days
        }