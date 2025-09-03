"""
Subscription Validation Middleware
Middleware for enforcing subscription limits and feature access
"""

from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from sqlalchemy.orm import Session
import logging
import re

from .database import SessionLocal
from ..services.subscription_service import SubscriptionService
from ..models.user import User

logger = logging.getLogger(__name__)


class SubscriptionValidationMiddleware(BaseHTTPMiddleware):
    """
    Middleware to validate subscription limits and feature access
    """
    
    # Endpoints that require subscription validation
    PROTECTED_ENDPOINTS = {
        # Resource creation endpoints
        r'/api/users/?$': {'resource': 'users', 'method': 'POST'},
        r'/api/customers/?$': {'resource': 'customers', 'method': 'POST'},
        r'/api/products/?$': {'resource': 'products', 'method': 'POST'},
        r'/api/invoices/?$': {'resource': 'monthly_invoices', 'method': 'POST'},
        
        # Feature-specific endpoints
        r'/api/reports/advanced/?.*': {'feature': 'advanced_reporting'},
        r'/api/api-access/?.*': {'feature': 'api_access'},
        r'/api/roles/?.*': {'feature': 'role_based_permissions'},
    }
    
    # Endpoints that are always allowed (no subscription check)
    EXEMPT_ENDPOINTS = [
        r'/api/health/?.*',
        r'/api/auth/?.*',
        r'/api/subscription/?.*',
        r'/docs/?.*',
        r'/redoc/?.*',
        r'/openapi.json',
        r'/api/super-admin/?.*',  # Super admin endpoints
    ]
    
    async def dispatch(self, request: Request, call_next):
        """Process request and validate subscription if needed"""
        
        # Skip validation for exempt endpoints
        if self._is_exempt_endpoint(request.url.path):
            return await call_next(request)
        
        # Skip validation for non-protected endpoints
        protection_config = self._get_protection_config(request.url.path, request.method)
        if not protection_config:
            return await call_next(request)
        
        # Get current user from request state
        current_user = getattr(request.state, 'current_user', None)
        if not current_user:
            # If no user, let auth middleware handle it
            return await call_next(request)
        
        # Skip validation for super admin users
        if getattr(current_user, 'is_super_admin', False):
            return await call_next(request)
        
        # Validate subscription
        try:
            db = SessionLocal()
            subscription_service = SubscriptionService(db)
            
            # Check if subscription is valid
            validation = subscription_service.validate_subscription_status(str(current_user.tenant_id))
            if not validation['valid']:
                db.close()
                return JSONResponse(
                    status_code=status.HTTP_402_PAYMENT_REQUIRED,
                    content={
                        "detail": validation['message'],
                        "type": "subscription_error",
                        "reason": validation['reason']
                    }
                )
            
            # Check resource limits if applicable
            if 'resource' in protection_config:
                resource_check = subscription_service.check_resource_limit(
                    str(current_user.tenant_id),
                    protection_config['resource']
                )
                
                if not resource_check['allowed']:
                    db.close()
                    return JSONResponse(
                        status_code=status.HTTP_403_FORBIDDEN,
                        content={
                            "detail": resource_check['message'],
                            "type": "resource_limit_exceeded",
                            "reason": resource_check['reason'],
                            "resource": protection_config['resource'],
                            "current_usage": resource_check['current_usage'],
                            "limit": resource_check['limit']
                        }
                    )
            
            # Check feature access if applicable
            if 'feature' in protection_config:
                feature_check = subscription_service.check_feature_access(
                    str(current_user.tenant_id),
                    protection_config['feature']
                )
                
                if not feature_check['allowed']:
                    db.close()
                    return JSONResponse(
                        status_code=status.HTTP_403_FORBIDDEN,
                        content={
                            "detail": feature_check['message'],
                            "type": "feature_not_available",
                            "reason": feature_check['reason'],
                            "feature": protection_config['feature'],
                            "subscription_type": feature_check['subscription_type']
                        }
                    )
            
            db.close()
            
        except Exception as e:
            logger.error(f"Subscription validation error: {e}")
            # Don't block request on validation errors, just log
            pass
        
        return await call_next(request)
    
    def _is_exempt_endpoint(self, path: str) -> bool:
        """Check if endpoint is exempt from subscription validation"""
        for pattern in self.EXEMPT_ENDPOINTS:
            if re.match(pattern, path):
                return True
        return False
    
    def _get_protection_config(self, path: str, method: str) -> dict:
        """Get protection configuration for endpoint"""
        for pattern, config in self.PROTECTED_ENDPOINTS.items():
            if re.match(pattern, path):
                # Check if method matches (if specified)
                if 'method' in config and config['method'] != method:
                    continue
                return config
        return {}


class ResourceLimitDecorator:
    """
    Decorator for API endpoints to enforce resource limits
    """
    
    def __init__(self, resource_type: str, increment: int = 1):
        self.resource_type = resource_type
        self.increment = increment
    
    def __call__(self, func):
        async def wrapper(*args, **kwargs):
            # Extract current_user and db from kwargs
            current_user = kwargs.get('current_user')
            db = kwargs.get('db')
            
            if not current_user or not db:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Missing required dependencies for resource limit check"
                )
            
            # Skip check for super admin
            if getattr(current_user, 'is_super_admin', False):
                return await func(*args, **kwargs)
            
            # Check resource limit
            subscription_service = SubscriptionService(db)
            result = subscription_service.check_resource_limit(
                str(current_user.tenant_id),
                self.resource_type,
                self.increment
            )
            
            if not result['allowed']:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=result['message'],
                    headers={
                        "X-Resource-Type": self.resource_type,
                        "X-Current-Usage": str(result['current_usage']),
                        "X-Limit": str(result['limit']),
                        "X-Remaining": str(result['remaining'])
                    }
                )
            
            return await func(*args, **kwargs)
        
        return wrapper


class FeatureAccessDecorator:
    """
    Decorator for API endpoints to enforce feature access
    """
    
    def __init__(self, feature: str):
        self.feature = feature
    
    def __call__(self, func):
        async def wrapper(*args, **kwargs):
            # Extract current_user and db from kwargs
            current_user = kwargs.get('current_user')
            db = kwargs.get('db')
            
            if not current_user or not db:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Missing required dependencies for feature access check"
                )
            
            # Skip check for super admin
            if getattr(current_user, 'is_super_admin', False):
                return await func(*args, **kwargs)
            
            # Check feature access
            subscription_service = SubscriptionService(db)
            result = subscription_service.check_feature_access(
                str(current_user.tenant_id),
                self.feature
            )
            
            if not result['allowed']:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=result['message'],
                    headers={
                        "X-Feature": self.feature,
                        "X-Subscription-Type": result['subscription_type']
                    }
                )
            
            return await func(*args, **kwargs)
        
        return wrapper


# Convenience decorators
def require_resource_limit(resource_type: str, increment: int = 1):
    """Decorator to require resource limit check"""
    return ResourceLimitDecorator(resource_type, increment)


def require_feature_access(feature: str):
    """Decorator to require feature access check"""
    return FeatureAccessDecorator(feature)