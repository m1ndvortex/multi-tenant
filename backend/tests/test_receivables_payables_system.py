"""
Unit tests for Receivables and Payables system
"""

import pytest
from decimal import Decimal
from datetime import datetime, timedelta
from uuid import uuid4
from sqlalchemy.orm import Session

from app.models.supplier import Supplier
from app.models.accounting import SupplierBill, SupplierPayment, CustomerPayment, PaymentMatching
from app.models.customer import Customer
from app.models.invoice import Invoice
from app.models.accounting import PaymentMethod
from app.services.receivables_payables_service import ReceivablesPayablesService
from app.schemas.receivables_payables import (
    SupplierCreate, SupplierUpdate, SupplierBillCreate, SupplierPaymentCreate,
    CustomerPaymentCreate, CustomerPaymentMatchingCreate, SupplierPaymentMatchingCreate,
    ReceivablesPayablesFilter, PaymentStatusEnum, MatchTypeEnum
)
from app.core.exceptions import ValidationError, NotFoundError, BusinessLogicError


class TestSupplierManagement:
    """Test supplier CRUD operations"""

    def test_create_supplier_success(self, db_session: Session, test_tenant):
        """Test successful supplier creation"""
        service = ReceivablesPayablesService(db_session)
        
        supplier_data = SupplierCreate(
            name="Test Supplier",
            company_name="Test Company Ltd",
            email="supplier@test.com",
            phone="+1234567890",
            address="123 Test Street",
            city="Test City",
            payment_terms_days=30
        )
        
        result = service.create_supplier(test_tenant.id, supplier_data)
        
        assert result.name == "Test Supplier"
        assert result.company_name == "Test Company Ltd"
        assert result.email == "supplier@test.com"
        assert result.payment_terms_days == 30
        assert result.total_payable == Decimal('0.00')
        assert result.is_active is True

    def test_create_supplier_duplicate_name(self, db_session: Session, test_tenant):
        """Test creating supplier with duplicate name fails"""
        service = ReceivablesPayablesService(db_session)
        
        # Create first supplier
        supplier_data = SupplierCreate(name="Duplicate Supplier")
        service.create_supplier(test_tenant.id, supplier_data)
        
        # Try to create duplicate
        with pytest.raises(ValidationError, match="already exists"):
            service.create_supplier(test_tenant.id, supplier_data)

    def test_get_supplier_success(self, db_session: Session, test_tenant):
        """Test successful supplier retrieval"""
        service = ReceivablesPayablesService(db_session)
        
        # Create supplier
        supplier_data = SupplierCreate(name="Get Test Supplier")
        created = service.create_supplier(test_tenant.id, supplier_data)
        
        # Get supplier
        result = service.get_supplier(test_tenant.id, created.id)
        
        assert result.id == created.id
        assert result.name == "Get Test Supplier"

    def test_get_supplier_not_found(self, db_session: Session, test_tenant):
        """Test getting non-existent supplier fails"""
        service = ReceivablesPayablesService(db_session)
        
        with pytest.raises(NotFoundError, match="Supplier not found"):
            service.get_supplier(test_tenant.id, uuid4())

    def test_update_supplier_success(self, db_session: Session, test_tenant):
        """Test successful supplier update"""
        service = ReceivablesPayablesService(db_session)
        
        # Create supplier
        supplier_data = SupplierCreate(name="Update Test Supplier")
        created = service.create_supplier(test_tenant.id, supplier_data)
        
        # Update supplier
        update_data = SupplierUpdate(
            name="Updated Supplier Name",
            email="updated@test.com",
            payment_terms_days=45
        )
        result = service.update_supplier(test_tenant.id, created.id, update_data)
        
        assert result.name == "Updated Supplier Name"
        assert result.email == "updated@test.com"
        assert result.payment_terms_days == 45

    def test_delete_supplier_success(self, db_session: Session, test_tenant):
        """Test successful supplier deletion"""
        service = ReceivablesPayablesService(db_session)
        
        # Create supplier
        supplier_data = SupplierCreate(name="Delete Test Supplier")
        created = service.create_supplier(test_tenant.id, supplier_data)
        
        # Delete supplier
        result = service.delete_supplier(test_tenant.id, created.id)
        
        assert result is True
        
        # Verify supplier is soft deleted
        with pytest.raises(NotFoundError):
            service.get_supplier(test_tenant.id, created.id)

    def test_delete_supplier_with_outstanding_bills(self, db_session: Session, test_tenant):
        """Test deleting supplier with outstanding bills fails"""
        service = ReceivablesPayablesService(db_session)
        
        # Create supplier
        supplier_data = SupplierCreate(name="Supplier with Bills")
        supplier = service.create_supplier(test_tenant.id, supplier_data)
        
        # Create outstanding bill
        bill = SupplierBill(
            tenant_id=test_tenant.id,
            supplier_id=supplier.id,
            bill_number="BILL001",
            subtotal=Decimal('100.00'),
            total_amount=Decimal('100.00'),
            bill_date=datetime.now(),
            due_date=datetime.now() + timedelta(days=30),
            status="pending"
        )
        db_session.add(bill)
        db_session.commit()
        
        # Try to delete supplier
        with pytest.raises(BusinessLogicError, match="outstanding bills"):
            service.delete_supplier(test_tenant.id, supplier.id)


