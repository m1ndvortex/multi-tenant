"""
User Management API endpoints
Handles user CRUD operations, role management, and permissions
"""

from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
from pydantic import BaseModel, EmailStr, Field, validator
import uuid

from ..core.database import get_db
from ..core.auth import (
    get_current_user,
    get_super_admin_user,
    get_password_hash,
    require_manage_users
)
from ..models.user import User, UserRole, UserStatus
from ..models.tenant import Tenant, TenantStatus, SubscriptionType


router = APIRouter(prefix="/users", tags=["user_management"])


# Pydantic models for request/response
class UserCreateRequest(BaseModel):
    """User creation request model"""
    email: EmailStr = Field(..., description="User email address")
    password: str = Field(..., min_length=6, description="User password")
    first_name: str = Field(..., min_length=1, max_length=100, description="First name")
    last_name: str = Field(..., min_length=1, max_length=100, description="Last name")
    phone: Optional[str] = Field(None, max_length=50, description="Phone number")
    role: UserRole = Field(UserRole.USER, description="User role")
    language: str = Field("fa", description="Interface language")
    timezone: str = Field("Asia/Tehran", description="User timezone")


class UserUpdateRequest(BaseModel):
    """User update request model"""
    first_name: Optional[str] = Field(None, min_length=1, max_length=100)
    last_name: Optional[str] = Field(None, min_length=1, max_length=100)
    phone: Optional[str] = Field(None, max_length=50)
    role: Optional[UserRole] = None
    status: Optional[UserStatus] = None
    language: Optional[str] = None
    timezone: Optional[str] = None


class UserResponse(BaseModel):
    """User response model"""
    id: str
    email: str
    first_name: str
    last_name: str
    full_name: str
    phone: Optional[str]
    role: str
    status: str
    is_email_verified: bool
    last_login_at: Optional[datetime]
    last_activity_at: Optional[datetime]
    login_count: int
    language: str
    timezone: str
    is_online: bool
    created_at: datetime
    updated_at: datetime


class UserListResponse(BaseModel):
    """User list response model"""
    users: List[UserResponse]
    total: int
    page: int
    per_page: int
    total_pages: int


class PasswordChangeRequest(BaseModel):
    """Password change request model"""
    current_password: str = Field(..., min_length=6)
    new_password: str = Field(..., min_length=6)
    
    @validator('new_password')
    def validate_new_password(cls, v, values):
        if 'current_password' in values and v == values['current_password']:
            raise ValueError('New password must be different from current password')
        return v


class RolePermissionsResponse(BaseModel):
    """Role permissions response model"""
    role: str
    permissions: dict
    description: str


class UserLimitsResponse(BaseModel):
    """User limits response model"""
    current_users: int
    max_users: int
    can_add_user: bool
    subscription_type: str


def serialize_user(user: User) -> dict:
    """Serialize user object for API response"""
    return {
        "id": str(user.id),
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "full_name": user.full_name,
        "phone": user.phone,
        "role": user.role.value,
        "status": user.status.value,
        "is_email_verified": user.is_email_verified,
        "last_login_at": user.last_login_at,
        "last_activity_at": user.last_activity_at,
        "login_count": user.login_count,
        "language": user.language,
        "timezone": user.timezone,
        "is_online": user.is_online,
        "created_at": user.created_at,
        "updated_at": user.updated_at
    }


# Create a simple permission checker for read operations
def require_read_users(current_user: User = Depends(get_current_user)) -> User:
    """Check if current user can read users"""
    if not current_user.can_access_resource("users", "read"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions for read on users"
        )
    return current_user


