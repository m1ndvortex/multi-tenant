"""
Unit tests for Enhanced Tenant Management API
Tests all enhanced tenant management functionality with real database operations
"""

import pytest
import bcrypt
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from unittest.mock import patch, MagicMock

from app.main import app
from app.core.database import get_db
from app.models.tenant import Tenant, SubscriptionType, TenantStatus
from app.models.user import User, UserRole, UserStatus
from app.core.auth import create_access_token


@pytest.fixture
def setup_enhanced_tenant_test(db_session):
    """Setup test environment for enhanced tenant management tests"""
    # Create super admin user
    super_admin = User(
        email="superadmin@hesaabplus.com",
        password_hash=bcrypt.hashpw("superadmin123".encode(), bcrypt.gensalt()).decode(),
        first_name="Super",
        last_name="Admin",
        is_super_admin=True,
        role=UserRole.OWNER,
        status=UserStatus.ACTIVE,
        tenant_id=None  # Super admin has no tenant
    )
    db_session.add(super_admin)
    db_session.commit()
    db_session.refresh(super_admin)
    
    # Create super admin token with proper format
    token_data = {
        "user_id": str(super_admin.id),
        "email": super_admin.email,
        "role": super_admin.role.value,
        "is_super_admin": True
    }
    super_admin_token = create_access_token(data=token_data)
    super_admin_headers = {"Authorization": f"Bearer {super_admin_token}"}
    
    # Create test tenant
    test_tenant = Tenant(
        name="Test Business",
        email="owner@testbusiness.com",
        phone="+98-912-345-6789",
        address="Test Address",
        subscription_type=SubscriptionType.FREE,
        status=TenantStatus.ACTIVE,
        business_type="general",
        max_users=1,
        max_products=10,
        max_customers=10,
        max_monthly_invoices=10,
        currency="IRR",
        timezone="Asia/Tehran"
    )
    db_session.add(test_tenant)
    db_session.commit()
    db_session.refresh(test_tenant)
    
    # Create tenant owner user
    tenant_owner = User(
        email="owner@testbusiness.com",
        password_hash=bcrypt.hashpw("owner123".encode(), bcrypt.gensalt()).decode(),
        first_name="Business",
        last_name="Owner",
        role=UserRole.OWNER,
        status=UserStatus.ACTIVE,
        tenant_id=test_tenant.id
    )
    db_session.add(tenant_owner)
    db_session.commit()
    db_session.refresh(tenant_owner)
    
    return {
        "super_admin": super_admin,
        "super_admin_headers": super_admin_headers,
        "test_tenant": test_tenant,
        "tenant_owner": tenant_owner,
        "db": db_session
    }
def test_update_tenant_credentials_email_only(client, setup_enhanced_tenant_test):
    """Test updating tenant owner email only"""
    setup = setup_enhanced_tenant_test
    new_email = "newemail@testbusiness.com"
    
    response = client.put(
        f"/api/enhanced-tenant-management/tenants/{setup['test_tenant'].id}/credentials",
        json={
            "email": new_email,
            "reason": "Email change requested by business owner"
        },
        headers=setup["super_admin_headers"]
    )
    
    assert response.status_code == 200
    data = response.json()
    
    assert data["success"] is True
    assert data["tenant_id"] == str(setup["test_tenant"].id)
    assert data["updated_email"] == new_email
    assert data["password_updated"] is False
    
    # Verify database changes
    setup["db"].refresh(setup["tenant_owner"])
    setup["db"].refresh(setup["test_tenant"])
    
    assert setup["tenant_owner"].email == new_email
    assert setup["test_tenant"].email == new_email
    assert "CREDENTIALS_UPDATE" in setup["test_tenant"].notes
