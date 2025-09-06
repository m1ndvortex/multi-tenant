"""
Comprehensive unit tests for Super Admin authentication system
Tests enhanced security validation, platform-wide access claims, and audit trail
"""

import pytest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
import json

from app.main import app
from app.core.database import get_db
from app.core.auth import (
    authenticate_super_admin, 
    create_super_admin_tokens,
    create_super_admin_access_token,
    verify_token
)
from app.models.user import User, UserRole, UserStatus
from app.models.authentication_log import AuthenticationLog
from app.services.auth_logging_service import AuthLoggingService


class TestSuperAdminAuthentication:
    """Test Super Admin authentication with enhanced security"""
    
    def test_authenticate_super_admin_success(self, db_session: Session, super_admin_user: User):
        """Test successful super admin authentication"""
        # Test authentication
        authenticated_user = authenticate_super_admin(
            db=db_session,
            email=super_admin_user.email,
            password="superadmin123"
        )
        
        assert authenticated_user is not None
        assert authenticated_user.id == super_admin_user.id
        assert authenticated_user.is_super_admin is True
        
        # Verify successful login was logged
        auth_logs = db_session.query(AuthenticationLog).filter(
            AuthenticationLog.email == super_admin_user.email,
            AuthenticationLog.success == True
        ).all()
        
        assert len(auth_logs) > 0
        latest_log = auth_logs[-1]
        assert latest_log.event_type == "login_success"
        assert str(latest_log.user_id) == str(super_admin_user.id)
    
    def test_authenticate_super_admin_invalid_password(self, db_session: Session, super_admin_user: User):
        """Test super admin authentication with invalid password"""
        authenticated_user = authenticate_super_admin(
            db=db_session,
            email=super_admin_user.email,
            password="wrongpassword"
        )
        
        assert authenticated_user is None
        
        # Verify failed login was logged
        auth_logs = db_session.query(AuthenticationLog).filter(
            AuthenticationLog.email == super_admin_user.email,
            AuthenticationLog.success == False,
            AuthenticationLog.failure_reason == "invalid_super_admin_password"
        ).all()
        
        assert len(auth_logs) > 0
    
    def test_authenticate_super_admin_user_not_found(self, db_session: Session):
        """Test super admin authentication with non-existent user"""
        authenticated_user = authenticate_super_admin(
            db=db_session,
            email="nonexistent@example.com",
            password="password123"
        )
        
        assert authenticated_user is None
        
        # Verify failed login was logged
        auth_logs = db_session.query(AuthenticationLog).filter(
            AuthenticationLog.email == "nonexistent@example.com",
            AuthenticationLog.success == False,
            AuthenticationLog.failure_reason == "super_admin_not_found"
        ).all()
        
        assert len(auth_logs) > 0
    
    def test_authenticate_super_admin_not_super_admin(self, db_session: Session, regular_user: User):
        """Test authentication with regular user (not super admin)"""
        authenticated_user = authenticate_super_admin(
            db=db_session,
            email=regular_user.email,
            password="password123"
        )
        
        assert authenticated_user is None
        
        # Verify failed login was logged
        auth_logs = db_session.query(AuthenticationLog).filter(
            AuthenticationLog.email == regular_user.email,
            AuthenticationLog.success == False,
            AuthenticationLog.failure_reason == "super_admin_not_found"
        ).all()
        
        assert len(auth_logs) > 0
    
    def test_authenticate_super_admin_email_not_verified(self, db_session: Session, super_admin_user: User):
        """Test super admin authentication with unverified email"""
        # Set email as not verified
        super_admin_user.is_email_verified = False
        db_session.commit()
        
        authenticated_user = authenticate_super_admin(
            db=db_session,
            email=super_admin_user.email,
            password="superadmin123"
        )
        
        assert authenticated_user is None
        
        # Verify failed login was logged
        auth_logs = db_session.query(AuthenticationLog).filter(
            AuthenticationLog.email == super_admin_user.email,
            AuthenticationLog.success == False,
            AuthenticationLog.failure_reason == "super_admin_email_not_verified"
        ).all()
        
        assert len(auth_logs) > 0
    
    def test_authenticate_super_admin_account_locked(self, db_session: Session, super_admin_user: User):
        """Test super admin authentication with locked account"""
        auth_logger = AuthLoggingService(db_session)
        
        # Create multiple failed login attempts to trigger lockout
        for i in range(4):
            auth_logger.log_failed_login(
                email=super_admin_user.email,
                tenant_id=None,
                reason="invalid_super_admin_password",
                ip_address="127.0.0.1"
            )
        
        # Now try to authenticate
        authenticated_user = authenticate_super_admin(
            db=db_session,
            email=super_admin_user.email,
            password="superadmin123"
        )
        
        assert authenticated_user is None
        
        # Verify account locked was logged
        auth_logs = db_session.query(AuthenticationLog).filter(
            AuthenticationLog.email == super_admin_user.email,
            AuthenticationLog.success == False,
            AuthenticationLog.failure_reason == "super_admin_account_locked"
        ).all()
        
        assert len(auth_logs) > 0


