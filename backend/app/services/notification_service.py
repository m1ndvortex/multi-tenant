"""
Notification service for email and SMS communications
"""

from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from datetime import datetime, timedelta
import logging
import smtplib
import requests
import json

from app.models.notification import (
    NotificationTemplate, NotificationLog, NotificationQueue,
    NotificationStatus, NotificationType
)
from app.models.invoice import Invoice, InvoiceStatus
from app.models.installment import Installment, InstallmentStatus
from app.models.customer import Customer
from app.models.tenant import Tenant
from app.core.config import settings

logger = logging.getLogger(__name__)


class NotificationService:
    """Service for managing notifications and communications"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def create_template(
        self,
        tenant_id: str,
        name: str,
        template_type: NotificationType,
        subject: Optional[str],
        body: str,
        trigger_event: Optional[str] = None,
        variables: Optional[List[str]] = None,
        is_default: bool = False
    ) -> NotificationTemplate:
        """Create a new notification template"""
        
        # If setting as default, unset other defaults of same type
        if is_default:
            self.db.query(NotificationTemplate).filter(
                and_(
                    NotificationTemplate.tenant_id == tenant_id,
                    NotificationTemplate.template_type == template_type,
                    NotificationTemplate.is_default == True
                )
            ).update({"is_default": False})
        
        template = NotificationTemplate(
            tenant_id=tenant_id,
            name=name,
            template_type=template_type,
            subject=subject,
            body=body,
            trigger_event=trigger_event,
            variables=variables or [],
            is_default=is_default
        )
        
        self.db.add(template)
        self.db.commit()
        self.db.refresh(template)
        
        logger.info(f"Created notification template: {name} for tenant {tenant_id}")
        return template
    
    def get_template(
        self,
        tenant_id: str,
        template_type: NotificationType,
        trigger_event: Optional[str] = None
    ) -> Optional[NotificationTemplate]:
        """Get notification template for tenant and type"""
        
        query = self.db.query(NotificationTemplate).filter(
            and_(
                NotificationTemplate.tenant_id == tenant_id,
                NotificationTemplate.template_type == template_type,
                NotificationTemplate.is_active == True
            )
        )
        
        # Try to find template for specific trigger event first
        if trigger_event:
            template = query.filter(
                NotificationTemplate.trigger_event == trigger_event
            ).first()
            if template:
                return template
        
        # Fall back to default template
        return query.filter(NotificationTemplate.is_default == True).first()
    
    def create_notification_log(
        self,
        tenant_id: str,
        notification_type: NotificationType,
        recipient_email: Optional[str] = None,
        recipient_phone: Optional[str] = None,
        customer_id: Optional[str] = None,
        subject: Optional[str] = None,
        body: str = "",
        template_id: Optional[str] = None,
        template_variables: Optional[Dict[str, Any]] = None,
        reference_type: Optional[str] = None,
        reference_id: Optional[str] = None,
        priority: int = 5
    ) -> NotificationLog:
        """Create a notification log entry"""
        
        notification_log = NotificationLog(
            tenant_id=tenant_id,
            notification_type=notification_type,
            recipient_email=recipient_email,
            recipient_phone=recipient_phone,
            customer_id=customer_id,
            subject=subject,
            body=body,
            template_id=template_id,
            template_variables=template_variables,
            reference_type=reference_type,
            reference_id=reference_id,
            status=NotificationStatus.PENDING
        )
        
        self.db.add(notification_log)
        self.db.commit()
        self.db.refresh(notification_log)
        
        # Add to queue
        queue_item = NotificationQueue(
            notification_log_id=notification_log.id,
            priority=priority,
            scheduled_at=datetime.utcnow()
        )
        
        self.db.add(queue_item)
        self.db.commit()
        
        logger.info(f"Created notification log: {notification_log.id}")
        return notification_log
    
    def send_invoice_notification(
        self,
        invoice_id: str,
        notification_type: NotificationType = NotificationType.EMAIL
    ) -> Optional[NotificationLog]:
        """Send invoice notification to customer"""
        
        # Get invoice with customer details
        invoice = self.db.query(Invoice).filter(Invoice.id == invoice_id).first()
        if not invoice:
            logger.error(f"Invoice not found: {invoice_id}")
            return None
        
        customer = invoice.customer
        if not customer:
            logger.error(f"Customer not found for invoice: {invoice_id}")
            return None
        
        # Get notification template
        template = self.get_template(
            tenant_id=invoice.tenant_id,
            template_type=notification_type,
            trigger_event="invoice_created"
        )
        
        # Prepare template variables
        variables = {
            "customer_name": customer.name,
            "invoice_number": invoice.invoice_number,
            "invoice_total": str(invoice.total_amount),
            "invoice_date": invoice.invoice_date.strftime("%Y-%m-%d"),
            "due_date": invoice.due_date.strftime("%Y-%m-%d") if invoice.due_date else "",
            "company_name": "HesaabPlus"  # This should come from tenant settings
        }
        
        # Render template or use default content
        if template:
            rendered = template.render(variables)
            subject = rendered["subject"]
            body = rendered["body"]
        else:
            subject = f"فاکتور جدید - {invoice.invoice_number}"
            body = f"مشتری گرامی {customer.name}،\n\nفاکتور شماره {invoice.invoice_number} به مبلغ {invoice.total_amount} تومان برای شما صادر شده است.\n\nبا تشکر"
        
        # Create notification log
        recipient_email = customer.email if notification_type == NotificationType.EMAIL else None
        recipient_phone = customer.phone if notification_type == NotificationType.SMS else None
        
        return self.create_notification_log(
            tenant_id=invoice.tenant_id,
            notification_type=notification_type,
            recipient_email=recipient_email,
            recipient_phone=recipient_phone,
            customer_id=customer.id,
            subject=subject,
            body=body,
            template_id=template.id if template else None,
            template_variables=variables,
            reference_type="invoice",
            reference_id=invoice.id
        )
    
    def send_payment_confirmation(
        self,
        invoice_id: str,
        payment_amount: float,
        notification_type: NotificationType = NotificationType.EMAIL
    ) -> Optional[NotificationLog]:
        """Send payment confirmation to customer"""
        
        # Get invoice with customer details
        invoice = self.db.query(Invoice).filter(Invoice.id == invoice_id).first()
        if not invoice:
            logger.error(f"Invoice not found: {invoice_id}")
            return None
        
        customer = invoice.customer
        if not customer:
            logger.error(f"Customer not found for invoice: {invoice_id}")
            return None
        
        # Get notification template
        template = self.get_template(
            tenant_id=invoice.tenant_id,
            template_type=notification_type,
            trigger_event="payment_received"
        )
        
        # Prepare template variables
        variables = {
            "customer_name": customer.name,
            "invoice_number": invoice.invoice_number,
            "payment_amount": str(payment_amount),
            "remaining_balance": str(invoice.balance_due),
            "payment_date": datetime.utcnow().strftime("%Y-%m-%d"),
            "company_name": "HesaabPlus"
        }
        
        # Render template or use default content
        if template:
            rendered = template.render(variables)
            subject = rendered["subject"]
            body = rendered["body"]
        else:
            subject = f"تایید پرداخت - فاکتور {invoice.invoice_number}"
            body = f"مشتری گرامی {customer.name}،\n\nپرداخت شما به مبلغ {payment_amount} تومان برای فاکتور {invoice.invoice_number} دریافت شد.\n\nباقیمانده: {invoice.balance_due} تومان\n\nبا تشکر"
        
        # Create notification log
        recipient_email = customer.email if notification_type == NotificationType.EMAIL else None
        recipient_phone = customer.phone if notification_type == NotificationType.SMS else None
        
        return self.create_notification_log(
            tenant_id=invoice.tenant_id,
            notification_type=notification_type,
            recipient_email=recipient_email,
            recipient_phone=recipient_phone,
            customer_id=customer.id,
            subject=subject,
            body=body,
            template_id=template.id if template else None,
            template_variables=variables,
            reference_type="payment",
            reference_id=invoice.id
        )
    
    def send_installment_reminder(
        self,
        installment_id: str,
        days_before_due: int = 3,
        notification_type: NotificationType = NotificationType.SMS
    ) -> Optional[NotificationLog]:
        """Send installment reminder to customer"""
        
        # Get installment with invoice and customer details
        installment = self.db.query(Installment).filter(Installment.id == installment_id).first()
        if not installment:
            logger.error(f"Installment not found: {installment_id}")
            return None
        
        invoice = installment.invoice
        customer = invoice.customer
        
        # Get notification template
        template = self.get_template(
            tenant_id=invoice.tenant_id,
            template_type=notification_type,
            trigger_event="installment_reminder"
        )
        
        # Prepare template variables
        variables = {
            "customer_name": customer.name,
            "invoice_number": invoice.invoice_number,
            "installment_number": str(installment.installment_number),
            "due_date": installment.due_date.strftime("%Y-%m-%d"),
            "amount_due": str(installment.remaining_amount) if installment.installment_type.value == "general" else f"{installment.remaining_gold_weight} گرم",
            "days_until_due": str(days_before_due),
            "company_name": "HesaabPlus"
        }
        
        # Render template or use default content
        if template:
            rendered = template.render(variables)
            subject = rendered["subject"]
            body = rendered["body"]
        else:
            subject = f"یادآوری قسط - فاکتور {invoice.invoice_number}"
            if installment.installment_type.value == "general":
                body = f"مشتری گرامی {customer.name}،\n\nقسط شماره {installment.installment_number} فاکتور {invoice.invoice_number} به مبلغ {installment.remaining_amount} تومان تا {days_before_due} روز دیگر سررسید می‌شود.\n\nتاریخ سررسید: {installment.due_date.strftime('%Y-%m-%d')}\n\nبا تشکر"
            else:
                body = f"مشتری گرامی {customer.name}،\n\nقسط شماره {installment.installment_number} فاکتور {invoice.invoice_number} به وزن {installment.remaining_gold_weight} گرم تا {days_before_due} روز دیگر سررسید می‌شود.\n\nتاریخ سررسید: {installment.due_date.strftime('%Y-%m-%d')}\n\nبا تشکر"
        
        # Create notification log
        recipient_email = customer.email if notification_type == NotificationType.EMAIL else None
        recipient_phone = customer.phone if notification_type == NotificationType.SMS else None
        
        return self.create_notification_log(
            tenant_id=invoice.tenant_id,
            notification_type=notification_type,
            recipient_email=recipient_email,
            recipient_phone=recipient_phone,
            customer_id=customer.id,
            subject=subject,
            body=body,
            template_id=template.id if template else None,
            template_variables=variables,
            reference_type="installment",
            reference_id=installment.id
        )
    
    def send_overdue_notice(
        self,
        installment_id: str,
        days_overdue: int,
        notification_type: NotificationType = NotificationType.SMS
    ) -> Optional[NotificationLog]:
        """Send overdue notice to customer"""
        
        # Get installment with invoice and customer details
        installment = self.db.query(Installment).filter(Installment.id == installment_id).first()
        if not installment:
            logger.error(f"Installment not found: {installment_id}")
            return None
        
        invoice = installment.invoice
        customer = invoice.customer
        
        # Get notification template
        template = self.get_template(
            tenant_id=invoice.tenant_id,
            template_type=notification_type,
            trigger_event="overdue_notice"
        )
        
        # Prepare template variables
        variables = {
            "customer_name": customer.name,
            "invoice_number": invoice.invoice_number,
            "installment_number": str(installment.installment_number),
            "due_date": installment.due_date.strftime("%Y-%m-%d"),
            "amount_due": str(installment.remaining_amount) if installment.installment_type.value == "general" else f"{installment.remaining_gold_weight} گرم",
            "days_overdue": str(days_overdue),
            "company_name": "HesaabPlus"
        }
        
        # Render template or use default content
        if template:
            rendered = template.render(variables)
            subject = rendered["subject"]
            body = rendered["body"]
        else:
            subject = f"اخطار عدم پرداخت - فاکتور {invoice.invoice_number}"
            if installment.installment_type.value == "general":
                body = f"مشتری گرامی {customer.name}،\n\nقسط شماره {installment.installment_number} فاکتور {invoice.invoice_number} به مبلغ {installment.remaining_amount} تومان از تاریخ سررسید {days_overdue} روز گذشته است.\n\nلطفاً در اسرع وقت نسبت به پرداخت اقدام فرمایید.\n\nبا تشکر"
            else:
                body = f"مشتری گرامی {customer.name}،\n\nقسط شماره {installment.installment_number} فاکتور {invoice.invoice_number} به وزن {installment.remaining_gold_weight} گرم از تاریخ سررسید {days_overdue} روز گذشته است.\n\nلطفاً در اسرع وقت نسبت به پرداخت اقدام فرمایید.\n\nبا تشکر"
        
        # Create notification log
        recipient_email = customer.email if notification_type == NotificationType.EMAIL else None
        recipient_phone = customer.phone if notification_type == NotificationType.SMS else None
        
        return self.create_notification_log(
            tenant_id=invoice.tenant_id,
            notification_type=notification_type,
            recipient_email=recipient_email,
            recipient_phone=recipient_phone,
            customer_id=customer.id,
            subject=subject,
            body=body,
            template_id=template.id if template else None,
            template_variables=variables,
            reference_type="overdue",
            reference_id=installment.id,
            priority=2  # Higher priority for overdue notices
        )
    
    def get_pending_notifications(self, limit: int = 100) -> List[NotificationLog]:
        """Get pending notifications from queue"""
        
        return (
            self.db.query(NotificationLog)
            .join(NotificationQueue)
            .filter(NotificationLog.status == NotificationStatus.PENDING)
            .order_by(NotificationQueue.priority, NotificationQueue.scheduled_at)
            .limit(limit)
            .all()
        )
    
    def get_due_installment_reminders(self, days_ahead: int = 3) -> List[Installment]:
        """Get installments that need reminders"""
        
        reminder_date = datetime.utcnow() + timedelta(days=days_ahead)
        
        return (
            self.db.query(Installment)
            .join(Invoice)
            .filter(
                and_(
                    Installment.status == InstallmentStatus.PENDING,
                    Installment.due_date <= reminder_date,
                    Installment.due_date > datetime.utcnow()
                )
            )
            .all()
        )
    
    def get_overdue_installments(self) -> List[Installment]:
        """Get overdue installments that need notices"""
        
        return (
            self.db.query(Installment)
            .join(Invoice)
            .filter(
                and_(
                    Installment.status.in_([InstallmentStatus.PENDING, InstallmentStatus.OVERDUE]),
                    Installment.due_date < datetime.utcnow()
                )
            )
            .all()
        )
    
    def send_bulk_sms(
        self,
        tenant_id: str,
        customer_ids: List[str],
        message: str,
        campaign_name: Optional[str] = None
    ) -> List[NotificationLog]:
        """Send bulk SMS to multiple customers"""
        
        customers = (
            self.db.query(Customer)
            .filter(
                and_(
                    Customer.tenant_id == tenant_id,
                    Customer.id.in_(customer_ids),
                    Customer.phone.isnot(None)
                )
            )
            .all()
        )
        
        notifications = []
        for customer in customers:
            notification = self.create_notification_log(
                tenant_id=tenant_id,
                notification_type=NotificationType.SMS,
                recipient_phone=customer.phone,
                customer_id=customer.id,
                body=message,
                reference_type="campaign",
                reference_id=campaign_name
            )
            notifications.append(notification)
        
        logger.info(f"Created {len(notifications)} bulk SMS notifications for tenant {tenant_id}")
        return notifications
    
    def mark_notification_sent(
        self,
        notification_id: str,
        provider_message_id: Optional[str] = None
    ) -> bool:
        """Mark notification as sent"""
        
        notification = self.db.query(NotificationLog).filter(
            NotificationLog.id == notification_id
        ).first()
        
        if notification:
            notification.mark_sent(provider_message_id)
            self.db.commit()
            
            # Remove from queue
            self.db.query(NotificationQueue).filter(
                NotificationQueue.notification_log_id == notification_id
            ).delete()
            self.db.commit()
            
            return True
        
        return False
    
    def mark_notification_failed(
        self,
        notification_id: str,
        error_message: str
    ) -> bool:
        """Mark notification as failed"""
        
        notification = self.db.query(NotificationLog).filter(
            NotificationLog.id == notification_id
        ).first()
        
        if notification:
            notification.mark_failed(error_message)
            self.db.commit()
            
            # Check if can retry
            if notification.can_retry():
                # Update queue for retry
                queue_item = self.db.query(NotificationQueue).filter(
                    NotificationQueue.notification_log_id == notification_id
                ).first()
                
                if queue_item:
                    queue_item.attempts += 1
                    queue_item.last_attempt_at = datetime.utcnow()
                    queue_item.scheduled_at = datetime.utcnow() + timedelta(minutes=5 * notification.retry_count)
                    self.db.commit()
            else:
                # Remove from queue if max retries exceeded
                self.db.query(NotificationQueue).filter(
                    NotificationQueue.notification_log_id == notification_id
                ).delete()
                self.db.commit()
            
            return True
        
        return False


class EmailService:
    """Service for sending emails"""
    
    @staticmethod
    def send_email(
        recipient: str,
        subject: str,
        body: str,
        html_body: Optional[str] = None,
        attachments: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """Send email using SMTP"""
        
        try:
            # Import email modules here to avoid import issues
            from email.mime.text import MimeText
            from email.mime.multipart import MimeMultipart
            from email.mime.base import MimeBase
            from email import encoders
            
            # Create message
            msg = MimeMultipart('alternative')
            msg['From'] = f"{settings.email_from_name} <{settings.email_from_email}>"
            msg['To'] = recipient
            msg['Subject'] = subject
            
            # Add text body
            text_part = MimeText(body, 'plain', 'utf-8')
            msg.attach(text_part)
            
            # Add HTML body if provided
            if html_body:
                html_part = MimeText(html_body, 'html', 'utf-8')
                msg.attach(html_part)
            
            # Add attachments if provided
            if attachments:
                for attachment in attachments:
                    part = MimeBase('application', 'octet-stream')
                    part.set_payload(attachment['content'])
                    encoders.encode_base64(part)
                    part.add_header(
                        'Content-Disposition',
                        f'attachment; filename= {attachment["filename"]}'
                    )
                    msg.attach(part)
            
            # Send email
            if settings.email_smtp_host and settings.email_username and settings.email_password:
                with smtplib.SMTP(settings.email_smtp_host, settings.email_smtp_port) as server:
                    server.starttls()
                    server.login(settings.email_username, settings.email_password)
                    server.send_message(msg)
                
                logger.info(f"Email sent successfully to {recipient}")
                return {
                    "status": "success",
                    "recipient": recipient,
                    "message": "Email sent successfully"
                }
            else:
                # Mock mode for testing
                logger.info(f"Mock email sent to {recipient}: {subject}")
                return {
                    "status": "success",
                    "recipient": recipient,
                    "message": "Mock email sent successfully",
                    "mock": True
                }
                
        except Exception as e:
            logger.error(f"Failed to send email to {recipient}: {str(e)}")
            return {
                "status": "error",
                "recipient": recipient,
                "error": str(e)
            }


class SMSService:
    """Service for sending SMS"""
    
    @staticmethod
    def send_sms(phone_number: str, message: str) -> Dict[str, Any]:
        """Send SMS using SMS gateway"""
        
        try:
            if settings.sms_api_key and settings.sms_api_url:
                # Real SMS sending
                payload = {
                    "api_key": settings.sms_api_key,
                    "phone": phone_number,
                    "message": message
                }
                
                response = requests.post(
                    settings.sms_api_url,
                    json=payload,
                    timeout=30
                )
                
                if response.status_code == 200:
                    result = response.json()
                    logger.info(f"SMS sent successfully to {phone_number}")
                    return {
                        "status": "success",
                        "phone_number": phone_number,
                        "message": "SMS sent successfully",
                        "provider_id": result.get("message_id")
                    }
                else:
                    logger.error(f"SMS API error: {response.status_code} - {response.text}")
                    return {
                        "status": "error",
                        "phone_number": phone_number,
                        "error": f"SMS API error: {response.status_code}"
                    }
            else:
                # Mock mode for testing
                logger.info(f"Mock SMS sent to {phone_number}: {message}")
                return {
                    "status": "success",
                    "phone_number": phone_number,
                    "message": "Mock SMS sent successfully",
                    "mock": True
                }
                
        except Exception as e:
            logger.error(f"Failed to send SMS to {phone_number}: {str(e)}")
            return {
                "status": "error",
                "phone_number": phone_number,
                "error": str(e)
            }