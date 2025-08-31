"""
Unit tests for permission system and role-based access control
"""

import pytest
from fastapi import HTTPException
from unittest.mock import Mock

from app.core.auth import PermissionChecker, get_current_user, get_super_admin_user
from app.models.user import User, UserRole, UserStatus
from app.models.tenant import Tenant, TenantStatus


class TestUserPermissions:
    """Test user permission methods"""
    
    def test_super_admin_permissions(self):
        """Test that super admin has access to all resources"""
        user = User(
            email="admin@example.com",
            first_name="Admin",
            last_name="User",
            role=UserRole.OWNER,
            status=UserStatus.ACTIVE,
            is_super_admin=True
        )
        
        # Super admin should have access to everything
        assert user.can_access_resource("customers", "create") is True
        assert user.can_access_resource("products", "delete") is True
        assert user.can_access_resource("invoices", "manage") is True
        assert user.can_access_resource("reports", "read") is True
        assert user.can_access_resource("settings", "update") is True
        assert user.can_access_resource("users", "manage") is True
    
    def test_inactive_user_permissions(self):
        """Test that inactive users have no permissions"""
        user = User(
            email="user@example.com",
            first_name="Test",
            last_name="User",
            role=UserRole.USER,
            status=UserStatus.INACTIVE,
            is_super_admin=False
        )
        
        # Inactive user should have no access
        assert user.can_access_resource("customers", "read") is False
        assert user.can_access_resource("products", "read") is False
        assert user.can_access_resource("invoices", "read") is False
    
    def test_owner_permissions(self):
        """Test owner role permissions"""
        user = User(
            email="owner@example.com",
            first_name="Owner",
            last_name="User",
            role=UserRole.OWNER,
            status=UserStatus.ACTIVE,
            is_super_admin=False
        )
        
        # Owner should have access to all resources
        assert user.can_access_resource("customers", "create") is True
        assert user.can_access_resource("customers", "delete") is True
        assert user.can_access_resource("products", "manage") is True
        assert user.can_access_resource("invoices", "create") is True
        assert user.can_access_resource("reports", "read") is True
        assert user.can_access_resource("settings", "update") is True
        assert user.can_access_resource("users", "manage") is True
    
    def test_admin_permissions(self):
        """Test admin role permissions"""
        user = User(
            email="admin@example.com",
            first_name="Admin",
            last_name="User",
            role=UserRole.ADMIN,
            status=UserStatus.ACTIVE,
            is_super_admin=False
        )
        
        # Admin should have most permissions
        assert user.can_access_resource("customers", "create") is True
        assert user.can_access_resource("customers", "update") is True
        assert user.can_access_resource("customers", "delete") is True
        assert user.can_access_resource("products", "create") is True
        assert user.can_access_resource("invoices", "create") is True
        assert user.can_access_resource("reports", "read") is True
        assert user.can_access_resource("settings", "read") is True
        assert user.can_access_resource("settings", "update") is True
        assert user.can_access_resource("users", "create") is True
        assert user.can_access_resource("users", "read") is True
        assert user.can_access_resource("users", "update") is True
        
        # Admin should not have delete access to users
        assert user.can_access_resource("users", "delete") is False
    
    def test_manager_permissions(self):
        """Test manager role permissions"""
        user = User(
            email="manager@example.com",
            first_name="Manager",
            last_name="User",
            role=UserRole.MANAGER,
            status=UserStatus.ACTIVE,
            is_super_admin=False
        )
        
        # Manager should have limited permissions
        assert user.can_access_resource("customers", "create") is True
        assert user.can_access_resource("customers", "read") is True
        assert user.can_access_resource("customers", "update") is True
        assert user.can_access_resource("products", "create") is True
        assert user.can_access_resource("products", "read") is True
        assert user.can_access_resource("invoices", "create") is True
        assert user.can_access_resource("reports", "read") is True
        
        # Manager should not have delete access or user management
        assert user.can_access_resource("customers", "delete") is False
        assert user.can_access_resource("products", "delete") is False
        assert user.can_access_resource("users", "create") is False
        assert user.can_access_resource("settings", "update") is False
    
    def test_user_permissions(self):
        """Test regular user role permissions"""
        user = User(
            email="user@example.com",
            first_name="Regular",
            last_name="User",
            role=UserRole.USER,
            status=UserStatus.ACTIVE,
            is_super_admin=False
        )
        
        # Regular user should have basic permissions
        assert user.can_access_resource("customers", "read") is True
        assert user.can_access_resource("customers", "update") is True
        assert user.can_access_resource("products", "read") is True
        assert user.can_access_resource("invoices", "create") is True
        assert user.can_access_resource("invoices", "read") is True
        assert user.can_access_resource("invoices", "update") is True
        assert user.can_access_resource("reports", "read") is True
        
        # Regular user should not have create/delete access to customers/products
        assert user.can_access_resource("customers", "create") is False
        assert user.can_access_resource("customers", "delete") is False
        assert user.can_access_resource("products", "create") is False
        assert user.can_access_resource("products", "update") is False
        assert user.can_access_resource("users", "create") is False
        assert user.can_access_resource("settings", "update") is False
    
    def test_viewer_permissions(self):
        """Test viewer role permissions"""
        user = User(
            email="viewer@example.com",
            first_name="Viewer",
            last_name="User",
            role=UserRole.VIEWER,
            status=UserStatus.ACTIVE,
            is_super_admin=False
        )
        
        # Viewer should only have read access
        assert user.can_access_resource("customers", "read") is True
        assert user.can_access_resource("products", "read") is True
        assert user.can_access_resource("invoices", "read") is True
        assert user.can_access_resource("reports", "read") is True
        
        # Viewer should not have write access
        assert user.can_access_resource("customers", "create") is False
        assert user.can_access_resource("customers", "update") is False
        assert user.can_access_resource("products", "create") is False
        assert user.can_access_resource("invoices", "create") is False
        assert user.can_access_resource("users", "create") is False
        assert user.can_access_resource("settings", "update") is False


