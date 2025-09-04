"""
Accounting schemas for Chart of Accounts and General Ledger
"""

from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from decimal import Decimal
from datetime import datetime
from uuid import UUID
from enum import Enum


class AccountTypeEnum(str, Enum):
    """Account type enumeration"""
    ASSET = "asset"
    LIABILITY = "liability"
    EQUITY = "equity"
    REVENUE = "revenue"
    EXPENSE = "expense"


class TransactionTypeEnum(str, Enum):
    """Transaction type enumeration"""
    SALE = "sale"
    PURCHASE = "purchase"
    PAYMENT = "payment"
    RECEIPT = "receipt"
    ADJUSTMENT = "adjustment"
    TRANSFER = "transfer"


# Account Schemas
class AccountBase(BaseModel):
    """Base account schema"""
    account_code: str = Field(..., min_length=1, max_length=20, description="Account code")
    account_name: str = Field(..., min_length=1, max_length=255, description="Account name")
    account_type: AccountTypeEnum = Field(..., description="Account type")
    parent_id: Optional[UUID] = Field(None, description="Parent account ID")
    is_system_account: bool = Field(False, description="System account flag")
    is_control_account: bool = Field(False, description="Control account flag")
    allow_posting: bool = Field(True, description="Allow direct posting")
    opening_balance: Decimal = Field(Decimal('0.00'), description="Opening balance")
    description: Optional[str] = Field(None, description="Account description")

    @validator('account_code')
    def validate_account_code(cls, v):
        if not v.strip():
            raise ValueError('Account code cannot be empty')
        return v.strip()

    @validator('account_name')
    def validate_account_name(cls, v):
        if not v.strip():
            raise ValueError('Account name cannot be empty')
        return v.strip()


class AccountCreate(AccountBase):
    """Schema for creating an account"""
    pass


class AccountUpdate(BaseModel):
    """Schema for updating an account"""
    account_name: Optional[str] = Field(None, min_length=1, max_length=255)
    account_type: Optional[AccountTypeEnum] = None
    parent_id: Optional[UUID] = None
    is_control_account: Optional[bool] = None
    allow_posting: Optional[bool] = None
    description: Optional[str] = None

    @validator('account_name')
    def validate_account_name(cls, v):
        if v is not None and not v.strip():
            raise ValueError('Account name cannot be empty')
        return v.strip() if v else v


class AccountResponse(AccountBase):
    """Schema for account response"""
    id: UUID
    tenant_id: UUID
    current_balance: Decimal
    full_account_code: str
    created_at: datetime
    updated_at: datetime
    is_active: bool

    class Config:
        from_attributes = True


class AccountHierarchy(AccountResponse):
    """Schema for account hierarchy"""
    children: List['AccountHierarchy'] = []
    level: int = 0

    class Config:
        from_attributes = True


# Journal Entry Schemas
class JournalEntryLineBase(BaseModel):
    """Base journal entry line schema"""
    account_id: UUID = Field(..., description="Account ID")
    description: Optional[str] = Field(None, description="Line description")
    debit_amount: Decimal = Field(Decimal('0.00'), ge=0, description="Debit amount")
    credit_amount: Decimal = Field(Decimal('0.00'), ge=0, description="Credit amount")

    @validator('debit_amount', 'credit_amount')
    def validate_amounts(cls, v, values):
        if v < 0:
            raise ValueError('Amounts cannot be negative')
        return v

    @validator('credit_amount')
    def validate_debit_credit_exclusive(cls, v, values):
        debit = values.get('debit_amount', Decimal('0.00'))
        if debit > 0 and v > 0:
            raise ValueError('Line cannot have both debit and credit amounts')
        if debit == 0 and v == 0:
            raise ValueError('Line must have either debit or credit amount')
        return v


class JournalEntryLineCreate(JournalEntryLineBase):
    """Schema for creating journal entry line"""
    line_number: int = Field(..., ge=1, description="Line sequence number")


class JournalEntryLineResponse(JournalEntryLineBase):
    """Schema for journal entry line response"""
    id: UUID
    journal_entry_id: UUID
    line_number: int
    account_code: str
    account_name: str
    created_at: datetime

    class Config:
        from_attributes = True


class JournalEntryBase(BaseModel):
    """Base journal entry schema"""
    entry_date: datetime = Field(..., description="Entry date")
    description: str = Field(..., min_length=1, max_length=500, description="Entry description")
    reference_type: Optional[str] = Field(None, max_length=50, description="Reference type")
    reference_id: Optional[UUID] = Field(None, description="Reference ID")
    reference_number: Optional[str] = Field(None, max_length=100, description="Reference number")

    @validator('description')
    def validate_description(cls, v):
        if not v.strip():
            raise ValueError('Description cannot be empty')
        return v.strip()


class JournalEntryCreate(JournalEntryBase):
    """Schema for creating journal entry"""
    lines: List[JournalEntryLineCreate] = Field(..., min_items=2, description="Journal entry lines")

    @validator('lines')
    def validate_lines_balance(cls, v):
        if len(v) < 2:
            raise ValueError('Journal entry must have at least 2 lines')
        
        total_debit = sum(line.debit_amount for line in v)
        total_credit = sum(line.credit_amount for line in v)
        
        if total_debit != total_credit:
            raise ValueError(f'Journal entry is not balanced: debits={total_debit}, credits={total_credit}')
        
        if total_debit == 0:
            raise ValueError('Journal entry cannot have zero amounts')
        
        # Validate line numbers are unique and sequential
        line_numbers = [line.line_number for line in v]
        if len(set(line_numbers)) != len(line_numbers):
            raise ValueError('Line numbers must be unique')
        
        return v


