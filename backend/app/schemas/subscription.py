"""
Subscription Management Schemas
Pydantic models for subscription-related API requests and responses
"""

from pydantic import BaseModel, Field, validator
from typing import Dict, Any, Optional, List
from datetime import datetime
from enum import Enum


class SubscriptionTypeEnum(str, Enum):
    """Subscription type enumeration"""
    FREE = "free"
    PRO = "pro"
    ENTERPRISE = "enterprise"


class FeatureEnum(str, Enum):
    """Available features enumeration"""
    API_ACCESS = "api_access"
    ADVANCED_REPORTING = "advanced_reporting"
    ROLE_BASED_PERMISSIONS = "role_based_permissions"
    UNLIMITED_STORAGE = "unlimited_storage"


class ResourceTypeEnum(str, Enum):
    """Resource type enumeration"""
    USERS = "users"
    PRODUCTS = "products"
    CUSTOMERS = "customers"
    MONTHLY_INVOICES = "monthly_invoices"


class SubscriptionInfoResponse(BaseModel):
    """Response model for subscription information"""
    tenant_id: str
    subscription_type: str
    subscription_active: bool
    subscription_expires_at: Optional[str] = None
    days_until_expiry: int
    usage: Dict[str, int]
    limits: Dict[str, Any]
    usage_percentages: Dict[str, float]
    features: Dict[str, bool]
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class ResourceLimitCheckRequest(BaseModel):
    """Request model for checking resource limits"""
    resource_type: ResourceTypeEnum
    increment: int = Field(default=1, ge=1, description="Number of resources to add")


class ResourceLimitCheckResponse(BaseModel):
    """Response model for resource limit check"""
    allowed: bool
    reason: str
    message: str
    current_usage: int
    limit: int
    remaining: int


class FeatureAccessRequest(BaseModel):
    """Request model for checking feature access"""
    feature: FeatureEnum


class FeatureAccessResponse(BaseModel):
    """Response model for feature access check"""
    allowed: bool
    reason: str
    message: str
    subscription_type: str
    feature: str


class SubscriptionUpgradeRequest(BaseModel):
    """Request model for subscription upgrade"""
    new_subscription: SubscriptionTypeEnum
    duration_months: int = Field(default=12, ge=1, le=36, description="Duration in months")
    
    @validator('duration_months')
    def validate_duration(cls, v, values):
        # Only Pro subscriptions need duration
        if values.get('new_subscription') == SubscriptionTypeEnum.PRO and v < 1:
            raise ValueError('Duration must be at least 1 month for Pro subscription')
        return v


class SubscriptionUpgradeResponse(BaseModel):
    """Response model for subscription upgrade"""
    success: bool
    message: str
    old_subscription: str
    new_subscription: str
    expires_at: Optional[str] = None


class SubscriptionWarning(BaseModel):
    """Model for subscription warnings"""
    type: str
    severity: str  # low, medium, high
    message: str
    action: str
    resource: Optional[str] = None


class SubscriptionWarningsResponse(BaseModel):
    """Response model for subscription warnings"""
    warnings: List[SubscriptionWarning]
    total_warnings: int
    has_critical_warnings: bool


class SubscriptionValidationResponse(BaseModel):
    """Response model for subscription validation"""
    valid: bool
    reason: str
    message: str
    status: Optional[str] = None
    subscription_type: Optional[str] = None
    expires_at: Optional[str] = None
    expired_at: Optional[str] = None


class UsageStatsResponse(BaseModel):
    """Response model for usage statistics"""
    tenant_id: str
    period: str  # current_month, current_year, etc.
    usage: Dict[str, int]
    limits: Dict[str, Any]
    usage_percentages: Dict[str, float]
    last_updated: str


class SubscriptionLimitsResponse(BaseModel):
    """Response model for subscription limits"""
    subscription_type: str
    limits: Dict[str, Any]
    features: Dict[str, bool]


class BulkResourceCheckRequest(BaseModel):
    """Request model for checking multiple resource limits"""
    resources: List[ResourceLimitCheckRequest]


class BulkResourceCheckResponse(BaseModel):
    """Response model for bulk resource limit check"""
    results: Dict[str, ResourceLimitCheckResponse]
    all_allowed: bool
    blocked_resources: List[str]


class SubscriptionMetricsResponse(BaseModel):
    """Response model for subscription metrics"""
    tenant_id: str
    subscription_type: str
    subscription_active: bool
    total_usage: Dict[str, int]
    monthly_usage: Dict[str, int]
    daily_usage: Dict[str, int]
    usage_trends: Dict[str, List[int]]  # Last 30 days
    efficiency_score: float  # Usage vs limits ratio
    recommendations: List[str]


class SubscriptionHistoryEntry(BaseModel):
    """Model for subscription history entry"""
    date: str
    action: str  # upgrade, downgrade, renewal, expiry
    old_subscription: Optional[str] = None
    new_subscription: Optional[str] = None
    duration_months: Optional[int] = None
    reason: Optional[str] = None


class SubscriptionHistoryResponse(BaseModel):
    """Response model for subscription history"""
    tenant_id: str
    history: List[SubscriptionHistoryEntry]
    total_entries: int


class SubscriptionRenewalRequest(BaseModel):
    """Request model for subscription renewal"""
    duration_months: int = Field(default=12, ge=1, le=36)
    auto_renew: bool = Field(default=False)


class SubscriptionRenewalResponse(BaseModel):
    """Response model for subscription renewal"""
    success: bool
    message: str
    new_expiry_date: str
    auto_renew_enabled: bool


class SubscriptionCancellationRequest(BaseModel):
    """Request model for subscription cancellation"""
    reason: Optional[str] = None
    immediate: bool = Field(default=False, description="Cancel immediately or at end of period")


class SubscriptionCancellationResponse(BaseModel):
    """Response model for subscription cancellation"""
    success: bool
    message: str
    cancellation_date: str
    access_until: Optional[str] = None