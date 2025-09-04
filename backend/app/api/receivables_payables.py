"""
Receivables and Payables API endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Path
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from datetime import datetime

from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.user import User
from app.services.receivables_payables_service import ReceivablesPayablesService
from app.schemas.receivables_payables import (
    SupplierCreate, SupplierUpdate, SupplierResponse,
    SupplierBillCreate, SupplierBillUpdate, SupplierBillResponse,
    CustomerPaymentCreate, CustomerPaymentUpdate, CustomerPaymentResponse,
    SupplierPaymentCreate, SupplierPaymentUpdate, SupplierPaymentResponse,
    CustomerPaymentMatchingCreate, SupplierPaymentMatchingCreate,
    PaymentMatchingResponse, AgingReportResponse, OutstandingItemsResponse,
    ReceivablesPayablesFilter, PaymentStatusEnum
)
from app.core.exceptions import ValidationError, NotFoundError, BusinessLogicError

router = APIRouter(prefix="/api/receivables-payables", tags=["receivables-payables"])


# Supplier Management Endpoints
@router.post("/suppliers", response_model=SupplierResponse)
async def create_supplier(
    supplier_data: SupplierCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new supplier"""
    try:
        service = ReceivablesPayablesService(db)
        return service.create_supplier(current_user.tenant_id, supplier_data)
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/suppliers", response_model=List[SupplierResponse])
async def get_suppliers(
    skip: int = Query(0, ge=0, description="Number of suppliers to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Number of suppliers to return"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all suppliers for tenant"""
    try:
        service = ReceivablesPayablesService(db)
        return service.get_suppliers(current_user.tenant_id, skip, limit)
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/suppliers/{supplier_id}", response_model=SupplierResponse)
async def get_supplier(
    supplier_id: UUID = Path(..., description="Supplier ID"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get supplier by ID"""
    try:
        service = ReceivablesPayablesService(db)
        return service.get_supplier(current_user.tenant_id, supplier_id)
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")


@router.put("/suppliers/{supplier_id}", response_model=SupplierResponse)
async def update_supplier(
    supplier_data: SupplierUpdate,
    supplier_id: UUID = Path(..., description="Supplier ID"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update supplier"""
    try:
        service = ReceivablesPayablesService(db)
        return service.update_supplier(current_user.tenant_id, supplier_id, supplier_data)
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")


@router.delete("/suppliers/{supplier_id}")
async def delete_supplier(
    supplier_id: UUID = Path(..., description="Supplier ID"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete supplier"""
    try:
        service = ReceivablesPayablesService(db)
        success = service.delete_supplier(current_user.tenant_id, supplier_id)
        return {"success": success, "message": "Supplier deleted successfully"}
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except BusinessLogicError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")


# Supplier Bill Management Endpoints
@router.post("/supplier-bills", response_model=SupplierBillResponse)
async def create_supplier_bill(
    bill_data: SupplierBillCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new supplier bill"""
    try:
        service = ReceivablesPayablesService(db)
        return service.create_supplier_bill(current_user.tenant_id, bill_data)
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/supplier-bills", response_model=List[SupplierBillResponse])
async def get_supplier_bills(
    supplier_id: Optional[UUID] = Query(None, description="Filter by supplier ID"),
    date_from: Optional[datetime] = Query(None, description="Filter from date"),
    date_to: Optional[datetime] = Query(None, description="Filter to date"),
    status: Optional[PaymentStatusEnum] = Query(None, description="Filter by status"),
    overdue_only: bool = Query(False, description="Show only overdue bills"),
    include_paid: bool = Query(True, description="Include paid bills"),
    skip: int = Query(0, ge=0, description="Number of bills to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Number of bills to return"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get supplier bills with filtering"""
    try:
        service = ReceivablesPayablesService(db)
        filter_params = ReceivablesPayablesFilter(
            date_from=date_from,
            date_to=date_to,
            supplier_id=supplier_id,
            status=status,
            overdue_only=overdue_only,
            include_paid=include_paid
        )
        return service.get_supplier_bills(current_user.tenant_id, supplier_id, filter_params, skip, limit)
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/supplier-bills/{bill_id}", response_model=SupplierBillResponse)
async def get_supplier_bill(
    bill_id: UUID = Path(..., description="Supplier bill ID"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get supplier bill by ID"""
    try:
        service = ReceivablesPayablesService(db)
        return service.get_supplier_bill(current_user.tenant_id, bill_id)
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")


# Customer Payment Management Endpoints
@router.post("/customer-payments", response_model=CustomerPaymentResponse)
async def create_customer_payment(
    payment_data: CustomerPaymentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new customer payment"""
    try:
        service = ReceivablesPayablesService(db)
        return service.create_customer_payment(current_user.tenant_id, payment_data)
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/customer-payments", response_model=List[CustomerPaymentResponse])
async def get_customer_payments(
    customer_id: Optional[UUID] = Query(None, description="Filter by customer ID"),
    date_from: Optional[datetime] = Query(None, description="Filter from date"),
    date_to: Optional[datetime] = Query(None, description="Filter to date"),
    skip: int = Query(0, ge=0, description="Number of payments to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Number of payments to return"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get customer payments with filtering"""
    try:
        service = ReceivablesPayablesService(db)
        filter_params = ReceivablesPayablesFilter(
            date_from=date_from,
            date_to=date_to,
            customer_id=customer_id
        )
        return service.get_customer_payments(current_user.tenant_id, customer_id, filter_params, skip, limit)
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")


# Supplier Payment Management Endpoints
@router.post("/supplier-payments", response_model=SupplierPaymentResponse)
async def create_supplier_payment(
    payment_data: SupplierPaymentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new supplier payment"""
    try:
        service = ReceivablesPayablesService(db)
        return service.create_supplier_payment(current_user.tenant_id, payment_data)
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/supplier-payments", response_model=List[SupplierPaymentResponse])
async def get_supplier_payments(
    supplier_id: Optional[UUID] = Query(None, description="Filter by supplier ID"),
    date_from: Optional[datetime] = Query(None, description="Filter from date"),
    date_to: Optional[datetime] = Query(None, description="Filter to date"),
    skip: int = Query(0, ge=0, description="Number of payments to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Number of payments to return"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get supplier payments with filtering"""
    try:
        service = ReceivablesPayablesService(db)
        filter_params = ReceivablesPayablesFilter(
            date_from=date_from,
            date_to=date_to,
            supplier_id=supplier_id
        )
        return service.get_supplier_payments(current_user.tenant_id, supplier_id, filter_params, skip, limit)
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")


# Payment Matching Endpoints
@router.post("/payment-matching/customer", response_model=PaymentMatchingResponse)
async def match_customer_payment(
    matching_data: CustomerPaymentMatchingCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Match customer payment to invoice"""
    try:
        service = ReceivablesPayablesService(db)
        return service.match_customer_payment(current_user.tenant_id, matching_data, current_user.id)
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/payment-matching/supplier", response_model=PaymentMatchingResponse)
async def match_supplier_payment(
    matching_data: SupplierPaymentMatchingCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Match supplier payment to bill"""
    try:
        service = ReceivablesPayablesService(db)
        return service.match_supplier_payment(current_user.tenant_id, matching_data, current_user.id)
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")


# Aging Reports Endpoints
@router.get("/aging-reports/receivables", response_model=AgingReportResponse)
async def get_receivables_aging_report(
    as_of_date: Optional[datetime] = Query(None, description="As of date (defaults to current date)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get accounts receivable aging report"""
    try:
        service = ReceivablesPayablesService(db)
        return service.get_receivables_aging_report(current_user.tenant_id, as_of_date)
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/aging-reports/payables", response_model=AgingReportResponse)
async def get_payables_aging_report(
    as_of_date: Optional[datetime] = Query(None, description="As of date (defaults to current date)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get accounts payable aging report"""
    try:
        service = ReceivablesPayablesService(db)
        return service.get_payables_aging_report(current_user.tenant_id, as_of_date)
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")


# Outstanding Items Endpoint
@router.get("/outstanding-items", response_model=OutstandingItemsResponse)
async def get_outstanding_items(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all outstanding receivables and payables"""
    try:
        service = ReceivablesPayablesService(db)
        return service.get_outstanding_items(current_user.tenant_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")