"""
API Key service for managing external integrations
"""

from typing import Optional, List, Dict, Any, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import and_, func, extract
from datetime import datetime, timedelta, timezone
from fastapi import HTTPException, status
import secrets
import hashlib
import hmac
import json
import httpx
import asyncio
from ..models.api_key import ApiKey, ApiKeyUsage, WebhookEndpoint, ApiKeyStatus, ApiKeyScope
from ..models.tenant import Tenant, SubscriptionType
from ..schemas.api_key import (
    ApiKeyCreate, ApiKeyUpdate, ApiKeyCreateResponse, ApiKeyResponse,
    WebhookEndpointCreate, WebhookEndpointUpdate, WebhookEndpointResponse,
    RateLimitInfo, ApiKeyValidationResponse
)


class ApiKeyService:
    """Service for managing API keys and external integrations"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def create_api_key(self, tenant_id: str, api_key_data: ApiKeyCreate) -> ApiKeyCreateResponse:
        """Create a new API key for a tenant"""
        # Check if tenant has Pro subscription
        tenant = self.db.query(Tenant).filter(Tenant.id == tenant_id).first()
        if not tenant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tenant not found"
            )
        
        if tenant.subscription_type != SubscriptionType.PRO:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="API access is only available for Pro tier subscriptions"
            )
        
        # Check API key limit (max 5 per tenant)
        existing_keys = self.db.query(ApiKey).filter(
            ApiKey.tenant_id == tenant_id,
            ApiKey.status != ApiKeyStatus.REVOKED.value
        ).count()
        
        if existing_keys >= 5:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Maximum number of API keys (5) reached for this tenant"
            )
        
        # Generate API key
        full_key, key_hash, key_prefix = ApiKey.generate_api_key()
        
        # Calculate expiration date
        expires_at = None
        if api_key_data.expires_in_days:
            expires_at = datetime.now(timezone.utc) + timedelta(days=api_key_data.expires_in_days)
        
        # Create API key record
        api_key = ApiKey(
            tenant_id=tenant_id,
            name=api_key_data.name,
            description=api_key_data.description,
            key_hash=key_hash,
            key_prefix=key_prefix,
            scope=api_key_data.scope.value,
            allowed_ips=api_key_data.allowed_ips,
            rate_limit_per_minute=api_key_data.rate_limit_per_minute,
            rate_limit_per_hour=api_key_data.rate_limit_per_hour,
            rate_limit_per_day=api_key_data.rate_limit_per_day,
            expires_at=expires_at,
            status=ApiKeyStatus.ACTIVE.value
        )
        
        self.db.add(api_key)
        self.db.commit()
        self.db.refresh(api_key)
        
        # Return response with full key (only shown once)
        return ApiKeyCreateResponse(
            id=str(api_key.id),
            name=api_key.name,
            description=api_key.description,
            api_key=full_key,  # Full key only shown here
            key_prefix=api_key.key_prefix,
            scope=api_key.scope,
            allowed_ips=api_key.allowed_ips,
            rate_limit_per_minute=api_key.rate_limit_per_minute,
            rate_limit_per_hour=api_key.rate_limit_per_hour,
            rate_limit_per_day=api_key.rate_limit_per_day,
            status=api_key.status,
            expires_at=api_key.expires_at,
            created_at=api_key.created_at
        )
    
    def get_api_keys(self, tenant_id: str) -> List[ApiKeyResponse]:
        """Get all API keys for a tenant"""
        api_keys = self.db.query(ApiKey).filter(
            ApiKey.tenant_id == tenant_id,
            ApiKey.status != ApiKeyStatus.REVOKED.value
        ).order_by(ApiKey.created_at.desc()).all()
        
        return [
            ApiKeyResponse(
                id=str(key.id),
                name=key.name,
                description=key.description,
                key_prefix=key.key_prefix,
                scope=key.scope,
                allowed_ips=key.allowed_ips,
                rate_limit_per_minute=key.rate_limit_per_minute,
                rate_limit_per_hour=key.rate_limit_per_hour,
                rate_limit_per_day=key.rate_limit_per_day,
                status=key.status,
                expires_at=key.expires_at,
                last_used_at=key.last_used_at,
                total_requests=key.total_requests,
                last_ip_address=key.last_ip_address,
                created_at=key.created_at,
                updated_at=key.updated_at
            )
            for key in api_keys
        ]
    
    def get_api_key(self, tenant_id: str, api_key_id: str) -> ApiKeyResponse:
        """Get a specific API key"""
        api_key = self.db.query(ApiKey).filter(
            ApiKey.id == api_key_id,
            ApiKey.tenant_id == tenant_id,
            ApiKey.status != ApiKeyStatus.REVOKED.value
        ).first()
        
        if not api_key:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="API key not found"
            )
        
        return ApiKeyResponse(
            id=str(api_key.id),
            name=api_key.name,
            description=api_key.description,
            key_prefix=api_key.key_prefix,
            scope=api_key.scope,
            allowed_ips=api_key.allowed_ips,
            rate_limit_per_minute=api_key.rate_limit_per_minute,
            rate_limit_per_hour=api_key.rate_limit_per_hour,
            rate_limit_per_day=api_key.rate_limit_per_day,
            status=api_key.status,
            expires_at=api_key.expires_at,
            last_used_at=api_key.last_used_at,
            total_requests=api_key.total_requests,
            last_ip_address=api_key.last_ip_address,
            created_at=api_key.created_at,
            updated_at=api_key.updated_at
        )
    
    def update_api_key(self, tenant_id: str, api_key_id: str, update_data: ApiKeyUpdate) -> ApiKeyResponse:
        """Update an API key"""
        api_key = self.db.query(ApiKey).filter(
            ApiKey.id == api_key_id,
            ApiKey.tenant_id == tenant_id,
            ApiKey.status != ApiKeyStatus.REVOKED.value
        ).first()
        
        if not api_key:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="API key not found"
            )
        
        # Update fields
        update_dict = update_data.dict(exclude_unset=True)
        for field, value in update_dict.items():
            if hasattr(api_key, field):
                if field == 'scope' and value:
                    setattr(api_key, field, value.value)
                elif field == 'status' and value:
                    setattr(api_key, field, value.value)
                else:
                    setattr(api_key, field, value)
        
        self.db.commit()
        self.db.refresh(api_key)
        
        return self.get_api_key(tenant_id, api_key_id)
    
    def revoke_api_key(self, tenant_id: str, api_key_id: str) -> dict:
        """Revoke an API key"""
        api_key = self.db.query(ApiKey).filter(
            ApiKey.id == api_key_id,
            ApiKey.tenant_id == tenant_id
        ).first()
        
        if not api_key:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="API key not found"
            )
        
        api_key.revoke()
        self.db.commit()
        
        return {"message": "API key revoked successfully"}
    
    def validate_api_key(self, api_key: str, ip_address: str = None, user_agent: str = None) -> ApiKeyValidationResponse:
        """Validate an API key and check rate limits"""
        # Hash the provided key
        key_hash = ApiKey.hash_key(api_key)
        
        # Find the API key
        db_api_key = self.db.query(ApiKey).filter(
            ApiKey.key_hash == key_hash,
            ApiKey.status == ApiKeyStatus.ACTIVE.value
        ).first()
        
        if not db_api_key:
            return ApiKeyValidationResponse(
                valid=False,
                error="Invalid or inactive API key"
            )
        
        # Check if key is expired
        if db_api_key.is_expired:
            db_api_key.status = ApiKeyStatus.EXPIRED.value
            self.db.commit()
            return ApiKeyValidationResponse(
                valid=False,
                error="API key has expired"
            )
        
        # Check IP restrictions
        if ip_address and not db_api_key.is_ip_allowed(ip_address):
            return ApiKeyValidationResponse(
                valid=False,
                error="IP address not allowed for this API key"
            )
        
        # Check rate limits
        rate_limit_info = self.check_rate_limits(db_api_key.id)
        if (rate_limit_info.remaining_minute <= 0 or 
            rate_limit_info.remaining_hour <= 0 or 
            rate_limit_info.remaining_day <= 0):
            return ApiKeyValidationResponse(
                valid=False,
                error="Rate limit exceeded",
                rate_limit_info=rate_limit_info
            )
        
        # Update usage statistics
        db_api_key.update_usage(ip_address, user_agent)
        self.db.commit()
        
        return ApiKeyValidationResponse(
            valid=True,
            api_key_id=str(db_api_key.id),
            tenant_id=str(db_api_key.tenant_id),
            scope=db_api_key.scope,
            rate_limit_info=rate_limit_info
        )
    
    def check_rate_limits(self, api_key_id: str) -> RateLimitInfo:
        """Check current rate limits for an API key"""
        api_key = self.db.query(ApiKey).filter(ApiKey.id == api_key_id).first()
        if not api_key:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="API key not found"
            )
        
        now = datetime.now(timezone.utc)
        
        # Calculate time boundaries
        minute_start = now.replace(second=0, microsecond=0)
        hour_start = now.replace(minute=0, second=0, microsecond=0)
        day_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        
        # Count requests in current periods
        requests_this_minute = self.db.query(func.sum(ApiKeyUsage.requests_count)).filter(
            ApiKeyUsage.api_key_id == api_key_id,
            ApiKeyUsage.usage_date >= minute_start
        ).scalar() or 0
        
        requests_this_hour = self.db.query(func.sum(ApiKeyUsage.requests_count)).filter(
            ApiKeyUsage.api_key_id == api_key_id,
            ApiKeyUsage.usage_date >= hour_start
        ).scalar() or 0
        
        requests_today = self.db.query(func.sum(ApiKeyUsage.requests_count)).filter(
            ApiKeyUsage.api_key_id == api_key_id,
            ApiKeyUsage.usage_date >= day_start
        ).scalar() or 0
        
        return RateLimitInfo(
            limit_per_minute=api_key.rate_limit_per_minute,
            limit_per_hour=api_key.rate_limit_per_hour,
            limit_per_day=api_key.rate_limit_per_day,
            remaining_minute=max(0, api_key.rate_limit_per_minute - requests_this_minute),
            remaining_hour=max(0, api_key.rate_limit_per_hour - requests_this_hour),
            remaining_day=max(0, api_key.rate_limit_per_day - requests_today),
            reset_minute=minute_start + timedelta(minutes=1),
            reset_hour=hour_start + timedelta(hours=1),
            reset_day=day_start + timedelta(days=1)
        )
    
    def record_api_usage(self, api_key_id: str, endpoint: str, method: str, status_code: int):
        """Record API usage for rate limiting and analytics"""
        now = datetime.now(timezone.utc)
        
        # Check if usage record exists for this minute
        usage_record = self.db.query(ApiKeyUsage).filter(
            ApiKeyUsage.api_key_id == api_key_id,
            ApiKeyUsage.usage_hour == now.hour,
            ApiKeyUsage.usage_minute == now.minute,
            func.date(ApiKeyUsage.usage_date) == now.date()
        ).first()
        
        if usage_record:
            usage_record.requests_count += 1
        else:
            usage_record = ApiKeyUsage(
                api_key_id=api_key_id,
                usage_date=now,
                usage_hour=now.hour,
                usage_minute=now.minute,
                requests_count=1,
                endpoint=endpoint,
                method=method,
                status_code=status_code
            )
            self.db.add(usage_record)
        
        self.db.commit()


class WebhookService:
    """Service for managing webhook endpoints and deliveries"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def create_webhook_endpoint(self, tenant_id: str, api_key_id: str, webhook_data: WebhookEndpointCreate) -> WebhookEndpointResponse:
        """Create a new webhook endpoint"""
        # Verify API key belongs to tenant
        api_key = self.db.query(ApiKey).filter(
            ApiKey.id == api_key_id,
            ApiKey.tenant_id == tenant_id,
            ApiKey.status == ApiKeyStatus.ACTIVE.value
        ).first()
        
        if not api_key:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="API key not found or inactive"
            )
        
        # Check webhook limit (max 3 per API key)
        existing_webhooks = self.db.query(WebhookEndpoint).filter(
            WebhookEndpoint.api_key_id == api_key_id,
            WebhookEndpoint.is_active == True
        ).count()
        
        if existing_webhooks >= 3:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Maximum number of webhook endpoints (3) reached for this API key"
            )
        
        # Create webhook endpoint
        webhook = WebhookEndpoint(
            tenant_id=tenant_id,
            api_key_id=api_key_id,
            name=webhook_data.name,
            url=webhook_data.url,
            secret=webhook_data.secret,
            events=','.join([event.value for event in webhook_data.events]),
            retry_count=webhook_data.retry_count,
            timeout_seconds=webhook_data.timeout_seconds
        )
        
        self.db.add(webhook)
        self.db.commit()
        self.db.refresh(webhook)
        
        return WebhookEndpointResponse(
            id=str(webhook.id),
            name=webhook.name,
            url=webhook.url,
            events=webhook.get_subscribed_events(),
            is_active=webhook.is_active,
            retry_count=webhook.retry_count,
            timeout_seconds=webhook.timeout_seconds,
            last_delivery_at=webhook.last_delivery_at,
            total_deliveries=webhook.total_deliveries,
            failed_deliveries=webhook.failed_deliveries,
            created_at=webhook.created_at,
            updated_at=webhook.updated_at
        )
    
    def get_webhook_endpoints(self, tenant_id: str, api_key_id: str) -> List[WebhookEndpointResponse]:
        """Get all webhook endpoints for an API key"""
        webhooks = self.db.query(WebhookEndpoint).filter(
            WebhookEndpoint.tenant_id == tenant_id,
            WebhookEndpoint.api_key_id == api_key_id
        ).order_by(WebhookEndpoint.created_at.desc()).all()
        
        return [
            WebhookEndpointResponse(
                id=str(webhook.id),
                name=webhook.name,
                url=webhook.url,
                events=webhook.get_subscribed_events(),
                is_active=webhook.is_active,
                retry_count=webhook.retry_count,
                timeout_seconds=webhook.timeout_seconds,
                last_delivery_at=webhook.last_delivery_at,
                total_deliveries=webhook.total_deliveries,
                failed_deliveries=webhook.failed_deliveries,
                created_at=webhook.created_at,
                updated_at=webhook.updated_at
            )
            for webhook in webhooks
        ]
    
    async def send_webhook(self, event_type: str, payload: dict, tenant_id: str):
        """Send webhook notifications for an event"""
        # Get all active webhook endpoints for this tenant that subscribe to this event
        webhooks = self.db.query(WebhookEndpoint).filter(
            WebhookEndpoint.tenant_id == tenant_id,
            WebhookEndpoint.is_active == True
        ).all()
        
        # Filter webhooks that subscribe to this event
        relevant_webhooks = [
            webhook for webhook in webhooks
            if webhook.is_subscribed_to_event(event_type)
        ]
        
        # Send webhooks asynchronously
        tasks = []
        for webhook in relevant_webhooks:
            task = asyncio.create_task(self._deliver_webhook(webhook, event_type, payload))
            tasks.append(task)
        
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)
    
    async def _deliver_webhook(self, webhook: WebhookEndpoint, event_type: str, payload: dict):
        """Deliver a single webhook with retries"""
        webhook_payload = {
            "event": event_type,
            "data": payload,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "webhook_id": str(webhook.id)
        }
        
        headers = {
            "Content-Type": "application/json",
            "User-Agent": "HesaabPlus-Webhook/1.0"
        }
        
        # Add signature if secret is provided
        if webhook.secret:
            signature = self._generate_signature(webhook.secret, json.dumps(webhook_payload))
            headers["X-HesaabPlus-Signature"] = signature
        
        success = False
        attempt = 0
        
        while attempt <= webhook.retry_count and not success:
            attempt += 1
            
            try:
                async with httpx.AsyncClient(timeout=webhook.timeout_seconds) as client:
                    response = await client.post(
                        webhook.url,
                        json=webhook_payload,
                        headers=headers
                    )
                    
                    if 200 <= response.status_code < 300:
                        success = True
                        webhook.update_delivery_stats(success=True)
                    else:
                        if attempt > webhook.retry_count:
                            webhook.update_delivery_stats(success=False)
                        
            except Exception as e:
                if attempt > webhook.retry_count:
                    webhook.update_delivery_stats(success=False)
                
                # Wait before retry (exponential backoff)
                if attempt <= webhook.retry_count:
                    await asyncio.sleep(2 ** attempt)
        
        self.db.commit()
    
    def _generate_signature(self, secret: str, payload: str) -> str:
        """Generate HMAC signature for webhook payload"""
        signature = hmac.new(
            secret.encode('utf-8'),
            payload.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        return f"sha256={signature}"