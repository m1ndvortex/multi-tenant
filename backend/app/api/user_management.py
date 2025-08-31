"""
User Management API endpoints for tenant-level user operations
Implements role-based permission system with granular access control
"""

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
from datetime import datetime, timedelta
import uuid

from ..core.database import get_db
from ..core.auth import (
    get_current_user, 
    get_password_hash, 
    verify_password,
    create_user_tokens,
    PermissionChecker
)
from ..models.user import User, UserRole, UserStatus
from ..models.tenant import Tenant, SubscriptionType
from ..schemas.user import (
    UserCreate, 
    UserUpdate, 
    UserResponse, 
    UserListResponse,
    UserActivityLog,
    RolePermissions,
    UserInvitation,
    UserSessionInfo
)
from ..core.permissions import check_user_limits, validate_user_permissions


router = APIRouter(prefix="/api/users", tags=["User Management"])


# Permission dependencies
require_manage_users = PermissionChecker("users", "manage")
require_read_users = PermissionChecker("users", "read")


@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_data: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manage_users)
):
    """
    Create a new user within the current tenant
    Enforces subscription-based user limits (1 for Free, 5 for Pro)
    """
    # Get current tenant
    tenant = db.query(Tenant).filter(Tenant.id == current_user.tenant_id).first()
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found"
        )
    
    # Check subscription limits
    current_user_count = db.query(User).filter(
        and_(
            User.tenant_id == current_user.tenant_id,
            User.is_active == True,
            User.status == UserStatus.ACTIVE
        )
    ).count()
    
    if not check_user_limits(tenant, current_user_count):
        max_users = 1 if tenant.subscription_type == SubscriptionType.FREE else 5
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"User limit exceeded. {tenant.subscription_type.value.title()} subscription allows maximum {max_users} users. Current: {current_user_count}"
        )
    
    # Check if email already exists in tenant
    existing_user = db.query(User).filter(
        and_(
            User.tenant_id == current_user.tenant_id,
            User.email == user_data.email
        )
    ).first()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists in your organization"
        )
    
    # Validate role permissions
    if not validate_user_permissions(current_user, user_data.role):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Insufficient permissions to create user with role {user_data.role.value}"
        )
    
    # Create new user
    hashed_password = get_password_hash(user_data.password)
    
    new_user = User(
        tenant_id=current_user.tenant_id,
        email=user_data.email,
        password_hash=hashed_password,
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        phone=user_data.phone,
        role=user_data.role,
        status=UserStatus.ACTIVE,
        language=user_data.language or "fa",
        timezone=user_data.timezone or "Asia/Tehran",
        is_email_verified=False
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Log user creation activity
    from ..tasks.activity_logging import log_user_activity
    log_user_activity.delay(
        user_id=str(current_user.id),
        tenant_id=str(current_user.tenant_id),
        action="user_created",
        details={
            "created_user_id": str(new_user.id),
            "created_user_email": new_user.email,
            "created_user_role": new_user.role.value
        }
    )
    
    return UserResponse.model_validate(new_user)


@router.get("/", response_model=UserListResponse)
async def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    role: Optional[UserRole] = Query(None),
    status: Optional[UserStatus] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_read_users)
):
    """
    List all users in the current tenant with filtering and pagination
    """
    # Base query for tenant users
    query = db.query(User).filter(User.tenant_id == current_user.tenant_id)
    
    # Apply filters
    if role:
        query = query.filter(User.role == role)
    
    if status:
        query = query.filter(User.status == status)
    
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                User.first_name.ilike(search_term),
                User.last_name.ilike(search_term),
                User.email.ilike(search_term),
                User.phone.ilike(search_term)
            )
        )
    
    # Get total count
    total = query.count()
    
    # Apply pagination and ordering
    users = query.order_by(User.created_at.desc()).offset(skip).limit(limit).all()
    
    # Get tenant info for limits
    tenant = db.query(Tenant).filter(Tenant.id == current_user.tenant_id).first()
    max_users = 1 if tenant.subscription_type == SubscriptionType.FREE else 5
    
    return UserListResponse(
        users=[UserResponse.model_validate(user) for user in users],
        total=total,
        skip=skip,
        limit=limit,
        max_users=max_users,
        subscription_type=tenant.subscription_type.value
    )


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_read_users)
):
    """
    Get specific user details within the current tenant
    """
    user = db.query(User).filter(
        and_(
            User.id == user_id,
            User.tenant_id == current_user.tenant_id
        )
    ).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return UserResponse.model_validate(user)


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: uuid.UUID,
    user_data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manage_users)
):
    """
    Update user information and permissions
    """
    # Get user to update
    user = db.query(User).filter(
        and_(
            User.id == user_id,
            User.tenant_id == current_user.tenant_id
        )
    ).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Prevent self-demotion for owners
    if (user.id == current_user.id and 
        user.role == UserRole.OWNER and 
        user_data.role and user_data.role != UserRole.OWNER):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot change your own owner role"
        )
    
    # Validate role permissions if role is being changed
    if user_data.role and user_data.role != user.role:
        if not validate_user_permissions(current_user, user_data.role):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions to assign role {user_data.role.value}"
            )
    
    # Check email uniqueness if email is being changed
    if user_data.email and user_data.email != user.email:
        existing_user = db.query(User).filter(
            and_(
                User.tenant_id == current_user.tenant_id,
                User.email == user_data.email,
                User.id != user_id
            )
        ).first()
        
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User with this email already exists in your organization"
            )
    
    # Update user fields
    update_data = user_data.dict(exclude_unset=True)
    
    # Handle password update
    if "password" in update_data:
        update_data["password_hash"] = get_password_hash(update_data.pop("password"))
        update_data["is_email_verified"] = False  # Require re-verification after password change
    
    for field, value in update_data.items():
        setattr(user, field, value)
    
    user.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(user)
    
    # Log user update activity
    from ..tasks.activity_logging import log_user_activity
    log_user_activity.delay(
        user_id=str(current_user.id),
        tenant_id=str(current_user.tenant_id),
        action="user_updated",
        details={
            "updated_user_id": str(user.id),
            "updated_user_email": user.email,
            "updated_fields": list(update_data.keys())
        }
    )
    
    return UserResponse.model_validate(user)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def deactivate_user(
    user_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manage_users)
):
    """
    Deactivate user (soft delete) - sets status to INACTIVE
    """
    # Get user to deactivate
    user = db.query(User).filter(
        and_(
            User.id == user_id,
            User.tenant_id == current_user.tenant_id
        )
    ).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Prevent self-deactivation
    if user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot deactivate your own account"
        )
    
    # Prevent deactivating the last owner
    if user.role == UserRole.OWNER:
        owner_count = db.query(User).filter(
            and_(
                User.tenant_id == current_user.tenant_id,
                User.role == UserRole.OWNER,
                User.status == UserStatus.ACTIVE,
                User.id != user_id
            )
        ).count()
        
        if owner_count == 0:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot deactivate the last owner. Assign owner role to another user first."
            )
    
    # Deactivate user
    user.status = UserStatus.INACTIVE
    user.updated_at = datetime.utcnow()
    
    db.commit()
    
    # Log user deactivation activity
    from ..tasks.activity_logging import log_user_activity
    log_user_activity.delay(
        user_id=str(current_user.id),
        tenant_id=str(current_user.tenant_id),
        action="user_deactivated",
        details={
            "deactivated_user_id": str(user.id),
            "deactivated_user_email": user.email
        }
    )


