"""
Tenant model for multi-tenant architecture
"""

from sqlalchemy import Column, String, DateTime, Boolean, Enum, Text, Integer, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from datetime import datetime, timedelta, timezone
from .base import BaseModel


class SubscriptionType(enum.Enum):
    """Subscription tier enumeration"""
    FREE = "free"
    PRO = "pro"
    ENTERPRISE = "enterprise"


class TenantStatus(enum.Enum):
    """Tenant status enumeration"""
    PENDING = "pending"
    ACTIVE = "active"
    SUSPENDED = "suspended"
    CANCELLED = "cancelled"


class Tenant(BaseModel):
    """
    Tenant model representing individual business accounts
    Core entity for multi-tenant architecture
    """
    __tablename__ = "tenants"
    
    # Basic Information
    name = Column(
        String(255), 
        nullable=False,
        comment="Business/Company name"
    )
    
    domain = Column(
        String(255), 
        unique=True, 
        nullable=True,
        comment="Custom domain for tenant (optional)"
    )
    
    email = Column(
        String(255), 
        nullable=False,
        comment="Primary contact email"
    )
    
    phone = Column(
        String(50), 
        nullable=True,
        comment="Primary contact phone"
    )
    
    address = Column(
        Text, 
        nullable=True,
        comment="Business address"
    )
    
    # Subscription Management
    subscription_type = Column(
        Enum(SubscriptionType), 
        default=SubscriptionType.FREE,
        nullable=False,
        comment="Current subscription tier"
    )
    
    subscription_starts_at = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="Subscription start date"
    )
    
    subscription_expires_at = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="Subscription expiration date"
    )
    
    # Status and Limits
    status = Column(
        Enum(TenantStatus), 
        default=TenantStatus.PENDING,
        nullable=False,
        comment="Current tenant status"
    )
    
    max_users = Column(
        Integer, 
        default=1,
        nullable=False,
        comment="Maximum allowed users"
    )
    
    max_products = Column(
        Integer, 
        default=10,
        nullable=False,
        comment="Maximum allowed products"
    )
    
    max_customers = Column(
        Integer, 
        default=10,
        nullable=False,
        comment="Maximum allowed customers"
    )
    
    max_monthly_invoices = Column(
        Integer, 
        default=10,
        nullable=False,
        comment="Maximum monthly invoices"
    )
    
    # Business Settings
    business_type = Column(
        String(100), 
        nullable=True,
        comment="Type of business (general, gold, etc.)"
    )
    
    currency = Column(
        String(10), 
        default="IRR",
        nullable=False,
        comment="Primary currency code"
    )
    
    timezone = Column(
        String(50), 
        default="Asia/Tehran",
        nullable=False,
        comment="Business timezone"
    )
    
    # Metadata
    settings = Column(
        Text, 
        nullable=True,
        comment="JSON settings for tenant customization"
    )
    
    notes = Column(
        Text, 
        nullable=True,
        comment="Admin notes about tenant"
    )
    
    # Tracking
    last_activity_at = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="Last user activity timestamp"
    )
    
    # Relationships
    users = relationship("User", back_populates="tenant", cascade="all, delete-orphan")
    customers = relationship("Customer", back_populates="tenant", cascade="all, delete-orphan")
    products = relationship("Product", back_populates="tenant", cascade="all, delete-orphan")
    invoices = relationship("Invoice", back_populates="tenant", cascade="all, delete-orphan")
    invoice_templates = relationship("InvoiceTemplate", back_populates="tenant", cascade="all, delete-orphan")
    invoice_branding_configs = relationship("InvoiceBranding", back_populates="tenant", cascade="all, delete-orphan")
    api_keys = relationship("ApiKey", back_populates="tenant", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Tenant(id={self.id}, name='{self.name}', subscription='{self.subscription_type.value}')>"
    
    @property
    def is_subscription_active(self) -> bool:
        """Check if subscription is currently active"""
        if self.subscription_type == SubscriptionType.FREE:
            return True
        
        if self.subscription_expires_at:
            return datetime.now(timezone.utc) < self.subscription_expires_at
        
        return False
    
    @property
    def days_until_expiry(self) -> int:
        """Get days until subscription expires"""
        if not self.subscription_expires_at:
            return -1
        
        delta = self.subscription_expires_at - datetime.now(timezone.utc)
        return max(0, delta.days + (1 if delta.seconds > 0 else 0))
    
    def upgrade_to_pro(self, duration_months: int = 12):
        """Upgrade tenant to Pro subscription"""
        self.subscription_type = SubscriptionType.PRO
        self.subscription_starts_at = datetime.now(timezone.utc)
        self.subscription_expires_at = datetime.now(timezone.utc) + timedelta(days=duration_months * 30)
        
        # Update limits for Pro tier
        self.max_users = 5
        self.max_products = -1  # Unlimited
        self.max_customers = -1  # Unlimited
        self.max_monthly_invoices = -1  # Unlimited
    
    def downgrade_to_free(self):
        """Downgrade tenant to Free subscription"""
        self.subscription_type = SubscriptionType.FREE
        self.subscription_expires_at = None
        
        # Reset limits for Free tier
        self.max_users = 1
        self.max_products = 10
        self.max_customers = 10
        self.max_monthly_invoices = 10
    
    def suspend(self, reason: str = None):
        """Suspend tenant account"""
        self.status = TenantStatus.SUSPENDED
        if reason:
            self.notes = f"{self.notes or ''}\nSuspended: {reason} ({datetime.now(timezone.utc)})"
    
    def activate(self):
        """Activate tenant account"""
        self.status = TenantStatus.ACTIVE
    
    def update_activity(self):
        """Update last activity timestamp"""
        self.last_activity_at = datetime.now(timezone.utc)
    
    def check_limits(self, resource_type: str, current_count: int) -> bool:
        """Check if tenant is within resource limits"""
        limits = {
            'users': self.max_users,
            'products': self.max_products,
            'customers': self.max_customers,
            'monthly_invoices': self.max_monthly_invoices
        }
        
        limit = limits.get(resource_type)
        if limit == -1:  # Unlimited
            return True
        
        return current_count < limit
    
    def get_usage_stats(self, db):
        """Get current usage statistics"""
        from .user import User
        from .customer import Customer
        from .product import Product
        from .invoice import Invoice
        from sqlalchemy import func, extract
        
        current_month = datetime.now(timezone.utc).month
        current_year = datetime.now(timezone.utc).year
        
        stats = {
            'users': db.query(User).filter(User.tenant_id == self.id, User.is_active == True).count(),
            'customers': db.query(Customer).filter(Customer.tenant_id == self.id, Customer.is_active == True).count(),
            'products': db.query(Product).filter(Product.tenant_id == self.id, Product.is_active == True).count(),
            'monthly_invoices': db.query(Invoice).filter(
                Invoice.tenant_id == self.id,
                extract('month', Invoice.created_at) == current_month,
                extract('year', Invoice.created_at) == current_year
            ).count()
        }
        
        return stats


# Create indexes for performance optimization
Index('idx_tenant_subscription_type', Tenant.subscription_type)
Index('idx_tenant_status', Tenant.status)
Index('idx_tenant_subscription_expires', Tenant.subscription_expires_at)
Index('idx_tenant_domain', Tenant.domain)
Index('idx_tenant_email', Tenant.email)
Index('idx_tenant_last_activity', Tenant.last_activity_at)