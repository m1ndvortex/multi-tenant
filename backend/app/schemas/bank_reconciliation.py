"""
Bank reconciliation schemas
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, validator
from decimal import Decimal
from datetime import datetime
from uuid import UUID


# Bank Account Schemas
class BankAccountBase(BaseModel):
    account_name: str = Field(..., description="Bank account name")
    account_number: str = Field(..., description="Bank account number")
    bank_name: str = Field(..., description="Bank name")
    branch_name: Optional[str] = Field(None, description="Bank branch name")
    account_type: str = Field(default="checking", description="Account type")
    currency: str = Field(default="IRR", description="Account currency")
    description: Optional[str] = Field(None, description="Account description")


class BankAccountCreate(BankAccountBase):
    current_balance: Decimal = Field(default=Decimal('0'), description="Initial balance")


class BankAccountUpdate(BaseModel):
    account_name: Optional[str] = None
    bank_name: Optional[str] = None
    branch_name: Optional[str] = None
    account_type: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class BankAccountResponse(BankAccountBase):
    id: UUID
    tenant_id: UUID
    current_balance: Decimal
    bank_balance: Decimal
    unreconciled_difference: Decimal
    last_reconciled_date: Optional[datetime]
    last_reconciled_balance: Optional[Decimal]
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Bank Statement Schemas
class BankStatementImportRequest(BaseModel):
    bank_account_id: UUID
    file_format: str = Field(..., description="File format: csv, excel")
    has_header: bool = Field(default=True, description="Whether file has header row")
    date_format: str = Field(default="%Y-%m-%d", description="Date format in file")
    column_mapping: Dict[str, Any] = Field(..., description="Column mapping configuration")

    @validator('file_format')
    def validate_file_format(cls, v):
        if v not in ['csv', 'excel', 'xlsx']:
            raise ValueError('File format must be csv, excel, or xlsx')
        return v


class BankStatementImportResponse(BaseModel):
    success: bool
    statement_id: Optional[UUID] = None
    total_transactions: int = 0
    processed_transactions: int = 0
    failed_transactions: int = 0
    errors: List[str] = []
    warnings: List[str] = []


class BankStatementResponse(BaseModel):
    id: UUID
    bank_account_id: UUID
    statement_date: datetime
    statement_number: Optional[str]
    opening_balance: Decimal
    closing_balance: Decimal
    total_transactions: int
    processed_transactions: int
    failed_transactions: int
    import_date: datetime
    file_name: Optional[str]
    file_format: Optional[str]

    class Config:
        from_attributes = True


# Bank Transaction Schemas
class BankTransactionBase(BaseModel):
    transaction_date: datetime
    description: str
    reference_number: Optional[str] = None
    debit_amount: Decimal = Field(default=Decimal('0'))
    credit_amount: Decimal = Field(default=Decimal('0'))
    transaction_type: Optional[str] = None
    counterparty: Optional[str] = None
    notes: Optional[str] = None

    @validator('debit_amount', 'credit_amount')
    def validate_amounts(cls, v):
        if v < 0:
            raise ValueError('Amounts cannot be negative')
        return v


class BankTransactionCreate(BankTransactionBase):
    bank_account_id: UUID
    value_date: Optional[datetime] = None
    balance_after: Optional[Decimal] = None


class BankTransactionUpdate(BaseModel):
    description: Optional[str] = None
    reference_number: Optional[str] = None
    transaction_type: Optional[str] = None
    counterparty: Optional[str] = None
    notes: Optional[str] = None


class BankTransactionResponse(BankTransactionBase):
    id: UUID
    tenant_id: UUID
    bank_account_id: UUID
    statement_id: Optional[UUID]
    value_date: Optional[datetime]
    balance_after: Optional[Decimal]
    is_matched: bool
    matched_transaction_id: Optional[UUID]
    matched_date: Optional[datetime]
    matched_by: Optional[UUID]
    match_confidence: Optional[Decimal]
    created_at: datetime

    class Config:
        from_attributes = True


class BankTransactionMatch(BaseModel):
    transaction_id: UUID = Field(..., description="Book transaction ID to match with")
    notes: Optional[str] = Field(None, description="Matching notes")


# Transaction Matching Schemas
class TransactionMatchSuggestion(BaseModel):
    bank_transaction_id: UUID
    book_transaction_id: UUID
    confidence_score: Decimal = Field(..., ge=0, le=1, description="Confidence score 0-1")
    match_reasons: List[str] = Field(..., description="Reasons for the match suggestion")
    amount_difference: Decimal = Field(default=Decimal('0'), description="Amount difference")
    date_difference_days: int = Field(default=0, description="Date difference in days")


class TransactionMatchingFilter(BaseModel):
    amount_tolerance: Decimal = Field(default=Decimal('0.01'), description="Amount tolerance for matching")
    date_tolerance_days: int = Field(default=3, description="Date tolerance in days")
    min_confidence: Decimal = Field(default=Decimal('0.7'), ge=0, le=1, description="Minimum confidence score")


class TransactionMatchingResponse(BaseModel):
    bank_transactions: List[BankTransactionResponse]
    book_transactions: List[Dict[str, Any]]  # Transaction model response
    suggestions: List[TransactionMatchSuggestion]
    auto_matched: int = 0
    manual_review_required: int = 0


# Bank Reconciliation Schemas
class BankReconciliationItemBase(BaseModel):
    item_type: str = Field(..., description="Type: outstanding_deposit, outstanding_check, bank_charge, interest, adjustment")
    description: str
    amount: Decimal
    reference_number: Optional[str] = None
    reference_date: Optional[datetime] = None
    transaction_id: Optional[UUID] = None
    bank_transaction_id: Optional[UUID] = None

    @validator('item_type')
    def validate_item_type(cls, v):
        valid_types = ['outstanding_deposit', 'outstanding_check', 'bank_charge', 'interest', 'adjustment']
        if v not in valid_types:
            raise ValueError(f'Item type must be one of: {", ".join(valid_types)}')
        return v


class BankReconciliationItemCreate(BankReconciliationItemBase):
    pass


class BankReconciliationItemResponse(BankReconciliationItemBase):
    id: UUID
    reconciliation_id: UUID
    is_cleared: bool
    cleared_date: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


class BankReconciliationBase(BaseModel):
    reconciliation_date: datetime
    statement_date: datetime
    book_balance: Decimal
    bank_balance: Decimal
    outstanding_deposits: Decimal = Field(default=Decimal('0'))
    outstanding_checks: Decimal = Field(default=Decimal('0'))
    bank_charges: Decimal = Field(default=Decimal('0'))
    interest_earned: Decimal = Field(default=Decimal('0'))
    other_adjustments: Decimal = Field(default=Decimal('0'))
    notes: Optional[str] = None


class BankReconciliationCreate(BankReconciliationBase):
    bank_account_id: UUID
    items: List[BankReconciliationItemCreate] = []


class BankReconciliationUpdate(BaseModel):
    outstanding_deposits: Optional[Decimal] = None
    outstanding_checks: Optional[Decimal] = None
    bank_charges: Optional[Decimal] = None
    interest_earned: Optional[Decimal] = None
    other_adjustments: Optional[Decimal] = None
    notes: Optional[str] = None


class BankReconciliationResponse(BankReconciliationBase):
    id: UUID
    tenant_id: UUID
    bank_account_id: UUID
    adjusted_book_balance: Decimal
    adjusted_bank_balance: Decimal
    is_balanced: bool
    is_finalized: bool
    finalized_date: Optional[datetime]
    finalized_by: Optional[UUID]
    created_by: Optional[UUID]
    created_at: datetime
    updated_at: datetime
    items: List[BankReconciliationItemResponse] = []

    class Config:
        from_attributes = True


# Reconciliation Summary and Reports
class ReconciliationSummary(BaseModel):
    bank_account_id: UUID
    bank_account_name: str
    last_reconciliation_date: Optional[datetime]
    current_book_balance: Decimal
    current_bank_balance: Decimal
    unreconciled_difference: Decimal
    unmatched_transactions: int
    outstanding_items: int


class ReconciliationDiscrepancy(BaseModel):
    type: str = Field(..., description="Type of discrepancy")
    description: str
    amount: Decimal
    transaction_id: Optional[UUID] = None
    bank_transaction_id: Optional[UUID] = None
    date: Optional[datetime] = None
    severity: str = Field(default="medium", description="Severity: low, medium, high")


class ReconciliationReport(BaseModel):
    bank_account: BankAccountResponse
    reconciliation_period: Dict[str, datetime]
    summary: ReconciliationSummary
    discrepancies: List[ReconciliationDiscrepancy]
    unmatched_bank_transactions: List[BankTransactionResponse]
    unmatched_book_transactions: List[Dict[str, Any]]
    outstanding_items: List[BankReconciliationItemResponse]
    recommendations: List[str] = []


# Auto-matching Results
class AutoMatchResult(BaseModel):
    total_bank_transactions: int
    total_book_transactions: int
    matched_transactions: int
    match_rate: Decimal
    high_confidence_matches: int
    medium_confidence_matches: int
    low_confidence_matches: int
    unmatched_transactions: int
    processing_time_seconds: float
    matches: List[TransactionMatchSuggestion] = []