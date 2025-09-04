"""
Marketing and communication schemas
"""

from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from uuid import UUID

from app.models.marketing import CampaignType, CampaignStatus, SegmentationType


# Marketing Campaign Schemas
class MarketingCampaignBase(BaseModel):
    """Base marketing campaign schema"""
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=1000)
    campaign_type: CampaignType
    subject: Optional[str] = Field(None, max_length=500)
    message: str = Field(..., min_length=1, max_length=2000)
    customer_filter: Optional[Dict[str, Any]] = Field(default_factory=dict)
    scheduled_at: Optional[datetime] = None
    send_immediately: bool = True


class MarketingCampaignCreate(MarketingCampaignBase):
    """Schema for creating marketing campaigns"""
    
    @validator('scheduled_at')
    def validate_scheduled_at(cls, v, values):
        if not values.get('send_immediately') and not v:
            raise ValueError('scheduled_at is required when send_immediately is False')
        if values.get('send_immediately') and v:
            raise ValueError('scheduled_at should not be set when send_immediately is True')
        if v and v <= datetime.utcnow():
            raise ValueError('scheduled_at must be in the future')
        return v


class MarketingCampaignUpdate(BaseModel):
    """Schema for updating marketing campaigns"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=1000)
    subject: Optional[str] = Field(None, max_length=500)
    message: Optional[str] = Field(None, min_length=1, max_length=2000)
    scheduled_at: Optional[datetime] = None


class MarketingCampaignResponse(MarketingCampaignBase):
    """Schema for marketing campaign responses"""
    id: UUID
    tenant_id: UUID
    status: CampaignStatus
    target_customer_count: int
    sent_count: int
    delivered_count: int
    failed_count: int
    success_rate: float
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Customer Segment Schemas
class CustomerSegmentBase(BaseModel):
    """Base customer segment schema"""
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=1000)
    segmentation_type: SegmentationType = SegmentationType.MANUAL
    filter_criteria: Optional[Dict[str, Any]] = Field(default_factory=dict)


class CustomerSegmentCreate(CustomerSegmentBase):
    """Schema for creating customer segments"""
    
    @validator('filter_criteria')
    def validate_filter_criteria(cls, v, values):
        if values.get('segmentation_type') == SegmentationType.AUTOMATIC and not v:
            raise ValueError('filter_criteria is required for automatic segmentation')
        return v


class CustomerSegmentUpdate(BaseModel):
    """Schema for updating customer segments"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=1000)
    filter_criteria: Optional[Dict[str, Any]] = None


class CustomerSegmentResponse(CustomerSegmentBase):
    """Schema for customer segment responses"""
    id: UUID
    tenant_id: UUID
    customer_count: int
    last_updated_at: datetime
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Communication Preference Schemas
class CommunicationPreferenceBase(BaseModel):
    """Base communication preference schema"""
    email_enabled: bool = True
    email_marketing: bool = True
    email_invoices: bool = True
    email_reminders: bool = True
    sms_enabled: bool = True
    sms_marketing: bool = True
    sms_invoices: bool = True
    sms_reminders: bool = True
    preferred_contact_time: str = Field("business_hours", pattern="^(business_hours|evening|anytime)$")
    timezone: str = Field("Asia/Tehran", max_length=50)


class CommunicationPreferenceUpdate(BaseModel):
    """Schema for updating communication preferences"""
    email_enabled: Optional[bool] = None
    email_marketing: Optional[bool] = None
    email_invoices: Optional[bool] = None
    email_reminders: Optional[bool] = None
    sms_enabled: Optional[bool] = None
    sms_marketing: Optional[bool] = None
    sms_invoices: Optional[bool] = None
    sms_reminders: Optional[bool] = None
    preferred_contact_time: Optional[str] = Field(None, pattern="^(business_hours|evening|anytime)$")
    timezone: Optional[str] = Field(None, max_length=50)


class CommunicationPreferenceResponse(CommunicationPreferenceBase):
    """Schema for communication preference responses"""
    id: UUID
    tenant_id: UUID
    customer_id: UUID
    opted_out_at: Optional[datetime] = None
    opt_out_reason: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Campaign Statistics Schemas
class CampaignStatsResponse(BaseModel):
    """Schema for campaign statistics"""
    campaign_id: UUID
    name: str
    status: str
    campaign_type: str
    target_count: int
    sent_count: int
    delivered_count: int
    failed_count: int
    success_rate: float
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    recipient_breakdown: Dict[str, int]


# Marketing Analytics Schemas
class MarketingAnalyticsResponse(BaseModel):
    """Schema for marketing analytics"""
    period_days: int
    campaign_stats: Dict[str, int]
    total_campaigns: int
    total_sent: int
    total_delivered: int
    delivery_rate: float
    segment_count: int
    opt_out_count: int


