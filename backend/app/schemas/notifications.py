"""
Notification schemas for API requests and responses
"""

from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from uuid import UUID

from app.models.notification import NotificationType, NotificationStatus


class NotificationTemplateBase(BaseModel):
    """Base notification template schema"""
    name: str = Field(..., min_length=1, max_length=255)
    template_type: NotificationType
    subject: Optional[str] = Field(None, max_length=500)
    body: str = Field(..., min_length=1)
    trigger_event: Optional[str] = Field(None, max_length=100)
    variables: Optional[List[str]] = Field(default_factory=list)
    is_default: bool = False


class NotificationTemplateCreate(NotificationTemplateBase):
    """Schema for creating notification templates"""
    pass


class NotificationTemplateUpdate(BaseModel):
    """Schema for updating notification templates"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    subject: Optional[str] = Field(None, max_length=500)
    body: Optional[str] = Field(None, min_length=1)
    trigger_event: Optional[str] = Field(None, max_length=100)
    variables: Optional[List[str]] = None
    is_default: Optional[bool] = None


class NotificationTemplateResponse(NotificationTemplateBase):
    """Schema for notification template responses"""
    id: UUID
    tenant_id: UUID
    is_system_template: bool
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class NotificationLogBase(BaseModel):
    """Base notification log schema"""
    notification_type: NotificationType
    status: NotificationStatus
    recipient_email: Optional[str] = None
    recipient_phone: Optional[str] = None
    customer_id: Optional[UUID] = None
    subject: Optional[str] = None
    body: str
    reference_type: Optional[str] = None
    reference_id: Optional[UUID] = None


class NotificationLogResponse(NotificationLogBase):
    """Schema for notification log responses"""
    id: UUID
    tenant_id: UUID
    template_id: Optional[UUID] = None
    template_variables: Optional[Dict[str, Any]] = None
    sent_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    error_message: Optional[str] = None
    retry_count: int
    provider: Optional[str] = None
    provider_message_id: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class NotificationStatsResponse(BaseModel):
    """Schema for notification statistics"""
    total_sent: int
    total_failed: int
    total_pending: int
    email_count: int
    sms_count: int


class BulkSMSRequest(BaseModel):
    """Schema for bulk SMS requests"""
    customer_ids: List[UUID] = Field(..., min_items=1)
    message: str = Field(..., min_length=1, max_length=1000)
    campaign_name: Optional[str] = Field(None, max_length=255)

    @validator('customer_ids')
    def validate_customer_ids(cls, v):
        if len(v) > 100:
            raise ValueError('Cannot send to more than 100 customers at once')
        return v


class NotificationQueueResponse(BaseModel):
    """Schema for notification queue responses"""
    message: str
    task_id: str
    customer_count: Optional[int] = None


class NotificationRetryRequest(BaseModel):
    """Schema for notification retry requests"""
    max_retries: Optional[int] = Field(3, ge=1, le=10)


class NotificationTemplateVariables(BaseModel):
    """Schema for template variable definitions"""
    customer_name: str = "Customer name"
    invoice_number: str = "Invoice number"
    invoice_total: str = "Invoice total amount"
    invoice_date: str = "Invoice date"
    due_date: str = "Invoice due date"
    payment_amount: str = "Payment amount"
    remaining_balance: str = "Remaining balance"
    payment_date: str = "Payment date"
    installment_number: str = "Installment number"
    amount_due: str = "Amount due"
    days_until_due: str = "Days until due date"
    days_overdue: str = "Days overdue"
    company_name: str = "Company name"


class NotificationPreviewRequest(BaseModel):
    """Schema for notification preview requests"""
    template_id: UUID
    variables: Dict[str, str]


class NotificationPreviewResponse(BaseModel):
    """Schema for notification preview responses"""
    subject: Optional[str] = None
    body: str
    rendered_variables: Dict[str, str]


class NotificationSettingsResponse(BaseModel):
    """Schema for notification settings"""
    email_enabled: bool
    sms_enabled: bool
    email_from_name: str
    email_from_address: Optional[str] = None
    sms_provider: Optional[str] = None
    default_templates: Dict[str, UUID]  # template_type -> template_id


class NotificationSettingsUpdate(BaseModel):
    """Schema for updating notification settings"""
    email_enabled: Optional[bool] = None
    sms_enabled: Optional[bool] = None
    email_from_name: Optional[str] = Field(None, min_length=1, max_length=100)


class NotificationDeliveryStatus(BaseModel):
    """Schema for notification delivery status"""
    notification_id: UUID
    status: NotificationStatus
    sent_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    error_message: Optional[str] = None
    provider_message_id: Optional[str] = None


class NotificationCampaignRequest(BaseModel):
    """Schema for notification campaign requests"""
    name: str = Field(..., min_length=1, max_length=255)
    message: str = Field(..., min_length=1, max_length=1000)
    customer_filter: Dict[str, Any] = Field(default_factory=dict)
    notification_type: NotificationType = NotificationType.SMS
    scheduled_at: Optional[datetime] = None


class NotificationCampaignResponse(BaseModel):
    """Schema for notification campaign responses"""
    id: UUID
    name: str
    message: str
    notification_type: NotificationType
    customer_count: int
    sent_count: int
    failed_count: int
    status: str
    created_at: datetime
    scheduled_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class NotificationAnalyticsResponse(BaseModel):
    """Schema for notification analytics"""
    total_notifications: int
    success_rate: float
    email_success_rate: float
    sms_success_rate: float
    daily_stats: List[Dict[str, Any]]
    monthly_stats: List[Dict[str, Any]]
    top_failure_reasons: List[Dict[str, Any]]


class NotificationWebhookPayload(BaseModel):
    """Schema for notification webhook payloads"""
    notification_id: UUID
    status: NotificationStatus
    provider_message_id: Optional[str] = None
    delivered_at: Optional[datetime] = None
    error_message: Optional[str] = None
    webhook_signature: str


class NotificationTestRequest(BaseModel):
    """Schema for testing notification configuration"""
    notification_type: NotificationType
    recipient: str = Field(..., min_length=1)  # email or phone
    test_message: str = Field(..., min_length=1, max_length=500)


class NotificationTestResponse(BaseModel):
    """Schema for notification test responses"""
    success: bool
    message: str
    provider_response: Optional[Dict[str, Any]] = None
    error_details: Optional[str] = None