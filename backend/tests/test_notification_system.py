"""
Comprehensive tests for the notification system
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime, timedelta
from decimal import Decimal
from uuid import uuid4

from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.tenant import Tenant
from app.models.user import User
from app.models.customer import Customer
from app.models.invoice import Invoice, InvoiceItem, InvoiceType, InvoiceStatus
from app.models.installment import Installment, InstallmentType, InstallmentStatus
from app.models.notification import (
    NotificationTemplate, NotificationLog, NotificationQueue,
    NotificationType, NotificationStatus
)
from app.services.notification_service import NotificationService, EmailService, SMSService
from app.tasks.notification_tasks import (
    send_email, send_sms, send_invoice_notification,
    send_payment_confirmation, send_installment_reminders,
    send_overdue_notices, process_notification_queue,
    send_bulk_sms_campaign
)


class TestNotificationService:
    """Test notification service functionality"""
    
    @pytest.fixture
    def db_session(self):
        """Create test database session"""
        db = SessionLocal()
        yield db
        db.close()
    
    @pytest.fixture
    def tenant(self, db_session):
        """Create test tenant"""
        tenant = Tenant(
            id=uuid4(),
            name="Test Business",
            domain=f"test-{uuid4().hex[:8]}.hesaabplus.com",
            email="test@business.com",
            subscription_type="PRO",
            is_active=True
        )
        db_session.add(tenant)
        db_session.commit()
        db_session.refresh(tenant)
        return tenant
    
    @pytest.fixture
    def customer(self, db_session, tenant):
        """Create test customer"""
        customer = Customer(
            id=uuid4(),
            tenant_id=tenant.id,
            name="احمد محمدی",
            email="ahmad@example.com",
            phone="+989123456789"
        )
        db_session.add(customer)
        db_session.commit()
        db_session.refresh(customer)
        return customer
    
    @pytest.fixture
    def invoice(self, db_session, tenant, customer):
        """Create test invoice"""
        invoice = Invoice(
            id=uuid4(),
            tenant_id=tenant.id,
            customer_id=customer.id,
            invoice_number="INV-001",
            invoice_type=InvoiceType.GENERAL,
            total_amount=Decimal("1000.00"),
            status=InvoiceStatus.SENT,
            due_date=datetime.utcnow() + timedelta(days=30)
        )
        db_session.add(invoice)
        db_session.commit()
        db_session.refresh(invoice)
        return invoice
    
    @pytest.fixture
    def installment(self, db_session, invoice):
        """Create test installment"""
        installment = Installment(
            id=uuid4(),
            invoice_id=invoice.id,
            installment_number=1,
            installment_type=InstallmentType.GENERAL,
            amount_due=Decimal("500.00"),
            due_date=datetime.utcnow() + timedelta(days=3),
            status=InstallmentStatus.PENDING
        )
        db_session.add(installment)
        db_session.commit()
        db_session.refresh(installment)
        return installment
    
    @pytest.fixture
    def notification_service(self, db_session):
        """Create notification service instance"""
        return NotificationService(db_session)
    
    def test_create_notification_template(self, notification_service, tenant):
        """Test creating notification template"""
        template = notification_service.create_template(
            tenant_id=str(tenant.id),
            name="Invoice Created",
            template_type=NotificationType.EMAIL,
            subject="فاکتور جدید - {invoice_number}",
            body="مشتری گرامی {customer_name}، فاکتور شماره {invoice_number} برای شما صادر شده است.",
            trigger_event="invoice_created",
            variables=["customer_name", "invoice_number"],
            is_default=True
        )
        
        assert template.name == "Invoice Created"
        assert template.template_type == NotificationType.EMAIL
        assert template.is_default is True
        assert "customer_name" in template.variables
    
    def test_get_template(self, notification_service, tenant, db_session):
        """Test getting notification template"""
        # Create template
        template = NotificationTemplate(
            tenant_id=tenant.id,
            name="Test Template",
            template_type=NotificationType.SMS,
            body="Test message",
            trigger_event="test_event",
            is_default=True
        )
        db_session.add(template)
        db_session.commit()
        
        # Get template
        found_template = notification_service.get_template(
            tenant_id=str(tenant.id),
            template_type=NotificationType.SMS,
            trigger_event="test_event"
        )
        
        assert found_template is not None
        assert found_template.name == "Test Template"
    
    def test_send_invoice_notification(self, notification_service, invoice):
        """Test sending invoice notification"""
        notification = notification_service.send_invoice_notification(
            invoice_id=str(invoice.id),
            notification_type=NotificationType.EMAIL
        )
        
        assert notification is not None
        assert notification.notification_type == NotificationType.EMAIL
        assert notification.recipient_email == invoice.customer.email
        assert notification.reference_type == "invoice"
        assert notification.reference_id == invoice.id
        assert "INV-001" in notification.body
    
    def test_send_payment_confirmation(self, notification_service, invoice):
        """Test sending payment confirmation"""
        payment_amount = 500.0
        
        notification = notification_service.send_payment_confirmation(
            invoice_id=str(invoice.id),
            payment_amount=payment_amount,
            notification_type=NotificationType.SMS
        )
        
        assert notification is not None
        assert notification.notification_type == NotificationType.SMS
        assert notification.recipient_phone == invoice.customer.phone
        assert notification.reference_type == "payment"
        assert str(payment_amount) in notification.body
    
    def test_send_installment_reminder(self, notification_service, installment):
        """Test sending installment reminder"""
        notification = notification_service.send_installment_reminder(
            installment_id=str(installment.id),
            days_before_due=3,
            notification_type=NotificationType.SMS
        )
        
        assert notification is not None
        assert notification.notification_type == NotificationType.SMS
        assert notification.reference_type == "installment"
        assert "قسط" in notification.body
        assert "3 روز" in notification.body
    
    def test_send_overdue_notice(self, notification_service, installment, db_session):
        """Test sending overdue notice"""
        # Make installment overdue
        installment.due_date = datetime.utcnow() - timedelta(days=5)
        installment.status = InstallmentStatus.OVERDUE
        db_session.commit()
        
        notification = notification_service.send_overdue_notice(
            installment_id=str(installment.id),
            days_overdue=5,
            notification_type=NotificationType.SMS
        )
        
        assert notification is not None
        assert notification.notification_type == NotificationType.SMS
        assert notification.reference_type == "overdue"
        assert "5 روز" in notification.body
        assert notification.priority == 2  # Higher priority
    
    def test_get_due_installment_reminders(self, notification_service, installment):
        """Test getting installments that need reminders"""
        installments = notification_service.get_due_installment_reminders(days_ahead=5)
        
        assert len(installments) >= 1
        assert installment in installments
    
    def test_get_overdue_installments(self, notification_service, installment, db_session):
        """Test getting overdue installments"""
        # Make installment overdue
        installment.due_date = datetime.utcnow() - timedelta(days=1)
        db_session.commit()
        
        overdue_installments = notification_service.get_overdue_installments()
        
        assert len(overdue_installments) >= 1
        assert installment in overdue_installments
    
    def test_send_bulk_sms(self, notification_service, tenant, db_session):
        """Test sending bulk SMS"""
        # Create multiple customers
        customers = []
        for i in range(3):
            customer = Customer(
                id=uuid4(),
                tenant_id=tenant.id,
                name=f"Customer {i+1}",
                phone=f"+98912345678{i}"
            )
            db_session.add(customer)
            customers.append(customer)
        
        db_session.commit()
        
        customer_ids = [str(c.id) for c in customers]
        message = "پیام تبلیغاتی تست"
        
        notifications = notification_service.send_bulk_sms(
            tenant_id=str(tenant.id),
            customer_ids=customer_ids,
            message=message,
            campaign_name="Test Campaign"
        )
        
        assert len(notifications) == 3
        for notification in notifications:
            assert notification.notification_type == NotificationType.SMS
            assert notification.body == message
            assert notification.reference_type == "campaign"
    
    def test_mark_notification_sent(self, notification_service, db_session, tenant):
        """Test marking notification as sent"""
        # Create notification log
        notification = NotificationLog(
            tenant_id=tenant.id,
            notification_type=NotificationType.EMAIL,
            recipient_email="test@example.com",
            body="Test message",
            status=NotificationStatus.PENDING
        )
        db_session.add(notification)
        db_session.commit()
        
        # Mark as sent
        success = notification_service.mark_notification_sent(
            notification_id=str(notification.id),
            provider_message_id="msg_123"
        )
        
        assert success is True
        db_session.refresh(notification)
        assert notification.status == NotificationStatus.SENT
        assert notification.provider_message_id == "msg_123"
        assert notification.sent_at is not None
    
    def test_mark_notification_failed(self, notification_service, db_session, tenant):
        """Test marking notification as failed"""
        # Create notification log
        notification = NotificationLog(
            tenant_id=tenant.id,
            notification_type=NotificationType.SMS,
            recipient_phone="+989123456789",
            body="Test message",
            status=NotificationStatus.PENDING
        )
        db_session.add(notification)
        db_session.commit()
        
        # Mark as failed
        error_message = "SMS gateway error"
        success = notification_service.mark_notification_failed(
            notification_id=str(notification.id),
            error_message=error_message
        )
        
        assert success is True
        db_session.refresh(notification)
        assert notification.status == NotificationStatus.FAILED
        assert notification.error_message == error_message
        assert notification.retry_count == 1


class TestEmailService:
    """Test email service functionality"""
    
    @patch('smtplib.SMTP')
    def test_send_email_success(self, mock_smtp):
        """Test successful email sending"""
        # Mock SMTP server
        mock_server = Mock()
        mock_smtp.return_value.__enter__.return_value = mock_server
        
        result = EmailService.send_email(
            recipient="test@example.com",
            subject="Test Subject",
            body="Test body"
        )
        
        assert result["status"] == "success"
        assert result["recipient"] == "test@example.com"
        mock_server.starttls.assert_called_once()
        mock_server.send_message.assert_called_once()
    
    @patch('smtplib.SMTP')
    def test_send_email_failure(self, mock_smtp):
        """Test email sending failure"""
        # Mock SMTP server to raise exception
        mock_smtp.side_effect = Exception("SMTP connection failed")
        
        result = EmailService.send_email(
            recipient="test@example.com",
            subject="Test Subject",
            body="Test body"
        )
        
        assert result["status"] == "error"
        assert "SMTP connection failed" in result["error"]
    
    def test_send_email_mock_mode(self):
        """Test email sending in mock mode (no SMTP config)"""
        with patch('app.core.config.settings') as mock_settings:
            mock_settings.email_smtp_host = None
            
            result = EmailService.send_email(
                recipient="test@example.com",
                subject="Test Subject",
                body="Test body"
            )
            
            assert result["status"] == "success"
            assert result["mock"] is True


class TestSMSService:
    """Test SMS service functionality"""
    
    @patch('requests.post')
    def test_send_sms_success(self, mock_post):
        """Test successful SMS sending"""
        # Mock successful API response
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"message_id": "sms_123"}
        mock_post.return_value = mock_response
        
        with patch('app.core.config.settings') as mock_settings:
            mock_settings.sms_api_key = "test_key"
            mock_settings.sms_api_url = "https://api.sms.com/send"
            
            result = SMSService.send_sms(
                phone_number="+989123456789",
                message="Test message"
            )
            
            assert result["status"] == "success"
            assert result["provider_id"] == "sms_123"
            mock_post.assert_called_once()
    
    @patch('requests.post')
    def test_send_sms_failure(self, mock_post):
        """Test SMS sending failure"""
        # Mock failed API response
        mock_response = Mock()
        mock_response.status_code = 400
        mock_response.text = "Invalid phone number"
        mock_post.return_value = mock_response
        
        with patch('app.core.config.settings') as mock_settings:
            mock_settings.sms_api_key = "test_key"
            mock_settings.sms_api_url = "https://api.sms.com/send"
            
            result = SMSService.send_sms(
                phone_number="invalid",
                message="Test message"
            )
            
            assert result["status"] == "error"
            assert "400" in result["error"]
    
    def test_send_sms_mock_mode(self):
        """Test SMS sending in mock mode (no API config)"""
        with patch('app.core.config.settings') as mock_settings:
            mock_settings.sms_api_key = None
            
            result = SMSService.send_sms(
                phone_number="+989123456789",
                message="Test message"
            )
            
            assert result["status"] == "success"
            assert result["mock"] is True


class TestNotificationTasks:
    """Test notification Celery tasks"""
    
    @pytest.fixture
    def mock_db_session(self):
        """Mock database session"""
        with patch('app.tasks.notification_tasks.SessionLocal') as mock_session_local:
            mock_db = Mock()
            mock_session_local.return_value = mock_db
            yield mock_db
    
    @patch('app.tasks.notification_tasks.EmailService.send_email')
    def test_send_email_task_with_notification_id(self, mock_send_email, mock_db_session):
        """Test send_email task with notification ID"""
        # Mock notification log
        mock_notification = Mock()
        mock_notification.id = uuid4()
        mock_notification.recipient_email = "test@example.com"
        mock_notification.subject = "Test Subject"
        mock_notification.body = "Test body"
        
        mock_db_session.query.return_value.filter.return_value.first.return_value = mock_notification
        mock_send_email.return_value = {"status": "success", "provider_id": "email_123"}
        
        # Mock notification service
        with patch('app.tasks.notification_tasks.NotificationService') as mock_service_class:
            mock_service = Mock()
            mock_service_class.return_value = mock_service
            
            result = send_email(notification_id=str(mock_notification.id))
            
            assert result["status"] == "success"
            mock_send_email.assert_called_once()
            mock_service.mark_notification_sent.assert_called_once()
    
    @patch('app.tasks.notification_tasks.SMSService.send_sms')
    def test_send_sms_task_with_notification_id(self, mock_send_sms, mock_db_session):
        """Test send_sms task with notification ID"""
        # Mock notification log
        mock_notification = Mock()
        mock_notification.id = uuid4()
        mock_notification.recipient_phone = "+989123456789"
        mock_notification.body = "Test message"
        
        mock_db_session.query.return_value.filter.return_value.first.return_value = mock_notification
        mock_send_sms.return_value = {"status": "success", "provider_id": "sms_123"}
        
        # Mock notification service
        with patch('app.tasks.notification_tasks.NotificationService') as mock_service_class:
            mock_service = Mock()
            mock_service_class.return_value = mock_service
            
            result = send_sms(notification_id=str(mock_notification.id))
            
            assert result["status"] == "success"
            mock_send_sms.assert_called_once()
            mock_service.mark_notification_sent.assert_called_once()
    
    def test_send_invoice_notification_task(self, mock_db_session):
        """Test send_invoice_notification task"""
        invoice_id = str(uuid4())
        
        # Mock notification service
        with patch('app.tasks.notification_tasks.NotificationService') as mock_service_class:
            mock_service = Mock()
            mock_notification = Mock()
            mock_notification.id = uuid4()
            mock_service.send_invoice_notification.return_value = mock_notification
            mock_service_class.return_value = mock_service
            
            # Mock send_email task
            with patch('app.tasks.notification_tasks.send_email') as mock_send_email:
                mock_send_email.delay.return_value = Mock()
                
                result = send_invoice_notification(
                    invoice_id=invoice_id,
                    notification_type="email"
                )
                
                assert result["status"] == "success"
                mock_service.send_invoice_notification.assert_called_once()
                mock_send_email.delay.assert_called_once()
    
    def test_send_installment_reminders_task(self, mock_db_session):
        """Test send_installment_reminders task"""
        # Mock installments
        mock_installments = [Mock(), Mock()]
        for i, installment in enumerate(mock_installments):
            installment.id = uuid4()
        
        # Mock notification service
        with patch('app.tasks.notification_tasks.NotificationService') as mock_service_class:
            mock_service = Mock()
            mock_service.get_due_installment_reminders.return_value = mock_installments
            mock_service.send_installment_reminder.return_value = Mock(id=uuid4())
            mock_service_class.return_value = mock_service
            
            # Mock database query for recent reminders
            mock_db_session.query.return_value.filter.return_value.first.return_value = None
            
            # Mock send_sms task
            with patch('app.tasks.notification_tasks.send_sms') as mock_send_sms:
                mock_send_sms.delay.return_value = Mock()
                
                result = send_installment_reminders(days_ahead=3)
                
                assert result["status"] == "success"
                assert result["reminders_sent"] == 2
                assert mock_send_sms.delay.call_count == 2
    
    def test_send_overdue_notices_task(self, mock_db_session):
        """Test send_overdue_notices task"""
        # Mock overdue installments
        mock_installments = [Mock(), Mock()]
        for i, installment in enumerate(mock_installments):
            installment.id = uuid4()
            installment.days_overdue = 3  # Trigger notice
        
        # Mock notification service
        with patch('app.tasks.notification_tasks.NotificationService') as mock_service_class:
            mock_service = Mock()
            mock_service.get_overdue_installments.return_value = mock_installments
            mock_service.send_overdue_notice.return_value = Mock(id=uuid4())
            mock_service_class.return_value = mock_service
            
            # Mock database query for recent notices
            mock_db_session.query.return_value.filter.return_value.first.return_value = None
            
            # Mock send_sms task
            with patch('app.tasks.notification_tasks.send_sms') as mock_send_sms:
                mock_send_sms.delay.return_value = Mock()
                
                result = send_overdue_notices()
                
                assert result["status"] == "success"
                assert result["notices_sent"] == 2
    
    def test_process_notification_queue_task(self, mock_db_session):
        """Test process_notification_queue task"""
        # Mock pending notifications
        mock_notifications = [Mock(), Mock()]
        for i, notification in enumerate(mock_notifications):
            notification.id = uuid4()
            notification.notification_type = NotificationType.EMAIL if i == 0 else NotificationType.SMS
        
        # Mock notification service
        with patch('app.tasks.notification_tasks.NotificationService') as mock_service_class:
            mock_service = Mock()
            mock_service.get_pending_notifications.return_value = mock_notifications
            mock_service_class.return_value = mock_service
            
            # Mock task delays
            with patch('app.tasks.notification_tasks.send_email') as mock_send_email, \
                 patch('app.tasks.notification_tasks.send_sms') as mock_send_sms:
                
                mock_send_email.delay.return_value = Mock()
                mock_send_sms.delay.return_value = Mock()
                
                result = process_notification_queue(batch_size=50)
                
                assert result["status"] == "success"
                assert result["processed"] == 2
                mock_send_email.delay.assert_called_once()
                mock_send_sms.delay.assert_called_once()
    
    def test_send_bulk_sms_campaign_task(self, mock_db_session):
        """Test send_bulk_sms_campaign task"""
        tenant_id = str(uuid4())
        customer_ids = [str(uuid4()), str(uuid4())]
        message = "Bulk SMS test"
        campaign_name = "Test Campaign"
        
        # Mock notifications
        mock_notifications = [Mock(), Mock()]
        for notification in mock_notifications:
            notification.id = uuid4()
        
        # Mock notification service
        with patch('app.tasks.notification_tasks.NotificationService') as mock_service_class:
            mock_service = Mock()
            mock_service.send_bulk_sms.return_value = mock_notifications
            mock_service_class.return_value = mock_service
            
            # Mock send_sms task
            with patch('app.tasks.notification_tasks.send_sms') as mock_send_sms:
                mock_send_sms.delay.return_value = Mock()
                
                result = send_bulk_sms_campaign(
                    tenant_id=tenant_id,
                    customer_ids=customer_ids,
                    message=message,
                    campaign_name=campaign_name
                )
                
                assert result["status"] == "success"
                assert result["notifications_created"] == 2
                assert mock_send_sms.delay.call_count == 2


class TestNotificationIntegration:
    """Integration tests for notification system"""
    
    @pytest.fixture
    def db_session(self):
        """Create test database session"""
        db = SessionLocal()
        yield db
        db.close()
    
    def test_complete_invoice_notification_flow(self, db_session):
        """Test complete flow from invoice creation to notification sending"""
        # Create test data
        tenant = Tenant(
            id=uuid4(),
            name="Test Business",
            domain=f"test-{uuid4().hex[:8]}.hesaabplus.com",
            email="test@business.com",
            subscription_type="PRO",
            is_active=True
        )
        db_session.add(tenant)
        
        customer = Customer(
            id=uuid4(),
            tenant_id=tenant.id,
            name="Test Customer",
            email="customer@example.com",
            phone="+989123456789"
        )
        db_session.add(customer)
        
        invoice = Invoice(
            id=uuid4(),
            tenant_id=tenant.id,
            customer_id=customer.id,
            invoice_number="INV-TEST-001",
            invoice_type=InvoiceType.GENERAL,
            total_amount=Decimal("1500.00"),
            status=InvoiceStatus.SENT
        )
        db_session.add(invoice)
        db_session.commit()
        
        # Create notification service
        notification_service = NotificationService(db_session)
        
        # Send invoice notification
        notification = notification_service.send_invoice_notification(
            invoice_id=str(invoice.id),
            notification_type=NotificationType.EMAIL
        )
        
        # Verify notification was created
        assert notification is not None
        assert notification.tenant_id == tenant.id
        assert notification.customer_id == customer.id
        assert notification.recipient_email == customer.email
        assert "INV-TEST-001" in notification.body
        
        # Verify notification is in queue
        queue_item = db_session.query(NotificationQueue).filter(
            NotificationQueue.notification_log_id == notification.id
        ).first()
        
        assert queue_item is not None
        assert queue_item.priority == 5  # Default priority
    
    def test_installment_reminder_automation(self, db_session):
        """Test automated installment reminder system"""
        # Create test data
        tenant = Tenant(
            id=uuid4(),
            name="Test Business",
            domain=f"test-{uuid4().hex[:8]}.hesaabplus.com",
            email="test@business.com",
            subscription_type="PRO",
            is_active=True
        )
        db_session.add(tenant)
        
        customer = Customer(
            id=uuid4(),
            tenant_id=tenant.id,
            name="Test Customer",
            phone="+989123456789"
        )
        db_session.add(customer)
        
        invoice = Invoice(
            id=uuid4(),
            tenant_id=tenant.id,
            customer_id=customer.id,
            invoice_number="INV-INSTALL-001",
            invoice_type=InvoiceType.GENERAL,
            total_amount=Decimal("2000.00"),
            is_installment=True
        )
        db_session.add(invoice)
        
        # Create installment due in 2 days
        installment = Installment(
            id=uuid4(),
            invoice_id=invoice.id,
            installment_number=1,
            installment_type=InstallmentType.GENERAL,
            amount_due=Decimal("1000.00"),
            due_date=datetime.utcnow() + timedelta(days=2),
            status=InstallmentStatus.PENDING
        )
        db_session.add(installment)
        db_session.commit()
        
        # Create notification service
        notification_service = NotificationService(db_session)
        
        # Get installments that need reminders (3 days ahead)
        due_installments = notification_service.get_due_installment_reminders(days_ahead=3)
        
        # Should include our installment
        assert len(due_installments) >= 1
        assert installment in due_installments
        
        # Send reminder
        notification = notification_service.send_installment_reminder(
            installment_id=str(installment.id),
            days_before_due=2,
            notification_type=NotificationType.SMS
        )
        
        # Verify reminder was created
        assert notification is not None
        assert notification.notification_type == NotificationType.SMS
        assert notification.recipient_phone == customer.phone
        assert "قسط" in notification.body
        assert "2 روز" in notification.body


if __name__ == "__main__":
    pytest.main([__file__, "-v"])