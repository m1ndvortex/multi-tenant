"""
Permission validation and user limit checking utilities
Implements granular access control and subscription-based limits
"""

from typing import Dict, List, Optional, Set
from sqlalchemy.orm import Session
from fastapi import HTTPException
from ..models.user import User, UserRole, UserStatus
from ..models.tenant import Tenant, SubscriptionType


def check_user_limits(tenant: Tenant, current_user_count: int) -> bool:
    """
    Check if tenant is within user limits based on subscription
    
    Args:
        tenant: Tenant object
        current_user_count: Current number of active users
        
    Returns:
        bool: True if within limits, False if limit exceeded
    """
    if tenant.subscription_type == SubscriptionType.FREE:
        return current_user_count < 1
    elif tenant.subscription_type == SubscriptionType.PRO:
        return current_user_count < 5
    elif tenant.subscription_type == SubscriptionType.ENTERPRISE:
        return True  # Unlimited for enterprise
    
    return False


def validate_user_permissions(current_user: User, target_role: UserRole) -> bool:
    """
    Validate if current user can assign/modify the target role
    
    Args:
        current_user: User performing the action
        target_role: Role being assigned
        
    Returns:
        bool: True if user has permission, False otherwise
    """
    # Super admin can do anything
    if current_user.is_super_admin:
        return True
    
    # User must be active
    if current_user.status != UserStatus.ACTIVE:
        return False
    
    # Role hierarchy and permissions
    role_hierarchy = {
        UserRole.OWNER: 5,
        UserRole.ADMIN: 4,
        UserRole.MANAGER: 3,
        UserRole.USER: 2,
        UserRole.VIEWER: 1
    }
    
    current_level = role_hierarchy.get(current_user.role, 0)
    target_level = role_hierarchy.get(target_role, 0)
    
    # Only owners can create other owners
    if target_role == UserRole.OWNER:
        return current_user.role == UserRole.OWNER
    
    # Owners and admins can assign roles below their level
    if current_user.role in [UserRole.OWNER, UserRole.ADMIN]:
        return target_level < current_level
    
    # Other roles cannot assign roles
    return False


def get_user_permissions(user: User) -> Dict[str, List[str]]:
    """
    Get detailed permissions for a user based on their role
    
    Args:
        user: User object
        
    Returns:
        Dict mapping resource names to list of allowed actions
    """
    if user.is_super_admin:
        return {
            "all": ["create", "read", "update", "delete", "manage", "export", "import"]
        }
    
    if user.status != UserStatus.ACTIVE:
        return {}
    
    # Define permissions for each role
    permissions_map = {
        UserRole.OWNER: {
            "users": ["create", "read", "update", "delete", "manage"],
            "customers": ["create", "read", "update", "delete", "export", "import"],
            "products": ["create", "read", "update", "delete", "export", "import"],
            "invoices": ["create", "read", "update", "delete", "export"],
            "accounting": ["create", "read", "update", "delete", "export"],
            "reports": ["read", "export", "create"],
            "settings": ["read", "update", "manage"],
            "notifications": ["create", "read", "update", "delete", "manage"],
            "backups": ["create", "read", "restore", "manage"],
            "integrations": ["create", "read", "update", "delete", "manage"]
        },
        UserRole.ADMIN: {
            "users": ["create", "read", "update"],
            "customers": ["create", "read", "update", "delete", "export"],
            "products": ["create", "read", "update", "delete", "export"],
            "invoices": ["create", "read", "update", "delete", "export"],
            "accounting": ["read", "update", "export"],
            "reports": ["read", "export"],
            "settings": ["read", "update"],
            "notifications": ["create", "read", "update", "delete"],
            "backups": ["read"],
            "integrations": ["read", "update"]
        },
        UserRole.MANAGER: {
            "customers": ["create", "read", "update", "export"],
            "products": ["create", "read", "update", "export"],
            "invoices": ["create", "read", "update", "export"],
            "accounting": ["read", "export"],
            "reports": ["read", "export"],
            "notifications": ["create", "read", "update"]
        },
        UserRole.USER: {
            "customers": ["read", "update"],
            "products": ["read"],
            "invoices": ["create", "read", "update"],
            "accounting": ["read"],
            "reports": ["read"]
        },
        UserRole.VIEWER: {
            "customers": ["read"],
            "products": ["read"],
            "invoices": ["read"],
            "accounting": ["read"],
            "reports": ["read"]
        }
    }
    
    return permissions_map.get(user.role, {})