def test_update_tenant_credentials_password_only(client, setup_enhanced_tenant_test):
    """Test updating tenant owner password only"""
    setup = setup_enhanced_tenant_test
    new_password = "newpassword123"
    
    response = client.put(
        f"/api/enhanced-tenant-management/tenants/{setup['test_tenant'].id}/credentials",
        json={
            "password": new_password,
            "reason": "Password reset requested"
        },
        headers=setup["super_admin_headers"]
    )
    
    assert response.status_code == 200
    data = response.json()
    
    assert data["success"] is True
    assert data["password_updated"] is True
    assert data["updated_email"] is None
    
    # Verify password was changed
    setup["db"].refresh(setup["tenant_owner"])
    assert bcrypt.checkpw(new_password.encode(), setup["tenant_owner"].password_hash.encode())
    
    # Verify audit log
    setup["db"].refresh(setup["test_tenant"])
    assert "CREDENTIALS_UPDATE" in setup["test_tenant"].notes
    assert "password" in setup["test_tenant"].notes.lower()
def test_update_tenant_credentials_both_email_and_password(client, setup_enhanced_tenant_test):
    """Test updating both email and password"""
    setup = setup_enhanced_tenant_test
    new_email = "updated@testbusiness.com"
    new_password = "updatedpassword123"
    
    response = client.put(
        f"/api/enhanced-tenant-management/tenants/{setup['test_tenant'].id}/credentials",
        json={
            "email": new_email,
            "password": new_password,
            "reason": "Complete credential update"
        },
        headers=setup["super_admin_headers"]
    )
    
    assert response.status_code == 200
    data = response.json()
    
    assert data["success"] is True
    assert data["updated_email"] == new_email
    assert data["password_updated"] is True
    
    # Verify both changes
    setup["db"].refresh(setup["tenant_owner"])
    setup["db"].refresh(setup["test_tenant"])
    
    assert setup["tenant_owner"].email == new_email
    assert setup["test_tenant"].email == new_email
    assert bcrypt.checkpw(new_password.encode(), setup["tenant_owner"].password_hash.encode())
def test_update_tenant_credentials_duplicate_email(client, setup_enhanced_tenant_test):
    """Test updating to an email that already exists"""
    setup = setup_enhanced_tenant_test
    
    # Create another tenant with owner
    other_tenant = Tenant(
        name="Other Business",
        email="other@business.com",
        subscription_type=SubscriptionType.FREE,
        status=TenantStatus.ACTIVE
    )
    setup["db"].add(other_tenant)
    setup["db"].commit()
    
    other_owner = User(
        email="other@business.com",
        password_hash=bcrypt.hashpw("password".encode(), bcrypt.gensalt()).decode(),
        first_name="Other",
        last_name="Owner",
        role=UserRole.OWNER,
        status=UserStatus.ACTIVE,
        tenant_id=other_tenant.id
    )
    setup["db"].add(other_owner)
    setup["db"].commit()
    
    # Try to update to existing email
    response = client.put(
        f"/api/enhanced-tenant-management/tenants/{setup['test_tenant'].id}/credentials",
        json={
            "email": "other@business.com",
            "reason": "Test duplicate email"
        },
        headers=setup["super_admin_headers"]
    )
    
    assert response.status_code == 400
    assert "Email already exists" in response.json()["detail"]
def test_update_tenant_credentials_invalid_password(client, setup_enhanced_tenant_test):
    """Test updating with invalid password"""
    setup = setup_enhanced_tenant_test
    
    response = client.put(
        f"/api/enhanced-tenant-management/tenants/{setup['test_tenant'].id}/credentials",
        json={
            "password": "weak",  # Too short
            "reason": "Test weak password"
        },
        headers=setup["super_admin_headers"]
    )
    
    assert response.status_code == 422  # Validation error
def test_full_tenant_update_basic_info(client, setup_enhanced_tenant_test):
    """Test comprehensive tenant update with basic information"""
    setup = setup_enhanced_tenant_test
    
    update_data = {
        "name": "Updated Business Name",
        "phone": "+98-912-999-8888",
        "address": "Updated Business Address",
        "business_type": "retail",
        "currency": "USD",
        "timezone": "America/New_York",
        "admin_reason": "Business information update"
    }
    
    response = client.put(
        f"/api/enhanced-tenant-management/tenants/{setup['test_tenant'].id}/full-update",
        json=update_data,
        headers=setup["super_admin_headers"]
    )
    
    assert response.status_code == 200
    data = response.json()
    
    assert data["success"] is True
    assert data["changes_made"] > 0
    
    # Verify database changes
    setup["db"].refresh(setup["test_tenant"])
    assert setup["test_tenant"].name == "Updated Business Name"
    assert setup["test_tenant"].phone == "+98-912-999-8888"
    assert setup["test_tenant"].address == "Updated Business Address"
    assert setup["test_tenant"].business_type == "retail"
    assert setup["test_tenant"].currency == "USD"
    assert setup["test_tenant"].timezone == "America/New_York"
    
    # Verify audit log
    assert "FULL_UPDATE" in setup["test_tenant"].notes


