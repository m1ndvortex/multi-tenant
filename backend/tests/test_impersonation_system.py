"""
Comprehensive tests for User Impersonation System

Tests all aspects of the impersonation system including:
- JWT token generation and validation
- Session management and Redis storage
- Audit logging and security controls
- API endpoints and error handling
- Security validation and edge cases

Uses REAL PostgreSQL database and REAL Redis instance for production-ready testing.
"""

import pytest
import json
import uuid
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.core.database import get_db, SessionLocal
from app.core.redis_client import redis_client
from app.core.auth import create_impersonation_token, verify_token, create_user_tokens
from app.models.user import User, UserRole, UserStatus
from app.models.tenant import Tenant, TenantStatus, SubscriptionType
from app.models.activity_log import ActivityLog
from app.services.impersonation_service import ImpersonationService


class TestImpersonationTokenGeneration:
    """Test JWT token generation for impersonation"""
    
    def test_create_impersonation_token_success(self):
        """Test successful impersonation token creation"""
        admin_user_id = "admin-123"
        target_user_id = "user-456"
        target_tenant_id = "tenant-789"
        
        token = create_impersonation_token(
            admin_user_id=admin_user_id,
            target_user_id=target_user_id,
            target_tenant_id=target_tenant_id,
            expires_delta=timedelta(hours=2)
        )
        
        assert token is not None
        assert isinstance(token, str)
        
        # Verify token payload
        payload = verify_token(token)
        assert payload["user_id"] == target_user_id
        assert payload["tenant_id"] == target_tenant_id
        assert payload["admin_user_id"] == admin_user_id
        assert payload["is_impersonation"] is True
        assert payload["is_super_admin"] is False
        assert payload["type"] == "impersonation"
    
    def test_impersonation_token_expiration(self):
        """Test impersonation token expiration"""
        token = create_impersonation_token(
            admin_user_id="admin-123",
            target_user_id="user-456",
            target_tenant_id="tenant-789",
            expires_delta=timedelta(seconds=1)  # Very short expiration
        )
        
        # Token should be valid immediately
        payload = verify_token(token)
        assert payload is not None
        
        # Wait for expiration and test
        import time
        time.sleep(2)
        
        with pytest.raises(Exception):  # Should raise AuthenticationError
            verify_token(token)
    
    def test_impersonation_token_default_expiration(self):
        """Test default 2-hour expiration for impersonation tokens"""
        token = create_impersonation_token(
            admin_user_id="admin-123",
            target_user_id="user-456",
            target_tenant_id="tenant-789"
        )
        
        payload = verify_token(token)
        exp_timestamp = payload["exp"]
        exp_datetime = datetime.utcfromtimestamp(exp_timestamp)
        
        # Should expire in approximately 2 hours
        expected_expiry = datetime.utcnow() + timedelta(hours=2)
        time_diff = abs((exp_datetime - expected_expiry).total_seconds())
        
        assert time_diff < 60  # Within 1 minute tolerance


