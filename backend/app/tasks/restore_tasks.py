"""
Celery tasks for restore operations
"""

from celery import current_task
from app.celery_app import celery_app
from app.core.database import SessionLocal
from app.services.restore_service import RestoreService
from typing import List, Dict, Optional
import logging

logger = logging.getLogger(__name__)


@celery_app.task(bind=True, max_retries=3)
def validate_backup_integrity_task(self, backup_id: str, storage_provider: str = "backblaze_b2"):
    """Celery task to validate backup file integrity"""
    try:
        db = SessionLocal()
        restore_service = RestoreService(db)
        
        # Update task progress
        current_task.update_state(
            state='PROGRESS',
            meta={'status': 'validating', 'backup_id': backup_id, 'storage_provider': storage_provider}
        )
        
        # Validate backup integrity
        result = restore_service.validate_backup_integrity(backup_id, storage_provider)
        
        db.close()
        
        logger.info(f"Backup validation completed for {backup_id}: {'PASSED' if result['is_valid'] else 'FAILED'}")
        return result
        
    except Exception as exc:
        logger.error(f"Backup validation failed for {backup_id}: {exc}")
        db.close()
        raise self.retry(exc=exc, countdown=60)


@celery_app.task(bind=True, max_retries=2)
def restore_single_tenant_task(self, tenant_id: str, backup_id: str, storage_provider: str, 
                              initiated_by: str, skip_validation: bool = False):
    """Celery task to restore data for a single tenant"""
    try:
        db = SessionLocal()
        restore_service = RestoreService(db)
        
        # Update task progress
        current_task.update_state(
            state='PROGRESS',
            meta={
                'status': 'starting',
                'tenant_id': tenant_id,
                'backup_id': backup_id,
                'storage_provider': storage_provider
            }
        )
        
        # Perform restore
        result = restore_service.restore_single_tenant(
            tenant_id=tenant_id,
            backup_id=backup_id,
            storage_provider=storage_provider,
            initiated_by=initiated_by,
            skip_validation=skip_validation
        )
        
        db.close()
        
        logger.info(f"Single tenant restore completed for {tenant_id}")
        return result
        
    except Exception as exc:
        logger.error(f"Single tenant restore failed for {tenant_id}: {exc}")
        db.close()
        raise self.retry(exc=exc, countdown=120)


@celery_app.task(bind=True, max_retries=2)
def restore_multiple_tenants_task(self, tenant_backup_pairs: List[Dict], storage_provider: str, 
                                 initiated_by: str, skip_validation: bool = False):
    """Celery task to restore data for multiple tenants"""
    try:
        db = SessionLocal()
        restore_service = RestoreService(db)
        
        # Update task progress
        current_task.update_state(
            state='PROGRESS',
            meta={
                'status': 'starting',
                'total_tenants': len(tenant_backup_pairs),
                'storage_provider': storage_provider
            }
        )
        
        # Perform restore
        result = restore_service.restore_multiple_tenants(
            tenant_backup_pairs=tenant_backup_pairs,
            storage_provider=storage_provider,
            initiated_by=initiated_by,
            skip_validation=skip_validation
        )
        
        db.close()
        
        logger.info(f"Multiple tenant restore completed: {result['successful_restores']}/{result['total_tenants']} successful")
        return result
        
    except Exception as exc:
        logger.error(f"Multiple tenant restore failed: {exc}")
        db.close()
        raise self.retry(exc=exc, countdown=180)


@celery_app.task(bind=True, max_retries=2)
def restore_all_tenants_task(self, storage_provider: str, initiated_by: str, 
                            backup_date: Optional[str] = None, skip_validation: bool = False):
    """Celery task to restore data for all active tenants"""
    try:
        db = SessionLocal()
        restore_service = RestoreService(db)
        
        # Update task progress
        current_task.update_state(
            state='PROGRESS',
            meta={
                'status': 'starting',
                'storage_provider': storage_provider,
                'backup_date': backup_date
            }
        )
        
        # Perform restore
        result = restore_service.restore_all_tenants(
            storage_provider=storage_provider,
            initiated_by=initiated_by,
            backup_date=backup_date,
            skip_validation=skip_validation
        )
        
        db.close()
        
        logger.info(f"All tenants restore completed: {result['successful_restores']}/{result['total_active_tenants']} successful")
        return result
        
    except Exception as exc:
        logger.error(f"All tenants restore failed: {exc}")
        db.close()
        raise self.retry(exc=exc, countdown=300)


@celery_app.task(bind=True, max_retries=3)
def cleanup_restore_files_task(self, days_old: int = 7):
    """Celery task to clean up old temporary restore files"""
    try:
        from pathlib import Path
        import tempfile
        from datetime import datetime, timedelta
        
        temp_dir = Path(tempfile.gettempdir()) / "hesaabplus_restores"
        if not temp_dir.exists():
            return {"status": "success", "message": "No temporary files to clean up", "files_deleted": 0}
        
        cutoff_date = datetime.now() - timedelta(days=days_old)
        files_deleted = 0
        
        for file_path in temp_dir.iterdir():
            if file_path.is_file():
                file_mtime = datetime.fromtimestamp(file_path.stat().st_mtime)
                if file_mtime < cutoff_date:
                    try:
                        file_path.unlink()
                        files_deleted += 1
                        logger.info(f"Deleted old restore file: {file_path}")
                    except Exception as e:
                        logger.warning(f"Failed to delete {file_path}: {e}")
        
        result = {
            "status": "success",
            "message": f"Cleaned up {files_deleted} old restore files",
            "files_deleted": files_deleted,
            "days_old": days_old
        }
        
        logger.info(f"Restore file cleanup completed: {files_deleted} files deleted")
        return result
        
    except Exception as exc:
        logger.error(f"Restore file cleanup failed: {exc}")
        raise self.retry(exc=exc, countdown=60)


# Periodic task to clean up old restore files (runs daily)
@celery_app.task
def periodic_restore_cleanup():
    """Periodic task to clean up old restore files"""
    cleanup_restore_files_task.delay(days_old=7)