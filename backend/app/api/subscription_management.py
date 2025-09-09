"""
Professional Subscription Management API
Enhanced endpoints for manual subscription control by super admins
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import logging

from ..core.database import get_db
from ..core.auth import get_super_admin_user
from ..models.user import User
from ..models.tenant import Tenant, SubscriptionType, TenantStatus
from ..models.subscription_history import SubscriptionHistory, SubscriptionAction
from ..schemas.subscription_management import (
    SubscriptionOverviewResponse,
    SubscriptionExtensionRequest,
    SubscriptionExtensionResponse,
    SubscriptionStatusUpdateRequest,
    SubscriptionStatusResponse,
    SubscriptionPlanSwitchRequest,
    SubscriptionPlanSwitchResponse,
    SubscriptionHistoryResponse,
    TenantSubscriptionDetails,
    SubscriptionStatsResponse,
    BulkSubscriptionActionRequest,
    BulkSubscriptionActionResponse,
    SubscriptionRenewalRequest,
    SubscriptionRenewalResponse
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/subscription-management", tags=["Professional Subscription Management"])


@router.get("/overview", response_model=SubscriptionOverviewResponse)
async def get_subscription_overview(
    current_admin: User = Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get comprehensive subscription overview and statistics
    """
    try:
        # Get subscription counts
        total_tenants = db.query(Tenant).count()
        free_tenants = db.query(Tenant).filter(Tenant.subscription_type == SubscriptionType.FREE).count()
        pro_tenants = db.query(Tenant).filter(Tenant.subscription_type == SubscriptionType.PRO).count()
        
        # Get expiring subscriptions (next 30 days)
        thirty_days_from_now = datetime.now(timezone.utc) + timedelta(days=30)
        expiring_soon = db.query(Tenant).filter(
            Tenant.subscription_type == SubscriptionType.PRO,
            Tenant.subscription_expires_at <= thirty_days_from_now,
            Tenant.subscription_expires_at > datetime.now(timezone.utc)
        ).count()
        
        # Get expired subscriptions
        expired = db.query(Tenant).filter(
            Tenant.subscription_type == SubscriptionType.PRO,
            Tenant.subscription_expires_at < datetime.now(timezone.utc)
        ).count()
        
        return SubscriptionOverviewResponse(
            total_tenants=total_tenants,
            free_subscriptions=free_tenants,
            pro_subscriptions=pro_tenants,
            expiring_soon=expiring_soon,
            expired=expired,
            conversion_rate=(pro_tenants / total_tenants * 100) if total_tenants > 0 else 0
        )
        
    except Exception as e:
        logger.error(f"Failed to get subscription overview: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get subscription overview: {str(e)}"
        )


