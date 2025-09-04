"""
Marketing and communication Celery tasks
"""

from celery import current_task
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import logging
from typing import List, Dict, Any

from app.celery_app import celery_app
from app.core.database import SessionLocal
from app.services.marketing_service import MarketingService
from app.services.notification_service import NotificationService, EmailService, SMSService
from app.models.marketing import (
    MarketingCampaign, CampaignRecipient, CampaignStatus,
    CustomerSegment, SegmentationType
)
from app.models.notification import NotificationLog, NotificationStatus, NotificationType

logger = logging.getLogger(__name__)


@celery_app.task(bind=True, max_retries=3)
def process_marketing_campaign(self, campaign_id: str):
    """Process a marketing campaign by sending messages to all recipients"""
    
    db = SessionLocal()
    try:
        marketing_service = MarketingService(db)
        notification_service = NotificationService(db)
        
        # Get campaign
        campaign = db.query(MarketingCampaign).filter(
            MarketingCampaign.id == campaign_id
        ).first()
        
        if not campaign:
            logger.error(f"Campaign not found: {campaign_id}")
            return {"error": "Campaign not found"}
        
        if campaign.status != CampaignStatus.RUNNING:
            logger.error(f"Campaign {campaign_id} is not in running status")
            return {"error": "Campaign is not running"}
        
        # Get all recipients
        recipients = db.query(CampaignRecipient).filter(
            CampaignRecipient.campaign_id == campaign_id,
            CampaignRecipient.status == "pending"
        ).all()
        
        total_recipients = len(recipients)
        processed_count = 0
        sent_count = 0
        failed_count = 0
        
        logger.info(f"Processing campaign {campaign.name} with {total_recipients} recipients")
        
        for i, recipient in enumerate(recipients):
            try:
                # Update task progress
                if current_task:
                    current_task.update_state(
                        state='PROGRESS',
                        meta={
                            'current': i + 1,
                            'total': total_recipients,
                            'status': f'Processing recipient {i + 1} of {total_recipients}'
                        }
                    )
                
                # Check communication preferences
                if not marketing_service._can_send_to_recipient(recipient, "marketing"):
                    recipient.mark_failed("Customer opted out of marketing communications")
                    failed_count += 1
                    processed_count += 1
                    continue
                
                # Send email if applicable
                if campaign.campaign_type.value in ["email", "mixed"] and recipient.recipient_email:
                    result = EmailService.send_email(
                        recipient=recipient.recipient_email,
                        subject=campaign.subject or f"پیام از {campaign.name}",
                        body=campaign.message
                    )
                    
                    if result["status"] == "success":
                        recipient.mark_sent(result.get("provider_id"))
                        sent_count += 1
                    else:
                        recipient.mark_failed(result.get("error", "Email sending failed"))
                        failed_count += 1
                
                # Send SMS if applicable
                elif campaign.campaign_type.value in ["sms", "mixed"] and recipient.recipient_phone:
                    result = SMSService.send_sms(
                        phone_number=recipient.recipient_phone,
                        message=campaign.message
                    )
                    
                    if result["status"] == "success":
                        recipient.mark_sent(result.get("provider_id"))
                        sent_count += 1
                    else:
                        recipient.mark_failed(result.get("error", "SMS sending failed"))
                        failed_count += 1
                
                else:
                    recipient.mark_failed("No valid contact information")
                    failed_count += 1
                
                processed_count += 1
                
                # Commit every 10 recipients to avoid long transactions
                if processed_count % 10 == 0:
                    db.commit()
                
            except Exception as e:
                logger.error(f"Error processing recipient {recipient.id}: {str(e)}")
                recipient.mark_failed(f"Processing error: {str(e)}")
                failed_count += 1
                processed_count += 1
        
        # Final commit
        db.commit()
        
        # Update campaign statistics
        campaign.sent_count = sent_count
        campaign.failed_count = failed_count
        campaign.complete_campaign()
        db.commit()
        
        result = {
            "campaign_id": campaign_id,
            "campaign_name": campaign.name,
            "total_recipients": total_recipients,
            "sent_count": sent_count,
            "failed_count": failed_count,
            "success_rate": (sent_count / total_recipients * 100) if total_recipients > 0 else 0
        }
        
        logger.info(f"Completed campaign {campaign.name}: {sent_count} sent, {failed_count} failed")
        return result
        
    except Exception as exc:
        logger.error(f"Campaign processing failed: {str(exc)}")
        
        # Mark campaign as failed
        try:
            campaign = db.query(MarketingCampaign).filter(
                MarketingCampaign.id == campaign_id
            ).first()
            if campaign:
                campaign.fail_campaign()
                db.commit()
        except:
            pass
        
        # Retry the task
        raise self.retry(exc=exc, countdown=60)
        
    finally:
        db.close()


