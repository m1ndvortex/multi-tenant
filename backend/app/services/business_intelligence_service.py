"""
Business Intelligence and Insights Service for AI-driven business analysis
"""

from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_, case, extract, text, desc
from datetime import datetime, timedelta, date
from decimal import Decimal
from typing import List, Dict, Any, Optional, Tuple
from uuid import UUID
import logging
import json
from dataclasses import dataclass

from app.models.invoice import Invoice, InvoiceItem, InvoiceStatus, InvoiceType
from app.models.customer import Customer, CustomerType
from app.models.product import Product, ProductCategory
from app.models.accounting import CustomerPayment, Account, JournalEntry
from app.schemas.business_intelligence import (
    BusinessInsightsResponse, BusinessInsightData, InsightType, InsightPriority,
    KPIMetricsResponse, KPIMetric, KPITrend,
    BusinessAlertResponse, BusinessAlert, AlertType, AlertSeverity,
    TrendAnalysisResponse, TrendData, TrendDirection,
    ReportExportRequest, ReportExportResponse, ExportFormat, ExportStatus
)

logger = logging.getLogger(__name__)


@dataclass
class BusinessMetrics:
    """Container for business metrics calculations"""
    total_revenue: Decimal
    revenue_growth: Decimal
    customer_count: int
    customer_growth: Decimal
    average_order_value: Decimal
    aov_growth: Decimal
    outstanding_receivables: Decimal
    overdue_amount: Decimal
    inventory_value: Decimal
    profit_margin: Decimal


