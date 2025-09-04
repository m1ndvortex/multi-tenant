"""
Gold Installment API endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from decimal import Decimal
from datetime import datetime, date
import uuid

from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.user import User
from app.services.gold_installment_service import GoldInstallmentService
from app.schemas.gold_installment import (
    GoldInstallmentPlanCreate,
    GoldInstallmentResponse,
    GoldPriceCreate,
    GoldPriceResponse,
    GoldPaymentCreate,
    GoldPaymentResponse,
    GoldWeightCalculation,
    GoldInstallmentStatistics
)
from app.core.exceptions import ValidationError, NotFoundError, BusinessLogicError

router = APIRouter()


@router.post("/plans", response_model=List[GoldInstallmentResponse])
def create_gold_installment_plan(
    plan_data: GoldInstallmentPlanCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create gold installment plan for an invoice
    Requirements: 16.1, 16.2
    """
    try:
        service = GoldInstallmentService(db)
        installments = service.create_gold_installment_plan(
            tenant_id=current_user.tenant_id,
            invoice_id=plan_data.invoice_id,
            number_of_installments=plan_data.number_of_installments,
            start_date=plan_data.start_date,
            interval_days=plan_data.interval_days,
            gold_purity=plan_data.gold_purity
        )
        
        return [GoldInstallmentResponse.from_orm(inst) for inst in installments]
        
    except (ValidationError, BusinessLogicError) as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")


