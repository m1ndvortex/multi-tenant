"""
Schemas for Accounts Receivable and Payable management
"""

from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from decimal import Decimal
from datetime import datetime, date
from uuid import UUID
from enum import Enum


class PaymentStatusEnum(str, Enum):
    """Payment status enumeration"""
    PENDING = "pending"
    PARTIAL = "partial"
    PAID = "paid"
    OVERDUE = "overdue"


class MatchTypeEnum(str, Enum):
    """Payment matching type enumeration"""
    CUSTOMER_PAYMENT = "customer_payment"
    SUPPLIER_PAYMENT = "supplier_payment"
    BANK_RECONCILIATION = "bank_reconciliation"


# Supplier Schemas
class SupplierBase(BaseModel):
    """Base supplier schema"""
    name: str = Field(..., min_length=1, max_length=255, description="Supplier name")
    company_name: Optional[str] = Field(None, max_length=255, description="Company name")
    email: Optional[str] = Field(None, max_length=255, description="Email address")
    phone: Optional[str] = Field(None, max_length=50, description="Phone number")
    mobile: Optional[str] = Field(None, max_length=50, description="Mobile number")
    address: Optional[str] = Field(None, description="Full address")
    city: Optional[str] = Field(None, max_length=100, description="City")
    postal_code: Optional[str] = Field(None, max_length=20, description="Postal code")
    country: Optional[str] = Field(None, max_length=100, description="Country")
    tax_id: Optional[str] = Field(None, max_length=50, description="Tax ID")
    registration_number: Optional[str] = Field(None, max_length=50, description="Registration number")
    credit_limit: Optional[Decimal] = Field(None, ge=0, description="Credit limit")
    payment_terms_days: int = Field(30, ge=0, le=365, description="Payment terms in days")
    notes: Optional[str] = Field(None, description="Internal notes")

    @validator('name')
    def validate_name(cls, v):
        if not v.strip():
            raise ValueError('Supplier name cannot be empty')
        return v.strip()

    @validator('email')
    def validate_email(cls, v):
        if v and '@' not in v:
            raise ValueError('Invalid email format')
        return v


class SupplierCreate(SupplierBase):
    """Schema for creating supplier"""
    pass