class BusinessIntelligenceService:
    """Service for AI-driven business intelligence and insights"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def generate_business_insights(
        self, 
        tenant_id: UUID,
        analysis_period_days: int = 30,
        comparison_period_days: int = 30
    ) -> BusinessInsightsResponse:
        """
        Generate AI-driven business insights with plain language summaries
        """
        try:
            # Calculate current and comparison period metrics
            current_metrics = self._calculate_business_metrics(
                tenant_id, analysis_period_days
            )
            
            comparison_metrics = self._calculate_business_metrics(
                tenant_id, comparison_period_days, 
                offset_days=analysis_period_days
            )
            
            # Generate insights based on metrics comparison
            insights = self._analyze_business_performance(
                current_metrics, comparison_metrics
            )
            
            # Generate actionable recommendations
            recommendations = self._generate_recommendations(
                current_metrics, comparison_metrics, insights
            )
            
            return BusinessInsightsResponse(
                analysis_period_days=analysis_period_days,
                comparison_period_days=comparison_period_days,
                generated_at=datetime.utcnow(),
                insights=insights,
                recommendations=recommendations,
                summary=self._generate_executive_summary(insights, current_metrics)
            )
            
        except Exception as e:
            logger.error(f"Error generating business insights for tenant {tenant_id}: {e}")
            raise
    
    def calculate_kpi_metrics(
        self, 
        tenant_id: UUID,
        period_days: int = 30
    ) -> KPIMetricsResponse:
        """
        Calculate key performance indicators with trend detection
        """
        try:
            # Current period metrics
            current_metrics = self._calculate_business_metrics(tenant_id, period_days)
            
            # Previous period for comparison
            previous_metrics = self._calculate_business_metrics(
                tenant_id, period_days, offset_days=period_days
            )
            
            # Calculate KPIs with trends
            kpis = []
            
            # Revenue KPI
            revenue_trend = self._calculate_trend(
                current_metrics.total_revenue, 
                previous_metrics.total_revenue
            )
            kpis.append(KPIMetric(
                name="Total Revenue",
                name_persian="کل درآمد",
                value=current_metrics.total_revenue,
                previous_value=previous_metrics.total_revenue,
                trend=revenue_trend,
                change_percentage=current_metrics.revenue_growth,
                target_value=None,  # Could be set from tenant settings
                unit="currency"
            ))
            
            # Customer Count KPI
            customer_trend = self._calculate_trend(
                Decimal(str(current_metrics.customer_count)), 
                Decimal(str(previous_metrics.customer_count))
            )
            kpis.append(KPIMetric(
                name="Active Customers",
                name_persian="مشتریان فعال",
                value=Decimal(str(current_metrics.customer_count)),
                previous_value=Decimal(str(previous_metrics.customer_count)),
                trend=customer_trend,
                change_percentage=current_metrics.customer_growth,
                target_value=None,
                unit="count"
            ))
            
            # Average Order Value KPI
            aov_trend = self._calculate_trend(
                current_metrics.average_order_value,
                previous_metrics.average_order_value
            )
            kpis.append(KPIMetric(
                name="Average Order Value",
                name_persian="متوسط ارزش سفارش",
                value=current_metrics.average_order_value,
                previous_value=previous_metrics.average_order_value,
                trend=aov_trend,
                change_percentage=current_metrics.aov_growth,
                target_value=None,
                unit="currency"
            ))
            
            # Profit Margin KPI
            profit_trend = self._calculate_trend(
                current_metrics.profit_margin,
                previous_metrics.profit_margin
            )
            kpis.append(KPIMetric(
                name="Profit Margin",
                name_persian="حاشیه سود",
                value=current_metrics.profit_margin,
                previous_value=previous_metrics.profit_margin,
                trend=profit_trend,
                change_percentage=current_metrics.profit_margin - previous_metrics.profit_margin,
                target_value=Decimal('20.0'),  # 20% target
                unit="percentage"
            ))
            
            # Outstanding Receivables KPI
            receivables_trend = self._calculate_trend(
                current_metrics.outstanding_receivables,
                previous_metrics.outstanding_receivables
            )
            kpis.append(KPIMetric(
                name="Outstanding Receivables",
                name_persian="مطالبات معوق",
                value=current_metrics.outstanding_receivables,
                previous_value=previous_metrics.outstanding_receivables,
                trend=receivables_trend,
                change_percentage=self._calculate_percentage_change(
                    current_metrics.outstanding_receivables,
                    previous_metrics.outstanding_receivables
                ),
                target_value=None,
                unit="currency"
            ))
            
            return KPIMetricsResponse(
                period_days=period_days,
                calculated_at=datetime.utcnow(),
                kpis=kpis,
                overall_score=self._calculate_overall_business_score(kpis)
            )
            
        except Exception as e:
            logger.error(f"Error calculating KPI metrics for tenant {tenant_id}: {e}")
            raise
    
    def generate_business_alerts(
        self, 
        tenant_id: UUID
    ) -> BusinessAlertResponse:
        """
        Generate alerts for overdue payments and business insights
        """
        try:
            alerts = []
            
            # Overdue payment alerts
            overdue_alerts = self._check_overdue_payments(tenant_id)
            alerts.extend(overdue_alerts)
            
            # Low stock alerts
            stock_alerts = self._check_low_stock_products(tenant_id)
            alerts.extend(stock_alerts)
            
            # Revenue decline alerts
            revenue_alerts = self._check_revenue_trends(tenant_id)
            alerts.extend(revenue_alerts)
            
            # Customer activity alerts
            customer_alerts = self._check_customer_activity(tenant_id)
            alerts.extend(customer_alerts)
            
            # Cash flow alerts
            cashflow_alerts = self._check_cash_flow_issues(tenant_id)
            alerts.extend(cashflow_alerts)
            
            # Sort alerts by severity and created date
            alerts.sort(key=lambda x: (x.severity.value, x.created_at), reverse=True)
            
            return BusinessAlertResponse(
                generated_at=datetime.utcnow(),
                total_alerts=len(alerts),
                critical_alerts=len([a for a in alerts if a.severity == AlertSeverity.CRITICAL]),
                high_alerts=len([a for a in alerts if a.severity == AlertSeverity.HIGH]),
                medium_alerts=len([a for a in alerts if a.severity == AlertSeverity.MEDIUM]),
                low_alerts=len([a for a in alerts if a.severity == AlertSeverity.LOW]),
                alerts=alerts
            )
            
        except Exception as e:
            logger.error(f"Error generating business alerts for tenant {tenant_id}: {e}")
            raise
    
    def analyze_trends(
        self, 
        tenant_id: UUID,
        analysis_periods: int = 12,
        period_type: str = "weekly"
    ) -> TrendAnalysisResponse:
        """
        Analyze business trends over multiple periods
        """
        try:
            trends = []
            
            # Revenue trend analysis
            revenue_trend = self._analyze_revenue_trend(
                tenant_id, analysis_periods, period_type
            )
            trends.append(revenue_trend)
            
            # Customer acquisition trend
            customer_trend = self._analyze_customer_trend(
                tenant_id, analysis_periods, period_type
            )
            trends.append(customer_trend)
            
            # Product performance trend
            product_trend = self._analyze_product_performance_trend(
                tenant_id, analysis_periods, period_type
            )
            trends.append(product_trend)
            
            # Seasonal patterns
            seasonal_patterns = self._detect_seasonal_patterns(tenant_id)
            
            return TrendAnalysisResponse(
                analysis_periods=analysis_periods,
                period_type=period_type,
                analyzed_at=datetime.utcnow(),
                trends=trends,
                seasonal_patterns=seasonal_patterns,
                predictions=self._generate_trend_predictions(trends)
            )
            
        except Exception as e:
            logger.error(f"Error analyzing trends for tenant {tenant_id}: {e}")
            raise
    
    def export_report(
        self, 
        tenant_id: UUID,
        request: ReportExportRequest
    ) -> ReportExportResponse:
        """
        Export business intelligence reports in various formats
        """
        try:
            # Generate export ID
            export_id = f"export_{tenant_id}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"
            
            # For now, return a pending response
            # In a real implementation, this would trigger a Celery task
            return ReportExportResponse(
                export_id=export_id,
                status=ExportStatus.PENDING,
                format=request.format,
                report_type=request.report_type,
                created_at=datetime.utcnow(),
                estimated_completion=datetime.utcnow() + timedelta(minutes=5),
                download_url=None,
                expires_at=None
            )
            
        except Exception as e:
            logger.error(f"Error exporting report for tenant {tenant_id}: {e}")
            raise
    
    # Private helper methods
    
    def _calculate_business_metrics(
        self, 
        tenant_id: UUID, 
        period_days: int,
        offset_days: int = 0
    ) -> BusinessMetrics:
        """Calculate comprehensive business metrics for a period"""
        
        end_date = datetime.utcnow() - timedelta(days=offset_days)
        start_date = end_date - timedelta(days=period_days)
        
        # Revenue calculation
        revenue_query = self.db.query(
            func.sum(Invoice.total_amount).label('total_revenue'),
            func.count(Invoice.id).label('invoice_count'),
            func.avg(Invoice.total_amount).label('avg_order_value')
        ).filter(
            Invoice.tenant_id == tenant_id,
            Invoice.status.in_([InvoiceStatus.PAID, InvoiceStatus.PARTIALLY_PAID]),
            Invoice.invoice_date >= start_date,
            Invoice.invoice_date <= end_date
        ).first()
        
        total_revenue = revenue_query.total_revenue or Decimal('0')
        invoice_count = revenue_query.invoice_count or 0
        avg_order_value = revenue_query.avg_order_value or Decimal('0')
        
        # Customer metrics
        customer_count = self.db.query(func.count(func.distinct(Invoice.customer_id))).filter(
            Invoice.tenant_id == tenant_id,
            Invoice.invoice_date >= start_date,
            Invoice.invoice_date <= end_date
        ).scalar() or 0
        
        # Outstanding receivables
        outstanding_receivables = self.db.query(
            func.sum(Invoice.total_amount - Invoice.paid_amount)
        ).filter(
            Invoice.tenant_id == tenant_id,
            Invoice.total_amount > Invoice.paid_amount
        ).scalar() or Decimal('0')
        
        # Overdue amount
        overdue_amount = self.db.query(
            func.sum(Invoice.total_amount - Invoice.paid_amount)
        ).filter(
            Invoice.tenant_id == tenant_id,
            Invoice.total_amount > Invoice.paid_amount,
            Invoice.due_date < datetime.utcnow()
        ).scalar() or Decimal('0')
        
        # Calculate growth rates (placeholder - would need previous period data)
        revenue_growth = Decimal('0')
        customer_growth = Decimal('0')
        aov_growth = Decimal('0')
        
        # Inventory value (simplified)
        inventory_value = self.db.query(
            func.sum(Product.stock_quantity * Product.cost_price)
        ).filter(
            Product.tenant_id == tenant_id,
            Product.track_inventory == True,
            Product.cost_price.isnot(None)
        ).scalar() or Decimal('0')
        
        # Profit margin (simplified calculation)
        cost_of_goods = self.db.query(
            func.sum(InvoiceItem.quantity * Product.cost_price)
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
        ).scalar() or Decimal('0')
        
        profit_margin = Decimal('0')
        if total_revenue > 0:
            gross_profit = total_revenue - cost_of_goods
            profit_margin = (gross_profit / total_revenue) * 100
        
        return BusinessMetrics(
            total_revenue=total_revenue,
            revenue_growth=revenue_growth,
            customer_count=customer_count,
            customer_growth=customer_growth,
            average_order_value=avg_order_value,
            aov_growth=aov_growth,
            outstanding_receivables=outstanding_receivables,
            overdue_amount=overdue_amount,
            inventory_value=inventory_value,
            profit_margin=profit_margin
        )
    
    def _analyze_business_performance(
        self, 
        current: BusinessMetrics, 
        previous: BusinessMetrics
    ) -> List[BusinessInsightData]:
        """Analyze business performance and generate insights"""
        
        insights = []
        
        # Revenue analysis
        revenue_change = self._calculate_percentage_change(
            current.total_revenue, previous.total_revenue
        )
        
        if revenue_change > 10:
            insights.append(BusinessInsightData(
                type=InsightType.PERFORMANCE,
                priority=InsightPriority.HIGH,
                title="Strong Revenue Growth",
                title_persian="رشد قوی درآمد",
                description=f"Revenue increased by {revenue_change:.1f}% compared to previous period",
                description_persian=f"درآمد نسبت به دوره قبل {revenue_change:.1f}% افزایش یافته است",
                impact_score=8.5,
                confidence_score=9.0,
                actionable=True,
                action_items=[
                    "Continue current marketing strategies",
                    "Consider expanding successful product lines",
                    "Analyze which channels are driving growth"
                ]
            ))
        elif revenue_change < -10:
            insights.append(BusinessInsightData(
                type=InsightType.WARNING,
                priority=InsightPriority.CRITICAL,
                title="Revenue Decline Alert",
                title_persian="هشدار کاهش درآمد",
                description=f"Revenue decreased by {abs(revenue_change):.1f}% compared to previous period",
                description_persian=f"درآمد نسبت به دوره قبل {abs(revenue_change):.1f}% کاهش یافته است",
                impact_score=9.0,
                confidence_score=8.5,
                actionable=True,
                action_items=[
                    "Review marketing and sales strategies",
                    "Analyze customer feedback and satisfaction",
                    "Consider promotional campaigns",
                    "Review pricing strategy"
                ]
            ))
        
        # Customer analysis
        customer_change = self._calculate_percentage_change(
            Decimal(str(current.customer_count)), 
            Decimal(str(previous.customer_count))
        )
        
        if customer_change > 15:
            insights.append(BusinessInsightData(
                type=InsightType.OPPORTUNITY,
                priority=InsightPriority.HIGH,
                title="Customer Base Expansion",
                title_persian="گسترش پایگاه مشتریان",
                description=f"Active customer count increased by {customer_change:.1f}%",
                description_persian=f"تعداد مشتریان فعال {customer_change:.1f}% افزایش یافته است",
                impact_score=7.5,
                confidence_score=8.0,
                actionable=True,
                action_items=[
                    "Implement customer retention programs",
                    "Develop loyalty rewards system",
                    "Focus on customer lifetime value optimization"
                ]
            ))
        
        # Cash flow analysis
        if current.overdue_amount > current.total_revenue * Decimal('0.15'):
            insights.append(BusinessInsightData(
                type=InsightType.RISK,
                priority=InsightPriority.CRITICAL,
                title="High Overdue Receivables",
                title_persian="مطالبات معوق بالا",
                description=f"Overdue amount ({current.overdue_amount}) is {(current.overdue_amount/current.total_revenue*100):.1f}% of revenue",
                description_persian=f"مبلغ معوق ({current.overdue_amount}) {(current.overdue_amount/current.total_revenue*100):.1f}% از درآمد است",
                impact_score=8.0,
                confidence_score=9.5,
                actionable=True,
                action_items=[
                    "Implement stricter credit policies",
                    "Send payment reminders to overdue customers",
                    "Consider offering payment plans",
                    "Review customer creditworthiness"
                ]
            ))
        
        return insights
    
    def _generate_recommendations(
        self, 
        current: BusinessMetrics, 
        previous: BusinessMetrics,
        insights: List[BusinessInsightData]
    ) -> List[str]:
        """Generate actionable business recommendations"""
        
        recommendations = []
        
        # Based on profit margin
        if current.profit_margin < 15:
            recommendations.append(
                "Consider reviewing pricing strategy to improve profit margins"
            )
            recommendations.append(
                "Analyze cost structure and identify areas for cost reduction"
            )
        
        # Based on receivables
        if current.outstanding_receivables > current.total_revenue * Decimal('0.3'):
            recommendations.append(
                "Implement automated payment reminders to improve cash flow"
            )
            recommendations.append(
                "Consider offering early payment discounts"
            )
        
        # Based on customer metrics
        if current.customer_count < previous.customer_count:
            recommendations.append(
                "Focus on customer acquisition and retention strategies"
            )
            recommendations.append(
                "Analyze customer churn reasons and address them"
            )
        
        return recommendations
    
    def _generate_executive_summary(
        self, 
        insights: List[BusinessInsightData], 
        metrics: BusinessMetrics
    ) -> str:
        """Generate executive summary in Persian"""
        
        critical_insights = [i for i in insights if i.priority == InsightPriority.CRITICAL]
        high_insights = [i for i in insights if i.priority == InsightPriority.HIGH]
        
        summary_parts = []
        
        # Overall performance
        summary_parts.append(
            f"در دوره مورد بررسی، کسب‌وکار شما درآمد کلی {metrics.total_revenue:,.0f} تومان داشته است."
        )
        
        if metrics.customer_count > 0:
            summary_parts.append(
                f"تعداد {metrics.customer_count} مشتری فعال با میانگین ارزش سفارش {metrics.average_order_value:,.0f} تومان."
            )
        
        # Critical issues
        if critical_insights:
            summary_parts.append(
                f"⚠️ {len(critical_insights)} مسئله حیاتی شناسایی شده که نیاز به توجه فوری دارد."
            )
        
        # Opportunities
        if high_insights:
            summary_parts.append(
                f"🚀 {len(high_insights)} فرصت مهم برای بهبود عملکرد شناسایی شده است."
            )
        
        # Profit margin assessment
        if metrics.profit_margin > 20:
            summary_parts.append("حاشیه سود شما در وضعیت مطلوبی قرار دارد.")
        elif metrics.profit_margin < 10:
            summary_parts.append("حاشیه سود نیاز به بهبود دارد.")
        
        return " ".join(summary_parts)
    
    def _calculate_trend(self, current: Decimal, previous: Decimal) -> KPITrend:
        """Calculate trend direction"""
        if previous == 0:
            return KPITrend.STABLE if current == 0 else KPITrend.UP
        
        change_percent = ((current - previous) / previous) * 100
        
        if change_percent > 5:
            return KPITrend.UP
        elif change_percent < -5:
            return KPITrend.DOWN
        else:
            return KPITrend.STABLE
    
    def _calculate_percentage_change(self, current: Decimal, previous: Decimal) -> Decimal:
        """Calculate percentage change between two values"""
        if previous == 0:
            return Decimal('0') if current == 0 else Decimal('100')
        
        return ((current - previous) / previous) * 100
    
    def _calculate_overall_business_score(self, kpis: List[KPIMetric]) -> float:
        """Calculate overall business health score (0-100)"""
        
        score = 50.0  # Base score
        
        for kpi in kpis:
            if kpi.trend == KPITrend.UP:
                score += 10
            elif kpi.trend == KPITrend.DOWN:
                score -= 10
            
            # Bonus for meeting targets
            if kpi.target_value and kpi.value >= kpi.target_value:
                score += 5
        
        return max(0, min(100, score))
    
    def _check_overdue_payments(self, tenant_id: UUID) -> List[BusinessAlert]:
        """Check for overdue payment alerts"""
        
        alerts = []
        
        # Get overdue invoices
        overdue_invoices = self.db.query(
            Invoice.id,
            Invoice.invoice_number,
            Customer.name.label('customer_name'),
            Invoice.total_amount,
            Invoice.paid_amount,
            Invoice.due_date
        ).join(
            Customer, Invoice.customer_id == Customer.id
        ).filter(
            Invoice.tenant_id == tenant_id,
            Invoice.total_amount > Invoice.paid_amount,
            Invoice.due_date < datetime.utcnow()
        ).all()
        
        if overdue_invoices:
            total_overdue = sum(
                (inv.total_amount - inv.paid_amount) for inv in overdue_invoices
            )
            
            severity = AlertSeverity.CRITICAL if len(overdue_invoices) > 10 else AlertSeverity.HIGH
            
            alerts.append(BusinessAlert(
                type=AlertType.OVERDUE_PAYMENT,
                severity=severity,
                title=f"{len(overdue_invoices)} Overdue Invoices",
                title_persian=f"{len(overdue_invoices)} فاکتور معوق",
                message=f"Total overdue amount: {total_overdue:,.0f}",
                message_persian=f"مجموع مبلغ معوق: {total_overdue:,.0f} تومان",
                created_at=datetime.utcnow(),
                data={
                    "overdue_count": len(overdue_invoices),
                    "total_amount": float(total_overdue),
                    "invoices": [
                        {
                            "id": str(inv.id),
                            "number": inv.invoice_number,
                            "customer": inv.customer_name,
                            "amount": float(inv.total_amount - inv.paid_amount),
                            "days_overdue": (datetime.utcnow().date() - inv.due_date.date()).days
                        }
                        for inv in overdue_invoices[:10]  # Limit to first 10
                    ]
                }
            ))
        
        return alerts
    
    def _check_low_stock_products(self, tenant_id: UUID) -> List[BusinessAlert]:
        """Check for low stock product alerts"""
        
        alerts = []
        
        low_stock_products = self.db.query(Product).filter(
            Product.tenant_id == tenant_id,
            Product.track_inventory == True,
            Product.stock_quantity <= Product.min_stock_level,
            Product.stock_quantity > 0
        ).all()
        
        if low_stock_products:
            alerts.append(BusinessAlert(
                type=AlertType.LOW_STOCK,
                severity=AlertSeverity.MEDIUM,
                title=f"{len(low_stock_products)} Products Low on Stock",
                title_persian=f"{len(low_stock_products)} محصول کم موجود",
                message=f"Products need restocking",
                message_persian=f"محصولات نیاز به تأمین مجدد دارند",
                created_at=datetime.utcnow(),
                data={
                    "products": [
                        {
                            "id": str(p.id),
                            "name": p.name,
                            "current_stock": p.stock_quantity,
                            "min_level": p.min_stock_level
                        }
                        for p in low_stock_products
                    ]
                }
            ))
        
        return alerts
    
    def _check_revenue_trends(self, tenant_id: UUID) -> List[BusinessAlert]:
        """Check for revenue trend alerts"""
        
        alerts = []
        
        # Compare last 7 days with previous 7 days
        current_week = self._calculate_business_metrics(tenant_id, 7)
        previous_week = self._calculate_business_metrics(tenant_id, 7, 7)
        
        revenue_change = self._calculate_percentage_change(
            current_week.total_revenue, previous_week.total_revenue
        )
        
        if revenue_change < -20:  # 20% decline
            alerts.append(BusinessAlert(
                type=AlertType.REVENUE_DECLINE,
                severity=AlertSeverity.HIGH,
                title="Significant Revenue Decline",
                title_persian="کاهش قابل توجه درآمد",
                message=f"Revenue declined by {abs(revenue_change):.1f}% this week",
                message_persian=f"درآمد این هفته {abs(revenue_change):.1f}% کاهش یافته است",
                created_at=datetime.utcnow(),
                data={
                    "current_revenue": float(current_week.total_revenue),
                    "previous_revenue": float(previous_week.total_revenue),
                    "change_percentage": float(revenue_change)
                }
            ))
        
        return alerts
    
    def _check_customer_activity(self, tenant_id: UUID) -> List[BusinessAlert]:
        """Check for customer activity alerts"""
        
        alerts = []
        
        # Check for customers with no recent activity
        inactive_customers = self.db.query(Customer).filter(
            Customer.tenant_id == tenant_id,
            Customer.last_purchase_at < datetime.utcnow() - timedelta(days=60)
        ).count()
        
        if inactive_customers > 0:
            alerts.append(BusinessAlert(
                type=AlertType.CUSTOMER_ACTIVITY,
                severity=AlertSeverity.MEDIUM,
                title=f"{inactive_customers} Inactive Customers",
                title_persian=f"{inactive_customers} مشتری غیرفعال",
                message="Customers haven't made purchases in 60+ days",
                message_persian="مشتریان بیش از ۶۰ روز خرید نکرده‌اند",
                created_at=datetime.utcnow(),
                data={
                    "inactive_count": inactive_customers
                }
            ))
        
        return alerts
    
    def _check_cash_flow_issues(self, tenant_id: UUID) -> List[BusinessAlert]:
        """Check for cash flow issues"""
        
        alerts = []
        
        metrics = self._calculate_business_metrics(tenant_id, 30)
        
        # High receivables to revenue ratio
        if metrics.total_revenue > 0:
            receivables_ratio = (metrics.outstanding_receivables / metrics.total_revenue) * 100
            
            if receivables_ratio > 50:  # More than 50% of revenue is outstanding
                alerts.append(BusinessAlert(
                    type=AlertType.CASH_FLOW,
                    severity=AlertSeverity.HIGH,
                    title="High Outstanding Receivables",
                    title_persian="مطالبات بالا",
                    message=f"Outstanding receivables are {receivables_ratio:.1f}% of revenue",
                    message_persian=f"مطالبات معوق {receivables_ratio:.1f}% از درآمد است",
                    created_at=datetime.utcnow(),
                    data={
                        "receivables_amount": float(metrics.outstanding_receivables),
                        "revenue_amount": float(metrics.total_revenue),
                        "ratio_percentage": float(receivables_ratio)
                    }
                ))
        
        return alerts
    
    def _analyze_revenue_trend(
        self, 
        tenant_id: UUID, 
        periods: int, 
        period_type: str
    ) -> TrendData:
        """Analyze revenue trend over multiple periods"""
        
        # This is a simplified implementation
        # In a real scenario, you'd calculate actual trend data
        
        return TrendData(
            metric_name="Revenue",
            metric_name_persian="درآمد",
            direction=TrendDirection.UP,
            strength=7.5,
            confidence=8.0,
            data_points=[],  # Would contain actual data points
            prediction_next_period=Decimal('0'),
            seasonal_factor=1.0
        )
    
    def _analyze_customer_trend(
        self, 
        tenant_id: UUID, 
        periods: int, 
        period_type: str
    ) -> TrendData:
        """Analyze customer acquisition trend"""
        
        return TrendData(
            metric_name="Customer Count",
            metric_name_persian="تعداد مشتری",
            direction=TrendDirection.STABLE,
            strength=5.0,
            confidence=7.0,
            data_points=[],
            prediction_next_period=Decimal('0'),
            seasonal_factor=1.0
        )
    
    def _analyze_product_performance_trend(
        self, 
        tenant_id: UUID, 
        periods: int, 
        period_type: str
    ) -> TrendData:
        """Analyze product performance trend"""
        
        return TrendData(
            metric_name="Product Performance",
            metric_name_persian="عملکرد محصول",
            direction=TrendDirection.UP,
            strength=6.5,
            confidence=7.5,
            data_points=[],
            prediction_next_period=Decimal('0'),
            seasonal_factor=1.0
        )
    
    def _detect_seasonal_patterns(self, tenant_id: UUID) -> Dict[str, Any]:
        """Detect seasonal business patterns"""
        
        # Simplified seasonal pattern detection
        return {
            "has_seasonal_pattern": False,
            "peak_months": [],
            "low_months": [],
            "seasonal_strength": 0.0
        }
    
    def _generate_trend_predictions(self, trends: List[TrendData]) -> Dict[str, Any]:
        """Generate predictions based on trend analysis"""
        
        return {
            "next_month_revenue_prediction": 0.0,
            "confidence_level": 0.0,
            "key_factors": []
        }