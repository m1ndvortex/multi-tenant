"""
Comprehensive Integration Tests for Notifications API
Tests notification system, marketing campaigns, and real-time notifications with real database
"""

import pytest
from fastapi.testclient import TestClient
from decimal import Decimal
import uuid
from datetime import datetime, date, timedelta

from app.main import app
from app.models.tenant import Tenant, TenantStatus, SubscriptionType
from app.models.user import User, UserRole, UserStatus
from app.models.customer import Customer, CustomerStatus, CustomerType
from app.models.invoice import Invoice, InvoiceType, InvoiceStatus
from app.core.auth import get_password_hash


class TestNotificationsAPIComprehensive:
    """Comprehensive integration tests for Notifications API"""
    
    @pytest.fixture
    def client(self):
        """Create test client"""
        return TestClient(app)
    
    @pytest.fixture
    def setup_notifications_test_data(self, db_session):
        """Setup test data for notifications tests"""
        # Create tenant
        tenant = Tenant(
            name="Notifications Test Business",
            domain="notifications-test.example.com",
            email="notifications@test.com",
            subscription_type=SubscriptionType.PRO,
            status=TenantStatus.ACTIVE,
            max_users=10,
            max_products=100,
            max_customers=100,
            max_monthly_invoices=500
        )
        db_session.add(tenant)
        db_session.commit()
        
        # Create users
        admin_user = User(
            tenant_id=tenant.id,
            email="admin@notifications.test",
            password_hash=get_password_hash("admin123"),
            first_name="Admin",
            last_name="User",
            role=UserRole.ADMIN,
            status=UserStatus.ACTIVE
        )
        
        regular_user = User(
            tenant_id=tenant.id,
            email="user@notifications.test",
            password_hash=get_password_hash("user123"),
            first_name="Regular",
            last_name="User",
            role=UserRole.USER,
            status=UserStatus.ACTIVE
        )
        
        db_session.add_all([admin_user, regular_user])
        db_session.commit()
        
        # Create customers for notification testing
        customers = []
        customer_data = [
            {"name": "VIP Customer", "email": "vip@customer.test", "phone": "+1234567890"},
            {"name": "Regular Customer", "email": "regular@customer.test", "phone": "+1234567891"},
            {"name": "New Customer", "email": "new@customer.test", "phone": "+1234567892"},
            {"name": "Overdue Customer", "email": "overdue@customer.test", "phone": "+1234567893"}
        ]
        
        for i, cust_data in enumerate(customer_data):
            customer = Customer(
                tenant_id=tenant.id,
                name=cust_data["name"],
                email=cust_data["email"],
                phone=cust_data["phone"],
                customer_type=CustomerType.INDIVIDUAL,
                status=CustomerStatus.ACTIVE,
                credit_limit=Decimal('50000'),
                tags=["notifications", "test"]
            )
            customers.append(customer)
        
        db_session.add_all(customers)
        db_session.commit()
        
        return {
            'tenant': tenant,
            'admin_user': admin_user,
            'regular_user': regular_user,
            'customers': customers
        }
    
    @pytest.fixture
    def admin_auth_headers(self, client, setup_notifications_test_data):
        """Get admin authentication headers"""
        data = setup_notifications_test_data
        
        login_data = {
            "email": data['admin_user'].email,
            "password": "admin123"
        }
        
        response = client.post("/api/auth/login", json=login_data)
        assert response.status_code == 200
        
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    @pytest.fixture
    def user_auth_headers(self, client, setup_notifications_test_data):
        """Get regular user authentication headers"""
        data = setup_notifications_test_data
        
        login_data = {
            "email": data['regular_user'].email,
            "password": "user123"
        }
        
        response = client.post("/api/auth/login", json=login_data)
        assert response.status_code == 200
        
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}

    # ==================== NOTIFICATION SETTINGS TESTS ====================
    
    def test_get_notification_settings(self, client, admin_auth_headers):
        """Test getting notification settings"""
        response = client.get(
            "/api/notifications/settings",
            headers=admin_auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        # Check default notification settings structure
        assert "email_notifications" in result
        assert "sms_notifications" in result
        assert "push_notifications" in result
        assert "notification_types" in result
        
        # Check notification types
        notification_types = result["notification_types"]
        expected_types = [
            "invoice_overdue",
            "payment_received",
            "low_stock",
            "new_customer",
            "system_alerts"
        ]
        
        for notification_type in expected_types:
            assert notification_type in notification_types
    
    def test_update_notification_settings(self, client, admin_auth_headers):
        """Test updating notification settings"""
        settings_data = {
            "email_notifications": {
                "enabled": True,
                "invoice_overdue": True,
                "payment_received": True,
                "low_stock": False,
                "new_customer": True,
                "system_alerts": True
            },
            "sms_notifications": {
                "enabled": True,
                "invoice_overdue": True,
                "payment_received": False,
                "low_stock": True,
                "new_customer": False,
                "system_alerts": True
            },
            "push_notifications": {
                "enabled": False
            },
            "quiet_hours": {
                "enabled": True,
                "start_time": "22:00",
                "end_time": "08:00"
            }
        }
        
        response = client.put(
            "/api/notifications/settings",
            json=settings_data,
            headers=admin_auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        assert result["email_notifications"]["enabled"] is True
        assert result["sms_notifications"]["enabled"] is True
        assert result["push_notifications"]["enabled"] is False
        assert result["quiet_hours"]["enabled"] is True
    
    def test_notification_settings_validation(self, client, admin_auth_headers):
        """Test notification settings validation"""
        # Test invalid time format
        invalid_settings = {
            "quiet_hours": {
                "enabled": True,
                "start_time": "25:00",  # Invalid time
                "end_time": "08:00"
            }
        }
        
        response = client.put(
            "/api/notifications/settings",
            json=invalid_settings,
            headers=admin_auth_headers
        )
        
        assert response.status_code == 400
        assert "invalid" in response.json()["detail"].lower()

    # ==================== NOTIFICATION HISTORY TESTS ====================
    
    def test_get_notification_history(self, client, admin_auth_headers):
        """Test getting notification history"""
        response = client.get(
            "/api/notifications/history",
            headers=admin_auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        assert "notifications" in result
        assert "total" in result
        assert "page" in result
        assert "per_page" in result
        
        # Check notification structure if any exist
        if result["notifications"]:
            for notification in result["notifications"]:
                assert "id" in notification
                assert "type" in notification
                assert "title" in notification
                assert "message" in notification
                assert "status" in notification
                assert "created_at" in notification
    
    def test_get_notification_history_with_filters(self, client, admin_auth_headers):
        """Test getting notification history with filters"""
        response = client.get(
            "/api/notifications/history?type=invoice_overdue&status=sent&page=1&per_page=10",
            headers=admin_auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        assert result["page"] == 1
        assert result["per_page"] == 10
        
        # All notifications should match the filter
        for notification in result["notifications"]:
            if "type" in notification:
                assert notification["type"] == "invoice_overdue"
            if "status" in notification:
                assert notification["status"] == "sent"
    
    def test_get_notification_by_id(self, client, admin_auth_headers):
        """Test getting specific notification by ID"""
        # First get notification history to find a notification ID
        history_response = client.get(
            "/api/notifications/history",
            headers=admin_auth_headers
        )
        assert history_response.status_code == 200
        history = history_response.json()
        
        if history["notifications"]:
            notification_id = history["notifications"][0]["id"]
            
            response = client.get(
                f"/api/notifications/{notification_id}",
                headers=admin_auth_headers
            )
            
            assert response.status_code == 200
            result = response.json()
            
            assert result["id"] == notification_id
            assert "type" in result
            assert "title" in result
            assert "message" in result
    
    def test_mark_notification_as_read(self, client, admin_auth_headers):
        """Test marking notification as read"""
        # This would typically require creating a notification first
        # For now, we'll test the endpoint structure
        notification_id = str(uuid.uuid4())
        
        response = client.patch(
            f"/api/notifications/{notification_id}/read",
            headers=admin_auth_headers
        )
        
        # Should return 404 for non-existent notification
        assert response.status_code == 404

    # ==================== MANUAL NOTIFICATIONS TESTS ====================
    
    def test_send_manual_notification_email(self, client, admin_auth_headers, setup_notifications_test_data):
        """Test sending manual email notification"""
        data = setup_notifications_test_data
        customer = data['customers'][0]
        
        notification_data = {
            "type": "email",
            "recipients": [customer.email],
            "subject": "Test Manual Notification",
            "message": "This is a test manual notification sent via API",
            "send_immediately": True
        }
        
        response = client.post(
            "/api/notifications/send",
            json=notification_data,
            headers=admin_auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        assert result["type"] == "email"
        assert result["status"] == "sent" or result["status"] == "queued"
        assert result["recipient_count"] == 1
        assert "notification_id" in result
    
    def test_send_manual_notification_sms(self, client, admin_auth_headers, setup_notifications_test_data):
        """Test sending manual SMS notification"""
        data = setup_notifications_test_data
        customer = data['customers'][0]
        
        notification_data = {
            "type": "sms",
            "recipients": [customer.phone],
            "message": "Test SMS notification from HesaabPlus API",
            "send_immediately": True
        }
        
        response = client.post(
            "/api/notifications/send",
            json=notification_data,
            headers=admin_auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        assert result["type"] == "sms"
        assert result["status"] in ["sent", "queued", "failed"]  # SMS might fail in test environment
        assert result["recipient_count"] == 1
    
    def test_send_bulk_notification(self, client, admin_auth_headers, setup_notifications_test_data):
        """Test sending bulk notification to multiple recipients"""
        data = setup_notifications_test_data
        customers = data['customers']
        
        recipient_emails = [customer.email for customer in customers[:3]]
        
        notification_data = {
            "type": "email",
            "recipients": recipient_emails,
            "subject": "Bulk Test Notification",
            "message": "This is a bulk notification sent to multiple customers",
            "send_immediately": False,  # Queue for later sending
            "scheduled_time": (datetime.utcnow() + timedelta(minutes=5)).isoformat()
        }
        
        response = client.post(
            "/api/notifications/send",
            json=notification_data,
            headers=admin_auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        assert result["type"] == "email"
        assert result["status"] == "scheduled"
        assert result["recipient_count"] == 3
        assert "scheduled_time" in result
    
    def test_send_notification_with_template(self, client, admin_auth_headers, setup_notifications_test_data):
        """Test sending notification using a template"""
        data = setup_notifications_test_data
        customer = data['customers'][0]
        
        notification_data = {
            "type": "email",
            "recipients": [customer.email],
            "template": "payment_reminder",
            "template_data": {
                "customer_name": customer.name,
                "amount_due": "5000.00",
                "due_date": "2024-03-01",
                "invoice_number": "INV-001"
            },
            "send_immediately": True
        }
        
        response = client.post(
            "/api/notifications/send",
            json=notification_data,
            headers=admin_auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        assert result["type"] == "email"
        assert result["template"] == "payment_reminder"
        assert result["recipient_count"] == 1

    # ==================== MARKETING CAMPAIGNS TESTS ====================
    
    def test_create_marketing_campaign(self, client, admin_auth_headers, setup_notifications_test_data):
        """Test creating a marketing campaign"""
        data = setup_notifications_test_data
        
        campaign_data = {
            "name": "Spring Sale Campaign",
            "description": "Promote spring sale to all customers",
            "type": "email",
            "target_audience": {
                "customer_types": ["individual", "business"],
                "tags": ["notifications", "test"],
                "min_purchase_amount": "1000.00"
            },
            "content": {
                "subject": "Spring Sale - 20% Off All Items!",
                "message": "Don't miss our amazing spring sale with 20% off all items. Limited time offer!",
                "template": "marketing_email"
            },
            "schedule": {
                "send_immediately": False,
                "scheduled_time": (datetime.utcnow() + timedelta(hours=2)).isoformat()
            }
        }
        
        response = client.post(
            "/api/notifications/campaigns",
            json=campaign_data,
            headers=admin_auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        assert result["name"] == "Spring Sale Campaign"
        assert result["type"] == "email"
        assert result["status"] == "scheduled"
        assert "campaign_id" in result
        assert "estimated_recipients" in result
    
    def test_list_marketing_campaigns(self, client, admin_auth_headers):
        """Test listing marketing campaigns"""
        response = client.get(
            "/api/notifications/campaigns",
            headers=admin_auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        assert "campaigns" in result
        assert "total" in result
        assert "page" in result
        
        # Check campaign structure if any exist
        if result["campaigns"]:
            for campaign in result["campaigns"]:
                assert "campaign_id" in campaign
                assert "name" in campaign
                assert "type" in campaign
                assert "status" in campaign
                assert "created_at" in campaign
    
    def test_get_campaign_by_id(self, client, admin_auth_headers):
        """Test getting campaign by ID"""
        # First create a campaign
        campaign_data = {
            "name": "Test Campaign",
            "description": "Test campaign for API testing",
            "type": "email",
            "target_audience": {
                "customer_types": ["individual"]
            },
            "content": {
                "subject": "Test Subject",
                "message": "Test message"
            },
            "schedule": {
                "send_immediately": False,
                "scheduled_time": (datetime.utcnow() + timedelta(hours=1)).isoformat()
            }
        }
        
        create_response = client.post(
            "/api/notifications/campaigns",
            json=campaign_data,
            headers=admin_auth_headers
        )
        assert create_response.status_code == 200
        created_campaign = create_response.json()
        
        # Get campaign by ID
        response = client.get(
            f"/api/notifications/campaigns/{created_campaign['campaign_id']}",
            headers=admin_auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        assert result["campaign_id"] == created_campaign["campaign_id"]
        assert result["name"] == "Test Campaign"
        assert result["type"] == "email"
    
    def test_update_campaign(self, client, admin_auth_headers):
        """Test updating a marketing campaign"""
        # First create a campaign
        campaign_data = {
            "name": "Original Campaign",
            "type": "email",
            "target_audience": {"customer_types": ["individual"]},
            "content": {"subject": "Original Subject", "message": "Original message"},
            "schedule": {"send_immediately": False, "scheduled_time": (datetime.utcnow() + timedelta(hours=1)).isoformat()}
        }
        
        create_response = client.post(
            "/api/notifications/campaigns",
            json=campaign_data,
            headers=admin_auth_headers
        )
        assert create_response.status_code == 200
        created_campaign = create_response.json()
        
        # Update campaign
        update_data = {
            "name": "Updated Campaign",
            "description": "Updated description",
            "content": {
                "subject": "Updated Subject",
                "message": "Updated message content"
            }
        }
        
        response = client.put(
            f"/api/notifications/campaigns/{created_campaign['campaign_id']}",
            json=update_data,
            headers=admin_auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        assert result["name"] == "Updated Campaign"
        assert result["description"] == "Updated description"
        assert result["content"]["subject"] == "Updated Subject"
    
    def test_send_campaign_immediately(self, client, admin_auth_headers, setup_notifications_test_data):
        """Test sending a campaign immediately"""
        # Create a campaign
        campaign_data = {
            "name": "Immediate Campaign",
            "type": "email",
            "target_audience": {"customer_types": ["individual"]},
            "content": {"subject": "Immediate Test", "message": "This campaign is sent immediately"},
            "schedule": {"send_immediately": False}
        }
        
        create_response = client.post(
            "/api/notifications/campaigns",
            json=campaign_data,
            headers=admin_auth_headers
        )
        assert create_response.status_code == 200
        created_campaign = create_response.json()
        
        # Send campaign immediately
        response = client.post(
            f"/api/notifications/campaigns/{created_campaign['campaign_id']}/send",
            headers=admin_auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        assert result["status"] == "sent" or result["status"] == "sending"
        assert "sent_count" in result
        assert "failed_count" in result
    
    def test_cancel_campaign(self, client, admin_auth_headers):
        """Test cancelling a scheduled campaign"""
        # Create a scheduled campaign
        campaign_data = {
            "name": "Campaign to Cancel",
            "type": "email",
            "target_audience": {"customer_types": ["individual"]},
            "content": {"subject": "Cancel Test", "message": "This campaign will be cancelled"},
            "schedule": {"send_immediately": False, "scheduled_time": (datetime.utcnow() + timedelta(hours=2)).isoformat()}
        }
        
        create_response = client.post(
            "/api/notifications/campaigns",
            json=campaign_data,
            headers=admin_auth_headers
        )
        assert create_response.status_code == 200
        created_campaign = create_response.json()
        
        # Cancel campaign
        response = client.post(
            f"/api/notifications/campaigns/{created_campaign['campaign_id']}/cancel",
            headers=admin_auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        assert result["status"] == "cancelled"
        assert "cancelled_at" in result

    # ==================== NOTIFICATION TEMPLATES TESTS ====================
    
    def test_get_notification_templates(self, client, admin_auth_headers):
        """Test getting available notification templates"""
        response = client.get(
            "/api/notifications/templates",
            headers=admin_auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        assert "templates" in result
        
        # Check for common templates
        template_names = [template["name"] for template in result["templates"]]
        expected_templates = [
            "payment_reminder",
            "invoice_overdue",
            "welcome_customer",
            "marketing_email"
        ]
        
        for expected_template in expected_templates:
            assert expected_template in template_names
    
    def test_get_template_by_name(self, client, admin_auth_headers):
        """Test getting specific template by name"""
        response = client.get(
            "/api/notifications/templates/payment_reminder",
            headers=admin_auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        assert result["name"] == "payment_reminder"
        assert "subject_template" in result
        assert "body_template" in result
        assert "variables" in result
    
    def test_create_custom_template(self, client, admin_auth_headers):
        """Test creating a custom notification template"""
        template_data = {
            "name": "custom_promotion",
            "description": "Custom promotion template",
            "type": "email",
            "subject_template": "Special Offer for {{customer_name}}!",
            "body_template": "Dear {{customer_name}}, we have a special {{discount}}% discount just for you! Valid until {{expiry_date}}.",
            "variables": [
                {"name": "customer_name", "type": "string", "required": True},
                {"name": "discount", "type": "number", "required": True},
                {"name": "expiry_date", "type": "date", "required": True}
            ]
        }
        
        response = client.post(
            "/api/notifications/templates",
            json=template_data,
            headers=admin_auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        assert result["name"] == "custom_promotion"
        assert result["type"] == "email"
        assert len(result["variables"]) == 3
    
    def test_update_template(self, client, admin_auth_headers):
        """Test updating a notification template"""
        # First create a template
        template_data = {
            "name": "test_template",
            "type": "email",
            "subject_template": "Original Subject",
            "body_template": "Original body",
            "variables": []
        }
        
        create_response = client.post(
            "/api/notifications/templates",
            json=template_data,
            headers=admin_auth_headers
        )
        assert create_response.status_code == 200
        
        # Update template
        update_data = {
            "subject_template": "Updated Subject for {{customer_name}}",
            "body_template": "Updated body with {{customer_name}} and {{amount}}",
            "variables": [
                {"name": "customer_name", "type": "string", "required": True},
                {"name": "amount", "type": "number", "required": False}
            ]
        }
        
        response = client.put(
            "/api/notifications/templates/test_template",
            json=update_data,
            headers=admin_auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        assert "{{customer_name}}" in result["subject_template"]
        assert len(result["variables"]) == 2

    # ==================== REAL-TIME NOTIFICATIONS TESTS ====================
    
    def test_get_unread_notifications(self, client, admin_auth_headers):
        """Test getting unread notifications"""
        response = client.get(
            "/api/notifications/unread",
            headers=admin_auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        assert "notifications" in result
        assert "count" in result
        
        # All notifications should be unread
        for notification in result["notifications"]:
            assert notification["is_read"] is False
    
    def test_mark_all_notifications_as_read(self, client, admin_auth_headers):
        """Test marking all notifications as read"""
        response = client.post(
            "/api/notifications/mark-all-read",
            headers=admin_auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        assert "marked_count" in result
        assert result["status"] == "success"

    # ==================== NOTIFICATION ANALYTICS TESTS ====================
    
    def test_notification_analytics(self, client, admin_auth_headers):
        """Test notification analytics and statistics"""
        response = client.get(
            "/api/notifications/analytics?start_date=2024-01-01&end_date=2024-12-31",
            headers=admin_auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        assert "total_sent" in result
        assert "total_delivered" in result
        assert "total_failed" in result
        assert "delivery_rate" in result
        assert "by_type" in result
        assert "by_status" in result
    
    def test_campaign_analytics(self, client, admin_auth_headers):
        """Test marketing campaign analytics"""
        response = client.get(
            "/api/notifications/campaigns/analytics",
            headers=admin_auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        assert "total_campaigns" in result
        assert "active_campaigns" in result
        assert "completed_campaigns" in result
        assert "average_open_rate" in result
        assert "average_click_rate" in result

    # ==================== ERROR HANDLING AND VALIDATION ====================
    
    def test_invalid_notification_data(self, client, admin_auth_headers):
        """Test sending notification with invalid data"""
        # Missing required fields
        invalid_data = {
            "type": "email",
            # Missing recipients, subject, and message
        }
        
        response = client.post(
            "/api/notifications/send",
            json=invalid_data,
            headers=admin_auth_headers
        )
        
        assert response.status_code == 400
        assert "required" in response.json()["detail"].lower()
    
    def test_invalid_campaign_data(self, client, admin_auth_headers):
        """Test creating campaign with invalid data"""
        invalid_campaign = {
            "name": "",  # Empty name
            "type": "invalid_type",  # Invalid type
            "target_audience": {},  # Empty audience
            "content": {}  # Empty content
        }
        
        response = client.post(
            "/api/notifications/campaigns",
            json=invalid_campaign,
            headers=admin_auth_headers
        )
        
        assert response.status_code == 400
    
    def test_notification_permissions(self, client, user_auth_headers, admin_auth_headers):
        """Test notification permissions for different user roles"""
        # Regular users should be able to view notifications
        response = client.get(
            "/api/notifications/history",
            headers=user_auth_headers
        )
        assert response.status_code == 200
        
        # But might not be able to create campaigns (depending on permissions)
        campaign_data = {
            "name": "Test Campaign",
            "type": "email",
            "target_audience": {"customer_types": ["individual"]},
            "content": {"subject": "Test", "message": "Test"},
            "schedule": {"send_immediately": True}
        }
        
        user_response = client.post(
            "/api/notifications/campaigns",
            json=campaign_data,
            headers=user_auth_headers
        )
        
        admin_response = client.post(
            "/api/notifications/campaigns",
            json=campaign_data,
            headers=admin_auth_headers
        )
        
        # Admin should definitely be able to create campaigns
        assert admin_response.status_code == 200
    
    def test_nonexistent_resources(self, client, admin_auth_headers):
        """Test accessing non-existent notification resources"""
        non_existent_id = str(uuid.uuid4())
        
        # Non-existent notification
        response = client.get(
            f"/api/notifications/{non_existent_id}",
            headers=admin_auth_headers
        )
        assert response.status_code == 404
        
        # Non-existent campaign
        response = client.get(
            f"/api/notifications/campaigns/{non_existent_id}",
            headers=admin_auth_headers
        )
        assert response.status_code == 404
        
        # Non-existent template
        response = client.get(
            "/api/notifications/templates/nonexistent_template",
            headers=admin_auth_headers
        )
        assert response.status_code == 404