@celery_app.task(bind=True, max_retries=3)
def send_bulk_sms(self, tenant_id: str, customer_ids: List[str], message: str, campaign_name: str = None):
    """Send bulk SMS to multiple customers"""
    
    db = SessionLocal()
    try:
        notification_service = NotificationService(db)
        
        # Create notification logs for bulk SMS
        notifications = notification_service.send_bulk_sms(
            tenant_id=tenant_id,
            customer_ids=customer_ids,
            message=message,
            campaign_name=campaign_name
        )
        
        logger.info(f"Created {len(notifications)} bulk SMS notifications for tenant {tenant_id}")
        
        return {
            "tenant_id": tenant_id,
            "notifications_created": len(notifications),
            "message": "Bulk SMS queued successfully"
        }
        
    except Exception as exc:
        logger.error(f"Bulk SMS task failed: {str(exc)}")
        raise self.retry(exc=exc, countdown=60)
        
    finally:
        db.close()


@celery_app.task(bind=True, max_retries=3)
def refresh_dynamic_segments(self):
    """Refresh all dynamic customer segments"""
    
    db = SessionLocal()
    try:
        marketing_service = MarketingService(db)
        
        # Get all dynamic segments
        segments = db.query(CustomerSegment).filter(
            CustomerSegment.segmentation_type == SegmentationType.DYNAMIC
        ).all()
        
        refreshed_count = 0
        
        for segment in segments:
            try:
                # Check if segment needs refresh (e.g., daily)
                if segment.last_updated_at < datetime.utcnow() - timedelta(hours=24):
                    marketing_service.refresh_automatic_segment(
                        tenant_id=str(segment.tenant_id),
                        segment_id=str(segment.id)
                    )
                    refreshed_count += 1
                    
            except Exception as e:
                logger.error(f"Error refreshing segment {segment.id}: {str(e)}")
        
        logger.info(f"Refreshed {refreshed_count} dynamic segments")
        
        return {
            "refreshed_count": refreshed_count,
            "total_segments": len(segments)
        }
        
    except Exception as exc:
        logger.error(f"Dynamic segment refresh failed: {str(exc)}")
        raise self.retry(exc=exc, countdown=300)
        
    finally:
        db.close()


@celery_app.task(bind=True, max_retries=3)
def process_scheduled_campaigns(self):
    """Process scheduled marketing campaigns that are due to run"""
    
    db = SessionLocal()
    try:
        marketing_service = MarketingService(db)
        
        # Get campaigns scheduled to run now
        now = datetime.utcnow()
        scheduled_campaigns = db.query(MarketingCampaign).filter(
            MarketingCampaign.status == CampaignStatus.SCHEDULED,
            MarketingCampaign.scheduled_at <= now
        ).all()
        
        started_count = 0
        
        for campaign in scheduled_campaigns:
            try:
                # Start the campaign
                success = marketing_service.start_campaign(
                    tenant_id=str(campaign.tenant_id),
                    campaign_id=str(campaign.id)
                )
                
                if success:
                    # Queue the campaign processing task
                    process_marketing_campaign.delay(str(campaign.id))
                    started_count += 1
                    logger.info(f"Started scheduled campaign: {campaign.name}")
                
            except Exception as e:
                logger.error(f"Error starting scheduled campaign {campaign.id}: {str(e)}")
                campaign.fail_campaign()
                db.commit()
        
        logger.info(f"Started {started_count} scheduled campaigns")
        
        return {
            "started_count": started_count,
            "total_scheduled": len(scheduled_campaigns)
        }
        
    except Exception as exc:
        logger.error(f"Scheduled campaign processing failed: {str(exc)}")
        raise self.retry(exc=exc, countdown=300)
        
    finally:
        db.close()


@celery_app.task(bind=True, max_retries=3)
def update_campaign_delivery_status(self, campaign_id: str):
    """Update campaign delivery status based on notification logs"""
    
    db = SessionLocal()
    try:
        # Get campaign
        campaign = db.query(MarketingCampaign).filter(
            MarketingCampaign.id == campaign_id
        ).first()
        
        if not campaign:
            logger.error(f"Campaign not found: {campaign_id}")
            return {"error": "Campaign not found"}
        
        # Get notification logs for this campaign
        notifications = db.query(NotificationLog).filter(
            NotificationLog.reference_type == "campaign",
            NotificationLog.reference_id == campaign_id
        ).all()
        
        delivered_count = 0
        failed_count = 0
        
        for notification in notifications:
            if notification.status == NotificationStatus.DELIVERED:
                delivered_count += 1
            elif notification.status == NotificationStatus.FAILED:
                failed_count += 1
        
        # Update campaign statistics
        campaign.delivered_count = delivered_count
        if failed_count > campaign.failed_count:
            campaign.failed_count = failed_count
        
        db.commit()
        
        logger.info(f"Updated delivery status for campaign {campaign.name}: {delivered_count} delivered")
        
        return {
            "campaign_id": campaign_id,
            "delivered_count": delivered_count,
            "failed_count": failed_count
        }
        
    except Exception as exc:
        logger.error(f"Campaign delivery status update failed: {str(exc)}")
        raise self.retry(exc=exc, countdown=60)
        
    finally:
        db.close()


