"""
Disaster Recovery Service for full platform backup and restore
"""

import os
import gzip
import hashlib
import tempfile
import subprocess
import shutil
import json
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
from app.services.cloud_storage_service import CloudStorageService

logger = logging.getLogger(__name__)


class DisasterRecoveryService:
    """Service for handling full platform disaster recovery backups"""
    
    def __init__(self, db: Session):
        self.db = db
        self.cloud_storage = CloudStorageService()
        self.temp_dir = Path(tempfile.gettempdir()) / "hesaabplus_disaster_recovery"
        self.temp_dir.mkdir(exist_ok=True)
    
    def generate_platform_encryption_key(self) -> bytes:
        """Generate platform-level encryption key for disaster recovery"""
        # Use platform secret to derive encryption key
        password = f"{settings.jwt_secret_key}_disaster_recovery".encode()
        salt = b"hesaabplus_disaster_salt"  # In production, use random salt per backup
        
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,
        )
        key = base64.urlsafe_b64encode(kdf.derive(password))
        return key
    
    def encrypt_file(self, file_path: Path) -> Path:
        """Encrypt backup file using AES-256 with platform key"""
        try:
            key = self.generate_platform_encryption_key()
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
    
    def decrypt_file(self, encrypted_path: Path, output_path: Path) -> Path:
        """Decrypt backup file using platform key"""
        try:
            key = self.generate_platform_encryption_key()
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
    
    def create_full_database_dump(self) -> Path:
        """Create full PostgreSQL database dump using pg_dump"""
        try:
            timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
            dump_filename = f"platform_full_backup_{timestamp}.sql"
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
            
            # Create full database dump using pg_dump
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
                "--create",
                "--format=plain",
                f"--file={dump_path}"
            ]
            
            # Set environment variables for pg_dump
            env = os.environ.copy()
            env["PGPASSWORD"] = password
            
            # Execute pg_dump
            logger.info("Starting full platform database dump")
            result = subprocess.run(
                pg_dump_cmd,
                env=env,
                capture_output=True,
                text=True,
                timeout=1800  # 30 minutes timeout for full dump
            )
            
            if result.returncode != 0:
                logger.error(f"pg_dump failed: {result.stderr}")
                raise Exception(f"Full database dump failed: {result.stderr}")
            
            if not dump_path.exists() or dump_path.stat().st_size == 0:
                raise Exception("Database dump file is empty or was not created")
            
            logger.info(f"Full database dump created successfully: {dump_path} ({dump_path.stat().st_size} bytes)")
            return dump_path
            
        except Exception as e:
            logger.error(f"Full database dump creation failed: {e}")
            raise
    
    def create_container_configuration_backup(self) -> Path:
        """Create backup of container configuration files"""
        try:
            timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
            config_filename = f"platform_config_{timestamp}.tar.gz"
            config_path = self.temp_dir / config_filename
            
            # Create temporary directory for configuration files
            config_temp_dir = self.temp_dir / f"config_{timestamp}"
            config_temp_dir.mkdir(exist_ok=True)
            
            # List of configuration files to backup
            config_files = [
                "docker-compose.yml",
                "docker-compose.test.yml", 
                ".env",
                ".env.example",
                "Dockerfile",
                "backend/Dockerfile",
                "super-admin-frontend/Dockerfile",
                "tenant-frontend/Dockerfile",
                "backend/requirements.txt",
                "backend/alembic.ini",
                "backend/alembic/",
                "Makefile",
                "README.md"
            ]
            
            # Copy configuration files to temp directory
            copied_files = []
            for config_file in config_files:
                source_path = Path("/app") / config_file
                if source_path.exists():
                    if source_path.is_file():
                        dest_path = config_temp_dir / config_file
                        dest_path.parent.mkdir(parents=True, exist_ok=True)
                        shutil.copy2(source_path, dest_path)
                        copied_files.append(config_file)
                    elif source_path.is_dir():
                        dest_path = config_temp_dir / config_file
                        shutil.copytree(source_path, dest_path, dirs_exist_ok=True)
                        copied_files.append(config_file)
                else:
                    logger.warning(f"Configuration file not found: {config_file}")
            
            # Create metadata file
            metadata = {
                "backup_type": "container_configuration",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "platform_version": settings.app_version,
                "copied_files": copied_files,
                "git_commit": self._get_git_commit_hash(),
                "environment": os.getenv("ENVIRONMENT", "unknown")
            }
            
            metadata_path = config_temp_dir / "backup_metadata.json"
            with open(metadata_path, 'w') as f:
                json.dump(metadata, f, indent=2)
            
            # Create tar.gz archive
            tar_cmd = [
                "tar",
                "-czf",
                str(config_path),
                "-C",
                str(config_temp_dir),
                "."
            ]
            
            result = subprocess.run(
                tar_cmd,
                capture_output=True,
                text=True,
                timeout=300  # 5 minutes timeout
            )
            
            if result.returncode != 0:
                logger.error(f"tar command failed: {result.stderr}")
                raise Exception(f"Configuration backup failed: {result.stderr}")
            
            # Clean up temporary directory
            shutil.rmtree(config_temp_dir)
            
            if not config_path.exists() or config_path.stat().st_size == 0:
                raise Exception("Configuration backup file is empty or was not created")
            
            logger.info(f"Configuration backup created successfully: {config_path} ({config_path.stat().st_size} bytes)")
            return config_path
            
        except Exception as e:
            logger.error(f"Configuration backup creation failed: {e}")
            raise
    
    def _get_git_commit_hash(self) -> Optional[str]:
        """Get current Git commit hash"""
        try:
            result = subprocess.run(
                ["git", "rev-parse", "HEAD"],
                capture_output=True,
                text=True,
                timeout=10,
                cwd="/app"
            )
            if result.returncode == 0:
                return result.stdout.strip()
        except Exception as e:
            logger.warning(f"Could not get Git commit hash: {e}")
        return None
    
    def create_disaster_recovery_backup(self) -> Dict:
        """Create complete disaster recovery backup"""
        backup_log = None
        temp_files = []
        
        try:
            # Create backup log entry
            timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
            backup_name = f"disaster_recovery_{timestamp}"
            
            backup_log = BackupLog(
                backup_type=BackupType.FULL_PLATFORM,
                backup_name=backup_name,
                status=BackupStatus.PENDING
            )
            self.db.add(backup_log)
            self.db.commit()
            
            # Start backup process
            backup_log.start_backup()
            self.db.commit()
            
            logger.info("Starting disaster recovery backup")
            
            # Step 1: Create full database dump
            db_dump_path = self.create_full_database_dump()
            temp_files.append(db_dump_path)
            
            # Step 2: Create container configuration backup
            config_backup_path = self.create_container_configuration_backup()
            temp_files.append(config_backup_path)
            
            # Step 3: Create combined archive
            combined_filename = f"{backup_name}_combined.tar"
            combined_path = self.temp_dir / combined_filename
            
            # Create tar archive with both database and configuration
            tar_cmd = [
                "tar",
                "-cf",
                str(combined_path),
                "-C",
                str(self.temp_dir),
                db_dump_path.name,
                config_backup_path.name
            ]
            
            result = subprocess.run(
                tar_cmd,
                capture_output=True,
                text=True,
                timeout=300
            )
            
            if result.returncode != 0:
                raise Exception(f"Combined archive creation failed: {result.stderr}")
            
            temp_files.append(combined_path)
            
            # Step 4: Compress the combined archive
            compressed_path = self.compress_file(combined_path)
            temp_files.append(compressed_path)
            
            # Step 5: Encrypt the compressed archive
            encrypted_path = self.encrypt_file(compressed_path)
            temp_files.append(encrypted_path)
            
            # Step 6: Calculate checksum
            checksum = self.calculate_checksum(encrypted_path)
            
            # Step 7: Upload to both cloud storage providers
            final_filename = f"{backup_name}.tar.gz.enc"
            
            # Upload to Backblaze B2 (primary)
            b2_location = None
            try:
                b2_location = self.cloud_storage.upload_to_b2(
                    encrypted_path, 
                    f"disaster_recovery/{final_filename}",
                    metadata={
                        "backup_type": "disaster_recovery",
                        "checksum": checksum,
                        "created_at": datetime.now(timezone.utc).isoformat(),
                        "platform_version": settings.app_version,
                        "database_size": db_dump_path.stat().st_size,
                        "config_size": config_backup_path.stat().st_size
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
                    f"disaster_recovery/{final_filename}",
                    metadata={
                        "backup_type": "disaster_recovery",
                        "checksum": checksum,
                        "created_at": datetime.now(timezone.utc).isoformat(),
                        "platform_version": settings.app_version,
                        "database_size": db_dump_path.stat().st_size,
                        "config_size": config_backup_path.stat().st_size
                    }
                )
                logger.info(f"Uploaded to Cloudflare R2: {r2_location}")
            except Exception as e:
                logger.error(f"Cloudflare R2 upload failed: {e}")
            
            # Verify at least one upload succeeded
            if not b2_location and not r2_location:
                raise Exception("Failed to upload to any cloud storage provider")
            
            # Step 8: Update backup log with success
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
            
            # Calculate total original size
            total_original_size = db_dump_path.stat().st_size + config_backup_path.stat().st_size
            
            backup_log.complete_backup(
                file_size=total_original_size,
                compressed_size=encrypted_path.stat().st_size,
                checksum=checksum,
                storage_locations=storage_locations
            )
            
            # Add metadata
            backup_log.backup_metadata = {
                "database_dump_size": db_dump_path.stat().st_size,
                "config_backup_size": config_backup_path.stat().st_size,
                "combined_size": combined_path.stat().st_size,
                "compressed_size": compressed_path.stat().st_size,
                "encrypted_size": encrypted_path.stat().st_size,
                "platform_version": settings.app_version,
                "git_commit": self._get_git_commit_hash(),
                "backup_components": ["database", "configuration"]
            }
            
            self.db.commit()
            
            logger.info("Disaster recovery backup completed successfully")
            
            return {
                "status": "success",
                "backup_id": str(backup_log.id),
                "backup_name": backup_name,
                "total_original_size": total_original_size,
                "compressed_size": encrypted_path.stat().st_size,
                "compression_ratio": backup_log.compression_ratio,
                "checksum": checksum,
                "storage_locations": storage_locations,
                "duration_seconds": backup_log.duration_seconds,
                "components": {
                    "database_size": db_dump_path.stat().st_size,
                    "config_size": config_backup_path.stat().st_size
                }
            }
            
        except Exception as e:
            logger.error(f"Disaster recovery backup failed: {e}")
            
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
    
    def list_disaster_recovery_backups(self, limit: int = 50) -> List[Dict]:
        """List available disaster recovery backups"""
        try:
            backups = (
                self.db.query(BackupLog)
                .filter(
                    BackupLog.backup_type == BackupType.FULL_PLATFORM,
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
                    "compression_ratio": backup.compression_ratio,
                    "checksum": backup.checksum,
                    "storage_locations": backup.storage_locations,
                    "duration_seconds": backup.duration_seconds,
                    "metadata": backup.backup_metadata
                }
                backup_list.append(backup_info)
            
            return backup_list
            
        except Exception as e:
            logger.error(f"Failed to list disaster recovery backups: {e}")
            raise
    
    def verify_disaster_recovery_backup(self, backup_id: str, storage_provider: str = "backblaze_b2") -> bool:
        """Verify disaster recovery backup integrity"""
        try:
            backup = self.db.query(BackupLog).filter(BackupLog.id == backup_id).first()
            if not backup:
                raise Exception(f"Backup {backup_id} not found")
            
            if backup.backup_type != BackupType.FULL_PLATFORM:
                raise Exception(f"Backup {backup_id} is not a disaster recovery backup")
            
            # Find storage location for specified provider
            storage_location = None
            for location in backup.storage_locations or []:
                if location.get("provider") == storage_provider:
                    storage_location = location["location"]
                    break
            
            if not storage_location:
                raise Exception(f"Backup not found in {storage_provider}")
            
            # Download file to temporary location
            temp_file = self.temp_dir / f"verify_dr_{backup_id}.tmp"
            
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
            logger.info(f"Disaster recovery backup {backup_id} integrity check: {'PASSED' if is_valid else 'FAILED'}")
            
            return is_valid
            
        except Exception as e:
            logger.error(f"Disaster recovery backup integrity verification failed for {backup_id}: {e}")
            raise
    
    def get_disaster_recovery_backup_info(self, backup_id: str) -> Optional[Dict]:
        """Get detailed information about a disaster recovery backup"""
        try:
            backup = self.db.query(BackupLog).filter(
                BackupLog.id == backup_id,
                BackupLog.backup_type == BackupType.FULL_PLATFORM
            ).first()
            
            if not backup:
                return None
            
            return {
                "backup_id": str(backup.id),
                "backup_name": backup.backup_name,
                "backup_type": backup.backup_type.value,
                "status": backup.status.value,
                "created_at": backup.created_at.isoformat(),
                "completed_at": backup.completed_at.isoformat() if backup.completed_at else None,
                "file_size": backup.file_size,
                "compressed_size": backup.compressed_size,
                "compression_ratio": backup.compression_ratio,
                "checksum": backup.checksum,
                "storage_locations": backup.storage_locations,
                "duration_seconds": backup.duration_seconds,
                "metadata": backup.backup_metadata,
                "error_message": backup.error_message
            }
            
        except Exception as e:
            logger.error(f"Failed to get disaster recovery backup info for {backup_id}: {e}")
            raise
    
    def create_rollback_point(self, initiated_by: str) -> Dict:
        """Create a rollback point before disaster recovery restore"""
        rollback_log = None
        temp_files = []
        
        try:
            # Create rollback backup log entry
            timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
            rollback_name = f"rollback_point_{timestamp}"
            
            rollback_log = BackupLog(
                backup_type=BackupType.FULL_PLATFORM,
                backup_name=rollback_name,
                status=BackupStatus.PENDING,
                backup_metadata={
                    "backup_purpose": "rollback_point",
                    "initiated_by": initiated_by,
                    "created_for": "disaster_recovery_restore"
                }
            )
            self.db.add(rollback_log)
            self.db.commit()
            
            # Start rollback point creation
            rollback_log.start_backup()
            self.db.commit()
            
            logger.info("Creating rollback point before disaster recovery restore")
            
            # Create current state backup (same as disaster recovery backup)
            db_dump_path = self.create_full_database_dump()
            temp_files.append(db_dump_path)
            
            config_backup_path = self.create_container_configuration_backup()
            temp_files.append(config_backup_path)
            
            # Create combined archive
            combined_filename = f"{rollback_name}_combined.tar"
            combined_path = self.temp_dir / combined_filename
            
            tar_cmd = [
                "tar", "-cf", str(combined_path),
                "-C", str(self.temp_dir),
                db_dump_path.name, config_backup_path.name
            ]
            
            result = subprocess.run(tar_cmd, capture_output=True, text=True, timeout=300)
            if result.returncode != 0:
                raise Exception(f"Rollback point archive creation failed: {result.stderr}")
            
            temp_files.append(combined_path)
            
            # Compress and encrypt
            compressed_path = self.compress_file(combined_path)
            temp_files.append(compressed_path)
            
            encrypted_path = self.encrypt_file(compressed_path)
            temp_files.append(encrypted_path)
            
            checksum = self.calculate_checksum(encrypted_path)
            
            # Upload to both storage providers with rollback prefix
            final_filename = f"rollback/{rollback_name}.tar.gz.enc"
            
            # Upload to Backblaze B2
            b2_location = None
            try:
                b2_location = self.cloud_storage.upload_to_b2(
                    encrypted_path, final_filename,
                    metadata={
                        "backup_type": "rollback_point",
                        "checksum": checksum,
                        "created_at": datetime.now(timezone.utc).isoformat(),
                        "initiated_by": initiated_by
                    }
                )
                logger.info(f"Rollback point uploaded to B2: {b2_location}")
            except Exception as e:
                logger.error(f"B2 rollback upload failed: {e}")
            
            # Upload to Cloudflare R2
            r2_location = None
            try:
                r2_location = self.cloud_storage.upload_to_r2(
                    encrypted_path, final_filename,
                    metadata={
                        "backup_type": "rollback_point",
                        "checksum": checksum,
                        "created_at": datetime.now(timezone.utc).isoformat(),
                        "initiated_by": initiated_by
                    }
                )
                logger.info(f"Rollback point uploaded to R2: {r2_location}")
            except Exception as e:
                logger.error(f"R2 rollback upload failed: {e}")
            
            if not b2_location and not r2_location:
                raise Exception("Failed to upload rollback point to any storage provider")
            
            # Update rollback log
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
            
            total_original_size = db_dump_path.stat().st_size + config_backup_path.stat().st_size
            
            rollback_log.complete_backup(
                file_size=total_original_size,
                compressed_size=encrypted_path.stat().st_size,
                checksum=checksum,
                storage_locations=storage_locations
            )
            self.db.commit()
            
            logger.info("Rollback point created successfully")
            
            return {
                "status": "success",
                "rollback_id": str(rollback_log.id),
                "rollback_name": rollback_name,
                "file_size": total_original_size,
                "compressed_size": encrypted_path.stat().st_size,
                "checksum": checksum,
                "storage_locations": storage_locations,
                "duration_seconds": rollback_log.duration_seconds
            }
            
        except Exception as e:
            logger.error(f"Rollback point creation failed: {e}")
            if rollback_log:
                rollback_log.fail_backup(str(e))
                self.db.commit()
            raise
        
        finally:
            # Clean up temporary files
            for temp_file in temp_files:
                try:
                    if temp_file.exists():
                        temp_file.unlink()
                except Exception as e:
                    logger.warning(f"Failed to clean up {temp_file}: {e}")
    
    def download_and_prepare_dr_backup(self, backup_id: str, storage_provider: str = "backblaze_b2") -> Path:
        """Download and prepare disaster recovery backup for restore"""
        try:
            backup = self.db.query(BackupLog).filter(
                BackupLog.id == backup_id,
                BackupLog.backup_type == BackupType.FULL_PLATFORM
            ).first()
            
            if not backup:
                raise Exception(f"Disaster recovery backup {backup_id} not found")
            
            if backup.status != BackupStatus.COMPLETED:
                raise Exception(f"Backup {backup_id} is not completed (status: {backup.status.value})")
            
            # Find storage location
            storage_location = None
            for location in backup.storage_locations or []:
                if location.get("provider") == storage_provider:
                    storage_location = location["location"]
                    break
            
            if not storage_location:
                raise Exception(f"Backup not found in {storage_provider}")
            
            # Download encrypted backup file
            timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
            encrypted_file = self.temp_dir / f"dr_restore_{backup_id}_{timestamp}.enc"
            
            if storage_provider == "backblaze_b2":
                self.cloud_storage.download_from_b2(storage_location, encrypted_file)
            elif storage_provider == "cloudflare_r2":
                self.cloud_storage.download_from_r2(storage_location, encrypted_file)
            else:
                raise Exception(f"Unsupported storage provider: {storage_provider}")
            
            # Verify checksum
            actual_checksum = self.calculate_checksum(encrypted_file)
            if actual_checksum != backup.checksum:
                raise Exception(f"Backup integrity check failed. Expected: {backup.checksum}, Got: {actual_checksum}")
            
            # Decrypt the file
            compressed_file = self.temp_dir / f"dr_restore_{backup_id}_{timestamp}.gz"
            self.decrypt_file(encrypted_file, compressed_file)
            
            # Decompress the file
            combined_file = self.temp_dir / f"dr_restore_{backup_id}_{timestamp}.tar"
            with gzip.open(compressed_file, 'rb') as f_in:
                with open(combined_file, 'wb') as f_out:
                    f_out.writelines(f_in)
            
            # Clean up intermediate files
            encrypted_file.unlink()
            compressed_file.unlink()
            
            logger.info(f"Disaster recovery backup {backup_id} prepared for restore: {combined_file}")
            return combined_file
            
        except Exception as e:
            logger.error(f"Failed to prepare DR backup {backup_id} for restore: {e}")
            raise
    
    def restore_disaster_recovery_backup(self, backup_id: str, storage_provider: str = "backblaze_b2", 
                                       initiated_by: str = None, create_rollback: bool = True,
                                       confirmation_phrase: str = None) -> Dict:
        """Restore complete platform from disaster recovery backup"""
        from app.models.backup import RestoreLog
        
        restore_log = None
        temp_files = []
        rollback_info = None
        
        try:
            # Validate confirmation phrase
            if confirmation_phrase != "RESTORE PLATFORM":
                raise Exception("Invalid confirmation phrase. Must be 'RESTORE PLATFORM'")
            
            # Get backup information
            backup = self.db.query(BackupLog).filter(
                BackupLog.id == backup_id,
                BackupLog.backup_type == BackupType.FULL_PLATFORM
            ).first()
            
            if not backup:
                raise Exception(f"Disaster recovery backup {backup_id} not found")
            
            # Create restore log entry
            restore_log = RestoreLog(
                backup_log_id=backup_id,
                status=BackupStatus.PENDING,
                initiated_by=initiated_by,
                restore_point=backup.created_at,
                restore_metadata={
                    "restore_type": "disaster_recovery",
                    "storage_provider": storage_provider,
                    "confirmation_phrase": confirmation_phrase,
                    "rollback_enabled": create_rollback
                }
            )
            self.db.add(restore_log)
            self.db.commit()
            
            # Start restore process
            restore_log.start_restore()
            self.db.commit()
            
            logger.info(f"Starting disaster recovery restore from backup {backup_id}")
            
            # Step 1: Create rollback point if requested
            if create_rollback:
                logger.info("Creating rollback point before disaster recovery restore")
                rollback_info = self.create_rollback_point(initiated_by)
                restore_log.restore_metadata["rollback_point"] = rollback_info
                self.db.commit()
            
            # Step 2: Download and prepare backup
            logger.info("Downloading and preparing disaster recovery backup")
            combined_backup_file = self.download_and_prepare_dr_backup(backup_id, storage_provider)
            temp_files.append(combined_backup_file)
            
            # Step 3: Extract backup components
            extract_dir = self.temp_dir / f"dr_extract_{backup_id}"
            extract_dir.mkdir(exist_ok=True)
            temp_files.append(extract_dir)
            
            # Extract tar archive
            tar_cmd = ["tar", "-xf", str(combined_backup_file), "-C", str(extract_dir)]
            result = subprocess.run(tar_cmd, capture_output=True, text=True, timeout=300)
            
            if result.returncode != 0:
                raise Exception(f"Failed to extract backup archive: {result.stderr}")
            
            # Find extracted files
            sql_files = list(extract_dir.glob("platform_full_backup_*.sql"))
            config_files = list(extract_dir.glob("platform_config_*.tar.gz"))
            
            if not sql_files:
                raise Exception("Database dump file not found in backup")
            if not config_files:
                raise Exception("Configuration backup file not found in backup")
            
            sql_file = sql_files[0]
            config_file = config_files[0]
            
            # Step 4: Restore database
            logger.info("Restoring database from disaster recovery backup")
            self._restore_database_from_dump(sql_file)
            
            # Step 5: Restore configuration files
            logger.info("Restoring configuration files from disaster recovery backup")
            self._restore_configuration_files(config_file)
            
            # Step 6: Complete restore
            restore_log.complete_restore()
            self.db.commit()
            
            logger.info("Disaster recovery restore completed successfully")
            
            return {
                "status": "success",
                "restore_id": str(restore_log.id),
                "backup_id": backup_id,
                "storage_provider": storage_provider,
                "duration_seconds": restore_log.duration_seconds,
                "rollback_info": rollback_info,
                "restored_at": datetime.now(timezone.utc).isoformat(),
                "message": f"Successfully restored platform from backup {backup.backup_name}"
            }
            
        except Exception as e:
            logger.error(f"Disaster recovery restore failed: {e}")
            
            if restore_log:
                restore_log.fail_restore(str(e))
                self.db.commit()
            
            raise
        
        finally:
            # Clean up temporary files
            for temp_file in temp_files:
                try:
                    if temp_file.exists():
                        if temp_file.is_file():
                            temp_file.unlink()
                        elif temp_file.is_dir():
                            shutil.rmtree(temp_file)
                except Exception as e:
                    logger.warning(f"Failed to clean up {temp_file}: {e}")
    
    def _restore_database_from_dump(self, sql_file: Path):
        """Restore database from SQL dump file"""
        try:
            # Parse database URL
            db_url = settings.database_url
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
                    host = "postgres"
                    port = "5432"
                    database = "hesaabplus"
                    username = "hesaab"
                    password = os.getenv("POSTGRES_PASSWORD", "")
            
            # Restore database using psql
            psql_cmd = [
                "psql",
                f"--host={host}",
                f"--port={port}",
                f"--username={username}",
                f"--dbname={database}",
                "--no-password",
                "--quiet",
                f"--file={sql_file}"
            ]
            
            env = os.environ.copy()
            env["PGPASSWORD"] = password
            
            logger.info("Executing database restore")
            result = subprocess.run(
                psql_cmd,
                env=env,
                capture_output=True,
                text=True,
                timeout=1800  # 30 minutes timeout
            )
            
            if result.returncode != 0:
                raise Exception(f"Database restore failed: {result.stderr}")
            
            logger.info("Database restore completed successfully")
            
        except Exception as e:
            logger.error(f"Database restore failed: {e}")
            raise
    
    def _restore_configuration_files(self, config_file: Path):
        """Restore configuration files from backup"""
        try:
            # Extract configuration backup to temporary directory
            config_extract_dir = self.temp_dir / "config_restore"
            config_extract_dir.mkdir(exist_ok=True)
            
            # Extract tar.gz archive
            tar_cmd = ["tar", "-xzf", str(config_file), "-C", str(config_extract_dir)]
            result = subprocess.run(tar_cmd, capture_output=True, text=True, timeout=300)
            
            if result.returncode != 0:
                raise Exception(f"Failed to extract configuration backup: {result.stderr}")
            
            # Copy configuration files to their proper locations
            # Note: In production, you might want to be more selective about which files to restore
            config_files_to_restore = [
                "docker-compose.yml",
                ".env",
                "Dockerfile",
                "backend/requirements.txt",
                "backend/alembic.ini"
            ]
            
            restored_files = []
            for config_file_path in config_files_to_restore:
                source_path = config_extract_dir / config_file_path
                dest_path = Path("/app") / config_file_path
                
                if source_path.exists() and dest_path.parent.exists():
                    try:
                        shutil.copy2(source_path, dest_path)
                        restored_files.append(config_file_path)
                        logger.info(f"Restored configuration file: {config_file_path}")
                    except Exception as e:
                        logger.warning(f"Failed to restore {config_file_path}: {e}")
            
            # Clean up extraction directory
            shutil.rmtree(config_extract_dir)
            
            logger.info(f"Configuration restore completed. Restored {len(restored_files)} files")
            
        except Exception as e:
            logger.error(f"Configuration restore failed: {e}")
            raise
    
    def rollback_to_point(self, rollback_id: str, storage_provider: str = "backblaze_b2", 
                         initiated_by: str = None) -> Dict:
        """Rollback to a previous rollback point"""
        try:
            # Find rollback point backup
            rollback_backup = self.db.query(BackupLog).filter(
                BackupLog.id == rollback_id,
                BackupLog.backup_type == BackupType.FULL_PLATFORM
            ).first()
            
            if not rollback_backup:
                raise Exception(f"Rollback point {rollback_id} not found")
            
            # Check if this is actually a rollback point
            if not rollback_backup.backup_metadata or rollback_backup.backup_metadata.get("backup_purpose") != "rollback_point":
                raise Exception(f"Backup {rollback_id} is not a rollback point")
            
            logger.info(f"Starting rollback to point {rollback_id}")
            
            # Use the same restore process but without creating another rollback point
            result = self.restore_disaster_recovery_backup(
                backup_id=rollback_id,
                storage_provider=storage_provider,
                initiated_by=initiated_by,
                create_rollback=False,  # Don't create rollback point for rollback operation
                confirmation_phrase="RESTORE PLATFORM"
            )
            
            result["operation_type"] = "rollback"
            result["rollback_point_id"] = rollback_id
            
            logger.info(f"Rollback to point {rollback_id} completed successfully")
            return result
            
        except Exception as e:
            logger.error(f"Rollback to point {rollback_id} failed: {e}")
            raise
    
    def list_rollback_points(self, limit: int = 20) -> List[Dict]:
        """List available rollback points"""
        try:
            rollback_backups = (
                self.db.query(BackupLog)
                .filter(
                    BackupLog.backup_type == BackupType.FULL_PLATFORM,
                    BackupLog.status == BackupStatus.COMPLETED,
                    BackupLog.backup_metadata.op('->>')('backup_purpose') == 'rollback_point'
                )
                .order_by(BackupLog.created_at.desc())
                .limit(limit)
                .all()
            )
            
            rollback_list = []
            for backup in rollback_backups:
                rollback_info = {
                    "rollback_id": str(backup.id),
                    "rollback_name": backup.backup_name,
                    "created_at": backup.created_at.isoformat(),
                    "file_size": backup.file_size,
                    "compressed_size": backup.compressed_size,
                    "checksum": backup.checksum,
                    "storage_locations": backup.storage_locations,
                    "initiated_by": backup.backup_metadata.get("initiated_by") if backup.backup_metadata else None,
                    "created_for": backup.backup_metadata.get("created_for") if backup.backup_metadata else None
                }
                rollback_list.append(rollback_info)
            
            return rollback_list
            
        except Exception as e:
            logger.error(f"Failed to list rollback points: {e}")
            raise