def test_get_enhanced_tenant_details(client, setup_enhanced_tenant_test):
    """Test retrieving enhanced tenant details"""
    setup = setup_enhanced_tenant_test
    
    response = client.get(
        f"/api/enhanced-tenant-management/tenants/{setup['test_tenant'].id}/enhanced",
        headers=setup["super_admin_headers"]
    )
    
    assert response.status_code == 200
    data = response.json()
    
    assert data["id"] == str(setup["test_tenant"].id)
    assert data["name"] == setup["test_tenant"].name
    assert data["email"] == setup["test_tenant"].email
    assert data["subscription_type"] == setup["test_tenant"].subscription_type.value
    assert data["status"] == setup["test_tenant"].status.value
    assert "owner_email" in data
    assert "current_usage" in data
    assert "usage_percentages" in data


def test_update_tenant_credentials_nonexistent_tenant(client, setup_enhanced_tenant_test):
    """Test updating credentials for non-existent tenant"""
    setup = setup_enhanced_tenant_test
    fake_tenant_id = "00000000-0000-0000-0000-000000000000"
    
    response = client.put(
        f"/api/enhanced-tenant-management/tenants/{fake_tenant_id}/credentials",
        json={
            "email": "test@example.com",
            "reason": "Test non-existent tenant"
        },
        headers=setup["super_admin_headers"]
    )
    
    assert response.status_code == 404
    assert "Tenant not found" in response.json()["detail"]


def test_full_tenant_update_subscription_upgrade(client, setup_enhanced_tenant_test):
    """Test upgrading tenant subscription through full update"""
    setup = setup_enhanced_tenant_test
    
    update_data = {
        "subscription_type": "pro",
        "subscription_duration_months": 12,
        "admin_reason": "Subscription upgrade to Pro"
    }
    
    response = client.put(
        f"/api/enhanced-tenant-management/tenants/{setup['test_tenant'].id}/full-update",
        json=update_data,
        headers=setup["super_admin_headers"]
    )
    
    assert response.status_code == 200
    data = response.json()
    
    assert data["success"] is True
    
    # Verify subscription upgrade
    setup["db"].refresh(setup["test_tenant"])
    assert setup["test_tenant"].subscription_type == SubscriptionType.PRO
    assert setup["test_tenant"].max_users == 5
    assert setup["test_tenant"].max_products == -1  # Unlimited
    assert setup["test_tenant"].subscription_expires_at is not None


def test_full_tenant_update_status_change(client, setup_enhanced_tenant_test):
    """Test changing tenant status"""
    setup = setup_enhanced_tenant_test
    
    update_data = {
        "status": "suspended",
        "admin_reason": "Suspended for policy violation"
    }
    
    response = client.put(
        f"/api/enhanced-tenant-management/tenants/{setup['test_tenant'].id}/full-update",
        json=update_data,
        headers=setup["super_admin_headers"]
    )
    
    assert response.status_code == 200
    
    # Verify status change
    setup["db"].refresh(setup["test_tenant"])
    assert setup["test_tenant"].status == TenantStatus.SUSPENDED


def test_full_tenant_update_custom_limits(client, setup_enhanced_tenant_test):
    """Test updating custom resource limits"""
    setup = setup_enhanced_tenant_test
    
    update_data = {
        "max_users": 3,
        "max_products": 50,
        "max_customers": 100,
        "max_monthly_invoices": 200,
        "admin_reason": "Custom limits adjustment"
    }
    
    response = client.put(
        f"/api/enhanced-tenant-management/tenants/{setup['test_tenant'].id}/full-update",
        json=update_data,
        headers=setup["super_admin_headers"]
    )
    
    assert response.status_code == 200
    
    # Verify custom limits
    setup["db"].refresh(setup["test_tenant"])
    assert setup["test_tenant"].max_users == 3
    assert setup["test_tenant"].max_products == 50
    assert setup["test_tenant"].max_customers == 100
    assert setup["test_tenant"].max_monthly_invoices == 200


