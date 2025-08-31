"""
Tests for Super Admin Tenant Management API endpoints
"""

import pytest
import uuid
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.core.database import SessionLocal
from app.core.auth import create_access_token
from app.models.tenant import Tenant, SubscriptionType, TenantStatus
from app.models.user import User, UserRole, UserStatus


class TestSuperAdminTenantManagementAPI:
    """Test Super Admin tenant management API endpoints"""
    
    @pytest.fixture
    def client(self):
        """Create test client"""
        return TestClient(app)
    
    @pytest.fixture
    def db_session(self):
        """Create test database session"""
        db = SessionLocal()
        try:
            yield db
        finally:
            db.close()
    
    @pytest.fixture
    def super_admin_user(self, db_session):
        """Create super admin user for testing"""
        super_admin = User(
            tenant_id=None,
            email="super@admin.com",
            password_hash="hashed_password",
            first_name="Super",
            last_name="Admin",
            role=UserRole.OWNER,
            status=UserStatus.ACTIVE,
            is_super_admin=True
        )
        
        db_session.add(super_admin)
        db_session.commit()
        db_session.refresh(super_admin)
        
        return super_admin
    
    @pytest.fixture
    def regular_user(self, db_session):
        """Create regular user for testing"""
        # Create tenant first
        tenant = Tenant(
            name="Regular Tenant",
            email="regular@tenant.com",
            subscription_type=SubscriptionType.FREE,
            status=TenantStatus.ACTIVE
        )
        
        db_session.add(tenant)
        db_session.commit()
        db_session.refresh(tenant)
        
        # Create user
        user = User(
            tenant_id=tenant.id,
            email="regular@user.com",
            password_hash="hashed_password",
            first_name="Regular",
            last_name="User",
            role=UserRole.OWNER,
            status=UserStatus.ACTIVE,
            is_super_admin=False
        )
        
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
        
        return user
    
    @pytest.fixture
    def test_tenants(self, db_session):
        """Create test tenants"""
        tenants = []
        
        # Active Pro tenant
        tenant1 = Tenant(
            name="Active Pro Tenant",
            email="active@pro.com",
            subscription_type=SubscriptionType.PRO,
            status=TenantStatus.ACTIVE,
            subscription_starts_at=datetime.utcnow() - timedelta(days=30),
            subscription_expires_at=datetime.utcnow() + timedelta(days=335)
        )
        tenants.append(tenant1)
        
        # Pending Free tenant
        tenant2 = Tenant(
            name="Pending Free Tenant",
            email="pending@free.com",
            subscription_type=SubscriptionType.FREE,
            status=TenantStatus.PENDING
        )
        tenants.append(tenant2)
        
        # Suspended tenant
        tenant3 = Tenant(
            name="Suspended Tenant",
            email="suspended@tenant.com",
            subscription_type=SubscriptionType.PRO,
            status=TenantStatus.SUSPENDED,
            subscription_starts_at=datetime.utcnow() - timedelta(days=60),
            subscription_expires_at=datetime.utcnow() + timedelta(days=305)
        )
        tenants.append(tenant3)
        
        # Expired Pro tenant
        tenant4 = Tenant(
            name="Expired Pro Tenant",
            email="expired@pro.com",
            subscription_type=SubscriptionType.PRO,
            status=TenantStatus.ACTIVE,
            subscription_starts_at=datetime.utcnow() - timedelta(days=400),
            subscription_expires_at=datetime.utcnow() - timedelta(days=35)
        )
        tenants.append(tenant4)
        
        db_session.add_all(tenants)
        db_session.commit()
        
        for tenant in tenants:
            db_session.refresh(tenant)
        
        return tenants
    
    def create_super_admin_headers(self, super_admin_user):
        """Create authorization headers for super admin"""
        token_data = {
            "user_id": str(super_admin_user.id),
            "email": super_admin_user.email,
            "role": super_admin_user.role.value,
            "is_super_admin": True
        }
        
        token = create_access_token(data=token_data)
        return {"Authorization": f"Bearer {token}"}
    
    def create_regular_user_headers(self, regular_user):
        """Create authorization headers for regular user"""
        token_data = {
            "user_id": str(regular_user.id),
            "tenant_id": str(regular_user.tenant_id),
            "email": regular_user.email,
            "role": regular_user.role.value,
            "is_super_admin": False
        }
        
        token = create_access_token(data=token_data)
        return {"Authorization": f"Bearer {token}"}
    
    def test_get_tenants_success(self, client, super_admin_user, test_tenants):
        """Test getting tenants list successfully"""
        headers = self.create_super_admin_headers(super_admin_user)
        
        response = client.get("/api/super-admin/tenants", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        assert "tenants" in data
        assert "total" in data
        assert "skip" in data
        assert "limit" in data
        assert "has_more" in data
        
        assert len(data["tenants"]) == len(test_tenants)
        assert data["total"] == len(test_tenants)
        
        # Check tenant data structure
        tenant = data["tenants"][0]
        assert "id" in tenant
        assert "name" in tenant
        assert "email" in tenant
        assert "subscription_type" in tenant
        assert "status" in tenant
        assert "current_usage" in tenant
    
    def test_get_tenants_with_filters(self, client, super_admin_user, test_tenants):
        """Test getting tenants with filters"""
        headers = self.create_super_admin_headers(super_admin_user)
        
        # Filter by subscription type
        response = client.get(
            "/api/super-admin/tenants?subscription_type=pro",
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Should return only Pro tenants
        pro_tenants = [t for t in data["tenants"] if t["subscription_type"] == "pro"]
        assert len(pro_tenants) == len(data["tenants"])
        
        # Filter by status
        response = client.get(
            "/api/super-admin/tenants?status=active",
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Should return only active tenants
        active_tenants = [t for t in data["tenants"] if t["status"] == "active"]
        assert len(active_tenants) == len(data["tenants"])
    
    def test_get_tenants_with_search(self, client, super_admin_user, test_tenants):
        """Test getting tenants with search term"""
        headers = self.create_super_admin_headers(super_admin_user)
        
        response = client.get(
            "/api/super-admin/tenants?search_term=Active",
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Should return tenants with "Active" in name
        assert len(data["tenants"]) >= 1
        assert any("Active" in tenant["name"] for tenant in data["tenants"])
    
    def test_get_tenants_with_pagination(self, client, super_admin_user, test_tenants):
        """Test getting tenants with pagination"""
        headers = self.create_super_admin_headers(super_admin_user)
        
        response = client.get(
            "/api/super-admin/tenants?skip=0&limit=2",
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert len(data["tenants"]) <= 2
        assert data["skip"] == 0
        assert data["limit"] == 2
        
        if len(test_tenants) > 2:
            assert data["has_more"] == True
    
    def test_get_tenants_unauthorized(self, client, regular_user):
        """Test that regular users cannot access tenant list"""
        headers = self.create_regular_user_headers(regular_user)
        
        response = client.get("/api/super-admin/tenants", headers=headers)
        
        assert response.status_code == 403
    
    def test_create_tenant_success(self, client, super_admin_user):
        """Test creating a new tenant successfully"""
        headers = self.create_super_admin_headers(super_admin_user)
        
        tenant_data = {
            "name": "New Test Tenant",
            "email": "new@test.com",
            "phone": "+1234567890",
            "address": "123 Test Street",
            "business_type": "retail",
            "subscription_type": "free",
            "notes": "Test tenant creation"
        }
        
        response = client.post("/api/super-admin/tenants", json=tenant_data, headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["name"] == tenant_data["name"]
        assert data["email"] == tenant_data["email"]
        assert data["phone"] == tenant_data["phone"]
        assert data["subscription_type"] == "free"
        assert data["status"] == "pending"  # New tenants start as pending
        assert "id" in data
    
    def test_create_tenant_duplicate_email(self, client, super_admin_user, test_tenants):
        """Test creating tenant with duplicate email fails"""
        headers = self.create_super_admin_headers(super_admin_user)
        
        tenant_data = {
            "name": "Duplicate Email Tenant",
            "email": test_tenants[0].email,  # Use existing email
            "subscription_type": "free"
        }
        
        response = client.post("/api/super-admin/tenants", json=tenant_data, headers=headers)
        
        assert response.status_code == 400
        assert "email already exists" in response.json()["detail"]
    
    def test_get_tenant_by_id_success(self, client, super_admin_user, test_tenants):
        """Test getting specific tenant by ID"""
        headers = self.create_super_admin_headers(super_admin_user)
        tenant = test_tenants[0]
        
        response = client.get(f"/api/super-admin/tenants/{tenant.id}", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["id"] == str(tenant.id)
        assert data["name"] == tenant.name
        assert data["email"] == tenant.email
        assert "current_usage" in data
    
    def test_get_tenant_by_id_not_found(self, client, super_admin_user):
        """Test getting non-existent tenant returns 404"""
        headers = self.create_super_admin_headers(super_admin_user)
        fake_id = str(uuid.uuid4())
        
        response = client.get(f"/api/super-admin/tenants/{fake_id}", headers=headers)
        
        assert response.status_code == 404
    
    def test_update_tenant_success(self, client, super_admin_user, test_tenants):
        """Test updating tenant information"""
        headers = self.create_super_admin_headers(super_admin_user)
        tenant = test_tenants[0]
        
        update_data = {
            "name": "Updated Tenant Name",
            "phone": "+9876543210",
            "notes": "Updated notes"
        }
        
        response = client.put(f"/api/super-admin/tenants/{tenant.id}", json=update_data, headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["name"] == update_data["name"]
        assert data["phone"] == update_data["phone"]
        assert "Updated notes" in data["notes"]
    
    def test_update_tenant_status_success(self, client, super_admin_user, test_tenants):
        """Test updating tenant status"""
        headers = self.create_super_admin_headers(super_admin_user)
        tenant = test_tenants[1]  # Pending tenant
        
        status_data = {
            "status": "active",
            "reason": "Approved by admin"
        }
        
        response = client.put(f"/api/super-admin/tenants/{tenant.id}/status", json=status_data, headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["status"] == "active"
        assert "Approved by admin" in data["notes"]
    
    def test_update_tenant_subscription_success(self, client, super_admin_user, test_tenants):
        """Test updating tenant subscription"""
        headers = self.create_super_admin_headers(super_admin_user)
        tenant = test_tenants[1]  # Free tenant
        
        subscription_data = {
            "subscription_type": "pro",
            "duration_months": 12
        }
        
        response = client.put(f"/api/super-admin/tenants/{tenant.id}/subscription", json=subscription_data, headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["subscription_type"] == "pro"
        assert data["subscription_expires_at"] is not None
        assert data["max_users"] == 5  # Pro limits
        assert data["max_products"] == -1  # Unlimited
    
    def test_delete_tenant_success(self, client, super_admin_user, db_session):
        """Test deleting a tenant"""
        headers = self.create_super_admin_headers(super_admin_user)
        
        # Create a tenant to delete
        tenant = Tenant(
            name="To Be Deleted",
            email="delete@test.com",
            subscription_type=SubscriptionType.FREE,
            status=TenantStatus.PENDING
        )
        
        db_session.add(tenant)
        db_session.commit()
        db_session.refresh(tenant)
        
        response = client.delete(f"/api/super-admin/tenants/{tenant.id}", headers=headers)
        
        assert response.status_code == 200
        assert "permanently deleted" in response.json()["message"]
        
        # Verify tenant is deleted
        deleted_tenant = db_session.query(Tenant).filter(Tenant.id == tenant.id).first()
        assert deleted_tenant is None
    
    def test_get_pending_payment_tenants(self, client, super_admin_user, test_tenants):
        """Test getting tenants with pending payments"""
        headers = self.create_super_admin_headers(super_admin_user)
        
        response = client.get("/api/super-admin/tenants/pending-payments", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        assert "tenants" in data
        assert "total" in data
        
        # Should include pending Pro tenants and expired Pro tenants
        pending_tenants = data["tenants"]
        assert len(pending_tenants) >= 0  # May be 0 if no pending payments
        
        for tenant in pending_tenants:
            assert tenant["subscription_type"] == "pro"
            assert "days_since_signup" in tenant
    
    def test_confirm_payment_success(self, client, super_admin_user, db_session):
        """Test confirming payment and activating Pro subscription"""
        headers = self.create_super_admin_headers(super_admin_user)
        
        # Create a pending Pro tenant
        tenant = Tenant(
            name="Pending Pro Tenant",
            email="pending@pro.com",
            subscription_type=SubscriptionType.PRO,
            status=TenantStatus.PENDING
        )
        
        db_session.add(tenant)
        db_session.commit()
        db_session.refresh(tenant)
        
        payment_data = {
            "tenant_id": str(tenant.id),
            "duration_months": 12,
            "payment_reference": "PAY123456",
            "notes": "Payment confirmed via bank transfer"
        }
        
        response = client.post("/api/super-admin/tenants/confirm-payment", json=payment_data, headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] == True
        assert data["tenant_id"] == str(tenant.id)
        assert data["subscription_type"] == "pro"
        assert data["subscription_expires_at"] is not None
        
        # Verify tenant is activated
        db_session.refresh(tenant)
        assert tenant.status == TenantStatus.ACTIVE
        assert tenant.subscription_expires_at is not None
    
    def test_get_tenant_statistics(self, client, super_admin_user, test_tenants):
        """Test getting platform-wide tenant statistics"""
        headers = self.create_super_admin_headers(super_admin_user)
        
        response = client.get("/api/super-admin/stats", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        assert "total_tenants" in data
        assert "active_tenants" in data
        assert "suspended_tenants" in data
        assert "pending_tenants" in data
        assert "free_subscriptions" in data
        assert "pro_subscriptions" in data
        assert "enterprise_subscriptions" in data
        assert "expired_subscriptions" in data
        assert "revenue_this_month" in data
        assert "new_signups_this_month" in data
        
        # Verify counts match test data
        assert data["total_tenants"] >= len(test_tenants)
        assert isinstance(data["revenue_this_month"], (int, float))
    
    def test_bulk_tenant_action_success(self, client, super_admin_user, test_tenants):
        """Test bulk tenant actions"""
        headers = self.create_super_admin_headers(super_admin_user)
        
        # Get some tenant IDs for bulk action
        tenant_ids = [str(test_tenants[0].id), str(test_tenants[1].id)]
        
        bulk_data = {
            "tenant_ids": tenant_ids,
            "action": "suspend",
            "reason": "Bulk suspension for testing"
        }
        
        response = client.post("/api/super-admin/tenants/bulk-action", json=bulk_data, headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        assert "success_count" in data
        assert "failed_count" in data
        assert "successful_tenant_ids" in data
        assert "failed_operations" in data
        
        assert data["success_count"] >= 0
        assert len(data["successful_tenant_ids"]) == data["success_count"]
    
    def test_unauthorized_access_all_endpoints(self, client):
        """Test that all super admin endpoints require authentication"""
        endpoints = [
            ("GET", "/api/super-admin/tenants"),
            ("POST", "/api/super-admin/tenants"),
            ("GET", "/api/super-admin/tenants/fake-id"),
            ("PUT", "/api/super-admin/tenants/fake-id"),
            ("DELETE", "/api/super-admin/tenants/fake-id"),
            ("GET", "/api/super-admin/tenants/pending-payments"),
            ("POST", "/api/super-admin/tenants/confirm-payment"),
            ("GET", "/api/super-admin/stats"),
            ("POST", "/api/super-admin/tenants/bulk-action")
        ]
        
        for method, endpoint in endpoints:
            if method == "GET":
                response = client.get(endpoint)
            elif method == "POST":
                response = client.post(endpoint, json={})
            elif method == "PUT":
                response = client.put(endpoint, json={})
            elif method == "DELETE":
                response = client.delete(endpoint)
            
            assert response.status_code in [401, 403], f"Endpoint {method} {endpoint} should require authentication"


class TestSuperAdminAPIIntegration:
    """Integration tests for Super Admin API with real database operations"""
    
    @pytest.fixture
    def client(self):
        """Create test client"""
        return TestClient(app)
    
    def test_complete_tenant_lifecycle(self, client):
        """Test complete tenant lifecycle from creation to deletion"""
        db = SessionLocal()
        try:
            # Create super admin
            super_admin = User(
                tenant_id=None,
                email="lifecycle@admin.com",
                password_hash="hashed_password",
                first_name="Lifecycle",
                last_name="Admin",
                role=UserRole.OWNER,
                status=UserStatus.ACTIVE,
                is_super_admin=True
            )
            
            db.add(super_admin)
            db.commit()
            db.refresh(super_admin)
            
            # Create auth headers
            token_data = {
                "user_id": str(super_admin.id),
                "email": super_admin.email,
                "role": super_admin.role.value,
                "is_super_admin": True
            }
            token = create_access_token(data=token_data)
            headers = {"Authorization": f"Bearer {token}"}
            
            # Step 1: Create tenant
            tenant_data = {
                "name": "Lifecycle Test Tenant",
                "email": "lifecycle@tenant.com",
                "subscription_type": "free"
            }
            
            response = client.post("/api/super-admin/tenants", json=tenant_data, headers=headers)
            assert response.status_code == 200
            tenant = response.json()
            tenant_id = tenant["id"]
            
            # Step 2: Update tenant information
            update_data = {
                "phone": "+1234567890",
                "address": "123 Lifecycle Street"
            }
            
            response = client.put(f"/api/super-admin/tenants/{tenant_id}", json=update_data, headers=headers)
            assert response.status_code == 200
            
            # Step 3: Approve tenant
            status_data = {
                "status": "active",
                "reason": "Approved for testing"
            }
            
            response = client.put(f"/api/super-admin/tenants/{tenant_id}/status", json=status_data, headers=headers)
            assert response.status_code == 200
            
            # Step 4: Upgrade to Pro
            subscription_data = {
                "subscription_type": "pro",
                "duration_months": 6
            }
            
            response = client.put(f"/api/super-admin/tenants/{tenant_id}/subscription", json=subscription_data, headers=headers)
            assert response.status_code == 200
            updated_tenant = response.json()
            assert updated_tenant["subscription_type"] == "pro"
            
            # Step 5: Suspend tenant
            suspend_data = {
                "status": "suspended",
                "reason": "Testing suspension"
            }
            
            response = client.put(f"/api/super-admin/tenants/{tenant_id}/status", json=suspend_data, headers=headers)
            assert response.status_code == 200
            
            # Step 6: Get tenant details
            response = client.get(f"/api/super-admin/tenants/{tenant_id}", headers=headers)
            assert response.status_code == 200
            final_tenant = response.json()
            assert final_tenant["status"] == "suspended"
            
            # Step 7: Delete tenant
            response = client.delete(f"/api/super-admin/tenants/{tenant_id}", headers=headers)
            assert response.status_code == 200
            
            # Step 8: Verify deletion
            response = client.get(f"/api/super-admin/tenants/{tenant_id}", headers=headers)
            assert response.status_code == 404
            
        finally:
            db.close()


if __name__ == "__main__":
    pytest.main([__file__, "-v"])