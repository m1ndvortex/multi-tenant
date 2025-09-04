"""
Unit tests for advanced reporting system
"""

import pytest
from decimal import Decimal
from datetime import datetime, date, timedelta
from uuid import uuid4
from sqlalchemy.orm import Session

from app.services.reports_service import ReportsService
from app.models.tenant import Tenant
from app.models.user import User
from app.models.customer import Customer, CustomerType
from app.models.product import Product, ProductCategory
from app.models.invoice import Invoice, InvoiceItem, InvoiceType, InvoiceStatus
from app.models.accounting import CustomerPayment
from app.schemas.reports import SalesTrendPeriod, ReportFilters
from tests.conftest import TestDatabase


class TestReportsService:
    """Test cases for ReportsService"""
    
    @pytest.fixture
    def db_session(self):
        """Create test database session"""
        test_db = TestDatabase()
        session = test_db.get_session()
        yield session
        session.close()
        test_db.cleanup()
    
    @pytest.fixture
    def sample_tenant(self, db_session: Session):
        """Create sample tenant for testing"""
        from app.models.tenant import SubscriptionType, TenantStatus
        
        tenant = Tenant(
            id=uuid4(),
            name="Test Tenant",
            email="test@example.com",
            subscription_type=SubscriptionType.PRO,
            status=TenantStatus.ACTIVE,
            is_active=True
        )
        db_session.add(tenant)
        db_session.commit()
        return tenant
    
    @pytest.fixture
    def sample_customers(self, db_session: Session, sample_tenant: Tenant):
        """Create sample customers for testing"""
        customers = []
        
        # Individual customer
        customer1 = Customer(
            id=uuid4(),
            tenant_id=sample_tenant.id,
            name="John Doe",
            email="john@example.com",
            customer_type=CustomerType.INDIVIDUAL,
            total_debt=Decimal('1000.00')
        )
        
        # Business customer
        customer2 = Customer(
            id=uuid4(),
            tenant_id=sample_tenant.id,
            name="ABC Company",
            email="contact@abc.com",
            customer_type=CustomerType.BUSINESS,
            business_name="ABC Company Ltd",
            total_debt=Decimal('2500.00')
        )
        
        # VIP customer
        customer3 = Customer(
            id=uuid4(),
            tenant_id=sample_tenant.id,
            name="VIP Customer",
            email="vip@example.com",
            customer_type=CustomerType.VIP,
            total_debt=Decimal('500.00')
        )
        
        customers.extend([customer1, customer2, customer3])
        db_session.add_all(customers)
        db_session.commit()
        return customers
    
    @pytest.fixture
    def sample_categories(self, db_session: Session, sample_tenant: Tenant):
        """Create sample product categories"""
        categories = []
        
        category1 = ProductCategory(
            id=uuid4(),
            tenant_id=sample_tenant.id,
            name="Electronics"
        )
        
        category2 = ProductCategory(
            id=uuid4(),
            tenant_id=sample_tenant.id,
            name="Gold Jewelry"
        )
        
        categories.extend([category1, category2])
        db_session.add_all(categories)
        db_session.commit()
        return categories
    
    @pytest.fixture
    def sample_products(self, db_session: Session, sample_tenant: Tenant, sample_categories):
        """Create sample products for testing"""
        products = []
        
        # Regular product
        product1 = Product(
            id=uuid4(),
            tenant_id=sample_tenant.id,
            name="Laptop",
            category_id=sample_categories[0].id,
            cost_price=Decimal('800.00'),
            selling_price=Decimal('1200.00'),
            stock_quantity=10
        )
        
        # Gold product
        product2 = Product(
            id=uuid4(),
            tenant_id=sample_tenant.id,
            name="Gold Ring",
            category_id=sample_categories[1].id,
            cost_price=Decimal('500.00'),
            selling_price=Decimal('750.00'),
            is_gold_product=True,
            gold_purity=Decimal('18.000'),
            weight_per_unit=Decimal('5.500'),
            stock_quantity=5
        )
        
        # Service product
        product3 = Product(
            id=uuid4(),
            tenant_id=sample_tenant.id,
            name="Consultation",
            category_id=sample_categories[0].id,
            cost_price=Decimal('0.00'),
            selling_price=Decimal('100.00'),
            is_service=True,
            track_inventory=False
        )
        
        products.extend([product1, product2, product3])
        db_session.add_all(products)
        db_session.commit()
        return products
    
    @pytest.fixture
    def sample_invoices(self, db_session: Session, sample_tenant: Tenant, sample_customers, sample_products):
        """Create sample invoices with items for testing"""
        invoices = []
        
        # Create invoices over the last 60 days
        base_date = datetime.now() - timedelta(days=60)
        
        for i in range(20):  # Create 20 invoices
            invoice_date = base_date + timedelta(days=i * 3)
            customer = sample_customers[i % len(sample_customers)]
            
            # Alternate between general and gold invoices
            invoice_type = InvoiceType.GOLD if i % 2 == 0 else InvoiceType.GENERAL
            
            invoice = Invoice(
                id=uuid4(),
                tenant_id=sample_tenant.id,
                customer_id=customer.id,
                invoice_number=f"INV-{i+1:04d}",
                invoice_type=invoice_type,
                invoice_date=invoice_date,
                due_date=invoice_date + timedelta(days=30),
                status=InvoiceStatus.PAID if i < 15 else InvoiceStatus.SENT,  # First 15 are paid
                subtotal=Decimal('0'),
                tax_amount=Decimal('0'),
                total_amount=Decimal('0'),
                paid_amount=Decimal('0')
            )
            
            # Add invoice items
            items = []
            total_amount = Decimal('0')
            
            # Add 1-3 items per invoice
            for j in range((i % 3) + 1):
                product = sample_products[j % len(sample_products)]
                quantity = Decimal(str(j + 1))
                unit_price = product.selling_price
                line_total = quantity * unit_price
                
                item = InvoiceItem(
                    id=uuid4(),
                    invoice_id=invoice.id,
                    product_id=product.id,
                    description=product.name,
                    quantity=quantity,
                    unit_price=unit_price,
                    line_total=line_total,
                    tax_rate=Decimal('9.00'),  # 9% tax
                    tax_amount=line_total * Decimal('0.09')
                )
                
                # Add gold-specific fields for gold products
                if product.is_gold_product:
                    item.weight = quantity * product.weight_per_unit
                    item.labor_fee = Decimal('50.00')
                    item.profit = Decimal('100.00')
                    item.vat_amount = Decimal('25.00')
                
                items.append(item)
                total_amount += line_total + item.tax_amount
            
            invoice.total_amount = total_amount
            invoice.subtotal = total_amount - sum(item.tax_amount for item in items)
            invoice.tax_amount = sum(item.tax_amount for item in items)
            
            # Set paid amount for paid invoices
            if invoice.status == InvoiceStatus.PAID:
                invoice.paid_amount = invoice.total_amount
            
            invoices.append(invoice)
            db_session.add(invoice)
            db_session.add_all(items)
        
        db_session.commit()
        return invoices
    
    def test_sales_trends_daily(self, db_session: Session, sample_tenant: Tenant, sample_invoices):
        """Test daily sales trend analysis"""
        reports_service = ReportsService(db_session)
        
        # Test daily trends for last 30 days
        end_date = date.today()
        start_date = end_date - timedelta(days=30)
        
        result = reports_service.get_sales_trends(
            tenant_id=sample_tenant.id,
            period=SalesTrendPeriod.DAILY,
            start_date=start_date,
            end_date=end_date
        )
        
        assert result.period == SalesTrendPeriod.DAILY
        assert result.start_date == start_date
        assert result.end_date == end_date
        assert isinstance(result.data, list)
        assert 'total_sales' in result.summary
        assert 'total_invoices' in result.summary
        assert 'average_invoice' in result.summary
        assert 'growth_rate' in result.summary
        
        # Verify data structure
        if result.data:
            first_item = result.data[0]
            assert hasattr(first_item, 'period')
            assert hasattr(first_item, 'invoice_count')
            assert hasattr(first_item, 'total_sales')
            assert hasattr(first_item, 'general_sales')
            assert hasattr(first_item, 'gold_sales')
    
    def test_sales_trends_weekly(self, db_session: Session, sample_tenant: Tenant, sample_invoices):
        """Test weekly sales trend analysis"""
        reports_service = ReportsService(db_session)
        
        result = reports_service.get_sales_trends(
            tenant_id=sample_tenant.id,
            period=SalesTrendPeriod.WEEKLY,
            start_date=date.today() - timedelta(weeks=8),
            end_date=date.today()
        )
        
        assert result.period == SalesTrendPeriod.WEEKLY
        assert isinstance(result.data, list)
        assert result.summary['total_sales'] >= 0
    
    def test_sales_trends_monthly(self, db_session: Session, sample_tenant: Tenant, sample_invoices):
        """Test monthly sales trend analysis"""
        reports_service = ReportsService(db_session)
        
        result = reports_service.get_sales_trends(
            tenant_id=sample_tenant.id,
            period=SalesTrendPeriod.MONTHLY,
            start_date=date.today() - timedelta(days=365),
            end_date=date.today()
        )
        
        assert result.period == SalesTrendPeriod.MONTHLY
        assert isinstance(result.data, list)
        assert result.summary['total_sales'] >= 0
    
    def test_sales_trends_with_filters(self, db_session: Session, sample_tenant: Tenant, sample_customers, sample_invoices):
        """Test sales trends with customer filters"""
        reports_service = ReportsService(db_session)
        
        # Filter by specific customer
        filters = ReportFilters(customer_ids=[sample_customers[0].id])
        
        result = reports_service.get_sales_trends(
            tenant_id=sample_tenant.id,
            period=SalesTrendPeriod.DAILY,
            filters=filters
        )
        
        assert isinstance(result.data, list)
        # Should have data only for the filtered customer
        assert result.summary['total_sales'] >= 0
    
    def test_profit_loss_report(self, db_session: Session, sample_tenant: Tenant, sample_invoices):
        """Test profit & loss report generation"""
        reports_service = ReportsService(db_session)
        
        start_date = date.today() - timedelta(days=60)
        end_date = date.today()
        
        result = reports_service.get_profit_loss_report(
            tenant_id=sample_tenant.id,
            start_date=start_date,
            end_date=end_date,
            include_categories=True
        )
        
        assert result.start_date == start_date
        assert result.end_date == end_date
        assert hasattr(result.data, 'total_revenue')
        assert hasattr(result.data, 'general_revenue')
        assert hasattr(result.data, 'gold_revenue')
        assert hasattr(result.data, 'cost_of_goods_sold')
        assert hasattr(result.data, 'gross_profit')
        assert hasattr(result.data, 'gross_margin')
        assert isinstance(result.data.categories, list)
        
        # Verify calculations
        assert result.data.total_revenue >= 0
        assert result.data.gross_profit == result.data.total_revenue - result.data.cost_of_goods_sold
        
        # Verify category breakdown
        if result.data.categories:
            category = result.data.categories[0]
            assert hasattr(category, 'name')
            assert hasattr(category, 'revenue')
            assert hasattr(category, 'cost_of_goods')
            assert hasattr(category, 'gross_profit')
            assert hasattr(category, 'profit_margin')
    
    def test_customer_analytics(self, db_session: Session, sample_tenant: Tenant, sample_customers, sample_invoices):
        """Test customer analytics generation"""
        reports_service = ReportsService(db_session)
        
        result = reports_service.get_customer_analytics(
            tenant_id=sample_tenant.id,
            top_customers_limit=5
        )
        
        assert hasattr(result.data, 'total_customers')
        assert hasattr(result.data, 'active_customers')
        assert hasattr(result.data, 'top_customers')
        assert hasattr(result.data, 'customer_segmentation')
        assert hasattr(result.data, 'monthly_purchase_patterns')
        
        assert result.data.total_customers >= 0
        assert result.data.active_customers >= 0
        assert isinstance(result.data.top_customers, list)
        assert len(result.data.top_customers) <= 5
        
        # Verify top customer data structure
        if result.data.top_customers:
            top_customer = result.data.top_customers[0]
            assert hasattr(top_customer, 'customer_id')
            assert hasattr(top_customer, 'customer_name')
            assert hasattr(top_customer, 'total_spent')
            assert hasattr(top_customer, 'invoice_count')
            assert hasattr(top_customer, 'average_order_value')
            assert hasattr(top_customer, 'purchase_frequency')
        
        # Verify segmentation data
        assert isinstance(result.data.customer_segmentation, dict)
        
        # Verify monthly patterns
        assert isinstance(result.data.monthly_purchase_patterns, dict)
    
    def test_aging_report(self, db_session: Session, sample_tenant: Tenant, sample_customers, sample_invoices):
        """Test accounts receivable aging report"""
        reports_service = ReportsService(db_session)
        
        result = reports_service.get_receivables_aging_report(
            tenant_id=sample_tenant.id,
            as_of_date=date.today()
        )
        
        assert result.as_of_date == date.today()
        assert hasattr(result, 'total_receivables')
        assert hasattr(result, 'buckets')
        assert hasattr(result, 'customers')
        
        assert result.total_receivables >= 0
        assert isinstance(result.buckets, list)
        assert len(result.buckets) == 5  # Current, 1-30, 31-60, 61-90, Over 90
        
        # Verify bucket structure
        for bucket in result.buckets:
            assert hasattr(bucket, 'name')
            assert hasattr(bucket, 'min_days')
            assert hasattr(bucket, 'max_days')
            assert hasattr(bucket, 'amount')
            assert hasattr(bucket, 'count')
        
        # Verify customer aging data
        assert isinstance(result.customers, list)
        if result.customers:
            customer_aging = result.customers[0]
            assert hasattr(customer_aging, 'customer_id')
            assert hasattr(customer_aging, 'customer_name')
            assert hasattr(customer_aging, 'total_balance')
            assert hasattr(customer_aging, 'current')
            assert hasattr(customer_aging, 'days_1_30')
            assert hasattr(customer_aging, 'days_31_60')
            assert hasattr(customer_aging, 'days_61_90')
            assert hasattr(customer_aging, 'over_90_days')
    
    def test_aging_report_with_filters(self, db_session: Session, sample_tenant: Tenant, sample_customers, sample_invoices):
        """Test aging report with customer filters"""
        reports_service = ReportsService(db_session)
        
        # Filter by specific customer
        filters = ReportFilters(customer_ids=[sample_customers[0].id])
        
        result = reports_service.get_receivables_aging_report(
            tenant_id=sample_tenant.id,
            filters=filters
        )
        
        assert isinstance(result.customers, list)
        # Should only include the filtered customer if they have outstanding balance
        for customer_aging in result.customers:
            assert customer_aging.customer_id == sample_customers[0].id
    
    def test_data_accuracy_calculations(self, db_session: Session, sample_tenant: Tenant, sample_invoices):
        """Test accuracy of report calculations"""
        reports_service = ReportsService(db_session)
        
        # Get profit & loss report
        start_date = date.today() - timedelta(days=60)
        end_date = date.today()
        
        pl_result = reports_service.get_profit_loss_report(
            tenant_id=sample_tenant.id,
            start_date=start_date,
            end_date=end_date
        )
        
        # Verify that general + gold revenue equals total revenue
        assert pl_result.data.total_revenue == pl_result.data.general_revenue + pl_result.data.gold_revenue
        
        # Verify gross profit calculation
        expected_gross_profit = pl_result.data.total_revenue - pl_result.data.cost_of_goods_sold
        assert pl_result.data.gross_profit == expected_gross_profit
        
        # Verify gross margin calculation
        if pl_result.data.total_revenue > 0:
            expected_margin = (pl_result.data.gross_profit / pl_result.data.total_revenue) * 100
            assert abs(pl_result.data.gross_margin - expected_margin) < Decimal('0.01')
    
    def test_multi_tenant_isolation(self, db_session: Session):
        """Test that reports are properly isolated by tenant"""
        from app.models.tenant import SubscriptionType, TenantStatus
        
        # Create two tenants
        tenant1 = Tenant(
            id=uuid4(), 
            name="Tenant 1", 
            email="tenant1@example.com",
            subscription_type=SubscriptionType.FREE,
            status=TenantStatus.ACTIVE,
            is_active=True
        )
        tenant2 = Tenant(
            id=uuid4(), 
            name="Tenant 2", 
            email="tenant2@example.com",
            subscription_type=SubscriptionType.FREE,
            status=TenantStatus.ACTIVE,
            is_active=True
        )
        db_session.add_all([tenant1, tenant2])
        
        # Create customers for each tenant
        customer1 = Customer(id=uuid4(), tenant_id=tenant1.id, name="Customer 1")
        customer2 = Customer(id=uuid4(), tenant_id=tenant2.id, name="Customer 2")
        db_session.add_all([customer1, customer2])
        
        # Create invoices for each tenant
        invoice1 = Invoice(
            id=uuid4(),
            tenant_id=tenant1.id,
            customer_id=customer1.id,
            invoice_number="INV-001",
            invoice_type=InvoiceType.GENERAL,
            total_amount=Decimal('1000.00'),
            status=InvoiceStatus.PAID,
            paid_amount=Decimal('1000.00')
        )
        
        invoice2 = Invoice(
            id=uuid4(),
            tenant_id=tenant2.id,
            customer_id=customer2.id,
            invoice_number="INV-001",
            invoice_type=InvoiceType.GENERAL,
            total_amount=Decimal('2000.00'),
            status=InvoiceStatus.PAID,
            paid_amount=Decimal('2000.00')
        )
        
        db_session.add_all([invoice1, invoice2])
        db_session.commit()
        
        reports_service = ReportsService(db_session)
        
        # Get sales trends for tenant 1
        result1 = reports_service.get_sales_trends(
            tenant_id=tenant1.id,
            period=SalesTrendPeriod.DAILY
        )
        
        # Get sales trends for tenant 2
        result2 = reports_service.get_sales_trends(
            tenant_id=tenant2.id,
            period=SalesTrendPeriod.DAILY
        )
        
        # Verify data isolation
        assert result1.summary['total_sales'] == 1000.00
        assert result2.summary['total_sales'] == 2000.00
    
    def test_empty_data_handling(self, db_session: Session, sample_tenant: Tenant):
        """Test handling of empty data scenarios"""
        reports_service = ReportsService(db_session)
        
        # Test with no invoices
        result = reports_service.get_sales_trends(
            tenant_id=sample_tenant.id,
            period=SalesTrendPeriod.DAILY
        )
        
        assert result.summary['total_sales'] == 0
        assert result.summary['total_invoices'] == 0
        assert result.summary['average_invoice'] == 0
        assert len(result.data) == 0
    
    def test_date_range_validation(self, db_session: Session, sample_tenant: Tenant):
        """Test date range handling and validation"""
        reports_service = ReportsService(db_session)
        
        # Test with future dates (should return empty results)
        future_start = date.today() + timedelta(days=30)
        future_end = date.today() + timedelta(days=60)
        
        result = reports_service.get_sales_trends(
            tenant_id=sample_tenant.id,
            period=SalesTrendPeriod.DAILY,
            start_date=future_start,
            end_date=future_end
        )
        
        assert result.summary['total_sales'] == 0
        assert len(result.data) == 0
    
    def test_large_dataset_performance(self, db_session: Session, sample_tenant: Tenant):
        """Test performance with larger datasets"""
        # This test would be expanded in a real scenario to test with thousands of records
        # For now, we'll just verify the service can handle the test data efficiently
        reports_service = ReportsService(db_session)
        
        import time
        start_time = time.time()
        
        result = reports_service.get_sales_trends(
            tenant_id=sample_tenant.id,
            period=SalesTrendPeriod.DAILY
        )
        
        end_time = time.time()
        execution_time = end_time - start_time
        
        # Should complete within reasonable time (adjust threshold as needed)
        assert execution_time < 5.0  # 5 seconds max
        assert isinstance(result.data, list)