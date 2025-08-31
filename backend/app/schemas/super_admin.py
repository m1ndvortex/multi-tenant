"""
Pydantic schemas for Super Admin operations
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, EmailStr, validator
from datetime import datetime
from enum import Enum

from ..models.tenant import SubscriptionType, TenantStatus


class TenantCreateRequest(BaseModel):
    """Request model for creating a new tenant"""
    name: str = Field(..., min_length=1, max_length=255, description="Business/Company name")
    email: EmailStr = Field(..., description="Primary contact email")
    phone: Optional[str] = Field(None, max_length=50, description="Primary contact phone")
    address: Optional[str] = Field(None, description="Business address")
    business_type: Optional[str] = Field(None, max_length=100, description="Type of business")
    subscription_type: SubscriptionType = Field(default=SubscriptionType.FREE, description="Initial subscription tier")
    domain: Optional[str] = Field(None, max_length=255, description="Custom domain (optional)")
    notes: Optional[str] = Field(None, description="Admin notes about tenant")


class TenantUpdateRequest(BaseModel):
    """Request model for updating tenant information"""
    name: Optional[str] = Field(None, min_length=1, max_length=255, description="Business/Company name")
    email: Optional[EmailStr] = Field(None, description="Primary contact email")
    phone: Optional[str] = Field(None, max_length=50, description="Primary contact phone")
    address: Optional[str] = Field(None, description="Business address")
    business_type: Optional[str] = Field(None, max_length=100, description="Type of business")
    domain: Optional[str] = Field(None, max_length=255, description="Custom domain")
    notes: Optional[str] = Field(None, description="Admin notes about tenant")
    max_users: Optional[int] = Field(None, ge=1, description="Maximum allowed users")
    max_products: Optional[int] = Field(None, ge=-1, description="Maximum allowed products (-1 for unlimited)")
    max_customers: Optional[int] = Field(None, ge=-1, description="Maximum allowed customers (-1 for unlimited)")
    max_monthly_invoices: Optional[int] = Field(None, ge=-1, description="Maximum monthly invoices (-1 for unlimited)")


class TenantStatusUpdateRequest(BaseModel):
    """Request model for updating tenant status"""
    status: TenantStatus = Field(..., description="New tenant status")
    reason: Optional[str] = Field(None, description="Reason for status change")


class SubscriptionUpdateRequest(BaseModel):
    """Request model for updating subscription"""
    subscription_type: SubscriptionType = Field(..., description="New subscription type")
    duration_months: Optional[int] = Field(12, ge=1, le=60, description="Subscription duration in months")
    
    @validator('duration_months')
    def validate_duration_for_free(cls, v, values):
        if values.get('subscription_type') == SubscriptionType.FREE and v is not None:
            raise ValueError("Duration not applicable for FREE subscription")
        return v


class PaymentConfirmationRequest(BaseModel):
    """Request model for confirming payment and activating Pro subscription"""
    tenant_id: str = Field(..., description="Tenant ID to activate")
    duration_months: int = Field(12, ge=1, le=60, description="Subscription duration in months")
    payment_reference: Optional[str] = Field(None, description="Payment reference or transaction ID")
    notes: Optional[str] = Field(None, description="Additional notes about payment")


class TenantSearchRequest(BaseModel):
    """Request model for tenant search and filtering"""
    search_term: Optional[str] = Field(None, description="Search term for name, email, or domain")
    subscription_type: Optional[SubscriptionType] = Field(None, description="Filter by subscription type")
    status: Optional[TenantStatus] = Field(None, description="Filter by tenant status")
    business_type: Optional[str] = Field(None, description="Filter by business type")
    has_expired_subscription: Optional[bool] = Field(None, description="Filter by subscription expiry status")
    created_after: Optional[datetime] = Field(None, description="Filter tenants created after this date")
    created_before: Optional[datetime] = Field(None, description="Filter tenants created before this date")
    skip: int = Field(0, ge=0, description="Number of records to skip")
    limit: int = Field(50, ge=1, le=100, description="Maximum number of records to return")
    sort_by: Optional[str] = Field("created_at", description="Field to sort by")
    sort_order: Optional[str] = Field("desc", pattern="^(asc|desc)$", description="Sort order")


class TenantResponse(BaseModel):
    """Response model for tenant information"""
    id: str
    name: str
    email: str
    phone: Optional[str]
    address: Optional[str]
    domain: Optional[str]
    subscription_type: SubscriptionType
    status: TenantStatus
    business_type: Optional[str]
    currency: str
    timezone: str
    
    # Subscription details
    subscription_starts_at: Optional[datetime]
    subscription_expires_at: Optional[datetime]
    is_subscription_active: bool
    days_until_expiry: int
    
    # Limits
    max_users: int
    max_products: int
    max_customers: int
    max_monthly_invoices: int
    
    # Usage statistics
    current_usage: Optional[Dict[str, int]] = None
    
    # Metadata
    notes: Optional[str]
    last_activity_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class TenantListResponse(BaseModel):
    """Response model for tenant list with pagination"""
    tenants: List[TenantResponse]
    total: int
    skip: int
    limit: int
    has_more: bool


class TenantStatsResponse(BaseModel):
    """Response model for tenant statistics"""
    total_tenants: int
    active_tenants: int
    suspended_tenants: int
    pending_tenants: int
    free_subscriptions: int
    pro_subscriptions: int
    enterprise_subscriptions: int
    expired_subscriptions: int
    revenue_this_month: float
    new_signups_this_month: int


class TenantUsageResponse(BaseModel):
    """Response model for detailed tenant usage"""
    tenant_id: str
    tenant_name: str
    subscription_type: SubscriptionType
    usage: Dict[str, int]
    limits: Dict[str, int]
    usage_percentages: Dict[str, float]
    is_over_limit: bool
    warnings: List[str]


class PendingPaymentTenant(BaseModel):
    """Response model for tenants with pending payments"""
    id: str
    name: str
    email: str
    subscription_type: SubscriptionType
    status: TenantStatus
    created_at: datetime
    days_since_signup: int
    
    class Config:
        from_attributes = True


class PendingPaymentsResponse(BaseModel):
    """Response model for tenants with pending payments"""
    tenants: List[PendingPaymentTenant]
    total: int


class PaymentConfirmationResponse(BaseModel):
    """Response model for payment confirmation"""
    success: bool
    tenant_id: str
    tenant_name: str
    subscription_type: SubscriptionType
    subscription_expires_at: datetime
    message: str


class TenantActivityResponse(BaseModel):
    """Response model for tenant activity information"""
    tenant_id: str
    tenant_name: str
    last_activity_at: Optional[datetime]
    active_users_count: int
    recent_activity: List[Dict[str, Any]]
    is_currently_active: bool


class BulkTenantActionRequest(BaseModel):
    """Request model for bulk tenant actions"""
    tenant_ids: List[str] = Field(..., min_items=1, description="List of tenant IDs")
    action: str = Field(..., pattern="^(suspend|activate|delete)$", description="Action to perform")
    reason: Optional[str] = Field(None, description="Reason for bulk action")


class BulkTenantActionResponse(BaseModel):
    """Response model for bulk tenant actions"""
    success_count: int
    failed_count: int
    successful_tenant_ids: List[str]
    failed_operations: List[Dict[str, str]]
    message: str