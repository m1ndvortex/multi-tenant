"""
Marketing and communication service
"""

from typing import Optional, Dict, Any, List, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, text
from datetime import datetime, timedelta
import logging
import uuid

from app.models.marketing import (
    MarketingCampaign, CampaignRecipient, CustomerSegment, 
    SegmentCustomer, CommunicationPreference,
    CampaignStatus, CampaignType, SegmentationType
)
from app.models.customer import Customer, CustomerStatus, CustomerType
from app.models.notification import NotificationLog, NotificationType, NotificationStatus
from app.services.notification_service import NotificationService
from app.core.config import settings

logger = logging.getLogger(__name__)


class MarketingService:
    """Service for marketing campaigns and customer segmentation"""
    
    def __init__(self, db: Session):
        self.db = db
        self.notification_service = NotificationService(db)
    
    # Campaign Management
    def create_campaign(
        self,
        tenant_id: str,
        name: str,
        message: str,
        campaign_type: CampaignType,
        customer_filter: Dict[str, Any] = None,
        subject: str = None,
        scheduled_at: datetime = None,
        send_immediately: bool = True
    ) -> MarketingCampaign:
        """Create a new marketing campaign"""
        
        campaign = MarketingCampaign(
            tenant_id=tenant_id,
            name=name,
            message=message,
            campaign_type=campaign_type,
            subject=subject,
            customer_filter=customer_filter or {},
            scheduled_at=scheduled_at,
            send_immediately=send_immediately,
            status=CampaignStatus.DRAFT
        )
        
        self.db.add(campaign)
        self.db.commit()
        self.db.refresh(campaign)
        
        # Calculate target customers
        target_customers = self._get_filtered_customers(tenant_id, customer_filter or {})
        campaign.target_customer_count = len(target_customers)
        
        # Create campaign recipients
        for customer in target_customers:
            recipient = CampaignRecipient(
                campaign_id=campaign.id,
                customer_id=customer.id,
                recipient_email=customer.email if campaign_type in [CampaignType.EMAIL, CampaignType.MIXED] else None,
                recipient_phone=customer.mobile or customer.phone if campaign_type in [CampaignType.SMS, CampaignType.MIXED] else None
            )
            self.db.add(recipient)
        
        self.db.commit()
        
        logger.info(f"Created campaign: {name} with {campaign.target_customer_count} recipients")
        return campaign
    
    def get_campaign(self, tenant_id: str, campaign_id: str) -> Optional[MarketingCampaign]:
        """Get campaign by ID"""
        return self.db.query(MarketingCampaign).filter(
            and_(
                MarketingCampaign.id == campaign_id,
                MarketingCampaign.tenant_id == tenant_id
            )
        ).first()
    
    def list_campaigns(
        self,
        tenant_id: str,
        status: CampaignStatus = None,
        campaign_type: CampaignType = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[MarketingCampaign]:
        """List campaigns for tenant"""
        
        query = self.db.query(MarketingCampaign).filter(
            MarketingCampaign.tenant_id == tenant_id
        )
        
        if status:
            query = query.filter(MarketingCampaign.status == status)
        
        if campaign_type:
            query = query.filter(MarketingCampaign.campaign_type == campaign_type)
        
        return query.order_by(MarketingCampaign.created_at.desc()).offset(offset).limit(limit).all()
    
    def start_campaign(self, tenant_id: str, campaign_id: str) -> bool:
        """Start a campaign"""
        
        campaign = self.get_campaign(tenant_id, campaign_id)
        if not campaign or campaign.status != CampaignStatus.DRAFT:
            return False
        
        campaign.start_campaign()
        self.db.commit()
        
        # Queue notifications for all recipients
        recipients = self.db.query(CampaignRecipient).filter(
            CampaignRecipient.campaign_id == campaign_id
        ).all()
        
        for recipient in recipients:
            # Check communication preferences
            if not self._can_send_to_recipient(recipient, "marketing"):
                recipient.mark_failed("Customer opted out of marketing communications")
                continue
            
            # Create notification log entries
            if campaign.campaign_type in [CampaignType.EMAIL, CampaignType.MIXED] and recipient.recipient_email:
                self.notification_service.create_notification_log(
                    tenant_id=tenant_id,
                    notification_type=NotificationType.EMAIL,
                    recipient_email=recipient.recipient_email,
                    customer_id=recipient.customer_id,
                    subject=campaign.subject or f"پیام از {settings.app_name}",
                    body=campaign.message,
                    reference_type="campaign",
                    reference_id=campaign.id,
                    priority=7  # Lower priority for marketing
                )
            
            if campaign.campaign_type in [CampaignType.SMS, CampaignType.MIXED] and recipient.recipient_phone:
                self.notification_service.create_notification_log(
                    tenant_id=tenant_id,
                    notification_type=NotificationType.SMS,
                    recipient_phone=recipient.recipient_phone,
                    customer_id=recipient.customer_id,
                    body=campaign.message,
                    reference_type="campaign",
                    reference_id=campaign.id,
                    priority=7  # Lower priority for marketing
                )
        
        logger.info(f"Started campaign: {campaign.name} with {len(recipients)} recipients")
        return True
    
    def cancel_campaign(self, tenant_id: str, campaign_id: str) -> bool:
        """Cancel a campaign"""
        
        campaign = self.get_campaign(tenant_id, campaign_id)
        if not campaign or campaign.status not in [CampaignStatus.DRAFT, CampaignStatus.SCHEDULED, CampaignStatus.RUNNING]:
            return False
        
        campaign.cancel_campaign()
        self.db.commit()
        
        logger.info(f"Cancelled campaign: {campaign.name}")
        return True
    
    def get_campaign_stats(self, tenant_id: str, campaign_id: str) -> Dict[str, Any]:
        """Get campaign statistics"""
        
        campaign = self.get_campaign(tenant_id, campaign_id)
        if not campaign:
            return {}
        
        # Get recipient statistics
        recipient_stats = self.db.query(
            CampaignRecipient.status,
            func.count(CampaignRecipient.id).label('count')
        ).filter(
            CampaignRecipient.campaign_id == campaign_id
        ).group_by(CampaignRecipient.status).all()
        
        stats = {
            "campaign_id": campaign_id,
            "name": campaign.name,
            "status": campaign.status.value,
            "campaign_type": campaign.campaign_type.value,
            "target_count": campaign.target_customer_count,
            "sent_count": campaign.sent_count,
            "delivered_count": campaign.delivered_count,
            "failed_count": campaign.failed_count,
            "success_rate": campaign.success_rate,
            "created_at": campaign.created_at,
            "started_at": campaign.started_at,
            "completed_at": campaign.completed_at,
            "recipient_breakdown": {stat.status: stat.count for stat in recipient_stats}
        }
        
        return stats
    
    # Customer Segmentation
    def create_segment(
        self,
        tenant_id: str,
        name: str,
        description: str = None,
        segmentation_type: SegmentationType = SegmentationType.MANUAL,
        filter_criteria: Dict[str, Any] = None
    ) -> CustomerSegment:
        """Create a customer segment"""
        
        segment = CustomerSegment(
            tenant_id=tenant_id,
            name=name,
            description=description,
            segmentation_type=segmentation_type,
            filter_criteria=filter_criteria or {}
        )
        
        self.db.add(segment)
        self.db.commit()
        self.db.refresh(segment)
        
        # If automatic segmentation, populate customers
        if segmentation_type == SegmentationType.AUTOMATIC and filter_criteria:
            self._populate_automatic_segment(segment)
        
        logger.info(f"Created segment: {name}")
        return segment
    
    def get_segment(self, tenant_id: str, segment_id: str) -> Optional[CustomerSegment]:
        """Get segment by ID"""
        return self.db.query(CustomerSegment).filter(
            and_(
                CustomerSegment.id == segment_id,
                CustomerSegment.tenant_id == tenant_id
            )
        ).first()
    
    def list_segments(self, tenant_id: str) -> List[CustomerSegment]:
        """List all segments for tenant"""
        return self.db.query(CustomerSegment).filter(
            CustomerSegment.tenant_id == tenant_id
        ).order_by(CustomerSegment.name).all()
    
    def add_customers_to_segment(
        self,
        tenant_id: str,
        segment_id: str,
        customer_ids: List[str]
    ) -> bool:
        """Add customers to a segment"""
        
        segment = self.get_segment(tenant_id, segment_id)
        if not segment:
            return False
        
        # Verify customers belong to tenant
        customers = self.db.query(Customer).filter(
            and_(
                Customer.tenant_id == tenant_id,
                Customer.id.in_(customer_ids)
            )
        ).all()
        
        added_count = 0
        for customer in customers:
            # Check if already in segment
            existing = self.db.query(SegmentCustomer).filter(
                and_(
                    SegmentCustomer.segment_id == segment_id,
                    SegmentCustomer.customer_id == customer.id
                )
            ).first()
            
            if not existing:
                segment_customer = SegmentCustomer(
                    segment_id=segment_id,
                    customer_id=customer.id,
                    added_by="manual"
                )
                self.db.add(segment_customer)
                added_count += 1
        
        self.db.commit()
        
        # Update segment customer count
        segment.update_customer_count(self.db)
        self.db.commit()
        
        logger.info(f"Added {added_count} customers to segment: {segment.name}")
        return True
    
    def remove_customers_from_segment(
        self,
        tenant_id: str,
        segment_id: str,
        customer_ids: List[str]
    ) -> bool:
        """Remove customers from a segment"""
        
        segment = self.get_segment(tenant_id, segment_id)
        if not segment:
            return False
        
        removed_count = self.db.query(SegmentCustomer).filter(
            and_(
                SegmentCustomer.segment_id == segment_id,
                SegmentCustomer.customer_id.in_(customer_ids)
            )
        ).delete(synchronize_session=False)
        
        self.db.commit()
        
        # Update segment customer count
        segment.update_customer_count(self.db)
        self.db.commit()
        
        logger.info(f"Removed {removed_count} customers from segment: {segment.name}")
        return True
    
    def get_segment_customers(
        self,
        tenant_id: str,
        segment_id: str,
        limit: int = 100,
        offset: int = 0
    ) -> List[Customer]:
        """Get customers in a segment"""
        
        return self.db.query(Customer).join(SegmentCustomer).filter(
            and_(
                SegmentCustomer.segment_id == segment_id,
                Customer.tenant_id == tenant_id
            )
        ).offset(offset).limit(limit).all()
    
    def refresh_automatic_segment(self, tenant_id: str, segment_id: str) -> bool:
        """Refresh an automatic segment based on its criteria"""
        
        segment = self.get_segment(tenant_id, segment_id)
        if not segment or segment.segmentation_type != SegmentationType.AUTOMATIC:
            return False
        
        # Clear existing customers
        self.db.query(SegmentCustomer).filter(
            SegmentCustomer.segment_id == segment_id
        ).delete()
        
        # Repopulate based on criteria
        self._populate_automatic_segment(segment)
        
        logger.info(f"Refreshed automatic segment: {segment.name}")
        return True
    
    # Communication Preferences
    def get_communication_preferences(
        self,
        tenant_id: str,
        customer_id: str
    ) -> Optional[CommunicationPreference]:
        """Get customer communication preferences"""
        
        return self.db.query(CommunicationPreference).filter(
            and_(
                CommunicationPreference.tenant_id == tenant_id,
                CommunicationPreference.customer_id == customer_id
            )
        ).first()
    
    def create_or_update_preferences(
        self,
        tenant_id: str,
        customer_id: str,
        preferences: Dict[str, Any]
    ) -> CommunicationPreference:
        """Create or update customer communication preferences"""
        
        # Check if preferences exist
        existing = self.get_communication_preferences(tenant_id, customer_id)
        
        if existing:
            # Update existing preferences
            for key, value in preferences.items():
                if hasattr(existing, key):
                    setattr(existing, key, value)
            
            self.db.commit()
            self.db.refresh(existing)
            return existing
        else:
            # Create new preferences
            new_prefs = CommunicationPreference(
                tenant_id=tenant_id,
                customer_id=customer_id,
                **preferences
            )
            
            self.db.add(new_prefs)
            self.db.commit()
            self.db.refresh(new_prefs)
            return new_prefs
    
    def opt_out_customer(
        self,
        tenant_id: str,
        customer_id: str,
        reason: str = None
    ) -> bool:
        """Opt out customer from all communications"""
        
        preferences = self.get_communication_preferences(tenant_id, customer_id)
        if not preferences:
            # Create preferences with opt-out
            preferences = CommunicationPreference(
                tenant_id=tenant_id,
                customer_id=customer_id
            )
            self.db.add(preferences)
        
        preferences.opt_out_all(reason)
        self.db.commit()
        
        logger.info(f"Opted out customer {customer_id} from all communications")
        return True
    
    def opt_in_customer(self, tenant_id: str, customer_id: str) -> bool:
        """Opt in customer to all communications"""
        
        preferences = self.get_communication_preferences(tenant_id, customer_id)
        if not preferences:
            # Create preferences with opt-in
            preferences = CommunicationPreference(
                tenant_id=tenant_id,
                customer_id=customer_id
            )
            self.db.add(preferences)
        
        preferences.opt_in_all()
        self.db.commit()
        
        logger.info(f"Opted in customer {customer_id} to all communications")
        return True
    
    # Analytics and Reporting
    def get_marketing_analytics(self, tenant_id: str, days: int = 30) -> Dict[str, Any]:
        """Get marketing analytics for tenant"""
        
        start_date = datetime.utcnow() - timedelta(days=days)
        
        # Campaign statistics
        campaign_stats = self.db.query(
            MarketingCampaign.status,
            func.count(MarketingCampaign.id).label('count')
        ).filter(
            and_(
                MarketingCampaign.tenant_id == tenant_id,
                MarketingCampaign.created_at >= start_date
            )
        ).group_by(MarketingCampaign.status).all()
        
        # Total sent messages
        total_sent = self.db.query(func.sum(MarketingCampaign.sent_count)).filter(
            and_(
                MarketingCampaign.tenant_id == tenant_id,
                MarketingCampaign.created_at >= start_date
            )
        ).scalar() or 0
        
        # Total delivered messages
        total_delivered = self.db.query(func.sum(MarketingCampaign.delivered_count)).filter(
            and_(
                MarketingCampaign.tenant_id == tenant_id,
                MarketingCampaign.created_at >= start_date
            )
        ).scalar() or 0
        
        # Segment statistics
        segment_count = self.db.query(func.count(CustomerSegment.id)).filter(
            CustomerSegment.tenant_id == tenant_id
        ).scalar() or 0
        
        # Communication preferences statistics
        opt_out_count = self.db.query(func.count(CommunicationPreference.id)).filter(
            and_(
                CommunicationPreference.tenant_id == tenant_id,
                CommunicationPreference.opted_out_at.isnot(None)
            )
        ).scalar() or 0
        
        return {
            "period_days": days,
            "campaign_stats": {stat.status.value: stat.count for stat in campaign_stats},
            "total_campaigns": sum(stat.count for stat in campaign_stats),
            "total_sent": total_sent,
            "total_delivered": total_delivered,
            "delivery_rate": (total_delivered / total_sent * 100) if total_sent > 0 else 0,
            "segment_count": segment_count,
            "opt_out_count": opt_out_count
        }
    
    def get_delivery_tracking(
        self,
        tenant_id: str,
        campaign_id: str = None,
        limit: int = 100,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """Get delivery tracking information"""
        
        query = self.db.query(
            CampaignRecipient,
            Customer.name.label('customer_name'),
            MarketingCampaign.name.label('campaign_name')
        ).join(Customer).join(MarketingCampaign).filter(
            MarketingCampaign.tenant_id == tenant_id
        )
        
        if campaign_id:
            query = query.filter(CampaignRecipient.campaign_id == campaign_id)
        
        results = query.order_by(CampaignRecipient.created_at.desc()).offset(offset).limit(limit).all()
        
        tracking_data = []
        for recipient, customer_name, campaign_name in results:
            tracking_data.append({
                "id": recipient.id,
                "campaign_name": campaign_name,
                "customer_name": customer_name,
                "recipient_email": recipient.recipient_email,
                "recipient_phone": recipient.recipient_phone,
                "status": recipient.status,
                "sent_at": recipient.sent_at,
                "delivered_at": recipient.delivered_at,
                "error_message": recipient.error_message,
                "provider_message_id": recipient.provider_message_id
            })
        
        return tracking_data
    
    # Private helper methods
    def _get_filtered_customers(
        self,
        tenant_id: str,
        filter_criteria: Dict[str, Any]
    ) -> List[Customer]:
        """Get customers based on filter criteria"""
        
        query = self.db.query(Customer).filter(
            and_(
                Customer.tenant_id == tenant_id,
                Customer.status == CustomerStatus.ACTIVE
            )
        )
        
        # Apply filters
        if filter_criteria.get('customer_type'):
            query = query.filter(Customer.customer_type == filter_criteria['customer_type'])
        
        if filter_criteria.get('tags'):
            tags = filter_criteria['tags']
            if isinstance(tags, list):
                # Customer must have all specified tags
                for tag in tags:
                    query = query.filter(Customer.tags.contains([tag]))
        
        if filter_criteria.get('min_total_purchases'):
            query = query.filter(Customer.total_purchases >= filter_criteria['min_total_purchases'])
        
        if filter_criteria.get('max_total_purchases'):
            query = query.filter(Customer.total_purchases <= filter_criteria['max_total_purchases'])
        
        if filter_criteria.get('has_debt'):
            if filter_criteria['has_debt']:
                query = query.filter(or_(Customer.total_debt > 0, Customer.total_gold_debt > 0))
            else:
                query = query.filter(and_(Customer.total_debt == 0, Customer.total_gold_debt == 0))
        
        if filter_criteria.get('last_purchase_days'):
            days_ago = datetime.utcnow() - timedelta(days=filter_criteria['last_purchase_days'])
            query = query.filter(Customer.last_purchase_at >= days_ago)
        
        if filter_criteria.get('city'):
            query = query.filter(Customer.city == filter_criteria['city'])
        
        # Exclude customers who opted out of marketing
        query = query.outerjoin(CommunicationPreference).filter(
            or_(
                CommunicationPreference.id.is_(None),  # No preferences set (default allow)
                and_(
                    CommunicationPreference.email_marketing == True,
                    CommunicationPreference.sms_marketing == True
                )
            )
        )
        
        return query.all()
    
    def _populate_automatic_segment(self, segment: CustomerSegment):
        """Populate automatic segment based on criteria"""
        
        customers = self._get_filtered_customers(segment.tenant_id, segment.filter_criteria)
        
        for customer in customers:
            segment_customer = SegmentCustomer(
                segment_id=segment.id,
                customer_id=customer.id,
                added_by="automatic"
            )
            self.db.add(segment_customer)
        
        self.db.commit()
        
        # Update customer count
        segment.update_customer_count(self.db)
        self.db.commit()
    
    def _can_send_to_recipient(self, recipient: CampaignRecipient, message_type: str) -> bool:
        """Check if we can send to a recipient based on preferences"""
        
        preferences = self.db.query(CommunicationPreference).filter(
            CommunicationPreference.customer_id == recipient.customer_id
        ).first()
        
        if not preferences:
            # No preferences set, default to allow
            return True
        
        # Check if opted out globally
        if preferences.opted_out_at:
            return False
        
        # Check specific preferences
        if recipient.recipient_email and not preferences.can_receive_email(message_type):
            return False
        
        if recipient.recipient_phone and not preferences.can_receive_sms(message_type):
            return False
        
        return True