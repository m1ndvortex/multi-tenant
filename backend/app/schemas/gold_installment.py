"""
Gold Installment Pydantic schemas
"""

from pydantic import BaseModel, Field, validator
from typing import Optional, List
from decimal import Decimal
from datetime import datetime, date
import uuid
from enum import Enum

from app.models.gold_price import GoldPriceSource
from app.models.installment import InstallmentStatus


class GoldInstallmentPlanCreate(BaseModel):
    """Schema for creating gold installment plan"""
    invoice_id: uuid.UUID = Field(..., description="Invoice ID")
    number_of_installments: int = Field(..., ge=2, le=60, description="Number of installments (2-60)")
    start_date: Optional[datetime] = Field(None, description="Start date for installments")
    interval_days: int = Field(30, ge=1, le=365, description="Days between installments")
    gold_purity: Optional[Decimal] = Field(None, description="Gold purity (e.g., 18.000 for 18k)")
    
    @validator('gold_purity')
    def validate_gold_purity(cls, v):
        if v is not None and (v <= 0 or v > 24):
            raise ValueError('Gold purity must be between 0 and 24')
        return v


class GoldInstallmentResponse(BaseModel):
    """Schema for gold installment response"""
    id: uuid.UUID
    invoice_id: uuid.UUID
    installment_number: int
    installment_type: str
    status: InstallmentStatus
    
    # Gold-specific fields
    gold_weight_due: Optional[Decimal]
    gold_weight_paid: Optional[Decimal]
    gold_price_at_payment: Optional[Decimal]
    
    # Dates
    due_date: datetime
    paid_at: Optional[datetime]
    
    # Additional info
    notes: Optional[str]
    payment_method: Optional[str]
    payment_reference: Optional[str]
    
    # Calculated properties
    remaining_gold_weight: Decimal
    is_overdue: bool
    days_overdue: int
    is_fully_paid: bool
    
    class Config:
        from_attributes = True
        
    @validator('remaining_gold_weight', pre=True, always=True)
    def calculate_remaining_weight(cls, v, values):
        if 'gold_weight_due' in values and 'gold_weight_paid' in values:
            due = values['gold_weight_due'] or Decimal('0')
            paid = values['gold_weight_paid'] or Decimal('0')
            return due - paid
        return v or Decimal('0')
    
    @validator('is_overdue', pre=True, always=True)
    def calculate_is_overdue(cls, v, values):
        if 'due_date' in values and 'status' in values:
            if values['status'] in ['paid']:
                return False
            return datetime.utcnow() > values['due_date']
        return v or False
    
    @validator('days_overdue', pre=True, always=True)
    def calculate_days_overdue(cls, v, values):
        if values.get('is_overdue', False) and 'due_date' in values:
            delta = datetime.utcnow() - values['due_date']
            return delta.days
        return 0
    
    @validator('is_fully_paid', pre=True, always=True)
    def calculate_is_fully_paid(cls, v, values):
        remaining = values.get('remaining_gold_weight', Decimal('0'))
        return remaining <= 0


class GoldPriceCreate(BaseModel):
    """Schema for creating/updating gold price"""
    price_per_gram: Decimal = Field(..., gt=0, description="Gold price per gram")
    gold_purity: Optional[Decimal] = Field(Decimal('18.000'), description="Gold purity (e.g., 18.000 for 18k)")
    price_date: Optional[datetime] = Field(None, description="Price date (defaults to now)")
    source: GoldPriceSource = Field(GoldPriceSource.MANUAL, description="Price source")
    market_name: Optional[str] = Field(None, max_length=255, description="Market or exchange name")
    buy_price: Optional[Decimal] = Field(None, gt=0, description="Buying price per gram")
    sell_price: Optional[Decimal] = Field(None, gt=0, description="Selling price per gram")
    notes: Optional[str] = Field(None, description="Notes about this price")
    
    @validator('gold_purity')
    def validate_gold_purity(cls, v):
        if v is not None and (v <= 0 or v > 24):
            raise ValueError('Gold purity must be between 0 and 24')
        return v
    
    @validator('sell_price')
    def validate_sell_price(cls, v, values):
        if v is not None and 'buy_price' in values and values['buy_price'] is not None:
            if v < values['buy_price']:
                raise ValueError('Sell price cannot be less than buy price')
        return v


class GoldPriceResponse(BaseModel):
    """Schema for gold price response"""
    id: uuid.UUID
    tenant_id: uuid.UUID
    price_date: datetime
    price_per_gram: Decimal
    gold_purity: Decimal
    source: GoldPriceSource
    market_name: Optional[str]
    buy_price: Optional[Decimal]
    sell_price: Optional[Decimal]
    is_active: bool
    is_current: bool
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime
    
    # Calculated properties
    price_spread: Optional[Decimal]
    price_spread_percentage: Optional[Decimal]
    
    class Config:
        from_attributes = True
    
    @validator('price_spread', pre=True, always=True)
    def calculate_price_spread(cls, v, values):
        if 'buy_price' in values and 'sell_price' in values:
            buy = values['buy_price']
            sell = values['sell_price']
            if buy is not None and sell is not None:
                return sell - buy
        return None
    
    @validator('price_spread_percentage', pre=True, always=True)
    def calculate_price_spread_percentage(cls, v, values):
        if 'price_spread' in values and 'buy_price' in values:
            spread = values['price_spread']
            buy = values['buy_price']
            if spread is not None and buy is not None and buy > 0:
                return (spread / buy) * 100
        return None


