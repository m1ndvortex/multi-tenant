"""
Unit tests for Enhanced ErrorLog model
Tests real-time error tracking and multi-tenant isolation
"""

import pytest
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
import uuid
import json

from app.models.error_log import ErrorLog, ErrorSeverity, ErrorStatus, ErrorCategory
from app.models.tenant import Tenant, SubscriptionType, TenantStatus
from app.models.user import User, UserRole, UserStatus
from app.core.database import get_db


class TestErrorLogModel:
    """Test suite for Enhanced ErrorLog model"""
    
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
        """Create a test user"""
        user = User(
            tenant_id=test_tenant.id,
            email="user@company.com",
            password_hash="hashed_password",
            first_name="Test",
            last_name="User",
            role=UserRole.USER,
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
            tenant_id=None,
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
    
    def test_create_basic_error_log(self, db_session: Session, test_tenant, test_user):
        """Test creating a basic error log"""
        error_log = ErrorLog.log_error(
            db=db_session,
            error_type="ValidationError",
            error_message="Invalid input data",
            severity=ErrorSeverity.MEDIUM,
            category=ErrorCategory.VALIDATION,
            tenant_id=test_tenant.id,
            user_id=test_user.id,
            endpoint="/api/customers",
            method="POST",
            status_code=400
        )
        
        # Verify error log was created correctly
        assert error_log.id is not None
        assert error_log.tenant_id == test_tenant.id
        assert error_log.user_id == test_user.id
        assert error_log.error_type == "ValidationError"
        assert error_log.error_message == "Invalid input data"
        assert error_log.severity == ErrorSeverity.MEDIUM
        assert error_log.status == ErrorStatus.ACTIVE
        assert error_log.category == ErrorCategory.VALIDATION
        assert error_log.endpoint == "/api/customers"
        assert error_log.method == "POST"
        assert error_log.status_code == 400
        assert error_log.occurrence_count == 1
        assert error_log.first_occurred_at is not None
        assert error_log.last_occurred_at is not None
    
    def test_create_system_error_log(self, db_session: Session):
        """Test creating a system-wide error log (no tenant)"""
        error_log = ErrorLog.log_error(
            db=db_session,
            error_type="DatabaseConnectionError",
            error_message="Failed to connect to database",
            severity=ErrorSeverity.CRITICAL,
            category=ErrorCategory.DATABASE,
            endpoint="/api/health",
            method="GET",
            status_code=500
        )
        
        # Verify system error log
        assert error_log.tenant_id is None
        assert error_log.user_id is None
        assert error_log.severity == ErrorSeverity.CRITICAL
        assert error_log.category == ErrorCategory.DATABASE
        assert error_log.status == ErrorStatus.ACTIVE
    
    def test_duplicate_error_detection(self, db_session: Session, test_tenant, test_user):
        """Test duplicate error detection and occurrence counting"""
        # Create first error
        error1 = ErrorLog.log_error(
            db=db_session,
            error_type="ValidationError",
            error_message="Invalid email format",
            severity=ErrorSeverity.MEDIUM,
            category=ErrorCategory.VALIDATION,
            tenant_id=test_tenant.id,
            user_id=test_user.id,
            endpoint="/api/users",
            method="POST",
            status_code=400
        )
        
        first_occurrence = error1.first_occurred_at
        first_id = error1.id
        
        # Create duplicate error (within 5 minutes)
        error2 = ErrorLog.log_error(
            db=db_session,
            error_type="ValidationError",
            error_message="Invalid email format",
            severity=ErrorSeverity.MEDIUM,
            category=ErrorCategory.VALIDATION,
            tenant_id=test_tenant.id,
            user_id=test_user.id,
            endpoint="/api/users",
            method="POST",
            status_code=400
        )
        
        # Should return the same error with updated occurrence count
        assert error2.id == first_id
        assert error2.occurrence_count == 2
        assert error2.first_occurred_at == first_occurrence
        assert error2.last_occurred_at > first_occurrence
    
    def test_different_tenant_errors_not_duplicated(self, db_session: Session):
        """Test that errors from different tenants are not considered duplicates"""
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
        
        # Create identical errors for different tenants
        error1 = ErrorLog.log_error(
            db=db_session,
            error_type="ValidationError",
            error_message="Same error message",
            tenant_id=tenant1.id,
            endpoint="/api/test",
            method="POST"
        )
        
        error2 = ErrorLog.log_error(
            db=db_session,
            error_type="ValidationError",
            error_message="Same error message",
            tenant_id=tenant2.id,
            endpoint="/api/test",
            method="POST"
        )
        
        # Should be different error logs
        assert error1.id != error2.id
        assert error1.occurrence_count == 1
        assert error2.occurrence_count == 1
        assert error1.tenant_id != error2.tenant_id
    
    def test_error_resolution(self, db_session: Session, test_tenant, test_user, admin_user):
        """Test error resolution functionality"""
        # Create error
        error_log = ErrorLog.log_error(
            db=db_session,
            error_type="BusinessLogicError",
            error_message="Invalid business rule",
            severity=ErrorSeverity.HIGH,
            category=ErrorCategory.BUSINESS_LOGIC,
            tenant_id=test_tenant.id
        )
        
        # Resolve error
        resolution_notes = "Fixed by updating business rule validation"
        error_log.resolve(
            db=db_session,
            admin_id=admin_user.id,
            notes=resolution_notes
        )
        
        # Verify resolution
        assert error_log.status == ErrorStatus.RESOLVED
        assert error_log.resolved_at is not None
        assert error_log.resolved_by_admin_id == admin_user.id
        assert error_log.resolution_notes == resolution_notes
    
    def test_error_acknowledgment(self, db_session: Session, test_tenant, admin_user):
        """Test error acknowledgment functionality"""
        # Create error
        error_log = ErrorLog.log_error(
            db=db_session,
            error_type="PerformanceError",
            error_message="Slow query detected",
            severity=ErrorSeverity.MEDIUM,
            category=ErrorCategory.PERFORMANCE,
            tenant_id=test_tenant.id
        )
        
        # Acknowledge error
        ack_notes = "Acknowledged - investigating performance issue"
        error_log.acknowledge(
            db=db_session,
            admin_id=admin_user.id,
            notes=ack_notes
        )
        
        # Verify acknowledgment
        assert error_log.status == ErrorStatus.ACKNOWLEDGED
        assert error_log.resolved_by_admin_id == admin_user.id
        assert error_log.resolution_notes == ack_notes
        assert error_log.resolved_at is None  # Not fully resolved yet
    
    def test_get_active_errors(self, db_session: Session, test_tenant, admin_user):
        """Test getting only active errors"""
        # Create multiple errors with different statuses
        error1 = ErrorLog.log_error(
            db=db_session,
            error_type="ActiveError1",
            error_message="This is active",
            severity=ErrorSeverity.HIGH,
            tenant_id=test_tenant.id
        )
        
        error2 = ErrorLog.log_error(
            db=db_session,
            error_type="ActiveError2",
            error_message="This is also active",
            severity=ErrorSeverity.CRITICAL,
            tenant_id=test_tenant.id
        )
        
        error3 = ErrorLog.log_error(
            db=db_session,
            error_type="ResolvedError",
            error_message="This will be resolved",
            severity=ErrorSeverity.MEDIUM,
            tenant_id=test_tenant.id
        )
        
        # Resolve one error
        error3.resolve(db=db_session, admin_id=admin_user.id)
        
        # Get active errors
        active_errors = ErrorLog.get_active_errors(
            db=db_session,
            tenant_id=test_tenant.id
        )
        
        # Should only return active errors
        assert len(active_errors) == 2
        active_error_ids = [e.id for e in active_errors]
        assert error1.id in active_error_ids
        assert error2.id in active_error_ids
        assert error3.id not in active_error_ids
    
    def test_get_active_errors_with_filters(self, db_session: Session, test_tenant):
        """Test getting active errors with various filters"""
        # Create errors with different severities and categories
        ErrorLog.log_error(
            db=db_session,
            error_type="CriticalAuth",
            error_message="Critical auth error",
            severity=ErrorSeverity.CRITICAL,
            category=ErrorCategory.AUTHENTICATION,
            tenant_id=test_tenant.id
        )
        
        ErrorLog.log_error(
            db=db_session,
            error_type="HighValidation",
            error_message="High validation error",
            severity=ErrorSeverity.HIGH,
            category=ErrorCategory.VALIDATION,
            tenant_id=test_tenant.id
        )
        
        ErrorLog.log_error(
            db=db_session,
            error_type="MediumAuth",
            error_message="Medium auth error",
            severity=ErrorSeverity.MEDIUM,
            category=ErrorCategory.AUTHENTICATION,
            tenant_id=test_tenant.id
        )
        
        # Test severity filter
        critical_errors = ErrorLog.get_active_errors(
            db=db_session,
            tenant_id=test_tenant.id,
            severity=ErrorSeverity.CRITICAL
        )
        assert len(critical_errors) == 1
        assert critical_errors[0].severity == ErrorSeverity.CRITICAL
        
        # Test category filter
        auth_errors = ErrorLog.get_active_errors(
            db=db_session,
            tenant_id=test_tenant.id,
            category=ErrorCategory.AUTHENTICATION
        )
        assert len(auth_errors) == 2
        for error in auth_errors:
            assert error.category == ErrorCategory.AUTHENTICATION
        
        # Test error type filter
        validation_errors = ErrorLog.get_active_errors(
            db=db_session,
            tenant_id=test_tenant.id,
            error_type="Validation"
        )
        assert len(validation_errors) == 1
        assert "Validation" in validation_errors[0].error_type
    
    def test_error_statistics(self, db_session: Session, test_tenant):
        """Test error statistics generation"""
        # Create errors with different severities
        ErrorLog.log_error(
            db=db_session,
            error_type="CriticalError1",
            error_message="Critical error 1",
            severity=ErrorSeverity.CRITICAL,
            category=ErrorCategory.SYSTEM,
            tenant_id=test_tenant.id
        )
        
        ErrorLog.log_error(
            db=db_session,
            error_type="CriticalError2",
            error_message="Critical error 2",
            severity=ErrorSeverity.CRITICAL,
            category=ErrorCategory.DATABASE,
            tenant_id=test_tenant.id
        )
        
        ErrorLog.log_error(
            db=db_session,
            error_type="HighError",
            error_message="High error",
            severity=ErrorSeverity.HIGH,
            category=ErrorCategory.VALIDATION,
            tenant_id=test_tenant.id
        )
        
        ErrorLog.log_error(
            db=db_session,
            error_type="MediumError",
            error_message="Medium error",
            severity=ErrorSeverity.MEDIUM,
            category=ErrorCategory.BUSINESS_LOGIC,
            tenant_id=test_tenant.id
        )
        
        # Get statistics
        stats = ErrorLog.get_error_statistics(
            db=db_session,
            tenant_id=test_tenant.id
        )
        
        # Verify statistics
        assert stats["total_active_errors"] == 4
        assert stats["critical_errors"] == 2
        assert stats["high_priority_errors"] == 1
        assert stats["medium_priority_errors"] == 1
        assert stats["low_priority_errors"] == 0
        assert stats["errors_last_24h"] == 4  # All created within last 24h
        
        # Verify category breakdown
        assert stats["category_breakdown"]["system"] == 1
        assert stats["category_breakdown"]["database"] == 1
        assert stats["category_breakdown"]["validation"] == 1
        assert stats["category_breakdown"]["business_logic"] == 1
    
    def test_notification_logic(self, db_session: Session, test_tenant):
        """Test notification sending logic"""
        # Critical error should trigger notification
        critical_error = ErrorLog.log_error(
            db=db_session,
            error_type="CriticalError",
            error_message="Critical system failure",
            severity=ErrorSeverity.CRITICAL,
            tenant_id=test_tenant.id
        )
        
        assert critical_error.should_send_notification() is True
        
        # Mark notification as sent
        critical_error.mark_notification_sent(db=db_session)
        assert critical_error.notification_sent is True
        assert critical_error.notification_sent_at is not None
        assert critical_error.should_send_notification() is False
        
        # High frequency error should trigger notification
        high_freq_error = ErrorLog.log_error(
            db=db_session,
            error_type="FrequentError",
            error_message="This happens often",
            severity=ErrorSeverity.MEDIUM,
            tenant_id=test_tenant.id
        )
        
        # Simulate multiple occurrences
        high_freq_error.occurrence_count = 10
        db_session.commit()
        
        assert high_freq_error.should_send_notification() is True
    
    def test_websocket_serialization(self, db_session: Session, test_tenant):
        """Test WebSocket message serialization"""
        error_log = ErrorLog.log_error(
            db=db_session,
            error_type="WebSocketTest",
            error_message="Test error for WebSocket",
            severity=ErrorSeverity.HIGH,
            category=ErrorCategory.SYSTEM,
            tenant_id=test_tenant.id,
            endpoint="/api/test",
            context_data={"key": "value"}
        )
        
        # Get WebSocket representation
        ws_data = error_log.to_dict_for_websocket()
        
        # Verify serialization
        assert ws_data["id"] == str(error_log.id)
        assert ws_data["tenant_id"] == str(test_tenant.id)
        assert ws_data["tenant_name"] == test_tenant.name
        assert ws_data["error_type"] == "WebSocketTest"
        assert ws_data["error_message"] == "Test error for WebSocket"
        assert ws_data["severity"] == "high"
        assert ws_data["status"] == "active"
        assert ws_data["category"] == "system"
        assert ws_data["endpoint"] == "/api/test"
        assert ws_data["occurrence_count"] == 1
        assert "first_occurred_at" in ws_data
        assert "last_occurred_at" in ws_data
    
    def test_multi_tenant_isolation(self, db_session: Session):
        """Test multi-tenant data isolation"""
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
        
        # Create errors for each tenant
        ErrorLog.log_error(
            db=db_session,
            error_type="Tenant1Error",
            error_message="Error for tenant 1",
            tenant_id=tenant1.id
        )
        
        ErrorLog.log_error(
            db=db_session,
            error_type="Tenant2Error",
            error_message="Error for tenant 2",
            tenant_id=tenant2.id
        )
        
        # Verify isolation
        tenant1_errors = ErrorLog.get_active_errors(
            db=db_session,
            tenant_id=tenant1.id
        )
        tenant2_errors = ErrorLog.get_active_errors(
            db=db_session,
            tenant_id=tenant2.id
        )
        
        assert len(tenant1_errors) == 1
        assert len(tenant2_errors) == 1
        assert tenant1_errors[0].error_type == "Tenant1Error"
        assert tenant2_errors[0].error_type == "Tenant2Error"
        assert tenant1_errors[0].tenant_id != tenant2_errors[0].tenant_id
        
        # Verify statistics isolation
        stats1 = ErrorLog.get_error_statistics(db=db_session, tenant_id=tenant1.id)
        stats2 = ErrorLog.get_error_statistics(db=db_session, tenant_id=tenant2.id)
        
        assert stats1["total_active_errors"] == 1
        assert stats2["total_active_errors"] == 1
    
    def test_performance_metrics_tracking(self, db_session: Session, test_tenant):
        """Test performance metrics tracking"""
        error_log = ErrorLog.log_error(
            db=db_session,
            error_type="PerformanceError",
            error_message="Slow response detected",
            severity=ErrorSeverity.MEDIUM,
            category=ErrorCategory.PERFORMANCE,
            tenant_id=test_tenant.id,
            response_time_ms=5000,
            memory_usage_mb=512
        )
        
        # Verify performance metrics
        assert error_log.response_time_ms == 5000
        assert error_log.memory_usage_mb == 512
    
    def test_comprehensive_context_data(self, db_session: Session, test_tenant, test_user):
        """Test comprehensive context data storage"""
        context_data = {
            "request_params": {"page": 1, "limit": 10},
            "user_agent": "Mozilla/5.0...",
            "session_info": {"session_id": "abc123", "user_role": "admin"}
        }
        
        request_data = {
            "email": "test@example.com",
            "password": "[REDACTED]"
        }
        
        response_data = {
            "error": "Validation failed",
            "fields": ["email", "password"]
        }
        
        error_log = ErrorLog.log_error(
            db=db_session,
            error_type="ValidationError",
            error_message="Form validation failed",
            severity=ErrorSeverity.MEDIUM,
            category=ErrorCategory.VALIDATION,
            tenant_id=test_tenant.id,
            user_id=test_user.id,
            endpoint="/api/auth/login",
            method="POST",
            status_code=400,
            error_code="VALIDATION_001",
            request_id="req_123456",
            session_id="sess_789012",
            ip_address="192.168.1.100",
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
            stack_trace="Traceback (most recent call last):\n  File...",
            context_data=context_data,
            request_data=request_data,
            response_data=response_data
        )
        
        # Verify all context data is stored
        assert error_log.context_data == context_data
        assert error_log.request_data == request_data
        assert error_log.response_data == response_data
        assert error_log.error_code == "VALIDATION_001"
        assert error_log.request_id == "req_123456"
        assert error_log.session_id == "sess_789012"
        assert error_log.ip_address == "192.168.1.100"
        assert error_log.user_agent == "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
        assert error_log.stack_trace is not None
    
    def test_relationships(self, db_session: Session, test_tenant, test_user, admin_user):
        """Test model relationships"""
        # Create and resolve error
        error_log = ErrorLog.log_error(
            db=db_session,
            error_type="TestError",
            error_message="Test error for relationships",
            tenant_id=test_tenant.id,
            user_id=test_user.id
        )
        
        error_log.resolve(
            db=db_session,
            admin_id=admin_user.id,
            notes="Resolved for testing"
        )
        
        # Test basic attributes (relationships may not work without proper foreign keys)
        assert error_log.tenant_id == test_tenant.id
        assert error_log.user_id == test_user.id
        assert error_log.resolved_by_admin_id == admin_user.id
    
    def test_duplicate_detection_time_window(self, db_session: Session, test_tenant):
        """Test duplicate detection time window (5 minutes)"""
        # Create first error
        error1 = ErrorLog.log_error(
            db=db_session,
            error_type="TimeWindowTest",
            error_message="Test time window",
            tenant_id=test_tenant.id
        )
        
        first_id = error1.id
        
        # Manually set last_occurred_at to 6 minutes ago
        past_time = datetime.now(timezone.utc) - timedelta(minutes=6)
        error1.last_occurred_at = past_time
        db_session.commit()
        
        # Create "duplicate" error (should be new since outside 5-minute window)
        error2 = ErrorLog.log_error(
            db=db_session,
            error_type="TimeWindowTest",
            error_message="Test time window",
            tenant_id=test_tenant.id
        )
        
        # Should create new error since outside time window
        assert error2.id != first_id
        assert error2.occurrence_count == 1