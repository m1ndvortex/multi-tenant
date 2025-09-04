"""
Advanced Reporting API endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import date
from uuid import UUID

from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.user import User
from app.services.reports_service import ReportsService
from app.schemas.reports import (
    SalesTrendRequest, SalesTrendResponse, SalesTrendPeriod,
    ProfitLossRequest, ProfitLossResponse,
    CustomerAnalyticsRequest, CustomerAnalyticsResponse,
    AgingReportRequest, AgingReportResponse,
    ReportFilters, ReportExportRequest, ReportExportResponse
)

router = APIRouter(prefix="/api/reports", tags=["reports"])


@router.get("/sales-trends", response_model=SalesTrendResponse)
async def get_sales_trends(
    period: SalesTrendPeriod = Query(..., description="Analysis period"),
    start_date: Optional[date] = Query(None, description="Start date"),
    end_date: Optional[date] = Query(None, description="End date"),
    customer_ids: Optional[List[UUID]] = Query(None, description="Filter by customer IDs"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get sales trend analysis with daily, weekly, or monthly aggregations
    
    - **period**: Analysis period (daily, weekly, monthly)
    - **start_date**: Start date for analysis (optional)
    - **end_date**: End date for analysis (optional)
    - **customer_ids**: Filter by specific customers (optional)
    """
    try:
        reports_service = ReportsService(db)
        
        # Build filters
        filters = None
        if customer_ids:
            filters = ReportFilters(customer_ids=customer_ids)
        
        result = reports_service.get_sales_trends(
            tenant_id=current_user.tenant_id,
            period=period,
            start_date=start_date,
            end_date=end_date,
            filters=filters
        )
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating sales trends: {str(e)}")


