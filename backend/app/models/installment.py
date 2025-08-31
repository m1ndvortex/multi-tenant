"""
Installment models for both general and gold installment systems
"""

from sqlalchemy import Column, String, DateTime, Boolean, Enum, Text, Numeric, Integer, Index, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from decimal import Decimal
from datetime import datetime, timedelta
from .base import BaseModel


class InstallmentType(enum.Enum):
    """Installment type enumeration"""
    GENERAL = "general"  # Currency-based installments
    GOLD = "gold"       # Gold weight-based installments


class InstallmentStatus(enum.Enum):
    """Installment status enumeration"""
    PENDING = "pending"
    PAID = "paid"
    OVERDUE = "overdue"
    CANCELLED = "cancelled"


class Installment(BaseModel):
    """
    Installment model supporting both general and gold installment types
    """
    __tablename__ = "installments"
    
    invoice_id = Column(
        UUID(as_uuid=True), 
        ForeignKey("invoices.id"),
        nullable=False,
        comment="Invoice ID"
    )
    
    # Installment Information
    installment_number = Column(
        Integer, 
        nullable=False,
        comment="Installment sequence number"
    )
    
    installment_type = Column(
        Enum(InstallmentType), 
        nullable=False,
        comment="Type of installment (general or gold)"
    )
    
    status = Column(
        Enum(InstallmentStatus), 
        default=InstallmentStatus.PENDING,
        nullable=False,
        comment="Current installment status"
    )
    
    # General Installment Fields (Currency-based)
    amount_due = Column(
        Numeric(15, 2), 
        nullable=True,
        comment="Amount due for general installments"
    )
    
    amount_paid = Column(
        Numeric(15, 2), 
        default=0,
        nullable=True,
        comment="Amount already paid"
    )
    
    # Gold Installment Fields (Weight-based)
    gold_weight_due = Column(
        Numeric(10, 3), 
        nullable=True,
        comment="Gold weight due in grams"
    )
    
    gold_weight_paid = Column(
        Numeric(10, 3), 
        default=0,
        nullable=True,
        comment="Gold weight already paid in grams"
    )
    
    gold_price_at_payment = Column(
        Numeric(15, 2), 
        nullable=True,
        comment="Gold price per gram at time of payment"
    )
    
    # Dates
    due_date = Column(
        DateTime(timezone=True),
        nullable=False,
        comment="Installment due date"
    )
    
    paid_at = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="Payment timestamp"
    )
    
    # Additional Information
    notes = Column(
        Text, 
        nullable=True,
        comment="Notes about this installment"
    )
    
    payment_method = Column(
        String(50), 
        nullable=True,
        comment="Payment method used"
    )
    
    payment_reference = Column(
        String(255), 
        nullable=True,
        comment="Payment reference number"
    )
    
    # Relationships
    invoice = relationship("Invoice", back_populates="installments")
    
    def __repr__(self):
        return f"<Installment(id={self.id}, invoice_id={self.invoice_id}, number={self.installment_number})>"
    
    @property
    def is_overdue(self) -> bool:
        """Check if installment is overdue"""
        if self.status == InstallmentStatus.PAID:
            return False
        
        return datetime.utcnow() > self.due_date
    
    @property
    def days_overdue(self) -> int:
        """Get number of days overdue"""
        if not self.is_overdue:
            return 0
        
        delta = datetime.utcnow() - self.due_date
        return delta.days
    
    @property
    def remaining_amount(self) -> Decimal:
        """Get remaining amount for general installments"""
        if self.installment_type == InstallmentType.GENERAL and self.amount_due:
            return self.amount_due - (self.amount_paid or Decimal('0'))
        return Decimal('0')
    
    @property
    def remaining_gold_weight(self) -> Decimal:
        """Get remaining gold weight for gold installments"""
        if self.installment_type == InstallmentType.GOLD and self.gold_weight_due:
            return self.gold_weight_due - (self.gold_weight_paid or Decimal('0'))
        return Decimal('0')
    
    @property
    def is_fully_paid(self) -> bool:
        """Check if installment is fully paid"""
        if self.installment_type == InstallmentType.GENERAL:
            return self.remaining_amount <= 0
        elif self.installment_type == InstallmentType.GOLD:
            return self.remaining_gold_weight <= 0
        return False
    
    def make_payment(self, amount: Decimal = None, gold_weight: Decimal = None, 
                    gold_price: Decimal = None, payment_method: str = None, 
                    reference: str = None):
        """Record a payment for this installment"""
        
        if self.installment_type == InstallmentType.GENERAL and amount:
            # General installment payment
            self.amount_paid = (self.amount_paid or Decimal('0')) + amount
            
            # Check if fully paid
            if self.amount_paid >= self.amount_due:
                self.status = InstallmentStatus.PAID
                self.paid_at = datetime.utcnow()
        
        elif self.installment_type == InstallmentType.GOLD and gold_weight and gold_price:
            # Gold installment payment
            self.gold_weight_paid = (self.gold_weight_paid or Decimal('0')) + gold_weight
            self.gold_price_at_payment = gold_price
            
            # Calculate currency amount for this payment
            currency_amount = gold_weight * gold_price
            self.amount_paid = (self.amount_paid or Decimal('0')) + currency_amount
            
            # Check if fully paid
            if self.gold_weight_paid >= self.gold_weight_due:
                self.status = InstallmentStatus.PAID
                self.paid_at = datetime.utcnow()
        
        # Update payment details
        if payment_method:
            self.payment_method = payment_method
        
        if reference:
            self.payment_reference = reference
        
        # Update status if overdue
        if self.is_overdue and self.status == InstallmentStatus.PENDING:
            self.status = InstallmentStatus.OVERDUE
    
    def cancel(self, reason: str = None):
        """Cancel the installment"""
        self.status = InstallmentStatus.CANCELLED
        if reason:
            self.notes = f"{self.notes or ''}\nCancelled: {reason} ({datetime.utcnow()})"
    
    def update_status(self):
        """Update installment status based on payment and due date"""
        if self.is_fully_paid:
            self.status = InstallmentStatus.PAID
        elif self.is_overdue:
            self.status = InstallmentStatus.OVERDUE
        else:
            self.status = InstallmentStatus.PENDING


