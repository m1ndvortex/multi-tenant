"""
Comprehensive unit tests for user management and permissions system
Tests role-based access control, subscription limits, and user operations
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import uuid

from app.main import app
from app.core.database import get_db, SessionLocal
from app.core.auth import create_access_token, get_password_hash
from app.models.user import User, UserRole, UserStatus
from app.models.tenant import Tenant, SubscriptionType, TenantStatus
from app.models.activity_log import ActivityLog
from app.core.permissions import (
    check_user_limits, 
    validate_user_permissions,
    check_resource_permission,
    get_user_permissions
)


class TestUserManagementAPI:
    """Test user management API endpoints"""
    
    @pytest.fixture
    def client(self):
        """Create test client"""
        return TestClient(app)
    
    @pytest.fixture
    def db_session(self):
        """Create test database session"""
        db = SessionLocal()
        try:
            yield db
        finally:
            db.close()
    
    @pytest.fixture
    def test_tenant_free(self, db_session):
        """Create test tenant with Free subscription"""
        tenant = Tenant(
            name="Test Company Free",
            email="test@company.com",
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
    def test_tenant_pro(self, db_session):
        """Create test tenant with Pro subscription"""
        tenant = Tenant(
            name="Test Company Pro",
            email="pro@company.com",
            subscription_type=SubscriptionType.PRO,
            status=TenantStatus.ACTIVE,
            max_users=5,
            max_products=-1,  # Unlimited
            max_customers=-1,  # Unlimited
            max_monthly_invoices=-1  # Unlimited
        )
        db_session.add(tenant)
        db_session.commit()
        db_session.refresh(tenant)
        return tenant
    
    @pytest.fixture
    def owner_user(self, db_session, test_tenant_pro):
        """Create owner user for testing"""
        user = User(
            tenant_id=test_tenant_pro.id,
            email="owner@company.com",
            password_hash=get_password_hash("password123"),
            first_name="Owner",
            last_name="User",
            role=UserRole.OWNER,
            status=UserStatus.ACTIVE
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
        return user
    
    @pytest.fixture
    def admin_user(self, db_session, test_tenant_pro):
        """Create admin user for testing"""
        user = User(
            tenant_id=test_tenant_pro.id,
            email="admin@company.com",
            password_hash=get_password_hash("password123"),
            first_name="Admin",
            last_name="User",
            role=UserRole.ADMIN,
            status=UserStatus.ACTIVE
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
        return user
    
    @pytest.fixture
    def regular_user(self, db_session, test_tenant_pro):
        """Create regular user for testing"""
        user = User(
            tenant_id=test_tenant_pro.id,
            email="user@company.com",
            password_hash=get_password_hash("password123"),
            first_name="Regular",
            last_name="User",
            role=UserRole.USER,
            status=UserStatus.ACTIVE
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
        return user
    
    def get_auth_headers(self, user: User):
        """Get authorization headers for user"""
        token_data = {
            "user_id": str(user.id),
            "email": user.email,
            "role": user.role.value,
            "tenant_id": str(user.tenant_id),
            "is_super_admin": user.is_super_admin
        }
        token = create_access_token(data=token_data)
        return {"Authorization": f"Bearer {token}"}
    
    def test_create_user_success(self, client, owner_user):
        """Test successful user creation"""
        headers = self.get_auth_headers(owner_user)
        
        user_data = {
            "email": "newuser@company.com",
            "password": "password123",
            "first_name": "New",
            "last_name": "User",
            "role": "user",
            "phone": "09123456789"
        }
        
        response = client.post("/api/users/", json=user_data, headers=headers)
        
        assert response.status_code == 201
        data = response.json()
        assert data["email"] == user_data["email"]
        assert data["first_name"] == user_data["first_name"]
        assert data["role"] == "user"
        assert "password" not in data  # Password should not be returned
    
    def test_create_user_subscription_limit_free(self, client, db_session, test_tenant_free):
        """Test user creation fails when Free subscription limit is reached"""
        # Create owner user for free tenant
        owner = User(
            tenant_id=test_tenant_free.id,
            email="owner@free.com",
            password_hash=get_password_hash("password123"),
            first_name="Owner",
            last_name="Free",
            role=UserRole.OWNER,
            status=UserStatus.ACTIVE
        )
        db_session.add(owner)
        db_session.commit()
        db_session.refresh(owner)
        
        headers = self.get_auth_headers(owner)
        
        user_data = {
            "email": "newuser@free.com",
            "password": "password123",
            "first_name": "New",
            "last_name": "User",
            "role": "user"
        }
        
        response = client.post("/api/users/", json=user_data, headers=headers)
        
        assert response.status_code == 403
        assert "User limit exceeded" in response.json()["detail"]
        assert "Free subscription allows maximum 1 users" in response.json()["detail"]
    
    def test_create_user_duplicate_email(self, client, owner_user, regular_user):
        """Test user creation fails with duplicate email"""
        headers = self.get_auth_headers(owner_user)
        
        user_data = {
            "email": regular_user.email,  # Use existing email
            "password": "password123",
            "first_name": "Duplicate",
            "last_name": "User",
            "role": "user"
        }
        
        response = client.post("/api/users/", json=user_data, headers=headers)
        
        assert response.status_code == 400
        assert "already exists" in response.json()["detail"]
    
    def test_create_user_insufficient_permissions(self, client, regular_user):
        """Test user creation fails with insufficient permissions"""
        headers = self.get_auth_headers(regular_user)
        
        user_data = {
            "email": "newuser@company.com",
            "password": "password123",
            "first_name": "New",
            "last_name": "User",
            "role": "user"
        }
        
        response = client.post("/api/users/", json=user_data, headers=headers)
        
        assert response.status_code == 403
        assert "Insufficient permissions" in response.json()["detail"]
    
    def test_list_users_success(self, client, owner_user, admin_user, regular_user):
        """Test successful user listing"""
        headers = self.get_auth_headers(owner_user)
        
        response = client.get("/api/users/", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "users" in data
        assert "total" in data
        assert data["total"] >= 3  # At least the 3 test users
        assert data["max_users"] == 5  # Pro subscription limit
        assert data["subscription_type"] == "pro"
    
    def test_list_users_with_filters(self, client, owner_user):
        """Test user listing with filters"""
        headers = self.get_auth_headers(owner_user)
        
        # Test role filter
        response = client.get("/api/users/?role=owner", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert all(user["role"] == "owner" for user in data["users"])
        
        # Test search filter
        response = client.get("/api/users/?search=owner", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data["users"]) >= 1
    
    def test_get_user_success(self, client, owner_user, regular_user):
        """Test successful user retrieval"""
        headers = self.get_auth_headers(owner_user)
        
        response = client.get(f"/api/users/{regular_user.id}", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(regular_user.id)
        assert data["email"] == regular_user.email
    
    def test_get_user_not_found(self, client, owner_user):
        """Test user retrieval with non-existent ID"""
        headers = self.get_auth_headers(owner_user)
        fake_id = str(uuid.uuid4())
        
        response = client.get(f"/api/users/{fake_id}", headers=headers)
        
        assert response.status_code == 404
        assert "not found" in response.json()["detail"]
    
    def test_update_user_success(self, client, owner_user, regular_user):
        """Test successful user update"""
        headers = self.get_auth_headers(owner_user)
        
        update_data = {
            "first_name": "Updated",
            "last_name": "Name",
            "role": "manager"
        }
        
        response = client.put(f"/api/users/{regular_user.id}", json=update_data, headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["first_name"] == "Updated"
        assert data["last_name"] == "Name"
        assert data["role"] == "manager"
    
    def test_update_user_prevent_self_demotion(self, client, owner_user):
        """Test prevention of owner self-demotion"""
        headers = self.get_auth_headers(owner_user)
        
        update_data = {
            "role": "admin"  # Try to demote self from owner
        }
        
        response = client.put(f"/api/users/{owner_user.id}", json=update_data, headers=headers)
        
        assert response.status_code == 403
        assert "Cannot change your own owner role" in response.json()["detail"]
    
    def test_deactivate_user_success(self, client, owner_user, regular_user):
        """Test successful user deactivation"""
        headers = self.get_auth_headers(owner_user)
        
        response = client.delete(f"/api/users/{regular_user.id}", headers=headers)
        
        assert response.status_code == 204
    
    def test_deactivate_user_prevent_self(self, client, owner_user):
        """Test prevention of self-deactivation"""
        headers = self.get_auth_headers(owner_user)
        
        response = client.delete(f"/api/users/{owner_user.id}", headers=headers)
        
        assert response.status_code == 403
        assert "Cannot deactivate your own account" in response.json()["detail"]
    
    def test_activate_user_success(self, client, db_session, owner_user, regular_user):
        """Test successful user activation"""
        # First deactivate the user
        regular_user.status = UserStatus.INACTIVE
        db_session.commit()
        
        headers = self.get_auth_headers(owner_user)
        
        response = client.post(f"/api/users/{regular_user.id}/activate", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "active"
    
    def test_get_role_permissions(self, client, owner_user):
        """Test role permissions endpoint"""
        headers = self.get_auth_headers(owner_user)
        
        response = client.get("/api/users/roles/permissions", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "owner" in data
        assert "admin" in data
        assert "user" in data
        assert "viewer" in data
        
        # Check owner permissions
        owner_perms = data["owner"]
        assert owner_perms["role"] == "owner"
        assert "users" in owner_perms["permissions"]
        assert "manage" in owner_perms["permissions"]["users"]
    
    def test_get_active_sessions(self, client, owner_user, db_session):
        """Test active sessions endpoint"""
        # Update user activity to make them appear online
        owner_user.update_activity()
        db_session.commit()
        
        headers = self.get_auth_headers(owner_user)
        
        response = client.get("/api/users/sessions/active", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Should include at least the owner user
        assert len(data) >= 1
    
    def test_invite_user_success(self, client, owner_user):
        """Test user invitation"""
        headers = self.get_auth_headers(owner_user)
        
        invitation_data = {
            "email": "invited@company.com",
            "role": "user",
            "message": "Welcome to our team!"
        }
        
        response = client.post("/api/users/invite", json=invitation_data, headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == invitation_data["email"]
        assert "invitation_token" in data
    
    def test_invite_user_limit_exceeded(self, client, db_session, test_tenant_free):
        """Test invitation fails when user limit is exceeded"""
        # Create owner for free tenant
        owner = User(
            tenant_id=test_tenant_free.id,
            email="owner@free.com",
            password_hash=get_password_hash("password123"),
            first_name="Owner",
            last_name="Free",
            role=UserRole.OWNER,
            status=UserStatus.ACTIVE
        )
        db_session.add(owner)
        db_session.commit()
        db_session.refresh(owner)
        
        headers = self.get_auth_headers(owner)
        
        invitation_data = {
            "email": "invited@free.com",
            "role": "user"
        }
        
        response = client.post("/api/users/invite", json=invitation_data, headers=headers)
        
        assert response.status_code == 403
        assert "User limit exceeded" in response.json()["detail"]


class TestPermissionsSystem:
    """Test permission validation and role-based access control"""
    
    @pytest.fixture
    def db_session(self):
        """Create test database session"""
        db = SessionLocal()
        try:
            yield db
        finally:
            db.close()
    
    @pytest.fixture
    def test_tenant(self, db_session):
        """Create test tenant"""
        tenant = Tenant(
            name="Test Company",
            email="test@company.com",
            subscription_type=SubscriptionType.PRO,
            status=TenantStatus.ACTIVE,
            max_users=5
        )
        db_session.add(tenant)
        db_session.commit()
        db_session.refresh(tenant)
        return tenant
    
    def test_check_user_limits_free(self, test_tenant):
        """Test user limit checking for Free subscription"""
        test_tenant.subscription_type = SubscriptionType.FREE
        
        # Should allow 0 users (limit is 1)
        assert check_user_limits(test_tenant, 0) == True
        
        # Should not allow 1 user (would be 2nd user)
        assert check_user_limits(test_tenant, 1) == False
    
    def test_check_user_limits_pro(self, test_tenant):
        """Test user limit checking for Pro subscription"""
        test_tenant.subscription_type = SubscriptionType.PRO
        
        # Should allow up to 4 users (limit is 5)
        assert check_user_limits(test_tenant, 4) == True
        
        # Should not allow 5 users (would be 6th user)
        assert check_user_limits(test_tenant, 5) == False
    
    def test_validate_user_permissions_owner(self, db_session, test_tenant):
        """Test permission validation for owner role"""
        owner = User(
            tenant_id=test_tenant.id,
            email="owner@test.com",
            password_hash="hash",
            first_name="Owner",
            last_name="User",
            role=UserRole.OWNER,
            status=UserStatus.ACTIVE
        )
        
        # Owner can assign any role except owner to owner
        assert validate_user_permissions(owner, UserRole.ADMIN) == True
        assert validate_user_permissions(owner, UserRole.MANAGER) == True
        assert validate_user_permissions(owner, UserRole.USER) == True
        assert validate_user_permissions(owner, UserRole.VIEWER) == True
        assert validate_user_permissions(owner, UserRole.OWNER) == True  # Owner can create other owners
    
    def test_validate_user_permissions_admin(self, db_session, test_tenant):
        """Test permission validation for admin role"""
        admin = User(
            tenant_id=test_tenant.id,
            email="admin@test.com",
            password_hash="hash",
            first_name="Admin",
            last_name="User",
            role=UserRole.ADMIN,
            status=UserStatus.ACTIVE
        )
        
        # Admin can assign roles below admin level
        assert validate_user_permissions(admin, UserRole.MANAGER) == True
        assert validate_user_permissions(admin, UserRole.USER) == True
        assert validate_user_permissions(admin, UserRole.VIEWER) == True
        
        # Admin cannot assign owner or admin roles
        assert validate_user_permissions(admin, UserRole.OWNER) == False
        assert validate_user_permissions(admin, UserRole.ADMIN) == False
    
    def test_validate_user_permissions_regular_user(self, db_session, test_tenant):
        """Test permission validation for regular user"""
        user = User(
            tenant_id=test_tenant.id,
            email="user@test.com",
            password_hash="hash",
            first_name="Regular",
            last_name="User",
            role=UserRole.USER,
            status=UserStatus.ACTIVE
        )
        
        # Regular user cannot assign any roles
        assert validate_user_permissions(user, UserRole.OWNER) == False
        assert validate_user_permissions(user, UserRole.ADMIN) == False
        assert validate_user_permissions(user, UserRole.MANAGER) == False
        assert validate_user_permissions(user, UserRole.USER) == False
        assert validate_user_permissions(user, UserRole.VIEWER) == False
    
    def test_check_resource_permission_owner(self, db_session, test_tenant):
        """Test resource permission checking for owner"""
        owner = User(
            tenant_id=test_tenant.id,
            email="owner@test.com",
            password_hash="hash",
            first_name="Owner",
            last_name="User",
            role=UserRole.OWNER,
            status=UserStatus.ACTIVE
        )
        
        # Owner should have all permissions
        assert check_resource_permission(owner, "users", "create") == True
        assert check_resource_permission(owner, "users", "manage") == True
        assert check_resource_permission(owner, "customers", "delete") == True
        assert check_resource_permission(owner, "settings", "manage") == True
    
    def test_check_resource_permission_viewer(self, db_session, test_tenant):
        """Test resource permission checking for viewer"""
        viewer = User(
            tenant_id=test_tenant.id,
            email="viewer@test.com",
            password_hash="hash",
            first_name="Viewer",
            last_name="User",
            role=UserRole.VIEWER,
            status=UserStatus.ACTIVE
        )
        
        # Viewer should only have read permissions
        assert check_resource_permission(viewer, "customers", "read") == True
        assert check_resource_permission(viewer, "products", "read") == True
        assert check_resource_permission(viewer, "invoices", "read") == True
        assert check_resource_permission(viewer, "reports", "read") == True
        
        # Viewer should not have write permissions
        assert check_resource_permission(viewer, "customers", "create") == False
        assert check_resource_permission(viewer, "products", "update") == False
        assert check_resource_permission(viewer, "invoices", "delete") == False
        assert check_resource_permission(viewer, "users", "manage") == False
    
    def test_get_user_permissions_structure(self, db_session, test_tenant):
        """Test user permissions structure"""
        admin = User(
            tenant_id=test_tenant.id,
            email="admin@test.com",
            password_hash="hash",
            first_name="Admin",
            last_name="User",
            role=UserRole.ADMIN,
            status=UserStatus.ACTIVE
        )
        
        permissions = get_user_permissions(admin)
        
        # Check structure
        assert isinstance(permissions, dict)
        assert "users" in permissions
        assert "customers" in permissions
        assert "products" in permissions
        assert "invoices" in permissions
        
        # Check admin permissions
        assert "create" in permissions["users"]
        assert "read" in permissions["users"]
        assert "update" in permissions["users"]
        assert "manage" not in permissions["users"]  # Admin can't manage users fully
    
    def test_super_admin_permissions(self, db_session):
        """Test super admin permissions"""
        super_admin = User(
            tenant_id=None,  # Super admin has no tenant
            email="super@admin.com",
            password_hash="hash",
            first_name="Super",
            last_name="Admin",
            role=UserRole.OWNER,
            status=UserStatus.ACTIVE,
            is_super_admin=True
        )
        
        # Super admin should have all permissions
        assert check_resource_permission(super_admin, "users", "manage") == True
        assert check_resource_permission(super_admin, "tenants", "delete") == True
        assert check_resource_permission(super_admin, "system", "admin") == True
        
        permissions = get_user_permissions(super_admin)
        assert "all" in permissions
        assert "manage" in permissions["all"]


class TestActivityLogging:
    """Test activity logging functionality"""
    
    @pytest.fixture
    def db_session(self):
        """Create test database session"""
        db = SessionLocal()
        try:
            yield db
        finally:
            db.close()
    
    @pytest.fixture
    def test_tenant(self, db_session):
        """Create test tenant"""
        tenant = Tenant(
            name="Test Company",
            email="test@company.com",
            subscription_type=SubscriptionType.PRO,
            status=TenantStatus.ACTIVE
        )
        db_session.add(tenant)
        db_session.commit()
        db_session.refresh(tenant)
        return tenant
    
    @pytest.fixture
    def test_user(self, db_session, test_tenant):
        """Create test user"""
        user = User(
            tenant_id=test_tenant.id,
            email="user@test.com",
            password_hash="hash",
            first_name="Test",
            last_name="User",
            role=UserRole.USER,
            status=UserStatus.ACTIVE
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
        return user
    
    def test_log_action_creation(self, db_session, test_tenant, test_user):
        """Test activity log creation"""
        log_entry = ActivityLog.log_action(
            db=db_session,
            tenant_id=test_tenant.id,
            user_id=test_user.id,
            action="user_login",
            details={"ip_address": "192.168.1.1"},
            status="success"
        )
        
        assert log_entry.id is not None
        assert log_entry.tenant_id == test_tenant.id
        assert log_entry.user_id == test_user.id
        assert log_entry.action == "user_login"
        assert log_entry.status == "success"
        assert log_entry.details["ip_address"] == "192.168.1.1"
    
    def test_get_user_activities(self, db_session, test_tenant, test_user):
        """Test retrieving user activities"""
        # Create multiple log entries
        for i in range(5):
            ActivityLog.log_action(
                db=db_session,
                tenant_id=test_tenant.id,
                user_id=test_user.id,
                action=f"action_{i}",
                status="success"
            )
        
        # Retrieve activities
        activities = ActivityLog.get_user_activities(
            db=db_session,
            tenant_id=test_tenant.id,
            user_id=test_user.id,
            limit=10
        )
        
        assert len(activities) == 5
        assert all(activity.user_id == test_user.id for activity in activities)
        assert all(activity.tenant_id == test_tenant.id for activity in activities)
    
    def test_get_activity_summary(self, db_session, test_tenant, test_user):
        """Test activity summary generation"""
        # Create various log entries
        actions = ["login", "logout", "create_invoice", "update_customer"]
        for action in actions:
            ActivityLog.log_action(
                db=db_session,
                tenant_id=test_tenant.id,
                user_id=test_user.id,
                action=action,
                status="success"
            )
        
        summary = ActivityLog.get_activity_summary(
            db=db_session,
            tenant_id=test_tenant.id
        )
        
        assert summary["total_activities"] == 4
        assert "action_counts" in summary
        assert summary["action_counts"]["login"] == 1
        assert summary["action_counts"]["create_invoice"] == 1
        assert str(test_user.id) in summary["user_activity"]
    
    def test_activity_log_filtering(self, db_session, test_tenant, test_user):
        """Test activity log filtering by action and date"""
        # Create logs with different actions
        ActivityLog.log_action(
            db=db_session,
            tenant_id=test_tenant.id,
            user_id=test_user.id,
            action="login",
            status="success"
        )
        
        ActivityLog.log_action(
            db=db_session,
            tenant_id=test_tenant.id,
            user_id=test_user.id,
            action="logout",
            status="success"
        )
        
        # Filter by action
        login_activities = ActivityLog.get_user_activities(
            db=db_session,
            tenant_id=test_tenant.id,
            action="login"
        )
        
        assert len(login_activities) == 1
        assert login_activities[0].action == "login"
        
        # Filter by date range
        start_date = datetime.utcnow() - timedelta(hours=1)
        end_date = datetime.utcnow() + timedelta(hours=1)
        
        recent_activities = ActivityLog.get_user_activities(
            db=db_session,
            tenant_id=test_tenant.id,
            start_date=start_date,
            end_date=end_date
        )
        
        assert len(recent_activities) == 2  # Both activities should be in range


if __name__ == "__main__":
    pytest.main([__file__, "-v"])