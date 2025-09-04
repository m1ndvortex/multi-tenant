"""
Invoice API endpoints for dual invoice system (General and Gold)
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Path
from sqlalchemy.orm import Session
from typing import List, Optional
import uuid
import logging

from app.core.database import get_db
from app.core.auth import get_current_user
from app.core.permissions import require_permission
from app.models.user import User
from app.services.invoice_service import InvoiceService
from app.schemas.invoice import (
    InvoiceCreate, InvoiceUpdate, InvoiceResponse, InvoiceListResponse,
    InvoicePaginatedResponse, InvoiceFilter, InvoiceStatistics,
    PaymentCreate, InvoiceItemCreate, InvoiceItemUpdate, InvoiceItemResponse,
    InvoiceQRResponse, PublicInvoiceResponse, InvoiceTypeEnum, InvoiceStatusEnum
)
from app.core.exceptions import ValidationError, NotFoundError, BusinessLogicError

router = APIRouter(prefix="/api/invoices", tags=["invoices"])
logger = logging.getLogger(__name__)


@router.post("/", response_model=InvoiceResponse)
async def create_invoice(
    invoice_data: InvoiceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new invoice (General or Gold)"""
    # Check permissions
    require_permission(current_user, "invoices:create")
    
    try:
        service = InvoiceService(db)
        invoice = service.create_invoice(current_user.tenant_id, invoice_data)
        
        return InvoiceResponse.from_orm(invoice)
        
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to create invoice: {e}")
        raise HTTPException(status_code=500, detail="Failed to create invoice")


