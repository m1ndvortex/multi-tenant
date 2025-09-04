"""
Comprehensive unit tests for the accounting system
Tests Chart of Accounts, General Ledger, and Journal Entry functionality
"""

import pytest
from decimal import Decimal
from datetime import datetime, timedelta
from uuid import uuid4
from sqlalchemy.orm import Session

from app.models.tenant import Tenant
from app.models.user import User
from app.models.customer import Customer
from app.models.accounting import (
    Account, AccountType, JournalEntry, JournalEntryLine, PaymentMethod
)
from app.services.accounting_service import AccountingService
from app.schemas.accounting import (
    AccountCreate, AccountUpdate, JournalEntryCreate, JournalEntryLineCreate,
    GeneralLedgerFilter, PaymentMethodCreate
)
from app.core.exceptions import ValidationError, NotFoundError, BusinessLogicError


class TestAccountingSystem:
    """Test accounting system functionality"""

    @pytest.fixture(autouse=True)
    def setup_test_data(self, db_session: Session):
        """Setup test data for each test"""
        self.db = db_session
        self.service = AccountingService(db_session)
        
        # Create test tenant
        self.tenant = Tenant(
            id=uuid4(),
            name="Test Accounting Company",
            domain="test-accounting.com",
            subscription_type="pro",
            is_active=True
        )
        db_session.add(self.tenant)
        
        # Create test user
        self.user = User(
            id=uuid4(),
            tenant_id=self.tenant.id,
            email="accountant@test.com",
            password_hash="hashed_password",
            role="admin",
            is_active=True
        )
        db_session.add(self.user)
        
        # Create test customer
        self.customer = Customer(
            id=uuid4(),
            tenant_id=self.tenant.id,
            name="Test Customer",
            email="customer@test.com",
            phone="1234567890"
        )
        db_session.add(self.customer)
        
        db_session.commit()

    def test_create_account_success(self):
        """Test successful account creation"""
        account_data = AccountCreate(
            account_code="1001",
            account_name="Cash in Bank",
            account_type=AccountType.ASSET,
            opening_balance=Decimal('10000.00'),
            description="Main bank account"
        )
        
        result = self.service.create_account(self.tenant.id, account_data)
        
        assert result.account_code == "1001"
        assert result.account_name == "Cash in Bank"
        assert result.account_type == AccountType.ASSET
        assert result.opening_balance == Decimal('10000.00')
        assert result.current_balance == Decimal('10000.00')
        assert result.tenant_id == self.tenant.id
        assert result.is_active is True

    def test_create_account_duplicate_code(self):
        """Test account creation with duplicate code fails"""
        account_data = AccountCreate(
            account_code="1001",
            account_name="Cash in Bank",
            account_type=AccountType.ASSET
        )
        
        # Create first account
        self.service.create_account(self.tenant.id, account_data)
        
        # Try to create duplicate
        with pytest.raises(ValidationError, match="Account code '1001' already exists"):
            self.service.create_account(self.tenant.id, account_data)

    def test_create_account_with_parent(self):
        """Test creating account with parent hierarchy"""
        # Create parent account
        parent_data = AccountCreate(
            account_code="1000",
            account_name="Current Assets",
            account_type=AccountType.ASSET,
            is_control_account=True,
            allow_posting=False
        )
        parent = self.service.create_account(self.tenant.id, parent_data)
        
        # Create child account
        child_data = AccountCreate(
            account_code="1001",
            account_name="Cash in Bank",
            account_type=AccountType.ASSET,
            parent_id=parent.id
        )
        child = self.service.create_account(self.tenant.id, child_data)
        
        assert child.parent_id == parent.id
        assert child.full_account_code == "1000.1001"

    def test_create_account_invalid_parent_type(self):
        """Test creating account with invalid parent type fails"""
        # Create asset parent
        parent_data = AccountCreate(
            account_code="1000",
            account_name="Current Assets",
            account_type=AccountType.ASSET
        )
        parent = self.service.create_account(self.tenant.id, parent_data)
        
        # Try to create liability child under asset parent
        child_data = AccountCreate(
            account_code="2001",
            account_name="Accounts Payable",
            account_type=AccountType.LIABILITY,
            parent_id=parent.id
        )
        
        with pytest.raises(ValidationError, match="Invalid account type hierarchy"):
            self.service.create_account(self.tenant.id, child_data)

    def test_update_account_success(self):
        """Test successful account update"""
        # Create account
        account_data = AccountCreate(
            account_code="1001",
            account_name="Cash in Bank",
            account_type=AccountType.ASSET
        )
        account = self.service.create_account(self.tenant.id, account_data)
        
        # Update account
        update_data = AccountUpdate(
            account_name="Updated Cash Account",
            description="Updated description"
        )
        updated = self.service.update_account(self.tenant.id, account.id, update_data)
        
        assert updated.account_name == "Updated Cash Account"
        assert updated.description == "Updated description"
        assert updated.account_code == "1001"  # Should not change

    def test_delete_account_success(self):
        """Test successful account deletion"""
        # Create account
        account_data = AccountCreate(
            account_code="1001",
            account_name="Cash in Bank",
            account_type=AccountType.ASSET
        )
        account = self.service.create_account(self.tenant.id, account_data)
        
        # Delete account
        result = self.service.delete_account(self.tenant.id, account.id)
        assert result is True
        
        # Verify account is soft deleted
        with pytest.raises(NotFoundError):
            self.service.get_account(self.tenant.id, account.id)

    def test_delete_account_with_transactions_fails(self):
        """Test deleting account with transactions fails"""
        # Create accounts
        cash_data = AccountCreate(
            account_code="1001",
            account_name="Cash",
            account_type=AccountType.ASSET
        )
        cash_account = self.service.create_account(self.tenant.id, cash_data)
        
        revenue_data = AccountCreate(
            account_code="4001",
            account_name="Sales Revenue",
            account_type=AccountType.REVENUE
        )
        revenue_account = self.service.create_account(self.tenant.id, revenue_data)
        
        # Create journal entry
        entry_data = JournalEntryCreate(
            entry_date=datetime.now(),
            description="Test transaction",
            lines=[
                JournalEntryLineCreate(
                    account_id=cash_account.id,
                    line_number=1,
                    debit_amount=Decimal('100.00'),
                    credit_amount=Decimal('0.00')
                ),
                JournalEntryLineCreate(
                    account_id=revenue_account.id,
                    line_number=2,
                    debit_amount=Decimal('0.00'),
                    credit_amount=Decimal('100.00')
                )
            ]
        )
        self.service.create_journal_entry(self.tenant.id, entry_data)
        
        # Try to delete account with transactions
        with pytest.raises(BusinessLogicError, match="Cannot delete account with transactions"):
            self.service.delete_account(self.tenant.id, cash_account.id)

    def test_get_chart_of_accounts(self):
        """Test getting hierarchical chart of accounts"""
        # Create parent accounts
        assets_data = AccountCreate(
            account_code="1000",
            account_name="Assets",
            account_type=AccountType.ASSET,
            is_control_account=True,
            allow_posting=False
        )
        assets = self.service.create_account(self.tenant.id, assets_data)
        
        liabilities_data = AccountCreate(
            account_code="2000",
            account_name="Liabilities",
            account_type=AccountType.LIABILITY,
            is_control_account=True,
            allow_posting=False
        )
        liabilities = self.service.create_account(self.tenant.id, liabilities_data)
        
        # Create child accounts
        cash_data = AccountCreate(
            account_code="1001",
            account_name="Cash",
            account_type=AccountType.ASSET,
            parent_id=assets.id
        )
        self.service.create_account(self.tenant.id, cash_data)
        
        payable_data = AccountCreate(
            account_code="2001",
            account_name="Accounts Payable",
            account_type=AccountType.LIABILITY,
            parent_id=liabilities.id
        )
        self.service.create_account(self.tenant.id, payable_data)
        
        # Get chart of accounts
        chart = self.service.get_chart_of_accounts(self.tenant.id)
        
        assert chart.total_accounts == 4
        assert len(chart.accounts) == 2  # Two root accounts
        assert chart.accounts_by_type[AccountType.ASSET.value] == 2
        assert chart.accounts_by_type[AccountType.LIABILITY.value] == 2
        
        # Check hierarchy
        assets_node = next(acc for acc in chart.accounts if acc.account_code == "1000")
        assert len(assets_node.children) == 1
        assert assets_node.children[0].account_code == "1001"
        assert assets_node.children[0].level == 1

    def test_create_journal_entry_success(self):
        """Test successful journal entry creation"""
        # Create accounts
        cash_data = AccountCreate(
            account_code="1001",
            account_name="Cash",
            account_type=AccountType.ASSET
        )
        cash_account = self.service.create_account(self.tenant.id, cash_data)
        
        revenue_data = AccountCreate(
            account_code="4001",
            account_name="Sales Revenue",
            account_type=AccountType.REVENUE
        )
        revenue_account = self.service.create_account(self.tenant.id, revenue_data)
        
        # Create journal entry
        entry_data = JournalEntryCreate(
            entry_date=datetime.now(),
            description="Cash sale",
            reference_type="sale",
            reference_number="SALE-001",
            lines=[
                JournalEntryLineCreate(
                    account_id=cash_account.id,
                    line_number=1,
                    description="Cash received",
                    debit_amount=Decimal('500.00'),
                    credit_amount=Decimal('0.00')
                ),
                JournalEntryLineCreate(
                    account_id=revenue_account.id,
                    line_number=2,
                    description="Sales revenue",
                    debit_amount=Decimal('0.00'),
                    credit_amount=Decimal('500.00')
                )
            ]
        )
        
        result = self.service.create_journal_entry(self.tenant.id, entry_data, self.user.id)
        
        assert result.description == "Cash sale"
        assert result.reference_type == "sale"
        assert result.reference_number == "SALE-001"
        assert result.total_debit == Decimal('500.00')
        assert result.total_credit == Decimal('500.00')
        assert len(result.lines) == 2
        assert result.is_posted is False

    def test_create_journal_entry_unbalanced_fails(self):
        """Test creating unbalanced journal entry fails"""
        # Create accounts
        cash_data = AccountCreate(
            account_code="1001",
            account_name="Cash",
            account_type=AccountType.ASSET
        )
        cash_account = self.service.create_account(self.tenant.id, cash_data)
        
        revenue_data = AccountCreate(
            account_code="4001",
            account_name="Sales Revenue",
            account_type=AccountType.REVENUE
        )
        revenue_account = self.service.create_account(self.tenant.id, revenue_data)
        
        # Create unbalanced journal entry
        entry_data = JournalEntryCreate(
            entry_date=datetime.now(),
            description="Unbalanced entry",
            lines=[
                JournalEntryLineCreate(
                    account_id=cash_account.id,
                    line_number=1,
                    debit_amount=Decimal('500.00'),
                    credit_amount=Decimal('0.00')
                ),
                JournalEntryLineCreate(
                    account_id=revenue_account.id,
                    line_number=2,
                    debit_amount=Decimal('0.00'),
                    credit_amount=Decimal('300.00')  # Unbalanced!
                )
            ]
        )
        
        with pytest.raises(ValidationError, match="Journal entry is not balanced"):
            JournalEntryCreate(**entry_data.dict())

    def test_post_journal_entry_success(self):
        """Test successful journal entry posting"""
        # Create accounts
        cash_data = AccountCreate(
            account_code="1001",
            account_name="Cash",
            account_type=AccountType.ASSET,
            opening_balance=Decimal('1000.00')
        )
        cash_account = self.service.create_account(self.tenant.id, cash_data)
        
        revenue_data = AccountCreate(
            account_code="4001",
            account_name="Sales Revenue",
            account_type=AccountType.REVENUE
        )
        revenue_account = self.service.create_account(self.tenant.id, revenue_data)
        
        # Create journal entry
        entry_data = JournalEntryCreate(
            entry_date=datetime.now(),
            description="Cash sale",
            lines=[
                JournalEntryLineCreate(
                    account_id=cash_account.id,
                    line_number=1,
                    debit_amount=Decimal('500.00'),
                    credit_amount=Decimal('0.00')
                ),
                JournalEntryLineCreate(
                    account_id=revenue_account.id,
                    line_number=2,
                    debit_amount=Decimal('0.00'),
                    credit_amount=Decimal('500.00')
                )
            ]
        )
        entry = self.service.create_journal_entry(self.tenant.id, entry_data, self.user.id)
        
        # Post the entry
        posted_entry = self.service.post_journal_entry(self.tenant.id, entry.id, self.user.id)
        
        assert posted_entry.is_posted is True
        assert posted_entry.posted_by == self.user.id
        assert posted_entry.posted_at is not None
        
        # Check account balances were updated
        updated_cash = self.service.get_account(self.tenant.id, cash_account.id)
        updated_revenue = self.service.get_account(self.tenant.id, revenue_account.id)
        
        # Cash (Asset): Debit increases balance
        assert updated_cash.current_balance == Decimal('1500.00')  # 1000 + 500
        
        # Revenue: Credit increases balance (but stored as positive)
        assert updated_revenue.current_balance == Decimal('500.00')

    def test_post_already_posted_entry_fails(self):
        """Test posting already posted entry fails"""
        # Create accounts and journal entry
        cash_data = AccountCreate(
            account_code="1001",
            account_name="Cash",
            account_type=AccountType.ASSET
        )
        cash_account = self.service.create_account(self.tenant.id, cash_data)
        
        revenue_data = AccountCreate(
            account_code="4001",
            account_name="Sales Revenue",
            account_type=AccountType.REVENUE
        )
        revenue_account = self.service.create_account(self.tenant.id, revenue_data)
        
        entry_data = JournalEntryCreate(
            entry_date=datetime.now(),
            description="Cash sale",
            lines=[
                JournalEntryLineCreate(
                    account_id=cash_account.id,
                    line_number=1,
                    debit_amount=Decimal('500.00'),
                    credit_amount=Decimal('0.00')
                ),
                JournalEntryLineCreate(
                    account_id=revenue_account.id,
                    line_number=2,
                    debit_amount=Decimal('0.00'),
                    credit_amount=Decimal('500.00')
                )
            ]
        )
        entry = self.service.create_journal_entry(self.tenant.id, entry_data, self.user.id)
        
        # Post the entry
        self.service.post_journal_entry(self.tenant.id, entry.id, self.user.id)
        
        # Try to post again
        with pytest.raises(BusinessLogicError, match="Journal entry is already posted"):
            self.service.post_journal_entry(self.tenant.id, entry.id, self.user.id)

    def test_get_general_ledger(self):
        """Test getting general ledger for account"""
        # Create accounts
        cash_data = AccountCreate(
            account_code="1001",
            account_name="Cash",
            account_type=AccountType.ASSET,
            opening_balance=Decimal('1000.00')
        )
        cash_account = self.service.create_account(self.tenant.id, cash_data)
        
        revenue_data = AccountCreate(
            account_code="4001",
            account_name="Sales Revenue",
            account_type=AccountType.REVENUE
        )
        revenue_account = self.service.create_account(self.tenant.id, revenue_data)
        
        # Create and post multiple journal entries
        for i in range(3):
            entry_data = JournalEntryCreate(
                entry_date=datetime.now() + timedelta(days=i),
                description=f"Transaction {i+1}",
                lines=[
                    JournalEntryLineCreate(
                        account_id=cash_account.id,
                        line_number=1,
                        debit_amount=Decimal('100.00'),
                        credit_amount=Decimal('0.00')
                    ),
                    JournalEntryLineCreate(
                        account_id=revenue_account.id,
                        line_number=2,
                        debit_amount=Decimal('0.00'),
                        credit_amount=Decimal('100.00')
                    )
                ]
            )
            entry = self.service.create_journal_entry(self.tenant.id, entry_data, self.user.id)
            self.service.post_journal_entry(self.tenant.id, entry.id, self.user.id)
        
        # Get general ledger
        filter_params = GeneralLedgerFilter(
            account_id=cash_account.id,
            posted_only=True,
            include_opening_balance=True
        )
        ledger = self.service.get_general_ledger(self.tenant.id, filter_params)
        
        assert ledger.account.id == cash_account.id
        assert ledger.opening_balance == Decimal('1000.00')
        assert ledger.closing_balance == Decimal('1300.00')  # 1000 + 3*100
        assert ledger.total_debits == Decimal('300.00')
        assert ledger.total_credits == Decimal('0.00')
        assert len(ledger.entries) == 4  # Opening balance + 3 transactions
        
        # Check running balance calculation
        assert ledger.entries[0].is_opening_balance is True
        assert ledger.entries[0].running_balance == Decimal('1000.00')
        assert ledger.entries[1].running_balance == Decimal('1100.00')
        assert ledger.entries[2].running_balance == Decimal('1200.00')
        assert ledger.entries[3].running_balance == Decimal('1300.00')

    def test_get_trial_balance(self):
        """Test getting trial balance"""
        # Create accounts
        cash_data = AccountCreate(
            account_code="1001",
            account_name="Cash",
            account_type=AccountType.ASSET,
            opening_balance=Decimal('1000.00')
        )
        cash_account = self.service.create_account(self.tenant.id, cash_data)
        
        revenue_data = AccountCreate(
            account_code="4001",
            account_name="Sales Revenue",
            account_type=AccountType.REVENUE
        )
        revenue_account = self.service.create_account(self.tenant.id, revenue_data)
        
        payable_data = AccountCreate(
            account_code="2001",
            account_name="Accounts Payable",
            account_type=AccountType.LIABILITY,
            opening_balance=Decimal('-500.00')  # Credit balance
        )
        payable_account = self.service.create_account(self.tenant.id, payable_data)
        
        # Create and post journal entry
        entry_data = JournalEntryCreate(
            entry_date=datetime.now(),
            description="Cash sale",
            lines=[
                JournalEntryLineCreate(
                    account_id=cash_account.id,
                    line_number=1,
                    debit_amount=Decimal('200.00'),
                    credit_amount=Decimal('0.00')
                ),
                JournalEntryLineCreate(
                    account_id=revenue_account.id,
                    line_number=2,
                    debit_amount=Decimal('0.00'),
                    credit_amount=Decimal('200.00')
                )
            ]
        )
        entry = self.service.create_journal_entry(self.tenant.id, entry_data, self.user.id)
        self.service.post_journal_entry(self.tenant.id, entry.id, self.user.id)
        
        # Get trial balance
        trial_balance = self.service.get_trial_balance(self.tenant.id)
        
        assert trial_balance.is_balanced is True
        assert trial_balance.total_debits == trial_balance.total_credits
        assert len(trial_balance.entries) == 3
        
        # Find specific accounts in trial balance
        cash_entry = next(e for e in trial_balance.entries if e.account_code == "1001")
        revenue_entry = next(e for e in trial_balance.entries if e.account_code == "4001")
        payable_entry = next(e for e in trial_balance.entries if e.account_code == "2001")
        
        # Cash should have debit balance of 1200 (1000 + 200)
        assert cash_entry.debit_balance == Decimal('1200.00')
        assert cash_entry.credit_balance == Decimal('0.00')
        
        # Revenue should have credit balance of 200
        assert revenue_entry.debit_balance == Decimal('0.00')
        assert revenue_entry.credit_balance == Decimal('200.00')
        
        # Payable should have credit balance of 500
        assert payable_entry.debit_balance == Decimal('0.00')
        assert payable_entry.credit_balance == Decimal('500.00')

    def test_create_payment_method(self):
        """Test creating payment method"""
        # Create cash account
        cash_data = AccountCreate(
            account_code="1001",
            account_name="Cash",
            account_type=AccountType.ASSET
        )
        cash_account = self.service.create_account(self.tenant.id, cash_data)
        
        # Create payment method
        method_data = PaymentMethodCreate(
            name="Cash",
            description="Cash payments",
            account_id=cash_account.id,
            is_cash=True,
            requires_reference=False
        )
        
        result = self.service.create_payment_method(self.tenant.id, method_data)
        
        assert result.name == "Cash"
        assert result.account_id == cash_account.id
        assert result.is_cash is True
        assert result.requires_reference is False
        assert result.account_code == "1001"
        assert result.account_name == "Cash"

    def test_automated_invoice_journal_entry(self):
        """Test automated journal entry creation for invoice"""
        # This test would require setting up default accounts
        # For now, we'll test that the method raises appropriate error
        with pytest.raises(BusinessLogicError, match="Default accounts not configured"):
            self.service.create_invoice_journal_entry(
                self.tenant.id,
                uuid4(),
                Decimal('1000.00'),
                self.customer.id
            )

    def test_double_entry_validation(self):
        """Test that all journal entries maintain double-entry bookkeeping"""
        # Create accounts
        cash_data = AccountCreate(
            account_code="1001",
            account_name="Cash",
            account_type=AccountType.ASSET
        )
        cash_account = self.service.create_account(self.tenant.id, cash_data)
        
        revenue_data = AccountCreate(
            account_code="4001",
            account_name="Sales Revenue",
            account_type=AccountType.REVENUE
        )
        revenue_account = self.service.create_account(self.tenant.id, revenue_data)
        
        expense_data = AccountCreate(
            account_code="5001",
            account_name="Office Expense",
            account_type=AccountType.EXPENSE
        )
        expense_account = self.service.create_account(self.tenant.id, expense_data)
        
        # Create complex journal entry with multiple lines
        entry_data = JournalEntryCreate(
            entry_date=datetime.now(),
            description="Complex transaction",
            lines=[
                JournalEntryLineCreate(
                    account_id=cash_account.id,
                    line_number=1,
                    debit_amount=Decimal('800.00'),
                    credit_amount=Decimal('0.00')
                ),
                JournalEntryLineCreate(
                    account_id=expense_account.id,
                    line_number=2,
                    debit_amount=Decimal('200.00'),
                    credit_amount=Decimal('0.00')
                ),
                JournalEntryLineCreate(
                    account_id=revenue_account.id,
                    line_number=3,
                    debit_amount=Decimal('0.00'),
                    credit_amount=Decimal('1000.00')
                )
            ]
        )
        
        entry = self.service.create_journal_entry(self.tenant.id, entry_data, self.user.id)
        
        # Verify double-entry principle
        assert entry.total_debit == entry.total_credit == Decimal('1000.00')
        
        # Post and verify balances
        posted_entry = self.service.post_journal_entry(self.tenant.id, entry.id, self.user.id)
        assert posted_entry.is_posted is True

    def test_tenant_isolation(self):
        """Test that accounts are properly isolated by tenant"""
        # Create another tenant
        other_tenant = Tenant(
            id=uuid4(),
            name="Other Company",
            domain="other.com",
            subscription_type="free",
            is_active=True
        )
        self.db.add(other_tenant)
        self.db.commit()
        
        # Create account for first tenant
        account_data = AccountCreate(
            account_code="1001",
            account_name="Cash",
            account_type=AccountType.ASSET
        )
        account1 = self.service.create_account(self.tenant.id, account_data)
        
        # Create account with same code for second tenant (should work)
        account2 = self.service.create_account(other_tenant.id, account_data)
        
        assert account1.id != account2.id
        assert account1.tenant_id == self.tenant.id
        assert account2.tenant_id == other_tenant.id
        
        # Verify tenant cannot access other tenant's accounts
        with pytest.raises(NotFoundError):
            self.service.get_account(self.tenant.id, account2.id)
        
        with pytest.raises(NotFoundError):
            self.service.get_account(other_tenant.id, account1.id)

    def test_account_balance_calculations(self):
        """Test account balance calculations for different account types"""
        # Create accounts of different types
        accounts = {}
        account_types = [
            (AccountType.ASSET, "1001", "Cash"),
            (AccountType.LIABILITY, "2001", "Accounts Payable"),
            (AccountType.EQUITY, "3001", "Owner's Equity"),
            (AccountType.REVENUE, "4001", "Sales Revenue"),
            (AccountType.EXPENSE, "5001", "Office Expense")
        ]
        
        for acc_type, code, name in account_types:
            account_data = AccountCreate(
                account_code=code,
                account_name=name,
                account_type=acc_type,
                opening_balance=Decimal('1000.00')
            )
            accounts[acc_type] = self.service.create_account(self.tenant.id, account_data)
        
        # Create journal entry affecting all account types
        entry_data = JournalEntryCreate(
            entry_date=datetime.now(),
            description="Test all account types",
            lines=[
                # Debit Asset (increases)
                JournalEntryLineCreate(
                    account_id=accounts[AccountType.ASSET].id,
                    line_number=1,
                    debit_amount=Decimal('500.00'),
                    credit_amount=Decimal('0.00')
                ),
                # Debit Expense (increases)
                JournalEntryLineCreate(
                    account_id=accounts[AccountType.EXPENSE].id,
                    line_number=2,
                    debit_amount=Decimal('300.00'),
                    credit_amount=Decimal('0.00')
                ),
                # Credit Liability (increases)
                JournalEntryLineCreate(
                    account_id=accounts[AccountType.LIABILITY].id,
                    line_number=3,
                    debit_amount=Decimal('0.00'),
                    credit_amount=Decimal('200.00')
                ),
                # Credit Equity (increases)
                JournalEntryLineCreate(
                    account_id=accounts[AccountType.EQUITY].id,
                    line_number=4,
                    debit_amount=Decimal('0.00'),
                    credit_amount=Decimal('300.00')
                ),
                # Credit Revenue (increases)
                JournalEntryLineCreate(
                    account_id=accounts[AccountType.REVENUE].id,
                    line_number=5,
                    debit_amount=Decimal('0.00'),
                    credit_amount=Decimal('300.00')
                )
            ]
        )
        
        entry = self.service.create_journal_entry(self.tenant.id, entry_data, self.user.id)
        self.service.post_journal_entry(self.tenant.id, entry.id, self.user.id)
        
        # Check updated balances
        updated_accounts = {}
        for acc_type in account_types:
            updated_accounts[acc_type[0]] = self.service.get_account(
                self.tenant.id, accounts[acc_type[0]].id
            )
        
        # Asset: 1000 + 500 = 1500 (debit increases)
        assert updated_accounts[AccountType.ASSET].current_balance == Decimal('1500.00')
        
        # Expense: 1000 + 300 = 1300 (debit increases)
        assert updated_accounts[AccountType.EXPENSE].current_balance == Decimal('1300.00')
        
        # Liability: 1000 + 200 = 1200 (credit increases)
        assert updated_accounts[AccountType.LIABILITY].current_balance == Decimal('1200.00')
        
        # Equity: 1000 + 300 = 1300 (credit increases)
        assert updated_accounts[AccountType.EQUITY].current_balance == Decimal('1300.00')
        
        # Revenue: 1000 + 300 = 1300 (credit increases)
        assert updated_accounts[AccountType.REVENUE].current_balance == Decimal('1300.00')