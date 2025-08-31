"""
API endpoints for tenant management and switching
"""

from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
import uuid

from ..core.database import get_db
from ..core.auth import get_current_user, get_super_admin_user
from ..core.tenant_context import (
    TenantContext, get_current_tenant_context, TenantValidator
)
from ..core.tenant_operations import (
    TenantSwitchingUtility, TenantDataIsolationValidator, get_tenant_operations
)
from ..models.user import User
from ..models.tenant import Tenant, TenantStatus

router = APIRouter(prefix="/tenant", tags=["Tenant Management"])


# Pydantic models for request/response
class TenantSwitchRequest(BaseModel):
    """Request model for tenant switching"""
    target_tenant_id: str = Field(..., description="Target tenant ID to switch to")


class TenantSwitchResponse(BaseModel):
    """Response model for tenant switching"""
    success: bool
    message: str
    tenant_id: str
    tenant_name: str


class TenantAccessValidationRequest(BaseModel):
    """Request model for tenant access validation"""
    tenant_id: str = Field(..., description="Tenant ID to validate access to")
    resource_type: str = Field(..., description="Type of resource being accessed")
    resource_id: Optional[str] = Field(None, description="Specific resource ID")


class TenantAccessValidationResponse(BaseModel):
    """Response model for tenant access validation"""
    has_access: bool
    tenant_id: str
    resource_type: str
    resource_id: Optional[str]
    reason: Optional[str]


class AccessibleTenantInfo(BaseModel):
    """Information about accessible tenant"""
    id: str
    name: str
    subscription_type: str
    status: str
    is_current: bool


class AccessibleTenantsResponse(BaseModel):
    """Response model for accessible tenants"""
    tenants: List[AccessibleTenantInfo]
    current_tenant_id: Optional[str]


class TenantDataIntegrityResponse(BaseModel):
    """Response model for tenant data integrity check"""
    tenant_id: str
    timestamp: str
    checks: Dict[str, Any]
    orphaned_records: Dict[str, int]
    overall_status: str


class TenantUsageStatsResponse(BaseModel):
    """Response model for tenant usage statistics"""
    tenant_id: str
    usage: Dict[str, int]
    limits: Dict[str, int]
    subscription_type: str
    subscription_active: bool


@router.get("/accessible", response_model=AccessibleTenantsResponse)
async def get_accessible_tenants(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get list of tenants accessible to current user
    """
    try:
        utility = TenantSwitchingUtility(db)
        accessible_tenants = utility.get_user_accessible_tenants(str(current_user.id))
        
        # Get current tenant context, fallback to user's default tenant
        current_context = TenantContext.get_current()
        current_tenant_id = current_context.tenant_id
        
        # If no active tenant context, use user's default tenant
        if current_tenant_id is None and current_user.tenant_id:
            current_tenant_id = str(current_user.tenant_id)
        
        # If still no tenant and user has accessible tenants, use the first one
        if current_tenant_id is None and accessible_tenants:
            current_tenant_id = accessible_tenants[0]["id"]
        
        tenant_info = []
        for tenant_data in accessible_tenants:
            tenant_info.append(AccessibleTenantInfo(
                id=tenant_data["id"],
                name=tenant_data["name"],
                subscription_type=tenant_data["subscription_type"],
                status=tenant_data["status"],
                is_current=(tenant_data["id"] == current_tenant_id)
            ))
        
        return AccessibleTenantsResponse(
            tenants=tenant_info,
            current_tenant_id=current_tenant_id
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get accessible tenants: {str(e)}"
        )


@router.post("/switch", response_model=TenantSwitchResponse)
async def switch_tenant(
    request: TenantSwitchRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Switch current user's tenant context
    Note: This endpoint validates the switch but doesn't actually change the JWT token.
    The client needs to request a new token with the new tenant context.
    """
    try:
        utility = TenantSwitchingUtility(db)
        
        # Validate the tenant switch
        new_context = utility.switch_tenant_context(
            str(current_user.id), 
            request.target_tenant_id
        )
        
        # Get tenant information
        tenant = db.query(Tenant).filter(
            Tenant.id == request.target_tenant_id,
            Tenant.is_active == True
        ).first()
        
        if not tenant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Target tenant not found or inactive"
            )
        
        return TenantSwitchResponse(
            success=True,
            message=f"Successfully validated switch to tenant {tenant.name}",
            tenant_id=request.target_tenant_id,
            tenant_name=tenant.name
        )
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to switch tenant: {str(e)}"
        )