def test_full_tenant_update_domain_uniqueness(client, setup_enhanced_tenant_test):
    """Test domain uniqueness validation in full update"""
    setup = setup_enhanced_tenant_test
    
    # Create another tenant with a domain
    other_tenant = Tenant(
        name="Other Business",
        email="other@business.com",
        domain="existing.domain.com",
        subscription_type=SubscriptionType.FREE,
        status=TenantStatus.ACTIVE
    )
    setup["db"].add(other_tenant)
    setup["db"].commit()
    
    # Try to update to existing domain
    update_data = {
        "domain": "existing.domain.com",
        "admin_reason": "Test domain uniqueness"
    }
    
    response = client.put(
        f"/api/enhanced-tenant-management/tenants/{setup['test_tenant'].id}/full-update",
        json=update_data,
        headers=setup["super_admin_headers"]
    )
    
    assert response.status_code == 400
    assert "Domain already exists" in response.json()["detail"]


def test_get_tenant_audit_log(client, setup_enhanced_tenant_test):
    """Test retrieving tenant audit log"""
    setup = setup_enhanced_tenant_test
    
    # First make some changes to create audit entries
    client.put(
        f"/api/enhanced-tenant-management/tenants/{setup['test_tenant'].id}/credentials",
        json={
            "email": "audit@test.com",
            "reason": "Audit log test"
        },
        headers=setup["super_admin_headers"]
    )
    
    response = client.get(
        f"/api/enhanced-tenant-management/tenants/{setup['test_tenant'].id}/audit-log",
        headers=setup["super_admin_headers"]
    )
    
    assert response.status_code == 200
    data = response.json()
    
    assert data["tenant_id"] == str(setup["test_tenant"].id)
    assert data["tenant_name"] == setup["test_tenant"].name
    assert data["total_entries"] >= 0
    assert "entries" in data


def test_get_tenant_management_stats(client, setup_enhanced_tenant_test):
    """Test retrieving tenant management statistics"""
    setup = setup_enhanced_tenant_test
    
    response = client.get(
        "/api/enhanced-tenant-management/management-stats",
        headers=setup["super_admin_headers"]
    )
    
    assert response.status_code == 200
    data = response.json()
    
    assert "total_tenants" in data
    assert "active_tenants" in data
    assert "free_subscriptions" in data
    assert "pro_subscriptions" in data
    assert "recent_credential_updates" in data
    assert data["total_tenants"] >= 1  # At least our test tenant


def test_bulk_credential_update_password_reset(client, setup_enhanced_tenant_test):
    """Test bulk password reset operation"""
    setup = setup_enhanced_tenant_test
    
    # Create additional test tenant
    second_tenant = Tenant(
        name="Second Business",
        email="second@business.com",
        subscription_type=SubscriptionType.FREE,
        status=TenantStatus.ACTIVE
    )
    setup["db"].add(second_tenant)
    setup["db"].commit()
    
    second_owner = User(
        email="second@business.com",
        password_hash=bcrypt.hashpw("password".encode(), bcrypt.gensalt()).decode(),
        first_name="Second",
        last_name="Owner",
        role=UserRole.OWNER,
        status=UserStatus.ACTIVE,
        tenant_id=second_tenant.id
    )
    setup["db"].add(second_owner)
    setup["db"].commit()
    
    bulk_data = {
        "tenant_ids": [str(setup["test_tenant"].id), str(second_tenant.id)],
        "action": "reset_password",
        "reason": "Bulk password reset for security"
    }
    
    response = client.post(
        "/api/enhanced-tenant-management/tenants/bulk-credential-update",
        json=bulk_data,
        headers=setup["super_admin_headers"]
    )
    
    assert response.status_code == 200
    data = response.json()
    
    assert data["success_count"] == 2
    assert data["failed_count"] == 0
    assert len(data["successful_tenant_ids"]) == 2