class GoldPaymentCreate(BaseModel):
    """Schema for creating gold payment"""
    payment_amount: Decimal = Field(..., gt=0, description="Payment amount in currency")
    payment_date: Optional[datetime] = Field(None, description="Payment date (defaults to now)")
    gold_price_override: Optional[Decimal] = Field(None, gt=0, description="Override gold price for this payment")
    payment_method: Optional[str] = Field(None, max_length=50, description="Payment method")
    payment_reference: Optional[str] = Field(None, max_length=255, description="Payment reference number")
    notes: Optional[str] = Field(None, description="Payment notes")


class GoldPaymentResponse(BaseModel):
    """Schema for gold payment response"""
    installment_id: uuid.UUID
    payment_amount: Decimal
    gold_weight_settled: Decimal
    gold_price_used: Decimal
    remaining_gold_weight: Decimal
    is_fully_paid: bool
    payment_date: datetime


class GoldWeightCalculation(BaseModel):
    """Schema for gold weight/payment calculations"""
    gold_weight: Optional[Decimal] = Field(None, description="Gold weight in grams")
    payment_amount: Optional[Decimal] = Field(None, description="Payment amount in currency")
    gold_price_per_gram: Decimal = Field(..., description="Gold price per gram used")
    price_date: datetime = Field(..., description="Date of the gold price")
    gold_purity: Decimal = Field(..., description="Gold purity used")


class GoldInstallmentStatistics(BaseModel):
    """Schema for gold installment statistics"""
    total_installments: int
    pending_installments: int
    paid_installments: int
    overdue_installments: int
    gold_installment_invoices: int
    
    # Weight totals
    total_weight_due: Decimal
    total_weight_paid: Decimal
    outstanding_weight: Decimal
    
    # Value calculations
    outstanding_value_current_price: Decimal
    current_gold_price: Optional[Decimal]
    
    # Performance metrics
    collection_rate: Decimal


class GoldInstallmentSummary(BaseModel):
    """Schema for gold installment summary"""
    invoice_id: uuid.UUID
    total_installments: int
    total_gold_weight: Decimal
    total_weight_paid: Decimal
    remaining_gold_weight: Decimal  # مانده به گرم
    remaining_value_current_price: Decimal
    current_gold_price: Optional[Decimal]
    
    # Status counts
    pending_installments: int
    paid_installments: int
    overdue_installments: int
    
    # Next due installment
    next_due_installment: Optional[dict]
    is_fully_paid: bool


class GoldPriceHistoryResponse(BaseModel):
    """Schema for gold price history response"""
    prices: List[GoldPriceResponse]
    period_start: date
    period_end: date
    total_entries: int
    
    # Price analytics
    highest_price: Optional[Decimal]
    lowest_price: Optional[Decimal]
    average_price: Optional[Decimal]
    price_volatility: Optional[Decimal]
    
    @validator('highest_price', pre=True, always=True)
    def calculate_highest_price(cls, v, values):
        if 'prices' in values and values['prices']:
            return max(price.price_per_gram for price in values['prices'])
        return None
    
    @validator('lowest_price', pre=True, always=True)
    def calculate_lowest_price(cls, v, values):
        if 'prices' in values and values['prices']:
            return min(price.price_per_gram for price in values['prices'])
        return None
    
    @validator('average_price', pre=True, always=True)
    def calculate_average_price(cls, v, values):
        if 'prices' in values and values['prices']:
            total = sum(price.price_per_gram for price in values['prices'])
            return total / len(values['prices'])
        return None
    
    @validator('price_volatility', pre=True, always=True)
    def calculate_price_volatility(cls, v, values):
        if 'highest_price' in values and 'lowest_price' in values:
            high = values['highest_price']
            low = values['lowest_price']
            if high is not None and low is not None:
                return high - low
        return None


class GoldInstallmentFilter(BaseModel):
    """Schema for filtering gold installments"""
    customer_id: Optional[uuid.UUID] = None
    status: Optional[InstallmentStatus] = None
    overdue_only: bool = False
    days_overdue_min: Optional[int] = None
    due_date_from: Optional[date] = None
    due_date_to: Optional[date] = None
    gold_purity: Optional[Decimal] = None
    
    # Pagination
    page: int = Field(1, ge=1)
    page_size: int = Field(50, ge=1, le=100)


class GoldInstallmentListResponse(BaseModel):
    """Schema for paginated gold installment list"""
    installments: List[GoldInstallmentResponse]
    total_count: int
    page: int
    page_size: int
    total_pages: int
    
    @validator('total_pages', pre=True, always=True)
    def calculate_total_pages(cls, v, values):
        if 'total_count' in values and 'page_size' in values:
            total = values['total_count']
            size = values['page_size']
            return (total + size - 1) // size if size > 0 else 0
        return 0