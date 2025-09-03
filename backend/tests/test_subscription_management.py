"""
Comprehensive tests for Subscription Management System
Tests subscription limits, feature access, and usage tracking
"""

import pytest
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock

from app.main import app
from app.core.database import get_db
from app.models.tenant import Tenant, SubscriptionType, TenantStatus
from app.models.user import User, UserRole, UserStatus
from app.models.customer import Customer
from app.models.product import Product
from app.models.invoice import Invoice, InvoiceType
from app.services.subscription_service import SubscriptionService, SubscriptionLimits
from app.core.auth import create_access_token


class TestSubscriptionLimits:
    """Test subscription limits configuration"""
    
    def test_free_limits(self):
        """Test Free tier limits"""
        limits = SubscriptionLimits.get_limits(SubscriptionType.FREE)
        
        assert limits['users'] == 1
        assert limits['products'] == 10
        assert limits['customers'] == 10
        assert limits['monthly_invoices'] == 10
        assert limits['api_access'] == False
        assert limits['advanced_reporting'] == False
        assert limits['role_based_permissions'] == False
        assert limits['unlimited_storage'] == False
    
    def test_pro_limits(self):
        """Test Pro tier limits"""
        limits = SubscriptionLimits.get_limits(SubscriptionType.PRO)
        
        assert limits['users'] == 5
        assert limits['products'] == -1  # Unlimited
        assert limits['customers'] == -1  # Unlimited
        assert limits['monthly_invoices'] == -1  # Unlimited
        assert limits['api_access'] == True
        assert limits['advanced_reporting'] == True
        assert limits['role_based_permissions'] == True
        assert limits['unlimited_storage'] == True


