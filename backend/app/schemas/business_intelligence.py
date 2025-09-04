"""
Schemas for Business Intelligence and Insights system
"""

from pydantic import BaseModel, Field, validator
from typing import List, Dict, Any, Optional
from decimal import Decimal
from datetime import datetime
from enum import Enum
from uuid import UUID


class InsightType(str, Enum):
    """Types of business insights"""
    PERFORMANCE = "performance"
    WARNING = "warning"
    OPPORTUNITY = "opportunity"
    RISK = "risk"
    TREND = "trend"


class InsightPriority(str, Enum):
    """Priority levels for insights"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class KPITrend(str, Enum):
    """KPI trend directions"""
    UP = "up"
    DOWN = "down"
    STABLE = "stable"


class AlertType(str, Enum):
    """Types of business alerts"""
    OVERDUE_PAYMENT = "overdue_payment"
    LOW_STOCK = "low_stock"
    REVENUE_DECLINE = "revenue_decline"
    CUSTOMER_ACTIVITY = "customer_activity"
    CASH_FLOW = "cash_flow"
    INVENTORY = "inventory"
    PERFORMANCE = "performance"


class AlertSeverity(str, Enum):
    """Alert severity levels"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class TrendDirection(str, Enum):
    """Trend direction indicators"""
    UP = "up"
    DOWN = "down"
    STABLE = "stable"
    VOLATILE = "volatile"


class ExportFormat(str, Enum):
    """Report export formats"""
    PDF = "pdf"
    EXCEL = "excel"
    CSV = "csv"
    JSON = "json"


