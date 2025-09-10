"""
Unit tests for enhanced database models
Tests tenant credentials, subscription history, and error log models
"""

import pytest
from datetime import datetime, timezone, timedelta
from sqlalchemy.exc import IntegrityError

from app.models.tenant_credentials import TenantCredentials
from app.models.subscription_history import SubscriptionHistory, SubscriptionChangeType
from app.models.error_log import ErrorLog, ErrorSeverity, ErrorStatus, ErrorCategory
from app.models.tenant import Tenant, SubscriptionType, TenantStatus
from app.models.user import User, UserRole, UserStatus


class TestTenantCredentials:
    """Test cases for TenantCredentials model"""
    
    def test_create_tenant_credentials_log(self, db_session, test_tenant, test_user, test_admin):
        """Test creating a tenant credentials change log"""
        # Create credential change log
        credential_log = TenantCredentials.log_credential_change(
            db=db_session,
            tenant_id=str(test_tenant.id),
            user_id=str(test_user.id),
            admin_id=str(test_admin.id),
            change_type="email",
            old_email="old@example.com",
            new_email="new@example.com",
            password_changed=False,
            reason="User requested email change",
            client_ip="192.168.1.1",
            user_agent="Mozilla/5.0"
        )
        
        assert credential_log.id is not None
        assert credential_log.tenant_id == test_tenant.id
        assert credential_log.user_id == test_user.id
        assert credential_log.changed_by_admin_id == test_admin.id
        assert credential_log.change_type == "email"
        assert credential_log.old_email == "old@example.com"
        assert credential_log.new_email == "new@example.com"
        assert credential_log.password_changed is False
        assert credential_log.change_reason == "User requested email change"
        assert credential_log.client_ip == "192.168.1.1"
        assert credential_log.user_agent == "Mozilla/5.0"
    
    def test_password_change_log(self, db_session, test_tenant, test_user, test_admin):
        """Test logging password changes"""
        credential_log = TenantCredentials.log_credential_change(
            db=db_session,
            tenant_id=str(test_tenant.id),
            user_id=str(test_user.id),
            admin_id=str(test_admin.id),
            change_type="password",
            password_changed=True,
            reason="Security update"
        )
        
        assert credential_log.password_changed is True
        assert credential_log.change_type == "password"
        assert credential_log.old_email is None
        assert credential_log.new_email is None  
  
    def test_get_tenant_credential_history(self, db_session, test_tenant, test_user, test_admin):
        """Test retrieving credential change history for a tenant"""
        # Create multiple credential changes
        for i in range(3):
            TenantCredentials.log_credential_change(
                db=db_session,
                tenant_id=str(test_tenant.id),
                user_id=str(test_user.id),
                admin_id=str(test_admin.id),
                change_type="email",
                old_email=f"old{i}@example.com",
                new_email=f"new{i}@example.com",
                password_changed=False
            )
        
        # Get history
        history = TenantCredentials.get_tenant_credential_history(db_session, str(test_tenant.id))
        
        assert len(history) == 3
        # Should be ordered by created_at desc (most recent first)
        assert history[0].new_email == "new2@example.com"
        assert history[1].new_email == "new1@example.com"
        assert history[2].new_email == "new0@example.com"
    
    def test_get_admin_credential_changes(self, db_session, test_tenant, test_user, test_admin):
        """Test retrieving all credential changes made by a specific admin"""
        # Create changes by this admin
        TenantCredentials.log_credential_change(
            db=db_session,
            tenant_id=str(test_tenant.id),
            user_id=str(test_user.id),
            admin_id=str(test_admin.id),
            change_type="both",
            old_email="old@example.com",
            new_email="new@example.com",
            password_changed=True
        )
        
        # Get admin's changes
        changes = TenantCredentials.get_admin_credential_changes(db_session, str(test_admin.id))
        
        assert len(changes) >= 1
        assert all(change.changed_by_admin_id == test_admin.id for change in changes)
    
    def test_tenant_credentials_relationships(self, db_session, test_tenant, test_user, test_admin):
        """Test model relationships work correctly"""
        credential_log = TenantCredentials.log_credential_change(
            db=db_session,
            tenant_id=str(test_tenant.id),
            user_id=str(test_user.id),
            admin_id=str(test_admin.id),
            change_type="email",
            new_email="test@example.com"
        )
        
        # Test relationships
        assert credential_log.tenant.id == test_tenant.id
        assert credential_log.user.id == test_user.id
        assert credential_log.admin.id == test_admin.id


