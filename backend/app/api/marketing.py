"""
Marketing and communication API endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from uuid import UUID
from datetime import datetime

from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.user import User
from app.models.marketing import CampaignType, CampaignStatus, SegmentationType
from app.services.marketing_service import MarketingService

# Import schemas individually to avoid issues
try:
    from app.schemas.marketing import (
        MarketingCampaignCreate, MarketingCampaignResponse,
        CustomerSegmentCreate, CustomerSegmentResponse,
        CommunicationPreferenceResponse, CommunicationPreferenceUpdate,
        CampaignStatsResponse, MarketingAnalyticsResponse, DeliveryTrackingResponse,
        BulkMessageRequest, SegmentCustomersRequest
    )
except ImportError as e:
    # Fallback to basic types if schemas fail to import
    print(f"Warning: Could not import marketing schemas: {e}")
    MarketingCampaignCreate = Dict[str, Any]
    MarketingCampaignResponse = Dict[str, Any]
    CustomerSegmentCreate = Dict[str, Any]
    CustomerSegmentResponse = Dict[str, Any]
    CommunicationPreferenceResponse = Dict[str, Any]
    CommunicationPreferenceUpdate = Dict[str, Any]
    CampaignStatsResponse = Dict[str, Any]
    MarketingAnalyticsResponse = Dict[str, Any]
    DeliveryTrackingResponse = Dict[str, Any]
    BulkMessageRequest = Dict[str, Any]
    SegmentCustomersRequest = Dict[str, Any]

router = APIRouter(prefix="/marketing", tags=["marketing"])


# Campaign Management Endpoints
@router.post("/campaigns")
async def create_campaign(
    campaign_data: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new marketing campaign"""
    
    marketing_service = MarketingService(db)
    
    try:
        campaign = marketing_service.create_campaign(
            tenant_id=str(current_user.tenant_id),
            name=campaign_data.get("name"),
            message=campaign_data.get("message"),
            campaign_type=CampaignType(campaign_data.get("campaign_type", "email")),
            customer_filter=campaign_data.get("customer_filter", {}),
            subject=campaign_data.get("subject"),
            scheduled_at=campaign_data.get("scheduled_at"),
            send_immediately=campaign_data.get("send_immediately", True)
        )
        
        return {
            "id": str(campaign.id),
            "name": campaign.name,
            "status": campaign.status.value,
            "campaign_type": campaign.campaign_type.value,
            "target_customer_count": campaign.target_customer_count,
            "created_at": campaign.created_at.isoformat()
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create campaign: {str(e)}"
        )


