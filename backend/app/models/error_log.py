"""
Error Log model for comprehensive error tracking and resolution
"""

from sqlalchemy import Column, String, DateTime, ForeignKey, Index, Text, Boolean, Enum, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime, timezone
import enum
from .base import BaseModel


class ErrorSeverity(enum.Enum):
    """Error severity levels"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class ErrorStatus(enum.Enum):
    """Error resolution status"""
    ACTIVE = "active"
    ACKNOWLEDGED = "acknowledged"
    RESOLVED = "resolved"
    IGNORED = "ignored"


class ErrorCategory(enum.Enum):
    """Error categories for better organization"""
    AUTHENTICATION = "authentication"
    DATABASE = "database"
    API = "api"
    PAYMENT = "payment"
    FILE_UPLOAD = "file_upload"
    EMAIL = "email"
    BACKUP = "backup"
    VALIDATION = "validation"
    SYSTEM = "system"
    INTEGRATION = "integration"
    PERFORMANCE = "performance"
    SECURITY = "security"


class ErrorLog(BaseModel):
    """
    Comprehensive error logging model with severity levels and resolution tracking
    Provides real-time error monitoring and admin resolution capabilities
    """
    __tablename__ = "error_logs"
    
    # Foreign Keys
    tenant_id = Column(
        UUID(as_uuid=True), 
        ForeignKey('tenants.id'),
        nullable=True,
        index=True,
        comment="Reference to tenant (null for system-wide errors)"
    )
    
    user_id = Column(
        UUID(as_uuid=True), 
        ForeignKey('users.id'),
        nullable=True,
        index=True,
        comment="User who encountered the error (if applicable)"
    )
    
    resolved_by_admin_id = Column(
        UUID(as_uuid=True), 
        ForeignKey('users.id'),
        nullable=True,
        index=True,
        comment="Super admin who resolved the error"
    )
    
    # Error Details
    error_type = Column(
        String(100), 
        nullable=False,
        index=True,
        comment="Type/class of error"
    )
    
    error_message = Column(
        Text, 
        nullable=False,
        comment="Error message or description"
    )
    
    error_code = Column(
        String(50), 
        nullable=True,
        index=True,
        comment="Application-specific error code"
    )
    
    stack_trace = Column(
        Text, 
        nullable=True,
        comment="Full stack trace of the error"
    )
    
    # Classification
    severity = Column(
        Enum(ErrorSeverity), 
        default=ErrorSeverity.MEDIUM,
        nullable=False,
        index=True,
        comment="Error severity level"
    )
    
    category = Column(
        Enum(ErrorCategory), 
        default=ErrorCategory.SYSTEM,
        nullable=False,
        index=True,
        comment="Error category for organization"
    )
    
    status = Column(
        Enum(ErrorStatus), 
        default=ErrorStatus.ACTIVE,
        nullable=False,
        index=True,
        comment="Error resolution status"
    )
    
    # Context Information
    request_url = Column(
        String(500), 
        nullable=True,
        comment="URL where error occurred"
    )
    
    request_method = Column(
        String(10), 
        nullable=True,
        comment="HTTP method (GET, POST, etc.)"
    )
    
    client_ip = Column(
        String(45), 
        nullable=True,
        comment="Client IP address"
    )
    
    user_agent = Column(
        Text, 
        nullable=True,
        comment="User agent string"
    )
    
    # Additional Context
    context_data = Column(
        Text, 
        nullable=True,
        comment="JSON context data (request params, etc.)"
    )
    
    environment = Column(
        String(20), 
        default="production",
        nullable=False,
        comment="Environment where error occurred"
    )
    
    # Resolution Information
    resolution_notes = Column(
        Text, 
        nullable=True,
        comment="Admin notes about error resolution"
    )
    
    resolved_at = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="When the error was resolved"
    )
    
    acknowledged_at = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="When the error was acknowledged"
    )
    
    # Occurrence Tracking
    first_occurred_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=func.now(),
        comment="When this error first occurred"
    )
    
    last_occurred_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=func.now(),
        comment="When this error last occurred"
    )
    
    occurrence_count = Column(
        Integer, 
        default=1,
        nullable=False,
        comment="Number of times this error has occurred"
    )
    
    # Relationships
    tenant = relationship("Tenant", foreign_keys=[tenant_id])
    user = relationship("User", foreign_keys=[user_id])
    resolved_by_admin = relationship("User", foreign_keys=[resolved_by_admin_id])
    
    def __repr__(self):
        return f"<ErrorLog(id={self.id}, type='{self.error_type}', severity='{self.severity.value}')>"
    
    @classmethod
    def log_error(
        cls, 
        db,
        error_type: str,
        error_message: str,
        tenant_id: str = None,
        user_id: str = None,
        severity: ErrorSeverity = ErrorSeverity.MEDIUM,
        category: ErrorCategory = ErrorCategory.SYSTEM,
        error_code: str = None,
        stack_trace: str = None,
        request_url: str = None,
        request_method: str = None,
        client_ip: str = None,
        user_agent: str = None,
        context_data: str = None,
        environment: str = "production"
    ):
        """
        Log a new error or update existing error occurrence count
        """
        # Check if similar error exists for the same tenant
        existing_error = db.query(cls).filter(
            cls.error_type == error_type,
            cls.error_message == error_message,
            cls.tenant_id == tenant_id,
            cls.status.in_([ErrorStatus.ACTIVE, ErrorStatus.ACKNOWLEDGED])
        ).first()
        
        if existing_error:
            # Update existing error
            existing_error.occurrence_count += 1
            existing_error.last_occurred_at = datetime.now(timezone.utc)
            existing_error.updated_at = datetime.now(timezone.utc)
            
            # Update context if provided
            if context_data:
                existing_error.context_data = context_data
            if client_ip:
                existing_error.client_ip = client_ip
            if user_agent:
                existing_error.user_agent = user_agent
            
            db.commit()
            db.refresh(existing_error)
            return existing_error
        else:
            # Create new error log
            error_log = cls(
                tenant_id=tenant_id,
                user_id=user_id,
                error_type=error_type,
                error_message=error_message,
                error_code=error_code,
                stack_trace=stack_trace,
                severity=severity,
                category=category,
                request_url=request_url,
                request_method=request_method,
                client_ip=client_ip,
                user_agent=user_agent,
                context_data=context_data,
                environment=environment,
                first_occurred_at=datetime.now(timezone.utc),
                last_occurred_at=datetime.now(timezone.utc)
            )
            
            db.add(error_log)
            db.commit()
            db.refresh(error_log)
            return error_log
    
    @classmethod
    def get_active_errors(cls, db, tenant_id: str = None, severity: ErrorSeverity = None, limit: int = 50):
        """
        Get currently active (unresolved) errors
        """
        query = db.query(cls).filter(cls.status == ErrorStatus.ACTIVE)
        
        if tenant_id:
            query = query.filter(cls.tenant_id == tenant_id)
        
        if severity:
            query = query.filter(cls.severity == severity)
        
        return query.order_by(cls.last_occurred_at.desc()).limit(limit).all()
    
    @classmethod
    def get_error_stats(cls, db):
        """
        Get error statistics by severity and status
        """
        from sqlalchemy import func
        
        # Get counts by severity
        severity_stats = db.query(
            cls.severity,
            func.count(cls.id).label('count')
        ).filter(cls.status == ErrorStatus.ACTIVE).group_by(cls.severity).all()
        
        # Get counts by category
        category_stats = db.query(
            cls.category,
            func.count(cls.id).label('count')
        ).filter(cls.status == ErrorStatus.ACTIVE).group_by(cls.category).all()
        
        return {
            'by_severity': {stat.severity.value: stat.count for stat in severity_stats},
            'by_category': {stat.category.value: stat.count for stat in category_stats},
            'total_active': sum(stat.count for stat in severity_stats)
        }
    
    def resolve(self, db, admin_id: str, resolution_notes: str = None):
        """
        Mark error as resolved
        """
        self.status = ErrorStatus.RESOLVED
        self.resolved_by_admin_id = admin_id
        self.resolved_at = datetime.now(timezone.utc)
        self.resolution_notes = resolution_notes
        self.updated_at = datetime.now(timezone.utc)
        
        db.commit()
        db.refresh(self)
        return self
    
    def acknowledge(self, db, admin_id: str):
        """
        Mark error as acknowledged
        """
        self.status = ErrorStatus.ACKNOWLEDGED
        self.acknowledged_at = datetime.now(timezone.utc)
        self.updated_at = datetime.now(timezone.utc)
        
        db.commit()
        db.refresh(self)
        return self
    
    def ignore(self, db, admin_id: str, reason: str = None):
        """
        Mark error as ignored
        """
        self.status = ErrorStatus.IGNORED
        self.resolved_by_admin_id = admin_id
        self.resolved_at = datetime.now(timezone.utc)
        self.resolution_notes = f"Ignored: {reason}" if reason else "Ignored by admin"
        self.updated_at = datetime.now(timezone.utc)
        
        db.commit()
        db.refresh(self)
        return self


# Create indexes for performance optimization
Index('idx_error_log_tenant_status', ErrorLog.tenant_id, ErrorLog.status)
Index('idx_error_log_severity_status', ErrorLog.severity, ErrorLog.status)
Index('idx_error_log_category_status', ErrorLog.category, ErrorLog.status)
Index('idx_error_log_type_tenant', ErrorLog.error_type, ErrorLog.tenant_id)
Index('idx_error_log_occurred', ErrorLog.last_occurred_at)
Index('idx_error_log_resolved', ErrorLog.resolved_at)
Index('idx_error_log_environment', ErrorLog.environment)
Index('idx_error_log_code', ErrorLog.error_code)