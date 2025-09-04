"""
Receivables and Payables service for managing customer debts and supplier bills
"""

from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, func, desc, asc, text, case
from typing import List, Optional, Dict, Any, Tuple
from uuid import UUID, uuid4
from decimal import Decimal
from datetime import datetime, date, timedelta
import logging

from app.models.supplier import Supplier
from app.models.accounting import (
    SupplierBill, SupplierPayment, CustomerPayment, PaymentMatching
)
from app.models.invoice import Invoice
from app.models.customer import Customer
from app.models.accounting import PaymentMethod
from app.schemas.receivables_payables import (
    SupplierCreate, SupplierUpdate, SupplierResponse,
    SupplierBillCreate, SupplierBillUpdate, SupplierBillResponse,
    CustomerPaymentCreate, CustomerPaymentUpdate, CustomerPaymentResponse,
    SupplierPaymentCreate, SupplierPaymentUpdate, SupplierPaymentResponse,
    CustomerPaymentMatchingCreate, SupplierPaymentMatchingCreate,
    PaymentMatchingResponse, AgingReportResponse, AgingBucket,
    CustomerAgingEntry, SupplierAgingEntry, OutstandingItemsResponse,
    OutstandingInvoice, OutstandingBill, ReceivablesPayablesFilter,
    PaymentStatusEnum
)
from app.core.exceptions import ValidationError, NotFoundError, BusinessLogicError

logger = logging.getLogger(__name__)


