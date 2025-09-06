"""
Error Logging Middleware
Automatically captures and logs API errors with comprehensive context
"""

from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp
from sqlalchemy.orm import Session
from datetime import datetime
import uuid
import logging
import traceback
import json
from typing import Optional

from ..core.database import SessionLocal
from ..services.error_logging_service import ErrorLoggingService
from ..models.api_error_log import ErrorSeverity, ErrorCategory


logger = logging.getLogger(__name__)


class ErrorLoggingMiddleware(BaseHTTPMiddleware):
    """
    Middleware to automatically capture and log API errors
    """
    
    def __init__(self, app: ASGIApp):
        super().__init__(app)
        self.excluded_paths = {
            "/docs", "/redoc", "/openapi.json", "/favicon.ico",
            "/health", "/api/health", "/static"
        }
    
    async def dispatch(self, request: Request, call_next):
        """
        Process request and capture any errors
        """
        # Skip error logging for excluded paths
        if any(request.url.path.startswith(path) for path in self.excluded_paths):
            return await call_next(request)
        
        # Generate request ID for tracking
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id
        
        # Extract user context if available
        tenant_id = None
        user_id = None
        session_id = None
        
        try:
            # Try to get user context from request state (set by auth middleware)
            if hasattr(request.state, 'current_user'):
                user = request.state.current_user
                if hasattr(user, 'tenant_id'):
                    tenant_id = user.tenant_id
                if hasattr(user, 'id'):
                    user_id = user.id
            
            # Try to get session ID from headers or cookies
            session_id = request.headers.get('x-session-id') or request.cookies.get('session_id')
            
        except Exception as e:
            logger.debug(f"Could not extract user context: {e}")
        
        try:
            # Process the request
            response = await call_next(request)
            
            # Log errors for 4xx and 5xx status codes
            if response.status_code >= 400:
                await self._log_http_error(
                    request=request,
                    response=response,
                    tenant_id=tenant_id,
                    user_id=user_id,
                    session_id=session_id,
                    request_id=request_id
                )
            
            return response
            
        except Exception as exception:
            # Log the exception
            error_log = await self._log_exception(
                request=request,
                exception=exception,
                tenant_id=tenant_id,
                user_id=user_id,
                session_id=session_id,
                request_id=request_id
            )
            
            # Return appropriate error response
            return await self._create_error_response(exception, error_log)
    
    async def _log_exception(
        self,
        request: Request,
        exception: Exception,
        tenant_id: Optional[uuid.UUID] = None,
        user_id: Optional[uuid.UUID] = None,
        session_id: Optional[str] = None,
        request_id: Optional[str] = None
    ):
        """
        Log an exception with comprehensive context
        """
        try:
            # Create database session
            db = SessionLocal()
            
            try:
                # Create error logging service
                error_service = ErrorLoggingService(db)
                
                # Log the error
                error_log = error_service.log_api_error(
                    request=request,
                    exception=exception,
                    tenant_id=tenant_id,
                    user_id=user_id,
                    session_id=session_id,
                    additional_context={
                        "request_id": request_id,
                        "middleware": "ErrorLoggingMiddleware",
                        "timestamp": datetime.utcnow().isoformat()
                    }
                )
                
                return error_log
                
            finally:
                db.close()
                
        except Exception as e:
            # Fallback logging to prevent middleware from breaking the application
            logger.error(f"Failed to log exception in middleware: {e}")
            logger.error(f"Original exception: {exception}")
            return None
    
    async def _log_http_error(
        self,
        request: Request,
        response: Response,
        tenant_id: Optional[uuid.UUID] = None,
        user_id: Optional[uuid.UUID] = None,
        session_id: Optional[str] = None,
        request_id: Optional[str] = None
    ):
        """
        Log HTTP errors (4xx, 5xx status codes)
        """
        try:
            # Create database session
            db = SessionLocal()
            
            try:
                # Create error logging service
                error_service = ErrorLoggingService(db)
                
                # Determine error details
                error_message = f"HTTP {response.status_code} error"
                error_type = "HTTPError"
                
                # Try to get response body for more context
                response_data = None
                try:
                    if hasattr(response, 'body'):
                        response_body = response.body
                        if response_body:
                            response_data = {"body": response_body.decode('utf-8')[:1000]}  # Limit size
                except Exception:
                    pass
                
                # Determine severity based on status code
                if response.status_code >= 500:
                    severity = ErrorSeverity.CRITICAL
                elif response.status_code in [401, 403, 429]:
                    severity = ErrorSeverity.HIGH
                else:
                    severity = ErrorSeverity.MEDIUM
                
                # Determine category
                if response.status_code == 401:
                    category = ErrorCategory.AUTHENTICATION
                elif response.status_code == 403:
                    category = ErrorCategory.AUTHORIZATION
                elif response.status_code in [400, 422]:
                    category = ErrorCategory.VALIDATION
                elif response.status_code >= 500:
                    category = ErrorCategory.SYSTEM
                else:
                    category = ErrorCategory.UNKNOWN
                
                # Log the HTTP error
                error_log = error_service.log_custom_error(
                    error_message=error_message,
                    error_type=error_type,
                    endpoint=str(request.url.path),
                    method=request.method,
                    status_code=response.status_code,
                    severity=severity,
                    category=category,
                    tenant_id=tenant_id,
                    user_id=user_id,
                    additional_context={
                        "request_id": request_id,
                        "session_id": session_id,
                        "user_agent": request.headers.get("user-agent", ""),
                        "ip_address": self._get_client_ip(request),
                        "response_data": response_data,
                        "middleware": "ErrorLoggingMiddleware",
                        "timestamp": datetime.utcnow().isoformat()
                    }
                )
                
                return error_log
                
            finally:
                db.close()
                
        except Exception as e:
            # Fallback logging
            logger.error(f"Failed to log HTTP error in middleware: {e}")
            return None
    
    async def _create_error_response(self, exception: Exception, error_log=None):
        """
        Create appropriate error response
        """
        # Determine status code
        status_code = getattr(exception, 'status_code', 500)
        
        # Create error response
        error_detail = {
            "detail": str(exception),
            "type": type(exception).__name__,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Add error log ID if available
        if error_log:
            error_detail["error_id"] = str(error_log.id)
        
        # Don't expose internal details in production
        try:
            from ..core.config import settings
            if not settings.debug and status_code >= 500:
                error_detail["detail"] = "Internal server error"
        except Exception:
            pass
        
        return JSONResponse(
            status_code=status_code,
            content=error_detail
        )
    
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


class CriticalErrorNotificationMiddleware(BaseHTTPMiddleware):
    """
    Middleware specifically for handling critical error notifications
    """
    
    def __init__(self, app: ASGIApp):
        super().__init__(app)
    
    async def dispatch(self, request: Request, call_next):
        """
        Monitor for critical errors and send immediate notifications
        """
        try:
            response = await call_next(request)
            
            # Check for critical errors (5xx status codes)
            if response.status_code >= 500:
                await self._handle_critical_error(request, response)
            
            return response
            
        except Exception as exception:
            # Handle critical exceptions
            await self._handle_critical_exception(request, exception)
            raise
    
    async def _handle_critical_error(self, request: Request, response: Response):
        """
        Handle critical HTTP errors
        """
        try:
            # Log critical error for immediate attention
            logger.critical(
                f"Critical HTTP error: {response.status_code} on {request.method} {request.url.path}"
            )
            
            # Additional critical error handling could be added here
            # such as immediate notifications to admin team
            
        except Exception as e:
            logger.error(f"Failed to handle critical error: {e}")
    
    async def _handle_critical_exception(self, request: Request, exception: Exception):
        """
        Handle critical exceptions
        """
        try:
            # Log critical exception
            logger.critical(
                f"Critical exception: {type(exception).__name__}: {exception} "
                f"on {request.method} {request.url.path}"
            )
            
            # Additional critical exception handling could be added here
            
        except Exception as e:
            logger.error(f"Failed to handle critical exception: {e}")