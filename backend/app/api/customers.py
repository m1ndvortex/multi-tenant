"""
Customer management API endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session
from typing import List, Optional
import uuid

from app.core.database import get_db
from app.core.auth import get_current_user
from app.core.permissions import require_permission
from app.models.user import User
from app.services.customer_service import CustomerService
from app.schemas.customer import (
    CustomerCreate, CustomerUpdate, CustomerResponse, CustomerListResponse,
    CustomerSearchRequest, CustomerInteractionCreate, CustomerInteractionResponse,
    CustomerInteractionListResponse, CustomerStatsResponse, CustomerLifetimeValueResponse,
    CustomerDebtSummaryResponse, CustomerExportRequest, CustomerTagsResponse
)
from app.core.exceptions import NotFoundError, ValidationError

router = APIRouter(prefix="/api/customers", tags=["customers"])


@router.post("/", response_model=CustomerResponse)
async def create_customer(
    customer_data: CustomerCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new customer"""
    require_permission(current_user, "customers:create")
    
    try:
        service = CustomerService(db)
        customer = service.create_customer(customer_data, current_user.tenant_id)
        
        # Convert to response model
        response_data = CustomerResponse.from_orm(customer)
        
        # Add computed properties
        response_data.display_name = customer.display_name
        response_data.primary_contact = customer.primary_contact
        response_data.full_address = customer.full_address
        response_data.is_vip = customer.is_vip
        response_data.has_outstanding_debt = customer.has_outstanding_debt
        
        return response_data
        
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to create customer")