@router.get("/", response_model=UserListResponse)
async def list_users(
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(20, ge=1, le=100, description="Items per page"),
    search: Optional[str] = Query(None, description="Search by name or email"),
    role: Optional[UserRole] = Query(None, description="Filter by role"),
    status: Optional[UserStatus] = Query(None, description="Filter by status"),
    current_user: User = Depends(require_read_users),
    db: Session = Depends(get_db)
):
    """
    List users with pagination and filtering
    
    Requires 'read' permission on 'users' resource
    """
    # Build query based on user permissions
    if current_user.is_super_admin:
        # Super admin can see all users
        query = db.query(User)
    else:
        # Regular users can only see users in their tenant
        query = db.query(User).filter(User.tenant_id == current_user.tenant_id)
    
    # Apply filters
    if search:
        search_filter = or_(
            User.first_name.ilike(f"%{search}%"),
            User.last_name.ilike(f"%{search}%"),
            User.email.ilike(f"%{search}%")
        )
        query = query.filter(search_filter)
    
    if role:
        query = query.filter(User.role == role)
    
    if status:
        query = query.filter(User.status == status)
    
    # Get total count
    total = query.count()
    
    # Apply pagination
    offset = (page - 1) * per_page
    users = query.offset(offset).limit(per_page).all()
    
    # Calculate pagination info
    total_pages = (total + per_page - 1) // per_page
    
    return {
        "users": [serialize_user(user) for user in users],
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": total_pages
    }


@router.post("/", response_model=UserResponse)
async def create_user(
    user_data: UserCreateRequest,
    current_user: User = Depends(require_manage_users),
    db: Session = Depends(get_db)
):
    """
    Create a new user
    
    Requires 'manage' permission on 'users' resource
    Enforces subscription-based user limits
    """
    # Determine target tenant
    if current_user.is_super_admin:
        # Super admin must specify tenant_id in a different endpoint
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Super admin must use tenant-specific user creation endpoint"
        )
    
    target_tenant_id = current_user.tenant_id
    tenant = current_user.tenant
    
    # Check subscription limits
    current_user_count = db.query(User).filter(
        User.tenant_id == target_tenant_id,
        User.status == UserStatus.ACTIVE
    ).count()
    
    if not tenant.check_limits('users', current_user_count):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"User limit exceeded. Current plan allows {tenant.max_users} users."
        )
    
    # Check if email already exists in tenant
    existing_user = db.query(User).filter(
        User.tenant_id == target_tenant_id,
        User.email == user_data.email
    ).first()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists in tenant"
        )
    
    # Validate role assignment permissions
    if user_data.role == UserRole.OWNER and current_user.role != UserRole.OWNER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only tenant owners can create other owners"
        )
    
    if user_data.role == UserRole.ADMIN and current_user.role not in [UserRole.OWNER, UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only owners and admins can create admin users"
        )
    
    # Create new user
    hashed_password = get_password_hash(user_data.password)
    
    new_user = User(
        tenant_id=target_tenant_id,
        email=user_data.email,
        password_hash=hashed_password,
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        phone=user_data.phone,
        role=user_data.role,
        status=UserStatus.ACTIVE,
        language=user_data.language,
        timezone=user_data.timezone
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return serialize_user(new_user)


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: str,
    current_user: User = Depends(require_read_users),
    db: Session = Depends(get_db)
):
    """
    Get user by ID
    
    Requires 'read' permission on 'users' resource
    """
    # Build query based on user permissions
    if current_user.is_super_admin:
        user = db.query(User).filter(User.id == user_id).first()
    else:
        user = db.query(User).filter(
            User.id == user_id,
            User.tenant_id == current_user.tenant_id
        ).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return serialize_user(user)


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str,
    user_data: UserUpdateRequest,
    current_user: User = Depends(require_manage_users),
    db: Session = Depends(get_db)
):
    """
    Update user by ID
    
    Requires 'manage' permission on 'users' resource
    """
    # Get target user
    if current_user.is_super_admin:
        user = db.query(User).filter(User.id == user_id).first()
    else:
        user = db.query(User).filter(
            User.id == user_id,
            User.tenant_id == current_user.tenant_id
        ).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Validate role assignment permissions
    if user_data.role:
        if user_data.role == UserRole.OWNER and current_user.role != UserRole.OWNER:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only tenant owners can assign owner role"
            )
        
        if user_data.role == UserRole.ADMIN and current_user.role not in [UserRole.OWNER, UserRole.ADMIN]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only owners and admins can assign admin role"
            )
    
    # Prevent users from modifying themselves inappropriately
    if str(user.id) == str(current_user.id):
        if user_data.status and user_data.status != UserStatus.ACTIVE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot deactivate your own account"
            )
        
        if user_data.role and user_data.role != current_user.role:
            if current_user.role == UserRole.OWNER:
                # Check if there are other owners
                other_owners = db.query(User).filter(
                    User.tenant_id == current_user.tenant_id,
                    User.role == UserRole.OWNER,
                    User.id != current_user.id,
                    User.status == UserStatus.ACTIVE
                ).count()
                
                if other_owners == 0:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Cannot change role - you are the only active owner"
                    )
    
    # Update user fields
    update_data = user_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)
    
    user.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(user)
    
    return serialize_user(user)