@router.post("/{user_id}/activate", response_model=UserResponse)
async def activate_user(
    user_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manage_users)
):
    """
    Activate previously deactivated user
    """
    # Get user to activate
    user = db.query(User).filter(
        and_(
            User.id == user_id,
            User.tenant_id == current_user.tenant_id
        )
    ).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    if user.status == UserStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already active"
        )
    
    # Check subscription limits before activation
    tenant = db.query(Tenant).filter(Tenant.id == current_user.tenant_id).first()
    current_user_count = db.query(User).filter(
        and_(
            User.tenant_id == current_user.tenant_id,
            User.is_active == True,
            User.status == UserStatus.ACTIVE
        )
    ).count()
    
    if not check_user_limits(tenant, current_user_count):
        max_users = 1 if tenant.subscription_type == SubscriptionType.FREE else 5
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Cannot activate user. User limit exceeded. {tenant.subscription_type.value.title()} subscription allows maximum {max_users} users."
        )
    
    # Activate user
    user.status = UserStatus.ACTIVE
    user.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(user)
    
    # Log user activation activity
    from ..tasks.activity_logging import log_user_activity
    log_user_activity.delay(
        user_id=str(current_user.id),
        tenant_id=str(current_user.tenant_id),
        action="user_activated",
        details={
            "activated_user_id": str(user.id),
            "activated_user_email": user.email
        }
    )
    
    return UserResponse.model_validate(user)


@router.get("/{user_id}/activity", response_model=List[UserActivityLog])
async def get_user_activity(
    user_id: uuid.UUID,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_read_users)
):
    """
    Get user activity logs and session information
    """
    # Verify user exists in tenant
    user = db.query(User).filter(
        and_(
            User.id == user_id,
            User.tenant_id == current_user.tenant_id
        )
    ).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Get activity logs from database
    from ..models.activity_log import ActivityLog
    
    logs = db.query(ActivityLog).filter(
        and_(
            ActivityLog.user_id == user_id,
            ActivityLog.tenant_id == current_user.tenant_id
        )
    ).order_by(ActivityLog.created_at.desc()).offset(skip).limit(limit).all()
    
    return [UserActivityLog.model_validate(log) for log in logs]


