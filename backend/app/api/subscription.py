"""
Subscription Management API
Endpoints for managing subscription tiers, limits, and feature access
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime

from ..core.database import get_db
from ..core.auth import get_current_user
from ..core.permissions import check_resource_permission
from ..models.user import User
from ..services.subscription_service import SubscriptionService
from ..schemas.subscription import (
    SubscriptionInfoResponse,
    ResourceLimitCheckRequest,
    ResourceLimitCheckResponse,
    FeatureAccessRequest,
    FeatureAccessResponse,
    SubscriptionUpgradeRequest,
    SubscriptionUpgradeResponse,
    SubscriptionWarningsResponse,
    SubscriptionValidationResponse,
    UsageStatsResponse,
    SubscriptionLimitsResponse,
    BulkResourceCheckRequest,
    BulkResourceCheckResponse,
    SubscriptionMetricsResponse,
    ResourceTypeEnum,
    FeatureEnum
)

router = APIRouter(prefix="/api/subscription", tags=["subscription"])


@router.get("/info", response_model=SubscriptionInfoResponse)
async def get_subscription_info(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get comprehensive subscription information for current tenant
    
    Returns subscription type, limits, usage, and feature access
    """
    try:
        subscription_service = SubscriptionService(db)
        info = subscription_service.get_tenant_subscription_info(str(current_user.tenant_id))
        return SubscriptionInfoResponse(**info)
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get subscription info: {str(e)}"
        )


@router.post("/check-limit", response_model=ResourceLimitCheckResponse)
async def check_resource_limit(
    request: ResourceLimitCheckRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Check if tenant can create additional resources
    
    Validates against subscription limits before resource creation
    """
    try:
        subscription_service = SubscriptionService(db)
        result = subscription_service.check_resource_limit(
            str(current_user.tenant_id),
            request.resource_type.value,
            request.increment
        )
        return ResourceLimitCheckResponse(**result)
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to check resource limit: {str(e)}"
        )


@router.post("/check-feature", response_model=FeatureAccessResponse)
async def check_feature_access(
    request: FeatureAccessRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Check if tenant has access to a specific feature
    
    Validates feature access based on subscription tier
    """
    try:
        subscription_service = SubscriptionService(db)
        result = subscription_service.check_feature_access(
            str(current_user.tenant_id),
            request.feature.value
        )
        return FeatureAccessResponse(**result)
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to check feature access: {str(e)}"
        )


@router.get("/warnings", response_model=SubscriptionWarningsResponse)
async def get_subscription_warnings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get subscription-related warnings for current tenant
    
    Returns warnings about expiry, usage limits, etc.
    """
    try:
        subscription_service = SubscriptionService(db)
        warnings = subscription_service.get_subscription_warnings(str(current_user.tenant_id))
        
        has_critical = any(w['severity'] == 'high' for w in warnings)
        
        return SubscriptionWarningsResponse(
            warnings=warnings,
            total_warnings=len(warnings),
            has_critical_warnings=has_critical
        )
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get subscription warnings: {str(e)}"
        )


@router.get("/validate", response_model=SubscriptionValidationResponse)
async def validate_subscription(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Validate current subscription status
    
    Checks if subscription is active and valid
    """
    try:
        subscription_service = SubscriptionService(db)
        result = subscription_service.validate_subscription_status(str(current_user.tenant_id))
        return SubscriptionValidationResponse(**result)
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to validate subscription: {str(e)}"
        )


@router.get("/usage", response_model=UsageStatsResponse)
async def get_usage_stats(
    period: str = Query(default="current_month", description="Usage period"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get detailed usage statistics for current tenant
    
    Returns current usage, limits, and usage percentages
    """
    try:
        subscription_service = SubscriptionService(db)
        info = subscription_service.get_tenant_subscription_info(str(current_user.tenant_id))
        
        return UsageStatsResponse(
            tenant_id=str(current_user.tenant_id),
            period=period,
            usage=info['usage'],
            limits=info['limits'],
            usage_percentages=info['usage_percentages'],
            last_updated=datetime.now().isoformat()
        )
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get usage stats: {str(e)}"
        )


@router.get("/limits", response_model=SubscriptionLimitsResponse)
async def get_subscription_limits(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get subscription limits and features for current tenant
    
    Returns limits and feature access for current subscription tier
    """
    try:
        subscription_service = SubscriptionService(db)
        info = subscription_service.get_tenant_subscription_info(str(current_user.tenant_id))
        
        return SubscriptionLimitsResponse(
            subscription_type=info['subscription_type'],
            limits=info['limits'],
            features=info['features']
        )
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get subscription limits: {str(e)}"
        )


@router.post("/check-bulk", response_model=BulkResourceCheckResponse)
async def check_bulk_resource_limits(
    request: BulkResourceCheckRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Check multiple resource limits in a single request
    
    Useful for validating complex operations that affect multiple resources
    """
    try:
        subscription_service = SubscriptionService(db)
        results = {}
        all_allowed = True
        blocked_resources = []
        
        for resource_check in request.resources:
            result = subscription_service.check_resource_limit(
                str(current_user.tenant_id),
                resource_check.resource_type.value,
                resource_check.increment
            )
            
            results[resource_check.resource_type.value] = ResourceLimitCheckResponse(**result)
            
            if not result['allowed']:
                all_allowed = False
                blocked_resources.append(resource_check.resource_type.value)
        
        return BulkResourceCheckResponse(
            results=results,
            all_allowed=all_allowed,
            blocked_resources=blocked_resources
        )
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to check bulk resource limits: {str(e)}"
        )


# Admin-only endpoints for subscription management
@router.post("/upgrade", response_model=SubscriptionUpgradeResponse)
async def upgrade_subscription(
    request: SubscriptionUpgradeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Upgrade tenant subscription (Admin only)
    
    Upgrades subscription tier and updates limits immediately
    """
    # Check if user has permission to manage subscriptions
    if not check_resource_permission(current_user, "settings", "manage"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to upgrade subscription"
        )
    
    try:
        subscription_service = SubscriptionService(db)
        result = subscription_service.upgrade_subscription(
            str(current_user.tenant_id),
            request.new_subscription,
            request.duration_months
        )
        return SubscriptionUpgradeResponse(**result)
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upgrade subscription: {str(e)}"
        )


# Utility endpoints for quick checks
@router.get("/can-create/{resource_type}")
async def can_create_resource(
    resource_type: ResourceTypeEnum,
    count: int = Query(default=1, ge=1, description="Number of resources to create"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Quick check if tenant can create specific resources
    
    Returns simple boolean response for UI components
    """
    try:
        subscription_service = SubscriptionService(db)
        result = subscription_service.check_resource_limit(
            str(current_user.tenant_id),
            resource_type.value,
            count
        )
        
        return {
            "can_create": result['allowed'],
            "reason": result['reason'],
            "remaining": result['remaining']
        }
    
    except Exception as e:
        return {
            "can_create": False,
            "reason": "error",
            "remaining": 0
        }


@router.get("/has-feature/{feature}")
async def has_feature_access(
    feature: FeatureEnum,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Quick check if tenant has access to specific feature
    
    Returns simple boolean response for UI components
    """
    try:
        subscription_service = SubscriptionService(db)
        result = subscription_service.check_feature_access(
            str(current_user.tenant_id),
            feature.value
        )
        
        return {
            "has_access": result['allowed'],
            "reason": result['reason'],
            "subscription_type": result['subscription_type']
        }
    
    except Exception as e:
        return {
            "has_access": False,
            "reason": "error",
            "subscription_type": "unknown"
        }