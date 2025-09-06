"""
Unit tests for Dashboard Service
"""

import pytest
from datetime import datetime, timedelta, date
from decimal import Decimal
from uuid import uuid4
from sqlalchemy.orm import Session

from app.services.dashboard_service import DashboardService
from app.models.tenant import Tenant
from app.models.user import User, UserRole
from app.models.customer import Customer, CustomerType
from app.models.product import Product
from app.models.invoice import Invoice, InvoiceStatus, InvoiceType
from app.models.accounting import CustomerPayment, PaymentMethod
from app.models.installment import Installment, InstallmentStatus, InstallmentType


class TestDashboardService:
    """Test cases for Dashboard Service"""
    
    @pytest.fixture
    def dashboard_service(self, db_session: Session):
        """Create dashboard service instance"""
        return DashboardService(db_session)
    
    @pytest.fixture
    def test_tenant(self, db_session: Session):
        """Create test tenant"""
        from app.models.tenant import SubscriptionType, TenantStatus
        tenant = Tenant(
            name="Test Business",
            email="test@business.com",
            subscription_type=SubscriptionType.PRO,
            status=TenantStatus.ACTIVE,
            is_active=True
        )
        db_session.add(tenant)
        db_session.commit()
        db_session.refresh(tenant)
        return tenant
    
    @pytest.fixture
    def test_user(self, db_session: Session, test_tenant):
        """Create test user"""
        user = User(
            tenant_id=test_tenant.id,
            email="test@example.com",
            password_hash="hashed_password",
            role=UserRole.ADMIN,
            is_active=True
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
        return user
    
    @pytest.fixture
    def test_customers(self, db_session: Session, test_tenant):
        """Create test customers"""
        customers = []
        for i in range(3):
            customer = Customer(
                tenant_id=test_tenant.id,
                name=f"Customer {i+1}",
                email=f"customer{i+1}@example.com",
                phone=f"0912345678{i}",
                customer_type=CustomerType.INDIVIDUAL,
                is_active=True
            )
            db_session.add(customer)
            customers.append(customer)
        
        db_session.commit()
        for customer in customers:
            db_session.refresh(customer)
        return customers
    
    @pytest.fixture
    def test_products(self, db_session: Session, test_tenant):
        """Create test products"""
        products = []
        for i in range(5):
            product = Product(
                tenant_id=test_tenant.id,
                name=f"Product {i+1}",
                selling_price=Decimal('100.00') * (i + 1),
                cost_price=Decimal('50.00') * (i + 1),
                stock_quantity=10 - i,
                min_stock_level=2,
                track_inventory=True,
                is_active=True
            )
            db_session.add(product)
            products.append(product)
        
        db_session.commit()
        for product in products:
            db_session.refresh(product)
        return products
    
    @pytest.fixture
    def test_invoices(self, db_session: Session, test_tenant, test_customers):
        """Create test invoices"""
        invoices = []
        
        # Current month invoices
        current_month = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        for i in range(5):
            invoice = Invoice(
                tenant_id=test_tenant.id,
                customer_id=test_customers[i % len(test_customers)].id,
                invoice_number=f"INV-{i+1:04d}",
                invoice_type=InvoiceType.GENERAL if i % 2 == 0 else InvoiceType.GOLD,
                total_amount=Decimal('1000.00') * (i + 1),
                paid_amount=Decimal('500.00') * (i + 1) if i < 3 else Decimal('0'),
                status=InvoiceStatus.PAID if i < 2 else InvoiceStatus.SENT,
                invoice_date=current_month + timedelta(days=i),
                due_date=current_month + timedelta(days=i + 30),
                created_at=current_month + timedelta(days=i)
            )
            db_session.add(invoice)
            invoices.append(invoice)
        
        # Previous month invoices for comparison
        prev_month = current_month - timedelta(days=30)
        for i in range(3):
            invoice = Invoice(
                tenant_id=test_tenant.id,
                customer_id=test_customers[i % len(test_customers)].id,
                invoice_number=f"PREV-{i+1:04d}",
                invoice_type=InvoiceType.GENERAL,
                total_amount=Decimal('800.00') * (i + 1),
                paid_amount=Decimal('800.00') * (i + 1),
                status=InvoiceStatus.PAID,
                invoice_date=prev_month + timedelta(days=i),
                due_date=prev_month + timedelta(days=i + 30),
                created_at=prev_month + timedelta(days=i)
            )
            db_session.add(invoice)
            invoices.append(invoice)
        
        # Overdue invoices
        overdue_date = datetime.now() - timedelta(days=45)
        for i in range(2):
            invoice = Invoice(
                tenant_id=test_tenant.id,
                customer_id=test_customers[i % len(test_customers)].id,
                invoice_number=f"OVERDUE-{i+1:04d}",
                invoice_type=InvoiceType.GENERAL,
                total_amount=Decimal('500.00'),
                paid_amount=Decimal('0'),
                status=InvoiceStatus.SENT,
                invoice_date=overdue_date,
                due_date=overdue_date + timedelta(days=30),
                created_at=overdue_date
            )
            db_session.add(invoice)
            invoices.append(invoice)
        
        db_session.commit()
        for invoice in invoices:
            db_session.refresh(invoice)
        return invoices
    
    @pytest.fixture
    def test_payments(self, db_session: Session, test_tenant, test_customers, test_invoices):
        """Create test payments"""
        payments = []
        
        for i, invoice in enumerate(test_invoices[:3]):
            payment = CustomerPayment(
                tenant_id=test_tenant.id,
                customer_id=invoice.customer_id,
                invoice_id=invoice.id,
                amount=invoice.paid_amount,
                payment_date=datetime.now() - timedelta(days=i),
                payment_method=PaymentMethod.CASH,
                description=f"Payment for {invoice.invoice_number}"
            )
            db_session.add(payment)
            payments.append(payment)
        
        db_session.commit()
        for payment in payments:
            db_session.refresh(payment)
        return payments
    
    @pytest.fixture
    def test_installments(self, db_session: Session, test_tenant, test_invoices):
        """Create test installments"""
        installments = []
        
        # Create installments for some invoices
        for invoice in test_invoices[:2]:
            for i in range(3):
                installment = Installment(
                    invoice_id=invoice.id,
                    installment_number=i + 1,
                    installment_type=InstallmentType.GENERAL,
                    amount_due=Decimal('300.00'),
                    amount_paid=Decimal('300.00') if i == 0 else Decimal('0'),
                    due_date=datetime.now().date() + timedelta(days=(i + 1) * 30),
                    status=InstallmentStatus.PAID if i == 0 else InstallmentStatus.PENDING
                )
                db_session.add(installment)
                installments.append(installment)
        
        # Create upcoming installments
        for i in range(2):
            installment = Installment(
                invoice_id=test_invoices[0].id,
                installment_number=i + 10,
                installment_type=InstallmentType.GENERAL,
                amount_due=Decimal('200.00'),
                amount_paid=Decimal('0'),
                due_date=datetime.now().date() + timedelta(days=i + 3),
                status=InstallmentStatus.PENDING
            )
            db_session.add(installment)
            installments.append(installment)
        
        db_session.commit()
        for installment in installments:
            db_session.refresh(installment)
        return installments
    
    def test_get_dashboard_summary(
        self, 
        dashboard_service: DashboardService, 
        test_tenant, 
        test_invoices, 
        test_customers
    ):
        """Test dashboard summary generation"""
        summary = dashboard_service.get_dashboard_summary(test_tenant.id)
        
        assert summary is not None
        assert 'period' in summary
        assert 'metrics' in summary
        assert 'total_revenue' in summary['metrics']
        assert 'active_customers' in summary['metrics']
        assert 'invoice_count' in summary['metrics']
        assert 'average_order_value' in summary['metrics']
        
        # Check metric structure
        revenue_metric = summary['metrics']['total_revenue']
        assert 'value' in revenue_metric
        assert 'label' in revenue_metric
        assert 'unit' in revenue_metric
        assert revenue_metric['unit'] == 'currency'
        assert revenue_metric['label'] == 'کل درآمد'
    
    def test_get_recent_activities(
        self, 
        dashboard_service: DashboardService, 
        test_tenant, 
        test_invoices, 
        test_payments
    ):
        """Test recent activities retrieval"""
        activities = dashboard_service.get_recent_activities(test_tenant.id, limit=5)
        
        assert isinstance(activities, list)
        assert len(activities) <= 5
        
        if activities:
            activity = activities[0]
            assert 'type' in activity
            assert 'title' in activity
            assert 'description' in activity
            assert 'timestamp' in activity
            assert 'reference_id' in activity
            
            # Check activity types
            valid_types = ['invoice_created', 'payment_received']
            assert activity['type'] in valid_types
    
    def test_get_business_insights(
        self, 
        dashboard_service: DashboardService, 
        test_tenant, 
        test_invoices
    ):
        """Test business insights generation"""
        insights = dashboard_service.get_business_insights(test_tenant.id)
        
        assert insights is not None
        assert 'summary' in insights
        assert 'insights' in insights
        assert 'recommendations' in insights
        assert 'generated_at' in insights
        
        assert isinstance(insights['insights'], list)
        assert isinstance(insights['recommendations'], list)
        assert isinstance(insights['summary'], str)
        
        # Check insight structure if any insights exist
        if insights['insights']:
            insight = insights['insights'][0]
            assert 'type' in insight
            assert 'priority' in insight
            assert 'title' in insight
            assert 'description' in insight
            assert 'impact_score' in insight
            assert 'confidence_score' in insight
    
    def test_get_alerts_and_notifications(
        self, 
        dashboard_service: DashboardService, 
        test_tenant, 
        test_invoices, 
        test_installments,
        test_products
    ):
        """Test alerts and notifications generation"""
        alerts_response = dashboard_service.get_alerts_and_notifications(test_tenant.id)
        
        assert alerts_response is not None
        assert 'alerts' in alerts_response
        assert 'total_alerts' in alerts_response
        assert 'critical_alerts' in alerts_response
        assert 'high_alerts' in alerts_response
        assert 'medium_alerts' in alerts_response
        
        assert isinstance(alerts_response['alerts'], list)
        assert isinstance(alerts_response['total_alerts'], int)
        
        # Check alert structure if any alerts exist
        if alerts_response['alerts']:
            alert = alerts_response['alerts'][0]
            assert 'type' in alert
            assert 'severity' in alert
            assert 'title' in alert
            assert 'description' in alert
            assert 'action' in alert
            
            # Check alert types
            valid_types = [
                'overdue_payments', 'upcoming_installments', 
                'low_stock', 'upcoming_gold_installments'
            ]
            assert alert['type'] in valid_types
    
    def test_get_quick_stats(
        self, 
        dashboard_service: DashboardService, 
        test_tenant, 
        test_invoices, 
        test_customers, 
        test_products
    ):
        """Test quick statistics generation"""
        stats = dashboard_service.get_quick_stats(test_tenant.id)
        
        assert stats is not None
        assert 'today_revenue' in stats
        assert 'today_invoices' in stats
        assert 'total_customers' in stats
        assert 'total_products' in stats
        assert 'pending_invoices' in stats
        assert 'calculated_at' in stats
        
        # Check data types
        assert isinstance(stats['today_revenue'], Decimal)
        assert isinstance(stats['today_invoices'], int)
        assert isinstance(stats['total_customers'], int)
        assert isinstance(stats['total_products'], int)
        assert isinstance(stats['pending_invoices'], int)
        assert isinstance(stats['calculated_at'], datetime)
        
        # Check reasonable values
        assert stats['today_revenue'] >= 0
        assert stats['today_invoices'] >= 0
        assert stats['total_customers'] >= 0
        assert stats['total_products'] >= 0
        assert stats['pending_invoices'] >= 0
    
    def test_get_sales_chart_data(
        self, 
        dashboard_service: DashboardService, 
        test_tenant, 
        test_invoices
    ):
        """Test sales chart data generation"""
        chart_data = dashboard_service.get_sales_chart_data(test_tenant.id, period_days=30)
        
        assert chart_data is not None
        assert 'period_days' in chart_data
        assert 'start_date' in chart_data
        assert 'end_date' in chart_data
        assert 'data' in chart_data
        assert 'total_sales' in chart_data
        assert 'total_invoices' in chart_data
        
        assert chart_data['period_days'] == 30
        assert isinstance(chart_data['data'], list)
        assert len(chart_data['data']) == 31  # 30 days + 1
        
        # Check data point structure
        if chart_data['data']:
            data_point = chart_data['data'][0]
            assert 'date' in data_point
            assert 'sales' in data_point
            assert 'invoices' in data_point
            
            # Check date format
            assert len(data_point['date']) == 10  # YYYY-MM-DD format
            assert isinstance(data_point['sales'], (int, float))
            assert isinstance(data_point['invoices'], int)
    
    def test_calculate_growth_rate(self, dashboard_service: DashboardService):
        """Test growth rate calculation"""
        # Test normal growth
        growth = dashboard_service._calculate_growth_rate(Decimal('120'), Decimal('100'))
        assert growth == Decimal('20')
        
        # Test decline
        growth = dashboard_service._calculate_growth_rate(Decimal('80'), Decimal('100'))
        assert growth == Decimal('-20')
        
        # Test zero previous value
        growth = dashboard_service._calculate_growth_rate(Decimal('100'), Decimal('0'))
        assert growth == Decimal('100')
        
        # Test both zero
        growth = dashboard_service._calculate_growth_rate(Decimal('0'), Decimal('0'))
        assert growth == Decimal('0')
    
    def test_calculate_period_metrics(
        self, 
        dashboard_service: DashboardService, 
        test_tenant, 
        test_invoices
    ):
        """Test period metrics calculation"""
        end_date = datetime.now()
        start_date = end_date - timedelta(days=30)
        
        metrics = dashboard_service._calculate_period_metrics(
            test_tenant.id, start_date, end_date
        )
        
        assert metrics is not None
        assert 'total_revenue' in metrics
        assert 'invoice_count' in metrics
        assert 'average_order_value' in metrics
        assert 'active_customers' in metrics
        assert 'outstanding_receivables' in metrics
        assert 'overdue_amount' in metrics
        
        # Check data types
        assert isinstance(metrics['total_revenue'], Decimal)
        assert isinstance(metrics['invoice_count'], int)
        assert isinstance(metrics['average_order_value'], Decimal)
        assert isinstance(metrics['active_customers'], int)
        assert isinstance(metrics['outstanding_receivables'], Decimal)
        assert isinstance(metrics['overdue_amount'], Decimal)
        
        # Check reasonable values
        assert metrics['total_revenue'] >= 0
        assert metrics['invoice_count'] >= 0
        assert metrics['average_order_value'] >= 0
        assert metrics['active_customers'] >= 0
        assert metrics['outstanding_receivables'] >= 0
        assert metrics['overdue_amount'] >= 0
    
    def test_dashboard_with_no_data(self, dashboard_service: DashboardService, test_tenant):
        """Test dashboard functionality with no business data"""
        # Test with empty tenant
        summary = dashboard_service.get_dashboard_summary(test_tenant.id)
        assert summary is not None
        
        activities = dashboard_service.get_recent_activities(test_tenant.id)
        assert isinstance(activities, list)
        assert len(activities) == 0
        
        stats = dashboard_service.get_quick_stats(test_tenant.id)
        assert stats is not None
        assert stats['today_revenue'] == Decimal('0')
        assert stats['today_invoices'] == 0
        
        chart_data = dashboard_service.get_sales_chart_data(test_tenant.id)
        assert chart_data is not None
        assert chart_data['total_sales'] == 0
        assert chart_data['total_invoices'] == 0
    
    def test_dashboard_multi_tenant_isolation(
        self, 
        dashboard_service: DashboardService, 
        db_session: Session,
        test_tenant, 
        test_invoices
    ):
        """Test that dashboard data is properly isolated between tenants"""
        # Create another tenant
        from app.models.tenant import SubscriptionType, TenantStatus
        other_tenant = Tenant(
            name="Other Business",
            email="other@business.com",
            subscription_type=SubscriptionType.FREE,
            status=TenantStatus.ACTIVE,
            is_active=True
        )
        db_session.add(other_tenant)
        db_session.commit()
        db_session.refresh(other_tenant)
        
        # Get dashboard data for original tenant
        original_summary = dashboard_service.get_dashboard_summary(test_tenant.id)
        original_activities = dashboard_service.get_recent_activities(test_tenant.id)
        
        # Get dashboard data for other tenant (should be empty)
        other_summary = dashboard_service.get_dashboard_summary(other_tenant.id)
        other_activities = dashboard_service.get_recent_activities(other_tenant.id)
        
        # Original tenant should have data
        assert original_summary['metrics']['total_revenue']['value'] > 0
        assert len(original_activities) > 0
        
        # Other tenant should have no data
        assert other_summary['metrics']['total_revenue']['value'] == Decimal('0')
        assert len(other_activities) == 0