class TestSupplierBillManagement:
    """Test supplier bill operations"""

    def test_create_supplier_bill_success(self, db_session: Session, test_tenant):
        """Test successful supplier bill creation"""
        service = ReceivablesPayablesService(db_session)
        
        # Create supplier
        supplier_data = SupplierCreate(name="Bill Test Supplier")
        supplier = service.create_supplier(test_tenant.id, supplier_data)
        
        # Create bill
        bill_data = SupplierBillCreate(
            bill_number="BILL001",
            supplier_id=supplier.id,
            subtotal=Decimal('100.00'),
            tax_amount=Decimal('10.00'),
            total_amount=Decimal('110.00'),
            bill_date=datetime.now(),
            due_date=datetime.now() + timedelta(days=30),
            description="Test bill"
        )
        
        result = service.create_supplier_bill(test_tenant.id, bill_data)
        
        assert result.bill_number == "BILL001"
        assert result.supplier_id == supplier.id
        assert result.total_amount == Decimal('110.00')
        assert result.paid_amount == Decimal('0.00')
        assert result.remaining_amount == Decimal('110.00')
        assert result.status == PaymentStatusEnum.PENDING

    def test_create_supplier_bill_duplicate_number(self, db_session: Session, test_tenant):
        """Test creating bill with duplicate number for same supplier fails"""
        service = ReceivablesPayablesService(db_session)
        
        # Create supplier
        supplier_data = SupplierCreate(name="Duplicate Bill Supplier")
        supplier = service.create_supplier(test_tenant.id, supplier_data)
        
        # Create first bill
        bill_data = SupplierBillCreate(
            bill_number="DUPLICATE001",
            supplier_id=supplier.id,
            subtotal=Decimal('100.00'),
            total_amount=Decimal('100.00'),
            bill_date=datetime.now(),
            due_date=datetime.now() + timedelta(days=30)
        )
        service.create_supplier_bill(test_tenant.id, bill_data)
        
        # Try to create duplicate
        with pytest.raises(ValidationError, match="already exists"):
            service.create_supplier_bill(test_tenant.id, bill_data)

    def test_create_supplier_bill_invalid_supplier(self, db_session: Session, test_tenant):
        """Test creating bill with invalid supplier fails"""
        service = ReceivablesPayablesService(db_session)
        
        bill_data = SupplierBillCreate(
            bill_number="INVALID001",
            supplier_id=uuid4(),
            subtotal=Decimal('100.00'),
            total_amount=Decimal('100.00'),
            bill_date=datetime.now(),
            due_date=datetime.now() + timedelta(days=30)
        )
        
        with pytest.raises(ValidationError, match="Supplier not found"):
            service.create_supplier_bill(test_tenant.id, bill_data)

    def test_get_supplier_bills_with_filters(self, db_session: Session, test_tenant):
        """Test getting supplier bills with various filters"""
        service = ReceivablesPayablesService(db_session)
        
        # Create supplier
        supplier_data = SupplierCreate(name="Filter Test Supplier")
        supplier = service.create_supplier(test_tenant.id, supplier_data)
        
        # Create bills with different dates and statuses
        bills_data = [
            {
                "bill_number": "FILTER001",
                "bill_date": datetime.now() - timedelta(days=10),
                "status": "pending"
            },
            {
                "bill_number": "FILTER002", 
                "bill_date": datetime.now() - timedelta(days=5),
                "status": "paid"
            },
            {
                "bill_number": "FILTER003",
                "bill_date": datetime.now() - timedelta(days=50),
                "status": "overdue"
            }
        ]
        
        for bill_data in bills_data:
            bill = SupplierBill(
                tenant_id=test_tenant.id,
                supplier_id=supplier.id,
                bill_number=bill_data["bill_number"],
                subtotal=Decimal('100.00'),
                total_amount=Decimal('100.00'),
                bill_date=bill_data["bill_date"],
                due_date=bill_data["bill_date"] + timedelta(days=30),
                status=bill_data["status"]
            )
            db_session.add(bill)
        db_session.commit()
        
        # Test filter by date range
        filter_params = ReceivablesPayablesFilter(
            date_from=datetime.now() - timedelta(days=15),
            date_to=datetime.now()
        )
        results = service.get_supplier_bills(test_tenant.id, supplier.id, filter_params)
        assert len(results) == 2  # Should get FILTER001 and FILTER002
        
        # Test filter excluding paid
        filter_params = ReceivablesPayablesFilter(include_paid=False)
        results = service.get_supplier_bills(test_tenant.id, supplier.id, filter_params)
        paid_bills = [r for r in results if r.status == PaymentStatusEnum.PAID]
        assert len(paid_bills) == 0