class TestSubscriptionService:
    """Test subscription service functionality"""
    
    @pytest.fixture
    def db_session(self):
        """Create test database session"""
        from app.core.database import SessionLocal, engine
        from app.models.base import BaseModel
        
        # Create tables
        BaseModel.metadata.create_all(bind=engine)
        
        db = SessionLocal()
        try:
            yield db
        finally:
            db.close()
    
    @pytest.fixture
    def free_tenant(self, db_session):
        """Create a Free tier tenant"""
        tenant = Tenant(
            name="Test Free Tenant",
            email="free@test.com",
            subscription_type=SubscriptionType.FREE,
            status=TenantStatus.ACTIVE
        )
        db_session.add(tenant)
        db_session.commit()
        db_session.refresh(tenant)
        return tenant
    
    @pytest.fixture
    def pro_tenant(self, db_session):
        """Create a Pro tier tenant"""
        tenant = Tenant(
            name="Test Pro Tenant",
            email="pro@test.com",
            subscription_type=SubscriptionType.PRO,
            status=TenantStatus.ACTIVE,
            subscription_expires_at=datetime.now(timezone.utc) + timedelta(days=30)
        )
        tenant.upgrade_to_pro(12)
        db_session.add(tenant)
        db_session.commit()
        db_session.refresh(tenant)
        return tenant
    
    @pytest.fixture
    def expired_tenant(self, db_session):
        """Create an expired Pro tier tenant"""
        tenant = Tenant(
            name="Test Expired Tenant",
            email="expired@test.com",
            subscription_type=SubscriptionType.PRO,
            status=TenantStatus.ACTIVE,
            subscription_expires_at=datetime.now(timezone.utc) - timedelta(days=1)
        )
        db_session.add(tenant)
        db_session.commit()
        db_session.refresh(tenant)
        return tenant
    
    def test_get_tenant_subscription_info_free(self, db_session, free_tenant):
        """Test getting subscription info for Free tier"""
        service = SubscriptionService(db_session)
        info = service.get_tenant_subscription_info(str(free_tenant.id))
        
        assert info['subscription_type'] == 'free'
        assert info['subscription_active'] == True
        assert info['limits']['users'] == 1
        assert info['limits']['products'] == 10
        assert info['features']['api_access'] == False
        assert info['features']['advanced_reporting'] == False
    
    def test_get_tenant_subscription_info_pro(self, db_session, pro_tenant):
        """Test getting subscription info for Pro tier"""
        service = SubscriptionService(db_session)
        info = service.get_tenant_subscription_info(str(pro_tenant.id))
        
        assert info['subscription_type'] == 'pro'
        assert info['subscription_active'] == True
        assert info['limits']['users'] == 5
        assert info['limits']['products'] == -1  # Unlimited
        assert info['features']['api_access'] == True
        assert info['features']['advanced_reporting'] == True
    
    def test_get_tenant_subscription_info_expired(self, db_session, expired_tenant):
        """Test getting subscription info for expired tenant"""
        service = SubscriptionService(db_session)
        info = service.get_tenant_subscription_info(str(expired_tenant.id))
        
        assert info['subscription_type'] == 'pro'
        assert info['subscription_active'] == False
        assert info['days_until_expiry'] == 0
    
    def test_check_resource_limit_free_within_limits(self, db_session, free_tenant):
        """Test resource limit check for Free tier within limits"""
        service = SubscriptionService(db_session)
        
        # Create some test data
        user = User(
            tenant_id=free_tenant.id,
            email="user@test.com",
            password_hash="hashed",
            first_name="Test",
            last_name="User",
            role=UserRole.USER,
            status=UserStatus.ACTIVE
        )
        db_session.add(user)
        db_session.commit()
        
        # Check if can add more users (should fail - Free tier allows only 1 user)
        result = service.check_resource_limit(str(free_tenant.id), 'users', 1)
        
        assert result['allowed'] == False
        assert result['reason'] == 'limit_exceeded'
        assert result['current_usage'] == 1
        assert result['limit'] == 1
        assert result['remaining'] == 0
    
    def test_check_resource_limit_pro_unlimited(self, db_session, pro_tenant):
        """Test resource limit check for Pro tier unlimited resources"""
        service = SubscriptionService(db_session)
        
        # Check unlimited resource (products)
        result = service.check_resource_limit(str(pro_tenant.id), 'products', 100)
        
        assert result['allowed'] == True
        assert result['reason'] == 'unlimited'
        assert result['limit'] == -1
        assert result['remaining'] == -1
    
    def test_check_resource_limit_expired_subscription(self, db_session, expired_tenant):
        """Test resource limit check for expired subscription"""
        service = SubscriptionService(db_session)
        
        result = service.check_resource_limit(str(expired_tenant.id), 'users', 1)
        
        assert result['allowed'] == False
        assert result['reason'] == 'subscription_expired'
        assert 'expired' in result['message'].lower()
    
    def test_check_feature_access_free_tier(self, db_session, free_tenant):
        """Test feature access check for Free tier"""
        service = SubscriptionService(db_session)
        
        # Check feature not available in Free tier
        result = service.check_feature_access(str(free_tenant.id), 'api_access')
        
        assert result['allowed'] == False
        assert result['reason'] == 'feature_not_available'
        assert result['subscription_type'] == 'free'
        assert result['feature'] == 'api_access'
    
    def test_check_feature_access_pro_tier(self, db_session, pro_tenant):
        """Test feature access check for Pro tier"""
        service = SubscriptionService(db_session)
        
        # Check feature available in Pro tier
        result = service.check_feature_access(str(pro_tenant.id), 'api_access')
        
        assert result['allowed'] == True
        assert result['reason'] == 'feature_available'
        assert result['subscription_type'] == 'pro'
        assert result['feature'] == 'api_access'
    
    def test_upgrade_subscription_free_to_pro(self, db_session, free_tenant):
        """Test upgrading subscription from Free to Pro"""
        service = SubscriptionService(db_session)
        
        result = service.upgrade_subscription(str(free_tenant.id), SubscriptionType.PRO, 12)
        
        assert result['success'] == True
        assert result['old_subscription'] == 'free'
        assert result['new_subscription'] == 'pro'
        assert result['expires_at'] is not None
        
        # Verify tenant was updated
        db_session.refresh(free_tenant)
        assert free_tenant.subscription_type == SubscriptionType.PRO
        assert free_tenant.max_users == 5
        assert free_tenant.max_products == -1
    
    def test_get_subscription_warnings_expiring_soon(self, db_session):
        """Test subscription warnings for expiring subscription"""
        # Create tenant expiring in 3 days
        tenant = Tenant(
            name="Expiring Tenant",
            email="expiring@test.com",
            subscription_type=SubscriptionType.PRO,
            status=TenantStatus.ACTIVE,
            subscription_expires_at=datetime.now(timezone.utc) + timedelta(days=3)
        )
        db_session.add(tenant)
        db_session.commit()
        
        service = SubscriptionService(db_session)
        warnings = service.get_subscription_warnings(str(tenant.id))
        
        assert len(warnings) > 0
        expiry_warning = next((w for w in warnings if w['type'] == 'subscription_expiry'), None)
        assert expiry_warning is not None
        assert expiry_warning['severity'] == 'high'
        assert '3 days' in expiry_warning['message']
    
    def test_get_subscription_warnings_usage_limits(self, db_session, free_tenant):
        """Test subscription warnings for usage limits"""
        service = SubscriptionService(db_session)
        
        # Create customers near the limit (9 out of 10)
        for i in range(9):
            customer = Customer(
                tenant_id=free_tenant.id,
                name=f"Customer {i}",
                email=f"customer{i}@test.com"
            )
            db_session.add(customer)
        db_session.commit()
        
        warnings = service.get_subscription_warnings(str(free_tenant.id))
        
        usage_warning = next((w for w in warnings if w['type'] == 'usage_limit' and w['resource'] == 'customers'), None)
        assert usage_warning is not None
        assert usage_warning['severity'] == 'medium'
        assert '90%' in usage_warning['message']
    
    def test_validate_subscription_status_active(self, db_session, pro_tenant):
        """Test subscription status validation for active subscription"""
        service = SubscriptionService(db_session)
        
        result = service.validate_subscription_status(str(pro_tenant.id))
        
        assert result['valid'] == True
        assert result['reason'] == 'active'
        assert result['subscription_type'] == 'pro'
    
    def test_validate_subscription_status_expired(self, db_session, expired_tenant):
        """Test subscription status validation for expired subscription"""
        service = SubscriptionService(db_session)
        
        result = service.validate_subscription_status(str(expired_tenant.id))
        
        assert result['valid'] == False
        assert result['reason'] == 'subscription_expired'
        assert result['expired_at'] is not None
    
    def test_validate_subscription_status_suspended_tenant(self, db_session, free_tenant):
        """Test subscription status validation for suspended tenant"""
        free_tenant.suspend("Test suspension")
        db_session.commit()
        
        service = SubscriptionService(db_session)
        result = service.validate_subscription_status(str(free_tenant.id))
        
        assert result['valid'] == False
        assert result['reason'] == 'tenant_inactive'
        assert result['status'] == 'suspended'


