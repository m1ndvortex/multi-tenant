"""
Comprehensive tests for marketing and communication system
"""

import pytest
from datetime import datetime, timedelta
from uuid import uuid4
from unittest.mock import patch, MagicMock
from sqlalchemy.orm import Session

from app.models.marketing import (
    MarketingCampaign, CampaignRecipient, CustomerSegment, 
    SegmentCustomer, CommunicationPreference,
    CampaignStatus, CampaignType, SegmentationType
)
from app.models.customer import Customer, CustomerStatus, CustomerType
from app.models.tenant import Tenant
from app.services.marketing_service import MarketingService
from app.tasks.marketing_tasks import (
    process_marketing_campaign, send_bulk_sms, refresh_dynamic_segments,
    process_scheduled_campaigns, update_campaign_delivery_status
)


class TestMarketingCampaignManagement:
    """Test marketing campaign creation and management"""
    
    def test_create_email_campaign(self, db_session: Session, test_tenant: Tenant, test_customers: list):
        """Test creating an email marketing campaign"""
        marketing_service = MarketingService(db_session)
        
        # Create campaign
        campaign = marketing_service.create_campaign(
            tenant_id=str(test_tenant.id),
            name="Test Email Campaign",
            message="This is a test email campaign message.",
            campaign_type=CampaignType.EMAIL,
            subject="Test Email Subject",
            customer_filter={"customer_type": "INDIVIDUAL"},
            send_immediately=True
        )
        
        assert campaign is not None
        assert campaign.name == "Test Email Campaign"
        assert campaign.campaign_type == CampaignType.EMAIL
        assert campaign.subject == "Test Email Subject"
        assert campaign.status == CampaignStatus.DRAFT
        assert campaign.target_customer_count > 0
        
        # Verify recipients were created
        recipients = db_session.query(CampaignRecipient).filter(
            CampaignRecipient.campaign_id == campaign.id
        ).all()
        
        assert len(recipients) == campaign.target_customer_count
        for recipient in recipients:
            assert recipient.recipient_email is not None
            assert recipient.status == "pending"
    
    def test_create_sms_campaign(self, db_session: Session, test_tenant: Tenant, test_customers: list):
        """Test creating an SMS marketing campaign"""
        marketing_service = MarketingService(db_session)
        
        # Create campaign
        campaign = marketing_service.create_campaign(
            tenant_id=str(test_tenant.id),
            name="Test SMS Campaign",
            message="This is a test SMS campaign message.",
            campaign_type=CampaignType.SMS,
            customer_filter={"has_debt": True},
            send_immediately=True
        )
        
        assert campaign is not None
        assert campaign.name == "Test SMS Campaign"
        assert campaign.campaign_type == CampaignType.SMS
        assert campaign.subject is None  # SMS doesn't need subject
        assert campaign.status == CampaignStatus.DRAFT
        
        # Verify recipients have phone numbers
        recipients = db_session.query(CampaignRecipient).filter(
            CampaignRecipient.campaign_id == campaign.id
        ).all()
        
        for recipient in recipients:
            assert recipient.recipient_phone is not None
    
    def test_create_mixed_campaign(self, db_session: Session, test_tenant: Tenant, test_customers: list):
        """Test creating a mixed (email + SMS) campaign"""
        marketing_service = MarketingService(db_session)
        
        # Create campaign
        campaign = marketing_service.create_campaign(
            tenant_id=str(test_tenant.id),
            name="Test Mixed Campaign",
            message="This is a test mixed campaign message.",
            campaign_type=CampaignType.MIXED,
            subject="Test Mixed Subject",
            customer_filter={},  # All customers
            send_immediately=True
        )
        
        assert campaign is not None
        assert campaign.campaign_type == CampaignType.MIXED
        
        # Verify recipients have both email and phone
        recipients = db_session.query(CampaignRecipient).filter(
            CampaignRecipient.campaign_id == campaign.id
        ).all()
        
        for recipient in recipients:
            # Mixed campaigns should have at least one contact method
            assert recipient.recipient_email is not None or recipient.recipient_phone is not None
    
    def test_scheduled_campaign(self, db_session: Session, test_tenant: Tenant, test_customers: list):
        """Test creating a scheduled campaign"""
        marketing_service = MarketingService(db_session)
        
        future_time = datetime.utcnow() + timedelta(hours=2)
        
        # Create scheduled campaign
        campaign = marketing_service.create_campaign(
            tenant_id=str(test_tenant.id),
            name="Test Scheduled Campaign",
            message="This is a scheduled campaign.",
            campaign_type=CampaignType.EMAIL,
            subject="Scheduled Email",
            scheduled_at=future_time,
            send_immediately=False
        )
        
        assert campaign is not None
        assert campaign.scheduled_at == future_time
        assert campaign.send_immediately is False
        assert campaign.status == CampaignStatus.DRAFT
    
    def test_start_campaign(self, db_session: Session, test_tenant: Tenant, test_customers: list):
        """Test starting a marketing campaign"""
        marketing_service = MarketingService(db_session)
        
        # Create campaign
        campaign = marketing_service.create_campaign(
            tenant_id=str(test_tenant.id),
            name="Test Start Campaign",
            message="This campaign will be started.",
            campaign_type=CampaignType.SMS,
            send_immediately=True
        )
        
        # Start campaign
        success = marketing_service.start_campaign(
            tenant_id=str(test_tenant.id),
            campaign_id=str(campaign.id)
        )
        
        assert success is True
        
        # Refresh campaign from database
        db_session.refresh(campaign)
        assert campaign.status == CampaignStatus.RUNNING
        assert campaign.started_at is not None
    
    def test_cancel_campaign(self, db_session: Session, test_tenant: Tenant, test_customers: list):
        """Test cancelling a marketing campaign"""
        marketing_service = MarketingService(db_session)
        
        # Create campaign
        campaign = marketing_service.create_campaign(
            tenant_id=str(test_tenant.id),
            name="Test Cancel Campaign",
            message="This campaign will be cancelled.",
            campaign_type=CampaignType.EMAIL,
            subject="Cancel Test",
            send_immediately=True
        )
        
        # Cancel campaign
        success = marketing_service.cancel_campaign(
            tenant_id=str(test_tenant.id),
            campaign_id=str(campaign.id)
        )
        
        assert success is True
        
        # Refresh campaign from database
        db_session.refresh(campaign)
        assert campaign.status == CampaignStatus.CANCELLED
        assert campaign.completed_at is not None
    
    def test_campaign_statistics(self, db_session: Session, test_tenant: Tenant, test_customers: list):
        """Test getting campaign statistics"""
        marketing_service = MarketingService(db_session)
        
        # Create and start campaign
        campaign = marketing_service.create_campaign(
            tenant_id=str(test_tenant.id),
            name="Test Stats Campaign",
            message="Campaign for statistics testing.",
            campaign_type=CampaignType.SMS,
            send_immediately=True
        )
        
        marketing_service.start_campaign(
            tenant_id=str(test_tenant.id),
            campaign_id=str(campaign.id)
        )
        
        # Get statistics
        stats = marketing_service.get_campaign_stats(
            tenant_id=str(test_tenant.id),
            campaign_id=str(campaign.id)
        )
        
        assert stats is not None
        assert stats["campaign_id"] == str(campaign.id)
        assert stats["name"] == "Test Stats Campaign"
        assert stats["status"] == "running"
        assert stats["target_count"] > 0
        assert "recipient_breakdown" in stats


