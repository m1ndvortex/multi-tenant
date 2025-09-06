"""
API Error Logging Model
Comprehensive error tracking with tenant and user context
"""

from sqlalchemy import Column, String, Text, Integer, DateTime, Boolean, JSON, Index, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
import uuid
import enum

from .base import Base, TimestampMixin


class ErrorSeverity(enum.Enum):
    """Error severity levels"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


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


class APIErrorLog(Base, TimestampMixin):
    """
    API Error Log model for comprehensive error tracking
    """
    __tablename__ = "api_error_logs"
    
    # Primary identification
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Request context
    tenant_id = Column(UUID(as_uuid=True), nullable=True, index=True, comment="Tenant ID if available")
    user_id = Column(UUID(as_uuid=True), nullable=True, index=True, comment="User ID if available")
    session_id = Column(String(255), nullable=True, index=True, comment="Session ID for tracking")
    
    # Error details
    error_message = Column(Text, nullable=False, comment="Error message")
    error_type = Column(String(255), nullable=False, comment="Error type/class name")
    error_code = Column(String(50), nullable=True, comment="Application-specific error code")
    severity = Column(SQLEnum(ErrorSeverity), nullable=False, default=ErrorSeverity.MEDIUM, index=True)
    category = Column(SQLEnum(ErrorCategory), nullable=False, default=ErrorCategory.UNKNOWN, index=True)
    
    # Request context
    endpoint = Column(String(500), nullable=False, index=True, comment="API endpoint path")
    method = Column(String(10), nullable=False, comment="HTTP method")
    status_code = Column(Integer, nullable=False, index=True, comment="HTTP status code")
    
    # Request details
    request_id = Column(String(255), nullable=True, index=True, comment="Request tracking ID")
    user_agent = Column(Text, nullable=True, comment="User agent string")
    ip_address = Column(String(45), nullable=True, index=True, comment="Client IP address")
    
    # Error context
    stack_trace = Column(Text, nullable=True, comment="Full stack trace")
    request_data = Column(JSON, nullable=True, comment="Request payload (sanitized)")
    response_data = Column(JSON, nullable=True, comment="Response data (sanitized)")
    additional_context = Column(JSON, nullable=True, comment="Additional error context")
    
    # Resolution tracking
    is_resolved = Column(Boolean, default=False, nullable=False, index=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    resolved_by = Column(UUID(as_uuid=True), nullable=True, comment="Admin user who resolved")
    resolution_notes = Column(Text, nullable=True, comment="Resolution notes")
    
    # Notification tracking
    notification_sent = Column(Boolean, default=False, nullable=False)
    notification_sent_at = Column(DateTime(timezone=True), nullable=True)
    
    # Occurrence tracking
    occurrence_count = Column(Integer, default=1, nullable=False, comment="Number of times this error occurred")
    first_occurrence = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    last_occurrence = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    def __repr__(self):
        return f"<APIErrorLog(id={self.id}, severity={self.severity.value}, category={self.category.value}, endpoint={self.endpoint})>"
    
    @classmethod
    def log_error(
        cls,
        db: Session,
        error_message: str,
        error_type: str,
        endpoint: str,
        method: str,
        status_code: int,
        severity: ErrorSeverity = ErrorSeverity.MEDIUM,
        category: ErrorCategory = ErrorCategory.UNKNOWN,
        tenant_id: Optional[uuid.UUID] = None,
        user_id: Optional[uuid.UUID] = None,
        session_id: Optional[str] = None,
        error_code: Optional[str] = None,
        request_id: Optional[str] = None,
        user_agent: Optional[str] = None,
        ip_address: Optional[str] = None,
        stack_trace: Optional[str] = None,
        request_data: Optional[Dict[str, Any]] = None,
        response_data: Optional[Dict[str, Any]] = None,
        additional_context: Optional[Dict[str, Any]] = None
    ) -> 'APIErrorLog':
        """
        Log a new API error with comprehensive context
        """
        # Check for duplicate error in the last 5 minutes
        recent_cutoff = datetime.utcnow() - timedelta(minutes=5)
        existing_error = db.query(cls).filter(
            cls.error_message == error_message,
            cls.error_type == error_type,
            cls.endpoint == endpoint,
            cls.method == method,
            cls.tenant_id == tenant_id,
            cls.user_id == user_id,
            cls.last_occurrence >= recent_cutoff
        ).first()
        
        if existing_error:
            # Update existing error occurrence
            existing_error.occurrence_count += 1
            existing_error.last_occurrence = datetime.utcnow()
            existing_error.status_code = status_code  # Update with latest status code
            
            # Update context if provided
            if additional_context:
                existing_context = existing_error.additional_context or {}
                existing_context.update(additional_context)
                existing_error.additional_context = existing_context
            
            db.commit()
            db.refresh(existing_error)
            return existing_error
        
        # Create new error log
        error_log = cls(
            error_message=error_message,
            error_type=error_type,
            endpoint=endpoint,
            method=method,
            status_code=status_code,
            severity=severity,
            category=category,
            tenant_id=tenant_id,
            user_id=user_id,
            session_id=session_id,
            error_code=error_code,
            request_id=request_id,
            user_agent=user_agent,
            ip_address=ip_address,
            stack_trace=stack_trace,
            request_data=request_data,
            response_data=response_data,
            additional_context=additional_context,
            first_occurrence=datetime.utcnow(),
            last_occurrence=datetime.utcnow()
        )
        
        db.add(error_log)
        db.commit()
        db.refresh(error_log)
        
        return error_log
    
    @classmethod
    def get_errors_with_filters(
        cls,
        db: Session,
        tenant_id: Optional[uuid.UUID] = None,
        user_id: Optional[uuid.UUID] = None,
        severity: Optional[ErrorSeverity] = None,
        category: Optional[ErrorCategory] = None,
        endpoint: Optional[str] = None,
        error_type: Optional[str] = None,
        status_code: Optional[int] = None,
        is_resolved: Optional[bool] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        search_term: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
        order_by: str = "created_at",
        order_desc: bool = True
    ):
        """
        Get errors with comprehensive filtering options
        """
        query = db.query(cls)
        
        # Apply filters
        if tenant_id:
            query = query.filter(cls.tenant_id == tenant_id)
        
        if user_id:
            query = query.filter(cls.user_id == user_id)
        
        if severity:
            query = query.filter(cls.severity == severity)
        
        if category:
            query = query.filter(cls.category == category)
        
        if endpoint:
            query = query.filter(cls.endpoint.ilike(f"%{endpoint}%"))
        
        if error_type:
            query = query.filter(cls.error_type.ilike(f"%{error_type}%"))
        
        if status_code:
            query = query.filter(cls.status_code == status_code)
        
        if is_resolved is not None:
            query = query.filter(cls.is_resolved == is_resolved)
        
        if start_date:
            query = query.filter(cls.created_at >= start_date)
        
        if end_date:
            query = query.filter(cls.created_at <= end_date)
        
        if search_term:
            search_filter = cls.error_message.ilike(f"%{search_term}%")
            query = query.filter(search_filter)
        
        # Apply ordering
        if hasattr(cls, order_by):
            order_column = getattr(cls, order_by)
            if order_desc:
                query = query.order_by(order_column.desc())
            else:
                query = query.order_by(order_column.asc())
        
        # Get total count
        total = query.count()
        
        # Apply pagination
        errors = query.offset(skip).limit(limit).all()
        
        return errors, total
    
    @classmethod
    def get_error_statistics(
        cls,
        db: Session,
        tenant_id: Optional[uuid.UUID] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """
        Get error statistics for dashboard
        """
        query = db.query(cls)
        
        if tenant_id:
            query = query.filter(cls.tenant_id == tenant_id)
        
        if start_date:
            query = query.filter(cls.created_at >= start_date)
        
        if end_date:
            query = query.filter(cls.created_at <= end_date)
        
        # Total errors
        total_errors = query.count()
        
        # Errors by severity
        severity_stats = {}
        for severity in ErrorSeverity:
            count = query.filter(cls.severity == severity).count()
            severity_stats[severity.value] = count
        
        # Errors by category
        category_stats = {}
        for category in ErrorCategory:
            count = query.filter(cls.category == category).count()
            category_stats[category.value] = count
        
        # Recent critical errors (last 24 hours)
        recent_cutoff = datetime.utcnow() - timedelta(hours=24)
        recent_critical = query.filter(
            cls.severity == ErrorSeverity.CRITICAL,
            cls.created_at >= recent_cutoff
        ).count()
        
        # Unresolved errors
        unresolved_errors = query.filter(cls.is_resolved == False).count()
        
        # Top error endpoints
        from sqlalchemy import func as sql_func
        top_endpoints = db.query(
            cls.endpoint,
            sql_func.count(cls.id).label('error_count')
        ).filter(
            query.whereclause if query.whereclause is not None else True
        ).group_by(cls.endpoint).order_by(
            sql_func.count(cls.id).desc()
        ).limit(10).all()
        
        return {
            "total_errors": total_errors,
            "severity_breakdown": severity_stats,
            "category_breakdown": category_stats,
            "recent_critical_errors": recent_critical,
            "unresolved_errors": unresolved_errors,
            "top_error_endpoints": [
                {"endpoint": endpoint, "count": count}
                for endpoint, count in top_endpoints
            ]
        }
    
    def mark_resolved(self, db: Session, resolved_by: uuid.UUID, notes: Optional[str] = None):
        """
        Mark error as resolved
        """
        self.is_resolved = True
        self.resolved_at = datetime.utcnow()
        self.resolved_by = resolved_by
        if notes:
            self.resolution_notes = notes
        
        db.commit()
        db.refresh(self)
    
    def should_send_notification(self) -> bool:
        """
        Determine if this error should trigger a notification
        """
        # Send notifications for critical errors or high frequency errors
        return (
            self.severity == ErrorSeverity.CRITICAL or
            (self.severity == ErrorSeverity.HIGH and self.occurrence_count >= 5) or
            (self.occurrence_count >= 10)
        ) and not self.notification_sent
    
    def mark_notification_sent(self, db: Session):
        """
        Mark notification as sent
        """
        self.notification_sent = True
        self.notification_sent_at = datetime.utcnow()
        db.commit()


# Create indexes for performance optimization
Index('idx_api_error_tenant_created', APIErrorLog.tenant_id, APIErrorLog.created_at)
Index('idx_api_error_severity_created', APIErrorLog.severity, APIErrorLog.created_at)
Index('idx_api_error_category_created', APIErrorLog.category, APIErrorLog.created_at)
Index('idx_api_error_endpoint_created', APIErrorLog.endpoint, APIErrorLog.created_at)
Index('idx_api_error_status_created', APIErrorLog.status_code, APIErrorLog.created_at)
Index('idx_api_error_resolved', APIErrorLog.is_resolved, APIErrorLog.created_at)
Index('idx_api_error_notification', APIErrorLog.notification_sent, APIErrorLog.severity)