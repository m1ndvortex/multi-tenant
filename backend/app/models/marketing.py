"""
Marketing and communication models
"""

from sqlalchemy import Column, String, DateTime, Boolean, Enum, Text, Integer, Index, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from datetime import datetime
from .base import BaseModel, TenantMixin


class CampaignStatus(enum.Enum):
    """Campaign status enumeration"""
    DRAFT = "draft"
    SCHEDULED = "scheduled"
    RUNNING = "running"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    FAILED = "failed"


class CampaignType(enum.Enum):
    """Campaign type enumeration"""
    EMAIL = "email"
    SMS = "sms"
    MIXED = "mixed"


class SegmentationType(enum.Enum):
    """Customer segmentation type"""
    MANUAL = "manual"
    AUTOMATIC = "automatic"
    DYNAMIC = "dynamic"


class MarketingCampaign(BaseModel, TenantMixin):
    """
    Marketing campaign model for bulk communications
    """
    __tablename__ = "marketing_campaigns"
    
    # Campaign Information
    name = Column(
        String(255), 
        nullable=False,
        comment="Campaign name"
    )
    
    description = Column(
        Text, 
        nullable=True,
        comment="Campaign description"
    )
    
    campaign_type = Column(
        Enum(CampaignType), 
        nullable=False,
        comment="Type of campaign"
    )
    
    status = Column(
        Enum(CampaignStatus), 
        default=CampaignStatus.DRAFT,
        nullable=False,
        comment="Campaign status"
    )
    
    # Message Content
    subject = Column(
        String(500), 
        nullable=True,
        comment="Email subject (for email campaigns)"
    )
    
    message = Column(
        Text, 
        nullable=False,
        comment="Campaign message content"
    )
    
    # Scheduling
    scheduled_at = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="Scheduled send time"
    )
    
    started_at = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="Campaign start time"
    )
    
    completed_at = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="Campaign completion time"
    )
    
    # Target Audience
    customer_filter = Column(
        JSONB, 
        default=dict,
        nullable=True,
        comment="Customer filter criteria"
    )
    
    target_customer_count = Column(
        Integer, 
        default=0,
        nullable=False,
        comment="Number of target customers"
    )
    
    # Campaign Results
    sent_count = Column(
        Integer, 
        default=0,
        nullable=False,
        comment="Number of messages sent"
    )
    
    delivered_count = Column(
        Integer, 
        default=0,
        nullable=False,
        comment="Number of messages delivered"
    )
    
    failed_count = Column(
        Integer, 
        default=0,
        nullable=False,
        comment="Number of failed messages"
    )
    
    # Campaign Settings
    send_immediately = Column(
        Boolean, 
        default=True,
        nullable=False,
        comment="Send immediately or schedule"
    )
    
    # Relationships
    tenant = relationship("Tenant")
    campaign_recipients = relationship("CampaignRecipient", back_populates="campaign", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<MarketingCampaign(id={self.id}, name='{self.name}', status='{self.status.value}')>"
    
    @property
    def success_rate(self) -> float:
        """Calculate campaign success rate"""
        if self.sent_count == 0:
            return 0.0
        return (self.delivered_count / self.sent_count) * 100
    
    @property
    def is_active(self) -> bool:
        """Check if campaign is currently active"""
        return self.status in [CampaignStatus.SCHEDULED, CampaignStatus.RUNNING]
    
    def start_campaign(self):
        """Start the campaign"""
        self.status = CampaignStatus.RUNNING
        self.started_at = datetime.utcnow()
    
    def complete_campaign(self):
        """Complete the campaign"""
        self.status = CampaignStatus.COMPLETED
        self.completed_at = datetime.utcnow()
    
    def cancel_campaign(self):
        """Cancel the campaign"""
        self.status = CampaignStatus.CANCELLED
        self.completed_at = datetime.utcnow()
    
    def fail_campaign(self, reason: str = None):
        """Mark campaign as failed"""
        self.status = CampaignStatus.FAILED
        self.completed_at = datetime.utcnow()


class CampaignRecipient(BaseModel):
    """
    Campaign recipient tracking
    """
    __tablename__ = "campaign_recipients"
    
    # Campaign Information
    campaign_id = Column(
        UUID(as_uuid=True), 
        ForeignKey("marketing_campaigns.id"),
        nullable=False,
        comment="Campaign ID"
    )
    
    customer_id = Column(
        UUID(as_uuid=True), 
        ForeignKey("customers.id"),
        nullable=False,
        comment="Customer ID"
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
    
    # Delivery Status
    status = Column(
        String(20), 
        default="pending",
        nullable=False,
        comment="Delivery status"
    )
    
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
    
    error_message = Column(
        Text, 
        nullable=True,
        comment="Error message if failed"
    )
    
    # Provider Information
    provider_message_id = Column(
        String(255), 
        nullable=True,
        comment="Provider's message ID"
    )
    
    # Relationships
    campaign = relationship("MarketingCampaign", back_populates="campaign_recipients")
    customer = relationship("Customer")
    
    def __repr__(self):
        return f"<CampaignRecipient(id={self.id}, campaign_id={self.campaign_id}, status='{self.status}')>"
    
    def mark_sent(self, provider_message_id: str = None):
        """Mark as sent"""
        self.status = "sent"
        self.sent_at = datetime.utcnow()
        if provider_message_id:
            self.provider_message_id = provider_message_id
    
    def mark_delivered(self):
        """Mark as delivered"""
        self.status = "delivered"
        self.delivered_at = datetime.utcnow()
    
    def mark_failed(self, error_message: str):
        """Mark as failed"""
        self.status = "failed"
        self.error_message = error_message


class CustomerSegment(BaseModel, TenantMixin):
    """
    Customer segmentation for targeted marketing
    """
    __tablename__ = "customer_segments"
    
    # Segment Information
    name = Column(
        String(255), 
        nullable=False,
        comment="Segment name"
    )
    
    description = Column(
        Text, 
        nullable=True,
        comment="Segment description"
    )
    
    segmentation_type = Column(
        Enum(SegmentationType), 
        default=SegmentationType.MANUAL,
        nullable=False,
        comment="Type of segmentation"
    )
    
    # Segment Criteria
    filter_criteria = Column(
        JSONB, 
        default=dict,
        nullable=True,
        comment="Automatic segmentation criteria"
    )
    
    # Segment Statistics
    customer_count = Column(
        Integer, 
        default=0,
        nullable=False,
        comment="Number of customers in segment"
    )
    
    last_updated_at = Column(
        DateTime(timezone=True),
        default=func.now(),
        nullable=False,
        comment="Last update timestamp"
    )
    
    # Relationships
    tenant = relationship("Tenant")
    segment_customers = relationship("SegmentCustomer", back_populates="segment", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<CustomerSegment(id={self.id}, name='{self.name}', count={self.customer_count})>"
    
    def update_customer_count(self, db):
        """Update customer count for this segment"""
        from sqlalchemy import func
        count = db.query(func.count(SegmentCustomer.id)).filter(
            SegmentCustomer.segment_id == self.id
        ).scalar()
        self.customer_count = count or 0
        self.last_updated_at = datetime.utcnow()


class SegmentCustomer(BaseModel):
    """
    Customer membership in segments
    """
    __tablename__ = "segment_customers"
    
    # Segment Information
    segment_id = Column(
        UUID(as_uuid=True), 
        ForeignKey("customer_segments.id"),
        nullable=False,
        comment="Segment ID"
    )
    
    customer_id = Column(
        UUID(as_uuid=True), 
        ForeignKey("customers.id"),
        nullable=False,
        comment="Customer ID"
    )
    
    # Membership Information
    added_at = Column(
        DateTime(timezone=True),
        default=func.now(),
        nullable=False,
        comment="Added to segment timestamp"
    )
    
    added_by = Column(
        String(50), 
        default="system",
        nullable=False,
        comment="How customer was added (manual, automatic, import)"
    )
    
    # Relationships
    segment = relationship("CustomerSegment", back_populates="segment_customers")
    customer = relationship("Customer")
    
    def __repr__(self):
        return f"<SegmentCustomer(segment_id={self.segment_id}, customer_id={self.customer_id})>"


class CommunicationPreference(BaseModel, TenantMixin):
    """
    Customer communication preferences
    """
    __tablename__ = "communication_preferences"
    
    # Customer Information
    customer_id = Column(
        UUID(as_uuid=True), 
        ForeignKey("customers.id"),
        nullable=False,
        comment="Customer ID"
    )
    
    # Email Preferences
    email_enabled = Column(
        Boolean, 
        default=True,
        nullable=False,
        comment="Allow email communications"
    )
    
    email_marketing = Column(
        Boolean, 
        default=True,
        nullable=False,
        comment="Allow marketing emails"
    )
    
    email_invoices = Column(
        Boolean, 
        default=True,
        nullable=False,
        comment="Allow invoice emails"
    )
    
    email_reminders = Column(
        Boolean, 
        default=True,
        nullable=False,
        comment="Allow reminder emails"
    )
    
    # SMS Preferences
    sms_enabled = Column(
        Boolean, 
        default=True,
        nullable=False,
        comment="Allow SMS communications"
    )
    
    sms_marketing = Column(
        Boolean, 
        default=True,
        nullable=False,
        comment="Allow marketing SMS"
    )
    
    sms_invoices = Column(
        Boolean, 
        default=True,
        nullable=False,
        comment="Allow invoice SMS"
    )
    
    sms_reminders = Column(
        Boolean, 
        default=True,
        nullable=False,
        comment="Allow reminder SMS"
    )
    
    # Preferred Times
    preferred_contact_time = Column(
        String(50), 
        default="business_hours",
        nullable=False,
        comment="Preferred contact time (business_hours, evening, anytime)"
    )
    
    timezone = Column(
        String(50), 
        default="Asia/Tehran",
        nullable=False,
        comment="Customer timezone"
    )
    
    # Opt-out Information
    opted_out_at = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="Global opt-out timestamp"
    )
    
    opt_out_reason = Column(
        String(255), 
        nullable=True,
        comment="Reason for opting out"
    )
    
    # Relationships
    tenant = relationship("Tenant")
    customer = relationship("Customer")
    
    def __repr__(self):
        return f"<CommunicationPreference(customer_id={self.customer_id}, email={self.email_enabled}, sms={self.sms_enabled})>"
    
    def opt_out_all(self, reason: str = None):
        """Opt out of all communications"""
        self.email_enabled = False
        self.sms_enabled = False
        self.email_marketing = False
        self.sms_marketing = False
        self.opted_out_at = datetime.utcnow()
        self.opt_out_reason = reason
    
    def opt_in_all(self):
        """Opt in to all communications"""
        self.email_enabled = True
        self.sms_enabled = True
        self.email_marketing = True
        self.sms_marketing = True
        self.opted_out_at = None
        self.opt_out_reason = None
    
    def can_receive_email(self, message_type: str = "general") -> bool:
        """Check if customer can receive email of specific type"""
        if not self.email_enabled:
            return False
        
        if message_type == "marketing" and not self.email_marketing:
            return False
        elif message_type == "invoice" and not self.email_invoices:
            return False
        elif message_type == "reminder" and not self.email_reminders:
            return False
        
        return True
    
    def can_receive_sms(self, message_type: str = "general") -> bool:
        """Check if customer can receive SMS of specific type"""
        if not self.sms_enabled:
            return False
        
        if message_type == "marketing" and not self.sms_marketing:
            return False
        elif message_type == "invoice" and not self.sms_invoices:
            return False
        elif message_type == "reminder" and not self.sms_reminders:
            return False
        
        return True


# Create indexes for performance optimization
Index('idx_marketing_campaign_tenant_status', MarketingCampaign.tenant_id, MarketingCampaign.status)
Index('idx_marketing_campaign_scheduled', MarketingCampaign.scheduled_at)
Index('idx_marketing_campaign_type', MarketingCampaign.campaign_type)

Index('idx_campaign_recipient_campaign', CampaignRecipient.campaign_id)
Index('idx_campaign_recipient_customer', CampaignRecipient.customer_id)
Index('idx_campaign_recipient_status', CampaignRecipient.status)

Index('idx_customer_segment_tenant', CustomerSegment.tenant_id)
Index('idx_customer_segment_type', CustomerSegment.segmentation_type)

Index('idx_segment_customer_segment', SegmentCustomer.segment_id)
Index('idx_segment_customer_customer', SegmentCustomer.customer_id)

Index('idx_communication_preference_tenant', CommunicationPreference.tenant_id)
Index('idx_communication_preference_customer', CommunicationPreference.customer_id)