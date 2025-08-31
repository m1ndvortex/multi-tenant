"""
Notification system models
"""

from sqlalchemy import Column, String, DateTime, Boolean, Enum, Text, Index, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from datetime import datetime
from .base import BaseModel, TenantMixin


class NotificationStatus(enum.Enum):
    """Notification status enumeration"""
    PENDING = "pending"
    SENT = "sent"
    DELIVERED = "delivered"
    FAILED = "failed"
    CANCELLED = "cancelled"


class NotificationType(enum.Enum):
    """Notification type enumeration"""
    EMAIL = "email"
    SMS = "sms"
    PUSH = "push"


class NotificationTemplate(BaseModel, TenantMixin):
    """
    Notification templates for automated messaging
    """
    __tablename__ = "notification_templates"
    
    # Template Information
    name = Column(
        String(255), 
        nullable=False,
        comment="Template name"
    )
    
    template_type = Column(
        Enum(NotificationType), 
        nullable=False,
        comment="Type of notification template"
    )
    
    # Template Content
    subject = Column(
        String(500), 
        nullable=True,
        comment="Email subject or SMS title"
    )
    
    body = Column(
        Text, 
        nullable=False,
        comment="Template body with placeholders"
    )
    
    # Template Configuration
    is_system_template = Column(
        Boolean, 
        default=False,
        nullable=False,
        comment="Whether this is a system template"
    )
    
    is_default = Column(
        Boolean, 
        default=False,
        nullable=False,
        comment="Whether this is the default template for its type"
    )
    
    # Trigger Configuration
    trigger_event = Column(
        String(100), 
        nullable=True,
        comment="Event that triggers this template"
    )
    
    # Template Variables
    variables = Column(
        JSONB, 
        default=list,
        nullable=True,
        comment="Available template variables"
    )
    
    # Relationships
    tenant = relationship("Tenant")
    
    def __repr__(self):
        return f"<NotificationTemplate(id={self.id}, name='{self.name}', type='{self.template_type.value}')>"
    
    def render(self, variables: dict) -> dict:
        """Render template with provided variables"""
        rendered_subject = self.subject
        rendered_body = self.body
        
        # Replace placeholders with actual values
        for key, value in variables.items():
            placeholder = f"{{{key}}}"
            if rendered_subject:
                rendered_subject = rendered_subject.replace(placeholder, str(value))
            rendered_body = rendered_body.replace(placeholder, str(value))
        
        return {
            "subject": rendered_subject,
            "body": rendered_body
        }