# Delivery Tracking Schemas
class DeliveryTrackingResponse(BaseModel):
    """Schema for delivery tracking responses"""
    id: UUID
    campaign_name: str
    customer_name: str
    recipient_email: Optional[str] = None
    recipient_phone: Optional[str] = None
    status: str
    sent_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    error_message: Optional[str] = None
    provider_message_id: Optional[str] = None


# Bulk Messaging Schemas
class BulkMessageRequest(BaseModel):
    """Schema for bulk message requests"""
    customer_ids: List[UUID] = Field(..., min_items=1, max_items=100)
    message: str = Field(..., min_length=1, max_length=1000)
    campaign_type: CampaignType
    subject: Optional[str] = Field(None, max_length=500)

    @validator('customer_ids')
    def validate_customer_ids(cls, v):
        if len(v) > 100:
            raise ValueError('Cannot send to more than 100 customers at once')
        return v

    @validator('subject')
    def validate_subject(cls, v, values):
        if values.get('campaign_type') == CampaignType.EMAIL and not v:
            raise ValueError('Subject is required for email campaigns')
        return v


# Segment Customer Management Schemas
class SegmentCustomersRequest(BaseModel):
    """Schema for adding/removing customers from segments"""
    customer_ids: List[UUID] = Field(..., min_items=1, max_items=50)

    @validator('customer_ids')
    def validate_customer_ids(cls, v):
        if len(v) > 50:
            raise ValueError('Cannot process more than 50 customers at once')
        return v


# Campaign Filter Schemas
class CampaignFilterCriteria(BaseModel):
    """Schema for campaign filter criteria"""
    customer_type: Optional[str] = None
    tags: Optional[List[str]] = None
    min_total_purchases: Optional[float] = Field(None, ge=0)
    max_total_purchases: Optional[float] = Field(None, ge=0)
    has_debt: Optional[bool] = None
    last_purchase_days: Optional[int] = Field(None, ge=1, le=365)
    city: Optional[str] = None
    customer_ids: Optional[List[str]] = None

    @validator('max_total_purchases')
    def validate_purchase_range(cls, v, values):
        min_val = values.get('min_total_purchases')
        if min_val is not None and v is not None and v < min_val:
            raise ValueError('max_total_purchases must be greater than min_total_purchases')
        return v


# Template Schemas for Marketing Messages
class MessageTemplateResponse(BaseModel):
    """Schema for message template responses"""
    template_type: str
    variables: List[str]
    sample_message: str
    description: str


# Campaign Preview Schemas
class CampaignPreviewRequest(BaseModel):
    """Schema for campaign preview requests"""
    message: str = Field(..., min_length=1, max_length=2000)
    customer_filter: Dict[str, Any] = Field(default_factory=dict)


class CampaignPreviewResponse(BaseModel):
    """Schema for campaign preview responses"""
    target_customer_count: int
    estimated_cost: float
    sample_customers: List[Dict[str, Any]]
    message_preview: str


# Opt-out Management Schemas
class OptOutRequest(BaseModel):
    """Schema for opt-out requests"""
    reason: Optional[str] = Field(None, max_length=255)


class OptOutResponse(BaseModel):
    """Schema for opt-out responses"""
    message: str
    customer_id: UUID
    opted_out_at: datetime


# Marketing Dashboard Schemas
class MarketingDashboardResponse(BaseModel):
    """Schema for marketing dashboard data"""
    total_campaigns: int
    active_campaigns: int
    total_segments: int
    total_customers: int
    recent_campaigns: List[MarketingCampaignResponse]
    top_performing_campaigns: List[Dict[str, Any]]
    delivery_stats: Dict[str, Any]


# Campaign Recipient Schemas
class CampaignRecipientResponse(BaseModel):
    """Schema for campaign recipient responses"""
    id: UUID
    customer_id: UUID
    customer_name: str
    recipient_email: Optional[str] = None
    recipient_phone: Optional[str] = None
    status: str
    sent_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    error_message: Optional[str] = None
    provider_message_id: Optional[str] = None

    class Config:
        from_attributes = True


# Notification Integration Schemas
class NotificationCampaignRequest(BaseModel):
    """Schema for notification campaign requests"""
    campaign_id: UUID
    notification_type: str
    priority: int = Field(5, ge=1, le=10)


class NotificationCampaignResponse(BaseModel):
    """Schema for notification campaign responses"""
    message: str
    notifications_created: int
    campaign_id: UUID
    estimated_delivery_time: str