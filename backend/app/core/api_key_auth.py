"""
API Key authentication middleware and utilities
"""

from typing import Optional, Tuple
from fastapi import Depends, HTTPException, status, Request, Header
from sqlalchemy.orm import Session
from ..core.database import get_db
from ..models.api_key import ApiKey, ApiKeyStatus
from ..models.tenant import Tenant, TenantStatus
from ..services.api_key_service import ApiKeyService


class ApiKeyAuth:
    """API Key authentication dependency"""
    
    def __init__(self, required_scope: str = "read"):
        self.required_scope = required_scope
    
    async def __call__(
        self,
        request: Request,
        x_api_key: Optional[str] = Header(None, alias="X-API-Key"),
        db: Session = Depends(get_db)
    ) -> Tuple[ApiKey, Tenant]:
        """
        Authenticate request using API key
        
        Returns:
            Tuple of (ApiKey, Tenant) if authentication successful
        
        Raises:
            HTTPException: If authentication fails
        """
        if not x_api_key:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="API key required in X-API-Key header",
                headers={"WWW-Authenticate": "ApiKey"}
            )
        
        # Get client IP address
        client_ip = request.client.host
        if hasattr(request, 'headers') and 'x-forwarded-for' in request.headers:
            client_ip = request.headers['x-forwarded-for'].split(',')[0].strip()
        
        # Get user agent
        user_agent = request.headers.get('user-agent')
        
        # Validate API key
        service = ApiKeyService(db)
        validation_result = service.validate_api_key(x_api_key, client_ip, user_agent)
        
        if not validation_result.valid:
            # Add rate limit headers if available
            headers = {"WWW-Authenticate": "ApiKey"}
            if validation_result.rate_limit_info:
                headers.update({
                    "X-RateLimit-Limit-Minute": str(validation_result.rate_limit_info.limit_per_minute),
                    "X-RateLimit-Remaining-Minute": str(validation_result.rate_limit_info.remaining_minute),
                    "X-RateLimit-Reset-Minute": validation_result.rate_limit_info.reset_minute.isoformat(),
                })
            
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=validation_result.error or "Invalid API key",
                headers=headers
            )
        
        # Get API key from database
        api_key = db.query(ApiKey).filter(
            ApiKey.id == validation_result.api_key_id,
            ApiKey.status == ApiKeyStatus.ACTIVE.value
        ).first()
        
        if not api_key:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="API key not found"
            )
        
        # Check scope permissions
        if not api_key.can_access_scope(self.required_scope):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"API key does not have required scope: {self.required_scope}"
            )
        
        # Get tenant
        tenant = db.query(Tenant).filter(
            Tenant.id == api_key.tenant_id,
            Tenant.status == TenantStatus.ACTIVE
        ).first()
        
        if not tenant:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Tenant not found or inactive"
            )
        
        # Record API usage
        service.record_api_usage(
            api_key_id=str(api_key.id),
            endpoint=str(request.url.path),
            method=request.method,
            status_code=200  # Will be updated by middleware if different
        )
        
        # Add rate limit headers to response
        if validation_result.rate_limit_info:
            # Store rate limit info in request state for middleware to add to response
            request.state.rate_limit_info = validation_result.rate_limit_info
        
        return api_key, tenant


# Common API key authentication dependencies
require_api_key_read = ApiKeyAuth("read")
require_api_key_write = ApiKeyAuth("write")
require_api_key_full = ApiKeyAuth("admin")


class ApiKeyMiddleware:
    """Middleware to add rate limit headers to API responses"""
    
    def __init__(self, app):
        self.app = app
    
    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        
        # Create request object to check for rate limit info
        from fastapi import Request
        request = Request(scope, receive)
        
        async def send_wrapper(message):
            if message["type"] == "http.response.start":
                # Add rate limit headers if available
                if hasattr(request.state, 'rate_limit_info'):
                    rate_limit = request.state.rate_limit_info
                    headers = message.get("headers", [])
                    
                    # Add rate limit headers
                    headers.extend([
                        (b"x-ratelimit-limit-minute", str(rate_limit.limit_per_minute).encode()),
                        (b"x-ratelimit-remaining-minute", str(rate_limit.remaining_minute).encode()),
                        (b"x-ratelimit-reset-minute", rate_limit.reset_minute.isoformat().encode()),
                        (b"x-ratelimit-limit-hour", str(rate_limit.limit_per_hour).encode()),
                        (b"x-ratelimit-remaining-hour", str(rate_limit.remaining_hour).encode()),
                        (b"x-ratelimit-reset-hour", rate_limit.reset_hour.isoformat().encode()),
                        (b"x-ratelimit-limit-day", str(rate_limit.limit_per_day).encode()),
                        (b"x-ratelimit-remaining-day", str(rate_limit.remaining_day).encode()),
                        (b"x-ratelimit-reset-day", rate_limit.reset_day.isoformat().encode()),
                    ])
                    
                    message["headers"] = headers
            
            await send(message)
        
        await self.app(scope, receive, send_wrapper)


def get_api_key_context(
    api_key: ApiKey = Depends(require_api_key_read),
    tenant: Tenant = Depends(require_api_key_read)
) -> dict:
    """
    Get API key context for use in endpoints
    
    Returns:
        Dictionary with API key and tenant information
    """
    return {
        "api_key_id": str(api_key.id),
        "api_key_name": api_key.name,
        "api_key_scope": api_key.scope,
        "tenant_id": str(tenant.id),
        "tenant_name": tenant.name,
        "subscription_type": tenant.subscription_type.value
    }