class TestCustomerSegmentation:
    """Test customer segmentation functionality"""
    
    def test_create_manual_segment(self, db_session: Session, test_tenant: Tenant):
        """Test creating a manual customer segment"""
        marketing_service = MarketingService(db_session)
        
        # Create segment
        segment = marketing_service.create_segment(
            tenant_id=str(test_tenant.id),
            name="VIP Customers",
            description="High-value customers",
            segmentation_type=SegmentationType.MANUAL
        )
        
        assert segment is not None
        assert segment.name == "VIP Customers"
        assert segment.segmentation_type == SegmentationType.MANUAL
        assert segment.customer_count == 0
    
    def test_create_automatic_segment(self, db_session: Session, test_tenant: Tenant, test_customers: list):
        """Test creating an automatic customer segment"""
        marketing_service = MarketingService(db_session)
        
        # Create automatic segment with filter criteria
        segment = marketing_service.create_segment(
            tenant_id=str(test_tenant.id),
            name="High Purchase Customers",
            description="Customers with high total purchases",
            segmentation_type=SegmentationType.AUTOMATIC,
            filter_criteria={
                "min_total_purchases": 1000.0,
                "customer_type": "INDIVIDUAL"
            }
        )
        
        assert segment is not None
        assert segment.segmentation_type == SegmentationType.AUTOMATIC
        assert segment.filter_criteria is not None
        # Customer count should be populated automatically
        assert segment.customer_count >= 0
    
    def test_add_customers_to_segment(self, db_session: Session, test_tenant: Tenant, test_customers: list):
        """Test adding customers to a manual segment"""
        marketing_service = MarketingService(db_session)
        
        # Create manual segment
        segment = marketing_service.create_segment(
            tenant_id=str(test_tenant.id),
            name="Selected Customers",
            segmentation_type=SegmentationType.MANUAL
        )
        
        # Add customers to segment
        customer_ids = [str(customer.id) for customer in test_customers[:3]]
        success = marketing_service.add_customers_to_segment(
            tenant_id=str(test_tenant.id),
            segment_id=str(segment.id),
            customer_ids=customer_ids
        )
        
        assert success is True
        
        # Verify customers were added
        db_session.refresh(segment)
        assert segment.customer_count == 3
        
        # Verify segment customers exist
        segment_customers = db_session.query(SegmentCustomer).filter(
            SegmentCustomer.segment_id == segment.id
        ).all()
        
        assert len(segment_customers) == 3
    
    def test_remove_customers_from_segment(self, db_session: Session, test_tenant: Tenant, test_customers: list):
        """Test removing customers from a segment"""
        marketing_service = MarketingService(db_session)
        
        # Create segment and add customers
        segment = marketing_service.create_segment(
            tenant_id=str(test_tenant.id),
            name="Test Remove Segment",
            segmentation_type=SegmentationType.MANUAL
        )
        
        customer_ids = [str(customer.id) for customer in test_customers[:5]]
        marketing_service.add_customers_to_segment(
            tenant_id=str(test_tenant.id),
            segment_id=str(segment.id),
            customer_ids=customer_ids
        )
        
        # Remove some customers
        remove_ids = customer_ids[:2]
        success = marketing_service.remove_customers_from_segment(
            tenant_id=str(test_tenant.id),
            segment_id=str(segment.id),
            customer_ids=remove_ids
        )
        
        assert success is True
        
        # Verify customers were removed
        db_session.refresh(segment)
        assert segment.customer_count == 3
    
    def test_refresh_automatic_segment(self, db_session: Session, test_tenant: Tenant, test_customers: list):
        """Test refreshing an automatic segment"""
        marketing_service = MarketingService(db_session)
        
        # Create automatic segment
        segment = marketing_service.create_segment(
            tenant_id=str(test_tenant.id),
            name="Auto Refresh Test",
            segmentation_type=SegmentationType.AUTOMATIC,
            filter_criteria={"customer_type": "INDIVIDUAL"}
        )
        
        initial_count = segment.customer_count
        
        # Refresh segment
        success = marketing_service.refresh_automatic_segment(
            tenant_id=str(test_tenant.id),
            segment_id=str(segment.id)
        )
        
        assert success is True
        
        # Verify segment was refreshed
        db_session.refresh(segment)
        assert segment.last_updated_at is not None
    
    def test_get_segment_customers(self, db_session: Session, test_tenant: Tenant, test_customers: list):
        """Test getting customers in a segment"""
        marketing_service = MarketingService(db_session)
        
        # Create segment and add customers
        segment = marketing_service.create_segment(
            tenant_id=str(test_tenant.id),
            name="Test Get Customers",
            segmentation_type=SegmentationType.MANUAL
        )
        
        customer_ids = [str(customer.id) for customer in test_customers[:4]]
        marketing_service.add_customers_to_segment(
            tenant_id=str(test_tenant.id),
            segment_id=str(segment.id),
            customer_ids=customer_ids
        )
        
        # Get segment customers
        segment_customers = marketing_service.get_segment_customers(
            tenant_id=str(test_tenant.id),
            segment_id=str(segment.id)
        )
        
        assert len(segment_customers) == 4
        for customer in segment_customers:
            assert customer.tenant_id == test_tenant.id


