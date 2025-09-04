"""
Unit tests for General Installment System Backend
Tests all requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7
"""

import pytest
from decimal import Decimal
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from fastapi.testclient import TestClient
import uuid

from app.main import app
from app.core.database import get_db
from app.models.tenant import Tenant
from app.models.user import User
from app.models.customer import Customer
from app.models.product import Product
from app.models.invoice import Invoice, InvoiceItem, InvoiceType, InvoiceStatus
from app.models.installment import Installment, InstallmentType, InstallmentStatus
from app.services.installment_service import InstallmentService
from app.core.auth import create_access_token
from tests.conftest import TestDatabase


class TestInstallmentService:
    """Test installment service functionality"""
    
    @pytest.fixture
    def db_session(self):
        """Create test database session"""
        test_db = TestDatabase()
        session = test_db.get_session()
        yield session
        session.close()
        test_db.cleanup()
    
    @pytest.fixture
    def tenant(self, db_session: Session):
        """Create test tenant"""
        from app.models.tenant import SubscriptionType
        tenant = Tenant(
            name="Test Business",
            domain="test.hesaabplus.com",
            email="test@business.com",
            subscription_type=SubscriptionType.PRO,
            is_active=True
        )
        db_session.add(tenant)
        db_session.commit()
        db_session.refresh(tenant)
        return tenant
    
    @pytest.fixture
    def user(self, db_session: Session, tenant: Tenant):
        """Create test user"""
        user = User(
            tenant_id=tenant.id,
            email="test@example.com",
            password_hash="hashed_password",
            role="admin",
            is_active=True
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
        return user
    
    @pytest.fixture
    def customer(self, db_session: Session, tenant: Tenant):
        """Create test customer"""
        customer = Customer(
            tenant_id=tenant.id,
            name="Test Customer",
            email="customer@example.com",
            phone="1234567890",
            is_active=True
        )
        db_session.add(customer)
        db_session.commit()
        db_session.refresh(customer)
        return customer
    
    @pytest.fixture
    def product(self, db_session: Session, tenant: Tenant):
        """Create test product"""
        product = Product(
            tenant_id=tenant.id,
            name="Test Product",
            description="Test product description",
            selling_price=Decimal('100.00'),
            stock_quantity=10,
            is_active=True
        )
        db_session.add(product)
        db_session.commit()
        db_session.refresh(product)
        return product
    
    @pytest.fixture
    def invoice(self, db_session: Session, tenant: Tenant, customer: Customer, product: Product):
        """Create test invoice"""
        invoice = Invoice(
            tenant_id=tenant.id,
            customer_id=customer.id,
            invoice_number="INV-2024-01-0001",
            invoice_type=InvoiceType.GENERAL,
            total_amount=Decimal('1000.00'),
            status=InvoiceStatus.DRAFT,
            is_active=True
        )
        db_session.add(invoice)
        db_session.flush()
        
        # Add invoice item
        item = InvoiceItem(
            invoice_id=invoice.id,
            product_id=product.id,
            description="Test Item",
            quantity=Decimal('10'),
            unit_price=Decimal('100.00'),
            line_total=Decimal('1000.00')
        )
        db_session.add(item)
        db_session.commit()
        db_session.refresh(invoice)
        return invoice
    
    def test_create_installment_plan_success(self, db_session: Session, tenant: Tenant, invoice: Invoice):
        """
        Test successful installment plan creation
        Requirements: 14.1, 14.2
        """
        service = InstallmentService(db_session)
        
        # Create installment plan
        installments = service.create_installment_plan(
            tenant_id=tenant.id,
            invoice_id=invoice.id,
            number_of_installments=4,
            start_date=datetime.utcnow(),
            interval_days=30
        )
        
        # Verify installments created
        assert len(installments) == 4
        
        # Verify installment details
        total_amount = sum(inst.amount_due for inst in installments)
        assert total_amount == invoice.total_amount
        
        # Verify installment sequence
        for i, installment in enumerate(installments):
            assert installment.installment_number == i + 1
            assert installment.installment_type == InstallmentType.GENERAL
            assert installment.status == InstallmentStatus.PENDING
            assert installment.amount_due == Decimal('250.00')  # 1000 / 4
            assert installment.amount_paid == Decimal('0')
        
        # Verify invoice updated
        db_session.refresh(invoice)
        assert invoice.is_installment is True
        assert invoice.installment_type == "general"
        assert invoice.remaining_balance == invoice.total_amount
    
    def test_create_installment_plan_with_interest(self, db_session: Session, tenant: Tenant, invoice: Invoice):
        """
        Test installment plan creation with interest
        Requirements: 14.1, 14.2
        """
        service = InstallmentService(db_session)
        
        # Create installment plan with 10% interest
        installments = service.create_installment_plan(
            tenant_id=tenant.id,
            invoice_id=invoice.id,
            number_of_installments=2,
            interest_rate=Decimal('10.0')
        )
        
        # Verify total with interest
        total_amount = sum(inst.amount_due for inst in installments)
        expected_total = invoice.total_amount * Decimal('1.1')  # 1000 * 1.1 = 1100
        assert total_amount == expected_total
        
        # Each installment should be 550
        for installment in installments:
            assert installment.amount_due == Decimal('550.00')
    
    def test_create_installment_plan_invalid_invoice(self, db_session: Session, tenant: Tenant):
        """Test installment plan creation with invalid invoice"""
        service = InstallmentService(db_session)
        
        with pytest.raises(Exception) as exc_info:
            service.create_installment_plan(
                tenant_id=tenant.id,
                invoice_id=uuid.uuid4(),  # Non-existent invoice
                number_of_installments=4
            )
        
        assert "Invoice not found" in str(exc_info.value)
    
    def test_create_installment_plan_already_has_installments(self, db_session: Session, tenant: Tenant, invoice: Invoice):
        """Test installment plan creation when invoice already has installments"""
        service = InstallmentService(db_session)
        
        # Create first installment plan
        service.create_installment_plan(
            tenant_id=tenant.id,
            invoice_id=invoice.id,
            number_of_installments=2
        )
        
        # Try to create another plan
        with pytest.raises(Exception) as exc_info:
            service.create_installment_plan(
                tenant_id=tenant.id,
                invoice_id=invoice.id,
                number_of_installments=3
            )
        
        assert "already has installments" in str(exc_info.value)
    
    def test_record_payment_success(self, db_session: Session, tenant: Tenant, invoice: Invoice):
        """
        Test successful payment recording
        Requirements: 14.3, 14.4
        """
        service = InstallmentService(db_session)
        
        # Create installment plan
        installments = service.create_installment_plan(
            tenant_id=tenant.id,
            invoice_id=invoice.id,
            number_of_installments=4
        )
        
        first_installment = installments[0]
        
        # Record payment
        updated_installment = service.record_payment(
            tenant_id=tenant.id,
            installment_id=first_installment.id,
            payment_amount=Decimal('250.00'),
            payment_method="cash",
            payment_reference="REF123",
            notes="Full payment"
        )
        
        # Verify payment recorded
        assert updated_installment.amount_paid == Decimal('250.00')
        assert updated_installment.status == InstallmentStatus.PAID
        assert updated_installment.payment_method == "cash"
        assert updated_installment.payment_reference == "REF123"
        assert updated_installment.paid_at is not None
        assert updated_installment.is_fully_paid is True
        
        # Verify invoice payment updated
        db_session.refresh(invoice)
        assert invoice.paid_amount == Decimal('250.00')
    
    def test_record_partial_payment(self, db_session: Session, tenant: Tenant, invoice: Invoice):
        """
        Test partial payment recording
        Requirements: 14.3, 14.4
        """
        service = InstallmentService(db_session)
        
        # Create installment plan
        installments = service.create_installment_plan(
            tenant_id=tenant.id,
            invoice_id=invoice.id,
            number_of_installments=4
        )
        
        first_installment = installments[0]
        
        # Record partial payment
        updated_installment = service.record_payment(
            tenant_id=tenant.id,
            installment_id=first_installment.id,
            payment_amount=Decimal('100.00')
        )
        
        # Verify partial payment
        assert updated_installment.amount_paid == Decimal('100.00')
        assert updated_installment.status == InstallmentStatus.PENDING
        assert updated_installment.remaining_amount == Decimal('150.00')
        assert updated_installment.is_fully_paid is False
    
    def test_record_payment_exceeds_balance(self, db_session: Session, tenant: Tenant, invoice: Invoice):
        """Test payment recording that exceeds remaining balance"""
        service = InstallmentService(db_session)
        
        # Create installment plan
        installments = service.create_installment_plan(
            tenant_id=tenant.id,
            invoice_id=invoice.id,
            number_of_installments=4
        )
        
        first_installment = installments[0]
        
        # Try to record payment exceeding balance
        with pytest.raises(Exception) as exc_info:
            service.record_payment(
                tenant_id=tenant.id,
                installment_id=first_installment.id,
                payment_amount=Decimal('300.00')  # Exceeds 250.00 balance
            )
        
        assert "exceeds remaining balance" in str(exc_info.value)
    
    def test_get_outstanding_balance(self, db_session: Session, tenant: Tenant, invoice: Invoice):
        """
        Test outstanding balance calculation
        Requirements: 14.4
        """
        service = InstallmentService(db_session)
        
        # Create installment plan
        installments = service.create_installment_plan(
            tenant_id=tenant.id,
            invoice_id=invoice.id,
            number_of_installments=4
        )
        
        # Record payment on first installment
        service.record_payment(
            tenant_id=tenant.id,
            installment_id=installments[0].id,
            payment_amount=Decimal('250.00')
        )
        
        # Get outstanding balance
        balance_info = service.get_outstanding_balance(
            tenant_id=tenant.id,
            invoice_id=invoice.id
        )
        
        # Verify balance information
        assert balance_info['total_installments'] == 4
        assert balance_info['total_due'] == Decimal('1000.00')
        assert balance_info['total_paid'] == Decimal('250.00')
        assert balance_info['outstanding_balance'] == Decimal('750.00')
        assert balance_info['paid_installments'] == 1
        assert balance_info['pending_installments'] == 3
        assert balance_info['overdue_installments'] == 0
        assert balance_info['is_fully_paid'] is False
        
        # Verify next due installment
        next_due = balance_info['next_due_installment']
        assert next_due is not None
        assert next_due['installment_number'] == 2
        assert next_due['amount_due'] == Decimal('250.00')
    
    def test_get_overdue_installments(self, db_session: Session, tenant: Tenant, invoice: Invoice):
        """
        Test overdue installment detection
        Requirements: 14.5
        """
        service = InstallmentService(db_session)
        
        # Create installment plan with past due dates
        past_date = datetime.utcnow() - timedelta(days=10)
        installments = service.create_installment_plan(
            tenant_id=tenant.id,
            invoice_id=invoice.id,
            number_of_installments=3,
            start_date=past_date,
            interval_days=5
        )
        
        # Get overdue installments
        overdue_installments = service.get_overdue_installments(tenant_id=tenant.id)
        
        # Should have 2 overdue installments (first two are past due)
        assert len(overdue_installments) >= 2
        
        # Verify overdue status updated
        for installment in overdue_installments:
            if installment.invoice_id == invoice.id:
                assert installment.status == InstallmentStatus.OVERDUE
                assert installment.is_overdue is True
                assert installment.days_overdue > 0
    
    def test_update_overdue_status(self, db_session: Session, tenant: Tenant, invoice: Invoice):
        """
        Test overdue status update
        Requirements: 14.5
        """
        service = InstallmentService(db_session)
        
        # Create installment plan with past due dates
        past_date = datetime.utcnow() - timedelta(days=5)
        installments = service.create_installment_plan(
            tenant_id=tenant.id,
            invoice_id=invoice.id,
            number_of_installments=2,
            start_date=past_date,
            interval_days=2
        )
        
        # Update overdue status
        count = service.update_overdue_status(tenant_id=tenant.id)
        
        # Verify count and status
        assert count >= 1  # At least first installment should be overdue
        
        # Check installment status
        db_session.refresh(installments[0])
        assert installments[0].status == InstallmentStatus.OVERDUE
    
    def test_invoice_completion_detection(self, db_session: Session, tenant: Tenant, invoice: Invoice):
        """
        Test invoice completion when all installments are paid
        Requirements: 14.6
        """
        service = InstallmentService(db_session)
        
        # Create installment plan
        installments = service.create_installment_plan(
            tenant_id=tenant.id,
            invoice_id=invoice.id,
            number_of_installments=2
        )
        
        # Pay all installments
        for installment in installments:
            service.record_payment(
                tenant_id=tenant.id,
                installment_id=installment.id,
                payment_amount=installment.amount_due
            )
        
        # Verify invoice marked as paid
        db_session.refresh(invoice)
        assert invoice.status == InvoiceStatus.PAID
        assert invoice.remaining_balance == Decimal('0')
        assert invoice.is_paid is True
    
    def test_get_payment_history(self, db_session: Session, tenant: Tenant, invoice: Invoice):
        """
        Test payment history retrieval
        Requirements: 14.4
        """
        service = InstallmentService(db_session)
        
        # Create installment plan
        installments = service.create_installment_plan(
            tenant_id=tenant.id,
            invoice_id=invoice.id,
            number_of_installments=3
        )
        
        # Record payments
        service.record_payment(
            tenant_id=tenant.id,
            installment_id=installments[0].id,
            payment_amount=Decimal('333.33'),
            payment_method="cash"
        )
        
        service.record_payment(
            tenant_id=tenant.id,
            installment_id=installments[1].id,
            payment_amount=Decimal('200.00'),
            payment_method="card"
        )
        
        # Get payment history
        payment_history = service.get_payment_history(
            tenant_id=tenant.id,
            invoice_id=invoice.id
        )
        
        # Verify payment history
        assert len(payment_history) == 2
        
        # Verify payment details
        payments_by_method = {p['payment_method']: p for p in payment_history}
        assert 'cash' in payments_by_method
        assert 'card' in payments_by_method
        assert payments_by_method['cash']['amount_paid'] == Decimal('333.33')
        assert payments_by_method['card']['amount_paid'] == Decimal('200.00')
    
    def test_cancel_installment_plan(self, db_session: Session, tenant: Tenant, invoice: Invoice):
        """Test installment plan cancellation"""
        service = InstallmentService(db_session)
        
        # Create installment plan
        installments = service.create_installment_plan(
            tenant_id=tenant.id,
            invoice_id=invoice.id,
            number_of_installments=3
        )
        
        # Cancel installment plan
        success = service.cancel_installment_plan(
            tenant_id=tenant.id,
            invoice_id=invoice.id,
            reason="Customer request"
        )
        
        # Verify cancellation
        assert success is True
        
        # Verify installments cancelled
        for installment in installments:
            db_session.refresh(installment)
            assert installment.status == InstallmentStatus.CANCELLED
        
        # Verify invoice updated
        db_session.refresh(invoice)
        assert invoice.is_installment is False
        assert invoice.installment_type is None
        assert invoice.remaining_balance is None
    
    def test_cancel_installment_plan_with_payments(self, db_session: Session, tenant: Tenant, invoice: Invoice):
        """Test installment plan cancellation with existing payments"""
        service = InstallmentService(db_session)
        
        # Create installment plan
        installments = service.create_installment_plan(
            tenant_id=tenant.id,
            invoice_id=invoice.id,
            number_of_installments=2
        )
        
        # Record payment
        service.record_payment(
            tenant_id=tenant.id,
            installment_id=installments[0].id,
            payment_amount=Decimal('100.00')
        )
        
        # Try to cancel with payments
        with pytest.raises(Exception) as exc_info:
            service.cancel_installment_plan(
                tenant_id=tenant.id,
                invoice_id=invoice.id
            )
        
        assert "existing payments" in str(exc_info.value)
    
    def test_get_installment_statistics(self, db_session: Session, tenant: Tenant, invoice: Invoice):
        """Test installment statistics calculation"""
        service = InstallmentService(db_session)
        
        # Create installment plan
        installments = service.create_installment_plan(
            tenant_id=tenant.id,
            invoice_id=invoice.id,
            number_of_installments=4
        )
        
        # Record some payments
        service.record_payment(
            tenant_id=tenant.id,
            installment_id=installments[0].id,
            payment_amount=Decimal('250.00')
        )
        
        # Get statistics
        stats = service.get_installment_statistics(tenant_id=tenant.id)
        
        # Verify statistics
        assert stats['total_installments'] == 4
        assert stats['paid_installments'] == 1
        assert stats['pending_installments'] == 3
        assert stats['installment_invoices'] == 1
        assert stats['total_due'] == Decimal('1000.00')
        assert stats['total_paid'] == Decimal('250.00')
        assert stats['outstanding_balance'] == Decimal('750.00')
        assert stats['collection_rate'] == Decimal('25.0')  # 250/1000 * 100


class TestInstallmentAPI:
    """Test installment API endpoints"""
    
    @pytest.fixture
    def client(self):
        """Create test client"""
        return TestClient(app)
    
    @pytest.fixture
    def db_session(self):
        """Create test database session"""
        test_db = TestDatabase()
        session = test_db.get_session()
        
        # Override dependency
        def override_get_db():
            try:
                yield session
            finally:
                pass
        
        app.dependency_overrides[get_db] = override_get_db
        yield session
        session.close()
        test_db.cleanup()
        app.dependency_overrides.clear()
    
    @pytest.fixture
    def auth_headers(self, db_session: Session):
        """Create authentication headers"""
        # Create tenant and user
        from app.models.tenant import SubscriptionType
        tenant = Tenant(
            name="API Test Business",
            domain="api-test.hesaabplus.com",
            email="api-test@business.com",
            subscription_type=SubscriptionType.PRO,
            is_active=True
        )
        db_session.add(tenant)
        db_session.commit()
        db_session.refresh(tenant)
        
        user = User(
            tenant_id=tenant.id,
            email="api-test@example.com",
            password_hash="hashed_password",
            role="admin",
            is_active=True
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
        
        # Create access token
        token = create_access_token(
            data={
                "user_id": str(user.id),
                "tenant_id": str(tenant.id),
                "email": user.email
            }
        )
        
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }, tenant, user
    
    @pytest.fixture
    def test_invoice(self, db_session: Session, auth_headers):
        """Create test invoice for API tests"""
        headers, tenant, user = auth_headers
        
        # Create customer
        customer = Customer(
            tenant_id=tenant.id,
            name="API Test Customer",
            email="api-customer@example.com",
            is_active=True
        )
        db_session.add(customer)
        db_session.commit()
        db_session.refresh(customer)
        
        # Create invoice
        invoice = Invoice(
            tenant_id=tenant.id,
            customer_id=customer.id,
            invoice_number="API-INV-001",
            invoice_type=InvoiceType.GENERAL,
            total_amount=Decimal('2000.00'),
            status=InvoiceStatus.DRAFT,
            is_active=True
        )
        db_session.add(invoice)
        db_session.commit()
        db_session.refresh(invoice)
        
        return invoice, customer
    
    def test_create_installment_plan_api(self, client: TestClient, db_session: Session, auth_headers, test_invoice):
        """Test installment plan creation via API"""
        headers, tenant, user = auth_headers
        invoice, customer = test_invoice
        
        # Create installment plan
        response = client.post(
            "/api/installments/plans",
            headers=headers,
            json={
                "invoice_id": str(invoice.id),
                "number_of_installments": 5,
                "interval_days": 30
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response
        assert data["invoice_id"] == str(invoice.id)
        assert data["installments_created"] == 5
        assert data["total_amount"] == "2000.00"
        assert len(data["installments"]) == 5
        
        # Verify each installment
        for i, installment in enumerate(data["installments"]):
            assert installment["installment_number"] == i + 1
            assert installment["status"] == "pending"
            assert installment["amount_due"] == "400.00"  # 2000 / 5
    
    def test_record_payment_api(self, client: TestClient, db_session: Session, auth_headers, test_invoice):
        """Test payment recording via API"""
        headers, tenant, user = auth_headers
        invoice, customer = test_invoice
        
        # First create installment plan
        plan_response = client.post(
            "/api/installments/plans",
            headers=headers,
            json={
                "invoice_id": str(invoice.id),
                "number_of_installments": 3,
                "interval_days": 30
            }
        )
        
        assert plan_response.status_code == 200
        installments = plan_response.json()["installments"]
        first_installment_id = installments[0]["id"]
        
        # Record payment
        payment_response = client.post(
            "/api/installments/payments",
            headers=headers,
            json={
                "installment_id": first_installment_id,
                "payment_amount": "666.67",
                "payment_method": "bank_transfer",
                "payment_reference": "TXN123456",
                "notes": "API test payment"
            }
        )
        
        assert payment_response.status_code == 200
        data = payment_response.json()
        
        # Verify payment response
        assert data["message"] == "Payment recorded successfully"
        assert data["installment"]["amount_paid"] == "666.67"
        assert data["installment"]["payment_method"] == "bank_transfer"
        assert data["installment"]["status"] == "paid"
        
        # Verify outstanding balance
        balance = data["outstanding_balance"]
        assert balance["total_paid"] == "666.67"
        assert balance["outstanding_balance"] == "1333.33"
        assert balance["paid_installments"] == 1
    
    def test_get_overdue_installments_api(self, client: TestClient, db_session: Session, auth_headers, test_invoice):
        """Test overdue installments retrieval via API"""
        headers, tenant, user = auth_headers
        invoice, customer = test_invoice
        
        # Create installment plan with past due dates
        service = InstallmentService(db_session)
        past_date = datetime.utcnow() - timedelta(days=10)
        service.create_installment_plan(
            tenant_id=tenant.id,
            invoice_id=invoice.id,
            number_of_installments=2,
            start_date=past_date,
            interval_days=5
        )
        
        # Get overdue installments
        response = client.get(
            "/api/installments/overdue",
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Should have overdue installments
        assert len(data) >= 1
        
        # Verify overdue properties
        for installment in data:
            if installment["invoice_id"] == str(invoice.id):
                assert installment["is_overdue"] is True
                assert installment["days_overdue"] > 0
                assert installment["status"] == "overdue"
    
    def test_get_installment_statistics_api(self, client: TestClient, db_session: Session, auth_headers, test_invoice):
        """Test installment statistics via API"""
        headers, tenant, user = auth_headers
        invoice, customer = test_invoice
        
        # Create installment plan
        service = InstallmentService(db_session)
        installments = service.create_installment_plan(
            tenant_id=tenant.id,
            invoice_id=invoice.id,
            number_of_installments=4
        )
        
        # Record payment
        service.record_payment(
            tenant_id=tenant.id,
            installment_id=installments[0].id,
            payment_amount=Decimal('500.00')
        )
        
        # Get statistics
        response = client.get(
            "/api/installments/statistics",
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify statistics
        assert data["total_installments"] == 4
        assert data["paid_installments"] == 1
        assert data["pending_installments"] == 3
        assert data["total_due"] == "2000.00"
        assert data["total_paid"] == "500.00"
        assert data["outstanding_balance"] == "1500.00"
        assert data["collection_rate"] == "25.0"
    
    def test_api_authentication_required(self, client: TestClient):
        """Test that API endpoints require authentication"""
        # Try to access without authentication
        response = client.get("/api/installments/statistics")
        assert response.status_code == 401
        
        response = client.post(
            "/api/installments/plans",
            json={"invoice_id": str(uuid.uuid4()), "number_of_installments": 2}
        )
        assert response.status_code == 401
    
    def test_tenant_isolation(self, client: TestClient, db_session: Session):
        """Test that tenants can only access their own installments"""
        # Create two tenants with users
        tenant1 = Tenant(name="Tenant 1", email="tenant1@test.com", is_active=True)
        tenant2 = Tenant(name="Tenant 2", email="tenant2@test.com", is_active=True)
        db_session.add_all([tenant1, tenant2])
        db_session.commit()
        
        user1 = User(tenant_id=tenant1.id, email="user1@test.com", password_hash="hash", is_active=True)
        user2 = User(tenant_id=tenant2.id, email="user2@test.com", password_hash="hash", is_active=True)
        db_session.add_all([user1, user2])
        db_session.commit()
        
        # Create tokens
        token1 = create_access_token(data={"user_id": str(user1.id), "tenant_id": str(tenant1.id)})
        token2 = create_access_token(data={"user_id": str(user2.id), "tenant_id": str(tenant2.id)})
        
        headers1 = {"Authorization": f"Bearer {token1}"}
        headers2 = {"Authorization": f"Bearer {token2}"}
        
        # Create invoice for tenant1
        customer1 = Customer(tenant_id=tenant1.id, name="Customer 1", is_active=True)
        db_session.add(customer1)
        db_session.commit()
        
        invoice1 = Invoice(
            tenant_id=tenant1.id,
            customer_id=customer1.id,
            invoice_number="T1-INV-001",
            invoice_type=InvoiceType.GENERAL,
            total_amount=Decimal('1000.00'),
            is_active=True
        )
        db_session.add(invoice1)
        db_session.commit()
        
        # Tenant1 creates installment plan
        response = client.post(
            "/api/installments/plans",
            headers=headers1,
            json={
                "invoice_id": str(invoice1.id),
                "number_of_installments": 2
            }
        )
        assert response.status_code == 200
        
        # Tenant2 tries to access tenant1's installments
        response = client.get(
            f"/api/installments/invoice/{invoice1.id}",
            headers=headers2
        )
        assert response.status_code == 404  # Should not find invoice for different tenant