"""
Invoice schemas for dual invoice system (General and Gold)
"""

from pydantic import BaseModel, Field, field_validator, model_validator
from typing import Optional, List, Dict, Any
from decimal import Decimal
from datetime import datetime
from enum import Enum
import uuid


class InvoiceTypeEnum(str, Enum):
    """Invoice type enumeration"""
    GENERAL = "GENERAL"
    GOLD = "GOLD"


class InvoiceStatusEnum(str, Enum):
    """Invoice status enumeration"""
    DRAFT = "DRAFT"
    SENT = "SENT"
    PAID = "PAID"
    PARTIALLY_PAID = "PARTIALLY_PAID"
    OVERDUE = "OVERDUE"
    CANCELLED = "CANCELLED"


class InstallmentTypeEnum(str, Enum):
    """Installment type enumeration"""
    NONE = "NONE"
    GENERAL = "GENERAL"
    GOLD = "GOLD"


# Invoice Item Schemas
class InvoiceItemBase(BaseModel):
    """Base schema for invoice items"""
    product_id: Optional[uuid.UUID] = Field(None, description="Product ID (optional for custom items)")
    description: str = Field(..., min_length=1, max_length=500, description="Item description")
    quantity: Decimal = Field(..., gt=0, description="Item quantity")
    unit_price: Decimal = Field(..., ge=0, description="Price per unit")
    
    # Tax and discount
    tax_rate: Optional[Decimal] = Field(0, ge=0, le=100, description="Tax rate percentage")
    discount_rate: Optional[Decimal] = Field(0, ge=0, le=100, description="Discount rate percentage")
    discount_amount: Optional[Decimal] = Field(0, ge=0, description="Discount amount")
    
    # Gold-specific fields (optional)
    weight: Optional[Decimal] = Field(None, ge=0, description="Gold weight in grams (وزن)")
    labor_fee: Optional[Decimal] = Field(None, ge=0, description="Labor fee (اجرت)")
    profit: Optional[Decimal] = Field(None, ge=0, description="Profit amount (سود)")
    vat_amount: Optional[Decimal] = Field(None, ge=0, description="VAT amount (مالیات)")
    gold_purity: Optional[Decimal] = Field(None, ge=0, le=24, description="Gold purity (e.g., 18.000 for 18k)")
    
    # Additional information
    notes: Optional[str] = Field(None, max_length=1000, description="Notes about this item")

    @field_validator('weight', 'labor_fee', 'profit', 'vat_amount')
    @classmethod
    def validate_gold_fields(cls, v):
        """Validate gold-specific fields"""
        if v is not None and v < 0:
            raise ValueError("Gold fields must be non-negative")
        return v

    class Config:
        from_attributes = True


class InvoiceItemCreate(InvoiceItemBase):
    """Schema for creating invoice items"""
    pass


class InvoiceItemUpdate(BaseModel):
    """Schema for updating invoice items"""
    product_id: Optional[uuid.UUID] = None
    description: Optional[str] = Field(None, min_length=1, max_length=500)
    quantity: Optional[Decimal] = Field(None, gt=0)
    unit_price: Optional[Decimal] = Field(None, ge=0)
    tax_rate: Optional[Decimal] = Field(None, ge=0, le=100)
    discount_rate: Optional[Decimal] = Field(None, ge=0, le=100)
    discount_amount: Optional[Decimal] = Field(None, ge=0)
    weight: Optional[Decimal] = Field(None, ge=0)
    labor_fee: Optional[Decimal] = Field(None, ge=0)
    profit: Optional[Decimal] = Field(None, ge=0)
    vat_amount: Optional[Decimal] = Field(None, ge=0)
    gold_purity: Optional[Decimal] = Field(None, ge=0, le=24)
    notes: Optional[str] = Field(None, max_length=1000)

    class Config:
        from_attributes = True


class InvoiceItemResponse(InvoiceItemBase):
    """Schema for invoice item responses"""
    id: uuid.UUID
    invoice_id: uuid.UUID
    line_total: Decimal = Field(..., description="Total for this line item")
    tax_amount: Decimal = Field(0, description="Tax amount for this item")
    created_at: datetime
    updated_at: datetime
    is_active: bool

    @property
    def is_gold_item(self) -> bool:
        """Check if this is a gold item"""
        return self.weight is not None or self.labor_fee is not None

    class Config:
        from_attributes = True