@router.get("/", response_model=InvoicePaginatedResponse)
async def get_invoices(
    # Pagination
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(50, ge=1, le=100, description="Items per page"),
    
    # Sorting
    sort_by: str = Query("created_at", description="Sort field"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$", description="Sort order"),
    
    # Filters
    customer_id: Optional[uuid.UUID] = Query(None, description="Filter by customer"),
    invoice_type: Optional[InvoiceTypeEnum] = Query(None, description="Filter by invoice type"),
    status: Optional[InvoiceStatusEnum] = Query(None, description="Filter by status"),
    is_installment: Optional[bool] = Query(None, description="Filter by installment status"),
    is_overdue: Optional[bool] = Query(None, description="Filter by overdue status"),
    search: Optional[str] = Query(None, description="Search in invoice number, customer name, or notes"),
    
    # Dependencies
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get paginated list of invoices with filters"""
    # Check permissions
    require_permission(current_user, "invoices:read")
    
    try:
        # Build filters
        filters = InvoiceFilter(
            customer_id=customer_id,
            invoice_type=invoice_type,
            status=status,
            is_installment=is_installment,
            is_overdue=is_overdue,
            search=search
        )
        
        service = InvoiceService(db)
        skip = (page - 1) * per_page
        
        invoices, total = service.get_invoices(
            tenant_id=current_user.tenant_id,
            filters=filters,
            skip=skip,
            limit=per_page,
            sort_by=sort_by,
            sort_order=sort_order
        )
        
        # Convert to list response format
        invoice_list = [
            InvoiceListResponse(
                id=inv.id,
                invoice_number=inv.invoice_number,
                customer_id=inv.customer_id,
                invoice_type=inv.invoice_type,
                status=inv.status,
                total_amount=inv.total_amount,
                paid_amount=inv.paid_amount,
                balance_due=inv.balance_due,
                invoice_date=inv.invoice_date,
                due_date=inv.due_date,
                is_installment=inv.is_installment,
                is_overdue=inv.is_overdue,
                created_at=inv.created_at
            )
            for inv in invoices
        ]
        
        # Calculate pagination info
        pages = (total + per_page - 1) // per_page
        has_next = page < pages
        has_prev = page > 1
        
        return InvoicePaginatedResponse(
            items=invoice_list,
            total=total,
            page=page,
            per_page=per_page,
            pages=pages,
            has_next=has_next,
            has_prev=has_prev
        )
        
    except Exception as e:
        logger.error(f"Failed to get invoices: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve invoices")


@router.get("/statistics", response_model=InvoiceStatistics)
async def get_invoice_statistics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get invoice statistics for the tenant"""
    # Check permissions
    require_permission(current_user, "invoices:read")
    
    try:
        service = InvoiceService(db)
        stats = service.get_invoice_statistics(current_user.tenant_id)
        
        return InvoiceStatistics(**stats)
        
    except Exception as e:
        logger.error(f"Failed to get invoice statistics: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve statistics")


@router.get("/{invoice_id}", response_model=InvoiceResponse)
async def get_invoice(
    invoice_id: uuid.UUID = Path(..., description="Invoice ID"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get invoice by ID"""
    # Check permissions
    require_permission(current_user, "invoices:read")
    
    try:
        service = InvoiceService(db)
        invoice = service.get_invoice(current_user.tenant_id, invoice_id)
        
        if not invoice:
            raise HTTPException(status_code=404, detail="Invoice not found")
        
        return InvoiceResponse.from_orm(invoice)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get invoice {invoice_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve invoice")


@router.get("/number/{invoice_number}", response_model=InvoiceResponse)
async def get_invoice_by_number(
    invoice_number: str = Path(..., description="Invoice number"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get invoice by invoice number"""
    # Check permissions
    require_permission(current_user, "invoices:read")
    
    try:
        service = InvoiceService(db)
        invoice = service.get_invoice_by_number(current_user.tenant_id, invoice_number)
        
        if not invoice:
            raise HTTPException(status_code=404, detail="Invoice not found")
        
        return InvoiceResponse.from_orm(invoice)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get invoice {invoice_number}: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve invoice")


@router.put("/{invoice_id}", response_model=InvoiceResponse)
async def update_invoice(
    invoice_id: uuid.UUID = Path(..., description="Invoice ID"),
    update_data: InvoiceUpdate = ...,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update invoice"""
    # Check permissions
    require_permission(current_user, "invoices:update")
    
    try:
        service = InvoiceService(db)
        invoice = service.update_invoice(current_user.tenant_id, invoice_id, update_data)
        
        return InvoiceResponse.from_orm(invoice)
        
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except BusinessLogicError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to update invoice {invoice_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to update invoice")


@router.delete("/{invoice_id}")
async def delete_invoice(
    invoice_id: uuid.UUID = Path(..., description="Invoice ID"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete invoice (soft delete)"""
    # Check permissions
    require_permission(current_user, "invoices:delete")
    
    try:
        service = InvoiceService(db)
        success = service.delete_invoice(current_user.tenant_id, invoice_id)
        
        if success:
            return {"message": "Invoice deleted successfully"}
        else:
            raise HTTPException(status_code=500, detail="Failed to delete invoice")
        
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except BusinessLogicError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to delete invoice {invoice_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete invoice")


@router.post("/{invoice_id}/send", response_model=InvoiceResponse)
async def send_invoice(
    invoice_id: uuid.UUID = Path(..., description="Invoice ID"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Send invoice to customer"""
    # Check permissions
    require_permission(current_user, "invoices:update")
    
    try:
        service = InvoiceService(db)
        invoice = service.send_invoice(current_user.tenant_id, invoice_id)
        
        return InvoiceResponse.from_orm(invoice)
        
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except BusinessLogicError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to send invoice {invoice_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to send invoice")


@router.post("/{invoice_id}/cancel", response_model=InvoiceResponse)
async def cancel_invoice(
    invoice_id: uuid.UUID = Path(..., description="Invoice ID"),
    reason: Optional[str] = Query(None, description="Cancellation reason"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Cancel invoice"""
    # Check permissions
    require_permission(current_user, "invoices:update")
    
    try:
        service = InvoiceService(db)
        invoice = service.cancel_invoice(current_user.tenant_id, invoice_id, reason)
        
        return InvoiceResponse.from_orm(invoice)
        
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except BusinessLogicError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to cancel invoice {invoice_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to cancel invoice")


@router.post("/{invoice_id}/payments", response_model=InvoiceResponse)
async def add_payment(
    invoice_id: uuid.UUID = Path(..., description="Invoice ID"),
    payment_data: PaymentCreate = ...,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add payment to invoice"""
    # Check permissions
    require_permission(current_user, "invoices:update")
    
    try:
        service = InvoiceService(db)
        invoice = service.add_payment(current_user.tenant_id, invoice_id, payment_data)
        
        return InvoiceResponse.from_orm(invoice)
        
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except BusinessLogicError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to add payment to invoice {invoice_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to add payment")


@router.get("/{invoice_id}/qr", response_model=InvoiceQRResponse)
async def get_invoice_qr(
    invoice_id: uuid.UUID = Path(..., description="Invoice ID"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get QR code information for invoice"""
    # Check permissions
    require_permission(current_user, "invoices:read")
    
    try:
        service = InvoiceService(db)
        invoice = service.get_invoice(current_user.tenant_id, invoice_id)
        
        if not invoice:
            raise HTTPException(status_code=404, detail="Invoice not found")
        
        if not invoice.is_shareable:
            raise HTTPException(status_code=422, detail="Invoice is not shareable")
        
        if not invoice.qr_code_token:
            # Generate QR token if not exists
            invoice.generate_qr_token()
            db.commit()
        
        # TODO: Replace with actual domain
        public_url = f"https://app.hesaabplus.com/public/invoice/{invoice.qr_code_token}"
        
        return InvoiceQRResponse(
            qr_code_token=invoice.qr_code_token,
            public_url=public_url
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get QR code for invoice {invoice_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to get QR code")


# Invoice Items Management
@router.post("/{invoice_id}/items", response_model=InvoiceItemResponse)
async def add_invoice_item(
    invoice_id: uuid.UUID = Path(..., description="Invoice ID"),
    item_data: InvoiceItemCreate = ...,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add item to invoice"""
    # Check permissions
    require_permission(current_user, "invoices:update")
    
    try:
        service = InvoiceService(db)
        item = service.add_invoice_item(current_user.tenant_id, invoice_id, item_data)
        
        return InvoiceItemResponse.from_orm(item)
        
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except BusinessLogicError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to add item to invoice {invoice_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to add item")


@router.put("/{invoice_id}/items/{item_id}", response_model=InvoiceItemResponse)
async def update_invoice_item(
    invoice_id: uuid.UUID = Path(..., description="Invoice ID"),
    item_id: uuid.UUID = Path(..., description="Item ID"),
    update_data: InvoiceItemUpdate = ...,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update invoice item"""
    # Check permissions
    require_permission(current_user, "invoices:update")
    
    try:
        service = InvoiceService(db)
        item = service.update_invoice_item(
            current_user.tenant_id, invoice_id, item_id, update_data
        )
        
        return InvoiceItemResponse.from_orm(item)
        
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except BusinessLogicError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to update item {item_id} in invoice {invoice_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to update item")


@router.delete("/{invoice_id}/items/{item_id}")
async def delete_invoice_item(
    invoice_id: uuid.UUID = Path(..., description="Invoice ID"),
    item_id: uuid.UUID = Path(..., description="Item ID"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete invoice item"""
    # Check permissions
    require_permission(current_user, "invoices:update")
    
    try:
        service = InvoiceService(db)
        success = service.delete_invoice_item(current_user.tenant_id, invoice_id, item_id)
        
        if success:
            return {"message": "Invoice item deleted successfully"}
        else:
            raise HTTPException(status_code=500, detail="Failed to delete item")
        
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except BusinessLogicError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to delete item {item_id} from invoice {invoice_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete item")


# Public Invoice Viewing (No authentication required)
@router.get("/public/{qr_token}", response_model=PublicInvoiceResponse)
async def get_public_invoice(
    qr_token: str = Path(..., description="QR code token"),
    db: Session = Depends(get_db)
):
    """Get public invoice view by QR token (no authentication required)"""
    try:
        service = InvoiceService(db)
        invoice = service.get_public_invoice(qr_token)
        
        if not invoice:
            raise HTTPException(status_code=404, detail="Invoice not found or not shareable")
        
        # Return limited public information
        return PublicInvoiceResponse(
            invoice_number=invoice.invoice_number,
            invoice_type=invoice.invoice_type,
            total_amount=invoice.total_amount,
            invoice_date=invoice.invoice_date,
            due_date=invoice.due_date,
            status=invoice.status,
            customer_notes=invoice.customer_notes,
            terms_and_conditions=invoice.terms_and_conditions,
            items=[
                {
                    "description": item.description,
                    "quantity": float(item.quantity),
                    "unit_price": float(item.unit_price),
                    "line_total": float(item.line_total),
                    "weight": float(item.weight) if item.weight else None,
                }
                for item in invoice.items
                if item.is_active
            ]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get public invoice {qr_token}: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve invoice")