class TestSuperAdminTokens:
    """Test Super Admin JWT token creation and validation"""
    
    def test_create_super_admin_access_token(self, super_admin_user: User):
        """Test creation of super admin access token with platform-wide claims"""
        token_data = {
            "user_id": str(super_admin_user.id),
            "email": super_admin_user.email,
            "role": super_admin_user.role.value
        }
        
        token = create_super_admin_access_token(token_data)
        assert token is not None
        
        # Verify token payload
        payload = verify_token(token)
        assert payload["user_id"] == str(super_admin_user.id)
        assert payload["is_super_admin"] is True
        assert payload["platform_access"] is True
        assert payload["security_level"] == "maximum"
        assert "permissions" in payload
        assert "tenant_management" in payload["permissions"]
        assert "user_impersonation" in payload["permissions"]
        assert "system_monitoring" in payload["permissions"]
    
    def test_create_super_admin_tokens(self, super_admin_user: User):
        """Test creation of complete super admin token set"""
        tokens = create_super_admin_tokens(super_admin_user)
        
        assert "access_token" in tokens
        assert "refresh_token" in tokens
        assert tokens["token_type"] == "bearer"
        assert tokens["expires_in"] == 4 * 60 * 60  # 4 hours
        assert tokens["security_level"] == "maximum"
        
        # Verify access token payload
        access_payload = verify_token(tokens["access_token"])
        assert access_payload["is_super_admin"] is True
        assert access_payload["platform_access"] is True
        assert access_payload["security_level"] == "maximum"
        
        # Verify refresh token payload
        refresh_payload = verify_token(tokens["refresh_token"])
        assert refresh_payload["user_id"] == str(super_admin_user.id)
        assert refresh_payload["is_super_admin"] is True
    
    def test_super_admin_token_extended_expiry(self, super_admin_user: User):
        """Test that super admin tokens have extended expiry times"""
        tokens = create_super_admin_tokens(super_admin_user)
        
        access_payload = verify_token(tokens["access_token"])
        refresh_payload = verify_token(tokens["refresh_token"])
        
        # Check that access token expires in ~4 hours
        access_exp = datetime.fromtimestamp(access_payload["exp"])
        now = datetime.utcnow()
        access_duration = access_exp - now
        
        # Should be close to 4 hours (allowing for small time differences)
        assert 3.9 * 3600 <= access_duration.total_seconds() <= 4.1 * 3600
        
        # Check that refresh token expires in ~30 days
        refresh_exp = datetime.fromtimestamp(refresh_payload["exp"])
        refresh_duration = refresh_exp - now
        
        # Should be close to 30 days
        assert 29 * 24 * 3600 <= refresh_duration.total_seconds() <= 31 * 24 * 3600


