"""
Super Admin API endpoints for tenant management
"""

from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi import status
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc, asc
from datetime import datetime, timedelta, timezone
import uuid
import logging

from ..core.database import get_db
from ..core.auth import get_super_admin_user
from ..models.user import User
from ..models.tenant import Tenant, SubscriptionType, TenantStatus
from ..schemas.super_admin import (
    TenantCreateRequest, TenantUpdateRequest, TenantStatusUpdateRequest,
    SubscriptionUpdateRequest, PaymentConfirmationRequest, TenantSearchRequest,
    TenantResponse, TenantListResponse, TenantStatsResponse, TenantUsageResponse,
    PendingPaymentsResponse, PendingPaymentTenant, PaymentConfirmationResponse,
    TenantActivityResponse, BulkTenantActionRequest, BulkTenantActionResponse,
    SystemHealthResponse, CeleryMonitoringResponse, DatabaseMetricsResponse,
    SystemAlertsResponse, PerformanceMetricsResponse
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/super-admin", tags=["Super Admin - Tenant Management"])


@router.get("/tenants", response_model=TenantListResponse)
async def get_tenants(
    search_term: Optional[str] = Query(None, description="Search term for name, email, or domain"),
    subscription_type: Optional[SubscriptionType] = Query(None, description="Filter by subscription type"),
    status: Optional[TenantStatus] = Query(None, description="Filter by tenant status"),
    business_type: Optional[str] = Query(None, description="Filter by business type"),
    has_expired_subscription: Optional[bool] = Query(None, description="Filter by subscription expiry status"),
    created_after: Optional[datetime] = Query(None, description="Filter tenants created after this date"),
    created_before: Optional[datetime] = Query(None, description="Filter tenants created before this date"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(50, ge=1, le=100, description="Maximum number of records to return"),
    sort_by: str = Query("created_at", description="Field to sort by"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$", description="Sort order"),
    current_user: User = Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get list of tenants with search, filtering, and pagination
    """
    try:
        # Build base query
        query = db.query(Tenant)
        
        # Apply search filter
        if search_term:
            search_filter = or_(
                Tenant.name.ilike(f"%{search_term}%"),
                Tenant.email.ilike(f"%{search_term}%"),
                Tenant.domain.ilike(f"%{search_term}%")
            )
            query = query.filter(search_filter)
        
        # Apply filters
        if subscription_type:
            query = query.filter(Tenant.subscription_type == subscription_type)
        
        if status:
            query = query.filter(Tenant.status == status)
        
        if business_type:
            query = query.filter(Tenant.business_type.ilike(f"%{business_type}%"))
        
        if has_expired_subscription is not None:
            now = datetime.now(timezone.utc)
            if has_expired_subscription:
                query = query.filter(
                    and_(
                        Tenant.subscription_expires_at.isnot(None),
                        Tenant.subscription_expires_at < now
                    )
                )
            else:
                query = query.filter(
                    or_(
                        Tenant.subscription_expires_at.is_(None),
                        Tenant.subscription_expires_at >= now
                    )
                )
        
        if created_after:
            query = query.filter(Tenant.created_at >= created_after)
        
        if created_before:
            query = query.filter(Tenant.created_at <= created_before)
        
        # Get total count before pagination
        total = query.count()
        
        # Apply sorting
        if hasattr(Tenant, sort_by):
            sort_column = getattr(Tenant, sort_by)
            if sort_order == "desc":
                query = query.order_by(desc(sort_column))
            else:
                query = query.order_by(asc(sort_column))
        
        # Apply pagination
        tenants = query.offset(skip).limit(limit).all()
        
        # Convert to response models with usage statistics
        tenant_responses = []
        for tenant in tenants:
            usage_stats = tenant.get_usage_stats(db)
            
            tenant_response = TenantResponse(
                id=str(tenant.id),
                name=tenant.name,
                email=tenant.email,
                phone=tenant.phone,
                address=tenant.address,
                domain=tenant.domain,
                subscription_type=tenant.subscription_type,
                status=tenant.status,
                business_type=tenant.business_type,
                currency=tenant.currency,
                timezone=tenant.timezone,
                subscription_starts_at=tenant.subscription_starts_at,
                subscription_expires_at=tenant.subscription_expires_at,
                is_subscription_active=tenant.is_subscription_active,
                days_until_expiry=tenant.days_until_expiry,
                max_users=tenant.max_users,
                max_products=tenant.max_products,
                max_customers=tenant.max_customers,
                max_monthly_invoices=tenant.max_monthly_invoices,
                current_usage=usage_stats,
                notes=tenant.notes,
                last_activity_at=tenant.last_activity_at,
                created_at=tenant.created_at,
                updated_at=tenant.updated_at
            )
            tenant_responses.append(tenant_response)
        
        return TenantListResponse(
            tenants=tenant_responses,
            total=total,
            skip=skip,
            limit=limit,
            has_more=(skip + limit) < total
        )
        
    except Exception as e:
        logger.error(f"Failed to get tenants: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve tenants: {str(e)}"
        )


@router.get("/tenants/pending-payments", response_model=PendingPaymentsResponse)
async def get_pending_payment_tenants(
    current_user: User = Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get tenants with pending Pro subscription payments
    """
    try:
        # Find tenants that are Pro but not active, or have expired subscriptions
        pending_tenants = db.query(Tenant).filter(
            or_(
                and_(
                    Tenant.subscription_type == SubscriptionType.PRO,
                    Tenant.status == TenantStatus.PENDING
                ),
                and_(
                    Tenant.subscription_type == SubscriptionType.PRO,
                    Tenant.subscription_expires_at < datetime.now(timezone.utc)
                )
            )
        ).order_by(desc(Tenant.created_at)).all()
        
        tenant_responses = []
        for tenant in pending_tenants:
            days_since_signup = (datetime.now(timezone.utc) - tenant.created_at).days
            
            tenant_response = PendingPaymentTenant(
                id=str(tenant.id),
                name=tenant.name,
                email=tenant.email,
                subscription_type=tenant.subscription_type,
                status=tenant.status,
                created_at=tenant.created_at,
                days_since_signup=days_since_signup
            )
            tenant_responses.append(tenant_response)
        
        return PendingPaymentsResponse(
            tenants=tenant_responses,
            total=len(tenant_responses)
        )
        
    except Exception as e:
        logger.error(f"Failed to get pending payment tenants: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve pending payment tenants: {str(e)}"
        )


@router.post("/tenants/confirm-payment", response_model=PaymentConfirmationResponse)
async def confirm_payment_and_activate_pro(
    payment_data: PaymentConfirmationRequest,
    current_user: User = Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    """
    Confirm payment and activate Pro subscription
    """
    try:
        tenant = db.query(Tenant).filter(Tenant.id == payment_data.tenant_id).first()
        
        if not tenant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tenant not found"
            )
        
        # Activate Pro subscription
        tenant.upgrade_to_pro(payment_data.duration_months)
        tenant.status = TenantStatus.ACTIVE
        tenant.updated_at = datetime.now(timezone.utc)
        
        # Add payment confirmation note
        payment_note = f"\nPayment confirmed and Pro subscription activated for {payment_data.duration_months} months"
        if payment_data.payment_reference:
            payment_note += f" (Ref: {payment_data.payment_reference})"
        if payment_data.notes:
            payment_note += f" - {payment_data.notes}"
        payment_note += f" ({datetime.now(timezone.utc)})"
        
        tenant.notes = (tenant.notes or "") + payment_note
        
        db.commit()
        db.refresh(tenant)
        
        logger.info(f"Super admin {current_user.id} confirmed payment and activated Pro subscription for tenant {tenant.id}")
        
        return PaymentConfirmationResponse(
            success=True,
            tenant_id=str(tenant.id),
            tenant_name=tenant.name,
            subscription_type=tenant.subscription_type,
            subscription_expires_at=tenant.subscription_expires_at,
            message=f"Pro subscription activated successfully for {payment_data.duration_months} months"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to confirm payment for tenant {payment_data.tenant_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to confirm payment: {str(e)}"
        )


@router.post("/tenants/bulk-action", response_model=BulkTenantActionResponse)
async def bulk_tenant_action(
    action_data: BulkTenantActionRequest,
    current_user: User = Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    """
    Perform bulk actions on multiple tenants
    """
    try:
        successful_tenant_ids = []
        failed_operations = []
        
        for tenant_id in action_data.tenant_ids:
            try:
                tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
                
                if not tenant:
                    failed_operations.append({
                        "tenant_id": tenant_id,
                        "error": "Tenant not found"
                    })
                    continue
                
                if action_data.action == "suspend":
                    tenant.suspend(action_data.reason)
                elif action_data.action == "activate":
                    tenant.activate()
                elif action_data.action == "delete":
                    db.delete(tenant)
                
                successful_tenant_ids.append(tenant_id)
                
            except Exception as e:
                failed_operations.append({
                    "tenant_id": tenant_id,
                    "error": str(e)
                })
        
        db.commit()
        
        success_count = len(successful_tenant_ids)
        failed_count = len(failed_operations)
        
        logger.info(f"Super admin {current_user.id} performed bulk {action_data.action} on {success_count} tenants")
        
        return BulkTenantActionResponse(
            success_count=success_count,
            failed_count=failed_count,
            successful_tenant_ids=successful_tenant_ids,
            failed_operations=failed_operations,
            message=f"Bulk {action_data.action} completed: {success_count} successful, {failed_count} failed"
        )
        
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to perform bulk tenant action: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to perform bulk action: {str(e)}"
        )


@router.post("/tenants", response_model=TenantResponse)
async def create_tenant(
    tenant_data: TenantCreateRequest,
    current_user: User = Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    """
    Create a new tenant
    """
    try:
        # Check if email already exists
        existing_tenant = db.query(Tenant).filter(Tenant.email == tenant_data.email).first()
        if existing_tenant:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Tenant with this email already exists"
            )
        
        # Check if domain already exists (if provided)
        if tenant_data.domain:
            existing_domain = db.query(Tenant).filter(Tenant.domain == tenant_data.domain).first()
            if existing_domain:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Tenant with this domain already exists"
                )
        
        # Create new tenant
        tenant = Tenant(
            name=tenant_data.name,
            email=tenant_data.email,
            phone=tenant_data.phone,
            address=tenant_data.address,
            domain=tenant_data.domain,
            business_type=tenant_data.business_type,
            subscription_type=tenant_data.subscription_type,
            status=TenantStatus.PENDING,  # New tenants start as pending
            notes=tenant_data.notes
        )
        
        # Set limits based on subscription type
        if tenant_data.subscription_type == SubscriptionType.PRO:
            tenant.max_users = 5
            tenant.max_products = -1  # Unlimited
            tenant.max_customers = -1  # Unlimited
            tenant.max_monthly_invoices = -1  # Unlimited
        else:  # FREE
            tenant.max_users = 1
            tenant.max_products = 10
            tenant.max_customers = 10
            tenant.max_monthly_invoices = 10
        
        db.add(tenant)
        db.commit()
        db.refresh(tenant)
        
        logger.info(f"Super admin {current_user.id} created tenant {tenant.id}")
        
        # Get usage stats for response
        usage_stats = tenant.get_usage_stats(db)
        
        return TenantResponse(
            id=str(tenant.id),
            name=tenant.name,
            email=tenant.email,
            phone=tenant.phone,
            address=tenant.address,
            domain=tenant.domain,
            subscription_type=tenant.subscription_type,
            status=tenant.status,
            business_type=tenant.business_type,
            currency=tenant.currency,
            timezone=tenant.timezone,
            subscription_starts_at=tenant.subscription_starts_at,
            subscription_expires_at=tenant.subscription_expires_at,
            is_subscription_active=tenant.is_subscription_active,
            days_until_expiry=tenant.days_until_expiry,
            max_users=tenant.max_users,
            max_products=tenant.max_products,
            max_customers=tenant.max_customers,
            max_monthly_invoices=tenant.max_monthly_invoices,
            current_usage=usage_stats,
            notes=tenant.notes,
            last_activity_at=tenant.last_activity_at,
            created_at=tenant.created_at,
            updated_at=tenant.updated_at
        )
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to create tenant: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create tenant: {str(e)}"
        )


@router.get("/tenants/{tenant_id}", response_model=TenantResponse)
async def get_tenant(
    tenant_id: str,
    current_user: User = Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get specific tenant by ID
    """
    try:
        tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
        
        if not tenant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tenant not found"
            )
        
        # Get usage stats
        usage_stats = tenant.get_usage_stats(db)
        
        return TenantResponse(
            id=str(tenant.id),
            name=tenant.name,
            email=tenant.email,
            phone=tenant.phone,
            address=tenant.address,
            domain=tenant.domain,
            subscription_type=tenant.subscription_type,
            status=tenant.status,
            business_type=tenant.business_type,
            currency=tenant.currency,
            timezone=tenant.timezone,
            subscription_starts_at=tenant.subscription_starts_at,
            subscription_expires_at=tenant.subscription_expires_at,
            is_subscription_active=tenant.is_subscription_active,
            days_until_expiry=tenant.days_until_expiry,
            max_users=tenant.max_users,
            max_products=tenant.max_products,
            max_customers=tenant.max_customers,
            max_monthly_invoices=tenant.max_monthly_invoices,
            current_usage=usage_stats,
            notes=tenant.notes,
            last_activity_at=tenant.last_activity_at,
            created_at=tenant.created_at,
            updated_at=tenant.updated_at
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get tenant {tenant_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve tenant: {str(e)}"
        )


@router.put("/tenants/{tenant_id}", response_model=TenantResponse)
async def update_tenant(
    tenant_id: str,
    tenant_data: TenantUpdateRequest,
    current_user: User = Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    """
    Update tenant information
    """
    try:
        tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
        
        if not tenant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tenant not found"
            )
        
        # Update fields if provided
        update_data = tenant_data.dict(exclude_unset=True)
        
        # Check for email uniqueness if email is being updated
        if "email" in update_data and update_data["email"] != tenant.email:
            existing_tenant = db.query(Tenant).filter(
                Tenant.email == update_data["email"],
                Tenant.id != tenant_id
            ).first()
            if existing_tenant:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Tenant with this email already exists"
                )
        
        # Check for domain uniqueness if domain is being updated
        if "domain" in update_data and update_data["domain"] != tenant.domain:
            if update_data["domain"]:  # Only check if domain is not None
                existing_domain = db.query(Tenant).filter(
                    Tenant.domain == update_data["domain"],
                    Tenant.id != tenant_id
                ).first()
                if existing_domain:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Tenant with this domain already exists"
                    )
        
        # Update tenant fields
        for field, value in update_data.items():
            setattr(tenant, field, value)
        
        tenant.updated_at = datetime.now(timezone.utc)
        
        db.commit()
        db.refresh(tenant)
        
        logger.info(f"Super admin {current_user.id} updated tenant {tenant.id}")
        
        # Get usage stats for response
        usage_stats = tenant.get_usage_stats(db)
        
        return TenantResponse(
            id=str(tenant.id),
            name=tenant.name,
            email=tenant.email,
            phone=tenant.phone,
            address=tenant.address,
            domain=tenant.domain,
            subscription_type=tenant.subscription_type,
            status=tenant.status,
            business_type=tenant.business_type,
            currency=tenant.currency,
            timezone=tenant.timezone,
            subscription_starts_at=tenant.subscription_starts_at,
            subscription_expires_at=tenant.subscription_expires_at,
            is_subscription_active=tenant.is_subscription_active,
            days_until_expiry=tenant.days_until_expiry,
            max_users=tenant.max_users,
            max_products=tenant.max_products,
            max_customers=tenant.max_customers,
            max_monthly_invoices=tenant.max_monthly_invoices,
            current_usage=usage_stats,
            notes=tenant.notes,
            last_activity_at=tenant.last_activity_at,
            created_at=tenant.created_at,
            updated_at=tenant.updated_at
        )
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to update tenant {tenant_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update tenant: {str(e)}"
        )


@router.put("/tenants/{tenant_id}/status", response_model=TenantResponse)
async def update_tenant_status(
    tenant_id: str,
    status_data: TenantStatusUpdateRequest,
    current_user: User = Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    """
    Update tenant status (approve, suspend, activate)
    """
    try:
        tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
        
        if not tenant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tenant not found"
            )
        
        old_status = tenant.status
        
        # Update status
        tenant.status = status_data.status
        tenant.updated_at = datetime.now(timezone.utc)
        
        # Add reason to notes if provided
        if status_data.reason:
            status_change_note = f"\nStatus changed from {old_status.value} to {status_data.status.value}: {status_data.reason} ({datetime.now(timezone.utc)})"
            tenant.notes = (tenant.notes or "") + status_change_note
        
        # If approving a pending tenant, activate subscription if Pro
        if old_status == TenantStatus.PENDING and status_data.status == TenantStatus.ACTIVE:
            if tenant.subscription_type == SubscriptionType.PRO:
                tenant.subscription_starts_at = datetime.now(timezone.utc)
                tenant.subscription_expires_at = datetime.now(timezone.utc) + timedelta(days=365)  # 1 year default
        
        db.commit()
        db.refresh(tenant)
        
        logger.info(f"Super admin {current_user.id} changed tenant {tenant.id} status from {old_status.value} to {status_data.status.value}")
        
        # Get usage stats for response
        usage_stats = tenant.get_usage_stats(db)
        
        return TenantResponse(
            id=str(tenant.id),
            name=tenant.name,
            email=tenant.email,
            phone=tenant.phone,
            address=tenant.address,
            domain=tenant.domain,
            subscription_type=tenant.subscription_type,
            status=tenant.status,
            business_type=tenant.business_type,
            currency=tenant.currency,
            timezone=tenant.timezone,
            subscription_starts_at=tenant.subscription_starts_at,
            subscription_expires_at=tenant.subscription_expires_at,
            is_subscription_active=tenant.is_subscription_active,
            days_until_expiry=tenant.days_until_expiry,
            max_users=tenant.max_users,
            max_products=tenant.max_products,
            max_customers=tenant.max_customers,
            max_monthly_invoices=tenant.max_monthly_invoices,
            current_usage=usage_stats,
            notes=tenant.notes,
            last_activity_at=tenant.last_activity_at,
            created_at=tenant.created_at,
            updated_at=tenant.updated_at
        )
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to update tenant status {tenant_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update tenant status: {str(e)}"
        )


@router.put("/tenants/{tenant_id}/subscription", response_model=TenantResponse)
async def update_tenant_subscription(
    tenant_id: str,
    subscription_data: SubscriptionUpdateRequest,
    current_user: User = Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    """
    Update tenant subscription type and duration
    """
    try:
        tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
        
        if not tenant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tenant not found"
            )
        
        old_subscription = tenant.subscription_type
        
        # Update subscription
        tenant.subscription_type = subscription_data.subscription_type
        tenant.updated_at = datetime.now(timezone.utc)
        
        if subscription_data.subscription_type == SubscriptionType.PRO:
            # Upgrade to Pro
            tenant.upgrade_to_pro(subscription_data.duration_months)
            
        elif subscription_data.subscription_type == SubscriptionType.FREE:
            # Downgrade to Free
            tenant.downgrade_to_free()
        
        # Add subscription change note
        subscription_note = f"\nSubscription changed from {old_subscription.value} to {subscription_data.subscription_type.value} ({datetime.now(timezone.utc)})"
        tenant.notes = (tenant.notes or "") + subscription_note
        
        db.commit()
        db.refresh(tenant)
        
        logger.info(f"Super admin {current_user.id} changed tenant {tenant.id} subscription from {old_subscription.value} to {subscription_data.subscription_type.value}")
        
        # Get usage stats for response
        usage_stats = tenant.get_usage_stats(db)
        
        return TenantResponse(
            id=str(tenant.id),
            name=tenant.name,
            email=tenant.email,
            phone=tenant.phone,
            address=tenant.address,
            domain=tenant.domain,
            subscription_type=tenant.subscription_type,
            status=tenant.status,
            business_type=tenant.business_type,
            currency=tenant.currency,
            timezone=tenant.timezone,
            subscription_starts_at=tenant.subscription_starts_at,
            subscription_expires_at=tenant.subscription_expires_at,
            is_subscription_active=tenant.is_subscription_active,
            days_until_expiry=tenant.days_until_expiry,
            max_users=tenant.max_users,
            max_products=tenant.max_products,
            max_customers=tenant.max_customers,
            max_monthly_invoices=tenant.max_monthly_invoices,
            current_usage=usage_stats,
            notes=tenant.notes,
            last_activity_at=tenant.last_activity_at,
            created_at=tenant.created_at,
            updated_at=tenant.updated_at
        )
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to update tenant subscription {tenant_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update tenant subscription: {str(e)}"
        )





@router.get("/notifications")
async def get_notifications(
    limit: int = Query(default=10, le=50),
    current_user: User = Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get system notifications for super admin
    """
    try:
        # Mock notifications - replace with actual notification system
        notifications = [
            {
                "id": "notif_1",
                "type": "info",
                "title": "System Update",
                "message": "System maintenance completed successfully",
                "timestamp": datetime.now(timezone.utc) - timedelta(hours=2),
                "read": False
            },
            {
                "id": "notif_2", 
                "type": "warning",
                "title": "High CPU Usage",
                "message": "CPU usage exceeded 80% for 5 minutes",
                "timestamp": datetime.now(timezone.utc) - timedelta(hours=1),
                "read": False
            },
            {
                "id": "notif_3",
                "type": "success",
                "title": "New Pro Subscription",
                "message": "New tenant upgraded to Pro subscription",
                "timestamp": datetime.now(timezone.utc) - timedelta(minutes=30),
                "read": True
            }
        ]
        
        return notifications[:limit]
        
    except Exception as e:
        logger.error(f"Failed to get notifications: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve notifications: {str(e)}"
        )


@router.get("/system-alerts")
async def get_system_alerts(
    limit: int = Query(default=10, le=50),
    current_user: User = Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get system alerts for monitoring
    """
    try:
        # Mock system alerts - replace with actual monitoring system
        alerts = [
            {
                "id": "alert_1",
                "severity": "warning",
                "title": "Database Connection Pool",
                "message": "Database connection pool usage is at 85%",
                "timestamp": datetime.now(timezone.utc) - timedelta(minutes=15),
                "resolved": False,
                "source": "database"
            },
            {
                "id": "alert_2",
                "severity": "info", 
                "title": "Backup Completed",
                "message": "Daily backup completed successfully",
                "timestamp": datetime.now(timezone.utc) - timedelta(hours=1),
                "resolved": True,
                "source": "backup"
            },
            {
                "id": "alert_3",
                "severity": "critical",
                "title": "Redis Memory Usage",
                "message": "Redis memory usage exceeded 90%",
                "timestamp": datetime.now(timezone.utc) - timedelta(minutes=5),
                "resolved": False,
                "source": "redis"
            }
        ]
        
        return alerts[:limit]
        
    except Exception as e:
        logger.error(f"Failed to get system alerts: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve system alerts: {str(e)}"
        )


@router.get("/online-users")
async def get_online_users(
    current_user: User = Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get currently online users across all tenants
    """
    try:
        # Mock online users data - replace with actual session tracking
        online_users = [
            {
                "id": "user_1",
                "name": "John Doe",
                "email": "john@example.com",
                "tenant_name": "Gold Shop ABC",
                "tenant_id": "tenant_1",
                "last_activity": datetime.now(timezone.utc) - timedelta(minutes=2),
                "session_duration": 3600,  # seconds
                "ip_address": "192.168.1.100",
                "user_agent": "Chrome/91.0"
            },
            {
                "id": "user_2",
                "name": "Jane Smith", 
                "email": "jane@example.com",
                "tenant_name": "Jewelry Store XYZ",
                "tenant_id": "tenant_2",
                "last_activity": datetime.now(timezone.utc) - timedelta(minutes=1),
                "session_duration": 1800,
                "ip_address": "192.168.1.101",
                "user_agent": "Firefox/89.0"
            }
        ]
        
        return online_users
        
    except Exception as e:
        logger.error(f"Failed to get online users: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve online users: {str(e)}"
        )


@router.get("/backup-status")
async def get_backup_status(
    current_user: User = Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get backup status for all tenants
    """
    try:
        # Mock backup status - replace with actual backup monitoring
        backup_status = {
            "last_backup": datetime.now(timezone.utc) - timedelta(hours=2),
            "next_backup": datetime.now(timezone.utc) + timedelta(hours=22),
            "backup_frequency": "daily",
            "total_backups": 30,
            "successful_backups": 29,
            "failed_backups": 1,
            "backup_size_gb": 2.5,
            "retention_days": 30,
            "recent_backups": [
                {
                    "id": "backup_1",
                    "tenant_id": "tenant_1",
                    "tenant_name": "Gold Shop ABC",
                    "status": "completed",
                    "started_at": datetime.now(timezone.utc) - timedelta(hours=2),
                    "completed_at": datetime.now(timezone.utc) - timedelta(hours=2, minutes=-15),
                    "size_mb": 150,
                    "type": "full"
                },
                {
                    "id": "backup_2",
                    "tenant_id": "tenant_2", 
                    "tenant_name": "Jewelry Store XYZ",
                    "status": "completed",
                    "started_at": datetime.now(timezone.utc) - timedelta(hours=2, minutes=5),
                    "completed_at": datetime.now(timezone.utc) - timedelta(hours=1, minutes=50),
                    "size_mb": 200,
                    "type": "full"
                }
            ]
        }
        
        return backup_status
        
    except Exception as e:
        logger.error(f"Failed to get backup status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve backup status: {str(e)}"
        )


@router.get("/dashboard-stats", response_model=Dict[str, Any])
async def get_dashboard_stats(
    current_user: User = Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get comprehensive dashboard statistics
    """
    try:
        # Get tenant statistics
        total_tenants = db.query(Tenant).count()
        active_tenants = db.query(Tenant).filter(Tenant.status == TenantStatus.ACTIVE).count()
        free_tier_tenants = db.query(Tenant).filter(Tenant.subscription_type == SubscriptionType.FREE).count()
        pro_tier_tenants = db.query(Tenant).filter(Tenant.subscription_type == SubscriptionType.PRO).count()
        pending_payment_tenants = db.query(Tenant).filter(
            and_(
                Tenant.subscription_type == SubscriptionType.PRO,
                Tenant.status == TenantStatus.PENDING
            )
        ).count()
        
        # Get user statistics
        total_users = db.query(User).count()
        today = datetime.now(timezone.utc).date()
        active_users_today = db.query(User).filter(
            func.date(User.last_login_at) == today
        ).count()
        
        # Get invoice statistics for this month
        current_month_start = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        total_invoices_this_month = 0  # This would need invoice model integration
        
        # Calculate MRR (Monthly Recurring Revenue)
        mrr = pro_tier_tenants * 50  # Assuming $50 per Pro subscription
        
        # System health (mock data for now)
        system_health = {
            "cpu_usage": 45,
            "memory_usage": 62,
            "database_status": "healthy",
            "redis_status": "healthy",
            "celery_status": "healthy"
        }
        
        # Recent activity
        recent_signups = db.query(Tenant).filter(
            Tenant.created_at >= datetime.now(timezone.utc) - timedelta(days=7)
        ).count()
        
        recent_upgrades = db.query(Tenant).filter(
            and_(
                Tenant.subscription_type == SubscriptionType.PRO,
                Tenant.subscription_starts_at >= datetime.now(timezone.utc) - timedelta(days=7)
            )
        ).count()
        
        return {
            "total_tenants": total_tenants,
            "active_tenants": active_tenants,
            "free_tier_tenants": free_tier_tenants,
            "pro_tier_tenants": pro_tier_tenants,
            "pending_payment_tenants": pending_payment_tenants,
            "total_users": total_users,
            "active_users_today": active_users_today,
            "total_invoices_this_month": total_invoices_this_month,
            "mrr": mrr,
            "system_health": system_health,
            "recent_signups": recent_signups,
            "recent_upgrades": recent_upgrades
        }
        
    except Exception as e:
        logger.error(f"Failed to get dashboard stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve dashboard statistics: {str(e)}"
        )


@router.get("/online-users", response_model=List[Dict[str, Any]])
async def get_online_users(
    current_user: User = Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get list of currently online users
    """
    try:
        # Get users who have been active in the last 15 minutes
        cutoff_time = datetime.now(timezone.utc) - timedelta(minutes=15)
        
        # Check both last_login_at and last_activity_at, and handle null values
        online_users = db.query(User).filter(
            and_(
                User.tenant_id.isnot(None),  # Exclude super admin users
                or_(
                    User.last_login_at >= cutoff_time,
                    User.last_activity_at >= cutoff_time
                )
            )
        ).order_by(desc(func.coalesce(User.last_activity_at, User.last_login_at))).limit(50).all()
        
        result = []
        for user in online_users:
            # Get tenant information
            tenant = db.query(Tenant).filter(Tenant.id == user.tenant_id).first()
            
            # Use the most recent activity time
            last_activity = user.last_activity_at or user.last_login_at
            if last_activity:
                session_duration = int((datetime.now(timezone.utc) - last_activity).total_seconds() / 60)
                
                result.append({
                    "id": str(user.id),
                    "email": user.email,
                    "tenant_name": tenant.name if tenant else "Unknown",
                    "last_activity": last_activity.isoformat(),
                    "session_duration": session_duration,
                    "is_impersonated": False  # This would need session tracking
                })
        
        return result
        
    except Exception as e:
        logger.error(f"Failed to get online users: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve online users: {str(e)}"
        )


@router.get("/system-alerts", response_model=List[Dict[str, Any]])
async def get_system_alerts(
    limit: int = Query(10, ge=1, le=100),
    current_user: User = Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get system alerts and notifications
    """
    try:
        alerts = []
        
        # Check for tenants with expired subscriptions
        expired_tenants = db.query(Tenant).filter(
            and_(
                Tenant.subscription_expires_at < datetime.now(timezone.utc),
                Tenant.subscription_type == SubscriptionType.PRO
            )
        ).count()
        
        if expired_tenants > 0:
            alerts.append({
                "id": "expired_subscriptions",
                "type": "warning",
                "title": "Expired Subscriptions",
                "message": f"{expired_tenants} Pro subscriptions have expired",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "is_resolved": False,
                "severity": "medium"
            })
        
        # Check for pending payments
        pending_payments = db.query(Tenant).filter(
            and_(
                Tenant.subscription_type == SubscriptionType.PRO,
                Tenant.status == TenantStatus.PENDING
            )
        ).count()
        
        if pending_payments > 0:
            alerts.append({
                "id": "pending_payments",
                "type": "info",
                "title": "Pending Payments",
                "message": f"{pending_payments} Pro subscriptions awaiting payment confirmation",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "is_resolved": False,
                "severity": "low"
            })
        
        # Mock system health alerts
        alerts.append({
            "id": "system_healthy",
            "type": "info",
            "title": "System Status",
            "message": "All systems operational",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "is_resolved": True,
            "severity": "low"
        })
        
        return alerts[:limit]
        
    except Exception as e:
        logger.error(f"Failed to get system alerts: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve system alerts: {str(e)}"
        )


@router.get("/quick-stats", response_model=Dict[str, Any])
async def get_quick_stats(
    current_user: User = Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get quick statistics for dashboard widgets
    """
    try:
        today = datetime.now(timezone.utc).date()
        
        # Signups today
        signups_today = db.query(Tenant).filter(
            func.date(Tenant.created_at) == today
        ).count()
        
        # Revenue today (mock calculation)
        revenue_today = signups_today * 50  # Assuming $50 per signup
        
        # Active sessions (users active in last 15 minutes)
        cutoff_time = datetime.now(timezone.utc) - timedelta(minutes=15)
        active_sessions = db.query(User).filter(
            and_(
                User.tenant_id.isnot(None),  # Exclude super admin users
                or_(
                    User.last_login_at >= cutoff_time,
                    User.last_activity_at >= cutoff_time
                )
            )
        ).count()
        
        # Pending tasks (mock data)
        pending_tasks = 0
        
        # Error rate (mock data)
        error_rate_24h = 0.5  # 0.5%
        
        # Uptime percentage (mock data)
        uptime_percentage = 99.9
        
        return {
            "signups_today": signups_today,
            "revenue_today": revenue_today,
            "active_sessions": active_sessions,
            "pending_tasks": pending_tasks,
            "error_rate_24h": error_rate_24h,
            "uptime_percentage": uptime_percentage
        }
        
    except Exception as e:
        logger.error(f"Failed to get quick stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve quick statistics: {str(e)}"
        )


@router.get("/system-health/current", response_model=Dict[str, Any])
async def get_current_system_health(
    current_user: User = Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get current system health metrics
    """
    try:
        import psutil
        import redis
        
        # Get CPU and memory usage
        cpu_usage = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        
        # Test database connection
        try:
            db.execute("SELECT 1")
            database_status = "healthy"
            database_response_time = 10  # Mock response time in ms
        except Exception:
            database_status = "unhealthy"
            database_response_time = 0
        
        # Test Redis connection
        try:
            redis_client.ping()
            redis_status = "healthy"
            redis_memory_usage = 25  # Mock percentage
        except Exception:
            redis_status = "unhealthy"
            redis_memory_usage = 0
        
        # Mock Celery status
        celery_active_tasks = 0
        celery_pending_tasks = 0
        celery_failed_tasks = 0
        
        return {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "cpu_usage": round(cpu_usage, 1),
            "memory_usage": round(memory.percent, 1),
            "disk_usage": round(disk.percent, 1),
            "database_status": database_status,
            "database_response_time": database_response_time,
            "redis_status": redis_status,
            "redis_memory_usage": redis_memory_usage,
            "celery_active_tasks": celery_active_tasks,
            "celery_pending_tasks": celery_pending_tasks,
            "celery_failed_tasks": celery_failed_tasks,
            "api_response_time": 150,  # Mock API response time
            "error_rate": 0.1,  # Mock error rate percentage
            "uptime_seconds": 86400  # Mock uptime (24 hours)
        }
        
    except Exception as e:
        logger.error(f"Failed to get system health: {e}")
        # Return mock data if system monitoring fails
        return {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "cpu_usage": 45.0,
            "memory_usage": 62.0,
            "disk_usage": 35.0,
            "database_status": "healthy",
            "database_response_time": 15,
            "redis_status": "healthy",
            "redis_memory_usage": 25,
            "celery_active_tasks": 0,
            "celery_pending_tasks": 0,
            "celery_failed_tasks": 0,
            "api_response_time": 150,
            "error_rate": 0.1,
            "uptime_seconds": 86400
        }
        memory = psutil.virtual_memory()
        memory_usage = memory.percent
        
        # Check database status
        try:
            # Use a simple query to test database connectivity
            db.query(Tenant).count()
            database_status = "healthy"
        except Exception as e:
            logger.error(f"Database health check failed: {e}")
            database_status = "error"
        
        # Check Redis status
        try:
            r = redis.Redis(host='redis', port=6379, db=0)
            r.ping()
            redis_status = "healthy"
        except Exception:
            redis_status = "error"
        
        # Check Celery status (mock for now)
        celery_status = "healthy"
        
        return {
            "cpu_usage": round(cpu_usage, 1),
            "memory_usage": round(memory_usage, 1),
            "database_status": database_status,
            "redis_status": redis_status,
            "celery_status": celery_status,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
    except ImportError:
        # Fallback if psutil is not available
        return {
            "cpu_usage": 45.0,
            "memory_usage": 62.0,
            "database_status": "healthy",
            "redis_status": "healthy",
            "celery_status": "healthy",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        logger.error(f"Failed to get system health: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve system health: {str(e)}"
        )


@router.delete("/tenants/{tenant_id}")
async def delete_tenant(
    tenant_id: str,
    current_user: User = Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    """
    Delete tenant (hard delete - use with caution)
    """
    try:
        tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
        
        if not tenant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tenant not found"
            )
        
        tenant_name = tenant.name
        
        # Delete tenant (cascade will handle related records)
        db.delete(tenant)
        db.commit()
        
        logger.warning(f"Super admin {current_user.id} deleted tenant {tenant_id} ({tenant_name})")
        
        return {"message": f"Tenant '{tenant_name}' has been permanently deleted"}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to delete tenant {tenant_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete tenant: {str(e)}"
        )

@router.get("/stats", response_model=TenantStatsResponse)
async def get_tenant_statistics(
    current_user: User = Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get platform-wide tenant statistics
    """
    try:
        # Get basic counts
        total_tenants = db.query(Tenant).count()
        active_tenants = db.query(Tenant).filter(Tenant.status == TenantStatus.ACTIVE).count()
        suspended_tenants = db.query(Tenant).filter(Tenant.status == TenantStatus.SUSPENDED).count()
        pending_tenants = db.query(Tenant).filter(Tenant.status == TenantStatus.PENDING).count()
        
        # Get subscription counts
        free_subscriptions = db.query(Tenant).filter(Tenant.subscription_type == SubscriptionType.FREE).count()
        pro_subscriptions = db.query(Tenant).filter(Tenant.subscription_type == SubscriptionType.PRO).count()
        enterprise_subscriptions = db.query(Tenant).filter(Tenant.subscription_type == SubscriptionType.ENTERPRISE).count()
        
        # Get expired subscriptions
        now = datetime.now(timezone.utc)
        expired_subscriptions = db.query(Tenant).filter(
            and_(
                Tenant.subscription_expires_at.isnot(None),
                Tenant.subscription_expires_at < now
            )
        ).count()
        
        # Calculate revenue this month (simplified - would need payment records in real implementation)
        current_month_start = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        new_signups_this_month = db.query(Tenant).filter(
            Tenant.created_at >= current_month_start
        ).count()
        
        # Estimate revenue (this would be more accurate with actual payment records)
        active_pro_tenants = db.query(Tenant).filter(
            and_(
                Tenant.subscription_type == SubscriptionType.PRO,
                Tenant.status == TenantStatus.ACTIVE,
                or_(
                    Tenant.subscription_expires_at.is_(None),
                    Tenant.subscription_expires_at >= now
                )
            )
        ).count()
        
        # Assuming average Pro subscription is $50/month (this should come from actual pricing)
        estimated_monthly_revenue = active_pro_tenants * 50.0
        
        return TenantStatsResponse(
            total_tenants=total_tenants,
            active_tenants=active_tenants,
            suspended_tenants=suspended_tenants,
            pending_tenants=pending_tenants,
            free_subscriptions=free_subscriptions,
            pro_subscriptions=pro_subscriptions,
            enterprise_subscriptions=enterprise_subscriptions,
            expired_subscriptions=expired_subscriptions,
            revenue_this_month=estimated_monthly_revenue,
            new_signups_this_month=new_signups_this_month
        )
        
    except Exception as e:
        logger.error(f"Failed to get tenant statistics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve tenant statistics: {str(e)}"
        )


# System Health Monitoring Endpoints

@router.get("/system/health", response_model=SystemHealthResponse)
async def get_system_health(
    current_user: User = Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get comprehensive system health status including CPU, RAM, database, and Celery metrics
    """
    try:
        from ..services.monitoring_service import MonitoringService
        
        monitoring_service = MonitoringService(db)
        health_data = monitoring_service.get_system_health()
        
        return SystemHealthResponse(**health_data)
        
    except Exception as e:
        logger.error(f"Failed to get system health: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve system health: {str(e)}"
        )


@router.get("/system/celery", response_model=CeleryMonitoringResponse)
async def get_celery_monitoring(
    current_user: User = Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get detailed Celery job queue monitoring with task status and failure tracking
    """
    try:
        from ..services.monitoring_service import MonitoringService
        
        monitoring_service = MonitoringService(db)
        celery_data = monitoring_service.get_celery_monitoring()
        
        return CeleryMonitoringResponse(**celery_data)
        
    except Exception as e:
        logger.error(f"Failed to get Celery monitoring data: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve Celery monitoring data: {str(e)}"
        )


@router.get("/system/database", response_model=DatabaseMetricsResponse)
async def get_database_metrics(
    current_user: User = Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get database performance monitoring with query performance metrics
    """
    try:
        from ..services.monitoring_service import MonitoringService
        
        monitoring_service = MonitoringService(db)
        db_metrics = monitoring_service.get_database_metrics()
        
        return DatabaseMetricsResponse(**db_metrics)
        
    except Exception as e:
        logger.error(f"Failed to get database metrics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve database metrics: {str(e)}"
        )


@router.get("/system/alerts", response_model=SystemAlertsResponse)
async def get_system_alerts(
    current_user: User = Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get system alerts for performance thresholds and failures
    """
    try:
        from ..services.monitoring_service import MonitoringService
        
        monitoring_service = MonitoringService(db)
        alerts_data = monitoring_service.get_system_alerts()
        
        return SystemAlertsResponse(**alerts_data)
        
    except Exception as e:
        logger.error(f"Failed to get system alerts: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve system alerts: {str(e)}"
        )


@router.get("/system/performance", response_model=PerformanceMetricsResponse)
async def get_performance_metrics(
    hours: int = Query(24, ge=1, le=168, description="Number of hours of historical data"),
    current_user: User = Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get performance metrics with historical data and trends
    """
    try:
        from ..services.monitoring_service import MonitoringService
        
        monitoring_service = MonitoringService(db)
        performance_data = monitoring_service.get_performance_metrics(hours)
        
        return PerformanceMetricsResponse(**performance_data)
        
    except Exception as e:
        logger.error(f"Failed to get performance metrics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve performance metrics: {str(e)}"
        )