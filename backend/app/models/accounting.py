"""
Accounting models for comprehensive financial management
"""

from sqlalchemy import Column, String, DateTime, Boolean, Enum, Text, Numeric, Integer, Index, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from decimal import Decimal
from datetime import datetime
from .base import BaseModel, TenantMixin


class AccountType(enum.Enum):
    """Chart of accounts types"""
    ASSET = "asset"
    LIABILITY = "liability"
    EQUITY = "equity"
    REVENUE = "revenue"
    EXPENSE = "expense"


class TransactionType(enum.Enum):
    """Transaction type enumeration"""
    SALE = "sale"
    PURCHASE = "purchase"
    PAYMENT = "payment"
    RECEIPT = "receipt"
    ADJUSTMENT = "adjustment"
    TRANSFER = "transfer"


class Account(BaseModel, TenantMixin):
    """
    Chart of accounts model
    """
    __tablename__ = "accounts"
    
    # Account Information
    account_code = Column(
        String(20), 
        nullable=False,
        comment="Account code (e.g., 1001, 2001)"
    )
    
    account_name = Column(
        String(255), 
        nullable=False,
        comment="Account name"
    )
    
    account_type = Column(
        Enum(AccountType), 
        nullable=False,
        comment="Type of account"
    )
    
    parent_id = Column(
        UUID(as_uuid=True), 
        ForeignKey("accounts.id"),
        nullable=True,
        comment="Parent account for hierarchical structure"
    )
    
    # Account Properties
    is_system_account = Column(
        Boolean, 
        default=False,
        nullable=False,
        comment="Whether this is a system-generated account"
    )
    
    is_control_account = Column(
        Boolean, 
        default=False,
        nullable=False,
        comment="Whether this is a control account"
    )
    
    allow_posting = Column(
        Boolean, 
        default=True,
        nullable=False,
        comment="Whether direct posting is allowed"
    )
    
    # Balance Information
    opening_balance = Column(
        Numeric(15, 2), 
        default=0,
        nullable=False,
        comment="Opening balance"
    )
    
    current_balance = Column(
        Numeric(15, 2), 
        default=0,
        nullable=False,
        comment="Current balance"
    )
    
    # Additional Information
    description = Column(
        Text, 
        nullable=True,
        comment="Account description"
    )
    
    # Relationships
    tenant = relationship("Tenant")
    parent = relationship("Account", remote_side="Account.id")
    children = relationship("Account", back_populates="parent")
    journal_entry_lines = relationship("JournalEntryLine", back_populates="account")
    
    def __repr__(self):
        return f"<Account(id={self.id}, code='{self.account_code}', name='{self.account_name}')>"
    
    @property
    def full_account_code(self) -> str:
        """Get full hierarchical account code"""
        if self.parent:
            return f"{self.parent.full_account_code}.{self.account_code}"
        return self.account_code
    
    def update_balance(self, amount: Decimal, is_debit: bool):
        """Update account balance based on debit/credit"""
        if self.account_type in [AccountType.ASSET, AccountType.EXPENSE]:
            # Debit increases assets and expenses
            if is_debit:
                self.current_balance += amount
            else:
                self.current_balance -= amount
        else:
            # Credit increases liabilities, equity, and revenue
            if is_debit:
                self.current_balance -= amount
            else:
                self.current_balance += amount