class TestCustomerPaymentManagement:
    """Test customer payment operations"""

    def test_create_customer_payment_success(self, db_session: Session, test_tenant, test_customer):
        """Test successful customer payment creation"""
        service = ReceivablesPayablesService(db_session)
        
        payment_data = CustomerPaymentCreate(
            customer_id=test_customer.id,
            amount=Decimal('500.00'),
            payment_date=datetime.now(),
            description="Test payment"
        )
        
        result = service.create_customer_payment(test_tenant.id, payment_data)
        
        assert result.customer_id == test_customer.id
        assert result.amount == Decimal('500.00')
        assert result.payment_number.startswith("CP")

    def test_create_customer_payment_with_invoice(self, db_session: Session, test_tenant, test_customer):
        """Test creating customer payment linked to invoice"""
        service = ReceivablesPayablesService(db_session)
        
        # Create invoice
        invoice = Invoice(
            tenant_id=test_tenant.id,
            customer_id=test_customer.id,
            invoice_number="INV001",
            invoice_date=datetime.now(),
            due_date=datetime.now() + timedelta(days=30),
            subtotal=Decimal('100.00'),
            total_amount=Decimal('100.00'),
            status="sent"
        )
        db_session.add(invoice)
        db_session.commit()
        
        payment_data = CustomerPaymentCreate(
            customer_id=test_customer.id,
            invoice_id=invoice.id,
            amount=Decimal('100.00'),
            payment_date=datetime.now()
        )
        
        result = service.create_customer_payment(test_tenant.id, payment_data)
        
        assert result.invoice_id == invoice.id
        assert result.invoice_number == "INV001"

    def test_create_customer_payment_invalid_customer(self, db_session: Session, test_tenant):
        """Test creating payment with invalid customer fails"""
        service = ReceivablesPayablesService(db_session)
        
        payment_data = CustomerPaymentCreate(
            customer_id=uuid4(),
            amount=Decimal('100.00'),
            payment_date=datetime.now()
        )
        
        with pytest.raises(ValidationError, match="Customer not found"):
            service.create_customer_payment(test_tenant.id, payment_data)