@router.post("/validate-access", response_model=TenantAccessValidationResponse)
async def validate_tenant_access(
    request: TenantAccessValidationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Validate if current user has access to specific tenant resource
    """
    try:
        context = TenantContext.get_current()
        
        # If no active tenant context, check if user belongs to the requested tenant
        if context.tenant_id is None:
            # Check if user has access to the requested tenant
            utility = TenantSwitchingUtility(db)
            accessible_tenants = utility.get_user_accessible_tenants(str(current_user.id))
            accessible_tenant_ids = [t["id"] for t in accessible_tenants]
            has_access = request.tenant_id in accessible_tenant_ids
        else:
            # Check basic tenant access using context
            has_access = context.validate_tenant_access(request.tenant_id)
        
        reason = None
        
        if not has_access:
            reason = "User does not have access to the specified tenant"
        elif request.resource_id:
            # Check specific resource access if resource_id provided
            from ..models import Customer, Product, Invoice  # Import here to avoid circular imports
            
            model_map = {
                "customer": Customer,
                "customers": Customer,
                "product": Product,
                "products": Product,
                "invoice": Invoice,
                "invoices": Invoice
            }
            
            model_class = model_map.get(request.resource_type.lower())
            if model_class:
                validator = TenantDataIsolationValidator(db)
                validation_results = validator.validate_cross_tenant_access(
                    model_class, [request.resource_id], request.tenant_id
                )
                has_access = validation_results.get(request.resource_id, False)
                if not has_access:
                    reason = f"Resource {request.resource_id} does not belong to tenant {request.tenant_id}"
        
        return TenantAccessValidationResponse(
            has_access=has_access,
            tenant_id=request.tenant_id,
            resource_type=request.resource_type,
            resource_id=request.resource_id,
            reason=reason
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to validate tenant access: {str(e)}"
        )


@router.get("/current/usage", response_model=TenantUsageStatsResponse)
async def get_current_tenant_usage(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get usage statistics for current tenant
    """
    try:
        context = TenantContext.get_current()
        tenant_id = context.tenant_id
        
        # If no active tenant context, use user's default tenant
        if tenant_id is None and current_user.tenant_id:
            tenant_id = str(current_user.tenant_id)
        
        if not tenant_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No tenant context available"
            )
        
        # Get tenant
        tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
        if not tenant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tenant not found"
            )
        
        # Get usage statistics
        usage_stats = tenant.get_usage_stats(db)
        
        # Get limits
        limits = {
            "users": tenant.max_users,
            "products": tenant.max_products,
            "customers": tenant.max_customers,
            "monthly_invoices": tenant.max_monthly_invoices
        }
        
        return TenantUsageStatsResponse(
            tenant_id=str(tenant.id),
            usage=usage_stats,
            limits=limits,
            subscription_type=tenant.subscription_type.value,
            subscription_active=tenant.is_subscription_active
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get tenant usage: {str(e)}"
        )


@router.get("/{tenant_id}/integrity", response_model=TenantDataIntegrityResponse)
async def check_tenant_data_integrity(
    tenant_id: str,
    current_user: User = Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    """
    Check data integrity for specific tenant (Super Admin only)
    """
    try:
        # Validate tenant exists
        tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
        if not tenant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tenant not found"
            )
        
        # Run integrity check
        validator = TenantDataIsolationValidator(db)
        integrity_report = validator.check_tenant_data_integrity(tenant_id)
        
        # Determine overall status
        total_orphaned = sum(integrity_report["orphaned_records"].values())
        overall_status = "healthy" if total_orphaned == 0 else "issues_detected"
        
        return TenantDataIntegrityResponse(
            tenant_id=integrity_report["tenant_id"],
            timestamp=integrity_report["timestamp"],
            checks=integrity_report["checks"],
            orphaned_records=integrity_report["orphaned_records"],
            overall_status=overall_status
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to check tenant data integrity: {str(e)}"
        )


