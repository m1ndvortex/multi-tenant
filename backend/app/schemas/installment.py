"""
Pydantic schemas for installment system
"""

from pydantic import BaseModel, Field, validator
from typing import Optional, List
from decimal import Decimal
from datetime import datetime
from enum import Enum
import uuid


class InstallmentTypeEnum(str, Enum):
    """Installment type enumeration"""
    GENERAL = "general"
    GOLD = "gold"


class InstallmentStatusEnum(str, Enum):
    """Installment status enumeration"""
    PENDING = "pending"
    PAID = "paid"
    OVERDUE = "overdue"
    CANCELLED = "cancelled"


# Request Schemas
class InstallmentPlanCreate(BaseModel):
    """Schema for creating installment plan"""
    invoice_id: uuid.UUID = Field(..., description="Invoice ID")
    number_of_installments: int = Field(..., ge=2, le=60, description="Number of installments (2-60)")
    start_date: Optional[datetime] = Field(None, description="Start date for first installment")
    interval_days: int = Field(30, ge=1, le=365, description="Days between installments")
    interest_rate: Optional[Decimal] = Field(None, ge=0, le=100, description="Interest rate percentage")
    
    @validator('interest_rate')
    def validate_interest_rate(cls, v):
        if v is not None and v < 0:
            raise ValueError('Interest rate cannot be negative')
        return v
    
    class Config:
        json_encoders = {
            Decimal: str,
            datetime: lambda v: v.isoformat()
        }


class PaymentCreate(BaseModel):
    """Schema for recording installment payment"""
    installment_id: uuid.UUID = Field(..., description="Installment ID")
    payment_amount: Decimal = Field(..., gt=0, description="Payment amount")
    payment_method: Optional[str] = Field(None, max_length=50, description="Payment method")
    payment_reference: Optional[str] = Field(None, max_length=255, description="Payment reference")
    notes: Optional[str] = Field(None, max_length=1000, description="Payment notes")
    
    @validator('payment_amount')
    def validate_payment_amount(cls, v):
        if v <= 0:
            raise ValueError('Payment amount must be positive')
        return v
    
    class Config:
        json_encoders = {
            Decimal: str
        }


class InstallmentFilter(BaseModel):
    """Schema for filtering installments"""
    invoice_id: Optional[uuid.UUID] = None
    customer_id: Optional[uuid.UUID] = None
    status: Optional[InstallmentStatusEnum] = None
    installment_type: Optional[InstallmentTypeEnum] = None
    is_overdue: Optional[bool] = None
    due_date_from: Optional[datetime] = None
    due_date_to: Optional[datetime] = None
    min_amount: Optional[Decimal] = None
    max_amount: Optional[Decimal] = None
    
    class Config:
        json_encoders = {
            Decimal: str,
            datetime: lambda v: v.isoformat()
        }


# Response Schemas
class InstallmentBase(BaseModel):
    """Base installment schema"""
    id: uuid.UUID
    invoice_id: uuid.UUID
    installment_number: int
    installment_type: InstallmentTypeEnum
    status: InstallmentStatusEnum
    amount_due: Optional[Decimal]
    amount_paid: Optional[Decimal]
    due_date: datetime
    paid_at: Optional[datetime]
    payment_method: Optional[str]
    payment_reference: Optional[str]
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
        json_encoders = {
            Decimal: str,
            datetime: lambda v: v.isoformat()
        }


class InstallmentDetail(InstallmentBase):
    """Detailed installment schema with computed fields"""
    remaining_amount: Decimal
    is_overdue: bool
    days_overdue: int
    is_fully_paid: bool
    
    @validator('remaining_amount', pre=True)
    def compute_remaining_amount(cls, v, values):
        if 'amount_due' in values and 'amount_paid' in values:
            amount_due = values['amount_due'] or Decimal('0')
            amount_paid = values['amount_paid'] or Decimal('0')
            return amount_due - amount_paid
        return v or Decimal('0')
    
    @validator('is_overdue', pre=True)
    def compute_is_overdue(cls, v, values):
        if 'due_date' in values and 'status' in values:
            if values['status'] in ['paid']:
                return False
            return datetime.utcnow() > values['due_date']
        return v or False
    
    @validator('days_overdue', pre=True)
    def compute_days_overdue(cls, v, values):
        if values.get('is_overdue', False) and 'due_date' in values:
            delta = datetime.utcnow() - values['due_date']
            return delta.days
        return 0
    
    @validator('is_fully_paid', pre=True)
    def compute_is_fully_paid(cls, v, values):
        if 'remaining_amount' in values:
            return values['remaining_amount'] <= 0
        return v or False