class TestCommunicationPreferences:
    """Test communication preference management"""
    
    def test_create_communication_preferences(self, db_session: Session, test_tenant: Tenant, test_customers: list):
        """Test creating communication preferences"""
        marketing_service = MarketingService(db_session)
        customer = test_customers[0]
        
        # Create preferences
        preferences = marketing_service.create_or_update_preferences(
            tenant_id=str(test_tenant.id),
            customer_id=str(customer.id),
            preferences={
                "email_enabled": True,
                "email_marketing": False,
                "sms_enabled": True,
                "sms_marketing": True,
                "preferred_contact_time": "evening"
            }
        )
        
        assert preferences is not None
        assert preferences.email_enabled is True
        assert preferences.email_marketing is False
        assert preferences.sms_enabled is True
        assert preferences.sms_marketing is True
        assert preferences.preferred_contact_time == "evening"
    
    def test_update_communication_preferences(self, db_session: Session, test_tenant: Tenant, test_customers: list):
        """Test updating existing communication preferences"""
        marketing_service = MarketingService(db_session)
        customer = test_customers[0]
        
        # Create initial preferences
        initial_prefs = marketing_service.create_or_update_preferences(
            tenant_id=str(test_tenant.id),
            customer_id=str(customer.id),
            preferences={"email_marketing": True}
        )
        
        # Update preferences
        updated_prefs = marketing_service.create_or_update_preferences(
            tenant_id=str(test_tenant.id),
            customer_id=str(customer.id),
            preferences={"email_marketing": False, "sms_marketing": False}
        )
        
        assert updated_prefs.id == initial_prefs.id  # Same record
        assert updated_prefs.email_marketing is False
        assert updated_prefs.sms_marketing is False
    
    def test_opt_out_customer(self, db_session: Session, test_tenant: Tenant, test_customers: list):
        """Test opting out a customer from all communications"""
        marketing_service = MarketingService(db_session)
        customer = test_customers[0]
        
        # Opt out customer
        success = marketing_service.opt_out_customer(
            tenant_id=str(test_tenant.id),
            customer_id=str(customer.id),
            reason="Customer request"
        )
        
        assert success is True
        
        # Verify preferences
        preferences = marketing_service.get_communication_preferences(
            tenant_id=str(test_tenant.id),
            customer_id=str(customer.id)
        )
        
        assert preferences is not None
        assert preferences.email_enabled is False
        assert preferences.sms_enabled is False
        assert preferences.email_marketing is False
        assert preferences.sms_marketing is False
        assert preferences.opted_out_at is not None
        assert preferences.opt_out_reason == "Customer request"
    
    def test_opt_in_customer(self, db_session: Session, test_tenant: Tenant, test_customers: list):
        """Test opting in a customer to all communications"""
        marketing_service = MarketingService(db_session)
        customer = test_customers[0]
        
        # First opt out
        marketing_service.opt_out_customer(
            tenant_id=str(test_tenant.id),
            customer_id=str(customer.id)
        )
        
        # Then opt in
        success = marketing_service.opt_in_customer(
            tenant_id=str(test_tenant.id),
            customer_id=str(customer.id)
        )
        
        assert success is True
        
        # Verify preferences
        preferences = marketing_service.get_communication_preferences(
            tenant_id=str(test_tenant.id),
            customer_id=str(customer.id)
        )
        
        assert preferences.email_enabled is True
        assert preferences.sms_enabled is True
        assert preferences.email_marketing is True
        assert preferences.sms_marketing is True
        assert preferences.opted_out_at is None
        assert preferences.opt_out_reason is None


