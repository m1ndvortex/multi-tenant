"""
Schemas for advanced reporting system
"""

from pydantic import BaseModel, Field, validator
from typing import List, Dict, Any, Optional
from decimal import Decimal
from datetime import date, datetime
from enum import Enum
from uuid import UUID

from app.models.invoice import InvoiceType
from app.models.customer import CustomerType


class SalesTrendPeriod(str, Enum):
    """Sales trend analysis periods"""
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"


class ReportFilters(BaseModel):
    """Common filters for reports"""
    customer_ids: Optional[List[UUID]] = None
    invoice_types: Optional[List[InvoiceType]] = None
    product_categories: Optional[List[str]] = None
    customer_types: Optional[List[CustomerType]] = None


class ReportDateRange(BaseModel):
    """Date range for reports"""
    start_date: date
    end_date: date
    
    @validator('end_date')
    def end_date_must_be_after_start_date(cls, v, values):
        if 'start_date' in values and v < values['start_date']:
            raise ValueError('end_date must be after start_date')
        return v


# Sales Trend Analysis Schemas
class SalesTrendData(BaseModel):
    """Sales trend data for a specific period"""
    period: str = Field(..., description="Period identifier (date, week, month)")
    invoice_count: int = Field(..., description="Number of invoices in period")
    total_sales: Decimal = Field(..., description="Total sales amount")
    total_paid: Decimal = Field(..., description="Total amount paid")
    average_invoice: Decimal = Field(..., description="Average invoice amount")
    general_sales: Decimal = Field(..., description="General invoice sales")
    gold_sales: Decimal = Field(..., description="Gold invoice sales")
    
    class Config:
        json_encoders = {
            Decimal: lambda v: float(v)
        }


class SalesTrendResponse(BaseModel):
    """Sales trend analysis response"""
    period: SalesTrendPeriod
    start_date: date
    end_date: date
    data: List[SalesTrendData]
    summary: Dict[str, Any] = Field(..., description="Summary statistics")
    
    class Config:
        json_encoders = {
            Decimal: lambda v: float(v)
        }


# Profit & Loss Analysis Schemas
class ProfitLossCategory(BaseModel):
    """Profit & loss data for a product category"""
    name: str = Field(..., description="Category name")
    revenue: Decimal = Field(..., description="Category revenue")
    cost_of_goods: Decimal = Field(..., description="Cost of goods sold")
    gross_profit: Decimal = Field(..., description="Gross profit")
    profit_margin: Decimal = Field(..., description="Profit margin percentage")
    item_count: int = Field(..., description="Number of items sold")
    
    class Config:
        json_encoders = {
            Decimal: lambda v: float(v)
        }


class ProfitLossData(BaseModel):
    """Profit & loss report data"""
    total_revenue: Decimal = Field(..., description="Total revenue")
    general_revenue: Decimal = Field(..., description="General invoice revenue")
    gold_revenue: Decimal = Field(..., description="Gold invoice revenue")
    cost_of_goods_sold: Decimal = Field(..., description="Total cost of goods sold")
    gross_profit: Decimal = Field(..., description="Gross profit")
    gross_margin: Decimal = Field(..., description="Gross margin percentage")
    categories: List[ProfitLossCategory] = Field(default=[], description="Category breakdown")
    
    class Config:
        json_encoders = {
            Decimal: lambda v: float(v)
        }


class ProfitLossResponse(BaseModel):
    """Profit & loss report response"""
    start_date: date
    end_date: date
    data: ProfitLossData
    
    class Config:
        json_encoders = {
            Decimal: lambda v: float(v)
        }


# Customer Analytics Schemas
class CustomerLifetimeValue(BaseModel):
    """Customer lifetime value data"""
    customer_id: UUID
    customer_name: str
    customer_type: CustomerType
    total_spent: Decimal = Field(..., description="Total amount spent")
    total_paid: Decimal = Field(..., description="Total amount paid")
    invoice_count: int = Field(..., description="Number of invoices")
    average_order_value: Decimal = Field(..., description="Average order value")
    first_purchase_date: Optional[datetime] = Field(None, description="First purchase date")
    last_purchase_date: Optional[datetime] = Field(None, description="Last purchase date")
    outstanding_debt: Decimal = Field(..., description="Outstanding debt")
    days_active: int = Field(..., description="Days between first and last purchase")
    purchase_frequency: float = Field(..., description="Purchases per month")
    
    class Config:
        json_encoders = {
            Decimal: lambda v: float(v)
        }


