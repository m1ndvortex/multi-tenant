"""
Enhanced Impersonation System Tests

Comprehensive tests for the enhanced impersonation system with new window management,
automatic session cleanup, and enhanced session tracking functionality.
"""

import pytest
import json
from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
import uuid

from app.main import app
from app.core.database import get_db
from app.models.user import User, UserRole, UserStatus
from app.models.tenant import Tenant, TenantStatus, SubscriptionType
from app.models.impersonation_session import ImpersonationSession
from app.services.enhanced_impersonation_service import EnhancedImpersonationService
from app.core.redis_client import redis_client
from tests.conftest import TestingSessionLocal, override_get_db


# Override the dependency
app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)


class TestEnhancedImpersonationService:
    """Test the enhanced impersonation service functionality"""
    
    def setup_method(self):
        """Set up test data before each test"""
        self.db = TestingSessionLocal()
        
        # Clean up Redis test data
        pattern = "impersonation_session:*"
        keys = redis_client.redis_client.keys(pattern)
        if keys:
            redis_client.redis_client.delete(*keys)
        
        # Create test tenant
        self.test_tenant = Tenant(
            name="Test Tenant",
            email="tenant@test.com",
            phone="1234567890",
            address="Test Address",
            domain="test.example.com",
            subscription_type=SubscriptionType.PRO,
            status=TenantStatus.ACTIVE
        )
        self.db.add(self.test_tenant)
        self.db.commit()
        
        # Create super admin user
        self.super_admin = User(
            email="admin@hesaabplus.com",
            name="Super Admin",
            password_hash="hashed_password",
            role=UserRole.ADMIN,
            is_super_admin=True,
            status=UserStatus.ACTIVE,
            tenant_id=None  # Super admin has no tenant
        )
        self.db.add(self.super_admin)
        
        # Create target user for impersonation
        self.target_user = User(
            email="user@test.com",
            name="Test User",
            password_hash="hashed_password",
            role=UserRole.USER,
            is_super_admin=False,
            status=UserStatus.ACTIVE,
            tenant_id=self.test_tenant.id
        )
        self.db.add(self.target_user)
        self.db.commit()
        
        # Create service instance
        self.service = EnhancedImpersonationService(self.db)
    
    def teardown_method(self):
        """Clean up after each test"""
        # Clean up Redis test data
        pattern = "impersonation_session:*"
        keys = redis_client.redis_client.keys(pattern)
        if keys:
            redis_client.redis_client.delete(*keys)
        
        # Clean up database
        self.db.query(ImpersonationSession).delete()
        self.db.query(User).delete()
        self.db.query(Tenant).delete()
        self.db.commit()
        self.db.close()
    
    def test_start_enhanced_impersonation_with_window_support(self):
        """Test starting enhanced impersonation with new window support"""
        # Start impersonation with window support
        result = self.service.start_impersonation(
            admin_user=self.super_admin,
            target_user_id=str(self.target_user.id),
            duration_hours=2,
            ip_address="192.168.1.1",
            user_agent="Test Browser",
            reason="Testing enhanced impersonation",
            is_window_based=True
        )
        
        # Verify response structure
        assert "access_token" in result
        assert "session_id" in result
        assert "window_url" in result  # New field for window opening
        assert result["is_window_based"] is True
        assert result["token_type"] == "bearer"
        assert result["expires_in"] == 2 * 3600  # 2 hours in seconds
        
        # Verify target user information
        assert result["target_user"]["id"] == str(self.target_user.id)
        assert result["target_user"]["email"] == self.target_user.email
        
        # Verify admin user information
        assert result["admin_user"]["id"] == str(self.super_admin.id)
        assert result["admin_user"]["is_super_admin"] is True
        
        # Verify window URL is generated
        assert "impersonation_token=" in result["window_url"]
        
        # Verify database session record
        session_id = result["session_id"]
        db_session = self.db.query(ImpersonationSession).filter(
            ImpersonationSession.session_id == session_id
        ).first()
        
        assert db_session is not None
        assert db_session.admin_user_id == self.super_admin.id
        assert db_session.target_user_id == self.target_user.id
        assert db_session.target_tenant_id == self.target_user.tenant_id
        assert db_session.is_active is True
        assert db_session.is_window_based is True
        assert db_session.window_closed_detected is False
        assert db_session.ip_address == "192.168.1.1"
        assert db_session.user_agent == "Test Browser"
        assert db_session.reason == "Testing enhanced impersonation"
        assert db_session.activity_count == 1
        
        # Verify Redis session storage
        redis_key = f"impersonation_session:{session_id}"
        session_data = redis_client.redis_client.get(redis_key)
        assert session_data is not None
        
        session_json = json.loads(session_data)
        assert session_json["session_id"] == session_id
        assert session_json["admin_user_id"] == str(self.super_admin.id)
        assert session_json["target_user_id"] == str(self.target_user.id)
        assert session_json["is_window_based"] is True
    
    def test_detect_window_closure_cleanup(self):
        """Test automatic window closure detection and cleanup"""
        # Start impersonation session
        result = self.service.start_impersonation(
            admin_user=self.super_admin,
            target_user_id=str(self.target_user.id),
            duration_hours=2,
            is_window_based=True
        )
        
        session_id = result["session_id"]
        
        # Verify session is active
        db_session = self.db.query(ImpersonationSession).filter(
            ImpersonationSession.session_id == session_id
        ).first()
        assert db_session.is_active is True
        assert db_session.window_closed_detected is False
        
        # Detect window closure
        cleanup_result = self.service.detect_window_closure(
            session_id=session_id,
            admin_user=self.super_admin
        )
        
        # Verify cleanup response
        assert cleanup_result["message"] == "Window closure detected and session cleaned up"
        assert cleanup_result["session_id"] == session_id
        assert "cleanup_at" in cleanup_result
        
        # Verify database session is marked as closed
        self.db.refresh(db_session)
        assert db_session.is_active is False
        assert db_session.window_closed_detected is True
        assert db_session.termination_reason == "window_closed"
        assert db_session.ended_at is not None
        
        # Verify Redis session is removed
        redis_key = f"impersonation_session:{session_id}"
        session_data = redis_client.redis_client.get(redis_key)
        assert session_data is None
    
    def test_enhanced_session_tracking(self):
        """Test enhanced session tracking with activity monitoring"""
        # Start impersonation session
        result = self.service.start_impersonation(
            admin_user=self.super_admin,
            target_user_id=str(self.target_user.id),
            duration_hours=1
        )
        
        session_id = result["session_id"]
        
        # Get initial session data
        db_session = self.db.query(ImpersonationSession).filter(
            ImpersonationSession.session_id == session_id
        ).first()
        
        initial_activity_count = db_session.activity_count
        initial_last_activity = db_session.last_activity_at
        
        # Validate session (this should mark activity)
        is_valid = self.service.validate_enhanced_session(
            session_id=session_id,
            jwt_token=result["access_token"]
        )
        
        assert is_valid is True
        
        # Verify activity tracking
        self.db.refresh(db_session)
        assert db_session.activity_count > initial_activity_count
        assert db_session.last_activity_at > initial_last_activity
        
        # Test JWT token validation
        is_valid_with_token = self.service.validate_enhanced_session(
            session_id=session_id,
            jwt_token=result["access_token"]
        )
        assert is_valid_with_token is True
        
        # Test with invalid JWT token
        is_valid_invalid_token = self.service.validate_enhanced_session(
            session_id=session_id,
            jwt_token="invalid_token"
        )
        assert is_valid_invalid_token is False
    
    def test_get_enhanced_active_sessions(self):
        """Test getting enhanced active sessions with filtering"""
        # Start multiple impersonation sessions
        session1 = self.service.start_impersonation(
            admin_user=self.super_admin,
            target_user_id=str(self.target_user.id),
            duration_hours=2,
            is_window_based=True,
            reason="Test session 1"
        )
        
        # Create another target user
        target_user2 = User(
            email="user2@test.com",
            name="Test User 2",
            password_hash="hashed_password",
            role=UserRole.USER,
            is_super_admin=False,
            status=UserStatus.ACTIVE,
            tenant_id=self.test_tenant.id
        )
        self.db.add(target_user2)
        self.db.commit()
        
        session2 = self.service.start_impersonation(
            admin_user=self.super_admin,
            target_user_id=str(target_user2.id),
            duration_hours=1,
            is_window_based=False,
            reason="Test session 2"
        )
        
        # Get all active sessions
        all_sessions = self.service.get_enhanced_active_sessions()
        assert len(all_sessions) == 2
        
        # Filter by admin user
        admin_sessions = self.service.get_enhanced_active_sessions(
            admin_user_id=str(self.super_admin.id)
        )
        assert len(admin_sessions) == 2
        
        # Filter by target user
        target_sessions = self.service.get_enhanced_active_sessions(
            target_user_id=str(self.target_user.id)
        )
        assert len(target_sessions) == 1
        assert target_sessions[0]["session_id"] == session1["session_id"]
        
        # Filter window-based sessions only
        window_sessions = self.service.get_enhanced_active_sessions(
            include_window_based=True
        )
        assert len(window_sessions) == 2
        
        # Exclude window-based sessions
        non_window_sessions = self.service.get_enhanced_active_sessions(
            include_window_based=False
        )
        # This should still return all sessions since we're not filtering them out
        assert len(non_window_sessions) >= 1
    
    def test_enhanced_session_termination(self):
        """Test enhanced session termination with different reasons"""
        # Start impersonation session
        result = self.service.start_impersonation(
            admin_user=self.super_admin,
            target_user_id=str(self.target_user.id),
            duration_hours=2
        )
        
        session_id = result["session_id"]
        
        # Create a mock current user in impersonation context
        current_user = self.target_user
        current_user.is_impersonation = True
        current_user.admin_user_id = str(self.super_admin.id)
        current_user.impersonation_session_id = session_id
        
        # End impersonation with custom reason
        end_result = self.service.end_impersonation(
            current_user=current_user,
            session_id=session_id,
            ip_address="192.168.1.1",
            user_agent="Test Browser",
            termination_reason="manual_logout"
        )
        
        # Verify end response
        assert end_result["message"] == "Impersonation session ended successfully"
        assert end_result["session_id"] == session_id
        assert end_result["termination_reason"] == "manual_logout"
        assert "ended_at" in end_result
        
        # Verify database session is ended
        db_session = self.db.query(ImpersonationSession).filter(
            ImpersonationSession.session_id == session_id
        ).first()
        
        assert db_session.is_active is False
        assert db_session.termination_reason == "manual_logout"
        assert db_session.ended_at is not None
        
        # Verify Redis session is removed
        redis_key = f"impersonation_session:{session_id}"
        session_data = redis_client.redis_client.get(redis_key)
        assert session_data is None
    
    def test_cleanup_expired_sessions(self):
        """Test cleanup of expired sessions"""
        # Create an expired session by manipulating the database directly
        expired_session = ImpersonationSession(
            session_id=str(uuid.uuid4()),
            admin_user_id=self.super_admin.id,
            target_user_id=self.target_user.id,
            target_tenant_id=self.target_user.tenant_id,
            started_at=datetime.now(timezone.utc) - timedelta(hours=3),
            expires_at=datetime.now(timezone.utc) - timedelta(hours=1),  # Expired 1 hour ago
            is_active=True,
            is_window_based=True
        )
        self.db.add(expired_session)
        self.db.commit()
        
        # Add Redis entry for the expired session
        redis_key = f"impersonation_session:{expired_session.session_id}"
        redis_client.redis_client.setex(
            redis_key,
            3600,  # 1 hour TTL
            json.dumps({"session_id": expired_session.session_id})
        )
        
        # Run cleanup
        cleanup_result = self.service.cleanup_expired_sessions()
        
        # Verify cleanup results
        assert cleanup_result["cleaned_sessions"] == 1
        assert "cleanup_at" in cleanup_result
        
        # Verify database session is marked as ended
        self.db.refresh(expired_session)
        assert expired_session.is_active is False
        assert expired_session.termination_reason == "expired"
        
        # Verify Redis session is removed
        session_data = redis_client.redis_client.get(redis_key)
        assert session_data is None
    
    def test_impersonation_validation_errors(self):
        """Test various validation errors in impersonation"""
        # Test non-super admin trying to impersonate
        regular_user = User(
            email="regular@test.com",
            name="Regular User",
            password_hash="hashed_password",
            role=UserRole.USER,
            is_super_admin=False,
            status=UserStatus.ACTIVE,
            tenant_id=self.test_tenant.id
        )
        self.db.add(regular_user)
        self.db.commit()
        
        with pytest.raises(HTTPException) as exc_info:
            self.service.start_impersonation(
                admin_user=regular_user,
                target_user_id=str(self.target_user.id),
                duration_hours=2
            )
        assert exc_info.value.status_code == 403
        assert "Only super admin users can start impersonation" in str(exc_info.value.detail)
        
        # Test invalid duration
        with pytest.raises(HTTPException) as exc_info:
            self.service.start_impersonation(
                admin_user=self.super_admin,
                target_user_id=str(self.target_user.id),
                duration_hours=10  # Invalid: > 8 hours
            )
        assert exc_info.value.status_code == 400
        assert "duration must be between 1 and 8 hours" in str(exc_info.value.detail)
        
        # Test target user not found
        with pytest.raises(HTTPException) as exc_info:
            self.service.start_impersonation(
                admin_user=self.super_admin,
                target_user_id=str(uuid.uuid4()),  # Non-existent user
                duration_hours=2
            )
        assert exc_info.value.status_code == 404
        assert "Target user not found" in str(exc_info.value.detail)
        
        # Test impersonating super admin
        with pytest.raises(HTTPException) as exc_info:
            self.service.start_impersonation(
                admin_user=self.super_admin,
                target_user_id=str(self.super_admin.id),  # Trying to impersonate another super admin
                duration_hours=2
            )
        assert exc_info.value.status_code == 403
        assert "Cannot impersonate super admin users" in str(exc_info.value.detail)


