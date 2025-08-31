"""
Tests for User model
"""

import pytest
from datetime import datetime, timedelta
from app.models.user import User, UserRole, UserStatus
from app.models.tenant import Tenant


class TestUserModel:
    """Test cases for User model"""
    
    def test_create_user(self, db_session, sample_tenant_id):
        """Test creating a new user"""
        # First create a tenant
        tenant = Tenant(
            name="Test Business",
            email="business@test.com"
        )
        db_session.add(tenant)
        db_session.commit()
        
        user = User(
            tenant_id=tenant.id,
            email="user@test.com",
            password_hash="hashed_password",
            first_name="John",
            last_name="Doe",
            phone="+98-912-1234567"
        )
        
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
        
        assert user.id is not None
        assert user.tenant_id == tenant.id
        assert user.email == "user@test.com"
        assert user.first_name == "John"
        assert user.last_name == "Doe"
        assert user.role == UserRole.USER
        assert user.status == UserStatus.ACTIVE
        assert user.is_email_verified is False
        assert user.is_super_admin is False
        assert user.login_count == 0
    
    def test_user_full_name_property(self, db_session):
        """Test user full name property"""
        tenant = Tenant(name="Test Business", email="business@test.com")
        db_session.add(tenant)
        db_session.commit()
        
        user = User(
            tenant_id=tenant.id,
            email="user@test.com",
            password_hash="hashed_password",
            first_name="John",
            last_name="Doe"
        )
        
        assert user.full_name == "John Doe"
        
        # Test with empty last name
        user.last_name = ""
        assert user.full_name == "John"
        
        # Test with empty first name
        user.first_name = ""
        user.last_name = "Doe"
        assert user.full_name == "Doe"
    
    def test_user_online_status(self, db_session):
        """Test user online status detection"""
        tenant = Tenant(name="Test Business", email="business@test.com")
        db_session.add(tenant)
        db_session.commit()
        
        user = User(
            tenant_id=tenant.id,
            email="user@test.com",
            password_hash="hashed_password",
            first_name="John",
            last_name="Doe"
        )
        
        # No activity - should be offline
        assert user.is_online is False
        
        # Recent activity - should be online
        user.update_activity()
        assert user.is_online is True
        
        # Old activity - should be offline
        user.last_activity_at = datetime.utcnow() - timedelta(minutes=10)
        assert user.is_online is False
    
    def test_update_login(self, db_session):
        """Test login tracking"""
        tenant = Tenant(name="Test Business", email="business@test.com")
        db_session.add(tenant)
        db_session.commit()
        
        user = User(
            tenant_id=tenant.id,
            email="user@test.com",
            password_hash="hashed_password",
            first_name="John",
            last_name="Doe"
        )
        
        assert user.last_login_at is None
        assert user.login_count == 0
        
        user.update_login()
        
        assert user.last_login_at is not None
        assert user.login_count == 1
        assert user.last_activity_at is not None
        
        # Second login
        user.update_login()
        assert user.login_count == 2
    
    def test_role_based_permissions(self, db_session):
        """Test role-based access control"""
        tenant = Tenant(name="Test Business", email="business@test.com")
        db_session.add(tenant)
        db_session.commit()
        
        # Test different roles
        owner = User(
            tenant_id=tenant.id,
            email="owner@test.com",
            password_hash="hashed_password",
            first_name="Owner",
            last_name="User",
            role=UserRole.OWNER
        )
        
        admin = User(
            tenant_id=tenant.id,
            email="admin@test.com",
            password_hash="hashed_password",
            first_name="Admin",
            last_name="User",
            role=UserRole.ADMIN
        )
        
        user = User(
            tenant_id=tenant.id,
            email="user@test.com",
            password_hash="hashed_password",
            first_name="Regular",
            last_name="User",
            role=UserRole.USER
        )
        
        viewer = User(
            tenant_id=tenant.id,
            email="viewer@test.com",
            password_hash="hashed_password",
            first_name="Viewer",
            last_name="User",
            role=UserRole.VIEWER
        )
        
        # Owner should have access to everything
        assert owner.can_access_resource("users", "create") is True
        assert owner.can_access_resource("users", "delete") is True
        
        # Admin should have most access but not all
        assert admin.can_access_resource("customers", "create") is True
        assert admin.can_access_resource("customers", "delete") is True
        
        # Regular user should have limited access
        assert user.can_access_resource("customers", "read") is True
        assert user.can_access_resource("customers", "create") is False
        
        # Viewer should only have read access
        assert viewer.can_access_resource("customers", "read") is True
        assert viewer.can_access_resource("customers", "create") is False
        assert viewer.can_access_resource("customers", "update") is False
    
    def test_super_admin_permissions(self, db_session):
        """Test super admin permissions"""
        tenant = Tenant(name="Test Business", email="business@test.com")
        db_session.add(tenant)
        db_session.commit()
        
        super_admin = User(
            tenant_id=tenant.id,
            email="superadmin@test.com",
            password_hash="hashed_password",
            first_name="Super",
            last_name="Admin",
            is_super_admin=True
        )
        
        # Super admin should have access to everything
        assert super_admin.can_access_resource("anything", "create") is True
        assert super_admin.can_access_resource("anything", "delete") is True
    
    def test_password_reset_token(self, db_session):
        """Test password reset token functionality"""
        tenant = Tenant(name="Test Business", email="business@test.com")
        db_session.add(tenant)
        db_session.commit()
        
        user = User(
            tenant_id=tenant.id,
            email="user@test.com",
            password_hash="hashed_password",
            first_name="John",
            last_name="Doe"
        )
        
        # Set password reset token
        token = "reset_token_123"
        user.set_password_reset_token(token)
        
        assert user.password_reset_token == token
        assert user.password_reset_expires is not None
        assert user.is_password_reset_valid() is True
        
        # Expire the token
        user.password_reset_expires = datetime.utcnow() - timedelta(hours=1)
        assert user.is_password_reset_valid() is False
        
        # Clear the token
        user.clear_password_reset_token()
        assert user.password_reset_token is None
        assert user.password_reset_expires is None
    
    def test_email_verification(self, db_session):
        """Test email verification functionality"""
        tenant = Tenant(name="Test Business", email="business@test.com")
        db_session.add(tenant)
        db_session.commit()
        
        user = User(
            tenant_id=tenant.id,
            email="user@test.com",
            password_hash="hashed_password",
            first_name="John",
            last_name="Doe",
            email_verification_token="verify_token_123"
        )
        
        assert user.is_email_verified is False
        
        user.verify_email()
        
        assert user.is_email_verified is True
        assert user.email_verification_token is None
    
    def test_user_status_management(self, db_session):
        """Test user status management"""
        tenant = Tenant(name="Test Business", email="business@test.com")
        db_session.add(tenant)
        db_session.commit()
        
        user = User(
            tenant_id=tenant.id,
            email="user@test.com",
            password_hash="hashed_password",
            first_name="John",
            last_name="Doe"
        )
        
        # Test activation
        user.activate()
        assert user.status == UserStatus.ACTIVE
        
        # Test suspension
        user.suspend("Policy violation")
        assert user.status == UserStatus.SUSPENDED
        
        # Test deactivation
        user.deactivate()
        assert user.status == UserStatus.INACTIVE
    
    def test_inactive_user_permissions(self, db_session):
        """Test that inactive users have no permissions"""
        tenant = Tenant(name="Test Business", email="business@test.com")
        db_session.add(tenant)
        db_session.commit()
        
        user = User(
            tenant_id=tenant.id,
            email="user@test.com",
            password_hash="hashed_password",
            first_name="John",
            last_name="Doe",
            role=UserRole.OWNER,
            status=UserStatus.INACTIVE
        )
        
        # Even owners should have no access when inactive
        assert user.can_access_resource("users", "read") is False
    
    def test_user_repr(self, db_session):
        """Test user string representation"""
        tenant = Tenant(name="Test Business", email="business@test.com")
        db_session.add(tenant)
        db_session.commit()
        
        user = User(
            tenant_id=tenant.id,
            email="user@test.com",
            password_hash="hashed_password",
            first_name="John",
            last_name="Doe",
            role=UserRole.ADMIN
        )
        
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
        
        repr_str = repr(user)
        assert "user@test.com" in repr_str
        assert "admin" in repr_str
        assert str(user.id) in repr_str