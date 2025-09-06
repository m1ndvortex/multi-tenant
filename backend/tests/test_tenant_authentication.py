"""
Comprehensive unit tests for tenant authentication system
Tests multi-tenant context validation, subscription status checking, and JWT token generation
"""

import pytest
from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
import uuid

from app.main import app
from app.core.database import get_db
from app.models.user import User, UserRole, UserStatus
from app.models.tenant import Tenant, TenantStatus, SubscriptionType
from app.core.auth import get_password_hash, verify_token
from app.services.auth_logging_service import AuthLoggingService, AuthenticationLog


class TestTenantAuthentication:
    """Test suite for tenant authentication with subscription validation"""
    
    @pytest.fixture
    def client(self):
        """Create test client"""
        return TestClient(app)
    
    @pytest.fixture
    def db_session(self):
        """Create database session for testing"""
        from app.core.database import SessionLocal
        db = SessionLocal()
        try:
            yield db
        finally:
            db.close()
    
    @pytest.fixture
    def active_tenant(self, db_session: Session):
        """Create active tenant with Pro subscription"""
        tenant = Tenant(
            id=uuid.uuid4(),
            name="Test Business",
            email="test@business.com",
            subscription_type=SubscriptionType.PRO,
            status=TenantStatus.ACTIVE,
            subscription_starts_at=datetime.now(timezone.utc) - timedelta(days=30),
            subscription_expires_at=datetime.now(timezone.utc) + timedelta(days=335),
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
    def expired_tenant(self, db_session: Session):
        """Create tenant with expired subscription"""
        tenant = Tenant(
            id=uuid.uuid4(),
            name="Expired Business",
            email="expired@business.com",
            subscription_type=SubscriptionType.PRO,
            status=TenantStatus.ACTIVE,
            subscription_starts_at=datetime.now(timezone.utc) - timedelta(days=400),
            subscription_expires_at=datetime.now(timezone.utc) - timedelta(days=5),
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
    def suspended_tenant(self, db_session: Session):
        """Create suspended tenant"""
        tenant = Tenant(
            id=uuid.uuid4(),
            name="Suspended Business",
            email="suspended@business.com",
            subscription_type=SubscriptionType.PRO,
            status=TenantStatus.SUSPENDED,
            subscription_starts_at=datetime.now(timezone.utc) - timedelta(days=30),
            subscription_expires_at=datetime.now(timezone.utc) + timedelta(days=335)
        )
        db_session.add(tenant)
        db_session.commit()
        db_session.refresh(tenant)
        return tenant
    
    @pytest.fixture
    def free_tenant(self, db_session: Session):
        """Create free tier tenant"""
        tenant = Tenant(
            id=uuid.uuid4(),
            name="Free Business",
            email="free@business.com",
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
    def tenant_user(self, db_session: Session, active_tenant: Tenant):
        """Create active user for tenant"""
        user = User(
            id=uuid.uuid4(),
            tenant_id=active_tenant.id,
            email="user@test.com",
            password_hash=get_password_hash("testpassword123"),
            first_name="Test",
            last_name="User",
            role=UserRole.ADMIN,
            status=UserStatus.ACTIVE,
            is_email_verified=True
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
        return user
    
    def test_successful_tenant_login(self, client: TestClient, db_session: Session, active_tenant: Tenant, tenant_user: User):
        """Test successful tenant user login with valid credentials and active subscription"""
        
        login_data = {
            "email": tenant_user.email,
            "password": "testpassword123",
            "tenant_id": str(active_tenant.id)
        }
        
        response = client.post("/api/auth/tenant/login", json=login_data)
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify token structure
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"
        assert data["expires_in"] == 1800  # 30 minutes
        
        # Verify user information
        assert data["user"]["id"] == str(tenant_user.id)
        assert data["user"]["email"] == tenant_user.email
        assert data["user"]["role"] == tenant_user.role.value
        assert data["user"]["tenant_id"] == str(active_tenant.id)
        
        # Verify tenant information
        assert data["tenant"]["id"] == str(active_tenant.id)
        assert data["tenant"]["name"] == active_tenant.name
        assert data["tenant"]["subscription_type"] == active_tenant.subscription_type.value
        assert data["tenant"]["status"] == active_tenant.status.value
        
        # Verify subscription status
        assert data["subscription_status"]["type"] == "pro"
        assert data["subscription_status"]["is_active"] is True
        assert "limits" in data["subscription_status"]
        assert "usage" in data["subscription_status"]
        
        # Verify JWT token claims
        payload = verify_token(data["access_token"])
        assert payload["user_id"] == str(tenant_user.id)
        assert payload["tenant_id"] == str(active_tenant.id)
        assert payload["subscription_type"] == "pro"
        assert payload["subscription_active"] is True
        assert payload["tenant_status"] == "active"
        
        # Verify authentication log
        auth_logs = db_session.query(AuthenticationLog).filter(
            AuthenticationLog.email == tenant_user.email,
            AuthenticationLog.success == True
        ).all()
        assert len(auth_logs) >= 1
        
        latest_log = auth_logs[-1]
        assert latest_log.event_type == "login_success"
        assert latest_log.tenant_id == active_tenant.id
        assert latest_log.user_id == tenant_user.id
    
    def test_login_with_invalid_credentials(self, client: TestClient, active_tenant: Tenant):
        """Test login with invalid email/password"""
        
        login_data = {
            "email": "nonexistent@test.com",
            "password": "wrongpassword",
            "tenant_id": str(active_tenant.id)
        }
        
        response = client.post("/api/auth/tenant/login", json=login_data)
        
        assert response.status_code == 401
        assert "Incorrect email or password" in response.json()["detail"]
    
    def test_login_with_nonexistent_tenant(self, client: TestClient):
        """Test login with non-existent tenant ID"""
        
        fake_tenant_id = str(uuid.uuid4())
        login_data = {
            "email": "user@test.com",
            "password": "testpassword123",
            "tenant_id": fake_tenant_id
        }
        
        response = client.post("/api/auth/tenant/login", json=login_data)
        
        assert response.status_code == 404
        assert "Tenant not found" in response.json()["detail"]
    
    def test_login_with_suspended_tenant(self, client: TestClient, db_session: Session, suspended_tenant: Tenant):
        """Test login attempt with suspended tenant"""
        
        # Create user for suspended tenant
        user = User(
            id=uuid.uuid4(),
            tenant_id=suspended_tenant.id,
            email="user@suspended.com",
            password_hash=get_password_hash("testpassword123"),
            first_name="Test",
            last_name="User",
            role=UserRole.ADMIN,
            status=UserStatus.ACTIVE
        )
        db_session.add(user)
        db_session.commit()
        
        login_data = {
            "email": user.email,
            "password": "testpassword123",
            "tenant_id": str(suspended_tenant.id)
        }
        
        response = client.post("/api/auth/tenant/login", json=login_data)
        
        assert response.status_code == 403
        assert "suspended" in response.json()["detail"]
    
    def test_login_with_expired_subscription(self, client: TestClient, db_session: Session, expired_tenant: Tenant):
        """Test login attempt with expired subscription"""
        
        # Create user for expired tenant
        user = User(
            id=uuid.uuid4(),
            tenant_id=expired_tenant.id,
            email="user@expired.com",
            password_hash=get_password_hash("testpassword123"),
            first_name="Test",
            last_name="User",
            role=UserRole.ADMIN,
            status=UserStatus.ACTIVE
        )
        db_session.add(user)
        db_session.commit()
        
        login_data = {
            "email": user.email,
            "password": "testpassword123",
            "tenant_id": str(expired_tenant.id)
        }
        
        response = client.post("/api/auth/tenant/login", json=login_data)
        
        assert response.status_code == 402
        assert "Subscription has expired" in response.json()["detail"]
    
    def test_login_with_tenant_mismatch(self, client: TestClient, db_session: Session, active_tenant: Tenant):
        """Test login with user from different tenant"""
        
        # Create another tenant
        other_tenant = Tenant(
            id=uuid.uuid4(),
            name="Other Business",
            email="other@business.com",
            subscription_type=SubscriptionType.PRO,
            status=TenantStatus.ACTIVE,
            subscription_expires_at=datetime.now(timezone.utc) + timedelta(days=365)
        )
        db_session.add(other_tenant)
        
        # Create user for other tenant
        user = User(
            id=uuid.uuid4(),
            tenant_id=other_tenant.id,
            email="user@other.com",
            password_hash=get_password_hash("testpassword123"),
            first_name="Test",
            last_name="User",
            role=UserRole.ADMIN,
            status=UserStatus.ACTIVE
        )
        db_session.add(user)
        db_session.commit()
        
        # Try to login with wrong tenant_id
        login_data = {
            "email": user.email,
            "password": "testpassword123",
            "tenant_id": str(active_tenant.id)  # Wrong tenant ID
        }
        
        response = client.post("/api/auth/tenant/login", json=login_data)
        
        assert response.status_code == 403
        assert "User does not belong to specified tenant" in response.json()["detail"]
    
    def test_free_tier_login_with_limits(self, client: TestClient, db_session: Session, free_tenant: Tenant):
        """Test login for free tier tenant with proper limit information"""
        
        # Create user for free tenant
        user = User(
            id=uuid.uuid4(),
            tenant_id=free_tenant.id,
            email="user@free.com",
            password_hash=get_password_hash("testpassword123"),
            first_name="Free",
            last_name="User",
            role=UserRole.OWNER,
            status=UserStatus.ACTIVE
        )
        db_session.add(user)
        db_session.commit()
        
        login_data = {
            "email": user.email,
            "password": "testpassword123",
            "tenant_id": str(free_tenant.id)
        }
        
        response = client.post("/api/auth/tenant/login", json=login_data)
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify free tier limits
        limits = data["subscription_status"]["limits"]
        assert limits["max_users"] == 1
        assert limits["max_products"] == 10
        assert limits["max_customers"] == 10
        assert limits["max_monthly_invoices"] == 10
        
        # Verify JWT token has correct subscription info
        payload = verify_token(data["access_token"])
        assert payload["subscription_type"] == "free"
        assert payload["permissions"]["max_users"] == 1
    
    def test_inactive_user_login(self, client: TestClient, db_session: Session, active_tenant: Tenant):
        """Test login attempt with inactive user"""
        
        # Create inactive user
        user = User(
            id=uuid.uuid4(),
            tenant_id=active_tenant.id,
            email="inactive@test.com",
            password_hash=get_password_hash("testpassword123"),
            first_name="Inactive",
            last_name="User",
            role=UserRole.USER,
            status=UserStatus.INACTIVE
        )
        db_session.add(user)
        db_session.commit()
        
        login_data = {
            "email": user.email,
            "password": "testpassword123",
            "tenant_id": str(active_tenant.id)
        }
        
        response = client.post("/api/auth/tenant/login", json=login_data)
        
        assert response.status_code == 401
        assert "Incorrect email or password" in response.json()["detail"]
    
    def test_authentication_logging_service(self, db_session: Session, active_tenant: Tenant):
        """Test authentication logging service functionality"""
        
        auth_logger = AuthLoggingService(db_session)
        
        # Test successful login logging
        log_entry = auth_logger.log_successful_login(
            user_id=str(uuid.uuid4()),
            tenant_id=str(active_tenant.id),
            email="test@example.com",
            ip_address="192.168.1.1"
        )
        
        assert log_entry.success is True
        assert log_entry.event_type == "login_success"
        assert log_entry.email == "test@example.com"
        assert log_entry.tenant_id == active_tenant.id
        
        # Test failed login logging
        failed_log = auth_logger.log_failed_login(
            email="test@example.com",
            tenant_id=str(active_tenant.id),
            reason="invalid_credentials",
            ip_address="192.168.1.1"
        )
        
        assert failed_log.success is False
        assert failed_log.event_type == "login_failed"
        assert failed_log.failure_reason == "invalid_credentials"
        
        # Test failed attempt counting
        for _ in range(3):
            auth_logger.log_failed_login(
                email="locked@example.com",
                tenant_id=str(active_tenant.id),
                reason="invalid_credentials"
            )
        
        failed_count = auth_logger.get_failed_login_attempts(
            email="locked@example.com",
            tenant_id=str(active_tenant.id),
            hours=1
        )
        assert failed_count == 3
        
        # Test account locking
        is_locked = auth_logger.is_account_locked(
            email="locked@example.com",
            tenant_id=str(active_tenant.id),
            max_attempts=2
        )
        assert is_locked is True
    
    def test_subscription_status_validation_scenarios(self, client: TestClient, db_session: Session):
        """Test various subscription status validation scenarios"""
        
        # Test tenant with subscription expiring soon
        expiring_tenant = Tenant(
            id=uuid.uuid4(),
            name="Expiring Business",
            email="expiring@business.com",
            subscription_type=SubscriptionType.PRO,
            status=TenantStatus.ACTIVE,
            subscription_expires_at=datetime.now(timezone.utc) + timedelta(days=3)
        )
        db_session.add(expiring_tenant)
        
        user = User(
            id=uuid.uuid4(),
            tenant_id=expiring_tenant.id,
            email="user@expiring.com",
            password_hash=get_password_hash("testpassword123"),
            first_name="Test",
            last_name="User",
            role=UserRole.ADMIN,
            status=UserStatus.ACTIVE
        )
        db_session.add(user)
        db_session.commit()
        
        login_data = {
            "email": user.email,
            "password": "testpassword123",
            "tenant_id": str(expiring_tenant.id)
        }
        
        response = client.post("/api/auth/tenant/login", json=login_data)
        
        assert response.status_code == 200
        data = response.json()
        
        # Should still allow login but show expiring status
        assert data["subscription_status"]["is_active"] is True
        assert data["subscription_status"]["days_until_expiry"] == 3
    
    def test_enhanced_jwt_token_claims(self, client: TestClient, active_tenant: Tenant, tenant_user: User):
        """Test that JWT tokens contain all required subscription and tenant claims"""
        
        login_data = {
            "email": tenant_user.email,
            "password": "testpassword123",
            "tenant_id": str(active_tenant.id)
        }
        
        response = client.post("/api/auth/tenant/login", json=login_data)
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify enhanced JWT claims
        payload = verify_token(data["access_token"])
        
        required_claims = [
            "user_id", "email", "role", "tenant_id", "is_super_admin",
            "subscription_type", "subscription_active", "tenant_status", "permissions"
        ]
        
        for claim in required_claims:
            assert claim in payload, f"Missing required claim: {claim}"
        
        # Verify permission claims structure
        permissions = payload["permissions"]
        assert "max_users" in permissions
        assert "max_products" in permissions
        assert "max_customers" in permissions
        assert "max_monthly_invoices" in permissions
        
        # Verify refresh token claims
        refresh_payload = verify_token(data["refresh_token"])
        assert refresh_payload["user_id"] == str(tenant_user.id)
        assert refresh_payload["tenant_id"] == str(active_tenant.id)
        assert refresh_payload["type"] == "refresh"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])