"""
Professional Subscription Management Schemas
Enhanced Pydantic models for subscription management API
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


class SubscriptionActionEnum(str, Enum):
    """Subscription action enumeration"""
    CREATED = "created"
    UPGRADED = "upgraded"
    DOWNGRADED = "downgraded"
    EXTENDED = "extended"
    ACTIVATED = "activated"
    DEACTIVATED = "deactivated"
    SUSPENDED = "suspended"
    RENEWED = "renewed"
    CANCELLED = "cancelled"


# Request Models
class SubscriptionExtensionRequest(BaseModel):
    """Request model for extending subscription"""
    months: int = Field(ge=1, le=36, description="Number of months to extend")
    reason: Optional[str] = Field(None, max_length=500, description="Reason for extension")
    
    @validator('months')
    def validate_months(cls, v):
        if v < 1 or v > 36:
            raise ValueError('Extension must be between 1 and 36 months')
        return v


class SubscriptionStatusUpdateRequest(BaseModel):
    """Request model for updating subscription status"""
    activate: bool = Field(description="True to activate, False to deactivate")
    subscription_type: Optional[SubscriptionTypeEnum] = Field(None, description="Subscription type when activating")
    reason: Optional[str] = Field(None, max_length=500, description="Reason for status change")


class SubscriptionPlanSwitchRequest(BaseModel):
    """Request model for switching subscription plans"""
    new_plan: SubscriptionTypeEnum = Field(description="New subscription plan")
    duration_months: Optional[int] = Field(None, ge=1, le=36, description="Duration for Pro plan")
    reason: Optional[str] = Field(None, max_length=500, description="Reason for plan switch")
    immediate_effect: bool = Field(True, description="Apply changes immediately")
    
    @validator('duration_months')
    def validate_duration_for_pro(cls, v, values):
        if values.get('new_plan') == SubscriptionTypeEnum.PRO and v is None:
            raise ValueError('Duration is required for Pro subscription')
        return v


# Response Models
class SubscriptionOverviewResponse(BaseModel):
    """Response model for subscription overview"""
    total_tenants: int
    free_subscriptions: int
    pro_subscriptions: int
    enterprise_subscriptions: int = 0
    expiring_soon: int  # Next 30 days
    expired: int
    conversion_rate: float  # Percentage of paid subscriptions
    revenue_impact: Optional[float] = None


class SubscriptionExtensionResponse(BaseModel):
    """Response model for subscription extension"""
    success: bool
    message: str
    tenant_id: str
    old_expiration_date: Optional[str]
    new_expiration_date: str
    months_added: int
    days_added: int


class SubscriptionStatusResponse(BaseModel):
    """Response model for subscription status update"""
    success: bool
    message: str
    tenant_id: str
    old_status: str
    new_status: str
    old_subscription_type: str
    new_subscription_type: str


class SubscriptionPlanSwitchResponse(BaseModel):
    """Response model for subscription plan switch"""
    success: bool
    message: str
    tenant_id: str
    old_plan: str
    new_plan: str
    old_expiration: Optional[str]
    new_expiration: Optional[str]
    limits_updated: bool


class SubscriptionHistoryEntry(BaseModel):
    """Model for subscription history entry"""
    id: str
    action: str
    old_subscription_type: Optional[str]
    new_subscription_type: str
    duration_months: Optional[int]
    old_expiry_date: Optional[str]
    new_expiry_date: Optional[str]
    reason: Optional[str]
    notes: Optional[str]
    change_date: str
    admin_email: Optional[str]
    admin_name: Optional[str]


class SubscriptionHistoryResponse(BaseModel):
    """Response model for subscription history"""
    tenant_id: str
    tenant_name: str
    history: List[SubscriptionHistoryEntry]
    total_entries: int
    current_subscription: str
    current_expiry: Optional[str]


class TenantSubscriptionDetails(BaseModel):
    """Detailed subscription information for a tenant"""
    tenant_id: str
    tenant_name: str
    tenant_email: str
    subscription_type: str
    subscription_status: str
    subscription_starts_at: Optional[str]
    subscription_expires_at: Optional[str]
    days_until_expiry: int
    is_active: bool
    usage_stats: Dict[str, int]
    limits: Dict[str, Any]
    last_activity: Optional[str]


class SubscriptionStatsResponse(BaseModel):
    """Response model for subscription statistics"""
    total_active_subscriptions: int
    subscriptions_by_type: Dict[str, int]
    expiring_this_month: int
    expired_count: int
    new_subscriptions_this_month: int
    churn_rate: float
    average_subscription_duration: float
    revenue_metrics: Dict[str, float]
    last_updated: str


class BulkSubscriptionActionRequest(BaseModel):
    """Request model for bulk subscription actions"""
    tenant_ids: List[str] = Field(min_items=1, max_items=100)
    action: SubscriptionActionEnum
    subscription_type: Optional[SubscriptionTypeEnum] = None
    duration_months: Optional[int] = Field(None, ge=1, le=36)
    reason: Optional[str] = Field(None, max_length=500)


class BulkSubscriptionActionResponse(BaseModel):
    """Response model for bulk subscription actions"""
    success: bool
    message: str
    total_requested: int
    successful_updates: int
    failed_updates: int
    results: List[Dict[str, Any]]
    errors: List[Dict[str, str]]


class SubscriptionAnalyticsResponse(BaseModel):
    """Response model for subscription analytics"""
    period: str  # monthly, quarterly, yearly
    subscription_trends: Dict[str, List[int]]
    conversion_metrics: Dict[str, float]
    retention_rates: Dict[str, float]
    revenue_trends: Dict[str, List[float]]
    churn_analysis: Dict[str, Any]
    growth_metrics: Dict[str, float]


class SubscriptionNotificationSettings(BaseModel):
    """Model for subscription notification settings"""
    expiry_warning_days: List[int] = Field(default=[30, 14, 7, 3, 1])
    usage_warning_thresholds: List[int] = Field(default=[80, 90, 95])
    admin_notifications: bool = True
    tenant_notifications: bool = True
    email_notifications: bool = True
    in_app_notifications: bool = True


class SubscriptionRenewalRequest(BaseModel):
    """Request model for subscription renewal"""
    tenant_id: str
    duration_months: int = Field(ge=1, le=36)
    subscription_type: Optional[SubscriptionTypeEnum] = None
    auto_renew: bool = False
    reason: Optional[str] = None


class SubscriptionRenewalResponse(BaseModel):
    """Response model for subscription renewal"""
    success: bool
    message: str
    tenant_id: str
    old_expiry: Optional[str]
    new_expiry: str
    auto_renew_enabled: bool
    renewal_date: str


# Validation Models
class SubscriptionValidationRequest(BaseModel):
    """Request model for subscription validation"""
    tenant_ids: List[str] = Field(min_items=1, max_items=50)
    check_expiry: bool = True
    check_usage_limits: bool = True
    check_feature_access: bool = True


class SubscriptionValidationResult(BaseModel):
    """Individual validation result"""
    tenant_id: str
    is_valid: bool
    issues: List[str]
    warnings: List[str]
    recommendations: List[str]


class SubscriptionValidationResponse(BaseModel):
    """Response model for subscription validation"""
    total_checked: int
    valid_subscriptions: int
    invalid_subscriptions: int
    results: List[SubscriptionValidationResult]
    summary: Dict[str, int]