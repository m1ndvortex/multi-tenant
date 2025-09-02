"""
Comprehensive restore service for flexible tenant data restoration
"""

import os
import gzip
import tempfile
import subprocess
from datetime import datetime, timezone
from typing import List, Dict, Optional, Union
from pathlib import Path
import logging
from uuid import UUID

from sqlalchemy.orm import Session
from sqlalchemy import text, create_engine
from sqlalchemy.engine import Engine

from app.core.config import settings
from app.models.backup import BackupLog, RestoreLog, BackupType, BackupStatus
from app.models.tenant import Tenant
from app.services.backup_service import BackupService
from app.services.cloud_storage_service import CloudStorageService

logger = logging.getLogger(__name__)


class RestoreService:
    """Service for handling flexible tenant data restoration"""
    
    def __init__(self, db: Session):
        self.db = db
        self.backup_service = BackupService(db)
        self.cloud_storage = CloudStorageService()
        self.temp_dir = Path(tempfile.gettempdir()) / "hesaabplus_restores"
        self.temp_dir.mkdir(exist_ok=True)
    
    def validate_backup_integrity(self, backup_id: str, storage_provider: str = "backblaze_b2") -> Dict:
        """Validate backup file integrity before restore"""
        try:
            backup = self.db.query(BackupLog).filter(BackupLog.id == backup_id).first()
            if not backup:
                raise Exception(f"Backup {backup_id} not found")
            
            if backup.status != BackupStatus.COMPLETED:
                raise Exception(f"Backup {backup_id} is not completed (status: {backup.status.value})")
            
            # Find storage location for specified provider
            storage_location = None
            for location in backup.storage_locations or []:
                if location.get("provider") == storage_provider:
                    storage_location = location["location"]
                    break
            
            if not storage_location:
                raise Exception(f"Backup not found in {storage_provider}")
            
            # Download and verify checksum
            temp_file = self.temp_dir / f"validate_{backup_id}.tmp"
            
            try:
                if storage_provider == "backblaze_b2":
                    self.cloud_storage.download_from_b2(storage_location, temp_file)
                elif storage_provider == "cloudflare_r2":
                    self.cloud_storage.download_from_r2(storage_location, temp_file)
                else:
                    raise Exception(f"Unsupported storage provider: {storage_provider}")
                
                # Calculate and verify checksum
                actual_checksum = self.backup_service.calculate_checksum(temp_file)
                expected_checksum = backup.checksum
                
                is_valid = actual_checksum == expected_checksum
                
                validation_result = {
                    "backup_id": backup_id,
                    "storage_provider": storage_provider,
                    "is_valid": is_valid,
                    "expected_checksum": expected_checksum,
                    "actual_checksum": actual_checksum,
                    "file_size": temp_file.stat().st_size,
                    "backup_date": backup.started_at.isoformat(),
                    "tenant_id": str(backup.tenant_id) if backup.tenant_id else None
                }
                
                logger.info(f"Backup validation for {backup_id}: {'PASSED' if is_valid else 'FAILED'}")
                return validation_result
                
            finally:
                # Clean up temporary file
                if temp_file.exists():
                    temp_file.unlink()
            
        except Exception as e:
            logger.error(f"Backup validation failed for {backup_id}: {e}")
            raise
    
    def create_pre_restore_snapshot(self, tenant_id: str) -> Dict:
        """Create snapshot of current tenant data before restore"""
        try:
            # Get tenant information
            tenant = self.db.query(Tenant).filter(Tenant.id == tenant_id).first()
            if not tenant:
                raise Exception(f"Tenant {tenant_id} not found")
            
            # Count current data
            tenant_tables = [
                "users", "customers", "products", "invoices", "invoice_items",
                "installments", "journal_entries", "notifications", "gold_prices"
            ]
            
            snapshot = {
                "tenant_id": tenant_id,
                "tenant_name": tenant.name,
                "snapshot_date": datetime.now(timezone.utc).isoformat(),
                "table_counts": {}
            }
            
            for table in tenant_tables:
                try:
                    result = self.db.execute(
                        text(f"SELECT COUNT(*) FROM {table} WHERE tenant_id = :tenant_id"),
                        {"tenant_id": tenant_id}
                    )
                    count = result.scalar()
                    snapshot["table_counts"][table] = count
                except Exception as e:
                    logger.warning(f"Failed to count {table} for tenant {tenant_id}: {e}")
                    snapshot["table_counts"][table] = -1
            
            logger.info(f"Pre-restore snapshot created for tenant {tenant_id}")
            return snapshot
            
        except Exception as e:
            logger.error(f"Failed to create pre-restore snapshot for tenant {tenant_id}: {e}")
            raise
    
    def download_and_prepare_backup(self, backup_id: str, storage_provider: str) -> Path:
        """Download and prepare backup file for restore"""
        try:
            backup = self.db.query(BackupLog).filter(BackupLog.id == backup_id).first()
            if not backup:
                raise Exception(f"Backup {backup_id} not found")
            
            # Find storage location
            storage_location = None
            for location in backup.storage_locations or []:
                if location.get("provider") == storage_provider:
                    storage_location = location["location"]
                    break
            
            if not storage_location:
                raise Exception(f"Backup not found in {storage_provider}")
            
            # Download encrypted backup file
            encrypted_file = self.temp_dir / f"restore_{backup_id}.enc"
            
            if storage_provider == "backblaze_b2":
                self.cloud_storage.download_from_b2(storage_location, encrypted_file)
            elif storage_provider == "cloudflare_r2":
                self.cloud_storage.download_from_r2(storage_location, encrypted_file)
            else:
                raise Exception(f"Unsupported storage provider: {storage_provider}")
            
            # Decrypt the file
            compressed_file = self.temp_dir / f"restore_{backup_id}.gz"
            self.backup_service.decrypt_file(encrypted_file, str(backup.tenant_id), compressed_file)
            
            # Decompress the file
            sql_file = self.temp_dir / f"restore_{backup_id}.sql"
            with gzip.open(compressed_file, 'rb') as f_in:
                with open(sql_file, 'wb') as f_out:
                    f_out.writelines(f_in)
            
            # Clean up intermediate files
            encrypted_file.unlink()
            compressed_file.unlink()
            
            logger.info(f"Backup {backup_id} prepared for restore: {sql_file}")
            return sql_file
            
        except Exception as e:
            logger.error(f"Failed to prepare backup {backup_id} for restore: {e}")
            raise
    
    def execute_tenant_restore(self, tenant_id: str, sql_file: Path, initiated_by: str) -> Dict:
        """Execute tenant data restore with transaction safety"""
        restore_log = None
        
        try:
            # Create restore log
            backup = self.db.query(BackupLog).filter(
                BackupLog.tenant_id == tenant_id
            ).order_by(BackupLog.started_at.desc()).first()
            
            if not backup:
                raise Exception(f"No backup found for tenant {tenant_id}")
            
            restore_log = RestoreLog(
                backup_log_id=backup.id,
                tenant_id=tenant_id,
                initiated_by=initiated_by,
                restore_point=backup.started_at,
                pre_restore_snapshot=self.create_pre_restore_snapshot(tenant_id)
            )
            self.db.add(restore_log)
            self.db.commit()
            
            # Start restore
            restore_log.start_restore()
            self.db.commit()
            
            logger.info(f"Starting restore for tenant {tenant_id}")
            
            # Create separate database connection for restore operations
            engine = create_engine(settings.database_url)
            
            with engine.begin() as conn:
                # Delete existing tenant data
                tenant_tables = [
                    "notifications", "journal_entries", "installments", 
                    "invoice_items", "invoices", "products", "customers", 
                    "gold_prices", "users"
                ]
                
                for table in tenant_tables:
                    try:
                        result = conn.execute(
                            text(f"DELETE FROM {table} WHERE tenant_id = :tenant_id"),
                            {"tenant_id": tenant_id}
                        )
                        logger.info(f"Deleted {result.rowcount} rows from {table}")
                    except Exception as e:
                        logger.warning(f"Failed to delete from {table}: {e}")
                
                # Execute SQL restore
                with open(sql_file, 'r', encoding='utf-8') as f:
                    sql_content = f.read()
                
                # Split SQL into individual statements
                statements = [stmt.strip() for stmt in sql_content.split(';') if stmt.strip()]
                
                for statement in statements:
                    if statement and not statement.startswith('--'):
                        try:
                            conn.execute(text(statement))
                        except Exception as e:
                            logger.warning(f"Failed to execute SQL statement: {e}")
                            # Continue with other statements
                
                logger.info(f"SQL restore completed for tenant {tenant_id}")
            
            # Complete restore
            restore_log.complete_restore()
            self.db.commit()
            
            # Create post-restore snapshot
            post_snapshot = self.create_pre_restore_snapshot(tenant_id)
            
            result = {
                "status": "success",
                "restore_id": str(restore_log.id),
                "tenant_id": tenant_id,
                "restore_point": backup.started_at.isoformat(),
                "duration_seconds": restore_log.duration_seconds,
                "pre_restore_snapshot": restore_log.pre_restore_snapshot,
                "post_restore_snapshot": post_snapshot
            }
            
            logger.info(f"Restore completed successfully for tenant {tenant_id}")
            return result
            
        except Exception as e:
            logger.error(f"Restore failed for tenant {tenant_id}: {e}")
            
            if restore_log:
                restore_log.fail_restore(str(e))
                self.db.commit()
            
            raise
        
        finally:
            # Clean up SQL file
            if sql_file.exists():
                sql_file.unlink()
    
    def restore_single_tenant(self, tenant_id: str, backup_id: str, storage_provider: str, 
                            initiated_by: str, skip_validation: bool = False) -> Dict:
        """Restore data for a single tenant"""
        try:
            # Validate tenant exists
            tenant = self.db.query(Tenant).filter(Tenant.id == tenant_id).first()
            if not tenant:
                raise Exception(f"Tenant {tenant_id} not found")
            
            # Validate backup integrity unless skipped
            if not skip_validation:
                validation_result = self.validate_backup_integrity(backup_id, storage_provider)
                if not validation_result["is_valid"]:
                    raise Exception(f"Backup integrity validation failed for {backup_id}")
            
            # Download and prepare backup
            sql_file = self.download_and_prepare_backup(backup_id, storage_provider)
            
            # Execute restore
            result = self.execute_tenant_restore(tenant_id, sql_file, initiated_by)
            
            return result
            
        except Exception as e:
            logger.error(f"Single tenant restore failed for {tenant_id}: {e}")
            raise
    
    def restore_multiple_tenants(self, tenant_backup_pairs: List[Dict], storage_provider: str, 
                                initiated_by: str, skip_validation: bool = False) -> Dict:
        """Restore data for multiple tenants"""
        results = {
            "status": "completed",
            "total_tenants": len(tenant_backup_pairs),
            "successful_restores": 0,
            "failed_restores": 0,
            "restore_results": []
        }
        
        for pair in tenant_backup_pairs:
            tenant_id = pair["tenant_id"]
            backup_id = pair["backup_id"]
            
            try:
                result = self.restore_single_tenant(
                    tenant_id, backup_id, storage_provider, initiated_by, skip_validation
                )
                results["successful_restores"] += 1
                results["restore_results"].append({
                    "tenant_id": tenant_id,
                    "backup_id": backup_id,
                    "status": "success",
                    "result": result
                })
                
            except Exception as e:
                results["failed_restores"] += 1
                results["restore_results"].append({
                    "tenant_id": tenant_id,
                    "backup_id": backup_id,
                    "status": "failed",
                    "error": str(e)
                })
                logger.error(f"Failed to restore tenant {tenant_id}: {e}")
        
        if results["failed_restores"] > 0:
            results["status"] = "partial_failure"
        
        logger.info(f"Multiple tenant restore completed: {results['successful_restores']}/{results['total_tenants']} successful")
        return results
    
    def restore_all_tenants(self, storage_provider: str, initiated_by: str, 
                           backup_date: Optional[str] = None, skip_validation: bool = False) -> Dict:
        """Restore data for all tenants from their latest backups"""
        try:
            # Get all active tenants
            tenants = self.db.query(Tenant).filter(Tenant.is_active == True).all()
            
            if not tenants:
                raise Exception("No active tenants found")
            
            # Find latest backup for each tenant
            tenant_backup_pairs = []
            
            for tenant in tenants:
                query = self.db.query(BackupLog).filter(
                    BackupLog.tenant_id == tenant.id,
                    BackupLog.backup_type == BackupType.TENANT_DAILY,
                    BackupLog.status == BackupStatus.COMPLETED
                )
                
                # Filter by backup date if specified
                if backup_date:
                    target_date = datetime.fromisoformat(backup_date.replace('Z', '+00:00'))
                    query = query.filter(BackupLog.started_at <= target_date)
                
                latest_backup = query.order_by(BackupLog.started_at.desc()).first()
                
                if latest_backup:
                    tenant_backup_pairs.append({
                        "tenant_id": str(tenant.id),
                        "backup_id": str(latest_backup.id)
                    })
                else:
                    logger.warning(f"No backup found for tenant {tenant.id} ({tenant.name})")
            
            if not tenant_backup_pairs:
                raise Exception("No backups found for any tenant")
            
            # Restore all tenants
            result = self.restore_multiple_tenants(
                tenant_backup_pairs, storage_provider, initiated_by, skip_validation
            )
            
            result["backup_date"] = backup_date
            result["total_active_tenants"] = len(tenants)
            
            logger.info(f"All tenants restore completed: {result['successful_restores']}/{len(tenants)} successful")
            return result
            
        except Exception as e:
            logger.error(f"All tenants restore failed: {e}")
            raise
    
    def list_restore_history(self, tenant_id: Optional[str] = None, limit: int = 50) -> List[Dict]:
        """List restore operation history"""
        try:
            query = self.db.query(RestoreLog)
            
            if tenant_id:
                query = query.filter(RestoreLog.tenant_id == tenant_id)
            
            restores = query.order_by(RestoreLog.started_at.desc()).limit(limit).all()
            
            restore_list = []
            for restore in restores:
                restore_info = {
                    "restore_id": str(restore.id),
                    "backup_id": str(restore.backup_log_id),
                    "tenant_id": str(restore.tenant_id) if restore.tenant_id else None,
                    "status": restore.status.value,
                    "initiated_by": str(restore.initiated_by),
                    "started_at": restore.started_at.isoformat(),
                    "completed_at": restore.completed_at.isoformat() if restore.completed_at else None,
                    "duration_seconds": restore.duration_seconds,
                    "restore_point": restore.restore_point.isoformat(),
                    "error_message": restore.error_message,
                    "pre_restore_snapshot": restore.pre_restore_snapshot
                }
                restore_list.append(restore_info)
            
            return restore_list
            
        except Exception as e:
            logger.error(f"Failed to list restore history: {e}")
            raise
    
    def get_restore_info(self, restore_id: str) -> Optional[Dict]:
        """Get detailed information about a specific restore operation"""
        try:
            restore = self.db.query(RestoreLog).filter(RestoreLog.id == restore_id).first()
            if not restore:
                return None
            
            return {
                "restore_id": str(restore.id),
                "backup_id": str(restore.backup_log_id),
                "tenant_id": str(restore.tenant_id) if restore.tenant_id else None,
                "status": restore.status.value,
                "initiated_by": str(restore.initiated_by),
                "started_at": restore.started_at.isoformat(),
                "completed_at": restore.completed_at.isoformat() if restore.completed_at else None,
                "duration_seconds": restore.duration_seconds,
                "restore_point": restore.restore_point.isoformat(),
                "error_message": restore.error_message,
                "pre_restore_snapshot": restore.pre_restore_snapshot
            }
            
        except Exception as e:
            logger.error(f"Failed to get restore info for {restore_id}: {e}")
            raise
    
    def get_available_restore_points(self, tenant_id: str, storage_provider: str = "backblaze_b2") -> List[Dict]:
        """Get available restore points for a tenant"""
        try:
            # Get all completed backups for the tenant
            backups = (
                self.db.query(BackupLog)
                .filter(
                    BackupLog.tenant_id == tenant_id,
                    BackupLog.backup_type == BackupType.TENANT_DAILY,
                    BackupLog.status == BackupStatus.COMPLETED
                )
                .order_by(BackupLog.started_at.desc())
                .all()
            )
            
            restore_points = []
            for backup in backups:
                # Check if backup is available in specified storage provider
                has_storage = False
                for location in backup.storage_locations or []:
                    if location.get("provider") == storage_provider:
                        has_storage = True
                        break
                
                if has_storage:
                    restore_points.append({
                        "backup_id": str(backup.id),
                        "backup_name": backup.backup_name,
                        "backup_date": backup.started_at.isoformat(),
                        "file_size": backup.file_size,
                        "compressed_size": backup.compressed_size,
                        "checksum": backup.checksum,
                        "storage_provider": storage_provider,
                        "duration_seconds": backup.duration_seconds
                    })
            
            return restore_points
            
        except Exception as e:
            logger.error(f"Failed to get restore points for tenant {tenant_id}: {e}")
            raise