"""
API endpoints for general installment system
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Path
from sqlalchemy.orm import Session
from typing import List, Optional
from decimal import Decimal
import uuid

from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.user import User
from app.services.installment_service import InstallmentService
from app.schemas.installment import (
    InstallmentPlanCreate, InstallmentPlanResponse, PaymentCreate, PaymentResponse,
    InstallmentDetail, InstallmentSummary, InstallmentListResponse,
    OutstandingBalance, PaymentHistoryResponse, InstallmentStatistics,
    InstallmentFilter, InstallmentUpdate, BulkPaymentCreate, BulkPaymentResponse
)
from app.core.exceptions import ValidationError, NotFoundError, BusinessLogicError

router = APIRouter(prefix="/installments", tags=["installments"])


@router.post("/plans", response_model=InstallmentPlanResponse)
async def create_installment_plan(
    plan_data: InstallmentPlanCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create installment plan for an invoice
    Requirements: 14.1, 14.2
    """
    try:
        service = InstallmentService(db)
        installments = service.create_installment_plan(
            tenant_id=current_user.tenant_id,
            invoice_id=plan_data.invoice_id,
            number_of_installments=plan_data.number_of_installments,
            start_date=plan_data.start_date,
            interval_days=plan_data.interval_days,
            interest_rate=plan_data.interest_rate
        )
        
        # Calculate total amount
        total_amount = sum(inst.amount_due for inst in installments)
        
        # Convert to summary format
        installment_summaries = [
            InstallmentSummary(
                id=inst.id,
                installment_number=inst.installment_number,
                status=inst.status.value,
                amount_due=inst.amount_due,
                amount_paid=inst.amount_paid or Decimal('0'),
                remaining_amount=inst.remaining_amount,
                due_date=inst.due_date,
                is_overdue=inst.is_overdue,
                days_overdue=inst.days_overdue
            ) for inst in installments
        ]
        
        return InstallmentPlanResponse(
            invoice_id=plan_data.invoice_id,
            installments_created=len(installments),
            total_amount=total_amount,
            installments=installment_summaries
        )
        
    except (ValidationError, NotFoundError, BusinessLogicError) as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/invoice/{invoice_id}", response_model=List[InstallmentDetail])
