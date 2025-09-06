"""
Comprehensive tests for API Access System
Tests API key management, rate limiting, webhooks, and external API endpoints
"""

import pytest
import asyncio
from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from unittest.mock import patch, AsyncMock

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import HTTPException
from app.main import app
from app.core.database import get_db
from app.models.tenant import Tenant, SubscriptionType, TenantStatus
from app.models.user import User, UserRole, UserStatus
from app.models.api_key import ApiKey, ApiKeyUsage, WebhookEndpoint, ApiKeyStatus, ApiKeyScope
from app.models.customer import Customer
from app.models.product import Product
from app.models.invoice import Invoice, InvoiceType, InvoiceStatus
from app.services.api_key_service import ApiKeyService, WebhookService
from app.schemas.api_key import ApiKeyCreate, WebhookEndpointCreate, WebhookEventType
from app.core.auth import create_user_tokens


class TestApiKeyManagement:
    """Test API key creation, management, and validation"""
    
    def setup_method(self):
        """Set up test data"""
        self.client = TestClient(app)
        
        # Create test tenant with Pro subscription
        self.tenant = Tenant(
            name="Test Business",
            email="test@business.com",
            subscription_type=SubscriptionType.PRO,
            status=TenantStatus.ACTIVE,
            subscription_expires_at=datetime.now(timezone.utc) + timedelta(days=30)
        )
        
        # Create test user
        self.user = User(
            tenant_id=self.tenant.id,
            email="admin@business.com",
            password_hash="hashed_password",
            first_name="Admin",
            last_name="User",
            role=UserRole.ADMIN,
            status=UserStatus.ACTIVE
        )
        
        # Create auth tokens
        self.tokens = create_user_tokens(self.user)
        self.headers = {"Authorization": f"Bearer {self.tokens['access_token']}"}
    
    def test_create_api_key_success(self, db_session: Session):
        """Test successful API key creation"""
        db_session.add(self.tenant)
        db_session.add(self.user)
        db_session.commit()
        
        service = ApiKeyService(db_session)
        
        api_key_data = ApiKeyCreate(
            name="Test API Key",
            description="Test key for integration",
            scope=ApiKeyScope.READ_WRITE,
            rate_limit_per_minute=100,
            rate_limit_per_hour=2000,
            rate_limit_per_day=20000,
            expires_in_days=90
        )
        
        result = service.create_api_key(str(self.tenant.id), api_key_data)
        
        assert result.name == "Test API Key"
        assert result.scope == ApiKeyScope.READ_WRITE.value
        assert result.rate_limit_per_minute == 100
        assert len(result.api_key) > 20  # Full key should be returned
        assert len(result.key_prefix) == 8
        assert result.expires_at is not None
    
    def test_create_api_key_free_tier_denied(self, db_session: Session):
        """Test API key creation denied for free tier"""
        # Create free tier tenant
        free_tenant = Tenant(
            name="Free Business",
            email="free@business.com",
            subscription_type=SubscriptionType.FREE,
            status=TenantStatus.ACTIVE
        )
        db_session.add(free_tenant)
        db_session.commit()
        
        service = ApiKeyService(db_session)
        
        api_key_data = ApiKeyCreate(
            name="Test API Key",
            scope=ApiKeyScope.READ_ONLY,
            rate_limit_per_minute=60
        )
        
        with pytest.raises(HTTPException) as exc_info:
            service.create_api_key(str(free_tenant.id), api_key_data)
        
        assert exc_info.value.status_code == 403
        assert "Pro tier" in str(exc_info.value.detail)
    
    def test_create_api_key_limit_exceeded(self, db_session: Session):
        """Test API key creation when limit is exceeded"""
        db_session.add(self.tenant)
        db_session.commit()
        
        service = ApiKeyService(db_session)
        
        # Create 5 API keys (the limit)
        for i in range(5):
            api_key_data = ApiKeyCreate(
                name=f"Test API Key {i+1}",
                scope=ApiKeyScope.READ_ONLY,
                rate_limit_per_minute=60
            )
            service.create_api_key(str(self.tenant.id), api_key_data)
        
        # Try to create 6th API key
        api_key_data = ApiKeyCreate(
            name="Sixth API Key",
            scope=ApiKeyScope.READ_ONLY,
            rate_limit_per_minute=60
        )
        
        with pytest.raises(HTTPException) as exc_info:
            service.create_api_key(str(self.tenant.id), api_key_data)
        
        assert exc_info.value.status_code == 400
        assert "Maximum number" in str(exc_info.value.detail)
    
    def test_api_key_validation_success(self, db_session: Session):
        """Test successful API key validation"""
        db_session.add(self.tenant)
        db_session.commit()
        
        service = ApiKeyService(db_session)
        
        # Create API key
        api_key_data = ApiKeyCreate(
            name="Test API Key",
            scope=ApiKeyScope.READ_WRITE,
            rate_limit_per_minute=100
        )
        result = service.create_api_key(str(self.tenant.id), api_key_data)
        
        # Validate the API key
        validation = service.validate_api_key(result.api_key, "192.168.1.1", "TestAgent/1.0")
        
        assert validation.valid is True
        assert validation.tenant_id == str(self.tenant.id)
        assert validation.scope == ApiKeyScope.READ_WRITE.value
        assert validation.rate_limit_info is not None
    
    def test_api_key_validation_invalid_key(self, db_session: Session):
        """Test API key validation with invalid key"""
        service = ApiKeyService(db_session)
        
        validation = service.validate_api_key("invalid_key", "192.168.1.1")
        
        assert validation.valid is False
        assert "Invalid or inactive" in validation.error
    
    def test_api_key_validation_expired(self, db_session: Session):
        """Test API key validation with expired key"""
        db_session.add(self.tenant)
        db_session.commit()
        
        service = ApiKeyService(db_session)
        
        # Create API key that expires in 1 day
        api_key_data = ApiKeyCreate(
            name="Expiring Key",
            scope=ApiKeyScope.READ_ONLY,
            rate_limit_per_minute=60,
            expires_in_days=1
        )
        result = service.create_api_key(str(self.tenant.id), api_key_data)
        
        # Manually expire the key
        api_key = db_session.query(ApiKey).filter(
            ApiKey.key_hash == ApiKey.hash_key(result.api_key)
        ).first()
        api_key.expires_at = datetime.now(timezone.utc) - timedelta(hours=1)
        db_session.commit()
        
        # Validate expired key
        validation = service.validate_api_key(result.api_key)
        
        assert validation.valid is False
        assert "expired" in validation.error.lower()
    
    def test_api_key_ip_restriction(self, db_session: Session):
        """Test API key IP address restrictions"""
        db_session.add(self.tenant)
        db_session.commit()
        
        service = ApiKeyService(db_session)
        
        # Create API key with IP restrictions
        api_key_data = ApiKeyCreate(
            name="IP Restricted Key",
            scope=ApiKeyScope.READ_ONLY,
            rate_limit_per_minute=60,
            allowed_ips="192.168.1.1,10.0.0.1"
        )
        result = service.create_api_key(str(self.tenant.id), api_key_data)
        
        # Test allowed IP
        validation = service.validate_api_key(result.api_key, "192.168.1.1")
        assert validation.valid is True
        
        # Test disallowed IP
        validation = service.validate_api_key(result.api_key, "192.168.1.2")
        assert validation.valid is False
        assert "IP address not allowed" in validation.error
    
    def test_rate_limiting(self, db_session: Session):
        """Test rate limiting functionality"""
        db_session.add(self.tenant)
        db_session.commit()
        
        service = ApiKeyService(db_session)
        
        # Create API key with low rate limits
        api_key_data = ApiKeyCreate(
            name="Rate Limited Key",
            scope=ApiKeyScope.READ_ONLY,
            rate_limit_per_minute=2,
            rate_limit_per_hour=10,
            rate_limit_per_day=100
        )
        result = service.create_api_key(str(self.tenant.id), api_key_data)
        
        # Get API key from database
        api_key = db_session.query(ApiKey).filter(
            ApiKey.key_hash == ApiKey.hash_key(result.api_key)
        ).first()
        
        # Record usage to exceed minute limit
        now = datetime.now(timezone.utc)
        for i in range(3):  # Exceed the limit of 2
            service.record_api_usage(
                str(api_key.id), 
                "/test/endpoint", 
                "GET", 
                200
            )
        
        # Check rate limits
        rate_info = service.check_rate_limits(str(api_key.id))
        assert rate_info.remaining_minute == 0  # Should be at limit
        
        # Validate should fail due to rate limit
        validation = service.validate_api_key(result.api_key)
        assert validation.valid is False
        assert "Rate limit exceeded" in validation.error


