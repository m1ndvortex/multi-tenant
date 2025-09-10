"""
Professional Subscription Management API
Dedicated endpoints for super admin subscription management with full manual control
"""

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc, func
from datetime import datetime, timezone, timedelta
import logging

from ..core.database import get_db
from ..core.auth import get_super_admin_user
from ..models.user import User
from ..models.tenant import Tenant, SubscriptionType, TenantStatus
from ..schemas.subscription_management import (
    SubscriptionOverviewResponse,
    SubscriptionExtensionRequest,
    SubscriptionExtensionResponse,
    SubscriptionStatusUpdateRequest,
    SubscriptionStatusUpdateResponse,
    SubscriptionPlanSwitchRequest,
    SubscriptionPlanSwitchResponse,
    SubscriptionFullControlRequest,
    SubscriptionFullControlResponse,
    SubscriptionHistoryResponse,
    SubscriptionHistoryEntry,
    SubscriptionStatsResponse,
    TenantSubscriptionResponse
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/subscription-management", tags=["Professional Subscription Management"])


@router.get("/overview", response_model=SubscriptionOverviewResponse)
async def get_subscription_overview(
    current_admin: User = Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get comprehensive subscription overview and statistics for super admin dashboard
    """
    try:
        # Get subscription counts by type
        total_tenants = db.query(Tenant).count()
        free_tenants = db.query(Tenant).filter(Tenant.subscription_type == SubscriptionType.FREE).count()
        pro_tenants = db.query(Tenant).filter(Tenant.subscription_type == SubscriptionType.PRO).count()
        
        # Get expiring subscriptions (next 30 days)
        thirty_days_from_now = datetime.now(timezone.utc) + timedelta(days=30)
        expiring_soon = db.query(Tenant).filter(
            Tenant.subscription_type == SubscriptionType.PRO,
            Tenant.subscription_expires_at.isnot(None),
            Tenant.subscription_expires_at <= thirty_days_from_now,
            Tenant.subscription_expires_at > datetime.now(timezone.utc)
        ).count()
        
        # Get expired subscriptions
        expired = db.query(Tenant).filter(
            Tenant.subscription_type == SubscriptionType.PRO,
            Tenant.subscription_expires_at.isnot(None),
            Tenant.subscription_expires_at < datetime.now(timezone.utc)
        ).count()
        
        # Get active subscriptions
        active_pro = db.query(Tenant).filter(
            Tenant.subscription_type == SubscriptionType.PRO,
            or_(
                Tenant.subscription_expires_at.is_(None),
                Tenant.subscription_expires_at > datetime.now(timezone.utc)
            )
        ).count()
        
        # Calculate conversion rate
        conversion_rate = (pro_tenants / total_tenants * 100) if total_tenants > 0 else 0
        
        # Get recent subscription activities (last 30 days)
        thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
        recent_upgrades = db.query(Tenant).filter(
            Tenant.subscription_type == SubscriptionType.PRO,
            Tenant.subscription_starts_at >= thirty_days_ago
        ).count()
        
        return SubscriptionOverviewResponse(
            total_tenants=total_tenants,
            free_subscriptions=free_tenants,
            pro_subscriptions=pro_tenants,
            active_pro_subscriptions=active_pro,
            expiring_soon=expiring_soon,
            expired_subscriptions=expired,
            conversion_rate=conversion_rate,
            recent_upgrades=recent_upgrades,
            last_updated=datetime.now(timezone.utc)
        )
        
    except Exception as e:
        logger.error(f"Failed to get subscription overview: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get subscription overview: {str(e)}"
        )


@router.get("/tenants", response_model=List[TenantSubscriptionResponse])
async def get_tenant_subscriptions(
    subscription_type: Optional[SubscriptionType] = Query(None, description="Filter by subscription type"),
    status_filter: Optional[str] = Query(None, description="Filter by status: active, expired, expiring"),
    search: Optional[str] = Query(None, description="Search by tenant name or email"),
    limit: int = Query(50, le=100, description="Maximum number of results"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    current_admin: User = Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get list of tenants with their subscription details for management
    """
    try:
        query = db.query(Tenant)
        
        # Apply filters
        if subscription_type:
            query = query.filter(Tenant.subscription_type == subscription_type)
        
        if search:
            search_filter = or_(
                Tenant.name.ilike(f"%{search}%"),
                Tenant.email.ilike(f"%{search}%")
            )
            query = query.filter(search_filter)
        
        # Apply status filter
        now = datetime.now(timezone.utc)
        if status_filter == "active":
            query = query.filter(
                or_(
                    Tenant.subscription_expires_at.is_(None),
                    Tenant.subscription_expires_at > now
                )
            )
        elif status_filter == "expired":
            query = query.filter(
                and_(
                    Tenant.subscription_expires_at.isnot(None),
                    Tenant.subscription_expires_at < now
                )
            )
        elif status_filter == "expiring":
            thirty_days_from_now = now + timedelta(days=30)
            query = query.filter(
                and_(
                    Tenant.subscription_expires_at.isnot(None),
                    Tenant.subscription_expires_at <= thirty_days_from_now,
                    Tenant.subscription_expires_at > now
                )
            )
        
        # Apply pagination and ordering
        tenants = query.order_by(desc(Tenant.created_at)).offset(skip).limit(limit).all()
        
        # Convert to response models
        tenant_responses = []
        for tenant in tenants:
            # Calculate subscription status
            is_active = tenant.is_subscription_active
            days_until_expiry = tenant.days_until_expiry
            
            tenant_response = TenantSubscriptionResponse(
                id=str(tenant.id),
                name=tenant.name,
                email=tenant.email,
                subscription_type=tenant.subscription_type,
                status=tenant.status,
                subscription_starts_at=tenant.subscription_starts_at,
                subscription_expires_at=tenant.subscription_expires_at,
                is_subscription_active=is_active,
                days_until_expiry=days_until_expiry,
                created_at=tenant.created_at,
                updated_at=tenant.updated_at
            )
            tenant_responses.append(tenant_response)
        
        return tenant_responses
        
    except Exception as e:
        logger.error(f"Failed to get tenant subscriptions: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get tenant subscriptions: {str(e)}"
        )


@router.post("/tenants/{tenant_id}/extend", response_model=SubscriptionExtensionResponse)
async def extend_subscription(
    tenant_id: str,
    extension_data: SubscriptionExtensionRequest,
    current_admin: User = Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    """
    Extend tenant subscription by specified number of months with full manual control
    """
    try:
        tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
        if not tenant:
            raise HTTPException(status_code=404, detail="Tenant not found")
        
        # Store old values for logging
        old_expiration = tenant.subscription_expires_at
        old_subscription_type = tenant.subscription_type
        
        # Calculate new expiration date
        if tenant.subscription_expires_at and tenant.subscription_expires_at > datetime.now(timezone.utc):
            # Extend from current expiration date
            new_expiration = tenant.subscription_expires_at + timedelta(days=30 * extension_data.months)
        else:
            # Start from now if expired or no expiration set
            new_expiration = datetime.now(timezone.utc) + timedelta(days=30 * extension_data.months)
        
        # Update subscription
        tenant.subscription_expires_at = new_expiration
        
        # Ensure tenant is Pro if extending (unless specifically keeping free)
        if not extension_data.keep_current_plan and tenant.subscription_type != SubscriptionType.PRO:
            tenant.subscription_type = SubscriptionType.PRO
            tenant.subscription_starts_at = datetime.now(timezone.utc)
            # Update limits for Pro tier
            tenant.max_users = 5
            tenant.max_products = -1  # Unlimited
            tenant.max_customers = -1  # Unlimited
            tenant.max_monthly_invoices = -1  # Unlimited
        
        # Create audit log entry
        extension_note = f"\n=== SUBSCRIPTION EXTENSION ===\n"
        extension_note += f"Extended by: Admin {current_admin.email} (ID: {current_admin.id})\n"
        extension_note += f"Extension: {extension_data.months} months\n"
        extension_note += f"Old expiration: {old_expiration}\n"
        extension_note += f"New expiration: {new_expiration}\n"
        extension_note += f"Old subscription: {old_subscription_type.value}\n"
        extension_note += f"New subscription: {tenant.subscription_type.value}\n"
        if extension_data.reason:
            extension_note += f"Reason: {extension_data.reason}\n"
        extension_note += f"Timestamp: {datetime.now(timezone.utc)}\n"
        extension_note += "================================\n"
        
        tenant.notes = (tenant.notes or "") + extension_note
        tenant.updated_at = datetime.now(timezone.utc)
        
        db.commit()
        db.refresh(tenant)
        
        logger.info(f"Admin {current_admin.id} extended subscription for tenant {tenant_id} by {extension_data.months} months")
        
        return SubscriptionExtensionResponse(
            success=True,
            message=f"Subscription extended by {extension_data.months} months",
            tenant_id=tenant_id,
            tenant_name=tenant.name,
            old_expiration_date=old_expiration,
            new_expiration_date=new_expiration,
            months_added=extension_data.months,
            subscription_type=tenant.subscription_type
        )
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to extend subscription for tenant {tenant_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to extend subscription: {str(e)}"
        )


@router.put("/tenants/{tenant_id}/status", response_model=SubscriptionStatusUpdateResponse)
async def update_subscription_status(
    tenant_id: str,
    status_data: SubscriptionStatusUpdateRequest,
    current_admin: User = Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    """
    Update subscription status with activation, deactivation, suspension, and disabling controls
    """
    try:
        tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
        if not tenant:
            raise HTTPException(status_code=404, detail="Tenant not found")
        
        old_status = tenant.status
        old_subscription = tenant.subscription_type
        
        # Apply status changes based on action
        if status_data.action == "activate":
            tenant.status = TenantStatus.ACTIVE
            if status_data.subscription_type:
                tenant.subscription_type = status_data.subscription_type
                if status_data.subscription_type == SubscriptionType.PRO:
                    # Set Pro limits
                    tenant.max_users = 5
                    tenant.max_products = -1
                    tenant.max_customers = -1
                    tenant.max_monthly_invoices = -1
                    # Set expiration if not set
                    if not tenant.subscription_expires_at:
                        tenant.subscription_expires_at = datetime.now(timezone.utc) + timedelta(days=365)
                        tenant.subscription_starts_at = datetime.now(timezone.utc)
                else:
                    # Set Free limits
                    tenant.max_users = 1
                    tenant.max_products = 10
                    tenant.max_customers = 10
                    tenant.max_monthly_invoices = 10
                    tenant.subscription_expires_at = None
                    
        elif status_data.action == "deactivate":
            tenant.status = TenantStatus.SUSPENDED
            
        elif status_data.action == "suspend":
            tenant.status = TenantStatus.SUSPENDED
            
        elif status_data.action == "disable":
            tenant.status = TenantStatus.CANCELLED
        
        # Create audit log entry
        status_note = f"\n=== SUBSCRIPTION STATUS UPDATE ===\n"
        status_note += f"Updated by: Admin {current_admin.email} (ID: {current_admin.id})\n"
        status_note += f"Action: {status_data.action}\n"
        status_note += f"Old status: {old_status.value}\n"
        status_note += f"New status: {tenant.status.value}\n"
        status_note += f"Old subscription: {old_subscription.value}\n"
        status_note += f"New subscription: {tenant.subscription_type.value}\n"
        if status_data.reason:
            status_note += f"Reason: {status_data.reason}\n"
        status_note += f"Timestamp: {datetime.now(timezone.utc)}\n"
        status_note += "===================================\n"
        
        tenant.notes = (tenant.notes or "") + status_note
        tenant.updated_at = datetime.now(timezone.utc)
        
        db.commit()
        db.refresh(tenant)
        
        logger.info(f"Admin {current_admin.id} updated subscription status for tenant {tenant_id}: {status_data.action}")
        
        return SubscriptionStatusUpdateResponse(
            success=True,
            message=f"Subscription status updated: {status_data.action}",
            tenant_id=tenant_id,
            tenant_name=tenant.name,
            old_status=old_status,
            new_status=tenant.status,
            subscription_type=tenant.subscription_type,
            action_performed=status_data.action
        )
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to update subscription status for tenant {tenant_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update subscription status: {str(e)}"
        )


@router.put("/tenants/{tenant_id}/plan", response_model=SubscriptionPlanSwitchResponse)
async def switch_subscription_plan(
    tenant_id: str,
    plan_data: SubscriptionPlanSwitchRequest,
    current_admin: User = Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    """
    Switch subscription plan with immediate effect on tenant permissions
    """
    try:
        tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
        if not tenant:
            raise HTTPException(status_code=404, detail="Tenant not found")
        
        old_plan = tenant.subscription_type
        
        # Update subscription plan
        tenant.subscription_type = plan_data.new_plan
        
        if plan_data.new_plan == SubscriptionType.PRO:
            # Upgrade to Pro
            tenant.max_users = 5
            tenant.max_products = -1  # Unlimited
            tenant.max_customers = -1  # Unlimited
            tenant.max_monthly_invoices = -1  # Unlimited
            
            # Set subscription dates
            tenant.subscription_starts_at = datetime.now(timezone.utc)
            if plan_data.duration_months:
                tenant.subscription_expires_at = datetime.now(timezone.utc) + timedelta(
                    days=30 * plan_data.duration_months
                )
            elif not tenant.subscription_expires_at:
                # Default to 1 year if no expiration set
                tenant.subscription_expires_at = datetime.now(timezone.utc) + timedelta(days=365)
                
        elif plan_data.new_plan == SubscriptionType.FREE:
            # Downgrade to Free
            tenant.max_users = 1
            tenant.max_products = 10
            tenant.max_customers = 10
            tenant.max_monthly_invoices = 10
            tenant.subscription_expires_at = None
        
        # Ensure tenant is active if switching to a paid plan
        if plan_data.new_plan == SubscriptionType.PRO and tenant.status != TenantStatus.ACTIVE:
            tenant.status = TenantStatus.ACTIVE
        
        # Create audit log entry
        plan_note = f"\n=== SUBSCRIPTION PLAN SWITCH ===\n"
        plan_note += f"Switched by: Admin {current_admin.email} (ID: {current_admin.id})\n"
        plan_note += f"Old plan: {old_plan.value}\n"
        plan_note += f"New plan: {plan_data.new_plan.value}\n"
        if plan_data.duration_months:
            plan_note += f"Duration: {plan_data.duration_months} months\n"
        if plan_data.reason:
            plan_note += f"Reason: {plan_data.reason}\n"
        plan_note += f"Immediate effect: Yes\n"
        plan_note += f"Timestamp: {datetime.now(timezone.utc)}\n"
        plan_note += "================================\n"
        
        tenant.notes = (tenant.notes or "") + plan_note
        tenant.updated_at = datetime.now(timezone.utc)
        
        db.commit()
        db.refresh(tenant)
        
        logger.info(f"Admin {current_admin.id} switched subscription plan for tenant {tenant_id} from {old_plan.value} to {plan_data.new_plan.value}")
        
        return SubscriptionPlanSwitchResponse(
            success=True,
            message=f"Subscription plan switched from {old_plan.value} to {plan_data.new_plan.value}",
            tenant_id=tenant_id,
            tenant_name=tenant.name,
            old_plan=old_plan,
            new_plan=plan_data.new_plan,
            immediate_effect=True,
            subscription_expires_at=tenant.subscription_expires_at
        )
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to switch subscription plan for tenant {tenant_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to switch subscription plan: {str(e)}"
        )


@router.put("/tenants/{tenant_id}/full-control", response_model=SubscriptionFullControlResponse)
async def full_subscription_control(
    tenant_id: str,
    control_data: SubscriptionFullControlRequest,
    current_admin: User = Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    """
    Complete manual control over all subscription aspects - edit everything including custom dates and limitations
    """
    try:
        tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
        if not tenant:
            raise HTTPException(status_code=404, detail="Tenant not found")
        
        changes = []
        
        # Full control over subscription type
        if control_data.subscription_type is not None:
            old_type = tenant.subscription_type
            tenant.subscription_type = control_data.subscription_type
            changes.append(f"Subscription type: {old_type.value} → {control_data.subscription_type.value}")
        
        # Full control over dates - custom start/end dates
        if control_data.custom_start_date is not None:
            old_start = tenant.subscription_starts_at
            tenant.subscription_starts_at = control_data.custom_start_date
            changes.append(f"Start date: {old_start} → {control_data.custom_start_date}")
        
        if control_data.custom_end_date is not None:
            old_end = tenant.subscription_expires_at
            tenant.subscription_expires_at = control_data.custom_end_date
            changes.append(f"End date: {old_end} → {control_data.custom_end_date}")
        
        # Full control over limitations
        if control_data.max_users is not None:
            old_users = tenant.max_users
            tenant.max_users = control_data.max_users
            changes.append(f"Max users: {old_users} → {control_data.max_users}")
        
        if control_data.max_products is not None:
            old_products = tenant.max_products
            tenant.max_products = control_data.max_products
            changes.append(f"Max products: {old_products} → {control_data.max_products}")
        
        if control_data.max_customers is not None:
            old_customers = tenant.max_customers
            tenant.max_customers = control_data.max_customers
            changes.append(f"Max customers: {old_customers} → {control_data.max_customers}")
        
        if control_data.max_monthly_invoices is not None:
            old_invoices = tenant.max_monthly_invoices
            tenant.max_monthly_invoices = control_data.max_monthly_invoices
            changes.append(f"Max monthly invoices: {old_invoices} → {control_data.max_monthly_invoices}")
        
        # Full control over status
        if control_data.status is not None:
            old_status = tenant.status
            tenant.status = control_data.status
            changes.append(f"Status: {old_status.value} → {control_data.status.value}")
        
        # Log all manual changes
        if changes:
            control_note = f"\n=== FULL MANUAL SUBSCRIPTION CONTROL ===\n"
            control_note += f"Controlled by: Admin {current_admin.email} (ID: {current_admin.id})\n"
            control_note += "Changes applied:\n"
            for change in changes:
                control_note += f"  - {change}\n"
            if control_data.admin_notes:
                control_note += f"Admin notes: {control_data.admin_notes}\n"
            control_note += f"Timestamp: {datetime.now(timezone.utc)}\n"
            control_note += "=========================================\n"
            
            tenant.notes = (tenant.notes or "") + control_note
        
        tenant.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(tenant)
        
        logger.info(f"Admin {current_admin.id} applied full manual control to tenant {tenant_id} subscription")
        
        return SubscriptionFullControlResponse(
            success=True,
            message="Full subscription control applied successfully",
            tenant_id=tenant_id,
            tenant_name=tenant.name,
            changes_applied=len(changes),
            changes=changes,
            current_subscription_type=tenant.subscription_type,
            current_status=tenant.status,
            current_limits={
                "max_users": tenant.max_users,
                "max_products": tenant.max_products,
                "max_customers": tenant.max_customers,
                "max_monthly_invoices": tenant.max_monthly_invoices
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to apply full subscription control for tenant {tenant_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to apply full subscription control: {str(e)}"
        )


@router.get("/tenants/{tenant_id}/history", response_model=SubscriptionHistoryResponse)
async def get_subscription_history(
    tenant_id: str,
    limit: int = Query(50, le=100, description="Maximum number of history entries"),
    current_admin: User = Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get subscription history with admin actions and change reasons
    """
    try:
        tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
        if not tenant:
            raise HTTPException(status_code=404, detail="Tenant not found")
        
        # Parse notes to extract subscription history
        history_entries = []
        
        if tenant.notes:
            # Split notes by sections and parse subscription-related entries
            sections = tenant.notes.split("===")
            
            for i, section in enumerate(sections):
                if any(keyword in section for keyword in ["SUBSCRIPTION", "EXTENSION", "STATUS UPDATE", "PLAN SWITCH", "FULL MANUAL"]):
                    lines = section.strip().split("\n")
                    entry_data = {}
                    
                    for line in lines:
                        if ":" in line:
                            key, value = line.split(":", 1)
                            entry_data[key.strip()] = value.strip()
                    
                    # Create history entry
                    if entry_data:
                        action_type = "unknown"
                        if "EXTENSION" in section:
                            action_type = "extension"
                        elif "STATUS UPDATE" in section:
                            action_type = "status_update"
                        elif "PLAN SWITCH" in section:
                            action_type = "plan_switch"
                        elif "FULL MANUAL" in section:
                            action_type = "manual_control"
                        
                        history_entry = SubscriptionHistoryEntry(
                            timestamp=entry_data.get("Timestamp", ""),
                            action=action_type,
                            admin_email=entry_data.get("Extended by", entry_data.get("Updated by", entry_data.get("Switched by", entry_data.get("Controlled by", "")))),
                            details=entry_data,
                            reason=entry_data.get("Reason", "")
                        )
                        history_entries.append(history_entry)
        
        # Sort by timestamp (most recent first) and limit
        history_entries = sorted(history_entries, key=lambda x: x.timestamp, reverse=True)[:limit]
        
        return SubscriptionHistoryResponse(
            tenant_id=tenant_id,
            tenant_name=tenant.name,
            history=history_entries,
            total_entries=len(history_entries),
            current_subscription_type=tenant.subscription_type,
            current_status=tenant.status
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get subscription history for tenant {tenant_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get subscription history: {str(e)}"
        )


@router.get("/stats", response_model=SubscriptionStatsResponse)
async def get_subscription_statistics(
    period: str = Query("month", description="Statistics period: day, week, month, year"),
    current_admin: User = Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get detailed subscription statistics and metrics
    """
    try:
        now = datetime.now(timezone.utc)
        
        # Calculate period start based on parameter
        if period == "day":
            period_start = now - timedelta(days=1)
        elif period == "week":
            period_start = now - timedelta(weeks=1)
        elif period == "month":
            period_start = now - timedelta(days=30)
        elif period == "year":
            period_start = now - timedelta(days=365)
        else:
            period_start = now - timedelta(days=30)  # Default to month
        
        # Get basic counts
        total_tenants = db.query(Tenant).count()
        free_tenants = db.query(Tenant).filter(Tenant.subscription_type == SubscriptionType.FREE).count()
        pro_tenants = db.query(Tenant).filter(Tenant.subscription_type == SubscriptionType.PRO).count()
        
        # Get new signups in period
        new_signups = db.query(Tenant).filter(Tenant.created_at >= period_start).count()
        
        # Get upgrades in period
        upgrades = db.query(Tenant).filter(
            Tenant.subscription_type == SubscriptionType.PRO,
            Tenant.subscription_starts_at >= period_start
        ).count()
        
        # Get active vs expired
        active_pro = db.query(Tenant).filter(
            Tenant.subscription_type == SubscriptionType.PRO,
            or_(
                Tenant.subscription_expires_at.is_(None),
                Tenant.subscription_expires_at > now
            )
        ).count()
        
        expired_pro = db.query(Tenant).filter(
            Tenant.subscription_type == SubscriptionType.PRO,
            Tenant.subscription_expires_at.isnot(None),
            Tenant.subscription_expires_at < now
        ).count()
        
        # Calculate rates
        conversion_rate = (pro_tenants / total_tenants * 100) if total_tenants > 0 else 0
        upgrade_rate = (upgrades / new_signups * 100) if new_signups > 0 else 0
        
        return SubscriptionStatsResponse(
            period=period,
            period_start=period_start,
            period_end=now,
            total_tenants=total_tenants,
            free_subscriptions=free_tenants,
            pro_subscriptions=pro_tenants,
            active_pro_subscriptions=active_pro,
            expired_pro_subscriptions=expired_pro,
            new_signups_in_period=new_signups,
            upgrades_in_period=upgrades,
            conversion_rate=conversion_rate,
            upgrade_rate=upgrade_rate,
            last_updated=now
        )
        
    except Exception as e:
        logger.error(f"Failed to get subscription statistics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get subscription statistics: {str(e)}"
        )