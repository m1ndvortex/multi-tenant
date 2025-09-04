"""
Bank reconciliation API endpoints
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from uuid import UUID

from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.user import User
from app.models.accounting import BankAccount, BankStatement, BankTransaction, BankReconciliation
from app.schemas.accounting import (
    BankAccountCreate, BankAccountUpdate, BankAccountResponse,
    BankStatementResponse, BankStatementImportRequest, BankStatementImportResponse,
    BankTransactionResponse, BankTransactionCreate, BankTransactionUpdate, BankTransactionMatch,
    BankReconciliationCreate, BankReconciliationUpdate, BankReconciliationResponse,
    TransactionMatchingFilter, TransactionMatchingResponse, ReconciliationSummary,
    ReconciliationReport
)
from app.services.bank_reconciliation_service import BankReconciliationService
from app.core.exceptions import NotFoundError, ValidationError
from sqlalchemy import and_, desc, func

router = APIRouter()


# Bank Account Management
@router.post("/bank-accounts", response_model=BankAccountResponse)
async def create_bank_account(
    account_data: BankAccountCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new bank account"""
    try:
        # Check if account number already exists for tenant
        existing = db.query(BankAccount).filter(
            and_(
                BankAccount.tenant_id == current_user.tenant_id,
                BankAccount.account_number == account_data.account_number
            )
        ).first()
        
        if existing:
            raise HTTPException(status_code=400, detail="Account number already exists")
        
        bank_account = BankAccount(
            tenant_id=current_user.tenant_id,
            **account_data.dict()
        )
        
        db.add(bank_account)
        db.commit()
        db.refresh(bank_account)
        
        return bank_account
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/bank-accounts", response_model=List[BankAccountResponse])
async def get_bank_accounts(
    active_only: bool = True,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all bank accounts for tenant"""
    query = db.query(BankAccount).filter(BankAccount.tenant_id == current_user.tenant_id)
    
    if active_only:
        query = query.filter(BankAccount.is_active == True)
    
    accounts = query.order_by(BankAccount.account_name).all()
    return accounts


@router.get("/bank-accounts/{account_id}", response_model=BankAccountResponse)
async def get_bank_account(
    account_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get specific bank account"""
    account = db.query(BankAccount).filter(
        and_(
            BankAccount.id == account_id,
            BankAccount.tenant_id == current_user.tenant_id
        )
    ).first()
    
    if not account:
        raise HTTPException(status_code=404, detail="Bank account not found")
    
    return account


@router.put("/bank-accounts/{account_id}", response_model=BankAccountResponse)
async def update_bank_account(
    account_id: UUID,
    account_data: BankAccountUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update bank account"""
    account = db.query(BankAccount).filter(
        and_(
            BankAccount.id == account_id,
            BankAccount.tenant_id == current_user.tenant_id
        )
    ).first()
    
    if not account:
        raise HTTPException(status_code=404, detail="Bank account not found")
    
    try:
        for field, value in account_data.dict(exclude_unset=True).items():
            setattr(account, field, value)
        
        db.commit()
        db.refresh(account)
        
        return account
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


# Bank Statement Management
@router.post("/bank-accounts/{account_id}/statements/import", response_model=BankStatementImportResponse)
async def import_bank_statement(
    account_id: UUID,
    file: UploadFile = File(...),
    file_format: str = Form(...),
    has_header: bool = Form(True),
    date_format: str = Form("%Y-%m-%d"),
    column_mapping: str = Form(...),  # JSON string
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Import bank statement from file"""
    try:
        import json
        
        # Parse column mapping
        try:
            mapping = json.loads(column_mapping)
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Invalid column mapping JSON")
        
        # Create import request
        import_request = BankStatementImportRequest(
            bank_account_id=account_id,
            file_format=file_format,
            has_header=has_header,
            date_format=date_format,
            column_mapping=mapping
        )
        
        # Read file content
        file_content = await file.read()
        
        # Import statement
        service = BankReconciliationService(db)
        result = service.import_bank_statement(
            current_user.tenant_id,
            file_content,
            import_request
        )
        
        return BankStatementImportResponse(**result)
        
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Import failed: {str(e)}")


@router.get("/bank-accounts/{account_id}/statements", response_model=List[BankStatementResponse])
async def get_bank_statements(
    account_id: UUID,
    limit: int = 50,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get bank statements for account"""
    # Verify account belongs to tenant
    account = db.query(BankAccount).filter(
        and_(
            BankAccount.id == account_id,
            BankAccount.tenant_id == current_user.tenant_id
        )
    ).first()
    
    if not account:
        raise HTTPException(status_code=404, detail="Bank account not found")
    
    statements = db.query(BankStatement).filter(
        BankStatement.bank_account_id == account_id
    ).order_by(desc(BankStatement.statement_date)).offset(offset).limit(limit).all()
    
    return statements


# Bank Transaction Management
@router.get("/bank-accounts/{account_id}/transactions", response_model=List[BankTransactionResponse])
async def get_bank_transactions(
    account_id: UUID,
    unmatched_only: bool = False,
    limit: int = 100,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get bank transactions for account"""
    # Verify account belongs to tenant
    account = db.query(BankAccount).filter(
        and_(
            BankAccount.id == account_id,
            BankAccount.tenant_id == current_user.tenant_id
        )
    ).first()
    
    if not account:
        raise HTTPException(status_code=404, detail="Bank account not found")
    
    query = db.query(BankTransaction).filter(
        BankTransaction.bank_account_id == account_id
    )
    
    if unmatched_only:
        query = query.filter(BankTransaction.is_matched == False)
    
    transactions = query.order_by(desc(BankTransaction.transaction_date)).offset(offset).limit(limit).all()
    
    return transactions


@router.post("/bank-transactions", response_model=BankTransactionResponse)
async def create_bank_transaction(
    transaction_data: BankTransactionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create manual bank transaction"""
    try:
        # Verify bank account belongs to tenant
        account = db.query(BankAccount).filter(
            and_(
                BankAccount.id == transaction_data.bank_account_id,
                BankAccount.tenant_id == current_user.tenant_id
            )
        ).first()
        
        if not account:
            raise HTTPException(status_code=404, detail="Bank account not found")
        
        transaction = BankTransaction(
            tenant_id=current_user.tenant_id,
            **transaction_data.dict()
        )
        
        db.add(transaction)
        db.commit()
        db.refresh(transaction)
        
        return transaction
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/bank-transactions/{transaction_id}", response_model=BankTransactionResponse)
async def update_bank_transaction(
    transaction_id: UUID,
    transaction_data: BankTransactionUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update bank transaction"""
    transaction = db.query(BankTransaction).filter(
        and_(
            BankTransaction.id == transaction_id,
            BankTransaction.tenant_id == current_user.tenant_id
        )
    ).first()
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Bank transaction not found")
    
    try:
        for field, value in transaction_data.dict(exclude_unset=True).items():
            setattr(transaction, field, value)
        
        db.commit()
        db.refresh(transaction)
        
        return transaction
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


# Transaction Matching
@router.get("/bank-accounts/{account_id}/matching", response_model=TransactionMatchingResponse)
async def get_transaction_matching(
    account_id: UUID,
    amount_tolerance: float = 0.01,
    date_tolerance_days: int = 3,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get transaction matching suggestions"""
    try:
        service = BankReconciliationService(db)
        suggestions = service.find_transaction_matches(
            current_user.tenant_id,
            account_id,
            amount_tolerance,
            date_tolerance_days
        )
        
        # Get unmatched transactions for display
        bank_transactions = db.query(BankTransaction).filter(
            and_(
                BankTransaction.tenant_id == current_user.tenant_id,
                BankTransaction.bank_account_id == account_id,
                BankTransaction.is_matched == False
            )
        ).limit(50).all()
        
        from app.models.accounting import Transaction
        book_transactions = db.query(Transaction).filter(
            and_(
                Transaction.tenant_id == current_user.tenant_id,
                Transaction.transaction_type.in_(['payment', 'receipt'])
            )
        ).limit(50).all()
        
        return TransactionMatchingResponse(
            bank_transactions=bank_transactions,
            book_transactions=book_transactions,
            suggestions=suggestions,
            auto_matched=0,
            manual_review_required=len(suggestions)
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/bank-transactions/{bank_transaction_id}/match")
async def match_transactions(
    bank_transaction_id: UUID,
    match_data: BankTransactionMatch,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Match bank transaction with book transaction"""
    try:
        service = BankReconciliationService(db)
        result = service.match_transactions(
            current_user.tenant_id,
            bank_transaction_id,
            match_data.transaction_id,
            current_user.id,
            match_data.notes
        )
        
        return {"success": result, "message": "Transactions matched successfully"}
        
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/bank-transactions/{bank_transaction_id}/match")
async def unmatch_transaction(
    bank_transaction_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remove transaction matching"""
    try:
        service = BankReconciliationService(db)
        result = service.unmatch_transaction(
            current_user.tenant_id,
            bank_transaction_id,
            current_user.id
        )
        
        return {"success": result, "message": "Transaction unmatched successfully"}
        
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/bank-accounts/{account_id}/auto-match")
async def auto_match_transactions(
    account_id: UUID,
    min_confidence: float = 0.90,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Automatically match transactions with high confidence"""
    try:
        service = BankReconciliationService(db)
        result = service.auto_match_transactions(
            current_user.tenant_id,
            account_id,
            min_confidence
        )
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Bank Reconciliation
@router.post("/bank-reconciliations", response_model=BankReconciliationResponse)
async def create_reconciliation(
    reconciliation_data: BankReconciliationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create new bank reconciliation"""
    try:
        service = BankReconciliationService(db)
        reconciliation = service.create_reconciliation(
            current_user.tenant_id,
            reconciliation_data,
            current_user.id
        )
        
        return reconciliation
        
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/bank-reconciliations", response_model=List[BankReconciliationResponse])
async def get_reconciliations(
    bank_account_id: Optional[UUID] = None,
    finalized_only: bool = False,
    limit: int = 50,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get bank reconciliations"""
    query = db.query(BankReconciliation).filter(
        BankReconciliation.tenant_id == current_user.tenant_id
    )
    
    if bank_account_id:
        query = query.filter(BankReconciliation.bank_account_id == bank_account_id)
    
    if finalized_only:
        query = query.filter(BankReconciliation.is_finalized == True)
    
    reconciliations = query.order_by(desc(BankReconciliation.reconciliation_date)).offset(offset).limit(limit).all()
    
    return reconciliations


@router.get("/bank-reconciliations/{reconciliation_id}", response_model=BankReconciliationResponse)
async def get_reconciliation(
    reconciliation_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get specific reconciliation"""
    reconciliation = db.query(BankReconciliation).filter(
        and_(
            BankReconciliation.id == reconciliation_id,
            BankReconciliation.tenant_id == current_user.tenant_id
        )
    ).first()
    
    if not reconciliation:
        raise HTTPException(status_code=404, detail="Reconciliation not found")
    
    return reconciliation


@router.put("/bank-reconciliations/{reconciliation_id}", response_model=BankReconciliationResponse)
async def update_reconciliation(
    reconciliation_id: UUID,
    reconciliation_data: BankReconciliationUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update bank reconciliation"""
    reconciliation = db.query(BankReconciliation).filter(
        and_(
            BankReconciliation.id == reconciliation_id,
            BankReconciliation.tenant_id == current_user.tenant_id,
            BankReconciliation.is_finalized == False
        )
    ).first()
    
    if not reconciliation:
        raise HTTPException(status_code=404, detail="Reconciliation not found or already finalized")
    
    try:
        for field, value in reconciliation_data.dict(exclude_unset=True).items():
            setattr(reconciliation, field, value)
        
        # Recalculate adjusted balances
        reconciliation.calculate_adjusted_balances()
        
        db.commit()
        db.refresh(reconciliation)
        
        return reconciliation
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/bank-reconciliations/{reconciliation_id}/finalize")
async def finalize_reconciliation(
    reconciliation_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Finalize bank reconciliation"""
    try:
        service = BankReconciliationService(db)
        result = service.finalize_reconciliation(
            current_user.tenant_id,
            reconciliation_id,
            current_user.id
        )
        
        return {"success": result, "message": "Reconciliation finalized successfully"}
        
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Reconciliation Reports
@router.get("/bank-accounts/{account_id}/reconciliation-summary", response_model=ReconciliationSummary)
async def get_reconciliation_summary(
    account_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get reconciliation summary for bank account"""
    # Verify account belongs to tenant
    account = db.query(BankAccount).filter(
        and_(
            BankAccount.id == account_id,
            BankAccount.tenant_id == current_user.tenant_id
        )
    ).first()
    
    if not account:
        raise HTTPException(status_code=404, detail="Bank account not found")
    
    # Get discrepancies
    service = BankReconciliationService(db)
    discrepancies = service.get_reconciliation_discrepancies(
        current_user.tenant_id,
        account_id
    )
    
    return ReconciliationSummary(
        bank_account_id=account.id,
        bank_account_name=account.account_name,
        last_reconciliation_date=account.last_reconciled_date,
        current_book_balance=account.current_balance,
        current_bank_balance=account.bank_balance,
        unreconciled_difference=account.unreconciled_difference,
        unmatched_transactions=discrepancies['unmatched_bank_transactions'] + discrepancies['unmatched_book_transactions'],
        outstanding_items=discrepancies['outstanding_items']
    )


@router.get("/bank-accounts/{account_id}/discrepancies")
async def get_reconciliation_discrepancies(
    account_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get detailed reconciliation discrepancies"""
    try:
        service = BankReconciliationService(db)
        discrepancies = service.get_reconciliation_discrepancies(
            current_user.tenant_id,
            account_id
        )
        
        return discrepancies
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))