class NotificationLog(BaseModel, TenantMixin):
    """
    Log of all sent notifications
    """
    __tablename__ = "notification_logs"
    
    # Notification Information
    notification_type = Column(
        Enum(NotificationType), 
        nullable=False,
        comment="Type of notification"
    )
    
    status = Column(
        Enum(NotificationStatus), 
        default=NotificationStatus.PENDING,
        nullable=False,
        comment="Notification status"
    )
    
    # Recipient Information
    recipient_email = Column(
        String(255), 
        nullable=True,
        comment="Recipient email address"
    )
    
    recipient_phone = Column(
        String(50), 
        nullable=True,
        comment="Recipient phone number"
    )
    
    customer_id = Column(
        UUID(as_uuid=True), 
        ForeignKey("customers.id"),
        nullable=True,
        comment="Customer ID (if applicable)"
    )
    
    # Message Content
    subject = Column(
        String(500), 
        nullable=True,
        comment="Message subject"
    )
    
    body = Column(
        Text, 
        nullable=False,
        comment="Message body"
    )
    
    # Template Information
    template_id = Column(
        UUID(as_uuid=True), 
        ForeignKey("notification_templates.id"),
        nullable=True,
        comment="Template used (if any)"
    )
    
    template_variables = Column(
        JSONB, 
        nullable=True,
        comment="Variables used in template"
    )
    
    # Delivery Information
    sent_at = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="Sent timestamp"
    )
    
    delivered_at = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="Delivered timestamp"
    )
    
    # Error Information
    error_message = Column(
        Text, 
        nullable=True,
        comment="Error message if failed"
    )
    
    retry_count = Column(
        Integer, 
        default=0,
        nullable=False,
        comment="Number of retry attempts"
    )
    
    # Reference Information
    reference_type = Column(
        String(50), 
        nullable=True,
        comment="Type of related entity (invoice, payment, etc.)"
    )
    
    reference_id = Column(
        UUID(as_uuid=True), 
        nullable=True,
        comment="ID of related entity"
    )
    
    # Provider Information
    provider = Column(
        String(100), 
        nullable=True,
        comment="Service provider used (SMTP, SMS gateway, etc.)"
    )
    
    provider_message_id = Column(
        String(255), 
        nullable=True,
        comment="Provider's message ID"
    )
    
    # Relationships
    tenant = relationship("Tenant")
    customer = relationship("Customer")
    template = relationship("NotificationTemplate")
    
    def __repr__(self):
        return f"<NotificationLog(id={self.id}, type='{self.notification_type.value}', status='{self.status.value}')>"
    
    def mark_sent(self, provider_message_id: str = None):
        """Mark notification as sent"""
        self.status = NotificationStatus.SENT
        self.sent_at = datetime.utcnow()
        if provider_message_id:
            self.provider_message_id = provider_message_id
    
    def mark_delivered(self):
        """Mark notification as delivered"""
        self.status = NotificationStatus.DELIVERED
        self.delivered_at = datetime.utcnow()
    
    def mark_failed(self, error_message: str):
        """Mark notification as failed"""
        self.status = NotificationStatus.FAILED
        self.error_message = error_message
        self.retry_count += 1
    
    def can_retry(self, max_retries: int = 3) -> bool:
        """Check if notification can be retried"""
        return self.status == NotificationStatus.FAILED and self.retry_count < max_retries


class NotificationQueue(BaseModel):
    """
    Queue for pending notifications
    """
    __tablename__ = "notification_queue"
    
    # Queue Information
    notification_log_id = Column(
        UUID(as_uuid=True), 
        ForeignKey("notification_logs.id"),
        nullable=False,
        comment="Notification log ID"
    )
    
    priority = Column(
        Integer, 
        default=5,
        nullable=False,
        comment="Queue priority (1=highest, 10=lowest)"
    )
    
    scheduled_at = Column(
        DateTime(timezone=True),
        default=func.now(),
        nullable=False,
        comment="Scheduled send time"
    )
    
    attempts = Column(
        Integer, 
        default=0,
        nullable=False,
        comment="Number of processing attempts"
    )
    
    last_attempt_at = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="Last processing attempt timestamp"
    )
    
    # Relationships
    notification_log = relationship("NotificationLog")
    
    def __repr__(self):
        return f"<NotificationQueue(id={self.id}, log_id={self.notification_log_id}, priority={self.priority})>"


# Create indexes for performance optimization
Index('idx_notification_template_tenant_type', NotificationTemplate.tenant_id, NotificationTemplate.template_type)
Index('idx_notification_template_trigger', NotificationTemplate.trigger_event)
Index('idx_notification_template_default', NotificationTemplate.is_default)

Index('idx_notification_log_tenant_type', NotificationLog.tenant_id, NotificationLog.notification_type)
Index('idx_notification_log_tenant_status', NotificationLog.tenant_id, NotificationLog.status)
Index('idx_notification_log_customer', NotificationLog.customer_id)
Index('idx_notification_log_sent_at', NotificationLog.sent_at)
Index('idx_notification_log_reference', NotificationLog.reference_type, NotificationLog.reference_id)

Index('idx_notification_queue_scheduled', NotificationQueue.scheduled_at)
Index('idx_notification_queue_priority', NotificationQueue.priority)
Index('idx_notification_queue_attempts', NotificationQueue.attempts)