@router.post("/tenants/{tenant_id}/extend", response_model=SubscriptionExtensionResponse)
async def extend_subscription(
    tenant_id: str,
    extension_data: SubscriptionExtensionRequest,
    request: Request,
    current_admin: User = Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    """
    Extend tenant subscription by specified number of months
    """
    try:
        tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
        if not tenant:
            raise HTTPException(status_code=404, detail="Tenant not found")
        
        # Store old expiration for history
        old_expiration = tenant.subscription_expires_at
        
        # Calculate new expiration date
        if tenant.subscription_expires_at and tenant.subscription_expires_at > datetime.now(timezone.utc):
            # Extend from current expiration date
            new_expiration = tenant.subscription_expires_at + timedelta(days=30 * extension_data.months)
        else:
            # Start from now if expired or no expiration set
            new_expiration = datetime.now(timezone.utc) + timedelta(days=30 * extension_data.months)
        
        # Update subscription
        old_subscription_type = tenant.subscription_type.value
        tenant.subscription_expires_at = new_expiration
        
        # Ensure tenant is Pro if extending
        if tenant.subscription_type != SubscriptionType.PRO:
            tenant.subscription_type = SubscriptionType.PRO
            tenant.upgrade_to_pro_limits()
        
        # Activate tenant if suspended
        if tenant.status != TenantStatus.ACTIVE:
            tenant.status = TenantStatus.ACTIVE
        
        # Create subscription history entry
        history_entry = SubscriptionHistory.create_history_entry(
            tenant_id=tenant_id,
            action="EXTENDED",
            old_subscription_type=old_subscription_type,
            new_subscription_type=tenant.subscription_type.value,
            duration_months=extension_data.months,
            old_expiry_date=old_expiration,
            new_expiry_date=new_expiration,
            reason=extension_data.reason,
            admin_id=str(current_admin.id),
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent")
        )
        
        db.add(history_entry)
        
        # Log the extension
        extension_note = f"\nSubscription extended by {extension_data.months} months by admin {current_admin.email}"
        extension_note += f"\nOld expiration: {old_expiration}"
        extension_note += f"\nNew expiration: {new_expiration}"
        if extension_data.reason:
            extension_note += f"\nReason: {extension_data.reason}"
        extension_note += f"\nDate: {datetime.now(timezone.utc)}"
        
        tenant.notes = (tenant.notes or "") + extension_note
        tenant.updated_at = datetime.now(timezone.utc)
        
        db.commit()
        
        logger.info(f"Subscription extended for tenant {tenant_id} by {extension_data.months} months by admin {current_admin.email}")
        
        return SubscriptionExtensionResponse(
            success=True,
            message=f"Subscription extended by {extension_data.months} months",
            tenant_id=tenant_id,
            old_expiration_date=old_expiration.isoformat() if old_expiration else None,
            new_expiration_date=new_expiration.isoformat(),
            months_added=extension_data.months,
            days_added=30 * extension_data.months
        )
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to extend subscription for tenant {tenant_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to extend subscription: {str(e)}"
        )


@router.put("/tenants/{tenant_id}/status", response_model=SubscriptionStatusResponse)
async def update_subscription_status(
    tenant_id: str,
    status_data: SubscriptionStatusUpdateRequest,
    request: Request,
    current_admin: User = Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    """
    Activate or deactivate tenant subscription with real-time permission updates
    """
    try:
        tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
        if not tenant:
            raise HTTPException(status_code=404, detail="Tenant not found")
        
        old_status = tenant.status.value
        old_subscription = tenant.subscription_type.value
        
        if status_data.activate:
            # Activate subscription
            tenant.status = TenantStatus.ACTIVE
            if status_data.subscription_type:
                if isinstance(status_data.subscription_type, str):
                    tenant.subscription_type = SubscriptionType(status_data.subscription_type)
                else:
                    tenant.subscription_type = SubscriptionType(status_data.subscription_type.value)
                
                if status_data.subscription_type == SubscriptionType.PRO:
                    tenant.upgrade_to_pro_limits()
                    # Set expiration if not set
                    if not tenant.subscription_expires_at:
                        tenant.subscription_expires_at = datetime.now(timezone.utc) + timedelta(days=365)
                        tenant.subscription_starts_at = datetime.now(timezone.utc)
                else:
                    tenant.downgrade_to_free_limits()
            
            action = "ACTIVATED"
        else:
            # Deactivate subscription
            tenant.status = TenantStatus.SUSPENDED
            action = "DEACTIVATED"
        
        # Create subscription history entry
        history_entry = SubscriptionHistory.create_history_entry(
            tenant_id=tenant_id,
            action=action,
            old_subscription_type=old_subscription,
            new_subscription_type=tenant.subscription_type.value,
            reason=status_data.reason,
            admin_id=str(current_admin.id),
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent")
        )
        
        db.add(history_entry)
        
        # Log the status change
        status_note = f"\nSubscription status changed by admin {current_admin.email}"
        status_note += f"\nOld status: {old_status}, New status: {tenant.status.value}"
        status_note += f"\nOld subscription: {old_subscription}, New subscription: {tenant.subscription_type.value}"
        if status_data.reason:
            status_note += f"\nReason: {status_data.reason}"
        status_note += f"\nDate: {datetime.now(timezone.utc)}"
        
        tenant.notes = (tenant.notes or "") + status_note
        tenant.updated_at = datetime.now(timezone.utc)
        
        db.commit()
        
        logger.info(f"Subscription status updated for tenant {tenant_id} by admin {current_admin.email}")
        
        return SubscriptionStatusResponse(
            success=True,
            message="Subscription status updated successfully",
            tenant_id=tenant_id,
            old_status=old_status,
            new_status=tenant.status.value,
            old_subscription_type=old_subscription,
            new_subscription_type=tenant.subscription_type.value
        )
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to update subscription status for tenant {tenant_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to update subscription status: {str(e)}"
        )


@router.put("/tenants/{tenant_id}/plan", response_model=SubscriptionPlanSwitchResponse)
async def switch_subscription_plan(
    tenant_id: str,
    plan_data: SubscriptionPlanSwitchRequest,
    request: Request,
    current_admin: User = Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    """
    Switch tenant subscription plan with immediate effect on permissions
    """
    try:
        tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
        if not tenant:
            raise HTTPException(status_code=404, detail="Tenant not found")
        
        old_plan = tenant.subscription_type.value
        old_expiration = tenant.subscription_expires_at
        
        # Determine action type
        if tenant.subscription_type == SubscriptionType.FREE and plan_data.new_plan == SubscriptionType.PRO:
            action = "UPGRADED"
        elif tenant.subscription_type == SubscriptionType.PRO and plan_data.new_plan == SubscriptionType.FREE:
            action = "DOWNGRADED"
        else:
            action = "UPGRADED"  # Default for other changes
        
        # Update subscription plan
        if isinstance(plan_data.new_plan, str):
            tenant.subscription_type = SubscriptionType(plan_data.new_plan)
        else:
            tenant.subscription_type = SubscriptionType(plan_data.new_plan.value)
        
        if plan_data.new_plan == SubscriptionType.PRO:
            tenant.upgrade_to_pro_limits()
            # Set expiration based on duration
            if plan_data.duration_months:
                if old_expiration and old_expiration > datetime.now(timezone.utc):
                    # Extend from current expiration
                    tenant.subscription_expires_at = old_expiration + timedelta(days=30 * plan_data.duration_months)
                else:
                    # Start from now
                    tenant.subscription_expires_at = datetime.now(timezone.utc) + timedelta(days=30 * plan_data.duration_months)
                    tenant.subscription_starts_at = datetime.now(timezone.utc)
        else:
            tenant.downgrade_to_free_limits()
            tenant.subscription_expires_at = None
        
        # Ensure tenant is active
        if tenant.status != TenantStatus.ACTIVE:
            tenant.status = TenantStatus.ACTIVE
        
        # Create subscription history entry
        history_entry = SubscriptionHistory.create_history_entry(
            tenant_id=tenant_id,
            action=action,
            old_subscription_type=old_plan,
            new_subscription_type=tenant.subscription_type.value,
            duration_months=plan_data.duration_months,
            old_expiry_date=old_expiration,
            new_expiry_date=tenant.subscription_expires_at,
            reason=plan_data.reason,
            admin_id=str(current_admin.id),
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent")
        )
        
        db.add(history_entry)
        
        # Log the plan change
        plan_note = f"\nSubscription plan changed by admin {current_admin.email}"
        plan_note += f"\nOld plan: {old_plan}, New plan: {tenant.subscription_type.value}"
        plan_note += f"\nOld expiration: {old_expiration}, New expiration: {tenant.subscription_expires_at}"
        if plan_data.reason:
            plan_note += f"\nReason: {plan_data.reason}"
        plan_note += f"\nDate: {datetime.now(timezone.utc)}"
        
        tenant.notes = (tenant.notes or "") + plan_note
        tenant.updated_at = datetime.now(timezone.utc)
        
        db.commit()
        
        logger.info(f"Subscription plan switched for tenant {tenant_id} from {old_plan} to {tenant.subscription_type.value} by admin {current_admin.email}")
        
        return SubscriptionPlanSwitchResponse(
            success=True,
            message=f"Subscription plan switched from {old_plan} to {tenant.subscription_type.value}",
            tenant_id=tenant_id,
            old_plan=old_plan,
            new_plan=tenant.subscription_type.value,
            old_expiration=old_expiration.isoformat() if old_expiration else None,
            new_expiration=tenant.subscription_expires_at.isoformat() if tenant.subscription_expires_at else None,
            limits_updated=True
        )
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to switch subscription plan for tenant {tenant_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to switch subscription plan: {str(e)}"
        )


@router.get("/tenants/{tenant_id}/history", response_model=SubscriptionHistoryResponse)
async def get_subscription_history(
    tenant_id: str,
    limit: int = Query(50, le=200),
    current_admin: User = Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get subscription history for a tenant with admin actions and change reasons
    """
    try:
        tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
        if not tenant:
            raise HTTPException(status_code=404, detail="Tenant not found")
        
        # Get subscription history
        history_entries = db.query(SubscriptionHistory).filter(
            SubscriptionHistory.tenant_id == tenant_id
        ).order_by(SubscriptionHistory.change_date.desc()).limit(limit).all()
        
        # Format history entries
        history = []
        for entry in history_entries:
            admin_info = None
            if entry.admin:
                admin_info = {
                    "email": entry.admin.email,
                    "name": f"{entry.admin.first_name} {entry.admin.last_name}".strip()
                }
            
            history.append({
                "id": str(entry.id),
                "action": entry.action,
                "old_subscription_type": entry.old_subscription_type,
                "new_subscription_type": entry.new_subscription_type,
                "duration_months": entry.duration_months,
                "old_expiry_date": entry.old_expiry_date.isoformat() if entry.old_expiry_date else None,
                "new_expiry_date": entry.new_expiry_date.isoformat() if entry.new_expiry_date else None,
                "reason": entry.reason,
                "notes": entry.notes,
                "change_date": entry.change_date.isoformat(),
                "admin_email": admin_info["email"] if admin_info else None,
                "admin_name": admin_info["name"] if admin_info else None
            })
        
        return SubscriptionHistoryResponse(
            tenant_id=tenant_id,
            tenant_name=tenant.name,
            history=history,
            total_entries=len(history),
            current_subscription=tenant.subscription_type.value,
            current_expiry=tenant.subscription_expires_at.isoformat() if tenant.subscription_expires_at else None
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get subscription history for tenant {tenant_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get subscription history: {str(e)}"
        )


@router.get("/tenants/{tenant_id}/details", response_model=TenantSubscriptionDetails)
async def get_tenant_subscription_details(
    tenant_id: str,
    current_admin: User = Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get detailed subscription information for a specific tenant
    """
    try:
        tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
        if not tenant:
            raise HTTPException(status_code=404, detail="Tenant not found")
        
        # Get usage statistics
        usage_stats = tenant.get_usage_stats(db)
        
        # Get limits based on subscription type
        if tenant.subscription_type == SubscriptionType.PRO:
            limits = {
                'users': tenant.max_users,
                'products': -1,  # Unlimited
                'customers': -1,  # Unlimited
                'monthly_invoices': -1  # Unlimited
            }
        else:
            limits = {
                'users': tenant.max_users,
                'products': tenant.max_products,
                'customers': tenant.max_customers,
                'monthly_invoices': tenant.max_monthly_invoices
            }
        
        return TenantSubscriptionDetails(
            tenant_id=tenant_id,
            tenant_name=tenant.name,
            tenant_email=tenant.email,
            subscription_type=tenant.subscription_type.value,
            subscription_status=tenant.status.value,
            subscription_starts_at=tenant.subscription_starts_at.isoformat() if tenant.subscription_starts_at else None,
            subscription_expires_at=tenant.subscription_expires_at.isoformat() if tenant.subscription_expires_at else None,
            days_until_expiry=tenant.days_until_expiry,
            is_active=tenant.is_subscription_active,
            usage_stats=usage_stats,
            limits=limits,
            last_activity=tenant.last_activity_at.isoformat() if tenant.last_activity_at else None
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get tenant subscription details for {tenant_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get tenant subscription details: {str(e)}"
        )


@router.get("/stats", response_model=SubscriptionStatsResponse)
async def get_subscription_statistics(
    current_admin: User = Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get comprehensive subscription statistics and metrics
    """
    try:
        # Get current month/year
        current_date = datetime.now(timezone.utc)
        current_month = current_date.month
        current_year = current_date.year
        
        # Basic counts
        total_active = db.query(Tenant).filter(Tenant.status == TenantStatus.ACTIVE).count()
        
        subscriptions_by_type = {
            "free": db.query(Tenant).filter(Tenant.subscription_type == SubscriptionType.FREE).count(),
            "pro": db.query(Tenant).filter(Tenant.subscription_type == SubscriptionType.PRO).count()
        }
        
        # Expiring this month
        end_of_month = current_date.replace(day=1, month=current_month + 1 if current_month < 12 else 1, 
                                          year=current_year + 1 if current_month == 12 else current_year)
        expiring_this_month = db.query(Tenant).filter(
            Tenant.subscription_expires_at >= current_date,
            Tenant.subscription_expires_at < end_of_month
        ).count()
        
        # Expired count
        expired_count = db.query(Tenant).filter(
            Tenant.subscription_expires_at < current_date
        ).count()
        
        # New subscriptions this month
        start_of_month = current_date.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        new_subscriptions_this_month = db.query(SubscriptionHistory).filter(
            SubscriptionHistory.change_date >= start_of_month,
            SubscriptionHistory.action.in_(["CREATED", "UPGRADED"])
        ).count()
        
        # Calculate churn rate (simplified)
        total_pro = subscriptions_by_type["pro"]
        churn_rate = (expired_count / total_pro * 100) if total_pro > 0 else 0
        
        # Average subscription duration (simplified calculation)
        avg_duration = 12.0  # Default assumption for Pro subscriptions
        
        return SubscriptionStatsResponse(
            total_active_subscriptions=total_active,
            subscriptions_by_type=subscriptions_by_type,
            expiring_this_month=expiring_this_month,
            expired_count=expired_count,
            new_subscriptions_this_month=new_subscriptions_this_month,
            churn_rate=churn_rate,
            average_subscription_duration=avg_duration,
            revenue_metrics={
                "monthly_recurring_revenue": total_pro * 50.0,  # Assuming $50/month
                "annual_recurring_revenue": total_pro * 600.0   # Assuming $600/year
            },
            last_updated=current_date.isoformat()
        )
        
    except Exception as e:
        logger.error(f"Failed to get subscription statistics: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get subscription statistics: {str(e)}"
        )