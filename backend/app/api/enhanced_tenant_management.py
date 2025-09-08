"""
Enhanced Tenant Management API endpoints for comprehensive tenant operations
"""

from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timezone, timedelta
import bcrypt
import logging

from ..core.database import get_db
from ..core.auth import get_super_admin_user, get_password_hash, verify_password
from ..models.tenant import Tenant, SubscriptionType, TenantStatus
from ..models.user import User, UserRole, UserStatus
from ..schemas.enhanced_tenant import (
    TenantCredentialsUpdateRequest,
    TenantCredentialsResponse,
    TenantFullUpdateRequest,
    TenantFullUpdateResponse,
    TenantAuditLogResponse
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/enhanced-tenant-management", tags=["Enhanced Tenant Management"])


@router.put("/tenants/{tenant_id}/credentials", response_model=TenantCredentialsResponse)
async def update_tenant_credentials(
    tenant_id: str,
    credentials_data: TenantCredentialsUpdateRequest,
    current_admin: User = Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    """
    Update tenant owner credentials (username/email and password)
    Supports updating email and password for tenant owner account
    """
    try:
        # Get tenant
        tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
        if not tenant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tenant not found"
            )
        
        # Get tenant owner (first user with owner role for the tenant)
        tenant_owner = db.query(User).filter(
            User.tenant_id == tenant_id,
            User.role == UserRole.OWNER
        ).first()
        
        if not tenant_owner:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tenant owner not found"
            )
        
        changes_made = []
        
        # Update email if provided
        if credentials_data.email:
            # Check email uniqueness across all tenants
            existing_user = db.query(User).filter(
                User.email == credentials_data.email,
                User.id != tenant_owner.id
            ).first()
            
            if existing_user:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email already exists for another user"
                )
            
            old_email = tenant_owner.email
            tenant_owner.email = credentials_data.email
            tenant.email = credentials_data.email  # Update tenant email too
            changes_made.append(f"Email changed from {old_email} to {credentials_data.email}")
        
        # Update password if provided
        if credentials_data.password:
            # Validate password strength (basic validation)
            if len(credentials_data.password) < 8:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Password must be at least 8 characters long"
                )
            
            # Hash the new password
            hashed_password = get_password_hash(credentials_data.password)
            tenant_owner.password_hash = hashed_password
            changes_made.append("Password updated")
        
        # Update user metadata
        tenant_owner.updated_at = datetime.now(timezone.utc)
        
        # Log the credential change in tenant notes
        if changes_made:
            change_note = f"\nCredentials updated by admin {current_admin.email} ({current_admin.id}) at {datetime.now(timezone.utc)}"
            change_note += f"\nChanges: {', '.join(changes_made)}"
            
            tenant.notes = (tenant.notes or "") + change_note
            tenant.updated_at = datetime.now(timezone.utc)
        
        db.commit()
        
        logger.info(f"Super admin {current_admin.id} updated credentials for tenant {tenant_id}")
        
        return TenantCredentialsResponse(
            success=True,
            message="Tenant credentials updated successfully",
            tenant_id=tenant_id,
            tenant_name=tenant.name,
            updated_email=tenant_owner.email if credentials_data.email else None,
            changes_made=changes_made,
            updated_at=datetime.now(timezone.utc)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to update tenant credentials for {tenant_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update tenant credentials: {str(e)}"
        )


@router.put("/tenants/{tenant_id}/full-update", response_model=TenantFullUpdateResponse)
async def full_tenant_update(
    tenant_id: str,
    update_data: TenantFullUpdateRequest,
    current_admin: User = Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    """
    Comprehensive tenant update including profile and subscription information
    Supports updating all tenant fields including subscription plan changes
    """
    try:
        tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
        if not tenant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tenant not found"
            )
        
        # Track changes for audit log
        changes = []
        old_values = {}
        
        # Update basic information
        if update_data.name and update_data.name != tenant.name:
            old_values["name"] = tenant.name
            changes.append(f"Name: {tenant.name} → {update_data.name}")
            tenant.name = update_data.name
        
        if update_data.phone and update_data.phone != tenant.phone:
            old_values["phone"] = tenant.phone
            changes.append(f"Phone: {tenant.phone or 'None'} → {update_data.phone}")
            tenant.phone = update_data.phone
        
        if update_data.address and update_data.address != tenant.address:
            old_values["address"] = tenant.address
            changes.append(f"Address updated")
            tenant.address = update_data.address
        
        if update_data.business_type and update_data.business_type != tenant.business_type:
            old_values["business_type"] = tenant.business_type
            changes.append(f"Business type: {tenant.business_type or 'None'} → {update_data.business_type}")
            tenant.business_type = update_data.business_type
        
        # Update subscription if provided
        if update_data.subscription_type and update_data.subscription_type != tenant.subscription_type:
            old_subscription = tenant.subscription_type
            old_values["subscription_type"] = old_subscription
            changes.append(f"Subscription: {old_subscription.value} → {update_data.subscription_type.value}")
            
            tenant.subscription_type = update_data.subscription_type
            
            # Adjust limits based on new subscription
            if update_data.subscription_type == SubscriptionType.PRO:
                tenant.max_users = 5
                tenant.max_products = -1  # Unlimited
                tenant.max_customers = -1
                tenant.max_monthly_invoices = -1
                
                # Set subscription dates if upgrading to Pro
                if update_data.subscription_duration_months:
                    tenant.subscription_starts_at = datetime.now(timezone.utc)
                    tenant.subscription_expires_at = datetime.now(timezone.utc) + timedelta(
                        days=30 * update_data.subscription_duration_months
                    )
                    changes.append(f"Pro subscription set for {update_data.subscription_duration_months} months")
            else:  # Free plan
                tenant.max_users = 1
                tenant.max_products = 10
                tenant.max_customers = 10
                tenant.max_monthly_invoices = 10
                tenant.subscription_expires_at = None
                changes.append("Downgraded to Free plan limits")
        
        # Update custom limits if provided
        if update_data.max_users is not None and update_data.max_users != tenant.max_users:
            old_values["max_users"] = tenant.max_users
            changes.append(f"Max users: {tenant.max_users} → {update_data.max_users}")
            tenant.max_users = update_data.max_users
        
        if update_data.max_products is not None and update_data.max_products != tenant.max_products:
            old_values["max_products"] = tenant.max_products
            changes.append(f"Max products: {tenant.max_products} → {update_data.max_products}")
            tenant.max_products = update_data.max_products
        
        if update_data.max_customers is not None and update_data.max_customers != tenant.max_customers:
            old_values["max_customers"] = tenant.max_customers
            changes.append(f"Max customers: {tenant.max_customers} → {update_data.max_customers}")
            tenant.max_customers = update_data.max_customers
        
        if update_data.max_monthly_invoices is not None and update_data.max_monthly_invoices != tenant.max_monthly_invoices:
            old_values["max_monthly_invoices"] = tenant.max_monthly_invoices
            changes.append(f"Max monthly invoices: {tenant.max_monthly_invoices} → {update_data.max_monthly_invoices}")
            tenant.max_monthly_invoices = update_data.max_monthly_invoices
        
        # Update status if provided
        if update_data.status and update_data.status != tenant.status:
            old_values["status"] = tenant.status
            changes.append(f"Status: {tenant.status.value} → {update_data.status.value}")
            tenant.status = update_data.status
        
        # Add audit log
        if changes:
            audit_note = f"\nFull update by admin {current_admin.email} ({current_admin.id}) at {datetime.now(timezone.utc)}:"
            audit_note += "\n" + "\n".join(f"- {change}" for change in changes)
            
            if update_data.admin_notes:
                audit_note += f"\nAdmin notes: {update_data.admin_notes}"
            
            tenant.notes = (tenant.notes or "") + audit_note
        
        tenant.updated_at = datetime.now(timezone.utc)
        db.commit()
        
        logger.info(f"Super admin {current_admin.id} performed full update on tenant {tenant_id}")
        
        return TenantFullUpdateResponse(
            success=True,
            message="Tenant updated successfully",
            tenant_id=tenant_id,
            tenant_name=tenant.name,
            changes_made=len(changes),
            changes=changes,
            old_values=old_values,
            updated_at=datetime.now(timezone.utc)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to perform full update on tenant {tenant_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update tenant: {str(e)}"
        )


@router.get("/tenants/{tenant_id}/audit-log", response_model=TenantAuditLogResponse)
async def get_tenant_audit_log(
    tenant_id: str,
    current_admin: User = Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get audit log for tenant showing all administrative changes
    """
    try:
        tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
        if not tenant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tenant not found"
            )
        
        # Parse audit log from notes (simple implementation)
        audit_entries = []
        if tenant.notes:
            # Split notes by admin actions (lines starting with specific patterns)
            lines = tenant.notes.split('\n')
            current_entry = None
            
            for line in lines:
                line = line.strip()
                if not line:
                    continue
                
                # Check if this is a new audit entry
                if any(keyword in line.lower() for keyword in ['updated by admin', 'created by admin', 'changed by admin']):
                    if current_entry:
                        audit_entries.append(current_entry)
                    
                    current_entry = {
                        "timestamp": datetime.now(timezone.utc),  # Default timestamp
                        "admin_action": line,
                        "details": []
                    }
                    
                    # Try to extract timestamp from the line
                    try:
                        if " at " in line:
                            timestamp_str = line.split(" at ")[-1].split(")")[0]
                            # This is a simplified timestamp extraction
                            current_entry["timestamp"] = datetime.now(timezone.utc)
                    except:
                        pass
                        
                elif current_entry and line.startswith('-'):
                    current_entry["details"].append(line[1:].strip())
                elif current_entry:
                    current_entry["details"].append(line)
            
            if current_entry:
                audit_entries.append(current_entry)
        
        return TenantAuditLogResponse(
            tenant_id=tenant_id,
            tenant_name=tenant.name,
            audit_entries=audit_entries,
            total_entries=len(audit_entries),
            last_updated=tenant.updated_at
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get audit log for tenant {tenant_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get audit log: {str(e)}"
        )


@router.post("/tenants/{tenant_id}/reset-owner-password")
async def reset_tenant_owner_password(
    tenant_id: str,
    new_password: str,
    current_admin: User = Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    """
    Reset tenant owner password (emergency function)
    """
    try:
        # Get tenant
        tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
        if not tenant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tenant not found"
            )
        
        # Get tenant owner
        tenant_owner = db.query(User).filter(
            User.tenant_id == tenant_id,
            User.role == UserRole.OWNER
        ).first()
        
        if not tenant_owner:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tenant owner not found"
            )
        
        # Validate password strength
        if len(new_password) < 8:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password must be at least 8 characters long"
            )
        
        # Hash and set new password
        hashed_password = get_password_hash(new_password)
        tenant_owner.password_hash = hashed_password
        tenant_owner.updated_at = datetime.now(timezone.utc)
        
        # Log the password reset
        reset_note = f"\nPassword reset by admin {current_admin.email} ({current_admin.id}) at {datetime.now(timezone.utc)}"
        reset_note += f"\nReason: Emergency password reset"
        
        tenant.notes = (tenant.notes or "") + reset_note
        tenant.updated_at = datetime.now(timezone.utc)
        
        db.commit()
        
        logger.warning(f"Super admin {current_admin.id} reset password for tenant owner {tenant_owner.id}")
        
        return {
            "success": True,
            "message": "Tenant owner password reset successfully",
            "tenant_id": tenant_id,
            "owner_email": tenant_owner.email
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to reset password for tenant {tenant_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to reset password: {str(e)}"
        )