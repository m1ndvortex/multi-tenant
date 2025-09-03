"""
Subscription Management Service
Handles subscription tier validation, usage tracking, and feature access control
"""

from typing import Dict, Any, Optional, List
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import func, extract, and_

from ..models.tenant import Tenant, SubscriptionType, TenantStatus
from ..models.user import User
from ..models.customer import Customer
from ..models.product import Product
from ..models.invoice import Invoice
from ..core.redis_client import redis_client
import logging

logger = logging.getLogger(__name__)


class SubscriptionLimits:
    """Subscription tier limits configuration"""
    
    FREE_LIMITS = {
        'users': 1,
        'products': 10,
        'customers': 10,
        'monthly_invoices': 10,
        'api_access': False,
        'advanced_reporting': False,
        'role_based_permissions': False,
        'unlimited_storage': False
    }
    
    PRO_LIMITS = {
        'users': 5,
        'products': -1,  # Unlimited
        'customers': -1,  # Unlimited
        'monthly_invoices': -1,  # Unlimited
        'api_access': True,
        'advanced_reporting': True,
        'role_based_permissions': True,
        'unlimited_storage': True
    }
    
    @classmethod
    def get_limits(cls, subscription_type: SubscriptionType) -> Dict[str, Any]:
        """Get limits for a subscription type"""
        if subscription_type == SubscriptionType.FREE:
            return cls.FREE_LIMITS.copy()
        elif subscription_type == SubscriptionType.PRO:
            return cls.PRO_LIMITS.copy()
        else:
            return cls.FREE_LIMITS.copy()


