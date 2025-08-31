"""
JWT Authentication utilities and middleware
"""

from datetime import datetime, timedelta
from typing import Optional, Dict, Any, Union
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from passlib.context import CryptContext
import jwt
import uuid

from .config import settings
from .database import get_db
from ..models.user import User, UserStatus
from ..models.tenant import Tenant, TenantStatus


# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# HTTP Bearer token security
security = HTTPBearer()


class AuthenticationError(Exception):
    """Custom authentication error"""
    pass


class AuthorizationError(Exception):
    """Custom authorization error"""
    pass


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against its hash"""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Generate password hash"""
    return pwd_context.hash(password)


def create_access_token(
    data: Dict[str, Any], 
    expires_delta: Optional[timedelta] = None
) -> str:
    """Create JWT access token"""
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.jwt_access_token_expire_minutes)
    
    to_encode.update({"exp": expire, "type": "access"})
    
    encoded_jwt = jwt.encode(
        to_encode, 
        settings.jwt_secret_key, 
        algorithm=settings.jwt_algorithm
    )
    
    return encoded_jwt


def create_refresh_token(
    data: Dict[str, Any], 
    expires_delta: Optional[timedelta] = None
) -> str:
    """Create JWT refresh token"""
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(days=settings.jwt_refresh_token_expire_days)
    
    to_encode.update({"exp": expire, "type": "refresh"})
    
    encoded_jwt = jwt.encode(
        to_encode, 
        settings.jwt_secret_key, 
        algorithm=settings.jwt_algorithm
    )
    
    return encoded_jwt


def create_impersonation_token(
    admin_user_id: str,
    target_user_id: str,
    target_tenant_id: str,
    expires_delta: Optional[timedelta] = None
) -> str:
    """Create JWT token for user impersonation"""
    to_encode = {
        "user_id": target_user_id,
        "tenant_id": target_tenant_id,
        "admin_user_id": admin_user_id,
        "is_impersonation": True,
        "is_super_admin": False
    }
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(hours=2)  # Short-lived impersonation tokens
    
    to_encode.update({"exp": expire, "type": "impersonation"})
    
    encoded_jwt = jwt.encode(
        to_encode, 
        settings.jwt_secret_key, 
        algorithm=settings.jwt_algorithm
    )
    
    return encoded_jwt


def verify_token(token: str) -> Dict[str, Any]:
    """Verify and decode JWT token"""
    try:
        payload = jwt.decode(
            token, 
            settings.jwt_secret_key, 
            algorithms=[settings.jwt_algorithm]
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise AuthenticationError("Token has expired")
    except jwt.PyJWTError:
        raise AuthenticationError("Invalid token")


def authenticate_user(db: Session, email: str, password: str, tenant_id: Optional[str] = None) -> Optional[User]:
    """Authenticate user with email and password"""
    query = db.query(User).filter(User.email == email)
    
    if tenant_id:
        query = query.filter(User.tenant_id == tenant_id)
    
    user = query.first()
    
    if not user:
        return None
    
    if not verify_password(password, user.password_hash):
        return None
    
    # Check user status
    if user.status != UserStatus.ACTIVE:
        return None
    
    # Check tenant status if not super admin
    if not user.is_super_admin and user.tenant:
        if user.tenant.status != TenantStatus.ACTIVE:
            return None
    
    return user


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """Get current authenticated user from JWT token"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = verify_token(credentials.credentials)
        user_id: str = payload.get("user_id")
        tenant_id: str = payload.get("tenant_id")
        token_type: str = payload.get("type")
        
        if user_id is None:
            raise credentials_exception
        
        # Ensure it's an access token
        if token_type != "access" and token_type != "impersonation":
            raise credentials_exception
            
    except AuthenticationError:
        raise credentials_exception
    
    # Get user from database
    user = db.query(User).filter(User.id == user_id).first()
    
    if user is None:
        raise credentials_exception
    
    # Check user status
    if user.status != UserStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is not active"
        )
    
    # For non-super admin users, check tenant
    if not user.is_super_admin:
        if not user.tenant_id or str(user.tenant_id) != tenant_id:
            raise credentials_exception
        
        # Check tenant status
        if user.tenant and user.tenant.status != TenantStatus.ACTIVE:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Tenant account is not active"
            )
    
    # Add token context to user
    user.current_tenant_id = tenant_id
    user.is_impersonation = payload.get("is_impersonation", False)
    user.admin_user_id = payload.get("admin_user_id")
    
    # Update user activity
    user.update_activity()
    db.commit()
    
    return user


async def get_super_admin_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """Get current super admin user from JWT token"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = verify_token(credentials.credentials)
        user_id: str = payload.get("user_id")
        is_super_admin: bool = payload.get("is_super_admin", False)
        token_type: str = payload.get("type")
        
        if user_id is None or not is_super_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Super admin access required"
            )
        
        # Ensure it's an access token
        if token_type != "access":
            raise credentials_exception
            
    except AuthenticationError:
        raise credentials_exception
    
    # Get user from database
    user = db.query(User).filter(
        User.id == user_id,
        User.is_super_admin == True
    ).first()
    
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super admin access required"
        )
    
    # Check user status
    if user.status != UserStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is not active"
        )
    
    # Update user activity
    user.update_activity()
    db.commit()
    
    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """Get current active user (alias for get_current_user)"""
    return current_user


def create_user_tokens(user: User) -> Dict[str, str]:
    """Create access and refresh tokens for user"""
    # Prepare token data
    token_data = {
        "user_id": str(user.id),
        "email": user.email,
        "role": user.role.value,
        "is_super_admin": user.is_super_admin
    }
    
    # Add tenant_id for non-super admin users
    if not user.is_super_admin and user.tenant_id:
        token_data["tenant_id"] = str(user.tenant_id)
    
    # Create tokens
    access_token = create_access_token(data=token_data)
    refresh_token = create_refresh_token(data={"user_id": str(user.id)})
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }


def refresh_access_token(refresh_token: str, db: Session) -> Dict[str, str]:
    """Create new access token from refresh token"""
    try:
        payload = verify_token(refresh_token)
        user_id: str = payload.get("user_id")
        token_type: str = payload.get("type")
        
        if user_id is None or token_type != "refresh":
            raise AuthenticationError("Invalid refresh token")
            
    except AuthenticationError:
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
    
    # Check tenant status for non-super admin users
    if not user.is_super_admin and user.tenant:
        if user.tenant.status != TenantStatus.ACTIVE:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Tenant account is not active"
            )
    
    # Create new tokens
    return create_user_tokens(user)


class PermissionChecker:
    """Permission checker for role-based access control"""
    
    def __init__(self, resource: str, action: str = "read"):
        self.resource = resource
        self.action = action
    
    def __call__(self, current_user: User = Depends(get_current_user)) -> User:
        """Check if current user has permission for resource and action"""
        if current_user.is_super_admin:
            return current_user
        
        if not current_user.can_access_resource(self.resource, self.action):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions for {self.action} on {self.resource}"
            )
        
        return current_user


# Common permission dependencies
require_read_customers = PermissionChecker("customers", "read")
require_write_customers = PermissionChecker("customers", "create")
require_read_products = PermissionChecker("products", "read")
require_write_products = PermissionChecker("products", "create")
require_read_invoices = PermissionChecker("invoices", "read")
require_write_invoices = PermissionChecker("invoices", "create")
require_read_reports = PermissionChecker("reports", "read")
require_manage_users = PermissionChecker("users", "manage")
require_manage_settings = PermissionChecker("settings", "manage")