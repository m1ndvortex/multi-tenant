"""
Tests for tenant management API endpoints
"""

import pytest
import uuid
from datetime import datetime
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.core.database import SessionLocal
from app.core.auth import create_access_token
from app.models.tenant import Tenant, SubscriptionType, TenantStatus
from app.models.user import User, UserRole, UserStatus
from app.models.customer import Customer


class TestTenantManagementAPI:
    """Test tenant management API endpoints"""
    
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
    def test_data(self, db_session):
        """Create test data"""
        # Create tenants
        tenant1 = Tenant(
            name="Test Tenant 1",
            email="tenant1@test.com",
            subscription_type=SubscriptionType.PRO,
            status=TenantStatus.ACTIVE
        )
        tenant2 = Tenant(
            name="Test Tenant 2",
            email="tenant2@test.com",
            subscription_type=SubscriptionType.FREE,
            status=TenantStatus.ACTIVE
        )
        
        db_session.add_all([tenant1, tenant2])
        db_session.commit()
        db_session.refresh(tenant1)
        db_session.refresh(tenant2)
        
        # Create users
        user1 = User(
            tenant_id=tenant1.id,
            email="user1@test.com",
            password_hash="hashed_password",
            first_name="User",
            last_name="One",
            role=UserRole.OWNER,
            status=UserStatus.ACTIVE
        )
        
        user2 = User(
            tenant_id=tenant2.id,
            email="user2@test.com",
            password_hash="hashed_password",
            first_name="User",
            last_name="Two",
            role=UserRole.OWNER,
            status=UserStatus.ACTIVE
        )
        
        super_admin = User(
            tenant_id=None,
            email="admin@test.com",
            password_hash="hashed_password",
            first_name="Super",
            last_name="Admin",
            role=UserRole.OWNER,
            status=UserStatus.ACTIVE,
            is_super_admin=True
        )
        
        db_session.add_all([user1, user2, super_admin])
        db_session.commit()
        db_session.refresh(user1)
        db_session.refresh(user2)
        db_session.refresh(super_admin)
        
        # Create some customers for testing
        customer1 = Customer(
            tenant_id=tenant1.id,
            name="Customer 1",
            email="customer1@test.com"
        )
        customer2 = Customer(
            tenant_id=tenant2.id,
            name="Customer 2",
            email="customer2@test.com"
        )
        
        db_session.add_all([customer1, customer2])
        db_session.commit()
        db_session.refresh(customer1)
        db_session.refresh(customer2)
        
        return {
            "tenant1": tenant1,
            "tenant2": tenant2,
            "user1": user1,
            "user2": user2,
            "super_admin": super_admin,
            "customer1": customer1,
            "customer2": customer2
        }
    
    def create_auth_headers(self, user, tenant_id=None):
        """Create authorization headers for user"""
        token_data = {
            "user_id": str(user.id),
            "email": user.email,
            "role": user.role.value,
            "is_super_admin": user.is_super_admin
        }
        
        if tenant_id:
            token_data["tenant_id"] = str(tenant_id)
        elif user.tenant_id:
            token_data["tenant_id"] = str(user.tenant_id)
        
        token = create_access_token(data=token_data)
        return {"Authorization": f"Bearer {token}"}
    
    def test_get_accessible_tenants_regular_user(self, client, test_data):
        """Test getting accessible tenants for regular user"""
        user1 = test_data["user1"]
        tenant1 = test_data["tenant1"]
        
        headers = self.create_auth_headers(user1)
        
        response = client.get("/api/tenant/accessible", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        assert len(data["tenants"]) == 1
        assert data["tenants"][0]["id"] == str(tenant1.id)
        assert data["tenants"][0]["name"] == tenant1.name
        assert data["current_tenant_id"] == str(tenant1.id)
    
    def test_get_accessible_tenants_super_admin(self, client, test_data):
        """Test getting accessible tenants for super admin"""
        super_admin = test_data["super_admin"]
        tenant1 = test_data["tenant1"]
        tenant2 = test_data["tenant2"]
        
        headers = self.create_auth_headers(super_admin, tenant1.id)
        
        response = client.get("/api/tenant/accessible", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        assert len(data["tenants"]) == 2
        tenant_ids = [tenant["id"] for tenant in data["tenants"]]
        assert str(tenant1.id) in tenant_ids
        assert str(tenant2.id) in tenant_ids
    
    def test_switch_tenant_valid(self, client, test_data):
        """Test valid tenant switching"""
        user1 = test_data["user1"]
        tenant1 = test_data["tenant1"]
        
        headers = self.create_auth_headers(user1)
        
        switch_data = {
            "target_tenant_id": str(tenant1.id)
        }
        
        response = client.post("/api/tenant/switch", json=switch_data, headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] == True
        assert data["tenant_id"] == str(tenant1.id)
        assert data["tenant_name"] == tenant1.name
    
    def test_switch_tenant_invalid(self, client, test_data):
        """Test invalid tenant switching"""
        user1 = test_data["user1"]
        tenant2 = test_data["tenant2"]
        
        headers = self.create_auth_headers(user1)
        
        switch_data = {
            "target_tenant_id": str(tenant2.id)
        }
        
        response = client.post("/api/tenant/switch", json=switch_data, headers=headers)
        
        assert response.status_code == 403
    
    def test_validate_tenant_access_valid(self, client, test_data):
        """Test valid tenant access validation"""
        user1 = test_data["user1"]
        tenant1 = test_data["tenant1"]
        customer1 = test_data["customer1"]
        
        headers = self.create_auth_headers(user1)
        
        validation_data = {
            "tenant_id": str(tenant1.id),
            "resource_type": "customer",
            "resource_id": str(customer1.id)
        }
        
        response = client.post("/api/tenant/validate-access", json=validation_data, headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["has_access"] == True
        assert data["tenant_id"] == str(tenant1.id)
        assert data["resource_id"] == str(customer1.id)
    
    def test_validate_tenant_access_invalid(self, client, test_data):
        """Test invalid tenant access validation"""
        user1 = test_data["user1"]
        tenant2 = test_data["tenant2"]
        customer2 = test_data["customer2"]
        
        headers = self.create_auth_headers(user1)
        
        validation_data = {
            "tenant_id": str(tenant2.id),
            "resource_type": "customer",
            "resource_id": str(customer2.id)
        }
        
        response = client.post("/api/tenant/validate-access", json=validation_data, headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["has_access"] == False
        assert data["reason"] is not None
    
    def test_get_current_tenant_usage(self, client, test_data):
        """Test getting current tenant usage statistics"""
        user1 = test_data["user1"]
        tenant1 = test_data["tenant1"]
        
        headers = self.create_auth_headers(user1)
        
        response = client.get("/api/tenant/current/usage", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["tenant_id"] == str(tenant1.id)
        assert "usage" in data
        assert "limits" in data
        assert data["subscription_type"] == tenant1.subscription_type.value
        assert isinstance(data["subscription_active"], bool)
    
    def test_check_tenant_data_integrity_super_admin(self, client, test_data):
        """Test checking tenant data integrity (super admin only)"""
        super_admin = test_data["super_admin"]
        tenant1 = test_data["tenant1"]
        
        headers = self.create_auth_headers(super_admin)
        
        response = client.get(f"/api/tenant/{tenant1.id}/integrity", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["tenant_id"] == str(tenant1.id)
        assert "checks" in data
        assert "orphaned_records" in data
        assert data["overall_status"] in ["healthy", "issues_detected"]
    
    def test_check_tenant_data_integrity_regular_user_denied(self, client, test_data):
        """Test that regular users cannot check tenant data integrity"""
        user1 = test_data["user1"]
        tenant1 = test_data["tenant1"]
        
        headers = self.create_auth_headers(user1)
        
        response = client.get(f"/api/tenant/{tenant1.id}/integrity", headers=headers)
        
        assert response.status_code == 403
    
    def test_validate_tenant_isolation_super_admin(self, client, test_data):
        """Test validating tenant isolation (super admin only)"""
        super_admin = test_data["super_admin"]
        tenant1 = test_data["tenant1"]
        
        headers = self.create_auth_headers(super_admin)
        
        response = client.post(f"/api/tenant/{tenant1.id}/validate-isolation", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["tenant_id"] == str(tenant1.id)
        assert "isolation_results" in data
        assert data["overall_status"] in ["isolated", "isolation_violations"]
        assert isinstance(data["total_violations"], int)
    
    def test_get_current_context(self, client, test_data):
        """Test getting current tenant context"""
        user1 = test_data["user1"]
        tenant1 = test_data["tenant1"]
        
        headers = self.create_auth_headers(user1)
        
        response = client.get("/api/tenant/context/current", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["tenant_id"] == str(tenant1.id)
        assert data["user_id"] == str(user1.id)
        assert data["is_super_admin"] == False
        assert data["is_impersonation"] == False
    
    def test_validate_context_access(self, client, test_data):
        """Test validating context access"""
        user1 = test_data["user1"]
        tenant1 = test_data["tenant1"]
        tenant2 = test_data["tenant2"]
        
        headers = self.create_auth_headers(user1)
        
        # Test access to own tenant
        response = client.post(
            f"/api/tenant/context/validate?target_tenant_id={tenant1.id}",
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["has_access"] == True
        
        # Test access to other tenant
        response = client.post(
            f"/api/tenant/context/validate?target_tenant_id={tenant2.id}",
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["has_access"] == False
    
    def test_unauthorized_access(self, client, test_data):
        """Test unauthorized access to tenant endpoints"""
        # Test without authorization header
        response = client.get("/api/tenant/accessible")
        assert response.status_code == 403
        
        # Test with invalid token
        headers = {"Authorization": "Bearer invalid_token"}
        response = client.get("/api/tenant/accessible", headers=headers)
        assert response.status_code == 401


class TestTenantAPIIntegration:
    """Integration tests for tenant API with real database operations"""
    
    @pytest.fixture
    def client(self):
        """Create test client"""
        return TestClient(app)
    
    def test_full_tenant_workflow(self, client):
        """Test complete tenant workflow"""
        db = SessionLocal()
        try:
            # Create test tenant and user
            tenant = Tenant(
                name="Integration Test Tenant",
                email="integration@test.com",
                subscription_type=SubscriptionType.PRO,
                status=TenantStatus.ACTIVE
            )
            
            db.add(tenant)
            db.commit()
            db.refresh(tenant)
            
            user = User(
                tenant_id=tenant.id,
                email="integration_user@test.com",
                password_hash="hashed_password",
                first_name="Integration",
                last_name="User",
                role=UserRole.OWNER,
                status=UserStatus.ACTIVE
            )
            
            db.add(user)
            db.commit()
            db.refresh(user)
            
            # Create auth headers
            token_data = {
                "user_id": str(user.id),
                "tenant_id": str(tenant.id),
                "email": user.email,
                "role": user.role.value,
                "is_super_admin": False
            }
            token = create_access_token(data=token_data)
            headers = {"Authorization": f"Bearer {token}"}
            
            # Test 1: Get accessible tenants
            response = client.get("/api/tenant/accessible", headers=headers)
            assert response.status_code == 200
            data = response.json()
            assert len(data["tenants"]) == 1
            assert data["tenants"][0]["id"] == str(tenant.id)
            
            # Test 2: Get current context
            response = client.get("/api/tenant/context/current", headers=headers)
            assert response.status_code == 200
            data = response.json()
            assert data["tenant_id"] == str(tenant.id)
            assert data["user_id"] == str(user.id)
            
            # Test 3: Get usage statistics
            response = client.get("/api/tenant/current/usage", headers=headers)
            assert response.status_code == 200
            data = response.json()
            assert data["tenant_id"] == str(tenant.id)
            assert data["subscription_type"] == "pro"
            
            # Test 4: Validate tenant switch
            switch_data = {"target_tenant_id": str(tenant.id)}
            response = client.post("/api/tenant/switch", json=switch_data, headers=headers)
            assert response.status_code == 200
            data = response.json()
            assert data["success"] == True
            
        finally:
            db.close()


if __name__ == "__main__":
    pytest.main([__file__, "-v"])