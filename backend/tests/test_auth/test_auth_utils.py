"""
Unit tests for authentication utilities
"""

import pytest
from datetime import datetime, timedelta
from unittest.mock import Mock, patch
import jwt

from app.core.auth import (
    verify_password,
    get_password_hash,
    create_access_token,
    create_refresh_token,
    create_impersonation_token,
    verify_token,
    authenticate_user,
    AuthenticationError
)
from app.core.config import settings
from app.models.user import User, UserStatus, UserRole
from app.models.tenant import Tenant, TenantStatus


class TestPasswordUtils:
    """Test password hashing and verification"""
    
    def test_password_hashing(self):
        """Test password hashing and verification"""
        password = "test_password_123"
        
        # Hash password
        hashed = get_password_hash(password)
        
        # Verify correct password
        assert verify_password(password, hashed) is True
        
        # Verify incorrect password
        assert verify_password("wrong_password", hashed) is False
    
    def test_different_passwords_different_hashes(self):
        """Test that different passwords produce different hashes"""
        password1 = "password1"
        password2 = "password2"
        
        hash1 = get_password_hash(password1)
        hash2 = get_password_hash(password2)
        
        assert hash1 != hash2
    
    def test_same_password_different_hashes(self):
        """Test that same password produces different hashes (salt)"""
        password = "same_password"
        
        hash1 = get_password_hash(password)
        hash2 = get_password_hash(password)
        
        # Hashes should be different due to salt
        assert hash1 != hash2
        
        # But both should verify correctly
        assert verify_password(password, hash1) is True
        assert verify_password(password, hash2) is True


class TestTokenCreation:
    """Test JWT token creation and verification"""
    
    def test_create_access_token(self):
        """Test access token creation"""
        data = {
            "user_id": "123",
            "email": "test@example.com",
            "role": "user"
        }
        
        token = create_access_token(data)
        
        # Verify token structure
        assert isinstance(token, str)
        assert len(token.split('.')) == 3  # JWT has 3 parts
        
        # Decode and verify payload
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
        
        assert payload["user_id"] == "123"
        assert payload["email"] == "test@example.com"
        assert payload["role"] == "user"
        assert payload["type"] == "access"
        assert "exp" in payload
    
    def test_create_refresh_token(self):
        """Test refresh token creation"""
        data = {"user_id": "123"}
        
        token = create_refresh_token(data)
        
        # Verify token structure
        assert isinstance(token, str)
        assert len(token.split('.')) == 3
        
        # Decode and verify payload
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
        
        assert payload["user_id"] == "123"
        assert payload["type"] == "refresh"
        assert "exp" in payload
    
    def test_create_impersonation_token(self):
        """Test impersonation token creation"""
        admin_user_id = "admin_123"
        target_user_id = "user_456"
        target_tenant_id = "tenant_789"
        
        token = create_impersonation_token(
            admin_user_id=admin_user_id,
            target_user_id=target_user_id,
            target_tenant_id=target_tenant_id
        )
        
        # Verify token structure
        assert isinstance(token, str)
        assert len(token.split('.')) == 3
        
        # Decode and verify payload
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
        
        assert payload["user_id"] == target_user_id
        assert payload["tenant_id"] == target_tenant_id
        assert payload["admin_user_id"] == admin_user_id
        assert payload["is_impersonation"] is True
        assert payload["is_super_admin"] is False
        assert payload["type"] == "impersonation"
        assert "exp" in payload
    
    def test_token_expiration(self):
        """Test token expiration"""
        data = {"user_id": "123"}
        
        # Create token with short expiration
        expires_delta = timedelta(seconds=1)
        token = create_access_token(data, expires_delta)
        
        # Token should be valid immediately
        payload = verify_token(token)
        assert payload["user_id"] == "123"
        
        # Wait for token to expire
        import time
        time.sleep(2)
        
        # Token should be expired
        with pytest.raises(AuthenticationError, match="Token has expired"):
            verify_token(token)
    
    def test_invalid_token(self):
        """Test invalid token handling"""
        # Test completely invalid token
        with pytest.raises(AuthenticationError, match="Invalid token"):
            verify_token("invalid_token")
        
        # Test token with wrong signature
        data = {"user_id": "123"}
        token = jwt.encode(data, "wrong_secret", algorithm="HS256")
        
        with pytest.raises(AuthenticationError, match="Invalid token"):
            verify_token(token)


