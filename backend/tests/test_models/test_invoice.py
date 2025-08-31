"""
Tests for Invoice and InvoiceItem models
"""

import pytest
from datetime import datetime, timedelta
from decimal import Decimal
from app.models.invoice import Invoice, InvoiceItem, InvoiceType, InvoiceStatus
from app.models.tenant import Tenant
from app.models.customer import Customer
from app.models.product import Product


class TestInvoiceModel:
    """Test cases for Invoice model"""
    
    def test_create_general_invoice(self, db_session):
        """Test creating a general invoice"""
        # Create tenant
        tenant = Tenant(name="Test Business", email="business@test.com")
        db_session.add(tenant)
        db_session.commit()
        
        # Create customer
        customer = Customer(
            tenant_id=tenant.id,
            name="Test Customer",
            email="customer@test.com"
        )
        db_session.add(customer)
        db_session.commit()
        
        # Create invoice
        invoice = Invoice(
            tenant_id=tenant.id,
            customer_id=customer.id,
            invoice_number="INV-001",
            invoice_type=InvoiceType.GENERAL,
            total_amount=Decimal('1000.00')
        )
        
        db_session.add(invoice)
        db_session.commit()
        db_session.refresh(invoice)
        
        assert invoice.id is not None
        assert invoice.tenant_id == tenant.id
        assert invoice.customer_id == customer.id
        assert invoice.invoice_number == "INV-001"
        assert invoice.invoice_type == InvoiceType.GENERAL
        assert invoice.status == InvoiceStatus.DRAFT
        assert invoice.total_amount == Decimal('1000.00')
        assert invoice.paid_amount == Decimal('0.00')
        assert invoice.is_installment is False
    
    def test_create_gold_invoice(self, db_session):
        """Test creating a gold invoice"""
        # Create tenant
        tenant = Tenant(name="Gold Shop", email="goldshop@test.com")
        db_session.add(tenant)
        db_session.commit()
        
        # Create customer
        customer = Customer(
            tenant_id=tenant.id,
            name="Gold Customer",
            email="goldcustomer@test.com"
        )
        db_session.add(customer)
        db_session.commit()
        
        # Create gold invoice
        invoice = Invoice(
            tenant_id=tenant.id,
            customer_id=customer.id,
            invoice_number="GOLD-001",
            invoice_type=InvoiceType.GOLD,
            total_amount=Decimal('5000000.00'),
            total_gold_weight=Decimal('10.500'),
            gold_price_at_creation=Decimal('476190.48')
        )
        
        db_session.add(invoice)
        db_session.commit()
        db_session.refresh(invoice)
        
        assert invoice.invoice_type == InvoiceType.GOLD
        assert invoice.total_gold_weight == Decimal('10.500')
        assert invoice.gold_price_at_creation == Decimal('476190.48')
    
    def test_invoice_payment_properties(self, db_session):
        """Test invoice payment-related properties"""
        tenant = Tenant(name="Test Business", email="business@test.com")
        db_session.add(tenant)
        db_session.commit()
        
        customer = Customer(tenant_id=tenant.id, name="Test Customer")
        db_session.add(customer)
        db_session.commit()
        
        invoice = Invoice(
            tenant_id=tenant.id,
            customer_id=customer.id,
            invoice_number="INV-001",
            invoice_type=InvoiceType.GENERAL,
            total_amount=Decimal('1000.00'),
            paid_amount=Decimal('300.00')
        )
        
        # Test balance due
        assert invoice.balance_due == Decimal('700.00')
        
        # Test payment status
        assert invoice.is_paid is False
        
        # Full payment
        invoice.paid_amount = Decimal('1000.00')
        assert invoice.is_paid is True
        assert invoice.balance_due == Decimal('0.00')
    
    def test_invoice_overdue_detection(self, db_session):
        """Test overdue invoice detection"""
        tenant = Tenant(name="Test Business", email="business@test.com")
        db_session.add(tenant)
        db_session.commit()
        
        customer = Customer(tenant_id=tenant.id, name="Test Customer")
        db_session.add(customer)
        db_session.commit()
        
        # Invoice with future due date
        invoice = Invoice(
            tenant_id=tenant.id,
            customer_id=customer.id,
            invoice_number="INV-001",
            invoice_type=InvoiceType.GENERAL,
            total_amount=Decimal('1000.00'),
            due_date=datetime.utcnow() + timedelta(days=30)
        )
        
        assert invoice.is_overdue is False
        assert invoice.days_overdue == 0
        
        # Invoice with past due date
        invoice.due_date = datetime.utcnow() - timedelta(days=5)
        assert invoice.is_overdue is True
        assert invoice.days_overdue == 5
        
        # Paid invoice should not be overdue
        invoice.paid_amount = invoice.total_amount
        assert invoice.is_overdue is False
    
    def test_qr_token_generation(self, db_session):
        """Test QR code token generation"""
        tenant = Tenant(name="Test Business", email="business@test.com")
        db_session.add(tenant)
        db_session.commit()
        
        customer = Customer(tenant_id=tenant.id, name="Test Customer")
        db_session.add(customer)
        db_session.commit()
        
        invoice = Invoice(
            tenant_id=tenant.id,
            customer_id=customer.id,
            invoice_number="INV-001",
            invoice_type=InvoiceType.GENERAL,
            total_amount=Decimal('1000.00')
        )
        
        assert invoice.qr_code_token is None
        
        invoice.generate_qr_token()
        assert invoice.qr_code_token is not None
        assert len(invoice.qr_code_token) > 0
    
    def test_add_payment(self, db_session):
        """Test adding payments to invoice"""
        tenant = Tenant(name="Test Business", email="business@test.com")
        db_session.add(tenant)
        db_session.commit()
        
        customer = Customer(tenant_id=tenant.id, name="Test Customer")
        db_session.add(customer)
        db_session.commit()
        
        # General invoice payment
        invoice = Invoice(
            tenant_id=tenant.id,
            customer_id=customer.id,
            invoice_number="INV-001",
            invoice_type=InvoiceType.GENERAL,
            total_amount=Decimal('1000.00'),
            is_installment=True,
            remaining_balance=Decimal('1000.00')
        )
        
        invoice.add_payment(Decimal('300.00'))
        
        assert invoice.paid_amount == Decimal('300.00')
        assert invoice.remaining_balance == Decimal('700.00')
        
        # Gold invoice payment
        gold_invoice = Invoice(
            tenant_id=tenant.id,
            customer_id=customer.id,
            invoice_number="GOLD-001",
            invoice_type=InvoiceType.GOLD,
            total_amount=Decimal('5000000.00'),
            total_gold_weight=Decimal('10.500'),
            is_installment=True,
            remaining_gold_weight=Decimal('10.500')
        )
        
        gold_invoice.add_payment(
            amount=Decimal('2380952.40'),
            gold_weight=Decimal('5.000')
        )
        
        assert gold_invoice.paid_amount == Decimal('2380952.40')
        assert gold_invoice.remaining_gold_weight == Decimal('5.500')
    
    def test_invoice_status_updates(self, db_session):
        """Test automatic invoice status updates"""
        tenant = Tenant(name="Test Business", email="business@test.com")
        db_session.add(tenant)
        db_session.commit()
        
        customer = Customer(tenant_id=tenant.id, name="Test Customer")
        db_session.add(customer)
        db_session.commit()
        
        invoice = Invoice(
            tenant_id=tenant.id,
            customer_id=customer.id,
            invoice_number="INV-001",
            invoice_type=InvoiceType.GENERAL,
            total_amount=Decimal('1000.00')
        )
        
        # Send to customer
        invoice.send_to_customer()
        assert invoice.status == InvoiceStatus.SENT
        
        # Partial payment
        invoice.add_payment(Decimal('300.00'))
        assert invoice.status == InvoiceStatus.PARTIALLY_PAID
        
        # Full payment
        invoice.add_payment(Decimal('700.00'))
        assert invoice.status == InvoiceStatus.PAID
    
    def test_cancel_invoice(self, db_session):
        """Test invoice cancellation"""
        tenant = Tenant(name="Test Business", email="business@test.com")
        db_session.add(tenant)
        db_session.commit()
        
        customer = Customer(tenant_id=tenant.id, name="Test Customer")
        db_session.add(customer)
        db_session.commit()
        
        invoice = Invoice(
            tenant_id=tenant.id,
            customer_id=customer.id,
            invoice_number="INV-001",
            invoice_type=InvoiceType.GENERAL,
            total_amount=Decimal('1000.00')
        )
        
        invoice.cancel("Customer request")
        
        assert invoice.status == InvoiceStatus.CANCELLED
        assert "Cancelled: Customer request" in invoice.notes


