"""
Customer interaction model for CRM functionality
"""

from sqlalchemy import Column, String, DateTime, Boolean, Enum, Text, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from datetime import datetime
from .base import BaseModel, TenantMixin


class InteractionType(enum.Enum):
    """Customer interaction type enumeration"""
    CALL = "CALL"
    EMAIL = "EMAIL"
    SMS = "SMS"
    MEETING = "MEETING"
    NOTE = "NOTE"
    PURCHASE = "PURCHASE"
    PAYMENT = "PAYMENT"
    COMPLAINT = "COMPLAINT"
    SUPPORT = "SUPPORT"


class CustomerInteraction(BaseModel, TenantMixin):
    """
    Customer interaction model for CRM functionality
    Tracks all interactions with customers for relationship management
    """
    __tablename__ = "customer_interactions"
    
    # Foreign Keys
    customer_id = Column(
        UUID(as_uuid=True), 
        ForeignKey("customers.id", ondelete="CASCADE"), 
        nullable=False,
        comment="Customer this interaction belongs to"
    )
    
    user_id = Column(
        UUID(as_uuid=True), 
        ForeignKey("users.id", ondelete="SET NULL"), 
        nullable=True,
        comment="User who created this interaction"
    )
    
    # Interaction Details
    interaction_type = Column(
        Enum(InteractionType), 
        nullable=False,
        comment="Type of interaction"
    )
    
    subject = Column(
        String(255), 
        nullable=False,
        comment="Interaction subject or title"
    )
    
    description = Column(
        Text, 
        nullable=True,
        comment="Detailed description of the interaction"
    )
    
    outcome = Column(
        Text, 
        nullable=True,
        comment="Outcome or result of the interaction"
    )
    
    # Follow-up Information
    follow_up_required = Column(
        Boolean, 
        default=False,
        nullable=False,
        comment="Whether follow-up is required"
    )
    
    follow_up_date = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="Scheduled follow-up date"
    )
    
    follow_up_completed = Column(
        Boolean, 
        default=False,
        nullable=False,
        comment="Whether follow-up has been completed"
    )
    
    # Additional Data
    interaction_metadata = Column(
        JSONB, 
        default=dict,
        nullable=True,
        comment="Additional metadata for the interaction"
    )
    
    # Duration (for calls and meetings)
    duration_minutes = Column(
        String(10), 
        nullable=True,
        comment="Duration in minutes for calls/meetings"
    )
    
    # Contact Information Used
    contact_method = Column(
        String(50), 
        nullable=True,
        comment="Contact method used (phone, email, etc.)"
    )
    
    contact_value = Column(
        String(255), 
        nullable=True,
        comment="Actual contact value used (phone number, email address)"
    )
    
    # Relationships
    customer = relationship("Customer", back_populates="interactions")
    user = relationship("User")
    
    def __repr__(self):
        return f"<CustomerInteraction(id={self.id}, customer_id={self.customer_id}, type={self.interaction_type})>"
    
    @property
    def is_overdue_followup(self) -> bool:
        """Check if follow-up is overdue"""
        if not self.follow_up_required or self.follow_up_completed:
            return False
        
        if not self.follow_up_date:
            return False
        
        return datetime.utcnow() > self.follow_up_date.replace(tzinfo=None)
    
    def mark_followup_completed(self):
        """Mark follow-up as completed"""
        self.follow_up_completed = True
    
    def add_metadata(self, key: str, value):
        """Add metadata to the interaction"""
        if not self.interaction_metadata:
            self.interaction_metadata = {}
        
        self.interaction_metadata[key] = value
    
    def get_metadata(self, key: str, default=None):
        """Get metadata value"""
        if not self.interaction_metadata:
            return default
        
        return self.interaction_metadata.get(key, default)


# Add the relationship to Customer model
# This will be imported in the customer model
def add_customer_interaction_relationship():
    """Add interaction relationship to Customer model"""
    from .customer import Customer
    Customer.interactions = relationship(
        "CustomerInteraction", 
        back_populates="customer", 
        cascade="all, delete-orphan",
        order_by="CustomerInteraction.created_at.desc()"
    )


# Create indexes for performance optimization
Index('idx_customer_interaction_tenant_customer', CustomerInteraction.tenant_id, CustomerInteraction.customer_id)
Index('idx_customer_interaction_type', CustomerInteraction.interaction_type)
Index('idx_customer_interaction_user', CustomerInteraction.user_id)
Index('idx_customer_interaction_followup', CustomerInteraction.follow_up_required, CustomerInteraction.follow_up_date)
Index('idx_customer_interaction_created', CustomerInteraction.created_at)