class TestPermissionChecker:
    """Test PermissionChecker dependency"""
    
    def test_permission_checker_super_admin(self):
        """Test permission checker allows super admin"""
        checker = PermissionChecker("customers", "delete")
        
        user = User(
            email="admin@example.com",
            first_name="Admin",
            last_name="User",
            role=UserRole.OWNER,
            status=UserStatus.ACTIVE,
            is_super_admin=True
        )
        
        # Should not raise exception for super admin
        result = checker(user)
        assert result == user
    
    def test_permission_checker_allowed(self):
        """Test permission checker allows authorized user"""
        checker = PermissionChecker("customers", "read")
        
        user = User(
            email="user@example.com",
            first_name="Regular",
            last_name="User",
            role=UserRole.USER,
            status=UserStatus.ACTIVE,
            is_super_admin=False
        )
        
        # Should not raise exception for allowed action
        result = checker(user)
        assert result == user
    
    def test_permission_checker_denied(self):
        """Test permission checker denies unauthorized user"""
        checker = PermissionChecker("customers", "delete")
        
        user = User(
            email="user@example.com",
            first_name="Regular",
            last_name="User",
            role=UserRole.USER,
            status=UserStatus.ACTIVE,
            is_super_admin=False
        )
        
        # Should raise HTTPException for denied action
        with pytest.raises(HTTPException) as exc_info:
            checker(user)
        
        assert exc_info.value.status_code == 403
        assert "Insufficient permissions" in str(exc_info.value.detail)
    
    def test_permission_checker_viewer_write_denied(self):
        """Test permission checker denies write access to viewer"""
        checker = PermissionChecker("invoices", "create")
        
        user = User(
            email="viewer@example.com",
            first_name="Viewer",
            last_name="User",
            role=UserRole.VIEWER,
            status=UserStatus.ACTIVE,
            is_super_admin=False
        )
        
        # Should raise HTTPException for write action by viewer
        with pytest.raises(HTTPException) as exc_info:
            checker(user)
        
        assert exc_info.value.status_code == 403
        assert "create on invoices" in str(exc_info.value.detail)
    
    def test_permission_checker_manager_user_management_denied(self):
        """Test permission checker denies user management to manager"""
        checker = PermissionChecker("users", "create")
        
        user = User(
            email="manager@example.com",
            first_name="Manager",
            last_name="User",
            role=UserRole.MANAGER,
            status=UserStatus.ACTIVE,
            is_super_admin=False
        )
        
        # Should raise HTTPException for user management by manager
        with pytest.raises(HTTPException) as exc_info:
            checker(user)
        
        assert exc_info.value.status_code == 403


class TestRoleHierarchy:
    """Test role hierarchy and permission inheritance"""
    
    def test_role_hierarchy_read_access(self):
        """Test that all roles have appropriate read access"""
        roles_and_resources = [
            (UserRole.OWNER, "customers", "read", True),
            (UserRole.ADMIN, "customers", "read", True),
            (UserRole.MANAGER, "customers", "read", True),
            (UserRole.USER, "customers", "read", True),
            (UserRole.VIEWER, "customers", "read", True),
        ]
        
        for role, resource, action, expected in roles_and_resources:
            user = User(
                email=f"{role.value}@example.com",
                first_name="Test",
                last_name="User",
                role=role,
                status=UserStatus.ACTIVE,
                is_super_admin=False
            )
            
            assert user.can_access_resource(resource, action) == expected
    
    def test_role_hierarchy_write_access(self):
        """Test that write access is properly restricted by role"""
        roles_and_access = [
            (UserRole.OWNER, True),
            (UserRole.ADMIN, True),
            (UserRole.MANAGER, True),
            (UserRole.USER, False),
            (UserRole.VIEWER, False),
        ]
        
        for role, expected in roles_and_access:
            user = User(
                email=f"{role.value}@example.com",
                first_name="Test",
                last_name="User",
                role=role,
                status=UserStatus.ACTIVE,
                is_super_admin=False
            )
            
            assert user.can_access_resource("customers", "create") == expected
    
    def test_role_hierarchy_delete_access(self):
        """Test that delete access is properly restricted by role"""
        roles_and_access = [
            (UserRole.OWNER, True),
            (UserRole.ADMIN, True),
            (UserRole.MANAGER, False),
            (UserRole.USER, False),
            (UserRole.VIEWER, False),
        ]
        
        for role, expected in roles_and_access:
            user = User(
                email=f"{role.value}@example.com",
                first_name="Test",
                last_name="User",
                role=role,
                status=UserStatus.ACTIVE,
                is_super_admin=False
            )
            
            assert user.can_access_resource("customers", "delete") == expected
    
    def test_role_hierarchy_user_management(self):
        """Test that user management is properly restricted"""
        roles_and_access = [
            (UserRole.OWNER, True),
            (UserRole.ADMIN, True),
            (UserRole.MANAGER, False),
            (UserRole.USER, False),
            (UserRole.VIEWER, False),
        ]
        
        for role, expected in roles_and_access:
            user = User(
                email=f"{role.value}@example.com",
                first_name="Test",
                last_name="User",
                role=role,
                status=UserStatus.ACTIVE,
                is_super_admin=False
            )
            
            assert user.can_access_resource("users", "create") == expected