@router.get("/", response_model=CustomerListResponse)
async def list_customers(
    query: Optional[str] = Query(None, description="Search query"),
    status: Optional[str] = Query(None, description="Filter by status"),
    customer_type: Optional[str] = Query(None, description="Filter by customer type"),
    tags: Optional[List[str]] = Query(None, description="Filter by tags"),
    has_debt: Optional[bool] = Query(None, description="Filter customers with debt"),
    city: Optional[str] = Query(None, description="Filter by city"),
    sort_by: str = Query("created_at", description="Sort field"),
    sort_order: str = Query("desc", description="Sort order"),
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(20, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List customers with search and filtering"""
    require_permission(current_user, "customers:read")
    
    try:
        search_request = CustomerSearchRequest(
            query=query,
            status=status,
            customer_type=customer_type,
            tags=tags or [],
            has_debt=has_debt,
            city=city,
            sort_by=sort_by,
            sort_order=sort_order,
            page=page,
            per_page=per_page
        )
        
        service = CustomerService(db)
        customers, total = service.search_customers(search_request, current_user.tenant_id)
        
        # Convert to response models
        customer_responses = []
        for customer in customers:
            response_data = CustomerResponse.from_orm(customer)
            response_data.display_name = customer.display_name
            response_data.primary_contact = customer.primary_contact
            response_data.full_address = customer.full_address
            response_data.is_vip = customer.is_vip
            response_data.has_outstanding_debt = customer.has_outstanding_debt
            customer_responses.append(response_data)
        
        total_pages = (total + per_page - 1) // per_page
        
        return CustomerListResponse(
            customers=customer_responses,
            total=total,
            page=page,
            per_page=per_page,
            total_pages=total_pages
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to retrieve customers")


@router.get("/stats", response_model=CustomerStatsResponse)
async def get_customer_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get customer statistics for dashboard"""
    require_permission(current_user, "customers:read")
    
    try:
        service = CustomerService(db)
        stats = service.get_customer_stats(current_user.tenant_id)
        return stats
        
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to retrieve customer statistics")


@router.get("/lifetime-values", response_model=List[CustomerLifetimeValueResponse])
async def get_customer_lifetime_values(
    limit: int = Query(50, ge=1, le=200, description="Number of customers to return"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get customer lifetime values"""
    require_permission(current_user, "customers:read")
    
    try:
        service = CustomerService(db)
        lifetime_values = service.get_customer_lifetime_values(current_user.tenant_id, limit)
        return lifetime_values
        
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to retrieve customer lifetime values")


@router.get("/debt-summary", response_model=List[CustomerDebtSummaryResponse])
async def get_customer_debt_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get customers with outstanding debt summary"""
    require_permission(current_user, "customers:read")
    
    try:
        service = CustomerService(db)
        debt_summary = service.get_customer_debt_summary(current_user.tenant_id)
        return debt_summary
        
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to retrieve debt summary")


@router.get("/tags", response_model=CustomerTagsResponse)
async def get_customer_tags(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all customer tags with usage counts"""
    require_permission(current_user, "customers:read")
    
    try:
        service = CustomerService(db)
        tags_data = service.get_all_tags(current_user.tenant_id)
        return CustomerTagsResponse(**tags_data)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to retrieve customer tags")


@router.post("/export")
async def export_customers(
    export_request: CustomerExportRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Export customer data to CSV or JSON"""
    require_permission(current_user, "customers:export")
    
    try:
        service = CustomerService(db)
        export_data = service.export_customers(export_request, current_user.tenant_id)
        
        # Set appropriate content type and filename
        if export_request.format.lower() == "json":
            media_type = "application/json"
            filename = "customers_export.json"
        else:
            media_type = "text/csv"
            filename = "customers_export.csv"
        
        return Response(
            content=export_data,
            media_type=media_type,
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to export customer data")


@router.get("/{customer_id}", response_model=CustomerResponse)
async def get_customer(
    customer_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get customer by ID"""
    require_permission(current_user, "customers:read")
    
    try:
        customer_uuid = uuid.UUID(customer_id)
        service = CustomerService(db)
        customer = service.get_customer_with_details(customer_uuid, current_user.tenant_id)
        
        if not customer:
            raise HTTPException(status_code=404, detail="Customer not found")
        
        # Convert to response model
        response_data = CustomerResponse.from_orm(customer)
        response_data.display_name = customer.display_name
        response_data.primary_contact = customer.primary_contact
        response_data.full_address = customer.full_address
        response_data.is_vip = customer.is_vip
        response_data.has_outstanding_debt = customer.has_outstanding_debt
        
        return response_data
        
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid customer ID format")
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to retrieve customer")


@router.put("/{customer_id}", response_model=CustomerResponse)
async def update_customer(
    customer_id: str,
    customer_data: CustomerUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update customer information"""
    require_permission(current_user, "customers:update")
    
    try:
        customer_uuid = uuid.UUID(customer_id)
        service = CustomerService(db)
        customer = service.update_customer(customer_uuid, customer_data, current_user.tenant_id, current_user.id)
        
        if not customer:
            raise HTTPException(status_code=404, detail="Customer not found")
        
        # Convert to response model
        response_data = CustomerResponse.from_orm(customer)
        response_data.display_name = customer.display_name
        response_data.primary_contact = customer.primary_contact
        response_data.full_address = customer.full_address
        response_data.is_vip = customer.is_vip
        response_data.has_outstanding_debt = customer.has_outstanding_debt
        
        return response_data
        
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid customer ID format")
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to update customer")


@router.delete("/{customer_id}")
async def delete_customer(
    customer_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete customer (soft delete)"""
    require_permission(current_user, "customers:delete")
    
    try:
        customer_uuid = uuid.UUID(customer_id)
        service = CustomerService(db)
        success = service.delete_customer(customer_uuid, current_user.tenant_id, current_user.id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Customer not found")
        
        return {"message": "Customer deleted successfully"}
        
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid customer ID format")
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to delete customer")


# Customer Interaction Endpoints

@router.post("/{customer_id}/interactions", response_model=CustomerInteractionResponse)
async def create_customer_interaction(
    customer_id: str,
    interaction_data: CustomerInteractionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new customer interaction"""
    require_permission(current_user, "customers:update")
    
    try:
        # Ensure customer_id matches the URL parameter
        if interaction_data.customer_id != customer_id:
            raise HTTPException(status_code=400, detail="Customer ID mismatch")
        
        service = CustomerService(db)
        interaction = service.create_interaction(interaction_data, current_user.tenant_id, current_user.id)
        
        return CustomerInteractionResponse.from_orm(interaction)
        
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to create interaction")


@router.get("/{customer_id}/interactions", response_model=CustomerInteractionListResponse)
async def get_customer_interactions(
    customer_id: str,
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(20, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get customer interactions with pagination"""
    require_permission(current_user, "customers:read")
    
    try:
        customer_uuid = uuid.UUID(customer_id)
        service = CustomerService(db)
        interactions, total = service.get_customer_interactions(customer_uuid, current_user.tenant_id, page, per_page)
        
        interaction_responses = [CustomerInteractionResponse.from_orm(interaction) for interaction in interactions]
        total_pages = (total + per_page - 1) // per_page
        
        return CustomerInteractionListResponse(
            interactions=interaction_responses,
            total=total,
            page=page,
            per_page=per_page,
            total_pages=total_pages
        )
        
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid customer ID format")
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to retrieve interactions")