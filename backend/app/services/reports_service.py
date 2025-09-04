"""
Advanced Reporting Service for comprehensive business analytics
"""

from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_, case, extract, text
from datetime import datetime, timedelta, date
from decimal import Decimal
from typing import List, Dict, Any, Optional, Tuple
from uuid import UUID
import logging

from app.models.invoice import Invoice, InvoiceItem, InvoiceStatus, InvoiceType
from app.models.customer import Customer, CustomerType
from app.models.product import Product, ProductCategory
from app.models.accounting import CustomerPayment, Account, JournalEntry
from app.schemas.reports import (
    SalesTrendResponse, SalesTrendPeriod, SalesTrendData,
    ProfitLossResponse, ProfitLossCategory, ProfitLossData,
    CustomerAnalyticsResponse, CustomerAnalyticsData, CustomerLifetimeValue,
    AgingReportResponse, AgingBucket, AgingReportData,
    ReportDateRange, ReportFilters
)

logger = logging.getLogger(__name__)


class ReportsService:
    """Service for generating advanced business reports and analytics"""
    
    def __init__(self, db: Session):
        self.db = db
    
    # Sales Trend Analysis
    def get_sales_trends(
        self, 
        tenant_id: UUID, 
        period: SalesTrendPeriod,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        filters: Optional[ReportFilters] = None
    ) -> SalesTrendResponse:
        """
        Generate sales trend analysis with daily, weekly, monthly aggregations
        """
        try:
            # Set default date range if not provided
            if not end_date:
                end_date = date.today()
            
            if not start_date:
                if period == SalesTrendPeriod.DAILY:
                    start_date = end_date - timedelta(days=30)
                elif period == SalesTrendPeriod.WEEKLY:
                    start_date = end_date - timedelta(weeks=12)
                else:  # MONTHLY
                    start_date = end_date - timedelta(days=365)
            
            # Build base query
            query = self.db.query(Invoice).filter(
                Invoice.tenant_id == tenant_id,
                Invoice.status.in_([InvoiceStatus.PAID, InvoiceStatus.PARTIALLY_PAID]),
                Invoice.invoice_date >= start_date,
                Invoice.invoice_date <= end_date
            )
            
            # Apply filters
            if filters:
                if filters.customer_ids:
                    query = query.filter(Invoice.customer_id.in_(filters.customer_ids))
                if filters.invoice_types:
                    query = query.filter(Invoice.invoice_type.in_(filters.invoice_types))
            
            # Group by period
            if period == SalesTrendPeriod.DAILY:
                date_trunc = func.date_trunc('day', Invoice.invoice_date)
                date_format = 'YYYY-MM-DD'
            elif period == SalesTrendPeriod.WEEKLY:
                date_trunc = func.date_trunc('week', Invoice.invoice_date)
                date_format = 'YYYY-"W"WW'
            else:  # MONTHLY
                date_trunc = func.date_trunc('month', Invoice.invoice_date)
                date_format = 'YYYY-MM'
            
            # Aggregate sales data
            sales_data = query.with_entities(
                date_trunc.label('period'),
                func.count(Invoice.id).label('invoice_count'),
                func.sum(Invoice.total_amount).label('total_sales'),
                func.sum(Invoice.paid_amount).label('total_paid'),
                func.avg(Invoice.total_amount).label('average_invoice'),
                func.sum(
                    case(
                        (Invoice.invoice_type == InvoiceType.GENERAL, Invoice.total_amount),
                        else_=0
                    )
                ).label('general_sales'),
                func.sum(
                    case(
                        (Invoice.invoice_type == InvoiceType.GOLD, Invoice.total_amount),
                        else_=0
                    )
                ).label('gold_sales')
            ).group_by(date_trunc).order_by(date_trunc).all()
            
            # Convert to response format
            trend_data = []
            for row in sales_data:
                trend_data.append(SalesTrendData(
                    period=row.period.strftime('%Y-%m-%d' if period == SalesTrendPeriod.DAILY else 
                           '%Y-W%U' if period == SalesTrendPeriod.WEEKLY else '%Y-%m'),
                    invoice_count=row.invoice_count or 0,
                    total_sales=row.total_sales or Decimal('0'),
                    total_paid=row.total_paid or Decimal('0'),
                    average_invoice=row.average_invoice or Decimal('0'),
                    general_sales=row.general_sales or Decimal('0'),
                    gold_sales=row.gold_sales or Decimal('0')
                ))
            
            # Calculate summary statistics
            total_sales = sum(item.total_sales for item in trend_data)
            total_invoices = sum(item.invoice_count for item in trend_data)
            average_invoice = total_sales / total_invoices if total_invoices > 0 else Decimal('0')
            
            # Calculate growth rate (comparing first and last periods)
            growth_rate = Decimal('0')
            if len(trend_data) >= 2:
                first_period = trend_data[0].total_sales
                last_period = trend_data[-1].total_sales
                if first_period > 0:
                    growth_rate = ((last_period - first_period) / first_period) * 100
            
            return SalesTrendResponse(
                period=period,
                start_date=start_date,
                end_date=end_date,
                data=trend_data,
                summary={
                    'total_sales': total_sales,
                    'total_invoices': total_invoices,
                    'average_invoice': average_invoice,
                    'growth_rate': growth_rate
                }
            )
            
        except Exception as e:
            logger.error(f"Error generating sales trends for tenant {tenant_id}: {e}")
            raise
    
    # Profit & Loss Analysis
    def get_profit_loss_report(
        self,
        tenant_id: UUID,
        start_date: date,
        end_date: date,
        include_categories: bool = True,
        filters: Optional[ReportFilters] = None
    ) -> ProfitLossResponse:
        """
        Generate profit & loss report with category breakdowns
        """
        try:
            # Revenue calculation
            revenue_query = self.db.query(
                func.sum(Invoice.total_amount).label('total_revenue'),
                func.sum(
                    case(
                        (Invoice.invoice_type == InvoiceType.GENERAL, Invoice.total_amount),
                        else_=0
                    )
                ).label('general_revenue'),
                func.sum(
                    case(
                        (Invoice.invoice_type == InvoiceType.GOLD, Invoice.total_amount),
                        else_=0
                    )
                ).label('gold_revenue')
            ).filter(
                Invoice.tenant_id == tenant_id,
                Invoice.status.in_([InvoiceStatus.PAID, InvoiceStatus.PARTIALLY_PAID]),
                Invoice.invoice_date >= start_date,
                Invoice.invoice_date <= end_date
            )
            
            # Apply filters
            if filters:
                if filters.customer_ids:
                    revenue_query = revenue_query.filter(Invoice.customer_id.in_(filters.customer_ids))
                if filters.invoice_types:
                    revenue_query = revenue_query.filter(Invoice.invoice_type.in_(filters.invoice_types))
            
            revenue_result = revenue_query.first()
            
            # Cost of Goods Sold calculation
            cogs_query = self.db.query(
                func.sum(
                    InvoiceItem.quantity * Product.cost_price
                ).label('total_cogs')
            ).join(
                Invoice, InvoiceItem.invoice_id == Invoice.id
            ).join(
                Product, InvoiceItem.product_id == Product.id
            ).filter(
                Invoice.tenant_id == tenant_id,
                Invoice.status.in_([InvoiceStatus.PAID, InvoiceStatus.PARTIALLY_PAID]),
                Invoice.invoice_date >= start_date,
                Invoice.invoice_date <= end_date,
                Product.cost_price.isnot(None)
            )
            
            cogs_result = cogs_query.first()
            
            # Category breakdown if requested
            category_data = []
            if include_categories:
                category_query = self.db.query(
                    ProductCategory.name.label('category_name'),
                    func.sum(InvoiceItem.line_total).label('category_revenue'),
                    func.sum(
                        InvoiceItem.quantity * Product.cost_price
                    ).label('category_cogs'),
                    func.count(InvoiceItem.id).label('item_count')
                ).join(
                    Invoice, InvoiceItem.invoice_id == Invoice.id
                ).join(
                    Product, InvoiceItem.product_id == Product.id
                ).outerjoin(
                    ProductCategory, Product.category_id == ProductCategory.id
                ).filter(
                    Invoice.tenant_id == tenant_id,
                    Invoice.status.in_([InvoiceStatus.PAID, InvoiceStatus.PARTIALLY_PAID]),
                    Invoice.invoice_date >= start_date,
                    Invoice.invoice_date <= end_date
                ).group_by(ProductCategory.name).all()
                
                for row in category_query:
                    category_revenue = row.category_revenue or Decimal('0')
                    category_cogs = row.category_cogs or Decimal('0')
                    category_profit = category_revenue - category_cogs
                    profit_margin = (category_profit / category_revenue * 100) if category_revenue > 0 else Decimal('0')
                    
                    category_data.append(ProfitLossCategory(
                        name=row.category_name or 'Uncategorized',
                        revenue=category_revenue,
                        cost_of_goods=category_cogs,
                        gross_profit=category_profit,
                        profit_margin=profit_margin,
                        item_count=row.item_count or 0
                    ))
            
            # Calculate totals
            total_revenue = revenue_result.total_revenue or Decimal('0')
            general_revenue = revenue_result.general_revenue or Decimal('0')
            gold_revenue = revenue_result.gold_revenue or Decimal('0')
            total_cogs = cogs_result.total_cogs or Decimal('0')
            
            gross_profit = total_revenue - total_cogs
            gross_margin = (gross_profit / total_revenue * 100) if total_revenue > 0 else Decimal('0')
            
            return ProfitLossResponse(
                start_date=start_date,
                end_date=end_date,
                data=ProfitLossData(
                    total_revenue=total_revenue,
                    general_revenue=general_revenue,
                    gold_revenue=gold_revenue,
                    cost_of_goods_sold=total_cogs,
                    gross_profit=gross_profit,
                    gross_margin=gross_margin,
                    categories=category_data
                )
            )
            
        except Exception as e:
            logger.error(f"Error generating profit & loss report for tenant {tenant_id}: {e}")
            raise
    
    # Customer Analytics
    def get_customer_analytics(
        self,
        tenant_id: UUID,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        top_customers_limit: int = 10,
        filters: Optional[ReportFilters] = None
    ) -> CustomerAnalyticsResponse:
        """
        Generate customer analytics with lifetime value and purchase patterns
        """
        try:
            # Set default date range
            if not end_date:
                end_date = date.today()
            if not start_date:
                start_date = end_date - timedelta(days=365)  # Last year
            
            # Customer lifetime value calculation
            clv_query = self.db.query(
                Customer.id,
                Customer.name,
                Customer.customer_type,
                func.sum(Invoice.total_amount).label('total_spent'),
                func.sum(Invoice.paid_amount).label('total_paid'),
                func.count(Invoice.id).label('invoice_count'),
                func.avg(Invoice.total_amount).label('average_order'),
                func.min(Invoice.invoice_date).label('first_purchase'),
                func.max(Invoice.invoice_date).label('last_purchase'),
                func.sum(Customer.total_debt).label('outstanding_debt')
            ).join(
                Invoice, Customer.id == Invoice.customer_id
            ).filter(
                Customer.tenant_id == tenant_id,
                Invoice.invoice_date >= start_date,
                Invoice.invoice_date <= end_date
            )
            
            # Apply filters
            if filters:
                if filters.customer_ids:
                    clv_query = clv_query.filter(Customer.id.in_(filters.customer_ids))
            
            clv_results = clv_query.group_by(
                Customer.id, Customer.name, Customer.customer_type
            ).order_by(
                func.sum(Invoice.total_amount).desc()
            ).limit(top_customers_limit).all()
            
            # Convert to response format
            top_customers = []
            for row in clv_results:
                # Calculate customer metrics
                days_active = (row.last_purchase - row.first_purchase).days if row.last_purchase and row.first_purchase else 0
                purchase_frequency = row.invoice_count / max(days_active / 30, 1) if days_active > 0 else 0  # purchases per month
                
                top_customers.append(CustomerLifetimeValue(
                    customer_id=row.id,
                    customer_name=row.name,
                    customer_type=row.customer_type,
                    total_spent=row.total_spent or Decimal('0'),
                    total_paid=row.total_paid or Decimal('0'),
                    invoice_count=row.invoice_count or 0,
                    average_order_value=row.average_order or Decimal('0'),
                    first_purchase_date=row.first_purchase,
                    last_purchase_date=row.last_purchase,
                    outstanding_debt=row.outstanding_debt or Decimal('0'),
                    days_active=days_active,
                    purchase_frequency=round(purchase_frequency, 2)
                ))
            
            # Customer segmentation analysis
            segmentation_query = self.db.query(
                Customer.customer_type,
                func.count(Customer.id).label('customer_count'),
                func.sum(Invoice.total_amount).label('segment_revenue'),
                func.avg(Invoice.total_amount).label('avg_order_value')
            ).join(
                Invoice, Customer.id == Invoice.customer_id
            ).filter(
                Customer.tenant_id == tenant_id,
                Invoice.invoice_date >= start_date,
                Invoice.invoice_date <= end_date
            ).group_by(Customer.customer_type).all()
            
            segmentation_data = {}
            for row in segmentation_query:
                segmentation_data[row.customer_type.value] = {
                    'customer_count': row.customer_count,
                    'total_revenue': row.segment_revenue or Decimal('0'),
                    'average_order_value': row.avg_order_value or Decimal('0')
                }
            
            # Purchase pattern analysis
            pattern_query = self.db.query(
                extract('month', Invoice.invoice_date).label('month'),
                func.count(Invoice.id).label('invoice_count'),
                func.sum(Invoice.total_amount).label('monthly_revenue')
            ).filter(
                Invoice.tenant_id == tenant_id,
                Invoice.invoice_date >= start_date,
                Invoice.invoice_date <= end_date
            ).group_by(extract('month', Invoice.invoice_date)).all()
            
            monthly_patterns = {}
            for row in pattern_query:
                month_name = [
                    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
                ][int(row.month) - 1]
                monthly_patterns[month_name] = {
                    'invoice_count': row.invoice_count,
                    'revenue': row.monthly_revenue or Decimal('0')
                }
            
            # Calculate summary metrics
            total_customers = self.db.query(func.count(Customer.id)).filter(
                Customer.tenant_id == tenant_id
            ).scalar()
            
            active_customers = self.db.query(func.count(func.distinct(Invoice.customer_id))).filter(
                Invoice.tenant_id == tenant_id,
                Invoice.invoice_date >= start_date,
                Invoice.invoice_date <= end_date
            ).scalar()
            
            return CustomerAnalyticsResponse(
                start_date=start_date,
                end_date=end_date,
                data=CustomerAnalyticsData(
                    total_customers=total_customers or 0,
                    active_customers=active_customers or 0,
                    top_customers=top_customers,
                    customer_segmentation=segmentation_data,
                    monthly_purchase_patterns=monthly_patterns
                )
            )
            
        except Exception as e:
            logger.error(f"Error generating customer analytics for tenant {tenant_id}: {e}")
            raise
    
    # Accounts Receivable Aging Report
    def get_receivables_aging_report(
        self,
        tenant_id: UUID,
        as_of_date: Optional[date] = None,
        filters: Optional[ReportFilters] = None
    ) -> AgingReportResponse:
        """
        Generate accounts receivable aging report
        """
        try:
            if not as_of_date:
                as_of_date = date.today()
            
            # Get unpaid invoices
            query = self.db.query(
                Invoice.id,
                Invoice.invoice_number,
                Invoice.customer_id,
                Customer.name.label('customer_name'),
                Invoice.invoice_date,
                Invoice.due_date,
                Invoice.total_amount,
                Invoice.paid_amount,
                (Invoice.total_amount - Invoice.paid_amount).label('balance_due')
            ).join(
                Customer, Invoice.customer_id == Customer.id
            ).filter(
                Invoice.tenant_id == tenant_id,
                Invoice.total_amount > Invoice.paid_amount,  # Has outstanding balance
                Invoice.status != InvoiceStatus.CANCELLED
            )
            
            # Apply filters
            if filters:
                if filters.customer_ids:
                    query = query.filter(Invoice.customer_id.in_(filters.customer_ids))
            
            invoices = query.all()
            
            # Define aging buckets
            buckets = [
                AgingBucket(name="Current", min_days=0, max_days=0, amount=Decimal('0'), count=0),
                AgingBucket(name="1-30 Days", min_days=1, max_days=30, amount=Decimal('0'), count=0),
                AgingBucket(name="31-60 Days", min_days=31, max_days=60, amount=Decimal('0'), count=0),
                AgingBucket(name="61-90 Days", min_days=61, max_days=90, amount=Decimal('0'), count=0),
                AgingBucket(name="Over 90 Days", min_days=91, max_days=999999, amount=Decimal('0'), count=0)
            ]
            
            # Customer aging data
            customer_aging = {}
            
            for invoice in invoices:
                balance_due = invoice.balance_due or Decimal('0')
                
                # Calculate days overdue
                due_date = invoice.due_date or invoice.invoice_date
                days_overdue = (as_of_date - due_date.date()).days if due_date else 0
                days_overdue = max(0, days_overdue)
                
                # Find appropriate bucket
                bucket_index = 0
                for i, bucket in enumerate(buckets):
                    if bucket.min_days <= days_overdue <= bucket.max_days:
                        bucket_index = i
                        break
                
                # Update bucket totals
                buckets[bucket_index].amount += balance_due
                buckets[bucket_index].count += 1
                
                # Update customer totals
                customer_key = (invoice.customer_id, invoice.customer_name)
                if customer_key not in customer_aging:
                    customer_aging[customer_key] = {
                        'customer_id': invoice.customer_id,
                        'customer_name': invoice.customer_name,
                        'total_balance': Decimal('0'),
                        'buckets': [Decimal('0')] * len(buckets),
                        'invoice_count': 0
                    }
                
                customer_aging[customer_key]['total_balance'] += balance_due
                customer_aging[customer_key]['buckets'][bucket_index] += balance_due
                customer_aging[customer_key]['invoice_count'] += 1
            
            # Convert customer data to response format
            aging_data = []
            for customer_data in customer_aging.values():
                aging_data.append(AgingReportData(
                    customer_id=customer_data['customer_id'],
                    customer_name=customer_data['customer_name'],
                    total_balance=customer_data['total_balance'],
                    current=customer_data['buckets'][0],
                    days_1_30=customer_data['buckets'][1],
                    days_31_60=customer_data['buckets'][2],
                    days_61_90=customer_data['buckets'][3],
                    over_90_days=customer_data['buckets'][4],
                    invoice_count=customer_data['invoice_count']
                ))
            
            # Sort by total balance descending
            aging_data.sort(key=lambda x: x.total_balance, reverse=True)
            
            # Calculate totals
            total_receivables = sum(bucket.amount for bucket in buckets)
            
            return AgingReportResponse(
                as_of_date=as_of_date,
                total_receivables=total_receivables,
                buckets=buckets,
                customers=aging_data
            )
            
        except Exception as e:
            logger.error(f"Error generating aging report for tenant {tenant_id}: {e}")
            raise