"""
Pydantic schemas for Enhanced Tenant Management operations
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, EmailStr, validator
from datetime import datetime

from ..models.tenant import SubscriptionType, TenantStatus


class TenantCredentialsUpdateRequest(BaseModel):
    """Request model for updating tenant owner credentials"""
    email: Optional[EmailStr] = Field(None, description="New email address for tenant owner")
    password: Optional[str] = Field(None, min_length=8, description="New password for tenant owner")
    
    @validator('password')
    def validate_password(cls, v):
        if v is not None and len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        return v
    
    class Config:
        schema_extra = {
            "example": {
                "email": "new-owner@example.com",
                "password": "newSecurePassword123"
            }
        }


class TenantCredentialsResponse(BaseModel):
    """Response model for tenant credentials update"""
    success: bool
    message: str
    tenant_id: str
    tenant_name: str
    updated_email: Optional[str] = None
    changes_made: List[str]
    updated_at: datetime
    
    class Config:
        schema_extra = {
            "example": {
                "success": True,
                "message": "Tenant credentials updated successfully",
                "tenant_id": "123e4567-e89b-12d3-a456-426614174000",
                "tenant_name": "Example Business",
                "updated_email": "new-owner@example.com",
                "changes_made": ["Email changed from old@example.com to new-owner@example.com", "Password updated"],
                "updated_at": "2024-01-15T10:30:00Z"
            }
        }


class TenantFullUpdateRequest(BaseModel):
    """Request model for comprehensive tenant update"""
    name: Optional[str] = Field(None, min_length=1, max_length=255, description="Business/Company name")
    phone: Optional[str] = Field(None, max_length=50, description="Primary contact phone")
    address: Optional[str] = Field(None, description="Business address")
    business_type: Optional[str] = Field(None, max_length=100, description="Type of business")
    subscription_type: Optional[SubscriptionType] = Field(None, description="Subscription tier")
    subscription_duration_months: Optional[int] = Field(None, ge=1, le=60, description="Subscription duration in months (for Pro)")
    status: Optional[TenantStatus] = Field(None, description="Tenant status")
    
    # Custom limits (override default subscription limits)
    max_users: Optional[int] = Field(None, ge=1, description="Maximum allowed users")
    max_products: Optional[int] = Field(None, ge=-1, description="Maximum allowed products (-1 for unlimited)")
    max_customers: Optional[int] = Field(None, ge=-1, description="Maximum allowed customers (-1 for unlimited)")
    max_monthly_invoices: Optional[int] = Field(None, ge=-1, description="Maximum monthly invoices (-1 for unlimited)")
    
    admin_notes: Optional[str] = Field(None, description="Admin notes for this update")
    
    @validator('subscription_duration_months')
    def validate_duration_for_subscription(cls, v, values):
        subscription_type = values.get('subscription_type')
        if subscription_type == SubscriptionType.FREE and v is not None:
            raise ValueError("Duration not applicable for FREE subscription")
        if subscription_type == SubscriptionType.PRO and v is None:
            # Default to 12 months for Pro if not specified
            return 12
        return v
    
    class Config:
        schema_extra = {
            "example": {
                "name": "Updated Business Name",
                "phone": "+1234567890",
                "address": "123 Business Street, City, Country",
                "business_type": "retail",
                "subscription_type": "pro",
                "subscription_duration_months": 12,
                "status": "active",
                "max_users": 10,
                "admin_notes": "Upgrading to Pro plan due to business growth"
            }
        }


class TenantFullUpdateResponse(BaseModel):
    """Response model for comprehensive tenant update"""
    success: bool
    message: str
    tenant_id: str
    tenant_name: str
    changes_made: int
    changes: List[str]
    old_values: Dict[str, Any]
    updated_at: datetime
    
    class Config:
        schema_extra = {
            "example": {
                "success": True,
                "message": "Tenant updated successfully",
                "tenant_id": "123e4567-e89b-12d3-a456-426614174000",
                "tenant_name": "Updated Business Name",
                "changes_made": 3,
                "changes": [
                    "Name: Old Business → Updated Business Name",
                    "Subscription: free → pro",
                    "Pro subscription set for 12 months"
                ],
                "old_values": {
                    "name": "Old Business",
                    "subscription_type": "free"
                },
                "updated_at": "2024-01-15T10:30:00Z"
            }
        }


class TenantAuditEntry(BaseModel):
    """Model for individual audit log entry"""
    timestamp: datetime
    admin_action: str
    details: List[str]
    
    class Config:
        schema_extra = {
            "example": {
                "timestamp": "2024-01-15T10:30:00Z",
                "admin_action": "Full update by admin admin@example.com at 2024-01-15T10:30:00Z",
                "details": [
                    "Name: Old Business → New Business",
                    "Subscription: free → pro",
                    "Admin notes: Upgrading due to business growth"
                ]
            }
        }


class TenantAuditLogResponse(BaseModel):
    """Response model for tenant audit log"""
    tenant_id: str
    tenant_name: str
    audit_entries: List[TenantAuditEntry]
    total_entries: int
    last_updated: datetime
    
    class Config:
        schema_extra = {
            "example": {
                "tenant_id": "123e4567-e89b-12d3-a456-426614174000",
                "tenant_name": "Example Business",
                "audit_entries": [
                    {
                        "timestamp": "2024-01-15T10:30:00Z",
                        "admin_action": "Full update by admin admin@example.com",
                        "details": ["Name changed", "Subscription upgraded"]
                    }
                ],
                "total_entries": 1,
                "last_updated": "2024-01-15T10:30:00Z"
            }
        }


class TenantPasswordResetRequest(BaseModel):
    """Request model for tenant owner password reset"""
    new_password: str = Field(..., min_length=8, description="New password for tenant owner")
    reason: Optional[str] = Field(None, description="Reason for password reset")
    
    @validator('new_password')
    def validate_password_strength(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        # Add more password strength validation if needed
        return v
    
    class Config:
        schema_extra = {
            "example": {
                "new_password": "newSecurePassword123",
                "reason": "User forgot password and requested reset"
            }
        }


class TenantPasswordResetResponse(BaseModel):
    """Response model for tenant owner password reset"""
    success: bool
    message: str
    tenant_id: str
    owner_email: str
    reset_at: datetime
    
    class Config:
        schema_extra = {
            "example": {
                "success": True,
                "message": "Tenant owner password reset successfully",
                "tenant_id": "123e4567-e89b-12d3-a456-426614174000",
                "owner_email": "owner@example.com",
                "reset_at": "2024-01-15T10:30:00Z"
            }
        }


class TenantManagementStatsResponse(BaseModel):
    """Response model for tenant management statistics"""
    total_credential_updates: int
    total_full_updates: int
    total_password_resets: int
    recent_activities: List[Dict[str, Any]]
    most_active_admins: List[Dict[str, Any]]
    
    class Config:
        schema_extra = {
            "example": {
                "total_credential_updates": 45,
                "total_full_updates": 23,
                "total_password_resets": 12,
                "recent_activities": [
                    {
                        "action": "credential_update",
                        "tenant_name": "Example Business",
                        "admin_email": "admin@example.com",
                        "timestamp": "2024-01-15T10:30:00Z"
                    }
                ],
                "most_active_admins": [
                    {
                        "admin_email": "admin@example.com",
                        "total_actions": 15
                    }
                ]
            }
        }