class TestMarketingAnalytics:
    """Test marketing analytics and reporting"""
    
    def test_get_marketing_analytics(self, db_session: Session, test_tenant: Tenant, test_customers: list):
        """Test getting marketing analytics"""
        marketing_service = MarketingService(db_session)
        
        # Create some campaigns for analytics
        campaign1 = marketing_service.create_campaign(
            tenant_id=str(test_tenant.id),
            name="Analytics Test 1",
            message="Test message 1",
            campaign_type=CampaignType.EMAIL,
            subject="Test 1"
        )
        
        campaign2 = marketing_service.create_campaign(
            tenant_id=str(test_tenant.id),
            name="Analytics Test 2",
            message="Test message 2",
            campaign_type=CampaignType.SMS
        )
        
        # Start campaigns
        marketing_service.start_campaign(str(test_tenant.id), str(campaign1.id))
        marketing_service.start_campaign(str(test_tenant.id), str(campaign2.id))
        
        # Get analytics
        analytics = marketing_service.get_marketing_analytics(
            tenant_id=str(test_tenant.id),
            days=30
        )
        
        assert analytics is not None
        assert analytics["period_days"] == 30
        assert "campaign_stats" in analytics
        assert "total_campaigns" in analytics
        assert "total_sent" in analytics
        assert "total_delivered" in analytics
        assert "delivery_rate" in analytics
        assert "segment_count" in analytics
        assert "opt_out_count" in analytics
    
    def test_get_delivery_tracking(self, db_session: Session, test_tenant: Tenant, test_customers: list):
        """Test getting delivery tracking information"""
        marketing_service = MarketingService(db_session)
        
        # Create and start campaign
        campaign = marketing_service.create_campaign(
            tenant_id=str(test_tenant.id),
            name="Delivery Tracking Test",
            message="Test delivery tracking",
            campaign_type=CampaignType.SMS
        )
        
        marketing_service.start_campaign(str(test_tenant.id), str(campaign.id))
        
        # Get delivery tracking
        tracking_data = marketing_service.get_delivery_tracking(
            tenant_id=str(test_tenant.id),
            campaign_id=str(campaign.id)
        )
        
        assert isinstance(tracking_data, list)
        if tracking_data:  # If there are recipients
            for data in tracking_data:
                assert "campaign_name" in data
                assert "customer_name" in data
                assert "status" in data