@router.post("/gold-prices", response_model=GoldPriceResponse)
def set_daily_gold_price(
    price_data: GoldPriceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Set daily gold price for tenant
    Requirements: 16.2, 16.8
    """
    try:
        service = GoldInstallmentService(db)
        gold_price = service.set_daily_gold_price(
            tenant_id=current_user.tenant_id,
            price_per_gram=price_data.price_per_gram,
            gold_purity=price_data.gold_purity,
            price_date=price_data.price_date,
            source=price_data.source,
            market_name=price_data.market_name,
            buy_price=price_data.buy_price,
            sell_price=price_data.sell_price,
            notes=price_data.notes
        )
        
        return GoldPriceResponse.from_orm(gold_price)
        
    except ValidationError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")


@router.get("/gold-prices/current", response_model=Optional[GoldPriceResponse])
def get_current_gold_price(
    gold_purity: Optional[Decimal] = Query(None, description="Gold purity (e.g., 18.000 for 18k)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get current gold price for tenant
    Requirements: 16.3
    """
    try:
        service = GoldInstallmentService(db)
        gold_price = service.get_current_gold_price(
            tenant_id=current_user.tenant_id,
            gold_purity=gold_purity
        )
        
        if gold_price:
            return GoldPriceResponse.from_orm(gold_price)
        return None
        
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")


@router.get("/gold-prices/history", response_model=List[GoldPriceResponse])
def get_gold_price_history(
    days: int = Query(30, description="Number of days of history"),
    gold_purity: Optional[Decimal] = Query(None, description="Gold purity (e.g., 18.000 for 18k)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get historical gold prices
    Requirements: 16.7
    """
    try:
        service = GoldInstallmentService(db)
        prices = service.get_gold_price_history(
            tenant_id=current_user.tenant_id,
            days=days,
            gold_purity=gold_purity
        )
        
        return [GoldPriceResponse.from_orm(price) for price in prices]
        
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")


@router.get("/gold-prices/on-date", response_model=Optional[GoldPriceResponse])
def get_gold_price_on_date(
    target_date: date = Query(..., description="Target date for price lookup"),
    gold_purity: Optional[Decimal] = Query(None, description="Gold purity (e.g., 18.000 for 18k)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get gold price on specific date
    Requirements: 16.3
    """
    try:
        service = GoldInstallmentService(db)
        gold_price = service.get_gold_price_on_date(
            tenant_id=current_user.tenant_id,
            target_date=target_date,
            gold_purity=gold_purity
        )
        
        if gold_price:
            return GoldPriceResponse.from_orm(gold_price)
        return None
        
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")


@router.post("/installments/{installment_id}/payments", response_model=GoldPaymentResponse)
def record_gold_payment(
    installment_id: uuid.UUID,
    payment_data: GoldPaymentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Record payment for gold installment
    Requirements: 16.3, 16.4, 16.5
    """
    try:
        service = GoldInstallmentService(db)
        installment, gold_weight_settled = service.record_gold_payment(
            tenant_id=current_user.tenant_id,
            installment_id=installment_id,
            payment_amount=payment_data.payment_amount,
            payment_date=payment_data.payment_date,
            gold_price_override=payment_data.gold_price_override,
            payment_method=payment_data.payment_method,
            payment_reference=payment_data.payment_reference,
            notes=payment_data.notes
        )
        
        return GoldPaymentResponse(
            installment_id=installment.id,
            payment_amount=payment_data.payment_amount,
            gold_weight_settled=gold_weight_settled,
            gold_price_used=installment.gold_price_at_payment,
            remaining_gold_weight=installment.remaining_gold_weight,
            is_fully_paid=installment.is_fully_paid,
            payment_date=payment_data.payment_date or datetime.utcnow()
        )
        
    except (ValidationError, BusinessLogicError) as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")


@router.get("/invoices/{invoice_id}/remaining-weight")
def get_remaining_gold_weight(
    invoice_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get remaining gold weight (مانده به گرم) for invoice
    Requirements: 16.4, 16.5
    """
    try:
        service = GoldInstallmentService(db)
        result = service.get_remaining_gold_weight(
            tenant_id=current_user.tenant_id,
            invoice_id=invoice_id
        )
        
        return result
        
    except (ValidationError, BusinessLogicError) as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")


@router.get("/invoices/{invoice_id}/payment-history")
def get_gold_payment_history(
    invoice_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get payment history for gold installment invoice
    Requirements: 16.6
    """
    try:
        service = GoldInstallmentService(db)
        history = service.get_gold_payment_history(
            tenant_id=current_user.tenant_id,
            invoice_id=invoice_id
        )
        
        return history
        
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")


@router.get("/overdue", response_model=List[GoldInstallmentResponse])
def get_overdue_gold_installments(
    customer_id: Optional[uuid.UUID] = Query(None, description="Filter by customer ID"),
    days_overdue: Optional[int] = Query(None, description="Minimum days overdue"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get overdue gold installments
    Requirements: 16.5
    """
    try:
        service = GoldInstallmentService(db)
        installments = service.get_overdue_gold_installments(
            tenant_id=current_user.tenant_id,
            customer_id=customer_id,
            days_overdue=days_overdue
        )
        
        return [GoldInstallmentResponse.from_orm(inst) for inst in installments]
        
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")


@router.post("/calculate/payment-for-weight", response_model=GoldWeightCalculation)
def calculate_payment_for_weight(
    gold_weight: Decimal,
    payment_date: Optional[date] = Query(None, description="Payment date (defaults to today)"),
    gold_purity: Optional[Decimal] = Query(None, description="Gold purity (e.g., 18.000 for 18k)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Calculate payment amount for given gold weight
    Requirements: 16.3
    """
    try:
        service = GoldInstallmentService(db)
        result = service.calculate_payment_for_weight(
            tenant_id=current_user.tenant_id,
            gold_weight=gold_weight,
            payment_date=payment_date,
            gold_purity=gold_purity
        )
        
        return GoldWeightCalculation(**result)
        
    except (ValidationError, BusinessLogicError) as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")


@router.post("/calculate/weight-for-payment", response_model=GoldWeightCalculation)
def calculate_weight_for_payment(
    payment_amount: Decimal,
    payment_date: Optional[date] = Query(None, description="Payment date (defaults to today)"),
    gold_purity: Optional[Decimal] = Query(None, description="Gold purity (e.g., 18.000 for 18k)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Calculate gold weight that can be settled with given payment amount
    Requirements: 16.3
    """
    try:
        service = GoldInstallmentService(db)
        result = service.calculate_weight_for_payment(
            tenant_id=current_user.tenant_id,
            payment_amount=payment_amount,
            payment_date=payment_date,
            gold_purity=gold_purity
        )
        
        return GoldWeightCalculation(**result)
        
    except (ValidationError, BusinessLogicError) as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")


@router.get("/statistics", response_model=GoldInstallmentStatistics)
def get_gold_installment_statistics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get gold installment statistics for tenant
    """
    try:
        service = GoldInstallmentService(db)
        stats = service.get_gold_installment_statistics(current_user.tenant_id)
        
        return GoldInstallmentStatistics(**stats)
        
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")