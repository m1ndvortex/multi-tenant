"""
Analytics and monitoring API endpoints for Super Admin
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import logging

from ..core.database import get_db
from ..core.auth import get_super_admin_user
from ..services.analytics_service import AnalyticsService
from ..services.monitoring_service import MonitoringService
from ..schemas.analytics import (
    AnalyticsRequest, PlatformAnalyticsResponse, UserActivityResponse,
    SystemHealthResponse, APIErrorLogResponse, APIErrorLogRequest,
    HeartbeatRequest, HeartbeatResponse, CeleryMonitoringResponse,
    TimeRange
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/super-admin/analytics", tags=["Super Admin - Analytics & Monitoring"])


@router.get("/platform", response_model=PlatformAnalyticsResponse)
async def get_platform_analytics(
    time_range: TimeRange = Query(TimeRange.LAST_30_DAYS, description="Time range for analytics"),
    start_date: Optional[datetime] = Query(None, description="Start date for custom range"),
    end_date: Optional[datetime] = Query(None, description="End date for custom range"),
    current_user: dict = Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get comprehensive platform analytics including signups, subscriptions, and MRR
    """
    try:
        analytics_service = AnalyticsService(db)
        analytics_data = analytics_service.get_platform_analytics(
            time_range=time_range,
            start_date=start_date,
            end_date=end_date
        )
        
        return PlatformAnalyticsResponse(**analytics_data)
        
    except Exception as e:
        logger.error(f"Failed to get platform analytics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve platform analytics: {str(e)}"
        )