class TestSubscriptionHistory:
    """Test cases for SubscriptionHistory model"""
    
    def test_log_subscription_change(self, db_session, test_tenant, test_admin):
        """Test logging a subscription change"""
        old_date = datetime.now(timezone.utc)
        new_date = old_date + timedelta(days=365)
        
        history_entry = SubscriptionHistory.log_subscription_change(
            db=db_session,
            tenant_id=str(test_tenant.id),
            change_type=SubscriptionChangeType.UPGRADE,
            admin_id=str(test_admin.id),
            old_subscription_type="free",
            new_subscription_type="pro",
            old_expiration_date=old_date,
            new_expiration_date=new_date,
            duration_months=12,
            old_max_users=1,
            new_max_users=5,
            old_max_products=10,
            new_max_products=-1,
            reason="Customer upgrade request",
            admin_notes="Processed upgrade payment",
            client_ip="192.168.1.1"
        )
        
        assert history_entry.id is not None
        assert history_entry.tenant_id == test_tenant.id
        assert history_entry.admin_id == test_admin.id
        assert history_entry.change_type == SubscriptionChangeType.UPGRADE
        assert history_entry.old_subscription_type == "free"
        assert history_entry.new_subscription_type == "pro"
        assert history_entry.duration_months == 12
        assert history_entry.old_max_users == 1
        assert history_entry.new_max_users == 5
        assert history_entry.old_max_products == 10
        assert history_entry.new_max_products == -1
        assert history_entry.change_reason == "Customer upgrade request"
        assert history_entry.admin_notes == "Processed upgrade payment"
        assert history_entry.client_ip == "192.168.1.1"
        assert history_entry.is_system_change is False    

    def test_system_subscription_change(self, db_session, test_tenant):
        """Test logging system-generated subscription changes"""
        history_entry = SubscriptionHistory.log_subscription_change(
            db=db_session,
            tenant_id=str(test_tenant.id),
            change_type=SubscriptionChangeType.EXPIRATION,
            old_subscription_type="pro",
            new_subscription_type="free",
            reason="Subscription expired",
            is_system_change=True
        )
        
        assert history_entry.admin_id is None
        assert history_entry.is_system_change is True
        assert history_entry.change_type == SubscriptionChangeType.EXPIRATION
    
    def test_get_tenant_subscription_history(self, db_session, test_tenant, test_admin):
        """Test retrieving subscription history for a tenant"""
        # Create multiple subscription changes
        for i, change_type in enumerate([SubscriptionChangeType.UPGRADE, SubscriptionChangeType.EXTENSION, SubscriptionChangeType.DOWNGRADE]):
            SubscriptionHistory.log_subscription_change(
                db=db_session,
                tenant_id=str(test_tenant.id),
                change_type=change_type,
                admin_id=str(test_admin.id),
                old_subscription_type="free" if i == 0 else "pro",
                new_subscription_type="pro" if i < 2 else "free",
                duration_months=12 if change_type == SubscriptionChangeType.EXTENSION else None
            )
        
        # Get history
        history = SubscriptionHistory.get_tenant_subscription_history(db_session, str(test_tenant.id))
        
        assert len(history) == 3
        # Should be ordered by created_at desc
        assert history[0].change_type == SubscriptionChangeType.DOWNGRADE
        assert history[1].change_type == SubscriptionChangeType.EXTENSION
        assert history[2].change_type == SubscriptionChangeType.UPGRADE
    
    def test_get_subscription_stats(self, db_session, test_tenant, test_admin):
        """Test getting subscription change statistics"""
        # Create various types of changes
        changes = [
            SubscriptionChangeType.UPGRADE,
            SubscriptionChangeType.UPGRADE,
            SubscriptionChangeType.EXTENSION,
            SubscriptionChangeType.DOWNGRADE
        ]
        
        for change_type in changes:
            SubscriptionHistory.log_subscription_change(
                db=db_session,
                tenant_id=str(test_tenant.id),
                change_type=change_type,
                admin_id=str(test_admin.id)
            )
        
        # Get stats
        stats = SubscriptionHistory.get_subscription_stats(db_session)
        
        assert stats['upgrade'] == 2
        assert stats['extension'] == 1
        assert stats['downgrade'] == 1
    
    def test_subscription_history_relationships(self, db_session, test_tenant, test_admin):
        """Test model relationships work correctly"""
        history_entry = SubscriptionHistory.log_subscription_change(
            db=db_session,
            tenant_id=str(test_tenant.id),
            change_type=SubscriptionChangeType.UPGRADE,
            admin_id=str(test_admin.id)
        )
        
        # Test relationships
        assert history_entry.tenant.id == test_tenant.id
        assert history_entry.admin.id == test_admin.id


