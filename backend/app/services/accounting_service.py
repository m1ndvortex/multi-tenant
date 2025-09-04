"""
Accounting service for Chart of Accounts and General Ledger management
"""

from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, func, desc, asc, text
from typing import List, Optional, Dict, Any, Tuple
from uuid import UUID, uuid4
from decimal import Decimal
from datetime import datetime, date
import logging

from app.models.accounting import (
    Account, AccountType, JournalEntry, JournalEntryLine,
    PaymentMethod, Transaction, TransactionType
)
from app.models.base import TenantMixin
from app.schemas.accounting import (
    AccountCreate, AccountUpdate, AccountResponse, AccountHierarchy,
    JournalEntryCreate, JournalEntryUpdate, JournalEntryResponse,
    GeneralLedgerFilter, GeneralLedgerResponse, GeneralLedgerEntry,
    TrialBalanceResponse, TrialBalanceEntry, ChartOfAccountsResponse,
    PaymentMethodCreate, PaymentMethodUpdate, PaymentMethodResponse,
    TransactionCreate, TransactionUpdate, TransactionResponse
)
from app.core.exceptions import ValidationError, NotFoundError, BusinessLogicError

logger = logging.getLogger(__name__)


class AccountingService:
    """Service for managing accounting operations"""

    def __init__(self, db: Session):
        self.db = db

    # Chart of Accounts Management
    def create_account(self, tenant_id: UUID, account_data: AccountCreate) -> AccountResponse:
        """Create a new account"""
        try:
            # Check if account code already exists for tenant
            existing_account = self.db.query(Account).filter(
                and_(
                    Account.tenant_id == tenant_id,
                    Account.account_code == account_data.account_code,
                    Account.is_active == True
                )
            ).first()
            
            if existing_account:
                raise ValidationError(f"Account code '{account_data.account_code}' already exists")

            # Validate parent account if specified
            if account_data.parent_id:
                parent_account = self.db.query(Account).filter(
                    and_(
                        Account.id == account_data.parent_id,
                        Account.tenant_id == tenant_id,
                        Account.is_active == True
                    )
                ).first()
                
                if not parent_account:
                    raise ValidationError("Parent account not found")
                
                # Validate account type hierarchy
                if not self._validate_account_hierarchy(parent_account.account_type, account_data.account_type):
                    raise ValidationError(f"Invalid account type hierarchy: {parent_account.account_type} -> {account_data.account_type}")

            # Create account
            account = Account(
                tenant_id=tenant_id,
                **account_data.dict()
            )
            
            self.db.add(account)
            self.db.commit()
            self.db.refresh(account)
            
            logger.info(f"Created account {account.account_code} for tenant {tenant_id}")
            return self._account_to_response(account)
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error creating account: {e}")
            raise

    def get_account(self, tenant_id: UUID, account_id: UUID) -> AccountResponse:
        """Get account by ID"""
        account = self.db.query(Account).filter(
            and_(
                Account.id == account_id,
                Account.tenant_id == tenant_id,
                Account.is_active == True
            )
        ).first()
        
        if not account:
            raise NotFoundError("Account not found")
        
        return self._account_to_response(account)

    def get_accounts(self, tenant_id: UUID, account_type: Optional[AccountType] = None) -> List[AccountResponse]:
        """Get all accounts for tenant"""
        query = self.db.query(Account).filter(
            and_(
                Account.tenant_id == tenant_id,
                Account.is_active == True
            )
        )
        
        if account_type:
            query = query.filter(Account.account_type == account_type)
        
        accounts = query.order_by(Account.account_code).all()
        return [self._account_to_response(account) for account in accounts]

    def update_account(self, tenant_id: UUID, account_id: UUID, account_data: AccountUpdate) -> AccountResponse:
        """Update account"""
        try:
            account = self.db.query(Account).filter(
                and_(
                    Account.id == account_id,
                    Account.tenant_id == tenant_id,
                    Account.is_active == True
                )
            ).first()
            
            if not account:
                raise NotFoundError("Account not found")

            # Check if account has posted transactions (prevent type changes)
            if account_data.account_type and account_data.account_type != account.account_type:
                has_transactions = self.db.query(JournalEntryLine).join(JournalEntry).filter(
                    and_(
                        JournalEntryLine.account_id == account_id,
                        JournalEntry.is_posted == True
                    )
                ).first()
                
                if has_transactions:
                    raise BusinessLogicError("Cannot change account type for accounts with posted transactions")

            # Validate parent account if being changed
            if account_data.parent_id and account_data.parent_id != account.parent_id:
                parent_account = self.db.query(Account).filter(
                    and_(
                        Account.id == account_data.parent_id,
                        Account.tenant_id == tenant_id,
                        Account.is_active == True
                    )
                ).first()
                
                if not parent_account:
                    raise ValidationError("Parent account not found")

            # Update account
            for field, value in account_data.dict(exclude_unset=True).items():
                setattr(account, field, value)
            
            self.db.commit()
            self.db.refresh(account)
            
            logger.info(f"Updated account {account.account_code} for tenant {tenant_id}")
            return self._account_to_response(account)
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error updating account: {e}")
            raise

    def delete_account(self, tenant_id: UUID, account_id: UUID) -> bool:
        """Soft delete account"""
        try:
            account = self.db.query(Account).filter(
                and_(
                    Account.id == account_id,
                    Account.tenant_id == tenant_id,
                    Account.is_active == True
                )
            ).first()
            
            if not account:
                raise NotFoundError("Account not found")

            # Check if account has transactions
            has_transactions = self.db.query(JournalEntryLine).filter(
                JournalEntryLine.account_id == account_id
            ).first()
            
            if has_transactions:
                raise BusinessLogicError("Cannot delete account with transactions")

            # Check if account has child accounts
            has_children = self.db.query(Account).filter(
                and_(
                    Account.parent_id == account_id,
                    Account.is_active == True
                )
            ).first()
            
            if has_children:
                raise BusinessLogicError("Cannot delete account with child accounts")

            # Soft delete
            account.is_active = False
            self.db.commit()
            
            logger.info(f"Deleted account {account.account_code} for tenant {tenant_id}")
            return True
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error deleting account: {e}")
            raise

    def get_chart_of_accounts(self, tenant_id: UUID) -> ChartOfAccountsResponse:
        """Get hierarchical chart of accounts"""
        accounts = self.db.query(Account).filter(
            and_(
                Account.tenant_id == tenant_id,
                Account.is_active == True
            )
        ).order_by(Account.account_code).all()
        
        # Build hierarchy
        account_dict = {account.id: self._account_to_hierarchy(account) for account in accounts}
        root_accounts = []
        
        for account in accounts:
            if account.parent_id is None:
                root_accounts.append(account_dict[account.id])
            else:
                parent = account_dict.get(account.parent_id)
                if parent:
                    parent.children.append(account_dict[account.id])
                    account_dict[account.id].level = parent.level + 1

        # Calculate statistics
        accounts_by_type = {}
        for account_type in AccountType:
            count = len([a for a in accounts if a.account_type == account_type])
            accounts_by_type[account_type.value] = count

        return ChartOfAccountsResponse(
            accounts=root_accounts,
            total_accounts=len(accounts),
            accounts_by_type=accounts_by_type
        )

    # Journal Entry Management
    def create_journal_entry(self, tenant_id: UUID, entry_data: JournalEntryCreate, user_id: Optional[UUID] = None) -> JournalEntryResponse:
        """Create a new journal entry"""
        try:
            # Generate entry number
            entry_number = self._generate_entry_number(tenant_id)
            
            # Validate accounts exist and allow posting
            for line in entry_data.lines:
                account = self.db.query(Account).filter(
                    and_(
                        Account.id == line.account_id,
                        Account.tenant_id == tenant_id,
                        Account.is_active == True
                    )
                ).first()
                
                if not account:
                    raise ValidationError(f"Account {line.account_id} not found")
                
                if not account.allow_posting:
                    raise ValidationError(f"Account {account.account_code} does not allow direct posting")

            # Create journal entry
            journal_entry = JournalEntry(
                tenant_id=tenant_id,
                entry_number=entry_number,
                entry_date=entry_data.entry_date,
                description=entry_data.description,
                reference_type=entry_data.reference_type,
                reference_id=entry_data.reference_id,
                reference_number=entry_data.reference_number
            )
            
            self.db.add(journal_entry)
            self.db.flush()  # Get ID without committing

            # Create journal entry lines
            total_debit = Decimal('0.00')
            total_credit = Decimal('0.00')
            
            for line_data in entry_data.lines:
                line = JournalEntryLine(
                    journal_entry_id=journal_entry.id,
                    account_id=line_data.account_id,
                    line_number=line_data.line_number,
                    description=line_data.description,
                    debit_amount=line_data.debit_amount,
                    credit_amount=line_data.credit_amount
                )
                
                self.db.add(line)
                total_debit += line_data.debit_amount
                total_credit += line_data.credit_amount

            # Update totals
            journal_entry.total_debit = total_debit
            journal_entry.total_credit = total_credit
            
            self.db.commit()
            self.db.refresh(journal_entry)
            
            logger.info(f"Created journal entry {entry_number} for tenant {tenant_id}")
            return self._journal_entry_to_response(journal_entry)
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error creating journal entry: {e}")
            raise

    def get_journal_entry(self, tenant_id: UUID, entry_id: UUID) -> JournalEntryResponse:
        """Get journal entry by ID"""
        entry = self.db.query(JournalEntry).options(
            joinedload(JournalEntry.lines).joinedload(JournalEntryLine.account)
        ).filter(
            and_(
                JournalEntry.id == entry_id,
                JournalEntry.tenant_id == tenant_id
            )
        ).first()
        
        if not entry:
            raise NotFoundError("Journal entry not found")
        
        return self._journal_entry_to_response(entry)

    def get_journal_entries(self, tenant_id: UUID, skip: int = 0, limit: int = 100, 
                          posted_only: bool = False) -> List[JournalEntryResponse]:
        """Get journal entries for tenant"""
        query = self.db.query(JournalEntry).options(
            joinedload(JournalEntry.lines).joinedload(JournalEntryLine.account)
        ).filter(JournalEntry.tenant_id == tenant_id)
        
        if posted_only:
            query = query.filter(JournalEntry.is_posted == True)
        
        entries = query.order_by(desc(JournalEntry.entry_date), desc(JournalEntry.entry_number)).offset(skip).limit(limit).all()
        return [self._journal_entry_to_response(entry) for entry in entries]

    def post_journal_entry(self, tenant_id: UUID, entry_id: UUID, user_id: Optional[UUID] = None) -> JournalEntryResponse:
        """Post a journal entry"""
        try:
            entry = self.db.query(JournalEntry).options(
                joinedload(JournalEntry.lines).joinedload(JournalEntryLine.account)
            ).filter(
                and_(
                    JournalEntry.id == entry_id,
                    JournalEntry.tenant_id == tenant_id
                )
            ).first()
            
            if not entry:
                raise NotFoundError("Journal entry not found")
            
            if entry.is_posted:
                raise BusinessLogicError("Journal entry is already posted")
            
            if not entry.is_balanced:
                raise BusinessLogicError("Journal entry is not balanced")

            # Post the entry and update account balances
            entry.post(user_id)
            
            self.db.commit()
            self.db.refresh(entry)
            
            logger.info(f"Posted journal entry {entry.entry_number} for tenant {tenant_id}")
            return self._journal_entry_to_response(entry)
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error posting journal entry: {e}")
            raise

    def update_journal_entry(self, tenant_id: UUID, entry_id: UUID, entry_data: JournalEntryUpdate) -> JournalEntryResponse:
        """Update unposted journal entry"""
        try:
            entry = self.db.query(JournalEntry).filter(
                and_(
                    JournalEntry.id == entry_id,
                    JournalEntry.tenant_id == tenant_id
                )
            ).first()
            
            if not entry:
                raise NotFoundError("Journal entry not found")
            
            if entry.is_posted:
                raise BusinessLogicError("Cannot update posted journal entry")

            # Update entry
            for field, value in entry_data.dict(exclude_unset=True).items():
                setattr(entry, field, value)
            
            self.db.commit()
            self.db.refresh(entry)
            
            logger.info(f"Updated journal entry {entry.entry_number} for tenant {tenant_id}")
            return self._journal_entry_to_response(entry)
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error updating journal entry: {e}")
            raise

    def delete_journal_entry(self, tenant_id: UUID, entry_id: UUID) -> bool:
        """Delete unposted journal entry"""
        try:
            entry = self.db.query(JournalEntry).filter(
                and_(
                    JournalEntry.id == entry_id,
                    JournalEntry.tenant_id == tenant_id
                )
            ).first()
            
            if not entry:
                raise NotFoundError("Journal entry not found")
            
            if entry.is_posted:
                raise BusinessLogicError("Cannot delete posted journal entry")

            # Delete entry and lines (cascade)
            self.db.delete(entry)
            self.db.commit()
            
            logger.info(f"Deleted journal entry {entry.entry_number} for tenant {tenant_id}")
            return True
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error deleting journal entry: {e}")
            raise

    # General Ledger
    def get_general_ledger(self, tenant_id: UUID, filter_params: GeneralLedgerFilter) -> GeneralLedgerResponse:
        """Get general ledger for account"""
        if not filter_params.account_id:
            raise ValidationError("Account ID is required for general ledger")
        
        account = self.db.query(Account).filter(
            and_(
                Account.id == filter_params.account_id,
                Account.tenant_id == tenant_id,
                Account.is_active == True
            )
        ).first()
        
        if not account:
            raise NotFoundError("Account not found")

        # Build query for journal entry lines
        query = self.db.query(
            JournalEntryLine,
            JournalEntry.entry_date,
            JournalEntry.entry_number,
            JournalEntry.description,
            JournalEntry.reference_type,
            JournalEntry.reference_number
        ).join(JournalEntry).filter(
            and_(
                JournalEntryLine.account_id == filter_params.account_id,
                JournalEntry.tenant_id == tenant_id
            )
        )
        
        if filter_params.posted_only:
            query = query.filter(JournalEntry.is_posted == True)
        
        if filter_params.date_from:
            query = query.filter(JournalEntry.entry_date >= filter_params.date_from)
        
        if filter_params.date_to:
            query = query.filter(JournalEntry.entry_date <= filter_params.date_to)
        
        # Order by date and entry number
        query = query.order_by(JournalEntry.entry_date, JournalEntry.entry_number, JournalEntryLine.line_number)
        
        results = query.all()
        
        # Calculate running balance
        entries = []
        running_balance = account.opening_balance if filter_params.include_opening_balance else Decimal('0.00')
        total_debits = Decimal('0.00')
        total_credits = Decimal('0.00')
        
        # Add opening balance entry if requested
        if filter_params.include_opening_balance and account.opening_balance != 0:
            entries.append(GeneralLedgerEntry(
                entry_date=filter_params.date_from or account.created_at,
                entry_number="OPENING",
                description="Opening Balance",
                reference_type=None,
                reference_number=None,
                debit_amount=account.opening_balance if account.opening_balance > 0 else Decimal('0.00'),
                credit_amount=abs(account.opening_balance) if account.opening_balance < 0 else Decimal('0.00'),
                running_balance=running_balance,
                is_opening_balance=True
            ))
        
        # Process journal entry lines
        for line, entry_date, entry_number, description, reference_type, reference_number in results:
            # Update running balance based on account type
            if account.account_type in [AccountType.ASSET, AccountType.EXPENSE]:
                # Debit increases, credit decreases
                running_balance += line.debit_amount - line.credit_amount
            else:
                # Credit increases, debit decreases
                running_balance += line.credit_amount - line.debit_amount
            
            total_debits += line.debit_amount
            total_credits += line.credit_amount
            
            entries.append(GeneralLedgerEntry(
                entry_date=entry_date,
                entry_number=entry_number,
                description=line.description or description,
                reference_type=reference_type,
                reference_number=reference_number,
                debit_amount=line.debit_amount,
                credit_amount=line.credit_amount,
                running_balance=running_balance
            ))
        
        return GeneralLedgerResponse(
            account=self._account_to_response(account),
            entries=entries,
            opening_balance=account.opening_balance,
            closing_balance=running_balance,
            total_debits=total_debits,
            total_credits=total_credits,
            period_from=filter_params.date_from,
            period_to=filter_params.date_to
        )

    def get_trial_balance(self, tenant_id: UUID, as_of_date: Optional[datetime] = None) -> TrialBalanceResponse:
        """Get trial balance"""
        if not as_of_date:
            as_of_date = datetime.now()
        
        # Get all accounts with balances
        query = self.db.query(Account).filter(
            and_(
                Account.tenant_id == tenant_id,
                Account.is_active == True
            )
        ).order_by(Account.account_code)
        
        accounts = query.all()
        entries = []
        total_debits = Decimal('0.00')
        total_credits = Decimal('0.00')
        
        for account in accounts:
            # Calculate account balance as of date
            balance = self._calculate_account_balance(account.id, as_of_date)
            
            if balance != 0:
                if balance > 0:
                    # Debit balance
                    debit_balance = balance
                    credit_balance = Decimal('0.00')
                    total_debits += debit_balance
                else:
                    # Credit balance
                    debit_balance = Decimal('0.00')
                    credit_balance = abs(balance)
                    total_credits += credit_balance
                
                entries.append(TrialBalanceEntry(
                    account_code=account.account_code,
                    account_name=account.account_name,
                    account_type=account.account_type,
                    debit_balance=debit_balance,
                    credit_balance=credit_balance
                ))
        
        return TrialBalanceResponse(
            entries=entries,
            total_debits=total_debits,
            total_credits=total_credits,
            is_balanced=total_debits == total_credits,
            as_of_date=as_of_date
        )

    # Automated Journal Entry Generation
    def create_invoice_journal_entry(self, tenant_id: UUID, invoice_id: UUID, invoice_amount: Decimal, 
                                   customer_id: UUID) -> JournalEntryResponse:
        """Create journal entry for invoice"""
        try:
            # Get default accounts (these should be created during tenant setup)
            accounts_receivable = self._get_default_account(tenant_id, "ACCOUNTS_RECEIVABLE")
            sales_revenue = self._get_default_account(tenant_id, "SALES_REVENUE")
            
            if not accounts_receivable or not sales_revenue:
                raise BusinessLogicError("Default accounts not configured for invoice journal entries")

            entry_data = JournalEntryCreate(
                entry_date=datetime.now(),
                description=f"Invoice sale - Customer payment due",
                reference_type="invoice",
                reference_id=invoice_id,
                lines=[
                    {
                        "account_id": accounts_receivable.id,
                        "line_number": 1,
                        "description": "Accounts Receivable",
                        "debit_amount": invoice_amount,
                        "credit_amount": Decimal('0.00')
                    },
                    {
                        "account_id": sales_revenue.id,
                        "line_number": 2,
                        "description": "Sales Revenue",
                        "debit_amount": Decimal('0.00'),
                        "credit_amount": invoice_amount
                    }
                ]
            )
            
            return self.create_journal_entry(tenant_id, entry_data)
            
        except Exception as e:
            logger.error(f"Error creating invoice journal entry: {e}")
            raise

    def create_payment_journal_entry(self, tenant_id: UUID, payment_amount: Decimal, 
                                   payment_method_id: UUID, customer_id: UUID, 
                                   invoice_id: Optional[UUID] = None) -> JournalEntryResponse:
        """Create journal entry for payment received"""
        try:
            # Get payment method and its account
            payment_method = self.db.query(PaymentMethod).filter(
                and_(
                    PaymentMethod.id == payment_method_id,
                    PaymentMethod.tenant_id == tenant_id
                )
            ).first()
            
            if not payment_method or not payment_method.account_id:
                raise BusinessLogicError("Payment method or associated account not found")

            # Get accounts receivable account
            accounts_receivable = self._get_default_account(tenant_id, "ACCOUNTS_RECEIVABLE")
            
            if not accounts_receivable:
                raise BusinessLogicError("Accounts receivable account not configured")

            entry_data = JournalEntryCreate(
                entry_date=datetime.now(),
                description=f"Payment received via {payment_method.name}",
                reference_type="payment",
                reference_id=invoice_id,
                lines=[
                    {
                        "account_id": payment_method.account_id,
                        "line_number": 1,
                        "description": f"Payment via {payment_method.name}",
                        "debit_amount": payment_amount,
                        "credit_amount": Decimal('0.00')
                    },
                    {
                        "account_id": accounts_receivable.id,
                        "line_number": 2,
                        "description": "Accounts Receivable",
                        "debit_amount": Decimal('0.00'),
                        "credit_amount": payment_amount
                    }
                ]
            )
            
            return self.create_journal_entry(tenant_id, entry_data)
            
        except Exception as e:
            logger.error(f"Error creating payment journal entry: {e}")
            raise

    # Payment Methods
    def create_payment_method(self, tenant_id: UUID, method_data: PaymentMethodCreate) -> PaymentMethodResponse:
        """Create payment method"""
        try:
            # Validate account if specified
            if method_data.account_id:
                account = self.db.query(Account).filter(
                    and_(
                        Account.id == method_data.account_id,
                        Account.tenant_id == tenant_id,
                        Account.is_active == True
                    )
                ).first()
                
                if not account:
                    raise ValidationError("Account not found")

            method = PaymentMethod(
                tenant_id=tenant_id,
                **method_data.dict()
            )
            
            self.db.add(method)
            self.db.commit()
            self.db.refresh(method)
            
            logger.info(f"Created payment method {method.name} for tenant {tenant_id}")
            return self._payment_method_to_response(method)
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error creating payment method: {e}")
            raise

    def get_payment_methods(self, tenant_id: UUID) -> List[PaymentMethodResponse]:
        """Get all payment methods for tenant"""
        methods = self.db.query(PaymentMethod).options(
            joinedload(PaymentMethod.account)
        ).filter(
            and_(
                PaymentMethod.tenant_id == tenant_id,
                PaymentMethod.is_active == True
            )
        ).order_by(PaymentMethod.name).all()
        
        return [self._payment_method_to_response(method) for method in methods]

    # Helper Methods
    def _account_to_response(self, account: Account) -> AccountResponse:
        """Convert account model to response schema"""
        return AccountResponse(
            id=account.id,
            tenant_id=account.tenant_id,
            account_code=account.account_code,
            account_name=account.account_name,
            account_type=account.account_type,
            parent_id=account.parent_id,
            is_system_account=account.is_system_account,
            is_control_account=account.is_control_account,
            allow_posting=account.allow_posting,
            opening_balance=account.opening_balance,
            current_balance=account.current_balance,
            description=account.description,
            full_account_code=account.full_account_code,
            created_at=account.created_at,
            updated_at=account.updated_at,
            is_active=account.is_active
        )

    def _account_to_hierarchy(self, account: Account) -> AccountHierarchy:
        """Convert account model to hierarchy schema"""
        return AccountHierarchy(
            id=account.id,
            tenant_id=account.tenant_id,
            account_code=account.account_code,
            account_name=account.account_name,
            account_type=account.account_type,
            parent_id=account.parent_id,
            is_system_account=account.is_system_account,
            is_control_account=account.is_control_account,
            allow_posting=account.allow_posting,
            opening_balance=account.opening_balance,
            current_balance=account.current_balance,
            description=account.description,
            full_account_code=account.full_account_code,
            created_at=account.created_at,
            updated_at=account.updated_at,
            is_active=account.is_active,
            children=[],
            level=0
        )

    def _journal_entry_to_response(self, entry: JournalEntry) -> JournalEntryResponse:
        """Convert journal entry model to response schema"""
        from app.schemas.accounting import JournalEntryLineResponse
        
        lines = []
        for line in entry.lines:
            lines.append(JournalEntryLineResponse(
                id=line.id,
                journal_entry_id=line.journal_entry_id,
                account_id=line.account_id,
                line_number=line.line_number,
                description=line.description,
                debit_amount=line.debit_amount,
                credit_amount=line.credit_amount,
                account_code=line.account.account_code,
                account_name=line.account.account_name,
                created_at=line.created_at
            ))
        
        return JournalEntryResponse(
            id=entry.id,
            tenant_id=entry.tenant_id,
            entry_number=entry.entry_number,
            entry_date=entry.entry_date,
            description=entry.description,
            reference_type=entry.reference_type,
            reference_id=entry.reference_id,
            reference_number=entry.reference_number,
            is_posted=entry.is_posted,
            posted_at=entry.posted_at,
            posted_by=entry.posted_by,
            total_debit=entry.total_debit,
            total_credit=entry.total_credit,
            lines=lines,
            created_at=entry.created_at,
            updated_at=entry.updated_at
        )

    def _payment_method_to_response(self, method: PaymentMethod) -> PaymentMethodResponse:
        """Convert payment method model to response schema"""
        return PaymentMethodResponse(
            id=method.id,
            tenant_id=method.tenant_id,
            name=method.name,
            description=method.description,
            account_id=method.account_id,
            is_cash=method.is_cash,
            requires_reference=method.requires_reference,
            account_code=method.account.account_code if method.account else None,
            account_name=method.account.account_name if method.account else None,
            created_at=method.created_at,
            updated_at=method.updated_at,
            is_active=method.is_active
        )

    def _generate_entry_number(self, tenant_id: UUID) -> str:
        """Generate unique journal entry number"""
        # Get current year and month
        now = datetime.now()
        prefix = f"JE{now.year}{now.month:02d}"
        
        # Get last entry number for this month
        last_entry = self.db.query(JournalEntry).filter(
            and_(
                JournalEntry.tenant_id == tenant_id,
                JournalEntry.entry_number.like(f"{prefix}%")
            )
        ).order_by(desc(JournalEntry.entry_number)).first()
        
        if last_entry:
            # Extract sequence number and increment
            try:
                last_seq = int(last_entry.entry_number[len(prefix):])
                seq = last_seq + 1
            except (ValueError, IndexError):
                seq = 1
        else:
            seq = 1
        
        return f"{prefix}{seq:04d}"

    def _validate_account_hierarchy(self, parent_type: AccountType, child_type: AccountType) -> bool:
        """Validate account type hierarchy"""
        # Define valid parent-child relationships
        valid_hierarchies = {
            AccountType.ASSET: [AccountType.ASSET],
            AccountType.LIABILITY: [AccountType.LIABILITY],
            AccountType.EQUITY: [AccountType.EQUITY],
            AccountType.REVENUE: [AccountType.REVENUE],
            AccountType.EXPENSE: [AccountType.EXPENSE]
        }
        
        return child_type in valid_hierarchies.get(parent_type, [])

    def _get_default_account(self, tenant_id: UUID, account_code: str) -> Optional[Account]:
        """Get default system account by code"""
        return self.db.query(Account).filter(
            and_(
                Account.tenant_id == tenant_id,
                Account.account_code == account_code,
                Account.is_system_account == True,
                Account.is_active == True
            )
        ).first()

    def _calculate_account_balance(self, account_id: UUID, as_of_date: datetime) -> Decimal:
        """Calculate account balance as of specific date"""
        account = self.db.query(Account).filter(Account.id == account_id).first()
        if not account:
            return Decimal('0.00')
        
        # Get all posted journal entry lines for this account up to the date
        lines = self.db.query(JournalEntryLine).join(JournalEntry).filter(
            and_(
                JournalEntryLine.account_id == account_id,
                JournalEntry.is_posted == True,
                JournalEntry.entry_date <= as_of_date
            )
        ).all()
        
        balance = account.opening_balance
        
        for line in lines:
            if account.account_type in [AccountType.ASSET, AccountType.EXPENSE]:
                # Debit increases, credit decreases
                balance += line.debit_amount - line.credit_amount
            else:
                # Credit increases, debit decreases
                balance += line.credit_amount - line.debit_amount
        
        return balance