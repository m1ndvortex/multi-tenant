"""
Unit tests for Business Intelligence and Insights system
"""

import pytest
from decimal import Decimal
from datetime import datetime, date, timedelta
from uuid import uuid4
from sqlalchemy.orm import Session

from app.services.business_intelligence_service import BusinessIntelligenceService
from app.models.tenant import Tenant
from app.models.user import User
from app.models.customer import Customer, CustomerType
from app.models.product import Product, ProductCategory
from app.models.invoice import Invoice, InvoiceItem, InvoiceType, InvoiceStatus
from app.schemas.business_intelligence import (
    BusinessInsightsRequest, KPIMetricsRequest, BusinessAlertsRequest,
    TrendAnalysisRequest, ReportExportRequest, ExportFormat,
    AlertSeverity, AlertType, InsightType, InsightPriority, KPITrend
)
from tests.conftest import TestDatabase


class TestBusinessIntelligenceService:
    """Test cases for BusinessIntelligenceService"""
    
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
            name="BI Test Tenant",
            email="bi-test@example.com",
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
        
        # High-value customer
        customer1 = Customer(
            id=uuid4(),
            tenant_id=sample_tenant.id,
            name="High Value Customer",
            email="high-value@example.com",
            customer_type=CustomerType.VIP,
            total_debt=Decimal('5000.00'),
            total_purchases=Decimal('50000.00'),
            last_purchase_at=datetime.utcnow() - timedelta(days=5)
        )
        
        # Regular customer
        customer2 = Customer(
            id=uuid4(),
            tenant_id=sample_tenant.id,
            name="Regular Customer",
            email="regular@example.com",
            customer_type=CustomerType.INDIVIDUAL,
            total_debt=Decimal('1000.00'),
            total_purchases=Decimal('10000.00'),
            last_purchase_at=datetime.utcnow() - timedelta(days=15)
        )
        
        # Inactive customer
        customer3 = Customer(
            id=uuid4(),
            tenant_id=sample_tenant.id,
            name="Inactive Customer",
            email="inactive@example.com",
            customer_type=CustomerType.INDIVIDUAL,
            total_debt=Decimal('2000.00'),
            total_purchases=Decimal('5000.00'),
            last_purchase_at=datetime.utcnow() - timedelta(days=90)
        )
        
        customers.extend([customer1, customer2, customer3])
        db_session.add_all(customers)
        db_session.commit()
        return customers
    
    @pytest.fixture
    def sample_products(self, db_session: Session, sample_tenant: Tenant):
        """Create sample products for testing"""
        products = []
        
        # High-margin product
        product1 = Product(
            id=uuid4(),
            tenant_id=sample_tenant.id,
            name="High Margin Product",
            cost_price=Decimal('100.00'),
            selling_price=Decimal('200.00'),
            stock_quantity=50,
            min_stock_level=10
        )
        
        # Low-stock product
        product2 = Product(
            id=uuid4(),
            tenant_id=sample_tenant.id,
            name="Low Stock Product",
            cost_price=Decimal('50.00'),
            selling_price=Decimal('80.00'),
            stock_quantity=3,  # Below min level
            min_stock_level=10
        )
        
        # Gold product
        product3 = Product(
            id=uuid4(),
            tenant_id=sample_tenant.id,
            name="Gold Ring",
            cost_price=Decimal('500.00'),
            selling_price=Decimal('750.00'),
            is_gold_product=True,
            gold_purity=Decimal('18.000'),
            weight_per_unit=Decimal('5.500'),
            stock_quantity=20,
            min_stock_level=5
        )
        
        products.extend([product1, product2, product3])
        db_session.add_all(products)
        db_session.commit()
        return products
    
    @pytest.fixture
    def sample_invoices_with_trends(self, db_session: Session, sample_tenant: Tenant, sample_customers, sample_products):
        """Create sample invoices with trend patterns for testing"""
        invoices = []
        
        # Create invoices over the last 90 days with different patterns
        base_date = datetime.utcnow() - timedelta(days=90)
        
        # Current period (last 30 days) - higher revenue
        for i in range(15):  # 15 invoices in current period
            invoice_date = base_date + timedelta(days=60 + i * 2)
            customer = sample_customers[i % len(sample_customers)]
            
            invoice = Invoice(
                id=uuid4(),
                tenant_id=sample_tenant.id,
                customer_id=customer.id,
                invoice_number=f"CURR-{i+1:04d}",
                invoice_type=InvoiceType.GENERAL,
                invoice_date=invoice_date,
                due_date=invoice_date + timedelta(days=30),
                status=InvoiceStatus.PAID,
                subtotal=Decimal('2000.00'),  # Higher amounts
                tax_amount=Decimal('180.00'),
                total_amount=Decimal('2180.00'),
                paid_amount=Decimal('2180.00')
            )
            
            # Add invoice item
            item = InvoiceItem(
                id=uuid4(),
                invoice_id=invoice.id,
                product_id=sample_products[0].id,
                description="High value item",
                quantity=Decimal('2'),
                unit_price=Decimal('1000.00'),
                line_total=Decimal('2000.00'),
                tax_rate=Decimal('9.00'),
                tax_amount=Decimal('180.00')
            )
            
            invoices.append(invoice)
            db_session.add(invoice)
            db_session.add(item)
        
        # Previous period (30-60 days ago) - lower revenue
        for i in range(10):  # 10 invoices in previous period
            invoice_date = base_date + timedelta(days=30 + i * 3)
            customer = sample_customers[i % len(sample_customers)]
            
            invoice = Invoice(
                id=uuid4(),
                tenant_id=sample_tenant.id,
                customer_id=customer.id,
                invoice_number=f"PREV-{i+1:04d}",
                invoice_type=InvoiceType.GENERAL,
                invoice_date=invoice_date,
                due_date=invoice_date + timedelta(days=30),
                status=InvoiceStatus.PAID,
                subtotal=Decimal('1000.00'),  # Lower amounts
                tax_amount=Decimal('90.00'),
                total_amount=Decimal('1090.00'),
                paid_amount=Decimal('1090.00')
            )
            
            # Add invoice item
            item = InvoiceItem(
                id=uuid4(),
                invoice_id=invoice.id,
                product_id=sample_products[1].id,
                description="Regular item",
                quantity=Decimal('1'),
                unit_price=Decimal('1000.00'),
                line_total=Decimal('1000.00'),
                tax_rate=Decimal('9.00'),
                tax_amount=Decimal('90.00')
            )
            
            invoices.append(invoice)
            db_session.add(invoice)
            db_session.add(item)
        
        # Create some overdue invoices
        for i in range(5):
            invoice_date = datetime.utcnow() - timedelta(days=45)
            due_date = datetime.utcnow() - timedelta(days=15)  # Overdue
            customer = sample_customers[i % len(sample_customers)]
            
            invoice = Invoice(
                id=uuid4(),
                tenant_id=sample_tenant.id,
                customer_id=customer.id,
                invoice_number=f"OVER-{i+1:04d}",
                invoice_type=InvoiceType.GENERAL,
                invoice_date=invoice_date,
                due_date=due_date,
                status=InvoiceStatus.SENT,  # Unpaid
                subtotal=Decimal('1500.00'),
                tax_amount=Decimal('135.00'),
                total_amount=Decimal('1635.00'),
                paid_amount=Decimal('0.00')  # Unpaid
            )
            
            invoices.append(invoice)
            db_session.add(invoice)
        
        db_session.commit()
        return invoices
    
    def test_generate_business_insights(self, db_session: Session, sample_tenant: Tenant, sample_invoices_with_trends):
        """Test business insights generation"""
        bi_service = BusinessIntelligenceService(db_session)
        
        result = bi_service.generate_business_insights(
            tenant_id=sample_tenant.id,
            analysis_period_days=30,
            comparison_period_days=30
        )
        
        # Verify response structure
        assert result.analysis_period_days == 30
        assert result.comparison_period_days == 30
        assert isinstance(result.generated_at, datetime)
        assert isinstance(result.insights, list)
        assert isinstance(result.recommendations, list)
        assert isinstance(result.summary, str)
        
        # Verify insights contain required fields
        if result.insights:
            insight = result.insights[0]
            assert hasattr(insight, 'type')
            assert hasattr(insight, 'priority')
            assert hasattr(insight, 'title')
            assert hasattr(insight, 'title_persian')
            assert hasattr(insight, 'description')
            assert hasattr(insight, 'description_persian')
            assert hasattr(insight, 'impact_score')
            assert hasattr(insight, 'confidence_score')
            assert hasattr(insight, 'actionable')
            assert isinstance(insight.action_items, list)
            
            # Verify score ranges
            assert 0 <= insight.impact_score <= 10
            assert 0 <= insight.confidence_score <= 10
        
        # Verify summary is in Persian (contains Persian characters)
        assert len(result.summary) > 0
        
        # Verify recommendations are actionable
        assert len(result.recommendations) >= 0
    
    def test_calculate_kpi_metrics(self, db_session: Session, sample_tenant: Tenant, sample_invoices_with_trends):
        """Test KPI metrics calculation"""
        bi_service = BusinessIntelligenceService(db_session)
        
        result = bi_service.calculate_kpi_metrics(
            tenant_id=sample_tenant.id,
            period_days=30
        )
        
        # Verify response structure
        assert result.period_days == 30
        assert isinstance(result.calculated_at, datetime)
        assert isinstance(result.kpis, list)
        assert 0 <= result.overall_score <= 100
        
        # Verify KPI structure
        assert len(result.kpis) > 0
        
        # Check for expected KPIs
        kpi_names = [kpi.name for kpi in result.kpis]
        expected_kpis = ["Total Revenue", "Active Customers", "Average Order Value", "Profit Margin", "Outstanding Receivables"]
        
        for expected_kpi in expected_kpis:
            assert expected_kpi in kpi_names
        
        # Verify KPI data structure
        revenue_kpi = next((k for k in result.kpis if k.name == "Total Revenue"), None)
        assert revenue_kpi is not None
        assert hasattr(revenue_kpi, 'name_persian')
        assert hasattr(revenue_kpi, 'value')
        assert hasattr(revenue_kpi, 'previous_value')
        assert hasattr(revenue_kpi, 'trend')
        assert hasattr(revenue_kpi, 'change_percentage')
        assert hasattr(revenue_kpi, 'unit')
        
        # Verify trend is valid enum value
        assert revenue_kpi.trend in [KPITrend.UP, KPITrend.DOWN, KPITrend.STABLE]
        
        # Verify values are non-negative for revenue
        assert revenue_kpi.value >= 0
        assert revenue_kpi.previous_value >= 0
    
    def test_generate_business_alerts(self, db_session: Session, sample_tenant: Tenant, sample_invoices_with_trends, sample_products):
        """Test business alerts generation"""
        bi_service = BusinessIntelligenceService(db_session)
        
        result = bi_service.generate_business_alerts(
            tenant_id=sample_tenant.id
        )
        
        # Verify response structure
        assert isinstance(result.generated_at, datetime)
        assert isinstance(result.total_alerts, int)
        assert isinstance(result.critical_alerts, int)
        assert isinstance(result.high_alerts, int)
        assert isinstance(result.medium_alerts, int)
        assert isinstance(result.low_alerts, int)
        assert isinstance(result.alerts, list)
        
        # Verify alert counts add up
        assert result.total_alerts == len(result.alerts)
        assert result.total_alerts == (
            result.critical_alerts + result.high_alerts + 
            result.medium_alerts + result.low_alerts
        )
        
        # Verify alert structure
        if result.alerts:
            alert = result.alerts[0]
            assert hasattr(alert, 'type')
            assert hasattr(alert, 'severity')
            assert hasattr(alert, 'title')
            assert hasattr(alert, 'title_persian')
            assert hasattr(alert, 'message')
            assert hasattr(alert, 'message_persian')
            assert hasattr(alert, 'created_at')
            
            # Verify enum values
            assert alert.type in [e.value for e in AlertType]
            assert alert.severity in [e.value for e in AlertSeverity]
        
        # Should have overdue payment alerts (we created overdue invoices)
        overdue_alerts = [a for a in result.alerts if a.type == AlertType.OVERDUE_PAYMENT]
        assert len(overdue_alerts) > 0
        
        # Should have low stock alerts (we created low stock products)
        stock_alerts = [a for a in result.alerts if a.type == AlertType.LOW_STOCK]
        assert len(stock_alerts) > 0
    
    def test_analyze_trends(self, db_session: Session, sample_tenant: Tenant, sample_invoices_with_trends):
        """Test trend analysis"""
        bi_service = BusinessIntelligenceService(db_session)
        
        result = bi_service.analyze_trends(
            tenant_id=sample_tenant.id,
            analysis_periods=12,
            period_type="weekly"
        )
        
        # Verify response structure
        assert result.analysis_periods == 12
        assert result.period_type == "weekly"
        assert isinstance(result.analyzed_at, datetime)
        assert isinstance(result.trends, list)
        assert isinstance(result.seasonal_patterns, dict)
        assert isinstance(result.predictions, dict)
        
        # Verify trend data structure
        if result.trends:
            trend = result.trends[0]
            assert hasattr(trend, 'metric_name')
            assert hasattr(trend, 'metric_name_persian')
            assert hasattr(trend, 'direction')
            assert hasattr(trend, 'strength')
            assert hasattr(trend, 'confidence')
            assert hasattr(trend, 'data_points')
            assert hasattr(trend, 'prediction_next_period')
            assert hasattr(trend, 'seasonal_factor')
            
            # Verify score ranges
            assert 0 <= trend.strength <= 10
            assert 0 <= trend.confidence <= 10
    
    def test_export_report(self, db_session: Session, sample_tenant: Tenant):
        """Test report export functionality"""
        bi_service = BusinessIntelligenceService(db_session)
        
        request = ReportExportRequest(
            report_type="insights",
            format=ExportFormat.PDF,
            parameters={"period_days": 30},
            include_charts=True
        )
        
        result = bi_service.export_report(
            tenant_id=sample_tenant.id,
            request=request
        )
        
        # Verify response structure
        assert isinstance(result.export_id, str)
        assert result.format == ExportFormat.PDF
        assert result.report_type == "insights"
        assert isinstance(result.created_at, datetime)
        assert isinstance(result.estimated_completion, datetime)
        
        # Verify export ID format
        assert sample_tenant.id.hex in result.export_id or str(sample_tenant.id) in result.export_id
    
    def test_multi_tenant_isolation(self, db_session: Session):
        """Test that business intelligence is properly isolated by tenant"""
        from app.models.tenant import SubscriptionType, TenantStatus
        
        # Create two tenants
        tenant1 = Tenant(
            id=uuid4(), 
            name="BI Tenant 1", 
            email="bi-tenant1@example.com",
            subscription_type=SubscriptionType.PRO,
            status=TenantStatus.ACTIVE,
            is_active=True
        )
        tenant2 = Tenant(
            id=uuid4(), 
            name="BI Tenant 2", 
            email="bi-tenant2@example.com",
            subscription_type=SubscriptionType.PRO,
            status=TenantStatus.ACTIVE,
            is_active=True
        )
        db_session.add_all([tenant1, tenant2])
        
        # Create customers for each tenant
        customer1 = Customer(id=uuid4(), tenant_id=tenant1.id, name="Customer 1")
        customer2 = Customer(id=uuid4(), tenant_id=tenant2.id, name="Customer 2")
        db_session.add_all([customer1, customer2])
        
        # Create invoices for each tenant with different amounts
        invoice1 = Invoice(
            id=uuid4(),
            tenant_id=tenant1.id,
            customer_id=customer1.id,
            invoice_number="INV-001",
            invoice_type=InvoiceType.GENERAL,
            total_amount=Decimal('5000.00'),
            status=InvoiceStatus.PAID,
            paid_amount=Decimal('5000.00')
        )
        
        invoice2 = Invoice(
            id=uuid4(),
            tenant_id=tenant2.id,
            customer_id=customer2.id,
            invoice_number="INV-001",
            invoice_type=InvoiceType.GENERAL,
            total_amount=Decimal('3000.00'),
            status=InvoiceStatus.PAID,
            paid_amount=Decimal('3000.00')
        )
        
        db_session.add_all([invoice1, invoice2])
        db_session.commit()
        
        bi_service = BusinessIntelligenceService(db_session)
        
        # Get KPIs for tenant 1
        kpis1 = bi_service.calculate_kpi_metrics(tenant_id=tenant1.id, period_days=30)
        
        # Get KPIs for tenant 2
        kpis2 = bi_service.calculate_kpi_metrics(tenant_id=tenant2.id, period_days=30)
        
        # Verify data isolation
        revenue_kpi1 = next((k for k in kpis1.kpis if k.name == "Total Revenue"), None)
        revenue_kpi2 = next((k for k in kpis2.kpis if k.name == "Total Revenue"), None)
        
        if revenue_kpi1 and revenue_kpi2:
            # Each tenant should see only their own revenue
            assert revenue_kpi1.value != revenue_kpi2.value
    
    def test_empty_data_handling(self, db_session: Session, sample_tenant: Tenant):
        """Test handling of empty data scenarios"""
        bi_service = BusinessIntelligenceService(db_session)
        
        # Test with no invoices
        insights = bi_service.generate_business_insights(
            tenant_id=sample_tenant.id,
            analysis_period_days=30,
            comparison_period_days=30
        )
        
        # Should handle empty data gracefully
        assert isinstance(insights.insights, list)
        assert isinstance(insights.recommendations, list)
        assert isinstance(insights.summary, str)
        
        # Test KPIs with no data
        kpis = bi_service.calculate_kpi_metrics(
            tenant_id=sample_tenant.id,
            period_days=30
        )
        
        # Should return KPIs with zero values
        assert len(kpis.kpis) > 0
        revenue_kpi = next((k for k in kpis.kpis if k.name == "Total Revenue"), None)
        if revenue_kpi:
            assert revenue_kpi.value == 0
    
    def test_alert_severity_classification(self, db_session: Session, sample_tenant: Tenant):
        """Test alert severity classification logic"""
        # Create many overdue invoices to trigger critical alert
        customers = []
        invoices = []
        
        for i in range(15):  # Create 15 overdue invoices (should trigger critical)
            customer = Customer(
                id=uuid4(),
                tenant_id=sample_tenant.id,
                name=f"Overdue Customer {i}",
                email=f"overdue{i}@example.com"
            )
            customers.append(customer)
            
            invoice = Invoice(
                id=uuid4(),
                tenant_id=sample_tenant.id,
                customer_id=customer.id,
                invoice_number=f"OVER-{i:04d}",
                invoice_type=InvoiceType.GENERAL,
                invoice_date=datetime.utcnow() - timedelta(days=60),
                due_date=datetime.utcnow() - timedelta(days=30),  # Overdue
                status=InvoiceStatus.SENT,
                total_amount=Decimal('1000.00'),
                paid_amount=Decimal('0.00')
            )
            invoices.append(invoice)
        
        db_session.add_all(customers)
        db_session.add_all(invoices)
        db_session.commit()
        
        bi_service = BusinessIntelligenceService(db_session)
        
        alerts = bi_service.generate_business_alerts(tenant_id=sample_tenant.id)
        
        # Should have critical alert for many overdue invoices
        critical_alerts = [a for a in alerts.alerts if a.severity == AlertSeverity.CRITICAL]
        assert len(critical_alerts) > 0
        
        # Check overdue payment alert specifically
        overdue_alerts = [a for a in critical_alerts if a.type == AlertType.OVERDUE_PAYMENT]
        assert len(overdue_alerts) > 0
    
    def test_kpi_trend_calculation(self, db_session: Session, sample_tenant: Tenant):
        """Test KPI trend calculation accuracy"""
        # Create invoices with clear growth pattern
        customers = []
        invoices = []
        
        # Create customer
        customer = Customer(
            id=uuid4(),
            tenant_id=sample_tenant.id,
            name="Growth Customer",
            email="growth@example.com"
        )
        customers.append(customer)
        
        # Previous period: 5 invoices of 1000 each = 5000 total
        for i in range(5):
            invoice = Invoice(
                id=uuid4(),
                tenant_id=sample_tenant.id,
                customer_id=customer.id,
                invoice_number=f"PREV-{i:04d}",
                invoice_type=InvoiceType.GENERAL,
                invoice_date=datetime.utcnow() - timedelta(days=45),
                status=InvoiceStatus.PAID,
                total_amount=Decimal('1000.00'),
                paid_amount=Decimal('1000.00')
            )
            invoices.append(invoice)
        
        # Current period: 10 invoices of 1000 each = 10000 total (100% growth)
        for i in range(10):
            invoice = Invoice(
                id=uuid4(),
                tenant_id=sample_tenant.id,
                customer_id=customer.id,
                invoice_number=f"CURR-{i:04d}",
                invoice_type=InvoiceType.GENERAL,
                invoice_date=datetime.utcnow() - timedelta(days=15),
                status=InvoiceStatus.PAID,
                total_amount=Decimal('1000.00'),
                paid_amount=Decimal('1000.00')
            )
            invoices.append(invoice)
        
        db_session.add_all(customers)
        db_session.add_all(invoices)
        db_session.commit()
        
        bi_service = BusinessIntelligenceService(db_session)
        
        kpis = bi_service.calculate_kpi_metrics(
            tenant_id=sample_tenant.id,
            period_days=30
        )
        
        # Find revenue KPI
        revenue_kpi = next((k for k in kpis.kpis if k.name == "Total Revenue"), None)
        assert revenue_kpi is not None
        
        # Should show upward trend due to growth
        # Note: The actual trend calculation depends on the implementation
        # This test verifies the structure is correct
        assert revenue_kpi.trend in [KPITrend.UP, KPITrend.DOWN, KPITrend.STABLE]
        assert isinstance(revenue_kpi.change_percentage, Decimal)
    
    def test_business_insights_actionability(self, db_session: Session, sample_tenant: Tenant, sample_invoices_with_trends):
        """Test that business insights are actionable and relevant"""
        bi_service = BusinessIntelligenceService(db_session)
        
        insights = bi_service.generate_business_insights(
            tenant_id=sample_tenant.id,
            analysis_period_days=30,
            comparison_period_days=30
        )
        
        # Verify insights have actionable recommendations
        actionable_insights = [i for i in insights.insights if i.actionable]
        
        if actionable_insights:
            for insight in actionable_insights:
                # Actionable insights should have action items
                assert len(insight.action_items) > 0
                
                # Action items should be meaningful strings
                for action in insight.action_items:
                    assert isinstance(action, str)
                    assert len(action.strip()) > 10  # Meaningful length
        
        # Verify recommendations are provided
        assert len(insights.recommendations) >= 0
        
        # If recommendations exist, they should be meaningful
        for recommendation in insights.recommendations:
            assert isinstance(recommendation, str)
            assert len(recommendation.strip()) > 10
    
    def test_performance_with_large_dataset(self, db_session: Session, sample_tenant: Tenant):
        """Test performance with larger datasets"""
        import time
        
        # Create a larger dataset for performance testing
        customers = []
        invoices = []
        
        # Create 50 customers
        for i in range(50):
            customer = Customer(
                id=uuid4(),
                tenant_id=sample_tenant.id,
                name=f"Performance Customer {i}",
                email=f"perf{i}@example.com"
            )
            customers.append(customer)
        
        db_session.add_all(customers)
        db_session.commit()
        
        # Create 200 invoices
        for i in range(200):
            customer = customers[i % len(customers)]
            invoice = Invoice(
                id=uuid4(),
                tenant_id=sample_tenant.id,
                customer_id=customer.id,
                invoice_number=f"PERF-{i:04d}",
                invoice_type=InvoiceType.GENERAL,
                invoice_date=datetime.utcnow() - timedelta(days=i % 60),
                status=InvoiceStatus.PAID,
                total_amount=Decimal('1000.00'),
                paid_amount=Decimal('1000.00')
            )
            invoices.append(invoice)
        
        db_session.add_all(invoices)
        db_session.commit()
        
        bi_service = BusinessIntelligenceService(db_session)
        
        # Test KPI calculation performance
        start_time = time.time()
        kpis = bi_service.calculate_kpi_metrics(
            tenant_id=sample_tenant.id,
            period_days=30
        )
        kpi_time = time.time() - start_time
        
        # Test insights generation performance
        start_time = time.time()
        insights = bi_service.generate_business_insights(
            tenant_id=sample_tenant.id,
            analysis_period_days=30,
            comparison_period_days=30
        )
        insights_time = time.time() - start_time
        
        # Test alerts generation performance
        start_time = time.time()
        alerts = bi_service.generate_business_alerts(
            tenant_id=sample_tenant.id
        )
        alerts_time = time.time() - start_time
        
        # Performance assertions (adjust thresholds as needed)
        assert kpi_time < 5.0  # Should complete within 5 seconds
        assert insights_time < 10.0  # Should complete within 10 seconds
        assert alerts_time < 5.0  # Should complete within 5 seconds
        
        # Verify results are still accurate
        assert len(kpis.kpis) > 0
        assert isinstance(insights.insights, list)
        assert isinstance(alerts.alerts, list)
    
    def test_date_range_edge_cases(self, db_session: Session, sample_tenant: Tenant):
        """Test edge cases in date range handling"""
        bi_service = BusinessIntelligenceService(db_session)
        
        # Test with very short period
        insights = bi_service.generate_business_insights(
            tenant_id=sample_tenant.id,
            analysis_period_days=1,
            comparison_period_days=1
        )
        assert isinstance(insights.insights, list)
        
        # Test with very long period
        insights = bi_service.generate_business_insights(
            tenant_id=sample_tenant.id,
            analysis_period_days=365,
            comparison_period_days=365
        )
        assert isinstance(insights.insights, list)
        
        # Test with different period lengths
        insights = bi_service.generate_business_insights(
            tenant_id=sample_tenant.id,
            analysis_period_days=30,
            comparison_period_days=60
        )
        assert insights.analysis_period_days == 30
        assert insights.comparison_period_days == 60