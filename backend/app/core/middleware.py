"""
Middleware for permission validation and request processing
"""

from typing import Callable, Optional
from fastapi import Request, Response, HTTPException, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp
import time
import uuid
import logging

from .database import SessionLocal
from .auth import verify_token, AuthenticationError
from ..models.user import User, UserStatus
from ..models.tenant import Tenant, TenantStatus
from ..models.activity_log import ActivityLog
from .permissions import check_resource_permission


logger = logging.getLogger(__name__)


class PermissionMiddleware(BaseHTTPMiddleware):
    """
    Middleware for validating user permissions on API endpoints
    """
    
    def __init__(self, app: ASGIApp):
        super().__init__(app)
        
        # Define protected endpoints and their required permissions
        self.protected_endpoints = {
            # User management endpoints
            "/api/users": {
                "GET": ("users", "read"),
                "POST": ("users", "create")
            },
            "/api/users/{user_id}": {
                "GET": ("users", "read"),
                "PUT": ("users", "update"),
                "DELETE": ("users", "delete")
            },
            
            # Customer management endpoints
            "/api/customers": {
                "GET": ("customers", "read"),
                "POST": ("customers", "create")
            },
            "/api/customers/{customer_id}": {
                "GET": ("customers", "read"),
                "PUT": ("customers", "update"),
                "DELETE": ("customers", "delete")
            },
            
            # Product management endpoints
            "/api/products": {
                "GET": ("products", "read"),
                "POST": ("products", "create")
            },
            "/api/products/{product_id}": {
                "GET": ("products", "read"),
                "PUT": ("products", "update"),
                "DELETE": ("products", "delete")
            },
            
            # Invoice management endpoints
            "/api/invoices": {
                "GET": ("invoices", "read"),
                "POST": ("invoices", "create")
            },
            "/api/invoices/{invoice_id}": {
                "GET": ("invoices", "read"),
                "PUT": ("invoices", "update"),
                "DELETE": ("invoices", "delete")
            },
            
            # Accounting endpoints
            "/api/accounting": {
                "GET": ("accounting", "read"),
                "POST": ("accounting", "create")
            },
            
            # Reports endpoints
            "/api/reports": {
                "GET": ("reports", "read")
            },
            
            # Settings endpoints
            "/api/settings": {
                "GET": ("settings", "read"),
                "PUT": ("settings", "update")
            }
        }
        
        # Endpoints that don't require authentication
        self.public_endpoints = {
            "/api/auth/login",
            "/api/auth/register",
            "/api/auth/refresh",
            "/api/health",
            "/docs",
            "/redoc",
            "/openapi.json"
        }
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """
        Process request and validate permissions
        """
        start_time = time.time()
        
        # Skip permission check for public endpoints
        if self._is_public_endpoint(request.url.path):
            response = await call_next(request)
            return response
        
        # Skip permission check for super admin endpoints
        if request.url.path.startswith("/api/super-admin"):
            response = await call_next(request)
            return response
        
        try:
            # Extract and validate JWT token
            user = await self._authenticate_request(request)
            
            if user:
                # Add user to request state
                request.state.current_user = user
                
                # Check permissions for protected endpoints
                if self._requires_permission_check(request.url.path, request.method):
                    if not await self._check_permissions(request, user):
                        return JSONResponse(
                            status_code=status.HTTP_403_FORBIDDEN,
                            content={"detail": "Insufficient permissions"}
                        )
                
                # Update user activity timestamp
                await self._update_user_activity(user, request)
            
            # Process request
            response = await call_next(request)
            
            # Log successful request
            if user:
                await self._log_request_activity(
                    request, user, response.status_code, 
                    duration_ms=int((time.time() - start_time) * 1000)
                )
            
            return response
            
        except AuthenticationError as e:
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={"detail": str(e)}
            )
        except Exception as e:
            logger.error(f"Permission middleware error: {e}")
            
            # Log failed request if user is available
            if hasattr(request.state, 'current_user'):
                await self._log_request_activity(
                    request, request.state.current_user, 500,
                    error_message=str(e),
                    duration_ms=int((time.time() - start_time) * 1000)
                )
            
            return JSONResponse(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                content={"detail": "Internal server error"}
            )
    
    def _is_public_endpoint(self, path: str) -> bool:
        """Check if endpoint is public"""
        return any(path.startswith(endpoint) for endpoint in self.public_endpoints)
    
    def _requires_permission_check(self, path: str, method: str) -> bool:
        """Check if endpoint requires permission validation"""
        # Check exact match first
        if path in self.protected_endpoints:
            return method in self.protected_endpoints[path]
        
        # Check pattern matches (with path parameters)
        for pattern in self.protected_endpoints:
            if self._path_matches_pattern(path, pattern):
                return method in self.protected_endpoints[pattern]
        
        return False
    
    def _path_matches_pattern(self, path: str, pattern: str) -> bool:
        """Check if path matches pattern with parameters"""
        path_parts = path.split('/')
        pattern_parts = pattern.split('/')
        
        if len(path_parts) != len(pattern_parts):
            return False
        
        for path_part, pattern_part in zip(path_parts, pattern_parts):
            if pattern_part.startswith('{') and pattern_part.endswith('}'):
                # This is a path parameter, skip validation
                continue
            elif path_part != pattern_part:
                return False
        
        return True
    
    async def _authenticate_request(self, request: Request) -> Optional[User]:
        """Authenticate request and return user"""
        # Get authorization header
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return None
        
        token = auth_header.split(" ")[1]
        
        try:
            # Verify token
            payload = verify_token(token)
            user_id = payload.get("user_id")
            tenant_id = payload.get("tenant_id")
            
            if not user_id:
                raise AuthenticationError("Invalid token payload")
            
            # Get user from database
            db = SessionLocal()
            try:
                user = db.query(User).filter(User.id == user_id).first()
                
                if not user or user.status != UserStatus.ACTIVE:
                    raise AuthenticationError("User not found or inactive")
                
                # Check tenant status for non-super admin users
                if not user.is_super_admin and user.tenant:
                    if user.tenant.status != TenantStatus.ACTIVE:
                        raise AuthenticationError("Tenant account is not active")
                
                # Add token context
                user.current_tenant_id = tenant_id
                user.is_impersonation = payload.get("is_impersonation", False)
                
                return user
                
            finally:
                db.close()
                
        except Exception as e:
            logger.warning(f"Authentication failed: {e}")
            raise AuthenticationError("Invalid or expired token")
    
    async def _check_permissions(self, request: Request, user: User) -> bool:
        """Check if user has required permissions for endpoint"""
        path = request.url.path
        method = request.method
        
        # Get required permission
        required_permission = self._get_required_permission(path, method)
        if not required_permission:
            return True  # No specific permission required
        
        resource, action = required_permission
        
        # Check permission
        return check_resource_permission(user, resource, action)
    
    def _get_required_permission(self, path: str, method: str) -> Optional[tuple]:
        """Get required permission for endpoint"""
        # Check exact match first
        if path in self.protected_endpoints:
            return self.protected_endpoints[path].get(method)
        
        # Check pattern matches
        for pattern in self.protected_endpoints:
            if self._path_matches_pattern(path, pattern):
                return self.protected_endpoints[pattern].get(method)
        
        return None
    
    async def _update_user_activity(self, user: User, request: Request):
        """Update user activity timestamp"""
        try:
            from ..tasks.activity_logging import update_user_activity_timestamp
            
            if user.tenant_id:
                update_user_activity_timestamp.delay(
                    user_id=str(user.id),
                    tenant_id=str(user.tenant_id)
                )
        except Exception as e:
            logger.warning(f"Failed to update user activity: {e}")
    
    async def _log_request_activity(
        self, 
        request: Request, 
        user: User, 
        status_code: int,
        error_message: str = None,
        duration_ms: int = None
    ):
        """Log request activity"""
        try:
            from ..tasks.activity_logging import log_user_activity
            
            # Determine action based on method and path
            action = self._get_action_name(request.method, request.url.path)
            
            # Get client IP
            client_ip = request.client.host if request.client else None
            if "x-forwarded-for" in request.headers:
                client_ip = request.headers["x-forwarded-for"].split(",")[0].strip()
            elif "x-real-ip" in request.headers:
                client_ip = request.headers["x-real-ip"]
            
            # Get user agent
            user_agent = request.headers.get("user-agent")
            
            # Determine status
            request_status = "success" if 200 <= status_code < 400 else "failed"
            
            if user.tenant_id:
                log_user_activity.delay(
                    user_id=str(user.id),
                    tenant_id=str(user.tenant_id),
                    action=action,
                    details={
                        "method": request.method,
                        "path": str(request.url.path),
                        "status_code": status_code,
                        "query_params": dict(request.query_params) if request.query_params else None
                    },
                    ip_address=client_ip,
                    user_agent=user_agent,
                    status=request_status,
                    error_message=error_message,
                    duration_ms=duration_ms
                )
        except Exception as e:
            logger.warning(f"Failed to log request activity: {e}")
    
    def _get_action_name(self, method: str, path: str) -> str:
        """Generate action name from method and path"""
        # Extract resource from path
        path_parts = [part for part in path.split('/') if part and not part.startswith('{')]
        
        if len(path_parts) >= 2 and path_parts[0] == 'api':
            resource = path_parts[1]
            
            # Map HTTP methods to action names
            method_mapping = {
                'GET': f'{resource}_viewed',
                'POST': f'{resource}_created',
                'PUT': f'{resource}_updated',
                'PATCH': f'{resource}_updated',
                'DELETE': f'{resource}_deleted'
            }
            
            return method_mapping.get(method, f'{resource}_accessed')
        
        return f'api_accessed'