class TestInvoiceItemModel:
    """Test cases for InvoiceItem model"""
    
    def test_create_general_invoice_item(self, db_session):
        """Test creating a general invoice item"""
        # Setup
        tenant = Tenant(name="Test Business", email="business@test.com")
        db_session.add(tenant)
        db_session.commit()
        
        customer = Customer(tenant_id=tenant.id, name="Test Customer")
        db_session.add(customer)
        db_session.commit()
        
        product = Product(
            tenant_id=tenant.id,
            name="Test Product",
            selling_price=Decimal('100.00')
        )
        db_session.add(product)
        db_session.commit()
        
        invoice = Invoice(
            tenant_id=tenant.id,
            customer_id=customer.id,
            invoice_number="INV-001",
            invoice_type=InvoiceType.GENERAL,
            total_amount=Decimal('1000.00')
        )
        db_session.add(invoice)
        db_session.commit()
        
        # Create invoice item
        item = InvoiceItem(
            invoice_id=invoice.id,
            product_id=product.id,
            description="Test Product",
            quantity=Decimal('5.000'),
            unit_price=Decimal('100.00'),
            tax_rate=Decimal('9.00')
        )
        
        item.calculate_totals()
        
        assert item.line_total == Decimal('545.00')  # (5 * 100) + 9% tax
        assert item.tax_amount == Decimal('45.00')
        assert item.is_gold_item is False
    
    def test_create_gold_invoice_item(self, db_session):
        """Test creating a gold invoice item"""
        # Setup
        tenant = Tenant(name="Gold Shop", email="goldshop@test.com")
        db_session.add(tenant)
        db_session.commit()
        
        customer = Customer(tenant_id=tenant.id, name="Gold Customer")
        db_session.add(customer)
        db_session.commit()
        
        gold_product = Product(
            tenant_id=tenant.id,
            name="Gold Ring",
            selling_price=Decimal('5000000.00'),
            is_gold_product=True,
            gold_purity=Decimal('18.000')
        )
        db_session.add(gold_product)
        db_session.commit()
        
        invoice = Invoice(
            tenant_id=tenant.id,
            customer_id=customer.id,
            invoice_number="GOLD-001",
            invoice_type=InvoiceType.GOLD,
            total_amount=Decimal('5000000.00')
        )
        db_session.add(invoice)
        db_session.commit()
        
        # Create gold invoice item
        item = InvoiceItem(
            invoice_id=invoice.id,
            product_id=gold_product.id,
            description="18k Gold Ring",
            quantity=Decimal('1.000'),
            unit_price=Decimal('4000000.00'),
            weight=Decimal('10.500'),
            labor_fee=Decimal('500000.00'),
            profit=Decimal('400000.00'),
            vat_amount=Decimal('100000.00')
        )
        
        item.calculate_totals()
        
        # Base: 4,000,000 + Labor: 500,000 + Profit: 400,000 + VAT: 100,000 = 5,000,000
        assert item.line_total == Decimal('5000000.00')
        assert item.is_gold_item is True
        assert item.weight == Decimal('10.500')
    
    def test_invoice_item_with_discount(self, db_session):
        """Test invoice item with discount calculation"""
        # Setup
        tenant = Tenant(name="Test Business", email="business@test.com")
        db_session.add(tenant)
        db_session.commit()
        
        customer = Customer(tenant_id=tenant.id, name="Test Customer")
        db_session.add(customer)
        db_session.commit()
        
        invoice = Invoice(
            tenant_id=tenant.id,
            customer_id=customer.id,
            invoice_number="INV-001",
            invoice_type=InvoiceType.GENERAL,
            total_amount=Decimal('1000.00')
        )
        db_session.add(invoice)
        db_session.commit()
        
        # Create item with discount
        item = InvoiceItem(
            invoice_id=invoice.id,
            description="Discounted Product",
            quantity=Decimal('2.000'),
            unit_price=Decimal('100.00'),
            discount_rate=Decimal('10.00'),  # 10% discount
            tax_rate=Decimal('9.00')  # 9% tax
        )
        
        item.calculate_totals()
        
        # Base: 200, Discount: 20, After discount: 180, Tax: 16.20, Total: 196.20
        assert item.discount_amount == Decimal('20.00')
        assert item.tax_amount == Decimal('16.20')
        assert item.line_total == Decimal('196.20')
    
    def test_invoice_calculate_totals(self, db_session):
        """Test invoice total calculation from items"""
        # Setup
        tenant = Tenant(name="Test Business", email="business@test.com")
        db_session.add(tenant)
        db_session.commit()
        
        customer = Customer(tenant_id=tenant.id, name="Test Customer")
        db_session.add(customer)
        db_session.commit()
        
        invoice = Invoice(
            tenant_id=tenant.id,
            customer_id=customer.id,
            invoice_number="INV-001",
            invoice_type=InvoiceType.GENERAL,
            total_amount=Decimal('0.00')
        )
        db_session.add(invoice)
        db_session.commit()
        
        # Add items
        item1 = InvoiceItem(
            invoice_id=invoice.id,
            description="Product 1",
            quantity=Decimal('2.000'),
            unit_price=Decimal('100.00'),
            line_total=Decimal('200.00'),
            tax_amount=Decimal('18.00')
        )
        
        item2 = InvoiceItem(
            invoice_id=invoice.id,
            description="Product 2",
            quantity=Decimal('1.000'),
            unit_price=Decimal('300.00'),
            line_total=Decimal('300.00'),
            tax_amount=Decimal('27.00')
        )
        
        invoice.items = [item1, item2]
        invoice.calculate_totals()
        
        assert invoice.subtotal == Decimal('500.00')
        assert invoice.tax_amount == Decimal('45.00')
        assert invoice.total_amount == Decimal('500.00')  # Subtotal + tax already included in line_total