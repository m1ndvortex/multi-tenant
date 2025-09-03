"""
Customer model with multi-tenant support
"""

from sqlalchemy import Column, String, DateTime, Boolean, Enum, Text, Numeric, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from decimal import Decimal
from datetime import datetime
from .base import BaseModel, TenantMixin


class CustomerStatus(enum.Enum):
    """Customer status enumeration"""
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    BLOCKED = "BLOCKED"


class CustomerType(enum.Enum):
    """Customer type enumeration"""
    INDIVIDUAL = "INDIVIDUAL"
    BUSINESS = "BUSINESS"
    VIP = "VIP"


class Customer(BaseModel, TenantMixin):
    """
    Customer model with multi-tenant support
    Represents customers within tenant businesses
    """
    __tablename__ = "customers"
    
    # Basic Information
    name = Column(
        String(255), 
        nullable=False,
        comment="Customer full name or business name"
    )
    
    email = Column(
        String(255), 
        nullable=True,
        comment="Customer email address"
    )
    
    phone = Column(
        String(50), 
        nullable=True,
        comment="Customer phone number"
    )
    
    mobile = Column(
        String(50), 
        nullable=True,
        comment="Customer mobile number"
    )
    
    # Address Information
    address = Column(
        Text, 
        nullable=True,
        comment="Customer address"
    )
    
    city = Column(
        String(100), 
        nullable=True,
        comment="Customer city"
    )
    
    state = Column(
        String(100), 
        nullable=True,
        comment="Customer state/province"
    )
    
    postal_code = Column(
        String(20), 
        nullable=True,
        comment="Customer postal code"
    )
    
    country = Column(
        String(100), 
        default="Iran",
        nullable=False,
        comment="Customer country"
    )
    
    # Business Information
    customer_type = Column(
        Enum(CustomerType), 
        default=CustomerType.INDIVIDUAL,
        nullable=False,
        comment="Type of customer"
    )
    
    status = Column(
        Enum(CustomerStatus), 
        default=CustomerStatus.ACTIVE,
        nullable=False,
        comment="Customer status"
    )
    
    # Financial Information
    credit_limit = Column(
        Numeric(15, 2), 
        default=0,
        nullable=False,
        comment="Customer credit limit"
    )
    
    total_debt = Column(
        Numeric(15, 2), 
        default=0,
        nullable=False,
        comment="Total outstanding debt in currency"
    )
    
    total_gold_debt = Column(
        Numeric(10, 3), 
        default=0,
        nullable=False,
        comment="Total outstanding debt in gold grams"
    )
    
    total_purchases = Column(
        Numeric(15, 2), 
        default=0,
        nullable=False,
        comment="Total lifetime purchases"
    )
    
    # Customer Relationship Management
    tags = Column(
        JSONB, 
        default=list,
        nullable=True,
        comment="Customer tags for segmentation"
    )
    
    notes = Column(
        Text, 
        nullable=True,
        comment="Internal notes about customer"
    )
    
    # Communication Preferences
    preferred_contact_method = Column(
        String(20), 
        default="phone",
        nullable=False,
        comment="Preferred contact method (phone, email, sms)"
    )
    
    email_notifications = Column(
        Boolean, 
        default=True,
        nullable=False,
        comment="Allow email notifications"
    )
    
    sms_notifications = Column(
        Boolean, 
        default=True,
        nullable=False,
        comment="Allow SMS notifications"
    )
    
    # Business Details (for business customers)
    business_name = Column(
        String(255), 
        nullable=True,
        comment="Business name (if business customer)"
    )
    
    tax_id = Column(
        String(50), 
        nullable=True,
        comment="Tax identification number"
    )
    
    business_type = Column(
        String(100), 
        nullable=True,
        comment="Type of business"
    )
    
    # Tracking
    last_purchase_at = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="Last purchase date"
    )
    
    last_contact_at = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="Last contact date"
    )
    
    # Relationships
    tenant = relationship("Tenant", back_populates="customers")
    invoices = relationship("Invoice", back_populates="customer", cascade="all, delete-orphan")
    interactions = relationship("CustomerInteraction", back_populates="customer", cascade="all, delete-orphan", order_by="desc(CustomerInteraction.created_at)")
    
    def __repr__(self):
        return f"<Customer(id={self.id}, name='{self.name}', tenant_id={self.tenant_id})>"
    
    @property
    def display_name(self) -> str:
        """Get display name for customer"""
        if self.customer_type == CustomerType.BUSINESS and self.business_name:
            return f"{self.business_name} ({self.name})"
        return self.name
    
    @property
    def primary_contact(self) -> str:
        """Get primary contact information"""
        if self.preferred_contact_method == "email" and self.email:
            return self.email
        elif self.mobile:
            return self.mobile
        elif self.phone:
            return self.phone
        return "No contact info"
    
    @property
    def full_address(self) -> str:
        """Get formatted full address"""
        parts = [self.address, self.city, self.state, self.postal_code, self.country]
        return ", ".join([part for part in parts if part])
    
    @property
    def is_vip(self) -> bool:
        """Check if customer is VIP"""
        return self.customer_type == CustomerType.VIP
    
    @property
    def has_outstanding_debt(self) -> bool:
        """Check if customer has outstanding debt"""
        return self.total_debt > 0 or self.total_gold_debt > 0
    
    def add_tag(self, tag: str):
        """Add a tag to customer"""
        if not self.tags:
            self.tags = []
        
        if tag not in self.tags:
            self.tags.append(tag)
    
    def remove_tag(self, tag: str):
        """Remove a tag from customer"""
        if self.tags and tag in self.tags:
            self.tags.remove(tag)
    
    def has_tag(self, tag: str) -> bool:
        """Check if customer has a specific tag"""
        return self.tags and tag in self.tags
    
    def update_debt(self, currency_amount: Decimal = None, gold_amount: Decimal = None):
        """Update customer debt amounts"""
        if currency_amount is not None:
            self.total_debt += currency_amount
        
        if gold_amount is not None:
            self.total_gold_debt += gold_amount
        
        # Ensure debts don't go negative
        self.total_debt = max(Decimal('0'), self.total_debt)
        self.total_gold_debt = max(Decimal('0'), self.total_gold_debt)
    
    def add_purchase(self, amount: Decimal):
        """Add to total purchases"""
        self.total_purchases += amount
        self.last_purchase_at = datetime.utcnow()
    
    def update_contact(self):
        """Update last contact timestamp"""
        self.last_contact_at = datetime.utcnow()
    
    def block(self, reason: str = None):
        """Block customer"""
        self.status = CustomerStatus.BLOCKED
        if reason:
            self.notes = f"{self.notes or ''}\nBlocked: {reason} ({datetime.utcnow()})"
    
    def activate(self):
        """Activate customer"""
        self.status = CustomerStatus.ACTIVE
    
    def deactivate(self):
        """Deactivate customer"""
        self.status = CustomerStatus.INACTIVE
    
    def get_payment_history(self, db):
        """Get customer payment history"""
        from .invoice import Invoice
        from .installment import Installment
        
        # Get all invoices for this customer
        invoices = db.query(Invoice).filter(
            Invoice.customer_id == self.id,
            Invoice.tenant_id == self.tenant_id
        ).all()
        
        return invoices
    
    def calculate_lifetime_value(self, db) -> Decimal:
        """Calculate customer lifetime value"""
        from .invoice import Invoice
        from sqlalchemy import func
        
        result = db.query(func.sum(Invoice.total_amount)).filter(
            Invoice.customer_id == self.id,
            Invoice.tenant_id == self.tenant_id,
            Invoice.status == "paid"
        ).scalar()
        
        return result or Decimal('0')


# Create indexes for performance optimization
Index('idx_customer_tenant_name', Customer.tenant_id, Customer.name)
Index('idx_customer_tenant_email', Customer.tenant_id, Customer.email)
Index('idx_customer_tenant_phone', Customer.tenant_id, Customer.phone)
Index('idx_customer_tenant_status', Customer.tenant_id, Customer.status)
Index('idx_customer_tenant_type', Customer.tenant_id, Customer.customer_type)
Index('idx_customer_total_debt', Customer.total_debt)
Index('idx_customer_total_gold_debt', Customer.total_gold_debt)
Index('idx_customer_last_purchase', Customer.last_purchase_at)
# Index('idx_customer_tags', Customer.tags, postgresql_using='gin')