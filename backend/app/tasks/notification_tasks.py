"""
Notification and communication tasks
"""

from celery import current_task
from app.celery_app import celery_app
from app.core.database import SessionLocal
from app.services.notification_service import NotificationService, EmailService, SMSService
from app.models.notification import NotificationLog, NotificationStatus, NotificationType
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)


@celery_app.task(bind=True, name="app.tasks.send_email")
def send_email(self, notification_id: str = None, recipient: str = None, subject: str = None, body: str = None, html_body: str = None):
    """Send email notification"""
    try:
        db = SessionLocal()
        
        if notification_id:
            # Send from notification log
            notification = db.query(NotificationLog).filter(
                NotificationLog.id == notification_id
            ).first()
            
            if not notification:
                logger.error(f"Notification not found: {notification_id}")
                return {"status": "error", "message": "Notification not found"}
            
            result = EmailService.send_email(
                recipient=notification.recipient_email,
                subject=notification.subject,
                body=notification.body,
                html_body=html_body
            )
            
            # Update notification status
            notification_service = NotificationService(db)
            if result["status"] == "success":
                notification_service.mark_notification_sent(
                    notification_id,
                    result.get("provider_id")
                )
            else:
                notification_service.mark_notification_failed(
                    notification_id,
                    result.get("error", "Unknown error")
                )
            
        else:
            # Direct email sending
            result = EmailService.send_email(
                recipient=recipient,
                subject=subject,
                body=body,
                html_body=html_body
            )
        
        db.close()
        logger.info(f"Email task completed: {result}")
        return result
        
    except Exception as exc:
        logger.error(f"Email sending failed: {exc}")
        if notification_id:
            try:
                db = SessionLocal()
                notification_service = NotificationService(db)
                notification_service.mark_notification_failed(notification_id, str(exc))
                db.close()
            except:
                pass
        raise self.retry(exc=exc, countdown=60, max_retries=3)


@celery_app.task(bind=True, name="app.tasks.send_sms")
def send_sms(self, notification_id: str = None, phone_number: str = None, message: str = None):
    """Send SMS notification"""
    try:
        db = SessionLocal()
        
        if notification_id:
            # Send from notification log
            notification = db.query(NotificationLog).filter(
                NotificationLog.id == notification_id
            ).first()
            
            if not notification:
                logger.error(f"Notification not found: {notification_id}")
                return {"status": "error", "message": "Notification not found"}
            
            result = SMSService.send_sms(
                phone_number=notification.recipient_phone,
                message=notification.body
            )
            
            # Update notification status
            notification_service = NotificationService(db)
            if result["status"] == "success":
                notification_service.mark_notification_sent(
                    notification_id,
                    result.get("provider_id")
                )
            else:
                notification_service.mark_notification_failed(
                    notification_id,
                    result.get("error", "Unknown error")
                )
            
        else:
            # Direct SMS sending
            result = SMSService.send_sms(
                phone_number=phone_number,
                message=message
            )
        
        db.close()
        logger.info(f"SMS task completed: {result}")
        return result
        
    except Exception as exc:
        logger.error(f"SMS sending failed: {exc}")
        if notification_id:
            try:
                db = SessionLocal()
                notification_service = NotificationService(db)
                notification_service.mark_notification_failed(notification_id, str(exc))
                db.close()
            except:
                pass
        raise self.retry(exc=exc, countdown=60, max_retries=3)


@celery_app.task(bind=True, name="app.tasks.send_invoice_notification")
def send_invoice_notification(self, invoice_id: str, notification_type: str = "email"):
    """Send invoice notification to customer"""
    try:
        db = SessionLocal()
        notification_service = NotificationService(db)
        
        # Convert string to enum
        notif_type = NotificationType.EMAIL if notification_type == "email" else NotificationType.SMS
        
        # Create notification
        notification = notification_service.send_invoice_notification(
            invoice_id=invoice_id,
            notification_type=notif_type
        )
        
        if notification:
            # Queue the actual sending
            if notif_type == NotificationType.EMAIL:
                send_email.delay(notification_id=str(notification.id))
            else:
                send_sms.delay(notification_id=str(notification.id))
            
            result = {
                "status": "success",
                "notification_id": str(notification.id),
                "message": "Invoice notification queued"
            }
        else:
            result = {
                "status": "error",
                "message": "Failed to create notification"
            }
        
        db.close()
        return result
        
    except Exception as exc:
        logger.error(f"Invoice notification failed for {invoice_id}: {exc}")
        raise self.retry(exc=exc, countdown=60, max_retries=3)


@celery_app.task(bind=True, name="app.tasks.send_payment_confirmation")
def send_payment_confirmation(self, invoice_id: str, payment_amount: float, notification_type: str = "email"):
    """Send payment confirmation to customer"""
    try:
        db = SessionLocal()
        notification_service = NotificationService(db)
        
        # Convert string to enum
        notif_type = NotificationType.EMAIL if notification_type == "email" else NotificationType.SMS
        
        # Create notification
        notification = notification_service.send_payment_confirmation(
            invoice_id=invoice_id,
            payment_amount=payment_amount,
            notification_type=notif_type
        )
        
        if notification:
            # Queue the actual sending
            if notif_type == NotificationType.EMAIL:
                send_email.delay(notification_id=str(notification.id))
            else:
                send_sms.delay(notification_id=str(notification.id))
            
            result = {
                "status": "success",
                "notification_id": str(notification.id),
                "message": "Payment confirmation queued"
            }
        else:
            result = {
                "status": "error",
                "message": "Failed to create notification"
            }
        
        db.close()
        return result
        
    except Exception as exc:
        logger.error(f"Payment confirmation failed for {invoice_id}: {exc}")
        raise self.retry(exc=exc, countdown=60, max_retries=3)