class CustomerAnalyticsData(BaseModel):
    """Customer analytics data"""
    total_customers: int = Field(..., description="Total number of customers")
    active_customers: int = Field(..., description="Active customers in period")
    top_customers: List[CustomerLifetimeValue] = Field(..., description="Top customers by value")
    customer_segmentation: Dict[str, Any] = Field(..., description="Customer segmentation data")
    monthly_purchase_patterns: Dict[str, Any] = Field(..., description="Monthly purchase patterns")
    
    class Config:
        json_encoders = {
            Decimal: lambda v: float(v)
        }


class CustomerAnalyticsResponse(BaseModel):
    """Customer analytics response"""
    start_date: date
    end_date: date
    data: CustomerAnalyticsData
    
    class Config:
        json_encoders = {
            Decimal: lambda v: float(v)
        }


# Aging Report Schemas
class AgingBucket(BaseModel):
    """Aging report bucket"""
    name: str = Field(..., description="Bucket name")
    min_days: int = Field(..., description="Minimum days")
    max_days: int = Field(..., description="Maximum days")
    amount: Decimal = Field(..., description="Total amount in bucket")
    count: int = Field(..., description="Number of invoices in bucket")
    
    class Config:
        json_encoders = {
            Decimal: lambda v: float(v)
        }


class AgingReportData(BaseModel):
    """Aging report data for a customer"""
    customer_id: UUID
    customer_name: str
    total_balance: Decimal = Field(..., description="Total outstanding balance")
    current: Decimal = Field(..., description="Current (not overdue)")
    days_1_30: Decimal = Field(..., description="1-30 days overdue")
    days_31_60: Decimal = Field(..., description="31-60 days overdue")
    days_61_90: Decimal = Field(..., description="61-90 days overdue")
    over_90_days: Decimal = Field(..., description="Over 90 days overdue")
    invoice_count: int = Field(..., description="Number of outstanding invoices")
    
    class Config:
        json_encoders = {
            Decimal: lambda v: float(v)
        }


class AgingReportResponse(BaseModel):
    """Aging report response"""
    as_of_date: date
    total_receivables: Decimal = Field(..., description="Total accounts receivable")
    buckets: List[AgingBucket] = Field(..., description="Aging buckets summary")
    customers: List[AgingReportData] = Field(..., description="Customer aging data")
    
    class Config:
        json_encoders = {
            Decimal: lambda v: float(v)
        }


# Request Schemas
class SalesTrendRequest(BaseModel):
    """Sales trend analysis request"""
    period: SalesTrendPeriod
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    filters: Optional[ReportFilters] = None


class ProfitLossRequest(BaseModel):
    """Profit & loss report request"""
    start_date: date
    end_date: date
    include_categories: bool = True
    filters: Optional[ReportFilters] = None


class CustomerAnalyticsRequest(BaseModel):
    """Customer analytics request"""
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    top_customers_limit: int = Field(default=10, ge=1, le=100)
    filters: Optional[ReportFilters] = None


class AgingReportRequest(BaseModel):
    """Aging report request"""
    as_of_date: Optional[date] = None
    filters: Optional[ReportFilters] = None


# Export Schemas
class ReportExportFormat(str, Enum):
    """Report export formats"""
    CSV = "csv"
    EXCEL = "excel"
    PDF = "pdf"
    JSON = "json"


class ReportExportRequest(BaseModel):
    """Report export request"""
    report_type: str = Field(..., description="Type of report to export")
    format: ReportExportFormat = Field(..., description="Export format")
    parameters: Dict[str, Any] = Field(..., description="Report parameters")
    include_charts: bool = Field(default=False, description="Include charts in export")


class ReportExportResponse(BaseModel):
    """Report export response"""
    export_id: str = Field(..., description="Export job ID")
    status: str = Field(..., description="Export status")
    download_url: Optional[str] = Field(None, description="Download URL when ready")
    created_at: datetime = Field(..., description="Export creation time")
    expires_at: Optional[datetime] = Field(None, description="Download expiration time")