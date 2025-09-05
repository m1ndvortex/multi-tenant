"""
Tenant data export service for CSV/JSON exports with progress tracking
"""

import os
import csv
import json
import gzip
import hashlib
import tempfile
import zipfile
import secrets
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Optional, Any, Union
from pathlib import Path
import logging
from sqlalchemy.orm import Session
from sqlalchemy import text, and_

from app.core.config import settings
from app.models.base import TenantMixin
from app.models.tenant import Tenant
from app.models.user import User
from app.models.customer import Customer
from app.models.product import Product
from app.models.invoice import Invoice, InvoiceItem
from app.models.installment import Installment
from app.models.accounting import JournalEntry, JournalEntryLine, CustomerPayment, SupplierPayment
from app.models.backup import DataExportLog, ExportStatus, ExportFormat, ExportType

logger = logging.getLogger(__name__)


class DataExportService:
    """Service for handling tenant data exports in CSV/JSON formats"""
    
    def __init__(self, db: Session):
        self.db = db
        self.temp_dir = Path(tempfile.gettempdir()) / "hesaabplus_exports"
        self.temp_dir.mkdir(exist_ok=True)
        self.download_expiry_hours = 48  # Download links expire after 48 hours
    
    def generate_export_token(self) -> str:
        """Generate secure export download token"""
        return secrets.token_urlsafe(32)
    
    def calculate_checksum(self, file_path: Path) -> str:
        """Calculate SHA-256 checksum of file"""
        try:
            sha256_hash = hashlib.sha256()
            with open(file_path, "rb") as f:
                for byte_block in iter(lambda: f.read(4096), b""):
                    sha256_hash.update(byte_block)
            
            checksum = sha256_hash.hexdigest()
            logger.info(f"Checksum calculated for {file_path}: {checksum}")
            return checksum
            
        except Exception as e:
            logger.error(f"Checksum calculation failed for {file_path}: {e}")
            raise
    
    def compress_archive(self, file_paths: List[Path], archive_name: str) -> Path:
        """Create compressed ZIP archive from multiple files"""
        try:
            archive_path = self.temp_dir / f"{archive_name}.zip"
            
            with zipfile.ZipFile(archive_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
                for file_path in file_paths:
                    if file_path.exists():
                        zipf.write(file_path, file_path.name)
                        logger.debug(f"Added {file_path.name} to archive")
            
            logger.info(f"Archive created successfully: {archive_path} ({archive_path.stat().st_size} bytes)")
            return archive_path
            
        except Exception as e:
            logger.error(f"Archive creation failed: {e}")
            raise
    
    def export_table_to_csv(self, table_name: str, data: List[Dict], file_path: Path) -> int:
        """Export table data to CSV format"""
        try:
            if not data:
                # Create empty CSV with headers if no data
                with open(file_path, 'w', newline='', encoding='utf-8') as csvfile:
                    writer = csv.writer(csvfile)
                    writer.writerow([f"No data available for {table_name}"])
                return 0
            
            # Get all unique keys from all records
            all_keys = set()
            for record in data:
                all_keys.update(record.keys())
            
            fieldnames = sorted(list(all_keys))
            
            with open(file_path, 'w', newline='', encoding='utf-8') as csvfile:
                writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
                writer.writeheader()
                
                for record in data:
                    # Convert complex types to strings
                    clean_record = {}
                    for key, value in record.items():
                        if isinstance(value, (dict, list)):
                            clean_record[key] = json.dumps(value, default=str)
                        elif isinstance(value, datetime):
                            clean_record[key] = value.isoformat()
                        elif value is None:
                            clean_record[key] = ""
                        else:
                            clean_record[key] = str(value)
                    
                    writer.writerow(clean_record)
            
            logger.info(f"CSV export completed: {file_path} ({len(data)} records)")
            return len(data)
            
        except Exception as e:
            logger.error(f"CSV export failed for {table_name}: {e}")
            raise
    
    def export_table_to_json(self, table_name: str, data: List[Dict], file_path: Path) -> int:
        """Export table data to JSON format"""
        try:
            # Convert datetime objects and other non-serializable types
            clean_data = []
            for record in data:
                clean_record = {}
                for key, value in record.items():
                    if isinstance(value, datetime):
                        clean_record[key] = value.isoformat()
                    elif hasattr(value, '__dict__'):
                        # Convert SQLAlchemy objects to dict
                        clean_record[key] = str(value)
                    else:
                        clean_record[key] = value
                clean_data.append(clean_record)
            
            export_data = {
                "table": table_name,
                "exported_at": datetime.now(timezone.utc).isoformat(),
                "record_count": len(clean_data),
                "data": clean_data
            }
            
            with open(file_path, 'w', encoding='utf-8') as jsonfile:
                json.dump(export_data, jsonfile, indent=2, ensure_ascii=False, default=str)
            
            logger.info(f"JSON export completed: {file_path} ({len(data)} records)")
            return len(data)
            
        except Exception as e:
            logger.error(f"JSON export failed for {table_name}: {e}")
            raise
    
    def get_customers_data(self, tenant_id: str) -> List[Dict]:
        """Get all customer data for tenant"""
        try:
            customers = (
                self.db.query(Customer)
                .filter(Customer.tenant_id == tenant_id)
                .order_by(Customer.created_at)
                .all()
            )
            
            data = []
            for customer in customers:
                customer_dict = {
                    "id": str(customer.id),
                    "name": customer.name,
                    "email": customer.email,
                    "phone": customer.phone,
                    "address": customer.address,
                    "tags": customer.tags,
                    "total_debt": float(customer.total_debt) if customer.total_debt else 0,
                    "created_at": customer.created_at,
                    "updated_at": customer.updated_at,
                    "is_active": customer.is_active
                }
                data.append(customer_dict)
            
            logger.info(f"Retrieved {len(data)} customers for tenant {tenant_id}")
            return data
            
        except Exception as e:
            logger.error(f"Failed to get customers data for tenant {tenant_id}: {e}")
            raise
    
    def get_products_data(self, tenant_id: str) -> List[Dict]:
        """Get all product data for tenant"""
        try:
            products = (
                self.db.query(Product)
                .filter(Product.tenant_id == tenant_id)
                .order_by(Product.created_at)
                .all()
            )
            
            data = []
            for product in products:
                product_dict = {
                    "id": str(product.id),
                    "name": product.name,
                    "description": product.description,
                    "category": product.category.name if product.category else None,
                    "selling_price": float(product.selling_price) if product.selling_price else 0,
                    "cost_price": float(product.cost_price) if product.cost_price else 0,
                    "stock_quantity": product.stock_quantity,
                    "images": product.images,
                    "created_at": product.created_at,
                    "updated_at": product.updated_at,
                    "is_active": product.is_active
                }
                data.append(product_dict)
            
            logger.info(f"Retrieved {len(data)} products for tenant {tenant_id}")
            return data
            
        except Exception as e:
            logger.error(f"Failed to get products data for tenant {tenant_id}: {e}")
            raise
    
    def get_invoices_data(self, tenant_id: str) -> List[Dict]:
        """Get all invoice data for tenant including items"""
        try:
            invoices = (
                self.db.query(Invoice)
                .filter(Invoice.tenant_id == tenant_id)
                .order_by(Invoice.created_at)
                .all()
            )
            
            data = []
            for invoice in invoices:
                # Get invoice items
                items = []
                for item in invoice.items:
                    item_dict = {
                        "id": str(item.id),
                        "product_id": str(item.product_id) if item.product_id else None,
                        "description": item.description,
                        "quantity": float(item.quantity) if item.quantity else 0,
                        "unit_price": float(item.unit_price) if item.unit_price else 0,
                        "line_total": float(item.line_total) if item.line_total else 0,
                        "weight": float(item.weight) if item.weight else None,
                        "labor_fee": float(item.labor_fee) if item.labor_fee else None,
                        "profit": float(item.profit) if item.profit else None,
                        "vat_amount": float(item.vat_amount) if item.vat_amount else None,
                        "created_at": item.created_at
                    }
                    items.append(item_dict)
                
                invoice_dict = {
                    "id": str(invoice.id),
                    "customer_id": str(invoice.customer_id),
                    "invoice_number": invoice.invoice_number,
                    "invoice_type": invoice.invoice_type.value if invoice.invoice_type else None,
                    "installment_type": invoice.installment_type.value if invoice.installment_type else None,
                    "subtotal": float(invoice.subtotal) if invoice.subtotal else 0,
                    "tax_amount": float(invoice.tax_amount) if invoice.tax_amount else 0,
                    "total_amount": float(invoice.total_amount) if invoice.total_amount else 0,
                    "total_gold_weight": float(invoice.total_gold_weight) if invoice.total_gold_weight else None,
                    "gold_price_at_creation": float(invoice.gold_price_at_creation) if invoice.gold_price_at_creation else None,
                    "remaining_balance": float(invoice.remaining_balance) if invoice.remaining_balance else None,
                    "remaining_gold_weight": float(invoice.remaining_gold_weight) if invoice.remaining_gold_weight else None,
                    "status": invoice.status.value if invoice.status else None,
                    "due_date": invoice.due_date,
                    "notes": invoice.notes,
                    "qr_code_token": invoice.qr_code_token,
                    "is_shareable": invoice.is_shareable,
                    "created_at": invoice.created_at,
                    "updated_at": invoice.updated_at,
                    "items": items
                }
                data.append(invoice_dict)
            
            logger.info(f"Retrieved {len(data)} invoices for tenant {tenant_id}")
            return data
            
        except Exception as e:
            logger.error(f"Failed to get invoices data for tenant {tenant_id}: {e}")
            raise
    
    def get_installments_data(self, tenant_id: str) -> List[Dict]:
        """Get all installment data for tenant"""
        try:
            # Join with invoices to filter by tenant
            installments = (
                self.db.query(Installment)
                .join(Invoice, Installment.invoice_id == Invoice.id)
                .filter(Invoice.tenant_id == tenant_id)
                .order_by(Installment.created_at)
                .all()
            )
            
            data = []
            for installment in installments:
                installment_dict = {
                    "id": str(installment.id),
                    "invoice_id": str(installment.invoice_id),
                    "installment_number": installment.installment_number,
                    "amount_due": float(installment.amount_due) if installment.amount_due else None,
                    "amount_paid": float(installment.amount_paid) if installment.amount_paid else 0,
                    "gold_weight_due": float(installment.gold_weight_due) if installment.gold_weight_due else None,
                    "gold_weight_paid": float(installment.gold_weight_paid) if installment.gold_weight_paid else 0,
                    "gold_price_at_payment": float(installment.gold_price_at_payment) if installment.gold_price_at_payment else None,
                    "due_date": installment.due_date,
                    "paid_at": installment.paid_at,
                    "status": installment.status.value if installment.status else None,
                    "notes": installment.notes,
                    "created_at": installment.created_at,
                    "updated_at": installment.updated_at
                }
                data.append(installment_dict)
            
            logger.info(f"Retrieved {len(data)} installments for tenant {tenant_id}")
            return data
            
        except Exception as e:
            logger.error(f"Failed to get installments data for tenant {tenant_id}: {e}")
            raise
    
    def get_accounting_data(self, tenant_id: str) -> Dict[str, List[Dict]]:
        """Get all accounting data for tenant"""
        try:
            # Journal Entries
            journal_entries = (
                self.db.query(JournalEntry)
                .filter(JournalEntry.tenant_id == tenant_id)
                .order_by(JournalEntry.entry_date)
                .all()
            )
            
            je_data = []
            for entry in journal_entries:
                # Get journal entry lines
                lines = []
                for line in entry.lines:
                    line_dict = {
                        "id": str(line.id),
                        "account_id": str(line.account_id),
                        "description": line.description,
                        "debit_amount": float(line.debit_amount) if line.debit_amount else 0,
                        "credit_amount": float(line.credit_amount) if line.credit_amount else 0
                    }
                    lines.append(line_dict)
                
                entry_dict = {
                    "id": str(entry.id),
                    "entry_date": entry.entry_date,
                    "description": entry.description,
                    "total_amount": float(entry.total_amount) if entry.total_amount else 0,
                    "reference_type": entry.reference_type,
                    "reference_id": str(entry.reference_id) if entry.reference_id else None,
                    "created_at": entry.created_at,
                    "lines": lines
                }
                je_data.append(entry_dict)
            
            # Customer Payments
            customer_payments = (
                self.db.query(CustomerPayment)
                .filter(CustomerPayment.tenant_id == tenant_id)
                .order_by(CustomerPayment.payment_date)
                .all()
            )
            
            cp_data = []
            for payment in customer_payments:
                payment_dict = {
                    "id": str(payment.id),
                    "customer_id": str(payment.customer_id),
                    "invoice_id": str(payment.invoice_id) if payment.invoice_id else None,
                    "amount": float(payment.amount) if payment.amount else 0,
                    "payment_date": payment.payment_date,
                    "payment_method": payment.payment_method.value if payment.payment_method else None,
                    "reference_number": payment.reference_number,
                    "notes": payment.notes,
                    "created_at": payment.created_at
                }
                cp_data.append(payment_dict)
            
            # Supplier Payments
            supplier_payments = (
                self.db.query(SupplierPayment)
                .filter(SupplierPayment.tenant_id == tenant_id)
                .order_by(SupplierPayment.payment_date)
                .all()
            )
            
            sp_data = []
            for payment in supplier_payments:
                payment_dict = {
                    "id": str(payment.id),
                    "supplier_id": str(payment.supplier_id),
                    "bill_id": str(payment.bill_id) if payment.bill_id else None,
                    "amount": float(payment.amount) if payment.amount else 0,
                    "payment_date": payment.payment_date,
                    "payment_method": payment.payment_method.value if payment.payment_method else None,
                    "reference_number": payment.reference_number,
                    "notes": payment.notes,
                    "created_at": payment.created_at
                }
                sp_data.append(payment_dict)
            
            accounting_data = {
                "journal_entries": je_data,
                "customer_payments": cp_data,
                "supplier_payments": sp_data
            }
            
            total_records = len(je_data) + len(cp_data) + len(sp_data)
            logger.info(f"Retrieved {total_records} accounting records for tenant {tenant_id}")
            return accounting_data
            
        except Exception as e:
            logger.error(f"Failed to get accounting data for tenant {tenant_id}: {e}")
            raise
    
    def create_data_export(
        self, 
        tenant_id: str, 
        user_id: str, 
        export_format: ExportFormat,
        export_type: ExportType,
        tables: Optional[List[str]] = None,
        task_id: str = None
    ) -> Dict:
        """Create comprehensive data export for tenant"""
        export_log = None
        temp_files = []
        
        try:
            # Verify tenant and user exist
            tenant = self.db.query(Tenant).filter(Tenant.id == tenant_id).first()
            if not tenant:
                raise Exception(f"Tenant {tenant_id} not found")
            
            user = self.db.query(User).filter(
                and_(User.id == user_id, User.tenant_id == tenant_id)
            ).first()
            if not user:
                raise Exception(f"User {user_id} not found or not authorized for tenant {tenant_id}")
            
            # Create export log entry
            timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
            export_name = f"data_export_{tenant_id}_{timestamp}"
            
            export_log = DataExportLog(
                tenant_id=tenant_id,
                initiated_by=user_id,
                export_name=export_name,
                export_format=export_format,
                export_type=export_type,
                status=ExportStatus.PENDING,
                task_id=task_id
            )
            self.db.add(export_log)
            self.db.commit()
            
            # Start export process
            export_log.start_export()
            self.db.commit()
            
            logger.info(f"Starting data export for tenant {tenant_id}")
            
            # Define default tables if not specified
            if not tables:
                tables = ["customers", "products", "invoices", "installments", "accounting"]
            
            exported_files = []
            total_records = 0
            
            # Export each table
            for table in tables:
                try:
                    logger.info(f"Exporting table: {table}")
                    
                    # Get data for table
                    if table == "customers":
                        data = self.get_customers_data(tenant_id)
                        table_data = {table: data}
                    elif table == "products":
                        data = self.get_products_data(tenant_id)
                        table_data = {table: data}
                    elif table == "invoices":
                        data = self.get_invoices_data(tenant_id)
                        table_data = {table: data}
                    elif table == "installments":
                        data = self.get_installments_data(tenant_id)
                        table_data = {table: data}
                    elif table == "accounting":
                        table_data = self.get_accounting_data(tenant_id)
                    else:
                        logger.warning(f"Unknown table: {table}")
                        continue
                    
                    # Export each sub-table
                    for sub_table, sub_data in table_data.items():
                        if export_format == ExportFormat.CSV:
                            file_path = self.temp_dir / f"{export_name}_{sub_table}.csv"
                            records = self.export_table_to_csv(sub_table, sub_data, file_path)
                        else:  # JSON
                            file_path = self.temp_dir / f"{export_name}_{sub_table}.json"
                            records = self.export_table_to_json(sub_table, sub_data, file_path)
                        
                        temp_files.append(file_path)
                        exported_files.append({
                            "table": sub_table,
                            "file": file_path.name,
                            "records": records
                        })
                        total_records += records
                        
                except Exception as e:
                    logger.error(f"Failed to export table {table}: {e}")
                    # Continue with other tables
                    continue
            
            if not exported_files:
                raise Exception("No data was exported")
            
            # Create compressed archive
            archive_path = self.compress_archive(temp_files, export_name)
            
            # Calculate checksum
            checksum = self.calculate_checksum(archive_path)
            
            # Generate download token and set expiry
            download_token = self.generate_export_token()
            download_expires_at = datetime.now(timezone.utc) + timedelta(hours=self.download_expiry_hours)
            
            # Update export log with success
            export_log.local_file_path = str(archive_path)
            export_log.complete_export(
                file_size=sum(f.stat().st_size for f in temp_files if f.exists()),
                compressed_size=archive_path.stat().st_size,
                checksum=checksum,
                download_token=download_token,
                download_expires_at=download_expires_at,
                exported_tables=tables,
                total_records=total_records
            )
            self.db.commit()
            
            logger.info(f"Data export completed successfully for tenant {tenant_id}")
            
            return {
                "status": "success",
                "export_id": str(export_log.id),
                "tenant_id": tenant_id,
                "export_name": export_name,
                "export_format": export_format.value,
                "export_type": export_type.value,
                "exported_files": exported_files,
                "total_records": total_records,
                "file_size": sum(f.stat().st_size for f in temp_files if f.exists()),
                "compressed_size": archive_path.stat().st_size,
                "checksum": checksum,
                "download_token": download_token,
                "download_expires_at": download_expires_at.isoformat(),
                "duration_seconds": export_log.duration_seconds
            }
            
        except Exception as e:
            logger.error(f"Data export failed for tenant {tenant_id}: {e}")
            
            if export_log:
                export_log.fail_export(str(e))
                self.db.commit()
            
            raise
        
        finally:
            # Clean up temporary files (except the final archive)
            for temp_file in temp_files:
                try:
                    if temp_file.exists() and temp_file != Path(export_log.local_file_path if export_log else ""):
                        temp_file.unlink()
                        logger.debug(f"Cleaned up temporary file: {temp_file}")
                except Exception as e:
                    logger.warning(f"Failed to clean up {temp_file}: {e}")
    
    def get_export_file_path(self, download_token: str) -> Optional[Path]:
        """Get export file path by download token"""
        try:
            export = (
                self.db.query(DataExportLog)
                .filter(
                    and_(
                        DataExportLog.download_token == download_token,
                        DataExportLog.status == ExportStatus.COMPLETED
                    )
                )
                .first()
            )
            
            if not export:
                return None
            
            if export.is_download_expired:
                return None
            
            file_path = Path(export.local_file_path)
            if not file_path.exists():
                return None
            
            return file_path
            
        except Exception as e:
            logger.error(f"Failed to get export file path for token {download_token}: {e}")
            return None
    
    def mark_export_downloaded(self, download_token: str):
        """Mark export as downloaded"""
        try:
            export = (
                self.db.query(DataExportLog)
                .filter(DataExportLog.download_token == download_token)
                .first()
            )
            
            if export:
                export.mark_downloaded()
                self.db.commit()
                logger.info(f"Marked export {export.id} as downloaded")
            
        except Exception as e:
            logger.error(f"Failed to mark export as downloaded for token {download_token}: {e}")
    
    def list_tenant_exports(self, tenant_id: str, limit: int = 50) -> List[Dict]:
        """List data exports for a specific tenant"""
        try:
            exports = (
                self.db.query(DataExportLog)
                .filter(DataExportLog.tenant_id == tenant_id)
                .order_by(DataExportLog.created_at.desc())
                .limit(limit)
                .all()
            )
            
            export_list = []
            for export in exports:
                export_info = {
                    "export_id": str(export.id),
                    "export_name": export.export_name,
                    "export_format": export.export_format.value,
                    "export_type": export.export_type.value,
                    "status": export.status.value,
                    "created_at": export.created_at.isoformat(),
                    "completed_at": export.completed_at.isoformat() if export.completed_at else None,
                    "exported_tables": export.exported_tables,
                    "total_records": export.total_records,
                    "file_size": export.file_size,
                    "compressed_size": export.compressed_size,
                    "checksum": export.checksum,
                    "download_expires_at": export.download_expires_at.isoformat() if export.download_expires_at else None,
                    "downloaded_at": export.downloaded_at.isoformat() if export.downloaded_at else None,
                    "is_download_expired": export.is_download_expired,
                    "duration_seconds": export.duration_seconds,
                    "error_message": export.error_message
                }
                export_list.append(export_info)
            
            return export_list
            
        except Exception as e:
            logger.error(f"Failed to list exports for tenant {tenant_id}: {e}")
            raise
    
    def get_export_status(self, export_id: str, tenant_id: str) -> Optional[Dict]:
        """Get status of a specific data export"""
        try:
            export = (
                self.db.query(DataExportLog)
                .filter(
                    and_(
                        DataExportLog.id == export_id,
                        DataExportLog.tenant_id == tenant_id
                    )
                )
                .first()
            )
            
            if not export:
                return None
            
            return {
                "export_id": str(export.id),
                "export_name": export.export_name,
                "export_format": export.export_format.value,
                "export_type": export.export_type.value,
                "status": export.status.value,
                "created_at": export.created_at.isoformat(),
                "completed_at": export.completed_at.isoformat() if export.completed_at else None,
                "exported_tables": export.exported_tables,
                "total_records": export.total_records,
                "file_size": export.file_size,
                "compressed_size": export.compressed_size,
                "checksum": export.checksum,
                "download_token": export.download_token if export.status == ExportStatus.COMPLETED else None,
                "download_expires_at": export.download_expires_at.isoformat() if export.download_expires_at else None,
                "downloaded_at": export.downloaded_at.isoformat() if export.downloaded_at else None,
                "is_download_expired": export.is_download_expired,
                "duration_seconds": export.duration_seconds,
                "error_message": export.error_message
            }
            
        except Exception as e:
            logger.error(f"Failed to get export status for {export_id}: {e}")
            raise
    
    def cleanup_expired_exports(self):
        """Clean up expired export files"""
        try:
            # Find expired exports
            expired_exports = (
                self.db.query(DataExportLog)
                .filter(
                    and_(
                        DataExportLog.download_expires_at < datetime.now(timezone.utc),
                        DataExportLog.local_file_path.isnot(None)
                    )
                )
                .all()
            )
            
            cleaned_count = 0
            for export in expired_exports:
                try:
                    file_path = Path(export.local_file_path)
                    if file_path.exists():
                        file_path.unlink()
                        logger.info(f"Cleaned up expired export file: {file_path}")
                    
                    # Clear file path from database
                    export.local_file_path = None
                    cleaned_count += 1
                    
                except Exception as e:
                    logger.error(f"Failed to clean up export file {export.local_file_path}: {e}")
            
            if cleaned_count > 0:
                self.db.commit()
                logger.info(f"Cleaned up {cleaned_count} expired export files")
            
            return cleaned_count
            
        except Exception as e:
            logger.error(f"Failed to cleanup expired exports: {e}")
            raise