"""
Notification management API endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID

from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.user import User
from app.models.notification import NotificationTemplate, NotificationLog, NotificationType, NotificationStatus
from app.schemas.notifications import (
    NotificationTemplateCreate, NotificationTemplateUpdate, NotificationTemplateResponse,
    NotificationLogResponse, NotificationStatsResponse, BulkSMSRequest
)
from app.services.notification_service import NotificationService
from app.tasks.notification_tasks import (
    send_invoice_notification, send_payment_confirmation,
    send_bulk_sms_campaign, process_notification_queue
)

router = APIRouter()


@router.post("/templates", response_model=NotificationTemplateResponse)
def create_notification_template(
    template_data: NotificationTemplateCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new notification template"""
    
    notification_service = NotificationService(db)
    
    template = notification_service.create_template(
        tenant_id=current_user.tenant_id,
        name=template_data.name,
        template_type=template_data.template_type,
        subject=template_data.subject,
        body=template_data.body,
        trigger_event=template_data.trigger_event,
        variables=template_data.variables,
        is_default=template_data.is_default
    )
    
    return template


@router.get("/templates", response_model=List[NotificationTemplateResponse])
def get_notification_templates(
    template_type: Optional[NotificationType] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get notification templates for current tenant"""
    
    query = db.query(NotificationTemplate).filter(
        NotificationTemplate.tenant_id == current_user.tenant_id,
        NotificationTemplate.is_active == True
    )
    
    if template_type:
        query = query.filter(NotificationTemplate.template_type == template_type)
    
    templates = query.order_by(NotificationTemplate.name).all()
    return templates


@router.get("/templates/{template_id}", response_model=NotificationTemplateResponse)
def get_notification_template(
    template_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific notification template"""
    
    template = db.query(NotificationTemplate).filter(
        NotificationTemplate.id == template_id,
        NotificationTemplate.tenant_id == current_user.tenant_id
    ).first()
    
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification template not found"
        )
    
    return template


@router.put("/templates/{template_id}", response_model=NotificationTemplateResponse)
def update_notification_template(
    template_id: UUID,
    template_data: NotificationTemplateUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a notification template"""
    
    template = db.query(NotificationTemplate).filter(
        NotificationTemplate.id == template_id,
        NotificationTemplate.tenant_id == current_user.tenant_id
    ).first()
    
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification template not found"
        )
    
    # Update fields
    for field, value in template_data.dict(exclude_unset=True).items():
        setattr(template, field, value)
    
    # If setting as default, unset other defaults
    if template_data.is_default:
        db.query(NotificationTemplate).filter(
            NotificationTemplate.tenant_id == current_user.tenant_id,
            NotificationTemplate.template_type == template.template_type,
            NotificationTemplate.id != template_id,
            NotificationTemplate.is_default == True
        ).update({"is_default": False})
    
    db.commit()
    db.refresh(template)
    
    return template


@router.delete("/templates/{template_id}")
def delete_notification_template(
    template_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a notification template"""
    
    template = db.query(NotificationTemplate).filter(
        NotificationTemplate.id == template_id,
        NotificationTemplate.tenant_id == current_user.tenant_id
    ).first()
    
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification template not found"
        )
    
    # Soft delete
    template.is_active = False
    db.commit()
    
    return {"message": "Notification template deleted successfully"}


