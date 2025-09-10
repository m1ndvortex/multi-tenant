"""
Enhanced Tenant Management API
Enhanced endpoints for comprehensive tenant management including credential updates
"""

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc, func
from datetime import datetime, timezone, timedelta
import bcrypt
import logging
import json

from ..core.database import get_db
from ..core.auth import get_super_admin_user
from ..models.tenant import Tenant, SubscriptionType, TenantStatus
from ..models.user import User, UserRole
from ..schemas.enhanced_tenant_management import (
    TenantCredentialsUpdateRequest,
    TenantFullUpdateRequest,
    TenantCredentialsResponse,
    TenantFullUpdateResponse,
    EnhancedTenantResponse,
    TenantAuditLogResponse,
    TenantCredentialHistoryResponse,
    TenantManagementStatsResponse,
    BulkTenantCredentialUpdateRequest,
    BulkTenantCredentialUpdateResponse
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/enhanced-tenant-management", tags=["Enhanced Tenant Management"])


def log_tenant_change(
    tenant: Tenant,
    admin_user: User,
    action: str,
    changes: Dict[str, Any],
    reason: Optional[str] = None,
    ip_address: Optional[str] = None
):
    """Enhanced audit logging for tenant changes"""
    audit_entry = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "admin_id": str(admin_user.id),
        "admin_email": admin_user.email,
        "action": action,
        "changes": changes,
        "reason": reason,
        "ip_address": ip_address
    }
    
    # Add to tenant notes with structured format
    audit_note = f"\n--- AUDIT LOG ---"
    audit_note += f"\nTimestamp: {audit_entry['timestamp']}"
    audit_note += f"\nAdmin: {admin_user.email} ({admin_user.id})"
    audit_note += f"\nAction: {action}"
    
    if changes:
        audit_note += f"\nChanges:"
        for key, value in changes.items():
            if isinstance(value, dict) and 'old' in value and 'new' in value:
                audit_note += f"\n  - {key}: {value['old']} → {value['new']}"
            else:
                audit_note += f"\n  - {key}: {value}"
    
    if reason:
        audit_note += f"\nReason: {reason}"
    
    if ip_address:
        audit_note += f"\nIP Address: {ip_address}"
    
    audit_note += f"\n--- END AUDIT LOG ---"
    
    tenant.notes = (tenant.notes or "") + audit_note
    
    logger.info(f"Tenant audit log: {action} on tenant {tenant.id} by admin {admin_user.id}")