class InstallmentPlan(BaseModel):
    """
    Installment plan template for creating multiple installments
    """
    __tablename__ = "installment_plans"
    
    name = Column(
        String(255), 
        nullable=False,
        comment="Plan name"
    )
    
    description = Column(
        Text, 
        nullable=True,
        comment="Plan description"
    )
    
    installment_type = Column(
        Enum(InstallmentType), 
        nullable=False,
        comment="Type of installment plan"
    )
    
    number_of_installments = Column(
        Integer, 
        nullable=False,
        comment="Number of installments"
    )
    
    interval_days = Column(
        Integer, 
        default=30,
        nullable=False,
        comment="Days between installments"
    )
    
    # Default settings
    default_interest_rate = Column(
        Numeric(5, 2), 
        default=0,
        nullable=False,
        comment="Default interest rate percentage"
    )
    
    is_active = Column(
        Boolean, 
        default=True,
        nullable=False,
        comment="Whether plan is active"
    )
    
    def __repr__(self):
        return f"<InstallmentPlan(id={self.id}, name='{self.name}')>"
    
    def create_installments_for_invoice(self, invoice, start_date: datetime = None):
        """Create installments for an invoice based on this plan"""
        if not start_date:
            start_date = datetime.utcnow()
        
        installments = []
        
        if self.installment_type == InstallmentType.GENERAL:
            # General installments - divide total amount
            amount_per_installment = invoice.total_amount / self.number_of_installments
            
            for i in range(self.number_of_installments):
                due_date = start_date + timedelta(days=i * self.interval_days)
                
                installment = Installment(
                    invoice_id=invoice.id,
                    installment_number=i + 1,
                    installment_type=InstallmentType.GENERAL,
                    amount_due=amount_per_installment,
                    due_date=due_date
                )
                installments.append(installment)
        
        elif self.installment_type == InstallmentType.GOLD:
            # Gold installments - divide total gold weight
            if invoice.total_gold_weight:
                weight_per_installment = invoice.total_gold_weight / self.number_of_installments
                
                for i in range(self.number_of_installments):
                    due_date = start_date + timedelta(days=i * self.interval_days)
                    
                    installment = Installment(
                        invoice_id=invoice.id,
                        installment_number=i + 1,
                        installment_type=InstallmentType.GOLD,
                        gold_weight_due=weight_per_installment,
                        due_date=due_date
                    )
                    installments.append(installment)
        
        return installments


# Create indexes for performance optimization
Index('idx_installment_invoice', Installment.invoice_id)
Index('idx_installment_due_date', Installment.due_date)
Index('idx_installment_status', Installment.status)
Index('idx_installment_type', Installment.installment_type)
Index('idx_installment_overdue', Installment.due_date, Installment.status)

Index('idx_installment_plan_type', InstallmentPlan.installment_type)
Index('idx_installment_plan_active', InstallmentPlan.is_active)