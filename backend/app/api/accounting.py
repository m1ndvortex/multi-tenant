"""
Accounting API endpoints for Chart of Accounts and General Ledger
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Path
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from datetime import datetime

from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.user import User
from app.services.accounting_service import AccountingService
from app.schemas.accounting import (
    AccountCreate, AccountUpdate, AccountResponse, AccountHierarchy,
    JournalEntryCreate, JournalEntryUpdate, JournalEntryResponse,
    GeneralLedgerFilter, GeneralLedgerResponse, TrialBalanceResponse,
    ChartOfAccountsResponse, PaymentMethodCreate, PaymentMethodUpdate,
    PaymentMethodResponse, AccountTypeEnum
)
from app.core.exceptions import ValidationError, NotFoundError, BusinessLogicError

router = APIRouter(prefix="/api/accounting", tags=["accounting"])


# Chart of Accounts Endpoints
@router.post("/accounts", response_model=AccountResponse)
async def create_account(
    account_data: AccountCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new account"""
    try:
        service = AccountingService(db)
        return service.create_account(current_user.tenant_id, account_data)
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/accounts", response_model=List[AccountResponse])
async def get_accounts(
    account_type: Optional[AccountTypeEnum] = Query(None, description="Filter by account type"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all accounts for tenant"""
    try:
        service = AccountingService(db)
        return service.get_accounts(current_user.tenant_id, account_type)
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/accounts/{account_id}", response_model=AccountResponse)
async def get_account(
    account_id: UUID = Path(..., description="Account ID"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get account by ID"""
    try:
        service = AccountingService(db)
        return service.get_account(current_user.tenant_id, account_id)
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")


@router.put("/accounts/{account_id}", response_model=AccountResponse)
async def update_account(
    account_data: AccountUpdate,
    account_id: UUID = Path(..., description="Account ID"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update account"""
    try:
        service = AccountingService(db)
        return service.update_account(current_user.tenant_id, account_id, account_data)
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except BusinessLogicError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")


@router.delete("/accounts/{account_id}")
async def delete_account(
    account_id: UUID = Path(..., description="Account ID"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete account"""
    try:
        service = AccountingService(db)
        success = service.delete_account(current_user.tenant_id, account_id)
        return {"success": success, "message": "Account deleted successfully"}
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except BusinessLogicError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/chart-of-accounts", response_model=ChartOfAccountsResponse)
async def get_chart_of_accounts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get hierarchical chart of accounts"""
    try:
        service = AccountingService(db)
        return service.get_chart_of_accounts(current_user.tenant_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")


# Journal Entry Endpoints
@router.post("/journal-entries", response_model=JournalEntryResponse)
async def create_journal_entry(
    entry_data: JournalEntryCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new journal entry"""
    try:
        service = AccountingService(db)
        return service.create_journal_entry(current_user.tenant_id, entry_data, current_user.id)
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/journal-entries", response_model=List[JournalEntryResponse])
async def get_journal_entries(
    skip: int = Query(0, ge=0, description="Number of entries to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Number of entries to return"),
    posted_only: bool = Query(False, description="Return only posted entries"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get journal entries for tenant"""
    try:
        service = AccountingService(db)
        return service.get_journal_entries(current_user.tenant_id, skip, limit, posted_only)
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/journal-entries/{entry_id}", response_model=JournalEntryResponse)
async def get_journal_entry(
    entry_id: UUID = Path(..., description="Journal entry ID"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get journal entry by ID"""
    try:
        service = AccountingService(db)
        return service.get_journal_entry(current_user.tenant_id, entry_id)
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")


@router.put("/journal-entries/{entry_id}", response_model=JournalEntryResponse)
async def update_journal_entry(
    entry_data: JournalEntryUpdate,
    entry_id: UUID = Path(..., description="Journal entry ID"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update unposted journal entry"""
    try:
        service = AccountingService(db)
        return service.update_journal_entry(current_user.tenant_id, entry_id, entry_data)
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except BusinessLogicError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/journal-entries/{entry_id}/post", response_model=JournalEntryResponse)
async def post_journal_entry(
    entry_id: UUID = Path(..., description="Journal entry ID"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Post a journal entry"""
    try:
        service = AccountingService(db)
        return service.post_journal_entry(current_user.tenant_id, entry_id, current_user.id)
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except BusinessLogicError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")


@router.delete("/journal-entries/{entry_id}")
async def delete_journal_entry(
    entry_id: UUID = Path(..., description="Journal entry ID"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete unposted journal entry"""
    try:
        service = AccountingService(db)
        success = service.delete_journal_entry(current_user.tenant_id, entry_id)
        return {"success": success, "message": "Journal entry deleted successfully"}
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except BusinessLogicError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")


# General Ledger Endpoints
@router.get("/general-ledger", response_model=GeneralLedgerResponse)
async def get_general_ledger(
    account_id: UUID = Query(..., description="Account ID"),
    date_from: Optional[datetime] = Query(None, description="Start date"),
    date_to: Optional[datetime] = Query(None, description="End date"),
    posted_only: bool = Query(True, description="Include only posted entries"),
    include_opening_balance: bool = Query(True, description="Include opening balance"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get general ledger for account"""
    try:
        service = AccountingService(db)
        filter_params = GeneralLedgerFilter(
            account_id=account_id,
            date_from=date_from,
            date_to=date_to,
            posted_only=posted_only,
            include_opening_balance=include_opening_balance
        )
        return service.get_general_ledger(current_user.tenant_id, filter_params)
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/trial-balance", response_model=TrialBalanceResponse)
async def get_trial_balance(
    as_of_date: Optional[datetime] = Query(None, description="As of date (defaults to current date)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get trial balance"""
    try:
        service = AccountingService(db)
        return service.get_trial_balance(current_user.tenant_id, as_of_date)
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")


# Payment Method Endpoints
@router.post("/payment-methods", response_model=PaymentMethodResponse)
async def create_payment_method(
    method_data: PaymentMethodCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new payment method"""
    try:
        service = AccountingService(db)
        return service.create_payment_method(current_user.tenant_id, method_data)
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/payment-methods", response_model=List[PaymentMethodResponse])
async def get_payment_methods(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all payment methods for tenant"""
    try:
        service = AccountingService(db)
        return service.get_payment_methods(current_user.tenant_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")


# Automated Journal Entry Endpoints
@router.post("/journal-entries/invoice/{invoice_id}", response_model=JournalEntryResponse)
async def create_invoice_journal_entry(
    invoice_id: UUID = Path(..., description="Invoice ID"),
    invoice_amount: float = Query(..., description="Invoice amount"),
    customer_id: UUID = Query(..., description="Customer ID"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create automated journal entry for invoice"""
    try:
        service = AccountingService(db)
        from decimal import Decimal
        return service.create_invoice_journal_entry(
            current_user.tenant_id, 
            invoice_id, 
            Decimal(str(invoice_amount)), 
            customer_id
        )
    except BusinessLogicError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/journal-entries/payment", response_model=JournalEntryResponse)
async def create_payment_journal_entry(
    payment_amount: float = Query(..., description="Payment amount"),
    payment_method_id: UUID = Query(..., description="Payment method ID"),
    customer_id: UUID = Query(..., description="Customer ID"),
    invoice_id: Optional[UUID] = Query(None, description="Related invoice ID"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create automated journal entry for payment received"""
    try:
        service = AccountingService(db)
        from decimal import Decimal
        return service.create_payment_journal_entry(
            current_user.tenant_id,
            Decimal(str(payment_amount)),
            payment_method_id,
            customer_id,
            invoice_id
        )
    except BusinessLogicError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")