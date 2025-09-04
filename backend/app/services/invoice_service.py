"""
Invoice service for dual invoice system (General and Gold)
"""

from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, func, desc, asc
from typing import List, Optional, Dict, Any, Tuple
from decimal import Decimal
from datetime import datetime, timedelta
import uuid
import logging

from app.models.invoice import Invoice, InvoiceItem, InvoiceType, InvoiceStatus
from app.models.customer import Customer
from app.models.product import Product
from app.models.tenant import Tenant
from app.schemas.invoice import (
    InvoiceCreate, InvoiceUpdate, InvoiceFilter, PaymentCreate,
    InvoiceItemCreate, InvoiceItemUpdate
)
from app.core.exceptions import (
    ValidationError, NotFoundError, PermissionError, BusinessLogicError
)

logger = logging.getLogger(__name__)


class InvoiceService:
    """Service class for invoice operations"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def generate_invoice_number(self, tenant_id: uuid.UUID, invoice_type: InvoiceType) -> str:
        """Generate unique invoice number for tenant"""
        # Get current year and month
        now = datetime.utcnow()
        year = now.year
        month = now.month
        
        # Get count of invoices for this tenant in current month
        count = self.db.query(Invoice).filter(
            Invoice.tenant_id == tenant_id,
            func.extract('year', Invoice.created_at) == year,
            func.extract('month', Invoice.created_at) == month
        ).count()
        
        # Generate number based on type
        if invoice_type == InvoiceType.GENERAL:
            prefix = "INV"
        else:  # GOLD
            prefix = "GOLD"
        
        # Format: PREFIX-YYYY-MM-NNNN
        invoice_number = f"{prefix}-{year:04d}-{month:02d}-{count + 1:04d}"
        
        # Ensure uniqueness
        while self.db.query(Invoice).filter(
            Invoice.tenant_id == tenant_id,
            Invoice.invoice_number == invoice_number
        ).first():
            count += 1
            invoice_number = f"{prefix}-{year:04d}-{month:02d}-{count + 1:04d}"
        
        return invoice_number
    
    def create_invoice(self, tenant_id: uuid.UUID, invoice_data: InvoiceCreate) -> Invoice:
        """Create a new invoice with items"""
        try:
            # Validate customer exists and belongs to tenant
            customer = self.db.query(Customer).filter(
                Customer.id == invoice_data.customer_id,
                Customer.tenant_id == tenant_id,
                Customer.is_active == True
            ).first()
            
            if not customer:
                raise NotFoundError("Customer not found")
            
            # Convert schema enum to model enum
            model_invoice_type = InvoiceType.GENERAL if invoice_data.invoice_type.value == "GENERAL" else InvoiceType.GOLD
            
            # Generate invoice number
            invoice_number = self.generate_invoice_number(tenant_id, model_invoice_type)
            
            # Create invoice
            invoice = Invoice(
                tenant_id=tenant_id,
                customer_id=invoice_data.customer_id,
                invoice_number=invoice_number,
                invoice_type=model_invoice_type,
                discount_amount=invoice_data.discount_amount or Decimal('0'),
                gold_price_at_creation=invoice_data.gold_price_at_creation,
                is_installment=invoice_data.is_installment,
                installment_type=invoice_data.installment_type.value if invoice_data.installment_type else "none",
                due_date=invoice_data.due_date,
                is_shareable=invoice_data.is_shareable,
                notes=invoice_data.notes,
                customer_notes=invoice_data.customer_notes,
                terms_and_conditions=invoice_data.terms_and_conditions,
                total_amount=Decimal('0')  # Will be calculated from items
            )
            
            self.db.add(invoice)
            self.db.flush()  # Get invoice ID
            
            # Create invoice items
            for item_data in invoice_data.items:
                item = self._create_invoice_item(invoice.id, item_data)
                invoice.items.append(item)
            
            # Calculate totals
            invoice.calculate_totals()
            
            # Generate QR token if shareable
            if invoice.is_shareable:
                invoice.generate_qr_token()
            
            self.db.commit()
            self.db.refresh(invoice)
            
            logger.info(f"Created invoice {invoice.invoice_number} for tenant {tenant_id}")
            return invoice
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to create invoice for tenant {tenant_id}: {e}")
            raise
    
    def _create_invoice_item(self, invoice_id: uuid.UUID, item_data: InvoiceItemCreate) -> InvoiceItem:
        """Create an invoice item"""
        # Validate product if specified
        if item_data.product_id:
            product = self.db.query(Product).filter(
                Product.id == item_data.product_id,
                Product.is_active == True
            ).first()
            
            if not product:
                raise NotFoundError(f"Product {item_data.product_id} not found")
        
        # Create item
        item = InvoiceItem(
            invoice_id=invoice_id,
            product_id=item_data.product_id,
            description=item_data.description,
            quantity=item_data.quantity,
            unit_price=item_data.unit_price,
            tax_rate=item_data.tax_rate or Decimal('0'),
            discount_rate=item_data.discount_rate or Decimal('0'),
            discount_amount=item_data.discount_amount or Decimal('0'),
            weight=item_data.weight,
            labor_fee=item_data.labor_fee,
            profit=item_data.profit,
            vat_amount=item_data.vat_amount,
            gold_purity=item_data.gold_purity,
            notes=item_data.notes,
            line_total=Decimal('0')  # Will be calculated
        )
        
        # Calculate totals
        item.calculate_totals()
        
        return item
    
    def get_invoice(self, tenant_id: uuid.UUID, invoice_id: uuid.UUID) -> Optional[Invoice]:
        """Get invoice by ID for tenant"""
        return self.db.query(Invoice).options(
            joinedload(Invoice.items),
            joinedload(Invoice.customer),
            joinedload(Invoice.installments)
        ).filter(
            Invoice.id == invoice_id,
            Invoice.tenant_id == tenant_id,
            Invoice.is_active == True
        ).first()
    
    def get_invoice_by_number(self, tenant_id: uuid.UUID, invoice_number: str) -> Optional[Invoice]:
        """Get invoice by number for tenant"""
        return self.db.query(Invoice).options(
            joinedload(Invoice.items),
            joinedload(Invoice.customer),
            joinedload(Invoice.installments)
        ).filter(
            Invoice.invoice_number == invoice_number,
            Invoice.tenant_id == tenant_id,
            Invoice.is_active == True
        ).first()
    
    def get_invoices(
        self, 
        tenant_id: uuid.UUID, 
        filters: Optional[InvoiceFilter] = None,
        skip: int = 0,
        limit: int = 100,
        sort_by: str = "created_at",
        sort_order: str = "desc"
    ) -> Tuple[List[Invoice], int]:
        """Get filtered and paginated invoices for tenant"""
        
        query = self.db.query(Invoice).options(
            joinedload(Invoice.customer)
        ).filter(
            Invoice.tenant_id == tenant_id,
            Invoice.is_active == True
        )
        
        # Apply filters
        if filters:
            if filters.customer_id:
                query = query.filter(Invoice.customer_id == filters.customer_id)
            
            if filters.invoice_type:
                query = query.filter(Invoice.invoice_type == filters.invoice_type)
            
            if filters.status:
                query = query.filter(Invoice.status == filters.status)
            
            if filters.is_installment is not None:
                query = query.filter(Invoice.is_installment == filters.is_installment)
            
            if filters.is_overdue is not None:
                if filters.is_overdue:
                    query = query.filter(
                        and_(
                            Invoice.due_date < datetime.utcnow(),
                            Invoice.status.in_([InvoiceStatus.SENT, InvoiceStatus.PARTIALLY_PAID])
                        )
                    )
                else:
                    query = query.filter(
                        or_(
                            Invoice.due_date >= datetime.utcnow(),
                            Invoice.due_date.is_(None),
                            Invoice.status.in_([InvoiceStatus.PAID, InvoiceStatus.CANCELLED])
                        )
                    )
            
            if filters.date_from:
                query = query.filter(Invoice.invoice_date >= filters.date_from)
            
            if filters.date_to:
                query = query.filter(Invoice.invoice_date <= filters.date_to)
            
            if filters.min_amount:
                query = query.filter(Invoice.total_amount >= filters.min_amount)
            
            if filters.max_amount:
                query = query.filter(Invoice.total_amount <= filters.max_amount)
            
            if filters.search:
                search_term = f"%{filters.search}%"
                query = query.join(Customer).filter(
                    or_(
                        Invoice.invoice_number.ilike(search_term),
                        Customer.name.ilike(search_term),
                        Invoice.notes.ilike(search_term)
                    )
                )
        
        # Get total count
        total = query.count()
        
        # Apply sorting
        if hasattr(Invoice, sort_by):
            if sort_order.lower() == "desc":
                query = query.order_by(desc(getattr(Invoice, sort_by)))
            else:
                query = query.order_by(asc(getattr(Invoice, sort_by)))
        
        # Apply pagination
        invoices = query.offset(skip).limit(limit).all()
        
        return invoices, total
    
    def update_invoice(
        self, 
        tenant_id: uuid.UUID, 
        invoice_id: uuid.UUID, 
        update_data: InvoiceUpdate
    ) -> Invoice:
        """Update invoice"""
        invoice = self.get_invoice(tenant_id, invoice_id)
        if not invoice:
            raise NotFoundError("Invoice not found")
        
        # Check if invoice can be updated
        if invoice.status in [InvoiceStatus.PAID, InvoiceStatus.CANCELLED]:
            raise BusinessLogicError("Cannot update paid or cancelled invoices")
        
        try:
            # Update fields
            update_dict = update_data.dict(exclude_unset=True)
            
            # Validate customer if being updated
            if 'customer_id' in update_dict:
                customer = self.db.query(Customer).filter(
                    Customer.id == update_dict['customer_id'],
                    Customer.tenant_id == tenant_id,
                    Customer.is_active == True
                ).first()
                
                if not customer:
                    raise NotFoundError("Customer not found")
            
            # Update invoice
            for field, value in update_dict.items():
                if hasattr(invoice, field):
                    setattr(invoice, field, value)
            
            # Recalculate totals if needed
            invoice.calculate_totals()
            
            self.db.commit()
            self.db.refresh(invoice)
            
            logger.info(f"Updated invoice {invoice.invoice_number} for tenant {tenant_id}")
            return invoice
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to update invoice {invoice_id} for tenant {tenant_id}: {e}")
            raise
    
    def delete_invoice(self, tenant_id: uuid.UUID, invoice_id: uuid.UUID) -> bool:
        """Soft delete invoice"""
        invoice = self.get_invoice(tenant_id, invoice_id)
        if not invoice:
            raise NotFoundError("Invoice not found")
        
        # Check if invoice can be deleted
        if invoice.status in [InvoiceStatus.PAID, InvoiceStatus.PARTIALLY_PAID]:
            raise BusinessLogicError("Cannot delete invoices with payments")
        
        try:
            invoice.is_active = False
            self.db.commit()
            
            logger.info(f"Deleted invoice {invoice.invoice_number} for tenant {tenant_id}")
            return True
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to delete invoice {invoice_id} for tenant {tenant_id}: {e}")
            raise
    
    def add_payment(
        self, 
        tenant_id: uuid.UUID, 
        invoice_id: uuid.UUID, 
        payment_data: PaymentCreate
    ) -> Invoice:
        """Add payment to invoice"""
        invoice = self.get_invoice(tenant_id, invoice_id)
        if not invoice:
            raise NotFoundError("Invoice not found")
        
        # Validate payment
        if invoice.status == InvoiceStatus.PAID:
            raise BusinessLogicError("Invoice is already fully paid")
        
        if invoice.status == InvoiceStatus.CANCELLED:
            raise BusinessLogicError("Cannot add payment to cancelled invoice")
        
        # Validate gold payment for gold invoices
        if invoice.invoice_type == InvoiceType.GOLD and invoice.is_installment:
            if not payment_data.gold_weight or not payment_data.gold_price:
                raise ValidationError("Gold installment payments require gold_weight and gold_price")
        
        try:
            # Add payment
            invoice.add_payment(
                amount=payment_data.amount,
                gold_weight=payment_data.gold_weight
            )
            
            self.db.commit()
            self.db.refresh(invoice)
            
            logger.info(f"Added payment of {payment_data.amount} to invoice {invoice.invoice_number}")
            return invoice
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to add payment to invoice {invoice_id}: {e}")
            raise
    
    def send_invoice(self, tenant_id: uuid.UUID, invoice_id: uuid.UUID) -> Invoice:
        """Send invoice to customer"""
        invoice = self.get_invoice(tenant_id, invoice_id)
        if not invoice:
            raise NotFoundError("Invoice not found")
        
        if invoice.status != InvoiceStatus.DRAFT:
            raise BusinessLogicError("Only draft invoices can be sent")
        
        try:
            invoice.send_to_customer()
            
            # Generate QR token if not exists and shareable
            if invoice.is_shareable and not invoice.qr_code_token:
                invoice.generate_qr_token()
            
            self.db.commit()
            self.db.refresh(invoice)
            
            # TODO: Trigger notification task to send email/SMS
            
            logger.info(f"Sent invoice {invoice.invoice_number} to customer")
            return invoice
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to send invoice {invoice_id}: {e}")
            raise
    
    def cancel_invoice(
        self, 
        tenant_id: uuid.UUID, 
        invoice_id: uuid.UUID, 
        reason: Optional[str] = None
    ) -> Invoice:
        """Cancel invoice"""
        invoice = self.get_invoice(tenant_id, invoice_id)
        if not invoice:
            raise NotFoundError("Invoice not found")
        
        if invoice.status == InvoiceStatus.PAID:
            raise BusinessLogicError("Cannot cancel paid invoices")
        
        try:
            invoice.cancel(reason)
            self.db.commit()
            self.db.refresh(invoice)
            
            logger.info(f"Cancelled invoice {invoice.invoice_number}")
            return invoice
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to cancel invoice {invoice_id}: {e}")
            raise
    
    def get_invoice_statistics(self, tenant_id: uuid.UUID) -> Dict[str, Any]:
        """Get invoice statistics for tenant"""
        # Base query
        base_query = self.db.query(Invoice).filter(
            Invoice.tenant_id == tenant_id,
            Invoice.is_active == True
        )
        
        # Count by status
        total_invoices = base_query.count()
        draft_invoices = base_query.filter(Invoice.status == InvoiceStatus.DRAFT).count()
        sent_invoices = base_query.filter(Invoice.status == InvoiceStatus.SENT).count()
        paid_invoices = base_query.filter(Invoice.status == InvoiceStatus.PAID).count()
        overdue_invoices = base_query.filter(
            and_(
                Invoice.due_date < datetime.utcnow(),
                Invoice.status.in_([InvoiceStatus.SENT, InvoiceStatus.PARTIALLY_PAID])
            )
        ).count()
        
        # Count by type
        general_invoices = base_query.filter(Invoice.invoice_type == InvoiceType.GENERAL).count()
        gold_invoices = base_query.filter(Invoice.invoice_type == InvoiceType.GOLD).count()
        installment_invoices = base_query.filter(Invoice.is_installment == True).count()
        
        # Financial totals
        financial_totals = base_query.with_entities(
            func.sum(Invoice.total_amount).label('total_amount'),
            func.sum(Invoice.paid_amount).label('paid_amount')
        ).first()
        
        total_amount = financial_totals.total_amount or Decimal('0')
        paid_amount = financial_totals.paid_amount or Decimal('0')
        outstanding_amount = total_amount - paid_amount
        
        # Gold totals
        gold_totals = base_query.filter(
            Invoice.invoice_type == InvoiceType.GOLD
        ).with_entities(
            func.sum(Invoice.total_gold_weight).label('total_gold_weight'),
            func.sum(Invoice.remaining_gold_weight).label('outstanding_gold_weight')
        ).first()
        
        total_gold_weight = gold_totals.total_gold_weight if gold_totals else None
        outstanding_gold_weight = gold_totals.outstanding_gold_weight if gold_totals else None
        
        return {
            "total_invoices": total_invoices,
            "draft_invoices": draft_invoices,
            "sent_invoices": sent_invoices,
            "paid_invoices": paid_invoices,
            "overdue_invoices": overdue_invoices,
            "total_amount": total_amount,
            "paid_amount": paid_amount,
            "outstanding_amount": outstanding_amount,
            "general_invoices": general_invoices,
            "gold_invoices": gold_invoices,
            "installment_invoices": installment_invoices,
            "total_gold_weight": total_gold_weight,
            "outstanding_gold_weight": outstanding_gold_weight
        }
    
    def get_public_invoice(self, qr_token: str) -> Optional[Invoice]:
        """Get invoice by QR token for public viewing"""
        return self.db.query(Invoice).options(
            joinedload(Invoice.items),
            joinedload(Invoice.customer)
        ).filter(
            Invoice.qr_code_token == qr_token,
            Invoice.is_shareable == True,
            Invoice.is_active == True
        ).first()
    
    # Invoice Item Management
    def add_invoice_item(
        self, 
        tenant_id: uuid.UUID, 
        invoice_id: uuid.UUID, 
        item_data: InvoiceItemCreate
    ) -> InvoiceItem:
        """Add item to existing invoice"""
        invoice = self.get_invoice(tenant_id, invoice_id)
        if not invoice:
            raise NotFoundError("Invoice not found")
        
        if invoice.status in [InvoiceStatus.PAID, InvoiceStatus.CANCELLED]:
            raise BusinessLogicError("Cannot modify paid or cancelled invoices")
        
        try:
            item = self._create_invoice_item(invoice.id, item_data)
            self.db.add(item)
            
            # Recalculate invoice totals
            invoice.calculate_totals()
            
            self.db.commit()
            self.db.refresh(item)
            
            logger.info(f"Added item to invoice {invoice.invoice_number}")
            return item
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to add item to invoice {invoice_id}: {e}")
            raise
    
    def update_invoice_item(
        self, 
        tenant_id: uuid.UUID, 
        invoice_id: uuid.UUID, 
        item_id: uuid.UUID,
        update_data: InvoiceItemUpdate
    ) -> InvoiceItem:
        """Update invoice item"""
        invoice = self.get_invoice(tenant_id, invoice_id)
        if not invoice:
            raise NotFoundError("Invoice not found")
        
        if invoice.status in [InvoiceStatus.PAID, InvoiceStatus.CANCELLED]:
            raise BusinessLogicError("Cannot modify paid or cancelled invoices")
        
        item = self.db.query(InvoiceItem).filter(
            InvoiceItem.id == item_id,
            InvoiceItem.invoice_id == invoice_id
        ).first()
        
        if not item:
            raise NotFoundError("Invoice item not found")
        
        try:
            # Update fields
            update_dict = update_data.dict(exclude_unset=True)
            for field, value in update_dict.items():
                if hasattr(item, field):
                    setattr(item, field, value)
            
            # Recalculate item totals
            item.calculate_totals()
            
            # Recalculate invoice totals
            invoice.calculate_totals()
            
            self.db.commit()
            self.db.refresh(item)
            
            logger.info(f"Updated item in invoice {invoice.invoice_number}")
            return item
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to update item {item_id} in invoice {invoice_id}: {e}")
            raise
    
    def delete_invoice_item(
        self, 
        tenant_id: uuid.UUID, 
        invoice_id: uuid.UUID, 
        item_id: uuid.UUID
    ) -> bool:
        """Delete invoice item"""
        invoice = self.get_invoice(tenant_id, invoice_id)
        if not invoice:
            raise NotFoundError("Invoice not found")
        
        if invoice.status in [InvoiceStatus.PAID, InvoiceStatus.CANCELLED]:
            raise BusinessLogicError("Cannot modify paid or cancelled invoices")
        
        item = self.db.query(InvoiceItem).filter(
            InvoiceItem.id == item_id,
            InvoiceItem.invoice_id == invoice_id
        ).first()
        
        if not item:
            raise NotFoundError("Invoice item not found")
        
        # Check if this is the last item
        item_count = self.db.query(InvoiceItem).filter(
            InvoiceItem.invoice_id == invoice_id,
            InvoiceItem.is_active == True
        ).count()
        
        if item_count <= 1:
            raise BusinessLogicError("Cannot delete the last item from an invoice")
        
        try:
            item.is_active = False
            
            # Recalculate invoice totals
            invoice.calculate_totals()
            
            self.db.commit()
            
            logger.info(f"Deleted item from invoice {invoice.invoice_number}")
            return True
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to delete item {item_id} from invoice {invoice_id}: {e}")
            raise