# Invoice Schemas
class InvoiceBase(BaseModel):
    """Base schema for invoices"""
    customer_id: uuid.UUID = Field(..., description="Customer ID")
    invoice_type: InvoiceTypeEnum = Field(..., description="Type of invoice (general or gold)")
    
    # Financial information
    discount_amount: Optional[Decimal] = Field(0, ge=0, description="Total discount amount")
    
    # Gold-specific fields
    gold_price_at_creation: Optional[Decimal] = Field(None, ge=0, description="Gold price per gram at invoice creation")
    
    # Installment information
    is_installment: bool = Field(False, description="Whether this invoice has installment payments")
    installment_type: Optional[InstallmentTypeEnum] = Field(InstallmentTypeEnum.NONE, description="Type of installment")
    
    # Dates
    due_date: Optional[datetime] = Field(None, description="Invoice due date")
    
    # QR Code and sharing
    is_shareable: bool = Field(True, description="Whether invoice can be shared publicly")
    
    # Additional information
    notes: Optional[str] = Field(None, max_length=2000, description="Internal notes about invoice")
    customer_notes: Optional[str] = Field(None, max_length=2000, description="Notes visible to customer")
    terms_and_conditions: Optional[str] = Field(None, max_length=5000, description="Invoice terms and conditions")

    @model_validator(mode='before')
    @classmethod
    def validate_gold_invoice_fields(cls, values):
        """Validate gold invoice specific fields"""
        if isinstance(values, dict):
            invoice_type = values.get('invoice_type')
            gold_price = values.get('gold_price_at_creation')
            installment_type = values.get('installment_type')
            is_installment = values.get('is_installment')
            
            # Gold invoices should have gold price
            if invoice_type == InvoiceTypeEnum.GOLD and gold_price is None:
                raise ValueError("Gold invoices must have gold_price_at_creation")
            
            # Validate installment type consistency
            if is_installment and installment_type == InstallmentTypeEnum.NONE:
                raise ValueError("Installment invoices must specify installment_type")
            
            if installment_type == InstallmentTypeEnum.GOLD and invoice_type != InvoiceTypeEnum.GOLD:
                raise ValueError("Gold installments can only be used with gold invoices")
        
        return values

    class Config:
        from_attributes = True


class InvoiceCreate(InvoiceBase):
    """Schema for creating invoices"""
    items: List[InvoiceItemCreate] = Field(..., min_items=1, description="Invoice items")

    @field_validator('items')
    @classmethod
    def validate_items_for_invoice_type(cls, v, info):
        """Validate items match invoice type"""
        if info.data:
            invoice_type = info.data.get('invoice_type')
            
            if invoice_type == InvoiceTypeEnum.GOLD:
                # Gold invoices should have at least one item with gold-specific fields
                has_gold_item = any(
                    item.weight is not None or item.labor_fee is not None 
                    for item in v
                )
                if not has_gold_item:
                    raise ValueError("Gold invoices must have at least one item with gold-specific fields (weight or labor_fee)")
        
        return v


class InvoiceUpdate(BaseModel):
    """Schema for updating invoices"""
    customer_id: Optional[uuid.UUID] = None
    discount_amount: Optional[Decimal] = Field(None, ge=0)
    gold_price_at_creation: Optional[Decimal] = Field(None, ge=0)
    is_installment: Optional[bool] = None
    installment_type: Optional[InstallmentTypeEnum] = None
    due_date: Optional[datetime] = None
    is_shareable: Optional[bool] = None
    notes: Optional[str] = Field(None, max_length=2000)
    customer_notes: Optional[str] = Field(None, max_length=2000)
    terms_and_conditions: Optional[str] = Field(None, max_length=5000)

    class Config:
        from_attributes = True


class InvoiceResponse(InvoiceBase):
    """Schema for invoice responses"""
    id: uuid.UUID
    tenant_id: uuid.UUID
    invoice_number: str
    status: InvoiceStatusEnum
    
    # Financial information
    subtotal: Decimal = Field(..., description="Invoice subtotal before tax")
    tax_amount: Decimal = Field(..., description="Total tax amount")
    total_amount: Decimal = Field(..., description="Final invoice total")
    paid_amount: Decimal = Field(0, description="Amount already paid")
    
    # Gold-specific fields
    total_gold_weight: Optional[Decimal] = Field(None, description="Total gold weight for gold invoices (grams)")
    
    # Installment information
    remaining_balance: Optional[Decimal] = Field(None, description="Remaining balance for general installments")
    remaining_gold_weight: Optional[Decimal] = Field(None, description="Remaining gold weight for gold installments")
    
    # Dates
    invoice_date: datetime
    
    # QR Code
    qr_code_token: Optional[str] = Field(None, description="Unique token for QR code sharing")
    
    # Timestamps
    created_at: datetime
    updated_at: datetime
    is_active: bool
    
    # Relationships
    items: List[InvoiceItemResponse] = Field(default_factory=list, description="Invoice items")
    
    # Computed properties
    @property
    def balance_due(self) -> Decimal:
        """Calculate remaining balance due"""
        return self.total_amount - self.paid_amount
    
    @property
    def is_paid(self) -> bool:
        """Check if invoice is fully paid"""
        return self.paid_amount >= self.total_amount
    
    @property
    def is_overdue(self) -> bool:
        """Check if invoice is overdue"""
        if not self.due_date or self.is_paid:
            return False
        return datetime.utcnow() > self.due_date

    class Config:
        from_attributes = True