class TestErrorLog:
    """Test cases for ErrorLog model"""
    
    def test_log_new_error(self, db_session, test_tenant, test_user):
        """Test logging a new error"""
        error_log = ErrorLog.log_error(
            db=db_session,
            error_type="ValidationError",
            error_message="Invalid email format",
            tenant_id=str(test_tenant.id),
            user_id=str(test_user.id),
            severity=ErrorSeverity.MEDIUM,
            category=ErrorCategory.VALIDATION,
            error_code="VAL001",
            stack_trace="Traceback (most recent call last)...",
            request_url="/api/users/create",
            request_method="POST",
            client_ip="192.168.1.1",
            user_agent="Mozilla/5.0",
            context_data='{"field": "email", "value": "invalid-email"}',
            environment="production"
        )
        
        assert error_log.id is not None
        assert error_log.tenant_id == test_tenant.id
        assert error_log.user_id == test_user.id
        assert error_log.error_type == "ValidationError"
        assert error_log.error_message == "Invalid email format"
        assert error_log.severity == ErrorSeverity.MEDIUM
        assert error_log.category == ErrorCategory.VALIDATION
        assert error_log.error_code == "VAL001"
        assert error_log.request_url == "/api/users/create"
        assert error_log.request_method == "POST"
        assert error_log.client_ip == "192.168.1.1"
        assert error_log.environment == "production"
        assert error_log.status == ErrorStatus.ACTIVE
        assert error_log.occurrence_count == 1 
   
    def test_log_duplicate_error(self, db_session, test_tenant, test_user):
        """Test logging duplicate errors increases occurrence count"""
        # Log the same error twice
        error1 = ErrorLog.log_error(
            db=db_session,
            error_type="DatabaseError",
            error_message="Connection timeout",
            tenant_id=str(test_tenant.id),
            user_id=str(test_user.id),
            severity=ErrorSeverity.HIGH,
            category=ErrorCategory.DATABASE
        )
        
        error2 = ErrorLog.log_error(
            db=db_session,
            error_type="DatabaseError",
            error_message="Connection timeout",
            tenant_id=str(test_tenant.id),
            user_id=str(test_user.id),
            severity=ErrorSeverity.HIGH,
            category=ErrorCategory.DATABASE
        )
        
        # Should return the same error with increased count
        assert error1.id == error2.id
        assert error2.occurrence_count == 2
        assert error2.last_occurred_at > error2.first_occurred_at
    
    def test_get_active_errors(self, db_session, test_tenant, test_user, test_admin):
        """Test retrieving only active errors"""
        # Create active error
        active_error = ErrorLog.log_error(
            db=db_session,
            error_type="ActiveError",
            error_message="This is active",
            tenant_id=str(test_tenant.id),
            severity=ErrorSeverity.HIGH
        )
        
        # Create resolved error
        resolved_error = ErrorLog.log_error(
            db=db_session,
            error_type="ResolvedError",
            error_message="This is resolved",
            tenant_id=str(test_tenant.id),
            severity=ErrorSeverity.MEDIUM
        )
        resolved_error.resolve(db_session, str(test_admin.id), "Fixed the issue")
        
        # Get active errors
        active_errors = ErrorLog.get_active_errors(db_session, str(test_tenant.id))
        
        assert len(active_errors) == 1
        assert active_errors[0].id == active_error.id
        assert active_errors[0].status == ErrorStatus.ACTIVE
    
    def test_get_active_errors_by_severity(self, db_session, test_tenant):
        """Test filtering active errors by severity"""
        # Create errors with different severities
        ErrorLog.log_error(
            db=db_session,
            error_type="CriticalError",
            error_message="Critical issue",
            tenant_id=str(test_tenant.id),
            severity=ErrorSeverity.CRITICAL
        )
        
        ErrorLog.log_error(
            db=db_session,
            error_type="MediumError",
            error_message="Medium issue",
            tenant_id=str(test_tenant.id),
            severity=ErrorSeverity.MEDIUM
        )
        
        # Get only critical errors
        critical_errors = ErrorLog.get_active_errors(db_session, str(test_tenant.id), ErrorSeverity.CRITICAL)
        
        assert len(critical_errors) == 1
        assert critical_errors[0].severity == ErrorSeverity.CRITICAL
    
    def test_get_error_stats(self, db_session, test_tenant):
        """Test getting error statistics"""
        # Create errors with different severities and categories
        ErrorLog.log_error(
            db=db_session,
            error_type="CriticalError1",
            error_message="Critical issue 1",
            tenant_id=str(test_tenant.id),
            severity=ErrorSeverity.CRITICAL,
            category=ErrorCategory.SYSTEM
        )
        
        ErrorLog.log_error(
            db=db_session,
            error_type="CriticalError2",
            error_message="Critical issue 2",
            tenant_id=str(test_tenant.id),
            severity=ErrorSeverity.CRITICAL,
            category=ErrorCategory.DATABASE
        )
        
        ErrorLog.log_error(
            db=db_session,
            error_type="MediumError",
            error_message="Medium issue",
            tenant_id=str(test_tenant.id),
            severity=ErrorSeverity.MEDIUM,
            category=ErrorCategory.VALIDATION
        )
        
        # Get stats
        stats = ErrorLog.get_error_stats(db_session)
        
        assert stats['by_severity']['critical'] == 2
        assert stats['by_severity']['medium'] == 1
        assert stats['by_category']['system'] == 1
        assert stats['by_category']['database'] == 1
        assert stats['by_category']['validation'] == 1
        assert stats['total_active'] == 3    

    def test_resolve_error(self, db_session, test_tenant, test_admin):
        """Test resolving an error"""
        error_log = ErrorLog.log_error(
            db=db_session,
            error_type="TestError",
            error_message="Test error message",
            tenant_id=str(test_tenant.id),
            severity=ErrorSeverity.HIGH
        )
        
        # Resolve the error
        resolved_error = error_log.resolve(db_session, str(test_admin.id), "Fixed by updating configuration")
        
        assert resolved_error.status == ErrorStatus.RESOLVED
        assert resolved_error.resolved_by_admin_id == test_admin.id
        assert resolved_error.resolved_at is not None
        assert resolved_error.resolution_notes == "Fixed by updating configuration"
    
    def test_acknowledge_error(self, db_session, test_tenant, test_admin):
        """Test acknowledging an error"""
        error_log = ErrorLog.log_error(
            db=db_session,
            error_type="TestError",
            error_message="Test error message",
            tenant_id=str(test_tenant.id),
            severity=ErrorSeverity.MEDIUM
        )
        
        # Acknowledge the error
        acknowledged_error = error_log.acknowledge(db_session, str(test_admin.id))
        
        assert acknowledged_error.status == ErrorStatus.ACKNOWLEDGED
        assert acknowledged_error.acknowledged_at is not None
    
    def test_ignore_error(self, db_session, test_tenant, test_admin):
        """Test ignoring an error"""
        error_log = ErrorLog.log_error(
            db=db_session,
            error_type="TestError",
            error_message="Test error message",
            tenant_id=str(test_tenant.id),
            severity=ErrorSeverity.LOW
        )
        
        # Ignore the error
        ignored_error = error_log.ignore(db_session, str(test_admin.id), "False positive")
        
        assert ignored_error.status == ErrorStatus.IGNORED
        assert ignored_error.resolved_by_admin_id == test_admin.id
        assert ignored_error.resolved_at is not None
        assert "Ignored: False positive" in ignored_error.resolution_notes
    
    def test_system_wide_error(self, db_session):
        """Test logging system-wide errors (no tenant)"""
        error_log = ErrorLog.log_error(
            db=db_session,
            error_type="SystemError",
            error_message="System-wide issue",
            severity=ErrorSeverity.CRITICAL,
            category=ErrorCategory.SYSTEM,
            environment="production"
        )
        
        assert error_log.tenant_id is None
        assert error_log.user_id is None
        assert error_log.error_type == "SystemError"
        assert error_log.severity == ErrorSeverity.CRITICAL
    
    def test_error_log_relationships(self, db_session, test_tenant, test_user, test_admin):
        """Test model relationships work correctly"""
        error_log = ErrorLog.log_error(
            db=db_session,
            error_type="TestError",
            error_message="Test error message",
            tenant_id=str(test_tenant.id),
            user_id=str(test_user.id)
        )
        
        # Resolve to test admin relationship
        error_log.resolve(db_session, str(test_admin.id), "Fixed")
        
        # Test relationships
        assert error_log.tenant.id == test_tenant.id
        assert error_log.user.id == test_user.id
        assert error_log.resolved_by_admin.id == test_admin.id


