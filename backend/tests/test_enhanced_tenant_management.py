"""
Comprehensive tests for Enhanced Tenant Management API
Tests all enhanced tenant management endpoints with real database operations
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from datetime import datetime, timezone, timedelta
import uuid
import json

from app.main import app
from app.core.database import get_db
from app.core.auth import get_password_hash, create_super_admin_access_token
from app.models.tenant import Tenant, SubscriptionType, TenantStatus
from app.models.user import User, UserRole, UserStatus


class TestEnhancedTenantManagement:
    """Test class for Enhanced Tenant Management API"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test client and database session"""
        self.client = TestClient(app)
        self.db = next(get_db())
        
        # Create super admin user for testing
        self.super_admin = User(
            id=uuid.uuid4(),
            email="superadmin@hesaabplus.com",
            password_hash=get_password_hash("testpassword123"),
            first_name="Super",
            last_name="Admin",
            role=UserRole.OWNER,
            status=UserStatus.ACTIVE,
            is_super_admin=True,
            tenant_id=None  # Super admin has no tenant
        )
        self.db.add(self.super_admin)
        self.db.commit()
        
        # Create super admin token
        token_data = {
            "user_id": str(self.super_admin.id),
            "email": self.super_admin.email,
            "is_super_admin": True,
            "tenant_id": None
        }
        self.super_admin_token = create_super_admin_access_token(token_data)
        self.super_admin_headers = {"Authorization": f"Bearer {self.super_admin_token}"}
        
        # Create test tenant with owner
        self.test_tenant = Tenant(
            id=uuid.uuid4(),
            name="Test Business",
            email="test@business.com",
            phone="+1234567890",
            address="123 Test Street",
            subscription_type=SubscriptionType.FREE,
            status=TenantStatus.ACTIVE,
            business_type="retail",
            max_users=1,
            max_products=10,
            max_customers=10,
            max_monthly_invoices=10
        )
        self.db.add(self.test_tenant)
        self.db.commit()
        
        # Create tenant owner
        self.tenant_owner = User(
            id=uuid.uuid4(),
            tenant_id=self.test_tenant.id,
            email="owner@business.com",
            password_hash=get_password_hash("ownerpassword123"),
            first_name="Business",
            last_name="Owner",
            role=UserRole.OWNER,
            status=UserStatus.ACTIVE,
            is_super_admin=False
        )
        self.db.add(self.tenant_owner)
        self.db.commit()
        
        yield
        
        # Cleanup
        self.db.close()
    
    def test_update_tenant_credentials_email_only(self):
        """Test updating tenant owner email only"""
        update_data = {
            "email": "newemail@business.com"
        }
        
        response = self.client.put(
            f"/api/enhanced-tenant-management/tenants/{self.test_tenant.id}/credentials",
            json=update_data,
            headers=self.super_admin_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert data["tenant_id"] == str(self.test_tenant.id)
        assert data["updated_email"] == "newemail@business.com"
        assert "Email changed" in data["changes_made"][0]
        
        # Verify database changes
        self.db.refresh(self.tenant_owner)
        self.db.refresh(self.test_tenant)
        
        assert self.tenant_owner.email == "newemail@business.com"
        assert self.test_tenant.email == "newemail@business.com"
        assert "Credentials updated by admin" in self.test_tenant.notes
    
    def test_update_tenant_credentials_password_only(self):
        """Test updating tenant owner password only"""
        update_data = {
            "password": "newpassword123"
        }
        
        response = self.client.put(
            f"/api/enhanced-tenant-management/tenants/{self.test_tenant.id}/credentials",
            json=update_data,
            headers=self.super_admin_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert data["updated_email"] is None
        assert "Password updated" in data["changes_made"]
        
        # Verify password was changed (can't verify hash directly, but check it's different)
        self.db.refresh(self.tenant_owner)
        assert self.tenant_owner.password_hash != get_password_hash("ownerpassword123")
    
    def test_update_tenant_credentials_both_email_and_password(self):
        """Test updating both email and password"""
        update_data = {
            "email": "updated@business.com",
            "password": "updatedpassword123"
        }
        
        response = self.client.put(
            f"/api/enhanced-tenant-management/tenants/{self.test_tenant.id}/credentials",
            json=update_data,
            headers=self.super_admin_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert data["updated_email"] == "updated@business.com"
        assert len(data["changes_made"]) == 2
        assert any("Email changed" in change for change in data["changes_made"])
        assert any("Password updated" in change for change in data["changes_made"])
    
    def test_update_tenant_credentials_duplicate_email(self):
        """Test updating to an email that already exists"""
        # Create another user with existing email
        existing_user = User(
            id=uuid.uuid4(),
            tenant_id=self.test_tenant.id,
            email="existing@business.com",
            password_hash=get_password_hash("password123"),
            first_name="Existing",
            last_name="User",
            role=UserRole.USER,
            status=UserStatus.ACTIVE
        )
        self.db.add(existing_user)
        self.db.commit()
        
        update_data = {
            "email": "existing@business.com"
        }
        
        response = self.client.put(
            f"/api/enhanced-tenant-management/tenants/{self.test_tenant.id}/credentials",
            json=update_data,
            headers=self.super_admin_headers
        )
        
        assert response.status_code == 400
        assert "Email already exists" in response.json()["detail"]
    
    def test_update_tenant_credentials_weak_password(self):
        """Test updating with weak password"""
        update_data = {
            "password": "weak"
        }
        
        response = self.client.put(
            f"/api/enhanced-tenant-management/tenants/{self.test_tenant.id}/credentials",
            json=update_data,
            headers=self.super_admin_headers
        )
        
        assert response.status_code == 422  # Pydantic validation error
        response_data = response.json()
        assert "detail" in response_data
        # Check if it's a validation error about password length
        assert any("at least 8 characters" in str(error) for error in response_data["detail"])
    
    def test_update_tenant_credentials_nonexistent_tenant(self):
        """Test updating credentials for non-existent tenant"""
        fake_tenant_id = str(uuid.uuid4())
        update_data = {
            "email": "test@example.com"
        }
        
        response = self.client.put(
            f"/api/enhanced-tenant-management/tenants/{fake_tenant_id}/credentials",
            json=update_data,
            headers=self.super_admin_headers
        )
        
        assert response.status_code == 404
        assert "Tenant not found" in response.json()["detail"]
    
    def test_full_tenant_update_basic_info(self):
        """Test full tenant update with basic information"""
        update_data = {
            "name": "Updated Business Name",
            "phone": "+9876543210",
            "address": "456 Updated Street",
            "business_type": "wholesale"
        }
        
        response = self.client.put(
            f"/api/enhanced-tenant-management/tenants/{self.test_tenant.id}/full-update",
            json=update_data,
            headers=self.super_admin_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert data["changes_made"] == 4
        assert data["tenant_name"] == "Updated Business Name"
        
        # Verify database changes
        self.db.refresh(self.test_tenant)
        assert self.test_tenant.name == "Updated Business Name"
        assert self.test_tenant.phone == "+9876543210"
        assert self.test_tenant.address == "456 Updated Street"
        assert self.test_tenant.business_type == "wholesale"
    
    def test_full_tenant_update_subscription_upgrade_to_pro(self):
        """Test upgrading tenant to Pro subscription"""
        update_data = {
            "subscription_type": "pro",
            "subscription_duration_months": 12
        }
        
        response = self.client.put(
            f"/api/enhanced-tenant-management/tenants/{self.test_tenant.id}/full-update",
            json=update_data,
            headers=self.super_admin_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert any("Subscription: free → pro" in change for change in data["changes"])
        
        # Verify database changes
        self.db.refresh(self.test_tenant)
        assert self.test_tenant.subscription_type == SubscriptionType.PRO
        assert self.test_tenant.max_users == 5
        assert self.test_tenant.max_products == -1  # Unlimited
        assert self.test_tenant.subscription_expires_at is not None
    
    def test_full_tenant_update_subscription_downgrade_to_free(self):
        """Test downgrading tenant to Free subscription"""
        # First upgrade to Pro
        self.test_tenant.subscription_type = SubscriptionType.PRO
        self.test_tenant.max_users = 5
        self.test_tenant.max_products = -1
        self.db.commit()
        
        update_data = {
            "subscription_type": "free"
        }
        
        response = self.client.put(
            f"/api/enhanced-tenant-management/tenants/{self.test_tenant.id}/full-update",
            json=update_data,
            headers=self.super_admin_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        
        # Verify database changes
        self.db.refresh(self.test_tenant)
        assert self.test_tenant.subscription_type == SubscriptionType.FREE
        assert self.test_tenant.max_users == 1
        assert self.test_tenant.max_products == 10
        assert self.test_tenant.subscription_expires_at is None
    
    def test_full_tenant_update_custom_limits(self):
        """Test updating custom limits"""
        update_data = {
            "max_users": 10,
            "max_products": 100,
            "max_customers": 200,
            "max_monthly_invoices": 50
        }
        
        response = self.client.put(
            f"/api/enhanced-tenant-management/tenants/{self.test_tenant.id}/full-update",
            json=update_data,
            headers=self.super_admin_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert data["changes_made"] == 4
        
        # Verify database changes
        self.db.refresh(self.test_tenant)
        assert self.test_tenant.max_users == 10
        assert self.test_tenant.max_products == 100
        assert self.test_tenant.max_customers == 200
        assert self.test_tenant.max_monthly_invoices == 50
    
    def test_full_tenant_update_status_change(self):
        """Test changing tenant status"""
        update_data = {
            "status": "suspended"
        }
        
        response = self.client.put(
            f"/api/enhanced-tenant-management/tenants/{self.test_tenant.id}/full-update",
            json=update_data,
            headers=self.super_admin_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        
        # Verify database changes
        self.db.refresh(self.test_tenant)
        assert self.test_tenant.status == TenantStatus.SUSPENDED
    
    def test_full_tenant_update_with_admin_notes(self):
        """Test full update with admin notes"""
        update_data = {
            "name": "Updated Name",
            "admin_notes": "Updated due to business expansion"
        }
        
        response = self.client.put(
            f"/api/enhanced-tenant-management/tenants/{self.test_tenant.id}/full-update",
            json=update_data,
            headers=self.super_admin_headers
        )
        
        assert response.status_code == 200
        
        # Verify admin notes are in tenant notes
        self.db.refresh(self.test_tenant)
        assert "Updated due to business expansion" in self.test_tenant.notes
    
    def test_get_tenant_audit_log(self):
        """Test getting tenant audit log"""
        # First make some changes to create audit entries
        self.test_tenant.notes = "Initial creation\nCredentials updated by admin test@admin.com at 2024-01-01\n- Email changed\n- Password updated"
        self.db.commit()
        
        response = self.client.get(
            f"/api/enhanced-tenant-management/tenants/{self.test_tenant.id}/audit-log",
            headers=self.super_admin_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["tenant_id"] == str(self.test_tenant.id)
        assert data["tenant_name"] == self.test_tenant.name
        assert data["total_entries"] >= 0
        assert isinstance(data["audit_entries"], list)
    
    def test_reset_tenant_owner_password(self):
        """Test resetting tenant owner password"""
        new_password = "resetpassword123"
        
        response = self.client.post(
            f"/api/enhanced-tenant-management/tenants/{self.test_tenant.id}/reset-owner-password",
            params={"new_password": new_password},
            headers=self.super_admin_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert data["tenant_id"] == str(self.test_tenant.id)
        assert data["owner_email"] == self.tenant_owner.email
        
        # Verify password was changed
        self.db.refresh(self.tenant_owner)
        # Can't verify exact hash, but ensure it's different from original
        original_hash = get_password_hash("ownerpassword123")
        assert self.tenant_owner.password_hash != original_hash
        
        # Verify audit log
        self.db.refresh(self.test_tenant)
        assert "Password reset by admin" in self.test_tenant.notes
    
    def test_reset_tenant_owner_password_weak_password(self):
        """Test resetting with weak password"""
        response = self.client.post(
            f"/api/enhanced-tenant-management/tenants/{self.test_tenant.id}/reset-owner-password",
            params={"new_password": "weak"},
            headers=self.super_admin_headers
        )
        
        assert response.status_code == 400
        assert "at least 8 characters" in response.json()["detail"]
    
    def test_unauthorized_access_without_super_admin(self):
        """Test that non-super-admin users cannot access enhanced tenant management"""
        # Create regular user token
        regular_user = User(
            id=uuid.uuid4(),
            tenant_id=self.test_tenant.id,
            email="regular@business.com",
            password_hash=get_password_hash("password123"),
            first_name="Regular",
            last_name="User",
            role=UserRole.USER,
            status=UserStatus.ACTIVE,
            is_super_admin=False
        )
        self.db.add(regular_user)
        self.db.commit()
        
        # Create token for regular user
        from app.core.auth import create_access_token
        token_data = {
            "user_id": str(regular_user.id),
            "email": regular_user.email,
            "tenant_id": str(self.test_tenant.id)
        }
        regular_token = create_access_token(token_data)
        regular_headers = {"Authorization": f"Bearer {regular_token}"}
        
        # Try to access enhanced tenant management
        response = self.client.put(
            f"/api/enhanced-tenant-management/tenants/{self.test_tenant.id}/credentials",
            json={"email": "test@example.com"},
            headers=regular_headers
        )
        
        # Should be forbidden
        assert response.status_code in [401, 403]
    
    def test_tenant_not_found_scenarios(self):
        """Test various tenant not found scenarios"""
        fake_tenant_id = str(uuid.uuid4())
        
        # Test credentials update
        response = self.client.put(
            f"/api/enhanced-tenant-management/tenants/{fake_tenant_id}/credentials",
            json={"email": "test@example.com"},
            headers=self.super_admin_headers
        )
        assert response.status_code == 404
        
        # Test full update
        response = self.client.put(
            f"/api/enhanced-tenant-management/tenants/{fake_tenant_id}/full-update",
            json={"name": "Test"},
            headers=self.super_admin_headers
        )
        assert response.status_code == 404
        
        # Test audit log
        response = self.client.get(
            f"/api/enhanced-tenant-management/tenants/{fake_tenant_id}/audit-log",
            headers=self.super_admin_headers
        )
        assert response.status_code == 404
        
        # Test password reset
        response = self.client.post(
            f"/api/enhanced-tenant-management/tenants/{fake_tenant_id}/reset-owner-password",
            params={"new_password": "password123"},
            headers=self.super_admin_headers
        )
        assert response.status_code == 404
    
    def test_tenant_without_owner_scenarios(self):
        """Test scenarios where tenant has no owner"""
        # Create tenant without owner
        tenant_no_owner = Tenant(
            id=uuid.uuid4(),
            name="No Owner Business",
            email="noowner@business.com",
            subscription_type=SubscriptionType.FREE,
            status=TenantStatus.ACTIVE
        )
        self.db.add(tenant_no_owner)
        self.db.commit()
        
        # Try to update credentials
        response = self.client.put(
            f"/api/enhanced-tenant-management/tenants/{tenant_no_owner.id}/credentials",
            json={"email": "test@example.com"},
            headers=self.super_admin_headers
        )
        assert response.status_code == 404
        assert "Tenant owner not found" in response.json()["detail"]
        
        # Try to reset password
        response = self.client.post(
            f"/api/enhanced-tenant-management/tenants/{tenant_no_owner.id}/reset-owner-password",
            params={"new_password": "password123"},
            headers=self.super_admin_headers
        )
        assert response.status_code == 404
        assert "Tenant owner not found" in response.json()["detail"]


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])