"""
Integration tests for authentication API endpoints
"""

import pytest
from fastapi.testclient import TestClient
from datetime import datetime, timedelta
from jose import jwt

from app.main import app
from app.core.config import settings
from app.core.auth import get_password_hash, create_refresh_token
from app.models.user import User, UserStatus, UserRole
from app.models.tenant import Tenant, TenantStatus


class TestAuthenticationAPI:
    """Test authentication API endpoints"""
    
    @pytest.fixture
    def client(self):
        """Create test client"""
        return TestClient(app)
    
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
            password_hash=get_password_hash("test_password_123"),
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
            password_hash=get_password_hash("super_admin_password"),
            first_name="Super",
            last_name="Admin",
            role=UserRole.OWNER,
            status=UserStatus.ACTIVE,
            is_super_admin=True
        )
        db_session.add(user)
        db_session.commit()
        return user
    
    def test_login_success(self, client, test_user, test_tenant):
        """Test successful login"""
        response = client.post("/api/auth/login", json={
            "email": "test@example.com",
            "password": "test_password_123",
            "tenant_id": str(test_tenant.id)
        })
        
        assert response.status_code == 200
        data = response.json()
        
        # Check response structure
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"
        assert "expires_in" in data
        assert "user" in data
        assert "tenant" in data
        
        # Check user data
        user_data = data["user"]
        assert user_data["email"] == "test@example.com"
        assert user_data["first_name"] == "Test"
        assert user_data["last_name"] == "User"
        assert user_data["role"] == "user"
        assert user_data["is_super_admin"] is False
        
        # Check tenant data
        tenant_data = data["tenant"]
        assert tenant_data["name"] == "Test Company"
        assert tenant_data["status"] == "active"
        
        # Verify JWT token
        payload = jwt.decode(
            data["access_token"], 
            settings.jwt_secret_key, 
            algorithms=[settings.jwt_algorithm]
        )
        assert payload["email"] == "test@example.com"
        assert payload["user_id"] == str(test_user.id)
        assert payload["tenant_id"] == str(test_tenant.id)
    
    def test_login_wrong_password(self, client, test_user, test_tenant):
        """Test login with wrong password"""
        response = client.post("/api/auth/login", json={
            "email": "test@example.com",
            "password": "wrong_password",
            "tenant_id": str(test_tenant.id)
        })
        
        assert response.status_code == 401
        data = response.json()
        assert "detail" in data
        assert "Incorrect email or password" in data["detail"]
    
    def test_login_nonexistent_user(self, client, test_tenant):
        """Test login with non-existent user"""
        response = client.post("/api/auth/login", json={
            "email": "nonexistent@example.com",
            "password": "any_password",
            "tenant_id": str(test_tenant.id)
        })
        
        assert response.status_code == 401
        data = response.json()
        assert "Incorrect email or password" in data["detail"]
    
    def test_login_inactive_user(self, client, db_session, test_tenant):
        """Test login with inactive user"""
        # Create inactive user
        user = User(
            tenant_id=test_tenant.id,
            email="inactive@example.com",
            password_hash=get_password_hash("password"),
            first_name="Inactive",
            last_name="User",
            role=UserRole.USER,
            status=UserStatus.INACTIVE
        )
        db_session.add(user)
        db_session.commit()
        
        response = client.post("/api/auth/login", json={
            "email": "inactive@example.com",
            "password": "password",
            "tenant_id": str(test_tenant.id)
        })
        
        assert response.status_code == 401
    
    def test_login_suspended_tenant(self, client, db_session):
        """Test login with suspended tenant"""
        # Create suspended tenant
        tenant = Tenant(
            name="Suspended Company",
            email="suspended@company.com",
            status=TenantStatus.SUSPENDED
        )
        db_session.add(tenant)
        db_session.flush()
        
        # Create user in suspended tenant
        user = User(
            tenant_id=tenant.id,
            email="user@suspended.com",
            password_hash=get_password_hash("password"),
            first_name="Test",
            last_name="User",
            role=UserRole.USER,
            status=UserStatus.ACTIVE
        )
        db_session.add(user)
        db_session.commit()
        
        response = client.post("/api/auth/login", json={
            "email": "user@suspended.com",
            "password": "password",
            "tenant_id": str(tenant.id)
        })
        
        assert response.status_code == 401
    
    def test_super_admin_login_success(self, client, super_admin_user):
        """Test successful super admin login"""
        response = client.post("/api/auth/super-admin/login", json={
            "email": "admin@hesaabplus.com",
            "password": "super_admin_password"
        })
        
        assert response.status_code == 200
        data = response.json()
        
        # Check response structure
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"
        assert "user" in data
        
        # Check user data
        user_data = data["user"]
        assert user_data["email"] == "admin@hesaabplus.com"
        assert user_data["is_super_admin"] is True
        
        # Verify JWT token
        payload = jwt.decode(
            data["access_token"], 
            settings.jwt_secret_key, 
            algorithms=[settings.jwt_algorithm]
        )
        assert payload["is_super_admin"] is True
        assert payload["user_id"] == str(super_admin_user.id)
    
    def test_super_admin_login_regular_user(self, client, test_user):
        """Test super admin login with regular user"""
        response = client.post("/api/auth/super-admin/login", json={
            "email": "test@example.com",
            "password": "test_password_123"
        })
        
        assert response.status_code == 401
        data = response.json()
        assert "Invalid super admin credentials" in data["detail"]
    
    def test_refresh_token_success(self, client, test_user):
        """Test successful token refresh"""
        # Create refresh token
        refresh_token = create_refresh_token({"user_id": str(test_user.id)})
        
        response = client.post("/api/auth/refresh", json={
            "refresh_token": refresh_token
        })
        
        assert response.status_code == 200
        data = response.json()
        
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"
    
    def test_refresh_token_invalid(self, client):
        """Test token refresh with invalid token"""
        response = client.post("/api/auth/refresh", json={
            "refresh_token": "invalid_token"
        })
        
        assert response.status_code == 401
    
    def test_refresh_token_expired(self, client, test_user):
        """Test token refresh with expired token"""
        # Create expired refresh token
        expired_token = create_refresh_token(
            {"user_id": str(test_user.id)}, 
            expires_delta=timedelta(seconds=-1)
        )
        
        response = client.post("/api/auth/refresh", json={
            "refresh_token": expired_token
        })
        
        assert response.status_code == 401
    
    def test_get_current_user_profile(self, client, test_user, test_tenant):
        """Test getting current user profile"""
        # Login to get token
        login_response = client.post("/api/auth/login", json={
            "email": "test@example.com",
            "password": "test_password_123",
            "tenant_id": str(test_tenant.id)
        })
        
        token = login_response.json()["access_token"]
        
        # Get user profile
        response = client.get(
            "/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["email"] == "test@example.com"
        assert data["first_name"] == "Test"
        assert data["last_name"] == "User"
        assert data["role"] == "user"
        assert data["is_super_admin"] is False
    
    def test_get_current_tenant_profile(self, client, test_user, test_tenant):
        """Test getting current tenant profile"""
        # Login to get token
        login_response = client.post("/api/auth/login", json={
            "email": "test@example.com",
            "password": "test_password_123",
            "tenant_id": str(test_tenant.id)
        })
        
        token = login_response.json()["access_token"]
        
        # Get tenant profile
        response = client.get(
            "/api/auth/tenant",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["name"] == "Test Company"
        assert data["status"] == "active"
        assert data["subscription_type"] == "free"
    
    def test_get_tenant_profile_super_admin(self, client, super_admin_user):
        """Test getting tenant profile as super admin (should fail)"""
        # Login as super admin
        login_response = client.post("/api/auth/super-admin/login", json={
            "email": "admin@hesaabplus.com",
            "password": "super_admin_password"
        })
        
        token = login_response.json()["access_token"]
        
        # Try to get tenant profile
        response = client.get(
            "/api/auth/tenant",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 400
        data = response.json()
        assert "Super admin users don't have tenant profiles" in data["detail"]
    
    def test_start_impersonation(self, client, super_admin_user, test_user):
        """Test starting user impersonation"""
        # Login as super admin
        login_response = client.post("/api/auth/super-admin/login", json={
            "email": "admin@hesaabplus.com",
            "password": "super_admin_password"
        })
        
        admin_token = login_response.json()["access_token"]
        
        # Get the actual admin user ID from the login response
        admin_user_data = login_response.json()["user"]
        actual_admin_user_id = admin_user_data["id"]
        
        # Start impersonation
        response = client.post(
            "/api/auth/impersonate",
            json={
                "target_user_id": str(test_user.id),
                "duration_hours": 2
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert "target_user" in data
        assert "admin_user" in data
        assert data["expires_in"] == 2 * 3600  # 2 hours in seconds
        
        # Verify impersonation token
        payload = jwt.decode(
            data["access_token"], 
            settings.jwt_secret_key, 
            algorithms=[settings.jwt_algorithm]
        )
        assert payload["is_impersonation"] is True
        assert payload["user_id"] == str(test_user.id)
        assert payload["admin_user_id"] == actual_admin_user_id
    
    def test_impersonation_non_super_admin(self, client, test_user, test_tenant):
        """Test impersonation by non-super admin (should fail)"""
        # Login as regular user
        login_response = client.post("/api/auth/login", json={
            "email": "test@example.com",
            "password": "test_password_123",
            "tenant_id": str(test_tenant.id)
        })
        
        token = login_response.json()["access_token"]
        
        # Try to start impersonation
        response = client.post(
            "/api/auth/impersonate",
            json={
                "target_user_id": str(test_user.id),
                "duration_hours": 2
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 403
    
    def test_impersonation_nonexistent_user(self, client, super_admin_user):
        """Test impersonation of non-existent user"""
        # Login as super admin
        login_response = client.post("/api/auth/super-admin/login", json={
            "email": "admin@hesaabplus.com",
            "password": "super_admin_password"
        })
        
        admin_token = login_response.json()["access_token"]
        
        # Try to impersonate non-existent user
        response = client.post(
            "/api/auth/impersonate",
            json={
                "target_user_id": "00000000-0000-0000-0000-000000000000",
                "duration_hours": 2
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 404
        data = response.json()
        assert "Target user not found" in data["detail"]
    
    def test_validate_token(self, client, test_user, test_tenant):
        """Test token validation endpoint"""
        # Login to get token
        login_response = client.post("/api/auth/login", json={
            "email": "test@example.com",
            "password": "test_password_123",
            "tenant_id": str(test_tenant.id)
        })
        
        token = login_response.json()["access_token"]
        
        # Validate token
        response = client.get(
            "/api/auth/validate-token",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["valid"] is True
        assert "user" in data
        assert "tenant" in data
        assert data["user"]["email"] == "test@example.com"
    
    def test_validate_invalid_token(self, client):
        """Test validation of invalid token"""
        response = client.get(
            "/api/auth/validate-token",
            headers={"Authorization": "Bearer invalid_token"}
        )
        
        assert response.status_code == 401
    
    def test_logout(self, client, test_user, test_tenant):
        """Test logout endpoint"""
        # Login to get token
        login_response = client.post("/api/auth/login", json={
            "email": "test@example.com",
            "password": "test_password_123",
            "tenant_id": str(test_tenant.id)
        })
        
        token = login_response.json()["access_token"]
        
        # Logout
        response = client.post(
            "/api/auth/logout",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "Successfully logged out" in data["message"]
    
    def test_auth_health_check(self, client):
        """Test authentication service health check"""
        response = client.get("/api/auth/health")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["status"] == "healthy"
        assert data["service"] == "authentication"
        assert "timestamp" in data