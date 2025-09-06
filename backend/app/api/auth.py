"""
Authentication API endpoints
"""

from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Body, Request
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr, Field
import uuid

from ..core.database import get_db
from ..core.auth import (
    authenticate_user, 
    create_user_tokens, 
    create_tenant_user_tokens,
    refresh_access_token,
    create_impersonation_token,
    get_current_user,
    get_super_admin_user,
    get_password_hash,
    security
)
from ..models.user import User, UserRole, UserStatus
from ..models.tenant import Tenant, TenantStatus


router = APIRouter(prefix="/auth", tags=["authentication"])


# Pydantic models for request/response
class LoginRequest(BaseModel):
    """Login request model"""
    email: EmailStr = Field(..., description="User email address")
    password: str = Field(..., min_length=6, description="User password")
    tenant_id: Optional[str] = Field(None, description="Tenant ID (optional for super admin)")


class LoginResponse(BaseModel):
    """Login response model"""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int = Field(description="Token expiration in seconds")
    user: dict
    tenant: Optional[dict] = None


class RefreshTokenRequest(BaseModel):
    """Refresh token request model"""
    refresh_token: str = Field(..., description="Valid refresh token")


class SuperAdminLoginRequest(BaseModel):
    """Super admin login request model"""
    email: EmailStr = Field(..., description="Super admin email address")
    password: str = Field(..., min_length=6, description="Super admin password")


class TenantLoginRequest(BaseModel):
    """Tenant user login request model"""
    email: EmailStr = Field(..., description="User email address")
    password: str = Field(..., min_length=6, description="User password")
    tenant_id: str = Field(..., description="Tenant ID for multi-tenant context")


class TenantLoginResponse(BaseModel):
    """Tenant login response model with subscription details"""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int = Field(description="Token expiration in seconds")
    user: dict
    tenant: dict
    subscription_status: dict


# Impersonation models moved to dedicated impersonation API


class UserProfileResponse(BaseModel):
    """User profile response model"""
    id: str
    email: str
    first_name: str
    last_name: str
    full_name: str
    role: str
    status: str
    is_super_admin: bool
    last_login_at: Optional[datetime]
    tenant_id: Optional[str]


class TenantProfileResponse(BaseModel):
    """Tenant profile response model"""
    id: str
    name: str
    subscription_type: str
    status: str
    is_subscription_active: bool
    days_until_expiry: int


def serialize_user(user: User) -> dict:
    """Serialize user object for API response"""
    return {
        "id": str(user.id),
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "full_name": user.full_name,
        "role": user.role.value,
        "status": user.status.value,
        "is_super_admin": user.is_super_admin,
        "last_login_at": user.last_login_at,
        "tenant_id": str(user.tenant_id) if user.tenant_id else None,
        "is_online": user.is_online
    }


def serialize_tenant(tenant: Tenant) -> dict:
    """Serialize tenant object for API response"""
    return {
        "id": str(tenant.id),
        "name": tenant.name,
        "subscription_type": tenant.subscription_type.value,
        "status": tenant.status.value,
        "is_subscription_active": tenant.is_subscription_active,
        "days_until_expiry": tenant.days_until_expiry,
        "max_users": tenant.max_users,
        "max_products": tenant.max_products,
        "max_customers": tenant.max_customers,
        "max_monthly_invoices": tenant.max_monthly_invoices
    }


@router.post("/login", response_model=LoginResponse)
async def login(
    login_data: LoginRequest,
    db: Session = Depends(get_db)
):
    """
    Authenticate user and return JWT tokens
    
    - **email**: User email address
    - **password**: User password
    - **tenant_id**: Optional tenant ID (required for non-super admin users)
    """
    # Authenticate user
    user = authenticate_user(
        db=db, 
        email=login_data.email, 
        password=login_data.password,
        tenant_id=login_data.tenant_id
    )
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Update login information
    user.update_login()
    db.commit()
    
    # Create tokens
    tokens = create_user_tokens(user)
    
    # Prepare response
    response_data = {
        **tokens,
        "expires_in": 30 * 60,  # 30 minutes in seconds
        "user": serialize_user(user)
    }
    
    # Add tenant information for non-super admin users
    if not user.is_super_admin and user.tenant:
        response_data["tenant"] = serialize_tenant(user.tenant)
    
    return response_data


