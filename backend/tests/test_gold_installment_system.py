"""
Comprehensive tests for Gold Installment System with price fluctuation scenarios
Tests weight-based debt tracking, gold price management, and payment calculations
"""

import pytest
from decimal import Decimal
from datetime import datetime, timedelta, date
from sqlalchemy.orm import Session
import uuid

from app.core.database import get_db
from app.models.tenant import Tenant
from app.models.user import User
from app.models.customer import Customer
from app.models.product import Product
from app.models.invoice import Invoice, InvoiceType, InvoiceStatus, InvoiceItem
from app.models.installment import Installment, InstallmentType, InstallmentStatus
from app.models.gold_price import GoldPrice, GoldPriceSource
from app.services.gold_installment_service import GoldInstallmentService
from app.core.exceptions import ValidationError, NotFoundError, BusinessLogicError


class TestGoldInstallmentSystem:
    """Test suite for gold installment system with comprehensive scenarios"""
    
    @pytest.fixture
    def db_session(self, db):
        """Database session fixture"""
        return db
    
    @pytest.fixture
    def tenant(self, db_session):
        """Create test tenant"""
        tenant = Tenant(
            name="Gold Business Test",
            domain="goldtest.hesaabplus.com",
            subscription_type="pro",
            is_active=True
        )
        db_session.add(tenant)
        db_session.commit()
        db_session.refresh(tenant)
        return tenant
    
    @pytest.fixture
    def user(self, db_session, tenant):
        """Create test user"""
        user = User(
            tenant_id=tenant.id,
            email="golduser@test.com",
            password_hash="hashed_password",
            role="admin",
            is_active=True
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
        return user
    
    @pytest.fixture
    def customer(self, db_session, tenant):
        """Create test customer"""
        customer = Customer(
            tenant_id=tenant.id,
            name="Gold Customer",
            email="customer@test.com",
            phone="+98912345678"
        )
        db_session.add(customer)
        db_session.commit()
        db_session.refresh(customer)
        return customer
    
    @pytest.fixture
    def gold_product(self, db_session, tenant):
        """Create gold product"""
        product = Product(
            tenant_id=tenant.id,
            name="18K Gold Ring",
            description="Beautiful 18K gold ring",
            category="Jewelry",
            price=Decimal('5000000'),  # 5M IRR
            stock_quantity=10
        )
        db_session.add(product)
        db_session.commit()
        db_session.refresh(product)
        return product
    
    @pytest.fixture
    def gold_invoice(self, db_session, tenant, customer, gold_product):
        """Create gold invoice with items"""
        invoice = Invoice(
            tenant_id=tenant.id,
            customer_id=customer.id,
            invoice_number="GOLD-001",
            invoice_type=InvoiceType.GOLD,
            subtotal=Decimal('10000000'),
            total_amount=Decimal('10000000'),
            total_gold_weight=Decimal('50.000'),  # 50 grams
            gold_price_at_creation=Decimal('2000000'),  # 2M IRR per gram
            status=InvoiceStatus.SENT
        )
        db_session.add(invoice)
        db_session.flush()
        
        # Add invoice items
        item = InvoiceItem(
            invoice_id=invoice.id,
            product_id=gold_product.id,
            description="18K Gold Ring",
            quantity=Decimal('2'),
            unit_price=Decimal('5000000'),
            line_total=Decimal('10000000'),
            weight=Decimal('50.000'),  # 50 grams total
            labor_fee=Decimal('500000'),
            profit=Decimal('1000000'),
            vat_amount=Decimal('500000')
        )
        db_session.add(item)
        
        db_session.commit()
        db_session.refresh(invoice)
        return invoice
    
    @pytest.fixture
    def gold_service(self, db_session):
        """Create gold installment service"""
        return GoldInstallmentService(db_session)
    
    def test_create_gold_installment_plan(self, gold_service, tenant, gold_invoice):
        """Test creating gold installment plan with weight-based tracking"""
        # Create 6-month installment plan
        installments = gold_service.create_gold_installment_plan(
            tenant_id=tenant.id,
            invoice_id=gold_invoice.id,
            number_of_installments=6,
            interval_days=30
        )
        
        # Verify installments created
        assert len(installments) == 6
        
        # Verify weight distribution
        total_weight = sum(inst.gold_weight_due for inst in installments)
        assert total_weight == gold_invoice.total_gold_weight
        
        # Verify each installment
        expected_weight_per_installment = gold_invoice.total_gold_weight / 6
        for i, installment in enumerate(installments):
            assert installment.installment_number == i + 1
            assert installment.installment_type == InstallmentType.GOLD
            assert installment.status == InstallmentStatus.PENDING
            assert installment.gold_weight_due > 0
            assert installment.gold_weight_paid == 0
            
            # Check weight distribution (allowing for rounding)
            if i < 5:  # First 5 installments
                assert abs(installment.gold_weight_due - expected_weight_per_installment) < Decimal('0.001')
            else:  # Last installment gets remainder
                assert installment.gold_weight_due >= expected_weight_per_installment
        
        # Verify invoice updated
        assert gold_invoice.is_installment is True
        assert gold_invoice.installment_type == "gold"
        assert gold_invoice.remaining_gold_weight == gold_invoice.total_gold_weight
    
    def test_set_daily_gold_price(self, gold_service, tenant):
        """Test setting daily gold price with historical tracking"""
        # Set initial gold price
        price_date = datetime.utcnow()
        gold_price = gold_service.set_daily_gold_price(
            tenant_id=tenant.id,
            price_per_gram=Decimal('2000000'),  # 2M IRR per gram
            gold_purity=Decimal('18.000'),
            price_date=price_date,
            source=GoldPriceSource.MANUAL,
            market_name="Tehran Gold Market",
            buy_price=Decimal('1950000'),
            sell_price=Decimal('2050000'),
            notes="Initial price setting"
        )
        
        # Verify price created
        assert gold_price.price_per_gram == Decimal('2000000')
        assert gold_price.gold_purity == Decimal('18.000')
        assert gold_price.is_current is True
        assert gold_price.is_active is True
        assert gold_price.source == GoldPriceSource.MANUAL
        
        # Set price for next day (price increase)
        next_day = price_date + timedelta(days=1)
        new_price = gold_service.set_daily_gold_price(
            tenant_id=tenant.id,
            price_per_gram=Decimal('2100000'),  # 5% increase
            gold_purity=Decimal('18.000'),
            price_date=next_day,
            source=GoldPriceSource.MANUAL
        )
        
        # Verify new price is current
        assert new_price.price_per_gram == Decimal('2100000')
        assert new_price.is_current is True
        
        # Verify old price is no longer current
        gold_service.db.refresh(gold_price)
        assert gold_price.is_current is False
    
    def test_get_gold_price_on_date(self, gold_service, tenant):
        """Test retrieving gold price for specific dates"""
        # Set prices for multiple days
        base_date = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        
        prices = [
            (base_date, Decimal('2000000')),
            (base_date + timedelta(days=1), Decimal('2050000')),
            (base_date + timedelta(days=2), Decimal('2100000')),
            (base_date + timedelta(days=3), Decimal('2080000')),
        ]
        
        for price_date, price_value in prices:
            gold_service.set_daily_gold_price(
                tenant_id=tenant.id,
                price_per_gram=price_value,
                price_date=price_date
            )
        
        # Test getting price on exact date
        price = gold_service.get_gold_price_on_date(
            tenant_id=tenant.id,
            target_date=base_date.date() + timedelta(days=2)
        )
        assert price.price_per_gram == Decimal('2100000')
        
        # Test getting price for date without exact match (should get latest before)
        price = gold_service.get_gold_price_on_date(
            tenant_id=tenant.id,
            target_date=base_date.date() + timedelta(days=10)
        )
        assert price.price_per_gram == Decimal('2080000')  # Latest available
    
    def test_record_gold_payment_with_price_fluctuation(self, gold_service, tenant, gold_invoice):
        """Test recording gold payments with fluctuating gold prices"""
        # Create installment plan
        installments = gold_service.create_gold_installment_plan(
            tenant_id=tenant.id,
            invoice_id=gold_invoice.id,
            number_of_installments=4,
            interval_days=30
        )
        
        # Set different gold prices for different payment dates
        base_date = datetime.utcnow()
        payment_scenarios = [
            (base_date, Decimal('2000000'), Decimal('5000000')),  # 2.5g @ 2M = 5M
            (base_date + timedelta(days=30), Decimal('2200000'), Decimal('5500000')),  # 2.5g @ 2.2M = 5.5M
            (base_date + timedelta(days=60), Decimal('1900000'), Decimal('4750000')),  # 2.5g @ 1.9M = 4.75M
            (base_date + timedelta(days=90), Decimal('2100000'), Decimal('5250000')),  # 2.5g @ 2.1M = 5.25M
        ]
        
        for i, (payment_date, gold_price, payment_amount) in enumerate(payment_scenarios):
            # Set gold price for payment date
            gold_service.set_daily_gold_price(
                tenant_id=tenant.id,
                price_per_gram=gold_price,
                price_date=payment_date
            )
            
            # Record payment
            installment, gold_weight_settled = gold_service.record_gold_payment(
                tenant_id=tenant.id,
                installment_id=installments[i].id,
                payment_amount=payment_amount,
                payment_date=payment_date,
                payment_method="cash",
                notes=f"Payment {i+1}"
            )
            
            # Verify payment recorded correctly
            expected_weight = payment_amount / gold_price
            expected_weight = expected_weight.quantize(Decimal('0.001'))
            
            assert gold_weight_settled == expected_weight
            assert installment.gold_price_at_payment == gold_price
            assert installment.amount_paid == payment_amount
            assert installment.gold_weight_paid == expected_weight
            
            # Check if installment is fully paid (allowing for small rounding differences)
            remaining_weight = installment.remaining_gold_weight
            if remaining_weight <= Decimal('0.001'):
                assert installment.status == InstallmentStatus.PAID
    
    def test_remaining_gold_weight_tracking(self, gold_service, tenant, gold_invoice):
        """Test remaining gold weight (مانده به گرم) tracking"""
        # Create installment plan
        installments = gold_service.create_gold_installment_plan(
            tenant_id=tenant.id,
            invoice_id=gold_invoice.id,
            number_of_installments=5,
            interval_days=30
        )
        
        # Set gold price
        gold_service.set_daily_gold_price(
            tenant_id=tenant.id,
            price_per_gram=Decimal('2000000')
        )
        
        # Make partial payments
        payment_amount = Decimal('4000000')  # Should settle 2g at 2M per gram
        
        # Pay first installment
        installment, weight_settled = gold_service.record_gold_payment(
            tenant_id=tenant.id,
            installment_id=installments[0].id,
            payment_amount=payment_amount
        )
        
        # Check remaining weight
        remaining_info = gold_service.get_remaining_gold_weight(
            tenant_id=tenant.id,
            invoice_id=gold_invoice.id
        )
        
        assert remaining_info['total_gold_weight'] == Decimal('50.000')
        assert remaining_info['total_weight_paid'] == Decimal('2.000')
        assert remaining_info['remaining_gold_weight'] == Decimal('48.000')
        assert remaining_info['pending_installments'] == 4
        assert remaining_info['paid_installments'] == 1
        assert remaining_info['is_fully_paid'] is False
        
        # Pay all remaining installments
        for i in range(1, 5):
            # Calculate payment needed for remaining weight
            remaining_weight = installments[i].gold_weight_due
            payment_needed = remaining_weight * Decimal('2000000')
            
            gold_service.record_gold_payment(
                tenant_id=tenant.id,
                installment_id=installments[i].id,
                payment_amount=payment_needed
            )
        
        # Check final remaining weight
        final_remaining = gold_service.get_remaining_gold_weight(
            tenant_id=tenant.id,
            invoice_id=gold_invoice.id
        )
        
        assert final_remaining['remaining_gold_weight'] <= Decimal('0.001')  # Allow for rounding
        assert final_remaining['is_fully_paid'] is True
        assert final_remaining['paid_installments'] == 5
    
    def test_gold_payment_history(self, gold_service, tenant, gold_invoice):
        """Test gold payment history tracking"""
        # Create installment plan
        installments = gold_service.create_gold_installment_plan(
            tenant_id=tenant.id,
            invoice_id=gold_invoice.id,
            number_of_installments=3,
            interval_days=30
        )
        
        # Make payments with different prices and dates
        payment_data = [
            (datetime.utcnow(), Decimal('2000000'), Decimal('6000000')),
            (datetime.utcnow() + timedelta(days=30), Decimal('2200000'), Decimal('6600000')),
            (datetime.utcnow() + timedelta(days=60), Decimal('1800000'), Decimal('5400000')),
        ]
        
        for i, (payment_date, gold_price, payment_amount) in enumerate(payment_data):
            # Set gold price
            gold_service.set_daily_gold_price(
                tenant_id=tenant.id,
                price_per_gram=gold_price,
                price_date=payment_date
            )
            
            # Record payment
            gold_service.record_gold_payment(
                tenant_id=tenant.id,
                installment_id=installments[i].id,
                payment_amount=payment_amount,
                payment_date=payment_date,
                payment_method=f"method_{i+1}",
                payment_reference=f"ref_{i+1}"
            )
        
        # Get payment history
        history = gold_service.get_gold_payment_history(
            tenant_id=tenant.id,
            invoice_id=gold_invoice.id
        )
        
        # Verify history
        assert len(history) == 3
        
        # Check payments are in reverse chronological order
        for i, payment in enumerate(history):
            expected_price = payment_data[2-i][1]  # Reverse order
            expected_amount = payment_data[2-i][2]
            
            assert payment['gold_price_at_payment'] == expected_price
            assert payment['currency_amount'] == expected_amount
            assert payment['payment_method'] == f"method_{3-i}"
            assert payment['payment_reference'] == f"ref_{3-i}"
    
    def test_overdue_gold_installments(self, gold_service, tenant, gold_invoice):
        """Test overdue gold installment detection"""
        # Create installment plan with past due dates
        past_date = datetime.utcnow() - timedelta(days=60)
        installments = gold_service.create_gold_installment_plan(
            tenant_id=tenant.id,
            invoice_id=gold_invoice.id,
            number_of_installments=4,
            start_date=past_date,
            interval_days=30
        )
        
        # Set gold price
        gold_service.set_daily_gold_price(
            tenant_id=tenant.id,
            price_per_gram=Decimal('2000000')
        )
        
        # Pay only the first installment
        gold_service.record_gold_payment(
            tenant_id=tenant.id,
            installment_id=installments[0].id,
            payment_amount=Decimal('5000000')  # Enough to pay first installment
        )
        
        # Get overdue installments
        overdue = gold_service.get_overdue_gold_installments(tenant_id=tenant.id)
        
        # Should have 2 overdue installments (2nd and 3rd are past due, 4th is current)
        overdue_count = sum(1 for inst in overdue if inst.is_overdue)
        assert overdue_count >= 2
        
        # Check overdue status
        for installment in overdue:
            if installment.is_overdue:
                assert installment.status in [InstallmentStatus.PENDING, InstallmentStatus.OVERDUE]
                assert installment.days_overdue > 0
    
    def test_gold_weight_calculations(self, gold_service, tenant):
        """Test gold weight and payment calculations"""
        # Set gold price
        gold_service.set_daily_gold_price(
            tenant_id=tenant.id,
            price_per_gram=Decimal('2500000')  # 2.5M IRR per gram
        )
        
        # Test payment calculation for weight
        result = gold_service.calculate_payment_for_weight(
            tenant_id=tenant.id,
            gold_weight=Decimal('10.500'),  # 10.5 grams
            payment_date=datetime.utcnow().date()
        )
        
        expected_payment = Decimal('10.500') * Decimal('2500000')
        assert result['payment_amount'] == expected_payment
        assert result['gold_weight'] == Decimal('10.500')
        assert result['gold_price_per_gram'] == Decimal('2500000')
        
        # Test weight calculation for payment
        result = gold_service.calculate_weight_for_payment(
            tenant_id=tenant.id,
            payment_amount=Decimal('7500000'),  # 7.5M IRR
            payment_date=datetime.utcnow().date()
        )
        
        expected_weight = Decimal('7500000') / Decimal('2500000')
        expected_weight = expected_weight.quantize(Decimal('0.001'))
        assert result['gold_weight'] == expected_weight
        assert result['payment_amount'] == Decimal('7500000')
    
    def test_gold_installment_statistics(self, gold_service, tenant, gold_invoice):
        """Test gold installment statistics calculation"""
        # Create installment plan
        installments = gold_service.create_gold_installment_plan(
            tenant_id=tenant.id,
            invoice_id=gold_invoice.id,
            number_of_installments=5,
            interval_days=30
        )
        
        # Set gold price
        gold_service.set_daily_gold_price(
            tenant_id=tenant.id,
            price_per_gram=Decimal('2000000')
        )
        
        # Make some payments
        for i in range(2):  # Pay first 2 installments
            payment_amount = installments[i].gold_weight_due * Decimal('2000000')
            gold_service.record_gold_payment(
                tenant_id=tenant.id,
                installment_id=installments[i].id,
                payment_amount=payment_amount
            )
        
        # Get statistics
        stats = gold_service.get_gold_installment_statistics(tenant_id=tenant.id)
        
        # Verify statistics
        assert stats['total_installments'] == 5
        assert stats['paid_installments'] == 2
        assert stats['pending_installments'] == 3
        assert stats['gold_installment_invoices'] == 1
        assert stats['total_weight_due'] == Decimal('50.000')
        assert stats['total_weight_paid'] > 0
        assert stats['outstanding_weight'] > 0
        assert stats['current_gold_price'] == Decimal('2000000')
        assert stats['collection_rate'] > 0
    
    def test_validation_errors(self, gold_service, tenant, gold_invoice):
        """Test validation errors in gold installment system"""
        # Test creating installments for non-gold invoice
        gold_invoice.invoice_type = InvoiceType.GENERAL
        gold_service.db.commit()
        
        with pytest.raises(ValidationError, match="Gold installments can only be created for gold invoices"):
            gold_service.create_gold_installment_plan(
                tenant_id=tenant.id,
                invoice_id=gold_invoice.id,
                number_of_installments=3
            )
        
        # Reset invoice type
        gold_invoice.invoice_type = InvoiceType.GOLD
        gold_service.db.commit()
        
        # Test invalid number of installments
        with pytest.raises(ValidationError, match="Number of installments must be between 2 and 60"):
            gold_service.create_gold_installment_plan(
                tenant_id=tenant.id,
                invoice_id=gold_invoice.id,
                number_of_installments=1
            )
        
        # Test invalid gold price
        with pytest.raises(ValidationError, match="Gold price must be positive"):
            gold_service.set_daily_gold_price(
                tenant_id=tenant.id,
                price_per_gram=Decimal('-1000')
            )
    
    def test_business_logic_errors(self, gold_service, tenant, gold_invoice):
        """Test business logic errors"""
        # Create installments
        installments = gold_service.create_gold_installment_plan(
            tenant_id=tenant.id,
            invoice_id=gold_invoice.id,
            number_of_installments=3
        )
        
        # Try to create installments again
        with pytest.raises(BusinessLogicError, match="Invoice already has installments"):
            gold_service.create_gold_installment_plan(
                tenant_id=tenant.id,
                invoice_id=gold_invoice.id,
                number_of_installments=3
            )
        
        # Test payment without gold price
        with pytest.raises(BusinessLogicError, match="No gold price found"):
            gold_service.record_gold_payment(
                tenant_id=tenant.id,
                installment_id=installments[0].id,
                payment_amount=Decimal('1000000'),
                payment_date=datetime.utcnow() + timedelta(days=365)  # Future date with no price
            )
    
    def test_price_fluctuation_scenarios(self, gold_service, tenant, gold_invoice):
        """Test complex price fluctuation scenarios"""
        # Create installment plan
        installments = gold_service.create_gold_installment_plan(
            tenant_id=tenant.id,
            invoice_id=gold_invoice.id,
            number_of_installments=6,
            interval_days=30
        )
        
        # Simulate volatile gold market over 6 months
        base_date = datetime.utcnow()
        price_scenarios = [
            # Month 1: Stable
            (base_date, Decimal('2000000')),
            # Month 2: Sharp increase
            (base_date + timedelta(days=30), Decimal('2400000')),
            # Month 3: Correction
            (base_date + timedelta(days=60), Decimal('2200000')),
            # Month 4: Further decline
            (base_date + timedelta(days=90), Decimal('1900000')),
            # Month 5: Recovery
            (base_date + timedelta(days=120), Decimal('2100000')),
            # Month 6: New high
            (base_date + timedelta(days=150), Decimal('2600000')),
        ]
        
        total_payments = Decimal('0')
        total_weight_settled = Decimal('0')
        
        for i, (payment_date, gold_price) in enumerate(price_scenarios):
            # Set gold price for the month
            gold_service.set_daily_gold_price(
                tenant_id=tenant.id,
                price_per_gram=gold_price,
                price_date=payment_date
            )
            
            # Customer pays fixed amount each month
            fixed_payment = Decimal('5000000')  # 5M IRR per month
            
            installment, weight_settled = gold_service.record_gold_payment(
                tenant_id=tenant.id,
                installment_id=installments[i].id,
                payment_amount=fixed_payment,
                payment_date=payment_date
            )
            
            total_payments += fixed_payment
            total_weight_settled += weight_settled
            
            # Verify weight settled varies with price
            expected_weight = fixed_payment / gold_price
            expected_weight = expected_weight.quantize(Decimal('0.001'))
            assert weight_settled == expected_weight
        
        # Verify total tracking
        remaining_info = gold_service.get_remaining_gold_weight(
            tenant_id=tenant.id,
            invoice_id=gold_invoice.id
        )
        
        assert remaining_info['total_weight_paid'] == total_weight_settled
        
        # Get payment history and verify price variations
        history = gold_service.get_gold_payment_history(
            tenant_id=tenant.id,
            invoice_id=gold_invoice.id
        )
        
        # Verify different gold prices were used
        prices_used = [payment['gold_price_at_payment'] for payment in history]
        assert len(set(prices_used)) > 1  # Multiple different prices used
        
        # Verify weight settled varies inversely with price
        weights_settled = [payment['gold_weight_paid'] for payment in history]
        assert max(weights_settled) > min(weights_settled)  # Weight variation due to price changes