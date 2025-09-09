"""
Error Logging Service
Comprehensive error tracking and notification system
"""

from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import uuid
import logging
import traceback
import json
from fastapi import Request

from ..models.api_error_log import APIErrorLog, ErrorSeverity, ErrorCategory
from ..core.redis_client import redis_client
from ..services.notification_service import NotificationService


logger = logging.getLogger(__name__)


class ErrorLoggingService:
    """
    Service for comprehensive API error logging and management
    """
    
    def __init__(self, db: Session):
        self.db = db
        self.notification_service = NotificationService(db)
    
    def log_api_error(
        self,
        request: Request,
        exception: Exception,
        tenant_id: Optional[uuid.UUID] = None,
        user_id: Optional[uuid.UUID] = None,
        session_id: Optional[str] = None,
        additional_context: Optional[Dict[str, Any]] = None
    ) -> APIErrorLog:
        """
        Log an API error with comprehensive context
        """
        try:
            # Extract request information
            endpoint = str(request.url.path)
            method = request.method
            user_agent = request.headers.get("user-agent", "")
            ip_address = self._get_client_ip(request)
            request_id = request.headers.get("x-request-id", str(uuid.uuid4()))
            
            # Determine error details
            error_message = str(exception)
            error_type = type(exception).__name__
            stack_trace = traceback.format_exc()
            
            # Determine status code
            status_code = getattr(exception, 'status_code', 500)
            
            # Categorize error
            severity = self._determine_severity(exception, status_code)
            category = self._categorize_error(exception, endpoint)
            
            # Sanitize request data
            request_data = self._sanitize_request_data(request)
            
            # Create error context
            error_context = {
                "exception_type": error_type,
                "request_headers": dict(request.headers),
                "query_params": dict(request.query_params),
                "path_params": getattr(request, 'path_params', {}),
            }
            
            if additional_context:
                error_context.update(additional_context)
            
            # Log the error
            error_log = APIErrorLog.log_error(
                db=self.db,
                error_message=error_message,
                error_type=error_type,
                endpoint=endpoint,
                method=method,
                status_code=status_code,
                severity=severity,
                category=category,
                tenant_id=tenant_id,
                user_id=user_id,
                session_id=session_id,
                request_id=request_id,
                user_agent=user_agent,
                ip_address=ip_address,
                stack_trace=stack_trace,
                request_data=request_data,
                additional_context=error_context
            )
            
            # Check if notification should be sent
            if error_log.should_send_notification():
                self._send_error_notification(error_log)
            
            # Update error metrics in Redis
            self._update_error_metrics(error_log)
            
            # Broadcast new error to WebSocket clients (if it's a new error, not a duplicate)
            if error_log.occurrence_count == 1:
                self._broadcast_new_error(error_log)
            
            return error_log
            
        except Exception as e:
            logger.error(f"Failed to log API error: {e}")
            # Fallback logging to prevent error logging from breaking the application
            logger.error(f"Original error: {exception}")
            raise
    
    def log_custom_error(
        self,
        error_message: str,
        error_type: str,
        endpoint: str,
        method: str = "UNKNOWN",
        status_code: int = 500,
        severity: ErrorSeverity = ErrorSeverity.MEDIUM,
        category: ErrorCategory = ErrorCategory.UNKNOWN,
        tenant_id: Optional[uuid.UUID] = None,
        user_id: Optional[uuid.UUID] = None,
        additional_context: Optional[Dict[str, Any]] = None
    ) -> APIErrorLog:
        """
        Log a custom error with specified parameters
        """
        error_log = APIErrorLog.log_error(
            db=self.db,
            error_message=error_message,
            error_type=error_type,
            endpoint=endpoint,
            method=method,
            status_code=status_code,
            severity=severity,
            category=category,
            tenant_id=tenant_id,
            user_id=user_id,
            additional_context=additional_context
        )
        
        # Check if notification should be sent
        if error_log.should_send_notification():
            self._send_error_notification(error_log)
        
        # Update error metrics
        self._update_error_metrics(error_log)
        
        return error_log
    
    def get_errors_with_filters(
        self,
        tenant_id: Optional[uuid.UUID] = None,
        user_id: Optional[uuid.UUID] = None,
        severity: Optional[ErrorSeverity] = None,
        category: Optional[ErrorCategory] = None,
        endpoint: Optional[str] = None,
        error_type: Optional[str] = None,
        status_code: Optional[int] = None,
        is_resolved: Optional[bool] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        search_term: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
        order_by: str = "created_at",
        order_desc: bool = True
    ) -> tuple[List[APIErrorLog], int]:
        """
        Get errors with comprehensive filtering
        """
        return APIErrorLog.get_errors_with_filters(
            db=self.db,
            tenant_id=tenant_id,
            user_id=user_id,
            severity=severity,
            category=category,
            endpoint=endpoint,
            error_type=error_type,
            status_code=status_code,
            is_resolved=is_resolved,
            start_date=start_date,
            end_date=end_date,
            search_term=search_term,
            skip=skip,
            limit=limit,
            order_by=order_by,
            order_desc=order_desc
        )
    
    def get_error_statistics(
        self,
        tenant_id: Optional[uuid.UUID] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """
        Get comprehensive error statistics
        """
        return APIErrorLog.get_error_statistics(
            db=self.db,
            tenant_id=tenant_id,
            start_date=start_date,
            end_date=end_date
        )
    
    def get_real_time_statistics(self) -> Dict[str, Any]:
        """
        Get real-time error statistics focused on active errors
        """
        try:
            # Count active errors by severity
            critical_count = self.db.query(APIErrorLog).filter(
                APIErrorLog.is_resolved == False,
                APIErrorLog.severity == ErrorSeverity.CRITICAL
            ).count()
            
            high_count = self.db.query(APIErrorLog).filter(
                APIErrorLog.is_resolved == False,
                APIErrorLog.severity == ErrorSeverity.HIGH
            ).count()
            
            medium_count = self.db.query(APIErrorLog).filter(
                APIErrorLog.is_resolved == False,
                APIErrorLog.severity == ErrorSeverity.MEDIUM
            ).count()
            
            low_count = self.db.query(APIErrorLog).filter(
                APIErrorLog.is_resolved == False,
                APIErrorLog.severity == ErrorSeverity.LOW
            ).count()
            
            total_active = critical_count + high_count + medium_count + low_count
            
            # Get recent error trend (last 24 hours)
            twenty_four_hours_ago = datetime.utcnow() - timedelta(hours=24)
            recent_errors = self.db.query(APIErrorLog).filter(
                APIErrorLog.created_at >= twenty_four_hours_ago
            ).count()
            
            # Get errors by category (active only)
            category_stats = {}
            for category in ErrorCategory:
                count = self.db.query(APIErrorLog).filter(
                    APIErrorLog.is_resolved == False,
                    APIErrorLog.category == category
                ).count()
                category_stats[category.value] = count
            
            # Get top error endpoints (active only)
            from sqlalchemy import func as sql_func
            top_endpoints = self.db.query(
                APIErrorLog.endpoint,
                sql_func.count(APIErrorLog.id).label('error_count')
            ).filter(
                APIErrorLog.is_resolved == False
            ).group_by(APIErrorLog.endpoint).order_by(
                sql_func.count(APIErrorLog.id).desc()
            ).limit(5).all()
            
            return {
                "total_active_errors": total_active,
                "critical_errors": critical_count,
                "high_priority_errors": high_count,
                "medium_priority_errors": medium_count,
                "low_priority_errors": low_count,
                "errors_last_24h": recent_errors,
                "category_breakdown": category_stats,
                "top_error_endpoints": [
                    {"endpoint": endpoint, "count": count}
                    for endpoint, count in top_endpoints
                ],
                "last_updated": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Failed to get real-time statistics: {e}")
            return {
                "total_active_errors": 0,
                "critical_errors": 0,
                "high_priority_errors": 0,
                "medium_priority_errors": 0,
                "low_priority_errors": 0,
                "errors_last_24h": 0,
                "category_breakdown": {},
                "top_error_endpoints": [],
                "last_updated": datetime.utcnow().isoformat(),
                "error": str(e)
            }
    
    def resolve_error(
        self,
        error_id: uuid.UUID,
        resolved_by: uuid.UUID,
        notes: Optional[str] = None
    ) -> Optional[APIErrorLog]:
        """
        Mark an error as resolved
        """
        error_log = self.db.query(APIErrorLog).filter(APIErrorLog.id == error_id).first()
        if error_log:
            error_log.mark_resolved(self.db, resolved_by, notes)
            logger.info(f"Error {error_id} marked as resolved by {resolved_by}")
        return error_log
    
    def get_critical_errors(self, hours: int = 24) -> List[APIErrorLog]:
        """
        Get critical errors from the last N hours
        """
        cutoff_time = datetime.utcnow() - timedelta(hours=hours)
        errors, _ = self.get_errors_with_filters(
            severity=ErrorSeverity.CRITICAL,
            start_date=cutoff_time,
            is_resolved=False,
            limit=100
        )
        return errors
    
    def get_error_trends(self, days: int = 7) -> Dict[str, Any]:
        """
        Get error trends over the specified number of days
        """
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)
        
        # Get daily error counts
        from sqlalchemy import func, Date
        daily_counts = self.db.query(
            func.date(APIErrorLog.created_at).label('date'),
            func.count(APIErrorLog.id).label('count')
        ).filter(
            APIErrorLog.created_at >= start_date,
            APIErrorLog.created_at <= end_date
        ).group_by(
            func.date(APIErrorLog.created_at)
        ).order_by('date').all()
        
        # Get severity trends
        severity_trends = {}
        for severity in ErrorSeverity:
            severity_counts = self.db.query(
                func.date(APIErrorLog.created_at).label('date'),
                func.count(APIErrorLog.id).label('count')
            ).filter(
                APIErrorLog.created_at >= start_date,
                APIErrorLog.created_at <= end_date,
                APIErrorLog.severity == severity
            ).group_by(
                func.date(APIErrorLog.created_at)
            ).order_by('date').all()
            
            severity_trends[severity.value] = [
                {"date": str(date), "count": count}
                for date, count in severity_counts
            ]
        
        return {
            "daily_counts": [
                {"date": str(date), "count": count}
                for date, count in daily_counts
            ],
            "severity_trends": severity_trends,
            "period": {
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
                "days": days
            }
        }
    
    def _determine_severity(self, exception: Exception, status_code: int) -> ErrorSeverity:
        """
        Determine error severity based on exception type and status code
        """
        # Critical errors
        if status_code >= 500:
            return ErrorSeverity.CRITICAL
        
        # High severity errors
        if status_code in [401, 403, 429]:  # Auth, rate limiting
            return ErrorSeverity.HIGH
        
        # Medium severity errors
        if status_code in [400, 404, 422]:  # Client errors
            return ErrorSeverity.MEDIUM
        
        # Check exception type
        exception_name = type(exception).__name__
        
        if exception_name in ['DatabaseError', 'ConnectionError', 'TimeoutError']:
            return ErrorSeverity.CRITICAL
        
        if exception_name in ['ValidationError', 'AuthenticationError']:
            return ErrorSeverity.HIGH
        
        return ErrorSeverity.MEDIUM
    
    def _categorize_error(self, exception: Exception, endpoint: str) -> ErrorCategory:
        """
        Categorize error based on exception type and endpoint
        """
        exception_name = type(exception).__name__
        
        # Authentication/Authorization errors
        if exception_name in ['AuthenticationError', 'HTTPException'] and 'auth' in endpoint.lower():
            return ErrorCategory.AUTHENTICATION
        
        if exception_name in ['PermissionError', 'HTTPException'] and any(
            code in str(exception) for code in ['403', 'Forbidden', 'Permission']
        ):
            return ErrorCategory.AUTHORIZATION
        
        # Database errors
        if exception_name in ['DatabaseError', 'IntegrityError', 'OperationalError']:
            return ErrorCategory.DATABASE
        
        # Validation errors
        if exception_name in ['ValidationError', 'ValueError', 'TypeError']:
            return ErrorCategory.VALIDATION
        
        # Network/External API errors
        if exception_name in ['ConnectionError', 'TimeoutError', 'HTTPError']:
            return ErrorCategory.EXTERNAL_API
        
        # System errors
        if exception_name in ['MemoryError', 'OSError', 'SystemError']:
            return ErrorCategory.SYSTEM
        
        # Performance errors
        if exception_name in ['TimeoutError'] or 'timeout' in str(exception).lower():
            return ErrorCategory.PERFORMANCE
        
        # Security errors
        if any(term in str(exception).lower() for term in ['security', 'csrf', 'xss', 'injection']):
            return ErrorCategory.SECURITY
        
        return ErrorCategory.UNKNOWN
    
    def _sanitize_request_data(self, request: Request) -> Optional[Dict[str, Any]]:
        """
        Sanitize request data to remove sensitive information
        """
        try:
            # Get request body if available
            request_data = {}
            
            # Add query parameters (sanitized)
            if request.query_params:
                query_params = dict(request.query_params)
                request_data["query_params"] = self._sanitize_dict(query_params)
            
            # Add path parameters
            if hasattr(request, 'path_params') and request.path_params:
                request_data["path_params"] = dict(request.path_params)
            
            return request_data if request_data else None
            
        except Exception as e:
            logger.warning(f"Failed to sanitize request data: {e}")
            return None
    
    def _sanitize_dict(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Remove sensitive fields from dictionary
        """
        sensitive_fields = {
            'password', 'token', 'secret', 'key', 'auth', 'credential',
            'private', 'confidential', 'ssn', 'credit_card', 'cvv'
        }
        
        sanitized = {}
        for key, value in data.items():
            if any(sensitive in key.lower() for sensitive in sensitive_fields):
                sanitized[key] = "[REDACTED]"
            elif isinstance(value, dict):
                sanitized[key] = self._sanitize_dict(value)
            else:
                sanitized[key] = value
        
        return sanitized
    
    def _get_client_ip(self, request: Request) -> Optional[str]:
        """
        Extract client IP address from request
        """
        # Check for forwarded headers first
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        
        real_ip = request.headers.get("x-real-ip")
        if real_ip:
            return real_ip
        
        # Fallback to client host
        if hasattr(request, 'client') and request.client:
            return request.client.host
        
        return None
    
    def _send_error_notification(self, error_log: APIErrorLog):
        """
        Send notification for critical errors
        """
        try:
            # Prepare notification content
            subject = f"Critical Error Alert - {error_log.severity.value.upper()}"
            message = f"""
            Critical error detected in HesaabPlus:
            
            Error: {error_log.error_message}
            Type: {error_log.error_type}
            Endpoint: {error_log.endpoint}
            Method: {error_log.method}
            Status Code: {error_log.status_code}
            Severity: {error_log.severity.value}
            Category: {error_log.category.value}
            
            Tenant ID: {error_log.tenant_id or 'N/A'}
            User ID: {error_log.user_id or 'N/A'}
            
            Occurrence Count: {error_log.occurrence_count}
            First Occurrence: {error_log.first_occurrence}
            Last Occurrence: {error_log.last_occurrence}
            
            Please investigate and resolve this issue promptly.
            """
            
            # Send notification to admin team
            # This would integrate with your notification service
            logger.critical(f"Critical error notification: {error_log.id}")
            
            # Mark notification as sent
            error_log.mark_notification_sent(self.db)
            
        except Exception as e:
            logger.error(f"Failed to send error notification: {e}")
    
    def _update_error_metrics(self, error_log: APIErrorLog):
        """
        Update error metrics in Redis for real-time monitoring
        """
        try:
            # Update error counters
            redis_key_prefix = "error_metrics"
            
            # Daily error count
            today = datetime.utcnow().strftime("%Y-%m-%d")
            redis_client.incr(f"{redis_key_prefix}:daily:{today}")
            
            # Severity counters
            redis_client.incr(f"{redis_key_prefix}:severity:{error_log.severity.value}")
            
            # Category counters
            redis_client.incr(f"{redis_key_prefix}:category:{error_log.category.value}")
            
            # Endpoint error counters
            redis_client.incr(f"{redis_key_prefix}:endpoint:{error_log.endpoint}")
            
            # Tenant-specific counters (if applicable)
            if error_log.tenant_id:
                redis_client.incr(f"{redis_key_prefix}:tenant:{error_log.tenant_id}")
            
            # Set expiration for daily metrics (30 days)
            redis_client.expire(f"{redis_key_prefix}:daily:{today}", 30 * 24 * 3600)
            
        except Exception as e:
            logger.warning(f"Failed to update error metrics in Redis: {e}")
    
    def _broadcast_new_error(self, error_log: APIErrorLog):
        """
        Broadcast new error to WebSocket clients
        """
        try:
            # Import here to avoid circular imports
            from ..api.error_logging import error_connection_manager
            
            # Use asyncio to run the async broadcast method
            import asyncio
            
            # Create a task to broadcast the error
            loop = asyncio.get_event_loop()
            if loop.is_running():
                # If we're already in an async context, create a task
                asyncio.create_task(error_connection_manager.broadcast_new_error(error_log))
            else:
                # If not in async context, run it
                asyncio.run(error_connection_manager.broadcast_new_error(error_log))
                
        except Exception as e:
            logger.warning(f"Failed to broadcast new error via WebSocket: {e}")