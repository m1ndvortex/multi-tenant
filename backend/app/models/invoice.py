"""
Invoice models supporting both general and gold invoice types
"""

from sqlalchemy import Column, String, DateTime, Boolean, Enum, Text, Numeric, Integer, Index, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from decimal import Decimal
from datetime import datetime, timedelta
import uuid
from .base import BaseModel, TenantMixin


class InvoiceType(enum.Enum):
    """Invoice type enumeration"""
    GENERAL = "GENERAL"  # فاکتور عمومی
    GOLD = "GOLD"       # فاکتور طلا


class InvoiceStatus(enum.Enum):
    """Invoice status enumeration"""
    DRAFT = "DRAFT"
    SENT = "SENT"
    PAID = "PAID"
    PARTIALLY_PAID = "PARTIALLY_PAID"
    OVERDUE = "OVERDUE"
    CANCELLED = "CANCELLED"


class PaymentStatus(enum.Enum):
    """Payment status enumeration"""
    PENDING = "pending"
    PAID = "paid"
    OVERDUE = "overdue"


class Invoice(BaseModel, TenantMixin):
    """
    Invoice model supporting both general and gold invoice types
    """
    __tablename__ = "invoices"
    
    # Basic Information
    invoice_number = Column(
        String(50), 
        nullable=False,
        comment="Unique invoice number within tenant"
    )
    
    customer_id = Column(
        UUID(as_uuid=True), 
        ForeignKey("customers.id"),
        nullable=False,
        comment="Customer ID"
    )
    
    # Invoice Type and Configuration
    invoice_type = Column(
        Enum(InvoiceType), 
        nullable=False,
        comment="Type of invoice (general or gold)"
    )
    
    status = Column(
        Enum(InvoiceStatus), 
        default=InvoiceStatus.DRAFT,
        nullable=False,
        comment="Current invoice status"
    )
    
    # Financial Information
    subtotal = Column(
        Numeric(15, 2), 
        default=0,
        nullable=False,
        comment="Invoice subtotal before tax"
    )
    
    tax_amount = Column(
        Numeric(15, 2), 
        default=0,
        nullable=False,
        comment="Total tax amount"
    )
    
    discount_amount = Column(
        Numeric(15, 2), 
        default=0,
        nullable=False,
        comment="Total discount amount"
    )
    
    total_amount = Column(
        Numeric(15, 2), 
        nullable=False,
        comment="Final invoice total"
    )
    
    paid_amount = Column(
        Numeric(15, 2), 
        default=0,
        nullable=False,
        comment="Amount already paid"
    )
    
    # Gold-specific fields
    total_gold_weight = Column(
        Numeric(10, 3), 
        nullable=True,
        comment="Total gold weight for gold invoices (grams)"
    )
    
    gold_price_at_creation = Column(
        Numeric(15, 2), 
        nullable=True,
        comment="Gold price per gram at invoice creation"
    )
    
    # Installment Information
    is_installment = Column(
        Boolean, 
        default=False,
        nullable=False,
        comment="Whether this invoice has installment payments"
    )
    
    installment_type = Column(
        String(20), 
        nullable=True,
        comment="Type of installment (general or gold)"
    )
    
    remaining_balance = Column(
        Numeric(15, 2), 
        nullable=True,
        comment="Remaining balance for general installments"
    )
    
    remaining_gold_weight = Column(
        Numeric(10, 3), 
        nullable=True,
        comment="Remaining gold weight for gold installments (مانده به گرم)"
    )
    
    # Dates
    invoice_date = Column(
        DateTime(timezone=True),
        default=func.now(),
        nullable=False,
        comment="Invoice creation date"
    )
    
    due_date = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="Invoice due date"
    )
    
    # QR Code and Sharing
    qr_code_token = Column(
        String(255), 
        unique=True,
        nullable=True,
        comment="Unique token for QR code sharing"
    )
    
    is_shareable = Column(
        Boolean, 
        default=True,
        nullable=False,
        comment="Whether invoice can be shared publicly"
    )
    
    # Additional Information
    notes = Column(
        Text, 
        nullable=True,
        comment="Internal notes about invoice"
    )
    
    customer_notes = Column(
        Text, 
        nullable=True,
        comment="Notes visible to customer"
    )
    
    terms_and_conditions = Column(
        Text, 
        nullable=True,
        comment="Invoice terms and conditions"
    )
    
    # Relationships
    tenant = relationship("Tenant", back_populates="invoices")
    customer = relationship("Customer", back_populates="invoices")
    items = relationship("InvoiceItem", back_populates="invoice", cascade="all, delete-orphan")
    installments = relationship("Installment", back_populates="invoice", cascade="all, delete-orphan")
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if self.status is None:
            self.status = InvoiceStatus.DRAFT
    
    def __repr__(self):
        return f"<Invoice(id={self.id}, number='{self.invoice_number}', type='{self.invoice_type.value}')>"
    
    @property
    def balance_due(self) -> Decimal:
        """Calculate remaining balance due"""
        paid = self.paid_amount or Decimal('0')
        return self.total_amount - paid
    
    @property
    def is_paid(self) -> bool:
        """Check if invoice is fully paid"""
        paid = self.paid_amount or Decimal('0')
        return paid >= self.total_amount
    
    @property
    def is_overdue(self) -> bool:
        """Check if invoice is overdue"""
        if not self.due_date or self.is_paid:
            return False
        
        return datetime.utcnow() > self.due_date
    
    @property
    def days_overdue(self) -> int:
        """Get number of days overdue"""
        if not self.is_overdue:
            return 0
        
        delta = datetime.utcnow() - self.due_date
        return delta.days
    
    def generate_qr_token(self):
        """Generate unique QR code token"""
        self.qr_code_token = str(uuid.uuid4())
    
    def calculate_totals(self):
        """Calculate invoice totals based on items"""
        # line_total already includes tax, so we use it as the subtotal
        self.subtotal = sum(item.line_total for item in self.items)
        self.tax_amount = sum(item.tax_amount or 0 for item in self.items)
        
        # Calculate total gold weight for gold invoices
        if self.invoice_type == InvoiceType.GOLD:
            self.total_gold_weight = sum(item.weight or 0 for item in self.items)
        
        # Apply discount and calculate final total (line_total already includes tax)
        self.total_amount = self.subtotal - (self.discount_amount or Decimal('0'))
        
        # Initialize installment balances
        if self.is_installment:
            if self.invoice_type == InvoiceType.GENERAL:
                self.remaining_balance = self.total_amount
            elif self.invoice_type == InvoiceType.GOLD:
                self.remaining_gold_weight = self.total_gold_weight
    
    def add_payment(self, amount: Decimal, gold_weight: Decimal = None):
        """Add a payment to the invoice"""
        if self.invoice_type == InvoiceType.GENERAL:
            self.paid_amount = (self.paid_amount or Decimal('0')) + amount
            if self.is_installment and self.remaining_balance:
                self.remaining_balance -= amount
                self.remaining_balance = max(Decimal('0'), self.remaining_balance)
        
        elif self.invoice_type == InvoiceType.GOLD and gold_weight:
            # For gold invoices, track both amount and weight
            self.paid_amount = (self.paid_amount or Decimal('0')) + amount
            if self.is_installment and self.remaining_gold_weight:
                self.remaining_gold_weight -= gold_weight
                self.remaining_gold_weight = max(Decimal('0'), self.remaining_gold_weight)
        
        # Update status based on payment
        self.update_status()
    
    def update_status(self):
        """Update invoice status based on payment and due date"""
        if self.is_paid:
            self.status = InvoiceStatus.PAID
        elif self.paid_amount > 0:
            self.status = InvoiceStatus.PARTIALLY_PAID
        elif self.is_overdue:
            self.status = InvoiceStatus.OVERDUE
        elif self.status == InvoiceStatus.DRAFT:
            pass  # Keep draft status
        else:
            self.status = InvoiceStatus.SENT
    
    def cancel(self, reason: str = None):
        """Cancel the invoice"""
        self.status = InvoiceStatus.CANCELLED
        if reason:
            self.notes = f"{self.notes or ''}\nCancelled: {reason} ({datetime.utcnow()})"
    
    def send_to_customer(self):
        """Mark invoice as sent to customer"""
        if self.status == InvoiceStatus.DRAFT:
            self.status = InvoiceStatus.SENT