def check_resource_permission(user: User, resource: str, action: str) -> bool:
    """
    Check if user has permission for specific resource and action
    
    Args:
        user: User object
        resource: Resource name (e.g., 'customers', 'invoices')
        action: Action name (e.g., 'create', 'read', 'update', 'delete')
        
    Returns:
        bool: True if user has permission, False otherwise
    """
    if user.is_super_admin:
        return True
    
    if user.status != UserStatus.ACTIVE:
        return False
    
    permissions = get_user_permissions(user)
    
    # Check if user has access to all resources
    if "all" in permissions and action in permissions["all"]:
        return True
    
    # Check specific resource permissions
    resource_permissions = permissions.get(resource, [])
    return action in resource_permissions


def get_accessible_resources(user: User) -> Set[str]:
    """
    Get set of all resources the user can access
    
    Args:
        user: User object
        
    Returns:
        Set of resource names the user can access
    """
    if user.is_super_admin:
        return {
            "users", "customers", "products", "invoices", "accounting",
            "reports", "settings", "notifications", "backups", "integrations"
        }
    
    if user.status != UserStatus.ACTIVE:
        return set()
    
    permissions = get_user_permissions(user)
    return set(permissions.keys())


def can_manage_user(current_user: User, target_user: User) -> bool:
    """
    Check if current user can manage (edit/delete) target user
    
    Args:
        current_user: User performing the action
        target_user: User being managed
        
    Returns:
        bool: True if current user can manage target user
    """
    # Super admin can manage anyone
    if current_user.is_super_admin:
        return True
    
    # Users must be in the same tenant
    if current_user.tenant_id != target_user.tenant_id:
        return False
    
    # Cannot manage yourself for certain actions
    if current_user.id == target_user.id:
        return False
    
    # Role hierarchy check
    role_hierarchy = {
        UserRole.OWNER: 5,
        UserRole.ADMIN: 4,
        UserRole.MANAGER: 3,
        UserRole.USER: 2,
        UserRole.VIEWER: 1
    }
    
    current_level = role_hierarchy.get(current_user.role, 0)
    target_level = role_hierarchy.get(target_user.role, 0)
    
    # Can only manage users with lower role level
    return current_level > target_level


def get_manageable_roles(user: User) -> List[UserRole]:
    """
    Get list of roles that the user can assign to others
    
    Args:
        user: User object
        
    Returns:
        List of UserRole enums that can be assigned
    """
    if user.is_super_admin:
        return list(UserRole)
    
    if user.status != UserStatus.ACTIVE:
        return []
    
    role_hierarchy = {
        UserRole.OWNER: [UserRole.ADMIN, UserRole.MANAGER, UserRole.USER, UserRole.VIEWER],
        UserRole.ADMIN: [UserRole.MANAGER, UserRole.USER, UserRole.VIEWER],
        UserRole.MANAGER: [],
        UserRole.USER: [],
        UserRole.VIEWER: []
    }
    
    return role_hierarchy.get(user.role, [])