class TestSupplierPaymentManagement:
    """Test supplier payment operations"""

    def test_create_supplier_payment_success(self, db_session: Session, test_tenant):
        """Test successful supplier payment creation"""
        service = ReceivablesPayablesService(db_session)
        
        # Create supplier
        supplier_data = SupplierCreate(name="Payment Test Supplier")
        supplier = service.create_supplier(test_tenant.id, supplier_data)
        
        payment_data = SupplierPaymentCreate(
            supplier_id=supplier.id,
            amount=Decimal('300.00'),
            payment_date=datetime.now(),
            description="Test payment to supplier"
        )
        
        result = service.create_supplier_payment(test_tenant.id, payment_data)
        
        assert result.supplier_id == supplier.id
        assert result.amount == Decimal('300.00')
        assert result.payment_number.startswith("SP")

    def test_create_supplier_payment_with_bill(self, db_session: Session, test_tenant):
        """Test creating supplier payment linked to bill"""
        service = ReceivablesPayablesService(db_session)
        
        # Create supplier and bill
        supplier_data = SupplierCreate(name="Bill Payment Supplier")
        supplier = service.create_supplier(test_tenant.id, supplier_data)
        
        bill_data = SupplierBillCreate(
            bill_number="PAYTEST001",
            supplier_id=supplier.id,
            subtotal=Decimal('200.00'),
            total_amount=Decimal('200.00'),
            bill_date=datetime.now(),
            due_date=datetime.now() + timedelta(days=30)
        )
        bill = service.create_supplier_bill(test_tenant.id, bill_data)
        
        # Create payment
        payment_data = SupplierPaymentCreate(
            supplier_id=supplier.id,
            bill_id=bill.id,
            amount=Decimal('200.00'),
            payment_date=datetime.now()
        )
        
        result = service.create_supplier_payment(test_tenant.id, payment_data)
        
        assert result.bill_id == bill.id
        assert result.bill_number == "PAYTEST001"
        
        # Verify bill status updated
        updated_bill = service.get_supplier_bill(test_tenant.id, bill.id)
        assert updated_bill.paid_amount == Decimal('200.00')
        assert updated_bill.status == PaymentStatusEnum.PAID