@router.delete("/{user_id}")
async def delete_user(
    user_id: str,
    current_user: User = Depends(require_manage_users),
    db: Session = Depends(get_db)
):
    """
    Delete (deactivate) user by ID
    
    Requires 'manage' permission on 'users' resource
    """
    # Get target user
    if current_user.is_super_admin:
        user = db.query(User).filter(User.id == user_id).first()
    else:
        user = db.query(User).filter(
            User.id == user_id,
            User.tenant_id == current_user.tenant_id
        ).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Prevent self-deletion
    if str(user.id) == str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account"
        )
    
    # Check if user is the only owner
    if user.role == UserRole.OWNER:
        other_owners = db.query(User).filter(
            User.tenant_id == user.tenant_id,
            User.role == UserRole.OWNER,
            User.id != user.id,
            User.status == UserStatus.ACTIVE
        ).count()
        
        if other_owners == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete the only active owner"
            )
    
    # Soft delete by deactivating
    user.status = UserStatus.INACTIVE
    user.updated_at = datetime.utcnow()
    
    db.commit()
    
    return {"message": "User deactivated successfully"}


@router.post("/{user_id}/activate")
async def activate_user(
    user_id: str,
    current_user: User = Depends(require_manage_users),
    db: Session = Depends(get_db)
):
    """
    Activate user by ID
    
    Requires 'manage' permission on 'users' resource
    """
    # Get target user
    if current_user.is_super_admin:
        user = db.query(User).filter(User.id == user_id).first()
    else:
        user = db.query(User).filter(
            User.id == user_id,
            User.tenant_id == current_user.tenant_id
        ).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Check subscription limits if activating
    if user.status != UserStatus.ACTIVE:
        tenant = user.tenant if not current_user.is_super_admin else current_user.tenant
        current_user_count = db.query(User).filter(
            User.tenant_id == user.tenant_id,
            User.status == UserStatus.ACTIVE
        ).count()
        
        if not tenant.check_limits('users', current_user_count):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"User limit exceeded. Current plan allows {tenant.max_users} users."
            )
    
    user.activate()
    user.updated_at = datetime.utcnow()
    
    db.commit()
    
    return {"message": "User activated successfully"}


@router.post("/{user_id}/suspend")
async def suspend_user(
    user_id: str,
    reason: Optional[str] = None,
    current_user: User = Depends(require_manage_users),
    db: Session = Depends(get_db)
):
    """
    Suspend user by ID
    
    Requires 'manage' permission on 'users' resource
    """
    # Get target user
    if current_user.is_super_admin:
        user = db.query(User).filter(User.id == user_id).first()
    else:
        user = db.query(User).filter(
            User.id == user_id,
            User.tenant_id == current_user.tenant_id
        ).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Prevent self-suspension
    if str(user.id) == str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot suspend your own account"
        )
    
    user.suspend(reason)
    user.updated_at = datetime.utcnow()
    
    db.commit()
    
    return {"message": "User suspended successfully"}