@celery_app.task(bind=True, max_retries=3)
def cleanup_old_campaigns(self, days_old: int = 90):
    """Clean up old completed campaigns and their data"""
    
    db = SessionLocal()
    try:
        cutoff_date = datetime.utcnow() - timedelta(days=days_old)
        
        # Get old completed campaigns
        old_campaigns = db.query(MarketingCampaign).filter(
            MarketingCampaign.status.in_([CampaignStatus.COMPLETED, CampaignStatus.CANCELLED, CampaignStatus.FAILED]),
            MarketingCampaign.completed_at < cutoff_date
        ).all()
        
        deleted_count = 0
        
        for campaign in old_campaigns:
            try:
                # Delete campaign recipients (cascade will handle this)
                db.delete(campaign)
                deleted_count += 1
                
            except Exception as e:
                logger.error(f"Error deleting campaign {campaign.id}: {str(e)}")
        
        db.commit()
        
        logger.info(f"Cleaned up {deleted_count} old campaigns")
        
        return {
            "deleted_count": deleted_count,
            "cutoff_date": cutoff_date.isoformat()
        }
        
    except Exception as exc:
        logger.error(f"Campaign cleanup failed: {str(exc)}")
        raise self.retry(exc=exc, countdown=300)
        
    finally:
        db.close()


@celery_app.task(bind=True, max_retries=3)
def generate_marketing_report(self, tenant_id: str, period_days: int = 30):
    """Generate marketing performance report for tenant"""
    
    db = SessionLocal()
    try:
        marketing_service = MarketingService(db)
        
        # Get marketing analytics
        analytics = marketing_service.get_marketing_analytics(
            tenant_id=tenant_id,
            days=period_days
        )
        
        # Get recent campaigns
        recent_campaigns = marketing_service.list_campaigns(
            tenant_id=tenant_id,
            limit=10
        )
        
        # Get delivery tracking data
        delivery_data = marketing_service.get_delivery_tracking(
            tenant_id=tenant_id,
            limit=100
        )
        
        report = {
            "tenant_id": tenant_id,
            "period_days": period_days,
            "generated_at": datetime.utcnow().isoformat(),
            "analytics": analytics,
            "recent_campaigns": [
                {
                    "id": str(campaign.id),
                    "name": campaign.name,
                    "status": campaign.status.value,
                    "success_rate": campaign.success_rate,
                    "created_at": campaign.created_at.isoformat()
                }
                for campaign in recent_campaigns
            ],
            "delivery_summary": {
                "total_tracked": len(delivery_data),
                "successful_deliveries": len([d for d in delivery_data if d["status"] == "delivered"]),
                "failed_deliveries": len([d for d in delivery_data if d["status"] == "failed"])
            }
        }
        
        logger.info(f"Generated marketing report for tenant {tenant_id}")
        
        return report
        
    except Exception as exc:
        logger.error(f"Marketing report generation failed: {str(exc)}")
        raise self.retry(exc=exc, countdown=300)
        
    finally:
        db.close()


# Periodic tasks
@celery_app.task
def daily_marketing_maintenance():
    """Daily maintenance tasks for marketing system"""
    
    # Refresh dynamic segments
    refresh_dynamic_segments.delay()
    
    # Process scheduled campaigns
    process_scheduled_campaigns.delay()
    
    # Clean up old campaigns (older than 90 days)
    cleanup_old_campaigns.delay(90)
    
    return "Daily marketing maintenance tasks queued"


@celery_app.task
def hourly_campaign_monitoring():
    """Hourly monitoring of active campaigns"""
    
    db = SessionLocal()
    try:
        # Get running campaigns
        running_campaigns = db.query(MarketingCampaign).filter(
            MarketingCampaign.status == CampaignStatus.RUNNING
        ).all()
        
        for campaign in running_campaigns:
            # Update delivery status
            update_campaign_delivery_status.delay(str(campaign.id))
        
        return f"Monitoring {len(running_campaigns)} active campaigns"
        
    finally:
        db.close()