class TestPaymentMatching:
    """Test payment matching and reconciliation"""

    def test_match_customer_payment_to_invoice(self, db_session: Session, test_tenant, test_customer):
        """Test matching customer payment to invoice"""
        service = ReceivablesPayablesService(db_session)
        
        # Create invoice
        invoice = Invoice(
            tenant_id=test_tenant.id,
            customer_id=test_customer.id,
            invoice_number="MATCH001",
            invoice_date=datetime.now(),
            due_date=datetime.now() + timedelta(days=30),
            subtotal=Decimal('150.00'),
            total_amount=Decimal('150.00'),
            status="sent"
        )
        db_session.add(invoice)
        db_session.commit()
        
        # Create payment
        payment_data = CustomerPaymentCreate(
            customer_id=test_customer.id,
            amount=Decimal('150.00'),
            payment_date=datetime.now()
        )
        payment = service.create_customer_payment(test_tenant.id, payment_data)
        
        # Match payment to invoice
        matching_data = CustomerPaymentMatchingCreate(
            customer_payment_id=payment.id,
            invoice_id=invoice.id,
            matched_amount=Decimal('150.00'),
            notes="Full payment matching"
        )
        
        result = service.match_customer_payment(test_tenant.id, matching_data)
        
        assert result.customer_payment_id == payment.id
        assert result.invoice_id == invoice.id
        assert result.matched_amount == Decimal('150.00')
        assert result.match_type == MatchTypeEnum.CUSTOMER_PAYMENT

    def test_match_supplier_payment_to_bill(self, db_session: Session, test_tenant):
        """Test matching supplier payment to bill"""
        service = ReceivablesPayablesService(db_session)
        
        # Create supplier and bill
        supplier_data = SupplierCreate(name="Match Test Supplier")
        supplier = service.create_supplier(test_tenant.id, supplier_data)
        
        bill_data = SupplierBillCreate(
            bill_number="MATCH001",
            supplier_id=supplier.id,
            subtotal=Decimal('250.00'),
            total_amount=Decimal('250.00'),
            bill_date=datetime.now(),
            due_date=datetime.now() + timedelta(days=30)
        )
        bill = service.create_supplier_bill(test_tenant.id, bill_data)
        
        # Create payment (without linking to bill initially)
        payment = SupplierPayment(
            tenant_id=test_tenant.id,
            supplier_id=supplier.id,
            payment_number="SP001",
            amount=Decimal('250.00'),
            payment_date=datetime.now()
        )
        db_session.add(payment)
        db_session.commit()
        
        # Match payment to bill
        matching_data = SupplierPaymentMatchingCreate(
            supplier_payment_id=payment.id,
            supplier_bill_id=bill.id,
            matched_amount=Decimal('250.00'),
            notes="Full payment matching"
        )
        
        result = service.match_supplier_payment(test_tenant.id, matching_data)
        
        assert result.supplier_payment_id == payment.id
        assert result.supplier_bill_id == bill.id
        assert result.matched_amount == Decimal('250.00')
        assert result.match_type == MatchTypeEnum.SUPPLIER_PAYMENT

    def test_match_payment_amount_exceeds_payment(self, db_session: Session, test_tenant, test_customer):
        """Test matching amount exceeding payment amount fails"""
        service = ReceivablesPayablesService(db_session)
        
        # Create invoice and payment
        invoice = Invoice(
            tenant_id=test_tenant.id,
            customer_id=test_customer.id,
            invoice_number="EXCEED001",
            invoice_date=datetime.now(),
            due_date=datetime.now() + timedelta(days=30),
            subtotal=Decimal('100.00'),
            total_amount=Decimal('100.00'),
            status="sent"
        )
        db_session.add(invoice)
        db_session.commit()
        
        payment_data = CustomerPaymentCreate(
            customer_id=test_customer.id,
            amount=Decimal('50.00'),  # Less than invoice amount
            payment_date=datetime.now()
        )
        payment = service.create_customer_payment(test_tenant.id, payment_data)
        
        # Try to match more than payment amount
        matching_data = CustomerPaymentMatchingCreate(
            customer_payment_id=payment.id,
            invoice_id=invoice.id,
            matched_amount=Decimal('100.00'),  # More than payment amount
            notes="Invalid matching"
        )
        
        with pytest.raises(ValidationError, match="cannot exceed payment amount"):
            service.match_customer_payment(test_tenant.id, matching_data)