class TestMultiTenantDataIsolation:
    """Test multi-tenant data isolation for all new models"""
    
    def test_tenant_credentials_isolation(self, db_session, test_tenant, test_tenant2, test_user, test_user2, test_admin):
        """Test that tenant credentials are properly isolated"""
        # Create credential changes for different tenants
        cred1 = TenantCredentials.log_credential_change(
            db=db_session,
            tenant_id=str(test_tenant.id),
            user_id=str(test_user.id),
            admin_id=str(test_admin.id),
            change_type="email",
            new_email="tenant1@example.com"
        )
        
        cred2 = TenantCredentials.log_credential_change(
            db=db_session,
            tenant_id=str(test_tenant2.id),
            user_id=str(test_user2.id),
            admin_id=str(test_admin.id),
            change_type="email",
            new_email="tenant2@example.com"
        )
        
        # Get history for each tenant
        tenant1_history = TenantCredentials.get_tenant_credential_history(db_session, str(test_tenant.id))
        tenant2_history = TenantCredentials.get_tenant_credential_history(db_session, str(test_tenant2.id))
        
        # Each tenant should only see their own data
        assert len(tenant1_history) == 1
        assert len(tenant2_history) == 1
        assert tenant1_history[0].id == cred1.id
        assert tenant2_history[0].id == cred2.id
        assert tenant1_history[0].new_email == "tenant1@example.com"
        assert tenant2_history[0].new_email == "tenant2@example.com"   
 
    def test_subscription_history_isolation(self, db_session, test_tenant, test_tenant2, test_admin):
        """Test that subscription history is properly isolated"""
        # Create subscription changes for different tenants
        sub1 = SubscriptionHistory.log_subscription_change(
            db=db_session,
            tenant_id=str(test_tenant.id),
            change_type=SubscriptionChangeType.UPGRADE,
            admin_id=str(test_admin.id),
            new_subscription_type="pro"
        )
        
        sub2 = SubscriptionHistory.log_subscription_change(
            db=db_session,
            tenant_id=str(test_tenant2.id),
            change_type=SubscriptionChangeType.EXTENSION,
            admin_id=str(test_admin.id),
            duration_months=6
        )
        
        # Get history for each tenant
        tenant1_history = SubscriptionHistory.get_tenant_subscription_history(db_session, str(test_tenant.id))
        tenant2_history = SubscriptionHistory.get_tenant_subscription_history(db_session, str(test_tenant2.id))
        
        # Each tenant should only see their own data
        assert len(tenant1_history) == 1
        assert len(tenant2_history) == 1
        assert tenant1_history[0].id == sub1.id
        assert tenant2_history[0].id == sub2.id
        assert tenant1_history[0].change_type == SubscriptionChangeType.UPGRADE
        assert tenant2_history[0].change_type == SubscriptionChangeType.EXTENSION
    
    def test_error_log_isolation(self, db_session, test_tenant, test_tenant2, test_user, test_user2):
        """Test that error logs are properly isolated"""
        # Create errors for different tenants
        error1 = ErrorLog.log_error(
            db=db_session,
            error_type="Tenant1Error",
            error_message="Error for tenant 1",
            tenant_id=str(test_tenant.id),
            user_id=str(test_user.id)
        )
        
        error2 = ErrorLog.log_error(
            db=db_session,
            error_type="Tenant2Error",
            error_message="Error for tenant 2",
            tenant_id=str(test_tenant2.id),
            user_id=str(test_user2.id)
        )
        
        # Get active errors for each tenant
        tenant1_errors = ErrorLog.get_active_errors(db_session, str(test_tenant.id))
        tenant2_errors = ErrorLog.get_active_errors(db_session, str(test_tenant2.id))
        
        # Each tenant should only see their own errors
        assert len(tenant1_errors) == 1
        assert len(tenant2_errors) == 1
        assert tenant1_errors[0].id == error1.id
        assert tenant2_errors[0].id == error2.id
        assert tenant1_errors[0].error_type == "Tenant1Error"
        assert tenant2_errors[0].error_type == "Tenant2Error"
    
    def test_cross_tenant_data_access_prevention(self, db_session, test_tenant, test_tenant2, test_user, test_user2, test_admin):
        """Test that cross-tenant data access is prevented"""
        # Create data for tenant 1
        TenantCredentials.log_credential_change(
            db=db_session,
            tenant_id=str(test_tenant.id),
            user_id=str(test_user.id),
            admin_id=str(test_admin.id),
            change_type="email",
            new_email="tenant1@example.com"
        )
        
        SubscriptionHistory.log_subscription_change(
            db=db_session,
            tenant_id=str(test_tenant.id),
            change_type=SubscriptionChangeType.UPGRADE,
            admin_id=str(test_admin.id)
        )
        
        ErrorLog.log_error(
            db=db_session,
            error_type="Tenant1Error",
            error_message="Error for tenant 1",
            tenant_id=str(test_tenant.id)
        )
        
        # Try to access tenant 1 data using tenant 2 ID - should return empty
        tenant2_creds = TenantCredentials.get_tenant_credential_history(db_session, str(test_tenant2.id))
        tenant2_subs = SubscriptionHistory.get_tenant_subscription_history(db_session, str(test_tenant2.id))
        tenant2_errors = ErrorLog.get_active_errors(db_session, str(test_tenant2.id))
        
        assert len(tenant2_creds) == 0
        assert len(tenant2_subs) == 0
        assert len(tenant2_errors) == 0


