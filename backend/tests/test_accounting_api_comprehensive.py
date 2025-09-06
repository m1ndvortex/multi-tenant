"""
Comprehensive Integration Tests for Accounting API
Tests Chart of Accounts, Journal Entries, and General Ledger with real database
"""

import pytest
from fastapi.testclient import TestClient
from decimal import Decimal
import uuid
from datetime import datetime, date

from app.main import app
from app.models.tenant import Tenant, TenantStatus, SubscriptionType
from app.models.user import User, UserRole, UserStatus
from app.core.auth import get_password_hash


class TestAccountingAPIComprehensive:
    """Comprehensive integration tests for Accounting API"""
    
    @pytest.fixture
    def client(self):
        """Create test client"""
        return TestClient(app)
    
    @pytest.fixture
    def setup_accounting_test_data(self, db_session):
        """Setup test data for accounting tests"""
        # Create tenant
        tenant = Tenant(
            name="Accounting Test Business",
            domain="accounting-test.example.com",
            email="accounting@test.com",
            subscription_type=SubscriptionType.PRO,
            status=TenantStatus.ACTIVE,
            max_users=5,
            max_products=100,
            max_customers=100,
            max_monthly_invoices=100
        )
        db_session.add(tenant)
        db_session.commit()
        
        # Create user
        user = User(
            tenant_id=tenant.id,
            email="accountant@test.com",
            password_hash=get_password_hash("accountant123"),
            first_name="Test",
            last_name="Accountant",
            role=UserRole.ADMIN,
            status=UserStatus.ACTIVE
        )
        db_session.add(user)
        db_session.commit()
        
        return {'tenant': tenant, 'user': user}
    
    @pytest.fixture
    def auth_headers(self, client, setup_accounting_test_data):
        """Get authentication headers"""
        data = setup_accounting_test_data
        
        login_data = {
            "email": data['user'].email,
            "password": "accountant123"
        }
        
        response = client.post("/api/auth/login", json=login_data)
        assert response.status_code == 200
        
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_accounts_create_asset_account(self, client, auth_headers):
        """Test creating an asset account"""
        account_data = {
            "account_code": "1001",
            "account_name": "Cash in Hand",
            "account_type": "asset",
            "parent_account_id": None,
            "description": "Cash available in hand",
            "is_active": True
        }
        
        response = client.post(
            "/api/accounting/accounts",
            json=account_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        assert result["account_code"] == "1001"
        assert result["account_name"] == "Cash in Hand"
        assert result["account_type"] == "asset"
        assert result["balance"] == "0.00"
        assert result["is_active"] is True
    
    def test_accounts_create_liability_account(self, client, auth_headers):
        """Test creating a liability account"""
        account_data = {
            "account_code": "2001",
            "account_name": "Accounts Payable",
            "account_type": "liability",
            "description": "Money owed to suppliers"
        }
        
        response = client.post(
            "/api/accounting/accounts",
            json=account_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        assert result["account_code"] == "2001"
        assert result["account_name"] == "Accounts Payable"
        assert result["account_type"] == "liability"
    
    def test_accounts_create_revenue_account(self, client, auth_headers):
        """Test creating a revenue account"""
        account_data = {
            "account_code": "4001",
            "account_name": "Sales Revenue",
            "account_type": "revenue",
            "description": "Revenue from product sales"
        }
        
        response = client.post(
            "/api/accounting/accounts",
            json=account_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        assert result["account_code"] == "4001"
        assert result["account_name"] == "Sales Revenue"
        assert result["account_type"] == "revenue"
    
    def test_accounts_create_expense_account(self, client, auth_headers):
        """Test creating an expense account"""
        account_data = {
            "account_code": "5001",
            "account_name": "Office Supplies",
            "account_type": "expense",
            "description": "Office supplies and materials"
        }
        
        response = client.post(
            "/api/accounting/accounts",
            json=account_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        assert result["account_code"] == "5001"
        assert result["account_name"] == "Office Supplies"
        assert result["account_type"] == "expense"
    
    def test_accounts_list_all(self, client, auth_headers):
        """Test listing all accounts"""
        # First create a few accounts
        accounts_to_create = [
            {
                "account_code": "1100",
                "account_name": "Bank Account",
                "account_type": "asset"
            },
            {
                "account_code": "2100",
                "account_name": "Credit Card",
                "account_type": "liability"
            },
            {
                "account_code": "4100",
                "account_name": "Service Revenue",
                "account_type": "revenue"
            }
        ]
        
        created_accounts = []
        for account_data in accounts_to_create:
            response = client.post(
                "/api/accounting/accounts",
                json=account_data,
                headers=auth_headers
            )
            assert response.status_code == 200
            created_accounts.append(response.json())
        
        # List all accounts
        response = client.get(
            "/api/accounting/accounts",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        assert len(result) >= 3
        
        # Verify our created accounts are in the list
        account_codes = [acc["account_code"] for acc in result]
        assert "1100" in account_codes
        assert "2100" in account_codes
        assert "4100" in account_codes
    
    def test_accounts_filter_by_type(self, client, auth_headers):
        """Test filtering accounts by type"""
        # Create accounts of different types
        asset_account = {
            "account_code": "1200",
            "account_name": "Inventory",
            "account_type": "asset"
        }
        
        liability_account = {
            "account_code": "2200",
            "account_name": "Loan Payable",
            "account_type": "liability"
        }
        
        for account_data in [asset_account, liability_account]:
            response = client.post(
                "/api/accounting/accounts",
                json=account_data,
                headers=auth_headers
            )
            assert response.status_code == 200
        
        # Filter by asset type
        response = client.get(
            "/api/accounting/accounts?account_type=asset",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        # All returned accounts should be assets
        for account in result:
            assert account["account_type"] == "asset"
        
        # Should include our inventory account
        account_codes = [acc["account_code"] for acc in result]
        assert "1200" in account_codes
    
    def test_accounts_get_by_id(self, client, auth_headers):
        """Test getting account by ID"""
        # Create account
        account_data = {
            "account_code": "1300",
            "account_name": "Equipment",
            "account_type": "asset",
            "description": "Office equipment and machinery"
        }
        
        create_response = client.post(
            "/api/accounting/accounts",
            json=account_data,
            headers=auth_headers
        )
        assert create_response.status_code == 200
        created_account = create_response.json()
        
        # Get account by ID
        response = client.get(
            f"/api/accounting/accounts/{created_account['id']}",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        assert result["id"] == created_account["id"]
        assert result["account_code"] == "1300"
        assert result["account_name"] == "Equipment"
        assert result["description"] == "Office equipment and machinery"
    
    def test_accounts_update(self, client, auth_headers):
        """Test updating account"""
        # Create account
        account_data = {
            "account_code": "1400",
            "account_name": "Prepaid Expenses",
            "account_type": "asset"
        }
        
        create_response = client.post(
            "/api/accounting/accounts",
            json=account_data,
            headers=auth_headers
        )
        assert create_response.status_code == 200
        created_account = create_response.json()
        
        # Update account
        update_data = {
            "account_name": "Prepaid Insurance",
            "description": "Insurance premiums paid in advance"
        }
        
        response = client.put(
            f"/api/accounting/accounts/{created_account['id']}",
            json=update_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        assert result["account_name"] == "Prepaid Insurance"
        assert result["description"] == "Insurance premiums paid in advance"
        assert result["account_code"] == "1400"  # Should remain unchanged
    
    def test_journal_entries_create_simple(self, client, auth_headers):
        """Test creating a simple journal entry"""
        # First create accounts
        cash_account_data = {
            "account_code": "1001",
            "account_name": "Cash",
            "account_type": "asset"
        }
        
        revenue_account_data = {
            "account_code": "4001",
            "account_name": "Sales Revenue",
            "account_type": "revenue"
        }
        
        cash_response = client.post(
            "/api/accounting/accounts",
            json=cash_account_data,
            headers=auth_headers
        )
        assert cash_response.status_code == 200
        cash_account = cash_response.json()
        
        revenue_response = client.post(
            "/api/accounting/accounts",
            json=revenue_account_data,
            headers=auth_headers
        )
        assert revenue_response.status_code == 200
        revenue_account = revenue_response.json()
        
        # Create journal entry
        journal_entry_data = {
            "reference_number": "JE001",
            "description": "Cash sale",
            "entry_date": "2024-01-15",
            "lines": [
                {
                    "account_id": cash_account["id"],
                    "debit_amount": "1000.00",
                    "credit_amount": "0.00",
                    "description": "Cash received from sale"
                },
                {
                    "account_id": revenue_account["id"],
                    "debit_amount": "0.00",
                    "credit_amount": "1000.00",
                    "description": "Revenue from sale"
                }
            ]
        }
        
        response = client.post(
            "/api/accounting/journal-entries",
            json=journal_entry_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        assert result["reference_number"] == "JE001"
        assert result["description"] == "Cash sale"
        assert len(result["lines"]) == 2
        assert Decimal(result["total_debits"]) == Decimal("1000.00")
        assert Decimal(result["total_credits"]) == Decimal("1000.00")
        assert result["is_balanced"] is True
    
    def test_journal_entries_create_complex(self, client, auth_headers):
        """Test creating a complex journal entry with multiple lines"""
        # Create multiple accounts
        accounts_data = [
            {"account_code": "1001", "account_name": "Cash", "account_type": "asset"},
            {"account_code": "1200", "account_name": "Accounts Receivable", "account_type": "asset"},
            {"account_code": "4001", "account_name": "Sales Revenue", "account_type": "revenue"},
            {"account_code": "2301", "account_name": "Sales Tax Payable", "account_type": "liability"}
        ]
        
        created_accounts = {}
        for account_data in accounts_data:
            response = client.post(
                "/api/accounting/accounts",
                json=account_data,
                headers=auth_headers
            )
            assert response.status_code == 200
            account = response.json()
            created_accounts[account_data["account_code"]] = account
        
        # Create complex journal entry (mixed cash and credit sale with tax)
        journal_entry_data = {
            "reference_number": "JE002",
            "description": "Mixed sale with tax",
            "entry_date": "2024-01-16",
            "lines": [
                {
                    "account_id": created_accounts["1001"]["id"],  # Cash
                    "debit_amount": "500.00",
                    "credit_amount": "0.00",
                    "description": "Cash portion of sale"
                },
                {
                    "account_id": created_accounts["1200"]["id"],  # A/R
                    "debit_amount": "590.00",
                    "credit_amount": "0.00",
                    "description": "Credit portion of sale"
                },
                {
                    "account_id": created_accounts["4001"]["id"],  # Revenue
                    "debit_amount": "0.00",
                    "credit_amount": "1000.00",
                    "description": "Sales revenue"
                },
                {
                    "account_id": created_accounts["2301"]["id"],  # Tax
                    "debit_amount": "0.00",
                    "credit_amount": "90.00",
                    "description": "Sales tax collected"
                }
            ]
        }
        
        response = client.post(
            "/api/accounting/journal-entries",
            json=journal_entry_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        assert result["reference_number"] == "JE002"
        assert len(result["lines"]) == 4
        assert Decimal(result["total_debits"]) == Decimal("1090.00")
        assert Decimal(result["total_credits"]) == Decimal("1090.00")
        assert result["is_balanced"] is True
    
    def test_journal_entries_validation_unbalanced(self, client, auth_headers):
        """Test that unbalanced journal entries are rejected"""
        # Create accounts
        cash_account_data = {
            "account_code": "1001",
            "account_name": "Cash",
            "account_type": "asset"
        }
        
        revenue_account_data = {
            "account_code": "4001",
            "account_name": "Revenue",
            "account_type": "revenue"
        }
        
        cash_response = client.post(
            "/api/accounting/accounts",
            json=cash_account_data,
            headers=auth_headers
        )
        assert cash_response.status_code == 200
        cash_account = cash_response.json()
        
        revenue_response = client.post(
            "/api/accounting/accounts",
            json=revenue_account_data,
            headers=auth_headers
        )
        assert revenue_response.status_code == 200
        revenue_account = revenue_response.json()
        
        # Create unbalanced journal entry
        journal_entry_data = {
            "reference_number": "JE_UNBALANCED",
            "description": "Unbalanced entry",
            "entry_date": "2024-01-17",
            "lines": [
                {
                    "account_id": cash_account["id"],
                    "debit_amount": "1000.00",
                    "credit_amount": "0.00",
                    "description": "Cash debit"
                },
                {
                    "account_id": revenue_account["id"],
                    "debit_amount": "0.00",
                    "credit_amount": "500.00",  # Unbalanced - should be 1000
                    "description": "Revenue credit"
                }
            ]
        }
        
        response = client.post(
            "/api/accounting/journal-entries",
            json=journal_entry_data,
            headers=auth_headers
        )
        
        assert response.status_code == 400
        assert "not balanced" in response.json()["detail"].lower()
    
    def test_journal_entries_list(self, client, auth_headers):
        """Test listing journal entries"""
        # Create accounts first
        cash_account_data = {
            "account_code": "1001",
            "account_name": "Cash",
            "account_type": "asset"
        }
        
        revenue_account_data = {
            "account_code": "4001",
            "account_name": "Revenue",
            "account_type": "revenue"
        }
        
        cash_response = client.post(
            "/api/accounting/accounts",
            json=cash_account_data,
            headers=auth_headers
        )
        assert cash_response.status_code == 200
        cash_account = cash_response.json()
        
        revenue_response = client.post(
            "/api/accounting/accounts",
            json=revenue_account_data,
            headers=auth_headers
        )
        assert revenue_response.status_code == 200
        revenue_account = revenue_response.json()
        
        # Create multiple journal entries
        for i in range(3):
            journal_entry_data = {
                "reference_number": f"JE00{i+1}",
                "description": f"Test entry {i+1}",
                "entry_date": f"2024-01-{15+i:02d}",
                "lines": [
                    {
                        "account_id": cash_account["id"],
                        "debit_amount": f"{(i+1)*100}.00",
                        "credit_amount": "0.00",
                        "description": f"Cash debit {i+1}"
                    },
                    {
                        "account_id": revenue_account["id"],
                        "debit_amount": "0.00",
                        "credit_amount": f"{(i+1)*100}.00",
                        "description": f"Revenue credit {i+1}"
                    }
                ]
            }
            
            response = client.post(
                "/api/accounting/journal-entries",
                json=journal_entry_data,
                headers=auth_headers
            )
            assert response.status_code == 200
        
        # List journal entries
        response = client.get(
            "/api/accounting/journal-entries",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        assert len(result) >= 3
        
        # Verify entries are sorted by date (newest first by default)
        reference_numbers = [entry["reference_number"] for entry in result]
        assert "JE001" in reference_numbers
        assert "JE002" in reference_numbers
        assert "JE003" in reference_numbers
    
    def test_general_ledger(self, client, auth_headers):
        """Test general ledger functionality"""
        # Create accounts
        cash_account_data = {
            "account_code": "1001",
            "account_name": "Cash",
            "account_type": "asset"
        }
        
        revenue_account_data = {
            "account_code": "4001",
            "account_name": "Revenue",
            "account_type": "revenue"
        }
        
        cash_response = client.post(
            "/api/accounting/accounts",
            json=cash_account_data,
            headers=auth_headers
        )
        assert cash_response.status_code == 200
        cash_account = cash_response.json()
        
        revenue_response = client.post(
            "/api/accounting/accounts",
            json=revenue_account_data,
            headers=auth_headers
        )
        assert revenue_response.status_code == 200
        revenue_account = revenue_response.json()
        
        # Create journal entries to have transactions
        journal_entries = [
            {
                "reference_number": "GL001",
                "description": "Opening balance",
                "entry_date": "2024-01-01",
                "lines": [
                    {
                        "account_id": cash_account["id"],
                        "debit_amount": "5000.00",
                        "credit_amount": "0.00",
                        "description": "Opening cash balance"
                    },
                    {
                        "account_id": revenue_account["id"],
                        "debit_amount": "0.00",
                        "credit_amount": "5000.00",
                        "description": "Opening revenue"
                    }
                ]
            },
            {
                "reference_number": "GL002",
                "description": "Daily sales",
                "entry_date": "2024-01-15",
                "lines": [
                    {
                        "account_id": cash_account["id"],
                        "debit_amount": "1500.00",
                        "credit_amount": "0.00",
                        "description": "Cash from sales"
                    },
                    {
                        "account_id": revenue_account["id"],
                        "debit_amount": "0.00",
                        "credit_amount": "1500.00",
                        "description": "Sales revenue"
                    }
                ]
            }
        ]
        
        for entry_data in journal_entries:
            response = client.post(
                "/api/accounting/journal-entries",
                json=entry_data,
                headers=auth_headers
            )
            assert response.status_code == 200
        
        # Get general ledger for cash account
        response = client.get(
            f"/api/accounting/general-ledger?account_id={cash_account['id']}&start_date=2024-01-01&end_date=2024-01-31",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        assert result["account"]["id"] == cash_account["id"]
        assert result["account"]["account_name"] == "Cash"
        assert len(result["transactions"]) >= 2
        
        # Check running balance calculation
        assert Decimal(result["ending_balance"]) == Decimal("6500.00")  # 5000 + 1500
        
        # Verify transactions are in chronological order
        transaction_dates = [t["entry_date"] for t in result["transactions"]]
        assert transaction_dates == sorted(transaction_dates)
    
    def test_trial_balance(self, client, auth_headers):
        """Test trial balance report"""
        # Create a complete set of accounts
        accounts_data = [
            {"account_code": "1001", "account_name": "Cash", "account_type": "asset"},
            {"account_code": "1200", "account_name": "Accounts Receivable", "account_type": "asset"},
            {"account_code": "2001", "account_name": "Accounts Payable", "account_type": "liability"},
            {"account_code": "3001", "account_name": "Owner's Equity", "account_type": "equity"},
            {"account_code": "4001", "account_name": "Revenue", "account_type": "revenue"},
            {"account_code": "5001", "account_name": "Expenses", "account_type": "expense"}
        ]
        
        created_accounts = {}
        for account_data in accounts_data:
            response = client.post(
                "/api/accounting/accounts",
                json=account_data,
                headers=auth_headers
            )
            assert response.status_code == 200
            account = response.json()
            created_accounts[account_data["account_code"]] = account
        
        # Create journal entries to establish balances
        journal_entries = [
            {
                "reference_number": "TB001",
                "description": "Opening balances",
                "entry_date": "2024-01-01",
                "lines": [
                    {
                        "account_id": created_accounts["1001"]["id"],  # Cash
                        "debit_amount": "10000.00",
                        "credit_amount": "0.00"
                    },
                    {
                        "account_id": created_accounts["1200"]["id"],  # A/R
                        "debit_amount": "5000.00",
                        "credit_amount": "0.00"
                    },
                    {
                        "account_id": created_accounts["2001"]["id"],  # A/P
                        "debit_amount": "0.00",
                        "credit_amount": "3000.00"
                    },
                    {
                        "account_id": created_accounts["3001"]["id"],  # Equity
                        "debit_amount": "0.00",
                        "credit_amount": "12000.00"
                    }
                ]
            },
            {
                "reference_number": "TB002",
                "description": "Business transactions",
                "entry_date": "2024-01-15",
                "lines": [
                    {
                        "account_id": created_accounts["1001"]["id"],  # Cash
                        "debit_amount": "2000.00",
                        "credit_amount": "0.00"
                    },
                    {
                        "account_id": created_accounts["4001"]["id"],  # Revenue
                        "debit_amount": "0.00",
                        "credit_amount": "2000.00"
                    }
                ]
            },
            {
                "reference_number": "TB003",
                "description": "Expense payment",
                "entry_date": "2024-01-20",
                "lines": [
                    {
                        "account_id": created_accounts["5001"]["id"],  # Expenses
                        "debit_amount": "500.00",
                        "credit_amount": "0.00"
                    },
                    {
                        "account_id": created_accounts["1001"]["id"],  # Cash
                        "debit_amount": "0.00",
                        "credit_amount": "500.00"
                    }
                ]
            }
        ]
        
        for entry_data in journal_entries:
            response = client.post(
                "/api/accounting/journal-entries",
                json=entry_data,
                headers=auth_headers
            )
            assert response.status_code == 200
        
        # Get trial balance
        response = client.get(
            "/api/accounting/trial-balance?as_of_date=2024-01-31",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        assert result["as_of_date"] == "2024-01-31"
        assert len(result["accounts"]) >= 6
        
        # Verify trial balance is balanced
        assert Decimal(result["total_debits"]) == Decimal(result["total_credits"])
        
        # Check specific account balances
        account_balances = {acc["account_code"]: acc for acc in result["accounts"]}
        
        # Cash: 10000 + 2000 - 500 = 11500 (debit balance)
        assert Decimal(account_balances["1001"]["debit_balance"]) == Decimal("11500.00")
        
        # Revenue: 2000 (credit balance)
        assert Decimal(account_balances["4001"]["credit_balance"]) == Decimal("2000.00")
        
        # Expenses: 500 (debit balance)
        assert Decimal(account_balances["5001"]["debit_balance"]) == Decimal("500.00")
    
    def test_chart_of_accounts_hierarchy(self, client, auth_headers):
        """Test chart of accounts with parent-child relationships"""
        # Create parent account
        parent_account_data = {
            "account_code": "1000",
            "account_name": "Current Assets",
            "account_type": "asset",
            "description": "All current assets"
        }
        
        parent_response = client.post(
            "/api/accounting/accounts",
            json=parent_account_data,
            headers=auth_headers
        )
        assert parent_response.status_code == 200
        parent_account = parent_response.json()
        
        # Create child accounts
        child_accounts_data = [
            {
                "account_code": "1001",
                "account_name": "Cash in Hand",
                "account_type": "asset",
                "parent_account_id": parent_account["id"],
                "description": "Physical cash"
            },
            {
                "account_code": "1002",
                "account_name": "Bank Account",
                "account_type": "asset",
                "parent_account_id": parent_account["id"],
                "description": "Bank checking account"
            }
        ]
        
        created_children = []
        for child_data in child_accounts_data:
            response = client.post(
                "/api/accounting/accounts",
                json=child_data,
                headers=auth_headers
            )
            assert response.status_code == 200
            created_children.append(response.json())
        
        # Get chart of accounts hierarchy
        response = client.get(
            "/api/accounting/chart-of-accounts",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        # Find our parent account in the hierarchy
        current_assets = None
        for account in result["accounts"]:
            if account["account_code"] == "1000":
                current_assets = account
                break
        
        assert current_assets is not None
        assert len(current_assets["children"]) == 2
        
        # Verify child accounts are properly nested
        child_codes = [child["account_code"] for child in current_assets["children"]]
        assert "1001" in child_codes
        assert "1002" in child_codes
    
    def test_payment_methods_crud(self, client, auth_headers):
        """Test payment methods CRUD operations"""
        # Create payment method
        payment_method_data = {
            "name": "Credit Card",
            "description": "Visa/Mastercard payments",
            "is_active": True
        }
        
        create_response = client.post(
            "/api/accounting/payment-methods",
            json=payment_method_data,
            headers=auth_headers
        )
        
        assert create_response.status_code == 200
        created_method = create_response.json()
        
        assert created_method["name"] == "Credit Card"
        assert created_method["is_active"] is True
        
        # List payment methods
        list_response = client.get(
            "/api/accounting/payment-methods",
            headers=auth_headers
        )
        
        assert list_response.status_code == 200
        methods = list_response.json()
        
        assert len(methods) >= 1
        method_names = [method["name"] for method in methods]
        assert "Credit Card" in method_names
        
        # Update payment method
        update_data = {
            "description": "All major credit cards accepted",
            "is_active": False
        }
        
        update_response = client.put(
            f"/api/accounting/payment-methods/{created_method['id']}",
            json=update_data,
            headers=auth_headers
        )
        
        assert update_response.status_code == 200
        updated_method = update_response.json()
        
        assert updated_method["description"] == "All major credit cards accepted"
        assert updated_method["is_active"] is False
        assert updated_method["name"] == "Credit Card"  # Should remain unchanged
    
    def test_accounting_validation_errors(self, client, auth_headers):
        """Test accounting API validation errors"""
        # Test duplicate account code
        account_data = {
            "account_code": "DUPLICATE",
            "account_name": "First Account",
            "account_type": "asset"
        }
        
        # Create first account
        response1 = client.post(
            "/api/accounting/accounts",
            json=account_data,
            headers=auth_headers
        )
        assert response1.status_code == 200
        
        # Try to create duplicate
        duplicate_data = {
            "account_code": "DUPLICATE",
            "account_name": "Second Account",
            "account_type": "liability"
        }
        
        response2 = client.post(
            "/api/accounting/accounts",
            json=duplicate_data,
            headers=auth_headers
        )
        assert response2.status_code == 400
        assert "already exists" in response2.json()["detail"].lower()
        
        # Test invalid account type
        invalid_type_data = {
            "account_code": "INVALID",
            "account_name": "Invalid Account",
            "account_type": "invalid_type"
        }
        
        response3 = client.post(
            "/api/accounting/accounts",
            json=invalid_type_data,
            headers=auth_headers
        )
        assert response3.status_code == 400
    
    def test_accounting_permissions(self, client, auth_headers):
        """Test accounting permissions and access control"""
        # This test assumes proper permission middleware is in place
        # All operations should work with admin user
        
        account_data = {
            "account_code": "PERM001",
            "account_name": "Permission Test",
            "account_type": "asset"
        }
        
        response = client.post(
            "/api/accounting/accounts",
            json=account_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        
        # Test read access
        list_response = client.get(
            "/api/accounting/accounts",
            headers=auth_headers
        )
        
        assert list_response.status_code == 200