@router.post("/sales-trends", response_model=SalesTrendResponse)
async def get_sales_trends_post(
    request: SalesTrendRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get sales trend analysis with detailed filters (POST method for complex filters)
    """
    try:
        reports_service = ReportsService(db)
        
        result = reports_service.get_sales_trends(
            tenant_id=current_user.tenant_id,
            period=request.period,
            start_date=request.start_date,
            end_date=request.end_date,
            filters=request.filters
        )
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating sales trends: {str(e)}")


@router.get("/profit-loss", response_model=ProfitLossResponse)
async def get_profit_loss_report(
    start_date: date = Query(..., description="Start date"),
    end_date: date = Query(..., description="End date"),
    include_categories: bool = Query(True, description="Include category breakdown"),
    customer_ids: Optional[List[UUID]] = Query(None, description="Filter by customer IDs"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get profit & loss report with category breakdowns
    
    - **start_date**: Report start date
    - **end_date**: Report end date
    - **include_categories**: Include product category breakdown
    - **customer_ids**: Filter by specific customers (optional)
    """
    try:
        reports_service = ReportsService(db)
        
        # Build filters
        filters = None
        if customer_ids:
            filters = ReportFilters(customer_ids=customer_ids)
        
        result = reports_service.get_profit_loss_report(
            tenant_id=current_user.tenant_id,
            start_date=start_date,
            end_date=end_date,
            include_categories=include_categories,
            filters=filters
        )
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating profit & loss report: {str(e)}")


@router.post("/profit-loss", response_model=ProfitLossResponse)
async def get_profit_loss_report_post(
    request: ProfitLossRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get profit & loss report with detailed filters (POST method for complex filters)
    """
    try:
        reports_service = ReportsService(db)
        
        result = reports_service.get_profit_loss_report(
            tenant_id=current_user.tenant_id,
            start_date=request.start_date,
            end_date=request.end_date,
            include_categories=request.include_categories,
            filters=request.filters
        )
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating profit & loss report: {str(e)}")


@router.get("/customer-analytics", response_model=CustomerAnalyticsResponse)
async def get_customer_analytics(
    start_date: Optional[date] = Query(None, description="Start date"),
    end_date: Optional[date] = Query(None, description="End date"),
    top_customers_limit: int = Query(10, ge=1, le=100, description="Number of top customers to return"),
    customer_ids: Optional[List[UUID]] = Query(None, description="Filter by customer IDs"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get customer analytics with lifetime value and purchase patterns
    
    - **start_date**: Analysis start date (optional, defaults to 1 year ago)
    - **end_date**: Analysis end date (optional, defaults to today)
    - **top_customers_limit**: Number of top customers to include (1-100)
    - **customer_ids**: Filter by specific customers (optional)
    """
    try:
        reports_service = ReportsService(db)
        
        # Build filters
        filters = None
        if customer_ids:
            filters = ReportFilters(customer_ids=customer_ids)
        
        result = reports_service.get_customer_analytics(
            tenant_id=current_user.tenant_id,
            start_date=start_date,
            end_date=end_date,
            top_customers_limit=top_customers_limit,
            filters=filters
        )
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating customer analytics: {str(e)}")


@router.post("/customer-analytics", response_model=CustomerAnalyticsResponse)
async def get_customer_analytics_post(
    request: CustomerAnalyticsRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get customer analytics with detailed filters (POST method for complex filters)
    """
    try:
        reports_service = ReportsService(db)
        
        result = reports_service.get_customer_analytics(
            tenant_id=current_user.tenant_id,
            start_date=request.start_date,
            end_date=request.end_date,
            top_customers_limit=request.top_customers_limit,
            filters=request.filters
        )
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating customer analytics: {str(e)}")


@router.get("/aging-report", response_model=AgingReportResponse)
async def get_aging_report(
    as_of_date: Optional[date] = Query(None, description="As of date"),
    customer_ids: Optional[List[UUID]] = Query(None, description="Filter by customer IDs"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get accounts receivable aging report
    
    - **as_of_date**: Report as of date (optional, defaults to today)
    - **customer_ids**: Filter by specific customers (optional)
    """
    try:
        reports_service = ReportsService(db)
        
        # Build filters
        filters = None
        if customer_ids:
            filters = ReportFilters(customer_ids=customer_ids)
        
        result = reports_service.get_receivables_aging_report(
            tenant_id=current_user.tenant_id,
            as_of_date=as_of_date,
            filters=filters
        )
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating aging report: {str(e)}")


@router.post("/aging-report", response_model=AgingReportResponse)
async def get_aging_report_post(
    request: AgingReportRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get accounts receivable aging report with detailed filters (POST method for complex filters)
    """
    try:
        reports_service = ReportsService(db)
        
        result = reports_service.get_receivables_aging_report(
            tenant_id=current_user.tenant_id,
            as_of_date=request.as_of_date,
            filters=request.filters
        )
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating aging report: {str(e)}")


@router.get("/summary")
async def get_reports_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get summary of available reports and recent activity
    """
    try:
        reports_service = ReportsService(db)
        
        # Get basic metrics for dashboard
        from datetime import datetime, timedelta
        from app.models.invoice import Invoice
        from app.models.customer import Customer
        from sqlalchemy import func
        
        # Last 30 days metrics
        thirty_days_ago = datetime.now() - timedelta(days=30)
        
        # Total sales last 30 days
        total_sales = db.query(func.sum(Invoice.total_amount)).filter(
            Invoice.tenant_id == current_user.tenant_id,
            Invoice.invoice_date >= thirty_days_ago,
            Invoice.status.in_(['PAID', 'PARTIALLY_PAID'])
        ).scalar() or 0
        
        # Total invoices last 30 days
        total_invoices = db.query(func.count(Invoice.id)).filter(
            Invoice.tenant_id == current_user.tenant_id,
            Invoice.invoice_date >= thirty_days_ago
        ).scalar() or 0
        
        # Active customers
        active_customers = db.query(func.count(func.distinct(Invoice.customer_id))).filter(
            Invoice.tenant_id == current_user.tenant_id,
            Invoice.invoice_date >= thirty_days_ago
        ).scalar() or 0
        
        # Total customers
        total_customers = db.query(func.count(Customer.id)).filter(
            Customer.tenant_id == current_user.tenant_id
        ).scalar() or 0
        
        # Outstanding receivables
        outstanding_receivables = db.query(
            func.sum(Invoice.total_amount - Invoice.paid_amount)
        ).filter(
            Invoice.tenant_id == current_user.tenant_id,
            Invoice.total_amount > Invoice.paid_amount
        ).scalar() or 0
        
        return {
            "summary": {
                "last_30_days": {
                    "total_sales": float(total_sales),
                    "total_invoices": total_invoices,
                    "active_customers": active_customers,
                    "average_invoice": float(total_sales / total_invoices) if total_invoices > 0 else 0
                },
                "overall": {
                    "total_customers": total_customers,
                    "outstanding_receivables": float(outstanding_receivables)
                }
            },
            "available_reports": [
                {
                    "name": "Sales Trends",
                    "endpoint": "/api/reports/sales-trends",
                    "description": "Daily, weekly, and monthly sales analysis"
                },
                {
                    "name": "Profit & Loss",
                    "endpoint": "/api/reports/profit-loss",
                    "description": "Profit and loss analysis with category breakdown"
                },
                {
                    "name": "Customer Analytics",
                    "endpoint": "/api/reports/customer-analytics",
                    "description": "Customer lifetime value and purchase patterns"
                },
                {
                    "name": "Aging Report",
                    "endpoint": "/api/reports/aging-report",
                    "description": "Accounts receivable aging analysis"
                }
            ]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting reports summary: {str(e)}")


# Future: Report export functionality
@router.post("/export", response_model=ReportExportResponse)
async def export_report(
    request: ReportExportRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Export report in various formats (CSV, Excel, PDF, JSON)
    
    This endpoint will be implemented in future tasks for report export functionality.
    """
    raise HTTPException(
        status_code=501, 
        detail="Report export functionality will be implemented in future tasks"
    )