class TenantIsolationMiddleware(BaseHTTPMiddleware):
    """
    Middleware to ensure tenant data isolation
    """
    
    def __init__(self, app: ASGIApp):
        super().__init__(app)
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """
        Ensure tenant isolation for all requests
        """
        # Skip for public endpoints and super admin
        if (self._is_public_endpoint(request.url.path) or 
            request.url.path.startswith("/api/super-admin")):
            return await call_next(request)
        
        # Get current user from request state (set by PermissionMiddleware)
        user = getattr(request.state, 'current_user', None)
        
        if user and not user.is_super_admin:
            # Add tenant context to request
            request.state.tenant_id = user.tenant_id
            
            # Validate tenant access for path parameters
            await self._validate_tenant_access(request, user)
        
        return await call_next(request)
    
    def _is_public_endpoint(self, path: str) -> bool:
        """Check if endpoint is public"""
        public_endpoints = {
            "/api/auth/login",
            "/api/auth/register", 
            "/api/auth/refresh",
            "/api/health",
            "/docs",
            "/redoc",
            "/openapi.json"
        }
        return any(path.startswith(endpoint) for endpoint in public_endpoints)
    
    async def _validate_tenant_access(self, request: Request, user: User):
        """
        Validate that user can only access resources from their tenant
        This is an additional security layer beyond database-level isolation
        """
        # For now, this is handled at the database query level
        # Additional validation could be added here if needed
        pass


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Simple rate limiting middleware
    """
    
    def __init__(self, app: ASGIApp, requests_per_minute: int = 60):
        super().__init__(app)
        self.requests_per_minute = requests_per_minute
        self.request_counts = {}  # In production, use Redis
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """
        Apply rate limiting based on IP address
        """
        # Get client IP
        client_ip = request.client.host if request.client else "unknown"
        if "x-forwarded-for" in request.headers:
            client_ip = request.headers["x-forwarded-for"].split(",")[0].strip()
        
        # Check rate limit
        current_time = int(time.time() / 60)  # Current minute
        key = f"{client_ip}:{current_time}"
        
        if key in self.request_counts:
            self.request_counts[key] += 1
        else:
            self.request_counts[key] = 1
            
            # Clean up old entries
            old_keys = [k for k in self.request_counts.keys() 
                       if int(k.split(':')[1]) < current_time - 1]
            for old_key in old_keys:
                del self.request_counts[old_key]
        
        if self.request_counts[key] > self.requests_per_minute:
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={"detail": "Rate limit exceeded"}
            )
        
        return await call_next(request)