@router.get("/campaigns")
async def list_campaigns(
    status_filter: Optional[str] = Query(None, alias="status"),
    campaign_type: Optional[str] = Query(None, alias="type"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List marketing campaigns"""
    
    marketing_service = MarketingService(db)
    
    # Convert string parameters to enums if provided
    status_enum = None
    if status_filter:
        try:
            status_enum = CampaignStatus(status_filter)
        except ValueError:
            pass
    
    type_enum = None
    if campaign_type:
        try:
            type_enum = CampaignType(campaign_type)
        except ValueError:
            pass
    
    campaigns = marketing_service.list_campaigns(
        tenant_id=str(current_user.tenant_id),
        status=status_enum,
        campaign_type=type_enum,
        limit=limit,
        offset=offset
    )
    
    return {
        "campaigns": [
            {
                "id": str(campaign.id),
                "name": campaign.name,
                "status": campaign.status.value,
                "campaign_type": campaign.campaign_type.value,
                "target_customer_count": campaign.target_customer_count,
                "sent_count": campaign.sent_count,
                "delivered_count": campaign.delivered_count,
                "failed_count": campaign.failed_count,
                "success_rate": campaign.success_rate,
                "created_at": campaign.created_at.isoformat(),
                "started_at": campaign.started_at.isoformat() if campaign.started_at else None,
                "completed_at": campaign.completed_at.isoformat() if campaign.completed_at else None
            }
            for campaign in campaigns
        ]
    }


@router.get("/campaigns/{campaign_id}")
async def get_campaign(
    campaign_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get campaign by ID"""
    
    marketing_service = MarketingService(db)
    
    campaign = marketing_service.get_campaign(
        tenant_id=str(current_user.tenant_id),
        campaign_id=str(campaign_id)
    )
    
    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found"
        )
    
    return {
        "id": str(campaign.id),
        "name": campaign.name,
        "message": campaign.message,
        "subject": campaign.subject,
        "status": campaign.status.value,
        "campaign_type": campaign.campaign_type.value,
        "target_customer_count": campaign.target_customer_count,
        "sent_count": campaign.sent_count,
        "delivered_count": campaign.delivered_count,
        "failed_count": campaign.failed_count,
        "success_rate": campaign.success_rate,
        "customer_filter": campaign.customer_filter,
        "scheduled_at": campaign.scheduled_at.isoformat() if campaign.scheduled_at else None,
        "created_at": campaign.created_at.isoformat(),
        "started_at": campaign.started_at.isoformat() if campaign.started_at else None,
        "completed_at": campaign.completed_at.isoformat() if campaign.completed_at else None
    }


@router.post("/campaigns/{campaign_id}/start")
async def start_campaign(
    campaign_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Start a marketing campaign"""
    
    marketing_service = MarketingService(db)
    
    success = marketing_service.start_campaign(
        tenant_id=str(current_user.tenant_id),
        campaign_id=str(campaign_id)
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot start campaign. Check campaign status."
        )
    
    return {"message": "Campaign started successfully", "campaign_id": str(campaign_id)}


@router.post("/campaigns/{campaign_id}/cancel")
async def cancel_campaign(
    campaign_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Cancel a marketing campaign"""
    
    marketing_service = MarketingService(db)
    
    success = marketing_service.cancel_campaign(
        tenant_id=str(current_user.tenant_id),
        campaign_id=str(campaign_id)
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot cancel campaign. Check campaign status."
        )
    
    return {"message": "Campaign cancelled successfully", "campaign_id": str(campaign_id)}


@router.get("/campaigns/{campaign_id}/stats")
async def get_campaign_stats(
    campaign_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get campaign statistics"""
    
    marketing_service = MarketingService(db)
    
    stats = marketing_service.get_campaign_stats(
        tenant_id=str(current_user.tenant_id),
        campaign_id=str(campaign_id)
    )
    
    if not stats:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found"
        )
    
    return stats


# Customer Segmentation Endpoints
@router.post("/segments")
async def create_segment(
    segment_data: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a customer segment"""
    
    marketing_service = MarketingService(db)
    
    try:
        segmentation_type = SegmentationType.MANUAL
        if segment_data.get("segmentation_type"):
            segmentation_type = SegmentationType(segment_data["segmentation_type"])
        
        segment = marketing_service.create_segment(
            tenant_id=str(current_user.tenant_id),
            name=segment_data.get("name"),
            description=segment_data.get("description"),
            segmentation_type=segmentation_type,
            filter_criteria=segment_data.get("filter_criteria", {})
        )
        
        return {
            "id": str(segment.id),
            "name": segment.name,
            "description": segment.description,
            "segmentation_type": segment.segmentation_type.value,
            "customer_count": segment.customer_count,
            "created_at": segment.created_at.isoformat()
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create segment: {str(e)}"
        )


@router.get("/segments")
async def list_segments(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List customer segments"""
    
    marketing_service = MarketingService(db)
    
    segments = marketing_service.list_segments(
        tenant_id=str(current_user.tenant_id)
    )
    
    return {
        "segments": [
            {
                "id": str(segment.id),
                "name": segment.name,
                "description": segment.description,
                "segmentation_type": segment.segmentation_type.value,
                "customer_count": segment.customer_count,
                "last_updated_at": segment.last_updated_at.isoformat(),
                "created_at": segment.created_at.isoformat()
            }
            for segment in segments
        ]
    }


@router.get("/segments/{segment_id}")
async def get_segment(
    segment_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get segment by ID"""
    
    marketing_service = MarketingService(db)
    
    segment = marketing_service.get_segment(
        tenant_id=str(current_user.tenant_id),
        segment_id=str(segment_id)
    )
    
    if not segment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Segment not found"
        )
    
    return {
        "id": str(segment.id),
        "name": segment.name,
        "description": segment.description,
        "segmentation_type": segment.segmentation_type.value,
        "filter_criteria": segment.filter_criteria,
        "customer_count": segment.customer_count,
        "last_updated_at": segment.last_updated_at.isoformat(),
        "created_at": segment.created_at.isoformat()
    }


# Analytics and Reporting Endpoints
@router.get("/analytics")
async def get_marketing_analytics(
    days: int = Query(30, ge=1, le=365),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get marketing analytics"""
    
    marketing_service = MarketingService(db)
    
    analytics = marketing_service.get_marketing_analytics(
        tenant_id=str(current_user.tenant_id),
        days=days
    )
    
    return analytics


@router.get("/delivery-tracking")
async def get_delivery_tracking(
    campaign_id: Optional[UUID] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get delivery tracking information"""
    
    marketing_service = MarketingService(db)
    
    tracking_data = marketing_service.get_delivery_tracking(
        tenant_id=str(current_user.tenant_id),
        campaign_id=str(campaign_id) if campaign_id else None,
        limit=limit,
        offset=offset
    )
    
    return {"tracking_data": tracking_data}


# Bulk Messaging Endpoints
@router.post("/bulk-message")
async def send_bulk_message(
    message_data: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Send bulk message to customers"""
    
    marketing_service = MarketingService(db)
    
    try:
        # Create a campaign for the bulk message
        campaign = marketing_service.create_campaign(
            tenant_id=str(current_user.tenant_id),
            name=f"Bulk Message - {datetime.utcnow().strftime('%Y-%m-%d %H:%M')}",
            message=message_data.get("message"),
            campaign_type=CampaignType(message_data.get("campaign_type", "sms")),
            customer_filter={"customer_ids": message_data.get("customer_ids", [])},
            subject=message_data.get("subject"),
            send_immediately=True
        )
        
        # Start the campaign immediately
        success = marketing_service.start_campaign(
            tenant_id=str(current_user.tenant_id),
            campaign_id=str(campaign.id)
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to send bulk message"
            )
        
        return {
            "message": "Bulk message sent successfully",
            "campaign_id": str(campaign.id),
            "target_count": campaign.target_customer_count
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to send bulk message: {str(e)}"
        )


# Communication Preferences Endpoints
@router.get("/preferences/{customer_id}")
async def get_communication_preferences(
    customer_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get customer communication preferences"""
    
    marketing_service = MarketingService(db)
    
    preferences = marketing_service.get_communication_preferences(
        tenant_id=str(current_user.tenant_id),
        customer_id=str(customer_id)
    )
    
    if not preferences:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Communication preferences not found"
        )
    
    return {
        "id": str(preferences.id),
        "customer_id": str(preferences.customer_id),
        "email_enabled": preferences.email_enabled,
        "email_marketing": preferences.email_marketing,
        "email_invoices": preferences.email_invoices,
        "email_reminders": preferences.email_reminders,
        "sms_enabled": preferences.sms_enabled,
        "sms_marketing": preferences.sms_marketing,
        "sms_invoices": preferences.sms_invoices,
        "sms_reminders": preferences.sms_reminders,
        "preferred_contact_time": preferences.preferred_contact_time,
        "timezone": preferences.timezone,
        "opted_out_at": preferences.opted_out_at.isoformat() if preferences.opted_out_at else None,
        "opt_out_reason": preferences.opt_out_reason,
        "created_at": preferences.created_at.isoformat(),
        "updated_at": preferences.updated_at.isoformat()
    }


@router.put("/preferences/{customer_id}")
async def update_communication_preferences(
    customer_id: UUID,
    preferences_data: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update customer communication preferences"""
    
    marketing_service = MarketingService(db)
    
    try:
        preferences = marketing_service.create_or_update_preferences(
            tenant_id=str(current_user.tenant_id),
            customer_id=str(customer_id),
            preferences=preferences_data
        )
        
        return {
            "id": str(preferences.id),
            "customer_id": str(preferences.customer_id),
            "email_enabled": preferences.email_enabled,
            "email_marketing": preferences.email_marketing,
            "sms_enabled": preferences.sms_enabled,
            "sms_marketing": preferences.sms_marketing,
            "updated_at": preferences.updated_at.isoformat()
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to update preferences: {str(e)}"
        )


@router.post("/preferences/{customer_id}/opt-out")
async def opt_out_customer(
    customer_id: UUID,
    reason: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Opt out customer from all communications"""
    
    marketing_service = MarketingService(db)
    
    success = marketing_service.opt_out_customer(
        tenant_id=str(current_user.tenant_id),
        customer_id=str(customer_id),
        reason=reason
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to opt out customer"
        )
    
    return {"message": "Customer opted out successfully"}


@router.post("/preferences/{customer_id}/opt-in")
async def opt_in_customer(
    customer_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Opt in customer to all communications"""
    
    marketing_service = MarketingService(db)
    
    success = marketing_service.opt_in_customer(
        tenant_id=str(current_user.tenant_id),
        customer_id=str(customer_id)
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to opt in customer"
        )
    
    return {"message": "Customer opted in successfully"}