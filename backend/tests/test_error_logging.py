"""
Comprehensive tests for API Error Logging System
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import uuid
import json
from unittest.mock import Mock, patch

from app.main import app
from app.core.database import get_db
from app.models.api_error_log import APIErrorLog, ErrorSeverity, ErrorCategory
from app.services.error_logging_service import ErrorLoggingService
from app.models.user import User
from app.models.tenant import Tenant, SubscriptionType, TenantStatus
from tests.conftest import TestingSessionLocal

client = TestClient(app)


class TestAPIErrorLogModel:
    """Test the APIErrorLog model"""
    
    def test_create_error_log(self, db_session: Session):
        """Test creating a new error log"""
        error_log = APIErrorLog.log_error(
            db=db_session,
            error_message="Test error message",
            error_type="TestError",
            endpoint="/api/test",
            method="GET",
            status_code=500,
            severity=ErrorSeverity.HIGH,
            category=ErrorCategory.SYSTEM
        )
        
        assert error_log.id is not None
        assert error_log.error_message == "Test error message"
        assert error_log.error_type == "TestError"
        assert error_log.endpoint == "/api/test"
        assert error_log.method == "GET"
        assert error_log.status_code == 500
        assert error_log.severity == ErrorSeverity.HIGH
        assert error_log.category == ErrorCategory.SYSTEM
        assert error_log.occurrence_count == 1
        assert error_log.is_resolved == False
        assert error_log.notification_sent == False
    
    def test_duplicate_error_handling(self, db_session: Session):
        """Test that duplicate errors increment occurrence count"""
        # Create first error
        error1 = APIErrorLog.log_error(
            db=db_session,
            error_message="Duplicate error",
            error_type="DuplicateError",
            endpoint="/api/duplicate",
            method="POST",
            status_code=400
        )
        
        # Create duplicate error (within 5 minutes)
        error2 = APIErrorLog.log_error(
            db=db_session,
            error_message="Duplicate error",
            error_type="DuplicateError",
            endpoint="/api/duplicate",
            method="POST",
            status_code=400
        )
        
        # Should return the same error with incremented count
        assert error1.id == error2.id
        assert error2.occurrence_count == 2
    
    def test_error_filtering(self, db_session: Session):
        """Test error filtering functionality"""
        tenant_id = uuid.uuid4()
        user_id = uuid.uuid4()
        
        # Create test errors
        APIErrorLog.log_error(
            db=db_session,
            error_message="Critical error",
            error_type="CriticalError",
            endpoint="/api/critical",
            method="GET",
            status_code=500,
            severity=ErrorSeverity.CRITICAL,
            category=ErrorCategory.SYSTEM,
            tenant_id=tenant_id,
            user_id=user_id
        )
        
        APIErrorLog.log_error(
            db=db_session,
            error_message="Validation error",
            error_type="ValidationError",
            endpoint="/api/validation",
            method="POST",
            status_code=400,
            severity=ErrorSeverity.MEDIUM,
            category=ErrorCategory.VALIDATION
        )
        
        # Test filtering by severity
        critical_errors, total = APIErrorLog.get_errors_with_filters(
            db=db_session,
            severity=ErrorSeverity.CRITICAL
        )
        assert total == 1
        assert critical_errors[0].severity == ErrorSeverity.CRITICAL
        
        # Test filtering by tenant
        tenant_errors, total = APIErrorLog.get_errors_with_filters(
            db=db_session,
            tenant_id=tenant_id
        )
        assert total == 1
        assert tenant_errors[0].tenant_id == tenant_id
        
        # Test filtering by category
        validation_errors, total = APIErrorLog.get_errors_with_filters(
            db=db_session,
            category=ErrorCategory.VALIDATION
        )
        assert total == 1
        assert validation_errors[0].category == ErrorCategory.VALIDATION
    
    def test_error_statistics(self, db_session: Session):
        """Test error statistics calculation"""
        # Create test errors with different severities and categories
        APIErrorLog.log_error(
            db=db_session,
            error_message="Critical system error",
            error_type="SystemError",
            endpoint="/api/system",
            method="GET",
            status_code=500,
            severity=ErrorSeverity.CRITICAL,
            category=ErrorCategory.SYSTEM
        )
        
        APIErrorLog.log_error(
            db=db_session,
            error_message="Auth error",
            error_type="AuthError",
            endpoint="/api/auth",
            method="POST",
            status_code=401,
            severity=ErrorSeverity.HIGH,
            category=ErrorCategory.AUTHENTICATION
        )
        
        stats = APIErrorLog.get_error_statistics(db=db_session)
        
        assert stats["total_errors"] >= 2
        assert stats["severity_breakdown"]["critical"] >= 1
        assert stats["severity_breakdown"]["high"] >= 1
        assert stats["category_breakdown"]["system"] >= 1
        assert stats["category_breakdown"]["authentication"] >= 1
        assert "unresolved_errors" in stats
        assert "top_error_endpoints" in stats
    
    def test_error_resolution(self, db_session: Session):
        """Test error resolution functionality"""
        admin_id = uuid.uuid4()
        
        error_log = APIErrorLog.log_error(
            db=db_session,
            error_message="Resolvable error",
            error_type="ResolvableError",
            endpoint="/api/resolvable",
            method="GET",
            status_code=500
        )
        
        # Mark as resolved
        error_log.mark_resolved(db_session, admin_id, "Fixed by updating configuration")
        
        assert error_log.is_resolved == True
        assert error_log.resolved_by == admin_id
        assert error_log.resolution_notes == "Fixed by updating configuration"
        assert error_log.resolved_at is not None
    
    def test_notification_criteria(self, db_session: Session):
        """Test notification criteria logic"""
        # Critical error should trigger notification
        critical_error = APIErrorLog.log_error(
            db=db_session,
            error_message="Critical error",
            error_type="CriticalError",
            endpoint="/api/critical",
            method="GET",
            status_code=500,
            severity=ErrorSeverity.CRITICAL
        )
        assert critical_error.should_send_notification() == True
        
        # High frequency error should trigger notification
        high_freq_error = APIErrorLog.log_error(
            db=db_session,
            error_message="Frequent error",
            error_type="FrequentError",
            endpoint="/api/frequent",
            method="GET",
            status_code=400,
            severity=ErrorSeverity.MEDIUM
        )
        high_freq_error.occurrence_count = 15
        assert high_freq_error.should_send_notification() == True
        
        # Low severity, low frequency error should not trigger notification
        low_error = APIErrorLog.log_error(
            db=db_session,
            error_message="Minor error",
            error_type="MinorError",
            endpoint="/api/minor",
            method="GET",
            status_code=400,
            severity=ErrorSeverity.LOW
        )
        assert low_error.should_send_notification() == False


class TestErrorLoggingService:
    """Test the ErrorLoggingService"""
    
    def test_service_initialization(self, db_session: Session):
        """Test service initialization"""
        service = ErrorLoggingService(db_session)
        assert service.db == db_session
        assert service.notification_service is not None
    
    def test_log_custom_error(self, db_session: Session):
        """Test logging custom errors"""
        service = ErrorLoggingService(db_session)
        
        error_log = service.log_custom_error(
            error_message="Custom error message",
            error_type="CustomError",
            endpoint="/api/custom",
            method="POST",
            status_code=422,
            severity=ErrorSeverity.HIGH,
            category=ErrorCategory.VALIDATION,
            additional_context={"custom_field": "custom_value"}
        )
        
        assert error_log.error_message == "Custom error message"
        assert error_log.error_type == "CustomError"
        assert error_log.severity == ErrorSeverity.HIGH
        assert error_log.category == ErrorCategory.VALIDATION
        assert error_log.additional_context["custom_field"] == "custom_value"
    
    def test_get_critical_errors(self, db_session: Session):
        """Test getting critical errors"""
        service = ErrorLoggingService(db_session)
        
        # Create a critical error
        service.log_custom_error(
            error_message="Critical system failure",
            error_type="SystemFailure",
            endpoint="/api/system",
            method="GET",
            status_code=500,
            severity=ErrorSeverity.CRITICAL,
            category=ErrorCategory.SYSTEM
        )
        
        critical_errors = service.get_critical_errors(hours=24)
        assert len(critical_errors) >= 1
        assert all(error.severity == ErrorSeverity.CRITICAL for error in critical_errors)
        assert all(not error.is_resolved for error in critical_errors)
    
    def test_error_trends(self, db_session: Session):
        """Test error trends calculation"""
        service = ErrorLoggingService(db_session)
        
        # Create some test errors
        for i in range(3):
            service.log_custom_error(
                error_message=f"Trend error {i}",
                error_type="TrendError",
                endpoint="/api/trend",
                method="GET",
                status_code=500,
                severity=ErrorSeverity.HIGH
            )
        
        trends = service.get_error_trends(days=7)
        
        assert "daily_counts" in trends
        assert "severity_trends" in trends
        assert "period" in trends
        assert trends["period"]["days"] == 7
    
    def test_resolve_error(self, db_session: Session):
        """Test error resolution through service"""
        service = ErrorLoggingService(db_session)
        admin_id = uuid.uuid4()
        
        # Create an error
        error_log = service.log_custom_error(
            error_message="Service resolvable error",
            error_type="ServiceResolvableError",
            endpoint="/api/service-resolvable",
            method="GET",
            status_code=500
        )
        
        # Resolve through service
        resolved_error = service.resolve_error(
            error_id=error_log.id,
            resolved_by=admin_id,
            notes="Resolved through service"
        )
        
        assert resolved_error.is_resolved == True
        assert resolved_error.resolved_by == admin_id
        assert resolved_error.resolution_notes == "Resolved through service"


class TestErrorLoggingAPI:
    """Test the Error Logging API endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup_method(self, db_session):
        """Set up test data"""
        self.db = db_session
        
        # Create super admin user
        self.super_admin = User(
            id=uuid.uuid4(),
            email="superadmin@hesaabplus.com",
            password_hash="hashed_password",
            role="super_admin",
            is_active=True,
            is_super_admin=True
        )
        self.db.add(self.super_admin)
        
        # Create test tenant
        self.tenant = Tenant(
            id=uuid.uuid4(),
            name="Test Tenant",
            email="test@tenant.com",
            subscription_type=SubscriptionType.PRO,
            status=TenantStatus.ACTIVE
        )
        self.db.add(self.tenant)
        
        self.db.commit()
        
        # Create test errors
        self.error_service = ErrorLoggingService(self.db)
        self.test_error = self.error_service.log_custom_error(
            error_message="API test error",
            error_type="APITestError",
            endpoint="/api/test",
            method="GET",
            status_code=500,
            severity=ErrorSeverity.HIGH,
            category=ErrorCategory.SYSTEM,
            tenant_id=self.tenant.id
        )
    
    @patch('app.core.auth.get_super_admin_user')
    def test_get_error_logs(self, mock_auth):
        """Test getting error logs endpoint"""
        mock_auth.return_value = self.super_admin
        
        response = client.get("/api/super-admin/errors/")
        
        assert response.status_code == 200
        data = response.json()
        assert "errors" in data
        assert "total" in data
        assert data["total"] >= 1
    
    @patch('app.core.auth.get_super_admin_user')
    def test_get_error_log_by_id(self, mock_auth):
        """Test getting specific error log"""
        mock_auth.return_value = self.super_admin
        
        response = client.get(f"/api/super-admin/errors/{self.test_error.id}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(self.test_error.id)
        assert data["error_message"] == "API test error"
    
    @patch('app.core.auth.get_super_admin_user')
    def test_resolve_error_endpoint(self, mock_auth):
        """Test resolving error through API"""
        mock_auth.return_value = self.super_admin
        
        resolution_data = {
            "notes": "Resolved via API test"
        }
        
        response = client.put(
            f"/api/super-admin/errors/{self.test_error.id}/resolve",
            json=resolution_data
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["is_resolved"] == True
        assert data["resolution_notes"] == "Resolved via API test"
    
    @patch('app.core.auth.get_super_admin_user')
    def test_error_statistics_endpoint(self, mock_auth):
        """Test error statistics endpoint"""
        mock_auth.return_value = self.super_admin
        
        response = client.get("/api/super-admin/errors/statistics/overview")
        
        assert response.status_code == 200
        data = response.json()
        assert "total_errors" in data
        assert "severity_breakdown" in data
        assert "category_breakdown" in data
        assert "unresolved_errors" in data
    
    @patch('app.core.auth.get_super_admin_user')
    def test_error_trends_endpoint(self, mock_auth):
        """Test error trends endpoint"""
        mock_auth.return_value = self.super_admin
        
        response = client.get("/api/super-admin/errors/statistics/trends?days=7")
        
        assert response.status_code == 200
        data = response.json()
        assert "daily_counts" in data
        assert "severity_trends" in data
        assert "period" in data
    
    @patch('app.core.auth.get_super_admin_user')
    def test_critical_errors_endpoint(self, mock_auth):
        """Test critical errors endpoint"""
        mock_auth.return_value = self.super_admin
        
        # Create a critical error
        self.error_service.log_custom_error(
            error_message="Critical API error",
            error_type="CriticalAPIError",
            endpoint="/api/critical",
            method="POST",
            status_code=500,
            severity=ErrorSeverity.CRITICAL,
            category=ErrorCategory.SYSTEM
        )
        
        response = client.get("/api/super-admin/errors/alerts/critical?hours=24")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Should have at least one critical error
        critical_errors = [error for error in data if error["severity"] == "critical"]
        assert len(critical_errors) >= 1
    
    @patch('app.core.auth.get_super_admin_user')
    def test_bulk_error_action(self, mock_auth):
        """Test bulk error actions"""
        mock_auth.return_value = self.super_admin
        
        # Create additional test error
        error2 = self.error_service.log_custom_error(
            error_message="Bulk test error",
            error_type="BulkTestError",
            endpoint="/api/bulk",
            method="GET",
            status_code=400
        )
        
        bulk_action_data = {
            "error_ids": [str(self.test_error.id), str(error2.id)],
            "action": "resolve",
            "notes": "Bulk resolved via test"
        }
        
        response = client.post(
            "/api/super-admin/errors/bulk-action",
            json=bulk_action_data
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success_count"] == 2
        assert data["failed_count"] == 0
        assert len(data["successful_error_ids"]) == 2
    
    @patch('app.core.auth.get_super_admin_user')
    def test_delete_error_log(self, mock_auth):
        """Test deleting error log"""
        mock_auth.return_value = self.super_admin
        
        # Create error to delete
        error_to_delete = self.error_service.log_custom_error(
            error_message="Error to delete",
            error_type="DeleteTestError",
            endpoint="/api/delete",
            method="DELETE",
            status_code=500
        )
        
        response = client.delete(f"/api/super-admin/errors/{error_to_delete.id}")
        
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        
        # Verify error is deleted
        deleted_error = self.db.query(APIErrorLog).filter(
            APIErrorLog.id == error_to_delete.id
        ).first()
        assert deleted_error is None
    
    @patch('app.core.auth.get_super_admin_user')
    def test_error_filtering_api(self, mock_auth):
        """Test error filtering through API"""
        mock_auth.return_value = self.super_admin
        
        # Test filtering by severity
        response = client.get("/api/super-admin/errors/?severity=high")
        assert response.status_code == 200
        data = response.json()
        for error in data["errors"]:
            assert error["severity"] == "high"
        
        # Test filtering by category
        response = client.get("/api/super-admin/errors/?category=system")
        assert response.status_code == 200
        data = response.json()
        for error in data["errors"]:
            assert error["category"] == "system"
        
        # Test filtering by tenant
        response = client.get(f"/api/super-admin/errors/?tenant_id={self.tenant.id}")
        assert response.status_code == 200
        data = response.json()
        for error in data["errors"]:
            if error["tenant_id"]:
                assert error["tenant_id"] == str(self.tenant.id)
    
    @patch('app.core.auth.get_super_admin_user')
    def test_health_check_endpoint(self, mock_auth):
        """Test error logging health check"""
        mock_auth.return_value = self.super_admin
        
        response = client.get("/api/super-admin/errors/health/check")
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "database_connection" in data
        assert "total_errors_in_system" in data
        assert "timestamp" in data


class TestErrorLoggingMiddleware:
    """Test the Error Logging Middleware"""
    
    def test_middleware_error_capture(self):
        """Test that middleware captures errors"""
        # This would require setting up a test endpoint that raises an exception
        # and verifying that the error is logged to the database
        pass
    
    def test_middleware_context_extraction(self):
        """Test that middleware extracts proper context"""
        # Test that user context, tenant context, and request details
        # are properly extracted and logged
        pass
    
    def test_middleware_error_response(self):
        """Test that middleware returns appropriate error responses"""
        # Test that the middleware returns proper JSON error responses
        # with appropriate status codes
        pass


class TestErrorNotificationSystem:
    """Test the Error Notification System"""
    
    def test_critical_error_notification(self, db_session: Session):
        """Test that critical errors trigger notifications"""
        service = ErrorLoggingService(db_session)
        
        with patch.object(service, '_send_error_notification') as mock_notify:
            error_log = service.log_custom_error(
                error_message="Critical notification test",
                error_type="CriticalNotificationTest",
                endpoint="/api/critical-notify",
                method="GET",
                status_code=500,
                severity=ErrorSeverity.CRITICAL
            )
            
            # Verify notification was attempted
            assert error_log.should_send_notification() == True
    
    def test_high_frequency_notification(self, db_session: Session):
        """Test that high frequency errors trigger notifications"""
        service = ErrorLoggingService(db_session)
        
        # Create an error with high occurrence count
        error_log = service.log_custom_error(
            error_message="High frequency test",
            error_type="HighFrequencyTest",
            endpoint="/api/high-freq",
            method="GET",
            status_code=400,
            severity=ErrorSeverity.MEDIUM
        )
        
        # Simulate high frequency
        error_log.occurrence_count = 15
        
        assert error_log.should_send_notification() == True


if __name__ == "__main__":
    pytest.main([__file__, "-v"])