class ExportStatus(str, Enum):
    """Export job status"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    EXPIRED = "expired"


# Business Insights Schemas
class BusinessInsightData(BaseModel):
    """Individual business insight data"""
    type: InsightType = Field(..., description="Type of insight")
    priority: InsightPriority = Field(..., description="Priority level")
    title: str = Field(..., description="Insight title in English")
    title_persian: str = Field(..., description="Insight title in Persian")
    description: str = Field(..., description="Detailed description in English")
    description_persian: str = Field(..., description="Detailed description in Persian")
    impact_score: float = Field(..., ge=0, le=10, description="Impact score (0-10)")
    confidence_score: float = Field(..., ge=0, le=10, description="Confidence score (0-10)")
    actionable: bool = Field(..., description="Whether this insight is actionable")
    action_items: List[str] = Field(default=[], description="Recommended actions")
    data: Optional[Dict[str, Any]] = Field(None, description="Supporting data")
    
    class Config:
        json_encoders = {
            Decimal: lambda v: float(v)
        }


class BusinessInsightsResponse(BaseModel):
    """Business insights analysis response"""
    analysis_period_days: int = Field(..., description="Analysis period in days")
    comparison_period_days: int = Field(..., description="Comparison period in days")
    generated_at: datetime = Field(..., description="When insights were generated")
    insights: List[BusinessInsightData] = Field(..., description="Generated insights")
    recommendations: List[str] = Field(..., description="Business recommendations")
    summary: str = Field(..., description="Executive summary in Persian")
    
    class Config:
        json_encoders = {
            Decimal: lambda v: float(v)
        }


# KPI Metrics Schemas
class KPIMetric(BaseModel):
    """Key Performance Indicator metric"""
    name: str = Field(..., description="KPI name in English")
    name_persian: str = Field(..., description="KPI name in Persian")
    value: Decimal = Field(..., description="Current KPI value")
    previous_value: Decimal = Field(..., description="Previous period value")
    trend: KPITrend = Field(..., description="Trend direction")
    change_percentage: Decimal = Field(..., description="Percentage change")
    target_value: Optional[Decimal] = Field(None, description="Target value if set")
    unit: str = Field(..., description="Unit of measurement")
    
    class Config:
        json_encoders = {
            Decimal: lambda v: float(v)
        }


class KPIMetricsResponse(BaseModel):
    """KPI metrics response"""
    period_days: int = Field(..., description="Analysis period in days")
    calculated_at: datetime = Field(..., description="When KPIs were calculated")
    kpis: List[KPIMetric] = Field(..., description="List of KPI metrics")
    overall_score: float = Field(..., ge=0, le=100, description="Overall business health score")
    
    class Config:
        json_encoders = {
            Decimal: lambda v: float(v)
        }


# Business Alerts Schemas
class BusinessAlert(BaseModel):
    """Business alert data"""
    type: AlertType = Field(..., description="Type of alert")
    severity: AlertSeverity = Field(..., description="Alert severity")
    title: str = Field(..., description="Alert title in English")
    title_persian: str = Field(..., description="Alert title in Persian")
    message: str = Field(..., description="Alert message in English")
    message_persian: str = Field(..., description="Alert message in Persian")
    created_at: datetime = Field(..., description="When alert was created")
    data: Optional[Dict[str, Any]] = Field(None, description="Alert-specific data")
    acknowledged: bool = Field(default=False, description="Whether alert was acknowledged")
    acknowledged_at: Optional[datetime] = Field(None, description="When alert was acknowledged")
    
    class Config:
        json_encoders = {
            Decimal: lambda v: float(v)
        }


class BusinessAlertResponse(BaseModel):
    """Business alerts response"""
    generated_at: datetime = Field(..., description="When alerts were generated")
    total_alerts: int = Field(..., description="Total number of alerts")
    critical_alerts: int = Field(..., description="Number of critical alerts")
    high_alerts: int = Field(..., description="Number of high priority alerts")
    medium_alerts: int = Field(..., description="Number of medium priority alerts")
    low_alerts: int = Field(..., description="Number of low priority alerts")
    alerts: List[BusinessAlert] = Field(..., description="List of alerts")
    
    class Config:
        json_encoders = {
            Decimal: lambda v: float(v)
        }


# Trend Analysis Schemas
class TrendDataPoint(BaseModel):
    """Individual trend data point"""
    period: str = Field(..., description="Period identifier")
    value: Decimal = Field(..., description="Metric value for period")
    date: datetime = Field(..., description="Period date")
    
    class Config:
        json_encoders = {
            Decimal: lambda v: float(v)
        }


class TrendData(BaseModel):
    """Trend analysis data for a specific metric"""
    metric_name: str = Field(..., description="Metric name in English")
    metric_name_persian: str = Field(..., description="Metric name in Persian")
    direction: TrendDirection = Field(..., description="Overall trend direction")
    strength: float = Field(..., ge=0, le=10, description="Trend strength (0-10)")
    confidence: float = Field(..., ge=0, le=10, description="Confidence in trend (0-10)")
    data_points: List[TrendDataPoint] = Field(..., description="Historical data points")
    prediction_next_period: Decimal = Field(..., description="Predicted value for next period")
    seasonal_factor: float = Field(..., description="Seasonal adjustment factor")
    
    class Config:
        json_encoders = {
            Decimal: lambda v: float(v)
        }


class TrendAnalysisResponse(BaseModel):
    """Trend analysis response"""
    analysis_periods: int = Field(..., description="Number of periods analyzed")
    period_type: str = Field(..., description="Type of period (daily, weekly, monthly)")
    analyzed_at: datetime = Field(..., description="When analysis was performed")
    trends: List[TrendData] = Field(..., description="Trend analysis for different metrics")
    seasonal_patterns: Dict[str, Any] = Field(..., description="Detected seasonal patterns")
    predictions: Dict[str, Any] = Field(..., description="Business predictions")
    
    class Config:
        json_encoders = {
            Decimal: lambda v: float(v)
        }


# Report Export Schemas
class ReportExportRequest(BaseModel):
    """Report export request"""
    report_type: str = Field(..., description="Type of report to export")
    format: ExportFormat = Field(..., description="Export format")
    parameters: Dict[str, Any] = Field(default={}, description="Report parameters")
    include_charts: bool = Field(default=False, description="Include charts in export")
    date_range: Optional[Dict[str, str]] = Field(None, description="Date range for report")
    filters: Optional[Dict[str, Any]] = Field(None, description="Report filters")


class ReportExportResponse(BaseModel):
    """Report export response"""
    export_id: str = Field(..., description="Unique export job ID")
    status: ExportStatus = Field(..., description="Export job status")
    format: ExportFormat = Field(..., description="Export format")
    report_type: str = Field(..., description="Type of report")
    created_at: datetime = Field(..., description="When export was created")
    estimated_completion: Optional[datetime] = Field(None, description="Estimated completion time")
    completed_at: Optional[datetime] = Field(None, description="When export was completed")
    download_url: Optional[str] = Field(None, description="Download URL when ready")
    expires_at: Optional[datetime] = Field(None, description="When download expires")
    file_size: Optional[int] = Field(None, description="File size in bytes")
    error_message: Optional[str] = Field(None, description="Error message if failed")


# Request Schemas
class BusinessInsightsRequest(BaseModel):
    """Business insights generation request"""
    analysis_period_days: int = Field(default=30, ge=1, le=365, description="Analysis period")
    comparison_period_days: int = Field(default=30, ge=1, le=365, description="Comparison period")
    include_predictions: bool = Field(default=True, description="Include predictions")
    language: str = Field(default="persian", description="Response language")


class KPIMetricsRequest(BaseModel):
    """KPI metrics calculation request"""
    period_days: int = Field(default=30, ge=1, le=365, description="Analysis period")
    include_targets: bool = Field(default=True, description="Include target comparisons")
    metrics: Optional[List[str]] = Field(None, description="Specific metrics to calculate")


class BusinessAlertsRequest(BaseModel):
    """Business alerts generation request"""
    severity_filter: Optional[List[AlertSeverity]] = Field(None, description="Filter by severity")
    type_filter: Optional[List[AlertType]] = Field(None, description="Filter by alert type")
    include_acknowledged: bool = Field(default=False, description="Include acknowledged alerts")


class TrendAnalysisRequest(BaseModel):
    """Trend analysis request"""
    analysis_periods: int = Field(default=12, ge=3, le=52, description="Number of periods")
    period_type: str = Field(default="weekly", description="Period type")
    metrics: Optional[List[str]] = Field(None, description="Specific metrics to analyze")
    include_predictions: bool = Field(default=True, description="Include predictions")
    detect_seasonality: bool = Field(default=True, description="Detect seasonal patterns")


# Alert Management Schemas
class AlertAcknowledgeRequest(BaseModel):
    """Alert acknowledgment request"""
    alert_ids: List[str] = Field(..., description="List of alert IDs to acknowledge")
    notes: Optional[str] = Field(None, description="Acknowledgment notes")


class AlertAcknowledgeResponse(BaseModel):
    """Alert acknowledgment response"""
    acknowledged_count: int = Field(..., description="Number of alerts acknowledged")
    failed_count: int = Field(..., description="Number of alerts that failed to acknowledge")
    acknowledged_at: datetime = Field(..., description="When acknowledgment was processed")


# Dashboard Summary Schemas
class BusinessDashboardSummary(BaseModel):
    """Business dashboard summary"""
    period_days: int = Field(..., description="Summary period")
    generated_at: datetime = Field(..., description="When summary was generated")
    
    # Key metrics
    total_revenue: Decimal = Field(..., description="Total revenue")
    revenue_growth: Decimal = Field(..., description="Revenue growth percentage")
    active_customers: int = Field(..., description="Number of active customers")
    customer_growth: Decimal = Field(..., description="Customer growth percentage")
    average_order_value: Decimal = Field(..., description="Average order value")
    aov_growth: Decimal = Field(..., description="AOV growth percentage")
    
    # Alerts summary
    total_alerts: int = Field(..., description="Total active alerts")
    critical_alerts: int = Field(..., description="Critical alerts count")
    
    # Top insights
    top_insights: List[BusinessInsightData] = Field(..., description="Top 3 insights")
    
    # Quick stats
    outstanding_receivables: Decimal = Field(..., description="Outstanding receivables")
    overdue_amount: Decimal = Field(..., description="Overdue amount")
    profit_margin: Decimal = Field(..., description="Profit margin percentage")
    
    class Config:
        json_encoders = {
            Decimal: lambda v: float(v)
        }