@router.get("/roles/permissions", response_model=Dict[str, RolePermissions])
async def get_role_permissions(
    current_user: User = Depends(get_current_user)
):
    """
    Get available roles and their permissions
    """
    # Define role permissions mapping
    role_permissions = {
        UserRole.OWNER.value: RolePermissions(
            role=UserRole.OWNER,
            description="Full access to all features and settings",
            permissions={
                "users": ["create", "read", "update", "delete", "manage"],
                "customers": ["create", "read", "update", "delete"],
                "products": ["create", "read", "update", "delete"],
                "invoices": ["create", "read", "update", "delete"],
                "accounting": ["create", "read", "update", "delete"],
                "reports": ["read", "export"],
                "settings": ["read", "update", "manage"],
                "notifications": ["create", "read", "update", "delete"]
            }
        ),
        UserRole.ADMIN.value: RolePermissions(
            role=UserRole.ADMIN,
            description="Administrative access with user management",
            permissions={
                "users": ["create", "read", "update"],
                "customers": ["create", "read", "update", "delete"],
                "products": ["create", "read", "update", "delete"],
                "invoices": ["create", "read", "update", "delete"],
                "accounting": ["read", "update"],
                "reports": ["read", "export"],
                "settings": ["read", "update"],
                "notifications": ["create", "read", "update"]
            }
        ),
        UserRole.MANAGER.value: RolePermissions(
            role=UserRole.MANAGER,
            description="Management access to business operations",
            permissions={
                "customers": ["create", "read", "update"],
                "products": ["create", "read", "update"],
                "invoices": ["create", "read", "update"],
                "accounting": ["read"],
                "reports": ["read"],
                "notifications": ["create", "read"]
            }
        ),
        UserRole.USER.value: RolePermissions(
            role=UserRole.USER,
            description="Standard user access for daily operations",
            permissions={
                "customers": ["read", "update"],
                "products": ["read"],
                "invoices": ["create", "read", "update"],
                "reports": ["read"]
            }
        ),
        UserRole.VIEWER.value: RolePermissions(
            role=UserRole.VIEWER,
            description="Read-only access to business data",
            permissions={
                "customers": ["read"],
                "products": ["read"],
                "invoices": ["read"],
                "reports": ["read"]
            }
        )
    }
    
    return role_permissions


@router.get("/sessions/active", response_model=List[UserSessionInfo])
async def get_active_sessions(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_read_users)
):
    """
    Get active user sessions within the tenant
    """
    # Get users who were active in the last 5 minutes
    five_minutes_ago = datetime.utcnow() - timedelta(minutes=5)
    
    active_users = db.query(User).filter(
        and_(
            User.tenant_id == current_user.tenant_id,
            User.status == UserStatus.ACTIVE,
            User.last_activity_at >= five_minutes_ago
        )
    ).order_by(User.last_activity_at.desc()).all()
    
    sessions = []
    for user in active_users:
        sessions.append(UserSessionInfo(
            user_id=user.id,
            email=user.email,
            full_name=user.full_name,
            role=user.role,
            last_activity_at=user.last_activity_at,
            is_online=user.is_online
        ))
    
    return sessions


@router.post("/invite", response_model=Dict[str, str])
async def invite_user(
    invitation: UserInvitation,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manage_users)
):
    """
    Send user invitation email (placeholder for future implementation)
    """
    # Check subscription limits
    tenant = db.query(Tenant).filter(Tenant.id == current_user.tenant_id).first()
    current_user_count = db.query(User).filter(
        and_(
            User.tenant_id == current_user.tenant_id,
            User.is_active == True,
            User.status == UserStatus.ACTIVE
        )
    ).count()
    
    if not check_user_limits(tenant, current_user_count):
        max_users = 1 if tenant.subscription_type == SubscriptionType.FREE else 5
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"User limit exceeded. {tenant.subscription_type.value.title()} subscription allows maximum {max_users} users."
        )
    
    # Check if email already exists
    existing_user = db.query(User).filter(
        and_(
            User.tenant_id == current_user.tenant_id,
            User.email == invitation.email
        )
    ).first()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists in your organization"
        )
    
    # Generate invitation token and send email
    # This would integrate with the notification system
    invitation_token = str(uuid.uuid4())
    
    # Store invitation in database or cache
    # Send invitation email via Celery task
    from ..tasks.activity_logging import send_user_invitation_email
    send_user_invitation_email.delay(
        tenant_id=str(current_user.tenant_id),
        inviter_name=current_user.full_name,
        email=invitation.email,
        role=invitation.role.value,
        invitation_token=invitation_token
    )
    
    return {
        "message": "Invitation sent successfully",
        "email": invitation.email,
        "invitation_token": invitation_token
    }