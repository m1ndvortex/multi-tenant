"""
General Installment System Service
Handles installment plan creation, payment tracking, and status management
"""

from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, func, desc, asc
from typing import List, Optional, Dict, Any, Tuple
from decimal import Decimal
from datetime import datetime, timedelta
import uuid
import logging

from app.models.installment import Installment, InstallmentPlan, InstallmentType, InstallmentStatus
from app.models.invoice import Invoice, InvoiceType, InvoiceStatus
from app.models.customer import Customer
from app.core.exceptions import (
    ValidationError, NotFoundError, PermissionError, BusinessLogicError
)

logger = logging.getLogger(__name__)


class InstallmentService:
    """Service class for general installment operations"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def create_installment_plan(
        self, 
        tenant_id: uuid.UUID,
        invoice_id: uuid.UUID,
        number_of_installments: int,
        start_date: Optional[datetime] = None,
        interval_days: int = 30,
        interest_rate: Optional[Decimal] = None
    ) -> List[Installment]:
        """
        Create general installment plan for an invoice
        Requirements: 14.1, 14.2
        """
        # Validate invoice exists and belongs to tenant
        invoice = self.db.query(Invoice).filter(
            Invoice.id == invoice_id,
            Invoice.tenant_id == tenant_id,
            Invoice.is_active == True
        ).first()
        
        if not invoice:
            raise NotFoundError("Invoice not found")
        
        # Validate invoice is not already paid
        if invoice.status == InvoiceStatus.PAID:
            raise BusinessLogicError("Cannot create installments for paid invoice")
        
        # Validate invoice doesn't already have installments
        existing_installments = self.db.query(Installment).filter(
            Installment.invoice_id == invoice_id
        ).count()
        
        if existing_installments > 0:
            raise BusinessLogicError("Invoice already has installments")
        
        # Validate number of installments
        if number_of_installments < 2 or number_of_installments > 60:
            raise ValidationError("Number of installments must be between 2 and 60")
        
        # Set default start date
        if not start_date:
            start_date = datetime.utcnow()
        
        try:
            installments = []
            
            # Calculate amount per installment
            total_amount = invoice.total_amount
            
            # Apply interest if specified
            if interest_rate and interest_rate > 0:
                total_amount = total_amount * (1 + (interest_rate / 100))
            
            # Calculate amount per installment (handle rounding)
            base_amount = total_amount / number_of_installments
            base_amount = base_amount.quantize(Decimal('0.01'))
            
            # Calculate remainder to distribute
            total_distributed = base_amount * number_of_installments
            remainder = total_amount - total_distributed
            
            # Create installments
            for i in range(number_of_installments):
                due_date = start_date + timedelta(days=i * interval_days)
                
                # Add remainder to last installment
                amount_due = base_amount
                if i == number_of_installments - 1:
                    amount_due += remainder
                
                installment = Installment(
                    invoice_id=invoice_id,
                    installment_number=i + 1,
                    installment_type=InstallmentType.GENERAL,
                    amount_due=amount_due,
                    amount_paid=Decimal('0'),
                    due_date=due_date,
                    status=InstallmentStatus.PENDING
                )
                
                self.db.add(installment)
                installments.append(installment)
            
            # Update invoice to mark as installment
            invoice.is_installment = True
            invoice.installment_type = "general"
            invoice.remaining_balance = total_amount
            
            self.db.commit()
            
            # Refresh all installments
            for installment in installments:
                self.db.refresh(installment)
            
            logger.info(f"Created {number_of_installments} installments for invoice {invoice.invoice_number}")
            return installments
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to create installments for invoice {invoice_id}: {e}")
            raise
    
    def get_installments_for_invoice(
        self, 
        tenant_id: uuid.UUID, 
        invoice_id: uuid.UUID
    ) -> List[Installment]:
        """
        Get all installments for an invoice
        Requirements: 14.7
        """
        # Validate invoice belongs to tenant
        invoice = self.db.query(Invoice).filter(
            Invoice.id == invoice_id,
            Invoice.tenant_id == tenant_id,
            Invoice.is_active == True
        ).first()
        
        if not invoice:
            raise NotFoundError("Invoice not found")
        
        return self.db.query(Installment).filter(
            Installment.invoice_id == invoice_id
        ).order_by(Installment.installment_number).all()
    
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
    
    def record_payment(
        self,
        tenant_id: uuid.UUID,
        installment_id: uuid.UUID,
        payment_amount: Decimal,
        payment_method: Optional[str] = None,
        payment_reference: Optional[str] = None,
        notes: Optional[str] = None
    ) -> Installment:
        """
        Record payment for a general installment
        Requirements: 14.3, 14.4
        """
        installment = self.get_installment(tenant_id, installment_id)
        if not installment:
            raise NotFoundError("Installment not found")
        
        # Validate installment type
        if installment.installment_type != InstallmentType.GENERAL:
            raise ValidationError("This method is only for general installments")
        
        # Validate installment is not already paid
        if installment.status == InstallmentStatus.PAID:
            raise BusinessLogicError("Installment is already fully paid")
        
        # Validate installment is not cancelled
        if installment.status == InstallmentStatus.CANCELLED:
            raise BusinessLogicError("Cannot add payment to cancelled installment")
        
        # Validate payment amount
        if payment_amount <= 0:
            raise ValidationError("Payment amount must be positive")
        
        remaining_amount = installment.remaining_amount
        if payment_amount > remaining_amount:
            raise ValidationError(f"Payment amount ({payment_amount}) exceeds remaining balance ({remaining_amount})")
        
        try:
            # Record payment
            installment.make_payment(
                amount=payment_amount,
                payment_method=payment_method,
                reference=payment_reference
            )
            
            if notes:
                current_notes = installment.notes or ""
                installment.notes = f"{current_notes}\nPayment: {payment_amount} on {datetime.utcnow().strftime('%Y-%m-%d %H:%M')} - {notes}"
            
            # Update invoice payment tracking
            invoice = installment.invoice
            invoice.add_payment(payment_amount)
            
            # Check if all installments are paid
            self._check_invoice_completion(invoice)
            
            self.db.commit()
            self.db.refresh(installment)
            
            logger.info(f"Recorded payment of {payment_amount} for installment {installment.id}")
            return installment
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to record payment for installment {installment_id}: {e}")
            raise
    
    def get_outstanding_balance(
        self, 
        tenant_id: uuid.UUID, 
        invoice_id: uuid.UUID
    ) -> Dict[str, Any]:
        """
        Get outstanding balance and payment history for invoice
        Requirements: 14.4
        """
        # Validate invoice belongs to tenant
        invoice = self.db.query(Invoice).filter(
            Invoice.id == invoice_id,
            Invoice.tenant_id == tenant_id,
            Invoice.is_active == True
        ).first()
        
        if not invoice:
            raise NotFoundError("Invoice not found")
        
        if not invoice.is_installment:
            raise ValidationError("Invoice is not an installment invoice")
        
        # Get all installments
        installments = self.db.query(Installment).filter(
            Installment.invoice_id == invoice_id
        ).order_by(Installment.installment_number).all()
        
        # Calculate totals
        total_due = sum(inst.amount_due for inst in installments)
        total_paid = sum(inst.amount_paid or Decimal('0') for inst in installments)
        outstanding_balance = total_due - total_paid
        
        # Count installments by status
        pending_count = sum(1 for inst in installments if inst.status == InstallmentStatus.PENDING)
        paid_count = sum(1 for inst in installments if inst.status == InstallmentStatus.PAID)
        overdue_count = sum(1 for inst in installments if inst.status == InstallmentStatus.OVERDUE)
        
        # Get next due installment
        next_due = None
        for inst in installments:
            if inst.status in [InstallmentStatus.PENDING, InstallmentStatus.OVERDUE] and inst.remaining_amount > 0:
                next_due = {
                    "installment_id": inst.id,
                    "installment_number": inst.installment_number,
                    "due_date": inst.due_date,
                    "amount_due": inst.remaining_amount,
                    "is_overdue": inst.is_overdue,
                    "days_overdue": inst.days_overdue if inst.is_overdue else 0
                }
                break
        
        return {
            "invoice_id": invoice_id,
            "total_installments": len(installments),
            "total_due": total_due,
            "total_paid": total_paid,
            "outstanding_balance": outstanding_balance,
            "pending_installments": pending_count,
            "paid_installments": paid_count,
            "overdue_installments": overdue_count,
            "next_due_installment": next_due,
            "is_fully_paid": outstanding_balance <= 0
        }
    
    def get_overdue_installments(
        self, 
        tenant_id: uuid.UUID,
        customer_id: Optional[uuid.UUID] = None,
        days_overdue: Optional[int] = None
    ) -> List[Installment]:
        """
        Get overdue installments for tenant
        Requirements: 14.5
        """
        query = self.db.query(Installment).join(Invoice).filter(
            Invoice.tenant_id == tenant_id,
            Invoice.is_active == True,
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
    
    def update_overdue_status(self, tenant_id: uuid.UUID) -> int:
        """
        Update status of overdue installments
        Requirements: 14.5
        """
        overdue_installments = self.db.query(Installment).join(Invoice).filter(
            Invoice.tenant_id == tenant_id,
            Invoice.is_active == True,
            Installment.due_date < datetime.utcnow(),
            Installment.status == InstallmentStatus.PENDING
        ).all()
        
        count = 0
        for installment in overdue_installments:
            installment.status = InstallmentStatus.OVERDUE
            count += 1
        
        if count > 0:
            self.db.commit()
            logger.info(f"Updated {count} installments to overdue status for tenant {tenant_id}")
        
        return count
    
    def get_payment_history(
        self, 
        tenant_id: uuid.UUID, 
        invoice_id: uuid.UUID
    ) -> List[Dict[str, Any]]:
        """
        Get payment history for installment invoice
        Requirements: 14.4
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
            Installment.amount_paid > 0
        ).order_by(Installment.paid_at.desc()).all()
        
        payment_history = []
        for installment in installments:
            if installment.amount_paid and installment.amount_paid > 0:
                payment_history.append({
                    "installment_id": installment.id,
                    "installment_number": installment.installment_number,
                    "payment_date": installment.paid_at,
                    "amount_paid": installment.amount_paid,
                    "payment_method": installment.payment_method,
                    "payment_reference": installment.payment_reference,
                    "remaining_after_payment": installment.remaining_amount,
                    "is_fully_paid": installment.is_fully_paid
                })
        
        return payment_history
    
    def cancel_installment_plan(
        self, 
        tenant_id: uuid.UUID, 
        invoice_id: uuid.UUID,
        reason: Optional[str] = None
    ) -> bool:
        """Cancel all installments for an invoice"""
        # Validate invoice belongs to tenant
        invoice = self.db.query(Invoice).filter(
            Invoice.id == invoice_id,
            Invoice.tenant_id == tenant_id,
            Invoice.is_active == True
        ).first()
        
        if not invoice:
            raise NotFoundError("Invoice not found")
        
        # Get all installments
        installments = self.db.query(Installment).filter(
            Installment.invoice_id == invoice_id
        ).all()
        
        # Check if any payments have been made
        has_payments = any(inst.amount_paid and inst.amount_paid > 0 for inst in installments)
        if has_payments:
            raise BusinessLogicError("Cannot cancel installment plan with existing payments")
        
        try:
            # Cancel all installments
            for installment in installments:
                installment.cancel(reason)
            
            # Update invoice
            invoice.is_installment = False
            invoice.installment_type = None
            invoice.remaining_balance = None
            
            self.db.commit()
            
            logger.info(f"Cancelled installment plan for invoice {invoice.invoice_number}")
            return True
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to cancel installment plan for invoice {invoice_id}: {e}")
            raise
    
    def _check_invoice_completion(self, invoice: Invoice):
        """Check if all installments are paid and update invoice status"""
        # Get all installments for the invoice
        installments = self.db.query(Installment).filter(
            Installment.invoice_id == invoice.id
        ).all()
        
        # Check if all installments are fully paid
        all_paid = all(inst.is_fully_paid for inst in installments)
        
        if all_paid:
            invoice.status = InvoiceStatus.PAID
            invoice.remaining_balance = Decimal('0')
            logger.info(f"Invoice {invoice.invoice_number} marked as fully paid")
    
    def get_installment_statistics(self, tenant_id: uuid.UUID) -> Dict[str, Any]:
        """Get installment statistics for tenant"""
        # Base query for installments belonging to tenant
        base_query = self.db.query(Installment).join(Invoice).filter(
            Invoice.tenant_id == tenant_id,
            Invoice.is_active == True,
            Installment.installment_type == InstallmentType.GENERAL
        )
        
        # Count by status
        total_installments = base_query.count()
        pending_installments = base_query.filter(Installment.status == InstallmentStatus.PENDING).count()
        paid_installments = base_query.filter(Installment.status == InstallmentStatus.PAID).count()
        overdue_installments = base_query.filter(Installment.status == InstallmentStatus.OVERDUE).count()
        
        # Financial totals
        financial_totals = base_query.with_entities(
            func.sum(Installment.amount_due).label('total_due'),
            func.sum(Installment.amount_paid).label('total_paid')
        ).first()
        
        total_due = financial_totals.total_due or Decimal('0')
        total_paid = financial_totals.total_paid or Decimal('0')
        outstanding_balance = total_due - total_paid
        
        # Count invoices with installments
        installment_invoices = self.db.query(Invoice).filter(
            Invoice.tenant_id == tenant_id,
            Invoice.is_active == True,
            Invoice.is_installment == True,
            Invoice.installment_type == "general"
        ).count()
        
        return {
            "total_installments": total_installments,
            "pending_installments": pending_installments,
            "paid_installments": paid_installments,
            "overdue_installments": overdue_installments,
            "installment_invoices": installment_invoices,
            "total_due": total_due,
            "total_paid": total_paid,
            "outstanding_balance": outstanding_balance,
            "collection_rate": (total_paid / total_due * 100) if total_due > 0 else Decimal('0')
        }