@router.post("/tenant/login", response_model=TenantLoginResponse)
async def tenant_login(
    login_data: TenantLoginRequest,
    db: Session = Depends(get_db)
):
    """
    Authenticate tenant user with multi-tenant context validation and subscription checking
    
    - **email**: User email address
    - **password**: User password  
    - **tenant_id**: Tenant ID for multi-tenant context validation
    """
    from ..services.auth_logging_service import AuthLoggingService
    from ..models.tenant import TenantStatus, SubscriptionType
    
    auth_logger = AuthLoggingService(db)
    
    try:
        # Validate tenant_id is a valid UUID
        try:
            tenant_uuid = uuid.UUID(login_data.tenant_id)
        except ValueError:
            auth_logger.log_failed_login(
                email=login_data.email,
                tenant_id=None,  # Don't pass invalid UUID
                reason="invalid_tenant_id",
                ip_address=None
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid tenant ID format",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Validate tenant exists and is active
        tenant = db.query(Tenant).filter(Tenant.id == tenant_uuid).first()
        if not tenant:
            auth_logger.log_failed_login(
                email=login_data.email,
                tenant_id=login_data.tenant_id,
                reason="tenant_not_found",
                ip_address=None  # Will be added by middleware
            )
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tenant not found",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Check tenant status
        if tenant.status != TenantStatus.ACTIVE:
            auth_logger.log_failed_login(
                email=login_data.email,
                tenant_id=login_data.tenant_id,
                reason=f"tenant_status_{tenant.status.value}",
                ip_address=None
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Tenant account is {tenant.status.value}",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Check subscription status
        if not tenant.is_subscription_active:
            auth_logger.log_failed_login(
                email=login_data.email,
                tenant_id=login_data.tenant_id,
                reason="subscription_expired",
                ip_address=None
            )
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail="Subscription has expired",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Authenticate user with tenant context
        user = authenticate_user(
            db=db,
            email=login_data.email,
            password=login_data.password,
            tenant_id=login_data.tenant_id
        )
        
        if not user:
            auth_logger.log_failed_login(
                email=login_data.email,
                tenant_id=login_data.tenant_id,
                reason="invalid_credentials",
                ip_address=None
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Validate user belongs to the specified tenant
        if str(user.tenant_id) != login_data.tenant_id:
            auth_logger.log_failed_login(
                email=login_data.email,
                tenant_id=login_data.tenant_id,
                reason="tenant_mismatch",
                ip_address=None
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User does not belong to specified tenant",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Update login information
        user.update_login()
        tenant.update_activity()
        db.commit()
        
        # Create enhanced JWT tokens with subscription claims
        tokens = create_tenant_user_tokens(user, tenant)
        
        # Log successful login
        auth_logger.log_successful_login(
            user_id=str(user.id),
            tenant_id=login_data.tenant_id,
            email=login_data.email,
            ip_address=None
        )
        
        # Prepare subscription status information
        subscription_status = {
            "type": tenant.subscription_type.value,
            "is_active": tenant.is_subscription_active,
            "expires_at": tenant.subscription_expires_at.isoformat() if tenant.subscription_expires_at else None,
            "days_until_expiry": tenant.days_until_expiry,
            "limits": {
                "max_users": tenant.max_users,
                "max_products": tenant.max_products,
                "max_customers": tenant.max_customers,
                "max_monthly_invoices": tenant.max_monthly_invoices
            },
            "usage": tenant.get_usage_stats(db)
        }
        
        return {
            **tokens,
            "expires_in": 30 * 60,  # 30 minutes in seconds
            "user": serialize_user(user),
            "tenant": serialize_tenant(tenant),
            "subscription_status": subscription_status
        }
        
    except HTTPException:
        raise
    except Exception as e:
        auth_logger.log_failed_login(
            email=login_data.email,
            tenant_id=login_data.tenant_id,
            reason="system_error",
            ip_address=None,
            error_details=str(e)
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication system error"
        )


class SuperAdminLoginResponse(BaseModel):
    """Enhanced Super Admin login response model"""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int = Field(description="Token expiration in seconds")
    security_level: str = Field(description="Security level for super admin")
    user: dict
    platform_permissions: list = Field(description="Platform-wide permissions")
    session_info: dict = Field(description="Session security information")


@router.post("/super-admin/login", response_model=SuperAdminLoginResponse)
async def super_admin_login(
    login_data: SuperAdminLoginRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Enhanced Super Admin authentication with security validation and audit trail
    
    - **email**: Super admin email address
    - **password**: Super admin password
    
    Features:
    - Enhanced security validation
    - Extended session timeout (4 hours)
    - Platform-wide access claims
    - Comprehensive audit logging
    - Account lockout protection
    """
    from ..core.auth import authenticate_super_admin, create_super_admin_tokens
    from ..services.auth_logging_service import AuthLoggingService
    import time
    
    auth_logger = AuthLoggingService(db)
    
    # Get client information for security logging
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")
    
    try:
        # Enhanced super admin authentication
        user = authenticate_super_admin(
            db=db, 
            email=login_data.email, 
            password=login_data.password
        )
        
        if not user:
            # Additional logging for failed super admin login
            auth_logger.log_failed_login(
                email=login_data.email,
                tenant_id=None,
                reason="super_admin_authentication_failed",
                ip_address=client_ip,
                user_agent=user_agent,
                metadata={
                    "attempt_type": "super_admin_login",
                    "timestamp": datetime.utcnow().isoformat(),
                    "security_level": "critical"
                }
            )
            
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid super admin credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Update login information with enhanced tracking
        user.update_login()
        
        # Record successful super admin login with enhanced metadata
        auth_logger.log_successful_login(
            user_id=str(user.id),
            tenant_id=None,
            email=login_data.email,
            ip_address=client_ip,
            user_agent=user_agent,
            metadata={
                "auth_type": "super_admin_login",
                "security_level": "maximum",
                "platform_access": True,
                "session_duration_hours": 4,
                "timestamp": datetime.utcnow().isoformat()
            }
        )
        
        db.commit()
        
        # Create enhanced super admin tokens
        tokens = create_super_admin_tokens(user)
        
        # Prepare platform permissions list
        platform_permissions = [
            "tenant_management",
            "user_impersonation", 
            "system_monitoring",
            "backup_recovery",
            "disaster_recovery",
            "analytics_access",
            "error_management",
            "platform_configuration"
        ]
        
        # Session security information
        session_info = {
            "login_time": datetime.utcnow().isoformat(),
            "expires_at": (datetime.utcnow() + timedelta(hours=4)).isoformat(),
            "client_ip": client_ip,
            "user_agent": user_agent,
            "security_level": "maximum",
            "platform_access": True
        }
        
        return {
            **tokens,
            "user": serialize_user(user),
            "platform_permissions": platform_permissions,
            "session_info": session_info
        }
        
    except HTTPException:
        raise
    except Exception as e:
        # Log system error for super admin login attempt
        auth_logger.log_failed_login(
            email=login_data.email,
            tenant_id=None,
            reason="super_admin_system_error",
            ip_address=client_ip,
            user_agent=user_agent,
            error_details=str(e),
            metadata={
                "attempt_type": "super_admin_login",
                "error_type": "system_error",
                "timestamp": datetime.utcnow().isoformat()
            }
        )
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Super admin authentication system error"
        )


@router.post("/refresh", response_model=LoginResponse)
async def refresh_token(
    refresh_data: RefreshTokenRequest,
    db: Session = Depends(get_db)
):
    """
    Refresh access token using refresh token
    
    - **refresh_token**: Valid refresh token
    """
    try:
        # Get user from refresh token first
        from ..core.auth import verify_token, AuthenticationError
        
        payload = verify_token(refresh_data.refresh_token)
        user_id: str = payload.get("user_id")
        token_type: str = payload.get("type")
        
        if user_id is None or token_type != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token"
            )
        
        # Get user from database
        user = db.query(User).filter(User.id == user_id).first()
        
        if user is None or user.status != UserStatus.ACTIVE:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found or inactive"
            )
        
        # Get new tokens
        tokens = refresh_access_token(refresh_data.refresh_token, db)
        
        # Prepare response
        response_data = {
            **tokens,
            "expires_in": 30 * 60,  # 30 minutes in seconds
            "user": serialize_user(user)
        }
        
        # Add tenant information for non-super admin users
        if not user.is_super_admin and user.tenant:
            response_data["tenant"] = serialize_tenant(user.tenant)
        
        return response_data
        
    except AuthenticationError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not refresh token"
        )


@router.post("/logout")
async def logout(
    current_user: User = Depends(get_current_user)
):
    """
    Logout current user
    
    Note: JWT tokens are stateless, so logout is handled client-side
    by removing the token. This endpoint is for logging purposes.
    """
    # In a production system, you might want to:
    # 1. Add token to a blacklist in Redis
    # 2. Log the logout event
    # 3. Update user's last activity
    
    return {"message": "Successfully logged out"}


@router.get("/me", response_model=UserProfileResponse)
async def get_current_user_profile(
    current_user: User = Depends(get_current_user)
):
    """
    Get current user profile information
    """
    return serialize_user(current_user)


@router.get("/tenant", response_model=TenantProfileResponse)
async def get_current_tenant_profile(
    current_user: User = Depends(get_current_user)
):
    """
    Get current tenant profile information
    """
    if current_user.is_super_admin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Super admin users don't have tenant profiles"
        )
    
    if not current_user.tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found"
        )
    
    return serialize_tenant(current_user.tenant)


# Impersonation endpoints moved to dedicated impersonation API
# See /api/impersonation/ for all impersonation functionality


@router.get("/validate-token")
async def validate_token(
    current_user: User = Depends(get_current_user)
):
    """
    Validate current JWT token and return user information
    
    This endpoint can be used by frontend applications to validate
    tokens and get current user context.
    """
    response_data = {
        "valid": True,
        "user": serialize_user(current_user)
    }
    
    # Add tenant information for non-super admin users
    if not current_user.is_super_admin and current_user.tenant:
        response_data["tenant"] = serialize_tenant(current_user.tenant)
    
    # Add impersonation context if applicable
    if hasattr(current_user, 'is_impersonation') and current_user.is_impersonation:
        response_data["is_impersonation"] = True
        response_data["admin_user_id"] = current_user.admin_user_id
    
    return response_data


@router.get("/super-admin/validate-session")
async def validate_super_admin_session(
    request: Request,
    current_user: User = Depends(get_super_admin_user)
):
    """
    Validate Super Admin session and return enhanced session information
    
    This endpoint validates the current super admin session and returns
    detailed session information including permissions and security context.
    """
    from ..services.auth_logging_service import AuthLoggingService
    
    # Get client information
    client_ip = request.client.host if request and request.client else "unknown"
    
    # Session information
    session_info = {
        "user": serialize_user(current_user),
        "session_valid": True,
        "security_level": "maximum",
        "platform_access": True,
        "client_ip": client_ip,
        "last_activity": current_user.last_activity_at.isoformat() if current_user.last_activity_at else None,
        "platform_permissions": [
            "tenant_management",
            "user_impersonation", 
            "system_monitoring",
            "backup_recovery",
            "disaster_recovery",
            "analytics_access",
            "error_management",
            "platform_configuration"
        ]
    }
    
    return session_info


@router.post("/super-admin/logout")
async def super_admin_logout(
    request: Request,
    current_user: User = Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    """
    Enhanced Super Admin logout with security audit trail
    """
    from ..services.auth_logging_service import AuthLoggingService
    
    auth_logger = AuthLoggingService(db)
    
    # Get client information
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")
    
    # Log super admin logout
    auth_logger.log_logout(
        user_id=str(current_user.id),
        tenant_id=None,
        email=current_user.email,
        ip_address=client_ip,
        user_agent=user_agent,
        metadata={
            "auth_type": "super_admin_logout",
            "security_level": "maximum",
            "session_duration": "extended",
            "timestamp": datetime.utcnow().isoformat()
        }
    )
    
    return {
        "message": "Super admin successfully logged out",
        "timestamp": datetime.utcnow().isoformat(),
        "security_level": "maximum"
    }


# Health check endpoint for authentication service
@router.get("/health")
async def auth_health_check():
    """Authentication service health check"""
    return {
        "status": "healthy",
        "service": "authentication",
        "timestamp": datetime.utcnow()
    }