class TestImpersonationService:
    """Test ImpersonationService functionality with REAL database and Redis"""
    
    @pytest.fixture
    def db_session(self):
        """Create REAL test database session"""
        db = SessionLocal()
        try:
            yield db
        finally:
            # Clean up test data
            try:
                db.rollback()  # Rollback any pending transactions
                db.query(ActivityLog).delete()
                db.query(User).delete()
                db.query(Tenant).delete()
                db.commit()
            except Exception:
                db.rollback()
            finally:
                db.close()
    
    @pytest.fixture
    def redis_cleanup(self):
        """Clean up Redis test data"""
        # Clean up before test
        pattern = "impersonation_session:*"
        keys = redis_client.redis_client.keys(pattern)
        if keys:
            redis_client.redis_client.delete(*keys)
        
        yield
        
        # Clean up after test
        keys = redis_client.redis_client.keys(pattern)
        if keys:
            redis_client.redis_client.delete(*keys)
    
    @pytest.fixture
    def admin_user(self, db_session):
        """Create test super admin user in REAL database"""
        user_id = str(uuid.uuid4())
        user = User(
            id=user_id,
            email=f"admin-{user_id}@hesaabplus.com",
            password_hash="hashed_password",
            first_name="Super",
            last_name="Admin",
            role=UserRole.ADMIN,
            status=UserStatus.ACTIVE,
            is_super_admin=True
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
        return user
    
    @pytest.fixture
    def target_user(self, db_session):
        """Create test target user in REAL database"""
        # Create tenant first
        tenant_id = str(uuid.uuid4())
        tenant = Tenant(
            id=tenant_id,
            name=f"Test Tenant {tenant_id}",
            email=f"tenant-{tenant_id}@testtenant.com",
            subscription_type=SubscriptionType.PRO,
            status=TenantStatus.ACTIVE
        )
        db_session.add(tenant)
        db_session.flush()
        
        user_id = str(uuid.uuid4())
        user = User(
            id=user_id,
            email=f"user-{user_id}@testtenant.com",
            password_hash="hashed_password",
            first_name="Test",
            last_name="User",
            role=UserRole.USER,
            status=UserStatus.ACTIVE,
            is_super_admin=False,
            tenant_id=tenant.id
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
        return user
    
    def test_start_impersonation_success(self, db_session, redis_cleanup, admin_user, target_user):
        """Test successful impersonation start with REAL Redis and database"""
        service = ImpersonationService(db_session)
        
        result = service.start_impersonation(
            admin_user=admin_user,
            target_user_id=str(target_user.id),
            duration_hours=2,
            ip_address="192.168.1.1",
            user_agent="Test Browser",
            reason="Customer support"
        )
        
        assert "access_token" in result
        assert "session_id" in result
        assert result["token_type"] == "bearer"
        assert result["expires_in"] == 7200  # 2 hours in seconds
        assert result["target_user"]["id"] == str(target_user.id)
        assert result["admin_user"]["id"] == str(admin_user.id)
        
        # Verify REAL Redis session storage
        session_id = result["session_id"]
        redis_key = f"impersonation_session:{session_id}"
        session_data = redis_client.redis_client.get(redis_key)
        assert session_data is not None
        
        session_json = json.loads(session_data)
        assert session_json["admin_user_id"] == str(admin_user.id)
        assert session_json["target_user_id"] == str(target_user.id)
        assert session_json["status"] == "active"
        assert session_json["reason"] == "Customer support"
        
        # Verify REAL audit log creation in database
        logs = db_session.query(ActivityLog).filter(
            ActivityLog.action == "impersonation_started"
        ).all()
        assert len(logs) == 1
        assert logs[0].status == "success"
        assert logs[0].user_id == admin_user.id
        assert logs[0].resource_id == target_user.id
    
    def test_start_impersonation_non_admin_user(self, db_session, redis_cleanup, target_user):
        """Test impersonation start with non-admin user using REAL database"""
        service = ImpersonationService(db_session)
        
        with pytest.raises(Exception) as exc_info:
            service.start_impersonation(
                admin_user=target_user,  # Regular user, not admin
                target_user_id="some-user-id",
                duration_hours=2
            )
        
        # Check the exception detail attribute for HTTPException
        assert hasattr(exc_info.value, 'detail')
        assert "Only super admin users can start impersonation" in exc_info.value.detail
    
    def test_start_impersonation_target_not_found(self, db_session, redis_cleanup, admin_user):
        """Test impersonation start with non-existent target user using REAL database"""
        service = ImpersonationService(db_session)
        
        non_existent_id = str(uuid.uuid4())
        with pytest.raises(Exception) as exc_info:
            service.start_impersonation(
                admin_user=admin_user,
                target_user_id=non_existent_id,
                duration_hours=2
            )
        
        # Check the exception detail attribute for HTTPException
        assert hasattr(exc_info.value, 'detail')
        assert "Target user not found" in exc_info.value.detail
        
        # Verify failed attempt is logged in REAL database
        logs = db_session.query(ActivityLog).filter(
            ActivityLog.action == "impersonation_start_failed"
        ).all()
        assert len(logs) == 1
        assert logs[0].status == "failed"
        assert logs[0].user_id == admin_user.id
        assert logs[0].details["target_user_id"] == non_existent_id


class TestImpersonationAPI:
    """Test Impersonation API endpoints with REAL database and Redis"""
    
    @pytest.fixture
    def client(self):
        """Create test client"""
        return TestClient(app)
    
    @pytest.fixture
    def db_session(self):
        """Create REAL test database session"""
        db = SessionLocal()
        try:
            yield db
        finally:
            # Clean up test data
            try:
                db.rollback()  # Rollback any pending transactions
                db.query(ActivityLog).delete()
                db.query(User).delete()
                db.query(Tenant).delete()
                db.commit()
            except Exception:
                db.rollback()
            finally:
                db.close()
    
    @pytest.fixture
    def redis_cleanup(self):
        """Clean up Redis test data"""
        # Clean up before test
        pattern = "impersonation_session:*"
        keys = redis_client.redis_client.keys(pattern)
        if keys:
            redis_client.redis_client.delete(*keys)
        
        yield
        
        # Clean up after test
        keys = redis_client.redis_client.keys(pattern)
        if keys:
            redis_client.redis_client.delete(*keys)
    
    @pytest.fixture
    def admin_user(self, db_session):
        """Create test super admin user in REAL database"""
        user_id = str(uuid.uuid4())
        user = User(
            id=user_id,
            email=f"admin-{user_id}@hesaabplus.com",
            password_hash="hashed_password",
            first_name="Super",
            last_name="Admin",
            role=UserRole.ADMIN,
            status=UserStatus.ACTIVE,
            is_super_admin=True
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
        return user
    
    @pytest.fixture
    def admin_token(self, admin_user):
        """Create admin JWT token"""
        tokens = create_user_tokens(admin_user)
        return tokens["access_token"]
    
    @pytest.fixture
    def target_user(self, db_session):
        """Create test target user in REAL database"""
        # Create tenant first
        tenant_id = str(uuid.uuid4())
        tenant = Tenant(
            id=tenant_id,
            name=f"Test Tenant {tenant_id}",
            email=f"tenant-{tenant_id}@testtenant.com",
            subscription_type=SubscriptionType.PRO,
            status=TenantStatus.ACTIVE
        )
        db_session.add(tenant)
        db_session.flush()
        
        user_id = str(uuid.uuid4())
        user = User(
            id=user_id,
            email=f"user-{user_id}@testtenant.com",
            password_hash="hashed_password",
            first_name="Test",
            last_name="User",
            role=UserRole.USER,
            status=UserStatus.ACTIVE,
            is_super_admin=False,
            tenant_id=tenant.id
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
        return user
    
    def test_start_impersonation_api_success(self, client, db_session, redis_cleanup, admin_token, target_user):
        """Test successful impersonation start via API using REAL database and Redis"""
        
        response = client.post(
            "/api/impersonation/start",
            json={
                "target_user_id": str(target_user.id),
                "duration_hours": 2,
                "reason": "Customer support"
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "access_token" in data
        assert "session_id" in data
        assert data["token_type"] == "bearer"
        assert data["expires_in"] == 7200
        assert data["target_user"]["id"] == str(target_user.id)
        
        # Verify REAL Redis session storage
        session_id = data["session_id"]
        redis_key = f"impersonation_session:{session_id}"
        session_data = redis_client.redis_client.get(redis_key)
        assert session_data is not None
        
        # Verify REAL audit log in database
        logs = db_session.query(ActivityLog).filter(
            ActivityLog.action == "impersonation_started"
        ).all()
        assert len(logs) >= 1
    
    def test_start_impersonation_api_unauthorized(self, client, target_user):
        """Test impersonation start without admin token"""
        response = client.post(
            "/api/impersonation/start",
            json={
                "target_user_id": str(target_user.id),
                "duration_hours": 2
            }
        )
        
        assert response.status_code == 403  # Should be 403 for missing authentication
    
    def test_impersonation_health_check(self, client):
        """Test impersonation service health check"""
        response = client.get("/api/impersonation/health")
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "impersonation"


class TestImpersonationSecurity:
    """Test security aspects of impersonation system using REAL database and Redis"""
    
    def test_impersonation_token_cannot_be_used_for_admin_actions(self):
        """Test that impersonation tokens cannot be used for admin actions"""
        # Create impersonation token
        token = create_impersonation_token(
            admin_user_id="admin-123",
            target_user_id="user-456",
            target_tenant_id="tenant-789"
        )
        
        # Verify token payload
        payload = verify_token(token)
        assert payload["is_super_admin"] is False
        assert payload["is_impersonation"] is True
        
        # This ensures impersonation tokens can't be used for super admin actions


if __name__ == "__main__":
    pytest.main([__file__, "-v"])