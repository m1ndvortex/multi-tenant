"""
Business Intelligence and Insights API endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime
from uuid import UUID

from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.user import User
from app.services.business_intelligence_service import BusinessIntelligenceService
from app.schemas.business_intelligence import (
    BusinessInsightsRequest, BusinessInsightsResponse,
    KPIMetricsRequest, KPIMetricsResponse,
    BusinessAlertsRequest, BusinessAlertResponse,
    TrendAnalysisRequest, TrendAnalysisResponse,
    ReportExportRequest, ReportExportResponse,
    AlertAcknowledgeRequest, AlertAcknowledgeResponse,
    BusinessDashboardSummary, AlertSeverity, AlertType
)

router = APIRouter(prefix="/api/business-intelligence", tags=["business-intelligence"])


@router.get("/insights", response_model=BusinessInsightsResponse)
async def get_business_insights(
    analysis_period_days: int = Query(30, ge=1, le=365, description="Analysis period in days"),
    comparison_period_days: int = Query(30, ge=1, le=365, description="Comparison period in days"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get AI-driven business insights with plain language summaries
    
    - **analysis_period_days**: Period to analyze (1-365 days)
    - **comparison_period_days**: Period to compare against (1-365 days)
    
    Returns comprehensive business insights including:
    - Performance analysis
    - Risk identification
    - Opportunity detection
    - Actionable recommendations
    - Executive summary in Persian
    """
    try:
        bi_service = BusinessIntelligenceService(db)
        
        result = bi_service.generate_business_insights(
            tenant_id=current_user.tenant_id,
            analysis_period_days=analysis_period_days,
            comparison_period_days=comparison_period_days
        )
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating business insights: {str(e)}")