class InvoiceListResponse(BaseModel):
    """Schema for invoice list responses"""
    id: uuid.UUID
    invoice_number: str
    customer_id: uuid.UUID
    invoice_type: InvoiceTypeEnum
    status: InvoiceStatusEnum
    total_amount: Decimal
    paid_amount: Decimal
    balance_due: Decimal
    invoice_date: datetime
    due_date: Optional[datetime]
    is_installment: bool
    is_overdue: bool
    created_at: datetime

    class Config:
        from_attributes = True


# Payment Schemas
class PaymentCreate(BaseModel):
    """Schema for creating payments"""
    amount: Decimal = Field(..., gt=0, description="Payment amount")
    gold_weight: Optional[Decimal] = Field(None, gt=0, description="Gold weight for gold payments (grams)")
    gold_price: Optional[Decimal] = Field(None, gt=0, description="Gold price at payment time")
    payment_method: Optional[str] = Field(None, max_length=50, description="Payment method")
    reference: Optional[str] = Field(None, max_length=255, description="Payment reference number")
    notes: Optional[str] = Field(None, max_length=1000, description="Payment notes")

    @model_validator(mode='before')
    @classmethod
    def validate_gold_payment(cls, values):
        """Validate gold payment fields"""
        if isinstance(values, dict):
            gold_weight = values.get('gold_weight')
            gold_price = values.get('gold_price')
            
            if gold_weight is not None and gold_price is None:
                raise ValueError("Gold payments must include gold_price")
            
            if gold_price is not None and gold_weight is None:
                raise ValueError("Gold payments must include gold_weight")
        
        return values

    class Config:
        from_attributes = True


# Filter and Search Schemas
class InvoiceFilter(BaseModel):
    """Schema for filtering invoices"""
    customer_id: Optional[uuid.UUID] = None
    invoice_type: Optional[InvoiceTypeEnum] = None
    status: Optional[InvoiceStatusEnum] = None
    is_installment: Optional[bool] = None
    is_overdue: Optional[bool] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    min_amount: Optional[Decimal] = Field(None, ge=0)
    max_amount: Optional[Decimal] = Field(None, ge=0)
    search: Optional[str] = Field(None, max_length=255, description="Search in invoice number, customer name, or notes")

    @field_validator('max_amount')
    @classmethod
    def validate_amount_range(cls, v, info):
        """Validate amount range"""
        if info.data:
            min_amount = info.data.get('min_amount')
            if min_amount is not None and v is not None and v < min_amount:
                raise ValueError("max_amount must be greater than or equal to min_amount")
        return v

    class Config:
        from_attributes = True


class InvoicePaginatedResponse(BaseModel):
    """Schema for paginated invoice responses"""
    items: List[InvoiceListResponse]
    total: int
    page: int
    per_page: int
    pages: int
    has_next: bool
    has_prev: bool

    class Config:
        from_attributes = True


# Statistics and Summary Schemas
class InvoiceStatistics(BaseModel):
    """Schema for invoice statistics"""
    total_invoices: int
    draft_invoices: int
    sent_invoices: int
    paid_invoices: int
    overdue_invoices: int
    total_amount: Decimal
    paid_amount: Decimal
    outstanding_amount: Decimal
    
    # Type-specific statistics
    general_invoices: int
    gold_invoices: int
    installment_invoices: int
    
    # Gold-specific statistics
    total_gold_weight: Optional[Decimal] = None
    outstanding_gold_weight: Optional[Decimal] = None

    class Config:
        from_attributes = True


# QR Code and Sharing Schemas
class InvoiceQRResponse(BaseModel):
    """Schema for invoice QR code response"""
    qr_code_token: str
    public_url: str
    expires_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class PublicInvoiceResponse(BaseModel):
    """Schema for public invoice view (limited information)"""
    invoice_number: str
    invoice_type: InvoiceTypeEnum
    total_amount: Decimal
    invoice_date: datetime
    due_date: Optional[datetime]
    status: InvoiceStatusEnum
    customer_notes: Optional[str]
    terms_and_conditions: Optional[str]
    items: List[Dict[str, Any]]  # Limited item information

    class Config:
        from_attributes = True