"""
Supplier/Vendor models for accounts payable management
"""

from sqlalchemy import Column, String, DateTime, Boolean, Text, Numeric, Integer, Index, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from decimal import Decimal
from .base import BaseModel, TenantMixin


class Supplier(BaseModel, TenantMixin):
    """
    Supplier/Vendor model for accounts payable
    """
    __tablename__ = "suppliers"
    
    # Basic Information
    name = Column(
        String(255), 
        nullable=False,
        comment="Supplier name"
    )
    
    company_name = Column(
        String(255), 
        nullable=True,
        comment="Company name"
    )
    
    # Contact Information
    email = Column(
        String(255), 
        nullable=True,
        comment="Email address"
    )
    
    phone = Column(
        String(50), 
        nullable=True,
        comment="Phone number"
    )
    
    mobile = Column(
        String(50), 
        nullable=True,
        comment="Mobile number"
    )
    
    # Address Information
    address = Column(
        Text, 
        nullable=True,
        comment="Full address"
    )
    
    city = Column(
        String(100), 
        nullable=True,
        comment="City"
    )
    
    postal_code = Column(
        String(20), 
        nullable=True,
        comment="Postal code"
    )
    
    country = Column(
        String(100), 
        nullable=True,
        comment="Country"
    )
    
    # Business Information
    tax_id = Column(
        String(50), 
        nullable=True,
        comment="Tax identification number"
    )
    
    registration_number = Column(
        String(50), 
        nullable=True,
        comment="Business registration number"
    )
    
    # Financial Information
    total_payable = Column(
        Numeric(15, 2), 
        default=0,
        nullable=False,
        comment="Total amount payable to supplier"
    )
    
    credit_limit = Column(
        Numeric(15, 2), 
        nullable=True,
        comment="Credit limit from supplier"
    )
    
    # Payment Terms
    payment_terms_days = Column(
        Integer, 
        default=30,
        nullable=False,
        comment="Payment terms in days"
    )
    
    # Status and Notes
    is_active = Column(
        Boolean, 
        default=True,
        nullable=False,
        comment="Whether supplier is active"
    )
    
    notes = Column(
        Text, 
        nullable=True,
        comment="Internal notes about supplier"
    )
    
    # Relationships
    tenant = relationship("Tenant")
    bills = relationship("SupplierBill", back_populates="supplier")
    payments = relationship("SupplierPayment", back_populates="supplier")
    
    def __repr__(self):
        return f"<Supplier(id={self.id}, name='{self.name}')>"
    
    def update_payable_balance(self):
        """Update total payable balance"""
        from sqlalchemy import func
        from app.models.accounting import SupplierBill, SupplierPayment
        
        # Calculate total bills
        total_bills = self.db.query(func.coalesce(func.sum(SupplierBill.total_amount), 0)).filter(
            SupplierBill.supplier_id == self.id,
            SupplierBill.is_active == True
        ).scalar()
        
        # Calculate total payments
        total_payments = self.db.query(func.coalesce(func.sum(SupplierPayment.amount), 0)).filter(
            SupplierPayment.supplier_id == self.id,
            SupplierPayment.is_active == True
        ).scalar()
        
        self.total_payable = total_bills - total_payments


# Create indexes for performance
Index('idx_supplier_tenant_name', Supplier.tenant_id, Supplier.name)
Index('idx_supplier_tenant_active', Supplier.tenant_id, Supplier.is_active)
Index('idx_supplier_email', Supplier.email)
Index('idx_supplier_tax_id', Supplier.tax_id)