class TestMarketingTasks:
    """Test marketing Celery tasks"""
    
    @patch('app.services.notification_service.EmailService.send_email')
    @patch('app.services.notification_service.SMSService.send_sms')
    def test_process_marketing_campaign_task(self, mock_sms, mock_email, db_session: Session, test_tenant: Tenant, test_customers: list):
        """Test processing marketing campaign task"""
        # Mock successful sending
        mock_email.return_value = {"status": "success", "provider_id": "email_123"}
        mock_sms.return_value = {"status": "success", "provider_id": "sms_123"}
        
        marketing_service = MarketingService(db_session)
        
        # Create and start campaign
        campaign = marketing_service.create_campaign(
            tenant_id=str(test_tenant.id),
            name="Task Test Campaign",
            message="Test task processing",
            campaign_type=CampaignType.EMAIL,
            subject="Task Test"
        )
        
        marketing_service.start_campaign(str(test_tenant.id), str(campaign.id))
        
        # Process campaign task
        result = process_marketing_campaign(str(campaign.id))
        
        assert result is not None
        assert result["campaign_id"] == str(campaign.id)
        assert "sent_count" in result
        assert "failed_count" in result
        assert "success_rate" in result
    
    @patch('app.services.notification_service.SMSService.send_sms')
    def test_send_bulk_sms_task(self, mock_sms, db_session: Session, test_tenant: Tenant, test_customers: list):
        """Test bulk SMS sending task"""
        # Mock successful SMS sending
        mock_sms.return_value = {"status": "success", "provider_id": "bulk_sms_123"}
        
        customer_ids = [str(customer.id) for customer in test_customers[:3]]
        
        # Execute bulk SMS task
        result = send_bulk_sms(
            tenant_id=str(test_tenant.id),
            customer_ids=customer_ids,
            message="Bulk SMS test message",
            campaign_name="Bulk Test"
        )
        
        assert result is not None
        assert result["tenant_id"] == str(test_tenant.id)
        assert result["notifications_created"] > 0
    
    def test_refresh_dynamic_segments_task(self, db_session: Session, test_tenant: Tenant, test_customers: list):
        """Test refreshing dynamic segments task"""
        marketing_service = MarketingService(db_session)
        
        # Create a dynamic segment (using AUTOMATIC for testing)
        segment = marketing_service.create_segment(
            tenant_id=str(test_tenant.id),
            name="Dynamic Test Segment",
            segmentation_type=SegmentationType.DYNAMIC,
            filter_criteria={"customer_type": "INDIVIDUAL"}
        )
        
        # Make segment appear old
        segment.last_updated_at = datetime.utcnow() - timedelta(days=2)
        db_session.commit()
        
        # Execute refresh task
        result = refresh_dynamic_segments()
        
        assert result is not None
        assert "refreshed_count" in result
        assert "total_segments" in result
    
    def test_process_scheduled_campaigns_task(self, db_session: Session, test_tenant: Tenant, test_customers: list):
        """Test processing scheduled campaigns task"""
        marketing_service = MarketingService(db_session)
        
        # Create scheduled campaign that's due
        past_time = datetime.utcnow() - timedelta(minutes=5)
        campaign = marketing_service.create_campaign(
            tenant_id=str(test_tenant.id),
            name="Scheduled Test Campaign",
            message="Scheduled test message",
            campaign_type=CampaignType.SMS,
            scheduled_at=past_time,
            send_immediately=False
        )
        
        # Set status to scheduled
        campaign.status = CampaignStatus.SCHEDULED
        db_session.commit()
        
        # Execute scheduled campaigns task
        result = process_scheduled_campaigns()
        
        assert result is not None
        assert "started_count" in result
        assert "total_scheduled" in result


