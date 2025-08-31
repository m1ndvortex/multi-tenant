"""
Tests for Tenant model
"""

import pytest
from datetime import datetime, timedelta
from decimal import Decimal
from app.models.tenant import Tenant, SubscriptionType, TenantStatus


class TestTenantModel:
    """Test cases for Tenant model"""
    
    def test_create_tenant(self, db_session):
        """Test creating a new tenant"""
        tenant = Tenant(
            name="Test Business",
            email="test@business.com",
            phone="+98-21-12345678",
            address="Test Address, Tehran, Iran"
        )
        
        db_session.add(tenant)
        db_session.commit()
        db_session.refresh(tenant)
        
        assert tenant.id is not None
        assert tenant.name == "Test Business"
        assert tenant.email == "test@business.com"
        assert tenant.subscription_type == SubscriptionType.FREE
        assert tenant.status == TenantStatus.PENDING
        assert tenant.max_users == 1
        assert tenant.max_products == 10
        assert tenant.max_customers == 10
        assert tenant.max_monthly_invoices == 10
        assert tenant.is_active is True
    
    def test_tenant_subscription_properties(self, db_session):
        """Test tenant subscription-related properties"""
        tenant = Tenant(
            name="Test Business",
            email="test@business.com",
            subscription_type=SubscriptionType.FREE
        )
        
        # Free subscription should always be active
        assert tenant.is_subscription_active is True
        assert tenant.days_until_expiry == -1
        
        # Pro subscription with future expiry
        tenant.subscription_type = SubscriptionType.PRO
        tenant.subscription_expires_at = datetime.utcnow() + timedelta(days=30)
        
        assert tenant.is_subscription_active is True
        assert tenant.days_until_expiry == 30
        
        # Expired Pro subscription
        tenant.subscription_expires_at = datetime.utcnow() - timedelta(days=1)
        assert tenant.is_subscription_active is False
        assert tenant.days_until_expiry == 0
    
    def test_upgrade_to_pro(self, db_session):
        """Test upgrading tenant to Pro subscription"""
        tenant = Tenant(
            name="Test Business",
            email="test@business.com"
        )
        
        # Upgrade to Pro
        tenant.upgrade_to_pro(duration_months=12)
        
        assert tenant.subscription_type == SubscriptionType.PRO
        assert tenant.subscription_starts_at is not None
        assert tenant.subscription_expires_at is not None
        assert tenant.max_users == 5
        assert tenant.max_products == -1  # Unlimited
        assert tenant.max_customers == -1  # Unlimited
        assert tenant.max_monthly_invoices == -1  # Unlimited
    
    def test_downgrade_to_free(self, db_session):
        """Test downgrading tenant to Free subscription"""
        tenant = Tenant(
            name="Test Business",
            email="test@business.com",
            subscription_type=SubscriptionType.PRO,
            max_users=5,
            max_products=-1,
            max_customers=-1,
            max_monthly_invoices=-1
        )
        
        # Downgrade to Free
        tenant.downgrade_to_free()
        
        assert tenant.subscription_type == SubscriptionType.FREE
        assert tenant.subscription_expires_at is None
        assert tenant.max_users == 1
        assert tenant.max_products == 10
        assert tenant.max_customers == 10
        assert tenant.max_monthly_invoices == 10
    
    def test_tenant_status_management(self, db_session):
        """Test tenant status management methods"""
        tenant = Tenant(
            name="Test Business",
            email="test@business.com"
        )
        
        # Activate tenant
        tenant.activate()
        assert tenant.status == TenantStatus.ACTIVE
        
        # Suspend tenant
        tenant.suspend("Payment overdue")
        assert tenant.status == TenantStatus.SUSPENDED
        assert "Suspended: Payment overdue" in tenant.notes
    
    def test_check_limits(self, db_session):
        """Test resource limit checking"""
        tenant = Tenant(
            name="Test Business",
            email="test@business.com",
            max_users=1,
            max_products=10,
            max_customers=10,
            max_monthly_invoices=10
        )
        
        # Within limits
        assert tenant.check_limits('users', 0) is True
        assert tenant.check_limits('products', 5) is True
        
        # At limits
        assert tenant.check_limits('users', 1) is False
        assert tenant.check_limits('products', 10) is False
        
        # Unlimited (Pro tier)
        tenant.max_products = -1
        assert tenant.check_limits('products', 1000) is True
    
    def test_update_activity(self, db_session):
        """Test activity tracking"""
        tenant = Tenant(
            name="Test Business",
            email="test@business.com"
        )
        
        assert tenant.last_activity_at is None
        
        tenant.update_activity()
        assert tenant.last_activity_at is not None
        
        # Check that activity timestamp is recent
        time_diff = datetime.utcnow() - tenant.last_activity_at
        assert time_diff.total_seconds() < 5  # Within 5 seconds
    
    def test_tenant_repr(self, db_session):
        """Test tenant string representation"""
        tenant = Tenant(
            name="Test Business",
            email="test@business.com",
            subscription_type=SubscriptionType.PRO
        )
        
        db_session.add(tenant)
        db_session.commit()
        db_session.refresh(tenant)
        
        repr_str = repr(tenant)
        assert "Test Business" in repr_str
        assert "pro" in repr_str
        assert str(tenant.id) in repr_str