@router.get("/logs", response_model=List[NotificationLogResponse])
def get_notification_logs(
    notification_type: Optional[NotificationType] = Query(None),
    status: Optional[NotificationStatus] = Query(None),
    customer_id: Optional[UUID] = Query(None),
    reference_type: Optional[str] = Query(None),
    limit: int = Query(50, le=100),
    offset: int = Query(0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get notification logs for current tenant"""
    
    query = db.query(NotificationLog).filter(
        NotificationLog.tenant_id == current_user.tenant_id
    )
    
    if notification_type:
        query = query.filter(NotificationLog.notification_type == notification_type)
    
    if status:
        query = query.filter(NotificationLog.status == status)
    
    if customer_id:
        query = query.filter(NotificationLog.customer_id == customer_id)
    
    if reference_type:
        query = query.filter(NotificationLog.reference_type == reference_type)
    
    logs = (
        query.order_by(NotificationLog.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    
    return logs


@router.get("/logs/{log_id}", response_model=NotificationLogResponse)
def get_notification_log(
    log_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific notification log"""
    
    log = db.query(NotificationLog).filter(
        NotificationLog.id == log_id,
        NotificationLog.tenant_id == current_user.tenant_id
    ).first()
    
    if not log:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification log not found"
        )
    
    return log


@router.get("/stats", response_model=NotificationStatsResponse)
def get_notification_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get notification statistics for current tenant"""
    
    # Get counts by status
    total_sent = db.query(NotificationLog).filter(
        NotificationLog.tenant_id == current_user.tenant_id,
        NotificationLog.status == NotificationStatus.SENT
    ).count()
    
    total_failed = db.query(NotificationLog).filter(
        NotificationLog.tenant_id == current_user.tenant_id,
        NotificationLog.status == NotificationStatus.FAILED
    ).count()
    
    total_pending = db.query(NotificationLog).filter(
        NotificationLog.tenant_id == current_user.tenant_id,
        NotificationLog.status == NotificationStatus.PENDING
    ).count()
    
    # Get counts by type
    email_count = db.query(NotificationLog).filter(
        NotificationLog.tenant_id == current_user.tenant_id,
        NotificationLog.notification_type == NotificationType.EMAIL
    ).count()
    
    sms_count = db.query(NotificationLog).filter(
        NotificationLog.tenant_id == current_user.tenant_id,
        NotificationLog.notification_type == NotificationType.SMS
    ).count()
    
    return NotificationStatsResponse(
        total_sent=total_sent,
        total_failed=total_failed,
        total_pending=total_pending,
        email_count=email_count,
        sms_count=sms_count
    )


@router.post("/send/invoice/{invoice_id}")
def send_invoice_notification_endpoint(
    invoice_id: UUID,
    notification_type: NotificationType = NotificationType.EMAIL,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Send invoice notification to customer"""
    
    # Verify invoice belongs to current tenant
    from app.models.invoice import Invoice
    invoice = db.query(Invoice).filter(
        Invoice.id == invoice_id,
        Invoice.tenant_id == current_user.tenant_id
    ).first()
    
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found"
        )
    
    # Queue notification task
    task = send_invoice_notification.delay(
        invoice_id=str(invoice_id),
        notification_type=notification_type.value
    )
    
    return {
        "message": "Invoice notification queued successfully",
        "task_id": task.id
    }


@router.post("/send/payment-confirmation/{invoice_id}")
def send_payment_confirmation_endpoint(
    invoice_id: UUID,
    payment_amount: float,
    notification_type: NotificationType = NotificationType.EMAIL,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Send payment confirmation to customer"""
    
    # Verify invoice belongs to current tenant
    from app.models.invoice import Invoice
    invoice = db.query(Invoice).filter(
        Invoice.id == invoice_id,
        Invoice.tenant_id == current_user.tenant_id
    ).first()
    
    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found"
        )
    
    # Queue notification task
    task = send_payment_confirmation.delay(
        invoice_id=str(invoice_id),
        payment_amount=payment_amount,
        notification_type=notification_type.value
    )
    
    return {
        "message": "Payment confirmation queued successfully",
        "task_id": task.id
    }


@router.post("/send/bulk-sms")
def send_bulk_sms_endpoint(
    bulk_sms_data: BulkSMSRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Send bulk SMS to multiple customers"""
    
    # Verify customers belong to current tenant
    from app.models.customer import Customer
    customer_count = db.query(Customer).filter(
        Customer.tenant_id == current_user.tenant_id,
        Customer.id.in_(bulk_sms_data.customer_ids)
    ).count()
    
    if customer_count != len(bulk_sms_data.customer_ids):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Some customers not found or don't belong to your tenant"
        )
    
    # Queue bulk SMS task
    task = send_bulk_sms_campaign.delay(
        tenant_id=current_user.tenant_id,
        customer_ids=[str(cid) for cid in bulk_sms_data.customer_ids],
        message=bulk_sms_data.message,
        campaign_name=bulk_sms_data.campaign_name
    )
    
    return {
        "message": "Bulk SMS campaign queued successfully",
        "task_id": task.id,
        "customer_count": len(bulk_sms_data.customer_ids)
    }


@router.post("/process-queue")
def process_notification_queue_endpoint(
    batch_size: int = Query(50, le=100),
    current_user: User = Depends(get_current_user)
):
    """Manually trigger notification queue processing"""
    
    # Only allow admin users to trigger queue processing
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin users can trigger queue processing"
        )
    
    task = process_notification_queue.delay(batch_size=batch_size)
    
    return {
        "message": "Notification queue processing triggered",
        "task_id": task.id
    }


@router.post("/retry/{log_id}")
def retry_failed_notification(
    log_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retry a failed notification"""
    
    log = db.query(NotificationLog).filter(
        NotificationLog.id == log_id,
        NotificationLog.tenant_id == current_user.tenant_id,
        NotificationLog.status == NotificationStatus.FAILED
    ).first()
    
    if not log:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Failed notification not found"
        )
    
    # Reset status to pending
    log.status = NotificationStatus.PENDING
    log.retry_count = 0
    log.error_message = None
    db.commit()
    
    # Queue for sending
    if log.notification_type == NotificationType.EMAIL:
        from app.tasks.notification_tasks import send_email
        task = send_email.delay(notification_id=str(log_id))
    else:
        from app.tasks.notification_tasks import send_sms
        task = send_sms.delay(notification_id=str(log_id))
    
    return {
        "message": "Notification retry queued successfully",
        "task_id": task.id
    }