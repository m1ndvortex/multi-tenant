"""
Enhanced Error Log Model
Comprehensive error tracking with real-time capabilities and tenant isolation
"""

from sqlalchemy import Column, String, Text, Integer, DateTime, Boolean, JSON, Index, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship, Session
from sqlalchemy.sql import func
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, List
import uuid
import enum
import json

from .base import BaseModel


class ErrorSeverity(enum.Enum):
    """Error severity levels for prioritization"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class ErrorStatus(enum.Enum):
    """Error status for resolution tracking"""
    ACTIVE = "active"
    ACKNOWLEDGED = "acknowledged"
    RESOLVED = "resolved"
    IGNORED = "ignored"


class ErrorCategory(enum.Enum):
    """Error categories for classification"""
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


class ErrorLog(BaseModel):
    """
    Enhanced error log model for comprehensive error tracking
    Supports real-time monitoring and tenant isolation
    """
    __tablename__ = "error_logs"
    
    # Tenant Context (nullable for system-wide errors)
    tenant_id = Column(
        UUID(as_uuid=True),
        nullable=True,
        index=True,
        comment="Tenant ID for tenant-specific errors"
    )
    
    user_id = Column(
        UUID(as_uuid=True),
        nullable=True,
        index=True,
        comment="User ID if error is user-specific"
    )
    
    # Error Classification
    error_type = Column(
        String(255),
        nullable=False,
        index=True,
        comment="Error type/class name"
    )
    
    error_message = Column(
        Text,
        nullable=False,
        comment="Error message"
    )
    
    error_code = Column(
        String(50),
        nullable=True,
        index=True,
        comment="Application-specific error code"
    )
    
    severity = Column(
        SQLEnum(ErrorSeverity),
        nullable=False,
        default=ErrorSeverity.MEDIUM,
        index=True,
        comment="Error severity level"
    )
    
    status = Column(
        SQLEnum(ErrorStatus),
        nullable=False,
        default=ErrorStatus.ACTIVE,
        index=True,
        comment="Error resolution status"
    )
    
    category = Column(
        SQLEnum(ErrorCategory),
        nullable=False,
        default=ErrorCategory.UNKNOWN,
        index=True,
        comment="Error category for classification"
    )
    
    # Request Context
    endpoint = Column(
        String(500),
        nullable=True,
        index=True,
        comment="API endpoint where error occurred"
    )
    
    method = Column(
        String(10),
        nullable=True,
        comment="HTTP method"
    )
    
    status_code = Column(
        Integer,
        nullable=True,
        index=True,
        comment="HTTP status code"
    )
    
    request_id = Column(
        String(255),
        nullable=True,
        index=True,
        comment="Request tracking ID"
    )
    
    session_id = Column(
        String(255),
        nullable=True,
        index=True,
        comment="User session ID"
    )
    
    # Client Context
    ip_address = Column(
        String(45),
        nullable=True,
        index=True,
        comment="Client IP address"
    )
    
    user_agent = Column(
        Text,
        nullable=True,
        comment="User agent string"
    )
    
    # Error Details
    stack_trace = Column(
        Text,
        nullable=True,
        comment="Full stack trace"
    )
    
    context_data = Column(
        JSON,
        nullable=True,
        comment="Additional error context data"
    )
    
    request_data = Column(
        JSON,
        nullable=True,
        comment="Sanitized request data"
    )
    
    response_data = Column(
        JSON,
        nullable=True,
        comment="Sanitized response data"
    )
    
    # Occurrence Tracking
    occurrence_count = Column(
        Integer,
        default=1,
        nullable=False,
        comment="Number of times this error occurred"
    )
    
    first_occurred_at = Column(
        DateTime(timezone=True),
        default=func.now(),
        nullable=False,
        comment="First occurrence timestamp"
    )
    
    last_occurred_at = Column(
        DateTime(timezone=True),
        default=func.now(),
        nullable=False,
        comment="Last occurrence timestamp"
    )
    
    # Resolution Tracking
    resolved_at = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="Resolution timestamp"
    )
    
    resolved_by_admin_id = Column(
        UUID(as_uuid=True),
        nullable=True,
        comment="Admin user who resolved the error"
    )
    
    resolution_notes = Column(
        Text,
        nullable=True,
        comment="Resolution notes and actions taken"
    )
    
    # Notification Tracking
    notification_sent = Column(
        Boolean,
        default=False,
        nullable=False,
        comment="Whether notification was sent"
    )
    
    notification_sent_at = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="Notification timestamp"
    )
    
    # Performance Impact
    response_time_ms = Column(
        Integer,
        nullable=True,
        comment="Response time in milliseconds"
    )
    
    memory_usage_mb = Column(
        Integer,
        nullable=True,
        comment="Memory usage in MB at time of error"
    )
    
    # Note: Relationships are commented out because foreign key constraints don't exist in current database
    # tenant = relationship("Tenant", foreign_keys=[tenant_id])
    # user = relationship("User", foreign_keys=[user_id])
    # resolved_by_admin = relationship("User", foreign_keys=[resolved_by_admin_id])
    
    def __repr__(self):
        return f"<ErrorLog(id={self.id}, severity={self.severity.value}, status={self.status.value}, type={self.error_type})>"
    
    @classmethod
    def log_error(
        cls,
        db: Session,
        error_type: str,
        error_message: str,
        severity: ErrorSeverity = ErrorSeverity.MEDIUM,
        category: ErrorCategory = ErrorCategory.UNKNOWN,
        tenant_id: Optional[uuid.UUID] = None,
        user_id: Optional[uuid.UUID] = None,
        endpoint: Optional[str] = None,
        method: Optional[str] = None,
        status_code: Optional[int] = None,
        error_code: Optional[str] = None,
        request_id: Optional[str] = None,
        session_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        stack_trace: Optional[str] = None,
        context_data: Optional[Dict[str, Any]] = None,
        request_data: Optional[Dict[str, Any]] = None,
        response_data: Optional[Dict[str, Any]] = None,
        response_time_ms: Optional[int] = None,
        memory_usage_mb: Optional[int] = None
    ) -> 'ErrorLog':
        """
        Log a new error with comprehensive context
        Handles duplicate detection and occurrence counting
        """
        # Check for duplicate error in the last 5 minutes
        recent_cutoff = datetime.now(timezone.utc) - timedelta(minutes=5)
        
        # Build duplicate detection query
        duplicate_query = db.query(cls).filter(
            cls.error_type == error_type,
            cls.error_message == error_message,
            cls.status == ErrorStatus.ACTIVE,
            cls.last_occurred_at >= recent_cutoff
        )
        
        # Add tenant/user context for duplicate detection
        if tenant_id:
            duplicate_query = duplicate_query.filter(cls.tenant_id == tenant_id)
        else:
            duplicate_query = duplicate_query.filter(cls.tenant_id.is_(None))
        
        if user_id:
            duplicate_query = duplicate_query.filter(cls.user_id == user_id)
        
        if endpoint:
            duplicate_query = duplicate_query.filter(cls.endpoint == endpoint)
        
        existing_error = duplicate_query.first()
        
        if existing_error:
            # Update existing error occurrence
            existing_error.occurrence_count += 1
            existing_error.last_occurred_at = datetime.now(timezone.utc)
            existing_error.updated_at = datetime.now(timezone.utc)
            
            # Update context if provided
            if context_data:
                existing_context = existing_error.context_data or {}
                existing_context.update(context_data)
                existing_error.context_data = existing_context
            
            # Update performance metrics
            if response_time_ms:
                existing_error.response_time_ms = response_time_ms
            if memory_usage_mb:
                existing_error.memory_usage_mb = memory_usage_mb
            
            db.commit()
            db.refresh(existing_error)
            return existing_error
        
        # Create new error log
        error_log = cls(
            tenant_id=tenant_id,
            user_id=user_id,
            error_type=error_type,
            error_message=error_message,
            error_code=error_code,
            severity=severity,
            status=ErrorStatus.ACTIVE,
            category=category,
            endpoint=endpoint,
            method=method,
            status_code=status_code,
            request_id=request_id,
            session_id=session_id,
            ip_address=ip_address,
            user_agent=user_agent,
            stack_trace=stack_trace,
            context_data=context_data,
            request_data=request_data,
            response_data=response_data,
            response_time_ms=response_time_ms,
            memory_usage_mb=memory_usage_mb,
            first_occurred_at=datetime.now(timezone.utc),
            last_occurred_at=datetime.now(timezone.utc)
        )
        
        db.add(error_log)
        db.commit()
        db.refresh(error_log)
        
        return error_log
    
    @classmethod
    def get_active_errors(
        cls,
        db: Session,
        tenant_id: Optional[uuid.UUID] = None,
        severity: Optional[ErrorSeverity] = None,
        category: Optional[ErrorCategory] = None,
        error_type: Optional[str] = None,
        limit: int = 50
    ) -> List['ErrorLog']:
        """Get only currently active (unresolved) errors"""
        query = db.query(cls).filter(cls.status == ErrorStatus.ACTIVE)
        
        if tenant_id:
            query = query.filter(cls.tenant_id == tenant_id)
        
        if severity:
            query = query.filter(cls.severity == severity)
        
        if category:
            query = query.filter(cls.category == category)
        
        if error_type:
            query = query.filter(cls.error_type.ilike(f"%{error_type}%"))
        
        return query.order_by(cls.last_occurred_at.desc()).limit(limit).all()
    
    @classmethod
    def get_error_statistics(
        cls,
        db: Session,
        tenant_id: Optional[uuid.UUID] = None
    ) -> Dict[str, Any]:
        """Get real-time error statistics"""
        base_query = db.query(cls).filter(cls.status == ErrorStatus.ACTIVE)
        
        if tenant_id:
            base_query = base_query.filter(cls.tenant_id == tenant_id)
        
        # Count by severity
        severity_counts = {}
        for severity in ErrorSeverity:
            count = base_query.filter(cls.severity == severity).count()
            severity_counts[severity.value] = count
        
        # Total active errors
        total_active = sum(severity_counts.values())
        
        # Recent errors (last 24 hours)
        twenty_four_hours_ago = datetime.now(timezone.utc) - timedelta(hours=24)
        recent_errors = db.query(cls).filter(
            cls.first_occurred_at >= twenty_four_hours_ago
        )
        
        if tenant_id:
            recent_errors = recent_errors.filter(cls.tenant_id == tenant_id)
        
        recent_count = recent_errors.count()
        
        # Category breakdown
        category_counts = {}
        for category in ErrorCategory:
            count = base_query.filter(cls.category == category).count()
            if count > 0:
                category_counts[category.value] = count
        
        return {
            "total_active_errors": total_active,
            "critical_errors": severity_counts.get("critical", 0),
            "high_priority_errors": severity_counts.get("high", 0),
            "medium_priority_errors": severity_counts.get("medium", 0),
            "low_priority_errors": severity_counts.get("low", 0),
            "errors_last_24h": recent_count,
            "category_breakdown": category_counts,
            "last_updated": datetime.now(timezone.utc)
        }
    
    def resolve(
        self,
        db: Session,
        admin_id: uuid.UUID,
        notes: Optional[str] = None
    ):
        """Mark error as resolved"""
        self.status = ErrorStatus.RESOLVED
        self.resolved_at = datetime.now(timezone.utc)
        self.resolved_by_admin_id = admin_id
        self.resolution_notes = notes
        self.updated_at = datetime.now(timezone.utc)
        
        db.commit()
        db.refresh(self)
    
    def acknowledge(
        self,
        db: Session,
        admin_id: uuid.UUID,
        notes: Optional[str] = None
    ):
        """Mark error as acknowledged"""
        self.status = ErrorStatus.ACKNOWLEDGED
        self.resolved_by_admin_id = admin_id
        if notes:
            self.resolution_notes = notes
        self.updated_at = datetime.now(timezone.utc)
        
        db.commit()
        db.refresh(self)
    
    def should_send_notification(self) -> bool:
        """Determine if this error should trigger a notification"""
        return (
            self.severity == ErrorSeverity.CRITICAL or
            (self.severity == ErrorSeverity.HIGH and self.occurrence_count >= 5) or
            (self.occurrence_count >= 10)
        ) and not self.notification_sent
    
    def mark_notification_sent(self, db: Session):
        """Mark notification as sent"""
        self.notification_sent = True
        self.notification_sent_at = datetime.now(timezone.utc)
        db.commit()
    
    def to_dict_for_websocket(self) -> Dict[str, Any]:
        """Convert to dictionary for WebSocket transmission"""
        return {
            "id": str(self.id),
            "tenant_id": str(self.tenant_id) if self.tenant_id else None,
            "tenant_name": "System",  # Would need to query tenant separately
            "error_type": self.error_type,
            "error_message": self.error_message,
            "severity": self.severity.value,
            "status": self.status.value,
            "category": self.category.value,
            "endpoint": self.endpoint,
            "occurrence_count": self.occurrence_count,
            "first_occurred_at": self.first_occurred_at.isoformat(),
            "last_occurred_at": self.last_occurred_at.isoformat(),
            "resolved_at": self.resolved_at.isoformat() if self.resolved_at else None
        }


# Create comprehensive indexes for performance optimization
Index('idx_error_log_tenant_status', ErrorLog.tenant_id, ErrorLog.status)
Index('idx_error_log_severity_status', ErrorLog.severity, ErrorLog.status)
Index('idx_error_log_category_status', ErrorLog.category, ErrorLog.status)
Index('idx_error_log_status_occurred', ErrorLog.status, ErrorLog.last_occurred_at)
Index('idx_error_log_tenant_severity', ErrorLog.tenant_id, ErrorLog.severity)
Index('idx_error_log_type_tenant', ErrorLog.error_type, ErrorLog.tenant_id)
Index('idx_error_log_endpoint_status', ErrorLog.endpoint, ErrorLog.status)
Index('idx_error_log_notification', ErrorLog.notification_sent, ErrorLog.severity)
Index('idx_error_log_occurrence_count', ErrorLog.occurrence_count)
Index('idx_error_log_resolved_by', ErrorLog.resolved_by_admin_id)
Index('idx_error_log_first_occurred', ErrorLog.first_occurred_at)
Index('idx_error_log_duplicate_detection', 
      ErrorLog.error_type, ErrorLog.error_message, ErrorLog.tenant_id, ErrorLog.status, ErrorLog.last_occurred_at)