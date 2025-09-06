"""
Super Admin Dashboard API endpoints for comprehensive platform overview
"""

from typing import Dict, Any, Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone
from pydantic import BaseModel
import logging
import json
import asyncio
from io import StringIO
import csv

from ..core.database import get_db
from ..core.auth import get_super_admin_user
from ..core.redis_client import redis_client
from ..models.user import User
from ..services.analytics_service import AnalyticsService
from ..services.monitoring_service import MonitoringService
from ..services.error_logging_service import ErrorLoggingService
from ..schemas.analytics import TimeRange
from ..schemas.super_admin import (
    SystemHealthResponse, CeleryMonitoringResponse, DatabaseMetricsResponse,
    SystemAlertsResponse, PerformanceMetricsResponse
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/super-admin/dashboard", tags=["Super Admin - Dashboard"])


class SuperAdminDashboardResponse(BaseModel):
    """Comprehensive Super Admin Dashboard Response"""
    # Platform Overview
    platform_metrics: Dict[str, Any]
    
    # Real-time Activity
    user_activity: Dict[str, Any]
    
    # System Health
    system_health: SystemHealthResponse
    
    # Analytics Charts
    analytics_charts: Dict[str, Any]
    
    # Recent Alerts
    recent_alerts: List[Dict[str, Any]]
    
    # Quick Actions Data
    quick_actions: Dict[str, Any]
    
    # Performance Summary
    performance_summary: Dict[str, Any]
    
    # Metadata
    generated_at: datetime
    refresh_interval: int = 30  # seconds
    
    class Config:
        from_attributes = True


class DashboardWidgetConfig(BaseModel):
    """Dashboard widget configuration"""
    widget_id: str
    widget_type: str
    position: Dict[str, int]  # x, y, width, height
    settings: Dict[str, Any]
    is_visible: bool = True


class DashboardPersonalization(BaseModel):
    """Dashboard personalization settings"""
    admin_user_id: str
    layout: List[DashboardWidgetConfig]
    theme: str = "light"
    refresh_interval: int = 30
    timezone: str = "UTC"

@router.get("/", response_model=SuperAdminDashboardResponse)
async def get_comprehensive_dashboard(
    time_range: TimeRange = Query(default=TimeRange.LAST_30_DAYS, description="Time range for analytics"),
    include_charts: bool = Query(default=True, description="Include analytics charts data"),
    include_alerts: bool = Query(default=True, description="Include recent alerts"),
    include_activity: bool = Query(default=True, description="Include real-time user activity"),
    current_user: User = Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get comprehensive Super Admin dashboard with all metrics, charts, and real-time data
    """
    try:
        # Initialize services
        analytics_service = AnalyticsService(db)
        monitoring_service = MonitoringService(db)
        error_service = ErrorLoggingService(db)
        
        # Get platform analytics
        platform_metrics = analytics_service.get_platform_analytics(time_range)
        
        # Get real-time user activity
        user_activity = {}
        if include_activity:
            user_activity = analytics_service.get_user_activity()
        
        # Get system health
        system_health_data = monitoring_service.get_system_health()
        system_health = SystemHealthResponse(**system_health_data)
        
        # Get analytics charts data
        analytics_charts = {}
        if include_charts:
            analytics_charts = await _get_analytics_charts_data(analytics_service, time_range)
        
        # Get recent alerts
        recent_alerts = []
        if include_alerts:
            alerts_data = monitoring_service.get_system_alerts()
            recent_alerts = (alerts_data.get("critical_alerts", []) + 
                           alerts_data.get("warning_alerts", []))[:10]  # Last 10 alerts
        
        # Get quick actions data
        quick_actions = await _get_quick_actions_data(db)
        
        # Get performance summary
        performance_summary = _get_performance_summary(system_health_data, platform_metrics)
        
        dashboard_response = SuperAdminDashboardResponse(
            platform_metrics=platform_metrics,
            user_activity=user_activity,
            system_health=system_health,
            analytics_charts=analytics_charts,
            recent_alerts=recent_alerts,
            quick_actions=quick_actions,
            performance_summary=performance_summary,
            generated_at=datetime.now(timezone.utc)
        )
        
        # Cache dashboard data for 30 seconds
        cache_key = f"super_admin_dashboard:{current_user.id}"
        redis_client.set(cache_key, dashboard_response.model_dump(), expire=30)
        
        return dashboard_response
        
    except Exception as e:
        logger.error(f"Failed to get comprehensive dashboard: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to load dashboard: {str(e)}")


@router.get("/real-time-updates")
async def get_real_time_dashboard_updates(
    current_user: User = Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get real-time dashboard updates for WebSocket or polling
    """
    try:
        analytics_service = AnalyticsService(db)
        monitoring_service = MonitoringService(db)
        
        # Get real-time metrics
        user_activity = analytics_service.get_user_activity()
        system_health = monitoring_service.get_system_health()
        
        # Get latest alerts (last 5 minutes)
        five_minutes_ago = datetime.now(timezone.utc) - timedelta(minutes=5)
        recent_alerts = monitoring_service.get_system_alerts()
        
        # Filter alerts from last 5 minutes
        latest_alerts = []
        for alert_list in [recent_alerts.get("critical_alerts", []), recent_alerts.get("warning_alerts", [])]:
            for alert in alert_list:
                alert_time = alert.get("timestamp")
                if isinstance(alert_time, str):
                    alert_time = datetime.fromisoformat(alert_time.replace('Z', '+00:00'))
                if alert_time and alert_time >= five_minutes_ago:
                    latest_alerts.append(alert)
        
        # Get quick metrics
        quick_metrics = {
            "active_users": user_activity.get("total_active_users", 0),
            "system_status": system_health.get("status", "unknown"),
            "cpu_usage": system_health.get("cpu_usage_percent", 0),
            "memory_usage": system_health.get("memory_usage_percent", 0),
            "error_rate": system_health.get("error_rate_percent", 0),
            "new_alerts_count": len(latest_alerts)
        }
        
        return {
            "user_activity": user_activity,
            "system_health": system_health,
            "latest_alerts": latest_alerts,
            "quick_metrics": quick_metrics,
            "last_updated": datetime.now(timezone.utc),
            "next_update_in": 30  # seconds
        }
        
    except Exception as e:
        logger.error(f"Failed to get real-time updates: {e}")
        raise HTTPException(status_code=500, detail="Failed to get real-time updates")
@router.get("/widgets/{widget_type}")
async def get_dashboard_widget_data(
    widget_type: str,
    time_range: TimeRange = Query(default=TimeRange.LAST_7_DAYS),
    current_user: User = Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get data for specific dashboard widget
    """
    try:
        analytics_service = AnalyticsService(db)
        monitoring_service = MonitoringService(db)
        
        if widget_type == "platform_overview":
            return analytics_service.get_platform_analytics(time_range)
        
        elif widget_type == "user_activity":
            return analytics_service.get_user_activity()
        
        elif widget_type == "system_health":
            return monitoring_service.get_system_health()
        
        elif widget_type == "revenue_chart":
            start_date = datetime.now(timezone.utc) - timedelta(days=30)
            end_date = datetime.now(timezone.utc)
            return analytics_service.get_revenue_analysis_trends(start_date, end_date, "daily")
        
        elif widget_type == "signup_trends":
            start_date = datetime.now(timezone.utc) - timedelta(days=30)
            end_date = datetime.now(timezone.utc)
            return analytics_service.get_user_growth_trends(start_date, end_date, "daily")
        
        elif widget_type == "celery_monitoring":
            return monitoring_service.get_celery_monitoring()
        
        elif widget_type == "database_metrics":
            return monitoring_service.get_database_metrics()
        
        elif widget_type == "system_alerts":
            return monitoring_service.get_system_alerts()
        
        else:
            raise HTTPException(status_code=404, detail=f"Widget type '{widget_type}' not found")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get widget data for {widget_type}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get widget data: {str(e)}")


@router.post("/personalization")
async def save_dashboard_personalization(
    personalization: DashboardPersonalization,
    current_user: User = Depends(get_super_admin_user)
):
    """
    Save dashboard personalization settings
    """
    try:
        # Store personalization in Redis
        personalization_key = f"dashboard_personalization:{current_user.id}"
        redis_client.set(personalization_key, personalization.model_dump(), expire=86400 * 30)  # 30 days
        
        return {
            "success": True,
            "message": "Dashboard personalization saved successfully",
            "saved_at": datetime.now(timezone.utc)
        }
        
    except Exception as e:
        logger.error(f"Failed to save dashboard personalization: {e}")
        raise HTTPException(status_code=500, detail="Failed to save personalization settings")


@router.get("/personalization")
async def get_dashboard_personalization(
    current_user: User = Depends(get_super_admin_user)
):
    """
    Get dashboard personalization settings
    """
    try:
        personalization_key = f"dashboard_personalization:{current_user.id}"
        personalization_data = redis_client.get(personalization_key)
        
        if personalization_data:
            return personalization_data
        
        # Return default personalization
        default_layout = [
            {
                "widget_id": "platform_overview",
                "widget_type": "metrics_card",
                "position": {"x": 0, "y": 0, "width": 12, "height": 4},
                "settings": {},
                "is_visible": True
            },
            {
                "widget_id": "user_activity",
                "widget_type": "activity_widget",
                "position": {"x": 0, "y": 4, "width": 6, "height": 6},
                "settings": {},
                "is_visible": True
            },
            {
                "widget_id": "system_health",
                "widget_type": "health_widget",
                "position": {"x": 6, "y": 4, "width": 6, "height": 6},
                "settings": {},
                "is_visible": True
            },
            {
                "widget_id": "revenue_chart",
                "widget_type": "chart_widget",
                "position": {"x": 0, "y": 10, "width": 8, "height": 6},
                "settings": {"chart_type": "line"},
                "is_visible": True
            },
            {
                "widget_id": "recent_alerts",
                "widget_type": "alerts_widget",
                "position": {"x": 8, "y": 10, "width": 4, "height": 6},
                "settings": {},
                "is_visible": True
            }
        ]
        
        return {
            "admin_user_id": current_user.id,
            "layout": default_layout,
            "theme": "light",
            "refresh_interval": 30,
            "timezone": "UTC"
        }
        
    except Exception as e:
        logger.error(f"Failed to get dashboard personalization: {e}")
        raise HTTPException(status_code=500, detail="Failed to get personalization settings")
@router.post("/quick-actions/tenant/{tenant_id}/suspend")
async def quick_suspend_tenant(
    tenant_id: str,
    reason: str = Query(..., description="Reason for suspension"),
    current_user: User = Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    """
    Quick action to suspend a tenant
    """
    try:
        from ..models.tenant import Tenant, TenantStatus
        
        tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
        if not tenant:
            raise HTTPException(status_code=404, detail="Tenant not found")
        
        tenant.status = TenantStatus.SUSPENDED
        tenant.notes = (tenant.notes or "") + f"\nSuspended by admin: {reason} ({datetime.now(timezone.utc)})"
        tenant.updated_at = datetime.now(timezone.utc)
        
        db.commit()
        
        logger.info(f"Super admin {current_user.id} suspended tenant {tenant_id}: {reason}")
        
        return {
            "success": True,
            "message": f"Tenant '{tenant.name}' suspended successfully",
            "tenant_id": tenant_id,
            "action": "suspend",
            "performed_at": datetime.now(timezone.utc)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to suspend tenant {tenant_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to suspend tenant")


@router.post("/quick-actions/tenant/{tenant_id}/activate")
async def quick_activate_tenant(
    tenant_id: str,
    current_user: User = Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    """
    Quick action to activate a tenant
    """
    try:
        from ..models.tenant import Tenant, TenantStatus
        
        tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
        if not tenant:
            raise HTTPException(status_code=404, detail="Tenant not found")
        
        tenant.status = TenantStatus.ACTIVE
        tenant.notes = (tenant.notes or "") + f"\nActivated by admin ({datetime.now(timezone.utc)})"
        tenant.updated_at = datetime.now(timezone.utc)
        
        db.commit()
        
        logger.info(f"Super admin {current_user.id} activated tenant {tenant_id}")
        
        return {
            "success": True,
            "message": f"Tenant '{tenant.name}' activated successfully",
            "tenant_id": tenant_id,
            "action": "activate",
            "performed_at": datetime.now(timezone.utc)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to activate tenant {tenant_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to activate tenant")


@router.get("/export/executive-report")
async def export_executive_dashboard_report(
    time_range: TimeRange = Query(default=TimeRange.LAST_30_DAYS),
    format: str = Query(default="csv", pattern="^(csv|json|pdf)$"),
    current_user: User = Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    """
    Export executive dashboard report for management
    """
    try:
        analytics_service = AnalyticsService(db)
        monitoring_service = MonitoringService(db)
        
        # Get comprehensive data
        platform_metrics = analytics_service.get_platform_analytics(time_range)
        system_health = monitoring_service.get_system_health()
        
        # Get trend data
        start_date = datetime.now(timezone.utc) - timedelta(days=30)
        end_date = datetime.now(timezone.utc)
        
        revenue_trends = analytics_service.get_revenue_analysis_trends(start_date, end_date, "daily")
        user_trends = analytics_service.get_user_growth_trends(start_date, end_date, "daily")
        
        report_data = {
            "report_title": "HesaabPlus Executive Dashboard Report",
            "generated_at": datetime.now(timezone.utc),
            "time_range": time_range.value,
            "platform_overview": {
                "total_signups": platform_metrics["total_signups"],
                "active_subscriptions": platform_metrics["total_active_subscriptions"],
                "monthly_recurring_revenue": platform_metrics["monthly_recurring_revenue"],
                "conversion_rate": platform_metrics["subscription_conversion_rate"],
                "growth_rate": platform_metrics["signup_growth_rate"]
            },
            "system_performance": {
                "system_status": system_health["status"],
                "uptime_hours": system_health["uptime_seconds"] / 3600,
                "average_response_time": system_health["average_response_time_ms"],
                "error_rate": system_health["error_rate_percent"],
                "active_users": analytics_service.get_user_activity()["total_active_users"]
            },
            "financial_metrics": {
                "current_mrr": revenue_trends["growth_metrics"]["current_mrr"],
                "mrr_growth_rate": revenue_trends["growth_metrics"]["mrr_growth_rate"],
                "total_revenue": revenue_trends["growth_metrics"]["total_revenue"]
            },
            "user_metrics": {
                "total_users": user_trends["total_users"],
                "user_growth_rate": user_trends["growth_rate"]
            }
        }
        
        if format == "json":
            return report_data
        
        elif format == "csv":
            # Create CSV report
            output = StringIO()
            writer = csv.writer(output)
            
            # Write headers and data
            writer.writerow(["HesaabPlus Executive Dashboard Report"])
            writer.writerow(["Generated At", report_data["generated_at"]])
            writer.writerow(["Time Range", report_data["time_range"]])
            writer.writerow([])
            
            # Platform Overview
            writer.writerow(["Platform Overview"])
            for key, value in report_data["platform_overview"].items():
                writer.writerow([key.replace("_", " ").title(), value])
            writer.writerow([])
            
            # System Performance
            writer.writerow(["System Performance"])
            for key, value in report_data["system_performance"].items():
                writer.writerow([key.replace("_", " ").title(), value])
            writer.writerow([])
            
            # Financial Metrics
            writer.writerow(["Financial Metrics"])
            for key, value in report_data["financial_metrics"].items():
                writer.writerow([key.replace("_", " ").title(), value])
            
            output.seek(0)
            
            return StreamingResponse(
                iter([output.getvalue()]),
                media_type="text/csv",
                headers={"Content-Disposition": f"attachment; filename=executive_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"}
            )
        
        else:  # PDF format would require additional PDF generation library
            raise HTTPException(status_code=501, detail="PDF export not implemented yet")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to export executive report: {e}")
        raise HTTPException(status_code=500, detail="Failed to export report")
# Helper functions

async def _get_analytics_charts_data(analytics_service: AnalyticsService, time_range: TimeRange) -> Dict[str, Any]:
    """Get analytics charts data"""
    try:
        start_date = datetime.now(timezone.utc) - timedelta(days=30)
        end_date = datetime.now(timezone.utc)
        
        # Get trend data
        revenue_trends = analytics_service.get_revenue_analysis_trends(start_date, end_date, "daily")
        user_trends = analytics_service.get_user_growth_trends(start_date, end_date, "daily")
        invoice_trends = analytics_service.get_invoice_volume_trends(start_date, end_date, "daily")
        
        # Calculate total value from invoice trend data
        total_value = sum(item.get("total_value", 0) for item in invoice_trends["trend_data"])
        
        return {
            "revenue_analysis_trends": {
                "data": revenue_trends["trend_data"],
                "growth_rate": revenue_trends["growth_metrics"]["mrr_growth_rate"],
                "total_revenue": revenue_trends["growth_metrics"]["total_revenue"]
            },
            "user_growth_trends": {
                "data": user_trends["trend_data"],
                "growth_rate": user_trends["growth_rate"],
                "total_users": user_trends["total_users"]
            },
            "invoice_volume_trends": {
                "data": invoice_trends["trend_data"],
                "total_invoices": invoice_trends["total_invoices"],
                "total_value": round(total_value, 2)
            }
        }
        
    except Exception as e:
        logger.error(f"Failed to get analytics charts data: {e}")
        return {}


async def _get_quick_actions_data(db: Session) -> Dict[str, Any]:
    """Get data for quick actions"""
    try:
        from ..models.tenant import Tenant, TenantStatus, SubscriptionType
        
        # Get pending payment tenants
        pending_payments = db.query(Tenant).filter(
            Tenant.subscription_type == SubscriptionType.PRO,
            Tenant.status == TenantStatus.PENDING
        ).count()
        
        # Get suspended tenants
        suspended_tenants = db.query(Tenant).filter(
            Tenant.status == TenantStatus.SUSPENDED
        ).count()
        
        # Get expired subscriptions
        now = datetime.now(timezone.utc)
        expired_subscriptions = db.query(Tenant).filter(
            Tenant.subscription_expires_at < now,
            Tenant.subscription_type == SubscriptionType.PRO
        ).count()
        
        return {
            "pending_payments_count": pending_payments,
            "suspended_tenants_count": suspended_tenants,
            "expired_subscriptions_count": expired_subscriptions,
            "actions_available": [
                "confirm_payment",
                "suspend_tenant",
                "activate_tenant",
                "extend_subscription"
            ]
        }
        
    except Exception as e:
        logger.error(f"Failed to get quick actions data: {e}")
        return {}


def _get_performance_summary(system_health: Dict[str, Any], platform_metrics: Dict[str, Any]) -> Dict[str, Any]:
    """Get performance summary"""
    try:
        # Calculate performance score (0-100)
        performance_factors = [
            (100 - system_health.get("cpu_usage_percent", 0)) * 0.2,
            (100 - system_health.get("memory_usage_percent", 0)) * 0.2,
            (100 - system_health.get("disk_usage_percent", 0)) * 0.1,
            (100 - system_health.get("error_rate_percent", 0)) * 0.3,
            min(system_health.get("average_response_time_ms", 1000) / 10, 100) * 0.2
        ]
        
        performance_score = sum(performance_factors)
        
        # Determine performance status
        if performance_score >= 90:
            performance_status = "excellent"
        elif performance_score >= 75:
            performance_status = "good"
        elif performance_score >= 60:
            performance_status = "fair"
        else:
            performance_status = "poor"
        
        return {
            "performance_score": round(performance_score, 1),
            "performance_status": performance_status,
            "key_metrics": {
                "response_time": system_health.get("average_response_time_ms", 0),
                "error_rate": system_health.get("error_rate_percent", 0),
                "uptime_hours": system_health.get("uptime_seconds", 0) / 3600,
                "active_users": platform_metrics.get("active_tenants_last_30_days", 0)
            },
            "recommendations": _get_performance_recommendations(system_health)
        }
        
    except Exception as e:
        logger.error(f"Failed to get performance summary: {e}")
        return {}


def _get_performance_recommendations(system_health: Dict[str, Any]) -> List[str]:
    """Get performance recommendations based on system health"""
    recommendations = []
    
    if system_health.get("cpu_usage_percent", 0) > 80:
        recommendations.append("Consider scaling up CPU resources or optimizing high-CPU processes")
    
    if system_health.get("memory_usage_percent", 0) > 80:
        recommendations.append("Monitor memory usage and consider increasing available RAM")
    
    if system_health.get("error_rate_percent", 0) > 5:
        recommendations.append("Investigate and resolve API errors to improve system reliability")
    
    if system_health.get("average_response_time_ms", 0) > 500:
        recommendations.append("Optimize database queries and API response times")
    
    if system_health.get("database_response_time_ms", 0) > 100:
        recommendations.append("Review database performance and consider query optimization")
    
    if not recommendations:
        recommendations.append("System performance is optimal - continue monitoring")
    
    return recommendations


# Health check for dashboard service
@router.get("/health")
async def dashboard_health_check(
    current_user: User = Depends(get_super_admin_user)
):
    """
    Health check for Super Admin dashboard service
    """
    try:
        # Test Redis connection
        redis_client.ping()
        
        return {
            "status": "healthy",
            "service": "super_admin_dashboard",
            "admin_user_id": current_user.id,
            "timestamp": datetime.now(timezone.utc),
            "checks": {
                "redis": "ok",
                "analytics": "ok",
                "monitoring": "ok"
            }
        }
        
    except Exception as e:
        logger.error(f"Super Admin dashboard health check failed: {e}")
        raise HTTPException(status_code=503, detail="Dashboard service unavailable")