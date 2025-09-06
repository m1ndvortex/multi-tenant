"""
Analytics service for platform metrics and monitoring
"""

import logging
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_, desc, text
import json
import time

from ..core.redis_client import redis_client
from ..models.tenant import Tenant, SubscriptionType, TenantStatus
from ..models.user import User
from ..models.invoice import Invoice
from ..models.activity_log import ActivityLog
from ..schemas.analytics import TimeRange

logger = logging.getLogger(__name__)


class AnalyticsService:
    """Service for generating platform analytics and monitoring data"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_time_range_dates(self, time_range: TimeRange, start_date: Optional[datetime] = None, 
                           end_date: Optional[datetime] = None) -> Tuple[datetime, datetime]:
        """Get start and end dates for a time range"""
        now = datetime.now(timezone.utc)
        
        if time_range == TimeRange.CUSTOM:
            if not start_date or not end_date:
                raise ValueError("Custom time range requires start_date and end_date")
            return start_date, end_date
        
        if time_range == TimeRange.LAST_24_HOURS:
            start = now - timedelta(hours=24)
        elif time_range == TimeRange.LAST_7_DAYS:
            start = now - timedelta(days=7)
        elif time_range == TimeRange.LAST_30_DAYS:
            start = now - timedelta(days=30)
        elif time_range == TimeRange.LAST_90_DAYS:
            start = now - timedelta(days=90)
        elif time_range == TimeRange.LAST_YEAR:
            start = now - timedelta(days=365)
        else:
            start = now - timedelta(days=30)  # Default to 30 days
        
        return start, now
    
    def get_platform_analytics(self, time_range: TimeRange, start_date: Optional[datetime] = None,
                             end_date: Optional[datetime] = None) -> Dict[str, Any]:
        """Generate comprehensive platform analytics"""
        try:
            start, end = self.get_time_range_dates(time_range, start_date, end_date)
            
            # Get current month boundaries
            now = datetime.now(timezone.utc)
            current_month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            last_month_start = (current_month_start - timedelta(days=1)).replace(day=1)
            last_month_end = current_month_start - timedelta(seconds=1)
            
            # Signup metrics
            total_signups = self.db.query(Tenant).count()
            signups_this_month = self.db.query(Tenant).filter(
                Tenant.created_at >= current_month_start
            ).count()
            signups_last_month = self.db.query(Tenant).filter(
                and_(
                    Tenant.created_at >= last_month_start,
                    Tenant.created_at <= last_month_end
                )
            ).count()
            
            # Calculate growth rate
            signup_growth_rate = 0.0
            if signups_last_month > 0:
                signup_growth_rate = ((signups_this_month - signups_last_month) / signups_last_month) * 100
            
            # Subscription metrics
            active_subscriptions = self.db.query(Tenant).filter(
                Tenant.status == TenantStatus.ACTIVE
            ).count()
            
            free_subscriptions = self.db.query(Tenant).filter(
                and_(
                    Tenant.subscription_type == SubscriptionType.FREE,
                    Tenant.status == TenantStatus.ACTIVE
                )
            ).count()
            
            pro_subscriptions = self.db.query(Tenant).filter(
                and_(
                    Tenant.subscription_type == SubscriptionType.PRO,
                    Tenant.status == TenantStatus.ACTIVE
                )
            ).count()
            
            # Conversion rate
            conversion_rate = 0.0
            if total_signups > 0:
                conversion_rate = (pro_subscriptions / total_signups) * 100
            
            # Revenue metrics (assuming Pro subscription is $50/month)
            pro_price_monthly = 50.0
            mrr = pro_subscriptions * pro_price_monthly
            
            # Get last month's Pro subscriptions for MRR growth
            last_month_pro = self.db.query(Tenant).filter(
                and_(
                    Tenant.subscription_type == SubscriptionType.PRO,
                    Tenant.status == TenantStatus.ACTIVE,
                    Tenant.subscription_starts_at <= last_month_end
                )
            ).count()
            
            last_month_mrr = last_month_pro * pro_price_monthly
            mrr_growth_rate = 0.0
            if last_month_mrr > 0:
                mrr_growth_rate = ((mrr - last_month_mrr) / last_month_mrr) * 100
            
            # ARPU calculation
            arpu = mrr / active_subscriptions if active_subscriptions > 0 else 0.0
            
            # Invoice metrics
            total_invoices = self.db.query(Invoice).count()
            invoices_this_month = self.db.query(Invoice).filter(
                Invoice.created_at >= current_month_start
            ).count()
            
            # Active tenants (had activity in last 30 days)
            thirty_days_ago = now - timedelta(days=30)
            active_tenants = self.db.query(Tenant).filter(
                and_(
                    Tenant.last_activity_at >= thirty_days_ago,
                    Tenant.status == TenantStatus.ACTIVE
                )
            ).count()
            
            # Generate trend data
            signup_trend = self._generate_signup_trend(start, end)
            revenue_trend = self._generate_revenue_trend(start, end)
            
            return {
                "total_signups": total_signups,
                "signups_this_month": signups_this_month,
                "signups_last_month": signups_last_month,
                "signup_growth_rate": round(signup_growth_rate, 2),
                "total_active_subscriptions": active_subscriptions,
                "free_subscriptions": free_subscriptions,
                "pro_subscriptions": pro_subscriptions,
                "subscription_conversion_rate": round(conversion_rate, 2),
                "monthly_recurring_revenue": round(mrr, 2),
                "mrr_growth_rate": round(mrr_growth_rate, 2),
                "average_revenue_per_user": round(arpu, 2),
                "total_invoices_created": total_invoices,
                "invoices_this_month": invoices_this_month,
                "active_tenants_last_30_days": active_tenants,
                "signup_trend": signup_trend,
                "revenue_trend": revenue_trend,
                "generated_at": now,
                "time_range": time_range.value if hasattr(time_range, 'value') else str(time_range)
            }
            
        except Exception as e:
            logger.error(f"Failed to generate platform analytics: {e}")
            raise
    
    def _generate_signup_trend(self, start_date: datetime, end_date: datetime) -> List[Dict[str, Any]]:
        """Generate daily signup trend data"""
        try:
            # Query daily signups
            daily_signups = self.db.query(
                func.date(Tenant.created_at).label('date'),
                func.count(Tenant.id).label('signups')
            ).filter(
                and_(
                    Tenant.created_at >= start_date,
                    Tenant.created_at <= end_date
                )
            ).group_by(
                func.date(Tenant.created_at)
            ).order_by('date').all()
            
            # Convert to list of dictionaries
            trend_data = []
            for date, signups in daily_signups:
                trend_data.append({
                    "date": date.isoformat(),
                    "signups": signups
                })
            
            return trend_data
            
        except Exception as e:
            logger.error(f"Failed to generate signup trend: {e}")
            return []
    
    def _generate_revenue_trend(self, start_date: datetime, end_date: datetime) -> List[Dict[str, Any]]:
        """Generate daily revenue trend data"""
        try:
            # For now, we'll calculate based on Pro subscription activations
            # In a real system, this would be based on actual payment data
            pro_price_monthly = 50.0
            
            daily_revenue = self.db.query(
                func.date(Tenant.subscription_starts_at).label('date'),
                func.count(Tenant.id).label('new_subscriptions')
            ).filter(
                and_(
                    Tenant.subscription_type == SubscriptionType.PRO,
                    Tenant.subscription_starts_at >= start_date,
                    Tenant.subscription_starts_at <= end_date
                )
            ).group_by(
                func.date(Tenant.subscription_starts_at)
            ).order_by('date').all()
            
            # Convert to list of dictionaries
            trend_data = []
            for date, new_subs in daily_revenue:
                revenue = new_subs * pro_price_monthly
                trend_data.append({
                    "date": date.isoformat(),
                    "revenue": round(revenue, 2),
                    "new_subscriptions": new_subs
                })
            
            return trend_data
            
        except Exception as e:
            logger.error(f"Failed to generate revenue trend: {e}")
            return []
    
    def record_user_heartbeat(self, user_id: str, tenant_id: str, session_id: Optional[str] = None,
                            page: Optional[str] = None) -> bool:
        """Record user heartbeat for activity tracking"""
        try:
            now = datetime.now(timezone.utc)
            heartbeat_key = f"heartbeat:user:{user_id}"
            session_key = f"session:{session_id}" if session_id else f"session:user:{user_id}"
            
            # Store user heartbeat with 5-minute expiration
            heartbeat_data = {
                "user_id": user_id,
                "tenant_id": tenant_id,
                "session_id": session_id,
                "page": page,
                "last_seen": now.isoformat(),
                "timestamp": time.time()
            }
            
            redis_client.set(heartbeat_key, heartbeat_data, expire=300)  # 5 minutes
            
            # Add to active users set
            redis_client.sadd("active_users", user_id)
            redis_client.expire("active_users", 300)
            
            # Add to tenant active users
            tenant_active_key = f"tenant_active:{tenant_id}"
            redis_client.sadd(tenant_active_key, user_id)
            redis_client.expire(tenant_active_key, 300)
            
            # Store session info
            if session_id:
                session_data = {
                    "user_id": user_id,
                    "tenant_id": tenant_id,
                    "start_time": now.isoformat(),
                    "last_activity": now.isoformat(),
                    "page": page
                }
                redis_client.set(session_key, session_data, expire=3600)  # 1 hour
            
            # Update peak concurrent users for today
            today_key = f"peak_users:{now.strftime('%Y-%m-%d')}"
            current_active = len(redis_client.smembers("active_users"))
            current_peak = redis_client.get(today_key, 0)
            if isinstance(current_peak, str):
                current_peak = int(current_peak)
            
            if current_active > current_peak:
                redis_client.set(today_key, current_active, expire=86400)  # 24 hours
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to record user heartbeat: {e}")
            return False
    
    def get_user_activity(self) -> Dict[str, Any]:
        """Get real-time user activity data"""
        try:
            now = datetime.now(timezone.utc)
            
            # Get active users (last 5 minutes)
            active_users = redis_client.smembers("active_users")
            total_active = len(active_users)
            
            # Get active users by tenant
            active_by_tenant = {}
            user_sessions = []
            
            for user_id in active_users:
                heartbeat_key = f"heartbeat:user:{user_id}"
                heartbeat_data = redis_client.get(heartbeat_key)
                
                if heartbeat_data:
                    tenant_id = heartbeat_data.get("tenant_id")
                    if tenant_id:
                        active_by_tenant[tenant_id] = active_by_tenant.get(tenant_id, 0) + 1
                    
                    user_sessions.append({
                        "user_id": user_id,
                        "tenant_id": tenant_id,
                        "session_id": heartbeat_data.get("session_id"),
                        "page": heartbeat_data.get("page"),
                        "last_seen": heartbeat_data.get("last_seen")
                    })
            
            # Get peak concurrent users for today
            today_key = f"peak_users:{now.strftime('%Y-%m-%d')}"
            peak_today = redis_client.get(today_key, 0)
            if isinstance(peak_today, str):
                peak_today = int(peak_today)
            
            # Calculate average session duration (simplified)
            # In a real implementation, this would track session start/end times
            avg_session_duration = 25.0  # Default 25 minutes
            
            return {
                "total_active_users": total_active,
                "active_users_by_tenant": active_by_tenant,
                "user_sessions": user_sessions,
                "peak_concurrent_users": peak_today,
                "average_session_duration": avg_session_duration,
                "last_updated": now,
                "refresh_interval": 30
            }
            
        except Exception as e:
            logger.error(f"Failed to get user activity: {e}")
            return {
                "total_active_users": 0,
                "active_users_by_tenant": {},
                "user_sessions": [],
                "peak_concurrent_users": 0,
                "average_session_duration": 0.0,
                "last_updated": datetime.now(timezone.utc),
                "refresh_interval": 30
            }
    
    def get_api_error_logs(self, time_range: TimeRange, start_date: Optional[datetime] = None,
                          end_date: Optional[datetime] = None, tenant_id: Optional[str] = None,
                          endpoint: Optional[str] = None, error_type: Optional[str] = None,
                          severity: Optional[str] = None, limit: int = 100, offset: int = 0) -> Dict[str, Any]:
        """Get API error logs with filtering"""
        try:
            start, end = self.get_time_range_dates(time_range, start_date, end_date)
            
            # Query activity logs for errors
            query = self.db.query(ActivityLog).filter(
                and_(
                    ActivityLog.status == "failed",
                    ActivityLog.created_at >= start,
                    ActivityLog.created_at <= end
                )
            )
            
            # Apply filters
            if tenant_id:
                query = query.filter(ActivityLog.tenant_id == tenant_id)
            
            if endpoint:
                query = query.filter(ActivityLog.action.ilike(f"%{endpoint}%"))
            
            if error_type:
                query = query.filter(ActivityLog.error_message.ilike(f"%{error_type}%"))
            
            # Get total count
            total_errors = query.count()
            
            # Get paginated results
            errors = query.order_by(desc(ActivityLog.created_at)).offset(offset).limit(limit).all()
            
            # Convert to dictionaries
            error_list = []
            for error in errors:
                error_dict = error.to_dict()
                error_list.append(error_dict)
            
            # Calculate error rate (simplified - would need total requests for accurate rate)
            total_activities = self.db.query(ActivityLog).filter(
                and_(
                    ActivityLog.created_at >= start,
                    ActivityLog.created_at <= end
                )
            ).count()
            
            error_rate = (total_errors / total_activities * 100) if total_activities > 0 else 0.0
            
            # Get most common errors
            common_errors = self.db.query(
                ActivityLog.action,
                func.count(ActivityLog.id).label('count')
            ).filter(
                and_(
                    ActivityLog.status == "failed",
                    ActivityLog.created_at >= start,
                    ActivityLog.created_at <= end
                )
            ).group_by(ActivityLog.action).order_by(desc('count')).limit(10).all()
            
            most_common = [{"action": action, "count": count} for action, count in common_errors]
            
            # Errors by endpoint (action)
            errors_by_endpoint = {}
            for action, count in common_errors:
                errors_by_endpoint[action] = count
            
            # Errors by tenant
            errors_by_tenant = {}
            tenant_errors = self.db.query(
                ActivityLog.tenant_id,
                func.count(ActivityLog.id).label('count')
            ).filter(
                and_(
                    ActivityLog.status == "failed",
                    ActivityLog.created_at >= start,
                    ActivityLog.created_at <= end
                )
            ).group_by(ActivityLog.tenant_id).all()
            
            for tenant_id_result, count in tenant_errors:
                errors_by_tenant[str(tenant_id_result)] = count
            
            return {
                "errors": error_list,
                "total_errors": total_errors,
                "error_rate": round(error_rate, 2),
                "most_common_errors": most_common,
                "errors_by_endpoint": errors_by_endpoint,
                "errors_by_tenant": errors_by_tenant,
                "time_range": time_range.value if hasattr(time_range, 'value') else str(time_range),
                "generated_at": datetime.now(timezone.utc)
            }
            
        except Exception as e:
            logger.error(f"Failed to get API error logs: {e}")
            raise

    def get_user_growth_trends(self, start_date: datetime, end_date: datetime, aggregation: str = "daily") -> Dict[str, Any]:
        """Get user growth trends over time with daily, weekly, monthly aggregations"""
        try:
            from ..models.user import User
            
            # Determine aggregation function
            if aggregation == "daily":
                date_trunc = func.date(User.created_at)
                date_format = "%Y-%m-%d"
            elif aggregation == "weekly":
                date_trunc = func.date_trunc('week', User.created_at)
                date_format = "%Y-W%U"
            elif aggregation == "monthly":
                date_trunc = func.date_trunc('month', User.created_at)
                date_format = "%Y-%m"
            else:
                date_trunc = func.date(User.created_at)
                date_format = "%Y-%m-%d"
            
            # Query user growth data
            growth_query = self.db.query(
                date_trunc.label('period'),
                func.count(User.id).label('new_users'),
                func.count(func.distinct(User.tenant_id)).label('new_tenants')
            ).filter(
                and_(
                    User.created_at >= start_date,
                    User.created_at <= end_date
                )
            ).group_by('period').order_by('period').all()
            
            # Convert to trend data
            trend_data = []
            cumulative_users = 0
            
            for period, new_users, new_tenants in growth_query:
                cumulative_users += new_users
                
                if aggregation == "weekly":
                    period_str = period.strftime("%Y-W%U")
                elif aggregation == "monthly":
                    period_str = period.strftime("%Y-%m")
                else:
                    period_str = period.strftime("%Y-%m-%d")
                
                trend_data.append({
                    "period": period_str,
                    "new_users": new_users,
                    "cumulative_users": cumulative_users,
                    "new_tenants": new_tenants
                })
            
            # Calculate total users and growth rate
            total_users = self.db.query(User).count()
            
            # Calculate growth rate (comparing first and last periods)
            growth_rate = 0.0
            if len(trend_data) >= 2:
                first_period = trend_data[0]["new_users"]
                last_period = trend_data[-1]["new_users"]
                if first_period > 0:
                    growth_rate = ((last_period - first_period) / first_period) * 100
            
            return {
                "trend_data": trend_data,
                "total_users": total_users,
                "growth_rate": round(growth_rate, 2),
                "aggregation": aggregation,
                "period_count": len(trend_data)
            }
            
        except Exception as e:
            logger.error(f"Failed to get user growth trends: {e}")
            raise

    def get_revenue_analysis_trends(self, start_date: datetime, end_date: datetime, aggregation: str = "daily") -> Dict[str, Any]:
        """Get revenue trend analysis with MRR calculations and growth metrics"""
        try:
            # Determine aggregation function
            if aggregation == "daily":
                date_trunc = func.date(Tenant.subscription_starts_at)
            elif aggregation == "weekly":
                date_trunc = func.date_trunc('week', Tenant.subscription_starts_at)
            elif aggregation == "monthly":
                date_trunc = func.date_trunc('month', Tenant.subscription_starts_at)
            else:
                date_trunc = func.date(Tenant.subscription_starts_at)
            
            # Pro subscription price (assuming $50/month)
            pro_price_monthly = 50.0
            
            # Query revenue data by subscription activations
            revenue_query = self.db.query(
                date_trunc.label('period'),
                func.count(Tenant.id).label('new_subscriptions')
            ).filter(
                and_(
                    Tenant.subscription_starts_at >= start_date,
                    Tenant.subscription_starts_at <= end_date,
                    Tenant.subscription_type == SubscriptionType.PRO
                )
            ).group_by('period').order_by('period').all()
            
            # Convert to trend data
            trend_data = []
            cumulative_revenue = 0
            cumulative_mrr = 0
            
            for period, new_subs in revenue_query:
                new_revenue = new_subs * pro_price_monthly  # Calculate revenue from new subscriptions
                cumulative_revenue += new_revenue
                cumulative_mrr += new_revenue
                
                if aggregation == "weekly":
                    period_str = period.strftime("%Y-W%U")
                elif aggregation == "monthly":
                    period_str = period.strftime("%Y-%m")
                else:
                    period_str = period.strftime("%Y-%m-%d")
                
                trend_data.append({
                    "period": period_str,
                    "new_subscriptions": new_subs,
                    "new_revenue": round(new_revenue, 2),
                    "cumulative_revenue": round(cumulative_revenue, 2),
                    "period_mrr": round(new_subs * pro_price_monthly, 2)
                })
            
            # Calculate MRR trend (current active Pro subscriptions)
            current_pro_subs = self.db.query(Tenant).filter(
                and_(
                    Tenant.subscription_type == SubscriptionType.PRO,
                    Tenant.status == TenantStatus.ACTIVE
                )
            ).count()
            
            current_mrr = current_pro_subs * pro_price_monthly
            
            # Calculate growth metrics
            mrr_growth_rate = 0.0
            revenue_growth_rate = 0.0
            
            if len(trend_data) >= 2:
                first_mrr = trend_data[0]["period_mrr"]
                last_mrr = trend_data[-1]["period_mrr"]
                if first_mrr > 0:
                    mrr_growth_rate = ((last_mrr - first_mrr) / first_mrr) * 100
                
                first_revenue = trend_data[0]["new_revenue"]
                last_revenue = trend_data[-1]["new_revenue"]
                if first_revenue > 0:
                    revenue_growth_rate = ((last_revenue - first_revenue) / first_revenue) * 100
            
            # MRR trend data (monthly recurring revenue over time)
            mrr_trend = []
            running_mrr = 0
            
            for item in trend_data:
                running_mrr += item["period_mrr"]
                mrr_trend.append({
                    "period": item["period"],
                    "mrr": running_mrr
                })
            
            growth_metrics = {
                "current_mrr": round(current_mrr, 2),
                "mrr_growth_rate": round(mrr_growth_rate, 2),
                "revenue_growth_rate": round(revenue_growth_rate, 2),
                "total_revenue": round(cumulative_revenue, 2),
                "average_revenue_per_period": round(cumulative_revenue / len(trend_data), 2) if trend_data else 0.0
            }
            
            return {
                "trend_data": trend_data,
                "mrr_trend": mrr_trend,
                "growth_metrics": growth_metrics,
                "aggregation": aggregation,
                "period_count": len(trend_data)
            }
            
        except Exception as e:
            logger.error(f"Failed to get revenue analysis trends: {e}")
            raise

    def get_invoice_volume_trends(self, start_date: datetime, end_date: datetime, aggregation: str = "daily") -> Dict[str, Any]:
        """Get platform-wide invoice creation volume tracking and analytics"""
        try:
            # Determine aggregation function
            if aggregation == "daily":
                date_trunc = func.date(Invoice.created_at)
            elif aggregation == "weekly":
                date_trunc = func.date_trunc('week', Invoice.created_at)
            elif aggregation == "monthly":
                date_trunc = func.date_trunc('month', Invoice.created_at)
            else:
                date_trunc = func.date(Invoice.created_at)
            
            # Query invoice volume data
            volume_query = self.db.query(
                date_trunc.label('period'),
                func.count(Invoice.id).label('total_invoices'),
                func.sum(Invoice.total_amount).label('total_value'),
                func.count(func.distinct(Invoice.tenant_id)).label('active_tenants')
            ).filter(
                and_(
                    Invoice.created_at >= start_date,
                    Invoice.created_at <= end_date
                )
            ).group_by('period').order_by('period').all()
            
            # Convert to trend data
            trend_data = []
            cumulative_invoices = 0
            cumulative_value = 0
            
            for period, total_invoices, total_value, active_tenants in volume_query:
                cumulative_invoices += total_invoices
                cumulative_value += total_value or 0
                
                if aggregation == "weekly":
                    period_str = period.strftime("%Y-W%U")
                elif aggregation == "monthly":
                    period_str = period.strftime("%Y-%m")
                else:
                    period_str = period.strftime("%Y-%m-%d")
                
                # Get invoice type breakdown for this period (simplified)
                general_invoices = 0
                gold_invoices = 0
                
                trend_data.append({
                    "period": period_str,
                    "total_invoices": total_invoices,
                    "general_invoices": general_invoices,
                    "gold_invoices": gold_invoices,
                    "total_value": round(total_value or 0, 2),
                    "cumulative_invoices": cumulative_invoices,
                    "cumulative_value": round(cumulative_value, 2),
                    "active_tenants": active_tenants
                })
            
            # Calculate totals and averages
            total_invoices = self.db.query(Invoice).filter(
                and_(
                    Invoice.created_at >= start_date,
                    Invoice.created_at <= end_date
                )
            ).count()
            
            days_in_period = (end_date - start_date).days + 1
            average_per_day = total_invoices / days_in_period if days_in_period > 0 else 0.0
            
            # Calculate growth rate
            growth_rate = 0.0
            if len(trend_data) >= 2:
                first_period = trend_data[0]["total_invoices"]
                last_period = trend_data[-1]["total_invoices"]
                if first_period > 0:
                    growth_rate = ((last_period - first_period) / first_period) * 100
            
            # Invoice type breakdown
            type_breakdown = self.db.query(
                Invoice.invoice_type,
                func.count(Invoice.id).label('count'),
                func.sum(Invoice.total_amount).label('total_value')
            ).filter(
                and_(
                    Invoice.created_at >= start_date,
                    Invoice.created_at <= end_date
                )
            ).group_by(Invoice.invoice_type).all()
            
            by_invoice_type = {}
            for invoice_type, count, total_value in type_breakdown:
                by_invoice_type[invoice_type] = {
                    "count": count,
                    "total_value": round(total_value or 0, 2),
                    "percentage": round((count / total_invoices * 100), 2) if total_invoices > 0 else 0.0
                }
            
            # Top tenants by invoice volume
            top_tenants_query = self.db.query(
                Invoice.tenant_id,
                func.count(Invoice.id).label('invoice_count'),
                func.sum(Invoice.total_amount).label('total_value')
            ).filter(
                and_(
                    Invoice.created_at >= start_date,
                    Invoice.created_at <= end_date
                )
            ).group_by(Invoice.tenant_id).order_by(desc('invoice_count')).limit(10).all()
            
            top_tenants = []
            for tenant_id, invoice_count, total_value in top_tenants_query:
                # Get tenant name
                tenant = self.db.query(Tenant).filter(Tenant.id == tenant_id).first()
                tenant_name = tenant.name if tenant else f"Tenant {tenant_id}"
                
                top_tenants.append({
                    "tenant_id": str(tenant_id),
                    "tenant_name": tenant_name,
                    "invoice_count": invoice_count,
                    "total_value": round(total_value or 0, 2)
                })
            
            return {
                "trend_data": trend_data,
                "total_invoices": total_invoices,
                "average_per_day": round(average_per_day, 2),
                "growth_rate": round(growth_rate, 2),
                "by_invoice_type": by_invoice_type,
                "top_tenants": top_tenants,
                "aggregation": aggregation,
                "period_count": len(trend_data)
            }
            
        except Exception as e:
            logger.error(f"Failed to get invoice volume trends: {e}")
            raise

    def get_subscription_conversion_trends(self, start_date: datetime, end_date: datetime, aggregation: str = "daily") -> Dict[str, Any]:
        """Get subscription conversion tracking (Free to Pro upgrades)"""
        try:
            # Determine aggregation function
            if aggregation == "daily":
                date_trunc = func.date(Tenant.subscription_starts_at)
            elif aggregation == "weekly":
                date_trunc = func.date_trunc('week', Tenant.subscription_starts_at)
            elif aggregation == "monthly":
                date_trunc = func.date_trunc('month', Tenant.subscription_starts_at)
            else:
                date_trunc = func.date(Tenant.subscription_starts_at)
            
            # Query conversion data (tenants that upgraded from Free to Pro)
            conversion_query = self.db.query(
                date_trunc.label('period'),
                func.count(Tenant.id).label('conversions')
            ).filter(
                and_(
                    Tenant.subscription_type == SubscriptionType.PRO,
                    Tenant.subscription_starts_at >= start_date,
                    Tenant.subscription_starts_at <= end_date
                )
            ).group_by('period').order_by('period').all()
            
            # Query new signups for conversion rate calculation
            signup_query = self.db.query(
                func.date(Tenant.created_at).label('period'),
                func.count(Tenant.id).label('new_signups')
            ).filter(
                and_(
                    Tenant.created_at >= start_date,
                    Tenant.created_at <= end_date
                )
            ).group_by('period').order_by('period').all()
            
            # Create lookup for signups by date
            signups_by_date = {}
            for period, new_signups in signup_query:
                signups_by_date[period.strftime("%Y-%m-%d")] = new_signups
            
            # Convert to trend data
            trend_data = []
            cumulative_conversions = 0
            
            for period, conversions in conversion_query:
                cumulative_conversions += conversions
                
                if aggregation == "weekly":
                    period_str = period.strftime("%Y-W%U")
                elif aggregation == "monthly":
                    period_str = period.strftime("%Y-%m")
                else:
                    period_str = period.strftime("%Y-%m-%d")
                
                # Calculate conversion rate for this period
                period_signups = signups_by_date.get(period.strftime("%Y-%m-%d"), 0)
                conversion_rate = (conversions / period_signups * 100) if period_signups > 0 else 0.0
                
                trend_data.append({
                    "period": period_str,
                    "conversions": conversions,
                    "cumulative_conversions": cumulative_conversions,
                    "new_signups": period_signups,
                    "conversion_rate": round(conversion_rate, 2)
                })
            
            # Calculate overall metrics
            total_conversions = self.db.query(Tenant).filter(
                and_(
                    Tenant.subscription_type == SubscriptionType.PRO,
                    Tenant.subscription_starts_at >= start_date,
                    Tenant.subscription_starts_at <= end_date
                )
            ).count()
            
            total_signups = self.db.query(Tenant).filter(
                and_(
                    Tenant.created_at >= start_date,
                    Tenant.created_at <= end_date
                )
            ).count()
            
            overall_conversion_rate = (total_conversions / total_signups * 100) if total_signups > 0 else 0.0
            
            # Calculate average time to convert (simplified - using subscription_starts_at vs created_at)
            conversion_times = self.db.query(
                func.extract('epoch', Tenant.subscription_starts_at - Tenant.created_at).label('time_to_convert')
            ).filter(
                and_(
                    Tenant.subscription_type == SubscriptionType.PRO,
                    Tenant.subscription_starts_at >= start_date,
                    Tenant.subscription_starts_at <= end_date,
                    Tenant.subscription_starts_at.isnot(None)
                )
            ).all()
            
            avg_time_to_convert = 0.0
            if conversion_times:
                total_time = sum([time[0] for time in conversion_times if time[0]])
                avg_time_to_convert = total_time / len(conversion_times) / 86400  # Convert to days
            
            # Conversion funnel
            total_tenants = self.db.query(Tenant).count()
            active_free = self.db.query(Tenant).filter(
                and_(
                    Tenant.subscription_type == SubscriptionType.FREE,
                    Tenant.status == TenantStatus.ACTIVE
                )
            ).count()
            active_pro = self.db.query(Tenant).filter(
                and_(
                    Tenant.subscription_type == SubscriptionType.PRO,
                    Tenant.status == TenantStatus.ACTIVE
                )
            ).count()
            
            conversion_funnel = {
                "total_signups": total_tenants,
                "active_free": active_free,
                "converted_to_pro": active_pro,
                "conversion_rate": round((active_pro / total_tenants * 100), 2) if total_tenants > 0 else 0.0
            }
            
            # Revenue impact
            pro_price_monthly = 50.0
            revenue_impact = {
                "monthly_revenue_added": round(total_conversions * pro_price_monthly, 2),
                "annual_revenue_potential": round(total_conversions * pro_price_monthly * 12, 2),
                "average_revenue_per_conversion": pro_price_monthly
            }
            
            return {
                "trend_data": trend_data,
                "total_conversions": total_conversions,
                "conversion_rate": round(overall_conversion_rate, 2),
                "average_time_to_convert": round(avg_time_to_convert, 1),
                "conversion_funnel": conversion_funnel,
                "revenue_impact": revenue_impact,
                "aggregation": aggregation,
                "period_count": len(trend_data)
            }
            
        except Exception as e:
            logger.error(f"Failed to get subscription conversion trends: {e}")
            raise