class JournalEntryUpdate(BaseModel):
    """Schema for updating journal entry (only unposted entries)"""
    description: Optional[str] = Field(None, min_length=1, max_length=500)
    reference_type: Optional[str] = Field(None, max_length=50)
    reference_number: Optional[str] = Field(None, max_length=100)

    @validator('description')
    def validate_description(cls, v):
        if v is not None and not v.strip():
            raise ValueError('Description cannot be empty')
        return v.strip() if v else v


class JournalEntryResponse(JournalEntryBase):
    """Schema for journal entry response"""
    id: UUID
    tenant_id: UUID
    entry_number: str
    is_posted: bool
    posted_at: Optional[datetime]
    posted_by: Optional[UUID]
    total_debit: Decimal
    total_credit: Decimal
    lines: List[JournalEntryLineResponse]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# General Ledger Schemas
class GeneralLedgerFilter(BaseModel):
    """Schema for general ledger filtering"""
    account_id: Optional[UUID] = None
    account_type: Optional[AccountTypeEnum] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    posted_only: bool = True
    include_opening_balance: bool = True


class GeneralLedgerEntry(BaseModel):
    """Schema for general ledger entry"""
    entry_date: datetime
    entry_number: str
    description: str
    reference_type: Optional[str]
    reference_number: Optional[str]
    debit_amount: Decimal
    credit_amount: Decimal
    running_balance: Decimal
    is_opening_balance: bool = False

    class Config:
        from_attributes = True


class GeneralLedgerResponse(BaseModel):
    """Schema for general ledger response"""
    account: AccountResponse
    entries: List[GeneralLedgerEntry]
    opening_balance: Decimal
    closing_balance: Decimal
    total_debits: Decimal
    total_credits: Decimal
    period_from: Optional[datetime]
    period_to: Optional[datetime]


# Trial Balance Schemas
class TrialBalanceEntry(BaseModel):
    """Schema for trial balance entry"""
    account_code: str
    account_name: str
    account_type: AccountTypeEnum
    debit_balance: Decimal
    credit_balance: Decimal

    class Config:
        from_attributes = True


class TrialBalanceResponse(BaseModel):
    """Schema for trial balance response"""
    entries: List[TrialBalanceEntry]
    total_debits: Decimal
    total_credits: Decimal
    is_balanced: bool
    as_of_date: datetime


# Chart of Accounts Schemas
class ChartOfAccountsResponse(BaseModel):
    """Schema for chart of accounts response"""
    accounts: List[AccountHierarchy]
    total_accounts: int
    accounts_by_type: Dict[str, int]


# Payment Method Schemas
class PaymentMethodBase(BaseModel):
    """Base payment method schema"""
    name: str = Field(..., min_length=1, max_length=100, description="Payment method name")
    description: Optional[str] = Field(None, description="Payment method description")
    account_id: Optional[UUID] = Field(None, description="Default account ID")
    is_cash: bool = Field(False, description="Is cash payment method")
    requires_reference: bool = Field(False, description="Requires reference number")

    @validator('name')
    def validate_name(cls, v):
        if not v.strip():
            raise ValueError('Payment method name cannot be empty')
        return v.strip()


class PaymentMethodCreate(PaymentMethodBase):
    """Schema for creating payment method"""
    pass


class PaymentMethodUpdate(BaseModel):
    """Schema for updating payment method"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    account_id: Optional[UUID] = None
    is_cash: Optional[bool] = None
    requires_reference: Optional[bool] = None

    @validator('name')
    def validate_name(cls, v):
        if v is not None and not v.strip():
            raise ValueError('Payment method name cannot be empty')
        return v.strip() if v else v


class PaymentMethodResponse(PaymentMethodBase):
    """Schema for payment method response"""
    id: UUID
    tenant_id: UUID
    account_code: Optional[str]
    account_name: Optional[str]
    created_at: datetime
    updated_at: datetime
    is_active: bool

    class Config:
        from_attributes = True


# Transaction Schemas
class TransactionBase(BaseModel):
    """Base transaction schema"""
    transaction_type: TransactionTypeEnum = Field(..., description="Transaction type")
    transaction_date: datetime = Field(..., description="Transaction date")
    amount: Decimal = Field(..., gt=0, description="Transaction amount")
    customer_id: Optional[UUID] = Field(None, description="Customer ID")
    payment_method_id: Optional[UUID] = Field(None, description="Payment method ID")
    reference_number: Optional[str] = Field(None, max_length=100, description="Reference number")
    invoice_id: Optional[UUID] = Field(None, description="Related invoice ID")
    description: Optional[str] = Field(None, description="Transaction description")
    notes: Optional[str] = Field(None, description="Internal notes")

    @validator('amount')
    def validate_amount(cls, v):
        if v <= 0:
            raise ValueError('Transaction amount must be positive')
        return v


class TransactionCreate(TransactionBase):
    """Schema for creating transaction"""
    pass


class TransactionUpdate(BaseModel):
    """Schema for updating transaction"""
    transaction_date: Optional[datetime] = None
    amount: Optional[Decimal] = Field(None, gt=0)
    customer_id: Optional[UUID] = None
    payment_method_id: Optional[UUID] = None
    reference_number: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = None
    notes: Optional[str] = None

    @validator('amount')
    def validate_amount(cls, v):
        if v is not None and v <= 0:
            raise ValueError('Transaction amount must be positive')
        return v


class TransactionResponse(TransactionBase):
    """Schema for transaction response"""
    id: UUID
    tenant_id: UUID
    transaction_number: str
    customer_name: Optional[str]
    payment_method_name: Optional[str]
    journal_entry_id: Optional[UUID]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Update forward references
AccountHierarchy.model_rebuild()