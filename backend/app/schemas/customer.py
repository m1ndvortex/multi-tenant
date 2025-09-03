"""
Customer schemas for API request/response validation
"""

from pydantic import BaseModel, Field, EmailStr, validator
from typing import Optional, List, Dict, Any
from decimal import Decimal
from datetime import datetime
from enum import Enum


class CustomerStatus(str, Enum):
    """Customer status enumeration"""
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    BLOCKED = "BLOCKED"


class CustomerType(str, Enum):
    """Customer type enumeration"""
    INDIVIDUAL = "INDIVIDUAL"
    BUSINESS = "BUSINESS"
    VIP = "VIP"


class ContactMethod(str, Enum):
    """Preferred contact method enumeration"""
    PHONE = "phone"
    EMAIL = "email"
    SMS = "sms"


class CustomerBase(BaseModel):
    """Base customer schema with common fields"""
    name: str = Field(..., min_length=1, max_length=255, description="Customer full name or business name")
    email: Optional[EmailStr] = Field(None, description="Customer email address")
    phone: Optional[str] = Field(None, max_length=50, description="Customer phone number")
    mobile: Optional[str] = Field(None, max_length=50, description="Customer mobile number")
    
    # Address Information
    address: Optional[str] = Field(None, description="Customer address")
    city: Optional[str] = Field(None, max_length=100, description="Customer city")
    state: Optional[str] = Field(None, max_length=100, description="Customer state/province")
    postal_code: Optional[str] = Field(None, max_length=20, description="Customer postal code")
    country: str = Field(default="Iran", max_length=100, description="Customer country")
    
    # Business Information
    customer_type: CustomerType = Field(default=CustomerType.INDIVIDUAL, description="Type of customer")
    status: CustomerStatus = Field(default=CustomerStatus.ACTIVE, description="Customer status")
    
    # Financial Information
    credit_limit: Decimal = Field(default=Decimal('0'), ge=0, description="Customer credit limit")
    
    # Customer Relationship Management
    tags: Optional[List[str]] = Field(default_factory=list, description="Customer tags for segmentation")
    notes: Optional[str] = Field(None, description="Internal notes about customer")
    
    # Communication Preferences
    preferred_contact_method: ContactMethod = Field(default=ContactMethod.PHONE, description="Preferred contact method")
    email_notifications: bool = Field(default=True, description="Allow email notifications")
    sms_notifications: bool = Field(default=True, description="Allow SMS notifications")
    
    # Business Details (for business customers)
    business_name: Optional[str] = Field(None, max_length=255, description="Business name (if business customer)")
    tax_id: Optional[str] = Field(None, max_length=50, description="Tax identification number")
    business_type: Optional[str] = Field(None, max_length=100, description="Type of business")

    @validator('phone', 'mobile')
    def validate_phone_numbers(cls, v):
        if v and not v.replace('+', '').replace('-', '').replace(' ', '').replace('(', '').replace(')', '').isdigit():
            raise ValueError('Phone number must contain only digits and common separators')
        return v

    @validator('tags')
    def validate_tags(cls, v):
        if v:
            # Remove duplicates and empty strings
            v = list(set([tag.strip() for tag in v if tag.strip()]))
        return v or []


class CustomerCreate(CustomerBase):
    """Schema for creating a new customer"""
    pass