def test_bulk_credential_update_email_domain(client, setup_enhanced_tenant_test):
    """Test bulk email domain update operation"""
    setup = setup_enhanced_tenant_test
    
    bulk_data = {
        "tenant_ids": [str(setup["test_tenant"].id)],
        "action": "update_email_domain",
        "new_email_domain": "newdomain.com",
        "reason": "Domain migration"
    }
    
    response = client.post(
        "/api/enhanced-tenant-management/tenants/bulk-credential-update",
        json=bulk_data,
        headers=setup["super_admin_headers"]
    )
    
    assert response.status_code == 200
    data = response.json()
    
    assert data["success_count"] == 1
    assert data["failed_count"] == 0
    
    # Verify email domain change
    setup["db"].refresh(setup["tenant_owner"])
    assert "@newdomain.com" in setup["tenant_owner"].email


def test_bulk_credential_update_invalid_action(client, setup_enhanced_tenant_test):
    """Test bulk credential update with invalid action"""
    setup = setup_enhanced_tenant_test
    
    bulk_data = {
        "tenant_ids": [str(setup["test_tenant"].id)],
        "action": "invalid_action",
        "reason": "Test invalid action"
    }
    
    response = client.post(
        "/api/enhanced-tenant-management/tenants/bulk-credential-update",
        json=bulk_data,
        headers=setup["super_admin_headers"]
    )
    
    assert response.status_code == 422  # Validation error


def test_unauthorized_access(client, setup_enhanced_tenant_test):
    """Test that non-super-admin users cannot access enhanced tenant management"""
    setup = setup_enhanced_tenant_test
    
    # Create regular user token
    regular_user = User(
        email="regular@user.com",
        password_hash=bcrypt.hashpw("password".encode(), bcrypt.gensalt()).decode(),
        first_name="Regular",
        last_name="User",
        role=UserRole.USER,
        status=UserStatus.ACTIVE,
        tenant_id=setup["test_tenant"].id
    )
    setup["db"].add(regular_user)
    setup["db"].commit()
    
    regular_token_data = {
        "user_id": str(regular_user.id),
        "email": regular_user.email,
        "role": regular_user.role.value,
        "is_super_admin": False,
        "tenant_id": str(regular_user.tenant_id)
    }
    regular_token = create_access_token(data=regular_token_data)
    regular_headers = {"Authorization": f"Bearer {regular_token}"}
    
    response = client.put(
        f"/api/enhanced-tenant-management/tenants/{setup['test_tenant'].id}/credentials",
        json={
            "email": "test@example.com",
            "reason": "Unauthorized test"
        },
        headers=regular_headers
    )
    
    assert response.status_code == 403  # Forbidden


def test_audit_logging_comprehensive(client, setup_enhanced_tenant_test):
    """Test comprehensive audit logging functionality"""
    setup = setup_enhanced_tenant_test
    
    # Perform multiple operations to test audit logging
    operations = [
        {
            "endpoint": f"/api/enhanced-tenant-management/tenants/{setup['test_tenant'].id}/credentials",
            "data": {"email": "audit1@test.com", "reason": "First audit test"}
        },
        {
            "endpoint": f"/api/enhanced-tenant-management/tenants/{setup['test_tenant'].id}/full-update",
            "data": {"name": "Audit Test Business", "admin_reason": "Second audit test"}
        }
    ]
    
    for operation in operations:
        response = client.put(
            operation["endpoint"],
            json=operation["data"],
            headers=setup["super_admin_headers"]
        )
        assert response.status_code == 200
    
    # Check that audit entries were created
    setup["db"].refresh(setup["test_tenant"])
    audit_count = setup["test_tenant"].notes.count("--- AUDIT LOG ---")
    assert audit_count >= 2
    
    # Verify audit log contains admin information
    assert str(setup["super_admin"].id) in setup["test_tenant"].notes
    assert setup["super_admin"].email in setup["test_tenant"].notes