async def get_installments_for_invoice(
    invoice_id: uuid.UUID = Path(..., description="Invoice ID"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all installments for an invoice
    Requirements: 14.7
    """
    try:
        service = InstallmentService(db)
        installments = service.get_installments_for_invoice(
            tenant_id=current_user.tenant_id,
            invoice_id=invoice_id
        )
        
        return [
            InstallmentDetail(
                id=inst.id,
                invoice_id=inst.invoice_id,
                installment_number=inst.installment_number,
                installment_type=inst.installment_type.value,
                status=inst.status.value,
                amount_due=inst.amount_due,
                amount_paid=inst.amount_paid or Decimal('0'),
                due_date=inst.due_date,
                paid_at=inst.paid_at,
                payment_method=inst.payment_method,
                payment_reference=inst.payment_reference,
                notes=inst.notes,
                created_at=inst.created_at,
                updated_at=inst.updated_at,
                remaining_amount=inst.remaining_amount,
                is_overdue=inst.is_overdue,
                days_overdue=inst.days_overdue,
                is_fully_paid=inst.is_fully_paid
            ) for inst in installments
        ]
        
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/{installment_id}", response_model=InstallmentDetail)
async def get_installment(
    installment_id: uuid.UUID = Path(..., description="Installment ID"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get installment by ID"""
    try:
        service = InstallmentService(db)
        installment = service.get_installment(
            tenant_id=current_user.tenant_id,
            installment_id=installment_id
        )
        
        if not installment:
            raise HTTPException(status_code=404, detail="Installment not found")
        
        return InstallmentDetail(
            id=installment.id,
            invoice_id=installment.invoice_id,
            installment_number=installment.installment_number,
            installment_type=installment.installment_type.value,
            status=installment.status.value,
            amount_due=installment.amount_due,
            amount_paid=installment.amount_paid or Decimal('0'),
            due_date=installment.due_date,
            paid_at=installment.paid_at,
            payment_method=installment.payment_method,
            payment_reference=installment.payment_reference,
            notes=installment.notes,
            created_at=installment.created_at,
            updated_at=installment.updated_at,
            remaining_amount=installment.remaining_amount,
            is_overdue=installment.is_overdue,
            days_overdue=installment.days_overdue,
            is_fully_paid=installment.is_fully_paid
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/payments", response_model=PaymentResponse)
async def record_payment(
    payment_data: PaymentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Record payment for an installment
    Requirements: 14.3, 14.4
    """
    try:
        service = InstallmentService(db)
        installment = service.record_payment(
            tenant_id=current_user.tenant_id,
            installment_id=payment_data.installment_id,
            payment_amount=payment_data.payment_amount,
            payment_method=payment_data.payment_method,
            payment_reference=payment_data.payment_reference,
            notes=payment_data.notes
        )
        
        # Get updated outstanding balance
        outstanding_balance = service.get_outstanding_balance(
            tenant_id=current_user.tenant_id,
            invoice_id=installment.invoice_id
        )
        
        return PaymentResponse(
            installment=InstallmentDetail(
                id=installment.id,
                invoice_id=installment.invoice_id,
                installment_number=installment.installment_number,
                installment_type=installment.installment_type.value,
                status=installment.status.value,
                amount_due=installment.amount_due,
                amount_paid=installment.amount_paid or Decimal('0'),
                due_date=installment.due_date,
                paid_at=installment.paid_at,
                payment_method=installment.payment_method,
                payment_reference=installment.payment_reference,
                notes=installment.notes,
                created_at=installment.created_at,
                updated_at=installment.updated_at,
                remaining_amount=installment.remaining_amount,
                is_overdue=installment.is_overdue,
                days_overdue=installment.days_overdue,
                is_fully_paid=installment.is_fully_paid
            ),
            outstanding_balance=OutstandingBalance(**outstanding_balance),
            message="Payment recorded successfully"
        )
        
    except (ValidationError, NotFoundError, BusinessLogicError) as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/invoice/{invoice_id}/balance", response_model=OutstandingBalance)
async def get_outstanding_balance(
    invoice_id: uuid.UUID = Path(..., description="Invoice ID"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get outstanding balance for installment invoice
    Requirements: 14.4
    """
    try:
        service = InstallmentService(db)
        balance_info = service.get_outstanding_balance(
            tenant_id=current_user.tenant_id,
            invoice_id=invoice_id
        )
        
        return OutstandingBalance(**balance_info)
        
    except (ValidationError, NotFoundError) as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/invoice/{invoice_id}/payments", response_model=PaymentHistoryResponse)
async def get_payment_history(
    invoice_id: uuid.UUID = Path(..., description="Invoice ID"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get payment history for installment invoice
    Requirements: 14.4
    """
    try:
        service = InstallmentService(db)
        payment_history = service.get_payment_history(
            tenant_id=current_user.tenant_id,
            invoice_id=invoice_id
        )
        
        total_amount_paid = sum(payment['amount_paid'] for payment in payment_history)
        
        return PaymentHistoryResponse(
            invoice_id=invoice_id,
            payments=payment_history,
            total_payments=len(payment_history),
            total_amount_paid=total_amount_paid
        )
        
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/overdue", response_model=List[InstallmentDetail])
async def get_overdue_installments(
    customer_id: Optional[uuid.UUID] = Query(None, description="Filter by customer ID"),
    days_overdue: Optional[int] = Query(None, ge=0, description="Minimum days overdue"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get overdue installments
    Requirements: 14.5
    """
    try:
        service = InstallmentService(db)
        installments = service.get_overdue_installments(
            tenant_id=current_user.tenant_id,
            customer_id=customer_id,
            days_overdue=days_overdue
        )
        
        return [
            InstallmentDetail(
                id=inst.id,
                invoice_id=inst.invoice_id,
                installment_number=inst.installment_number,
                installment_type=inst.installment_type.value,
                status=inst.status.value,
                amount_due=inst.amount_due,
                amount_paid=inst.amount_paid or Decimal('0'),
                due_date=inst.due_date,
                paid_at=inst.paid_at,
                payment_method=inst.payment_method,
                payment_reference=inst.payment_reference,
                notes=inst.notes,
                created_at=inst.created_at,
                updated_at=inst.updated_at,
                remaining_amount=inst.remaining_amount,
                is_overdue=inst.is_overdue,
                days_overdue=inst.days_overdue,
                is_fully_paid=inst.is_fully_paid
            ) for inst in installments
        ]
        
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")


@router.put("/overdue/update-status")
async def update_overdue_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update status of overdue installments
    Requirements: 14.5
    """
    try:
        service = InstallmentService(db)
        count = service.update_overdue_status(current_user.tenant_id)
        
        return {
            "message": f"Updated {count} installments to overdue status",
            "updated_count": count
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/statistics", response_model=InstallmentStatistics)
async def get_installment_statistics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get installment statistics for tenant"""
    try:
        service = InstallmentService(db)
        stats = service.get_installment_statistics(current_user.tenant_id)
        
        return InstallmentStatistics(**stats)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")


@router.delete("/invoice/{invoice_id}/plan")
async def cancel_installment_plan(
    invoice_id: uuid.UUID = Path(..., description="Invoice ID"),
    reason: Optional[str] = Query(None, description="Cancellation reason"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Cancel installment plan for an invoice"""
    try:
        service = InstallmentService(db)
        success = service.cancel_installment_plan(
            tenant_id=current_user.tenant_id,
            invoice_id=invoice_id,
            reason=reason
        )
        
        if success:
            return {"message": "Installment plan cancelled successfully"}
        else:
            raise HTTPException(status_code=400, detail="Failed to cancel installment plan")
        
    except (NotFoundError, BusinessLogicError) as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")


@router.put("/{installment_id}", response_model=InstallmentDetail)
async def update_installment(
    installment_id: uuid.UUID = Path(..., description="Installment ID"),
    update_data: InstallmentUpdate = ...,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update installment details"""
    try:
        service = InstallmentService(db)
        installment = service.get_installment(
            tenant_id=current_user.tenant_id,
            installment_id=installment_id
        )
        
        if not installment:
            raise HTTPException(status_code=404, detail="Installment not found")
        
        # Update fields
        if update_data.due_date is not None:
            installment.due_date = update_data.due_date
        
        if update_data.notes is not None:
            installment.notes = update_data.notes
        
        # Update status if needed
        installment.update_status()
        
        db.commit()
        db.refresh(installment)
        
        return InstallmentDetail(
            id=installment.id,
            invoice_id=installment.invoice_id,
            installment_number=installment.installment_number,
            installment_type=installment.installment_type.value,
            status=installment.status.value,
            amount_due=installment.amount_due,
            amount_paid=installment.amount_paid or Decimal('0'),
            due_date=installment.due_date,
            paid_at=installment.paid_at,
            payment_method=installment.payment_method,
            payment_reference=installment.payment_reference,
            notes=installment.notes,
            created_at=installment.created_at,
            updated_at=installment.updated_at,
            remaining_amount=installment.remaining_amount,
            is_overdue=installment.is_overdue,
            days_overdue=installment.days_overdue,
            is_fully_paid=installment.is_fully_paid
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/payments/bulk", response_model=BulkPaymentResponse)
async def record_bulk_payments(
    bulk_payment_data: BulkPaymentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Record multiple payments at once"""
    try:
        service = InstallmentService(db)
        results = []
        successful_payments = 0
        failed_payments = 0
        total_amount_processed = Decimal('0')
        
        for payment_data in bulk_payment_data.payments:
            try:
                installment = service.record_payment(
                    tenant_id=current_user.tenant_id,
                    installment_id=payment_data.installment_id,
                    payment_amount=payment_data.payment_amount,
                    payment_method=payment_data.payment_method,
                    payment_reference=payment_data.payment_reference,
                    notes=payment_data.notes
                )
                
                results.append({
                    "installment_id": payment_data.installment_id,
                    "success": True,
                    "amount": payment_data.payment_amount,
                    "message": "Payment recorded successfully"
                })
                
                successful_payments += 1
                total_amount_processed += payment_data.payment_amount
                
            except Exception as e:
                results.append({
                    "installment_id": payment_data.installment_id,
                    "success": False,
                    "amount": payment_data.payment_amount,
                    "error": str(e)
                })
                failed_payments += 1
        
        return BulkPaymentResponse(
            successful_payments=successful_payments,
            failed_payments=failed_payments,
            total_amount_processed=total_amount_processed,
            results=results
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")