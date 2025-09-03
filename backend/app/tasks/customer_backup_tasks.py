"""
Customer self-backup Celery tasks
"""

from celery import current_task
from app.celery_app import celery_app
from app.core.database import SessionLocal
from app.services.customer_backup_service import CustomerBackupService
import logging

logger = logging.getLogger(__name__)


@celery_app.task(bind=True, max_retries=3)
def create_customer_backup_task(self, tenant_id: str, user_id: str):
    """
    Celery task to create customer self-backup
    
    Args:
        tenant_id: Tenant ID
        user_id: User ID who initiated the backup
    
    Returns:
        dict: Backup result information
    """
    try:
        # Update task state to indicate progress
        try:
            current_task.update_state(
                state='PROGRESS',
                meta={'step': 'initializing', 'message': 'Starting customer backup process'}
            )
        except (ValueError, AttributeError):
            # Skip state update in tests or when task_id is not available
            pass
        
        # Create database session
        db = SessionLocal()
        
        try:
            # Create backup service
            backup_service = CustomerBackupService(db)
            
            # Update progress
            try:
                current_task.update_state(
                    state='PROGRESS',
                    meta={'step': 'creating_export', 'message': 'Creating data export'}
                )
            except (ValueError, AttributeError):
                # Skip state update in tests or when task_id is not available
                pass
            
            # Create customer backup
            result = backup_service.create_customer_backup(tenant_id, user_id)
            
            # Update progress
            try:
                current_task.update_state(
                    state='PROGRESS',
                    meta={'step': 'finalizing', 'message': 'Finalizing backup'}
                )
            except (ValueError, AttributeError):
                # Skip state update in tests or when task_id is not available
                pass
            
            logger.info(f"Customer backup task completed successfully for tenant {tenant_id}")
            
            return result
            
        finally:
            db.close()
            
    except Exception as exc:
        logger.error(f"Customer backup task failed for tenant {tenant_id}: {exc}")
        
        # Update task state to indicate failure
        try:
            current_task.update_state(
                state='FAILURE',
                meta={'error': str(exc), 'tenant_id': tenant_id}
            )
        except (ValueError, AttributeError):
            # Skip state update in tests or when task_id is not available
            pass
        
        # Retry the task if we haven't exceeded max retries
        if self.request.retries < self.max_retries:
            logger.info(f"Retrying customer backup task for tenant {tenant_id} (attempt {self.request.retries + 1})")
            raise self.retry(exc=exc, countdown=60 * (self.request.retries + 1))
        
        # If we've exceeded max retries, raise the exception
        raise exc


@celery_app.task(bind=True)
def cleanup_expired_customer_backups_task(self):
    """
    Celery task to cleanup expired customer backup files
    
    This task should be run periodically (e.g., daily) to clean up
    expired backup files and free up disk space.
    
    Returns:
        dict: Cleanup result information
    """
    try:
        logger.info("Starting cleanup of expired customer backup files")
        
        # Create database session
        db = SessionLocal()
        
        try:
            # Create backup service
            backup_service = CustomerBackupService(db)
            
            # Cleanup expired backups
            cleaned_count = backup_service.cleanup_expired_backups()
            
            result = {
                "status": "success",
                "message": f"Cleaned up {cleaned_count} expired backup files",
                "cleaned_count": cleaned_count
            }
            
            logger.info(f"Cleanup task completed: {result}")
            
            return result
            
        finally:
            db.close()
            
    except Exception as exc:
        logger.error(f"Cleanup task failed: {exc}")
        
        # Update task state to indicate failure
        current_task.update_state(
            state='FAILURE',
            meta={'error': str(exc)}
        )
        
        raise exc


@celery_app.task(bind=True)
def get_customer_backup_stats_task(self):
    """
    Celery task to get customer backup statistics
    
    Returns:
        dict: Backup statistics
    """
    try:
        logger.info("Getting customer backup statistics")
        
        # Create database session
        db = SessionLocal()
        
        try:
            from app.models.backup import CustomerBackupLog, BackupStatus
            from sqlalchemy import func, and_
            from datetime import datetime, timezone, timedelta
            
            # Get statistics
            total_backups = db.query(CustomerBackupLog).count()
            
            completed_backups = db.query(CustomerBackupLog).filter(
                CustomerBackupLog.status == BackupStatus.COMPLETED
            ).count()
            
            failed_backups = db.query(CustomerBackupLog).filter(
                CustomerBackupLog.status == BackupStatus.FAILED
            ).count()
            
            # Get backups from last 30 days
            thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
            recent_backups = db.query(CustomerBackupLog).filter(
                CustomerBackupLog.created_at >= thirty_days_ago
            ).count()
            
            # Get total storage used
            total_storage = db.query(
                func.sum(CustomerBackupLog.compressed_size)
            ).filter(
                and_(
                    CustomerBackupLog.status == BackupStatus.COMPLETED,
                    CustomerBackupLog.local_file_path.isnot(None)
                )
            ).scalar() or 0
            
            # Get expired backups count
            expired_backups = db.query(CustomerBackupLog).filter(
                and_(
                    CustomerBackupLog.download_expires_at < datetime.now(timezone.utc),
                    CustomerBackupLog.local_file_path.isnot(None)
                )
            ).count()
            
            result = {
                "status": "success",
                "statistics": {
                    "total_backups": total_backups,
                    "completed_backups": completed_backups,
                    "failed_backups": failed_backups,
                    "recent_backups_30_days": recent_backups,
                    "total_storage_bytes": int(total_storage),
                    "expired_backups": expired_backups
                }
            }
            
            logger.info(f"Customer backup statistics: {result}")
            
            return result
            
        finally:
            db.close()
            
    except Exception as exc:
        logger.error(f"Get backup stats task failed: {exc}")
        
        # Update task state to indicate failure
        current_task.update_state(
            state='FAILURE',
            meta={'error': str(exc)}
        )
        
        raise exc