class TestUserAuthentication:
    """Test user authentication logic"""
    
    def test_authenticate_user_success(self, db_session):
        """Test successful user authentication"""
        # Create test tenant
        tenant = Tenant(
            name="Test Company",
            email="test@company.com",
            status=TenantStatus.ACTIVE
        )
        db_session.add(tenant)
        db_session.flush()
        
        # Create test user
        password = "test_password_123"
        user = User(
            tenant_id=tenant.id,
            email="test@example.com",
            password_hash=get_password_hash(password),
            first_name="Test",
            last_name="User",
            role=UserRole.USER,
            status=UserStatus.ACTIVE
        )
        db_session.add(user)
        db_session.commit()
        
        # Test authentication
        authenticated_user = authenticate_user(
            db=db_session,
            email="test@example.com",
            password=password,
            tenant_id=str(tenant.id)
        )
        
        assert authenticated_user is not None
        assert authenticated_user.id == user.id
        assert authenticated_user.email == "test@example.com"
    
    def test_authenticate_user_wrong_password(self, db_session):
        """Test authentication with wrong password"""
        # Create test tenant
        tenant = Tenant(
            name="Test Company",
            email="test@company.com",
            status=TenantStatus.ACTIVE
        )
        db_session.add(tenant)
        db_session.flush()
        
        # Create test user
        user = User(
            tenant_id=tenant.id,
            email="test@example.com",
            password_hash=get_password_hash("correct_password"),
            first_name="Test",
            last_name="User",
            role=UserRole.USER,
            status=UserStatus.ACTIVE
        )
        db_session.add(user)
        db_session.commit()
        
        # Test authentication with wrong password
        authenticated_user = authenticate_user(
            db=db_session,
            email="test@example.com",
            password="wrong_password",
            tenant_id=str(tenant.id)
        )
        
        assert authenticated_user is None
    
    def test_authenticate_user_not_found(self, db_session):
        """Test authentication with non-existent user"""
        authenticated_user = authenticate_user(
            db=db_session,
            email="nonexistent@example.com",
            password="any_password"
        )
        
        assert authenticated_user is None
    
    def test_authenticate_inactive_user(self, db_session):
        """Test authentication with inactive user"""
        # Create test tenant
        tenant = Tenant(
            name="Test Company",
            email="test@company.com",
            status=TenantStatus.ACTIVE
        )
        db_session.add(tenant)
        db_session.flush()
        
        # Create inactive user
        user = User(
            tenant_id=tenant.id,
            email="test@example.com",
            password_hash=get_password_hash("password"),
            first_name="Test",
            last_name="User",
            role=UserRole.USER,
            status=UserStatus.INACTIVE
        )
        db_session.add(user)
        db_session.commit()
        
        # Test authentication
        authenticated_user = authenticate_user(
            db=db_session,
            email="test@example.com",
            password="password",
            tenant_id=str(tenant.id)
        )
        
        assert authenticated_user is None
    
    def test_authenticate_user_inactive_tenant(self, db_session):
        """Test authentication with inactive tenant"""
        # Create inactive tenant
        tenant = Tenant(
            name="Test Company",
            email="test@company.com",
            status=TenantStatus.SUSPENDED
        )
        db_session.add(tenant)
        db_session.flush()
        
        # Create active user in inactive tenant
        user = User(
            tenant_id=tenant.id,
            email="test@example.com",
            password_hash=get_password_hash("password"),
            first_name="Test",
            last_name="User",
            role=UserRole.USER,
            status=UserStatus.ACTIVE
        )
        db_session.add(user)
        db_session.commit()
        
        # Test authentication
        authenticated_user = authenticate_user(
            db=db_session,
            email="test@example.com",
            password="password",
            tenant_id=str(tenant.id)
        )
        
        assert authenticated_user is None
    
    def test_authenticate_super_admin(self, db_session):
        """Test super admin authentication"""
        # Create super admin user (no tenant required)
        password = "super_admin_password"
        user = User(
            email="admin@hesaabplus.com",
            password_hash=get_password_hash(password),
            first_name="Super",
            last_name="Admin",
            role=UserRole.OWNER,
            status=UserStatus.ACTIVE,
            is_super_admin=True
        )
        db_session.add(user)
        db_session.commit()
        
        # Test authentication without tenant_id
        authenticated_user = authenticate_user(
            db=db_session,
            email="admin@hesaabplus.com",
            password=password
        )
        
        assert authenticated_user is not None
        assert authenticated_user.is_super_admin is True
        assert authenticated_user.email == "admin@hesaabplus.com"
    
    def test_authenticate_user_wrong_tenant(self, db_session):
        """Test authentication with wrong tenant ID"""
        # Create two tenants
        tenant1 = Tenant(
            name="Company 1",
            email="test1@company.com",
            status=TenantStatus.ACTIVE
        )
        tenant2 = Tenant(
            name="Company 2",
            email="test2@company.com",
            status=TenantStatus.ACTIVE
        )
        db_session.add_all([tenant1, tenant2])
        db_session.flush()
        
        # Create user in tenant1
        user = User(
            tenant_id=tenant1.id,
            email="test@example.com",
            password_hash=get_password_hash("password"),
            first_name="Test",
            last_name="User",
            role=UserRole.USER,
            status=UserStatus.ACTIVE
        )
        db_session.add(user)
        db_session.commit()
        
        # Try to authenticate with tenant2 ID
        authenticated_user = authenticate_user(
            db=db_session,
            email="test@example.com",
            password="password",
            tenant_id=str(tenant2.id)
        )
        
        assert authenticated_user is None