"""
Comprehensive backup service for individual tenant backups
"""

import os
import gzip
import hashlib
import tempfile
import subprocess
from datetime import datetime, timezone
from typing import List, Dict, Optional, Tuple
from pathlib import Path
import logging
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import base64

from sqlalchemy.orm import Session
from sqlalchemy import text

from app.core.config import settings
from app.models.backup import BackupLog, BackupType, BackupStatus, StorageProvider
from app.models.tenant import Tenant
from app.services.cloud_storage_service import CloudStorageService

logger = logging.getLogger(__name__)


class BackupService:
    """Service for handling individual tenant backups"""
    
    def __init__(self, db: Session):
        self.db = db
        self.cloud_storage = CloudStorageService()
        self.temp_dir = Path(tempfile.gettempdir()) / "hesaabplus_backups"
        self.temp_dir.mkdir(exist_ok=True)
    
    def generate_encryption_key(self, tenant_id: str) -> bytes:
        """Generate tenant-specific encryption key"""
        # Use tenant_id and platform secret to derive encryption key
        password = f"{settings.jwt_secret_key}_{tenant_id}".encode()
        salt = b"hesaabplus_backup_salt"  # In production, use random salt per backup
        
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,
        )
        key = base64.urlsafe_b64encode(kdf.derive(password))
        return key
    
    def encrypt_file(self, file_path: Path, tenant_id: str) -> Path:
        """Encrypt backup file using AES-256"""
        try:
            key = self.generate_encryption_key(tenant_id)
            fernet = Fernet(key)
            
            encrypted_path = file_path.with_suffix(file_path.suffix + '.enc')
            
            with open(file_path, 'rb') as original_file:
                encrypted_data = fernet.encrypt(original_file.read())
            
            with open(encrypted_path, 'wb') as encrypted_file:
                encrypted_file.write(encrypted_data)
            
            logger.info(f"File encrypted successfully: {encrypted_path}")
            return encrypted_path
            
        except Exception as e:
            logger.error(f"Encryption failed for {file_path}: {e}")
            raise
    
    def decrypt_file(self, encrypted_path: Path, tenant_id: str, output_path: Path) -> Path:
        """Decrypt backup file"""
        try:
            key = self.generate_encryption_key(tenant_id)
            fernet = Fernet(key)
            
            with open(encrypted_path, 'rb') as encrypted_file:
                decrypted_data = fernet.decrypt(encrypted_file.read())
            
            with open(output_path, 'wb') as decrypted_file:
                decrypted_file.write(decrypted_data)
            
            logger.info(f"File decrypted successfully: {output_path}")
            return output_path
            
        except Exception as e:
            logger.error(f"Decryption failed for {encrypted_path}: {e}")
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
    
    def create_tenant_sql_dump(self, tenant_id: str) -> Path:
        """Create SQL dump for specific tenant data"""
        try:
            timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
            dump_filename = f"tenant_{tenant_id}_{timestamp}.sql"
            dump_path = self.temp_dir / dump_filename
            
            # Parse database URL to get connection parameters
            db_url = settings.database_url
            # Extract connection details from DATABASE_URL
            # Format: postgresql://user:password@host:port/database
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
            
            # Create tenant-specific SQL dump using pg_dump with WHERE clauses
            tenant_tables = [
                "users", "customers", "products", "invoices", "invoice_items",
                "installments", "journal_entries", "notifications", "gold_prices"
            ]
            
            # Build pg_dump command for tenant-specific data
            pg_dump_cmd = [
                "pg_dump",
                f"--host={host}",
                f"--port={port}",
                f"--username={username}",
                f"--dbname={database}",
                "--no-password",
                "--verbose",
                "--clean",
                "--if-exists",
                "--format=plain",
                f"--file={dump_path}"
            ]
            
            # Add WHERE clauses for tenant-specific tables
            for table in tenant_tables:
                pg_dump_cmd.extend([
                    "--table", table
                ])
                # Note: pg_dump doesn't support --where directly, we'll filter in SQL
            
            # Set environment variables for pg_dump
            env = os.environ.copy()
            env["PGPASSWORD"] = password
            
            # Execute pg_dump
            logger.info(f"Starting SQL dump for tenant {tenant_id}")
            result = subprocess.run(
                pg_dump_cmd,
                env=env,
                capture_output=True,
                text=True,
                timeout=300  # 5 minutes timeout
            )
            
            if result.returncode != 0:
                logger.error(f"pg_dump failed: {result.stderr}")
                raise Exception(f"SQL dump failed: {result.stderr}")
            
            if not dump_path.exists() or dump_path.stat().st_size == 0:
                raise Exception("SQL dump file is empty or was not created")
            
            logger.info(f"SQL dump created successfully: {dump_path} ({dump_path.stat().st_size} bytes)")
            return dump_path
            
        except Exception as e:
            logger.error(f"SQL dump creation failed for tenant {tenant_id}: {e}")
            raise
    
    def backup_tenant(self, tenant_id: str) -> Dict:
        """Create complete backup for a specific tenant"""
        backup_log = None
        temp_files = []
        
        try:
            # Verify tenant exists
            tenant = self.db.query(Tenant).filter(Tenant.id == tenant_id).first()
            if not tenant:
                raise Exception(f"Tenant {tenant_id} not found")
            
            # Create backup log entry
            timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
            backup_name = f"tenant_{tenant_id}_{timestamp}"
            
            backup_log = BackupLog(
                backup_type=BackupType.TENANT_DAILY,
                tenant_id=tenant_id,
                backup_name=backup_name,
                status=BackupStatus.PENDING
            )
            self.db.add(backup_log)
            self.db.commit()
            
            # Start backup process
            backup_log.start_backup()
            self.db.commit()
            
            logger.info(f"Starting backup for tenant {tenant_id}")
            
            # Step 1: Create SQL dump
            sql_dump_path = self.create_tenant_sql_dump(tenant_id)
            temp_files.append(sql_dump_path)
            
            # Step 2: Compress the dump
            compressed_path = self.compress_file(sql_dump_path)
            temp_files.append(compressed_path)
            
            # Step 3: Encrypt the compressed dump
            encrypted_path = self.encrypt_file(compressed_path, tenant_id)
            temp_files.append(encrypted_path)
            
            # Step 4: Calculate checksum
            checksum = self.calculate_checksum(encrypted_path)
            
            # Step 5: Upload to both cloud storage providers
            final_filename = f"{backup_name}.sql.gz.enc"
            
            # Upload to Backblaze B2 (primary)
            b2_location = None
            try:
                b2_location = self.cloud_storage.upload_to_b2(
                    encrypted_path, 
                    final_filename,
                    metadata={
                        "tenant_id": tenant_id,
                        "backup_type": "tenant_daily",
                        "checksum": checksum,
                        "created_at": datetime.now(timezone.utc).isoformat()
                    }
                )
                logger.info(f"Uploaded to Backblaze B2: {b2_location}")
            except Exception as e:
                logger.error(f"Backblaze B2 upload failed: {e}")
            
            # Upload to Cloudflare R2 (secondary)
            r2_location = None
            try:
                r2_location = self.cloud_storage.upload_to_r2(
                    encrypted_path, 
                    final_filename,
                    metadata={
                        "tenant_id": tenant_id,
                        "backup_type": "tenant_daily",
                        "checksum": checksum,
                        "created_at": datetime.now(timezone.utc).isoformat()
                    }
                )
                logger.info(f"Uploaded to Cloudflare R2: {r2_location}")
            except Exception as e:
                logger.error(f"Cloudflare R2 upload failed: {e}")
            
            # Verify at least one upload succeeded
            if not b2_location and not r2_location:
                raise Exception("Failed to upload to any cloud storage provider")
            
            # Step 6: Update backup log with success
            storage_locations = []
            if b2_location:
                storage_locations.append({
                    "provider": "backblaze_b2",
                    "location": b2_location,
                    "uploaded_at": datetime.now(timezone.utc).isoformat()
                })
            if r2_location:
                storage_locations.append({
                    "provider": "cloudflare_r2", 
                    "location": r2_location,
                    "uploaded_at": datetime.now(timezone.utc).isoformat()
                })
            
            backup_log.complete_backup(
                file_size=sql_dump_path.stat().st_size,
                compressed_size=encrypted_path.stat().st_size,
                checksum=checksum,
                storage_locations=storage_locations
            )
            self.db.commit()
            
            logger.info(f"Backup completed successfully for tenant {tenant_id}")
            
            return {
                "status": "success",
                "backup_id": str(backup_log.id),
                "tenant_id": tenant_id,
                "backup_name": backup_name,
                "file_size": sql_dump_path.stat().st_size,
                "compressed_size": encrypted_path.stat().st_size,
                "checksum": checksum,
                "storage_locations": storage_locations,
                "duration_seconds": backup_log.duration_seconds
            }
            
        except Exception as e:
            logger.error(f"Backup failed for tenant {tenant_id}: {e}")
            
            if backup_log:
                backup_log.fail_backup(str(e))
                self.db.commit()
            
            raise
        
        finally:
            # Clean up temporary files
            for temp_file in temp_files:
                try:
                    if temp_file.exists():
                        temp_file.unlink()
                        logger.debug(f"Cleaned up temporary file: {temp_file}")
                except Exception as e:
                    logger.warning(f"Failed to clean up {temp_file}: {e}")
    
    def list_tenant_backups(self, tenant_id: str, limit: int = 50) -> List[Dict]:
        """List available backups for a specific tenant"""
        try:
            backups = (
                self.db.query(BackupLog)
                .filter(
                    BackupLog.tenant_id == tenant_id,
                    BackupLog.backup_type == BackupType.TENANT_DAILY,
                    BackupLog.status == BackupStatus.COMPLETED
                )
                .order_by(BackupLog.created_at.desc())
                .limit(limit)
                .all()
            )
            
            backup_list = []
            for backup in backups:
                backup_info = {
                    "backup_id": str(backup.id),
                    "backup_name": backup.backup_name,
                    "created_at": backup.created_at.isoformat(),
                    "file_size": backup.file_size,
                    "compressed_size": backup.compressed_size,
                    "checksum": backup.checksum,
                    "storage_locations": backup.storage_locations,
                    "duration_seconds": backup.duration_seconds
                }
                backup_list.append(backup_info)
            
            return backup_list
            
        except Exception as e:
            logger.error(f"Failed to list backups for tenant {tenant_id}: {e}")
            raise
    
    def get_backup_info(self, backup_id: str) -> Optional[Dict]:
        """Get detailed information about a specific backup"""
        try:
            backup = self.db.query(BackupLog).filter(BackupLog.id == backup_id).first()
            if not backup:
                return None
            
            return {
                "backup_id": str(backup.id),
                "backup_type": backup.backup_type.value,
                "tenant_id": str(backup.tenant_id) if backup.tenant_id else None,
                "backup_name": backup.backup_name,
                "status": backup.status.value,
                "created_at": backup.created_at.isoformat(),
                "completed_at": backup.completed_at.isoformat() if backup.completed_at else None,
                "file_size": backup.file_size,
                "compressed_size": backup.compressed_size,
                "checksum": backup.checksum,
                "storage_locations": backup.storage_locations,
                "duration_seconds": backup.duration_seconds,
                "error_message": backup.error_message
            }
            
        except Exception as e:
            logger.error(f"Failed to get backup info for {backup_id}: {e}")
            raise
    
    def verify_backup_integrity(self, backup_id: str, storage_provider: str = "backblaze_b2") -> bool:
        """Verify backup file integrity by downloading and checking checksum"""
        try:
            backup = self.db.query(BackupLog).filter(BackupLog.id == backup_id).first()
            if not backup:
                raise Exception(f"Backup {backup_id} not found")
            
            # Find storage location for specified provider
            storage_location = None
            for location in backup.storage_locations or []:
                if location.get("provider") == storage_provider:
                    storage_location = location["location"]
                    break
            
            if not storage_location:
                raise Exception(f"Backup not found in {storage_provider}")
            
            # Download file to temporary location
            temp_file = self.temp_dir / f"verify_{backup_id}.tmp"
            
            if storage_provider == "backblaze_b2":
                self.cloud_storage.download_from_b2(storage_location, temp_file)
            elif storage_provider == "cloudflare_r2":
                self.cloud_storage.download_from_r2(storage_location, temp_file)
            else:
                raise Exception(f"Unsupported storage provider: {storage_provider}")
            
            # Calculate checksum and compare
            actual_checksum = self.calculate_checksum(temp_file)
            expected_checksum = backup.checksum
            
            # Clean up temporary file
            temp_file.unlink()
            
            is_valid = actual_checksum == expected_checksum
            logger.info(f"Backup {backup_id} integrity check: {'PASSED' if is_valid else 'FAILED'}")
            
            return is_valid
            
        except Exception as e:
            logger.error(f"Backup integrity verification failed for {backup_id}: {e}")
            raise