@router.post("/change-password")
async def change_password(
    password_data: PasswordChangeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Change current user's password
    """
    from ..core.auth import verify_password
    
    # Verify current password
    if not verify_password(password_data.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )
    
    # Update password
    current_user.password_hash = get_password_hash(password_data.new_password)
    current_user.updated_at = datetime.utcnow()
    
    db.commit()
    
    return {"message": "Password changed successfully"}


@router.get("/roles/permissions", response_model=List[RolePermissionsResponse])
async def get_role_permissions(
    current_user: User = Depends(get_current_user)
):
    """
    Get role permissions matrix
    """
    role_permissions = {
        UserRole.OWNER: {
            "permissions": {
                "users": ["create", "read", "update", "delete", "manage"],
                "customers": ["create", "read", "update", "delete"],
                "products": ["create", "read", "update", "delete"],
                "invoices": ["create", "read", "update", "delete"],
                "reports": ["read"],
                "settings": ["read", "update", "manage"],
                "accounting": ["create", "read", "update", "delete"]
            },
            "description": "Full access to all tenant resources and user management"
        },
        UserRole.ADMIN: {
            "permissions": {
                "users": ["create", "read", "update"],
                "customers": ["create", "read", "update", "delete"],
                "products": ["create", "read", "update", "delete"],
                "invoices": ["create", "read", "update", "delete"],
                "reports": ["read"],
                "settings": ["read", "update"],
                "accounting": ["create", "read", "update", "delete"]
            },
            "description": "Administrative access with user management capabilities"
        },
        UserRole.MANAGER: {
            "permissions": {
                "customers": ["create", "read", "update"],
                "products": ["create", "read", "update"],
                "invoices": ["create", "read", "update"],
                "reports": ["read"],
                "accounting": ["read", "update"]
            },
            "description": "Management access to business operations"
        },
        UserRole.USER: {
            "permissions": {
                "customers": ["read", "update"],
                "products": ["read"],
                "invoices": ["create", "read", "update"],
                "reports": ["read"],
                "accounting": ["read"]
            },
            "description": "Standard user access for daily operations"
        },
        UserRole.VIEWER: {
            "permissions": {
                "customers": ["read"],
                "products": ["read"],
                "invoices": ["read"],
                "reports": ["read"],
                "accounting": ["read"]
            },
            "description": "Read-only access to all resources"
        }
    }
    
    return [
        {
            "role": role.value,
            "permissions": data["permissions"],
            "description": data["description"]
        }
        for role, data in role_permissions.items()
    ]


@router.get("/limits/current", response_model=UserLimitsResponse)
async def get_user_limits(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get current user limits based on subscription
    """
    if current_user.is_super_admin:
        return {
            "current_users": 0,
            "max_users": -1,  # Unlimited
            "can_add_user": True,
            "subscription_type": "super_admin"
        }
    
    tenant = current_user.tenant
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found"
        )
    
    # Get current user count
    current_user_count = db.query(User).filter(
        User.tenant_id == tenant.id,
        User.status == UserStatus.ACTIVE
    ).count()
    
    can_add_user = tenant.check_limits('users', current_user_count)
    
    return {
        "current_users": current_user_count,
        "max_users": tenant.max_users,
        "can_add_user": can_add_user,
        "subscription_type": tenant.subscription_type.value
    }


@router.get("/online", response_model=List[UserResponse])
async def get_online_users(
    current_user: User = Depends(require_read_users),
    db: Session = Depends(get_db)
):
    """
    Get list of currently online users
    
    Requires 'read' permission on 'users' resource
    """
    from datetime import timedelta
    
    # Users are considered online if active in last 5 minutes
    cutoff_time = datetime.utcnow() - timedelta(minutes=5)
    
    # Build query based on user permissions
    if current_user.is_super_admin:
        query = db.query(User).filter(
            User.last_activity_at >= cutoff_time,
            User.status == UserStatus.ACTIVE
        )
    else:
        query = db.query(User).filter(
            User.tenant_id == current_user.tenant_id,
            User.last_activity_at >= cutoff_time,
            User.status == UserStatus.ACTIVE
        )
    
    online_users = query.all()
    
    return [serialize_user(user) for user in online_users]