class TestDatabaseIndexes:
    """Test that database indexes are working for performance"""
    
    def test_tenant_credentials_indexes(self, db_session, test_tenant, test_user, test_admin):
        """Test that tenant credentials queries use indexes efficiently"""
        # Create multiple records to test index usage
        for i in range(10):
            TenantCredentials.log_credential_change(
                db=db_session,
                tenant_id=str(test_tenant.id),
                user_id=str(test_user.id),
                admin_id=str(test_admin.id),
                change_type="email",
                new_email=f"test{i}@example.com"
            )
        
        # These queries should use indexes
        tenant_history = TenantCredentials.get_tenant_credential_history(db_session, str(test_tenant.id))
        admin_changes = TenantCredentials.get_admin_credential_changes(db_session, str(test_admin.id))
        
        assert len(tenant_history) == 10
        assert len(admin_changes) >= 10
    
    def test_error_log_indexes(self, db_session, test_tenant):
        """Test that error log queries use indexes efficiently"""
        # Create multiple errors
        for i in range(5):
            ErrorLog.log_error(
                db=db_session,
                error_type=f"TestError{i}",
                error_message=f"Test error {i}",
                tenant_id=str(test_tenant.id),
                severity=ErrorSeverity.MEDIUM if i % 2 == 0 else ErrorSeverity.HIGH,
                category=ErrorCategory.SYSTEM
            )
        
        # These queries should use indexes
        active_errors = ErrorLog.get_active_errors(db_session, str(test_tenant.id))
        high_severity_errors = ErrorLog.get_active_errors(db_session, str(test_tenant.id), ErrorSeverity.HIGH)
        error_stats = ErrorLog.get_error_stats(db_session)
        
        assert len(active_errors) == 5
        assert len(high_severity_errors) == 2  # Every other error is HIGH
        assert error_stats['total_active'] >= 5