class InvoiceItem(BaseModel):
    """
    Invoice line items supporting both general and gold-specific fields
    """
    __tablename__ = "invoice_items"
    
    invoice_id = Column(
        UUID(as_uuid=True), 
        ForeignKey("invoices.id"),
        nullable=False,
        comment="Invoice ID"
    )
    
    product_id = Column(
        UUID(as_uuid=True), 
        ForeignKey("products.id"),
        nullable=True,
        comment="Product ID (optional for custom items)"
    )
    
    # Basic Item Information
    description = Column(
        String(500), 
        nullable=False,
        comment="Item description"
    )
    
    quantity = Column(
        Numeric(10, 3), 
        nullable=False,
        comment="Item quantity"
    )
    
    unit_price = Column(
        Numeric(15, 2), 
        nullable=False,
        comment="Price per unit"
    )
    
    line_total = Column(
        Numeric(15, 2), 
        nullable=False,
        comment="Total for this line item"
    )
    
    # Tax and Discount
    tax_rate = Column(
        Numeric(5, 2), 
        default=0,
        nullable=False,
        comment="Tax rate percentage"
    )
    
    tax_amount = Column(
        Numeric(15, 2), 
        default=0,
        nullable=False,
        comment="Tax amount for this item"
    )
    
    discount_rate = Column(
        Numeric(5, 2), 
        default=0,
        nullable=False,
        comment="Discount rate percentage"
    )
    
    discount_amount = Column(
        Numeric(15, 2), 
        default=0,
        nullable=False,
        comment="Discount amount for this item"
    )
    
    # Gold-specific fields
    weight = Column(
        Numeric(10, 3), 
        nullable=True,
        comment="Gold weight in grams (وزن)"
    )
    
    labor_fee = Column(
        Numeric(15, 2), 
        nullable=True,
        comment="Labor fee (اجرت)"
    )
    
    profit = Column(
        Numeric(15, 2), 
        nullable=True,
        comment="Profit amount (سود)"
    )
    
    vat_amount = Column(
        Numeric(15, 2), 
        nullable=True,
        comment="VAT amount (مالیات)"
    )
    
    gold_purity = Column(
        Numeric(5, 3), 
        nullable=True,
        comment="Gold purity (e.g., 18.000 for 18k)"
    )
    
    # Additional Information
    notes = Column(
        Text, 
        nullable=True,
        comment="Notes about this item"
    )
    
    # Relationships
    invoice = relationship("Invoice", back_populates="items")
    product = relationship("Product", back_populates="invoice_items")
    
    def __repr__(self):
        return f"<InvoiceItem(id={self.id}, description='{self.description}', quantity={self.quantity})>"
    
    def calculate_totals(self):
        """Calculate line totals including tax and discount"""
        # Base amount
        base_amount = self.quantity * self.unit_price
        
        # Apply discount
        discount_rate = self.discount_rate or Decimal('0')
        if discount_rate > 0:
            self.discount_amount = base_amount * (discount_rate / 100)
        
        # Calculate subtotal after discount
        discount_amount = self.discount_amount or Decimal('0')
        subtotal = base_amount - discount_amount
        
        # Calculate tax
        tax_rate = self.tax_rate or Decimal('0')
        if tax_rate > 0:
            self.tax_amount = subtotal * (tax_rate / 100)
        
        # For gold items, add labor fee, profit, and VAT
        if self.labor_fee:
            subtotal += self.labor_fee
        
        if self.profit:
            subtotal += self.profit
        
        if self.vat_amount:
            subtotal += self.vat_amount
        
        # Final line total
        tax_amount = self.tax_amount or Decimal('0')
        self.line_total = subtotal + tax_amount
    
    @property
    def is_gold_item(self) -> bool:
        """Check if this is a gold item"""
        return self.weight is not None or self.labor_fee is not None


# Create indexes for performance optimization
Index('idx_invoice_tenant_number', Invoice.tenant_id, Invoice.invoice_number, unique=True)
Index('idx_invoice_tenant_customer', Invoice.tenant_id, Invoice.customer_id)
Index('idx_invoice_tenant_status', Invoice.tenant_id, Invoice.status)
Index('idx_invoice_tenant_type', Invoice.tenant_id, Invoice.invoice_type)
Index('idx_invoice_tenant_date', Invoice.tenant_id, Invoice.invoice_date)
Index('idx_invoice_due_date', Invoice.due_date)
Index('idx_invoice_qr_token', Invoice.qr_code_token)
Index('idx_invoice_is_installment', Invoice.is_installment)

Index('idx_invoice_item_invoice', InvoiceItem.invoice_id)
Index('idx_invoice_item_product', InvoiceItem.product_id)