"""
Dashboard Service for main tenant dashboard analytics and business insights
"""

from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_, case, extract, text, desc
from datetime import datetime, timedelta, date
from decimal import Decimal
from typing import List, Dict, Any, Optional, Tuple
from uuid import UUID
import logging
import json

from app.models.invoice import Invoice, InvoiceItem, InvoiceStatus, InvoiceType
from app.models.customer import Customer, CustomerType
from app.models.product import Product
from app.models.accounting import CustomerPayment, Account, JournalEntry
from app.models.installment import Installment, InstallmentStatus, InstallmentType
from app.services.business_intelligence_service import BusinessIntelligenceService
from app.services.reports_service import ReportsService

logger = logging.getLogger(__name__)


class DashboardService:
    """Service for tenant dashboard analytics and business insights"""
    
    def __init__(self, db: Session):
        self.db = db
        self.bi_service = BusinessIntelligenceService(db)
        self.reports_service = ReportsService(db)
    
    def get_dashboard_summary(self, tenant_id: UUID) -> Dict[str, Any]:
        """
        Get main dashboard summary with key metrics
        """
        try:
            # Current month metrics
            current_month_start = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            current_month_end = datetime.now()
            
            # Previous month for comparison
            if current_month_start.month == 1:
                prev_month_start = current_month_start.replace(year=current_month_start.year - 1, month=12)
            else:
                prev_month_start = current_month_start.replace(month=current_month_start.month - 1)
            
            prev_month_end = current_month_start - timedelta(days=1)
            
            # Current month metrics
            current_metrics = self._calculate_period_metrics(
                tenant_id, current_month_start, current_month_end
            )
            
            # Previous month metrics for comparison
            previous_metrics = self._calculate_period_metrics(
                tenant_id, prev_month_start, prev_month_end
            )
            
            # Calculate growth rates
            revenue_growth = self._calculate_growth_rate(
                current_metrics['total_revenue'], 
                previous_metrics['total_revenue']
            )
            
            customer_growth = self._calculate_growth_rate(
                Decimal(str(current_metrics['active_customers'])), 
                Decimal(str(previous_metrics['active_customers']))
            )
            
            invoice_growth = self._calculate_growth_rate(
                Decimal(str(current_metrics['invoice_count'])), 
                Decimal(str(previous_metrics['invoice_count']))
            )
            
            return {
                'period': 'current_month',
                'period_start': current_month_start.date(),
                'period_end': current_month_end.date(),
                'metrics': {
                    'total_revenue': {
                        'value': current_metrics['total_revenue'],
                        'previous_value': previous_metrics['total_revenue'],
                        'growth_rate': revenue_growth,
                        'label': 'کل درآمد',
                        'unit': 'currency'
                    },
                    'active_customers': {
                        'value': current_metrics['active_customers'],
                        'previous_value': previous_metrics['active_customers'],
                        'growth_rate': customer_growth,
                        'label': 'مشتریان فعال',
                        'unit': 'count'
                    },
                    'invoice_count': {
                        'value': current_metrics['invoice_count'],
                        'previous_value': previous_metrics['invoice_count'],
                        'growth_rate': invoice_growth,
                        'label': 'تعداد فاکتور',
                        'unit': 'count'
                    },
                    'average_order_value': {
                        'value': current_metrics['average_order_value'],
                        'previous_value': previous_metrics['average_order_value'],
                        'growth_rate': self._calculate_growth_rate(
                            current_metrics['average_order_value'],
                            previous_metrics['average_order_value']
                        ),
                        'label': 'متوسط ارزش سفارش',
                        'unit': 'currency'
                    },
                    'outstanding_receivables': {
                        'value': current_metrics['outstanding_receivables'],
                        'label': 'مطالبات معوق',
                        'unit': 'currency'
                    },
                    'overdue_amount': {
                        'value': current_metrics['overdue_amount'],
                        'label': 'مبلغ سررسید گذشته',
                        'unit': 'currency'
                    }
                }
            }
            
        except Exception as e:
            logger.error(f"Error getting dashboard summary for tenant {tenant_id}: {e}")
            raise
    
    def get_recent_activities(self, tenant_id: UUID, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Get recent business activities for dashboard
        """
        try:
            activities = []
            
            # Recent invoices
            recent_invoices = self.db.query(
                Invoice.id,
                Invoice.invoice_number,
                Invoice.total_amount,
                Invoice.invoice_type,
                Invoice.status,
                Invoice.created_at,
                Customer.name.label('customer_name')
            ).join(
                Customer, Invoice.customer_id == Customer.id
            ).filter(
                Invoice.tenant_id == tenant_id
            ).order_by(
                Invoice.created_at.desc()
            ).limit(limit // 2).all()
            
            for invoice in recent_invoices:
                activities.append({
                    'type': 'invoice_created',
                    'title': f'فاکتور {invoice.invoice_number} ایجاد شد',
                    'description': f'برای مشتری {invoice.customer_name} - مبلغ: {invoice.total_amount:,.0f} تومان',
                    'amount': invoice.total_amount,
                    'customer': invoice.customer_name,
                    'timestamp': invoice.created_at,
                    'status': invoice.status.value,
                    'invoice_type': invoice.invoice_type.value,
                    'reference_id': str(invoice.id)
                })
            
            # Recent payments
            recent_payments = self.db.query(
                CustomerPayment.id,
                CustomerPayment.amount,
                CustomerPayment.payment_date,
                CustomerPayment.payment_method,
                Customer.name.label('customer_name'),
                Invoice.invoice_number
            ).join(
                Customer, CustomerPayment.customer_id == Customer.id
            ).outerjoin(
                Invoice, CustomerPayment.invoice_id == Invoice.id
            ).filter(
                CustomerPayment.tenant_id == tenant_id
            ).order_by(
                CustomerPayment.payment_date.desc()
            ).limit(limit // 2).all()
            
            for payment in recent_payments:
                activities.append({
                    'type': 'payment_received',
                    'title': 'پرداخت دریافت شد',
                    'description': f'از مشتری {payment.customer_name} - مبلغ: {payment.amount:,.0f} تومان',
                    'amount': payment.amount,
                    'customer': payment.customer_name,
                    'timestamp': payment.payment_date,
                    'payment_method': payment.payment_method.value if payment.payment_method else 'نامشخص',
                    'invoice_number': payment.invoice_number,
                    'reference_id': str(payment.id)
                })
            
            # Sort all activities by timestamp
            activities.sort(key=lambda x: x['timestamp'], reverse=True)
            
            return activities[:limit]
            
        except Exception as e:
            logger.error(f"Error getting recent activities for tenant {tenant_id}: {e}")
            raise
    
    def get_business_insights(self, tenant_id: UUID) -> Dict[str, Any]:
        """
        Get AI-driven business insights for dashboard
        """
        try:
            # Get business insights from BI service
            insights_response = self.bi_service.generate_business_insights(
                tenant_id=tenant_id,
                analysis_period_days=30,
                comparison_period_days=30
            )
            
            # Format for dashboard display
            formatted_insights = []
            for insight in insights_response.insights:
                formatted_insights.append({
                    'type': insight.type.value,
                    'priority': insight.priority.value,
                    'title': insight.title_persian or insight.title,
                    'description': insight.description_persian or insight.description,
                    'impact_score': insight.impact_score,
                    'confidence_score': insight.confidence_score,
                    'actionable': insight.actionable,
                    'action_items': insight.action_items or []
                })
            
            return {
                'summary': insights_response.summary,
                'insights': formatted_insights[:5],  # Top 5 insights for dashboard
                'recommendations': insights_response.recommendations[:3],  # Top 3 recommendations
                'generated_at': insights_response.generated_at
            }
            
        except Exception as e:
            logger.error(f"Error getting business insights for tenant {tenant_id}: {e}")
            raise
    
    def get_alerts_and_notifications(self, tenant_id: UUID) -> Dict[str, Any]:
        """
        Get important alerts and notifications for dashboard
        """
        try:
            alerts = []
            
            # Overdue payment alerts
            overdue_invoices = self.db.query(
                func.count(Invoice.id).label('count'),
                func.sum(Invoice.total_amount - Invoice.paid_amount).label('total_amount')
            ).filter(
                Invoice.tenant_id == tenant_id,
                Invoice.total_amount > Invoice.paid_amount,
                Invoice.due_date < datetime.now(),
                Invoice.status != InvoiceStatus.CANCELLED
            ).first()
            
            if overdue_invoices.count and overdue_invoices.count > 0:
                alerts.append({
                    'type': 'overdue_payments',
                    'severity': 'high' if overdue_invoices.count > 5 else 'medium',
                    'title': f'{overdue_invoices.count} فاکتور سررسید گذشته',
                    'description': f'مجموع مبلغ: {overdue_invoices.total_amount:,.0f} تومان',
                    'count': overdue_invoices.count,
                    'amount': overdue_invoices.total_amount,
                    'action': 'view_overdue_invoices'
                })
            
            # Upcoming installment due dates
            upcoming_installments = self.db.query(
                func.count(Installment.id).label('count'),
                func.sum(Installment.amount_due - Installment.amount_paid).label('total_amount')
            ).join(
                Invoice, Installment.invoice_id == Invoice.id
            ).filter(
                Invoice.tenant_id == tenant_id,
                Installment.status == InstallmentStatus.PENDING,
                Installment.due_date >= datetime.now().date(),
                Installment.due_date <= (datetime.now() + timedelta(days=7)).date()
            ).first()
            
            if upcoming_installments.count and upcoming_installments.count > 0:
                alerts.append({
                    'type': 'upcoming_installments',
                    'severity': 'medium',
                    'title': f'{upcoming_installments.count} قسط در هفته آینده',
                    'description': f'مجموع مبلغ: {upcoming_installments.total_amount:,.0f} تومان',
                    'count': upcoming_installments.count,
                    'amount': upcoming_installments.total_amount,
                    'action': 'view_installments'
                })
            
            # Low stock products
            low_stock_products = self.db.query(
                func.count(Product.id)
            ).filter(
                Product.tenant_id == tenant_id,
                Product.track_inventory == True,
                Product.stock_quantity <= Product.min_stock_level,
                Product.stock_quantity > 0
            ).scalar()
            
            if low_stock_products and low_stock_products > 0:
                alerts.append({
                    'type': 'low_stock',
                    'severity': 'medium',
                    'title': f'{low_stock_products} محصول کم موجود',
                    'description': 'محصولات نیاز به تأمین مجدد دارند',
                    'count': low_stock_products,
                    'action': 'view_inventory'
                })
            
            # Gold installment alerts (if applicable)
            upcoming_gold_installments = self.db.query(
                func.count(Installment.id).label('count'),
                func.sum(Installment.gold_weight_due - Installment.gold_weight_paid).label('total_weight')
            ).join(
                Invoice, Installment.invoice_id == Invoice.id
            ).filter(
                Invoice.tenant_id == tenant_id,
                Installment.installment_type == InstallmentType.GOLD,
                Installment.status == InstallmentStatus.PENDING,
                Installment.due_date >= datetime.now().date(),
                Installment.due_date <= (datetime.now() + timedelta(days=7)).date()
            ).first()
            
            if upcoming_gold_installments.count and upcoming_gold_installments.count > 0:
                alerts.append({
                    'type': 'upcoming_gold_installments',
                    'severity': 'medium',
                    'title': f'{upcoming_gold_installments.count} قسط طلا در هفته آینده',
                    'description': f'مجموع وزن: {upcoming_gold_installments.total_weight:.3f} گرم',
                    'count': upcoming_gold_installments.count,
                    'weight': upcoming_gold_installments.total_weight,
                    'action': 'view_gold_installments'
                })
            
            return {
                'alerts': alerts,
                'total_alerts': len(alerts),
                'critical_alerts': len([a for a in alerts if a['severity'] == 'critical']),
                'high_alerts': len([a for a in alerts if a['severity'] == 'high']),
                'medium_alerts': len([a for a in alerts if a['severity'] == 'medium'])
            }
            
        except Exception as e:
            logger.error(f"Error getting alerts for tenant {tenant_id}: {e}")
            raise
    
    def get_quick_stats(self, tenant_id: UUID) -> Dict[str, Any]:
        """
        Get quick statistics for dashboard widgets
        """
        try:
            # Today's stats
            today = datetime.now().date()
            today_start = datetime.combine(today, datetime.min.time())
            today_end = datetime.combine(today, datetime.max.time())
            
            # Today's revenue
            today_revenue = self.db.query(
                func.sum(Invoice.total_amount)
            ).filter(
                Invoice.tenant_id == tenant_id,
                Invoice.status.in_([InvoiceStatus.PAID, InvoiceStatus.PARTIALLY_PAID]),
                Invoice.invoice_date >= today_start,
                Invoice.invoice_date <= today_end
            ).scalar() or Decimal('0')
            
            # Today's invoices
            today_invoices = self.db.query(
                func.count(Invoice.id)
            ).filter(
                Invoice.tenant_id == tenant_id,
                Invoice.created_at >= today_start,
                Invoice.created_at <= today_end
            ).scalar() or 0
            
            # Total customers
            total_customers = self.db.query(
                func.count(Customer.id)
            ).filter(
                Customer.tenant_id == tenant_id,
                Customer.is_active == True
            ).scalar() or 0
            
            # Total products
            total_products = self.db.query(
                func.count(Product.id)
            ).filter(
                Product.tenant_id == tenant_id,
                Product.is_active == True
            ).scalar() or 0
            
            # Pending invoices
            pending_invoices = self.db.query(
                func.count(Invoice.id)
            ).filter(
                Invoice.tenant_id == tenant_id,
                Invoice.status.in_([InvoiceStatus.DRAFT, InvoiceStatus.SENT])
            ).scalar() or 0
            
            return {
                'today_revenue': today_revenue,
                'today_invoices': today_invoices,
                'total_customers': total_customers,
                'total_products': total_products,
                'pending_invoices': pending_invoices,
                'calculated_at': datetime.now()
            }
            
        except Exception as e:
            logger.error(f"Error getting quick stats for tenant {tenant_id}: {e}")
            raise
    
    def get_sales_chart_data(self, tenant_id: UUID, period_days: int = 30) -> Dict[str, Any]:
        """
        Get sales chart data for dashboard
        """
        try:
            end_date = datetime.now().date()
            start_date = end_date - timedelta(days=period_days)
            
            # Daily sales data
            daily_sales = self.db.query(
                func.date(Invoice.invoice_date).label('date'),
                func.sum(Invoice.total_amount).label('total_sales'),
                func.count(Invoice.id).label('invoice_count')
            ).filter(
                Invoice.tenant_id == tenant_id,
                Invoice.status.in_([InvoiceStatus.PAID, InvoiceStatus.PARTIALLY_PAID]),
                Invoice.invoice_date >= start_date,
                Invoice.invoice_date <= end_date
            ).group_by(
                func.date(Invoice.invoice_date)
            ).order_by(
                func.date(Invoice.invoice_date)
            ).all()
            
            # Format for chart
            chart_data = []
            for row in daily_sales:
                chart_data.append({
                    'date': row.date.strftime('%Y-%m-%d'),
                    'sales': float(row.total_sales or 0),
                    'invoices': row.invoice_count or 0
                })
            
            # Fill missing dates with zero values
            current_date = start_date
            date_map = {item['date']: item for item in chart_data}
            complete_data = []
            
            while current_date <= end_date:
                date_str = current_date.strftime('%Y-%m-%d')
                if date_str in date_map:
                    complete_data.append(date_map[date_str])
                else:
                    complete_data.append({
                        'date': date_str,
                        'sales': 0,
                        'invoices': 0
                    })
                current_date += timedelta(days=1)
            
            return {
                'period_days': period_days,
                'start_date': start_date,
                'end_date': end_date,
                'data': complete_data,
                'total_sales': sum(item['sales'] for item in complete_data),
                'total_invoices': sum(item['invoices'] for item in complete_data)
            }
            
        except Exception as e:
            logger.error(f"Error getting sales chart data for tenant {tenant_id}: {e}")
            raise
    
    # Private helper methods
    
    def _calculate_period_metrics(
        self, 
        tenant_id: UUID, 
        start_date: datetime, 
        end_date: datetime
    ) -> Dict[str, Any]:
        """Calculate metrics for a specific period"""
        
        # Revenue and invoice metrics
        revenue_query = self.db.query(
            func.sum(Invoice.total_amount).label('total_revenue'),
            func.count(Invoice.id).label('invoice_count'),
            func.avg(Invoice.total_amount).label('average_order_value'),
            func.count(func.distinct(Invoice.customer_id)).label('active_customers')
        ).filter(
            Invoice.tenant_id == tenant_id,
            Invoice.status.in_([InvoiceStatus.PAID, InvoiceStatus.PARTIALLY_PAID]),
            Invoice.invoice_date >= start_date,
            Invoice.invoice_date <= end_date
        ).first()
        
        # Outstanding receivables (all time)
        outstanding_receivables = self.db.query(
            func.sum(Invoice.total_amount - Invoice.paid_amount)
        ).filter(
            Invoice.tenant_id == tenant_id,
            Invoice.total_amount > Invoice.paid_amount,
            Invoice.status != InvoiceStatus.CANCELLED
        ).scalar() or Decimal('0')
        
        # Overdue amount (all time)
        overdue_amount = self.db.query(
            func.sum(Invoice.total_amount - Invoice.paid_amount)
        ).filter(
            Invoice.tenant_id == tenant_id,
            Invoice.total_amount > Invoice.paid_amount,
            Invoice.due_date < datetime.now(),
            Invoice.status != InvoiceStatus.CANCELLED
        ).scalar() or Decimal('0')
        
        return {
            'total_revenue': revenue_query.total_revenue or Decimal('0'),
            'invoice_count': revenue_query.invoice_count or 0,
            'average_order_value': revenue_query.average_order_value or Decimal('0'),
            'active_customers': revenue_query.active_customers or 0,
            'outstanding_receivables': outstanding_receivables,
            'overdue_amount': overdue_amount
        }
    
    def _calculate_growth_rate(self, current: Decimal, previous: Decimal) -> Decimal:
        """Calculate growth rate percentage"""
        if previous == 0:
            return Decimal('0') if current == 0 else Decimal('100')
        
        return ((current - previous) / previous) * 100