"""
Tenant context middleware and utilities for multi-tenant data isolation
"""

from typing import Optional, Dict, Any, List
from fastapi import Request, HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from contextlib import contextmanager
import uuid
import logging
from contextvars import ContextVar

from .auth import verify_token, AuthenticationError
from .database import get_db
from ..models.user import User, UserStatus
from ..models.tenant import Tenant, TenantStatus

logger = logging.getLogger(__name__)

# Context variables for tenant isolation
current_tenant_id: ContextVar[Optional[str]] = ContextVar('current_tenant_id', default=None)
current_user_id: ContextVar[Optional[str]] = ContextVar('current_user_id', default=None)
is_super_admin_context: ContextVar[bool] = ContextVar('is_super_admin_context', default=False)
is_impersonation_context: ContextVar[bool] = ContextVar('is_impersonation_context', default=False)

security = HTTPBearer()


class TenantContext:
    """
    Tenant context manager for automatic tenant_id injection and validation
    """
    
    def __init__(self, tenant_id: Optional[str] = None, user_id: Optional[str] = None, 
                 is_super_admin: bool = False, is_impersonation: bool = False):
        self.tenant_id = tenant_id
        self.user_id = user_id
        self.is_super_admin = is_super_admin
        self.is_impersonation = is_impersonation
    
    @classmethod
    def get_current(cls) -> 'TenantContext':
        """Get current tenant context"""
        return cls(
            tenant_id=current_tenant_id.get(),
            user_id=current_user_id.get(),
            is_super_admin=is_super_admin_context.get(),
            is_impersonation=is_impersonation_context.get()
        )
    
    def set_context(self):
        """Set the current context variables"""
        current_tenant_id.set(self.tenant_id)
        current_user_id.set(self.user_id)
        is_super_admin_context.set(self.is_super_admin)
        is_impersonation_context.set(self.is_impersonation)
    
    @contextmanager
    def activate(self):
        """Context manager to temporarily activate this tenant context"""
        # Store previous values
        prev_tenant_id = current_tenant_id.get()
        prev_user_id = current_user_id.get()
        prev_is_super_admin = is_super_admin_context.get()
        prev_is_impersonation = is_impersonation_context.get()
        
        try:
            # Set new context
            self.set_context()
            yield self
        finally:
            # Restore previous context
            current_tenant_id.set(prev_tenant_id)
            current_user_id.set(prev_user_id)
            is_super_admin_context.set(prev_is_super_admin)
            is_impersonation_context.set(prev_is_impersonation)
    
    def validate_tenant_access(self, target_tenant_id: str) -> bool:
        """Validate if current context can access target tenant"""
        if self.is_super_admin:
            return True
        
        if not self.tenant_id:
            return False
        
        return str(self.tenant_id) == str(target_tenant_id)
    
    def ensure_tenant_access(self, target_tenant_id: str):
        """Ensure current context can access target tenant, raise exception if not"""
        if not self.validate_tenant_access(target_tenant_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: insufficient tenant permissions"
            )


class TenantMiddleware:
    """
    Middleware for automatic tenant context injection
    """
    
    def __init__(self, app):
        self.app = app
    
    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        
        request = Request(scope, receive)
        
        # Skip tenant context for certain paths
        skip_paths = ["/docs", "/redoc", "/openapi.json", "/api/health", "/"]
        if any(request.url.path.startswith(path) for path in skip_paths):
            await self.app(scope, receive, send)
            return
        
        # Extract tenant context from request
        tenant_context = await self._extract_tenant_context(request)
        
        # Set tenant context for the request
        with tenant_context.activate():
            await self.app(scope, receive, send)
    
    async def _extract_tenant_context(self, request: Request) -> TenantContext:
        """Extract tenant context from request headers and JWT token"""
        try:
            # Try to get authorization header
            auth_header = request.headers.get("authorization")
            if not auth_header or not auth_header.startswith("Bearer "):
                return TenantContext()
            
            # Extract and verify token
            token = auth_header.split(" ")[1]
            payload = verify_token(token)
            
            tenant_id = payload.get("tenant_id")
            user_id = payload.get("user_id")
            is_super_admin = payload.get("is_super_admin", False)
            is_impersonation = payload.get("is_impersonation", False)
            
            return TenantContext(
                tenant_id=tenant_id,
                user_id=user_id,
                is_super_admin=is_super_admin,
                is_impersonation=is_impersonation
            )
            
        except (AuthenticationError, KeyError, AttributeError) as e:
            logger.debug(f"Could not extract tenant context: {e}")
            return TenantContext()