@router.get("/user-activity", response_model=UserActivityResponse)
async def get_user_activity(
    current_user: dict = Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get real-time user activity tracking with Redis heartbeat data
    """
    try:
        analytics_service = AnalyticsService(db)
        activity_data = analytics_service.get_user_activity()
        
        return UserActivityResponse(**activity_data)
        
    except Exception as e:
        logger.error(f"Failed to get user activity: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve user activity: {str(e)}"
        )


@router.post("/heartbeat", response_model=HeartbeatResponse)
async def record_heartbeat(
    heartbeat_data: HeartbeatRequest,
    db: Session = Depends(get_db)
):
    """
    Record user heartbeat for activity tracking (called by frontend)
    """
    try:
        analytics_service = AnalyticsService(db)
        success = analytics_service.record_user_heartbeat(
            user_id=heartbeat_data.user_id,
            tenant_id=heartbeat_data.tenant_id,
            session_id=heartbeat_data.session_id,
            page=heartbeat_data.page
        )
        
        return HeartbeatResponse(
            success=success,
            next_heartbeat_in=30,  # 30 seconds
            server_time=datetime.now()
        )
        
    except Exception as e:
        logger.error(f"Failed to record heartbeat: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to record heartbeat: {str(e)}"
        )


@router.get("/system-health", response_model=SystemHealthResponse)
async def get_system_health(
    current_user: dict = Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get comprehensive system health monitoring including CPU, RAM, database, and Celery
    """
    try:
        monitoring_service = MonitoringService(db)
        health_data = monitoring_service.get_system_health()
        
        return SystemHealthResponse(**health_data)
        
    except Exception as e:
        logger.error(f"Failed to get system health: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve system health: {str(e)}"
        )


@router.get("/celery-monitoring", response_model=CeleryMonitoringResponse)
async def get_celery_monitoring(
    current_user: dict = Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get detailed Celery task and worker monitoring information
    """
    try:
        monitoring_service = MonitoringService(db)
        celery_data = monitoring_service.get_celery_monitoring()
        
        return CeleryMonitoringResponse(**celery_data)
        
    except Exception as e:
        logger.error(f"Failed to get Celery monitoring data: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve Celery monitoring data: {str(e)}"
        )


@router.get("/error-logs", response_model=APIErrorLogResponse)
async def get_api_error_logs(
    time_range: TimeRange = Query(TimeRange.LAST_24_HOURS, description="Time range for error logs"),
    start_date: Optional[datetime] = Query(None, description="Start date for custom range"),
    end_date: Optional[datetime] = Query(None, description="End date for custom range"),
    tenant_id: Optional[str] = Query(None, description="Filter by specific tenant"),
    endpoint: Optional[str] = Query(None, description="Filter by specific endpoint"),
    error_type: Optional[str] = Query(None, description="Filter by error type"),
    severity: Optional[str] = Query(None, description="Filter by severity level"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of errors to return"),
    offset: int = Query(0, ge=0, description="Number of errors to skip"),
    current_user: dict = Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get API error logs with filtering and pagination
    """
    try:
        analytics_service = AnalyticsService(db)
        error_data = analytics_service.get_api_error_logs(
            time_range=time_range,
            start_date=start_date,
            end_date=end_date,
            tenant_id=tenant_id,
            endpoint=endpoint,
            error_type=error_type,
            severity=severity,
            limit=limit,
            offset=offset
        )
        
        return APIErrorLogResponse(**error_data)
        
    except Exception as e:
        logger.error(f"Failed to get API error logs: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve API error logs: {str(e)}"
        )


@router.get("/metrics/summary")
async def get_metrics_summary(
    current_user: dict = Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get a summary of key platform metrics for dashboard widgets
    """
    try:
        analytics_service = AnalyticsService(db)
        monitoring_service = MonitoringService(db)
        
        # Get basic analytics
        analytics_data = analytics_service.get_platform_analytics(TimeRange.LAST_30_DAYS)
        
        # Get system health
        health_data = monitoring_service.get_system_health()
        
        # Get user activity
        activity_data = analytics_service.get_user_activity()
        
        summary = {
            "platform": {
                "total_tenants": analytics_data["total_signups"],
                "active_subscriptions": analytics_data["total_active_subscriptions"],
                "mrr": analytics_data["monthly_recurring_revenue"],
                "growth_rate": analytics_data["signup_growth_rate"]
            },
            "system": {
                "status": health_data["status"],
                "cpu_usage": health_data["cpu_usage_percent"],
                "memory_usage": health_data["memory_usage_percent"],
                "active_users": activity_data["total_active_users"]
            },
            "activity": {
                "active_users": activity_data["total_active_users"],
                "peak_users": activity_data["peak_concurrent_users"],
                "active_tenants": len(activity_data["active_users_by_tenant"])
            }
        }
        
        return summary
        
    except Exception as e:
        logger.error(f"Failed to get metrics summary: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve metrics summary: {str(e)}"
        )


@router.get("/trends/signups")
async def get_signup_trends(
    days: int = Query(30, ge=1, le=365, description="Number of days for trend data"),
    current_user: dict = Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get signup trend data for charts
    """
    try:
        analytics_service = AnalyticsService(db)
        
        # Calculate time range
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        analytics_data = analytics_service.get_platform_analytics(
            time_range=TimeRange.CUSTOM,
            start_date=start_date,
            end_date=end_date
        )
        
        return {
            "trend_data": analytics_data["signup_trend"],
            "total_signups": analytics_data["total_signups"],
            "period": f"{days} days"
        }
        
    except Exception as e:
        logger.error(f"Failed to get signup trends: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve signup trends: {str(e)}"
        )


@router.get("/trends/revenue")
async def get_revenue_trends(
    days: int = Query(30, ge=1, le=365, description="Number of days for trend data"),
    current_user: dict = Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get revenue trend data for charts
    """
    try:
        from datetime import timedelta
        
        analytics_service = AnalyticsService(db)
        
        # Calculate time range
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        analytics_data = analytics_service.get_platform_analytics(
            time_range=TimeRange.CUSTOM,
            start_date=start_date,
            end_date=end_date
        )
        
        return {
            "trend_data": analytics_data["revenue_trend"],
            "current_mrr": analytics_data["monthly_recurring_revenue"],
            "mrr_growth": analytics_data["mrr_growth_rate"],
            "period": f"{days} days"
        }
        
    except Exception as e:
        logger.error(f"Failed to get revenue trends: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve revenue trends: {str(e)}"
        )


@router.get("/charts/user-growth")
async def get_user_growth_charts(
    aggregation: str = Query("daily", regex="^(daily|weekly|monthly)$", description="Aggregation type: daily, weekly, or monthly"),
    days: int = Query(30, ge=1, le=365, description="Number of days for trend data"),
    current_user: dict = Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get user growth trends over time with daily, weekly, monthly aggregations
    """
    try:
        analytics_service = AnalyticsService(db)
        
        # Calculate time range
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        growth_data = analytics_service.get_user_growth_trends(
            start_date=start_date,
            end_date=end_date,
            aggregation=aggregation
        )
        
        return {
            "growth_data": growth_data["trend_data"],
            "total_users": growth_data["total_users"],
            "growth_rate": growth_data["growth_rate"],
            "aggregation": aggregation,
            "period": f"{days} days",
            "generated_at": datetime.now()
        }
        
    except Exception as e:
        logger.error(f"Failed to get user growth charts: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve user growth charts: {str(e)}"
        )


@router.get("/charts/revenue-analysis")
async def get_revenue_analysis_charts(
    aggregation: str = Query("daily", regex="^(daily|weekly|monthly)$", description="Aggregation type: daily, weekly, or monthly"),
    days: int = Query(30, ge=1, le=365, description="Number of days for trend data"),
    current_user: dict = Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get revenue trend analysis with MRR calculations and growth metrics
    """
    try:
        analytics_service = AnalyticsService(db)
        
        # Calculate time range
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        revenue_analysis = analytics_service.get_revenue_analysis_trends(
            start_date=start_date,
            end_date=end_date,
            aggregation=aggregation
        )
        
        return {
            "revenue_data": revenue_analysis["trend_data"],
            "mrr_data": revenue_analysis["mrr_trend"],
            "growth_metrics": revenue_analysis["growth_metrics"],
            "aggregation": aggregation,
            "period": f"{days} days",
            "generated_at": datetime.now()
        }
        
    except Exception as e:
        logger.error(f"Failed to get revenue analysis charts: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve revenue analysis charts: {str(e)}"
        )


@router.get("/charts/invoice-volume")
async def get_invoice_volume_charts(
    aggregation: str = Query("daily", regex="^(daily|weekly|monthly)$", description="Aggregation type: daily, weekly, or monthly"),
    days: int = Query(30, ge=1, le=365, description="Number of days for trend data"),
    current_user: dict = Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get platform-wide invoice creation volume tracking and analytics
    """
    try:
        analytics_service = AnalyticsService(db)
        
        # Calculate time range
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        invoice_analytics = analytics_service.get_invoice_volume_trends(
            start_date=start_date,
            end_date=end_date,
            aggregation=aggregation
        )
        
        return {
            "volume_data": invoice_analytics["trend_data"],
            "total_invoices": invoice_analytics["total_invoices"],
            "average_per_day": invoice_analytics["average_per_day"],
            "growth_rate": invoice_analytics["growth_rate"],
            "by_type": invoice_analytics["by_invoice_type"],
            "by_tenant": invoice_analytics["top_tenants"],
            "aggregation": aggregation,
            "period": f"{days} days",
            "generated_at": datetime.now()
        }
        
    except Exception as e:
        logger.error(f"Failed to get invoice volume charts: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve invoice volume charts: {str(e)}"
        )


@router.get("/charts/subscription-conversion")
async def get_subscription_conversion_charts(
    aggregation: str = Query("daily", regex="^(daily|weekly|monthly)$", description="Aggregation type: daily, weekly, or monthly"),
    days: int = Query(30, ge=1, le=365, description="Number of days for trend data"),
    current_user: dict = Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get subscription conversion tracking (Free to Pro upgrades)
    """
    try:
        analytics_service = AnalyticsService(db)
        
        # Calculate time range
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        conversion_analytics = analytics_service.get_subscription_conversion_trends(
            start_date=start_date,
            end_date=end_date,
            aggregation=aggregation
        )
        
        return {
            "conversion_data": conversion_analytics["trend_data"],
            "total_conversions": conversion_analytics["total_conversions"],
            "conversion_rate": conversion_analytics["conversion_rate"],
            "average_time_to_convert": conversion_analytics["average_time_to_convert"],
            "conversion_funnel": conversion_analytics["conversion_funnel"],
            "revenue_impact": conversion_analytics["revenue_impact"],
            "aggregation": aggregation,
            "period": f"{days} days",
            "generated_at": datetime.now()
        }
        
    except Exception as e:
        logger.error(f"Failed to get subscription conversion charts: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve subscription conversion charts: {str(e)}"
        )