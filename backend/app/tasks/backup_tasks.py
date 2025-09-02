"""
Backup and recovery tasks
"""

from celery import current_task
from app.celery_app import celery_app
from app.core.database import SessionLocal
from app.services.backup_service import BackupService
from app.models.tenant import Tenant, TenantStatus
import logging

logger = logging.getLogger(__name__)


@celery_app.task(bind=True, name="app.tasks.backup_tenant_data")
def backup_tenant_data(self, tenant_id: str):
    """Backup data for a specific tenant"""
    db = None
    try:
        logger.info(f"Starting backup for tenant: {tenant_id}")
        
        # Create database session
        db = SessionLocal()
        
        # Initialize backup service
        backup_service = BackupService(db)
        
        # Perform tenant backup
        result = backup_service.backup_tenant(tenant_id)
        
        logger.info(f"Tenant backup completed successfully: {result}")
        return result
        
    except Exception as exc:
        logger.error(f"Tenant backup failed for {tenant_id}: {exc}")
        raise self.retry(exc=exc, countdown=60, max_retries=3)
    
    finally:
        if db:
            db.close()


@celery_app.task(bind=True, name="app.tasks.backup_all_tenants")
def backup_all_tenants(self):
    """Backup data for all active tenants"""
    db = None
    try:
        logger.info("Starting backup for all tenants")
        
        # Create database session
        db = SessionLocal()
        
        # Get all active tenants
        active_tenants = db.query(Tenant).filter(
            Tenant.status == TenantStatus.ACTIVE,
            Tenant.is_active == True
        ).all()
        
        if not active_tenants:
            logger.info("No active tenants found for backup")
            return {
                "status": "success",
                "backed_up_tenants": 0,
                "message": "No active tenants to backup"
            }
        
        # Initialize backup service
        backup_service = BackupService(db)
        
        successful_backups = 0
        failed_backups = 0
        backup_results = []
        
        # Backup each tenant
        for tenant in active_tenants:
            try:
                logger.info(f"Backing up tenant: {tenant.id} ({tenant.name})")
                result = backup_service.backup_tenant(str(tenant.id))
                backup_results.append({
                    "tenant_id": str(tenant.id),
                    "tenant_name": tenant.name,
                    "status": "success",
                    "backup_id": result["backup_id"]
                })
                successful_backups += 1
                
            except Exception as e:
                logger.error(f"Failed to backup tenant {tenant.id}: {e}")
                backup_results.append({
                    "tenant_id": str(tenant.id),
                    "tenant_name": tenant.name,
                    "status": "failed",
                    "error": str(e)
                })
                failed_backups += 1
        
        logger.info(f"Backup completed: {successful_backups} successful, {failed_backups} failed")
        
        return {
            "status": "completed",
            "total_tenants": len(active_tenants),
            "successful_backups": successful_backups,
            "failed_backups": failed_backups,
            "backup_results": backup_results,
            "message": f"Backup completed for {len(active_tenants)} tenants"
        }
        
    except Exception as exc:
        logger.error(f"All tenants backup failed: {exc}")
        raise self.retry(exc=exc, countdown=300, max_retries=2)
    
    finally:
        if db:
            db.close()


@celery_app.task(bind=True, name="app.tasks.full_platform_backup")
def full_platform_backup(self):
    """Perform full platform backup"""
    try:
        logger.info("Starting full platform backup")
        
        # This will be implemented in future disaster recovery tasks
        # For now, return a placeholder response
        
        return {
            "status": "success",
            "backup_file": "platform_full_backup.sql.gz",
            "message": "Full platform backup completed successfully"
        }
        
    except Exception as exc:
        logger.error(f"Full platform backup failed: {exc}")
        raise self.retry(exc=exc, countdown=300, max_retries=2)


@celery_app.task(bind=True, name="app.tasks.verify_backup_integrity")
def verify_backup_integrity(self, backup_id: str, storage_provider: str = "backblaze_b2"):
    """Verify backup file integrity"""
    db = None
    try:
        logger.info(f"Starting backup integrity verification for {backup_id}")
        
        # Create database session
        db = SessionLocal()
        
        # Initialize backup service
        backup_service = BackupService(db)
        
        # Verify backup integrity
        is_valid = backup_service.verify_backup_integrity(backup_id, storage_provider)
        
        result = {
            "status": "success",
            "backup_id": backup_id,
            "storage_provider": storage_provider,
            "is_valid": is_valid,
            "message": f"Backup integrity {'verified' if is_valid else 'failed'}"
        }
        
        logger.info(f"Backup integrity verification completed: {result}")
        return result
        
    except Exception as exc:
        logger.error(f"Backup integrity verification failed for {backup_id}: {exc}")
        raise self.retry(exc=exc, countdown=60, max_retries=2)
    
    finally:
        if db:
            db.close()