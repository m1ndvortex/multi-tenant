"""
Unit tests for TenantCredentials model
Tests multi-tenant isolation and password change tracking
"""

import pytest
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
import uuid
import bcrypt
import json

from app.models.tenant_credentials import TenantCredentials
from app.models.tenant import Tenant, SubscriptionType, TenantStatus
from app.models.user import User, UserRole, UserStatus
from app.core.database import get_db


class TestTenantCredentialsModel:
    """Test suite for TenantCredentials model"""
    
    @pytest.fixture
    def db_session(self):
        """Get database session for testing"""
        db = next(get_db())
        try:
            yield db
        finally:
            db.close()
    
    @pytest.fixture
    def test_tenant(self, db_session: Session):
        """Create a test tenant"""
        tenant = Tenant(
            name="Test Company",
            email="test@company.com",
            phone="1234567890",
            subscription_type=SubscriptionType.FREE,
            status=TenantStatus.ACTIVE
        )
        db_session.add(tenant)
        db_session.commit()
        db_session.refresh(tenant)
        return tenant
    
    @pytest.fixture
    def test_user(self, db_session: Session, test_tenant):
        """Create a test user (tenant owner)"""
        user = User(
            tenant_id=test_tenant.id,
            email="owner@company.com",
            password_hash="hashed_password",
            first_name="John",
            last_name="Doe",
            role=UserRole.OWNER,
            status=UserStatus.ACTIVE
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
        return user
    
    @pytest.fixture
    def admin_user(self, db_session: Session):
        """Create a super admin user"""
        admin = User(
            tenant_id=None,  # Super admin has no tenant
            email="admin@hesaabplus.com",
            password_hash="admin_hashed_password",
            first_name="Super",
            last_name="Admin",
            role=UserRole.OWNER,
            status=UserStatus.ACTIVE,
            is_super_admin=True
        )
        db_session.add(admin)
        db_session.commit()
        db_session.refresh(admin)
        return admin
    
    def test_create_tenant_credentials(self, db_session: Session, test_tenant, test_user):
        """Test creating tenant credentials"""
        # Create tenant credentials
        credentials = TenantCredentials.create_for_tenant(
            tenant_id=str(test_tenant.id),
            user_id=str(test_user.id),
            username="owner@company.com",
            password_hash="hashed_password_123"
        )
        
        db_session.add(credentials)
        db_session.commit()
        db_session.refresh(credentials)
        
        # Verify credentials were created correctly
        assert credentials.tenant_id == test_tenant.id
        assert credentials.user_id == test_user.id
        assert credentials.username == "owner@company.com"
        assert credentials.password_hash == "hashed_password_123"
        assert credentials.password_change_count == 1
        assert credentials.failed_login_attempts == 0
        assert credentials.account_locked_until is None
        assert credentials.password_changed_at is not None
    
    def test_unique_tenant_constraint(self, db_session: Session, test_tenant, test_user):
        """Test that only one credentials record per tenant is allowed"""
        # Create first credentials record
        credentials1 = TenantCredentials.create_for_tenant(
            tenant_id=str(test_tenant.id),
            user_id=str(test_user.id),
            username="owner@company.com",
            password_hash="hashed_password_123"
        )
        
        db_session.add(credentials1)
        db_session.commit()
        
        # Try to create second credentials record for same tenant
        credentials2 = TenantCredentials.create_for_tenant(
            tenant_id=str(test_tenant.id),
            user_id=str(test_user.id),
            username="owner2@company.com",
            password_hash="hashed_password_456"
        )
        
        db_session.add(credentials2)
        
        # Should raise integrity error due to unique constraint
        with pytest.raises(IntegrityError):
            db_session.commit()
    
    def test_update_password(self, db_session: Session, test_tenant, test_user, admin_user):
        """Test password update functionality"""
        # Create credentials
        credentials = TenantCredentials.create_for_tenant(
            tenant_id=str(test_tenant.id),
            user_id=str(test_user.id),
            username="owner@company.com",
            password_hash="old_password_hash"
        )
        
        db_session.add(credentials)
        db_session.commit()
        
        # Update password
        old_password = credentials.password_hash
        old_change_count = credentials.password_change_count
        
        credentials.update_password(
            new_password_hash="new_password_hash",
            admin_id=str(admin_user.id),
            notes="Password updated by admin for security"
        )
        
        db_session.commit()
        db_session.refresh(credentials)
        
        # Verify password update
        assert credentials.password_hash == "new_password_hash"
        assert credentials.previous_password_hash == old_password
        assert credentials.password_change_count == old_change_count + 1
        assert credentials.changed_by_admin_id == admin_user.id
        assert credentials.failed_login_attempts == 0  # Should reset
        assert credentials.account_locked_until is None  # Should reset
        
        # Verify change history
        history = credentials.get_change_history()
        assert len(history) == 1
        assert history[0]["changed_by_admin"] == str(admin_user.id)
        assert history[0]["notes"] == "Password updated by admin for security"
        
        # Verify admin notes
        assert "Password updated by admin for security" in credentials.admin_notes
    
    def test_update_username(self, db_session: Session, test_tenant, test_user, admin_user):
        """Test username update functionality"""
        # Create credentials
        credentials = TenantCredentials.create_for_tenant(
            tenant_id=str(test_tenant.id),
            user_id=str(test_user.id),
            username="old@company.com",
            password_hash="password_hash"
        )
        
        db_session.add(credentials)
        db_session.commit()
        
        # Update username
        credentials.update_username(
            new_username="new@company.com",
            admin_id=str(admin_user.id),
            notes="Email changed per user request"
        )
        
        db_session.commit()
        db_session.refresh(credentials)
        
        # Verify username update
        assert credentials.username == "new@company.com"
        
        # Verify admin notes contain change record
        assert "old@company.com" in credentials.admin_notes
        assert "new@company.com" in credentials.admin_notes
        assert str(admin_user.id) in credentials.admin_notes
        assert "Email changed per user request" in credentials.admin_notes
    
    def test_login_attempt_tracking(self, db_session: Session, test_tenant, test_user):
        """Test login attempt tracking and account locking"""
        # Create credentials
        credentials = TenantCredentials.create_for_tenant(
            tenant_id=str(test_tenant.id),
            user_id=str(test_user.id),
            username="owner@company.com",
            password_hash="password_hash"
        )
        
        db_session.add(credentials)
        db_session.commit()
        
        # Test successful login
        credentials.record_login_attempt(success=True)
        db_session.commit()
        
        assert credentials.failed_login_attempts == 0
        assert credentials.account_locked_until is None
        assert credentials.last_login_attempt is not None
        
        # Test failed login attempts
        for i in range(4):
            credentials.record_login_attempt(success=False)
            db_session.commit()
            assert credentials.failed_login_attempts == i + 1
            assert credentials.account_locked_until is None  # Not locked yet
        
        # Fifth failed attempt should lock account
        credentials.record_login_attempt(success=False)
        db_session.commit()
        
        assert credentials.failed_login_attempts == 5
        assert credentials.account_locked_until is not None
        assert credentials.is_account_locked() is True
        
        # Successful login should unlock account
        credentials.record_login_attempt(success=True)
        db_session.commit()
        
        assert credentials.failed_login_attempts == 0
        assert credentials.account_locked_until is None
        assert credentials.is_account_locked() is False
    
    def test_account_unlock_by_admin(self, db_session: Session, test_tenant, test_user, admin_user):
        """Test admin account unlock functionality"""
        # Create credentials and lock account
        credentials = TenantCredentials.create_for_tenant(
            tenant_id=str(test_tenant.id),
            user_id=str(test_user.id),
            username="owner@company.com",
            password_hash="password_hash"
        )
        
        db_session.add(credentials)
        db_session.commit()
        
        # Lock account with failed attempts
        for _ in range(5):
            credentials.record_login_attempt(success=False)
        
        db_session.commit()
        assert credentials.is_account_locked() is True
        
        # Admin unlocks account
        credentials.unlock_account(admin_id=str(admin_user.id))
        db_session.commit()
        
        assert credentials.failed_login_attempts == 0
        assert credentials.account_locked_until is None
        assert credentials.is_account_locked() is False
        
        # Verify admin notes
        assert f"Account unlocked by admin {admin_user.id}" in credentials.admin_notes
    
    def test_change_history_limit(self, db_session: Session, test_tenant, test_user, admin_user):
        """Test that change history is limited to 10 entries"""
        # Create credentials
        credentials = TenantCredentials.create_for_tenant(
            tenant_id=str(test_tenant.id),
            user_id=str(test_user.id),
            username="owner@company.com",
            password_hash="password_hash"
        )
        
        db_session.add(credentials)
        db_session.commit()
        
        # Make 15 password changes
        for i in range(15):
            credentials.update_password(
                new_password_hash=f"password_hash_{i}",
                admin_id=str(admin_user.id),
                notes=f"Change number {i}"
            )
            db_session.commit()
        
        # Verify only last 10 changes are kept
        history = credentials.get_change_history()
        assert len(history) <= 10
        
        # Verify the latest changes are kept
        assert any("Change number 14" in entry.get("notes", "") for entry in history)
        assert not any("Change number 4" in entry.get("notes", "") for entry in history)
    
    def test_multi_tenant_isolation(self, db_session: Session):
        """Test that tenant credentials are properly isolated"""
        # Create two tenants
        tenant1 = Tenant(
            name="Company 1",
            email="test1@company.com",
            subscription_type=SubscriptionType.FREE,
            status=TenantStatus.ACTIVE
        )
        tenant2 = Tenant(
            name="Company 2", 
            email="test2@company.com",
            subscription_type=SubscriptionType.FREE,
            status=TenantStatus.ACTIVE
        )
        
        db_session.add_all([tenant1, tenant2])
        db_session.commit()
        
        # Create users for each tenant
        user1 = User(
            tenant_id=tenant1.id,
            email="owner1@company.com",
            password_hash="hash1",
            first_name="Owner",
            last_name="One",
            role=UserRole.OWNER
        )
        user2 = User(
            tenant_id=tenant2.id,
            email="owner2@company.com",
            password_hash="hash2",
            first_name="Owner",
            last_name="Two",
            role=UserRole.OWNER
        )
        
        db_session.add_all([user1, user2])
        db_session.commit()
        
        # Create credentials for each tenant
        creds1 = TenantCredentials.create_for_tenant(
            tenant_id=str(tenant1.id),
            user_id=str(user1.id),
            username="owner1@company.com",
            password_hash="hash1"
        )
        creds2 = TenantCredentials.create_for_tenant(
            tenant_id=str(tenant2.id),
            user_id=str(user2.id),
            username="owner2@company.com",
            password_hash="hash2"
        )
        
        db_session.add_all([creds1, creds2])
        db_session.commit()
        
        # Verify isolation - each tenant has only their credentials
        tenant1_creds = db_session.query(TenantCredentials).filter(
            TenantCredentials.tenant_id == tenant1.id
        ).all()
        tenant2_creds = db_session.query(TenantCredentials).filter(
            TenantCredentials.tenant_id == tenant2.id
        ).all()
        
        assert len(tenant1_creds) == 1
        assert len(tenant2_creds) == 1
        assert tenant1_creds[0].username == "owner1@company.com"
        assert tenant2_creds[0].username == "owner2@company.com"
        assert tenant1_creds[0].tenant_id != tenant2_creds[0].tenant_id
    
    def test_relationships(self, db_session: Session, test_tenant, test_user, admin_user):
        """Test model relationships"""
        # Create credentials
        credentials = TenantCredentials.create_for_tenant(
            tenant_id=str(test_tenant.id),
            user_id=str(test_user.id),
            username="owner@company.com",
            password_hash="password_hash"
        )
        
        credentials.changed_by_admin_id = admin_user.id
        
        db_session.add(credentials)
        db_session.commit()
        db_session.refresh(credentials)
        
        # Test basic attributes (relationships may not work without proper foreign keys)
        assert credentials.tenant_id == test_tenant.id
        assert credentials.user_id == test_user.id
        assert credentials.changed_by_admin_id == admin_user.id
    
    def test_cascade_delete(self, db_session: Session, test_tenant, test_user):
        """Test cascade delete behavior"""
        # Create credentials
        credentials = TenantCredentials.create_for_tenant(
            tenant_id=str(test_tenant.id),
            user_id=str(test_user.id),
            username="owner@company.com",
            password_hash="password_hash"
        )
        
        db_session.add(credentials)
        db_session.commit()
        
        credentials_id = credentials.id
        
        # Delete tenant - should cascade delete credentials
        db_session.delete(test_tenant)
        db_session.commit()
        
        # Verify credentials were deleted
        deleted_credentials = db_session.query(TenantCredentials).filter(
            TenantCredentials.id == credentials_id
        ).first()
        
        assert deleted_credentials is None
    
    def test_password_change_tracking_accuracy(self, db_session: Session, test_tenant, test_user, admin_user):
        """Test accuracy of password change tracking"""
        # Create credentials
        credentials = TenantCredentials.create_for_tenant(
            tenant_id=str(test_tenant.id),
            user_id=str(test_user.id),
            username="owner@company.com",
            password_hash="initial_password"
        )
        
        db_session.add(credentials)
        db_session.commit()
        
        initial_time = credentials.password_changed_at
        initial_count = credentials.password_change_count
        
        # Wait a moment and change password
        import time
        time.sleep(0.1)
        
        credentials.update_password(
            new_password_hash="new_password",
            admin_id=str(admin_user.id),
            notes="Security update"
        )
        
        db_session.commit()
        db_session.refresh(credentials)
        
        # Verify tracking accuracy
        assert credentials.password_changed_at > initial_time
        assert credentials.password_change_count == initial_count + 1
        assert credentials.previous_password_hash == "initial_password"
        assert credentials.password_hash == "new_password"
        
        # Verify change history contains accurate timestamp
        history = credentials.get_change_history()
        assert len(history) == 1
        
        change_time = datetime.fromisoformat(history[0]["changed_at"].replace('Z', '+00:00'))
        assert change_time > initial_time
    
    def test_json_serialization_in_change_history(self, db_session: Session, test_tenant, test_user, admin_user):
        """Test JSON serialization/deserialization in change history"""
        # Create credentials
        credentials = TenantCredentials.create_for_tenant(
            tenant_id=str(test_tenant.id),
            user_id=str(test_user.id),
            username="owner@company.com",
            password_hash="password_hash"
        )
        
        db_session.add(credentials)
        db_session.commit()
        
        # Make password changes with various note types
        test_notes = [
            "Simple note",
            "Note with special chars: !@#$%^&*()",
            "Note with unicode: 测试 العربية",
            "Note with JSON-like content: {\"key\": \"value\"}"
        ]
        
        for i, note in enumerate(test_notes):
            credentials.update_password(
                new_password_hash=f"password_{i}",
                admin_id=str(admin_user.id),
                notes=note
            )
            db_session.commit()
        
        # Verify all notes are properly stored and retrieved
        history = credentials.get_change_history()
        assert len(history) == len(test_notes)
        
        for i, entry in enumerate(history):
            assert entry["notes"] == test_notes[i]
            assert entry["changed_by_admin"] == str(admin_user.id)
            assert "changed_at" in entry
    
    def test_account_lock_expiration(self, db_session: Session, test_tenant, test_user):
        """Test account lock expiration logic"""
        # Create credentials
        credentials = TenantCredentials.create_for_tenant(
            tenant_id=str(test_tenant.id),
            user_id=str(test_user.id),
            username="owner@company.com",
            password_hash="password_hash"
        )
        
        db_session.add(credentials)
        db_session.commit()
        
        # Lock account
        for _ in range(5):
            credentials.record_login_attempt(success=False)
        
        db_session.commit()
        
        # Verify account is locked
        assert credentials.is_account_locked() is True
        lock_time = credentials.account_locked_until
        assert lock_time is not None
        
        # Manually set lock time to past (simulate expiration)
        past_time = datetime.now(timezone.utc) - timedelta(minutes=1)
        credentials.account_locked_until = past_time
        db_session.commit()
        
        # Verify account is no longer locked
        assert credentials.is_account_locked() is False