class ReceivablesPayablesService:
    """Service for managing accounts receivable and payable operations"""

    def __init__(self, db: Session):
        self.db = db

    # Supplier Management
    def create_supplier(self, tenant_id: UUID, supplier_data: SupplierCreate) -> SupplierResponse:
        """Create a new supplier"""
        try:
            # Check if supplier with same name exists
            existing_supplier = self.db.query(Supplier).filter(
                and_(
                    Supplier.tenant_id == tenant_id,
                    Supplier.name == supplier_data.name,
                    Supplier.is_active == True
                )
            ).first()
            
            if existing_supplier:
                raise ValidationError(f"Supplier with name '{supplier_data.name}' already exists")

            supplier = Supplier(
                tenant_id=tenant_id,
                **supplier_data.dict()
            )
            
            self.db.add(supplier)
            self.db.commit()
            self.db.refresh(supplier)
            
            logger.info(f"Created supplier {supplier.name} for tenant {tenant_id}")
            return self._supplier_to_response(supplier)
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error creating supplier: {e}")
            raise

    def get_supplier(self, tenant_id: UUID, supplier_id: UUID) -> SupplierResponse:
        """Get supplier by ID"""
        supplier = self.db.query(Supplier).filter(
            and_(
                Supplier.id == supplier_id,
                Supplier.tenant_id == tenant_id,
                Supplier.is_active == True
            )
        ).first()
        
        if not supplier:
            raise NotFoundError("Supplier not found")
        
        return self._supplier_to_response(supplier)

    def get_suppliers(self, tenant_id: UUID, skip: int = 0, limit: int = 100) -> List[SupplierResponse]:
        """Get all suppliers for tenant"""
        suppliers = self.db.query(Supplier).filter(
            and_(
                Supplier.tenant_id == tenant_id,
                Supplier.is_active == True
            )
        ).order_by(Supplier.name).offset(skip).limit(limit).all()
        
        return [self._supplier_to_response(supplier) for supplier in suppliers]

    def update_supplier(self, tenant_id: UUID, supplier_id: UUID, supplier_data: SupplierUpdate) -> SupplierResponse:
        """Update supplier"""
        try:
            supplier = self.db.query(Supplier).filter(
                and_(
                    Supplier.id == supplier_id,
                    Supplier.tenant_id == tenant_id,
                    Supplier.is_active == True
                )
            ).first()
            
            if not supplier:
                raise NotFoundError("Supplier not found")

            # Update supplier
            for field, value in supplier_data.dict(exclude_unset=True).items():
                setattr(supplier, field, value)
            
            self.db.commit()
            self.db.refresh(supplier)
            
            logger.info(f"Updated supplier {supplier.name} for tenant {tenant_id}")
            return self._supplier_to_response(supplier)
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error updating supplier: {e}")
            raise

    def delete_supplier(self, tenant_id: UUID, supplier_id: UUID) -> bool:
        """Soft delete supplier"""
        try:
            supplier = self.db.query(Supplier).filter(
                and_(
                    Supplier.id == supplier_id,
                    Supplier.tenant_id == tenant_id,
                    Supplier.is_active == True
                )
            ).first()
            
            if not supplier:
                raise NotFoundError("Supplier not found")

            # Check if supplier has outstanding bills
            outstanding_bills = self.db.query(SupplierBill).filter(
                and_(
                    SupplierBill.supplier_id == supplier_id,
                    SupplierBill.status.in_(["pending", "partial", "overdue"])
                )
            ).first()
            
            if outstanding_bills:
                raise BusinessLogicError("Cannot delete supplier with outstanding bills")

            # Soft delete
            supplier.is_active = False
            self.db.commit()
            
            logger.info(f"Deleted supplier {supplier.name} for tenant {tenant_id}")
            return True
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error deleting supplier: {e}")
            raise

    # Supplier Bill Management
    def create_supplier_bill(self, tenant_id: UUID, bill_data: SupplierBillCreate) -> SupplierBillResponse:
        """Create a new supplier bill"""
        try:
            # Validate supplier exists
            supplier = self.db.query(Supplier).filter(
                and_(
                    Supplier.id == bill_data.supplier_id,
                    Supplier.tenant_id == tenant_id,
                    Supplier.is_active == True
                )
            ).first()
            
            if not supplier:
                raise ValidationError("Supplier not found")

            # Check if bill number already exists for this supplier
            existing_bill = self.db.query(SupplierBill).filter(
                and_(
                    SupplierBill.tenant_id == tenant_id,
                    SupplierBill.supplier_id == bill_data.supplier_id,
                    SupplierBill.bill_number == bill_data.bill_number,
                    SupplierBill.is_active == True
                )
            ).first()
            
            if existing_bill:
                raise ValidationError(f"Bill number '{bill_data.bill_number}' already exists for this supplier")

            bill = SupplierBill(
                tenant_id=tenant_id,
                **bill_data.dict()
            )
            
            self.db.add(bill)
            self.db.flush()  # Get ID without committing
            
            # Update supplier's total payable
            supplier.total_payable += bill.total_amount
            
            self.db.commit()
            self.db.refresh(bill)
            
            logger.info(f"Created supplier bill {bill.bill_number} for tenant {tenant_id}")
            return self._supplier_bill_to_response(bill)
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error creating supplier bill: {e}")
            raise

    def get_supplier_bill(self, tenant_id: UUID, bill_id: UUID) -> SupplierBillResponse:
        """Get supplier bill by ID"""
        bill = self.db.query(SupplierBill).options(
            joinedload(SupplierBill.supplier)
        ).filter(
            and_(
                SupplierBill.id == bill_id,
                SupplierBill.tenant_id == tenant_id,
                SupplierBill.is_active == True
            )
        ).first()
        
        if not bill:
            raise NotFoundError("Supplier bill not found")
        
        return self._supplier_bill_to_response(bill)

    def get_supplier_bills(self, tenant_id: UUID, supplier_id: Optional[UUID] = None, 
                          filter_params: Optional[ReceivablesPayablesFilter] = None,
                          skip: int = 0, limit: int = 100) -> List[SupplierBillResponse]:
        """Get supplier bills with filtering"""
        query = self.db.query(SupplierBill).options(
            joinedload(SupplierBill.supplier)
        ).filter(
            and_(
                SupplierBill.tenant_id == tenant_id,
                SupplierBill.is_active == True
            )
        )
        
        if supplier_id:
            query = query.filter(SupplierBill.supplier_id == supplier_id)
        
        if filter_params:
            if filter_params.date_from:
                query = query.filter(SupplierBill.bill_date >= filter_params.date_from)
            if filter_params.date_to:
                query = query.filter(SupplierBill.bill_date <= filter_params.date_to)
            if filter_params.status:
                query = query.filter(SupplierBill.status == filter_params.status.value)
            if filter_params.overdue_only:
                query = query.filter(
                    and_(
                        SupplierBill.due_date < datetime.now(),
                        SupplierBill.status.in_(["pending", "partial"])
                    )
                )
            if not filter_params.include_paid:
                query = query.filter(SupplierBill.status != "paid")
        
        bills = query.order_by(desc(SupplierBill.bill_date)).offset(skip).limit(limit).all()
        return [self._supplier_bill_to_response(bill) for bill in bills]

    # Customer Payment Management
    def create_customer_payment(self, tenant_id: UUID, payment_data: CustomerPaymentCreate) -> CustomerPaymentResponse:
        """Create a new customer payment"""
        try:
            # Validate customer exists
            customer = self.db.query(Customer).filter(
                and_(
                    Customer.id == payment_data.customer_id,
                    Customer.tenant_id == tenant_id,
                    Customer.is_active == True
                )
            ).first()
            
            if not customer:
                raise ValidationError("Customer not found")

            # Validate invoice if specified
            if payment_data.invoice_id:
                invoice = self.db.query(Invoice).filter(
                    and_(
                        Invoice.id == payment_data.invoice_id,
                        Invoice.tenant_id == tenant_id,
                        Invoice.customer_id == payment_data.customer_id
                    )
                ).first()
                
                if not invoice:
                    raise ValidationError("Invoice not found or doesn't belong to customer")

            # Generate payment number
            payment_number = self._generate_payment_number(tenant_id, "CP")
            
            payment = CustomerPayment(
                tenant_id=tenant_id,
                payment_number=payment_number,
                **payment_data.dict()
            )
            
            self.db.add(payment)
            self.db.commit()
            self.db.refresh(payment)
            
            logger.info(f"Created customer payment {payment_number} for tenant {tenant_id}")
            return self._customer_payment_to_response(payment)
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error creating customer payment: {e}")
            raise

    def get_customer_payments(self, tenant_id: UUID, customer_id: Optional[UUID] = None,
                            filter_params: Optional[ReceivablesPayablesFilter] = None,
                            skip: int = 0, limit: int = 100) -> List[CustomerPaymentResponse]:
        """Get customer payments with filtering"""
        query = self.db.query(CustomerPayment).options(
            joinedload(CustomerPayment.customer),
            joinedload(CustomerPayment.payment_method),
            joinedload(CustomerPayment.invoice)
        ).filter(CustomerPayment.tenant_id == tenant_id)
        
        if customer_id:
            query = query.filter(CustomerPayment.customer_id == customer_id)
        
        if filter_params:
            if filter_params.date_from:
                query = query.filter(CustomerPayment.payment_date >= filter_params.date_from)
            if filter_params.date_to:
                query = query.filter(CustomerPayment.payment_date <= filter_params.date_to)
        
        payments = query.order_by(desc(CustomerPayment.payment_date)).offset(skip).limit(limit).all()
        return [self._customer_payment_to_response(payment) for payment in payments]

    # Supplier Payment Management
    def create_supplier_payment(self, tenant_id: UUID, payment_data: SupplierPaymentCreate) -> SupplierPaymentResponse:
        """Create a new supplier payment"""
        try:
            # Validate supplier exists
            supplier = self.db.query(Supplier).filter(
                and_(
                    Supplier.id == payment_data.supplier_id,
                    Supplier.tenant_id == tenant_id,
                    Supplier.is_active == True
                )
            ).first()
            
            if not supplier:
                raise ValidationError("Supplier not found")

            # Validate bill if specified
            if payment_data.bill_id:
                bill = self.db.query(SupplierBill).filter(
                    and_(
                        SupplierBill.id == payment_data.bill_id,
                        SupplierBill.tenant_id == tenant_id,
                        SupplierBill.supplier_id == payment_data.supplier_id
                    )
                ).first()
                
                if not bill:
                    raise ValidationError("Bill not found or doesn't belong to supplier")

            # Generate payment number
            payment_number = self._generate_payment_number(tenant_id, "SP")
            
            payment = SupplierPayment(
                tenant_id=tenant_id,
                payment_number=payment_number,
                **payment_data.dict()
            )
            
            self.db.add(payment)
            self.db.flush()
            
            # Update supplier's total payable
            supplier.total_payable -= payment.amount
            
            # Update bill if specified
            if payment_data.bill_id:
                bill.paid_amount += payment.amount
                bill.update_status()
            
            self.db.commit()
            self.db.refresh(payment)
            
            logger.info(f"Created supplier payment {payment_number} for tenant {tenant_id}")
            return self._supplier_payment_to_response(payment)
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error creating supplier payment: {e}")
            raise

    def get_supplier_payments(self, tenant_id: UUID, supplier_id: Optional[UUID] = None,
                            filter_params: Optional[ReceivablesPayablesFilter] = None,
                            skip: int = 0, limit: int = 100) -> List[SupplierPaymentResponse]:
        """Get supplier payments with filtering"""
        query = self.db.query(SupplierPayment).options(
            joinedload(SupplierPayment.supplier),
            joinedload(SupplierPayment.payment_method),
            joinedload(SupplierPayment.bill)
        ).filter(SupplierPayment.tenant_id == tenant_id)
        
        if supplier_id:
            query = query.filter(SupplierPayment.supplier_id == supplier_id)
        
        if filter_params:
            if filter_params.date_from:
                query = query.filter(SupplierPayment.payment_date >= filter_params.date_from)
            if filter_params.date_to:
                query = query.filter(SupplierPayment.payment_date <= filter_params.date_to)
        
        payments = query.order_by(desc(SupplierPayment.payment_date)).offset(skip).limit(limit).all()
        return [self._supplier_payment_to_response(payment) for payment in payments]

    # Payment Matching and Reconciliation
    def match_customer_payment(self, tenant_id: UUID, matching_data: CustomerPaymentMatchingCreate, 
                             user_id: Optional[UUID] = None) -> PaymentMatchingResponse:
        """Match customer payment to invoice"""
        try:
            # Validate payment and invoice exist
            payment = self.db.query(CustomerPayment).filter(
                and_(
                    CustomerPayment.id == matching_data.customer_payment_id,
                    CustomerPayment.tenant_id == tenant_id
                )
            ).first()
            
            if not payment:
                raise ValidationError("Customer payment not found")

            invoice = self.db.query(Invoice).filter(
                and_(
                    Invoice.id == matching_data.invoice_id,
                    Invoice.tenant_id == tenant_id
                )
            ).first()
            
            if not invoice:
                raise ValidationError("Invoice not found")

            # Validate matching amount
            if matching_data.matched_amount > payment.amount:
                raise ValidationError("Matched amount cannot exceed payment amount")

            remaining_invoice_amount = invoice.total_amount - (invoice.paid_amount or Decimal('0.00'))
            if matching_data.matched_amount > remaining_invoice_amount:
                raise ValidationError("Matched amount cannot exceed remaining invoice amount")

            # Create matching record
            matching = PaymentMatching(
                tenant_id=tenant_id,
                match_type=matching_data.match_type.value,
                customer_payment_id=matching_data.customer_payment_id,
                invoice_id=matching_data.invoice_id,
                matched_amount=matching_data.matched_amount,
                matched_by=user_id,
                notes=matching_data.notes
            )
            
            self.db.add(matching)
            self.db.flush()
            
            # Update invoice paid amount
            invoice.paid_amount = (invoice.paid_amount or Decimal('0.00')) + matching_data.matched_amount
            
            self.db.commit()
            self.db.refresh(matching)
            
            logger.info(f"Matched customer payment {payment.payment_number} to invoice {invoice.invoice_number}")
            return self._payment_matching_to_response(matching)
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error matching customer payment: {e}")
            raise

    def match_supplier_payment(self, tenant_id: UUID, matching_data: SupplierPaymentMatchingCreate,
                             user_id: Optional[UUID] = None) -> PaymentMatchingResponse:
        """Match supplier payment to bill"""
        try:
            # Validate payment and bill exist
            payment = self.db.query(SupplierPayment).filter(
                and_(
                    SupplierPayment.id == matching_data.supplier_payment_id,
                    SupplierPayment.tenant_id == tenant_id
                )
            ).first()
            
            if not payment:
                raise ValidationError("Supplier payment not found")

            bill = self.db.query(SupplierBill).filter(
                and_(
                    SupplierBill.id == matching_data.supplier_bill_id,
                    SupplierBill.tenant_id == tenant_id
                )
            ).first()
            
            if not bill:
                raise ValidationError("Supplier bill not found")

            # Validate matching amount
            if matching_data.matched_amount > payment.amount:
                raise ValidationError("Matched amount cannot exceed payment amount")

            remaining_bill_amount = bill.total_amount - bill.paid_amount
            if matching_data.matched_amount > remaining_bill_amount:
                raise ValidationError("Matched amount cannot exceed remaining bill amount")

            # Create matching record
            matching = PaymentMatching(
                tenant_id=tenant_id,
                match_type=matching_data.match_type.value,
                supplier_payment_id=matching_data.supplier_payment_id,
                supplier_bill_id=matching_data.supplier_bill_id,
                matched_amount=matching_data.matched_amount,
                matched_by=user_id,
                notes=matching_data.notes
            )
            
            self.db.add(matching)
            self.db.flush()
            
            # Update bill paid amount and status
            bill.paid_amount += matching_data.matched_amount
            bill.update_status()
            
            self.db.commit()
            self.db.refresh(matching)
            
            logger.info(f"Matched supplier payment {payment.payment_number} to bill {bill.bill_number}")
            return self._payment_matching_to_response(matching)
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error matching supplier payment: {e}")
            raise

    # Aging Reports
    def get_receivables_aging_report(self, tenant_id: UUID, as_of_date: Optional[datetime] = None) -> AgingReportResponse:
        """Generate accounts receivable aging report"""
        if not as_of_date:
            as_of_date = datetime.now()

        # Define aging buckets
        buckets_config = [
            {"label": "0-30 days", "days_from": 0, "days_to": 30},
            {"label": "31-60 days", "days_from": 31, "days_to": 60},
            {"label": "61-90 days", "days_from": 61, "days_to": 90},
            {"label": "Over 90 days", "days_from": 91, "days_to": None}
        ]

        # Get outstanding invoices
        outstanding_invoices = self.db.query(
            Invoice.id,
            Invoice.invoice_number,
            Invoice.customer_id,
            Customer.name.label('customer_name'),
            Invoice.invoice_date,
            Invoice.due_date,
            Invoice.total_amount,
            func.coalesce(Invoice.paid_amount, 0).label('paid_amount'),
            (Invoice.total_amount - func.coalesce(Invoice.paid_amount, 0)).label('outstanding_amount'),
            func.extract('days', as_of_date - Invoice.due_date).label('days_overdue')
        ).join(Customer).filter(
            and_(
                Invoice.tenant_id == tenant_id,
                Invoice.total_amount > func.coalesce(Invoice.paid_amount, 0)
            )
        ).all()

        # Group by customer and calculate aging
        customer_aging = {}
        total_outstanding = Decimal('0.00')
        summary_buckets = [AgingBucket(
            label=bucket["label"],
            days_from=bucket["days_from"],
            days_to=bucket["days_to"],
            amount=Decimal('0.00'),
            count=0
        ) for bucket in buckets_config]

        for invoice in outstanding_invoices:
            customer_id = invoice.customer_id
            customer_name = invoice.customer_name
            outstanding_amount = Decimal(str(invoice.outstanding_amount))
            days_overdue = int(invoice.days_overdue) if invoice.days_overdue else 0

            if customer_id not in customer_aging:
                customer_aging[customer_id] = {
                    'customer_name': customer_name,
                    'total_outstanding': Decimal('0.00'),
                    'buckets': [AgingBucket(
                        label=bucket["label"],
                        days_from=bucket["days_from"],
                        days_to=bucket["days_to"],
                        amount=Decimal('0.00'),
                        count=0
                    ) for bucket in buckets_config]
                }

            customer_aging[customer_id]['total_outstanding'] += outstanding_amount
            total_outstanding += outstanding_amount

            # Determine which bucket this invoice falls into
            bucket_index = self._get_aging_bucket_index(days_overdue, buckets_config)
            customer_aging[customer_id]['buckets'][bucket_index].amount += outstanding_amount
            customer_aging[customer_id]['buckets'][bucket_index].count += 1
            summary_buckets[bucket_index].amount += outstanding_amount
            summary_buckets[bucket_index].count += 1

        # Convert to response format
        customers = [
            CustomerAgingEntry(
                customer_id=UUID(customer_id),
                customer_name=data['customer_name'],
                total_outstanding=data['total_outstanding'],
                buckets=data['buckets']
            )
            for customer_id, data in customer_aging.items()
        ]

        return AgingReportResponse(
            report_type="receivables",
            as_of_date=as_of_date,
            customers=customers,
            total_outstanding=total_outstanding,
            summary_buckets=summary_buckets
        )

    def get_payables_aging_report(self, tenant_id: UUID, as_of_date: Optional[datetime] = None) -> AgingReportResponse:
        """Generate accounts payable aging report"""
        if not as_of_date:
            as_of_date = datetime.now()

        # Define aging buckets
        buckets_config = [
            {"label": "0-30 days", "days_from": 0, "days_to": 30},
            {"label": "31-60 days", "days_from": 31, "days_to": 60},
            {"label": "61-90 days", "days_from": 61, "days_to": 90},
            {"label": "Over 90 days", "days_from": 91, "days_to": None}
        ]

        # Get outstanding bills
        outstanding_bills = self.db.query(
            SupplierBill.id,
            SupplierBill.bill_number,
            SupplierBill.supplier_id,
            Supplier.name.label('supplier_name'),
            SupplierBill.bill_date,
            SupplierBill.due_date,
            SupplierBill.total_amount,
            SupplierBill.paid_amount,
            (SupplierBill.total_amount - SupplierBill.paid_amount).label('outstanding_amount'),
            func.extract('days', as_of_date - SupplierBill.due_date).label('days_overdue')
        ).join(Supplier).filter(
            and_(
                SupplierBill.tenant_id == tenant_id,
                SupplierBill.total_amount > SupplierBill.paid_amount,
                SupplierBill.is_active == True
            )
        ).all()

        # Group by supplier and calculate aging
        supplier_aging = {}
        total_outstanding = Decimal('0.00')
        summary_buckets = [AgingBucket(
            label=bucket["label"],
            days_from=bucket["days_from"],
            days_to=bucket["days_to"],
            amount=Decimal('0.00'),
            count=0
        ) for bucket in buckets_config]

        for bill in outstanding_bills:
            supplier_id = bill.supplier_id
            supplier_name = bill.supplier_name
            outstanding_amount = Decimal(str(bill.outstanding_amount))
            days_overdue = int(bill.days_overdue) if bill.days_overdue else 0

            if supplier_id not in supplier_aging:
                supplier_aging[supplier_id] = {
                    'supplier_name': supplier_name,
                    'total_outstanding': Decimal('0.00'),
                    'buckets': [AgingBucket(
                        label=bucket["label"],
                        days_from=bucket["days_from"],
                        days_to=bucket["days_to"],
                        amount=Decimal('0.00'),
                        count=0
                    ) for bucket in buckets_config]
                }

            supplier_aging[supplier_id]['total_outstanding'] += outstanding_amount
            total_outstanding += outstanding_amount

            # Determine which bucket this bill falls into
            bucket_index = self._get_aging_bucket_index(days_overdue, buckets_config)
            supplier_aging[supplier_id]['buckets'][bucket_index].amount += outstanding_amount
            supplier_aging[supplier_id]['buckets'][bucket_index].count += 1
            summary_buckets[bucket_index].amount += outstanding_amount
            summary_buckets[bucket_index].count += 1

        # Convert to response format
        suppliers = [
            SupplierAgingEntry(
                supplier_id=UUID(supplier_id),
                supplier_name=data['supplier_name'],
                total_outstanding=data['total_outstanding'],
                buckets=data['buckets']
            )
            for supplier_id, data in supplier_aging.items()
        ]

        return AgingReportResponse(
            report_type="payables",
            as_of_date=as_of_date,
            suppliers=suppliers,
            total_outstanding=total_outstanding,
            summary_buckets=summary_buckets
        )

    def get_outstanding_items(self, tenant_id: UUID) -> OutstandingItemsResponse:
        """Get all outstanding receivables and payables"""
        # Outstanding invoices
        outstanding_invoices_query = self.db.query(
            Invoice.id,
            Invoice.invoice_number,
            Invoice.customer_id,
            Customer.name.label('customer_name'),
            Invoice.invoice_date,
            Invoice.due_date,
            Invoice.total_amount,
            func.coalesce(Invoice.paid_amount, 0).label('paid_amount'),
            (Invoice.total_amount - func.coalesce(Invoice.paid_amount, 0)).label('outstanding_amount'),
            func.extract('days', func.now() - Invoice.due_date).label('days_overdue')
        ).join(Customer).filter(
            and_(
                Invoice.tenant_id == tenant_id,
                Invoice.total_amount > func.coalesce(Invoice.paid_amount, 0)
            )
        ).all()

        outstanding_invoices = [
            OutstandingInvoice(
                invoice_id=inv.id,
                invoice_number=inv.invoice_number,
                customer_id=inv.customer_id,
                customer_name=inv.customer_name,
                invoice_date=inv.invoice_date,
                due_date=inv.due_date,
                total_amount=Decimal(str(inv.total_amount)),
                paid_amount=Decimal(str(inv.paid_amount)),
                outstanding_amount=Decimal(str(inv.outstanding_amount)),
                days_overdue=int(inv.days_overdue) if inv.days_overdue else 0,
                is_overdue=inv.days_overdue > 0 if inv.days_overdue else False
            )
            for inv in outstanding_invoices_query
        ]

        # Outstanding bills
        outstanding_bills_query = self.db.query(
            SupplierBill.id,
            SupplierBill.bill_number,
            SupplierBill.supplier_id,
            Supplier.name.label('supplier_name'),
            SupplierBill.bill_date,
            SupplierBill.due_date,
            SupplierBill.total_amount,
            SupplierBill.paid_amount,
            (SupplierBill.total_amount - SupplierBill.paid_amount).label('outstanding_amount'),
            func.extract('days', func.now() - SupplierBill.due_date).label('days_overdue')
        ).join(Supplier).filter(
            and_(
                SupplierBill.tenant_id == tenant_id,
                SupplierBill.total_amount > SupplierBill.paid_amount,
                SupplierBill.is_active == True
            )
        ).all()

        outstanding_bills = [
            OutstandingBill(
                bill_id=bill.id,
                bill_number=bill.bill_number,
                supplier_id=bill.supplier_id,
                supplier_name=bill.supplier_name,
                bill_date=bill.bill_date,
                due_date=bill.due_date,
                total_amount=Decimal(str(bill.total_amount)),
                paid_amount=Decimal(str(bill.paid_amount)),
                outstanding_amount=Decimal(str(bill.outstanding_amount)),
                days_overdue=int(bill.days_overdue) if bill.days_overdue else 0,
                is_overdue=bill.days_overdue > 0 if bill.days_overdue else False
            )
            for bill in outstanding_bills_query
        ]

        # Calculate totals
        total_receivables = sum(inv.outstanding_amount for inv in outstanding_invoices)
        total_payables = sum(bill.outstanding_amount for bill in outstanding_bills)
        overdue_receivables = sum(inv.outstanding_amount for inv in outstanding_invoices if inv.is_overdue)
        overdue_payables = sum(bill.outstanding_amount for bill in outstanding_bills if bill.is_overdue)

        return OutstandingItemsResponse(
            invoices=outstanding_invoices,
            bills=outstanding_bills,
            total_receivables=total_receivables,
            total_payables=total_payables,
            overdue_receivables=overdue_receivables,
            overdue_payables=overdue_payables
        )

    # Helper Methods
    def _supplier_to_response(self, supplier: Supplier) -> SupplierResponse:
        """Convert supplier model to response schema"""
        return SupplierResponse(
            id=supplier.id,
            tenant_id=supplier.tenant_id,
            name=supplier.name,
            company_name=supplier.company_name,
            email=supplier.email,
            phone=supplier.phone,
            mobile=supplier.mobile,
            address=supplier.address,
            city=supplier.city,
            postal_code=supplier.postal_code,
            country=supplier.country,
            tax_id=supplier.tax_id,
            registration_number=supplier.registration_number,
            total_payable=supplier.total_payable,
            credit_limit=supplier.credit_limit,
            payment_terms_days=supplier.payment_terms_days,
            is_active=supplier.is_active,
            notes=supplier.notes,
            created_at=supplier.created_at,
            updated_at=supplier.updated_at
        )

    def _supplier_bill_to_response(self, bill: SupplierBill) -> SupplierBillResponse:
        """Convert supplier bill model to response schema"""
        return SupplierBillResponse(
            id=bill.id,
            tenant_id=bill.tenant_id,
            bill_number=bill.bill_number,
            supplier_id=bill.supplier_id,
            supplier_name=bill.supplier.name if bill.supplier else "",
            subtotal=bill.subtotal,
            tax_amount=bill.tax_amount,
            total_amount=bill.total_amount,
            paid_amount=bill.paid_amount,
            remaining_amount=bill.remaining_amount,
            bill_date=bill.bill_date,
            due_date=bill.due_date,
            status=PaymentStatusEnum(bill.status),
            is_overdue=bill.is_overdue,
            description=bill.description,
            reference_number=bill.reference_number,
            notes=bill.notes,
            created_at=bill.created_at,
            updated_at=bill.updated_at
        )

    def _customer_payment_to_response(self, payment: CustomerPayment) -> CustomerPaymentResponse:
        """Convert customer payment model to response schema"""
        return CustomerPaymentResponse(
            id=payment.id,
            tenant_id=payment.tenant_id,
            payment_number=payment.payment_number,
            customer_id=payment.customer_id,
            customer_name=payment.customer.name if payment.customer else "",
            amount=payment.amount,
            payment_date=payment.payment_date,
            payment_method_id=payment.payment_method_id,
            payment_method_name=payment.payment_method.name if payment.payment_method else None,
            invoice_id=payment.invoice_id,
            invoice_number=payment.invoice.invoice_number if payment.invoice else None,
            reference_number=payment.reference_number,
            description=payment.description,
            notes=payment.notes,
            created_at=payment.created_at,
            updated_at=payment.updated_at
        )

    def _supplier_payment_to_response(self, payment: SupplierPayment) -> SupplierPaymentResponse:
        """Convert supplier payment model to response schema"""
        return SupplierPaymentResponse(
            id=payment.id,
            tenant_id=payment.tenant_id,
            payment_number=payment.payment_number,
            supplier_id=payment.supplier_id,
            supplier_name=payment.supplier.name if payment.supplier else "",
            amount=payment.amount,
            payment_date=payment.payment_date,
            payment_method_id=payment.payment_method_id,
            payment_method_name=payment.payment_method.name if payment.payment_method else None,
            bill_id=payment.bill_id,
            bill_number=payment.bill.bill_number if payment.bill else None,
            reference_number=payment.reference_number,
            description=payment.description,
            notes=payment.notes,
            created_at=payment.created_at,
            updated_at=payment.updated_at
        )

    def _payment_matching_to_response(self, matching: PaymentMatching) -> PaymentMatchingResponse:
        """Convert payment matching model to response schema"""
        return PaymentMatchingResponse(
            id=matching.id,
            tenant_id=matching.tenant_id,
            match_type=matching.match_type,
            customer_payment_id=matching.customer_payment_id,
            invoice_id=matching.invoice_id,
            supplier_payment_id=matching.supplier_payment_id,
            supplier_bill_id=matching.supplier_bill_id,
            matched_amount=matching.matched_amount,
            match_date=matching.match_date,
            matched_by=matching.matched_by,
            is_automatic=matching.is_automatic,
            is_reversed=matching.is_reversed,
            reversed_at=matching.reversed_at,
            reversed_by=matching.reversed_by,
            notes=matching.notes,
            created_at=matching.created_at
        )

    def _generate_payment_number(self, tenant_id: UUID, prefix: str) -> str:
        """Generate unique payment number"""
        # Get current year and month
        now = datetime.now()
        year_month = now.strftime("%Y%m")
        
        # Get next sequence number for this tenant and month
        last_payment = self.db.query(
            func.max(
                func.cast(
                    func.right(CustomerPayment.payment_number, 4), 
                    Integer
                )
            )
        ).filter(
            and_(
                CustomerPayment.tenant_id == tenant_id,
                CustomerPayment.payment_number.like(f"{prefix}{year_month}%")
            )
        ).scalar()
        
        next_seq = (last_payment or 0) + 1
        return f"{prefix}{year_month}{next_seq:04d}"

    def _get_aging_bucket_index(self, days_overdue: int, buckets_config: List[Dict]) -> int:
        """Determine which aging bucket an item falls into"""
        for i, bucket in enumerate(buckets_config):
            if bucket["days_to"] is None:  # Open-ended bucket
                if days_overdue >= bucket["days_from"]:
                    return i
            else:
                if bucket["days_from"] <= days_overdue <= bucket["days_to"]:
                    return i
        return 0  # Default to first bucket