@celery_app.task(bind=True, name="app.tasks.send_installment_reminders")
def send_installment_reminders(self, days_ahead: int = 3):
    """Send reminders for upcoming installment payments"""
    try:
        db = SessionLocal()
        notification_service = NotificationService(db)
        
        # Get installments that need reminders
        installments = notification_service.get_due_installment_reminders(days_ahead)
        
        reminders_sent = 0
        for installment in installments:
            # Check if reminder was already sent recently
            recent_reminder = db.query(NotificationLog).filter(
                NotificationLog.reference_type == "installment",
                NotificationLog.reference_id == installment.id,
                NotificationLog.created_at > datetime.utcnow() - timedelta(days=1)
            ).first()
            
            if not recent_reminder:
                # Send reminder
                notification = notification_service.send_installment_reminder(
                    installment_id=str(installment.id),
                    days_before_due=days_ahead,
                    notification_type=NotificationType.SMS
                )
                
                if notification:
                    send_sms.delay(notification_id=str(notification.id))
                    reminders_sent += 1
        
        db.close()
        
        result = {
            "status": "success",
            "reminders_sent": reminders_sent,
            "message": f"Sent {reminders_sent} installment reminders"
        }
        
        logger.info(f"Installment reminders completed: {result}")
        return result
        
    except Exception as exc:
        logger.error(f"Installment reminders failed: {exc}")
        raise self.retry(exc=exc, countdown=300, max_retries=2)


@celery_app.task(bind=True, name="app.tasks.send_overdue_notices")
def send_overdue_notices(self):
    """Send overdue notices for late payments"""
    try:
        db = SessionLocal()
        notification_service = NotificationService(db)
        
        # Get overdue installments
        overdue_installments = notification_service.get_overdue_installments()
        
        notices_sent = 0
        for installment in overdue_installments:
            days_overdue = installment.days_overdue
            
            # Send notices at 3, 15, and 30 days overdue
            if days_overdue in [3, 15, 30]:
                # Check if notice was already sent for this milestone
                recent_notice = db.query(NotificationLog).filter(
                    NotificationLog.reference_type == "overdue",
                    NotificationLog.reference_id == installment.id,
                    NotificationLog.created_at > datetime.utcnow() - timedelta(days=1),
                    NotificationLog.body.contains(f"{days_overdue} روز")
                ).first()
                
                if not recent_notice:
                    # Send overdue notice
                    notification = notification_service.send_overdue_notice(
                        installment_id=str(installment.id),
                        days_overdue=days_overdue,
                        notification_type=NotificationType.SMS
                    )
                    
                    if notification:
                        send_sms.delay(notification_id=str(notification.id))
                        notices_sent += 1
        
        db.close()
        
        result = {
            "status": "success",
            "notices_sent": notices_sent,
            "message": f"Sent {notices_sent} overdue notices"
        }
        
        logger.info(f"Overdue notices completed: {result}")
        return result
        
    except Exception as exc:
        logger.error(f"Overdue notices failed: {exc}")
        raise self.retry(exc=exc, countdown=300, max_retries=2)


@celery_app.task(bind=True, name="app.tasks.process_notification_queue")
def process_notification_queue(self, batch_size: int = 50):
    """Process pending notifications in queue"""
    try:
        db = SessionLocal()
        notification_service = NotificationService(db)
        
        # Get pending notifications
        pending_notifications = notification_service.get_pending_notifications(batch_size)
        
        processed = 0
        for notification in pending_notifications:
            try:
                if notification.notification_type == NotificationType.EMAIL:
                    send_email.delay(notification_id=str(notification.id))
                elif notification.notification_type == NotificationType.SMS:
                    send_sms.delay(notification_id=str(notification.id))
                
                processed += 1
                
            except Exception as e:
                logger.error(f"Failed to queue notification {notification.id}: {e}")
                notification_service.mark_notification_failed(
                    str(notification.id),
                    f"Queue processing error: {str(e)}"
                )
        
        db.close()
        
        result = {
            "status": "success",
            "processed": processed,
            "message": f"Processed {processed} notifications"
        }
        
        logger.info(f"Notification queue processing completed: {result}")
        return result
        
    except Exception as exc:
        logger.error(f"Notification queue processing failed: {exc}")
        raise self.retry(exc=exc, countdown=120, max_retries=2)


@celery_app.task(bind=True, name="app.tasks.send_bulk_sms_campaign")
def send_bulk_sms_campaign(self, tenant_id: str, customer_ids: list, message: str, campaign_name: str = None):
    """Send bulk SMS campaign to multiple customers"""
    try:
        db = SessionLocal()
        notification_service = NotificationService(db)
        
        # Create bulk notifications
        notifications = notification_service.send_bulk_sms(
            tenant_id=tenant_id,
            customer_ids=customer_ids,
            message=message,
            campaign_name=campaign_name
        )
        
        # Queue all notifications for sending
        for notification in notifications:
            send_sms.delay(notification_id=str(notification.id))
        
        db.close()
        
        result = {
            "status": "success",
            "campaign_name": campaign_name,
            "notifications_created": len(notifications),
            "message": f"Bulk SMS campaign queued for {len(notifications)} customers"
        }
        
        logger.info(f"Bulk SMS campaign completed: {result}")
        return result
        
    except Exception as exc:
        logger.error(f"Bulk SMS campaign failed: {exc}")
        raise self.retry(exc=exc, countdown=120, max_retries=2)