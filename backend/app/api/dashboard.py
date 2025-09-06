"""
Dashboard API endpoints for tenant dashboard analytics and business insights
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
import logging

from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.user import User
from app.services.dashboard_service import DashboardService
from app.schemas.dashboard import (
    DashboardResponse, DashboardRequest, DashboardSummary,
    BusinessInsightsResponse, InsightsRequest,
    AlertsResponse, AlertsRequest,
    QuickStats, SalesChartData, RecentActivity
)

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])
logger = logging.getLogger(__name__)


@router.get("/", response_model=DashboardResponse)
async def get_dashboard_data(
    request: DashboardRequest = Depends(),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get complete dashboard data with metrics, insights, alerts, and activities
    """
    try:
        dashboard_service = DashboardService(db)
        tenant_id = current_user.tenant_id
        
        # Get dashboard summary
        summary_data = dashboard_service.get_dashboard_summary(tenant_id)
        summary = DashboardSummary(**summary_data)
        
        # Get recent activities if requested
        recent_activities = []
        if request.include_activities:
            activities_data = dashboard_service.get_recent_activities(
                tenant_id, limit=request.activities_limit
            )
            recent_activities = [RecentActivity(**activity) for activity in activities_data]
        
        # Get business insights if requested
        business_insights = None
        if request.include_insights:
            insights_data = dashboard_service.get_business_insights(tenant_id)
            business_insights = BusinessInsightsResponse(**insights_data)
        
        # Get alerts if requested
        alerts = None
        if request.include_alerts:
            alerts_data = dashboard_service.get_alerts_and_notifications(tenant_id)
            alerts = AlertsResponse(**alerts_data)
        
        # Get quick stats
        quick_stats_data = dashboard_service.get_quick_stats(tenant_id)
        quick_stats = QuickStats(**quick_stats_data)
        
        # Get sales chart data
        sales_chart_data = dashboard_service.get_sales_chart_data(
            tenant_id, period_days=request.sales_chart_days
        )
        sales_chart = SalesChartData(**sales_chart_data)
        
        return DashboardResponse(
            summary=summary,
            recent_activities=recent_activities,
            business_insights=business_insights,
            alerts=alerts,
            quick_stats=quick_stats,
            sales_chart=sales_chart
        )
        
    except Exception as e:
        logger.error(f"Error getting dashboard data for tenant {current_user.tenant_id}: {e}")
        raise HTTPException(status_code=500, detail="خطا در دریافت اطلاعات داشبورد")


@router.get("/summary", response_model=DashboardSummary)
async def get_dashboard_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get dashboard summary with key metrics
    """
    try:
        dashboard_service = DashboardService(db)
        summary_data = dashboard_service.get_dashboard_summary(current_user.tenant_id)
        return DashboardSummary(**summary_data)
        
    except Exception as e:
        logger.error(f"Error getting dashboard summary for tenant {current_user.tenant_id}: {e}")
        raise HTTPException(status_code=500, detail="خطا در دریافت خلاصه داشبورد")


@router.get("/insights", response_model=BusinessInsightsResponse)
async def get_business_insights(
    request: InsightsRequest = Depends(),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get AI-driven business insights and recommendations
    """
    try:
        dashboard_service = DashboardService(db)
        insights_data = dashboard_service.get_business_insights(current_user.tenant_id)
        return BusinessInsightsResponse(**insights_data)
        
    except Exception as e:
        logger.error(f"Error getting business insights for tenant {current_user.tenant_id}: {e}")
        raise HTTPException(status_code=500, detail="خطا در دریافت تحلیل‌های کسب‌وکار")


@router.get("/alerts", response_model=AlertsResponse)
async def get_dashboard_alerts(
    request: AlertsRequest = Depends(),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get important alerts and notifications
    """
    try:
        dashboard_service = DashboardService(db)
        alerts_data = dashboard_service.get_alerts_and_notifications(current_user.tenant_id)
        return AlertsResponse(**alerts_data)
        
    except Exception as e:
        logger.error(f"Error getting dashboard alerts for tenant {current_user.tenant_id}: {e}")
        raise HTTPException(status_code=500, detail="خطا در دریافت هشدارها")


@router.get("/quick-stats", response_model=QuickStats)
async def get_quick_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get quick statistics for dashboard widgets
    """
    try:
        dashboard_service = DashboardService(db)
        stats_data = dashboard_service.get_quick_stats(current_user.tenant_id)
        return QuickStats(**stats_data)
        
    except Exception as e:
        logger.error(f"Error getting quick stats for tenant {current_user.tenant_id}: {e}")
        raise HTTPException(status_code=500, detail="خطا در دریافت آمار سریع")


@router.get("/sales-chart", response_model=SalesChartData)
async def get_sales_chart_data(
    period_days: int = Query(default=30, ge=7, le=365, description="Number of days for chart data"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get sales trend chart data
    """
    try:
        dashboard_service = DashboardService(db)
        chart_data = dashboard_service.get_sales_chart_data(
            current_user.tenant_id, period_days=period_days
        )
        return SalesChartData(**chart_data)
        
    except Exception as e:
        logger.error(f"Error getting sales chart data for tenant {current_user.tenant_id}: {e}")
        raise HTTPException(status_code=500, detail="خطا در دریافت نمودار فروش")


@router.get("/activities", response_model=List[RecentActivity])
async def get_recent_activities(
    limit: int = Query(default=10, ge=1, le=50, description="Number of activities to return"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get recent business activities
    """
    try:
        dashboard_service = DashboardService(db)
        activities_data = dashboard_service.get_recent_activities(
            current_user.tenant_id, limit=limit
        )
        return [RecentActivity(**activity) for activity in activities_data]
        
    except Exception as e:
        logger.error(f"Error getting recent activities for tenant {current_user.tenant_id}: {e}")
        raise HTTPException(status_code=500, detail="خطا در دریافت فعالیت‌های اخیر")


# Health check endpoint for dashboard service
@router.get("/health")
async def dashboard_health_check(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Health check for dashboard service
    """
    try:
        dashboard_service = DashboardService(db)
        
        # Test basic functionality
        quick_stats = dashboard_service.get_quick_stats(current_user.tenant_id)
        
        return {
            "status": "healthy",
            "service": "dashboard",
            "tenant_id": str(current_user.tenant_id),
            "timestamp": quick_stats['calculated_at'],
            "checks": {
                "database": "ok",
                "business_intelligence": "ok",
                "reports": "ok"
            }
        }
        
    except Exception as e:
        logger.error(f"Dashboard health check failed for tenant {current_user.tenant_id}: {e}")
        raise HTTPException(status_code=503, detail="Dashboard service unavailable")