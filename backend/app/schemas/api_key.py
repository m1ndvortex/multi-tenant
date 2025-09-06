"""
Pydantic schemas for API Key management
"""

from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import datetime
from enum import Enum


class ApiKeyScope(str, Enum):
    """API Key scope enumeration"""
    READ_ONLY = "read_only"
    READ_WRITE = "read_write"
    FULL_ACCESS = "full_access"


class ApiKeyStatus(str, Enum):
    """API Key status enumeration"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    REVOKED = "revoked"
    EXPIRED = "expired"


class ApiKeyCreate(BaseModel):
    """Schema for creating a new API key"""
    name: str = Field(..., min_length=1, max_length=255, description="Human-readable name for the API key")
    description: Optional[str] = Field(None, max_length=1000, description="Description of API key purpose")
    scope: ApiKeyScope = Field(ApiKeyScope.READ_ONLY, description="API key access scope")
    allowed_ips: Optional[str] = Field(None, description="Comma-separated list of allowed IP addresses")
    rate_limit_per_minute: int = Field(60, ge=1, le=1000, description="Maximum requests per minute")
    rate_limit_per_hour: int = Field(1000, ge=1, le=100000, description="Maximum requests per hour")
    rate_limit_per_day: int = Field(10000, ge=1, le=1000000, description="Maximum requests per day")
    expires_in_days: Optional[int] = Field(None, ge=1, le=365, description="Number of days until expiration")
    
    @validator('allowed_ips')
    def validate_allowed_ips(cls, v):
        if v:
            # Basic IP validation - split by comma and check each IP
            ips = [ip.strip() for ip in v.split(',')]
            for ip in ips:
                if not ip:
                    continue
                # Basic IP format validation (simplified)
                parts = ip.split('.')
                if len(parts) != 4:
                    raise ValueError(f"Invalid IP address format: {ip}")
                for part in parts:
                    try:
                        num = int(part)
                        if not 0 <= num <= 255:
                            raise ValueError(f"Invalid IP address: {ip}")
                    except ValueError:
                        raise ValueError(f"Invalid IP address: {ip}")
        return v


class ApiKeyUpdate(BaseModel):
    """Schema for updating an API key"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=1000)
    scope: Optional[ApiKeyScope] = None
    allowed_ips: Optional[str] = None
    rate_limit_per_minute: Optional[int] = Field(None, ge=1, le=1000)
    rate_limit_per_hour: Optional[int] = Field(None, ge=1, le=100000)
    rate_limit_per_day: Optional[int] = Field(None, ge=1, le=1000000)
    status: Optional[ApiKeyStatus] = None
    
    @validator('allowed_ips')
    def validate_allowed_ips(cls, v):
        if v:
            # Basic IP validation - split by comma and check each IP
            ips = [ip.strip() for ip in v.split(',')]
            for ip in ips:
                if not ip:
                    continue
                # Basic IP format validation (simplified)
                parts = ip.split('.')
                if len(parts) != 4:
                    raise ValueError(f"Invalid IP address format: {ip}")
                for part in parts:
                    try:
                        num = int(part)
                        if not 0 <= num <= 255:
                            raise ValueError(f"Invalid IP address: {ip}")
                    except ValueError:
                        raise ValueError(f"Invalid IP address: {ip}")
        return v


class ApiKeyResponse(BaseModel):
    """Schema for API key response"""
    id: str
    name: str
    description: Optional[str]
    key_prefix: str
    scope: str
    allowed_ips: Optional[str]
    rate_limit_per_minute: int
    rate_limit_per_hour: int
    rate_limit_per_day: int
    status: str
    expires_at: Optional[datetime]
    last_used_at: Optional[datetime]
    total_requests: int
    last_ip_address: Optional[str]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class ApiKeyCreateResponse(BaseModel):
    """Schema for API key creation response (includes full key)"""
    id: str
    name: str
    description: Optional[str]
    api_key: str  # Full API key - only shown once
    key_prefix: str
    scope: str
    allowed_ips: Optional[str]
    rate_limit_per_minute: int
    rate_limit_per_hour: int
    rate_limit_per_day: int
    status: str
    expires_at: Optional[datetime]
    created_at: datetime
    
    class Config:
        from_attributes = True


