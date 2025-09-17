"""
OperationLog model for detailed operation logging
"""

from sqlalchemy import Column, String, DateTime, Enum, Text, Index, ForeignKey, Float
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from ..base import BaseModel


class LogLevel(enum.Enum):
    """Log level enumeration"""
    DEBUG = "debug"
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


class OperationLog(BaseModel):
    """
    Operation log model for detailed operation logging
    """
    __tablename__ = "operation_logs"
    
    # Operation Reference
    operation_id = Column(
        UUID(as_uuid=True), 
        ForeignKey("backup_operations.id"),
        nullable=False,
        comment="Reference to backup operation"
    )
    
    operation_type = Column(
        String(50), 
        nullable=False,
        comment="Type of operation (BACKUP, RESTORE, ROLLBACK)"
    )
    
    # Log Details
    log_level = Column(
        Enum(LogLevel), 
        nullable=False,
        comment="Log level (DEBUG, INFO, WARNING, ERROR, CRITICAL)"
    )
    
    message = Column(
        Text, 
        nullable=False,
        comment="Log message"
    )
    
    details = Column(
        JSONB, 
        nullable=True,
        comment="Additional log details and context"
    )
    
    # Context Information
    step_name = Column(
        String(255), 
        nullable=False,
        comment="Current operation step name"
    )
    
    progress_at_time = Column(
        Float, 
        nullable=False,
        comment="Progress percentage at time of log entry"
    )
    
    # Component Information
    component = Column(
        String(100), 
        nullable=True,
        comment="Component or service that generated the log"
    )
    
    function_name = Column(
        String(100), 
        nullable=True,
        comment="Function or method name"
    )
    
    # Performance Metrics
    execution_time_ms = Column(
        Float, 
        nullable=True,
        comment="Execution time in milliseconds for this step"
    )
    
    memory_usage_mb = Column(
        Float, 
        nullable=True,
        comment="Memory usage in MB at time of log"
    )
    
    # Error Information (for ERROR and CRITICAL levels)
    error_code = Column(
        String(50), 
        nullable=True,
        comment="Error code for categorization"
    )
    
    stack_trace = Column(
        Text, 
        nullable=True,
        comment="Stack trace for errors"
    )
    
    # Tenant Context (for tenant-specific operations)
    tenant_id = Column(
        UUID(as_uuid=True), 
        nullable=True,
        comment="Tenant ID if log is tenant-specific"
    )
    
    # Storage Context
    storage_provider = Column(
        String(50), 
        nullable=True,
        comment="Storage provider if log is storage-related"
    )
    
    file_path = Column(
        String(500), 
        nullable=True,
        comment="File path if log is file-related"
    )
    
    # Relationships
    operation = relationship("BackupOperation", back_populates="logs")
    
    def __repr__(self):
        return f"<OperationLog(id={self.id}, level='{self.log_level.value}', step='{self.step_name}')>"
    
    @classmethod
    def create_log(cls, operation_id: str, operation_type: str, level: LogLevel, 
                   message: str, step_name: str, progress: float, **kwargs):
        """Create a new log entry"""
        log_entry = cls(
            operation_id=operation_id,
            operation_type=operation_type,
            log_level=level,
            message=message,
            step_name=step_name,
            progress_at_time=progress,
            **kwargs
        )
        return log_entry
    
    @classmethod
    def log_debug(cls, operation_id: str, operation_type: str, message: str, 
                  step_name: str, progress: float, **kwargs):
        """Create debug log entry"""
        return cls.create_log(operation_id, operation_type, LogLevel.DEBUG, 
                             message, step_name, progress, **kwargs)
    
    @classmethod
    def log_info(cls, operation_id: str, operation_type: str, message: str, 
                 step_name: str, progress: float, **kwargs):
        """Create info log entry"""
        return cls.create_log(operation_id, operation_type, LogLevel.INFO, 
                             message, step_name, progress, **kwargs)
    
    @classmethod
    def log_warning(cls, operation_id: str, operation_type: str, message: str, 
                    step_name: str, progress: float, **kwargs):
        """Create warning log entry"""
        return cls.create_log(operation_id, operation_type, LogLevel.WARNING, 
                             message, step_name, progress, **kwargs)
    
    @classmethod
    def log_error(cls, operation_id: str, operation_type: str, message: str, 
                  step_name: str, progress: float, error_code: str = None, 
                  stack_trace: str = None, **kwargs):
        """Create error log entry"""
        return cls.create_log(operation_id, operation_type, LogLevel.ERROR, 
                             message, step_name, progress, 
                             error_code=error_code, stack_trace=stack_trace, **kwargs)
    
    @classmethod
    def log_critical(cls, operation_id: str, operation_type: str, message: str, 
                     step_name: str, progress: float, error_code: str = None, 
                     stack_trace: str = None, **kwargs):
        """Create critical log entry"""
        return cls.create_log(operation_id, operation_type, LogLevel.CRITICAL, 
                             message, step_name, progress, 
                             error_code=error_code, stack_trace=stack_trace, **kwargs)
    
    def add_detail(self, key: str, value: Any):
        """Add detail to log entry"""
        if not self.details:
            self.details = {}
        self.details[key] = value
    
    def add_performance_metrics(self, execution_time_ms: float, memory_usage_mb: float = None):
        """Add performance metrics to log entry"""
        self.execution_time_ms = execution_time_ms
        if memory_usage_mb:
            self.memory_usage_mb = memory_usage_mb
    
    def is_error(self) -> bool:
        """Check if log entry is an error"""
        return self.log_level in [LogLevel.ERROR, LogLevel.CRITICAL]
    
    def is_warning_or_above(self) -> bool:
        """Check if log entry is warning level or above"""
        return self.log_level in [LogLevel.WARNING, LogLevel.ERROR, LogLevel.CRITICAL]
    
    def get_formatted_message(self) -> str:
        """Get formatted log message with context"""
        timestamp = self.created_at.strftime("%Y-%m-%d %H:%M:%S")
        level = self.log_level.value.upper()
        progress = f"{self.progress_at_time:.1f}%"
        
        base_message = f"[{timestamp}] [{level}] [{progress}] {self.step_name}: {self.message}"
        
        if self.component:
            base_message = f"[{self.component}] {base_message}"
        
        if self.tenant_id:
            base_message = f"[Tenant: {self.tenant_id}] {base_message}"
        
        return base_message
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert log entry to dictionary"""
        return {
            "id": str(self.id),
            "operation_id": str(self.operation_id),
            "operation_type": self.operation_type,
            "log_level": self.log_level.value,
            "message": self.message,
            "step_name": self.step_name,
            "progress_at_time": self.progress_at_time,
            "component": self.component,
            "function_name": self.function_name,
            "execution_time_ms": self.execution_time_ms,
            "memory_usage_mb": self.memory_usage_mb,
            "error_code": self.error_code,
            "tenant_id": str(self.tenant_id) if self.tenant_id else None,
            "storage_provider": self.storage_provider,
            "file_path": self.file_path,
            "details": self.details,
            "created_at": self.created_at.isoformat(),
            "formatted_message": self.get_formatted_message()
        }


# Create indexes for performance optimization
Index('idx_operation_log_operation', OperationLog.operation_id)
Index('idx_operation_log_level', OperationLog.log_level)
Index('idx_operation_log_created_at', OperationLog.created_at)
Index('idx_operation_log_step', OperationLog.step_name)
Index('idx_operation_log_component', OperationLog.component)
Index('idx_operation_log_tenant', OperationLog.tenant_id)
Index('idx_operation_log_storage_provider', OperationLog.storage_provider)
Index('idx_operation_log_error_code', OperationLog.error_code)
Index('idx_operation_log_operation_type', OperationLog.operation_type)
Index('idx_operation_log_progress', OperationLog.progress_at_time)