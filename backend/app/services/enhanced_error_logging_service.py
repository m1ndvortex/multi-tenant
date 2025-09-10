"""
Enhanced Error Logging Service
Real-time error tracking with WebSocket integration and advanced analytics
"""

from typing import Optional, Dict, Any, List, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from datetime import datetime, timedelta
import uuid
import logging
import json
import asyncio
from collections import defaultdict

from ..models.api_error_log import APIErrorLog, ErrorSeverity, ErrorCategory
from ..services.error_logging_service import ErrorLoggingService
from ..core.redis_client import redis_client
from ..schemas.enhanced_error_logging import (
    RealTimeErrorStatistics, ErrorTrendAnalysis, CriticalErrorAlert,
    EnhancedErrorLogResponse
)

logger = logging.getLogger(__name__)


class EnhancedErrorLoggingService(ErrorLoggingService):
    """
    Enhanced error logging service with real-time capabilities
    Extends the base ErrorLoggingService with WebSocket and analytics features
    """
    
    def __init__(self, db: Session):
        super().__init__(db)
        self.redis_prefix = "enhanced_error_logging"
    
    async def log_error_with_realtime_broadcast(
        self,
        error_log: APIErrorLog,
        connection_manager=None
    ) -> APIErrorLog:
        """
        Log error and broadcast to real-time clients
        """
        try:
            # Update real-time metrics in Redis
            await self._update_realtime_metrics(error_log)
            
            # Broadcast to WebSocket clients if manager is provided
            if connection_manager:
                error_data = self._prepare_error_broadcast_data(error_log)
                await connection_manager.broadcast_error_update(error_data)
            
            return error_log
            
        except Exception as e:
            logger.error(f"Failed to broadcast error update: {e}")
            return error_log
    
    def get_active_errors_enhanced(
        self,
        tenant_id: Optional[uuid.UUID] = None,
        severity: Optional[ErrorSeverity] = None,
        category: Optional[ErrorCategory] = None,
        endpoint: Optional[str] = None,
        error_type: Optional[str] = None,
        hours_back: int = 24,
        limit: int = 50
    ) -> Tuple[List[APIErrorLog], int, Dict[str, Any]]:
        """
        Get active errors with enhanced metadata
        """
        try:
            # Calculate time range
            start_date = datetime.utcnow() - timedelta(hours=hours_back)
            
            # Get unresolved errors
            errors, total = self.get_errors_with_filters(
                tenant_id=tenant_id,
                severity=severity,
                category=category,
                endpoint=endpoint,
                error_type=error_type,
                is_resolved=False,
                start_date=start_date,
                limit=limit,
                order_by="last_occurrence",
                order_desc=True
            )
            
            # Calculate enhanced metadata
            metadata = self._calculate_active_errors_metadata(errors, hours_back)
            
            return errors, total, metadata
            
        except Exception as e:
            logger.error(f"Failed to get enhanced active errors: {e}")
            return [], 0, {}
    
    def get_realtime_statistics_enhanced(
        self,
        tenant_id: Optional[uuid.UUID] = None,
        hours_back: int = 24
    ) -> RealTimeErrorStatistics:
        """
        Get enhanced real-time error statistics
        """
        try:
            # Get base statistics
            end_date = datetime.utcnow()
            start_date = end_date - timedelta(hours=hours_back)
            
            base_stats = self.get_error_statistics(
                tenant_id=tenant_id,
                start_date=start_date,
                end_date=end_date
            )
            
            # Get additional real-time metrics
            realtime_metrics = self._get_realtime_metrics(tenant_id, hours_back)
            
            # Get trend data
            trend_data = self._get_error_trends_enhanced(hours_back)
            
            # Calculate health score
            health_score = self._calculate_system_health_score(base_stats, realtime_metrics)
            
            # Determine alert level
            alert_level = self._determine_alert_level(base_stats, realtime_metrics)
            
            # Combine all data
            enhanced_stats = RealTimeErrorStatistics(
                total_errors=base_stats.get("total_errors", 0),
                active_errors_count=realtime_metrics.get("active_errors_count", 0),
                resolved_errors_count=realtime_metrics.get("resolved_errors_count", 0),
                severity_breakdown=base_stats.get("severity_breakdown", {}),
                severity_trends=trend_data.get("severity_trends", {}),
                category_breakdown=base_stats.get("category_breakdown", {}),
                recent_critical_errors=base_stats.get("recent_critical_errors", 0),
                critical_errors_last_hour=realtime_metrics.get("critical_errors_last_hour", 0),
                errors_per_hour=trend_data.get("errors_per_hour", []),
                top_error_endpoints=base_stats.get("top_error_endpoints", []),
                top_error_types=realtime_metrics.get("top_error_types", []),
                top_affected_tenants=realtime_metrics.get("top_affected_tenants", []),
                error_rate_per_minute=realtime_metrics.get("error_rate_per_minute", 0.0),
                average_resolution_time=realtime_metrics.get("average_resolution_time"),
                time_range={
                    "start": start_date.isoformat(),
                    "end": end_date.isoformat(),
                    "hours": hours_back
                },
                last_updated=end_date,
                system_health_score=health_score,
                alert_level=alert_level
            )
            
            return enhanced_stats
            
        except Exception as e:
            logger.error(f"Failed to get enhanced real-time statistics: {e}")
            # Return minimal stats on error
            return RealTimeErrorStatistics(
                total_errors=0,
                active_errors_count=0,
                resolved_errors_count=0,
                severity_breakdown={},
                category_breakdown={},
                recent_critical_errors=0,
                critical_errors_last_hour=0,
                time_range={
                    "start": start_date.isoformat(),
                    "end": datetime.utcnow().isoformat(),
                    "hours": hours_back
                },
                last_updated=datetime.utcnow(),
                alert_level="unknown"
            )
    
    def get_critical_alerts_enhanced(
        self,
        hours: int = 24,
        include_resolved: bool = False
    ) -> List[CriticalErrorAlert]:
        """
        Get enhanced critical error alerts
        """
        try:
            start_date = datetime.utcnow() - timedelta(hours=hours)
            
            # Get critical errors
            critical_errors, _ = self.get_errors_with_filters(
                severity=ErrorSeverity.CRITICAL,
                start_date=start_date,
                is_resolved=None if include_resolved else False,
                limit=100,
                order_by="last_occurrence",
                order_desc=True
            )
            
            alerts = []
            for error in critical_errors:
                # Calculate time since last occurrence
                time_since_last = self._calculate_time_since(error.last_occurrence)
                
                # Determine if requires immediate attention
                requires_immediate = self._requires_immediate_attention(error)
                
                # Get tenant name if available
                tenant_name = self._get_tenant_name(error.tenant_id) if error.tenant_id else None
                
                alert = CriticalErrorAlert(
                    id=error.id,
                    error_message=error.error_message,
                    error_type=error.error_type,
                    endpoint=error.endpoint,
                    severity=error.severity,
                    category=error.category,
                    tenant_id=error.tenant_id,
                    tenant_name=tenant_name,
                    occurrence_count=error.occurrence_count,
                    first_occurrence=error.first_occurrence,
                    last_occurrence=error.last_occurrence,
                    time_since_last=time_since_last,
                    is_escalated=error.occurrence_count >= 10,
                    requires_immediate_attention=requires_immediate
                )
                alerts.append(alert)
            
            return alerts
            
        except Exception as e:
            logger.error(f"Failed to get enhanced critical alerts: {e}")
            return []
    
    def get_error_trend_analysis(self, days: int = 7) -> ErrorTrendAnalysis:
        """
        Get comprehensive error trend analysis
        """
        try:
            end_date = datetime.utcnow()
            start_date = end_date - timedelta(days=days)
            
            # Get error trends
            trends = self.get_error_trends(days)
            
            # Calculate additional metrics
            total_errors = sum(day["count"] for day in trends["daily_counts"])
            
            # Calculate growth rate
            if len(trends["daily_counts"]) >= 2:
                recent_avg = sum(day["count"] for day in trends["daily_counts"][-3:]) / 3
                older_avg = sum(day["count"] for day in trends["daily_counts"][:3]) / 3
                growth_rate = ((recent_avg - older_avg) / older_avg * 100) if older_avg > 0 else 0
            else:
                growth_rate = 0
            
            # Find most common error type
            error_types = self.db.query(
                APIErrorLog.error_type,
                func.count(APIErrorLog.id).label('count')
            ).filter(
                APIErrorLog.created_at >= start_date
            ).group_by(APIErrorLog.error_type).order_by(
                func.count(APIErrorLog.id).desc()
            ).first()
            
            most_common_error_type = error_types[0] if error_types else "Unknown"
            
            # Find peak error hour
            hourly_errors = self.db.query(
                func.extract('hour', APIErrorLog.created_at).label('hour'),
                func.count(APIErrorLog.id).label('count')
            ).filter(
                APIErrorLog.created_at >= start_date
            ).group_by(
                func.extract('hour', APIErrorLog.created_at)
            ).order_by(
                func.count(APIErrorLog.id).desc()
            ).first()
            
            peak_error_hour = int(hourly_errors[0]) if hourly_errors else 0
            
            # Calculate resolution rate
            total_errors_in_period = self.db.query(APIErrorLog).filter(
                APIErrorLog.created_at >= start_date
            ).count()
            
            resolved_errors = self.db.query(APIErrorLog).filter(
                APIErrorLog.created_at >= start_date,
                APIErrorLog.is_resolved == True
            ).count()
            
            resolution_rate = (resolved_errors / total_errors_in_period * 100) if total_errors_in_period > 0 else 0
            
            # Calculate average resolution time
            resolved_with_time = self.db.query(APIErrorLog).filter(
                APIErrorLog.created_at >= start_date,
                APIErrorLog.is_resolved == True,
                APIErrorLog.resolved_at.isnot(None)
            ).all()
            
            if resolved_with_time:
                resolution_times = [
                    (error.resolved_at - error.created_at).total_seconds() / 60
                    for error in resolved_with_time
                ]
                average_resolution_time = sum(resolution_times) / len(resolution_times)
            else:
                average_resolution_time = 0
            
            # Calculate critical error frequency
            critical_errors = self.db.query(APIErrorLog).filter(
                APIErrorLog.created_at >= start_date,
                APIErrorLog.severity == ErrorSeverity.CRITICAL
            ).count()
            
            critical_error_frequency = critical_errors / days
            
            # Determine trend direction
            if growth_rate > 10:
                trend_direction = "increasing"
            elif growth_rate < -10:
                trend_direction = "decreasing"
            else:
                trend_direction = "stable"
            
            # Generate recommendations
            recommendations = self._generate_recommendations(
                growth_rate, resolution_rate, critical_error_frequency, average_resolution_time
            )
            
            return ErrorTrendAnalysis(
                period=f"{days} days",
                total_errors=total_errors,
                error_growth_rate=growth_rate,
                most_common_error_type=most_common_error_type,
                peak_error_hour=peak_error_hour,
                resolution_rate=resolution_rate,
                average_resolution_time=average_resolution_time,
                critical_error_frequency=critical_error_frequency,
                trend_direction=trend_direction,
                recommendations=recommendations
            )
            
        except Exception as e:
            logger.error(f"Failed to get error trend analysis: {e}")
            return ErrorTrendAnalysis(
                period=f"{days} days",
                total_errors=0,
                error_growth_rate=0,
                most_common_error_type="Unknown",
                peak_error_hour=0,
                resolution_rate=0,
                average_resolution_time=0,
                critical_error_frequency=0,
                trend_direction="unknown",
                recommendations=["Unable to generate recommendations due to data error"]
            )
    
    async def _update_realtime_metrics(self, error_log: APIErrorLog):
        """
        Update real-time metrics in Redis
        """
        try:
            current_time = datetime.utcnow()
            
            # Update error counters with expiration
            await self._redis_incr_with_expiry(f"{self.redis_prefix}:total_errors", 3600)
            await self._redis_incr_with_expiry(f"{self.redis_prefix}:severity:{error_log.severity.value}", 3600)
            await self._redis_incr_with_expiry(f"{self.redis_prefix}:category:{error_log.category.value}", 3600)
            
            # Update hourly metrics
            hour_key = current_time.strftime("%Y-%m-%d-%H")
            await self._redis_incr_with_expiry(f"{self.redis_prefix}:hourly:{hour_key}", 7200)
            
            # Update tenant-specific metrics if applicable
            if error_log.tenant_id:
                await self._redis_incr_with_expiry(f"{self.redis_prefix}:tenant:{error_log.tenant_id}", 3600)
            
            # Update error rate (errors per minute)
            minute_key = current_time.strftime("%Y-%m-%d-%H-%M")
            await self._redis_incr_with_expiry(f"{self.redis_prefix}:minute:{minute_key}", 300)
            
        except Exception as e:
            logger.error(f"Failed to update real-time metrics: {e}")
    
    async def _redis_incr_with_expiry(self, key: str, expiry_seconds: int):
        """
        Increment Redis key with expiry
        """
        try:
            redis_client.incr(key)
            redis_client.expire(key, expiry_seconds)
        except Exception as e:
            logger.warning(f"Redis operation failed for key {key}: {e}")
    
    def _prepare_error_broadcast_data(self, error_log: APIErrorLog) -> Dict[str, Any]:
        """
        Prepare error data for WebSocket broadcast
        """
        return {
            "id": str(error_log.id),
            "error_message": error_log.error_message,
            "error_type": error_log.error_type,
            "endpoint": error_log.endpoint,
            "method": error_log.method,
            "status_code": error_log.status_code,
            "severity": error_log.severity.value,
            "category": error_log.category.value,
            "tenant_id": str(error_log.tenant_id) if error_log.tenant_id else None,
            "occurrence_count": error_log.occurrence_count,
            "first_occurrence": error_log.first_occurrence.isoformat(),
            "last_occurrence": error_log.last_occurrence.isoformat(),
            "is_resolved": error_log.is_resolved,
            "created_at": error_log.created_at.isoformat()
        }
    
    def _calculate_active_errors_metadata(self, errors: List[APIErrorLog], hours_back: int) -> Dict[str, Any]:
        """
        Calculate metadata for active errors
        """
        if not errors:
            return {}
        
        # Group by severity
        severity_counts = defaultdict(int)
        for error in errors:
            severity_counts[error.severity.value] += 1
        
        # Group by category
        category_counts = defaultdict(int)
        for error in errors:
            category_counts[error.category.value] += 1
        
        # Calculate average occurrence count
        avg_occurrence = sum(error.occurrence_count for error in errors) / len(errors)
        
        # Find most recent error
        most_recent = max(errors, key=lambda e: e.last_occurrence)
        
        return {
            "severity_distribution": dict(severity_counts),
            "category_distribution": dict(category_counts),
            "average_occurrence_count": round(avg_occurrence, 2),
            "most_recent_error": {
                "id": str(most_recent.id),
                "message": most_recent.error_message,
                "last_occurrence": most_recent.last_occurrence.isoformat()
            },
            "time_range_hours": hours_back,
            "total_occurrences": sum(error.occurrence_count for error in errors)
        }
    
    def _get_realtime_metrics(self, tenant_id: Optional[uuid.UUID], hours_back: int) -> Dict[str, Any]:
        """
        Get real-time metrics from Redis and database
        """
        try:
            current_time = datetime.utcnow()
            start_time = current_time - timedelta(hours=hours_back)
            
            # Get active errors count
            active_query = self.db.query(APIErrorLog).filter(
                APIErrorLog.is_resolved == False,
                APIErrorLog.created_at >= start_time
            )
            if tenant_id:
                active_query = active_query.filter(APIErrorLog.tenant_id == tenant_id)
            active_errors_count = active_query.count()
            
            # Get resolved errors count
            resolved_query = self.db.query(APIErrorLog).filter(
                APIErrorLog.is_resolved == True,
                APIErrorLog.created_at >= start_time
            )
            if tenant_id:
                resolved_query = resolved_query.filter(APIErrorLog.tenant_id == tenant_id)
            resolved_errors_count = resolved_query.count()
            
            # Get critical errors in last hour
            last_hour = current_time - timedelta(hours=1)
            critical_last_hour_query = self.db.query(APIErrorLog).filter(
                APIErrorLog.severity == ErrorSeverity.CRITICAL,
                APIErrorLog.created_at >= last_hour
            )
            if tenant_id:
                critical_last_hour_query = critical_last_hour_query.filter(APIErrorLog.tenant_id == tenant_id)
            critical_errors_last_hour = critical_last_hour_query.count()
            
            # Calculate error rate per minute (last 10 minutes)
            ten_minutes_ago = current_time - timedelta(minutes=10)
            recent_errors_query = self.db.query(APIErrorLog).filter(
                APIErrorLog.created_at >= ten_minutes_ago
            )
            if tenant_id:
                recent_errors_query = recent_errors_query.filter(APIErrorLog.tenant_id == tenant_id)
            recent_errors_count = recent_errors_query.count()
            error_rate_per_minute = recent_errors_count / 10.0
            
            # Get top error types
            top_error_types_query = self.db.query(
                APIErrorLog.error_type,
                func.count(APIErrorLog.id).label('count')
            ).filter(
                APIErrorLog.created_at >= start_time
            )
            if tenant_id:
                top_error_types_query = top_error_types_query.filter(APIErrorLog.tenant_id == tenant_id)
            
            top_error_types = top_error_types_query.group_by(
                APIErrorLog.error_type
            ).order_by(
                func.count(APIErrorLog.id).desc()
            ).limit(5).all()
            
            # Get top affected tenants (if not filtering by tenant)
            top_affected_tenants = []
            if not tenant_id:
                tenant_errors = self.db.query(
                    APIErrorLog.tenant_id,
                    func.count(APIErrorLog.id).label('count')
                ).filter(
                    APIErrorLog.created_at >= start_time,
                    APIErrorLog.tenant_id.isnot(None)
                ).group_by(
                    APIErrorLog.tenant_id
                ).order_by(
                    func.count(APIErrorLog.id).desc()
                ).limit(5).all()
                
                top_affected_tenants = [
                    {"tenant_id": str(tenant_id), "error_count": count}
                    for tenant_id, count in tenant_errors
                ]
            
            # Calculate average resolution time
            resolved_with_time = self.db.query(APIErrorLog).filter(
                APIErrorLog.created_at >= start_time,
                APIErrorLog.is_resolved == True,
                APIErrorLog.resolved_at.isnot(None)
            )
            if tenant_id:
                resolved_with_time = resolved_with_time.filter(APIErrorLog.tenant_id == tenant_id)
            
            resolved_errors = resolved_with_time.all()
            
            if resolved_errors:
                resolution_times = [
                    (error.resolved_at - error.created_at).total_seconds() / 60
                    for error in resolved_errors
                ]
                average_resolution_time = sum(resolution_times) / len(resolution_times)
            else:
                average_resolution_time = None
            
            return {
                "active_errors_count": active_errors_count,
                "resolved_errors_count": resolved_errors_count,
                "critical_errors_last_hour": critical_errors_last_hour,
                "error_rate_per_minute": error_rate_per_minute,
                "top_error_types": [
                    {"error_type": error_type, "count": count}
                    for error_type, count in top_error_types
                ],
                "top_affected_tenants": top_affected_tenants,
                "average_resolution_time": average_resolution_time
            }
            
        except Exception as e:
            logger.error(f"Failed to get real-time metrics: {e}")
            return {
                "active_errors_count": 0,
                "resolved_errors_count": 0,
                "critical_errors_last_hour": 0,
                "error_rate_per_minute": 0.0,
                "top_error_types": [],
                "top_affected_tenants": [],
                "average_resolution_time": None
            }
    
    def _get_error_trends_enhanced(self, hours_back: int) -> Dict[str, Any]:
        """
        Get enhanced error trends with hourly breakdown
        """
        try:
            current_time = datetime.utcnow()
            start_time = current_time - timedelta(hours=hours_back)
            
            # Get hourly error counts
            hourly_errors = self.db.query(
                func.extract('hour', APIErrorLog.created_at).label('hour'),
                func.count(APIErrorLog.id).label('count')
            ).filter(
                APIErrorLog.created_at >= start_time
            ).group_by(
                func.extract('hour', APIErrorLog.created_at)
            ).order_by('hour').all()
            
            errors_per_hour = [
                {"hour": int(hour), "count": count}
                for hour, count in hourly_errors
            ]
            
            # Get severity trends by hour
            severity_trends = {}
            for severity in ErrorSeverity:
                severity_hourly = self.db.query(
                    func.extract('hour', APIErrorLog.created_at).label('hour'),
                    func.count(APIErrorLog.id).label('count')
                ).filter(
                    APIErrorLog.created_at >= start_time,
                    APIErrorLog.severity == severity
                ).group_by(
                    func.extract('hour', APIErrorLog.created_at)
                ).order_by('hour').all()
                
                severity_trends[severity.value] = [
                    {"hour": int(hour), "count": count}
                    for hour, count in severity_hourly
                ]
            
            return {
                "errors_per_hour": errors_per_hour,
                "severity_trends": severity_trends
            }
            
        except Exception as e:
            logger.error(f"Failed to get enhanced error trends: {e}")
            return {
                "errors_per_hour": [],
                "severity_trends": {}
            }
    
    def _calculate_system_health_score(self, base_stats: Dict[str, Any], realtime_metrics: Dict[str, Any]) -> int:
        """
        Calculate system health score (0-100)
        """
        try:
            score = 100
            
            # Deduct points for critical errors
            critical_errors = base_stats.get("recent_critical_errors", 0)
            score -= min(critical_errors * 10, 50)
            
            # Deduct points for high error rate
            error_rate = realtime_metrics.get("error_rate_per_minute", 0)
            if error_rate > 5:
                score -= 30
            elif error_rate > 2:
                score -= 15
            elif error_rate > 1:
                score -= 5
            
            # Deduct points for unresolved errors
            unresolved = base_stats.get("unresolved_errors", 0)
            score -= min(unresolved * 2, 30)
            
            # Bonus points for good resolution rate
            total_errors = base_stats.get("total_errors", 0)
            if total_errors > 0:
                resolved_count = realtime_metrics.get("resolved_errors_count", 0)
                resolution_rate = (resolved_count / total_errors) * 100
                if resolution_rate > 90:
                    score += 10
                elif resolution_rate > 75:
                    score += 5
            
            return max(0, min(100, score))
            
        except Exception as e:
            logger.error(f"Failed to calculate health score: {e}")
            return 50  # Default to neutral score
    
    def _determine_alert_level(self, base_stats: Dict[str, Any], realtime_metrics: Dict[str, Any]) -> str:
        """
        Determine current alert level
        """
        try:
            critical_errors = base_stats.get("recent_critical_errors", 0)
            error_rate = realtime_metrics.get("error_rate_per_minute", 0)
            critical_last_hour = realtime_metrics.get("critical_errors_last_hour", 0)
            
            if critical_last_hour > 0 or error_rate > 5:
                return "critical"
            elif critical_errors > 5 or error_rate > 2:
                return "high"
            elif critical_errors > 0 or error_rate > 1:
                return "medium"
            else:
                return "normal"
                
        except Exception as e:
            logger.error(f"Failed to determine alert level: {e}")
            return "unknown"
    
    def _calculate_time_since(self, timestamp: datetime) -> str:
        """
        Calculate human-readable time since timestamp
        """
        try:
            delta = datetime.utcnow() - timestamp
            
            if delta.days > 0:
                return f"{delta.days} day{'s' if delta.days != 1 else ''} ago"
            elif delta.seconds > 3600:
                hours = delta.seconds // 3600
                return f"{hours} hour{'s' if hours != 1 else ''} ago"
            elif delta.seconds > 60:
                minutes = delta.seconds // 60
                return f"{minutes} minute{'s' if minutes != 1 else ''} ago"
            else:
                return "Just now"
                
        except Exception as e:
            logger.error(f"Failed to calculate time since: {e}")
            return "Unknown"
    
    def _requires_immediate_attention(self, error: APIErrorLog) -> bool:
        """
        Determine if error requires immediate attention
        """
        try:
            # Critical errors always require attention
            if error.severity == ErrorSeverity.CRITICAL:
                return True
            
            # High frequency errors require attention
            if error.occurrence_count >= 10:
                return True
            
            # Recent high severity errors
            if error.severity == ErrorSeverity.HIGH and error.last_occurrence > datetime.utcnow() - timedelta(hours=1):
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Failed to determine immediate attention requirement: {e}")
            return False
    
    def _get_tenant_name(self, tenant_id: uuid.UUID) -> Optional[str]:
        """
        Get tenant name by ID (placeholder - implement based on your tenant model)
        """
        try:
            # This should be implemented based on your tenant model
            # For now, return a placeholder
            return f"Tenant-{str(tenant_id)[:8]}"
        except Exception as e:
            logger.error(f"Failed to get tenant name: {e}")
            return None
    
    def _generate_recommendations(
        self,
        growth_rate: float,
        resolution_rate: float,
        critical_frequency: float,
        avg_resolution_time: float
    ) -> List[str]:
        """
        Generate improvement recommendations based on metrics
        """
        recommendations = []
        
        try:
            if growth_rate > 20:
                recommendations.append("Error rate is increasing rapidly. Consider investigating root causes.")
            
            if resolution_rate < 50:
                recommendations.append("Low resolution rate. Consider improving error handling and monitoring.")
            
            if critical_frequency > 2:
                recommendations.append("High critical error frequency. Implement better error prevention measures.")
            
            if avg_resolution_time > 60:
                recommendations.append("Long average resolution time. Consider improving incident response procedures.")
            
            if not recommendations:
                recommendations.append("System performance is within acceptable parameters.")
            
            return recommendations
            
        except Exception as e:
            logger.error(f"Failed to generate recommendations: {e}")
            return ["Unable to generate recommendations due to analysis error."]