class SubscriptionService:
    """Service for managing subscription tiers and limits"""
    
    def __init__(self, db: Session):
        self.db = db
        self.redis = redis_client
    
    def get_tenant_subscription_info(self, tenant_id: str) -> Dict[str, Any]:
        """Get comprehensive subscription information for a tenant"""
        tenant = self.db.query(Tenant).filter(Tenant.id == tenant_id).first()
        if not tenant:
            raise ValueError(f"Tenant {tenant_id} not found")
        
        # Get current usage
        usage = self._get_current_usage(tenant_id)
        
        # Get limits
        limits = SubscriptionLimits.get_limits(tenant.subscription_type)
        
        # Calculate usage percentages
        usage_percentages = {}
        for resource, limit in limits.items():
            if isinstance(limit, int) and limit > 0:
                current_usage = usage.get(resource, 0)
                usage_percentages[resource] = min(100, (current_usage / limit) * 100)
            elif limit == -1:  # Unlimited
                usage_percentages[resource] = 0
        
        return {
            'tenant_id': tenant_id,
            'subscription_type': tenant.subscription_type.value,
            'subscription_active': tenant.is_subscription_active,
            'subscription_expires_at': tenant.subscription_expires_at.isoformat() if tenant.subscription_expires_at else None,
            'days_until_expiry': tenant.days_until_expiry,
            'usage': usage,
            'limits': limits,
            'usage_percentages': usage_percentages,
            'features': {
                'api_access': limits['api_access'],
                'advanced_reporting': limits['advanced_reporting'],
                'role_based_permissions': limits['role_based_permissions'],
                'unlimited_storage': limits['unlimited_storage']
            }
        }
    
    def _get_current_usage(self, tenant_id: str) -> Dict[str, int]:
        """Get current resource usage for a tenant"""
        current_month = datetime.now(timezone.utc).month
        current_year = datetime.now(timezone.utc).year
        
        # Use Redis cache for frequently accessed usage data
        cache_key = f"usage:{tenant_id}:{current_year}:{current_month}"
        cached_usage = self.redis.get(cache_key)
        
        if cached_usage:
            return cached_usage
        
        # Calculate usage from database
        usage = {
            'users': self.db.query(User).filter(
                User.tenant_id == tenant_id,
                User.is_active == True
            ).count(),
            
            'customers': self.db.query(Customer).filter(
                Customer.tenant_id == tenant_id,
                Customer.is_active == True
            ).count(),
            
            'products': self.db.query(Product).filter(
                Product.tenant_id == tenant_id,
                Product.is_active == True
            ).count(),
            
            'monthly_invoices': self.db.query(Invoice).filter(
                Invoice.tenant_id == tenant_id,
                extract('month', Invoice.created_at) == current_month,
                extract('year', Invoice.created_at) == current_year
            ).count()
        }
        
        # Cache for 5 minutes
        self.redis.set(cache_key, usage, expire=300)
        
        return usage
    
    def check_resource_limit(self, tenant_id: str, resource_type: str, increment: int = 1) -> Dict[str, Any]:
        """
        Check if tenant can create additional resources
        
        Args:
            tenant_id: Tenant ID
            resource_type: Type of resource (users, products, customers, monthly_invoices)
            increment: Number of resources to add (default: 1)
        
        Returns:
            Dict with allowed status, current usage, limit, and remaining
        """
        tenant = self.db.query(Tenant).filter(Tenant.id == tenant_id).first()
        if not tenant:
            raise ValueError(f"Tenant {tenant_id} not found")
        
        # Check if subscription is active
        if not tenant.is_subscription_active:
            return {
                'allowed': False,
                'reason': 'subscription_expired',
                'message': 'Subscription has expired. Please renew to continue using the service.',
                'current_usage': 0,
                'limit': 0,
                'remaining': 0
            }
        
        # Get current usage and limits
        usage = self._get_current_usage(tenant_id)
        limits = SubscriptionLimits.get_limits(tenant.subscription_type)
        
        current_usage = usage.get(resource_type, 0)
        limit = limits.get(resource_type, 0)
        
        # Check if resource type is valid
        if resource_type not in limits:
            return {
                'allowed': False,
                'reason': 'invalid_resource_type',
                'message': f'Invalid resource type: {resource_type}',
                'current_usage': current_usage,
                'limit': limit,
                'remaining': 0
            }
        
        # Unlimited resources (Pro tier)
        if limit == -1:
            return {
                'allowed': True,
                'reason': 'unlimited',
                'message': 'Unlimited resources available',
                'current_usage': current_usage,
                'limit': -1,
                'remaining': -1
            }
        
        # Check if adding increment would exceed limit
        if current_usage + increment > limit:
            return {
                'allowed': False,
                'reason': 'limit_exceeded',
                'message': f'Cannot add {increment} {resource_type}. Current: {current_usage}, Limit: {limit}',
                'current_usage': current_usage,
                'limit': limit,
                'remaining': max(0, limit - current_usage)
            }
        
        return {
            'allowed': True,
            'reason': 'within_limits',
            'message': f'Can add {increment} {resource_type}',
            'current_usage': current_usage,
            'limit': limit,
            'remaining': limit - current_usage
        }
    
    def check_feature_access(self, tenant_id: str, feature: str) -> Dict[str, Any]:
        """
        Check if tenant has access to a specific feature
        
        Args:
            tenant_id: Tenant ID
            feature: Feature name (api_access, advanced_reporting, etc.)
        
        Returns:
            Dict with access status and subscription info
        """
        tenant = self.db.query(Tenant).filter(Tenant.id == tenant_id).first()
        if not tenant:
            raise ValueError(f"Tenant {tenant_id} not found")
        
        # Check if subscription is active
        if not tenant.is_subscription_active:
            return {
                'allowed': False,
                'reason': 'subscription_expired',
                'message': 'Subscription has expired. Please renew to access this feature.',
                'subscription_type': tenant.subscription_type.value,
                'feature': feature
            }
        
        # Get feature access from limits
        limits = SubscriptionLimits.get_limits(tenant.subscription_type)
        has_access = limits.get(feature, False)
        
        if not has_access:
            return {
                'allowed': False,
                'reason': 'feature_not_available',
                'message': f'Feature "{feature}" is not available in {tenant.subscription_type.value} subscription',
                'subscription_type': tenant.subscription_type.value,
                'feature': feature
            }
        
        return {
            'allowed': True,
            'reason': 'feature_available',
            'message': f'Feature "{feature}" is available',
            'subscription_type': tenant.subscription_type.value,
            'feature': feature
        }
    
    def upgrade_subscription(self, tenant_id: str, new_subscription: SubscriptionType, duration_months: int = 12) -> Dict[str, Any]:
        """
        Upgrade tenant subscription
        
        Args:
            tenant_id: Tenant ID
            new_subscription: New subscription type
            duration_months: Duration in months (for Pro subscriptions)
        
        Returns:
            Dict with upgrade status and new subscription info
        """
        tenant = self.db.query(Tenant).filter(Tenant.id == tenant_id).first()
        if not tenant:
            raise ValueError(f"Tenant {tenant_id} not found")
        
        old_subscription = tenant.subscription_type
        
        try:
            if new_subscription == SubscriptionType.PRO:
                tenant.upgrade_to_pro(duration_months)
            elif new_subscription == SubscriptionType.FREE:
                tenant.downgrade_to_free()
            
            # Activate tenant if it was pending
            if tenant.status == TenantStatus.PENDING:
                tenant.activate()
            
            self.db.commit()
            
            # Clear usage cache to force recalculation
            self._clear_usage_cache(tenant_id)
            
            logger.info(f"Tenant {tenant_id} subscription upgraded from {old_subscription.value} to {new_subscription.value}")
            
            return {
                'success': True,
                'message': f'Subscription upgraded from {old_subscription.value} to {new_subscription.value}',
                'old_subscription': old_subscription.value,
                'new_subscription': new_subscription.value,
                'expires_at': tenant.subscription_expires_at.isoformat() if tenant.subscription_expires_at else None
            }
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to upgrade subscription for tenant {tenant_id}: {e}")
            raise
    
    def get_subscription_warnings(self, tenant_id: str) -> List[Dict[str, Any]]:
        """
        Get subscription-related warnings for a tenant
        
        Returns:
            List of warning messages
        """
        tenant = self.db.query(Tenant).filter(Tenant.id == tenant_id).first()
        if not tenant:
            return []
        
        warnings = []
        
        # Check subscription expiry
        if tenant.subscription_expires_at:
            days_until_expiry = tenant.days_until_expiry
            if days_until_expiry <= 7:
                warnings.append({
                    'type': 'subscription_expiry',
                    'severity': 'high' if days_until_expiry <= 3 else 'medium',
                    'message': f'Subscription expires in {days_until_expiry} days',
                    'action': 'renew_subscription'
                })
        
        # Check usage limits for Free tier
        if tenant.subscription_type == SubscriptionType.FREE:
            usage = self._get_current_usage(tenant_id)
            limits = SubscriptionLimits.get_limits(tenant.subscription_type)
            
            for resource, limit in limits.items():
                if isinstance(limit, int) and limit > 0:
                    current_usage = usage.get(resource, 0)
                    usage_percentage = (current_usage / limit) * 100
                    
                    if usage_percentage >= 90:
                        warnings.append({
                            'type': 'usage_limit',
                            'severity': 'high' if usage_percentage >= 100 else 'medium',
                            'message': f'{resource.title()} usage at {usage_percentage:.0f}% ({current_usage}/{limit})',
                            'action': 'upgrade_subscription',
                            'resource': resource
                        })
        
        return warnings
    
    def _clear_usage_cache(self, tenant_id: str):
        """Clear usage cache for a tenant"""
        current_month = datetime.now(timezone.utc).month
        current_year = datetime.now(timezone.utc).year
        cache_key = f"usage:{tenant_id}:{current_year}:{current_month}"
        self.redis.delete(cache_key)
    
    def validate_subscription_status(self, tenant_id: str) -> Dict[str, Any]:
        """
        Validate current subscription status
        
        Returns:
            Dict with validation status and details
        """
        tenant = self.db.query(Tenant).filter(Tenant.id == tenant_id).first()
        if not tenant:
            return {
                'valid': False,
                'reason': 'tenant_not_found',
                'message': 'Tenant not found'
            }
        
        # Check if tenant is active
        if tenant.status != TenantStatus.ACTIVE:
            return {
                'valid': False,
                'reason': 'tenant_inactive',
                'message': f'Tenant status is {tenant.status.value}',
                'status': tenant.status.value
            }
        
        # Check subscription expiry
        if not tenant.is_subscription_active:
            return {
                'valid': False,
                'reason': 'subscription_expired',
                'message': 'Subscription has expired',
                'expired_at': tenant.subscription_expires_at.isoformat() if tenant.subscription_expires_at else None
            }
        
        return {
            'valid': True,
            'reason': 'active',
            'message': 'Subscription is active',
            'subscription_type': tenant.subscription_type.value,
            'expires_at': tenant.subscription_expires_at.isoformat() if tenant.subscription_expires_at else None
        }