"""
Enhanced Tenant Management Schemas
Pydantic schemas for enhanced tenant management operations including credential updates
"""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, EmailStr, validator
from datetime import datetime
import re

from ..models.tenant import SubscriptionType, TenantStatus


class TenantCredentialsUpdateRequest(BaseModel):
    """Request model for updating tenant owner credentials"""
    email: Optional[EmailStr] = Field(None, description="New email address for tenant owner")
    password: Optional[str] = Field(None, min_length=8, description="New password for tenant owner")
    reason: Optional[str] = Field(None, description="Reason for credential update")
    
    @validator('password')
    def validate_password_strength(cls, v):
        if v is None:
            return v
        
        # Password strength validation
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        
        if not re.search(r'[A-Za-z]', v):
            raise ValueError("Password must contain at least one letter")
        
        if not re.search(r'\d', v):
            raise ValueError("Password must contain at least one number")
        
        return v


class TenantFullUpdateRequest(BaseModel):
    """Request model for comprehensive tenant updates"""
    # Basic information
    name: Optional[str] = Field(None, min_length=1, max_length=255, description="Business/Company name")
    phone: Optional[str] = Field(None, max_length=50, description="Primary contact phone")
    address: Optional[str] = Field(None, description="Business address")
    business_type: Optional[str] = Field(None, max_length=100, description="Type of business")
    domain: Optional[str] = Field(None, max_length=255, description="Custom domain")
    
    # Subscription management
    subscription_type: Optional[SubscriptionType] = Field(None, description="Subscription type")
    subscription_duration_months: Optional[int] = Field(None, ge=1, le=60, description="Subscription duration in months")
    
    # Status management
    status: Optional[TenantStatus] = Field(None, description="Tenant status")
    
    # Limits (for custom configurations)
    max_users: Optional[int] = Field(None, ge=1, description="Maximum allowed users")
    max_products: Optional[int] = Field(None, ge=-1, description="Maximum allowed products (-1 for unlimited)")
    max_customers: Optional[int] = Field(None, ge=-1, description="Maximum allowed customers (-1 for unlimited)")
    max_monthly_invoices: Optional[int] = Field(None, ge=-1, description="Maximum monthly invoices (-1 for unlimited)")
    
    # Business settings
    currency: Optional[str] = Field(None, max_length=10, description="Primary currency code")
    timezone: Optional[str] = Field(None, max_length=50, description="Business timezone")
    
    # Admin notes
    notes: Optional[str] = Field(None, description="Admin notes about tenant")
    admin_reason: Optional[str] = Field(None, description="Reason for this update")


class TenantCredentialsResponse(BaseModel):
    """Response model for tenant credentials operations"""
    success: bool
    message: str
    tenant_id: str
    updated_email: Optional[str] = None
    password_updated: bool = False
    timestamp: datetime


class TenantFullUpdateResponse(BaseModel):
    """Response model for comprehensive tenant updates"""
    success: bool
    message: str
    tenant_id: str
    changes_made: int
    changes: List[str]
    timestamp: datetime


class TenantAuditLogEntry(BaseModel):
    """Model for tenant audit log entries"""
    timestamp: datetime
    admin_id: str
    admin_email: str
    action: str
    changes: Dict[str, Any]
    reason: Optional[str] = None
    ip_address: Optional[str] = None


class TenantAuditLogResponse(BaseModel):
    """Response model for tenant audit logs"""
    tenant_id: str
    tenant_name: str
    total_entries: int
    entries: List[TenantAuditLogEntry]


class EnhancedTenantResponse(BaseModel):
    """Enhanced response model for tenant information with additional details"""
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
    usage_percentages: Optional[Dict[str, float]] = None
    
    # Enhanced details
    owner_email: Optional[str] = None
    owner_name: Optional[str] = None
    last_credential_update: Optional[datetime] = None
    total_audit_entries: int = 0
    
    # Metadata
    notes: Optional[str]
    last_activity_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class TenantCredentialHistoryEntry(BaseModel):
    """Model for tenant credential change history"""
    timestamp: datetime
    admin_id: str
    admin_email: str
    change_type: str  # "email_change", "password_change"
    old_value: Optional[str] = None  # Only for email changes
    new_value: Optional[str] = None  # Only for email changes
    reason: Optional[str] = None


class TenantCredentialHistoryResponse(BaseModel):
    """Response model for tenant credential history"""
    tenant_id: str
    tenant_name: str
    owner_email: str
    total_changes: int
    history: List[TenantCredentialHistoryEntry]


class TenantManagementStatsResponse(BaseModel):
    """Response model for tenant management statistics"""
    total_tenants: int
    active_tenants: int
    suspended_tenants: int
    pending_tenants: int
    
    # Subscription breakdown
    free_subscriptions: int
    pro_subscriptions: int
    enterprise_subscriptions: int
    
    # Recent activity
    recent_credential_updates: int
    recent_status_changes: int
    recent_subscription_changes: int
    
    # Usage statistics
    average_users_per_tenant: float
    average_products_per_tenant: float
    tenants_over_limits: int
    
    last_updated: datetime


class BulkTenantCredentialUpdateRequest(BaseModel):
    """Request model for bulk tenant credential operations"""
    tenant_ids: List[str] = Field(..., min_items=1, description="List of tenant IDs")
    action: str = Field(..., pattern="^(reset_password|update_email_domain)$", description="Bulk action to perform")
    new_email_domain: Optional[str] = Field(None, description="New email domain for bulk email updates")
    reason: str = Field(..., description="Reason for bulk operation")


class BulkTenantCredentialUpdateResponse(BaseModel):
    """Response model for bulk tenant credential operations"""
    success_count: int
    failed_count: int
    successful_tenant_ids: List[str]
    failed_operations: List[Dict[str, str]]
    message: str
    timestamp: datetime