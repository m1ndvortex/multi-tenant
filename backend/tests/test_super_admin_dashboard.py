"""
Super Admin Dashboard API Integration Tests
Following Docker-first testing standards with real database operations and HTTP requests
"""

import pytest
import uuid
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone
from decimal import Decimal

from app.models.tenant import Tenant, SubscriptionType, TenantStatus
from app.models.user import User, UserRole, UserStatus
from app.models.customer import Customer
from app.models.product import Product, ProductCategory
from app.models.invoice import Invoice, InvoiceType, InvoiceStatus
from app.core.auth import create_access_token, get_password_hash


class TestSuperAdminDashboardIntegration:
    """Real database integration tests for Super Admin Dashboard API endpoints"""
    
    @pytest.fixture
    def super_admin_user(self, db_session: Session):
        """Create a real super admin user in database"""
        user = User(
            id=uuid.uuid4(),
            email="superadmin@hesaabplus.com",
            password_hash=get_password_hash("admin123"),
            first_name="Super",
            last_name="Admin",
            role=UserRole.ADMIN,  # Regular role, but with is_super_admin=True
            status=UserStatus.ACTIVE,
            is_super_admin=True  # This is what makes them a super admin
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
        return user
    
    @pytest.fixture
    def super_admin_headers(self, super_admin_user):
        """Create real super admin authentication headers"""
        token = create_access_token(data={
            "user_id": str(super_admin_user.id),
            "email": super_admin_user.email,
            "role": "super_admin",
            "is_super_admin": True
        })
        return {"Authorization": f"Bearer {token}"}
    
    @pytest.fixture
    def sample_tenants(self, db_session: Session):
        """Create sample tenants with different subscription types and statuses"""
        tenants = []
        
        # Create Pro tenant
        pro_tenant = Tenant(
            id=uuid.uuid4(),
            name="Pro Gold Shop",
            email="pro@goldshop.com",
            phone="+1234567890",
            subscription_type=SubscriptionType.PRO,
            status=TenantStatus.ACTIVE,
            created_at=datetime.utcnow() - timedelta(days=30),
            subscription_starts_at=datetime.utcnow() - timedelta(days=30),
            subscription_expires_at=datetime.utcnow() + timedelta(days=335)
        )
        tenants.append(pro_tenant)
        
        # Create Free tenant
        free_tenant = Tenant(
            id=uuid.uuid4(),
            name="Free Jewelry Store",
            email="free@jewelry.com",
            phone="+1234567891",
            subscription_type=SubscriptionType.FREE,
            status=TenantStatus.ACTIVE,
            created_at=datetime.utcnow() - timedelta(days=15)
        )
        tenants.append(free_tenant)
        
        # Create suspended tenant
        suspended_tenant = Tenant(
            id=uuid.uuid4(),
            name="Suspended Shop",
            email="suspended@shop.com",
            phone="+1234567892",
            subscription_type=SubscriptionType.FREE,
            status=TenantStatus.SUSPENDED,
            created_at=datetime.utcnow() - timedelta(days=60)
        )
        tenants.append(suspended_tenant)
        
        for tenant in tenants:
            db_session.add(tenant)
        
        db_session.commit()
        
        for tenant in tenants:
            db_session.refresh(tenant)
        
        return tenants
    
    @pytest.fixture
    def sample_users_and_data(self, db_session: Session, sample_tenants):
        """Create sample users, customers, products, and invoices for analytics"""
        users = []
        customers = []
        products = []
        invoices = []
        
        for i, tenant in enumerate(sample_tenants):
            # Create users for each tenant
            user = User(
                id=uuid.uuid4(),
                tenant_id=tenant.id,
                email=f"user{i}@{tenant.email}",
                password_hash=get_password_hash("password123"),
                first_name=f"User{i}",
                last_name="Test",
                role=UserRole.ADMIN,
                status=UserStatus.ACTIVE,
                created_at=datetime.utcnow() - timedelta(days=20)
            )
            users.append(user)
            db_session.add(user)
            
            # Create customers
            for j in range(3):
                customer = Customer(
                    id=uuid.uuid4(),
                    tenant_id=tenant.id,
                    name=f"Customer {j} for {tenant.name}",
                    email=f"customer{j}@{tenant.email}",
                    phone=f"+123456789{i}{j}",
                    created_at=datetime.utcnow() - timedelta(days=10)
                )
                customers.append(customer)
                db_session.add(customer)
            
            # Create product category and products
            category = ProductCategory(
                id=uuid.uuid4(),
                tenant_id=tenant.id,
                name=f"Category for {tenant.name}",
                description="Test category"
            )
            db_session.add(category)
            db_session.flush()  # Get category ID
            
            for k in range(2):
                product = Product(
                    id=uuid.uuid4(),
                    tenant_id=tenant.id,
                    category_id=category.id,
                    name=f"Product {k} for {tenant.name}",
                    sku=f"SKU{i}{k}",
                    cost_price=Decimal("100.00"),
                    selling_price=Decimal("150.00"),
                    stock_quantity=50,
                    created_at=datetime.utcnow() - timedelta(days=5)
                )
                products.append(product)
                db_session.add(product)
        
        db_session.flush()  # Get all IDs
        
        # Create invoices
        for i, tenant in enumerate(sample_tenants):
            tenant_customers = [c for c in customers if c.tenant_id == tenant.id]
            
            for j in range(5):  # 5 invoices per tenant
                invoice = Invoice(
                    id=uuid.uuid4(),
                    tenant_id=tenant.id,
                    customer_id=tenant_customers[j % len(tenant_customers)].id,
                    invoice_number=f"INV-{i}-{j:03d}",
                    invoice_type=InvoiceType.GENERAL,
                    status=InvoiceStatus.PAID if j < 3 else InvoiceStatus.SENT,
                    subtotal=Decimal("500.00"),
                    tax_amount=Decimal("50.00"),
                    total_amount=Decimal("550.00"),
                    created_at=datetime.utcnow() - timedelta(days=j),
                    due_date=datetime.utcnow() + timedelta(days=30-j)
                )
                invoices.append(invoice)
                db_session.add(invoice)
        
        db_session.commit()
        
        return {
            "users": users,
            "customers": customers,
            "products": products,
            "invoices": invoices
        }
    
    def test_get_comprehensive_dashboard_with_real_data(
        self, client: TestClient, super_admin_headers, sample_tenants, sample_users_and_data
    ):
        """Test comprehensive dashboard with real database data"""
        
        # Make real HTTP request to dashboard endpoint
        response = client.get("/api/super-admin/dashboard/", headers=super_admin_headers)
        
        # Verify successful response
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "platform_metrics" in data
        assert "user_activity" in data
        assert "system_health" in data
        assert "analytics_charts" in data
        assert "recent_alerts" in data
        assert "quick_actions" in data
        assert "performance_summary" in data
        assert "generated_at" in data
        assert data["refresh_interval"] == 30
        
        # Verify platform metrics reflect real data
        platform_metrics = data["platform_metrics"]
        assert platform_metrics["total_signups"] >= 3  # We created 3 tenants
        assert platform_metrics["pro_subscriptions"] >= 1  # We created 1 pro tenant
        assert platform_metrics["free_subscriptions"] >= 2  # We created 2 free tenants
        assert platform_metrics["total_invoices_created"] >= 15  # 5 invoices per tenant
        
        # Verify system health data is present
        system_health = data["system_health"]
        assert "status" in system_health
        assert "database_status" in system_health
        assert "redis_status" in system_health
        
        # Verify analytics charts data
        analytics_charts = data["analytics_charts"]
        assert "user_growth_trends" in analytics_charts
        assert "revenue_analysis_trends" in analytics_charts
        assert "invoice_volume_trends" in analytics_charts
    
    def test_dashboard_with_query_parameters(
        self, client: TestClient, super_admin_headers, sample_tenants, sample_users_and_data
    ):
        """Test dashboard with real query parameters"""
        
        # Test with time range filter
        response = client.get(
            "/api/super-admin/dashboard/",
            params={"time_range": "7d"},
            headers=super_admin_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "platform_metrics" in data
        
        # Test with selective includes
        response = client.get(
            "/api/super-admin/dashboard/",
            params={
                "include_charts": "false",
                "include_alerts": "false",
                "include_activity": "false"
            },
            headers=super_admin_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "platform_metrics" in data
        # When includes are false, these should be empty or minimal
        assert data.get("user_activity", {}) == {} or len(data.get("user_activity", {})) == 0
        assert data.get("analytics_charts", {}) == {} or len(data.get("analytics_charts", {})) == 0
    
    def test_real_time_updates_with_real_data(
        self, client: TestClient, super_admin_headers, sample_tenants, sample_users_and_data
    ):
        """Test real-time dashboard updates with real database data"""
        
        # Make real HTTP request
        response = client.get("/api/super-admin/dashboard/real-time-updates", headers=super_admin_headers)
        
        # Verify successful response
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "user_activity" in data
        assert "system_health" in data
        assert "latest_alerts" in data
        assert "quick_metrics" in data
        assert "last_updated" in data
        assert data["next_update_in"] == 30
        
        # Verify quick metrics contain real data
        quick_metrics = data["quick_metrics"]
        assert "active_users" in quick_metrics
        assert "system_status" in quick_metrics
        assert isinstance(quick_metrics["active_users"], int)
        assert quick_metrics["system_status"] in ["healthy", "warning", "critical"]
    
    def test_platform_overview_widget_with_real_data(
        self, client: TestClient, super_admin_headers, sample_tenants, sample_users_and_data
    ):
        """Test platform overview widget with real database data"""
        
        # Make real HTTP request
        response = client.get("/api/super-admin/dashboard/widgets/platform_overview", headers=super_admin_headers)
        
        # Verify successful response
        assert response.status_code == 200
        data = response.json()
        
        # Verify data reflects our test data
        assert data["total_signups"] >= 3  # We created 3 tenants
        assert data["pro_subscriptions"] >= 1  # We created 1 pro tenant
        assert data["free_subscriptions"] >= 2  # We created 2 free tenants
        assert "monthly_recurring_revenue" in data
        assert "signup_growth_rate" in data
    
    def test_user_activity_widget_with_real_data(
        self, client: TestClient, super_admin_headers, sample_tenants, sample_users_and_data
    ):
        """Test user activity widget with real database data"""
        
        # Make real HTTP request
        response = client.get("/api/super-admin/dashboard/widgets/user_activity", headers=super_admin_headers)
        
        # Verify successful response
        assert response.status_code == 200
        data = response.json()
        
        # Verify data structure
        assert "total_active_users" in data
        assert "user_sessions" in data
        assert "active_users_by_tenant" in data
        assert isinstance(data["total_active_users"], int)
    
    def test_system_health_widget_with_real_data(
        self, client: TestClient, super_admin_headers, sample_tenants, sample_users_and_data
    ):
        """Test system health widget with real database data"""
        
        # Make real HTTP request
        response = client.get("/api/super-admin/dashboard/widgets/system_health", headers=super_admin_headers)
        
        # Verify successful response
        assert response.status_code == 200
        data = response.json()
        
        # Verify system health data structure
        assert "status" in data
        assert "database_status" in data
        assert "redis_status" in data
        assert data["status"] in ["healthy", "warning", "critical"]
        assert isinstance(data["database_status"], bool)
    
    def test_invalid_widget_type(self, client: TestClient, super_admin_headers):
        """Test getting data for invalid widget type"""
        response = client.get("/api/super-admin/dashboard/widgets/invalid_widget", headers=super_admin_headers)
        
        assert response.status_code == 404
        assert "not found" in response.json()["detail"]
    
    def test_dashboard_personalization_save_and_retrieve(
        self, client: TestClient, super_admin_headers, super_admin_user
    ):
        """Test saving and retrieving dashboard personalization with real Redis"""
        
        personalization_data = {
            "admin_user_id": str(super_admin_user.id),
            "layout": [
                {
                    "widget_id": "platform_overview",
                    "widget_type": "metrics_card",
                    "position": {"x": 0, "y": 0, "width": 12, "height": 4},
                    "settings": {},
                    "is_visible": True
                }
            ],
            "theme": "dark",
            "refresh_interval": 60,
            "timezone": "America/New_York"
        }
        
        # Save personalization
        response = client.post(
            "/api/super-admin/dashboard/personalization",
            json=personalization_data,
            headers=super_admin_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "saved successfully" in data["message"]
        
        # Retrieve personalization
        response = client.get("/api/super-admin/dashboard/personalization", headers=super_admin_headers)
        
        assert response.status_code == 200
        retrieved_data = response.json()
        assert retrieved_data["theme"] == "dark"
        assert retrieved_data["refresh_interval"] == 60
        assert len(retrieved_data["layout"]) == 1
    
    def test_dashboard_personalization_default(
        self, client: TestClient, super_admin_headers, super_admin_user
    ):
        """Test getting default dashboard personalization when none exists"""
        
        # Get personalization when none exists (should return defaults)
        response = client.get("/api/super-admin/dashboard/personalization", headers=super_admin_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["admin_user_id"] == str(super_admin_user.id)
        assert data["theme"] == "light"  # Default theme
        assert len(data["layout"]) >= 3  # Default layout should have multiple widgets
    
    def test_quick_tenant_actions_with_real_database(
        self, client: TestClient, super_admin_headers, sample_tenants, db_session: Session
    ):
        """Test quick tenant actions with real database operations"""
        
        # Get an active tenant to suspend
        active_tenant = next(t for t in sample_tenants if t.status == TenantStatus.ACTIVE)
        
        # Test suspension
        response = client.post(
            f"/api/super-admin/dashboard/quick-actions/tenant/{active_tenant.id}/suspend",
            params={"reason": "Payment overdue"},
            headers=super_admin_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "suspended successfully" in data["message"]
        assert data["tenant_id"] == str(active_tenant.id)
        assert data["action"] == "suspend"
        
        # Verify tenant was actually updated in database
        db_session.refresh(active_tenant)
        assert active_tenant.status == TenantStatus.SUSPENDED
        assert "Payment overdue" in active_tenant.notes
        
        # Test reactivation
        response = client.post(
            f"/api/super-admin/dashboard/quick-actions/tenant/{active_tenant.id}/activate",
            headers=super_admin_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "activated successfully" in data["message"]
        
        # Verify tenant was reactivated in database
        db_session.refresh(active_tenant)
        assert active_tenant.status == TenantStatus.ACTIVE
    
    def test_quick_actions_with_nonexistent_tenant(
        self, client: TestClient, super_admin_headers
    ):
        """Test quick actions with non-existent tenant"""
        
        fake_tenant_id = str(uuid.uuid4())
        
        response = client.post(
            f"/api/super-admin/dashboard/quick-actions/tenant/{fake_tenant_id}/suspend",
            params={"reason": "Test reason"},
            headers=super_admin_headers
        )
        
        assert response.status_code == 404
        assert "not found" in response.json()["detail"]
    
    def test_export_executive_report_with_real_data(
        self, client: TestClient, super_admin_headers, sample_tenants, sample_users_and_data
    ):
        """Test exporting executive report with real database data"""
        
        # Test JSON export
        response = client.get(
            "/api/super-admin/dashboard/export/executive-report",
            params={"format": "json"},
            headers=super_admin_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify report structure
        assert "report_title" in data
        assert "platform_overview" in data
        assert "system_performance" in data
        assert "financial_metrics" in data
        assert "user_metrics" in data
        
        # Verify platform overview reflects real data
        platform_overview = data["platform_overview"]
        assert platform_overview["total_signups"] >= 3
        assert "monthly_recurring_revenue" in platform_overview
    
    def test_export_executive_report_csv_format(
        self, client: TestClient, super_admin_headers, sample_tenants, sample_users_and_data
    ):
        """Test exporting executive report in CSV format with real data"""
        
        response = client.get(
            "/api/super-admin/dashboard/export/executive-report",
            params={"format": "csv"},
            headers=super_admin_headers
        )
        
        assert response.status_code == 200
        assert response.headers["content-type"] == "text/csv; charset=utf-8"
        assert "attachment" in response.headers["content-disposition"]
        
        # Verify CSV content contains expected data
        csv_content = response.content.decode()
        assert "HesaabPlus Executive Dashboard Report" in csv_content
        assert "Platform Overview" in csv_content
        assert "System Performance" in csv_content
    
    def test_export_executive_report_pdf_not_implemented(
        self, client: TestClient, super_admin_headers
    ):
        """Test PDF export returns not implemented"""
        response = client.get(
            "/api/super-admin/dashboard/export/executive-report",
            params={"format": "pdf"},
            headers=super_admin_headers
        )
        
        assert response.status_code == 501
        assert "not implemented" in response.json()["detail"]
    
    def test_dashboard_health_check_with_real_services(
        self, client: TestClient, super_admin_headers, super_admin_user
    ):
        """Test dashboard health check with real Redis and database connections"""
        
        response = client.get("/api/super-admin/dashboard/health", headers=super_admin_headers)
        
        # Should succeed with real services running in Docker
        assert response.status_code == 200
        data = response.json()
        
        assert data["status"] == "healthy"
        assert data["service"] == "super_admin_dashboard"
        assert data["admin_user_id"] == str(super_admin_user.id)
        assert "checks" in data
        
        # Redis should be working in Docker environment
        assert data["checks"]["redis"] == "ok"
        assert data["checks"]["database"] == "ok"
    
    def test_dashboard_with_invalid_authentication(self, client: TestClient):
        """Test dashboard access with invalid authentication"""
        
        # Test without authentication
        response = client.get("/api/super-admin/dashboard/")
        assert response.status_code == 401
        
        # Test with invalid token
        invalid_headers = {"Authorization": "Bearer invalid_token"}
        response = client.get("/api/super-admin/dashboard/", headers=invalid_headers)
        assert response.status_code == 401
        
        # Test with non-super-admin user
        regular_user_token = create_access_token(data={
            "user_id": str(uuid.uuid4()),
            "email": "regular@user.com",
            "role": "admin",
            "is_super_admin": False
        })
        regular_headers = {"Authorization": f"Bearer {regular_user_token}"}
        response = client.get("/api/super-admin/dashboard/", headers=regular_headers)
        assert response.status_code == 403
    
    def test_multi_tenant_data_isolation_in_analytics(
        self, client: TestClient, super_admin_headers, sample_tenants, sample_users_and_data, db_session: Session
    ):
        """Test that dashboard analytics properly isolate tenant data"""
        
        # Get dashboard data
        response = client.get("/api/super-admin/dashboard/", headers=super_admin_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify that analytics include data from all tenants
        platform_metrics = data["platform_metrics"]
        
        # Should count all tenants we created
        assert platform_metrics["total_signups"] >= 3
        
        # Should count invoices from all tenants
        assert platform_metrics["total_invoices_created"] >= 15  # 5 per tenant * 3 tenants
        
        # Verify tenant-specific data is aggregated correctly
        pro_tenants = [t for t in sample_tenants if t.subscription_type == SubscriptionType.PRO]
        free_tenants = [t for t in sample_tenants if t.subscription_type == SubscriptionType.FREE]
        
        assert platform_metrics["pro_subscriptions"] >= len(pro_tenants)
        assert platform_metrics["free_subscriptions"] >= len(free_tenants)
    
    def test_dashboard_performance_with_large_dataset(
        self, client: TestClient, super_admin_headers, db_session: Session
    ):
        """Test dashboard performance with larger dataset"""
        
        # Create additional test data
        additional_tenants = []
        for i in range(10):  # Create 10 more tenants
            tenant = Tenant(
                id=uuid.uuid4(),
                name=f"Performance Test Tenant {i}",
                email=f"perf{i}@test.com",
                phone=f"+123456789{i}",
                subscription_type=SubscriptionType.PRO if i % 2 == 0 else SubscriptionType.FREE,
                status=TenantStatus.ACTIVE,
                created_at=datetime.utcnow() - timedelta(days=i)
            )
            additional_tenants.append(tenant)
            db_session.add(tenant)
        
        db_session.commit()
        
        # Measure response time
        import time
        start_time = time.time()
        
        response = client.get("/api/super-admin/dashboard/", headers=super_admin_headers)
        
        end_time = time.time()
        response_time = end_time - start_time
        
        # Verify successful response
        assert response.status_code == 200
        
        # Response should be reasonably fast (under 5 seconds for this test dataset)
        assert response_time < 5.0
        
        # Verify data includes the additional tenants
        data = response.json()
        platform_metrics = data["platform_metrics"]
        assert platform_metrics["total_signups"] >= 13  # Original 3 + 10 new
    
    def test_dashboard_analytics_charts_with_real_data(
        self, client: TestClient, super_admin_headers, sample_tenants, sample_users_and_data
    ):
        """Test analytics charts endpoints with real database data"""
        
        # Test user growth trends
        response = client.get("/api/super-admin/dashboard/analytics/user-growth-trends", headers=super_admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert "trend_data" in data
        assert "total_users" in data
        assert data["total_users"] >= 3  # We created users for each tenant
        
        # Test revenue analysis trends
        response = client.get("/api/super-admin/dashboard/analytics/revenue-analysis-trends", headers=super_admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert "trend_data" in data
        assert "growth_metrics" in data
        
        # Test invoice volume trends
        response = client.get("/api/super-admin/dashboard/analytics/invoice-volume-trends", headers=super_admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert "trend_data" in data
        assert "total_invoices" in data
        assert data["total_invoices"] >= 15  # 5 invoices per tenant * 3 tenants


class TestSuperAdminDashboardRealWorldScenarios:
    """Test real-world scenarios with comprehensive data"""
    
    def test_complete_dashboard_workflow_with_business_data(
        self, client: TestClient, super_admin_headers, db_session: Session
    ):
        """Test complete dashboard workflow with realistic business data"""
        
        # Create a realistic business scenario
        # 1. Multiple tenants with different subscription types and statuses
        tenants_data = [
            {"name": "Gold Palace", "subscription": SubscriptionType.PRO, "status": TenantStatus.ACTIVE, "days_old": 90},
            {"name": "Silver Shop", "subscription": SubscriptionType.FREE, "status": TenantStatus.ACTIVE, "days_old": 30},
            {"name": "Diamond Store", "subscription": SubscriptionType.PRO, "status": TenantStatus.ACTIVE, "days_old": 180},
            {"name": "Suspended Jewelry", "subscription": SubscriptionType.FREE, "status": TenantStatus.SUSPENDED, "days_old": 60},
            {"name": "New Startup", "subscription": SubscriptionType.FREE, "status": TenantStatus.PENDING, "days_old": 5},
        ]
        
        created_tenants = []
        for tenant_data in tenants_data:
            tenant = Tenant(
                id=uuid.uuid4(),
                name=tenant_data["name"],
                email=f"{tenant_data['name'].lower().replace(' ', '')}@business.com",
                phone=f"+1234567{len(created_tenants):03d}",
                subscription_type=tenant_data["subscription"],
                status=tenant_data["status"],
                created_at=datetime.utcnow() - timedelta(days=tenant_data["days_old"])
            )
            created_tenants.append(tenant)
            db_session.add(tenant)
        
        db_session.commit()
        
        # 2. Test dashboard with this realistic data
        response = client.get("/api/super-admin/dashboard/", headers=super_admin_headers)
        assert response.status_code == 200
        data = response.json()
        
        # 3. Verify business metrics
        platform_metrics = data["platform_metrics"]
        assert platform_metrics["total_signups"] >= 5
        assert platform_metrics["pro_subscriptions"] >= 2  # Gold Palace and Diamond Store
        assert platform_metrics["free_subscriptions"] >= 3  # Silver Shop, Suspended Jewelry, New Startup
        
        # 4. Test different time ranges
        for time_range in ["7d", "30d", "90d"]:
            response = client.get(
                "/api/super-admin/dashboard/",
                params={"time_range": time_range},
                headers=super_admin_headers
            )
            assert response.status_code == 200
            
        # 5. Test widget data individually
        widgets = ["platform_overview", "user_activity", "system_health"]
        for widget in widgets:
            response = client.get(f"/api/super-admin/dashboard/widgets/{widget}", headers=super_admin_headers)
            assert response.status_code == 200
        
        # 6. Test export functionality
        response = client.get(
            "/api/super-admin/dashboard/export/executive-report",
            params={"format": "json"},
            headers=super_admin_headers
        )
        assert response.status_code == 200
        report_data = response.json()
        assert report_data["platform_overview"]["total_signups"] >= 5