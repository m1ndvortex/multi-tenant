"""
Async Authentication Logging Service
Provides non-blocking authentication logging using background tasks
"""

from datetime import datetime, timezone
from typing import Optional, Dict, Any
import json
import asyncio
from concurrent.futures import ThreadPoolExecutor

from ..core.database import SessionLocal
from ..models.authentication_log import AuthenticationLog


class AsyncAuthLoggingService:
    """
    Async service for logging authentication events without blocking authentication flow
    """
    
    def __init__(self):
        self.executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix="auth_logger")
    
    def _log_to_database(self, log_data: dict):
        """Internal method to log to database in a separate thread"""
        try:
            db = SessionLocal()
            
            log_entry = AuthenticationLog(
                email=log_data.get('email'),
                user_id=log_data.get('user_id'),
                tenant_id=log_data.get('tenant_id'),
                event_type=log_data.get('event_type'),
                success=log_data.get('success'),
                failure_reason=log_data.get('failure_reason'),
                ip_address=log_data.get('ip_address'),
                user_agent=log_data.get('user_agent'),
                error_details=log_data.get('error_details'),
                additional_data=json.dumps(log_data.get('metadata')) if log_data.get('metadata') else None
            )
            
            db.add(log_entry)
            db.commit()
            db.close()
            
        except Exception as e:
            print(f"Warning: Failed to log authentication event: {e}")
            try:
                db.close()
            except:
                pass
    
    def log_successful_login_async(
        self,
        user_id: str,
        tenant_id: str = None,
        email: str = None,
        ip_address: str = None,
        user_agent: str = None,
        metadata: Dict[str, Any] = None
    ):
        """Log successful login attempt asynchronously"""
        
        log_data = {
            'email': email,
            'user_id': user_id,
            'tenant_id': tenant_id,
            'event_type': 'login_success',
            'success': True,
            'ip_address': ip_address,
            'user_agent': user_agent,
            'metadata': metadata
        }
        
        # Submit to thread pool for async execution
        self.executor.submit(self._log_to_database, log_data)
    
    def log_failed_login_async(
        self,
        email: str,
        tenant_id: str = None,
        reason: str = None,
        ip_address: str = None,
        user_agent: str = None,
        error_details: str = None,
        metadata: Dict[str, Any] = None
    ):
        """Log failed login attempt asynchronously"""
        
        log_data = {
            'email': email,
            'tenant_id': tenant_id,
            'event_type': 'login_failed',
            'success': False,
            'failure_reason': reason,
            'ip_address': ip_address,
            'user_agent': user_agent,
            'error_details': error_details,
            'metadata': metadata
        }
        
        # Submit to thread pool for async execution
        self.executor.submit(self._log_to_database, log_data)
    
    def log_logout_async(
        self,
        user_id: str,
        tenant_id: str = None,
        email: str = None,
        ip_address: str = None,
        user_agent: str = None,
        metadata: Dict[str, Any] = None
    ):
        """Log logout event asynchronously"""
        
        log_data = {
            'email': email,
            'user_id': user_id,
            'tenant_id': tenant_id,
            'event_type': 'logout',
            'success': True,
            'ip_address': ip_address,
            'user_agent': user_agent,
            'metadata': metadata
        }
        
        # Submit to thread pool for async execution
        self.executor.submit(self._log_to_database, log_data)
    
    def shutdown(self):
        """Shutdown the thread pool executor"""
        self.executor.shutdown(wait=True)


# Global instance
async_auth_logger = AsyncAuthLoggingService()