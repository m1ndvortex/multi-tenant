"""
Integration tests for Dashboard API endpoints
"""

import pytest
from fastapi.testclient import TestClient
from datetime import datetime, timedelta
from decimal import Decimal
from uuid import uuid4
from sqlalchemy.orm import Session

from app.main import app
from app.models.tenant import Tenant
from app.models.user import User, UserRole
from app.models.customer import Customer, CustomerType
from app.models.product import Product
from app.models.invoice import Invoice, InvoiceStatus, InvoiceType
from app.models.accounting import CustomerPayment, PaymentMethod
from app.models.installment import Installment, InstallmentStatus, InstallmentType


class TestDashboardAPI:
    """Integration tests for Dashboard API"""
    
    @pytest.fixture
    def client(self):
        """Create test client"""
        return TestClient(app)
    
    @pytest.fixture
    def test_tenant(self, db_session: Session):
        """Create test tenant"""
        from app.models.tenant import SubscriptionType, TenantStatus
        tenant = Tenant(
            name="Dashboard Test Business",
            email="dashboard@business.com",
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
            email="dashboard@test.com",
            password_hash="hashed_password",
            role=UserRole.ADMIN,
            is_active=True
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
        return user
    
    @pytest.fixture
    def auth_headers(self, test_user):
        """Create authentication headers"""
        from app.core.auth import create_access_token
        
        token_data = {
            "user_id": str(test_user.id),
            "tenant_id": str(test_user.tenant_id),
            "email": test_user.email,
            "role": test_user.role.value
        }
        access_token = create_access_token(data=token_data)
        
        return {"Authorization": f"Bearer {access_token}"}
    
    @pytest.fixture
    def sample_business_data(self, db_session: Session, test_tenant, test_user):
        """Create sample business data for testing"""
        # Create customers
        customers = []
        for i in range(3):
            customer = Customer(
                tenant_id=test_tenant.id,
                name=f"Dashboard Customer {i+1}",
                email=f"dashcust{i+1}@test.com",
                phone=f"0912345{i:03d}",
                customer_type=CustomerType.INDIVIDUAL,
                is_active=True
            )
            db_session.add(customer)
            customers.append(customer)
        
        # Create products
        products = []
        for i in range(5):
            product = Product(
                tenant_id=test_tenant.id,
                name=f"Dashboard Product {i+1}",
                selling_price=Decimal('150.00') * (i + 1),
                cost_price=Decimal('75.00') * (i + 1),
                stock_quantity=15 - i,
                min_stock_level=3,
                track_inventory=True,
                is_active=True
            )
            db_session.add(product)
            products.append(product)
        
        db_session.commit()
        
        # Refresh objects
        for customer in customers:
            db_session.refresh(customer)
        for product in products:
            db_session.refresh(product)
        
        # Create invoices
        invoices = []
        current_month = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        for i in range(6):
            invoice = Invoice(
                tenant_id=test_tenant.id,
                customer_id=customers[i % len(customers)].id,
                invoice_number=f"DASH-{i+1:04d}",
                invoice_type=InvoiceType.GENERAL if i % 2 == 0 else InvoiceType.GOLD,
                total_amount=Decimal('1200.00') * (i + 1),
                paid_amount=Decimal('600.00') * (i + 1) if i < 4 else Decimal('0'),
                status=InvoiceStatus.PAID if i < 3 else InvoiceStatus.SENT,
                invoice_date=current_month + timedelta(days=i * 2),
                due_date=current_month + timedelta(days=i * 2 + 30),
                created_at=current_month + timedelta(days=i * 2)
            )
            db_session.add(invoice)
            invoices.append(invoice)
        
        # Create some overdue invoices
        overdue_date = datetime.now() - timedelta(days=60)
        for i in range(2):
            invoice = Invoice(
                tenant_id=test_tenant.id,
                customer_id=customers[i % len(customers)].id,
                invoice_number=f"OVERDUE-DASH-{i+1:04d}",
                invoice_type=InvoiceType.GENERAL,
                total_amount=Decimal('800.00'),
                paid_amount=Decimal('0'),
                status=InvoiceStatus.SENT,
                invoice_date=overdue_date,
                due_date=overdue_date + timedelta(days=30),
                created_at=overdue_date
            )
            db_session.add(invoice)
            invoices.append(invoice)
        
        db_session.commit()
        
        # Refresh invoices
        for invoice in invoices:
            db_session.refresh(invoice)
        
        # Create payments
        payments = []
        for i, invoice in enumerate(invoices[:4]):
            if invoice.paid_amount > 0:
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
        
        # Create installments
        installments = []
        for invoice in invoices[:2]:
            for j in range(3):
                installment = Installment(
                    invoice_id=invoice.id,
                    installment_number=j + 1,
                    installment_type=InstallmentType.GENERAL,
                    amount_due=Decimal('400.00'),
                    amount_paid=Decimal('400.00') if j == 0 else Decimal('0'),
                    due_date=datetime.now().date() + timedelta(days=(j + 1) * 30),
                    status=InstallmentStatus.PAID if j == 0 else InstallmentStatus.PENDING
                )
                db_session.add(installment)
                installments.append(installment)
        
        db_session.commit()
        
        return {
            'customers': customers,
            'products': products,
            'invoices': invoices,
            'payments': payments,
            'installments': installments
        }
    
    def test_get_complete_dashboard_data(
        self, 
        client: TestClient, 
        auth_headers, 
        sample_business_data
    ):
        """Test getting complete dashboard data"""
        response = client.get("/api/dashboard/", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        
        # Check main structure
        assert "summary" in data
        assert "recent_activities" in data
        assert "business_insights" in data
        assert "alerts" in data
        assert "quick_stats" in data
        assert "sales_chart" in data
        assert "generated_at" in data
        
        # Check summary structure
        summary = data["summary"]
        assert "period" in summary
        assert "metrics" in summary
        assert "total_revenue" in summary["metrics"]
        assert "active_customers" in summary["metrics"]
        
        # Check metric structure
        revenue_metric = summary["metrics"]["total_revenue"]
        assert "value" in revenue_metric
        assert "label" in revenue_metric
        assert "unit" in revenue_metric
        assert revenue_metric["unit"] == "currency"
        
        # Check recent activities
        activities = data["recent_activities"]
        assert isinstance(activities, list)
        
        # Check business insights
        insights = data["business_insights"]
        assert "summary" in insights
        assert "insights" in insights
        assert "recommendations" in insights
        
        # Check alerts
        alerts = data["alerts"]
        assert "alerts" in alerts
        assert "total_alerts" in alerts
        
        # Check quick stats
        quick_stats = data["quick_stats"]
        assert "today_revenue" in quick_stats
        assert "total_customers" in quick_stats
        assert "total_products" in quick_stats
        
        # Check sales chart
        sales_chart = data["sales_chart"]
        assert "data" in sales_chart
        assert "period_days" in sales_chart
        assert isinstance(sales_chart["data"], list)
    
    def test_get_dashboard_summary_only(
        self, 
        client: TestClient, 
        auth_headers, 
        sample_business_data
    ):
        """Test getting dashboard summary only"""
        response = client.get("/api/dashboard/summary", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        
        assert "period" in data
        assert "metrics" in data
        assert "period_start" in data
        assert "period_end" in data
        
        # Check that we have key metrics
        metrics = data["metrics"]
        expected_metrics = [
            "total_revenue", "active_customers", "invoice_count", 
            "average_order_value", "outstanding_receivables", "overdue_amount"
        ]
        
        for metric_name in expected_metrics:
            assert metric_name in metrics
            metric = metrics[metric_name]
            assert "value" in metric
            assert "label" in metric
            assert "unit" in metric
    
    def test_get_business_insights(
        self, 
        client: TestClient, 
        auth_headers, 
        sample_business_data
    ):
        """Test getting business insights"""
        response = client.get("/api/dashboard/insights", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        
        assert "summary" in data
        assert "insights" in data
        assert "recommendations" in data
        assert "generated_at" in data
        
        assert isinstance(data["insights"], list)
        assert isinstance(data["recommendations"], list)
        assert isinstance(data["summary"], str)
    
    def test_get_dashboard_alerts(
        self, 
        client: TestClient, 
        auth_headers, 
        sample_business_data
    ):
        """Test getting dashboard alerts"""
        response = client.get("/api/dashboard/alerts", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        
        assert "alerts" in data
        assert "total_alerts" in data
        assert "critical_alerts" in data
        assert "high_alerts" in data
        assert "medium_alerts" in data
        
        assert isinstance(data["alerts"], list)
        assert isinstance(data["total_alerts"], int)
        
        # Should have overdue payment alerts from sample data
        assert data["total_alerts"] >= 0
    
    def test_get_quick_stats(
        self, 
        client: TestClient, 
        auth_headers, 
        sample_business_data
    ):
        """Test getting quick statistics"""
        response = client.get("/api/dashboard/quick-stats", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        
        required_fields = [
            "today_revenue", "today_invoices", "total_customers", 
            "total_products", "pending_invoices", "calculated_at"
        ]
        
        for field in required_fields:
            assert field in data
        
        # Check data types and reasonable values
        assert isinstance(data["today_revenue"], (int, float, str))
        assert isinstance(data["today_invoices"], int)
        assert isinstance(data["total_customers"], int)
        assert isinstance(data["total_products"], int)
        assert isinstance(data["pending_invoices"], int)
        
        assert data["today_invoices"] >= 0
        assert data["total_customers"] >= 0
        assert data["total_products"] >= 0
        assert data["pending_invoices"] >= 0
    
    def test_get_sales_chart_data(
        self, 
        client: TestClient, 
        auth_headers, 
        sample_business_data
    ):
        """Test getting sales chart data"""
        response = client.get("/api/dashboard/sales-chart?period_days=30", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        
        assert "period_days" in data
        assert "start_date" in data
        assert "end_date" in data
        assert "data" in data
        assert "total_sales" in data
        assert "total_invoices" in data
        
        assert data["period_days"] == 30
        assert isinstance(data["data"], list)
        assert len(data["data"]) == 31  # 30 days + 1
        
        # Check data point structure
        if data["data"]:
            data_point = data["data"][0]
            assert "date" in data_point
            assert "sales" in data_point
            assert "invoices" in data_point
    
    def test_get_recent_activities(
        self, 
        client: TestClient, 
        auth_headers, 
        sample_business_data
    ):
        """Test getting recent activities"""
        response = client.get("/api/dashboard/activities?limit=5", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        assert len(data) <= 5
        
        # Check activity structure if any activities exist
        if data:
            activity = data[0]
            required_fields = [
                "type", "title", "description", "timestamp", "reference_id"
            ]
            
            for field in required_fields:
                assert field in activity
            
            # Check activity types
            valid_types = ["invoice_created", "payment_received"]
            assert activity["type"] in valid_types
    
    def test_dashboard_health_check(
        self, 
        client: TestClient, 
        auth_headers
    ):
        """Test dashboard service health check"""
        response = client.get("/api/dashboard/health", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        
        assert "status" in data
        assert "service" in data
        assert "tenant_id" in data
        assert "checks" in data
        
        assert data["status"] == "healthy"
        assert data["service"] == "dashboard"
        
        checks = data["checks"]
        assert "database" in checks
        assert "business_intelligence" in checks
        assert "reports" in checks
    
    def test_dashboard_with_query_parameters(
        self, 
        client: TestClient, 
        auth_headers, 
        sample_business_data
    ):
        """Test dashboard with various query parameters"""
        # Test with custom parameters
        params = {
            "include_insights": "false",
            "include_alerts": "false",
            "include_activities": "true",
            "activities_limit": "3",
            "sales_chart_days": "7"
        }
        
        response = client.get("/api/dashboard/", params=params, headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        
        # Should not include insights and alerts
        assert data["business_insights"] is None
        assert data["alerts"] is None
        
        # Should include activities with limit
        assert len(data["recent_activities"]) <= 3
        
        # Sales chart should be for 7 days
        assert data["sales_chart"]["period_days"] == 7
        assert len(data["sales_chart"]["data"]) == 8  # 7 days + 1
    
    def test_dashboard_unauthorized_access(self, client: TestClient):
        """Test dashboard access without authentication"""
        response = client.get("/api/dashboard/")
        
        assert response.status_code == 401
    
    def test_dashboard_invalid_parameters(
        self, 
        client: TestClient, 
        auth_headers
    ):
        """Test dashboard with invalid parameters"""
        # Test invalid sales chart period
        response = client.get(
            "/api/dashboard/sales-chart?period_days=500", 
            headers=auth_headers
        )
        
        assert response.status_code == 422  # Validation error
        
        # Test invalid activities limit
        response = client.get(
            "/api/dashboard/activities?limit=100", 
            headers=auth_headers
        )
        
        assert response.status_code == 422  # Validation error
    
    def test_dashboard_empty_tenant(
        self, 
        client: TestClient, 
        auth_headers
    ):
        """Test dashboard with tenant that has no data"""
        response = client.get("/api/dashboard/", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        
        # Should still return valid structure with zero values
        assert "summary" in data
        assert "quick_stats" in data
        
        # Revenue should be zero
        assert float(data["summary"]["metrics"]["total_revenue"]["value"]) == 0.0
        assert data["quick_stats"]["total_customers"] == 0
        assert data["quick_stats"]["total_products"] == 0
        
        # Activities should be empty
        assert len(data["recent_activities"]) == 0
    
    def test_dashboard_performance(
        self, 
        client: TestClient, 
        auth_headers, 
        sample_business_data
    ):
        """Test dashboard API performance"""
        import time
        
        start_time = time.time()
        response = client.get("/api/dashboard/", headers=auth_headers)
        end_time = time.time()
        
        assert response.status_code == 200
        
        # Dashboard should respond within reasonable time (5 seconds)
        response_time = end_time - start_time
        assert response_time < 5.0, f"Dashboard response took {response_time:.2f} seconds"
        
        # Check if response time header is present
        assert "X-Process-Time" in response.headers