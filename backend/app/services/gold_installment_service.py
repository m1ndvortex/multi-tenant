"""
Gold Installment System Service
Handles weight-based installment plans, gold price management, and payment calculations
"""

from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, func, desc, asc
from typing import List, Optional, Dict, Any, Tuple
from decimal import Decimal
from datetime import datetime, timedelta, date
import uuid
import logging

from app.models.installment import Installment, InstallmentPlan, InstallmentType, InstallmentStatus
from app.models.invoice import Invoice, InvoiceType, InvoiceStatus
from app.models.customer import Customer
from app.models.gold_price import GoldPrice, GoldPriceHistory, GoldPriceSource
from app.core.exceptions import (
    ValidationError, NotFoundError, PermissionError, BusinessLogicError
)

logger = logging.getLogger(__name__)


class GoldInstallmentService:
    """Service class for gold installment operations with weight-based debt tracking"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def create_gold_installment_plan(
        self, 
        tenant_id: uuid.UUID,
        invoice_id: uuid.UUID,
        number_of_installments: int,
        start_date: Optional[datetime] = None,
        interval_days: int = 30,
        gold_purity: Optional[Decimal] = None
    ) -> List[Installment]:
        """
        Create gold installment plan for an invoice with weight-based debt tracking
        Requirements: 16.1, 16.2
        """
        # Validate invoice exists and belongs to tenant
        invoice = self.db.query(Invoice).filter(
            Invoice.id == invoice_id,
            Invoice.tenant_id == tenant_id,
            Invoice.is_active == True
        ).first()
        
        if not invoice:
            raise NotFoundError("Invoice not found")
        
        # Validate invoice is gold type
        if invoice.invoice_type != InvoiceType.GOLD:
            raise ValidationError("Gold installments can only be created for gold invoices")
        
        # Validate invoice is not already paid
        if invoice.status == InvoiceStatus.PAID:
            raise BusinessLogicError("Cannot create installments for paid invoice")
        
        # Validate invoice doesn't already have installments
        existing_installments = self.db.query(Installment).filter(
            Installment.invoice_id == invoice_id
        ).count()
        
        if existing_installments > 0:
            raise BusinessLogicError("Invoice already has installments")
        
        # Validate invoice has gold weight
        if not invoice.total_gold_weight or invoice.total_gold_weight <= 0:
            raise ValidationError("Invoice must have gold weight to create gold installments")
        
        # Validate number of installments
        if number_of_installments < 2 or number_of_installments > 60:
            raise ValidationError("Number of installments must be between 2 and 60")
        
        # Set default start date
        if not start_date:
            start_date = datetime.utcnow()
        
        # Set default gold purity
        if not gold_purity:
            gold_purity = Decimal('18.000')  # Default to 18k gold
        
        try:
            installments = []
            
            # Calculate gold weight per installment
            total_gold_weight = invoice.total_gold_weight
            
            # Calculate weight per installment (handle rounding)
            base_weight = total_gold_weight / number_of_installments
            base_weight = base_weight.quantize(Decimal('0.001'))  # 3 decimal places for grams
            
            # Calculate remainder to distribute
            total_distributed = base_weight * number_of_installments
            remainder = total_gold_weight - total_distributed
            
            # Create installments
            for i in range(number_of_installments):
                due_date = start_date + timedelta(days=i * interval_days)
                
                # Add remainder to last installment
                weight_due = base_weight
                if i == number_of_installments - 1:
                    weight_due += remainder
                
                installment = Installment(
                    invoice_id=invoice_id,
                    installment_number=i + 1,
                    installment_type=InstallmentType.GOLD,
                    gold_weight_due=weight_due,
                    gold_weight_paid=Decimal('0'),
                    due_date=due_date,
                    status=InstallmentStatus.PENDING
                )
                
                self.db.add(installment)
                installments.append(installment)
            
            # Update invoice to mark as installment
            invoice.is_installment = True
            invoice.installment_type = "gold"
            invoice.remaining_gold_weight = total_gold_weight
            
            self.db.commit()
            
            # Refresh all installments
            for installment in installments:
                self.db.refresh(installment)
            
            logger.info(f"Created {number_of_installments} gold installments for invoice {invoice.invoice_number}")
            return installments
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to create gold installments for invoice {invoice_id}: {e}")
            raise
    
    def set_daily_gold_price(
        self,
        tenant_id: uuid.UUID,
        price_per_gram: Decimal,
        gold_purity: Optional[Decimal] = None,
        price_date: Optional[datetime] = None,
        source: GoldPriceSource = GoldPriceSource.MANUAL,
        market_name: Optional[str] = None,
        buy_price: Optional[Decimal] = None,
        sell_price: Optional[Decimal] = None,
        notes: Optional[str] = None
    ) -> GoldPrice:
        """
        Set daily gold price for tenant
        Requirements: 16.2, 16.8
        """
        if not price_date:
            price_date = datetime.utcnow()
        
        if not gold_purity:
            gold_purity = Decimal('18.000')  # Default to 18k gold
        
        # Validate price
        if price_per_gram <= 0:
            raise ValidationError("Gold price must be positive")
        
        # Check if price already exists for this date and purity
        existing_price = self.db.query(GoldPrice).filter(
            GoldPrice.tenant_id == tenant_id,
            GoldPrice.gold_purity == gold_purity,
            func.date(GoldPrice.price_date) == price_date.date(),
            GoldPrice.is_active == True
        ).first()
        
        try:
            if existing_price:
                # Update existing price
                existing_price.price_per_gram = price_per_gram
                existing_price.buy_price = buy_price
                existing_price.sell_price = sell_price
                existing_price.source = source
                existing_price.market_name = market_name
                existing_price.notes = notes
                existing_price.updated_at = datetime.utcnow()
                
                # Set as current price
                existing_price.set_as_current(self.db)
                
                gold_price = existing_price
            else:
                # Create new price entry
                gold_price = GoldPrice(
                    tenant_id=tenant_id,
                    price_date=price_date,
                    price_per_gram=price_per_gram,
                    gold_purity=gold_purity,
                    source=source,
                    market_name=market_name,
                    buy_price=buy_price,
                    sell_price=sell_price,
                    notes=notes,
                    is_active=True,
                    is_current=False
                )
                
                self.db.add(gold_price)
                self.db.flush()  # Get ID
                
                # Set as current price
                gold_price.set_as_current(self.db)
            
            self.db.commit()
            self.db.refresh(gold_price)
            
            logger.info(f"Set gold price {price_per_gram} per gram for tenant {tenant_id}")
            return gold_price
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to set gold price for tenant {tenant_id}: {e}")
            raise
    
    def get_current_gold_price(
        self,
        tenant_id: uuid.UUID,
        gold_purity: Optional[Decimal] = None
    ) -> Optional[GoldPrice]:
        """
        Get current gold price for tenant
        Requirements: 16.3
        """
        if not gold_purity:
            gold_purity = Decimal('18.000')
        
        return GoldPrice.get_current_price(self.db, tenant_id, gold_purity)
    
    def get_gold_price_on_date(
        self,
        tenant_id: uuid.UUID,
        target_date: date,
        gold_purity: Optional[Decimal] = None
    ) -> Optional[GoldPrice]:
        """
        Get gold price on specific date for payment calculations
        Requirements: 16.3
        """
        if not gold_purity:
            gold_purity = Decimal('18.000')
        
        return GoldPrice.get_price_on_date(self.db, tenant_id, target_date, gold_purity)
    
    def get_gold_price_history(
        self,
        tenant_id: uuid.UUID,
        days: int = 30,
        gold_purity: Optional[Decimal] = None
    ) -> List[GoldPrice]:
        """
        Get historical gold prices for analytics
        Requirements: 16.7
        """
        if not gold_purity:
            gold_purity = Decimal('18.000')
        
        return GoldPrice.get_price_history(self.db, tenant_id, days, gold_purity)
    
    def record_gold_payment(
        self,
        tenant_id: uuid.UUID,
        installment_id: uuid.UUID,
        payment_amount: Decimal,
        payment_date: Optional[datetime] = None,
        gold_price_override: Optional[Decimal] = None,
        payment_method: Optional[str] = None,
        payment_reference: Optional[str] = None,
        notes: Optional[str] = None
    ) -> Tuple[Installment, Decimal]:
        """
        Record payment for gold installment with weight calculation
        Requirements: 16.3, 16.4, 16.5
        """
        installment = self.get_installment(tenant_id, installment_id)
        if not installment:
            raise NotFoundError("Installment not found")
        
        # Validate installment type
        if installment.installment_type != InstallmentType.GOLD:
            raise ValidationError("This method is only for gold installments")
        
        # Validate installment is not already paid
        if installment.status == InstallmentStatus.PAID:
            raise BusinessLogicError("Installment is already fully paid")
        
        # Validate installment is not cancelled
        if installment.status == InstallmentStatus.CANCELLED:
            raise BusinessLogicError("Cannot add payment to cancelled installment")
        
        # Validate payment amount
        if payment_amount <= 0:
            raise ValidationError("Payment amount must be positive")
        
        if not payment_date:
            payment_date = datetime.utcnow()
        
        # Get gold price for payment date
        if gold_price_override:
            gold_price_per_gram = gold_price_override
        else:
            gold_price = self.get_gold_price_on_date(tenant_id, payment_date.date())
            if not gold_price:
                raise BusinessLogicError(f"No gold price found for date {payment_date.date()}")
            gold_price_per_gram = gold_price.price_per_gram
        
        # Calculate gold weight settled by this payment
        gold_weight_settled = payment_amount / gold_price_per_gram
        gold_weight_settled = gold_weight_settled.quantize(Decimal('0.001'))
        
        # Validate payment doesn't exceed remaining weight
        remaining_weight = installment.remaining_gold_weight
        if gold_weight_settled > remaining_weight:
            raise ValidationError(f"Payment settles {gold_weight_settled}g but only {remaining_weight}g remaining")
        
        try:
            # Record payment
            installment.make_payment(
                gold_weight=gold_weight_settled,
                gold_price=gold_price_per_gram,
                payment_method=payment_method,
                reference=payment_reference
            )
            
            if notes:
                current_notes = installment.notes or ""
                installment.notes = f"{current_notes}\nPayment: {payment_amount} ({gold_weight_settled}g @ {gold_price_per_gram}/g) on {payment_date.strftime('%Y-%m-%d %H:%M')} - {notes}"
            
            # Update invoice gold weight tracking
            invoice = installment.invoice
            if invoice.remaining_gold_weight:
                invoice.remaining_gold_weight -= gold_weight_settled
                invoice.remaining_gold_weight = max(Decimal('0'), invoice.remaining_gold_weight)
            
            # Add currency payment to invoice
            invoice.add_payment(payment_amount, gold_weight_settled)
            
            # Check if all installments are paid
            self._check_invoice_completion(invoice)
            
            self.db.commit()
            self.db.refresh(installment)
            
            logger.info(f"Recorded gold payment of {payment_amount} ({gold_weight_settled}g) for installment {installment.id}")
            return installment, gold_weight_settled
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to record gold payment for installment {installment_id}: {e}")
            raise
    
    def get_installment(
        self, 
        tenant_id: uuid.UUID, 
        installment_id: uuid.UUID
    ) -> Optional[Installment]:
        """Get installment by ID with tenant validation"""
        return self.db.query(Installment).join(Invoice).filter(
            Installment.id == installment_id,
            Invoice.tenant_id == tenant_id,
            Invoice.is_active == True
        ).first()
    
    def get_remaining_gold_weight(
        self,
        tenant_id: uuid.UUID,
        invoice_id: uuid.UUID
    ) -> Dict[str, Any]:
        """
        Get remaining gold weight (مانده به گرم) for invoice
        Requirements: 16.4, 16.5
        """
        # Validate invoice belongs to tenant
        invoice = self.db.query(Invoice).filter(
            Invoice.id == invoice_id,
            Invoice.tenant_id == tenant_id,
            Invoice.is_active == True
        ).first()
        
        if not invoice:
            raise NotFoundError("Invoice not found")
        
        if invoice.invoice_type != InvoiceType.GOLD:
            raise ValidationError("Invoice is not a gold invoice")
        
        if not invoice.is_installment:
            raise ValidationError("Invoice is not an installment invoice")
        
        # Get all installments
        installments = self.db.query(Installment).filter(
            Installment.invoice_id == invoice_id
        ).order_by(Installment.installment_number).all()
        
        # Calculate totals
        total_gold_weight = sum(inst.gold_weight_due for inst in installments)
        total_weight_paid = sum(inst.gold_weight_paid or Decimal('0') for inst in installments)
        remaining_gold_weight = total_gold_weight - total_weight_paid
        
        # Get current gold price for value calculation
        current_price = self.get_current_gold_price(tenant_id)
        current_value = Decimal('0')
        if current_price and remaining_gold_weight > 0:
            current_value = remaining_gold_weight * current_price.price_per_gram
        
        # Count installments by status
        pending_count = sum(1 for inst in installments if inst.status == InstallmentStatus.PENDING)
        paid_count = sum(1 for inst in installments if inst.status == InstallmentStatus.PAID)
        overdue_count = sum(1 for inst in installments if inst.status == InstallmentStatus.OVERDUE)
        
        # Get next due installment
        next_due = None
        for inst in installments:
            if inst.status in [InstallmentStatus.PENDING, InstallmentStatus.OVERDUE] and inst.remaining_gold_weight > 0:
                next_due = {
                    "installment_id": inst.id,
                    "installment_number": inst.installment_number,
                    "due_date": inst.due_date,
                    "gold_weight_due": inst.remaining_gold_weight,
                    "is_overdue": inst.is_overdue,
                    "days_overdue": inst.days_overdue if inst.is_overdue else 0
                }
                break
        
        return {
            "invoice_id": invoice_id,
            "total_installments": len(installments),
            "total_gold_weight": total_gold_weight,
            "total_weight_paid": total_weight_paid,
            "remaining_gold_weight": remaining_gold_weight,  # مانده به گرم
            "remaining_value_current_price": current_value,
            "current_gold_price": current_price.price_per_gram if current_price else None,
            "pending_installments": pending_count,
            "paid_installments": paid_count,
            "overdue_installments": overdue_count,
            "next_due_installment": next_due,
            "is_fully_paid": remaining_gold_weight <= 0
        }
    
    def get_gold_payment_history(
        self, 
        tenant_id: uuid.UUID, 
        invoice_id: uuid.UUID
    ) -> List[Dict[str, Any]]:
        """
        Get payment history for gold installment invoice
        Requirements: 16.6
        """
        # Validate invoice belongs to tenant
        invoice = self.db.query(Invoice).filter(
            Invoice.id == invoice_id,
            Invoice.tenant_id == tenant_id,
            Invoice.is_active == True
        ).first()
        
        if not invoice:
            raise NotFoundError("Invoice not found")
        
        # Get installments with payments
        installments = self.db.query(Installment).filter(
            Installment.invoice_id == invoice_id,
            Installment.gold_weight_paid > 0
        ).order_by(Installment.paid_at.desc()).all()
        
        payment_history = []
        for installment in installments:
            if installment.gold_weight_paid and installment.gold_weight_paid > 0:
                payment_history.append({
                    "installment_id": installment.id,
                    "installment_number": installment.installment_number,
                    "payment_date": installment.paid_at,
                    "gold_weight_paid": installment.gold_weight_paid,
                    "gold_price_at_payment": installment.gold_price_at_payment,
                    "currency_amount": installment.amount_paid,
                    "payment_method": installment.payment_method,
                    "payment_reference": installment.payment_reference,
                    "remaining_gold_weight": installment.remaining_gold_weight,
                    "is_fully_paid": installment.is_fully_paid
                })
        
        return payment_history
    
    def get_overdue_gold_installments(
        self, 
        tenant_id: uuid.UUID,
        customer_id: Optional[uuid.UUID] = None,
        days_overdue: Optional[int] = None
    ) -> List[Installment]:
        """
        Get overdue gold installments for tenant
        Requirements: 16.5
        """
        query = self.db.query(Installment).join(Invoice).filter(
            Invoice.tenant_id == tenant_id,
            Invoice.is_active == True,
            Invoice.invoice_type == InvoiceType.GOLD,
            Installment.installment_type == InstallmentType.GOLD,
            Installment.due_date < datetime.utcnow(),
            Installment.status.in_([InstallmentStatus.PENDING, InstallmentStatus.OVERDUE])
        )
        
        # Filter by customer if specified
        if customer_id:
            query = query.filter(Invoice.customer_id == customer_id)
        
        # Filter by days overdue if specified
        if days_overdue is not None:
            cutoff_date = datetime.utcnow() - timedelta(days=days_overdue)
            query = query.filter(Installment.due_date <= cutoff_date)
        
        installments = query.order_by(Installment.due_date).all()
        
        # Update status to overdue if needed
        for installment in installments:
            if installment.status == InstallmentStatus.PENDING and installment.is_overdue:
                installment.status = InstallmentStatus.OVERDUE
        
        if installments:
            self.db.commit()
        
        return installments
    
    def calculate_payment_for_weight(
        self,
        tenant_id: uuid.UUID,
        gold_weight: Decimal,
        payment_date: Optional[date] = None,
        gold_purity: Optional[Decimal] = None
    ) -> Dict[str, Any]:
        """
        Calculate payment amount for given gold weight on specific date
        Requirements: 16.3
        """
        if not payment_date:
            payment_date = datetime.utcnow().date()
        
        if not gold_purity:
            gold_purity = Decimal('18.000')
        
        # Get gold price for the date
        gold_price = self.get_gold_price_on_date(tenant_id, payment_date, gold_purity)
        
        if not gold_price:
            raise BusinessLogicError(f"No gold price found for date {payment_date}")
        
        payment_amount = gold_weight * gold_price.price_per_gram
        
        return {
            "gold_weight": gold_weight,
            "gold_price_per_gram": gold_price.price_per_gram,
            "payment_amount": payment_amount,
            "price_date": gold_price.price_date,
            "gold_purity": gold_purity
        }
    
    def calculate_weight_for_payment(
        self,
        tenant_id: uuid.UUID,
        payment_amount: Decimal,
        payment_date: Optional[date] = None,
        gold_purity: Optional[Decimal] = None
    ) -> Dict[str, Any]:
        """
        Calculate gold weight that can be settled with given payment amount
        Requirements: 16.3
        """
        if not payment_date:
            payment_date = datetime.utcnow().date()
        
        if not gold_purity:
            gold_purity = Decimal('18.000')
        
        # Get gold price for the date
        gold_price = self.get_gold_price_on_date(tenant_id, payment_date, gold_purity)
        
        if not gold_price:
            raise BusinessLogicError(f"No gold price found for date {payment_date}")
        
        gold_weight = payment_amount / gold_price.price_per_gram
        gold_weight = gold_weight.quantize(Decimal('0.001'))
        
        return {
            "payment_amount": payment_amount,
            "gold_price_per_gram": gold_price.price_per_gram,
            "gold_weight": gold_weight,
            "price_date": gold_price.price_date,
            "gold_purity": gold_purity
        }
    
    def _check_invoice_completion(self, invoice: Invoice):
        """Check if all gold installments are paid and update invoice status"""
        # Get all installments for the invoice
        installments = self.db.query(Installment).filter(
            Installment.invoice_id == invoice.id
        ).all()
        
        # Check if all installments are fully paid
        all_paid = all(inst.is_fully_paid for inst in installments)
        
        if all_paid:
            invoice.status = InvoiceStatus.PAID
            invoice.remaining_gold_weight = Decimal('0')
            logger.info(f"Gold invoice {invoice.invoice_number} marked as fully paid")
    
    def get_gold_installment_statistics(self, tenant_id: uuid.UUID) -> Dict[str, Any]:
        """Get gold installment statistics for tenant"""
        # Base query for gold installments belonging to tenant
        base_query = self.db.query(Installment).join(Invoice).filter(
            Invoice.tenant_id == tenant_id,
            Invoice.is_active == True,
            Invoice.invoice_type == InvoiceType.GOLD,
            Installment.installment_type == InstallmentType.GOLD
        )
        
        # Count by status
        total_installments = base_query.count()
        pending_installments = base_query.filter(Installment.status == InstallmentStatus.PENDING).count()
        paid_installments = base_query.filter(Installment.status == InstallmentStatus.PAID).count()
        overdue_installments = base_query.filter(Installment.status == InstallmentStatus.OVERDUE).count()
        
        # Gold weight totals
        weight_totals = base_query.with_entities(
            func.sum(Installment.gold_weight_due).label('total_weight_due'),
            func.sum(Installment.gold_weight_paid).label('total_weight_paid')
        ).first()
        
        total_weight_due = weight_totals.total_weight_due or Decimal('0')
        total_weight_paid = weight_totals.total_weight_paid or Decimal('0')
        outstanding_weight = total_weight_due - total_weight_paid
        
        # Count invoices with gold installments
        gold_installment_invoices = self.db.query(Invoice).filter(
            Invoice.tenant_id == tenant_id,
            Invoice.is_active == True,
            Invoice.invoice_type == InvoiceType.GOLD,
            Invoice.is_installment == True,
            Invoice.installment_type == "gold"
        ).count()
        
        # Get current gold price for value calculation
        current_price = self.get_current_gold_price(tenant_id)
        outstanding_value = Decimal('0')
        if current_price and outstanding_weight > 0:
            outstanding_value = outstanding_weight * current_price.price_per_gram
        
        return {
            "total_installments": total_installments,
            "pending_installments": pending_installments,
            "paid_installments": paid_installments,
            "overdue_installments": overdue_installments,
            "gold_installment_invoices": gold_installment_invoices,
            "total_weight_due": total_weight_due,
            "total_weight_paid": total_weight_paid,
            "outstanding_weight": outstanding_weight,
            "outstanding_value_current_price": outstanding_value,
            "current_gold_price": current_price.price_per_gram if current_price else None,
            "collection_rate": (total_weight_paid / total_weight_due * 100) if total_weight_due > 0 else Decimal('0')
        }