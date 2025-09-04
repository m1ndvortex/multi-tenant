"""
Comprehensive tests for dual invoice system (General and Gold)
"""

import pytest
from decimal import Decimal
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
import uuid

from app.models.tenant import Tenant
from app.models.user import User
from app.models.customer import Customer
from app.models.product import Product
from app.models.invoice import Invoice, InvoiceItem, InvoiceType, InvoiceStatus
from app.services.invoice_service import InvoiceService
from app.schemas.invoice import (
    InvoiceCreate, InvoiceUpdate, InvoiceItemCreate, PaymentCreate,
    InvoiceFilter, InvoiceTypeEnum, InvoiceStatusEnum
)
from app.core.exceptions import ValidationError, NotFoundError, BusinessLogicError


class TestInvoiceService:
    """Test cases for InvoiceService"""
    
    @pytest.fixture
    def setup_test_data(self, db_session: Session):
        """Setup test data for invoice tests"""
        # Create tenant
        from app.models.tenant import TenantStatus
        tenant = Tenant(
            name="Test Business",
            email="business@test.com",
            subscription_type="PRO",
            status=TenantStatus.ACTIVE,
            max_users=5,
            max_products=100,
            max_customers=100,
            max_monthly_invoices=100
        )
        db_session.add(tenant)
        db_session.commit()
        
        # Create user with properly hashed password
        from app.core.auth import get_password_hash
        from app.models.user import UserRole, UserStatus
        user = User(
            tenant_id=tenant.id,
            email="user@test.com",
            password_hash=get_password_hash("secret"),
            first_name="Test",
            last_name="User",
            role=UserRole.ADMIN,
            status=UserStatus.ACTIVE
        )
        db_session.add(user)
        db_session.commit()
        
        # Create customers
        customer1 = Customer(
            tenant_id=tenant.id,
            name="John Doe",
            email="john@example.com",
            phone="+1234567890"
        )
        
        customer2 = Customer(
            tenant_id=tenant.id,
            name="Gold Customer",
            email="gold@example.com",
            phone="+1234567891"
        )
        
        db_session.add_all([customer1, customer2])
        db_session.commit()
        
        # Create products
        general_product = Product(
            tenant_id=tenant.id,
            name="General Product",
            selling_price=Decimal('100.00'),
            stock_quantity=50
        )
        
        gold_product = Product(
            tenant_id=tenant.id,
            name="Gold Ring",
            selling_price=Decimal('5000000.00'),
            is_gold_product=True,
            gold_purity=Decimal('18.000'),
            weight_per_unit=Decimal('10.500'),
            stock_quantity=10
        )
        
        db_session.add_all([general_product, gold_product])
        db_session.commit()
        
        return {
            'tenant': tenant,
            'user': user,
            'customer1': customer1,
            'customer2': customer2,
            'general_product': general_product,
            'gold_product': gold_product
        }
    
    def test_create_general_invoice(self, db_session: Session, setup_test_data):
        """Test creating a general invoice"""
        data = setup_test_data
        service = InvoiceService(db_session)
        
        # Create invoice data
        invoice_data = InvoiceCreate(
            customer_id=data['customer1'].id,
            invoice_type=InvoiceTypeEnum.GENERAL,
            items=[
                InvoiceItemCreate(
                    product_id=data['general_product'].id,
                    description="General Product",
                    quantity=Decimal('2.000'),
                    unit_price=Decimal('100.00'),
                    tax_rate=Decimal('9.00')
                ),
                InvoiceItemCreate(
                    description="Custom Service",
                    quantity=Decimal('1.000'),
                    unit_price=Decimal('50.00'),
                    tax_rate=Decimal('9.00')
                )
            ]
        )
        
        # Create invoice
        invoice = service.create_invoice(data['tenant'].id, invoice_data)
        
        # Assertions
        assert invoice.id is not None
        assert invoice.tenant_id == data['tenant'].id
        assert invoice.customer_id == data['customer1'].id
        assert invoice.invoice_type == InvoiceType.GENERAL
        assert invoice.status == InvoiceStatus.DRAFT
        assert len(invoice.items) == 2
        
        # Check calculations
        # Item 1: 2 * 100 = 200, tax = 18, total = 218
        # Item 2: 1 * 50 = 50, tax = 4.5, total = 54.5
        # Total: 272.5
        assert invoice.subtotal == Decimal('272.50')
        assert invoice.tax_amount == Decimal('22.50')
        assert invoice.total_amount == Decimal('272.50')
        
        # Check invoice number format
        assert invoice.invoice_number.startswith("INV-")
        assert invoice.qr_code_token is not None  # Should be generated for shareable invoices
    
    def test_create_gold_invoice(self, db_session: Session, setup_test_data):
        """Test creating a gold invoice"""
        data = setup_test_data
        service = InvoiceService(db_session)
        
        # Create gold invoice data
        invoice_data = InvoiceCreate(
            customer_id=data['customer2'].id,
            invoice_type=InvoiceTypeEnum.GOLD,
            gold_price_at_creation=Decimal('476190.48'),
            items=[
                InvoiceItemCreate(
                    product_id=data['gold_product'].id,
                    description="18k Gold Ring",
                    quantity=Decimal('1.000'),
                    unit_price=Decimal('4000000.00'),
                    weight=Decimal('10.500'),
                    labor_fee=Decimal('500000.00'),
                    profit=Decimal('400000.00'),
                    vat_amount=Decimal('100000.00')
                )
            ]
        )
        
        # Create invoice
        invoice = service.create_invoice(data['tenant'].id, invoice_data)
        
        # Assertions
        assert invoice.invoice_type == InvoiceType.GOLD
        assert invoice.gold_price_at_creation == Decimal('476190.48')
        assert invoice.total_gold_weight == Decimal('10.500')
        assert invoice.invoice_number.startswith("GOLD-")
        
        # Check gold item calculations
        item = invoice.items[0]
        assert item.weight == Decimal('10.500')
        assert item.labor_fee == Decimal('500000.00')
        assert item.profit == Decimal('400000.00')
        assert item.vat_amount == Decimal('100000.00')
        # Total: 4,000,000 + 500,000 + 400,000 + 100,000 = 5,000,000
        assert item.line_total == Decimal('5000000.00')
    
    def test_create_gold_installment_invoice(self, db_session: Session, setup_test_data):
        """Test creating a gold installment invoice"""
        data = setup_test_data
        service = InvoiceService(db_session)
        
        # Create gold installment invoice
        invoice_data = InvoiceCreate(
            customer_id=data['customer2'].id,
            invoice_type=InvoiceTypeEnum.GOLD,
            gold_price_at_creation=Decimal('476190.48'),
            is_installment=True,
            installment_type="gold",
            items=[
                InvoiceItemCreate(
                    description="Gold Jewelry",
                    quantity=Decimal('1.000'),
                    unit_price=Decimal('2000000.00'),
                    weight=Decimal('5.000'),
                    labor_fee=Decimal('200000.00')
                )
            ]
        )
        
        # Create invoice
        invoice = service.create_invoice(data['tenant'].id, invoice_data)
        
        # Assertions
        assert invoice.is_installment is True
        assert invoice.installment_type == "gold"
        assert invoice.remaining_gold_weight == Decimal('5.000')
        assert invoice.total_gold_weight == Decimal('5.000')
    
    def test_invoice_validation_errors(self, db_session: Session, setup_test_data):
        """Test invoice validation errors"""
        data = setup_test_data
        service = InvoiceService(db_session)
        
        # Test gold invoice without gold price
        with pytest.raises(ValidationError):
            invoice_data = InvoiceCreate(
                customer_id=data['customer2'].id,
                invoice_type=InvoiceTypeEnum.GOLD,
                # Missing gold_price_at_creation
                items=[
                    InvoiceItemCreate(
                        description="Gold Item",
                        quantity=Decimal('1.000'),
                        unit_price=Decimal('1000000.00'),
                        weight=Decimal('5.000')
                    )
                ]
            )
            service.create_invoice(data['tenant'].id, invoice_data)
        
        # Test invoice with non-existent customer
        with pytest.raises(NotFoundError):
            invoice_data = InvoiceCreate(
                customer_id=uuid.uuid4(),  # Non-existent customer
                invoice_type=InvoiceTypeEnum.GENERAL,
                items=[
                    InvoiceItemCreate(
                        description="Test Item",
                        quantity=Decimal('1.000'),
                        unit_price=Decimal('100.00')
                    )
                ]
            )
            service.create_invoice(data['tenant'].id, invoice_data)
    
    def test_get_invoices_with_filters(self, db_session: Session, setup_test_data):
        """Test getting invoices with various filters"""
        data = setup_test_data
        service = InvoiceService(db_session)
        
        # Create multiple invoices
        invoices_data = [
            InvoiceCreate(
                customer_id=data['customer1'].id,
                invoice_type=InvoiceTypeEnum.GENERAL,
                items=[
                    InvoiceItemCreate(
                        description="Item 1",
                        quantity=Decimal('1.000'),
                        unit_price=Decimal('100.00')
                    )
                ]
            ),
            InvoiceCreate(
                customer_id=data['customer2'].id,
                invoice_type=InvoiceTypeEnum.GOLD,
                gold_price_at_creation=Decimal('476190.48'),
                items=[
                    InvoiceItemCreate(
                        description="Gold Item",
                        quantity=Decimal('1.000'),
                        unit_price=Decimal('1000000.00'),
                        weight=Decimal('5.000')
                    )
                ]
            )
        ]
        
        created_invoices = []
        for invoice_data in invoices_data:
            invoice = service.create_invoice(data['tenant'].id, invoice_data)
            created_invoices.append(invoice)
        
        # Test filter by invoice type
        filters = InvoiceFilter(invoice_type=InvoiceTypeEnum.GENERAL)
        invoices, total = service.get_invoices(data['tenant'].id, filters)
        assert total == 1
        assert invoices[0].invoice_type == InvoiceType.GENERAL
        
        # Test filter by customer
        filters = InvoiceFilter(customer_id=data['customer2'].id)
        invoices, total = service.get_invoices(data['tenant'].id, filters)
        assert total == 1
        assert invoices[0].customer_id == data['customer2'].id
        
        # Test search
        filters = InvoiceFilter(search="Gold")
        invoices, total = service.get_invoices(data['tenant'].id, filters)
        assert total == 1
    
    def test_update_invoice(self, db_session: Session, setup_test_data):
        """Test updating invoice"""
        data = setup_test_data
        service = InvoiceService(db_session)
        
        # Create invoice
        invoice_data = InvoiceCreate(
            customer_id=data['customer1'].id,
            invoice_type=InvoiceTypeEnum.GENERAL,
            items=[
                InvoiceItemCreate(
                    description="Test Item",
                    quantity=Decimal('1.000'),
                    unit_price=Decimal('100.00')
                )
            ]
        )
        
        invoice = service.create_invoice(data['tenant'].id, invoice_data)
        
        # Update invoice
        update_data = InvoiceUpdate(
            notes="Updated notes",
            customer_notes="Customer notes"
        )
        
        updated_invoice = service.update_invoice(data['tenant'].id, invoice.id, update_data)
        
        assert updated_invoice.notes == "Updated notes"
        assert updated_invoice.customer_notes == "Customer notes"
    
    def test_add_payment_to_general_invoice(self, db_session: Session, setup_test_data):
        """Test adding payment to general invoice"""
        data = setup_test_data
        service = InvoiceService(db_session)
        
        # Create invoice
        invoice_data = InvoiceCreate(
            customer_id=data['customer1'].id,
            invoice_type=InvoiceTypeEnum.GENERAL,
            items=[
                InvoiceItemCreate(
                    description="Test Item",
                    quantity=Decimal('1.000'),
                    unit_price=Decimal('100.00')
                )
            ]
        )
        
        invoice = service.create_invoice(data['tenant'].id, invoice_data)
        
        # Add partial payment
        payment_data = PaymentCreate(
            amount=Decimal('50.00'),
            payment_method="cash"
        )
        
        updated_invoice = service.add_payment(data['tenant'].id, invoice.id, payment_data)
        
        assert updated_invoice.paid_amount == Decimal('50.00')
        assert updated_invoice.status == InvoiceStatus.PARTIALLY_PAID
        assert updated_invoice.balance_due == Decimal('50.00')
        
        # Add full payment
        payment_data = PaymentCreate(
            amount=Decimal('50.00'),
            payment_method="cash"
        )
        
        updated_invoice = service.add_payment(data['tenant'].id, invoice.id, payment_data)
        
        assert updated_invoice.paid_amount == Decimal('100.00')
        assert updated_invoice.status == InvoiceStatus.PAID
        assert updated_invoice.is_paid is True
    
    def test_add_payment_to_gold_installment_invoice(self, db_session: Session, setup_test_data):
        """Test adding payment to gold installment invoice"""
        data = setup_test_data
        service = InvoiceService(db_session)
        
        # Create gold installment invoice
        invoice_data = InvoiceCreate(
            customer_id=data['customer2'].id,
            invoice_type=InvoiceTypeEnum.GOLD,
            gold_price_at_creation=Decimal('476190.48'),
            is_installment=True,
            installment_type="gold",
            items=[
                InvoiceItemCreate(
                    description="Gold Jewelry",
                    quantity=Decimal('1.000'),
                    unit_price=Decimal('2000000.00'),
                    weight=Decimal('10.000')
                )
            ]
        )
        
        invoice = service.create_invoice(data['tenant'].id, invoice_data)
        
        # Add gold payment
        payment_data = PaymentCreate(
            amount=Decimal('1190476.20'),  # 2.5 grams * 476190.48
            gold_weight=Decimal('2.500'),
            gold_price=Decimal('476190.48')
        )
        
        updated_invoice = service.add_payment(data['tenant'].id, invoice.id, payment_data)
        
        assert updated_invoice.remaining_gold_weight == Decimal('7.500')
        assert updated_invoice.paid_amount == Decimal('1190476.20')
    
    def test_send_invoice(self, db_session: Session, setup_test_data):
        """Test sending invoice to customer"""
        data = setup_test_data
        service = InvoiceService(db_session)
        
        # Create invoice
        invoice_data = InvoiceCreate(
            customer_id=data['customer1'].id,
            invoice_type=InvoiceTypeEnum.GENERAL,
            items=[
                InvoiceItemCreate(
                    description="Test Item",
                    quantity=Decimal('1.000'),
                    unit_price=Decimal('100.00')
                )
            ]
        )
        
        invoice = service.create_invoice(data['tenant'].id, invoice_data)
        assert invoice.status == InvoiceStatus.DRAFT
        
        # Send invoice
        sent_invoice = service.send_invoice(data['tenant'].id, invoice.id)
        
        assert sent_invoice.status == InvoiceStatus.SENT
        assert sent_invoice.qr_code_token is not None
    
    def test_cancel_invoice(self, db_session: Session, setup_test_data):
        """Test cancelling invoice"""
        data = setup_test_data
        service = InvoiceService(db_session)
        
        # Create invoice
        invoice_data = InvoiceCreate(
            customer_id=data['customer1'].id,
            invoice_type=InvoiceTypeEnum.GENERAL,
            items=[
                InvoiceItemCreate(
                    description="Test Item",
                    quantity=Decimal('1.000'),
                    unit_price=Decimal('100.00')
                )
            ]
        )
        
        invoice = service.create_invoice(data['tenant'].id, invoice_data)
        
        # Cancel invoice
        cancelled_invoice = service.cancel_invoice(
            data['tenant'].id, 
            invoice.id, 
            "Customer request"
        )
        
        assert cancelled_invoice.status == InvoiceStatus.CANCELLED
        assert "Cancelled: Customer request" in cancelled_invoice.notes
    
    def test_delete_invoice(self, db_session: Session, setup_test_data):
        """Test deleting invoice"""
        data = setup_test_data
        service = InvoiceService(db_session)
        
        # Create invoice
        invoice_data = InvoiceCreate(
            customer_id=data['customer1'].id,
            invoice_type=InvoiceTypeEnum.GENERAL,
            items=[
                InvoiceItemCreate(
                    description="Test Item",
                    quantity=Decimal('1.000'),
                    unit_price=Decimal('100.00')
                )
            ]
        )
        
        invoice = service.create_invoice(data['tenant'].id, invoice_data)
        
        # Delete invoice
        success = service.delete_invoice(data['tenant'].id, invoice.id)
        assert success is True
        
        # Verify invoice is soft deleted
        deleted_invoice = service.get_invoice(data['tenant'].id, invoice.id)
        assert deleted_invoice is None
    
    def test_invoice_statistics(self, db_session: Session, setup_test_data):
        """Test getting invoice statistics"""
        data = setup_test_data
        service = InvoiceService(db_session)
        
        # Create multiple invoices with different statuses
        invoices_data = [
            # Draft general invoice
            InvoiceCreate(
                customer_id=data['customer1'].id,
                invoice_type=InvoiceTypeEnum.GENERAL,
                items=[
                    InvoiceItemCreate(
                        description="Item 1",
                        quantity=Decimal('1.000'),
                        unit_price=Decimal('100.00')
                    )
                ]
            ),
            # Gold invoice
            InvoiceCreate(
                customer_id=data['customer2'].id,
                invoice_type=InvoiceTypeEnum.GOLD,
                gold_price_at_creation=Decimal('476190.48'),
                items=[
                    InvoiceItemCreate(
                        description="Gold Item",
                        quantity=Decimal('1.000'),
                        unit_price=Decimal('1000000.00'),
                        weight=Decimal('5.000')
                    )
                ]
            )
        ]
        
        created_invoices = []
        for invoice_data in invoices_data:
            invoice = service.create_invoice(data['tenant'].id, invoice_data)
            created_invoices.append(invoice)
        
        # Send one invoice
        service.send_invoice(data['tenant'].id, created_invoices[0].id)
        
        # Get statistics
        stats = service.get_invoice_statistics(data['tenant'].id)
        
        assert stats['total_invoices'] == 2
        assert stats['draft_invoices'] == 1
        assert stats['sent_invoices'] == 1
        assert stats['general_invoices'] == 1
        assert stats['gold_invoices'] == 1
        assert stats['total_gold_weight'] == Decimal('5.000')
    
    def test_invoice_item_management(self, db_session: Session, setup_test_data):
        """Test adding, updating, and deleting invoice items"""
        data = setup_test_data
        service = InvoiceService(db_session)
        
        # Create invoice with one item
        invoice_data = InvoiceCreate(
            customer_id=data['customer1'].id,
            invoice_type=InvoiceTypeEnum.GENERAL,
            items=[
                InvoiceItemCreate(
                    description="Initial Item",
                    quantity=Decimal('1.000'),
                    unit_price=Decimal('100.00')
                )
            ]
        )
        
        invoice = service.create_invoice(data['tenant'].id, invoice_data)
        initial_total = invoice.total_amount
        
        # Add new item
        new_item_data = InvoiceItemCreate(
            description="Additional Item",
            quantity=Decimal('2.000'),
            unit_price=Decimal('50.00')
        )
        
        new_item = service.add_invoice_item(data['tenant'].id, invoice.id, new_item_data)
        
        # Refresh invoice and check totals
        updated_invoice = service.get_invoice(data['tenant'].id, invoice.id)
        assert len(updated_invoice.items) == 2
        assert updated_invoice.total_amount > initial_total
        
        # Update item
        from app.schemas.invoice import InvoiceItemUpdate
        update_data = InvoiceItemUpdate(
            quantity=Decimal('3.000'),
            unit_price=Decimal('60.00')
        )
        
        updated_item = service.update_invoice_item(
            data['tenant'].id, invoice.id, new_item.id, update_data
        )
        
        assert updated_item.quantity == Decimal('3.000')
        assert updated_item.unit_price == Decimal('60.00')
    
    def test_multi_tenant_isolation(self, db_session: Session, setup_test_data):
        """Test that invoices are properly isolated between tenants"""
        data = setup_test_data
        service = InvoiceService(db_session)
        
        # Create another tenant
        tenant2 = Tenant(
            name="Another Business",
            email="another@test.com",
            status=TenantStatus.ACTIVE
        )
        db_session.add(tenant2)
        db_session.commit()
        
        # Create customer for tenant2
        customer2 = Customer(
            tenant_id=tenant2.id,
            name="Tenant2 Customer",
            email="customer2@test.com"
        )
        db_session.add(customer2)
        db_session.commit()
        
        # Create invoice for tenant1
        invoice_data = InvoiceCreate(
            customer_id=data['customer1'].id,
            invoice_type=InvoiceTypeEnum.GENERAL,
            items=[
                InvoiceItemCreate(
                    description="Tenant1 Item",
                    quantity=Decimal('1.000'),
                    unit_price=Decimal('100.00')
                )
            ]
        )
        
        invoice1 = service.create_invoice(data['tenant'].id, invoice_data)
        
        # Try to access invoice1 from tenant2 - should not be found
        invoice_from_tenant2 = service.get_invoice(tenant2.id, invoice1.id)
        assert invoice_from_tenant2 is None
        
        # Get invoices for tenant2 - should be empty
        invoices, total = service.get_invoices(tenant2.id)
        assert total == 0
        assert len(invoices) == 0
    
    def test_business_logic_validations(self, db_session: Session, setup_test_data):
        """Test business logic validations"""
        data = setup_test_data
        service = InvoiceService(db_session)
        
        # Create and pay invoice
        invoice_data = InvoiceCreate(
            customer_id=data['customer1'].id,
            invoice_type=InvoiceTypeEnum.GENERAL,
            items=[
                InvoiceItemCreate(
                    description="Test Item",
                    quantity=Decimal('1.000'),
                    unit_price=Decimal('100.00')
                )
            ]
        )
        
        invoice = service.create_invoice(data['tenant'].id, invoice_data)
        
        # Pay invoice fully
        payment_data = PaymentCreate(amount=Decimal('100.00'))
        paid_invoice = service.add_payment(data['tenant'].id, invoice.id, payment_data)
        
        # Try to update paid invoice - should fail
        with pytest.raises(BusinessLogicError):
            update_data = InvoiceUpdate(notes="Cannot update")
            service.update_invoice(data['tenant'].id, invoice.id, update_data)
        
        # Try to delete paid invoice - should fail
        with pytest.raises(BusinessLogicError):
            service.delete_invoice(data['tenant'].id, invoice.id)
        
        # Try to add payment to paid invoice - should fail
        with pytest.raises(BusinessLogicError):
            payment_data = PaymentCreate(amount=Decimal('50.00'))
            service.add_payment(data['tenant'].id, invoice.id, payment_data)
    
    def test_public_invoice_access(self, db_session: Session, setup_test_data):
        """Test public invoice access via QR token"""
        data = setup_test_data
        service = InvoiceService(db_session)
        
        # Create shareable invoice
        invoice_data = InvoiceCreate(
            customer_id=data['customer1'].id,
            invoice_type=InvoiceTypeEnum.GENERAL,
            is_shareable=True,
            items=[
                InvoiceItemCreate(
                    description="Public Item",
                    quantity=Decimal('1.000'),
                    unit_price=Decimal('100.00')
                )
            ]
        )
        
        invoice = service.create_invoice(data['tenant'].id, invoice_data)
        
        # Get public invoice
        public_invoice = service.get_public_invoice(invoice.qr_code_token)
        
        assert public_invoice is not None
        assert public_invoice.id == invoice.id
        assert len(public_invoice.items) == 1
        
        # Create non-shareable invoice
        invoice_data.is_shareable = False
        private_invoice = service.create_invoice(data['tenant'].id, invoice_data)
        
        # Try to get private invoice publicly - should return None
        public_access = service.get_public_invoice(private_invoice.qr_code_token or "fake_token")
        assert public_access is None