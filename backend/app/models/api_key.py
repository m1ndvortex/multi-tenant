"""
API Key model for external integrations
"""

from sqlalchemy import Column, String, DateTime, Boolean, Integer, Text, Index, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
import secrets
import hashlib
from datetime import datetime, timedelta, timezone
from .base import BaseModel, TenantMixin


class ApiKeyStatus(enum.Enum):
    """API Key status enumeration"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    REVOKED = "revoked"
    EXPIRED = "expired"


class ApiKeyScope(enum.Enum):
    """API Key scope enumeration"""
    READ_ONLY = "read_only"
    READ_WRITE = "read_write"
    FULL_ACCESS = "full_access"


class ApiKey(BaseModel, TenantMixin):
    """
    API Key model for external integrations
    Only available for Pro tier tenants
    """
    __tablename__ = "api_keys"
    
    # Basic Information
    name = Column(
        String(255), 
        nullable=False,
        comment="Human-readable name for the API key"
    )
    
    description = Column(
        Text, 
        nullable=True,
        comment="Description of API key purpose"
    )
    
    # Key Management
    key_hash = Column(
        String(255), 
        nullable=False,
        unique=True,
        comment="Hashed API key for security"
    )
    
    key_prefix = Column(
        String(20), 
        nullable=False,
        comment="Visible prefix of the API key"
    )
    
    # Permissions and Scope
    scope = Column(
        String(50), 
        nullable=False,
        default=ApiKeyScope.READ_ONLY.value,
        comment="API key access scope"
    )
    
    allowed_ips = Column(
        Text, 
        nullable=True,
        comment="Comma-separated list of allowed IP addresses"
    )
    
    # Rate Limiting
    rate_limit_per_minute = Column(
        Integer, 
        nullable=False,
        default=60,
        comment="Maximum requests per minute"
    )
    
    rate_limit_per_hour = Column(
        Integer, 
        nullable=False,
        default=1000,
        comment="Maximum requests per hour"
    )
    
    rate_limit_per_day = Column(
        Integer, 
        nullable=False,
        default=10000,
        comment="Maximum requests per day"
    )
    
    # Status and Expiration
    status = Column(
        String(20), 
        nullable=False,
        default=ApiKeyStatus.ACTIVE.value,
        comment="Current status of the API key"
    )
    
    expires_at = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="API key expiration date"
    )
    
    # Usage Tracking
    last_used_at = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="Last time the API key was used"
    )
    
    total_requests = Column(
        Integer, 
        nullable=False,
        default=0,
        comment="Total number of requests made with this key"
    )
    
    # Metadata
    user_agent = Column(
        String(500), 
        nullable=True,
        comment="Last user agent that used this key"
    )
    
    last_ip_address = Column(
        String(45), 
        nullable=True,
        comment="Last IP address that used this key"
    )
    
    # Relationships
    tenant = relationship("Tenant", back_populates="api_keys")
    webhook_endpoints = relationship("WebhookEndpoint", back_populates="api_key", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<ApiKey(id={self.id}, name='{self.name}', tenant_id={self.tenant_id})>"
    
    @classmethod
    def generate_api_key(cls) -> tuple[str, str, str]:
        """
        Generate a new API key
        Returns: (full_key, key_hash, key_prefix)
        """
        # Generate random key
        key = secrets.token_urlsafe(32)
        
        # Create prefix (first 8 characters)
        prefix = key[:8]
        
        # Hash the full key for storage
        key_hash = hashlib.sha256(key.encode()).hexdigest()
        
        return key, key_hash, prefix
    
    @classmethod
    def hash_key(cls, key: str) -> str:
        """Hash an API key for storage"""
        return hashlib.sha256(key.encode()).hexdigest()
    
    def verify_key(self, key: str) -> bool:
        """Verify if provided key matches this API key"""
        return self.key_hash == self.hash_key(key)
    
    @property
    def is_active(self) -> bool:
        """Check if API key is currently active"""
        if self.status != ApiKeyStatus.ACTIVE.value:
            return False
        
        if self.expires_at and datetime.now(timezone.utc) > self.expires_at:
            return False
        
        return True
    
    @property
    def is_expired(self) -> bool:
        """Check if API key is expired"""
        if self.expires_at:
            return datetime.now(timezone.utc) > self.expires_at
        return False
    
    def update_usage(self, ip_address: str = None, user_agent: str = None):
        """Update API key usage statistics"""
        self.last_used_at = datetime.now(timezone.utc)
        self.total_requests += 1
        
        if ip_address:
            self.last_ip_address = ip_address
        
        if user_agent:
            self.user_agent = user_agent
    
    def revoke(self):
        """Revoke the API key"""
        self.status = ApiKeyStatus.REVOKED.value
    
    def activate(self):
        """Activate the API key"""
        self.status = ApiKeyStatus.ACTIVE.value
    
    def deactivate(self):
        """Deactivate the API key"""
        self.status = ApiKeyStatus.INACTIVE.value
    
    def is_ip_allowed(self, ip_address: str) -> bool:
        """Check if IP address is allowed to use this key"""
        if not self.allowed_ips:
            return True  # No IP restrictions
        
        allowed_list = [ip.strip() for ip in self.allowed_ips.split(',')]
        return ip_address in allowed_list
    
    def can_access_scope(self, required_scope: str) -> bool:
        """Check if API key has required scope access"""
        scope_hierarchy = {
            ApiKeyScope.READ_ONLY.value: ["read"],
            ApiKeyScope.READ_WRITE.value: ["read", "write"],
            ApiKeyScope.FULL_ACCESS.value: ["read", "write", "delete", "admin"]
        }
        
        allowed_actions = scope_hierarchy.get(self.scope, [])
        return required_scope in allowed_actions


class ApiKeyUsage(BaseModel):
    """
    API Key usage tracking for rate limiting
    """
    __tablename__ = "api_key_usage"
    
    api_key_id = Column(
        UUID(as_uuid=True), 
        ForeignKey("api_keys.id", ondelete="CASCADE"),
        nullable=False,
        comment="Reference to API key"
    )
    
    # Time periods
    usage_date = Column(
        DateTime(timezone=True),
        nullable=False,
        default=func.now(),
        comment="Date of usage tracking"
    )
    
    usage_hour = Column(
        Integer,
        nullable=False,
        comment="Hour of the day (0-23)"
    )
    
    usage_minute = Column(
        Integer,
        nullable=False,
        comment="Minute of the hour (0-59)"
    )
    
    # Usage counters
    requests_count = Column(
        Integer,
        nullable=False,
        default=1,
        comment="Number of requests in this time period"
    )
    
    # Metadata
    endpoint = Column(
        String(255),
        nullable=True,
        comment="API endpoint accessed"
    )
    
    method = Column(
        String(10),
        nullable=True,
        comment="HTTP method used"
    )
    
    status_code = Column(
        Integer,
        nullable=True,
        comment="HTTP response status code"
    )
    
    # Relationships
    api_key = relationship("ApiKey")
    
    def __repr__(self):
        return f"<ApiKeyUsage(api_key_id={self.api_key_id}, date={self.usage_date}, requests={self.requests_count})>"


class WebhookEndpoint(BaseModel, TenantMixin):
    """
    Webhook endpoint configuration for real-time notifications
    """
    __tablename__ = "webhook_endpoints"
    
    api_key_id = Column(
        UUID(as_uuid=True), 
        ForeignKey("api_keys.id", ondelete="CASCADE"),
        nullable=False,
        comment="Reference to API key"
    )
    
    # Endpoint Configuration
    name = Column(
        String(255), 
        nullable=False,
        comment="Human-readable name for the webhook"
    )
    
    url = Column(
        String(500), 
        nullable=False,
        comment="Webhook endpoint URL"
    )
    
    secret = Column(
        String(255), 
        nullable=True,
        comment="Webhook secret for signature verification"
    )
    
    # Event Configuration
    events = Column(
        Text, 
        nullable=False,
        comment="Comma-separated list of events to subscribe to"
    )
    
    # Status and Settings
    is_active = Column(
        Boolean, 
        nullable=False,
        default=True,
        comment="Whether webhook is active"
    )
    
    retry_count = Column(
        Integer, 
        nullable=False,
        default=3,
        comment="Number of retry attempts for failed deliveries"
    )
    
    timeout_seconds = Column(
        Integer, 
        nullable=False,
        default=30,
        comment="Timeout for webhook requests in seconds"
    )
    
    # Usage Tracking
    last_delivery_at = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="Last successful delivery timestamp"
    )
    
    total_deliveries = Column(
        Integer, 
        nullable=False,
        default=0,
        comment="Total number of webhook deliveries"
    )
    
    failed_deliveries = Column(
        Integer, 
        nullable=False,
        default=0,
        comment="Number of failed deliveries"
    )
    
    # Relationships
    api_key = relationship("ApiKey", back_populates="webhook_endpoints")
    tenant = relationship("Tenant")
    
    def __repr__(self):
        return f"<WebhookEndpoint(id={self.id}, name='{self.name}', url='{self.url}')>"
    
    def get_subscribed_events(self) -> list[str]:
        """Get list of subscribed events"""
        if not self.events:
            return []
        return [event.strip() for event in self.events.split(',')]
    
    def is_subscribed_to_event(self, event_name: str) -> bool:
        """Check if webhook is subscribed to specific event"""
        return event_name in self.get_subscribed_events()
    
    def update_delivery_stats(self, success: bool):
        """Update webhook delivery statistics"""
        self.total_deliveries += 1
        
        if success:
            self.last_delivery_at = datetime.now(timezone.utc)
        else:
            self.failed_deliveries += 1


# Create indexes for performance optimization
Index('idx_api_key_tenant_id', ApiKey.tenant_id)
Index('idx_api_key_key_hash', ApiKey.key_hash)
Index('idx_api_key_status', ApiKey.status)
Index('idx_api_key_expires_at', ApiKey.expires_at)
Index('idx_api_key_usage_api_key_id', ApiKeyUsage.api_key_id)
Index('idx_api_key_usage_date', ApiKeyUsage.usage_date)
Index('idx_webhook_endpoint_tenant_id', WebhookEndpoint.tenant_id)
Index('idx_webhook_endpoint_api_key_id', WebhookEndpoint.api_key_id)
Index('idx_webhook_endpoint_is_active', WebhookEndpoint.is_active)