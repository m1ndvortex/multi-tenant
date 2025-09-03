"""
Custom exceptions for the application
"""

from fastapi import HTTPException
from typing import Any, Dict, Optional


class BaseCustomException(Exception):
    """Base custom exception"""
    
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        self.message = message
        self.details = details or {}
        super().__init__(self.message)


class ValidationError(BaseCustomException):
    """Raised when validation fails"""
    pass


class NotFoundError(BaseCustomException):
    """Raised when a resource is not found"""
    pass


class BusinessLogicError(BaseCustomException):
    """Raised when business logic validation fails"""
    pass


class AuthenticationError(BaseCustomException):
    """Raised when authentication fails"""
    pass


class AuthorizationError(BaseCustomException):
    """Raised when authorization fails"""
    pass


class PermissionError(BaseCustomException):
    """Raised when permission is denied"""
    pass


class TenantIsolationError(BaseCustomException):
    """Raised when tenant isolation is violated"""
    pass


class ExternalServiceError(BaseCustomException):
    """Raised when external service calls fail"""
    pass


class FileProcessingError(BaseCustomException):
    """Raised when file processing fails"""
    pass


def exception_to_http_exception(exc: BaseCustomException) -> HTTPException:
    """Convert custom exception to HTTP exception"""
    
    if isinstance(exc, ValidationError):
        return HTTPException(
            status_code=400,
            detail={
                "message": exc.message,
                "type": "validation_error",
                "details": exc.details
            }
        )
    
    elif isinstance(exc, NotFoundError):
        return HTTPException(
            status_code=404,
            detail={
                "message": exc.message,
                "type": "not_found_error",
                "details": exc.details
            }
        )
    
    elif isinstance(exc, BusinessLogicError):
        return HTTPException(
            status_code=422,
            detail={
                "message": exc.message,
                "type": "business_logic_error",
                "details": exc.details
            }
        )
    
    elif isinstance(exc, AuthenticationError):
        return HTTPException(
            status_code=401,
            detail={
                "message": exc.message,
                "type": "authentication_error",
                "details": exc.details
            }
        )
    
    elif isinstance(exc, AuthorizationError):
        return HTTPException(
            status_code=403,
            detail={
                "message": exc.message,
                "type": "authorization_error",
                "details": exc.details
            }
        )
    
    elif isinstance(exc, PermissionError):
        return HTTPException(
            status_code=403,
            detail={
                "message": exc.message,
                "type": "permission_error",
                "details": exc.details
            }
        )
    
    elif isinstance(exc, TenantIsolationError):
        return HTTPException(
            status_code=403,
            detail={
                "message": exc.message,
                "type": "tenant_isolation_error",
                "details": exc.details
            }
        )
    
    elif isinstance(exc, ExternalServiceError):
        return HTTPException(
            status_code=502,
            detail={
                "message": exc.message,
                "type": "external_service_error",
                "details": exc.details
            }
        )
    
    elif isinstance(exc, FileProcessingError):
        return HTTPException(
            status_code=422,
            detail={
                "message": exc.message,
                "type": "file_processing_error",
                "details": exc.details
            }
        )
    
    else:
        return HTTPException(
            status_code=500,
            detail={
                "message": "Internal server error",
                "type": "internal_error",
                "details": {}
            }
        )