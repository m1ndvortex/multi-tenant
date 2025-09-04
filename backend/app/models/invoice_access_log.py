"""
Invoice access log model for tracking QR code access
"""

from sqlalchemy import Column, String, DateTime, Text, Integer, Index
from sqlalchemy.dialects.postgresql import UUID, INET
from sqlalchemy.orm import relationship
from .base import BaseModel


class InvoiceAccessLog(BaseModel):
    """Model for tracking invoice access via QR codes"""
    __tablename__ = "invoice_access_logs"
    
    invoice_id = Column(
        UUID(as_uuid=True),
        nullable=False,
        comment="Invoice ID that was accessed"
    )
    
    qr_token = Column(
        String(255),
        nullable=False,
        comment="QR token used for access"
    )
    
    access_ip = Column(
        INET,
        nullable=True,
        comment="IP address of accessor"
    )
    
    user_agent = Column(
        Text,
        nullable=True,
        comment="User agent string"
    )
    
    referer = Column(
        String(500),
        nullable=True,
        comment="HTTP referer header"
    )
    
    access_method = Column(
        String(50),
        default="qr_code",
        nullable=False,
        comment="Method of access (qr_code, direct_link, etc.)"
    )
    
    session_id = Column(
        String(255),
        nullable=True,
        comment="Session identifier for tracking"
    )
    
    access_duration = Column(
        Integer,
        nullable=True,
        comment="Duration of access in seconds"
    )
    
    actions_performed = Column(
        Text,
        nullable=True,
        comment="JSON string of actions performed during session"
    )
    
    def __repr__(self):
        return f"<InvoiceAccessLog(invoice_id={self.invoice_id}, ip={self.access_ip})>"


# Create indexes for performance optimization
Index('idx_invoice_access_log_invoice_id', InvoiceAccessLog.invoice_id)
Index('idx_invoice_access_log_qr_token', InvoiceAccessLog.qr_token)
Index('idx_invoice_access_log_access_ip', InvoiceAccessLog.access_ip)
Index('idx_invoice_access_log_created_at', InvoiceAccessLog.created_at)
Index('idx_invoice_access_log_access_method', InvoiceAccessLog.access_method)