class TestWebhookSystem:
    """Test webhook endpoint management and delivery"""
    
    def setup_method(self):
        """Set up test data"""
        self.client = TestClient(app)
        
        # Create test tenant with Pro subscription
        self.tenant = Tenant(
            name="Test Business",
            email="test@business.com",
            subscription_type=SubscriptionType.PRO,
            status=TenantStatus.ACTIVE,
            subscription_expires_at=datetime.now(timezone.utc) + timedelta(days=30)
        )
        
        # Create test API key
        full_key, key_hash, key_prefix = ApiKey.generate_api_key()
        self.api_key = ApiKey(
            tenant_id=self.tenant.id,
            name="Test API Key",
            key_hash=key_hash,
            key_prefix=key_prefix,
            scope=ApiKeyScope.READ_WRITE.value,
            rate_limit_per_minute=100,
            status=ApiKeyStatus.ACTIVE.value
        )
        self.full_api_key = full_key
    
    def test_create_webhook_endpoint(self, db_session: Session):
        """Test webhook endpoint creation"""
        db_session.add(self.tenant)
        db_session.add(self.api_key)
        db_session.commit()
        
        service = WebhookService(db_session)
        
        webhook_data = WebhookEndpointCreate(
            name="Test Webhook",
            url="https://example.com/webhook",
            secret="webhook_secret_123",
            events=[WebhookEventType.INVOICE_CREATED, WebhookEventType.CUSTOMER_CREATED],
            retry_count=3,
            timeout_seconds=30
        )
        
        result = service.create_webhook_endpoint(
            str(self.tenant.id), 
            str(self.api_key.id), 
            webhook_data
        )
        
        assert result.name == "Test Webhook"
        assert result.url == "https://example.com/webhook"
        assert len(result.events) == 2
        assert "invoice.created" in result.events
        assert "customer.created" in result.events
        assert result.retry_count == 3
        assert result.timeout_seconds == 30
    
    def test_webhook_endpoint_limit(self, db_session: Session):
        """Test webhook endpoint creation limit"""
        db_session.add(self.tenant)
        db_session.add(self.api_key)
        db_session.commit()
        
        service = WebhookService(db_session)
        
        # Create 3 webhook endpoints (the limit)
        for i in range(3):
            webhook_data = WebhookEndpointCreate(
                name=f"Webhook {i+1}",
                url=f"https://example.com/webhook{i+1}",
                events=[WebhookEventType.INVOICE_CREATED]
            )
            service.create_webhook_endpoint(
                str(self.tenant.id), 
                str(self.api_key.id), 
                webhook_data
            )
        
        # Try to create 4th webhook
        webhook_data = WebhookEndpointCreate(
            name="Fourth Webhook",
            url="https://example.com/webhook4",
            events=[WebhookEventType.INVOICE_CREATED]
        )
        
        with pytest.raises(HTTPException) as exc_info:
            service.create_webhook_endpoint(
                str(self.tenant.id), 
                str(self.api_key.id), 
                webhook_data
            )
        
        assert exc_info.value.status_code == 400
        assert "Maximum number" in str(exc_info.value.detail)
    
    @pytest.mark.asyncio
    async def test_webhook_delivery_success(self, db_session: Session):
        """Test successful webhook delivery"""
        db_session.add(self.tenant)
        db_session.add(self.api_key)
        
        # Create webhook endpoint
        webhook = WebhookEndpoint(
            tenant_id=self.tenant.id,
            api_key_id=self.api_key.id,
            name="Test Webhook",
            url="https://httpbin.org/post",  # Test endpoint
            events="invoice.created",
            is_active=True,
            retry_count=1,
            timeout_seconds=10
        )
        db_session.add(webhook)
        db_session.commit()
        
        service = WebhookService(db_session)
        
        # Mock successful webhook delivery
        with patch('httpx.AsyncClient.post') as mock_post:
            mock_response = AsyncMock()
            mock_response.status_code = 200
            mock_post.return_value = mock_response
            
            # Send webhook
            await service.send_webhook(
                "invoice.created",
                {"invoice_id": "123", "amount": 1000.00},
                str(self.tenant.id)
            )
            
            # Verify webhook was called
            mock_post.assert_called_once()
            
            # Check delivery stats
            db_session.refresh(webhook)
            assert webhook.total_deliveries == 1
            assert webhook.failed_deliveries == 0
            assert webhook.last_delivery_at is not None
    
    @pytest.mark.asyncio
    async def test_webhook_delivery_failure_with_retry(self, db_session: Session):
        """Test webhook delivery failure with retry logic"""
        db_session.add(self.tenant)
        db_session.add(self.api_key)
        
        # Create webhook endpoint
        webhook = WebhookEndpoint(
            tenant_id=self.tenant.id,
            api_key_id=self.api_key.id,
            name="Test Webhook",
            url="https://httpbin.org/status/500",
            events="invoice.created",
            is_active=True,
            retry_count=2,
            timeout_seconds=5
        )
        db_session.add(webhook)
        db_session.commit()
        
        service = WebhookService(db_session)
        
        # Mock failed webhook delivery
        with patch('httpx.AsyncClient.post') as mock_post:
            mock_response = AsyncMock()
            mock_response.status_code = 500
            mock_post.return_value = mock_response
            
            # Send webhook
            await service.send_webhook(
                "invoice.created",
                {"invoice_id": "123", "amount": 1000.00},
                str(self.tenant.id)
            )
            
            # Verify webhook was retried (1 initial + 2 retries = 3 calls)
            assert mock_post.call_count == 3
            
            # Check delivery stats
            db_session.refresh(webhook)
            assert webhook.total_deliveries == 1
            assert webhook.failed_deliveries == 1
            assert webhook.last_delivery_at is None  # No successful delivery
    
    def test_webhook_signature_generation(self, db_session: Session):
        """Test webhook signature generation"""
        service = WebhookService(db_session)
        
        secret = "test_secret_123"
        payload = '{"event": "test", "data": {"id": "123"}}'
        
        signature = service._generate_signature(secret, payload)
        
        # Verify signature format
        assert signature.startswith("sha256=")
        assert len(signature) == 71  # "sha256=" + 64 hex characters
        
        # Verify signature is consistent
        signature2 = service._generate_signature(secret, payload)
        assert signature == signature2


