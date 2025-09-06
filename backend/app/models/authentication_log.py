"""
Authentication log model for security audit trail
"""

from sqlalchemy import Column, String, DateTime, Boolean, Text, Index
from sqlalchemy.dialects.postgresql import UUID
import uuid
from .base import BaseModel


class AuthenticationLog(BaseModel):
    """
    Authentication log model for security audit trail
    """
    __tablename__ = "authentication_logs"
    
    # Authentication Details
    email = Column(
        String(255),
        nullable=False,
        comment="Email address used in login attempt"
    )
    
    user_id = Column(
        UUID(as_uuid=True),
        nullable=True,
        comment="User ID (null for failed attempts)"
    )
    
    tenant_id = Column(
        UUID(as_uuid=True),
        nullable=True,
        comment="Tenant ID for multi-tenant context"
    )
    
    # Event Information
    event_type = Column(
        String(50),
        nullable=False,
        comment="Type of authentication event (login_success, login_failed, logout)"
    )
    
    success = Column(
        Boolean,
        nullable=False,
        comment="Whether the authentication was successful"
    )
    
    failure_reason = Column(
        String(100),
        nullable=True,
        comment="Reason for authentication failure"
    )
    
    # Request Context
    ip_address = Column(
        String(45),
        nullable=True,
        comment="Client IP address"
    )
    
    user_agent = Column(
        Text,
        nullable=True,
        comment="Client user agent string"
    )
    
    # Additional Details
    additional_data = Column(
        Text,
        nullable=True,
        comment="Additional JSON metadata"
    )
    
    error_details = Column(
        Text,
        nullable=True,
        comment="Error details for failed attempts"
    )
    
    def __repr__(self):
        return f"<AuthenticationLog(email='{self.email}', success={self.success}, created_at='{self.created_at}')>"


# Create indexes for performance
Index('idx_auth_log_email', AuthenticationLog.email)
Index('idx_auth_log_tenant_id', AuthenticationLog.tenant_id)
Index('idx_auth_log_user_id', AuthenticationLog.user_id)
Index('idx_auth_log_event_type', AuthenticationLog.event_type)
Index('idx_auth_log_success', AuthenticationLog.success)
Index('idx_auth_log_created_at', AuthenticationLog.created_at)
Index('idx_auth_log_ip_address', AuthenticationLog.ip_address)