@router.put("/tenants/{tenant_id}/credentials", response_model=TenantCredentialsResponse)
async def update_tenant_credentials(
    tenant_id: str,
    credentials_data: TenantCredentialsUpdateRequest,
    request: Request,
    current_admin: User = Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    """
    Update tenant owner credentials (email and/or password)
    Enhanced with comprehensive audit logging and validation
    """
    try:
        # Validate UUID format
        try:
            import uuid
            uuid.UUID(tenant_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid tenant ID format"
            )
        # Get tenant
        tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
        if not tenant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tenant not found"
            )
        
        # Get tenant owner (user with owner role)
        tenant_owner = db.query(User).filter(
            and_(
                User.tenant_id == tenant_id,
                User.role == UserRole.OWNER
            )
        ).first()
        
        if not tenant_owner:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tenant owner not found"
            )
        
        changes = {}
        password_updated = False
        
        # Update email if provided
        if credentials_data.email:
            # Check email uniqueness across all tenants
            existing_user = db.query(User).filter(
                and_(
                    User.email == credentials_data.email,
                    User.id != tenant_owner.id
                )
            ).first()
            
            if existing_user:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email already exists for another user"
                )
            
            old_email = tenant_owner.email
            tenant_owner.email = credentials_data.email
            tenant.email = credentials_data.email  # Update tenant email too
            
            changes["email"] = {
                "old": old_email,
                "new": credentials_data.email
            }
        
        # Update password if provided
        if credentials_data.password:
            # Hash the new password
            salt = bcrypt.gensalt()
            hashed_password = bcrypt.hashpw(credentials_data.password.encode('utf-8'), salt)
            tenant_owner.password_hash = hashed_password.decode('utf-8')
            
            # Update password metadata
            tenant_owner.password_reset_token = None
            tenant_owner.password_reset_expires = None
            
            changes["password"] = "Updated (hash not logged for security)"
            password_updated = True
        
        # Get client IP for audit log
        client_ip = request.client.host if request.client else None
        
        # Log the credential change with enhanced audit
        log_tenant_change(
            tenant=tenant,
            admin_user=current_admin,
            action="CREDENTIALS_UPDATE",
            changes=changes,
            reason=credentials_data.reason,
            ip_address=client_ip
        )
        
        tenant.updated_at = datetime.now(timezone.utc)
        
        db.commit()
        
        logger.info(f"Admin {current_admin.id} updated credentials for tenant {tenant_id}")
        
        return TenantCredentialsResponse(
            success=True,
            message="Tenant credentials updated successfully",
            tenant_id=tenant_id,
            updated_email=credentials_data.email if credentials_data.email else None,
            password_updated=password_updated,
            timestamp=datetime.now(timezone.utc)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to update tenant credentials for {tenant_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update tenant credentials: {str(e)}"
        )


@router.put("/tenants/{tenant_id}/full-update", response_model=TenantFullUpdateResponse)
async def full_tenant_update(
    tenant_id: str,
    update_data: TenantFullUpdateRequest,
    request: Request,
    current_admin: User = Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    """
    Comprehensive tenant update with enhanced audit logging
    Supports updating all tenant information including subscription and limits
    """
    try:
        # Validate UUID format
        try:
            import uuid
            uuid.UUID(tenant_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid tenant ID format"
            )
        tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
        if not tenant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tenant not found"
            )
        
        # Handle domain uniqueness check BEFORE making changes
        if update_data.domain and update_data.domain != tenant.domain:
            existing_domain = db.query(Tenant).filter(
                and_(
                    Tenant.domain == update_data.domain,
                    Tenant.id != tenant_id
                )
            ).first()
            if existing_domain:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Domain already exists for another tenant"
                )
        
        changes = {}
        
        # Update basic information
        basic_fields = ['name', 'phone', 'address', 'business_type', 'domain', 'currency', 'timezone']
        for field in basic_fields:
            new_value = getattr(update_data, field)
            if new_value is not None:
                old_value = getattr(tenant, field)
                if new_value != old_value:
                    setattr(tenant, field, new_value)
                    changes[field] = {"old": old_value, "new": new_value}
        
        # Update subscription if provided
        if update_data.subscription_type and update_data.subscription_type != tenant.subscription_type:
            old_subscription = tenant.subscription_type
            tenant.subscription_type = update_data.subscription_type
            
            changes["subscription_type"] = {
                "old": old_subscription.value,
                "new": update_data.subscription_type.value
            }
            
            # Adjust limits and dates based on new subscription
            if update_data.subscription_type == SubscriptionType.PRO:
                tenant.max_users = 5
                tenant.max_products = -1  # Unlimited
                tenant.max_customers = -1
                tenant.max_monthly_invoices = -1
                
                # Set subscription dates if upgrading to Pro
                if update_data.subscription_duration_months:
                    if not tenant.subscription_starts_at:
                        tenant.subscription_starts_at = datetime.now(timezone.utc)
                    
                    tenant.subscription_expires_at = datetime.now(timezone.utc) + timedelta(
                        days=30 * update_data.subscription_duration_months
                    )
                    
                    changes["subscription_duration"] = f"{update_data.subscription_duration_months} months"
                    
            elif update_data.subscription_type == SubscriptionType.FREE:
                tenant.max_users = 1
                tenant.max_products = 10
                tenant.max_customers = 10
                tenant.max_monthly_invoices = 10
                tenant.subscription_expires_at = None
        
        # Update status if provided
        if update_data.status and update_data.status != tenant.status:
            old_status = tenant.status
            tenant.status = update_data.status
            changes["status"] = {
                "old": old_status.value,
                "new": update_data.status.value
            }
        
        # Update custom limits if provided
        limit_fields = ['max_users', 'max_products', 'max_customers', 'max_monthly_invoices']
        for field in limit_fields:
            new_value = getattr(update_data, field)
            if new_value is not None:
                old_value = getattr(tenant, field)
                if new_value != old_value:
                    setattr(tenant, field, new_value)
                    changes[field] = {"old": old_value, "new": new_value}
        
        # Update notes if provided
        if update_data.notes is not None:
            old_notes = tenant.notes
            tenant.notes = update_data.notes
            changes["notes"] = "Updated (content not logged for privacy)"
        
        # Get client IP for audit log
        client_ip = request.client.host if request.client else None
        
        # Log all changes with enhanced audit
        if changes:
            log_tenant_change(
                tenant=tenant,
                admin_user=current_admin,
                action="FULL_UPDATE",
                changes=changes,
                reason=update_data.admin_reason,
                ip_address=client_ip
            )
        
        tenant.updated_at = datetime.now(timezone.utc)
        db.commit()
        
        logger.info(f"Admin {current_admin.id} performed full update on tenant {tenant_id} with {len(changes)} changes")
        
        return TenantFullUpdateResponse(
            success=True,
            message="Tenant updated successfully",
            tenant_id=tenant_id,
            changes_made=len(changes),
            changes=[f"{k}: {v['old']} → {v['new']}" if isinstance(v, dict) and 'old' in v else f"{k}: {v}" for k, v in changes.items()],
            timestamp=datetime.now(timezone.utc)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to perform full update on tenant {tenant_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update tenant: {str(e)}"
        )


@router.get("/tenants/{tenant_id}/enhanced", response_model=EnhancedTenantResponse)
async def get_enhanced_tenant_details(
    tenant_id: str,
    current_admin: User = Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get enhanced tenant details including owner information and audit statistics
    """
    try:
        # Validate UUID format
        try:
            import uuid
            uuid.UUID(tenant_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid tenant ID format"
            )
        tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
        if not tenant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tenant not found"
            )
        
        # Get tenant owner information
        tenant_owner = db.query(User).filter(
            and_(
                User.tenant_id == tenant_id,
                User.role == UserRole.OWNER
            )
        ).first()
        
        # Get usage statistics
        usage_stats = tenant.get_usage_stats(db)
        
        # Calculate usage percentages
        usage_percentages = {}
        limits = {
            'users': tenant.max_users,
            'products': tenant.max_products,
            'customers': tenant.max_customers,
            'monthly_invoices': tenant.max_monthly_invoices
        }
        
        for resource, current_usage in usage_stats.items():
            limit = limits.get(resource, 0)
            if limit == -1:  # Unlimited
                usage_percentages[resource] = 0.0
            elif limit > 0:
                usage_percentages[resource] = (current_usage / limit) * 100
            else:
                usage_percentages[resource] = 0.0
        
        # Count audit log entries (count "AUDIT LOG" occurrences in notes)
        audit_entries_count = 0
        if tenant.notes:
            audit_entries_count = tenant.notes.count("--- AUDIT LOG ---")
        
        # Find last credential update from notes
        last_credential_update = None
        if tenant.notes and "CREDENTIALS_UPDATE" in tenant.notes:
            # This is a simplified approach - in production, you might want a separate audit table
            last_credential_update = tenant.updated_at
        
        return EnhancedTenantResponse(
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
            usage_percentages=usage_percentages,
            owner_email=tenant_owner.email if tenant_owner else None,
            owner_name=tenant_owner.full_name if tenant_owner else None,
            last_credential_update=last_credential_update,
            total_audit_entries=audit_entries_count,
            notes=tenant.notes,
            last_activity_at=tenant.last_activity_at,
            created_at=tenant.created_at,
            updated_at=tenant.updated_at
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get enhanced tenant details for {tenant_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve enhanced tenant details: {str(e)}"
        )


@router.get("/tenants/{tenant_id}/audit-log", response_model=TenantAuditLogResponse)
async def get_tenant_audit_log(
    tenant_id: str,
    limit: int = 50,
    current_admin: User = Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get tenant audit log with parsed entries
    """
    try:
        # Validate UUID format
        try:
            import uuid
            uuid.UUID(tenant_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid tenant ID format"
            )
        tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
        if not tenant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tenant not found"
            )
        
        # Parse audit log entries from notes
        # This is a simplified implementation - in production, use a separate audit table
        audit_entries = []
        
        if tenant.notes:
            # Split by audit log markers and parse each entry
            log_sections = tenant.notes.split("--- AUDIT LOG ---")
            
            for section in log_sections[1:]:  # Skip first empty section
                if "--- END AUDIT LOG ---" in section:
                    log_content = section.split("--- END AUDIT LOG ---")[0].strip()
                    
                    # Parse the log content (simplified parsing)
                    entry_data = {}
                    for line in log_content.split('\n'):
                        if ':' in line:
                            key, value = line.split(':', 1)
                            entry_data[key.strip()] = value.strip()
                    
                    if 'Timestamp' in entry_data and 'Admin' in entry_data:
                        try:
                            timestamp = datetime.fromisoformat(entry_data['Timestamp'].replace('Z', '+00:00'))
                            admin_info = entry_data['Admin'].split(' (')[0]  # Extract email
                            
                            audit_entries.append({
                                "timestamp": timestamp,
                                "admin_id": entry_data.get('Admin', '').split('(')[1].split(')')[0] if '(' in entry_data.get('Admin', '') else '',
                                "admin_email": admin_info,
                                "action": entry_data.get('Action', ''),
                                "changes": {},  # Simplified - could parse changes section
                                "reason": entry_data.get('Reason'),
                                "ip_address": entry_data.get('IP Address')
                            })
                        except Exception as parse_error:
                            logger.warning(f"Failed to parse audit log entry: {parse_error}")
                            continue
        
        # Sort by timestamp (newest first) and limit
        audit_entries.sort(key=lambda x: x['timestamp'], reverse=True)
        audit_entries = audit_entries[:limit]
        
        return TenantAuditLogResponse(
            tenant_id=tenant_id,
            tenant_name=tenant.name,
            total_entries=len(audit_entries),
            entries=audit_entries
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get audit log for tenant {tenant_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve audit log: {str(e)}"
        )


@router.get("/management-stats", response_model=TenantManagementStatsResponse)
async def get_tenant_management_stats(
    current_admin: User = Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get comprehensive tenant management statistics
    """
    try:
        # Basic tenant counts
        total_tenants = db.query(Tenant).count()
        active_tenants = db.query(Tenant).filter(Tenant.status == TenantStatus.ACTIVE).count()
        suspended_tenants = db.query(Tenant).filter(Tenant.status == TenantStatus.SUSPENDED).count()
        pending_tenants = db.query(Tenant).filter(Tenant.status == TenantStatus.PENDING).count()
        
        # Subscription breakdown
        free_subscriptions = db.query(Tenant).filter(Tenant.subscription_type == SubscriptionType.FREE).count()
        pro_subscriptions = db.query(Tenant).filter(Tenant.subscription_type == SubscriptionType.PRO).count()
        enterprise_subscriptions = db.query(Tenant).filter(Tenant.subscription_type == SubscriptionType.ENTERPRISE).count()
        
        # Recent activity (last 7 days)
        seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)
        
        # Count recent credential updates (simplified - count notes with CREDENTIALS_UPDATE)
        recent_credential_updates = db.query(Tenant).filter(
            and_(
                Tenant.notes.contains("CREDENTIALS_UPDATE"),
                Tenant.updated_at >= seven_days_ago
            )
        ).count()
        
        # Count recent status changes
        recent_status_changes = db.query(Tenant).filter(
            and_(
                Tenant.notes.contains("status"),
                Tenant.updated_at >= seven_days_ago
            )
        ).count()
        
        # Count recent subscription changes
        recent_subscription_changes = db.query(Tenant).filter(
            and_(
                Tenant.notes.contains("subscription"),
                Tenant.updated_at >= seven_days_ago
            )
        ).count()
        
        # Usage statistics
        avg_users = db.query(func.avg(Tenant.max_users)).scalar() or 0
        avg_products = db.query(func.avg(Tenant.max_products)).filter(Tenant.max_products > 0).scalar() or 0
        
        # Tenants over limits (simplified check)
        tenants_over_limits = 0  # Would need to implement actual usage checking
        
        return TenantManagementStatsResponse(
            total_tenants=total_tenants,
            active_tenants=active_tenants,
            suspended_tenants=suspended_tenants,
            pending_tenants=pending_tenants,
            free_subscriptions=free_subscriptions,
            pro_subscriptions=pro_subscriptions,
            enterprise_subscriptions=enterprise_subscriptions,
            recent_credential_updates=recent_credential_updates,
            recent_status_changes=recent_status_changes,
            recent_subscription_changes=recent_subscription_changes,
            average_users_per_tenant=float(avg_users),
            average_products_per_tenant=float(avg_products),
            tenants_over_limits=tenants_over_limits,
            last_updated=datetime.now(timezone.utc)
        )
        
    except Exception as e:
        logger.error(f"Failed to get tenant management stats: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve management statistics: {str(e)}"
        )


@router.post("/tenants/bulk-credential-update", response_model=BulkTenantCredentialUpdateResponse)
async def bulk_tenant_credential_update(
    bulk_data: BulkTenantCredentialUpdateRequest,
    request: Request,
    current_admin: User = Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    """
    Perform bulk credential operations on multiple tenants
    """
    try:
        successful_tenant_ids = []
        failed_operations = []
        
        for tenant_id in bulk_data.tenant_ids:
            try:
                tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
                
                if not tenant:
                    failed_operations.append({
                        "tenant_id": tenant_id,
                        "error": "Tenant not found"
                    })
                    continue
                
                tenant_owner = db.query(User).filter(
                    and_(
                        User.tenant_id == tenant_id,
                        User.role == UserRole.OWNER
                    )
                ).first()
                
                if not tenant_owner:
                    failed_operations.append({
                        "tenant_id": tenant_id,
                        "error": "Tenant owner not found"
                    })
                    continue
                
                changes = {}
                
                if bulk_data.action == "reset_password":
                    # Generate a temporary password (in production, send via email)
                    temp_password = f"TempPass{tenant_id[:8]}!"
                    salt = bcrypt.gensalt()
                    hashed_password = bcrypt.hashpw(temp_password.encode('utf-8'), salt)
                    tenant_owner.password_hash = hashed_password.decode('utf-8')
                    
                    changes["password"] = "Reset to temporary password"
                    
                elif bulk_data.action == "update_email_domain":
                    if bulk_data.new_email_domain:
                        old_email = tenant_owner.email
                        username = old_email.split('@')[0]
                        new_email = f"{username}@{bulk_data.new_email_domain}"
                        
                        # Check if new email already exists
                        existing_user = db.query(User).filter(User.email == new_email).first()
                        if existing_user:
                            failed_operations.append({
                                "tenant_id": tenant_id,
                                "error": f"Email {new_email} already exists"
                            })
                            continue
                        
                        tenant_owner.email = new_email
                        tenant.email = new_email
                        
                        changes["email"] = {"old": old_email, "new": new_email}
                
                # Log the bulk change
                client_ip = request.client.host if request.client else None
                log_tenant_change(
                    tenant=tenant,
                    admin_user=current_admin,
                    action=f"BULK_{bulk_data.action.upper()}",
                    changes=changes,
                    reason=bulk_data.reason,
                    ip_address=client_ip
                )
                
                tenant.updated_at = datetime.now(timezone.utc)
                successful_tenant_ids.append(tenant_id)
                
            except Exception as e:
                failed_operations.append({
                    "tenant_id": tenant_id,
                    "error": str(e)
                })
        
        db.commit()
        
        success_count = len(successful_tenant_ids)
        failed_count = len(failed_operations)
        
        logger.info(f"Admin {current_admin.id} performed bulk {bulk_data.action} on {success_count} tenants")
        
        return BulkTenantCredentialUpdateResponse(
            success_count=success_count,
            failed_count=failed_count,
            successful_tenant_ids=successful_tenant_ids,
            failed_operations=failed_operations,
            message=f"Bulk {bulk_data.action} completed: {success_count} successful, {failed_count} failed",
            timestamp=datetime.now(timezone.utc)
        )
        
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to perform bulk credential update: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to perform bulk operation: {str(e)}"
        )