def validate_bulk_action(current_user: User, target_users: List[User], action: str) -> Dict[str, List[str]]:
    """
    Validate bulk action on multiple users
    
    Args:
        current_user: User performing the action
        target_users: List of users to perform action on
        action: Action to perform
        
    Returns:
        Dict with 'allowed' and 'denied' lists of user IDs
    """
    allowed = []
    denied = []
    
    for target_user in target_users:
        if can_manage_user(current_user, target_user):
            # Additional checks based on action
            if action == "delete" and target_user.role == UserRole.OWNER:
                # Check if there are other owners
                # This would need database access to check
                denied.append(str(target_user.id))
            else:
                allowed.append(str(target_user.id))
        else:
            denied.append(str(target_user.id))
    
    return {
        "allowed": allowed,
        "denied": denied
    }


def check_subscription_feature_access(tenant: Tenant, feature: str) -> bool:
    """
    Check if tenant's subscription allows access to specific feature
    
    Args:
        tenant: Tenant object
        feature: Feature name
        
    Returns:
        bool: True if feature is accessible, False otherwise
    """
    # Define features by subscription type
    subscription_features = {
        SubscriptionType.FREE: {
            "basic_invoicing", "basic_customers", "basic_products",
            "basic_reports", "email_notifications"
        },
        SubscriptionType.PRO: {
            "basic_invoicing", "basic_customers", "basic_products",
            "basic_reports", "email_notifications", "advanced_reports",
            "sms_notifications", "api_access", "custom_fields",
            "advanced_accounting", "gold_invoicing", "installments",
            "qr_codes", "data_export", "user_management"
        },
        SubscriptionType.ENTERPRISE: {
            # All features available
            "basic_invoicing", "basic_customers", "basic_products",
            "basic_reports", "email_notifications", "advanced_reports",
            "sms_notifications", "api_access", "custom_fields",
            "advanced_accounting", "gold_invoicing", "installments",
            "qr_codes", "data_export", "user_management",
            "white_labeling", "custom_integrations", "priority_support"
        }
    }
    
    allowed_features = subscription_features.get(tenant.subscription_type, set())
    return feature in allowed_features


class PermissionDecorator:
    """
    Decorator class for checking permissions on API endpoints
    """
    
    def __init__(self, resource: str, action: str, allow_self: bool = False):
        self.resource = resource
        self.action = action
        self.allow_self = allow_self
    
    def __call__(self, func):
        """
        Decorator function to check permissions
        """
        def wrapper(*args, **kwargs):
            # This would be used with FastAPI dependencies
            # Implementation would depend on how it's integrated
            return func(*args, **kwargs)
        
        return wrapper


def require_permission(user: User, permission: str) -> None:
    """
    Require user to have specific permission, raise HTTPException if not
    
    Args:
        user: User object
        permission: Permission string in format "resource:action"
        
    Raises:
        HTTPException: If user doesn't have required permission
    """
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    if user.status != UserStatus.ACTIVE:
        raise HTTPException(status_code=403, detail="User account is not active")
    
    # Parse permission string
    if ":" not in permission:
        raise HTTPException(status_code=500, detail="Invalid permission format")
    
    resource, action = permission.split(":", 1)
    
    # Check permission
    if not check_resource_permission(user, resource, action):
        raise HTTPException(
            status_code=403, 
            detail=f"Insufficient permissions: {permission} required"
        )


def get_permission_summary(user: User) -> Dict[str, any]:
    """
    Get comprehensive permission summary for user
    
    Args:
        user: User object
        
    Returns:
        Dict with permission summary information
    """
    permissions = get_user_permissions(user)
    accessible_resources = get_accessible_resources(user)
    manageable_roles = get_manageable_roles(user)
    
    return {
        "user_id": str(user.id),
        "role": user.role.value,
        "is_super_admin": user.is_super_admin,
        "status": user.status.value,
        "permissions": permissions,
        "accessible_resources": list(accessible_resources),
        "manageable_roles": [role.value for role in manageable_roles],
        "can_manage_users": "users" in permissions and "manage" in permissions.get("users", []),
        "can_access_settings": "settings" in accessible_resources,
        "can_export_data": any("export" in perms for perms in permissions.values())
    }