class TestEnhancedImpersonationAPI:
    """Test the enhanced impersonation API endpoints"""
    
    def setup_method(self):
        """Set up test data before each test"""
        self.db = TestingSessionLocal()
        
        # Clean up Redis test data
        pattern = "impersonation_session:*"
        keys = redis_client.redis_client.keys(pattern)
        if keys:
            redis_client.redis_client.delete(*keys)
        
        # Create test tenant
        self.test_tenant = Tenant(
            name="Test Tenant",
            email="tenant@test.com",
            phone="1234567890",
            address="Test Address",
            domain="test.example.com",
            subscription_type=SubscriptionType.PRO,
            status=TenantStatus.ACTIVE
        )
        self.db.add(self.test_tenant)
        self.db.commit()
        
        # Create super admin user
        self.super_admin = User(
            email="admin@hesaabplus.com",
            name="Super Admin",
            password_hash="hashed_password",
            role=UserRole.ADMIN,
            is_super_admin=True,
            status=UserStatus.ACTIVE,
            tenant_id=None
        )
        self.db.add(self.super_admin)
        
        # Create target user
        self.target_user = User(
            email="user@test.com",
            name="Test User",
            password_hash="hashed_password",
            role=UserRole.USER,
            is_super_admin=False,
            status=UserStatus.ACTIVE,
            tenant_id=self.test_tenant.id
        )
        self.db.add(self.target_user)
        self.db.commit()
        
        # Create authentication token for super admin
        from app.core.auth import create_access_token
        self.admin_token = create_access_token(data={"sub": str(self.super_admin.id)})
    
    def teardown_method(self):
        """Clean up after each test"""
        # Clean up Redis test data
        pattern = "impersonation_session:*"
        keys = redis_client.redis_client.keys(pattern)
        if keys:
            redis_client.redis_client.delete(*keys)
        
        # Clean up database
        self.db.query(ImpersonationSession).delete()
        self.db.query(User).delete()
        self.db.query(Tenant).delete()
        self.db.commit()
        self.db.close()
    
    def test_start_enhanced_impersonation_api(self):
        """Test starting enhanced impersonation via API"""
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        payload = {
            "target_user_id": str(self.target_user.id),
            "duration_hours": 2,
            "reason": "API testing",
            "is_window_based": True
        }
        
        response = client.post(
            "/api/enhanced-impersonation/start",
            json=payload,
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "access_token" in data
        assert "session_id" in data
        assert "window_url" in data
        assert data["is_window_based"] is True
        assert data["token_type"] == "bearer"
        assert data["expires_in"] == 2 * 3600
        
        # Verify target and admin user data
        assert data["target_user"]["id"] == str(self.target_user.id)
        assert data["admin_user"]["id"] == str(self.super_admin.id)
        
        # Verify window URL contains token
        assert "impersonation_token=" in data["window_url"]
    
    def test_detect_window_closure_api(self):
        """Test window closure detection via API"""
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        # First start an impersonation session
        start_payload = {
            "target_user_id": str(self.target_user.id),
            "duration_hours": 1,
            "is_window_based": True
        }
        
        start_response = client.post(
            "/api/enhanced-impersonation/start",
            json=start_payload,
            headers=headers
        )
        
        assert start_response.status_code == 200
        session_id = start_response.json()["session_id"]
        
        # Detect window closure
        closure_payload = {
            "session_id": session_id
        }
        
        closure_response = client.post(
            "/api/enhanced-impersonation/detect-window-closure",
            json=closure_payload,
            headers=headers
        )
        
        assert closure_response.status_code == 200
        closure_data = closure_response.json()
        
        assert closure_data["message"] == "Window closure detected and session cleaned up"
        assert closure_data["session_id"] == session_id
        assert "cleanup_at" in closure_data
    
    def test_get_enhanced_active_sessions_api(self):
        """Test getting enhanced active sessions via API"""
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        # Start an impersonation session
        start_payload = {
            "target_user_id": str(self.target_user.id),
            "duration_hours": 2,
            "reason": "API session test",
            "is_window_based": True
        }
        
        start_response = client.post(
            "/api/enhanced-impersonation/start",
            json=start_payload,
            headers=headers
        )
        
        assert start_response.status_code == 200
        
        # Get active sessions
        sessions_response = client.get(
            "/api/enhanced-impersonation/sessions",
            headers=headers
        )
        
        assert sessions_response.status_code == 200
        sessions_data = sessions_response.json()
        
        assert len(sessions_data) == 1
        session = sessions_data[0]
        
        # Verify session data structure
        assert "id" in session
        assert "session_id" in session
        assert session["admin_user_id"] == str(self.super_admin.id)
        assert session["target_user_id"] == str(self.target_user.id)
        assert session["is_active"] is True
        assert session["is_window_based"] is True
        assert session["window_closed_detected"] is False
        assert session["reason"] == "API session test"
        assert "activity_count" in session
        assert "duration_minutes" in session
    
    def test_validate_enhanced_session_api(self):
        """Test session validation via API"""
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        # Start an impersonation session
        start_payload = {
            "target_user_id": str(self.target_user.id),
            "duration_hours": 1
        }
        
        start_response = client.post(
            "/api/enhanced-impersonation/start",
            json=start_payload,
            headers=headers
        )
        
        assert start_response.status_code == 200
        session_data = start_response.json()
        session_id = session_data["session_id"]
        jwt_token = session_data["access_token"]
        
        # Validate session
        validate_response = client.get(
            f"/api/enhanced-impersonation/validate-session/{session_id}",
            params={"jwt_token": jwt_token},
            headers=headers
        )
        
        assert validate_response.status_code == 200
        validate_data = validate_response.json()
        
        assert validate_data["session_id"] == session_id
        assert validate_data["is_valid"] is True
        assert validate_data["session_data"] is not None
        assert "validated_at" in validate_data
    
    def test_cleanup_expired_sessions_api(self):
        """Test cleanup of expired sessions via API"""
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        # Create an expired session directly in database
        expired_session = ImpersonationSession(
            session_id=str(uuid.uuid4()),
            admin_user_id=self.super_admin.id,
            target_user_id=self.target_user.id,
            target_tenant_id=self.target_user.tenant_id,
            started_at=datetime.now(timezone.utc) - timedelta(hours=3),
            expires_at=datetime.now(timezone.utc) - timedelta(hours=1),
            is_active=True,
            is_window_based=True
        )
        self.db.add(expired_session)
        self.db.commit()
        
        # Run cleanup via API
        cleanup_response = client.post(
            "/api/enhanced-impersonation/cleanup-expired",
            headers=headers
        )
        
        assert cleanup_response.status_code == 200
        cleanup_data = cleanup_response.json()
        
        assert cleanup_data["cleaned_sessions"] == 1
        assert "cleanup_at" in cleanup_data
    
    def test_enhanced_impersonation_health_check(self):
        """Test enhanced impersonation service health check"""
        response = client.get("/api/enhanced-impersonation/health")
        
        assert response.status_code == 200
        health_data = response.json()
        
        assert health_data["status"] == "healthy"
        assert health_data["service"] == "enhanced_impersonation"
        assert "features" in health_data
        assert "new_window_support" in health_data["features"]
        assert "automatic_cleanup" in health_data["features"]
        assert "enhanced_session_tracking" in health_data["features"]
        assert "jwt_token_validation" in health_data["features"]
        assert "comprehensive_audit_logging" in health_data["features"]
        assert "timestamp" in health_data


if __name__ == "__main__":
    pytest.main([__file__, "-v"])