@router.post("/insights", response_model=BusinessInsightsResponse)
async def get_business_insights_post(
    request: BusinessInsightsRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get business insights with detailed request parameters (POST method)
    """
    try:
        bi_service = BusinessIntelligenceService(db)
        
        result = bi_service.generate_business_insights(
            tenant_id=current_user.tenant_id,
            analysis_period_days=request.analysis_period_days,
            comparison_period_days=request.comparison_period_days
        )
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating business insights: {str(e)}")


@router.get("/kpis", response_model=KPIMetricsResponse)
async def get_kpi_metrics(
    period_days: int = Query(30, ge=1, le=365, description="Analysis period in days"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get key performance indicators with trend detection
    
    - **period_days**: Analysis period (1-365 days)
    
    Returns KPI metrics including:
    - Revenue metrics
    - Customer metrics
    - Profitability metrics
    - Trend analysis
    - Overall business health score
    """
    try:
        bi_service = BusinessIntelligenceService(db)
        
        result = bi_service.calculate_kpi_metrics(
            tenant_id=current_user.tenant_id,
            period_days=period_days
        )
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating KPI metrics: {str(e)}")


@router.post("/kpis", response_model=KPIMetricsResponse)
async def get_kpi_metrics_post(
    request: KPIMetricsRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get KPI metrics with detailed request parameters (POST method)
    """
    try:
        bi_service = BusinessIntelligenceService(db)
        
        result = bi_service.calculate_kpi_metrics(
            tenant_id=current_user.tenant_id,
            period_days=request.period_days
        )
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating KPI metrics: {str(e)}")


@router.get("/alerts", response_model=BusinessAlertResponse)
async def get_business_alerts(
    severity_filter: Optional[List[AlertSeverity]] = Query(None, description="Filter by severity"),
    type_filter: Optional[List[AlertType]] = Query(None, description="Filter by alert type"),
    include_acknowledged: bool = Query(False, description="Include acknowledged alerts"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get business alerts for overdue payments and business insights
    
    - **severity_filter**: Filter alerts by severity level
    - **type_filter**: Filter alerts by type
    - **include_acknowledged**: Include already acknowledged alerts
    
    Returns alerts for:
    - Overdue payments
    - Low stock products
    - Revenue decline
    - Customer activity issues
    - Cash flow problems
    """
    try:
        bi_service = BusinessIntelligenceService(db)
        
        result = bi_service.generate_business_alerts(
            tenant_id=current_user.tenant_id
        )
        
        # Apply filters if provided
        if severity_filter or type_filter or not include_acknowledged:
            filtered_alerts = []
            for alert in result.alerts:
                # Skip acknowledged alerts if not requested
                if not include_acknowledged and alert.acknowledged:
                    continue
                
                # Filter by severity
                if severity_filter and alert.severity not in severity_filter:
                    continue
                
                # Filter by type
                if type_filter and alert.type not in type_filter:
                    continue
                
                filtered_alerts.append(alert)
            
            result.alerts = filtered_alerts
            result.total_alerts = len(filtered_alerts)
            
            # Recalculate counts
            result.critical_alerts = len([a for a in filtered_alerts if a.severity == AlertSeverity.CRITICAL])
            result.high_alerts = len([a for a in filtered_alerts if a.severity == AlertSeverity.HIGH])
            result.medium_alerts = len([a for a in filtered_alerts if a.severity == AlertSeverity.MEDIUM])
            result.low_alerts = len([a for a in filtered_alerts if a.severity == AlertSeverity.LOW])
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating business alerts: {str(e)}")


@router.post("/alerts", response_model=BusinessAlertResponse)
async def get_business_alerts_post(
    request: BusinessAlertsRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get business alerts with detailed request parameters (POST method)
    """
    try:
        bi_service = BusinessIntelligenceService(db)
        
        result = bi_service.generate_business_alerts(
            tenant_id=current_user.tenant_id
        )
        
        # Apply filters from request
        if request.severity_filter or request.type_filter or not request.include_acknowledged:
            filtered_alerts = []
            for alert in result.alerts:
                # Skip acknowledged alerts if not requested
                if not request.include_acknowledged and alert.acknowledged:
                    continue
                
                # Filter by severity
                if request.severity_filter and alert.severity not in request.severity_filter:
                    continue
                
                # Filter by type
                if request.type_filter and alert.type not in request.type_filter:
                    continue
                
                filtered_alerts.append(alert)
            
            result.alerts = filtered_alerts
            result.total_alerts = len(filtered_alerts)
            
            # Recalculate counts
            result.critical_alerts = len([a for a in filtered_alerts if a.severity == AlertSeverity.CRITICAL])
            result.high_alerts = len([a for a in filtered_alerts if a.severity == AlertSeverity.HIGH])
            result.medium_alerts = len([a for a in filtered_alerts if a.severity == AlertSeverity.MEDIUM])
            result.low_alerts = len([a for a in filtered_alerts if a.severity == AlertSeverity.LOW])
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating business alerts: {str(e)}")


@router.get("/trends", response_model=TrendAnalysisResponse)
async def get_trend_analysis(
    analysis_periods: int = Query(12, ge=3, le=52, description="Number of periods to analyze"),
    period_type: str = Query("weekly", description="Period type (daily, weekly, monthly)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get business trend analysis over multiple periods
    
    - **analysis_periods**: Number of periods to analyze (3-52)
    - **period_type**: Type of period (daily, weekly, monthly)
    
    Returns trend analysis including:
    - Revenue trends
    - Customer acquisition trends
    - Product performance trends
    - Seasonal pattern detection
    - Future predictions
    """
    try:
        bi_service = BusinessIntelligenceService(db)
        
        result = bi_service.analyze_trends(
            tenant_id=current_user.tenant_id,
            analysis_periods=analysis_periods,
            period_type=period_type
        )
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error analyzing trends: {str(e)}")


@router.post("/trends", response_model=TrendAnalysisResponse)
async def get_trend_analysis_post(
    request: TrendAnalysisRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get trend analysis with detailed request parameters (POST method)
    """
    try:
        bi_service = BusinessIntelligenceService(db)
        
        result = bi_service.analyze_trends(
            tenant_id=current_user.tenant_id,
            analysis_periods=request.analysis_periods,
            period_type=request.period_type
        )
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error analyzing trends: {str(e)}")


@router.post("/export", response_model=ReportExportResponse)
async def export_business_report(
    request: ReportExportRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Export business intelligence reports in multiple formats
    
    - **report_type**: Type of report to export (insights, kpis, alerts, trends)
    - **format**: Export format (pdf, excel, csv, json)
    - **parameters**: Report-specific parameters
    - **include_charts**: Whether to include charts in export
    
    Supported report types:
    - insights: Business insights report
    - kpis: KPI metrics report
    - alerts: Business alerts report
    - trends: Trend analysis report
    - dashboard: Complete dashboard summary
    """
    try:
        bi_service = BusinessIntelligenceService(db)
        
        result = bi_service.export_report(
            tenant_id=current_user.tenant_id,
            request=request
        )
        
        # In a real implementation, this would trigger a background task
        # background_tasks.add_task(process_report_export, tenant_id, request, export_id)
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error exporting report: {str(e)}")


@router.get("/dashboard-summary", response_model=BusinessDashboardSummary)
async def get_dashboard_summary(
    period_days: int = Query(30, ge=1, le=365, description="Summary period in days"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get business dashboard summary with key metrics and insights
    
    - **period_days**: Period for summary calculation (1-365 days)
    
    Returns dashboard summary including:
    - Key financial metrics
    - Growth indicators
    - Alert summary
    - Top insights
    - Quick stats
    """
    try:
        bi_service = BusinessIntelligenceService(db)
        
        # Get KPIs
        kpis = bi_service.calculate_kpi_metrics(
            tenant_id=current_user.tenant_id,
            period_days=period_days
        )
        
        # Get alerts
        alerts = bi_service.generate_business_alerts(
            tenant_id=current_user.tenant_id
        )
        
        # Get top insights
        insights = bi_service.generate_business_insights(
            tenant_id=current_user.tenant_id,
            analysis_period_days=period_days,
            comparison_period_days=period_days
        )
        
        # Extract key metrics from KPIs
        revenue_kpi = next((k for k in kpis.kpis if k.name == "Total Revenue"), None)
        customer_kpi = next((k for k in kpis.kpis if k.name == "Active Customers"), None)
        aov_kpi = next((k for k in kpis.kpis if k.name == "Average Order Value"), None)
        profit_kpi = next((k for k in kpis.kpis if k.name == "Profit Margin"), None)
        receivables_kpi = next((k for k in kpis.kpis if k.name == "Outstanding Receivables"), None)
        
        # Calculate additional metrics
        from decimal import Decimal
        overdue_amount = Decimal('0')
        for alert in alerts.alerts:
            if alert.type.value == "overdue_payment" and alert.data:
                overdue_amount = Decimal(str(alert.data.get('total_amount', 0)))
                break
        
        summary = BusinessDashboardSummary(
            period_days=period_days,
            generated_at=datetime.utcnow(),
            
            # Key metrics
            total_revenue=revenue_kpi.value if revenue_kpi else Decimal('0'),
            revenue_growth=revenue_kpi.change_percentage if revenue_kpi else Decimal('0'),
            active_customers=int(customer_kpi.value) if customer_kpi else 0,
            customer_growth=customer_kpi.change_percentage if customer_kpi else Decimal('0'),
            average_order_value=aov_kpi.value if aov_kpi else Decimal('0'),
            aov_growth=aov_kpi.change_percentage if aov_kpi else Decimal('0'),
            
            # Alerts summary
            total_alerts=alerts.total_alerts,
            critical_alerts=alerts.critical_alerts,
            
            # Top insights (limit to 3)
            top_insights=insights.insights[:3],
            
            # Quick stats
            outstanding_receivables=receivables_kpi.value if receivables_kpi else Decimal('0'),
            overdue_amount=overdue_amount,
            profit_margin=profit_kpi.value if profit_kpi else Decimal('0')
        )
        
        return summary
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating dashboard summary: {str(e)}")


@router.post("/alerts/acknowledge", response_model=AlertAcknowledgeResponse)
async def acknowledge_alerts(
    request: AlertAcknowledgeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Acknowledge business alerts
    
    - **alert_ids**: List of alert IDs to acknowledge
    - **notes**: Optional acknowledgment notes
    
    This endpoint would typically update alert status in a database.
    For now, it returns a success response.
    """
    try:
        # In a real implementation, this would update alert status in database
        # For now, we'll just return a success response
        
        acknowledged_count = len(request.alert_ids)
        failed_count = 0
        
        return AlertAcknowledgeResponse(
            acknowledged_count=acknowledged_count,
            failed_count=failed_count,
            acknowledged_at=datetime.utcnow()
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error acknowledging alerts: {str(e)}")


@router.get("/export/{export_id}/status")
async def get_export_status(
    export_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get status of a report export job
    
    - **export_id**: Export job ID
    
    Returns current status of the export job and download URL when ready.
    """
    try:
        # In a real implementation, this would check export job status
        # For now, return a mock response
        
        return {
            "export_id": export_id,
            "status": "completed",
            "download_url": f"/api/business-intelligence/export/{export_id}/download",
            "created_at": datetime.utcnow(),
            "completed_at": datetime.utcnow(),
            "expires_at": datetime.utcnow(),
            "file_size": 1024000
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting export status: {str(e)}")


@router.get("/export/{export_id}/download")
async def download_export(
    export_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Download exported report file
    
    - **export_id**: Export job ID
    
    Returns the exported file for download.
    """
    try:
        # In a real implementation, this would serve the actual file
        raise HTTPException(
            status_code=501, 
            detail="File download functionality will be implemented with actual file storage"
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error downloading export: {str(e)}")


@router.get("/health")
async def business_intelligence_health():
    """
    Health check endpoint for business intelligence service
    """
    return {
        "status": "healthy",
        "service": "business-intelligence",
        "timestamp": datetime.utcnow(),
        "features": [
            "business-insights",
            "kpi-metrics",
            "business-alerts",
            "trend-analysis",
            "report-export"
        ]
    }