@router.post("/{tenant_id}/validate-isolation")
async def validate_tenant_isolation(
    tenant_id: str,
    current_user: User = Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    """
    Validate tenant data isolation (Super Admin only)
    """
    try:
        # Validate tenant exists
        tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
        if not tenant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tenant not found"
            )
        
        validator = TenantDataIsolationValidator(db)
        
        # Check isolation for different model types
        from ..models import Customer, Product, Invoice, User
        
        isolation_results = {}
        
        models_to_check = [
            (Customer, "customers"),
            (Product, "products"),
            (Invoice, "invoices"),
            (User, "users")
        ]
        
        for model_class, model_name in models_to_check:
            # Get all records for this tenant
            tenant_records = db.query(model_class).filter(
                model_class.tenant_id == tenant_id
            ).all()
            
            if tenant_records:
                record_ids = [str(record.id) for record in tenant_records]
                validation_results = validator.validate_cross_tenant_access(
                    model_class, record_ids, tenant_id
                )
                
                violations = [
                    record_id for record_id, is_valid in validation_results.items()
                    if not is_valid
                ]
                
                isolation_results[model_name] = {
                    "total_records": len(record_ids),
                    "violations": len(violations),
                    "violation_ids": violations,
                    "status": "ok" if len(violations) == 0 else "violations_detected"
                }
            else:
                isolation_results[model_name] = {
                    "total_records": 0,
                    "violations": 0,
                    "violation_ids": [],
                    "status": "ok"
                }
        
        # Overall status
        total_violations = sum(result["violations"] for result in isolation_results.values())
        overall_status = "isolated" if total_violations == 0 else "isolation_violations"
        
        return {
            "tenant_id": tenant_id,
            "timestamp": "datetime.utcnow().isoformat()",
            "isolation_results": isolation_results,
            "overall_status": overall_status,
            "total_violations": total_violations
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to validate tenant isolation: {str(e)}"
        )


@router.get("/context/current")
async def get_current_context(
    current_user: User = Depends(get_current_user),
    context: TenantContext = Depends(get_current_tenant_context)
):
    """
    Get current tenant context information
    """
    # If no active tenant context, use user's default tenant
    tenant_id = context.tenant_id
    if tenant_id is None and current_user.tenant_id:
        tenant_id = str(current_user.tenant_id)
    
    return {
        "tenant_id": tenant_id,
        "user_id": context.user_id or str(current_user.id),
        "is_super_admin": context.is_super_admin or current_user.is_super_admin,
        "is_impersonation": context.is_impersonation
    }


@router.post("/context/validate")
async def validate_context_access(
    target_tenant_id: str,
    current_user: User = Depends(get_current_user),
    context: TenantContext = Depends(get_current_tenant_context),
    db: Session = Depends(get_db)
):
    """
    Validate if current context can access target tenant
    """
    try:
        # If no active tenant context, check if user has access to the target tenant
        if context.tenant_id is None:
            utility = TenantSwitchingUtility(db)
            accessible_tenants = utility.get_user_accessible_tenants(str(current_user.id))
            accessible_tenant_ids = [t["id"] for t in accessible_tenants]
            has_access = target_tenant_id in accessible_tenant_ids
        else:
            has_access = context.validate_tenant_access(target_tenant_id)
        
        # Get current tenant ID (fallback to user's default tenant)
        current_tenant_id = context.tenant_id
        if current_tenant_id is None and current_user.tenant_id:
            current_tenant_id = str(current_user.tenant_id)
        
        return {
            "has_access": has_access,
            "current_tenant_id": current_tenant_id,
            "target_tenant_id": target_tenant_id,
            "is_super_admin": context.is_super_admin or current_user.is_super_admin
        }
        
    except Exception as e:
        return {
            "has_access": False,
            "current_tenant_id": context.tenant_id,
            "target_tenant_id": target_tenant_id,
            "is_super_admin": context.is_super_admin or current_user.is_super_admin,
            "error": str(e)
        }