class TestSubscriptionAPI:
    """Test subscription API endpoints"""
    
    @pytest.fixture
    def client(self):
        """Create test client"""
        return TestClient(app)
    
    @pytest.fixture
    def db_session(self):
        """Create test database session"""
        from app.core.database import SessionLocal, engine
        from app.models.base import BaseModel
        
        BaseModel.metadata.create_all(bind=engine)
        
        db = SessionLocal()
        try:
            yield db
        finally:
            db.close()
    
    @pytest.fixture
    def test_tenant_and_user(self, db_session):
        """Create test tenant and user"""
        tenant = Tenant(
            name="API Test Tenant",
            email="api@test.com",
            subscription_type=SubscriptionType.FREE,
            status=TenantStatus.ACTIVE
        )
        db_session.add(tenant)
        db_session.commit()
        
        user = User(
            tenant_id=tenant.id,
            email="user@test.com",
            password_hash="hashed",
            first_name="Test",
            last_name="User",
            role=UserRole.ADMIN,
            status=UserStatus.ACTIVE
        )
        db_session.add(user)
        db_session.commit()
        
        return tenant, user
    
    @pytest.fixture
    def auth_headers(self, test_tenant_and_user):
        """Create authentication headers"""
        tenant, user = test_tenant_and_user
        token = create_access_token(
            data={
                "user_id": str(user.id),
                "tenant_id": str(tenant.id),
                "email": user.email
            }
        )
        return {"Authorization": f"Bearer {token}"}
    
    def test_get_subscription_info(self, client, auth_headers, db_session):
        """Test GET /api/subscription/info endpoint"""
        with patch('app.core.database.get_db', return_value=db_session):
            response = client.get("/api/subscription/info", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        
        assert 'subscription_type' in data
        assert 'subscription_active' in data
        assert 'usage' in data
        assert 'limits' in data
        assert 'features' in data
    
    def test_check_resource_limit(self, client, auth_headers, db_session):
        """Test POST /api/subscription/check-limit endpoint"""
        request_data = {
            "resource_type": "users",
            "increment": 1
        }
        
        with patch('app.core.database.get_db', return_value=db_session):
            response = client.post(
                "/api/subscription/check-limit",
                json=request_data,
                headers=auth_headers
            )
        
        assert response.status_code == 200
        data = response.json()
        
        assert 'allowed' in data
        assert 'reason' in data
        assert 'current_usage' in data
        assert 'limit' in data
        assert 'remaining' in data
    
    def test_check_feature_access(self, client, auth_headers, db_session):
        """Test POST /api/subscription/check-feature endpoint"""
        request_data = {
            "feature": "api_access"
        }
        
        with patch('app.core.database.get_db', return_value=db_session):
            response = client.post(
                "/api/subscription/check-feature",
                json=request_data,
                headers=auth_headers
            )
        
        assert response.status_code == 200
        data = response.json()
        
        assert 'allowed' in data
        assert 'reason' in data
        assert 'subscription_type' in data
        assert 'feature' in data
    
    def test_get_subscription_warnings(self, client, auth_headers, db_session):
        """Test GET /api/subscription/warnings endpoint"""
        with patch('app.core.database.get_db', return_value=db_session):
            response = client.get("/api/subscription/warnings", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        
        assert 'warnings' in data
        assert 'total_warnings' in data
        assert 'has_critical_warnings' in data
        assert isinstance(data['warnings'], list)
    
    def test_validate_subscription(self, client, auth_headers, db_session):
        """Test GET /api/subscription/validate endpoint"""
        with patch('app.core.database.get_db', return_value=db_session):
            response = client.get("/api/subscription/validate", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        
        assert 'valid' in data
        assert 'reason' in data
        assert 'message' in data
    
    def test_get_usage_stats(self, client, auth_headers, db_session):
        """Test GET /api/subscription/usage endpoint"""
        with patch('app.core.database.get_db', return_value=db_session):
            response = client.get("/api/subscription/usage", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        
        assert 'tenant_id' in data
        assert 'period' in data
        assert 'usage' in data
        assert 'limits' in data
        assert 'usage_percentages' in data
    
    def test_get_subscription_limits(self, client, auth_headers, db_session):
        """Test GET /api/subscription/limits endpoint"""
        with patch('app.core.database.get_db', return_value=db_session):
            response = client.get("/api/subscription/limits", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        
        assert 'subscription_type' in data
        assert 'limits' in data
        assert 'features' in data
    
    def test_can_create_resource(self, client, auth_headers, db_session):
        """Test GET /api/subscription/can-create/{resource_type} endpoint"""
        with patch('app.core.database.get_db', return_value=db_session):
            response = client.get("/api/subscription/can-create/users", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        
        assert 'can_create' in data
        assert 'reason' in data
        assert 'remaining' in data
    
    def test_has_feature_access(self, client, auth_headers, db_session):
        """Test GET /api/subscription/has-feature/{feature} endpoint"""
        with patch('app.core.database.get_db', return_value=db_session):
            response = client.get("/api/subscription/has-feature/api_access", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        
        assert 'has_access' in data
        assert 'reason' in data
        assert 'subscription_type' in data
    
    def test_unauthorized_access(self, client, db_session):
        """Test API endpoints without authentication"""
        response = client.get("/api/subscription/info")
        assert response.status_code == 401


class TestSubscriptionIntegration:
    """Integration tests for subscription system"""
    
    @pytest.fixture
    def db_session(self):
        """Create test database session"""
        from app.core.database import SessionLocal, engine
        from app.models.base import BaseModel
        
        BaseModel.metadata.create_all(bind=engine)
        
        db = SessionLocal()
        try:
            yield db
        finally:
            db.close()
    
    def test_free_tier_user_limit_enforcement(self, db_session):
        """Test that Free tier enforces 1 user limit"""
        # Create Free tier tenant
        tenant = Tenant(
            name="Free Limit Test",
            email="freelimit@test.com",
            subscription_type=SubscriptionType.FREE,
            status=TenantStatus.ACTIVE
        )
        db_session.add(tenant)
        db_session.commit()
        
        # Add first user (should succeed)
        user1 = User(
            tenant_id=tenant.id,
            email="user1@test.com",
            password_hash="hashed",
            first_name="Test",
            last_name="User1",
            role=UserRole.USER,
            status=UserStatus.ACTIVE
        )
        db_session.add(user1)
        db_session.commit()
        
        # Check if can add second user (should fail)
        service = SubscriptionService(db_session)
        result = service.check_resource_limit(str(tenant.id), 'users', 1)
        
        assert result['allowed'] == False
        assert result['current_usage'] == 1
        assert result['limit'] == 1
    
    def test_pro_tier_unlimited_resources(self, db_session):
        """Test that Pro tier allows unlimited resources"""
        # Create Pro tier tenant
        tenant = Tenant(
            name="Pro Unlimited Test",
            email="prounlimited@test.com",
            subscription_type=SubscriptionType.PRO,
            status=TenantStatus.ACTIVE,
            subscription_expires_at=datetime.now(timezone.utc) + timedelta(days=30)
        )
        tenant.upgrade_to_pro(12)
        db_session.add(tenant)
        db_session.commit()
        
        # Add many products (should all succeed)
        for i in range(50):
            product = Product(
                tenant_id=tenant.id,
                name=f"Product {i}",
                price=100.00
            )
            db_session.add(product)
        db_session.commit()
        
        # Check if can add more products (should succeed - unlimited)
        service = SubscriptionService(db_session)
        result = service.check_resource_limit(str(tenant.id), 'products', 100)
        
        assert result['allowed'] == True
        assert result['reason'] == 'unlimited'
        assert result['limit'] == -1
    
    def test_subscription_expiry_blocks_access(self, db_session):
        """Test that expired subscription blocks resource creation"""
        # Create expired Pro tier tenant
        tenant = Tenant(
            name="Expired Test",
            email="expired@test.com",
            subscription_type=SubscriptionType.PRO,
            status=TenantStatus.ACTIVE,
            subscription_expires_at=datetime.now(timezone.utc) - timedelta(days=1)
        )
        db_session.add(tenant)
        db_session.commit()
        
        # Try to create resource (should fail due to expiry)
        service = SubscriptionService(db_session)
        result = service.check_resource_limit(str(tenant.id), 'users', 1)
        
        assert result['allowed'] == False
        assert result['reason'] == 'subscription_expired'
    
    def test_feature_access_by_subscription_tier(self, db_session):
        """Test feature access based on subscription tier"""
        # Create Free and Pro tenants
        free_tenant = Tenant(
            name="Free Feature Test",
            email="freefeature@test.com",
            subscription_type=SubscriptionType.FREE,
            status=TenantStatus.ACTIVE
        )
        
        pro_tenant = Tenant(
            name="Pro Feature Test",
            email="profeature@test.com",
            subscription_type=SubscriptionType.PRO,
            status=TenantStatus.ACTIVE,
            subscription_expires_at=datetime.now(timezone.utc) + timedelta(days=30)
        )
        pro_tenant.upgrade_to_pro(12)
        
        db_session.add_all([free_tenant, pro_tenant])
        db_session.commit()
        
        service = SubscriptionService(db_session)
        
        # Test API access feature
        free_result = service.check_feature_access(str(free_tenant.id), 'api_access')
        pro_result = service.check_feature_access(str(pro_tenant.id), 'api_access')
        
        assert free_result['allowed'] == False
        assert pro_result['allowed'] == True
        
        # Test advanced reporting feature
        free_result = service.check_feature_access(str(free_tenant.id), 'advanced_reporting')
        pro_result = service.check_feature_access(str(pro_tenant.id), 'advanced_reporting')
        
        assert free_result['allowed'] == False
        assert pro_result['allowed'] == True


if __name__ == "__main__":
    pytest.main([__file__, "-v"])