class TestApiEndpoints:
    """Test API access system HTTP endpoints"""
    
    def setup_method(self):
        """Set up test data"""
        self.client = TestClient(app)
        
        # Create test tenant with Pro subscription
        self.tenant = Tenant(
            name="Test Business",
            email="test@business.com",
            subscription_type=SubscriptionType.PRO,
            status=TenantStatus.ACTIVE,
            subscription_expires_at=datetime.now(timezone.utc) + timedelta(days=30)
        )
        
        # Create test user
        self.user = User(
            tenant_id=self.tenant.id,
            email="admin@business.com",
            password_hash="hashed_password",
            first_name="Admin",
            last_name="User",
            role=UserRole.ADMIN,
            status=UserStatus.ACTIVE
        )
        
        # Create auth tokens
        self.tokens = create_user_tokens(self.user)
        self.headers = {"Authorization": f"Bearer {self.tokens['access_token']}"}
    
    def test_create_api_key_endpoint(self, db_session: Session):
        """Test API key creation endpoint"""
        db_session.add(self.tenant)
        db_session.add(self.user)
        db_session.commit()
        
        # Mock the database dependency
        def override_get_db():
            return db_session
        
        app.dependency_overrides[get_db] = override_get_db
        
        try:
            response = self.client.post(
                "/api-access/keys",
                json={
                    "name": "Test API Key",
                    "description": "Test key for integration",
                    "scope": "read_write",
                    "rate_limit_per_minute": 100,
                    "rate_limit_per_hour": 2000,
                    "rate_limit_per_day": 20000,
                    "expires_in_days": 90
                },
                headers=self.headers
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["name"] == "Test API Key"
            assert data["scope"] == "read_write"
            assert "api_key" in data  # Full key should be returned
            assert len(data["api_key"]) > 20
        finally:
            app.dependency_overrides.clear()
    
    def test_get_api_keys_endpoint(self, db_session: Session):
        """Test get API keys endpoint"""
        db_session.add(self.tenant)
        db_session.add(self.user)
        
        # Create test API key
        full_key, key_hash, key_prefix = ApiKey.generate_api_key()
        api_key = ApiKey(
            tenant_id=self.tenant.id,
            name="Test API Key",
            key_hash=key_hash,
            key_prefix=key_prefix,
            scope=ApiKeyScope.READ_ONLY.value,
            rate_limit_per_minute=60,
            status=ApiKeyStatus.ACTIVE.value
        )
        db_session.add(api_key)
        db_session.commit()
        
        # Mock the database dependency
        def override_get_db():
            return db_session
        
        app.dependency_overrides[get_db] = override_get_db
        
        try:
            response = self.client.get("/api-access/keys", headers=self.headers)
            
            assert response.status_code == 200
            data = response.json()
            assert len(data) == 1
            assert data[0]["name"] == "Test API Key"
            assert data[0]["scope"] == "read_only"
            assert "api_key" not in data[0]  # Full key should not be returned
            assert data[0]["key_prefix"] == key_prefix
        finally:
            app.dependency_overrides.clear()
    
    def test_api_key_validation_endpoint(self, db_session: Session):
        """Test API key validation endpoint"""
        db_session.add(self.tenant)
        
        # Create test API key
        full_key, key_hash, key_prefix = ApiKey.generate_api_key()
        api_key = ApiKey(
            tenant_id=self.tenant.id,
            name="Test API Key",
            key_hash=key_hash,
            key_prefix=key_prefix,
            scope=ApiKeyScope.READ_WRITE.value,
            rate_limit_per_minute=100,
            status=ApiKeyStatus.ACTIVE.value
        )
        db_session.add(api_key)
        db_session.commit()
        
        # Mock the database dependency
        def override_get_db():
            return db_session
        
        app.dependency_overrides[get_db] = override_get_db
        
        try:
            # Test valid API key
            response = self.client.post(
                "/api-access/validate",
                headers={"X-API-Key": full_key}
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["valid"] is True
            assert data["tenant_id"] == str(self.tenant.id)
            assert data["scope"] == "read_write"
            
            # Test invalid API key
            response = self.client.post(
                "/api-access/validate",
                headers={"X-API-Key": "invalid_key"}
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["valid"] is False
            assert "Invalid or inactive" in data["error"]
        finally:
            app.dependency_overrides.clear()
    
    def test_free_tier_api_access_denied(self, db_session: Session):
        """Test API access denied for free tier"""
        # Create free tier tenant
        free_tenant = Tenant(
            name="Free Business",
            email="free@business.com",
            subscription_type=SubscriptionType.FREE,
            status=TenantStatus.ACTIVE
        )
        
        free_user = User(
            tenant_id=free_tenant.id,
            email="user@free.com",
            password_hash="hashed_password",
            first_name="Free",
            last_name="User",
            role=UserRole.ADMIN,
            status=UserStatus.ACTIVE
        )
        
        db_session.add(free_tenant)
        db_session.add(free_user)
        db_session.commit()
        
        # Create auth tokens for free user
        free_tokens = create_user_tokens(free_user)
        free_headers = {"Authorization": f"Bearer {free_tokens['access_token']}"}
        
        # Mock the database dependency
        def override_get_db():
            return db_session
        
        app.dependency_overrides[get_db] = override_get_db
        
        try:
            response = self.client.post(
                "/api-access/keys",
                json={
                    "name": "Test API Key",
                    "scope": "read_only",
                    "rate_limit_per_minute": 60
                },
                headers=free_headers
            )
            
            assert response.status_code == 403
            assert "Pro tier" in response.json()["detail"]
        finally:
            app.dependency_overrides.clear()


class TestApiKeyAuthentication:
    """Test API key authentication middleware"""
    
    def setup_method(self):
        """Set up test data"""
        self.client = TestClient(app)
        
        # Create test tenant
        self.tenant = Tenant(
            name="Test Business",
            email="test@business.com",
            subscription_type=SubscriptionType.PRO,
            status=TenantStatus.ACTIVE
        )
        
        # Create test API key
        full_key, key_hash, key_prefix = ApiKey.generate_api_key()
        self.api_key = ApiKey(
            tenant_id=self.tenant.id,
            name="Test API Key",
            key_hash=key_hash,
            key_prefix=key_prefix,
            scope=ApiKeyScope.FULL_ACCESS.value,
            rate_limit_per_minute=100,
            status=ApiKeyStatus.ACTIVE.value
        )
        self.full_api_key = full_key
    
    def test_api_key_auth_success(self, db_session: Session):
        """Test successful API key authentication"""
        db_session.add(self.tenant)
        db_session.add(self.api_key)
        db_session.commit()
        
        from app.core.api_key_auth import ApiKeyAuth
        
        # Create mock request
        class MockRequest:
            def __init__(self):
                self.client = type('obj', (object,), {'host': '192.168.1.1'})
                self.headers = {'user-agent': 'TestAgent/1.0'}
                self.url = type('obj', (object,), {'path': '/test'})
                self.method = 'GET'
                self.state = type('obj', (object,), {})
        
        request = MockRequest()
        
        # Test authentication
        auth = ApiKeyAuth("read")
        result = asyncio.run(auth(request, self.full_api_key, db_session))
        
        api_key, tenant = result
        assert api_key.id == self.api_key.id
        assert tenant.id == self.tenant.id
    
    def test_api_key_auth_missing_key(self, db_session: Session):
        """Test API key authentication with missing key"""
        from app.core.api_key_auth import ApiKeyAuth
        
        class MockRequest:
            def __init__(self):
                self.client = type('obj', (object,), {'host': '192.168.1.1'})
                self.headers = {}
                self.state = type('obj', (object,), {})
        
        request = MockRequest()
        
        auth = ApiKeyAuth("read")
        
        with pytest.raises(HTTPException) as exc_info:
            asyncio.run(auth(request, None, db_session))
        
        assert exc_info.value.status_code == 401
        assert "API key required" in str(exc_info.value.detail)
    
    def test_api_key_auth_insufficient_scope(self, db_session: Session):
        """Test API key authentication with insufficient scope"""
        # Create read-only API key
        full_key, key_hash, key_prefix = ApiKey.generate_api_key()
        read_only_key = ApiKey(
            tenant_id=self.tenant.id,
            name="Read Only Key",
            key_hash=key_hash,
            key_prefix=key_prefix,
            scope=ApiKeyScope.READ_ONLY.value,
            rate_limit_per_minute=100,
            status=ApiKeyStatus.ACTIVE.value
        )
        
        db_session.add(self.tenant)
        db_session.add(read_only_key)
        db_session.commit()
        
        from app.core.api_key_auth import ApiKeyAuth
        
        class MockRequest:
            def __init__(self):
                self.client = type('obj', (object,), {'host': '192.168.1.1'})
                self.headers = {'user-agent': 'TestAgent/1.0'}
                self.url = type('obj', (object,), {'path': '/test'})
                self.method = 'POST'
                self.state = type('obj', (object,), {})
        
        request = MockRequest()
        
        # Try to use read-only key for write operation
        auth = ApiKeyAuth("write")
        
        with pytest.raises(HTTPException) as exc_info:
            asyncio.run(auth(request, full_key, db_session))
        
        assert exc_info.value.status_code == 403
        assert "required scope" in str(exc_info.value.detail)


class TestRateLimiting:
    """Test rate limiting functionality"""
    
    def setup_method(self):
        """Set up test data"""
        # Create test tenant
        self.tenant = Tenant(
            name="Test Business",
            email="test@business.com",
            subscription_type=SubscriptionType.PRO,
            status=TenantStatus.ACTIVE
        )
        
        # Create test API key with strict rate limits
        full_key, key_hash, key_prefix = ApiKey.generate_api_key()
        self.api_key = ApiKey(
            tenant_id=self.tenant.id,
            name="Rate Limited Key",
            key_hash=key_hash,
            key_prefix=key_prefix,
            scope=ApiKeyScope.READ_WRITE.value,
            rate_limit_per_minute=5,
            rate_limit_per_hour=50,
            rate_limit_per_day=500,
            status=ApiKeyStatus.ACTIVE.value
        )
        self.full_api_key = full_key
    
    def test_rate_limit_tracking(self, db_session: Session):
        """Test rate limit usage tracking"""
        db_session.add(self.tenant)
        db_session.add(self.api_key)
        db_session.commit()
        
        service = ApiKeyService(db_session)
        
        # Record some API usage
        for i in range(3):
            service.record_api_usage(
                str(self.api_key.id),
                "/test/endpoint",
                "GET",
                200
            )
        
        # Check rate limits
        rate_info = service.check_rate_limits(str(self.api_key.id))
        
        assert rate_info.limit_per_minute == 5
        assert rate_info.remaining_minute == 2  # 5 - 3 = 2
        assert rate_info.limit_per_hour == 50
        assert rate_info.remaining_hour == 47  # 50 - 3 = 47
    
    def test_rate_limit_exceeded(self, db_session: Session):
        """Test rate limit exceeded scenario"""
        db_session.add(self.tenant)
        db_session.add(self.api_key)
        db_session.commit()
        
        service = ApiKeyService(db_session)
        
        # Exceed minute rate limit
        for i in range(6):  # Limit is 5
            service.record_api_usage(
                str(self.api_key.id),
                "/test/endpoint",
                "GET",
                200
            )
        
        # Validation should fail
        validation = service.validate_api_key(self.full_api_key)
        
        assert validation.valid is False
        assert "Rate limit exceeded" in validation.error
        assert validation.rate_limit_info.remaining_minute == 0
    
    def test_rate_limit_reset_times(self, db_session: Session):
        """Test rate limit reset time calculations"""
        db_session.add(self.tenant)
        db_session.add(self.api_key)
        db_session.commit()
        
        service = ApiKeyService(db_session)
        
        rate_info = service.check_rate_limits(str(self.api_key.id))
        
        now = datetime.now(timezone.utc)
        
        # Check reset times are in the future
        assert rate_info.reset_minute > now
        assert rate_info.reset_hour > now
        assert rate_info.reset_day > now
        
        # Check reset times are reasonable
        minute_diff = (rate_info.reset_minute - now).total_seconds()
        assert 0 < minute_diff <= 60
        
        hour_diff = (rate_info.reset_hour - now).total_seconds()
        assert 0 < hour_diff <= 3600
        
        day_diff = (rate_info.reset_day - now).total_seconds()
        assert 0 < day_diff <= 86400


class TestApiKeyScopes:
    """Test API key scope permissions"""
    
    def test_read_only_scope(self):
        """Test read-only scope permissions"""
        api_key = ApiKey(
            name="Read Only Key",
            scope=ApiKeyScope.READ_ONLY.value
        )
        
        assert api_key.can_access_scope("read") is True
        assert api_key.can_access_scope("write") is False
        assert api_key.can_access_scope("delete") is False
        assert api_key.can_access_scope("admin") is False
    
    def test_read_write_scope(self):
        """Test read-write scope permissions"""
        api_key = ApiKey(
            name="Read Write Key",
            scope=ApiKeyScope.READ_WRITE.value
        )
        
        assert api_key.can_access_scope("read") is True
        assert api_key.can_access_scope("write") is True
        assert api_key.can_access_scope("delete") is False
        assert api_key.can_access_scope("admin") is False
    
    def test_full_access_scope(self):
        """Test full access scope permissions"""
        api_key = ApiKey(
            name="Full Access Key",
            scope=ApiKeyScope.FULL_ACCESS.value
        )
        
        assert api_key.can_access_scope("read") is True
        assert api_key.can_access_scope("write") is True
        assert api_key.can_access_scope("delete") is True
        assert api_key.can_access_scope("admin") is True


class TestApiKeyLifecycle:
    """Test API key lifecycle management"""
    
    def test_api_key_generation(self):
        """Test API key generation"""
        full_key, key_hash, key_prefix = ApiKey.generate_api_key()
        
        # Check key format
        assert len(full_key) > 20
        assert len(key_hash) == 64  # SHA256 hex
        assert len(key_prefix) == 8
        assert key_prefix == full_key[:8]
        
        # Verify hash
        assert ApiKey.hash_key(full_key) == key_hash
    
    def test_api_key_verification(self):
        """Test API key verification"""
        full_key, key_hash, key_prefix = ApiKey.generate_api_key()
        
        api_key = ApiKey(
            name="Test Key",
            key_hash=key_hash,
            key_prefix=key_prefix
        )
        
        assert api_key.verify_key(full_key) is True
        assert api_key.verify_key("wrong_key") is False
    
    def test_api_key_status_changes(self):
        """Test API key status management"""
        api_key = ApiKey(
            name="Test Key",
            status=ApiKeyStatus.ACTIVE.value
        )
        
        assert api_key.is_active is True
        
        # Revoke key
        api_key.revoke()
        assert api_key.status == ApiKeyStatus.REVOKED.value
        assert api_key.is_active is False
        
        # Activate key
        api_key.activate()
        assert api_key.status == ApiKeyStatus.ACTIVE.value
        assert api_key.is_active is True
        
        # Deactivate key
        api_key.deactivate()
        assert api_key.status == ApiKeyStatus.INACTIVE.value
        assert api_key.is_active is False
    
    def test_api_key_expiration(self):
        """Test API key expiration logic"""
        # Create non-expiring key
        api_key = ApiKey(
            name="Non-expiring Key",
            status=ApiKeyStatus.ACTIVE.value,
            expires_at=None
        )
        
        assert api_key.is_expired is False
        assert api_key.is_active is True
        
        # Create expired key
        api_key.expires_at = datetime.now(timezone.utc) - timedelta(hours=1)
        assert api_key.is_expired is True
        assert api_key.is_active is False
        
        # Create future-expiring key
        api_key.expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
        assert api_key.is_expired is False
        assert api_key.is_active is True
    
    def test_api_key_usage_tracking(self):
        """Test API key usage statistics"""
        api_key = ApiKey(
            name="Test Key",
            total_requests=0,
            last_used_at=None
        )
        
        # Update usage
        api_key.update_usage("192.168.1.1", "TestAgent/1.0")
        
        assert api_key.total_requests == 1
        assert api_key.last_used_at is not None
        assert api_key.last_ip_address == "192.168.1.1"
        assert api_key.user_agent == "TestAgent/1.0"
        
        # Update usage again
        api_key.update_usage("10.0.0.1", "AnotherAgent/2.0")
        
        assert api_key.total_requests == 2
        assert api_key.last_ip_address == "10.0.0.1"
        assert api_key.user_agent == "AnotherAgent/2.0"


# Integration test fixtures
@pytest.fixture
def db_session():
    """Create a test database session using real PostgreSQL"""
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    from app.core.database import Base
    import os
    
    # Use real PostgreSQL test database (Docker-first approach)
    database_url = os.getenv(
        "TEST_DATABASE_URL", 
        "postgresql://hesaab:hesaabplus@postgres:5432/hesaabplus_test"
    )
    
    engine = create_engine(database_url, echo=False)
    
    # Create tables if they don't exist
    Base.metadata.create_all(engine)
    
    SessionLocal = sessionmaker(bind=engine)
    session = SessionLocal()
    
    try:
        yield session
        # Clean up after each test
        session.rollback()
    finally:
        session.close()


if __name__ == "__main__":
    # Run tests with: python -m pytest backend/tests/test_api_access_system.py -v
    pytest.main([__file__, "-v", "--tb=short"])