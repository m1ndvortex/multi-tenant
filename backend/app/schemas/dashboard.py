"""
Dashboard schemas for tenant dashboard analytics and business insights
"""

from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime, date
from decimal import Decimal
from enum import Enum


class MetricUnit(str, Enum):
    """Units for dashboard metrics"""
    CURRENCY = "currency"
    COUNT = "count"
    PERCENTAGE = "percentage"
    WEIGHT = "weight"


class AlertSeverity(str, Enum):
    """Alert severity levels"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class AlertType(str, Enum):
    """Types of dashboard alerts"""
    OVERDUE_PAYMENTS = "overdue_payments"
    UPCOMING_INSTALLMENTS = "upcoming_installments"
    LOW_STOCK = "low_stock"
    UPCOMING_GOLD_INSTALLMENTS = "upcoming_gold_installments"
    REVENUE_DECLINE = "revenue_decline"
    CASH_FLOW = "cash_flow"


class ActivityType(str, Enum):
    """Types of recent activities"""
    INVOICE_CREATED = "invoice_created"
    PAYMENT_RECEIVED = "payment_received"
    CUSTOMER_ADDED = "customer_added"
    PRODUCT_ADDED = "product_added"
    INSTALLMENT_PAID = "installment_paid"


class DashboardMetric(BaseModel):
    """Individual dashboard metric"""
    value: Decimal = Field(..., description="Current metric value")
    previous_value: Optional[Decimal] = Field(None, description="Previous period value for comparison")
    growth_rate: Optional[Decimal] = Field(None, description="Growth rate percentage")
    label: str = Field(..., description="Metric label in Persian")
    unit: MetricUnit = Field(..., description="Metric unit type")


class DashboardSummary(BaseModel):
    """Main dashboard summary response"""
    period: str = Field(..., description="Analysis period")
    period_start: date = Field(..., description="Period start date")
    period_end: date = Field(..., description="Period end date")
    metrics: Dict[str, DashboardMetric] = Field(..., description="Key business metrics")


class RecentActivity(BaseModel):
    """Recent business activity item"""
    type: ActivityType = Field(..., description="Activity type")
    title: str = Field(..., description="Activity title in Persian")
    description: str = Field(..., description="Activity description in Persian")
    amount: Optional[Decimal] = Field(None, description="Associated amount if applicable")
    customer: Optional[str] = Field(None, description="Customer name if applicable")
    timestamp: datetime = Field(..., description="Activity timestamp")
    status: Optional[str] = Field(None, description="Activity status")
    invoice_type: Optional[str] = Field(None, description="Invoice type if applicable")
    payment_method: Optional[str] = Field(None, description="Payment method if applicable")
    invoice_number: Optional[str] = Field(None, description="Invoice number if applicable")
    reference_id: str = Field(..., description="Reference ID for the activity")


class BusinessInsight(BaseModel):
    """Business insight item"""
    type: str = Field(..., description="Insight type")
    priority: str = Field(..., description="Insight priority")
    title: str = Field(..., description="Insight title in Persian")
    description: str = Field(..., description="Insight description in Persian")
    impact_score: float = Field(..., description="Impact score (0-10)")
    confidence_score: float = Field(..., description="Confidence score (0-10)")
    actionable: bool = Field(..., description="Whether insight is actionable")
    action_items: List[str] = Field(default_factory=list, description="Recommended actions")


class BusinessInsightsResponse(BaseModel):
    """Business insights response"""
    summary: str = Field(..., description="Executive summary in Persian")
    insights: List[BusinessInsight] = Field(..., description="Top business insights")
    recommendations: List[str] = Field(..., description="Top recommendations")
    generated_at: datetime = Field(..., description="Generation timestamp")


class DashboardAlert(BaseModel):
    """Dashboard alert item"""
    type: AlertType = Field(..., description="Alert type")
    severity: AlertSeverity = Field(..., description="Alert severity")
    title: str = Field(..., description="Alert title in Persian")
    description: str = Field(..., description="Alert description in Persian")
    count: Optional[int] = Field(None, description="Count of items if applicable")
    amount: Optional[Decimal] = Field(None, description="Amount if applicable")
    weight: Optional[Decimal] = Field(None, description="Weight if applicable (for gold)")
    action: str = Field(..., description="Recommended action")


class AlertsResponse(BaseModel):
    """Alerts and notifications response"""
    alerts: List[DashboardAlert] = Field(..., description="List of alerts")
    total_alerts: int = Field(..., description="Total number of alerts")
    critical_alerts: int = Field(..., description="Number of critical alerts")
    high_alerts: int = Field(..., description="Number of high priority alerts")
    medium_alerts: int = Field(..., description="Number of medium priority alerts")


class QuickStats(BaseModel):
    """Quick statistics for dashboard widgets"""
    today_revenue: Decimal = Field(..., description="Today's revenue")
    today_invoices: int = Field(..., description="Today's invoice count")
    total_customers: int = Field(..., description="Total active customers")
    total_products: int = Field(..., description="Total active products")
    pending_invoices: int = Field(..., description="Pending invoices count")
    calculated_at: datetime = Field(..., description="Calculation timestamp")


class SalesChartDataPoint(BaseModel):
    """Sales chart data point"""
    date: str = Field(..., description="Date in YYYY-MM-DD format")
    sales: float = Field(..., description="Sales amount for the date")
    invoices: int = Field(..., description="Number of invoices for the date")


class SalesChartData(BaseModel):
    """Sales chart data response"""
    period_days: int = Field(..., description="Number of days in the period")
    start_date: date = Field(..., description="Chart start date")
    end_date: date = Field(..., description="Chart end date")
    data: List[SalesChartDataPoint] = Field(..., description="Chart data points")
    total_sales: float = Field(..., description="Total sales for the period")
    total_invoices: int = Field(..., description="Total invoices for the period")


class DashboardResponse(BaseModel):
    """Complete dashboard response"""
    summary: DashboardSummary = Field(..., description="Dashboard summary metrics")
    recent_activities: List[RecentActivity] = Field(..., description="Recent business activities")
    business_insights: BusinessInsightsResponse = Field(..., description="AI-driven business insights")
    alerts: AlertsResponse = Field(..., description="Important alerts and notifications")
    quick_stats: QuickStats = Field(..., description="Quick statistics widgets")
    sales_chart: SalesChartData = Field(..., description="Sales trend chart data")
    generated_at: datetime = Field(default_factory=datetime.utcnow, description="Response generation timestamp")


# Request schemas
class DashboardRequest(BaseModel):
    """Dashboard data request parameters"""
    include_insights: bool = Field(default=True, description="Include business insights")
    include_alerts: bool = Field(default=True, description="Include alerts")
    include_activities: bool = Field(default=True, description="Include recent activities")
    activities_limit: int = Field(default=10, description="Limit for recent activities")
    sales_chart_days: int = Field(default=30, description="Number of days for sales chart")


class InsightsRequest(BaseModel):
    """Business insights request parameters"""
    analysis_period_days: int = Field(default=30, description="Analysis period in days")
    comparison_period_days: int = Field(default=30, description="Comparison period in days")
    include_recommendations: bool = Field(default=True, description="Include recommendations")


class AlertsRequest(BaseModel):
    """Alerts request parameters"""
    include_overdue: bool = Field(default=True, description="Include overdue payment alerts")
    include_installments: bool = Field(default=True, description="Include installment alerts")
    include_inventory: bool = Field(default=True, description="Include inventory alerts")
    upcoming_days: int = Field(default=7, description="Days ahead for upcoming alerts")