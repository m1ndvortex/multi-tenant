"""
Subscription History Model
Tracks all subscription changes and admin actions
"""

from sqlalchemy import Column, String, DateTime, Text, Integer, Enum, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from datetime import datetime, timezone
from .base import BaseModel


class SubscriptionAction(enum.Enum):
    """Subscription action types"""
    CREATED = "created"
    UPGRADED = "upgraded"
    DOWNGRADED = "downgraded"
    EXTENDED = "extended"
    ACTIVATED = "activated"
    DEACTIVATED = "deactivated"
    SUSPENDED = "suspended"
    RENEWED = "renewed"
    CANCELLED = "cancelled"


class SubscriptionHistory(BaseModel):
    """
    Subscription history tracking model
    Records all subscription changes with admin context
    """
    __tablename__ = "subscription_history"
    
    # Foreign Keys
    tenant_id = Column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        comment="Tenant ID"
    )
    
    admin_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        comment="Admin user who made the change"
    )
    
    # Subscription Change Details
    action = Column(
        String(50),
        nullable=False,
        comment="Type of subscription action"
    )
    
    old_subscription_type = Column(
        String(50),
        nullable=True,
        comment="Previous subscription type"
    )
    
    new_subscription_type = Column(
        String(50),
        nullable=False,
        comment="New subscription type"
    )
    
    duration_months = Column(
        Integer,
        nullable=True,
        comment="Duration in months (for extensions/renewals)"
    )
    
    old_expiry_date = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="Previous expiry date"
    )
    
    new_expiry_date = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="New expiry date"
    )
    
    # Context and Metadata
    reason = Column(
        Text,
        nullable=True,
        comment="Reason for the change"
    )
    
    notes = Column(
        Text,
        nullable=True,
        comment="Additional notes about the change"
    )
    
    change_date = Column(
        DateTime(timezone=True),
        default=func.now(),
        nullable=False,
        comment="When the change was made"
    )
    
    # System Context
    ip_address = Column(
        String(45),
        nullable=True,
        comment="IP address of admin making change"
    )
    
    user_agent = Column(
        Text,
        nullable=True,
        comment="User agent of admin making change"
    )
    
    # Relationships
    tenant = relationship("Tenant", back_populates="subscription_history")
    admin = relationship("User", foreign_keys=[admin_id])
    
    def __repr__(self):
        return f"<SubscriptionHistory(tenant_id={self.tenant_id}, action={self.action.value}, date={self.change_date})>"
    
    @classmethod
    def create_history_entry(
        cls,
        tenant_id: str,
        action: str,
        new_subscription_type: str,
        admin_id: str = None,
        old_subscription_type: str = None,
        duration_months: int = None,
        old_expiry_date: datetime = None,
        new_expiry_date: datetime = None,
        reason: str = None,
        notes: str = None,
        ip_address: str = None,
        user_agent: str = None
    ):
        """Create a new subscription history entry"""
        return cls(
            tenant_id=tenant_id,
            admin_id=admin_id,
            action=action,
            old_subscription_type=old_subscription_type,
            new_subscription_type=new_subscription_type,
            duration_months=duration_months,
            old_expiry_date=old_expiry_date,
            new_expiry_date=new_expiry_date,
            reason=reason,
            notes=notes,
            change_date=datetime.now(timezone.utc),
            ip_address=ip_address,
            user_agent=user_agent
        )


# Create indexes for performance optimization
Index('idx_subscription_history_tenant_id', SubscriptionHistory.tenant_id)
Index('idx_subscription_history_admin_id', SubscriptionHistory.admin_id)
Index('idx_subscription_history_action', SubscriptionHistory.action)
Index('idx_subscription_history_change_date', SubscriptionHistory.change_date)
Index('idx_subscription_history_tenant_date', SubscriptionHistory.tenant_id, SubscriptionHistory.change_date)