class TenantAwareQuery:
    """
    Utility class for creating tenant-aware database queries
    """
    
    @staticmethod
    def filter_by_tenant(query, model_class, tenant_id: Optional[str] = None):
        """
        Add tenant filter to query if model has tenant_id and user is not super admin
        """
        context = TenantContext.get_current()
        
        # Super admin can access all data
        if context.is_super_admin:
            return query
        
        # Check if model has tenant_id attribute
        if not hasattr(model_class, 'tenant_id'):
            return query
        
        # Use provided tenant_id or current context tenant_id
        filter_tenant_id = tenant_id or context.tenant_id
        
        if not filter_tenant_id:
            # No tenant context, return empty result
            return query.filter(False)
        
        return query.filter(model_class.tenant_id == filter_tenant_id)
    
    @staticmethod
    def ensure_tenant_isolation(db: Session, model_class, record_id: str, 
                               tenant_id: Optional[str] = None) -> bool:
        """
        Ensure a record belongs to the current tenant
        Returns True if access is allowed, False otherwise
        """
        context = TenantContext.get_current()
        
        # Super admin can access all records
        if context.is_super_admin:
            return True
        
        # Check if model has tenant_id attribute
        if not hasattr(model_class, 'tenant_id'):
            return True
        
        # Use provided tenant_id or current context tenant_id
        check_tenant_id = tenant_id or context.tenant_id
        
        if not check_tenant_id:
            return False
        
        # Query the record and check tenant_id
        record = db.query(model_class).filter(
            model_class.id == record_id,
            model_class.tenant_id == check_tenant_id
        ).first()
        
        return record is not None
    
    @staticmethod
    def validate_tenant_data_access(db: Session, model_class, filters: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate and modify filters to ensure tenant data isolation
        """
        context = TenantContext.get_current()
        
        # Super admin can access all data without modification
        if context.is_super_admin:
            return filters
        
        # Add tenant_id filter if model supports it
        if hasattr(model_class, 'tenant_id') and context.tenant_id:
            filters['tenant_id'] = context.tenant_id
        
        return filters


def get_current_tenant_context() -> TenantContext:
    """Dependency to get current tenant context"""
    return TenantContext.get_current()


def require_tenant_access(tenant_id: str):
    """Dependency to require access to specific tenant"""
    def _check_access(context: TenantContext = Depends(get_current_tenant_context)):
        context.ensure_tenant_access(tenant_id)
        return context
    return _check_access


def validate_tenant_resource_access(model_class, record_id: str):
    """Dependency to validate access to a specific tenant resource"""
    def _validate_access(
        db: Session = Depends(get_db),
        context: TenantContext = Depends(get_current_tenant_context)
    ):
        if not TenantAwareQuery.ensure_tenant_isolation(db, model_class, record_id):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Resource not found or access denied"
            )
        return True
    return _validate_access


class TenantValidator:
    """
    Utility class for tenant validation and security checks
    """
    
    @staticmethod
    def validate_tenant_exists(db: Session, tenant_id: str) -> Tenant:
        """Validate that tenant exists and is active"""
        tenant = db.query(Tenant).filter(
            Tenant.id == tenant_id,
            Tenant.is_active == True
        ).first()
        
        if not tenant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tenant not found or inactive"
            )
        
        return tenant
    
    @staticmethod
    def validate_user_tenant_access(db: Session, user_id: str, tenant_id: str) -> bool:
        """Validate that user belongs to tenant"""
        user = db.query(User).filter(
            User.id == user_id,
            User.tenant_id == tenant_id,
            User.status == UserStatus.ACTIVE
        ).first()
        
        return user is not None
    
    @staticmethod
    def validate_tenant_subscription_limits(db: Session, tenant_id: str, 
                                          resource_type: str, current_count: int) -> bool:
        """Validate tenant subscription limits for resource creation"""
        tenant = TenantValidator.validate_tenant_exists(db, tenant_id)
        
        # Check subscription status
        if not tenant.is_subscription_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Subscription expired or inactive"
            )
        
        # Check resource limits
        if not tenant.check_limits(resource_type, current_count):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Resource limit exceeded for {resource_type}"
            )
        
        return True
    
    @staticmethod
    def get_tenant_usage_stats(db: Session, tenant_id: str) -> Dict[str, Any]:
        """Get current tenant usage statistics"""
        tenant = TenantValidator.validate_tenant_exists(db, tenant_id)
        return tenant.get_usage_stats(db)
    
    @staticmethod
    def audit_tenant_access(db: Session, action: str, resource_type: str, 
                           resource_id: str, details: Optional[Dict[str, Any]] = None):
        """Audit tenant access for security monitoring"""
        context = TenantContext.get_current()
        
        audit_data = {
            "timestamp": "datetime.utcnow()",
            "tenant_id": context.tenant_id,
            "user_id": context.user_id,
            "action": action,
            "resource_type": resource_type,
            "resource_id": resource_id,
            "is_super_admin": context.is_super_admin,
            "is_impersonation": context.is_impersonation,
            "details": details or {}
        }
        
        # Log audit event
        logger.info(f"Tenant access audit: {audit_data}")
        
        # In future, this could be stored in an audit table
        # For now, we're just logging it


def create_tenant_aware_dependency(model_class):
    """
    Factory function to create tenant-aware dependencies for specific models
    """
    def get_tenant_aware_query(
        db: Session = Depends(get_db),
        context: TenantContext = Depends(get_current_tenant_context)
    ):
        """Get tenant-aware query for the model"""
        query = db.query(model_class)
        return TenantAwareQuery.filter_by_tenant(query, model_class)
    
    return get_tenant_aware_query


# Utility functions for common tenant operations
def get_current_tenant_id() -> Optional[str]:
    """Get current tenant ID from context"""
    return current_tenant_id.get()


def get_current_user_id() -> Optional[str]:
    """Get current user ID from context"""
    return current_user_id.get()


def is_super_admin() -> bool:
    """Check if current context is super admin"""
    return is_super_admin_context.get()


def is_impersonation() -> bool:
    """Check if current context is impersonation"""
    return is_impersonation_context.get()


def with_tenant_context(tenant_id: str, user_id: str, is_super_admin: bool = False):
    """Decorator to run function with specific tenant context"""
    def decorator(func):
        def wrapper(*args, **kwargs):
            context = TenantContext(tenant_id, user_id, is_super_admin)
            with context.activate():
                return func(*args, **kwargs)
        return wrapper
    return decorator