class InstallmentSummary(BaseModel):
    """Summary schema for installment"""
    id: uuid.UUID
    installment_number: int
    status: InstallmentStatusEnum
    amount_due: Decimal
    amount_paid: Decimal
    remaining_amount: Decimal
    due_date: datetime
    is_overdue: bool
    days_overdue: int
    
    class Config:
        from_attributes = True
        json_encoders = {
            Decimal: str,
            datetime: lambda v: v.isoformat()
        }


class OutstandingBalance(BaseModel):
    """Schema for outstanding balance information"""
    invoice_id: uuid.UUID
    total_installments: int
    total_due: Decimal
    total_paid: Decimal
    outstanding_balance: Decimal
    pending_installments: int
    paid_installments: int
    overdue_installments: int
    next_due_installment: Optional[dict]
    is_fully_paid: bool
    
    class Config:
        json_encoders = {
            Decimal: str
        }


class PaymentHistory(BaseModel):
    """Schema for payment history entry"""
    installment_id: uuid.UUID
    installment_number: int
    payment_date: datetime
    amount_paid: Decimal
    payment_method: Optional[str]
    payment_reference: Optional[str]
    remaining_after_payment: Decimal
    is_fully_paid: bool
    
    class Config:
        json_encoders = {
            Decimal: str,
            datetime: lambda v: v.isoformat()
        }


class InstallmentStatistics(BaseModel):
    """Schema for installment statistics"""
    total_installments: int
    pending_installments: int
    paid_installments: int
    overdue_installments: int
    installment_invoices: int
    total_due: Decimal
    total_paid: Decimal
    outstanding_balance: Decimal
    collection_rate: Decimal
    
    class Config:
        json_encoders = {
            Decimal: str
        }


# List Response Schemas
class InstallmentListResponse(BaseModel):
    """Schema for paginated installment list"""
    installments: List[InstallmentSummary]
    total: int
    page: int
    per_page: int
    pages: int
    
    class Config:
        json_encoders = {
            Decimal: str
        }


class PaymentHistoryResponse(BaseModel):
    """Schema for payment history response"""
    invoice_id: uuid.UUID
    payments: List[PaymentHistory]
    total_payments: int
    total_amount_paid: Decimal
    
    class Config:
        json_encoders = {
            Decimal: str
        }


# Success Response Schemas
class InstallmentPlanResponse(BaseModel):
    """Schema for installment plan creation response"""
    invoice_id: uuid.UUID
    installments_created: int
    total_amount: Decimal
    installments: List[InstallmentSummary]
    
    class Config:
        json_encoders = {
            Decimal: str
        }


class PaymentResponse(BaseModel):
    """Schema for payment recording response"""
    installment: InstallmentDetail
    outstanding_balance: OutstandingBalance
    message: str
    
    class Config:
        json_encoders = {
            Decimal: str
        }


# Update Schemas
class InstallmentUpdate(BaseModel):
    """Schema for updating installment"""
    due_date: Optional[datetime] = None
    notes: Optional[str] = Field(None, max_length=1000)
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


# Validation Schemas
class InstallmentValidation(BaseModel):
    """Schema for installment validation"""
    is_valid: bool
    errors: List[str]
    warnings: List[str]
    
    
class BulkPaymentCreate(BaseModel):
    """Schema for bulk payment processing"""
    payments: List[PaymentCreate] = Field(..., min_items=1, max_items=50)
    
    @validator('payments')
    def validate_payments(cls, v):
        if len(v) == 0:
            raise ValueError('At least one payment is required')
        return v


class BulkPaymentResponse(BaseModel):
    """Schema for bulk payment response"""
    successful_payments: int
    failed_payments: int
    total_amount_processed: Decimal
    results: List[dict]
    
    class Config:
        json_encoders = {
            Decimal: str
        }