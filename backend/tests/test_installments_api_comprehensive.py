"""
Comprehensive Integration Tests for Installments API
Tests general installments and gold installments with real database
"""

import pytest
from fastapi.testclient import TestClient
from decimal import Decimal
import uuid
from datetime import datetime, date, timedelta

from app.main import app
from app.models.tenant import Tenant, TenantStatus, SubscriptionType
from app.models.user import User, UserRole, UserStatus
from app.models.customer import Customer, CustomerStatus, CustomerType
from app.models.product import Product
from app.models.invoice import Invoice, InvoiceType, InvoiceStatus
from app.core.auth import get_password_hash


class TestInstallmentsAPIComprehensive:
    """Comprehensive integration tests for Installments API"""
    
    @pytest.fixture
    def client(self):
        """Create test client"""
        return TestClient(app)
    
    @pytest.fixture
    def setup_installments_test_data(self, db_session):
        """Setup test data for installments tests"""
        # Create tenant
        tenant = Tenant(
            name="Installments Test Business",
            domain="installments-test.example.com",
            email="installments@test.com",
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
            email="installments@test.com",
            password_hash=get_password_hash("install123"),
            first_name="Installments",
            last_name="User",
            role=UserRole.ADMIN,
            status=UserStatus.ACTIVE
        )
        db_session.add(user)
        db_session.commit()
        
        # Create customers
        customers = []
        for i in range(3):
            customer = Customer(
                tenant_id=tenant.id,
                name=f"Installment Customer {i+1}",
                email=f"customer{i+1}@installments.test",
                phone=f"+123456789{i}",
                customer_type=CustomerType.INDIVIDUAL,
                status=CustomerStatus.ACTIVE,
                credit_limit=Decimal('50000')
            )
            customers.append(customer)
        
        db_session.add_all(customers)
        db_session.commit()
        
        # Create products
        general_product = Product(
            tenant_id=tenant.id,
            name="Installment General Product",
            sku="IGP001",
            selling_price=Decimal('5000.00'),
            cost_price=Decimal('3000.00'),
            stock_quantity=50
        )
        
        gold_product = Product(
            tenant_id=tenant.id,
            name="Installment Gold Ring",
            sku="IGR001",
            selling_price=Decimal('10000000.00'),
            cost_price=Decimal('8000000.00'),
            stock_quantity=10,
            is_gold_product=True,
            gold_purity=Decimal('18.000'),
            weight_per_unit=Decimal('20.000')
        )
        
        db_session.add_all([general_product, gold_product])
        db_session.commit()
        
        return {
            'tenant': tenant,
            'user': user,
            'customers': customers,
            'general_product': general_product,
            'gold_product': gold_product
        }
    
    @pytest.fixture
    def auth_headers(self, client, setup_installments_test_data):
        """Get authentication headers"""
        data = setup_installments_test_data
        
        login_data = {
            "email": data['user'].email,
            "password": "install123"
        }
        
        response = client.post("/api/auth/login", json=login_data)
        assert response.status_code == 200
        
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    @pytest.fixture
    def sample_general_invoice(self, client, auth_headers, setup_installments_test_data):
        """Create a sample general invoice for installment testing"""
        data = setup_installments_test_data
        customer = data['customers'][0]
        product = data['general_product']
        
        invoice_data = {
            "customer_id": str(customer.id),
            "invoice_type": "general",
            "items": [
                {
                    "product_id": str(product.id),
                    "description": "General product for installments",
                    "quantity": "2.000",
                    "unit_price": "5000.00"
                }
            ]
        }
        
        response = client.post(
            "/api/invoices/",
            json=invoice_data,
            headers=auth_headers
        )
        assert response.status_code == 200
        return response.json()
    
    @pytest.fixture
    def sample_gold_invoice(self, client, auth_headers, setup_installments_test_data):
        """Create a sample gold invoice for installment testing"""
        data = setup_installments_test_data
        customer = data['customers'][1]
        product = data['gold_product']
        
        invoice_data = {
            "customer_id": str(customer.id),
            "invoice_type": "gold",
            "gold_price_at_creation": "500000.00",
            "items": [
                {
                    "product_id": str(product.id),
                    "description": "Gold ring for installments",
                    "quantity": "1.000",
                    "unit_price": "10000000.00",
                    "weight": "20.000",
                    "labor_fee": "1000000.00",
                    "profit": "500000.00"
                }
            ]
        }
        
        response = client.post(
            "/api/invoices/",
            json=invoice_data,
            headers=auth_headers
        )
        assert response.status_code == 200
        return response.json()

    # ==================== GENERAL INSTALLMENTS TESTS ====================
    
    def test_create_general_installment_plan(self, client, auth_headers, sample_general_invoice):
        """Test creating a general installment plan"""
        invoice = sample_general_invoice
        
        plan_data = {
            "invoice_id": invoice["id"],
            "number_of_installments": 6,
            "start_date": "2024-02-01",
            "interval_days": 30,
            "interest_rate": "2.5"
        }
        
        response = client.post(
            "/api/installments/plans",
            json=plan_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        assert result["invoice_id"] == invoice["id"]
        assert result["installments_created"] == 6
        assert len(result["installments"]) == 6
        assert Decimal(result["total_amount"]) > Decimal("10000.00")  # Original + interest
        
        # Check installment details
        for i, installment in enumerate(result["installments"]):
            assert installment["installment_number"] == i + 1
            assert installment["status"] == "pending"
            assert Decimal(installment["amount_due"]) > Decimal("0")
            assert installment["remaining_amount"] == installment["amount_due"]
    
    def test_create_installment_plan_with_custom_intervals(self, client, auth_headers, sample_general_invoice):
        """Test creating installment plan with custom intervals"""
        invoice = sample_general_invoice
        
        plan_data = {
            "invoice_id": invoice["id"],
            "number_of_installments": 4,
            "start_date": "2024-02-15",
            "interval_days": 45,  # Every 45 days
            "interest_rate": "1.5"
        }
        
        response = client.post(
            "/api/installments/plans",
            json=plan_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        assert result["installments_created"] == 4
        
        # Check that due dates are 45 days apart
        installments = result["installments"]
        for i in range(1, len(installments)):
            prev_date = datetime.strptime(installments[i-1]["due_date"], "%Y-%m-%d").date()
            curr_date = datetime.strptime(installments[i]["due_date"], "%Y-%m-%d").date()
            assert (curr_date - prev_date).days == 45
    
    def test_get_installments_for_invoice(self, client, auth_headers, sample_general_invoice):
        """Test getting installments for a specific invoice"""
        invoice = sample_general_invoice
        
        # First create installment plan
        plan_data = {
            "invoice_id": invoice["id"],
            "number_of_installments": 3,
            "start_date": "2024-02-01",
            "interval_days": 30,
            "interest_rate": "2.0"
        }
        
        create_response = client.post(
            "/api/installments/plans",
            json=plan_data,
            headers=auth_headers
        )
        assert create_response.status_code == 200
        
        # Get installments for invoice
        response = client.get(
            f"/api/installments/invoice/{invoice['id']}",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        assert len(result) == 3
        for installment in result:
            assert installment["invoice_id"] == invoice["id"]
            assert installment["installment_type"] == "general"
            assert "due_date" in installment
            assert "amount_due" in installment
    
    def test_make_installment_payment(self, client, auth_headers, sample_general_invoice):
        """Test making a payment on an installment"""
        invoice = sample_general_invoice
        
        # Create installment plan
        plan_data = {
            "invoice_id": invoice["id"],
            "number_of_installments": 4,
            "start_date": "2024-02-01",
            "interval_days": 30,
            "interest_rate": "2.0"
        }
        
        create_response = client.post(
            "/api/installments/plans",
            json=plan_data,
            headers=auth_headers
        )
        assert create_response.status_code == 200
        plan = create_response.json()
        
        # Get first installment
        first_installment = plan["installments"][0]
        installment_id = first_installment["id"]
        amount_due = Decimal(first_installment["amount_due"])
        
        # Make full payment
        payment_data = {
            "amount": str(amount_due),
            "payment_method": "cash",
            "payment_date": "2024-02-01",
            "notes": "Full payment for first installment"
        }
        
        response = client.post(
            f"/api/installments/{installment_id}/payments",
            json=payment_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        assert result["installment_id"] == installment_id
        assert Decimal(result["amount"]) == amount_due
        assert result["payment_method"] == "cash"
        
        # Verify installment status updated
        get_response = client.get(
            f"/api/installments/invoice/{invoice['id']}",
            headers=auth_headers
        )
        assert get_response.status_code == 200
        installments = get_response.json()
        
        updated_installment = next(inst for inst in installments if inst["id"] == installment_id)
        assert updated_installment["status"] == "paid"
        assert Decimal(updated_installment["remaining_amount"]) == Decimal("0")
    
    def test_make_partial_installment_payment(self, client, auth_headers, sample_general_invoice):
        """Test making a partial payment on an installment"""
        invoice = sample_general_invoice
        
        # Create installment plan
        plan_data = {
            "invoice_id": invoice["id"],
            "number_of_installments": 3,
            "start_date": "2024-02-01",
            "interval_days": 30,
            "interest_rate": "1.5"
        }
        
        create_response = client.post(
            "/api/installments/plans",
            json=plan_data,
            headers=auth_headers
        )
        assert create_response.status_code == 200
        plan = create_response.json()
        
        # Get first installment
        first_installment = plan["installments"][0]
        installment_id = first_installment["id"]
        amount_due = Decimal(first_installment["amount_due"])
        partial_amount = amount_due / 2
        
        # Make partial payment
        payment_data = {
            "amount": str(partial_amount),
            "payment_method": "bank_transfer",
            "payment_date": "2024-02-01",
            "notes": "Partial payment"
        }
        
        response = client.post(
            f"/api/installments/{installment_id}/payments",
            json=payment_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        assert Decimal(result["amount"]) == partial_amount
        
        # Verify installment status
        get_response = client.get(
            f"/api/installments/invoice/{invoice['id']}",
            headers=auth_headers
        )
        assert get_response.status_code == 200
        installments = get_response.json()
        
        updated_installment = next(inst for inst in installments if inst["id"] == installment_id)
        assert updated_installment["status"] == "partially_paid"
        assert Decimal(updated_installment["remaining_amount"]) == amount_due - partial_amount
    
    def test_get_installment_payment_history(self, client, auth_headers, sample_general_invoice):
        """Test getting payment history for an installment"""
        invoice = sample_general_invoice
        
        # Create installment plan
        plan_data = {
            "invoice_id": invoice["id"],
            "number_of_installments": 2,
            "start_date": "2024-02-01",
            "interval_days": 30,
            "interest_rate": "1.0"
        }
        
        create_response = client.post(
            "/api/installments/plans",
            json=plan_data,
            headers=auth_headers
        )
        assert create_response.status_code == 200
        plan = create_response.json()
        
        installment_id = plan["installments"][0]["id"]
        
        # Make multiple payments
        payments = [
            {"amount": "1000.00", "payment_method": "cash", "notes": "First payment"},
            {"amount": "500.00", "payment_method": "card", "notes": "Second payment"}
        ]
        
        for payment_data in payments:
            payment_data["payment_date"] = "2024-02-01"
            response = client.post(
                f"/api/installments/{installment_id}/payments",
                json=payment_data,
                headers=auth_headers
            )
            assert response.status_code == 200
        
        # Get payment history
        response = client.get(
            f"/api/installments/{installment_id}/payments",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        assert len(result["payments"]) == 2
        assert result["total_paid"] == "1500.00"
        
        # Verify payment details
        payment_amounts = [Decimal(p["amount"]) for p in result["payments"]]
        assert Decimal("1000.00") in payment_amounts
        assert Decimal("500.00") in payment_amounts

    # ==================== GOLD INSTALLMENTS TESTS ====================
    
    def test_create_gold_installment_plan(self, client, auth_headers, sample_gold_invoice):
        """Test creating a gold installment plan"""
        invoice = sample_gold_invoice
        
        plan_data = {
            "invoice_id": invoice["id"],
            "installment_type": "gold",
            "number_of_installments": 10,
            "start_date": "2024-02-01",
            "interval_days": 30
        }
        
        response = client.post(
            "/api/gold-installments/plans",
            json=plan_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        assert result["invoice_id"] == invoice["id"]
        assert result["installment_type"] == "gold"
        assert result["installments_created"] == 10
        assert len(result["installments"]) == 10
        
        # Check gold-specific fields
        total_weight = Decimal(result["total_gold_weight"])
        assert total_weight == Decimal("20.000")  # From the gold product
        
        # Each installment should have weight allocation
        weight_per_installment = total_weight / 10
        for installment in result["installments"]:
            assert Decimal(installment["gold_weight_due"]) == weight_per_installment
            assert installment["installment_type"] == "gold"
    
    def test_make_gold_payment_with_gold(self, client, auth_headers, sample_gold_invoice):
        """Test making a gold payment using actual gold"""
        invoice = sample_gold_invoice
        
        # Create gold installment plan
        plan_data = {
            "invoice_id": invoice["id"],
            "installment_type": "gold",
            "number_of_installments": 5,
            "start_date": "2024-02-01",
            "interval_days": 30
        }
        
        create_response = client.post(
            "/api/gold-installments/plans",
            json=plan_data,
            headers=auth_headers
        )
        assert create_response.status_code == 200
        plan = create_response.json()
        
        # Get first installment
        first_installment = plan["installments"][0]
        installment_id = first_installment["id"]
        gold_weight_due = Decimal(first_installment["gold_weight_due"])
        
        # Make gold payment
        payment_data = {
            "payment_type": "gold",
            "gold_weight": str(gold_weight_due),
            "gold_price": "500000.00",  # Current gold price
            "gold_purity": "18.000",
            "payment_date": "2024-02-01",
            "notes": "Gold payment for first installment"
        }
        
        response = client.post(
            f"/api/gold-installments/{installment_id}/payments",
            json=payment_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        assert result["payment_type"] == "gold"
        assert Decimal(result["gold_weight"]) == gold_weight_due
        assert Decimal(result["gold_price"]) == Decimal("500000.00")
        
        # Verify installment status
        get_response = client.get(
            f"/api/gold-installments/invoice/{invoice['id']}",
            headers=auth_headers
        )
        assert get_response.status_code == 200
        installments = get_response.json()
        
        updated_installment = next(inst for inst in installments if inst["id"] == installment_id)
        assert updated_installment["status"] == "paid"
        assert Decimal(updated_installment["remaining_gold_weight"]) == Decimal("0")
    
    def test_make_gold_payment_with_cash(self, client, auth_headers, sample_gold_invoice):
        """Test making a gold payment using cash equivalent"""
        invoice = sample_gold_invoice
        
        # Create gold installment plan
        plan_data = {
            "invoice_id": invoice["id"],
            "installment_type": "gold",
            "number_of_installments": 4,
            "start_date": "2024-02-01",
            "interval_days": 30
        }
        
        create_response = client.post(
            "/api/gold-installments/plans",
            json=plan_data,
            headers=auth_headers
        )
        assert create_response.status_code == 200
        plan = create_response.json()
        
        # Get first installment
        first_installment = plan["installments"][0]
        installment_id = first_installment["id"]
        gold_weight_due = Decimal(first_installment["gold_weight_due"])
        
        # Calculate cash equivalent (weight * current gold price)
        current_gold_price = Decimal("500000.00")
        cash_equivalent = gold_weight_due * current_gold_price
        
        # Make cash payment
        payment_data = {
            "payment_type": "cash",
            "amount": str(cash_equivalent),
            "gold_price_at_payment": str(current_gold_price),
            "equivalent_gold_weight": str(gold_weight_due),
            "payment_method": "cash",
            "payment_date": "2024-02-01",
            "notes": "Cash payment equivalent to gold"
        }
        
        response = client.post(
            f"/api/gold-installments/{installment_id}/payments",
            json=payment_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        assert result["payment_type"] == "cash"
        assert Decimal(result["amount"]) == cash_equivalent
        assert Decimal(result["equivalent_gold_weight"]) == gold_weight_due
        
        # Verify installment status
        get_response = client.get(
            f"/api/gold-installments/invoice/{invoice['id']}",
            headers=auth_headers
        )
        assert get_response.status_code == 200
        installments = get_response.json()
        
        updated_installment = next(inst for inst in installments if inst["id"] == installment_id)
        assert updated_installment["status"] == "paid"
        assert Decimal(updated_installment["remaining_gold_weight"]) == Decimal("0")
    
    def test_mixed_gold_payments(self, client, auth_headers, sample_gold_invoice):
        """Test making mixed payments (partial gold + partial cash)"""
        invoice = sample_gold_invoice
        
        # Create gold installment plan
        plan_data = {
            "invoice_id": invoice["id"],
            "installment_type": "gold",
            "number_of_installments": 2,
            "start_date": "2024-02-01",
            "interval_days": 30
        }
        
        create_response = client.post(
            "/api/gold-installments/plans",
            json=plan_data,
            headers=auth_headers
        )
        assert create_response.status_code == 200
        plan = create_response.json()
        
        # Get first installment
        first_installment = plan["installments"][0]
        installment_id = first_installment["id"]
        total_gold_weight = Decimal(first_installment["gold_weight_due"])
        
        # Make partial gold payment (half the weight)
        partial_gold_weight = total_gold_weight / 2
        gold_payment_data = {
            "payment_type": "gold",
            "gold_weight": str(partial_gold_weight),
            "gold_price": "500000.00",
            "gold_purity": "18.000",
            "payment_date": "2024-02-01",
            "notes": "Partial gold payment"
        }
        
        response1 = client.post(
            f"/api/gold-installments/{installment_id}/payments",
            json=gold_payment_data,
            headers=auth_headers
        )
        assert response1.status_code == 200
        
        # Make cash payment for remaining weight
        remaining_weight = total_gold_weight - partial_gold_weight
        cash_equivalent = remaining_weight * Decimal("500000.00")
        
        cash_payment_data = {
            "payment_type": "cash",
            "amount": str(cash_equivalent),
            "gold_price_at_payment": "500000.00",
            "equivalent_gold_weight": str(remaining_weight),
            "payment_method": "bank_transfer",
            "payment_date": "2024-02-02",
            "notes": "Cash payment for remaining gold"
        }
        
        response2 = client.post(
            f"/api/gold-installments/{installment_id}/payments",
            json=cash_payment_data,
            headers=auth_headers
        )
        assert response2.status_code == 200
        
        # Verify installment is fully paid
        get_response = client.get(
            f"/api/gold-installments/invoice/{invoice['id']}",
            headers=auth_headers
        )
        assert get_response.status_code == 200
        installments = get_response.json()
        
        updated_installment = next(inst for inst in installments if inst["id"] == installment_id)
        assert updated_installment["status"] == "paid"
        assert Decimal(updated_installment["remaining_gold_weight"]) == Decimal("0")
        
        # Check payment history
        history_response = client.get(
            f"/api/gold-installments/{installment_id}/payments",
            headers=auth_headers
        )
        assert history_response.status_code == 200
        history = history_response.json()
        
        assert len(history["payments"]) == 2
        assert history["total_gold_weight_paid"] == str(total_gold_weight)

    # ==================== INSTALLMENT ANALYTICS AND REPORTS ====================
    
    def test_installment_statistics(self, client, auth_headers, sample_general_invoice, sample_gold_invoice):
        """Test installment statistics and analytics"""
        # Create multiple installment plans
        general_plan_data = {
            "invoice_id": sample_general_invoice["id"],
            "number_of_installments": 6,
            "start_date": "2024-02-01",
            "interval_days": 30,
            "interest_rate": "2.0"
        }
        
        gold_plan_data = {
            "invoice_id": sample_gold_invoice["id"],
            "installment_type": "gold",
            "number_of_installments": 8,
            "start_date": "2024-02-01",
            "interval_days": 30
        }
        
        # Create plans
        client.post("/api/installments/plans", json=general_plan_data, headers=auth_headers)
        client.post("/api/gold-installments/plans", json=gold_plan_data, headers=auth_headers)
        
        # Get statistics
        response = client.get(
            "/api/installments/statistics",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        assert result["total_installment_plans"] >= 2
        assert result["active_general_installments"] >= 6
        assert result["active_gold_installments"] >= 8
        assert "total_outstanding_amount" in result
        assert "total_outstanding_gold_weight" in result
    
    def test_overdue_installments(self, client, auth_headers, sample_general_invoice):
        """Test identifying overdue installments"""
        # Create installment plan with past due dates
        plan_data = {
            "invoice_id": sample_general_invoice["id"],
            "number_of_installments": 3,
            "start_date": "2024-01-01",  # Past date to create overdue installments
            "interval_days": 30,
            "interest_rate": "2.0"
        }
        
        create_response = client.post(
            "/api/installments/plans",
            json=plan_data,
            headers=auth_headers
        )
        assert create_response.status_code == 200
        
        # Get overdue installments
        response = client.get(
            "/api/installments/overdue",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        assert len(result["overdue_installments"]) >= 1
        
        for installment in result["overdue_installments"]:
            assert installment["is_overdue"] is True
            assert installment["days_overdue"] > 0
            assert installment["status"] in ["pending", "partially_paid"]
    
    def test_customer_installment_summary(self, client, auth_headers, setup_installments_test_data, sample_general_invoice):
        """Test getting installment summary for a specific customer"""
        data = setup_installments_test_data
        customer = data['customers'][0]
        
        # Create installment plan
        plan_data = {
            "invoice_id": sample_general_invoice["id"],
            "number_of_installments": 4,
            "start_date": "2024-02-01",
            "interval_days": 30,
            "interest_rate": "1.5"
        }
        
        create_response = client.post(
            "/api/installments/plans",
            json=plan_data,
            headers=auth_headers
        )
        assert create_response.status_code == 200
        
        # Get customer installment summary
        response = client.get(
            f"/api/installments/customer/{customer.id}/summary",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        assert result["customer_id"] == str(customer.id)
        assert result["total_installment_plans"] >= 1
        assert result["active_installments"] >= 4
        assert "total_outstanding_amount" in result
        assert "next_due_date" in result

    # ==================== BULK OPERATIONS ====================
    
    def test_bulk_payment_processing(self, client, auth_headers, sample_general_invoice):
        """Test bulk payment processing for multiple installments"""
        # Create installment plan
        plan_data = {
            "invoice_id": sample_general_invoice["id"],
            "number_of_installments": 5,
            "start_date": "2024-02-01",
            "interval_days": 30,
            "interest_rate": "2.0"
        }
        
        create_response = client.post(
            "/api/installments/plans",
            json=plan_data,
            headers=auth_headers
        )
        assert create_response.status_code == 200
        plan = create_response.json()
        
        # Prepare bulk payment data for first 3 installments
        installment_ids = [inst["id"] for inst in plan["installments"][:3]]
        
        bulk_payment_data = {
            "installment_ids": installment_ids,
            "payment_method": "bank_transfer",
            "payment_date": "2024-02-01",
            "notes": "Bulk payment for multiple installments"
        }
        
        response = client.post(
            "/api/installments/bulk-payment",
            json=bulk_payment_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        assert result["processed_payments"] == 3
        assert len(result["payment_details"]) == 3
        assert "total_amount_paid" in result
        
        # Verify installments are marked as paid
        get_response = client.get(
            f"/api/installments/invoice/{sample_general_invoice['id']}",
            headers=auth_headers
        )
        assert get_response.status_code == 200
        installments = get_response.json()
        
        paid_count = sum(1 for inst in installments if inst["status"] == "paid")
        assert paid_count == 3

    # ==================== ERROR HANDLING AND VALIDATION ====================
    
    def test_installment_validation_errors(self, client, auth_headers, sample_general_invoice):
        """Test installment validation errors"""
        # Test invalid number of installments
        invalid_plan_data = {
            "invoice_id": sample_general_invoice["id"],
            "number_of_installments": 0,  # Invalid
            "start_date": "2024-02-01",
            "interval_days": 30,
            "interest_rate": "2.0"
        }
        
        response = client.post(
            "/api/installments/plans",
            json=invalid_plan_data,
            headers=auth_headers
        )
        assert response.status_code == 400
        
        # Test invalid interest rate
        invalid_plan_data2 = {
            "invoice_id": sample_general_invoice["id"],
            "number_of_installments": 6,
            "start_date": "2024-02-01",
            "interval_days": 30,
            "interest_rate": "-1.0"  # Negative interest rate
        }
        
        response2 = client.post(
            "/api/installments/plans",
            json=invalid_plan_data2,
            headers=auth_headers
        )
        assert response2.status_code == 400
        
        # Test past start date
        invalid_plan_data3 = {
            "invoice_id": sample_general_invoice["id"],
            "number_of_installments": 6,
            "start_date": "2020-01-01",  # Too far in the past
            "interval_days": 30,
            "interest_rate": "2.0"
        }
        
        response3 = client.post(
            "/api/installments/plans",
            json=invalid_plan_data3,
            headers=auth_headers
        )
        # This might be allowed depending on business rules
        # assert response3.status_code == 400
    
    def test_payment_validation_errors(self, client, auth_headers, sample_general_invoice):
        """Test payment validation errors"""
        # Create installment plan first
        plan_data = {
            "invoice_id": sample_general_invoice["id"],
            "number_of_installments": 3,
            "start_date": "2024-02-01",
            "interval_days": 30,
            "interest_rate": "1.0"
        }
        
        create_response = client.post(
            "/api/installments/plans",
            json=plan_data,
            headers=auth_headers
        )
        assert create_response.status_code == 200
        plan = create_response.json()
        
        installment_id = plan["installments"][0]["id"]
        
        # Test negative payment amount
        invalid_payment_data = {
            "amount": "-100.00",  # Negative amount
            "payment_method": "cash",
            "payment_date": "2024-02-01"
        }
        
        response = client.post(
            f"/api/installments/{installment_id}/payments",
            json=invalid_payment_data,
            headers=auth_headers
        )
        assert response.status_code == 400
        
        # Test excessive payment amount
        excessive_payment_data = {
            "amount": "999999999.00",  # Excessive amount
            "payment_method": "cash",
            "payment_date": "2024-02-01"
        }
        
        response2 = client.post(
            f"/api/installments/{installment_id}/payments",
            json=excessive_payment_data,
            headers=auth_headers
        )
        # This might be allowed depending on business rules (overpayment)
        # assert response2.status_code == 400
    
    def test_installment_permissions(self, client, auth_headers):
        """Test installment permissions and access control"""
        # Test accessing non-existent installment
        non_existent_id = str(uuid.uuid4())
        
        response = client.get(
            f"/api/installments/{non_existent_id}/payments",
            headers=auth_headers
        )
        assert response.status_code == 404
        
        # Test making payment to non-existent installment
        payment_data = {
            "amount": "100.00",
            "payment_method": "cash",
            "payment_date": "2024-02-01"
        }
        
        response2 = client.post(
            f"/api/installments/{non_existent_id}/payments",
            json=payment_data,
            headers=auth_headers
        )
        assert response2.status_code == 404