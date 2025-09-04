"""
Unit tests for bank reconciliation system
"""

import pytest
from decimal import Decimal
from datetime import datetime, timedelta
from uuid import uuid4
from sqlalchemy import and_

from app.models.accounting import (
    BankAccount, BankStatement, BankTransaction, BankReconciliation,
    BankReconciliationItem, Transaction, Account, PaymentMethod
)
from app.schemas.bank_reconciliation import (
    BankAccountCreate, BankStatementImportRequest, BankTransactionCreate,
    BankReconciliationCreate, BankReconciliationItemCreate
)
from app.services.bank_reconciliation_service import BankReconciliationService
from app.core.exceptions import ValidationError, NotFoundError


class TestBankReconciliationService:
    """Test bank reconciliation service functionality"""
    
    @pytest.fixture
    def bank_reconciliation_service(self, db_session):
        """Create bank reconciliation service instance"""
        return BankReconciliationService(db_session)
    
    @pytest.fixture
    def sample_tenant_id(self):
        """Sample tenant ID for testing"""
        return uuid4()
    
    @pytest.fixture
    def sample_user_id(self):
        """Sample user ID for testing"""
        return uuid4()
    
    @pytest.fixture
    def sample_tenant(self, db_session, sample_tenant_id):
        """Create sample tenant for testing"""
        from app.models.tenant import Tenant
        import uuid
        
        # Use unique domain to avoid conflicts
        unique_id = str(uuid.uuid4())[:8]
        
        tenant = Tenant(
            id=sample_tenant_id,
            name=f"Test Tenant {unique_id}",
            domain=f"test-{unique_id}.example.com",
            email=f"test-{unique_id}@example.com",
            subscription_type="FREE",
            is_active=True
        )
        db_session.add(tenant)
        db_session.commit()
        db_session.refresh(tenant)
        return tenant
    
    @pytest.fixture
    def sample_bank_account(self, db_session, sample_tenant):
        """Create sample bank account for testing"""
        account = BankAccount(
            tenant_id=sample_tenant.id,
            account_name="Test Checking Account",
            account_number="123456789",
            bank_name="Test Bank",
            branch_name="Main Branch",
            account_type="checking",
            current_balance=Decimal('10000.00'),
            bank_balance=Decimal('9500.00'),
            currency="IRR"
        )
        db_session.add(account)
        db_session.commit()
        db_session.refresh(account)
        return account  
  
    def test_create_bank_account(self, db_session, sample_tenant):
        """Test creating a bank account"""
        account_data = BankAccountCreate(
            account_name="Test Savings Account",
            account_number="987654321",
            bank_name="Test Bank",
            branch_name="Downtown Branch",
            account_type="savings",
            current_balance=Decimal('5000.00')
        )
        
        account = BankAccount(
            tenant_id=sample_tenant.id,
            **account_data.model_dump()
        )
        
        db_session.add(account)
        db_session.commit()
        db_session.refresh(account)
        
        assert account.id is not None
        assert account.account_name == "Test Savings Account"
        assert account.account_number == "987654321"
        assert account.current_balance == Decimal('5000.00')
        assert account.bank_balance == Decimal('0.00')  # bank_balance defaults to 0
        
        # Update reconciliation status to calculate difference
        account.update_reconciliation_status()
        assert account.unreconciled_difference == Decimal('5000.00')  # current_balance - bank_balance
    
    def test_import_csv_bank_statement(self, bank_reconciliation_service, sample_bank_account, sample_tenant):
        """Test importing CSV bank statement"""
        # Create sample CSV content
        csv_content = """Date,Description,Debit,Credit,Balance
2024-01-15,Opening Balance,0,10000.00,10000.00
2024-01-16,Check Payment,1500.00,0,8500.00
2024-01-17,Deposit,0,2500.00,11000.00
2024-01-18,Bank Charges,25.00,0,10975.00"""
        
        file_content = csv_content.encode('utf-8')
        
        import_request = BankStatementImportRequest(
            bank_account_id=sample_bank_account.id,
            file_format="csv",
            has_header=True,
            date_format="%Y-%m-%d",
            column_mapping={
                "date_column": 0,
                "description_column": 1,
                "debit_column": 2,
                "credit_column": 3,
                "balance_column": 4
            }
        )
        
        result = bank_reconciliation_service.import_bank_statement(
            sample_tenant.id,
            file_content,
            import_request
        )
        
        assert result["success"] is True
        assert result["total_transactions"] == 4
        assert result["processed_transactions"] == 4
        assert result["failed_transactions"] == 0
        assert len(result["errors"]) == 0       
 
        # Verify transactions were created
        transactions = bank_reconciliation_service.db.query(BankTransaction).filter(
            BankTransaction.bank_account_id == sample_bank_account.id
        ).all()
        
        assert len(transactions) == 4
        
        # Check specific transaction
        check_payment = next((t for t in transactions if "Check Payment" in t.description), None)
        assert check_payment is not None
        assert check_payment.debit_amount == Decimal('1500.00')
        assert check_payment.credit_amount == Decimal('0.00')
        assert check_payment.balance_after == Decimal('8500.00')
    
    def test_error_handling_invalid_file_format(self, bank_reconciliation_service, sample_bank_account, sample_tenant):
        """Test error handling for invalid file format"""
        from pydantic import ValidationError as PydanticValidationError
        
        # Test that Pydantic validation catches invalid file format
        with pytest.raises(PydanticValidationError) as exc_info:
            import_request = BankStatementImportRequest(
                bank_account_id=sample_bank_account.id,
                file_format="invalid_format",
                has_header=True,
                column_mapping={}
            )
        
        assert "File format must be csv, excel, or xlsx" in str(exc_info.value)
    
    def test_parse_amount_edge_cases(self, bank_reconciliation_service):
        """Test amount parsing with edge cases"""
        import pandas as pd
        
        # Test various amount formats
        test_data = pd.Series([
            "1,234.56",  # With comma separator
            "$1234.56",  # With currency symbol
            "1234.56 IRR",  # With currency suffix
            "-500.00",  # Negative amount
            "",  # Empty string
            None,  # None value
            "invalid"  # Invalid format
        ])
        
        for i, value in enumerate(test_data):
            row = pd.Series([value])
            amount = bank_reconciliation_service._parse_amount(row, 0)
            
            if i == 0:  # "1,234.56"
                assert amount == Decimal('1234.56')
            elif i == 1:  # "$1234.56"
                assert amount == Decimal('1234.56')
            elif i == 2:  # "1234.56 IRR"
                assert amount == Decimal('1234.56')
            elif i == 3:  # "-500.00"
                assert amount == Decimal('-500.00')
            else:  # Empty, None, or invalid
                assert amount == Decimal('0.00')