class JournalEntry(BaseModel, TenantMixin):
    """
    Journal entry header
    """
    __tablename__ = "journal_entries"
    
    # Entry Information
    entry_number = Column(
        String(50), 
        nullable=False,
        comment="Journal entry number"
    )
    
    entry_date = Column(
        DateTime(timezone=True),
        default=func.now(),
        nullable=False,
        comment="Entry date"
    )
    
    description = Column(
        Text, 
        nullable=False,
        comment="Entry description"
    )
    
    # Reference Information
    reference_type = Column(
        String(50), 
        nullable=True,
        comment="Type of source document (invoice, payment, etc.)"
    )
    
    reference_id = Column(
        UUID(as_uuid=True), 
        nullable=True,
        comment="ID of source document"
    )
    
    reference_number = Column(
        String(100), 
        nullable=True,
        comment="Reference document number"
    )
    
    # Entry Status
    is_posted = Column(
        Boolean, 
        default=False,
        nullable=False,
        comment="Whether entry is posted"
    )
    
    posted_at = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="Posted timestamp"
    )
    
    posted_by = Column(
        UUID(as_uuid=True), 
        nullable=True,
        comment="User who posted the entry"
    )
    
    # Totals
    total_debit = Column(
        Numeric(15, 2), 
        default=0,
        nullable=False,
        comment="Total debit amount"
    )
    
    total_credit = Column(
        Numeric(15, 2), 
        default=0,
        nullable=False,
        comment="Total credit amount"
    )
    
    # Relationships
    tenant = relationship("Tenant")
    lines = relationship("JournalEntryLine", back_populates="journal_entry", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<JournalEntry(id={self.id}, number='{self.entry_number}')>"
    
    def calculate_totals(self):
        """Calculate total debits and credits"""
        self.total_debit = sum(line.debit_amount for line in self.lines)
        self.total_credit = sum(line.credit_amount for line in self.lines)
    
    @property
    def is_balanced(self) -> bool:
        """Check if entry is balanced (debits = credits)"""
        return self.total_debit == self.total_credit
    
    def post(self, user_id: UUID = None):
        """Post the journal entry"""
        if not self.is_balanced:
            raise ValueError("Journal entry is not balanced")
        
        self.is_posted = True
        self.posted_at = datetime.utcnow()
        self.posted_by = user_id
        
        # Update account balances
        for line in self.lines:
            line.account.update_balance(line.debit_amount or line.credit_amount, 
                                      line.debit_amount > 0)


class JournalEntryLine(BaseModel):
    """
    Journal entry line items
    """
    __tablename__ = "journal_entry_lines"
    
    journal_entry_id = Column(
        UUID(as_uuid=True), 
        ForeignKey("journal_entries.id"),
        nullable=False,
        comment="Journal entry ID"
    )
    
    account_id = Column(
        UUID(as_uuid=True), 
        ForeignKey("accounts.id"),
        nullable=False,
        comment="Account ID"
    )
    
    # Line Information
    line_number = Column(
        Integer, 
        nullable=False,
        comment="Line sequence number"
    )
    
    description = Column(
        Text, 
        nullable=True,
        comment="Line description"
    )
    
    # Amounts
    debit_amount = Column(
        Numeric(15, 2), 
        default=0,
        nullable=False,
        comment="Debit amount"
    )
    
    credit_amount = Column(
        Numeric(15, 2), 
        default=0,
        nullable=False,
        comment="Credit amount"
    )
    
    # Relationships
    journal_entry = relationship("JournalEntry", back_populates="lines")
    account = relationship("Account", back_populates="journal_entry_lines")
    
    def __repr__(self):
        return f"<JournalEntryLine(id={self.id}, account={self.account_id}, debit={self.debit_amount}, credit={self.credit_amount})>"


class PaymentMethod(BaseModel, TenantMixin):
    """
    Payment methods configuration
    """
    __tablename__ = "payment_methods"
    
    name = Column(
        String(100), 
        nullable=False,
        comment="Payment method name"
    )
    
    description = Column(
        Text, 
        nullable=True,
        comment="Payment method description"
    )
    
    account_id = Column(
        UUID(as_uuid=True), 
        ForeignKey("accounts.id"),
        nullable=True,
        comment="Default account for this payment method"
    )
    
    is_cash = Column(
        Boolean, 
        default=False,
        nullable=False,
        comment="Whether this is a cash payment method"
    )
    
    requires_reference = Column(
        Boolean, 
        default=False,
        nullable=False,
        comment="Whether reference number is required"
    )
    
    # Relationships
    tenant = relationship("Tenant")
    account = relationship("Account")
    
    def __repr__(self):
        return f"<PaymentMethod(id={self.id}, name='{self.name}')>"


class Transaction(BaseModel, TenantMixin):
    """
    Financial transactions
    """
    __tablename__ = "transactions"
    
    # Transaction Information
    transaction_number = Column(
        String(50), 
        nullable=False,
        comment="Transaction number"
    )
    
    transaction_type = Column(
        Enum(TransactionType), 
        nullable=False,
        comment="Type of transaction"
    )
    
    transaction_date = Column(
        DateTime(timezone=True),
        default=func.now(),
        nullable=False,
        comment="Transaction date"
    )
    
    # Parties
    customer_id = Column(
        UUID(as_uuid=True), 
        ForeignKey("customers.id"),
        nullable=True,
        comment="Customer ID (for sales/receipts)"
    )
    
    # Financial Information
    amount = Column(
        Numeric(15, 2), 
        nullable=False,
        comment="Transaction amount"
    )
    
    payment_method_id = Column(
        UUID(as_uuid=True), 
        ForeignKey("payment_methods.id"),
        nullable=True,
        comment="Payment method used"
    )
    
    # Reference Information
    reference_number = Column(
        String(100), 
        nullable=True,
        comment="Reference number (check, transfer, etc.)"
    )
    
    invoice_id = Column(
        UUID(as_uuid=True), 
        ForeignKey("invoices.id"),
        nullable=True,
        comment="Related invoice ID"
    )
    
    journal_entry_id = Column(
        UUID(as_uuid=True), 
        ForeignKey("journal_entries.id"),
        nullable=True,
        comment="Related journal entry ID"
    )
    
    # Additional Information
    description = Column(
        Text, 
        nullable=True,
        comment="Transaction description"
    )
    
    notes = Column(
        Text, 
        nullable=True,
        comment="Internal notes"
    )
    
    # Relationships
    tenant = relationship("Tenant")
    customer = relationship("Customer")
    payment_method = relationship("PaymentMethod")
    invoice = relationship("Invoice")
    journal_entry = relationship("JournalEntry")
    
    def __repr__(self):
        return f"<Transaction(id={self.id}, number='{self.transaction_number}', amount={self.amount})>"


# Create indexes for performance optimization
Index('idx_account_tenant_code', Account.tenant_id, Account.account_code, unique=True)
Index('idx_account_tenant_type', Account.tenant_id, Account.account_type)
Index('idx_account_parent', Account.parent_id)

Index('idx_journal_entry_tenant_number', JournalEntry.tenant_id, JournalEntry.entry_number, unique=True)
Index('idx_journal_entry_tenant_date', JournalEntry.tenant_id, JournalEntry.entry_date)
Index('idx_journal_entry_reference', JournalEntry.reference_type, JournalEntry.reference_id)
Index('idx_journal_entry_posted', JournalEntry.is_posted)

Index('idx_journal_entry_line_entry', JournalEntryLine.journal_entry_id)
Index('idx_journal_entry_line_account', JournalEntryLine.account_id)

Index('idx_payment_method_tenant', PaymentMethod.tenant_id)

Index('idx_transaction_tenant_number', Transaction.tenant_id, Transaction.transaction_number, unique=True)
Index('idx_transaction_tenant_date', Transaction.tenant_id, Transaction.transaction_date)
Index('idx_transaction_tenant_type', Transaction.tenant_id, Transaction.transaction_type)
Index('idx_transaction_customer', Transaction.customer_id)
Index('idx_transaction_invoice', Transaction.invoice_id)


class SupplierBill(BaseModel, TenantMixin):
    """
    Supplier bills for accounts payable
    """
    __tablename__ = "supplier_bills"
    
    # Bill Information
    bill_number = Column(
        String(50), 
        nullable=False,
        comment="Bill number from supplier"
    )
    
    supplier_id = Column(
        UUID(as_uuid=True), 
        ForeignKey("suppliers.id"),
        nullable=False,
        comment="Supplier ID"
    )
    
    # Financial Information
    subtotal = Column(
        Numeric(15, 2), 
        nullable=False,
        default=0,
        comment="Subtotal amount"
    )
    
    tax_amount = Column(
        Numeric(15, 2), 
        nullable=False,
        default=0,
        comment="Tax amount"
    )
    
    total_amount = Column(
        Numeric(15, 2), 
        nullable=False,
        comment="Total bill amount"
    )
    
    paid_amount = Column(
        Numeric(15, 2), 
        default=0,
        nullable=False,
        comment="Amount paid so far"
    )
    
    # Dates
    bill_date = Column(
        DateTime(timezone=True),
        nullable=False,
        comment="Bill date"
    )
    
    due_date = Column(
        DateTime(timezone=True),
        nullable=False,
        comment="Payment due date"
    )
    
    # Status
    status = Column(
        String(20), 
        default="pending",
        nullable=False,
        comment="Bill status: pending, partial, paid, overdue"
    )
    
    # Additional Information
    description = Column(
        Text, 
        nullable=True,
        comment="Bill description"
    )
    
    reference_number = Column(
        String(100), 
        nullable=True,
        comment="Internal reference number"
    )
    
    notes = Column(
        Text, 
        nullable=True,
        comment="Internal notes"
    )
    
    # Relationships
    tenant = relationship("Tenant")
    supplier = relationship("Supplier", back_populates="bills")
    payments = relationship("SupplierPayment", back_populates="bill")
    
    def __repr__(self):
        return f"<SupplierBill(id={self.id}, number='{self.bill_number}', amount={self.total_amount})>"
    
    @property
    def remaining_amount(self) -> Decimal:
        """Calculate remaining amount to be paid"""
        return self.total_amount - self.paid_amount
    
    @property
    def is_overdue(self) -> bool:
        """Check if bill is overdue"""
        from datetime import datetime
        return self.due_date < datetime.now() and self.remaining_amount > 0
    
    def update_status(self):
        """Update bill status based on payments"""
        if self.paid_amount >= self.total_amount:
            self.status = "paid"
        elif self.paid_amount > 0:
            self.status = "partial"
        elif self.is_overdue:
            self.status = "overdue"
        else:
            self.status = "pending"


class SupplierPayment(BaseModel, TenantMixin):
    """
    Payments made to suppliers
    """
    __tablename__ = "supplier_payments"
    
    # Payment Information
    payment_number = Column(
        String(50), 
        nullable=False,
        comment="Payment reference number"
    )
    
    supplier_id = Column(
        UUID(as_uuid=True), 
        ForeignKey("suppliers.id"),
        nullable=False,
        comment="Supplier ID"
    )
    
    bill_id = Column(
        UUID(as_uuid=True), 
        ForeignKey("supplier_bills.id"),
        nullable=True,
        comment="Related bill ID (if payment is for specific bill)"
    )
    
    # Financial Information
    amount = Column(
        Numeric(15, 2), 
        nullable=False,
        comment="Payment amount"
    )
    
    payment_method_id = Column(
        UUID(as_uuid=True), 
        ForeignKey("payment_methods.id"),
        nullable=True,
        comment="Payment method used"
    )
    
    # Dates
    payment_date = Column(
        DateTime(timezone=True),
        nullable=False,
        comment="Payment date"
    )
    
    # Reference Information
    reference_number = Column(
        String(100), 
        nullable=True,
        comment="Check number, transfer reference, etc."
    )
    
    description = Column(
        Text, 
        nullable=True,
        comment="Payment description"
    )
    
    notes = Column(
        Text, 
        nullable=True,
        comment="Internal notes"
    )
    
    # Relationships
    tenant = relationship("Tenant")
    supplier = relationship("Supplier", back_populates="payments")
    bill = relationship("SupplierBill", back_populates="payments")
    payment_method = relationship("PaymentMethod")
    
    def __repr__(self):
        return f"<SupplierPayment(id={self.id}, number='{self.payment_number}', amount={self.amount})>"


class CustomerPayment(BaseModel, TenantMixin):
    """
    Payments received from customers for accounts receivable
    """
    __tablename__ = "customer_payments"
    
    # Payment Information
    payment_number = Column(
        String(50), 
        nullable=False,
        comment="Payment reference number"
    )
    
    customer_id = Column(
        UUID(as_uuid=True), 
        ForeignKey("customers.id"),
        nullable=False,
        comment="Customer ID"
    )
    
    invoice_id = Column(
        UUID(as_uuid=True), 
        ForeignKey("invoices.id"),
        nullable=True,
        comment="Related invoice ID (if payment is for specific invoice)"
    )
    
    # Financial Information
    amount = Column(
        Numeric(15, 2), 
        nullable=False,
        comment="Payment amount"
    )
    
    payment_method_id = Column(
        UUID(as_uuid=True), 
        ForeignKey("payment_methods.id"),
        nullable=True,
        comment="Payment method used"
    )
    
    # Dates
    payment_date = Column(
        DateTime(timezone=True),
        nullable=False,
        comment="Payment date"
    )
    
    # Reference Information
    reference_number = Column(
        String(100), 
        nullable=True,
        comment="Check number, transfer reference, etc."
    )
    
    description = Column(
        Text, 
        nullable=True,
        comment="Payment description"
    )
    
    notes = Column(
        Text, 
        nullable=True,
        comment="Internal notes"
    )
    
    # Relationships
    tenant = relationship("Tenant")
    customer = relationship("Customer")
    invoice = relationship("Invoice")
    payment_method = relationship("PaymentMethod")
    
    def __repr__(self):
        return f"<CustomerPayment(id={self.id}, number='{self.payment_number}', amount={self.amount})>"


class PaymentMatching(BaseModel, TenantMixin):
    """
    Payment matching and reconciliation records
    """
    __tablename__ = "payment_matching"
    
    # Matching Information
    match_type = Column(
        String(20), 
        nullable=False,
        comment="Type: customer_payment, supplier_payment, bank_reconciliation"
    )
    
    # Customer Payment Matching
    customer_payment_id = Column(
        UUID(as_uuid=True), 
        ForeignKey("customer_payments.id"),
        nullable=True,
        comment="Customer payment ID"
    )
    
    invoice_id = Column(
        UUID(as_uuid=True), 
        ForeignKey("invoices.id"),
        nullable=True,
        comment="Matched invoice ID"
    )
    
    # Supplier Payment Matching
    supplier_payment_id = Column(
        UUID(as_uuid=True), 
        ForeignKey("supplier_payments.id"),
        nullable=True,
        comment="Supplier payment ID"
    )
    
    supplier_bill_id = Column(
        UUID(as_uuid=True), 
        ForeignKey("supplier_bills.id"),
        nullable=True,
        comment="Matched supplier bill ID"
    )
    
    # Matching Details
    matched_amount = Column(
        Numeric(15, 2), 
        nullable=False,
        comment="Amount matched"
    )
    
    match_date = Column(
        DateTime(timezone=True),
        default=func.now(),
        nullable=False,
        comment="Date when matching was performed"
    )
    
    matched_by = Column(
        UUID(as_uuid=True), 
        nullable=True,
        comment="User who performed the matching"
    )
    
    # Status
    is_automatic = Column(
        Boolean, 
        default=False,
        nullable=False,
        comment="Whether matching was automatic or manual"
    )
    
    is_reversed = Column(
        Boolean, 
        default=False,
        nullable=False,
        comment="Whether matching has been reversed"
    )
    
    reversed_at = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="Date when matching was reversed"
    )
    
    reversed_by = Column(
        UUID(as_uuid=True), 
        nullable=True,
        comment="User who reversed the matching"
    )
    
    # Additional Information
    notes = Column(
        Text, 
        nullable=True,
        comment="Matching notes"
    )
    
    # Relationships
    tenant = relationship("Tenant")
    customer_payment = relationship("CustomerPayment")
    invoice = relationship("Invoice")
    supplier_payment = relationship("SupplierPayment")
    supplier_bill = relationship("SupplierBill")
    
    def __repr__(self):
        return f"<PaymentMatching(id={self.id}, type='{self.match_type}', amount={self.matched_amount})>"


