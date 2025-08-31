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
    TenantActivityResponse, BulkTenantActionRequest, BulkTenantActionResponse
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