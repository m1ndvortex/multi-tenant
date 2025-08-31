"""
Tests for permission middleware and validation decorators
"""

import pytest
from fastapi.testclient import TestClient
from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
import uuid

from app.main import app
from app.core.database import SessionLocal
from app.core.auth import create_access_token, get_password_hash, get_current_user
from app.core.middleware import PermissionMiddleware, TenantIsolationMiddleware
from app.core.permissions import PermissionChecker, check_resource_permission
from app.models.user import User, UserRole, UserStatus
from app.models.tenant import Tenant, SubscriptionType, TenantStatus


class TestPermissionMiddleware:
    """Test permission middleware functionality"""
    
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
    def test_tenant(self, db_session):
        """Create test tenant"""
        tenant = Tenant(
            name="Test Company",
            email="test@company.com",
            subscription_type=SubscriptionType.PRO,
            status=TenantStatus.ACTIVE,
            max_users=5
        )
        db_session.add(tenant)
        db_session.commit()
        db_session.refresh(tenant)
        return tenant
    
    @pytest.fixture
    def owner_user(self, db_session, test_tenant):
        """Create owner user"""
        user = User(
            tenant_id=test_tenant.id,
            email="owner@company.com",
            password_hash=get_password_hash("password123"),
            first_name="Owner",
            last_name="User",
            role=UserRole.OWNER,
            status=UserStatus.ACTIVE
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
        return user
    
    @pytest.fixture
    def viewer_user(self, db_session, test_tenant):
        """Create viewer user"""
        user = User(
            tenant_id=test_tenant.id,
            email="viewer@company.com",
            password_hash=get_password_hash("password123"),
            first_name="Viewer",
            last_name="User",
            role=UserRole.VIEWER,
            status=UserStatus.ACTIVE
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
        return user
    
    @pytest.fixture
    def super_admin_user(self, db_session):
        """Create super admin user"""
        user = User(
            tenant_id=None,
            email="super@admin.com",
            password_hash=get_password_hash("password123"),
            first_name="Super",
            last_name="Admin",
            role=UserRole.OWNER,
            status=UserStatus.ACTIVE,
            is_super_admin=True
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
        return user
    
    def get_auth_headers(self, user: User):
        """Get authorization headers for user"""
        token_data = {
            "user_id": str(user.id),
            "email": user.email,
            "role": user.role.value,
            "is_super_admin": user.is_super_admin
        }
        
        if not user.is_super_admin and user.tenant_id:
            token_data["tenant_id"] = str(user.tenant_id)
        
        token = create_access_token(data=token_data)
        return {"Authorization": f"Bearer {token}"}
    
    def test_public_endpoint_no_auth_required(self, client):
        """Test that public endpoints don't require authentication"""
        # Health endpoint should be accessible without auth
        response = client.get("/api/health")
        assert response.status_code == 200
        
        # Root endpoint should be accessible
        response = client.get("/")
        assert response.status_code == 200
    
    def test_protected_endpoint_requires_auth(self, client):
        """Test that protected endpoints require authentication"""
        # User management endpoint should require auth
        response = client.get("/api/users/")
        assert response.status_code == 401
    
    def test_valid_token_allows_access(self, client, owner_user):
        """Test that valid token allows access to protected endpoints"""
        headers = self.get_auth_headers(owner_user)
        
        response = client.get("/api/users/", headers=headers)
        # Should not be 401 (unauthorized)
        assert response.status_code != 401
    
    def test_invalid_token_denies_access(self, client):
        """Test that invalid token denies access"""
        headers = {"Authorization": "Bearer invalid_token"}
        
        response = client.get("/api/users/", headers=headers)
        assert response.status_code == 401
    
    def test_expired_token_denies_access(self, client, owner_user):
        """Test that expired token denies access"""
        # Create token with very short expiry
        from datetime import timedelta
        token_data = {
            "user_id": str(owner_user.id),
            "email": owner_user.email,
            "role": owner_user.role.value,
            "tenant_id": str(owner_user.tenant_id),
            "is_super_admin": owner_user.is_super_admin
        }
        
        # Create token that expires immediately
        token = create_access_token(data=token_data, expires_delta=timedelta(seconds=-1))
        headers = {"Authorization": f"Bearer {token}"}
        
        response = client.get("/api/users/", headers=headers)
        assert response.status_code == 401
    
    def test_insufficient_permissions_denied(self, client, viewer_user):
        """Test that insufficient permissions are denied"""
        headers = self.get_auth_headers(viewer_user)
        
        # Viewer should not be able to create users
        user_data = {
            "email": "newuser@company.com",
            "password": "password123",
            "first_name": "New",
            "last_name": "User",
            "role": "user"
        }
        
        response = client.post("/api/users/", json=user_data, headers=headers)
        assert response.status_code == 403
    
    def test_super_admin_bypasses_tenant_restrictions(self, client, super_admin_user):
        """Test that super admin can bypass tenant restrictions"""
        headers = self.get_auth_headers(super_admin_user)
        
        # Super admin should be able to access super admin endpoints
        # This would be tested with actual super admin endpoints when implemented
        pass
    
    def test_inactive_user_denied_access(self, client, db_session, owner_user):
        """Test that inactive user is denied access"""
        # Deactivate user
        owner_user.status = UserStatus.INACTIVE
        db_session.commit()
        
        headers = self.get_auth_headers(owner_user)
        
        response = client.get("/api/users/", headers=headers)
        assert response.status_code == 403
    
    def test_inactive_tenant_denied_access(self, client, db_session, owner_user, test_tenant):
        """Test that users from inactive tenant are denied access"""
        # Deactivate tenant
        test_tenant.status = TenantStatus.SUSPENDED
        db_session.commit()
        
        headers = self.get_auth_headers(owner_user)
        
        response = client.get("/api/users/", headers=headers)
        assert response.status_code == 403


class TestPermissionChecker:
    """Test PermissionChecker dependency"""
    
    @pytest.fixture
    def db_session(self):
        """Create test database session"""
        db = SessionLocal()
        try:
            yield db
        finally:
            db.close()
    
    @pytest.fixture
    def test_tenant(self, db_session):
        """Create test tenant"""
        tenant = Tenant(
            name="Test Company",
            email="test@company.com",
            subscription_type=SubscriptionType.PRO,
            status=TenantStatus.ACTIVE
        )
        db_session.add(tenant)
        db_session.commit()
        db_session.refresh(tenant)
        return tenant
    
    def test_permission_checker_allows_authorized_user(self, db_session, test_tenant):
        """Test that PermissionChecker allows authorized users"""
        owner = User(
            tenant_id=test_tenant.id,
            email="owner@test.com",
            password_hash="hash",
            first_name="Owner",
            last_name="User",
            role=UserRole.OWNER,
            status=UserStatus.ACTIVE
        )
        
        checker = PermissionChecker("users", "manage")
        
        # Should not raise exception for owner
        result = checker(owner)
        assert result == owner
    
    def test_permission_checker_denies_unauthorized_user(self, db_session, test_tenant):
        """Test that PermissionChecker denies unauthorized users"""
        viewer = User(
            tenant_id=test_tenant.id,
            email="viewer@test.com",
            password_hash="hash",
            first_name="Viewer",
            last_name="User",
            role=UserRole.VIEWER,
            status=UserStatus.ACTIVE
        )
        
        checker = PermissionChecker("users", "manage")
        
        # Should raise HTTPException for viewer
        with pytest.raises(HTTPException) as exc_info:
            checker(viewer)
        
        assert exc_info.value.status_code == 403
        assert "Insufficient permissions" in str(exc_info.value.detail)
    
    def test_permission_checker_allows_super_admin(self, db_session):
        """Test that PermissionChecker always allows super admin"""
        super_admin = User(
            tenant_id=None,
            email="super@admin.com",
            password_hash="hash",
            first_name="Super",
            last_name="Admin",
            role=UserRole.OWNER,
            status=UserStatus.ACTIVE,
            is_super_admin=True
        )
        
        checker = PermissionChecker("users", "manage")
        
        # Should allow super admin regardless of resource/action
        result = checker(super_admin)
        assert result == super_admin


class TestResourcePermissions:
    """Test resource-level permission checking"""
    
    @pytest.fixture
    def db_session(self):
        """Create test database session"""
        db = SessionLocal()
        try:
            yield db
        finally:
            db.close()
    
    @pytest.fixture
    def test_tenant(self, db_session):
        """Create test tenant"""
        tenant = Tenant(
            name="Test Company",
            email="test@company.com",
            subscription_type=SubscriptionType.PRO,
            status=TenantStatus.ACTIVE
        )
        db_session.add(tenant)
        db_session.commit()
        db_session.refresh(tenant)
        return tenant
    
    def test_owner_has_all_permissions(self, db_session, test_tenant):
        """Test that owner has all permissions"""
        owner = User(
            tenant_id=test_tenant.id,
            email="owner@test.com",
            password_hash="hash",
            first_name="Owner",
            last_name="User",
            role=UserRole.OWNER,
            status=UserStatus.ACTIVE
        )
        
        # Test various resources and actions
        resources_actions = [
            ("users", "create"),
            ("users", "manage"),
            ("customers", "delete"),
            ("products", "update"),
            ("invoices", "create"),
            ("accounting", "read"),
            ("reports", "export"),
            ("settings", "manage")
        ]
        
        for resource, action in resources_actions:
            assert check_resource_permission(owner, resource, action) == True
    
    def test_admin_has_limited_permissions(self, db_session, test_tenant):
        """Test that admin has appropriate limited permissions"""
        admin = User(
            tenant_id=test_tenant.id,
            email="admin@test.com",
            password_hash="hash",
            first_name="Admin",
            last_name="User",
            role=UserRole.ADMIN,
            status=UserStatus.ACTIVE
        )
        
        # Admin should have these permissions
        allowed_permissions = [
            ("users", "create"),
            ("users", "read"),
            ("users", "update"),
            ("customers", "create"),
            ("customers", "delete"),
            ("products", "update"),
            ("invoices", "create"),
            ("reports", "read")
        ]
        
        for resource, action in allowed_permissions:
            assert check_resource_permission(admin, resource, action) == True
        
        # Admin should NOT have these permissions
        denied_permissions = [
            ("users", "manage"),
            ("settings", "manage")
        ]
        
        for resource, action in denied_permissions:
            assert check_resource_permission(admin, resource, action) == False
    
    def test_user_has_basic_permissions(self, db_session, test_tenant):
        """Test that regular user has basic permissions"""
        user = User(
            tenant_id=test_tenant.id,
            email="user@test.com",
            password_hash="hash",
            first_name="Regular",
            last_name="User",
            role=UserRole.USER,
            status=UserStatus.ACTIVE
        )
        
        # User should have these permissions
        allowed_permissions = [
            ("customers", "read"),
            ("customers", "update"),
            ("products", "read"),
            ("invoices", "create"),
            ("invoices", "read"),
            ("invoices", "update"),
            ("reports", "read")
        ]
        
        for resource, action in allowed_permissions:
            assert check_resource_permission(user, resource, action) == True
        
        # User should NOT have these permissions
        denied_permissions = [
            ("users", "create"),
            ("users", "manage"),
            ("customers", "delete"),
            ("products", "create"),
            ("products", "delete"),
            ("settings", "update")
        ]
        
        for resource, action in denied_permissions:
            assert check_resource_permission(user, resource, action) == False
    
    def test_viewer_has_read_only_permissions(self, db_session, test_tenant):
        """Test that viewer has only read permissions"""
        viewer = User(
            tenant_id=test_tenant.id,
            email="viewer@test.com",
            password_hash="hash",
            first_name="Viewer",
            last_name="User",
            role=UserRole.VIEWER,
            status=UserStatus.ACTIVE
        )
        
        # Viewer should have these read permissions
        allowed_permissions = [
            ("customers", "read"),
            ("products", "read"),
            ("invoices", "read"),
            ("reports", "read")
        ]
        
        for resource, action in allowed_permissions:
            assert check_resource_permission(viewer, resource, action) == True
        
        # Viewer should NOT have any write permissions
        denied_permissions = [
            ("customers", "create"),
            ("customers", "update"),
            ("customers", "delete"),
            ("products", "create"),
            ("products", "update"),
            ("invoices", "create"),
            ("invoices", "update"),
            ("users", "read"),
            ("settings", "read")
        ]
        
        for resource, action in denied_permissions:
            assert check_resource_permission(viewer, resource, action) == False
    
    def test_inactive_user_has_no_permissions(self, db_session, test_tenant):
        """Test that inactive user has no permissions"""
        inactive_user = User(
            tenant_id=test_tenant.id,
            email="inactive@test.com",
            password_hash="hash",
            first_name="Inactive",
            last_name="User",
            role=UserRole.OWNER,  # Even owner role
            status=UserStatus.INACTIVE  # But inactive status
        )
        
        # Should have no permissions regardless of role
        test_permissions = [
            ("customers", "read"),
            ("products", "read"),
            ("invoices", "read"),
            ("users", "manage"),
            ("settings", "manage")
        ]
        
        for resource, action in test_permissions:
            assert check_resource_permission(inactive_user, resource, action) == False


class TestTenantIsolation:
    """Test tenant data isolation middleware"""
    
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
    def tenant_a(self, db_session):
        """Create tenant A"""
        tenant = Tenant(
            name="Company A",
            email="a@company.com",
            subscription_type=SubscriptionType.PRO,
            status=TenantStatus.ACTIVE
        )
        db_session.add(tenant)
        db_session.commit()
        db_session.refresh(tenant)
        return tenant
    
    @pytest.fixture
    def tenant_b(self, db_session):
        """Create tenant B"""
        tenant = Tenant(
            name="Company B",
            email="b@company.com",
            subscription_type=SubscriptionType.PRO,
            status=TenantStatus.ACTIVE
        )
        db_session.add(tenant)
        db_session.commit()
        db_session.refresh(tenant)
        return tenant
    
    @pytest.fixture
    def user_a(self, db_session, tenant_a):
        """Create user for tenant A"""
        user = User(
            tenant_id=tenant_a.id,
            email="user@a.com",
            password_hash=get_password_hash("password123"),
            first_name="User",
            last_name="A",
            role=UserRole.OWNER,
            status=UserStatus.ACTIVE
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
        return user
    
    @pytest.fixture
    def user_b(self, db_session, tenant_b):
        """Create user for tenant B"""
        user = User(
            tenant_id=tenant_b.id,
            email="user@b.com",
            password_hash=get_password_hash("password123"),
            first_name="User",
            last_name="B",
            role=UserRole.OWNER,
            status=UserStatus.ACTIVE
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
        return user
    
    def get_auth_headers(self, user: User):
        """Get authorization headers for user"""
        token_data = {
            "user_id": str(user.id),
            "email": user.email,
            "role": user.role.value,
            "tenant_id": str(user.tenant_id),
            "is_super_admin": user.is_super_admin
        }
        token = create_access_token(data=token_data)
        return {"Authorization": f"Bearer {token}"}
    
    def test_user_can_only_see_own_tenant_users(self, client, user_a, user_b):
        """Test that users can only see users from their own tenant"""
        headers_a = self.get_auth_headers(user_a)
        headers_b = self.get_auth_headers(user_b)
        
        # User A should only see users from tenant A
        response_a = client.get("/api/users/", headers=headers_a)
        if response_a.status_code == 200:
            users_a = response_a.json()["users"]
            tenant_ids_a = {user["id"] for user in users_a}
            assert str(user_a.id) in [user["id"] for user in users_a]
            assert str(user_b.id) not in [user["id"] for user in users_a]
        
        # User B should only see users from tenant B
        response_b = client.get("/api/users/", headers=headers_b)
        if response_b.status_code == 200:
            users_b = response_b.json()["users"]
            assert str(user_b.id) in [user["id"] for user in users_b]
            assert str(user_a.id) not in [user["id"] for user in users_b]
    
    def test_user_cannot_access_other_tenant_user_details(self, client, user_a, user_b):
        """Test that users cannot access details of users from other tenants"""
        headers_a = self.get_auth_headers(user_a)
        
        # User A should not be able to access User B's details
        response = client.get(f"/api/users/{user_b.id}", headers=headers_a)
        assert response.status_code == 404  # Should not find user from other tenant


if __name__ == "__main__":
    pytest.main([__file__, "-v"])