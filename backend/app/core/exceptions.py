"""
Custom exceptions for the application
"""


class HesaabPlusException(Exception):
    """Base exception for HesaabPlus application"""
    pass


class ValidationError(HesaabPlusException):
    """Raised when validation fails"""
    pass


class NotFoundError(HesaabPlusException):
    """Raised when a resource is not found"""
    pass


class PermissionError(HesaabPlusException):
    """Raised when user doesn't have required permissions"""
    pass


class TenantIsolationError(HesaabPlusException):
    """Raised when tenant isolation is violated"""
    pass


class SubscriptionError(HesaabPlusException):
    """Raised when subscription limits are exceeded"""
    pass


class AuthenticationError(HesaabPlusException):
    """Raised when authentication fails"""
    pass


class BusinessLogicError(HesaabPlusException):
    """Raised when business logic validation fails"""
    pass