class SupplierUpdate(BaseModel):
    """Schema for updating supplier"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    company_name: Optional[str] = Field(None, max_length=255)
    email: Optional[str] = Field(None, max_length=255)
    phone: Optional[str] = Field(None, max_length=50)
    mobile: Optional[str] = Field(None, max_length=50)
    address: Optional[str] = None
    city: Optional[str] = Field(None, max_length=100)
    postal_code: Optional[str] = Field(None, max_length=20)
    country: Optional[str] = Field(None, max_length=100)
    tax_id: Optional[str] = Field(None, max_length=50)
    registration_number: Optional[str] = Field(None, max_length=50)
    credit_limit: Optional[Decimal] = Field(None, ge=0)
    payment_terms_days: Optional[int] = Field(None, ge=0, le=365)
    notes: Optional[str] = None
    is_active: Optional[bool] = None

    @validator('name')
    def validate_name(cls, v):
        if v is not None and not v.strip():
            raise ValueError('Supplier name cannot be empty')
        return v.strip() if v else v

    @validator('email')
    def validate_email(cls, v):
        if v and '@' not in v:
            raise ValueError('Invalid email format')
        return v


class SupplierResponse(SupplierBase):
    """Schema for supplier response"""
    id: UUID
    tenant_id: UUID
    total_payable: Decimal
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Supplier Bill Schemas
class SupplierBillBase(BaseModel):
    """Base supplier bill schema"""
    bill_number: str = Field(..., min_length=1, max_length=50, description="Bill number")
    supplier_id: UUID = Field(..., description="Supplier ID")
    subtotal: Decimal = Field(..., ge=0, description="Subtotal amount")
    tax_amount: Decimal = Field(Decimal('0.00'), ge=0, description="Tax amount")
    total_amount: Decimal = Field(..., gt=0, description="Total amount")
    bill_date: datetime = Field(..., description="Bill date")
    due_date: datetime = Field(..., description="Due date")
    description: Optional[str] = Field(None, description="Bill description")
    reference_number: Optional[str] = Field(None, max_length=100, description="Reference number")
    notes: Optional[str] = Field(None, description="Internal notes")

    @validator('bill_number')
    def validate_bill_number(cls, v):
        if not v.strip():
            raise ValueError('Bill number cannot be empty')
        return v.strip()

    @validator('due_date')
    def validate_due_date(cls, v, values):
        bill_date = values.get('bill_date')
        if bill_date and v < bill_date:
            raise ValueError('Due date cannot be before bill date')
        return v


class SupplierBillCreate(SupplierBillBase):
    """Schema for creating supplier bill"""
    pass


class SupplierBillUpdate(BaseModel):
    """Schema for updating supplier bill"""
    bill_number: Optional[str] = Field(None, min_length=1, max_length=50)
    subtotal: Optional[Decimal] = Field(None, ge=0)
    tax_amount: Optional[Decimal] = Field(None, ge=0)
    total_amount: Optional[Decimal] = Field(None, gt=0)
    bill_date: Optional[datetime] = None
    due_date: Optional[datetime] = None
    description: Optional[str] = None
    reference_number: Optional[str] = Field(None, max_length=100)
    notes: Optional[str] = None

    @validator('bill_number')
    def validate_bill_number(cls, v):
        if v is not None and not v.strip():
            raise ValueError('Bill number cannot be empty')
        return v.strip() if v else v


class SupplierBillResponse(SupplierBillBase):
    """Schema for supplier bill response"""
    id: UUID
    tenant_id: UUID
    paid_amount: Decimal
    remaining_amount: Decimal
    status: PaymentStatusEnum
    is_overdue: bool
    supplier_name: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Payment Schemas
class CustomerPaymentBase(BaseModel):
    """Base customer payment schema"""
    customer_id: UUID = Field(..., description="Customer ID")
    amount: Decimal = Field(..., gt=0, description="Payment amount")
    payment_date: datetime = Field(..., description="Payment date")
    payment_method_id: Optional[UUID] = Field(None, description="Payment method ID")
    invoice_id: Optional[UUID] = Field(None, description="Related invoice ID")
    reference_number: Optional[str] = Field(None, max_length=100, description="Reference number")
    description: Optional[str] = Field(None, description="Payment description")
    notes: Optional[str] = Field(None, description="Internal notes")

    @validator('amount')
    def validate_amount(cls, v):
        if v <= 0:
            raise ValueError('Payment amount must be positive')
        return v


class CustomerPaymentCreate(CustomerPaymentBase):
    """Schema for creating customer payment"""
    pass


class CustomerPaymentUpdate(BaseModel):
    """Schema for updating customer payment"""
    amount: Optional[Decimal] = Field(None, gt=0)
    payment_date: Optional[datetime] = None
    payment_method_id: Optional[UUID] = None
    invoice_id: Optional[UUID] = None
    reference_number: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = None
    notes: Optional[str] = None

    @validator('amount')
    def validate_amount(cls, v):
        if v is not None and v <= 0:
            raise ValueError('Payment amount must be positive')
        return v


class CustomerPaymentResponse(CustomerPaymentBase):
    """Schema for customer payment response"""
    id: UUID
    tenant_id: UUID
    payment_number: str
    customer_name: str
    payment_method_name: Optional[str]
    invoice_number: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SupplierPaymentBase(BaseModel):
    """Base supplier payment schema"""
    supplier_id: UUID = Field(..., description="Supplier ID")
    amount: Decimal = Field(..., gt=0, description="Payment amount")
    payment_date: datetime = Field(..., description="Payment date")
    payment_method_id: Optional[UUID] = Field(None, description="Payment method ID")
    bill_id: Optional[UUID] = Field(None, description="Related bill ID")
    reference_number: Optional[str] = Field(None, max_length=100, description="Reference number")
    description: Optional[str] = Field(None, description="Payment description")
    notes: Optional[str] = Field(None, description="Internal notes")

    @validator('amount')
    def validate_amount(cls, v):
        if v <= 0:
            raise ValueError('Payment amount must be positive')
        return v


class SupplierPaymentCreate(SupplierPaymentBase):
    """Schema for creating supplier payment"""
    pass


class SupplierPaymentUpdate(BaseModel):
    """Schema for updating supplier payment"""
    amount: Optional[Decimal] = Field(None, gt=0)
    payment_date: Optional[datetime] = None
    payment_method_id: Optional[UUID] = None
    bill_id: Optional[UUID] = None
    reference_number: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = None
    notes: Optional[str] = None

    @validator('amount')
    def validate_amount(cls, v):
        if v is not None and v <= 0:
            raise ValueError('Payment amount must be positive')
        return v


class SupplierPaymentResponse(SupplierPaymentBase):
    """Schema for supplier payment response"""
    id: UUID
    tenant_id: UUID
    payment_number: str
    supplier_name: str
    payment_method_name: Optional[str]
    bill_number: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Aging Report Schemas
class AgingBucket(BaseModel):
    """Aging bucket schema"""
    label: str = Field(..., description="Bucket label (e.g., '0-30 days')")
    days_from: int = Field(..., description="Days from (inclusive)")
    days_to: Optional[int] = Field(None, description="Days to (exclusive), None for open-ended")
    amount: Decimal = Field(Decimal('0.00'), description="Total amount in bucket")
    count: int = Field(0, description="Number of items in bucket")


class CustomerAgingEntry(BaseModel):
    """Customer aging report entry"""
    customer_id: UUID
    customer_name: str
    total_outstanding: Decimal
    buckets: List[AgingBucket]

    class Config:
        from_attributes = True


class SupplierAgingEntry(BaseModel):
    """Supplier aging report entry"""
    supplier_id: UUID
    supplier_name: str
    total_outstanding: Decimal
    buckets: List[AgingBucket]

    class Config:
        from_attributes = True


class AgingReportResponse(BaseModel):
    """Aging report response schema"""
    report_type: str = Field(..., description="Type: receivables or payables")
    as_of_date: datetime = Field(..., description="Report as of date")
    customers: Optional[List[CustomerAgingEntry]] = None
    suppliers: Optional[List[SupplierAgingEntry]] = None
    total_outstanding: Decimal = Field(..., description="Total outstanding amount")
    summary_buckets: List[AgingBucket] = Field(..., description="Summary by aging buckets")


# Payment Matching Schemas
class PaymentMatchingBase(BaseModel):
    """Base payment matching schema"""
    match_type: MatchTypeEnum = Field(..., description="Matching type")
    matched_amount: Decimal = Field(..., gt=0, description="Matched amount")
    notes: Optional[str] = Field(None, description="Matching notes")

    @validator('matched_amount')
    def validate_amount(cls, v):
        if v <= 0:
            raise ValueError('Matched amount must be positive')
        return v


class CustomerPaymentMatchingCreate(PaymentMatchingBase):
    """Schema for creating customer payment matching"""
    customer_payment_id: UUID = Field(..., description="Customer payment ID")
    invoice_id: UUID = Field(..., description="Invoice ID")
    match_type: MatchTypeEnum = Field(MatchTypeEnum.CUSTOMER_PAYMENT, description="Match type")


class SupplierPaymentMatchingCreate(PaymentMatchingBase):
    """Schema for creating supplier payment matching"""
    supplier_payment_id: UUID = Field(..., description="Supplier payment ID")
    supplier_bill_id: UUID = Field(..., description="Supplier bill ID")
    match_type: MatchTypeEnum = Field(MatchTypeEnum.SUPPLIER_PAYMENT, description="Match type")


class PaymentMatchingResponse(PaymentMatchingBase):
    """Schema for payment matching response"""
    id: UUID
    tenant_id: UUID
    customer_payment_id: Optional[UUID]
    invoice_id: Optional[UUID]
    supplier_payment_id: Optional[UUID]
    supplier_bill_id: Optional[UUID]
    match_date: datetime
    matched_by: Optional[UUID]
    is_automatic: bool
    is_reversed: bool
    reversed_at: Optional[datetime]
    reversed_by: Optional[UUID]
    created_at: datetime

    class Config:
        from_attributes = True


# Outstanding Items Schemas
class OutstandingInvoice(BaseModel):
    """Outstanding invoice schema"""
    invoice_id: UUID
    invoice_number: str
    customer_id: UUID
    customer_name: str
    invoice_date: datetime
    due_date: datetime
    total_amount: Decimal
    paid_amount: Decimal
    outstanding_amount: Decimal
    days_overdue: int
    is_overdue: bool

    class Config:
        from_attributes = True


class OutstandingBill(BaseModel):
    """Outstanding bill schema"""
    bill_id: UUID
    bill_number: str
    supplier_id: UUID
    supplier_name: str
    bill_date: datetime
    due_date: datetime
    total_amount: Decimal
    paid_amount: Decimal
    outstanding_amount: Decimal
    days_overdue: int
    is_overdue: bool

    class Config:
        from_attributes = True


class OutstandingItemsResponse(BaseModel):
    """Outstanding items response schema"""
    invoices: List[OutstandingInvoice]
    bills: List[OutstandingBill]
    total_receivables: Decimal
    total_payables: Decimal
    overdue_receivables: Decimal
    overdue_payables: Decimal


# Filter Schemas
class ReceivablesPayablesFilter(BaseModel):
    """Filter schema for receivables and payables"""
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    customer_id: Optional[UUID] = None
    supplier_id: Optional[UUID] = None
    status: Optional[PaymentStatusEnum] = None
    overdue_only: bool = False
    include_paid: bool = True