class TestMarketingIntegration:
    """Test marketing system integration with other components"""
    
    def test_campaign_with_communication_preferences(self, db_session: Session, test_tenant: Tenant, test_customers: list):
        """Test campaign respects communication preferences"""
        marketing_service = MarketingService(db_session)
        
        # Set up communication preferences for some customers
        customer1 = test_customers[0]
        customer2 = test_customers[1]
        
        # Customer 1 opts out of marketing
        marketing_service.create_or_update_preferences(
            tenant_id=str(test_tenant.id),
            customer_id=str(customer1.id),
            preferences={"email_marketing": False, "sms_marketing": False}
        )
        
        # Customer 2 allows marketing
        marketing_service.create_or_update_preferences(
            tenant_id=str(test_tenant.id),
            customer_id=str(customer2.id),
            preferences={"email_marketing": True, "sms_marketing": True}
        )
        
        # Create campaign targeting these customers
        campaign = marketing_service.create_campaign(
            tenant_id=str(test_tenant.id),
            name="Preference Test Campaign",
            message="Testing preferences",
            campaign_type=CampaignType.EMAIL,
            subject="Preference Test",
            customer_filter={"customer_ids": [str(customer1.id), str(customer2.id)]}
        )
        
        # Start campaign
        marketing_service.start_campaign(str(test_tenant.id), str(campaign.id))
        
        # Check recipients
        recipients = db_session.query(CampaignRecipient).filter(
            CampaignRecipient.campaign_id == campaign.id
        ).all()
        
        # Should have recipients for both customers, but preferences will be checked during sending
        assert len(recipients) == 2
    
    def test_segment_based_campaign(self, db_session: Session, test_tenant: Tenant, test_customers: list):
        """Test creating campaign based on customer segment"""
        marketing_service = MarketingService(db_session)
        
        # Create segment
        segment = marketing_service.create_segment(
            tenant_id=str(test_tenant.id),
            name="VIP Segment",
            segmentation_type=SegmentationType.MANUAL
        )
        
        # Add customers to segment
        customer_ids = [str(customer.id) for customer in test_customers[:3]]
        marketing_service.add_customers_to_segment(
            tenant_id=str(test_tenant.id),
            segment_id=str(segment.id),
            customer_ids=customer_ids
        )
        
        # Create campaign targeting segment customers
        segment_customers = marketing_service.get_segment_customers(
            tenant_id=str(test_tenant.id),
            segment_id=str(segment.id)
        )
        
        campaign = marketing_service.create_campaign(
            tenant_id=str(test_tenant.id),
            name="Segment Campaign",
            message="Message for VIP customers",
            campaign_type=CampaignType.SMS,
            customer_filter={"customer_ids": [str(c.id) for c in segment_customers]}
        )
        
        assert campaign.target_customer_count == 3
    
    def test_marketing_analytics_with_real_data(self, db_session: Session, test_tenant: Tenant, test_customers: list):
        """Test marketing analytics with real campaign data"""
        marketing_service = MarketingService(db_session)
        
        # Create multiple campaigns with different statuses
        campaigns = []
        
        # Completed campaign
        campaign1 = marketing_service.create_campaign(
            tenant_id=str(test_tenant.id),
            name="Completed Campaign",
            message="Completed test",
            campaign_type=CampaignType.EMAIL,
            subject="Completed"
        )
        campaign1.status = CampaignStatus.COMPLETED
        campaign1.sent_count = 10
        campaign1.delivered_count = 8
        campaign1.failed_count = 2
        campaigns.append(campaign1)
        
        # Running campaign
        campaign2 = marketing_service.create_campaign(
            tenant_id=str(test_tenant.id),
            name="Running Campaign",
            message="Running test",
            campaign_type=CampaignType.SMS
        )
        marketing_service.start_campaign(str(test_tenant.id), str(campaign2.id))
        campaigns.append(campaign2)
        
        # Failed campaign
        campaign3 = marketing_service.create_campaign(
            tenant_id=str(test_tenant.id),
            name="Failed Campaign",
            message="Failed test",
            campaign_type=CampaignType.EMAIL,
            subject="Failed"
        )
        campaign3.status = CampaignStatus.FAILED
        campaigns.append(campaign3)
        
        db_session.commit()
        
        # Get analytics
        analytics = marketing_service.get_marketing_analytics(
            tenant_id=str(test_tenant.id),
            days=30
        )
        
        assert analytics["total_campaigns"] >= 3
        assert analytics["total_sent"] >= 10
        assert analytics["total_delivered"] >= 8
        assert analytics["delivery_rate"] > 0
        
        # Check campaign status breakdown
        campaign_stats = analytics["campaign_stats"]
        assert "completed" in campaign_stats or "running" in campaign_stats or "failed" in campaign_stats


# Fixtures for testing
@pytest.fixture
def test_customers(db_session: Session, test_tenant: Tenant):
    """Create test customers for marketing tests"""
    customers = []
    
    for i in range(10):
        customer = Customer(
            tenant_id=test_tenant.id,
            name=f"Test Customer {i+1}",
            email=f"customer{i+1}@test.com",
            phone=f"+98912345{i:04d}",
            mobile=f"+98912345{i:04d}",
            customer_type=CustomerType.INDIVIDUAL if i % 2 == 0 else CustomerType.BUSINESS,
            status=CustomerStatus.ACTIVE,
            total_purchases=1000.0 * (i + 1),  # Varying purchase amounts
            total_debt=100.0 if i % 3 == 0 else 0,  # Some customers have debt
            email_notifications=True,
            sms_notifications=True
        )
        
        db_session.add(customer)
        customers.append(customer)
    
    db_session.commit()
    return customers