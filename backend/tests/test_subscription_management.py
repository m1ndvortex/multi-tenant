"""
Unit Tests for Professional Subscription Management API
Tests subscription management endpoints with real database scenarios
"""

import pytest
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
import uuid

from app.main import app
from app.core.database import get_db
from app.models.tenant import Tenant, SubscriptionType, TenantStatus
from app.models.user import User, UserRole, UserStatus
from app.models.subscription_history import SubscriptionHistory
from app.core.auth import create_access_token
from tests.conftest import TestDatabase


class TestSubscriptionManagement:
    """Test suite for subscription management API endpoints"""
    
    @pytest.fixture
    def client(self):
        """Create test client"""
        return TestClient(app)
    
    @pytest.fixture
    def db_session(self):
        """Create database session for testing"""
        test_db = TestDatabase()
        session = test_db.get_session()
        
        # Override the dependency to use the same session
        def override_get_db():
            try:
                yield session
            finally:
                pass  # Don't close the session here
        
        app.dependency_overrides[get_db] = override_get_db
        
        yield session
        
        # Cleanup
        try:
            session.rollback()
        except:
            pass
        finally:
            session.close()
            app.dependency_overrides.clear()
    
    @pytest.fixture
    def super_admin_user(self, db_session: Session):
        """Create super admin user for testing"""
        user = User(
            id=uuid.uuid4(),
            email="superadmin@test.com",
            first_name="Super",
            last_name="Admin",
            password_hash="hashed_password",
            role=UserRole.OWNER,
            status=UserStatus.ACTIVE,
            is_super_admin=True,
            is_active=True,
            is_email_verified=True
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
        return user
    
    @pytest.fixture
    def test_tenant(self, db_session: Session):
        """Create test tenant"""
        tenant = Tenant(
            id=uuid.uuid4(),
            name="Test Company",
            email="test@company.com",
            phone="1234567890",
            address="123 Test St",
            subscription_type=SubscriptionType.FREE,
            status=TenantStatus.ACTIVE,
            max_users=1,
            max_products=10,
            max_customers=10,
            max_monthly_invoices=10
        )
        db_session.add(tenant)
        db_session.commit()
        db_session.refresh(tenant)
        return tenant
    
    @pytest.fixture
    def pro_tenant(self, db_session: Session):
        """Create Pro tenant for testing"""
        tenant = Tenant(
            id=uuid.uuid4(),
            name="Pro Company",
            email="pro@company.com",
            phone="1234567890",
            address="456 Pro St",
            subscription_type=SubscriptionType.PRO,
            status=TenantStatus.ACTIVE,
            subscription_starts_at=datetime.now(timezone.utc),
            subscription_expires_at=datetime.now(timezone.utc) + timedelta(days=365),
            max_users=5,
            max_products=-1,
            max_customers=-1,
            max_monthly_invoices=-1
        )
        db_session.add(tenant)
        db_session.commit()
        db_session.refresh(tenant)
        return tenant
    
    @pytest.fixture
    def auth_headers(self, super_admin_user: User):
        """Create authentication headers"""
        from app.core.auth import create_super_admin_access_token
        token = create_super_admin_access_token(data={
            "sub": super_admin_user.email,
            "user_id": str(super_admin_user.id)
        })
        return {"Authorization": f"Bearer {token}"}
    
    def test_get_subscription_overview(self, client: TestClient, auth_headers: dict, 
                                     test_tenant: Tenant, pro_tenant: Tenant, db_session: Session):
        """Test subscription overview endpoint"""
        response = client.get("/api/subscription-management/overview", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        
        assert "total_tenants" in data
        assert "free_subscriptions" in data
        assert "pro_subscriptions" in data
        assert "expiring_soon" in data
        assert "expired" in data
        assert "conversion_rate" in data
        
        assert data["total_tenants"] >= 2
        assert data["free_subscriptions"] >= 1
        assert data["pro_subscriptions"] >= 1
    
    def test_extend_subscription_success(self, client: TestClient, auth_headers: dict,
                                       test_tenant: Tenant, db_session: Session):
        """Test successful subscription extension"""
        extension_data = {
            "months": 12,
            "reason": "Customer requested extension"
        }
        
        response = client.post(
            f"/api/subscription-management/tenants/{test_tenant.id}/extend",
            json=extension_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert data["tenant_id"] == str(test_tenant.id)
        assert data["months_added"] == 12
        assert data["days_added"] == 360
        assert "new_expiration_date" in data
        
        # Verify database changes by re-querying
        updated_tenant = db_session.query(Tenant).filter(Tenant.id == test_tenant.id).first()
        assert updated_tenant.subscription_type == SubscriptionType.PRO
        assert updated_tenant.subscription_expires_at is not None
        assert updated_tenant.status == TenantStatus.ACTIVE
        
        # Verify history entry was created
        history = db_session.query(SubscriptionHistory).filter(
            SubscriptionHistory.tenant_id == test_tenant.id
        ).first()
        assert history is not None
        assert history.action == "EXTENDED"
        assert history.duration_months == 12
    
    def test_extend_subscription_invalid_tenant(self, client: TestClient, auth_headers: dict):
        """Test extension with invalid tenant ID"""
        extension_data = {
            "months": 6,
            "reason": "Test extension"
        }
        
        fake_tenant_id = str(uuid.uuid4())
        response = client.post(
            f"/api/subscription-management/tenants/{fake_tenant_id}/extend",
            json=extension_data,
            headers=auth_headers
        )
        
        assert response.status_code == 404
        assert "Tenant not found" in response.json()["detail"]
    
    def test_extend_subscription_invalid_months(self, client: TestClient, auth_headers: dict,
                                              test_tenant: Tenant):
        """Test extension with invalid month count"""
        extension_data = {
            "months": 50,  # Invalid: > 36
            "reason": "Test extension"
        }
        
        response = client.post(
            f"/api/subscription-management/tenants/{test_tenant.id}/extend",
            json=extension_data,
            headers=auth_headers
        )
        
        assert response.status_code == 422  # Validation error
    
    def test_update_subscription_status_activate(self, client: TestClient, auth_headers: dict,
                                                test_tenant: Tenant, db_session: Session):
        """Test activating subscription status"""
        # First suspend the tenant
        test_tenant.status = TenantStatus.SUSPENDED
        db_session.commit()
        
        status_data = {
            "activate": True,
            "subscription_type": "pro",
            "reason": "Customer payment received"
        }
        
        response = client.put(
            f"/api/subscription-management/tenants/{test_tenant.id}/status",
            json=status_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert data["new_status"] == "active"
        assert data["new_subscription_type"] == "pro"
        
        # Verify database changes by re-querying
        updated_tenant = db_session.query(Tenant).filter(Tenant.id == test_tenant.id).first()
        assert updated_tenant.status == TenantStatus.ACTIVE
        assert updated_tenant.subscription_type == SubscriptionType.PRO
        assert updated_tenant.subscription_expires_at is not None
    
    def test_update_subscription_status_deactivate(self, client: TestClient, auth_headers: dict,
                                                  test_tenant: Tenant, db_session: Session):
        """Test deactivating subscription status"""
        status_data = {
            "activate": False,
            "reason": "Payment failed"
        }
        
        response = client.put(
            f"/api/subscription-management/tenants/{test_tenant.id}/status",
            json=status_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert data["new_status"] == "suspended"
        
        # Verify database changes by re-querying
        updated_tenant = db_session.query(Tenant).filter(Tenant.id == test_tenant.id).first()
        assert updated_tenant.status == TenantStatus.SUSPENDED
    
    def test_switch_subscription_plan_upgrade(self, client: TestClient, auth_headers: dict,
                                            test_tenant: Tenant, db_session: Session):
        """Test upgrading subscription plan"""
        plan_data = {
            "new_plan": "pro",
            "duration_months": 12,
            "reason": "Customer upgrade request",
            "immediate_effect": True
        }
        
        response = client.put(
            f"/api/subscription-management/tenants/{test_tenant.id}/plan",
            json=plan_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert data["old_plan"] == "free"
        assert data["new_plan"] == "pro"
        assert data["limits_updated"] is True
        
        # Verify database changes by re-querying
        updated_tenant = db_session.query(Tenant).filter(Tenant.id == test_tenant.id).first()
        assert updated_tenant.subscription_type == SubscriptionType.PRO
        assert updated_tenant.max_users == 5
        assert updated_tenant.max_products == -1  # Unlimited
        assert updated_tenant.subscription_expires_at is not None
    
    def test_switch_subscription_plan_downgrade(self, client: TestClient, auth_headers: dict,
                                               pro_tenant: Tenant, db_session: Session):
        """Test downgrading subscription plan"""
        plan_data = {
            "new_plan": "free",
            "reason": "Customer downgrade request",
            "immediate_effect": True
        }
        
        response = client.put(
            f"/api/subscription-management/tenants/{pro_tenant.id}/plan",
            json=plan_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert data["old_plan"] == "pro"
        assert data["new_plan"] == "free"
        
        # Verify database changes by re-querying
        updated_tenant = db_session.query(Tenant).filter(Tenant.id == pro_tenant.id).first()
        assert updated_tenant.subscription_type == SubscriptionType.FREE
        assert updated_tenant.max_users == 1
        assert updated_tenant.max_products == 10
        assert updated_tenant.subscription_expires_at is None
    
    def test_get_subscription_history(self, client: TestClient, auth_headers: dict,
                                    test_tenant: Tenant, super_admin_user: User, db_session: Session):
        """Test getting subscription history"""
        # Create some history entries
        history1 = SubscriptionHistory.create_history_entry(
            tenant_id=str(test_tenant.id),
            action="CREATED",
            new_subscription_type="free",
            admin_id=str(super_admin_user.id),
            reason="Initial tenant creation"
        )
        
        history2 = SubscriptionHistory.create_history_entry(
            tenant_id=str(test_tenant.id),
            action="UPGRADED",
            old_subscription_type="free",
            new_subscription_type="pro",
            duration_months=12,
            admin_id=str(super_admin_user.id),
            reason="Customer upgrade"
        )
        
        db_session.add(history1)
        db_session.add(history2)
        db_session.commit()
        
        response = client.get(
            f"/api/subscription-management/tenants/{test_tenant.id}/history",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["tenant_id"] == str(test_tenant.id)
        assert data["tenant_name"] == test_tenant.name
        assert len(data["history"]) >= 2
        assert data["total_entries"] >= 2
        
        # Check history entry structure
        history_entry = data["history"][0]
        assert "id" in history_entry
        assert "action" in history_entry
        assert "change_date" in history_entry
        assert "admin_email" in history_entry
    
    def test_get_tenant_subscription_details(self, client: TestClient, auth_headers: dict,
                                           pro_tenant: Tenant, db_session: Session):
        """Test getting detailed tenant subscription information"""
        response = client.get(
            f"/api/subscription-management/tenants/{pro_tenant.id}/details",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["tenant_id"] == str(pro_tenant.id)
        assert data["tenant_name"] == pro_tenant.name
        assert data["subscription_type"] == "pro"
        assert data["subscription_status"] == "active"
        assert data["is_active"] is True
        assert "usage_stats" in data
        assert "limits" in data
        assert data["limits"]["users"] == 5
        assert data["limits"]["products"] == -1  # Unlimited
    
    def test_get_subscription_statistics(self, client: TestClient, auth_headers: dict,
                                       test_tenant: Tenant, pro_tenant: Tenant, db_session: Session):
        """Test getting subscription statistics"""
        response = client.get("/api/subscription-management/stats", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        
        assert "total_active_subscriptions" in data
        assert "subscriptions_by_type" in data
        assert "expiring_this_month" in data
        assert "expired_count" in data
        assert "new_subscriptions_this_month" in data
        assert "churn_rate" in data
        assert "revenue_metrics" in data
        
        assert data["subscriptions_by_type"]["free"] >= 1
        assert data["subscriptions_by_type"]["pro"] >= 1
    
    def test_unauthorized_access(self, client: TestClient, test_tenant: Tenant):
        """Test unauthorized access to subscription management endpoints"""
        # Test without authentication
        response = client.get("/api/subscription-management/overview")
        assert response.status_code == 403  # FastAPI returns 403 for missing auth
        
        # Test extension without auth
        response = client.post(
            f"/api/subscription-management/tenants/{test_tenant.id}/extend",
            json={"months": 6}
        )
        assert response.status_code == 403
    
    def test_subscription_extension_with_existing_expiry(self, client: TestClient, auth_headers: dict,
                                                       pro_tenant: Tenant, db_session: Session):
        """Test extending subscription that already has expiry date"""
        original_expiry = pro_tenant.subscription_expires_at
        
        extension_data = {
            "months": 6,
            "reason": "Extension test"
        }
        
        response = client.post(
            f"/api/subscription-management/tenants/{pro_tenant.id}/extend",
            json=extension_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert data["months_added"] == 6
        
        # Verify the extension was added to existing expiry by re-querying
        updated_tenant = db_session.query(Tenant).filter(Tenant.id == pro_tenant.id).first()
        expected_new_expiry = original_expiry + timedelta(days=180)  # 6 months
        
        # Allow for small time differences due to processing
        time_diff = abs((updated_tenant.subscription_expires_at - expected_new_expiry).total_seconds())
        assert time_diff < 60  # Less than 1 minute difference
    
    def test_subscription_history_tracking(self, client: TestClient, auth_headers: dict,
                                         test_tenant: Tenant, db_session: Session):
        """Test that all subscription changes are properly tracked in history"""
        # Perform multiple subscription operations
        
        # 1. Extend subscription
        client.post(
            f"/api/subscription-management/tenants/{test_tenant.id}/extend",
            json={"months": 12, "reason": "Initial extension"},
            headers=auth_headers
        )
        
        # 2. Change status
        client.put(
            f"/api/subscription-management/tenants/{test_tenant.id}/status",
            json={"activate": False, "reason": "Test deactivation"},
            headers=auth_headers
        )
        
        # 3. Switch plan
        client.put(
            f"/api/subscription-management/tenants/{test_tenant.id}/plan",
            json={"new_plan": "free", "reason": "Test downgrade"},
            headers=auth_headers
        )
        
        # Check history
        history_entries = db_session.query(SubscriptionHistory).filter(
            SubscriptionHistory.tenant_id == test_tenant.id
        ).order_by(SubscriptionHistory.change_date.desc()).all()
        
        assert len(history_entries) >= 3
        
        # Verify action types
        actions = [entry.action for entry in history_entries]
        assert "EXTENDED" in actions
        assert "DEACTIVATED" in actions
        assert "DOWNGRADED" in actions
        
        # Verify all entries have required fields
        for entry in history_entries:
            assert entry.tenant_id == test_tenant.id
            assert entry.admin_id is not None
            assert entry.action is not None
            assert entry.new_subscription_type is not None
            assert entry.change_date is not None
    
    def test_subscription_limits_update_on_plan_change(self, client: TestClient, auth_headers: dict,
                                                     test_tenant: Tenant, db_session: Session):
        """Test that tenant limits are properly updated when changing plans"""
        # Verify initial Free limits
        assert test_tenant.max_users == 1
        assert test_tenant.max_products == 10
        assert test_tenant.max_customers == 10
        assert test_tenant.max_monthly_invoices == 10
        
        # Upgrade to Pro
        response = client.put(
            f"/api/subscription-management/tenants/{test_tenant.id}/plan",
            json={"new_plan": "pro", "duration_months": 12, "reason": "Upgrade test"},
            headers=auth_headers
        )
        
        assert response.status_code == 200
        
        # Verify Pro limits by re-querying
        updated_tenant = db_session.query(Tenant).filter(Tenant.id == test_tenant.id).first()
        assert updated_tenant.max_users == 5
        assert updated_tenant.max_products == -1  # Unlimited
        assert updated_tenant.max_customers == -1  # Unlimited
        assert updated_tenant.max_monthly_invoices == -1  # Unlimited
        
        # Downgrade back to Free
        response = client.put(
            f"/api/subscription-management/tenants/{test_tenant.id}/plan",
            json={"new_plan": "free", "reason": "Downgrade test"},
            headers=auth_headers
        )
        
        assert response.status_code == 200
        
        # Verify Free limits restored by re-querying
        updated_tenant = db_session.query(Tenant).filter(Tenant.id == test_tenant.id).first()
        assert updated_tenant.max_users == 1
        assert updated_tenant.max_products == 10
        assert updated_tenant.max_customers == 10
        assert updated_tenant.max_monthly_invoices == 10


if __name__ == "__main__":
    pytest.main([__file__, "-v"])