def test_password_validation_edge_cases(client, setup_enhanced_tenant_test):
    """Test password validation with various edge cases"""
    setup = setup_enhanced_tenant_test
    
    # Test password without numbers
    response = client.put(
        f"/api/enhanced-tenant-management/tenants/{setup['test_tenant'].id}/credentials",
        json={
            "password": "onlyletters",
            "reason": "Test password without numbers"
        },
        headers=setup["super_admin_headers"]
    )
    assert response.status_code == 422
    
    # Test password without letters
    response = client.put(
        f"/api/enhanced-tenant-management/tenants/{setup['test_tenant'].id}/credentials",
        json={
            "password": "12345678",
            "reason": "Test password without letters"
        },
        headers=setup["super_admin_headers"]
    )
    assert response.status_code == 422


def test_subscription_downgrade_limits(client, setup_enhanced_tenant_test):
    """Test subscription downgrade and limit adjustments"""
    setup = setup_enhanced_tenant_test
    
    # First upgrade to Pro
    upgrade_data = {
        "subscription_type": "pro",
        "subscription_duration_months": 12,
        "admin_reason": "Upgrade to Pro"
    }
    
    response = client.put(
        f"/api/enhanced-tenant-management/tenants/{setup['test_tenant'].id}/full-update",
        json=upgrade_data,
        headers=setup["super_admin_headers"]
    )
    assert response.status_code == 200
    
    # Verify Pro limits
    setup["db"].refresh(setup["test_tenant"])
    assert setup["test_tenant"].subscription_type == SubscriptionType.PRO
    assert setup["test_tenant"].max_products == -1  # Unlimited
    
    # Now downgrade to Free
    downgrade_data = {
        "subscription_type": "free",
        "admin_reason": "Downgrade to Free"
    }
    
    response = client.put(
        f"/api/enhanced-tenant-management/tenants/{setup['test_tenant'].id}/full-update",
        json=downgrade_data,
        headers=setup["super_admin_headers"]
    )
    assert response.status_code == 200
    
    # Verify Free limits
    setup["db"].refresh(setup["test_tenant"])
    assert setup["test_tenant"].subscription_type == SubscriptionType.FREE
    assert setup["test_tenant"].max_products == 10  # Limited


def test_enhanced_tenant_details_usage_statistics(client, setup_enhanced_tenant_test):
    """Test enhanced tenant details with usage statistics"""
    setup = setup_enhanced_tenant_test
    
    response = client.get(
        f"/api/enhanced-tenant-management/tenants/{setup['test_tenant'].id}/enhanced",
        headers=setup["super_admin_headers"]
    )
    
    assert response.status_code == 200
    data = response.json()
    
    # Verify all required fields are present
    required_fields = [
        "id", "name", "email", "subscription_type", "status",
        "max_users", "max_products", "max_customers", "max_monthly_invoices",
        "current_usage", "usage_percentages", "owner_email",
        "total_audit_entries", "created_at", "updated_at"
    ]
    
    for field in required_fields:
        assert field in data, f"Missing required field: {field}"
    
    # Verify usage statistics structure
    assert isinstance(data["current_usage"], dict)
    assert isinstance(data["usage_percentages"], dict)
    
    # Verify owner information
    assert data["owner_email"] == setup["tenant_owner"].email


def test_error_handling_database_rollback(client, setup_enhanced_tenant_test):
    """Test error handling and database rollback on failures"""
    setup = setup_enhanced_tenant_test
    
    # Test with invalid tenant ID format
    response = client.put(
        "/api/enhanced-tenant-management/tenants/invalid-uuid/credentials",
        json={
            "email": "test@example.com",
            "reason": "Test invalid UUID"
        },
        headers=setup["super_admin_headers"]
    )
    
    # Should handle gracefully with proper error message
    assert response.status_code == 400
    assert "Invalid tenant ID format" in response.json()["detail"]


def test_tenant_without_owner_error(client, setup_enhanced_tenant_test):
    """Test handling tenant without owner user"""
    setup = setup_enhanced_tenant_test
    
    # Create tenant without owner
    orphan_tenant = Tenant(
        name="Orphan Business",
        email="orphan@business.com",
        subscription_type=SubscriptionType.FREE,
        status=TenantStatus.ACTIVE
    )
    setup["db"].add(orphan_tenant)
    setup["db"].commit()
    
    # Try to update credentials for tenant without owner
    response = client.put(
        f"/api/enhanced-tenant-management/tenants/{orphan_tenant.id}/credentials",
        json={
            "email": "new@example.com",
            "reason": "Test orphan tenant"
        },
        headers=setup["super_admin_headers"]
    )
    
    assert response.status_code == 404
    assert "Tenant owner not found" in response.json()["detail"]


