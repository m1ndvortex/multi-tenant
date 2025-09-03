"""
Customer self-backup service for local-only data export
"""

import os
import gzip
import hashlib
import tempfile
import subprocess
import secrets
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Optional, Tuple
from pathlib import Path
import logging
from sqlalchemy.orm import Session
from sqlalchemy import text, and_

from app.core.config import settings
from app.models.backup import CustomerBackupLog, BackupStatus
from app.models.tenant import Tenant
from app.models.user import User

logger = logging.getLogger(__name__)


class CustomerBackupService:
    """Service for handling customer self-backups (local download only)"""
    
    def __init__(self, db: Session):
        self.db = db
        self.temp_dir = Path(tempfile.gettempdir()) / "hesaabplus_customer_backups"
        self.temp_dir.mkdir(exist_ok=True)
        self.download_expiry_hours = 24  # Download links expire after 24 hours
    
    def check_daily_limit(self, tenant_id: str) -> bool:
        """Check if tenant has already created a backup today"""
        try:
            today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
            today_end = today_start + timedelta(days=1)
            
            existing_backup = (
                self.db.query(CustomerBackupLog)
                .filter(
                    and_(
                        CustomerBackupLog.tenant_id == tenant_id,
                        CustomerBackupLog.started_at >= today_start,
                        CustomerBackupLog.started_at < today_end,
                        CustomerBackupLog.status.in_([BackupStatus.COMPLETED, BackupStatus.IN_PROGRESS])
                    )
                )
                .first()
            )
            
            return existing_backup is None
            
        except Exception as e:
            logger.error(f"Failed to check daily limit for tenant {tenant_id}: {e}")
            return False
    
    def generate_download_token(self) -> str:
        """Generate secure download token"""
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
    
    def compress_file(self, file_path: Path) -> Path:
        """Compress file using gzip"""
        try:
            compressed_path = file_path.with_suffix(file_path.suffix + '.gz')
            
            with open(file_path, 'rb') as f_in:
                with gzip.open(compressed_path, 'wb') as f_out:
                    f_out.writelines(f_in)
            
            logger.info(f"File compressed successfully: {compressed_path}")
            return compressed_path
            
        except Exception as e:
            logger.error(f"Compression failed for {file_path}: {e}")
            raise
    
    def create_tenant_data_export(self, tenant_id: str) -> Path:
        """Create comprehensive SQL export of all tenant business data"""
        try:
            timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
            export_filename = f"customer_backup_{tenant_id}_{timestamp}.sql"
            export_path = self.temp_dir / export_filename
            
            # Parse database URL to get connection parameters
            db_url = settings.database_url
            # Extract connection details from DATABASE_URL
            if db_url.startswith("postgresql://"):
                db_url = db_url.replace("postgresql://", "")
                if "@" in db_url:
                    auth_part, host_part = db_url.split("@", 1)
                    if ":" in auth_part:
                        username, password = auth_part.split(":", 1)
                    else:
                        username = auth_part
                        password = ""
                    
                    if "/" in host_part:
                        host_port, database = host_part.split("/", 1)
                    else:
                        host_port = host_part
                        database = "hesaabplus"
                    
                    if ":" in host_port:
                        host, port = host_port.split(":", 1)
                    else:
                        host = host_port
                        port = "5432"
                else:
                    # No auth in URL
                    host = "postgres"
                    port = "5432"
                    database = "hesaabplus"
                    username = "hesaab"
                    password = os.getenv("POSTGRES_PASSWORD", "")
            
            # Define all tenant business data tables
            tenant_tables = [
                "users",
                "customers", 
                "products",
                "invoices",
                "invoice_items",
                "installments",
                "journal_entries"
                # Note: Only including tables that exist in the current database
                # "notifications",  # Table doesn't exist yet
                # "gold_prices",    # Table doesn't exist yet
                # "activity_logs"   # Table doesn't exist yet
            ]
            
            # Create comprehensive SQL export with tenant filtering
            with open(export_path, 'w', encoding='utf-8') as export_file:
                # Write header
                export_file.write(f"-- HesaabPlus Customer Backup\n")
                export_file.write(f"-- Tenant ID: {tenant_id}\n")
                export_file.write(f"-- Generated: {datetime.now(timezone.utc).isoformat()}\n")
                export_file.write(f"-- \n\n")
                
                export_file.write("BEGIN;\n\n")
                
                # Export each table with tenant filtering
                for table in tenant_tables:
                    try:
                        logger.info(f"Exporting table: {table}")
                        
                        # Get table data for this tenant
                        if table == "users":
                            # Users table - get all users for this tenant
                            query = text(f"""
                                SELECT * FROM {table} 
                                WHERE tenant_id = :tenant_id 
                                ORDER BY created_at
                            """)
                        elif table in ["customers", "products", "invoices", "journal_entries", "notifications", "gold_prices", "activity_logs"]:
                            # Tables with direct tenant_id
                            query = text(f"""
                                SELECT * FROM {table} 
                                WHERE tenant_id = :tenant_id 
                                ORDER BY created_at
                            """)
                        elif table == "invoice_items":
                            # Invoice items - join with invoices to filter by tenant
                            query = text(f"""
                                SELECT ii.* FROM {table} ii
                                JOIN invoices i ON ii.invoice_id = i.id
                                WHERE i.tenant_id = :tenant_id
                                ORDER BY ii.created_at
                            """)
                        elif table == "installments":
                            # Installments - join with invoices to filter by tenant
                            query = text(f"""
                                SELECT inst.* FROM {table} inst
                                JOIN invoices i ON inst.invoice_id = i.id
                                WHERE i.tenant_id = :tenant_id
                                ORDER BY inst.created_at
                            """)
                        else:
                            # Skip tables that don't have tenant association
                            continue
                        
                        result = self.db.execute(query, {"tenant_id": tenant_id})
                        rows = result.fetchall()
                        
                        if rows:
                            export_file.write(f"-- Table: {table}\n")
                            export_file.write(f"-- Records: {len(rows)}\n\n")
                            
                            # Get column names
                            columns = list(result.keys())
                            
                            # Write INSERT statements
                            for row in rows:
                                values = []
                                for value in row:
                                    if value is None:
                                        values.append("NULL")
                                    elif isinstance(value, str):
                                        # Escape single quotes
                                        escaped_value = value.replace("'", "''")
                                        values.append(f"'{escaped_value}'")
                                    elif isinstance(value, datetime):
                                        values.append(f"'{value.isoformat()}'")
                                    elif isinstance(value, bool):
                                        values.append("TRUE" if value else "FALSE")
                                    else:
                                        values.append(str(value))
                                
                                column_list = ", ".join(columns)
                                value_list = ", ".join(values)
                                
                                export_file.write(f"INSERT INTO {table} ({column_list}) VALUES ({value_list});\n")
                            
                            export_file.write(f"\n")
                        else:
                            export_file.write(f"-- Table: {table} (no data)\n\n")
                            
                    except Exception as e:
                        logger.error(f"Failed to export table {table}: {e}")
                        export_file.write(f"-- ERROR exporting table {table}: {e}\n\n")
                
                export_file.write("COMMIT;\n")
                export_file.write(f"\n-- Backup completed: {datetime.now(timezone.utc).isoformat()}\n")
            
            if not export_path.exists() or export_path.stat().st_size == 0:
                raise Exception("Export file is empty or was not created")
            
            logger.info(f"Customer data export created successfully: {export_path} ({export_path.stat().st_size} bytes)")
            return export_path
            
        except Exception as e:
            logger.error(f"Customer data export creation failed for tenant {tenant_id}: {e}")
            raise
    
    def create_customer_backup(self, tenant_id: str, user_id: str, task_id: str = None) -> Dict:
        """Create customer self-backup for local download"""
        backup_log = None
        temp_files = []
        
        try:
            # Check daily limit
            if not self.check_daily_limit(tenant_id):
                raise Exception("Daily backup limit reached. You can only create one backup per day.")
            
            # Verify tenant and user exist
            tenant = self.db.query(Tenant).filter(Tenant.id == tenant_id).first()
            if not tenant:
                raise Exception(f"Tenant {tenant_id} not found")
            
            user = self.db.query(User).filter(
                and_(User.id == user_id, User.tenant_id == tenant_id)
            ).first()
            if not user:
                raise Exception(f"User {user_id} not found or not authorized for tenant {tenant_id}")
            
            # Create backup log entry
            timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
            backup_name = f"customer_backup_{tenant_id}_{timestamp}"
            
            backup_log = CustomerBackupLog(
                tenant_id=tenant_id,
                initiated_by=user_id,
                backup_name=backup_name,
                status=BackupStatus.PENDING,
                task_id=task_id
            )
            self.db.add(backup_log)
            self.db.commit()
            
            # Start backup process
            backup_log.start_backup()
            self.db.commit()
            
            logger.info(f"Starting customer backup for tenant {tenant_id}")
            
            # Step 1: Create comprehensive data export
            export_path = self.create_tenant_data_export(tenant_id)
            temp_files.append(export_path)
            
            # Step 2: Compress the export
            compressed_path = self.compress_file(export_path)
            temp_files.append(compressed_path)
            
            # Step 3: Calculate checksum
            checksum = self.calculate_checksum(compressed_path)
            
            # Step 4: Generate download token and set expiry
            download_token = self.generate_download_token()
            download_expires_at = datetime.now(timezone.utc) + timedelta(hours=self.download_expiry_hours)
            
            # Step 5: Store final file path and update backup log
            final_filename = f"{backup_name}.sql.gz"
            final_path = self.temp_dir / final_filename
            
            # Move compressed file to final location
            compressed_path.rename(final_path)
            
            backup_log.local_file_path = str(final_path)
            backup_log.complete_backup(
                file_size=export_path.stat().st_size,
                compressed_size=final_path.stat().st_size,
                checksum=checksum,
                download_token=download_token,
                download_expires_at=download_expires_at
            )
            self.db.commit()
            
            logger.info(f"Customer backup completed successfully for tenant {tenant_id}")
            
            return {
                "status": "success",
                "backup_id": str(backup_log.id),
                "tenant_id": tenant_id,
                "backup_name": backup_name,
                "file_size": export_path.stat().st_size,
                "compressed_size": final_path.stat().st_size,
                "checksum": checksum,
                "download_token": download_token,
                "download_expires_at": download_expires_at.isoformat(),
                "duration_seconds": backup_log.duration_seconds
            }
            
        except Exception as e:
            logger.error(f"Customer backup failed for tenant {tenant_id}: {e}")
            
            if backup_log:
                backup_log.fail_backup(str(e))
                self.db.commit()
            
            raise
        
        finally:
            # Clean up temporary files (except the final compressed file)
            for temp_file in temp_files:
                try:
                    if temp_file.exists() and temp_file != Path(backup_log.local_file_path if backup_log else ""):
                        temp_file.unlink()
                        logger.debug(f"Cleaned up temporary file: {temp_file}")
                except Exception as e:
                    logger.warning(f"Failed to clean up {temp_file}: {e}")
    
    def get_backup_file_path(self, download_token: str) -> Optional[Path]:
        """Get backup file path by download token"""
        try:
            backup = (
                self.db.query(CustomerBackupLog)
                .filter(
                    and_(
                        CustomerBackupLog.download_token == download_token,
                        CustomerBackupLog.status == BackupStatus.COMPLETED
                    )
                )
                .first()
            )
            
            if not backup:
                return None
            
            if backup.is_download_expired:
                return None
            
            file_path = Path(backup.local_file_path)
            if not file_path.exists():
                return None
            
            return file_path
            
        except Exception as e:
            logger.error(f"Failed to get backup file path for token {download_token}: {e}")
            return None
    
    def mark_backup_downloaded(self, download_token: str):
        """Mark backup as downloaded"""
        try:
            backup = (
                self.db.query(CustomerBackupLog)
                .filter(CustomerBackupLog.download_token == download_token)
                .first()
            )
            
            if backup:
                backup.mark_downloaded()
                self.db.commit()
                logger.info(f"Marked backup {backup.id} as downloaded")
            
        except Exception as e:
            logger.error(f"Failed to mark backup as downloaded for token {download_token}: {e}")
    
    def list_customer_backups(self, tenant_id: str, limit: int = 50) -> List[Dict]:
        """List customer backups for a specific tenant"""
        try:
            backups = (
                self.db.query(CustomerBackupLog)
                .filter(CustomerBackupLog.tenant_id == tenant_id)
                .order_by(CustomerBackupLog.created_at.desc())
                .limit(limit)
                .all()
            )
            
            backup_list = []
            for backup in backups:
                backup_info = {
                    "backup_id": str(backup.id),
                    "backup_name": backup.backup_name,
                    "status": backup.status.value,
                    "created_at": backup.created_at.isoformat(),
                    "completed_at": backup.completed_at.isoformat() if backup.completed_at else None,
                    "file_size": backup.file_size,
                    "compressed_size": backup.compressed_size,
                    "checksum": backup.checksum,
                    "download_expires_at": backup.download_expires_at.isoformat() if backup.download_expires_at else None,
                    "downloaded_at": backup.downloaded_at.isoformat() if backup.downloaded_at else None,
                    "is_download_expired": backup.is_download_expired,
                    "duration_seconds": backup.duration_seconds,
                    "error_message": backup.error_message
                }
                backup_list.append(backup_info)
            
            return backup_list
            
        except Exception as e:
            logger.error(f"Failed to list customer backups for tenant {tenant_id}: {e}")
            raise
    
    def get_backup_status(self, backup_id: str, tenant_id: str) -> Optional[Dict]:
        """Get status of a specific customer backup"""
        try:
            backup = (
                self.db.query(CustomerBackupLog)
                .filter(
                    and_(
                        CustomerBackupLog.id == backup_id,
                        CustomerBackupLog.tenant_id == tenant_id
                    )
                )
                .first()
            )
            
            if not backup:
                return None
            
            return {
                "backup_id": str(backup.id),
                "backup_name": backup.backup_name,
                "status": backup.status.value,
                "created_at": backup.created_at.isoformat(),
                "completed_at": backup.completed_at.isoformat() if backup.completed_at else None,
                "file_size": backup.file_size,
                "compressed_size": backup.compressed_size,
                "checksum": backup.checksum,
                "download_token": backup.download_token if backup.status == BackupStatus.COMPLETED else None,
                "download_expires_at": backup.download_expires_at.isoformat() if backup.download_expires_at else None,
                "downloaded_at": backup.downloaded_at.isoformat() if backup.downloaded_at else None,
                "is_download_expired": backup.is_download_expired,
                "duration_seconds": backup.duration_seconds,
                "error_message": backup.error_message
            }
            
        except Exception as e:
            logger.error(f"Failed to get backup status for {backup_id}: {e}")
            raise
    
    def cleanup_expired_backups(self):
        """Clean up expired backup files"""
        try:
            # Find expired backups
            expired_backups = (
                self.db.query(CustomerBackupLog)
                .filter(
                    and_(
                        CustomerBackupLog.download_expires_at < datetime.now(timezone.utc),
                        CustomerBackupLog.local_file_path.isnot(None)
                    )
                )
                .all()
            )
            
            cleaned_count = 0
            for backup in expired_backups:
                try:
                    file_path = Path(backup.local_file_path)
                    if file_path.exists():
                        file_path.unlink()
                        logger.info(f"Cleaned up expired backup file: {file_path}")
                    
                    # Clear file path from database
                    backup.local_file_path = None
                    cleaned_count += 1
                    
                except Exception as e:
                    logger.error(f"Failed to clean up backup file {backup.local_file_path}: {e}")
            
            if cleaned_count > 0:
                self.db.commit()
                logger.info(f"Cleaned up {cleaned_count} expired backup files")
            
            return cleaned_count
            
        except Exception as e:
            logger.error(f"Failed to cleanup expired backups: {e}")
            raise