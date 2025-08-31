"""
Integration tests for authentication middleware and dependencies
"""

import pytest
from fastapi import FastAPI, Depends, HTTPException
from fastapi.testclient import TestClient
from datetime import datetime, timedelta
from jose import jwt

from app.core.auth import (
    get_current_user, 
    get_super_admin_user, 
    get_current_active_user,
    create_access_token,
    create_impersonation_token,
    get_password_hash
)
from app.core.config import settings
from app.models.user import User, UserStatus, UserRole
from app.models.tenant import Tenant, TenantStatus


class TestAuthenticationMiddleware:
    """Test authentication middleware and dependencies"""
    
    @pytest.fixture
    def test_app(self):
        """Create test FastAPI app with auth endpoints"""
        app = FastAPI()
        
        @app.get("/protected")
        async def protected_endpoint(current_user: User = Depends(get_current_user)):
            return {"user_id": str(current_user.id), "email": current_user.email}
        
        @app.get("/super-admin-only")
        async def super_admin_endpoint(admin_user: User = Depends(get_super_admin_user)):
            return {"admin_id": str(admin_user.id), "email": admin_user.email}
        
        @app.get("/active-user")
        async def active_user_endpoint(user: User = Depends(get_current_active_user)):
            return {"user_id": str(user.id), "status": user.status.value}
        
        return app
    
    @pytest.fixture
    def client(self, test_app):
        """Create test client"""
        return TestClient(test_app)
    
    @pytest.fixture
    def test_tenant(self, db_session):
        """Create test tenant"""
        tenant = Tenant(
            name="Test Company",
            email="test@company.com",
            status=TenantStatus.ACTIVE
        )
        db_session.add(tenant)
        db_session.commit()
        return tenant
    
    @pytest.fixture
    def test_user(self, db_session, test_tenant):
        """Create test user"""
        user = User(
            tenant_id=test_tenant.id,
            email="test@example.com",
            password_hash=get_password_hash("password"),
            first_name="Test",
            last_name="User",
            role=UserRole.USER,
            status=UserStatus.ACTIVE
        )
        db_session.add(user)
        db_session.commit()
        return user
    
    @pytest.fixture
    def super_admin_user(self, db_session):
        """Create super admin user"""
        user = User(
            email="admin@hesaabplus.com",
            password_hash=get_password_hash("password"),
            first_name="Super",
            last_name="Admin",
            role=UserRole.OWNER,
            status=UserStatus.ACTIVE,
            is_super_admin=True
        )
        db_session.add(user)
        db_session.commit()
        return user
    
    def create_user_token(self, user: User, tenant_id: str = None) -> str:
        """Helper to create user token"""
        token_data = {
            "user_id": str(user.id),
            "email": user.email,
            "role": user.role.value,
            "is_super_admin": user.is_super_admin
        }
        
        if tenant_id:
            token_data["tenant_id"] = tenant_id
        
        return create_access_token(token_data)
    
    def test_get_current_user_success(self, client, test_user, test_tenant):
        """Test successful authentication with valid token"""
        token = self.create_user_token(test_user, str(test_tenant.id))
        
        response = client.get(
            "/protected",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["user_id"] == str(test_user.id)
        assert data["email"] == "test@example.com"
    
    def test_get_current_user_no_token(self, client):
        """Test authentication without token"""
        response = client.get("/protected")
        
        assert response.status_code == 403  # FastAPI returns 403 for missing auth
    
    def test_get_current_user_invalid_token(self, client):
        """Test authentication with invalid token"""
        response = client.get(
            "/protected",
            headers={"Authorization": "Bearer invalid_token"}
        )
        
        assert response.status_code == 401
    
    def test_get_current_user_expired_token(self, client, test_user, test_tenant):
        """Test authentication with expired token"""
        # Create expired token
        token_data = {
            "user_id": str(test_user.id),
            "email": test_user.email,
            "tenant_id": str(test_tenant.id),
            "role": test_user.role.value,
            "is_super_admin": False
        }
        
        expired_token = create_access_token(
            token_data, 
            expires_delta=timedelta(seconds=-1)
        )
        
        response = client.get(
            "/protected",
            headers={"Authorization": f"Bearer {expired_token}"}
        )
        
        assert response.status_code == 401
    
    def test_get_current_user_inactive_user(self, client, db_session, test_tenant):
        """Test authentication with inactive user"""
        # Create inactive user
        inactive_user = User(
            tenant_id=test_tenant.id,
            email="inactive@example.com",
            password_hash=get_password_hash("password"),
            first_name="Inactive",
            last_name="User",
            role=UserRole.USER,
            status=UserStatus.INACTIVE
        )
        db_session.add(inactive_user)
        db_session.commit()
        
        token = self.create_user_token(inactive_user, str(test_tenant.id))
        
        response = client.get(
            "/protected",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 403
        data = response.json()
        assert "User account is not active" in data["detail"]
    
    def test_get_current_user_suspended_tenant(self, client, db_session):
        """Test authentication with suspended tenant"""
        # Create suspended tenant
        suspended_tenant = Tenant(
            name="Suspended Company",
            email="suspended@company.com",
            status=TenantStatus.SUSPENDED
        )
        db_session.add(suspended_tenant)
        db_session.flush()
        
        # Create user in suspended tenant
        user = User(
            tenant_id=suspended_tenant.id,
            email="user@suspended.com",
            password_hash=get_password_hash("password"),
            first_name="Test",
            last_name="User",
            role=UserRole.USER,
            status=UserStatus.ACTIVE
        )
        db_session.add(user)
        db_session.commit()
        
        token = self.create_user_token(user, str(suspended_tenant.id))
        
        response = client.get(
            "/protected",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 403
        data = response.json()
        assert "Tenant account is not active" in data["detail"]
    
    def test_get_current_user_wrong_tenant(self, client, test_user, db_session):
        """Test authentication with wrong tenant ID in token"""
        # Create another tenant
        other_tenant = Tenant(
            name="Other Company",
            email="other@company.com",
            status=TenantStatus.ACTIVE
        )
        db_session.add(other_tenant)
        db_session.commit()
        
        # Create token with wrong tenant ID
        token = self.create_user_token(test_user, str(other_tenant.id))
        
        response = client.get(
            "/protected",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 401
    
    def test_get_super_admin_user_success(self, client, super_admin_user):
        """Test successful super admin authentication"""
        token = self.create_user_token(super_admin_user)
        
        response = client.get(
            "/super-admin-only",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["admin_id"] == str(super_admin_user.id)
        assert data["email"] == "admin@hesaabplus.com"
    
    def test_get_super_admin_user_regular_user(self, client, test_user, test_tenant):
        """Test super admin endpoint with regular user"""
        token = self.create_user_token(test_user, str(test_tenant.id))
        
        response = client.get(
            "/super-admin-only",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 403
        data = response.json()
        assert "Super admin access required" in data["detail"]
    
    def test_get_super_admin_user_no_super_admin_flag(self, client, db_session):
        """Test super admin endpoint with user missing super admin flag in token"""
        # Create user that is super admin in DB but token doesn't have flag
        user = User(
            email="admin@example.com",
            password_hash=get_password_hash("password"),
            first_name="Admin",
            last_name="User",
            role=UserRole.OWNER,
            status=UserStatus.ACTIVE,
            is_super_admin=True
        )
        db_session.add(user)
        db_session.commit()
        
        # Create token without super admin flag
        token_data = {
            "user_id": str(user.id),
            "email": user.email,
            "role": user.role.value,
            "is_super_admin": False  # Wrong flag
        }
        token = create_access_token(token_data)
        
        response = client.get(
            "/super-admin-only",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 403
    
    def test_impersonation_token_authentication(self, client, test_user, super_admin_user):
        """Test authentication with impersonation token"""
        # Create impersonation token
        impersonation_token = create_impersonation_token(
            admin_user_id=str(super_admin_user.id),
            target_user_id=str(test_user.id),
            target_tenant_id=str(test_user.tenant_id)
        )
        
        response = client.get(
            "/protected",
            headers={"Authorization": f"Bearer {impersonation_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["user_id"] == str(test_user.id)
        assert data["email"] == test_user.email
    
    def test_refresh_token_not_accepted(self, client, test_user):
        """Test that refresh tokens are not accepted for API access"""
        # Create refresh token
        from app.core.auth import create_refresh_token
        refresh_token = create_refresh_token({"user_id": str(test_user.id)})
        
        response = client.get(
            "/protected",
            headers={"Authorization": f"Bearer {refresh_token}"}
        )
        
        assert response.status_code == 401
    
    def test_user_activity_update(self, client, test_user, test_tenant, db_session):
        """Test that user activity is updated on authentication"""
        # Record initial activity time
        initial_activity = test_user.last_activity_at
        
        token = self.create_user_token(test_user, str(test_tenant.id))
        
        # Make authenticated request
        response = client.get(
            "/protected",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        
        # Refresh user from database
        db_session.refresh(test_user)
        
        # Activity should be updated
        if initial_activity is None:
            # If there was no initial activity, just check that it's now set
            assert test_user.last_activity_at is not None
        else:
            # If there was initial activity, check that it's been updated
            assert test_user.last_activity_at > initial_activity
    
    def test_token_context_attributes(self, client, test_user, test_tenant, super_admin_user):
        """Test that token context is properly added to user object"""
        # Test regular user token
        token = self.create_user_token(test_user, str(test_tenant.id))
        
        # We can't directly test the user object attributes in this integration test,
        # but we can verify the endpoint works, which means the middleware is working
        response = client.get(
            "/protected",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        
        # Test impersonation token
        impersonation_token = create_impersonation_token(
            admin_user_id=str(super_admin_user.id),
            target_user_id=str(test_user.id),
            target_tenant_id=str(test_user.tenant_id)
        )
        
        response = client.get(
            "/protected",
            headers={"Authorization": f"Bearer {impersonation_token}"}
        )
        
        assert response.status_code == 200