def test_bulk_operation_partial_failure(client, setup_enhanced_tenant_test):
    """Test bulk operations with partial failures"""
    setup = setup_enhanced_tenant_test
    
    # Include one valid tenant and one invalid tenant ID
    bulk_data = {
        "tenant_ids": [str(setup["test_tenant"].id), "00000000-0000-0000-0000-000000000000"],
        "action": "reset_password",
        "reason": "Test partial failure"
    }
    
    response = client.post(
        "/api/enhanced-tenant-management/tenants/bulk-credential-update",
        json=bulk_data,
        headers=setup["super_admin_headers"]
    )
    
    assert response.status_code == 200
    data = response.json()
    
    assert data["success_count"] == 1
    assert data["failed_count"] == 1
    assert len(data["failed_operations"]) == 1
    assert "Tenant not found" in data["failed_operations"][0]["error"]


def test_audit_log_parsing_and_retrieval(client, setup_enhanced_tenant_test):
    """Test audit log parsing and retrieval functionality"""
    setup = setup_enhanced_tenant_test
    
    # Make several changes to generate audit logs
    changes = [
        {"email": "audit1@test.com", "reason": "First change"},
        {"email": "audit2@test.com", "reason": "Second change"},
        {"email": "audit3@test.com", "reason": "Third change"}
    ]
    
    for change in changes:
        client.put(
            f"/api/enhanced-tenant-management/tenants/{setup['test_tenant'].id}/credentials",
            json=change,
            headers=setup["super_admin_headers"]
        )
    
    # Retrieve audit log
    response = client.get(
        f"/api/enhanced-tenant-management/tenants/{setup['test_tenant'].id}/audit-log?limit=10",
        headers=setup["super_admin_headers"]
    )
    
    assert response.status_code == 200
    data = response.json()
    
    assert data["total_entries"] >= 3
    assert len(data["entries"]) >= 3
    
    # Verify audit log structure
    for entry in data["entries"]:
        assert "timestamp" in entry
        assert "admin_email" in entry
        assert "action" in entry


def test_management_stats_comprehensive(client, setup_enhanced_tenant_test):
    """Test comprehensive management statistics"""
    setup = setup_enhanced_tenant_test
    
    # Create additional tenants with different statuses and subscriptions
    test_tenants = [
        {"name": "Pro Tenant", "subscription": SubscriptionType.PRO, "status": TenantStatus.ACTIVE},
        {"name": "Suspended Tenant", "subscription": SubscriptionType.FREE, "status": TenantStatus.SUSPENDED},
        {"name": "Pending Tenant", "subscription": SubscriptionType.FREE, "status": TenantStatus.PENDING}
    ]
    
    for tenant_data in test_tenants:
        tenant = Tenant(
            name=tenant_data["name"],
            email=f"{tenant_data['name'].lower().replace(' ', '')}@test.com",
            subscription_type=tenant_data["subscription"],
            status=tenant_data["status"]
        )
        setup["db"].add(tenant)
    
    setup["db"].commit()
    
    # Get management stats
    response = client.get(
        "/api/enhanced-tenant-management/management-stats",
        headers=setup["super_admin_headers"]
    )
    
    assert response.status_code == 200
    data = response.json()
    
    # Verify all statistics are present and reasonable
    assert data["total_tenants"] >= 4  # Original + 3 new
    assert data["active_tenants"] >= 2
    assert data["suspended_tenants"] >= 1
    assert data["pending_tenants"] >= 1
    assert data["free_subscriptions"] >= 3
    assert data["pro_subscriptions"] >= 1
    
    # Verify statistics add up correctly
    assert (data["active_tenants"] + data["suspended_tenants"] + 
            data["pending_tenants"]) <= data["total_tenants"]
   