# Additional indexes for new models
Index('idx_supplier_bill_tenant_number', SupplierBill.tenant_id, SupplierBill.bill_number, unique=True)
Index('idx_supplier_bill_supplier', SupplierBill.supplier_id)
Index('idx_supplier_bill_due_date', SupplierBill.due_date)
Index('idx_supplier_bill_status', SupplierBill.status)

Index('idx_supplier_payment_tenant_number', SupplierPayment.tenant_id, SupplierPayment.payment_number, unique=True)
Index('idx_supplier_payment_supplier', SupplierPayment.supplier_id)
Index('idx_supplier_payment_bill', SupplierPayment.bill_id)
Index('idx_supplier_payment_date', SupplierPayment.payment_date)

Index('idx_customer_payment_tenant_number', CustomerPayment.tenant_id, CustomerPayment.payment_number, unique=True)
Index('idx_customer_payment_customer', CustomerPayment.customer_id)
Index('idx_customer_payment_invoice', CustomerPayment.invoice_id)
Index('idx_customer_payment_date', CustomerPayment.payment_date)

Index('idx_payment_matching_tenant_type', PaymentMatching.tenant_id, PaymentMatching.match_type)
Index('idx_payment_matching_customer_payment', PaymentMatching.customer_payment_id)
Index('idx_payment_matching_supplier_payment', PaymentMatching.supplier_payment_id)
Index('idx_payment_matching_date', PaymentMatching.match_date)