"""
API Access System endpoints for external integrations
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request, Header
from sqlalchemy.orm import Session
from ..core.database import get_db
from ..core.auth import get_current_user, PermissionChecker
from ..models.user import User
from ..models.tenant import SubscriptionType
from ..services.api_key_service import ApiKeyService, WebhookService
from ..schemas.api_key import (
    ApiKeyCreate, ApiKeyUpdate, ApiKeyCreateResponse, ApiKeyResponse,
    WebhookEndpointCreate, WebhookEndpointUpdate, WebhookEndpointResponse,
    ApiKeyValidationResponse, RateLimitInfo, ApiDocumentation
)

router = APIRouter(prefix="/api-access", tags=["API Access"])

# Permission checker for API access management
require_api_access = PermissionChecker("api_access", "manage")


@router.post("/keys", response_model=ApiKeyCreateResponse)
async def create_api_key(
    api_key_data: ApiKeyCreate,
    current_user: User = Depends(require_api_access),
    db: Session = Depends(get_db)
):
    """
    Create a new API key for external integrations
    
    **Pro tier feature only**
    
    - **name**: Human-readable name for the API key
    - **description**: Optional description of the API key purpose
    - **scope**: Access scope (read_only, read_write, full_access)
    - **allowed_ips**: Optional comma-separated list of allowed IP addresses
    - **rate_limit_per_minute**: Maximum requests per minute (1-1000)
    - **rate_limit_per_hour**: Maximum requests per hour (1-100000)
    - **rate_limit_per_day**: Maximum requests per day (1-1000000)
    - **expires_in_days**: Optional expiration in days (1-365)
    """
    service = ApiKeyService(db)
    return service.create_api_key(str(current_user.tenant_id), api_key_data)


@router.get("/keys", response_model=List[ApiKeyResponse])
async def get_api_keys(
    current_user: User = Depends(require_api_access),
    db: Session = Depends(get_db)
):
    """
    Get all API keys for the current tenant
    
    Returns list of API keys with usage statistics (excluding the actual key values)
    """
    service = ApiKeyService(db)
    return service.get_api_keys(str(current_user.tenant_id))


@router.get("/keys/{api_key_id}", response_model=ApiKeyResponse)
async def get_api_key(
    api_key_id: str,
    current_user: User = Depends(require_api_access),
    db: Session = Depends(get_db)
):
    """
    Get details of a specific API key
    
    - **api_key_id**: UUID of the API key
    """
    service = ApiKeyService(db)
    return service.get_api_key(str(current_user.tenant_id), api_key_id)


@router.put("/keys/{api_key_id}", response_model=ApiKeyResponse)
async def update_api_key(
    api_key_id: str,
    update_data: ApiKeyUpdate,
    current_user: User = Depends(require_api_access),
    db: Session = Depends(get_db)
):
    """
    Update an API key
    
    - **api_key_id**: UUID of the API key
    - **update_data**: Fields to update
    """
    service = ApiKeyService(db)
    return service.update_api_key(str(current_user.tenant_id), api_key_id, update_data)


@router.delete("/keys/{api_key_id}")
async def revoke_api_key(
    api_key_id: str,
    current_user: User = Depends(require_api_access),
    db: Session = Depends(get_db)
):
    """
    Revoke an API key
    
    - **api_key_id**: UUID of the API key to revoke
    """
    service = ApiKeyService(db)
    return service.revoke_api_key(str(current_user.tenant_id), api_key_id)


@router.get("/keys/{api_key_id}/rate-limits", response_model=RateLimitInfo)
async def get_rate_limits(
    api_key_id: str,
    current_user: User = Depends(require_api_access),
    db: Session = Depends(get_db)
):
    """
    Get current rate limit status for an API key
    
    - **api_key_id**: UUID of the API key
    """
    service = ApiKeyService(db)
    return service.check_rate_limits(api_key_id)


# Webhook Management Endpoints

@router.post("/keys/{api_key_id}/webhooks", response_model=WebhookEndpointResponse)
async def create_webhook_endpoint(
    api_key_id: str,
    webhook_data: WebhookEndpointCreate,
    current_user: User = Depends(require_api_access),
    db: Session = Depends(get_db)
):
    """
    Create a webhook endpoint for real-time notifications
    
    - **api_key_id**: UUID of the API key
    - **name**: Human-readable name for the webhook
    - **url**: Webhook endpoint URL (must be HTTPS in production)
    - **secret**: Optional secret for signature verification
    - **events**: List of events to subscribe to
    - **retry_count**: Number of retry attempts (0-10)
    - **timeout_seconds**: Request timeout in seconds (5-300)
    """
    service = WebhookService(db)
    return service.create_webhook_endpoint(str(current_user.tenant_id), api_key_id, webhook_data)


@router.get("/keys/{api_key_id}/webhooks", response_model=List[WebhookEndpointResponse])
async def get_webhook_endpoints(
    api_key_id: str,
    current_user: User = Depends(require_api_access),
    db: Session = Depends(get_db)
):
    """
    Get all webhook endpoints for an API key
    
    - **api_key_id**: UUID of the API key
    """
    service = WebhookService(db)
    return service.get_webhook_endpoints(str(current_user.tenant_id), api_key_id)


@router.put("/keys/{api_key_id}/webhooks/{webhook_id}", response_model=WebhookEndpointResponse)
async def update_webhook_endpoint(
    api_key_id: str,
    webhook_id: str,
    update_data: WebhookEndpointUpdate,
    current_user: User = Depends(require_api_access),
    db: Session = Depends(get_db)
):
    """
    Update a webhook endpoint
    
    - **api_key_id**: UUID of the API key
    - **webhook_id**: UUID of the webhook endpoint
    - **update_data**: Fields to update
    """
    # Implementation would go here
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Webhook update not yet implemented"
    )


@router.delete("/keys/{api_key_id}/webhooks/{webhook_id}")
async def delete_webhook_endpoint(
    api_key_id: str,
    webhook_id: str,
    current_user: User = Depends(require_api_access),
    db: Session = Depends(get_db)
):
    """
    Delete a webhook endpoint
    
    - **api_key_id**: UUID of the API key
    - **webhook_id**: UUID of the webhook endpoint
    """
    # Implementation would go here
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Webhook deletion not yet implemented"
    )


# API Documentation Endpoints

@router.get("/documentation", response_model=ApiDocumentation)
async def get_api_documentation(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get comprehensive API documentation for external integrations
    
    Returns OpenAPI-style documentation with:
    - Available endpoints and methods
    - Authentication requirements
    - Rate limiting information
    - Webhook event types
    - Code examples
    """
    # Check if user has Pro subscription
    if current_user.tenant.subscription_type != SubscriptionType.PRO:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="API documentation is only available for Pro tier subscriptions"
        )
    
    documentation = ApiDocumentation(
        title="HesaabPlus API",
        version="1.0.0",
        description="External API for HesaabPlus business management platform",
        base_url="https://api.hesaabplus.com/v1",
        authentication={
            "type": "api_key",
            "header": "X-API-Key",
            "description": "Include your API key in the X-API-Key header"
        },
        rate_limits={
            "default": {
                "per_minute": 60,
                "per_hour": 1000,
                "per_day": 10000
            },
            "note": "Rate limits are configurable per API key"
        },
        endpoints=[
            {
                "path": "/v1/customers",
                "method": "GET",
                "summary": "List customers",
                "description": "Get a list of all customers for the authenticated tenant",
                "parameters": [
                    {"name": "page", "type": "integer", "description": "Page number"},
                    {"name": "limit", "type": "integer", "description": "Items per page"},
                    {"name": "search", "type": "string", "description": "Search term"}
                ],
                "responses": {
                    "200": {"description": "List of customers"},
                    "401": {"description": "Invalid API key"},
                    "429": {"description": "Rate limit exceeded"}
                },
                "tags": ["Customers"],
                "requires_auth": True,
                "scope_required": "read"
            },
            {
                "path": "/v1/customers",
                "method": "POST",
                "summary": "Create customer",
                "description": "Create a new customer",
                "parameters": [],
                "responses": {
                    "201": {"description": "Customer created"},
                    "400": {"description": "Invalid data"},
                    "401": {"description": "Invalid API key"},
                    "403": {"description": "Insufficient permissions"}
                },
                "tags": ["Customers"],
                "requires_auth": True,
                "scope_required": "write"
            },
            {
                "path": "/v1/invoices",
                "method": "GET",
                "summary": "List invoices",
                "description": "Get a list of all invoices for the authenticated tenant",
                "parameters": [
                    {"name": "page", "type": "integer", "description": "Page number"},
                    {"name": "limit", "type": "integer", "description": "Items per page"},
                    {"name": "status", "type": "string", "description": "Filter by status"}
                ],
                "responses": {
                    "200": {"description": "List of invoices"},
                    "401": {"description": "Invalid API key"},
                    "429": {"description": "Rate limit exceeded"}
                },
                "tags": ["Invoices"],
                "requires_auth": True,
                "scope_required": "read"
            },
            {
                "path": "/v1/invoices",
                "method": "POST",
                "summary": "Create invoice",
                "description": "Create a new invoice",
                "parameters": [],
                "responses": {
                    "201": {"description": "Invoice created"},
                    "400": {"description": "Invalid data"},
                    "401": {"description": "Invalid API key"},
                    "403": {"description": "Insufficient permissions"}
                },
                "tags": ["Invoices"],
                "requires_auth": True,
                "scope_required": "write"
            }
        ],
        webhook_events=[
            {
                "event": "invoice.created",
                "description": "Triggered when a new invoice is created",
                "payload_example": {
                    "id": "uuid",
                    "invoice_number": "INV-001",
                    "customer_id": "uuid",
                    "total_amount": 1000.00,
                    "status": "draft"
                }
            },
            {
                "event": "invoice.paid",
                "description": "Triggered when an invoice is marked as paid",
                "payload_example": {
                    "id": "uuid",
                    "invoice_number": "INV-001",
                    "paid_amount": 1000.00,
                    "paid_at": "2024-01-01T12:00:00Z"
                }
            },
            {
                "event": "customer.created",
                "description": "Triggered when a new customer is created",
                "payload_example": {
                    "id": "uuid",
                    "name": "John Doe",
                    "email": "john@example.com",
                    "phone": "+1234567890"
                }
            }
        ],
        examples={
            "authentication": {
                "curl": "curl -H 'X-API-Key: your_api_key_here' https://api.hesaabplus.com/v1/customers",
                "javascript": "fetch('https://api.hesaabplus.com/v1/customers', { headers: { 'X-API-Key': 'your_api_key_here' } })",
                "python": "import requests\nheaders = {'X-API-Key': 'your_api_key_here'}\nresponse = requests.get('https://api.hesaabplus.com/v1/customers', headers=headers)"
            },
            "webhook_verification": {
                "description": "Verify webhook signatures using HMAC-SHA256",
                "python": "import hmac\nimport hashlib\n\ndef verify_signature(payload, signature, secret):\n    expected = hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()\n    return hmac.compare_digest(f'sha256={expected}', signature)"
            }
        }
    )
    
    return documentation


# Public API Key Validation Endpoint (for internal use)

@router.post("/validate", response_model=ApiKeyValidationResponse)
async def validate_api_key(
    request: Request,
    x_api_key: Optional[str] = Header(None, alias="X-API-Key"),
    db: Session = Depends(get_db)
):
    """
    Validate an API key (internal endpoint for API gateway)
    
    This endpoint is used internally by the API gateway to validate
    API keys for external API requests.
    """
    if not x_api_key:
        return ApiKeyValidationResponse(
            valid=False,
            error="API key required in X-API-Key header"
        )
    
    # Get client IP address
    client_ip = request.client.host
    if hasattr(request, 'headers') and 'x-forwarded-for' in request.headers:
        client_ip = request.headers['x-forwarded-for'].split(',')[0].strip()
    
    # Get user agent
    user_agent = request.headers.get('user-agent')
    
    service = ApiKeyService(db)
    return service.validate_api_key(x_api_key, client_ip, user_agent)


# Health check endpoint
@router.get("/health")
async def api_access_health_check():
    """API Access system health check"""
    return {
        "status": "healthy",
        "service": "api_access",
        "features": [
            "api_key_management",
            "rate_limiting",
            "webhook_system",
            "api_documentation"
        ]
    }