class TestAgingReports:
    """Test aging report generation"""

    def test_receivables_aging_report(self, db_session: Session, test_tenant, test_customer):
        """Test generating receivables aging report"""
        service = ReceivablesPayablesService(db_session)
        
        # Create invoices with different due dates
        invoices_data = [
            {"number": "AGE001", "days_ago": 15, "amount": Decimal('100.00')},  # 0-30 days
            {"number": "AGE002", "days_ago": 45, "amount": Decimal('200.00')},  # 31-60 days
            {"number": "AGE003", "days_ago": 75, "amount": Decimal('300.00')},  # 61-90 days
            {"number": "AGE004", "days_ago": 120, "amount": Decimal('400.00')}, # Over 90 days
        ]
        
        for inv_data in invoices_data:
            invoice = Invoice(
                tenant_id=test_tenant.id,
                customer_id=test_customer.id,
                invoice_number=inv_data["number"],
                invoice_date=datetime.now() - timedelta(days=inv_data["days_ago"]),
                due_date=datetime.now() - timedelta(days=inv_data["days_ago"]),
                subtotal=inv_data["amount"],
                total_amount=inv_data["amount"],
                status="sent"
            )
            db_session.add(invoice)
        db_session.commit()
        
        # Generate aging report
        report = service.get_receivables_aging_report(test_tenant.id)
        
        assert report.report_type == "receivables"
        assert len(report.customers) == 1
        assert report.total_outstanding == Decimal('1000.00')
        
        customer_aging = report.customers[0]
        assert customer_aging.customer_id == test_customer.id
        assert customer_aging.total_outstanding == Decimal('1000.00')
        
        # Check aging buckets
        buckets = customer_aging.buckets
        assert len(buckets) == 4
        assert buckets[0].amount == Decimal('100.00')  # 0-30 days
        assert buckets[1].amount == Decimal('200.00')  # 31-60 days
        assert buckets[2].amount == Decimal('300.00')  # 61-90 days
        assert buckets[3].amount == Decimal('400.00')  # Over 90 days

    def test_payables_aging_report(self, db_session: Session, test_tenant):
        """Test generating payables aging report"""
        service = ReceivablesPayablesService(db_session)
        
        # Create supplier
        supplier_data = SupplierCreate(name="Aging Test Supplier")
        supplier = service.create_supplier(test_tenant.id, supplier_data)
        
        # Create bills with different due dates
        bills_data = [
            {"number": "BAGE001", "days_ago": 20, "amount": Decimal('150.00')},  # 0-30 days
            {"number": "BAGE002", "days_ago": 50, "amount": Decimal('250.00')},  # 31-60 days
            {"number": "BAGE003", "days_ago": 80, "amount": Decimal('350.00')},  # 61-90 days
            {"number": "BAGE004", "days_ago": 100, "amount": Decimal('450.00')}, # Over 90 days
        ]
        
        for bill_data in bills_data:
            bill = SupplierBill(
                tenant_id=test_tenant.id,
                supplier_id=supplier.id,
                bill_number=bill_data["number"],
                subtotal=bill_data["amount"],
                total_amount=bill_data["amount"],
                bill_date=datetime.now() - timedelta(days=bill_data["days_ago"]),
                due_date=datetime.now() - timedelta(days=bill_data["days_ago"]),
                status="pending"
            )
            db_session.add(bill)
        db_session.commit()
        
        # Generate aging report
        report = service.get_payables_aging_report(test_tenant.id)
        
        assert report.report_type == "payables"
        assert len(report.suppliers) == 1
        assert report.total_outstanding == Decimal('1200.00')
        
        supplier_aging = report.suppliers[0]
        assert supplier_aging.supplier_id == supplier.id
        assert supplier_aging.total_outstanding == Decimal('1200.00')


class TestOutstandingItems:
    """Test outstanding items functionality"""

    def test_get_outstanding_items(self, db_session: Session, test_tenant, test_customer):
        """Test getting all outstanding receivables and payables"""
        service = ReceivablesPayablesService(db_session)
        
        # Create supplier
        supplier_data = SupplierCreate(name="Outstanding Test Supplier")
        supplier = service.create_supplier(test_tenant.id, supplier_data)
        
        # Create outstanding invoice
        invoice = Invoice(
            tenant_id=test_tenant.id,
            customer_id=test_customer.id,
            invoice_number="OUT001",
            invoice_date=datetime.now(),
            due_date=datetime.now() + timedelta(days=30),
            subtotal=Decimal('500.00'),
            total_amount=Decimal('500.00'),
            status="sent"
        )
        db_session.add(invoice)
        
        # Create outstanding bill
        bill = SupplierBill(
            tenant_id=test_tenant.id,
            supplier_id=supplier.id,
            bill_number="BOUT001",
            subtotal=Decimal('300.00'),
            total_amount=Decimal('300.00'),
            bill_date=datetime.now(),
            due_date=datetime.now() + timedelta(days=30),
            status="pending"
        )
        db_session.add(bill)
        db_session.commit()
        
        # Get outstanding items
        result = service.get_outstanding_items(test_tenant.id)
        
        assert len(result.invoices) == 1
        assert len(result.bills) == 1
        assert result.total_receivables == Decimal('500.00')
        assert result.total_payables == Decimal('300.00')
        assert result.overdue_receivables == Decimal('0.00')  # Not overdue yet
        assert result.overdue_payables == Decimal('0.00')     # Not overdue yet
        
        # Check invoice details
        outstanding_invoice = result.invoices[0]
        assert outstanding_invoice.invoice_number == "OUT001"
        assert outstanding_invoice.outstanding_amount == Decimal('500.00')
        
        # Check bill details
        outstanding_bill = result.bills[0]
        assert outstanding_bill.bill_number == "BOUT001"
        assert outstanding_bill.outstanding_amount == Decimal('300.00')