class ApiKeyUsageStats(BaseModel):
    """Schema for API key usage statistics"""
    total_requests: int
    requests_today: int
    requests_this_hour: int
    requests_this_minute: int
    last_used_at: Optional[datetime]
    last_ip_address: Optional[str]
    user_agent: Optional[str]


class WebhookEventType(str, Enum):
    """Webhook event types"""
    INVOICE_CREATED = "invoice.created"
    INVOICE_UPDATED = "invoice.updated"
    INVOICE_PAID = "invoice.paid"
    CUSTOMER_CREATED = "customer.created"
    CUSTOMER_UPDATED = "customer.updated"
    PRODUCT_CREATED = "product.created"
    PRODUCT_UPDATED = "product.updated"
    PAYMENT_RECEIVED = "payment.received"
    INSTALLMENT_DUE = "installment.due"
    INSTALLMENT_OVERDUE = "installment.overdue"


class WebhookEndpointCreate(BaseModel):
    """Schema for creating a webhook endpoint"""
    name: str = Field(..., min_length=1, max_length=255, description="Human-readable name for the webhook")
    url: str = Field(..., min_length=1, max_length=500, description="Webhook endpoint URL")
    secret: Optional[str] = Field(None, min_length=8, max_length=255, description="Webhook secret for signature verification")
    events: List[WebhookEventType] = Field(..., min_items=1, description="List of events to subscribe to")
    retry_count: int = Field(3, ge=0, le=10, description="Number of retry attempts for failed deliveries")
    timeout_seconds: int = Field(30, ge=5, le=300, description="Timeout for webhook requests in seconds")
    
    @validator('url')
    def validate_url(cls, v):
        if not v.startswith(('http://', 'https://')):
            raise ValueError("URL must start with http:// or https://")
        return v


class WebhookEndpointUpdate(BaseModel):
    """Schema for updating a webhook endpoint"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    url: Optional[str] = Field(None, min_length=1, max_length=500)
    secret: Optional[str] = Field(None, min_length=8, max_length=255)
    events: Optional[List[WebhookEventType]] = Field(None, min_items=1)
    is_active: Optional[bool] = None
    retry_count: Optional[int] = Field(None, ge=0, le=10)
    timeout_seconds: Optional[int] = Field(None, ge=5, le=300)
    
    @validator('url')
    def validate_url(cls, v):
        if v and not v.startswith(('http://', 'https://')):
            raise ValueError("URL must start with http:// or https://")
        return v


class WebhookEndpointResponse(BaseModel):
    """Schema for webhook endpoint response"""
    id: str
    name: str
    url: str
    events: List[str]
    is_active: bool
    retry_count: int
    timeout_seconds: int
    last_delivery_at: Optional[datetime]
    total_deliveries: int
    failed_deliveries: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class WebhookDelivery(BaseModel):
    """Schema for webhook delivery information"""
    id: str
    webhook_endpoint_id: str
    event_type: str
    payload: dict
    status: str
    response_status_code: Optional[int]
    response_body: Optional[str]
    attempt_count: int
    delivered_at: Optional[datetime]
    created_at: datetime


class ApiDocumentationEndpoint(BaseModel):
    """Schema for API documentation endpoint"""
    path: str
    method: str
    summary: str
    description: str
    parameters: List[dict]
    responses: dict
    tags: List[str]
    requires_auth: bool
    scope_required: Optional[str]


class ApiDocumentation(BaseModel):
    """Schema for complete API documentation"""
    title: str = "HesaabPlus API"
    version: str = "1.0.0"
    description: str
    base_url: str
    authentication: dict
    rate_limits: dict
    endpoints: List[ApiDocumentationEndpoint]
    webhook_events: List[dict]
    examples: dict


class RateLimitInfo(BaseModel):
    """Schema for rate limit information"""
    limit_per_minute: int
    limit_per_hour: int
    limit_per_day: int
    remaining_minute: int
    remaining_hour: int
    remaining_day: int
    reset_minute: datetime
    reset_hour: datetime
    reset_day: datetime


class ApiKeyValidationResponse(BaseModel):
    """Schema for API key validation response"""
    valid: bool
    api_key_id: Optional[str] = None
    tenant_id: Optional[str] = None
    scope: Optional[str] = None
    rate_limit_info: Optional[RateLimitInfo] = None
    error: Optional[str] = None