class CustomerUpdate(BaseModel):
    """Schema for updating an existing customer"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=50)
    mobile: Optional[str] = Field(None, max_length=50)
    
    # Address Information
    address: Optional[str] = None
    city: Optional[str] = Field(None, max_length=100)
    state: Optional[str] = Field(None, max_length=100)
    postal_code: Optional[str] = Field(None, max_length=20)
    country: Optional[str] = Field(None, max_length=100)
    
    # Business Information
    customer_type: Optional[CustomerType] = None
    status: Optional[CustomerStatus] = None
    
    # Financial Information
    credit_limit: Optional[Decimal] = Field(None, ge=0)
    
    # Customer Relationship Management
    tags: Optional[List[str]] = None
    notes: Optional[str] = None
    
    # Communication Preferences
    preferred_contact_method: Optional[ContactMethod] = None
    email_notifications: Optional[bool] = None
    sms_notifications: Optional[bool] = None
    
    # Business Details
    business_name: Optional[str] = Field(None, max_length=255)
    tax_id: Optional[str] = Field(None, max_length=50)
    business_type: Optional[str] = Field(None, max_length=100)

    @validator('phone', 'mobile')
    def validate_phone_numbers(cls, v):
        if v and not v.replace('+', '').replace('-', '').replace(' ', '').replace('(', '').replace(')', '').isdigit():
            raise ValueError('Phone number must contain only digits and common separators')
        return v

    @validator('tags')
    def validate_tags(cls, v):
        if v is not None:
            # Remove duplicates and empty strings
            v = list(set([tag.strip() for tag in v if tag.strip()]))
        return v


class CustomerResponse(CustomerBase):
    """Schema for customer response"""
    id: str = Field(..., description="Customer unique identifier")
    tenant_id: str = Field(..., description="Tenant identifier")
    
    # Financial tracking
    total_debt: Decimal = Field(..., description="Total outstanding debt in currency")
    total_gold_debt: Decimal = Field(..., description="Total outstanding debt in gold grams")
    total_purchases: Decimal = Field(..., description="Total lifetime purchases")
    
    # Tracking timestamps
    last_purchase_at: Optional[datetime] = Field(None, description="Last purchase date")
    last_contact_at: Optional[datetime] = Field(None, description="Last contact date")
    created_at: datetime = Field(..., description="Customer creation date")
    updated_at: datetime = Field(..., description="Last update date")
    is_active: bool = Field(..., description="Customer active status")
    
    # Computed properties
    display_name: str = Field(..., description="Display name for customer")
    primary_contact: str = Field(..., description="Primary contact information")
    full_address: str = Field(..., description="Formatted full address")
    is_vip: bool = Field(..., description="VIP customer status")
    has_outstanding_debt: bool = Field(..., description="Has outstanding debt")

    class Config:
        from_attributes = True


class CustomerListResponse(BaseModel):
    """Schema for customer list response with pagination"""
    customers: List[CustomerResponse]
    total: int = Field(..., description="Total number of customers")
    page: int = Field(..., description="Current page number")
    per_page: int = Field(..., description="Items per page")
    total_pages: int = Field(..., description="Total number of pages")


class CustomerSearchRequest(BaseModel):
    """Schema for customer search request"""
    query: Optional[str] = Field(None, description="Search query for name, email, phone")
    status: Optional[CustomerStatus] = Field(None, description="Filter by customer status")
    customer_type: Optional[CustomerType] = Field(None, description="Filter by customer type")
    tags: Optional[List[str]] = Field(None, description="Filter by tags")
    has_debt: Optional[bool] = Field(None, description="Filter customers with outstanding debt")
    city: Optional[str] = Field(None, description="Filter by city")
    created_after: Optional[datetime] = Field(None, description="Filter customers created after date")
    created_before: Optional[datetime] = Field(None, description="Filter customers created before date")
    last_purchase_after: Optional[datetime] = Field(None, description="Filter by last purchase date")
    sort_by: Optional[str] = Field(default="created_at", description="Sort field")
    sort_order: Optional[str] = Field(default="desc", description="Sort order (asc/desc)")
    page: int = Field(default=1, ge=1, description="Page number")
    per_page: int = Field(default=20, ge=1, le=100, description="Items per page")


class CustomerInteractionType(str, Enum):
    """Customer interaction type enumeration"""
    CALL = "CALL"
    EMAIL = "EMAIL"
    SMS = "SMS"
    MEETING = "MEETING"
    NOTE = "NOTE"
    PURCHASE = "PURCHASE"
    PAYMENT = "PAYMENT"
    COMPLAINT = "COMPLAINT"
    SUPPORT = "SUPPORT"


class CustomerInteractionCreate(BaseModel):
    """Schema for creating customer interaction"""
    customer_id: str = Field(..., description="Customer ID")
    interaction_type: CustomerInteractionType = Field(..., description="Type of interaction")
    subject: str = Field(..., min_length=1, max_length=255, description="Interaction subject")
    description: Optional[str] = Field(None, description="Detailed description")
    outcome: Optional[str] = Field(None, description="Interaction outcome")
    follow_up_required: bool = Field(default=False, description="Follow-up required")
    follow_up_date: Optional[datetime] = Field(None, description="Follow-up date")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional metadata")


class CustomerInteractionResponse(CustomerInteractionCreate):
    """Schema for customer interaction response"""
    id: str = Field(..., description="Interaction unique identifier")
    tenant_id: str = Field(..., description="Tenant identifier")
    user_id: str = Field(..., description="User who created the interaction")
    created_at: datetime = Field(..., description="Interaction creation date")
    updated_at: datetime = Field(..., description="Last update date")

    class Config:
        from_attributes = True


class CustomerInteractionListResponse(BaseModel):
    """Schema for customer interaction list response"""
    interactions: List[CustomerInteractionResponse]
    total: int = Field(..., description="Total number of interactions")
    page: int = Field(..., description="Current page number")
    per_page: int = Field(..., description="Items per page")
    total_pages: int = Field(..., description="Total number of pages")


class CustomerStatsResponse(BaseModel):
    """Schema for customer statistics response"""
    total_customers: int = Field(..., description="Total number of customers")
    active_customers: int = Field(..., description="Number of active customers")
    vip_customers: int = Field(..., description="Number of VIP customers")
    customers_with_debt: int = Field(..., description="Number of customers with outstanding debt")
    total_debt_amount: Decimal = Field(..., description="Total outstanding debt amount")
    total_gold_debt_amount: Decimal = Field(..., description="Total outstanding gold debt amount")
    average_customer_value: Decimal = Field(..., description="Average customer lifetime value")
    new_customers_this_month: int = Field(..., description="New customers this month")


class CustomerLifetimeValueResponse(BaseModel):
    """Schema for customer lifetime value response"""
    customer_id: str = Field(..., description="Customer ID")
    customer_name: str = Field(..., description="Customer name")
    lifetime_value: Decimal = Field(..., description="Customer lifetime value")
    total_orders: int = Field(..., description="Total number of orders")
    average_order_value: Decimal = Field(..., description="Average order value")
    first_purchase_date: Optional[datetime] = Field(None, description="First purchase date")
    last_purchase_date: Optional[datetime] = Field(None, description="Last purchase date")
    outstanding_debt: Decimal = Field(..., description="Outstanding debt amount")
    outstanding_gold_debt: Decimal = Field(..., description="Outstanding gold debt amount")


class CustomerExportRequest(BaseModel):
    """Schema for customer data export request"""
    format: str = Field(default="csv", description="Export format (csv, json)")
    include_interactions: bool = Field(default=False, description="Include interaction history")
    include_financial_data: bool = Field(default=True, description="Include financial data")
    customer_ids: Optional[List[str]] = Field(None, description="Specific customer IDs to export")
    filters: Optional[CustomerSearchRequest] = Field(None, description="Filters to apply")


class CustomerTagsResponse(BaseModel):
    """Schema for customer tags response"""
    tags: List[str] = Field(..., description="List of all customer tags")
    tag_counts: Dict[str, int] = Field(..., description="Tag usage counts")


class CustomerDebtSummaryResponse(BaseModel):
    """Schema for customer debt summary response"""
    customer_id: str = Field(..., description="Customer ID")
    customer_name: str = Field(..., description="Customer name")
    currency_debt: Decimal = Field(..., description="Outstanding currency debt")
    gold_debt: Decimal = Field(..., description="Outstanding gold debt in grams")
    overdue_amount: Decimal = Field(..., description="Overdue payment amount")
    next_payment_due: Optional[datetime] = Field(None, description="Next payment due date")
    installment_count: int = Field(..., description="Number of active installments")