class TestSuperAdminLoginAPI:
    """Test Super Admin login API endpoints"""
    
    def test_super_admin_login_success(self, client: TestClient, db_session: Session, super_admin_user: User):
        """Test successful super admin login via API"""
        login_data = {
            "email": super_admin_user.email,
            "password": "superadmin123"
        }
        
        response = client.post("/api/auth/super-admin/login", json=login_data)
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"
        assert data["expires_in"] == 4 * 60 * 60
        assert data["security_level"] == "maximum"
        
        # Verify user data
        assert data["user"]["id"] == str(super_admin_user.id)
        assert data["user"]["is_super_admin"] is True
        
        # Verify platform permissions
        assert "platform_permissions" in data
        expected_permissions = [
            "tenant_management",
            "user_impersonation", 
            "system_monitoring",
            "backup_recovery",
            "disaster_recovery",
            "analytics_access",
            "error_management",
            "platform_configuration"
        ]
        for permission in expected_permissions:
            assert permission in data["platform_permissions"]
        
        # Verify session info
        assert "session_info" in data
        session_info = data["session_info"]
        assert session_info["security_level"] == "maximum"
        assert session_info["platform_access"] is True
        assert "login_time" in session_info
        assert "expires_at" in session_info
    
    def test_super_admin_login_invalid_credentials(self, client: TestClient, super_admin_user: User):
        """Test super admin login with invalid credentials"""
        login_data = {
            "email": super_admin_user.email,
            "password": "wrongpassword"
        }
        
        response = client.post("/api/auth/super-admin/login", json=login_data)
        
        assert response.status_code == 401
        assert "Invalid super admin credentials" in response.json()["detail"]
    
    def test_super_admin_login_regular_user(self, client: TestClient, regular_user: User):
        """Test super admin login with regular user credentials"""
        login_data = {
            "email": regular_user.email,
            "password": "password123"
        }
        
        response = client.post("/api/auth/super-admin/login", json=login_data)
        
        assert response.status_code == 401
        assert "Invalid super admin credentials" in response.json()["detail"]
    
    def test_super_admin_validate_session(self, client: TestClient, super_admin_user: User):
        """Test super admin session validation endpoint"""
        # First login to get token
        login_data = {
            "email": super_admin_user.email,
            "password": "superadmin123"
        }
        
        login_response = client.post("/api/auth/super-admin/login", json=login_data)
        assert login_response.status_code == 200
        
        token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Validate session
        response = client.get("/api/auth/super-admin/validate-session", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["session_valid"] is True
        assert data["security_level"] == "maximum"
        assert data["platform_access"] is True
        assert data["user"]["id"] == str(super_admin_user.id)
        
        # Verify platform permissions
        expected_permissions = [
            "tenant_management",
            "user_impersonation", 
            "system_monitoring",
            "backup_recovery",
            "disaster_recovery",
            "analytics_access",
            "error_management",
            "platform_configuration"
        ]
        for permission in expected_permissions:
            assert permission in data["platform_permissions"]
    
    def test_super_admin_logout(self, client: TestClient, super_admin_user: User, db_session: Session):
        """Test super admin logout with audit trail"""
        # First login to get token
        login_data = {
            "email": super_admin_user.email,
            "password": "superadmin123"
        }
        
        login_response = client.post("/api/auth/super-admin/login", json=login_data)
        assert login_response.status_code == 200
        
        token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Logout
        response = client.post("/api/auth/super-admin/logout", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        assert "Super admin successfully logged out" in data["message"]
        assert data["security_level"] == "maximum"
        
        # Verify logout was logged
        auth_logs = db_session.query(AuthenticationLog).filter(
            AuthenticationLog.email == super_admin_user.email,
            AuthenticationLog.event_type == "logout"
        ).all()
        
        assert len(auth_logs) > 0
        latest_log = auth_logs[-1]
        assert str(latest_log.user_id) == str(super_admin_user.id)


class TestSuperAdminSecurityFeatures:
    """Test Super Admin security features and audit trail"""
    
    def test_super_admin_login_audit_trail(self, client: TestClient, db_session: Session, super_admin_user: User):
        """Test that super admin login creates comprehensive audit trail"""
        login_data = {
            "email": super_admin_user.email,
            "password": "superadmin123"
        }
        
        # Perform login
        response = client.post("/api/auth/super-admin/login", json=login_data)
        assert response.status_code == 200
        
        # Check audit trail
        auth_logs = db_session.query(AuthenticationLog).filter(
            AuthenticationLog.email == super_admin_user.email,
            AuthenticationLog.success == True
        ).all()
        
        assert len(auth_logs) > 0
        latest_log = auth_logs[-1]
        
        # Verify comprehensive logging
        assert latest_log.event_type == "login_success"
        assert str(latest_log.user_id) == str(super_admin_user.id)
        assert latest_log.ip_address is not None
        assert latest_log.additional_data is not None
        
        # Verify metadata
        metadata = json.loads(latest_log.additional_data)
        assert metadata["auth_type"] == "super_admin_login"
        assert metadata["security_level"] == "maximum"
        assert metadata["platform_access"] is True
    
    def test_super_admin_failed_login_audit_trail(self, client: TestClient, db_session: Session, super_admin_user: User):
        """Test that failed super admin login creates audit trail"""
        login_data = {
            "email": super_admin_user.email,
            "password": "wrongpassword"
        }
        
        # Perform failed login
        response = client.post("/api/auth/super-admin/login", json=login_data)
        assert response.status_code == 401
        
        # Check audit trail
        auth_logs = db_session.query(AuthenticationLog).filter(
            AuthenticationLog.email == super_admin_user.email,
            AuthenticationLog.success == False
        ).all()
        
        assert len(auth_logs) > 0
        latest_log = auth_logs[-1]
        
        # Verify comprehensive logging
        assert latest_log.event_type == "login_failed"
        assert latest_log.failure_reason == "super_admin_authentication_failed"
        assert latest_log.ip_address is not None
        assert latest_log.additional_data is not None
        
        # Verify metadata
        metadata = json.loads(latest_log.additional_data)
        assert metadata["attempt_type"] == "super_admin_login"
        assert metadata["security_level"] == "critical"
    
    def test_super_admin_account_lockout_protection(self, client: TestClient, db_session: Session, super_admin_user: User):
        """Test super admin account lockout after multiple failed attempts"""
        login_data = {
            "email": super_admin_user.email,
            "password": "wrongpassword"
        }
        
        # Make multiple failed login attempts
        for i in range(3):
            response = client.post("/api/auth/super-admin/login", json=login_data)
            assert response.status_code == 401
        
        # Next attempt should be blocked due to lockout
        response = client.post("/api/auth/super-admin/login", json=login_data)
        assert response.status_code == 401
        
        # Check that lockout was logged
        auth_logs = db_session.query(AuthenticationLog).filter(
            AuthenticationLog.email == super_admin_user.email,
            AuthenticationLog.failure_reason == "super_admin_account_locked"
        ).all()
        
        assert len(auth_logs) > 0
    
    def test_super_admin_token_platform_permissions(self, client: TestClient, super_admin_user: User):
        """Test that super admin tokens contain all platform permissions"""
        login_data = {
            "email": super_admin_user.email,
            "password": "superadmin123"
        }
        
        response = client.post("/api/auth/super-admin/login", json=login_data)
        assert response.status_code == 200
        
        data = response.json()
        token = data["access_token"]
        
        # Verify token contains platform permissions
        payload = verify_token(token)
        
        expected_permissions = [
            "tenant_management",
            "user_impersonation", 
            "system_monitoring",
            "backup_recovery",
            "disaster_recovery",
            "analytics_access",
            "error_management",
            "platform_configuration"
        ]
        
        assert payload["platform_access"] is True
        assert payload["security_level"] == "maximum"
        
        for permission in expected_permissions:
            assert permission in payload["permissions"]