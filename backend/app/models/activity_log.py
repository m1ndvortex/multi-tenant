"""
Activity Log model for tracking user actions and system events
"""

from sqlalchemy import Column, String, DateTime, Text, ForeignKey, Index, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime
import uuid
import json

from .base import BaseModel, TenantMixin


class ActivityLog(BaseModel, TenantMixin):
    """
    Activity log model for tracking user actions and system events
    Provides audit trail for security and compliance
    """
    __tablename__ = "activity_logs"
    
    # User who performed the action
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey('users.id'),
        nullable=True,  # Allow system actions without user
        index=True,
        comment="User who performed the action (null for system actions)"
    )
    
    # Action information
    action = Column(
        String(100),
        nullable=False,
        index=True,
        comment="Action type (e.g., 'user_created', 'invoice_updated')"
    )
    
    resource_type = Column(
        String(50),
        nullable=True,
        index=True,
        comment="Type of resource affected (e.g., 'user', 'invoice', 'customer')"
    )
    
    resource_id = Column(
        UUID(as_uuid=True),
        nullable=True,
        index=True,
        comment="ID of the affected resource"
    )
    
    # Action details
    details = Column(
        JSON,
        nullable=True,
        comment="JSON object with action details and metadata"
    )
    
    # Request information
    ip_address = Column(
        String(45),  # IPv6 support
        nullable=True,
        comment="IP address of the request"
    )
    
    user_agent = Column(
        Text,
        nullable=True,
        comment="User agent string from the request"
    )
    
    # Session information
    session_id = Column(
        String(255),
        nullable=True,
        comment="Session identifier"
    )
    
    # Status and result
    status = Column(
        String(20),
        default="success",
        nullable=False,
        comment="Action status (success, failed, pending)"
    )
    
    error_message = Column(
        Text,
        nullable=True,
        comment="Error message if action failed"
    )
    
    # Timing information
    duration_ms = Column(
        String(20),  # Store as string to handle large numbers
        nullable=True,
        comment="Action duration in milliseconds"
    )
    
    # Relationships
    user = relationship("User", backref="activity_logs")
    
    def __repr__(self):
        return f"<ActivityLog(id={self.id}, action='{self.action}', user_id={self.user_id})>"
    
    @classmethod
    def log_action(
        cls,
        db,
        tenant_id: uuid.UUID,
        action: str,
        user_id: uuid.UUID = None,
        resource_type: str = None,
        resource_id: uuid.UUID = None,
        details: dict = None,
        ip_address: str = None,
        user_agent: str = None,
        session_id: str = None,
        status: str = "success",
        error_message: str = None,
        duration_ms: int = None
    ):
        """
        Create a new activity log entry
        
        Args:
            db: Database session
            tenant_id: Tenant ID
            action: Action name
            user_id: User who performed the action (optional)
            resource_type: Type of resource affected (optional)
            resource_id: ID of affected resource (optional)
            details: Additional details as dict (optional)
            ip_address: Request IP address (optional)
            user_agent: Request user agent (optional)
            session_id: Session ID (optional)
            status: Action status (default: "success")
            error_message: Error message if failed (optional)
            duration_ms: Action duration in milliseconds (optional)
            
        Returns:
            ActivityLog: Created log entry
        """
        log_entry = cls(
            tenant_id=tenant_id,
            user_id=user_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            details=details,
            ip_address=ip_address,
            user_agent=user_agent,
            session_id=session_id,
            status=status,
            error_message=error_message,
            duration_ms=str(duration_ms) if duration_ms else None
        )
        
        db.add(log_entry)
        db.commit()
        db.refresh(log_entry)
        
        return log_entry
    
    @classmethod
    def get_user_activities(
        cls,
        db,
        tenant_id: uuid.UUID,
        user_id: uuid.UUID = None,
        action: str = None,
        resource_type: str = None,
        start_date: datetime = None,
        end_date: datetime = None,
        limit: int = 100,
        offset: int = 0
    ):
        """
        Get activity logs with filtering
        
        Args:
            db: Database session
            tenant_id: Tenant ID
            user_id: Filter by user ID (optional)
            action: Filter by action (optional)
            resource_type: Filter by resource type (optional)
            start_date: Filter by start date (optional)
            end_date: Filter by end date (optional)
            limit: Maximum number of results
            offset: Number of results to skip
            
        Returns:
            List of ActivityLog entries
        """
        query = db.query(cls).filter(cls.tenant_id == tenant_id)
        
        if user_id:
            query = query.filter(cls.user_id == user_id)
        
        if action:
            query = query.filter(cls.action == action)
        
        if resource_type:
            query = query.filter(cls.resource_type == resource_type)
        
        if start_date:
            query = query.filter(cls.created_at >= start_date)
        
        if end_date:
            query = query.filter(cls.created_at <= end_date)
        
        return query.order_by(cls.created_at.desc()).offset(offset).limit(limit).all()
    
    @classmethod
    def get_activity_summary(
        cls,
        db,
        tenant_id: uuid.UUID,
        start_date: datetime = None,
        end_date: datetime = None
    ):
        """
        Get activity summary statistics
        
        Args:
            db: Database session
            tenant_id: Tenant ID
            start_date: Start date for summary (optional)
            end_date: End date for summary (optional)
            
        Returns:
            Dict with activity statistics
        """
        query = db.query(cls).filter(cls.tenant_id == tenant_id)
        
        if start_date:
            query = query.filter(cls.created_at >= start_date)
        
        if end_date:
            query = query.filter(cls.created_at <= end_date)
        
        # Get action counts
        action_counts = {}
        for log in query.all():
            action_counts[log.action] = action_counts.get(log.action, 0) + 1
        
        # Get user activity counts
        user_activity = {}
        for log in query.filter(cls.user_id.isnot(None)).all():
            user_id = str(log.user_id)
            user_activity[user_id] = user_activity.get(user_id, 0) + 1
        
        # Get status counts
        status_counts = {}
        for log in query.all():
            status_counts[log.status] = status_counts.get(log.status, 0) + 1
        
        return {
            "total_activities": query.count(),
            "action_counts": action_counts,
            "user_activity": user_activity,
            "status_counts": status_counts,
            "date_range": {
                "start": start_date.isoformat() if start_date else None,
                "end": end_date.isoformat() if end_date else None
            }
        }
    
    def to_dict(self):
        """Convert log entry to dictionary"""
        return {
            "id": str(self.id),
            "tenant_id": str(self.tenant_id),
            "user_id": str(self.user_id) if self.user_id else None,
            "action": self.action,
            "resource_type": self.resource_type,
            "resource_id": str(self.resource_id) if self.resource_id else None,
            "details": self.details,
            "ip_address": self.ip_address,
            "user_agent": self.user_agent,
            "session_id": self.session_id,
            "status": self.status,
            "error_message": self.error_message,
            "duration_ms": self.duration_ms,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }


# Create indexes for performance optimization
Index('idx_activity_log_tenant_user', ActivityLog.tenant_id, ActivityLog.user_id)
Index('idx_activity_log_tenant_action', ActivityLog.tenant_id, ActivityLog.action)
Index('idx_activity_log_tenant_resource', ActivityLog.tenant_id, ActivityLog.resource_type, ActivityLog.resource_id)
Index('idx_activity_log_tenant_date', ActivityLog.tenant_id, ActivityLog.created_at)
Index('idx_activity_log_status', ActivityLog.status)
Index('idx_activity_log_ip', ActivityLog.ip_address)