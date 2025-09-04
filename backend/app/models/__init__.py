"""
Database models package
"""

from .base import Base, TenantMixin, BaseModel
from .tenant import Tenant
from .user import User
from .customer import Customer
from .customer_interaction import CustomerInteraction, InteractionType
from .product import Product, ProductCategory
from .invoice import Invoice, InvoiceItem, InvoiceType, InvoiceStatus
from .installment import Installment, InstallmentStatus, InstallmentType, InstallmentPlan
from .supplier import Supplier
from .accounting import (
    Account, AccountType, JournalEntry, JournalEntryLine,
    PaymentMethod, Transaction, TransactionType,
    SupplierBill, SupplierPayment, CustomerPayment, PaymentMatching
)
from .notification import NotificationTemplate, NotificationLog, NotificationStatus, NotificationQueue
from .backup import BackupLog, BackupStatus, BackupType, RestoreLog, StorageLocation
from .gold_price import GoldPrice, GoldPriceHistory
from .invoice_access_log import InvoiceAccessLog
from .marketing import (
    MarketingCampaign, CampaignRecipient, CustomerSegment, 
    SegmentCustomer, CommunicationPreference,
    CampaignStatus, CampaignType, SegmentationType
)

__all__ = [
    "Base",
    "TenantMixin", 
    "BaseModel",
    "Tenant",
    "User",
    "Customer",
    "CustomerInteraction",
    "InteractionType",
    "Product",
    "ProductCategory",
    "Invoice",
    "InvoiceItem",
    "InvoiceType",
    "InvoiceStatus",
    "Installment",
    "InstallmentStatus",
    "InstallmentType",
    "InstallmentPlan",
    "Supplier",
    "Account",
    "AccountType",
    "JournalEntry",
    "JournalEntryLine",
    "PaymentMethod",
    "Transaction",
    "TransactionType",
    "SupplierBill",
    "SupplierPayment",
    "CustomerPayment",
    "PaymentMatching",
    "NotificationTemplate",
    "NotificationLog",
    "NotificationStatus",
    "NotificationQueue",
    "BackupLog",
    "BackupStatus",
    "BackupType",
    "RestoreLog",
    "StorageLocation",
    "GoldPrice",
    "GoldPriceHistory",
    "InvoiceAccessLog",
    "MarketingCampaign",
    "CampaignRecipient",
    "CustomerSegment",
    "SegmentCustomer",
    "CommunicationPreference",
    "CampaignStatus",
    "CampaignType",
    "SegmentationType",
]