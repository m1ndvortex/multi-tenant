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