"""
Subscription History model for tracking all subscription changes
"""

from sqlalchemy import Column, String, DateTime, ForeignKey, Index, Text, Integer, Enum, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime, timezone
import enum
from .base import BaseModel


class SubscriptionChangeType(enum.Enum):
    """Types of subscription changes"""
    UPGRADE = "upgrade"
    DOWNGRADE = "downgrade"
    EXTENSION = "extension"
    ACTIVATION = "activation"
    DEACTIVATION = "deactivation"
    SUSPENSION = "suspension"
    PLAN_SWITCH = "plan_switch"
    MANUAL_EDIT = "manual_edit"
    EXPIRATION = "expiration"


class SubscriptionHistory(BaseModel):
    """
    Model for tracking all subscription changes with admin context
    Provides complete audit trail for subscription management
    """
    __tablename__ = "subscription_history"
    
    # Foreign Keys
    tenant_id = Column(
        UUID(as_uuid=True), 
        ForeignKey('tenants.id'),
        nullable=False,
        index=True,
        comment="Reference to tenant"
    )
    
    admin_id = Column(
        UUID(as_uuid=True), 
        ForeignKey('users.id'),
        nullable=True,
        index=True,
        comment="Super admin who made the change (null for system changes)"
    )
    
    # Subscription Change Details
    change_type = Column(
        Enum(SubscriptionChangeType), 
        nullable=False,
        comment="Type of subscription change"
    )
    
    old_subscription_type = Column(
        String(50), 
        nullable=True,
        comment="Previous subscription type"
    )
    
    new_subscription_type = Column(
        String(50), 
        nullable=True,
        comment="New subscription type"
    )
    
    old_expiration_date = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="Previous expiration date"
    )
    
    new_expiration_date = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="New expiration date"
    )
    
    # Duration and Pricing
    duration_months = Column(
        Integer, 
        nullable=True,
        comment="Duration in months for extensions"
    )
    
    old_max_users = Column(
        Integer, 
        nullable=True,
        comment="Previous user limit"
    )
    
    new_max_users = Column(
        Integer, 
        nullable=True,
        comment="New user limit"
    )
    
    old_max_products = Column(
        Integer, 
        nullable=True,
        comment="Previous product limit"
    )
    
    new_max_products = Column(
        Integer, 
        nullable=True,
        comment="New product limit"
    )
    
    # Change Context
    change_reason = Column(
        Text, 
        nullable=True,
        comment="Reason for subscription change"
    )
    
    admin_notes = Column(
        Text, 
        nullable=True,
        comment="Admin notes about the change"
    )
    
    # Metadata
    client_ip = Column(
        String(45), 
        nullable=True,
        comment="IP address of admin making change"
    )
    
    user_agent = Column(
        Text, 
        nullable=True,
        comment="User agent of admin making change"
    )
    
    # System Context
    is_system_change = Column(
        Boolean, 
        default=False,
        nullable=False,
        comment="Whether this was an automated system change"
    )
    
    effective_date = Column(
        DateTime(timezone=True),
        nullable=False,
        default=func.now(),
        comment="When the change became effective"
    )
    
    # Relationships
    tenant = relationship("Tenant", foreign_keys=[tenant_id])
    admin = relationship("User", foreign_keys=[admin_id])
    
    def __repr__(self):
        return f"<SubscriptionHistory(tenant_id={self.tenant_id}, change_type='{self.change_type.value}')>"
    
    @classmethod
    def log_subscription_change(
        cls, 
        db, 
        tenant_id: str,
        change_type: SubscriptionChangeType,
        admin_id: str = None,
        old_subscription_type: str = None,
        new_subscription_type: str = None,
        old_expiration_date: datetime = None,
        new_expiration_date: datetime = None,
        duration_months: int = None,
        old_max_users: int = None,
        new_max_users: int = None,
        old_max_products: int = None,
        new_max_products: int = None,
        reason: str = None,
        admin_notes: str = None,
        client_ip: str = None,
        user_agent: str = None,
        is_system_change: bool = False,
        effective_date: datetime = None
    ):
        """
        Log a subscription change event
        """
        history_entry = cls(
            tenant_id=tenant_id,
            admin_id=admin_id,
            change_type=change_type,
            old_subscription_type=old_subscription_type,
            new_subscription_type=new_subscription_type,
            old_expiration_date=old_expiration_date,
            new_expiration_date=new_expiration_date,
            duration_months=duration_months,
            old_max_users=old_max_users,
            new_max_users=new_max_users,
            old_max_products=old_max_products,
            new_max_products=new_max_products,
            change_reason=reason,
            admin_notes=admin_notes,
            client_ip=client_ip,
            user_agent=user_agent,
            is_system_change=is_system_change,
            effective_date=effective_date or datetime.now(timezone.utc)
        )
        
        db.add(history_entry)
        db.commit()
        db.refresh(history_entry)
        return history_entry
    
    @classmethod
    def get_tenant_subscription_history(cls, db, tenant_id: str, limit: int = 50):
        """
        Get subscription change history for a tenant
        """
        return db.query(cls).filter(
            cls.tenant_id == tenant_id
        ).order_by(cls.created_at.desc()).limit(limit).all()
    
    @classmethod
    def get_admin_subscription_changes(cls, db, admin_id: str, limit: int = 100):
        """
        Get all subscription changes made by a specific admin
        """
        return db.query(cls).filter(
            cls.admin_id == admin_id
        ).order_by(cls.created_at.desc()).limit(limit).all()
    
    @classmethod
    def get_recent_changes(cls, db, days: int = 30, limit: int = 100):
        """
        Get recent subscription changes across all tenants
        """
        from datetime import timedelta
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=days)
        
        return db.query(cls).filter(
            cls.created_at >= cutoff_date
        ).order_by(cls.created_at.desc()).limit(limit).all()
    
    @classmethod
    def get_subscription_stats(cls, db):
        """
        Get subscription change statistics
        """
        from sqlalchemy import func
        
        stats = db.query(
            cls.change_type,
            func.count(cls.id).label('count')
        ).group_by(cls.change_type).all()
        
        return {stat.change_type.value: stat.count for stat in stats}


# Create indexes for performance optimization
Index('idx_subscription_history_tenant', SubscriptionHistory.tenant_id, SubscriptionHistory.created_at)
Index('idx_subscription_history_admin', SubscriptionHistory.admin_id, SubscriptionHistory.created_at)
Index('idx_subscription_history_type', SubscriptionHistory.change_type)
Index('idx_subscription_history_effective', SubscriptionHistory.effective_date)
Index('idx_subscription_history_system', SubscriptionHistory.is_system_change)