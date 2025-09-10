"""
Professional Subscription Management Schemas
Pydantic models for super admin subscription management API
"""

from pydantic import BaseModel, Field, validator
from typing import Dict, Any, Optional, List
from datetime import datetime
from enum import Enum

from ..models.tenant import SubscriptionType, TenantStatus


class SubscriptionOverviewResponse(BaseModel):
    """Response model for subscription overview dashboard"""
    total_tenants: int = Field(..., description="Total number of tenants")
    free_subscriptions: int = Field(..., description="Number of free subscriptions")
    pro_subscriptions: int = Field(..., description="Number of pro subscriptions")
    active_pro_subscriptions: int = Field(..., description="Number of active pro subscriptions")
    expiring_soon: int = Field(..., description="Subscriptions expiring in next 30 days")
    expired_subscriptions: int = Field(..., description="Number of expired subscriptions")
    conversion_rate: float = Field(..., description="Free to Pro conversion rate percentage")
    recent_upgrades: int = Field(..., description="Upgrades in last 30 days")
    last_updated: datetime = Field(..., description="Last update timestamp")


class TenantSubscriptionResponse(BaseModel):
    """Response model for tenant subscription details"""
    id: str
    name: str
    email: str
    subscription_type: SubscriptionType
    status: TenantStatus
    subscription_starts_at: Optional[datetime]
    subscription_expires_at: Optional[datetime]
    is_subscription_active: bool
    days_until_expiry: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class SubscriptionExtensionRequest(BaseModel):
    """Request model for extending subscription"""
    months: int = Field(..., ge=1, le=60, description="Number of months to extend")
    reason: Optional[str] = Field(None, description="Reason for extension")
    keep_current_plan: bool = Field(False, description="Keep current plan instead of upgrading to Pro")


class SubscriptionExtensionResponse(BaseModel):
    """Response model for subscription extension"""
    success: bool
    message: str
    tenant_id: str
    tenant_name: str
    old_expiration_date: Optional[datetime]
    new_expiration_date: Optional[datetime]
    months_added: int
    subscription_type: SubscriptionType


class SubscriptionStatusAction(str, Enum):
    """Subscription status actions"""
    ACTIVATE = "activate"
    DEACTIVATE = "deactivate"
    SUSPEND = "suspend"
    DISABLE = "disable"


class SubscriptionStatusUpdateRequest(BaseModel):
    """Request model for updating subscription status"""
    action: SubscriptionStatusAction = Field(..., description="Action to perform")
    subscription_type: Optional[SubscriptionType] = Field(None, description="Subscription type to set when activating")
    reason: Optional[str] = Field(None, description="Reason for status change")


class SubscriptionStatusUpdateResponse(BaseModel):
    """Response model for subscription status update"""
    success: bool
    message: str
    tenant_id: str
    tenant_name: str
    old_status: TenantStatus
    new_status: TenantStatus
    subscription_type: SubscriptionType
    action_performed: str


class SubscriptionPlanSwitchRequest(BaseModel):
    """Request model for switching subscription plan"""
    new_plan: SubscriptionType = Field(..., description="New subscription plan")
    duration_months: Optional[int] = Field(None, ge=1, le=60, description="Duration for Pro plan")
    reason: Optional[str] = Field(None, description="Reason for plan switch")
    
    @validator('duration_months')
    def validate_duration_for_pro(cls, v, values):
        if values.get('new_plan') == SubscriptionType.PRO and v is None:
            # Default to 12 months for Pro if not specified
            return 12
        elif values.get('new_plan') == SubscriptionType.FREE and v is not None:
            raise ValueError("Duration not applicable for FREE subscription")
        return v


class SubscriptionPlanSwitchResponse(BaseModel):
    """Response model for subscription plan switch"""
    success: bool
    message: str
    tenant_id: str
    tenant_name: str
    old_plan: SubscriptionType
    new_plan: SubscriptionType
    immediate_effect: bool
    subscription_expires_at: Optional[datetime]


class SubscriptionFullControlRequest(BaseModel):
    """Request model for full manual subscription control"""
    subscription_type: Optional[SubscriptionType] = Field(None, description="Subscription type")
    custom_start_date: Optional[datetime] = Field(None, description="Custom subscription start date")
    custom_end_date: Optional[datetime] = Field(None, description="Custom subscription end date")
    max_users: Optional[int] = Field(None, ge=1, description="Maximum users limit")
    max_products: Optional[int] = Field(None, ge=-1, description="Maximum products limit (-1 for unlimited)")
    max_customers: Optional[int] = Field(None, ge=-1, description="Maximum customers limit (-1 for unlimited)")
    max_monthly_invoices: Optional[int] = Field(None, ge=-1, description="Maximum monthly invoices limit (-1 for unlimited)")
    status: Optional[TenantStatus] = Field(None, description="Tenant status")
    admin_notes: Optional[str] = Field(None, description="Admin notes for this change")


class SubscriptionFullControlResponse(BaseModel):
    """Response model for full subscription control"""
    success: bool
    message: str
    tenant_id: str
    tenant_name: str
    changes_applied: int
    changes: List[str]
    current_subscription_type: SubscriptionType
    current_status: TenantStatus
    current_limits: Dict[str, int]


class SubscriptionHistoryEntry(BaseModel):
    """Model for subscription history entry"""
    timestamp: str
    action: str
    admin_email: str
    details: Dict[str, Any]
    reason: str


class SubscriptionHistoryResponse(BaseModel):
    """Response model for subscription history"""
    tenant_id: str
    tenant_name: str
    history: List[SubscriptionHistoryEntry]
    total_entries: int
    current_subscription_type: SubscriptionType
    current_status: TenantStatus


class SubscriptionStatsResponse(BaseModel):
    """Response model for subscription statistics"""
    period: str
    period_start: datetime
    period_end: datetime
    total_tenants: int
    free_subscriptions: int
    pro_subscriptions: int
    active_pro_subscriptions: int
    expired_pro_subscriptions: int
    new_signups_in_period: int
    upgrades_in_period: int
    conversion_rate: float
    upgrade_rate: float
    last_updated: datetime