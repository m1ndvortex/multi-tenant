"""
Disaster Recovery Celery tasks
"""

from celery import current_task
from app.celery_app import celery_app
from app.core.database import SessionLocal
from app.services.disaster_recovery_service import DisasterRecoveryService
import logging

logger = logging.getLogger(__name__)


@celery_app.task(bind=True, name="app.tasks.create_disaster_recovery_backup")
def create_disaster_recovery_backup(self):
    """Create full platform disaster recovery backup"""
    db = None
    try:
        logger.info("Starting disaster recovery backup task")
        
        # Create database session
        db = SessionLocal()
        
        # Initialize disaster recovery service
        dr_service = DisasterRecoveryService(db)
        
        # Perform disaster recovery backup
        result = dr_service.create_disaster_recovery_backup()
        
        logger.info(f"Disaster recovery backup completed successfully: {result}")
        return result
        
    except Exception as exc:
        logger.error(f"Disaster recovery backup failed: {exc}")
        raise self.retry(exc=exc, countdown=300, max_retries=2)
    
    finally:
        if db:
            db.close()


@celery_app.task(bind=True, name="app.tasks.verify_disaster_recovery_backup")
def verify_disaster_recovery_backup(self, backup_id: str, storage_provider: str = "backblaze_b2"):
    """Verify disaster recovery backup integrity"""
    db = None
    try:
        logger.info(f"Starting disaster recovery backup verification for {backup_id}")
        
        # Create database session
        db = SessionLocal()
        
        # Initialize disaster recovery service
        dr_service = DisasterRecoveryService(db)
        
        # Verify backup integrity
        is_valid = dr_service.verify_disaster_recovery_backup(backup_id, storage_provider)
        
        result = {
            "status": "success",
            "backup_id": backup_id,
            "storage_provider": storage_provider,
            "is_valid": is_valid,
            "message": f"Disaster recovery backup integrity {'verified' if is_valid else 'failed'}"
        }
        
        logger.info(f"Disaster recovery backup verification completed: {result}")
        return result
        
    except Exception as exc:
        logger.error(f"Disaster recovery backup verification failed for {backup_id}: {exc}")
        raise self.retry(exc=exc, countdown=60, max_retries=2)
    
    finally:
        if db:
            db.close()


@celery_app.task(bind=True, name="app.tasks.automated_disaster_recovery_verification")
def automated_disaster_recovery_verification(self):
    """Automated verification of recent disaster recovery backups"""
    db = None
    try:
        logger.info("Starting automated disaster recovery backup verification")
        
        # Create database session
        db = SessionLocal()
        
        # Initialize disaster recovery service
        dr_service = DisasterRecoveryService(db)
        
        # Get recent disaster recovery backups (last 7 days)
        recent_backups = dr_service.list_disaster_recovery_backups(limit=7)
        
        if not recent_backups:
            logger.info("No recent disaster recovery backups found for verification")
            return {
                "status": "success",
                "verified_backups": 0,
                "message": "No recent backups to verify"
            }
        
        verification_results = []
        successful_verifications = 0
        failed_verifications = 0
        
        # Verify each backup in both storage providers
        for backup in recent_backups:
            backup_id = backup["backup_id"]
            backup_name = backup["backup_name"]
            
            # Verify in Backblaze B2
            try:
                b2_valid = dr_service.verify_disaster_recovery_backup(backup_id, "backblaze_b2")
                verification_results.append({
                    "backup_id": backup_id,
                    "backup_name": backup_name,
                    "storage_provider": "backblaze_b2",
                    "is_valid": b2_valid,
                    "status": "success"
                })
                if b2_valid:
                    successful_verifications += 1
                else:
                    failed_verifications += 1
            except Exception as e:
                logger.error(f"B2 verification failed for backup {backup_id}: {e}")
                verification_results.append({
                    "backup_id": backup_id,
                    "backup_name": backup_name,
                    "storage_provider": "backblaze_b2",
                    "is_valid": False,
                    "status": "error",
                    "error": str(e)
                })
                failed_verifications += 1
            
            # Verify in Cloudflare R2 (if available)
            try:
                r2_valid = dr_service.verify_disaster_recovery_backup(backup_id, "cloudflare_r2")
                verification_results.append({
                    "backup_id": backup_id,
                    "backup_name": backup_name,
                    "storage_provider": "cloudflare_r2",
                    "is_valid": r2_valid,
                    "status": "success"
                })
                if r2_valid:
                    successful_verifications += 1
                else:
                    failed_verifications += 1
            except Exception as e:
                logger.warning(f"R2 verification failed for backup {backup_id}: {e}")
                verification_results.append({
                    "backup_id": backup_id,
                    "backup_name": backup_name,
                    "storage_provider": "cloudflare_r2",
                    "is_valid": False,
                    "status": "error",
                    "error": str(e)
                })
                failed_verifications += 1
        
        logger.info(f"Automated verification completed: {successful_verifications} successful, {failed_verifications} failed")
        
        return {
            "status": "completed",
            "total_backups": len(recent_backups),
            "successful_verifications": successful_verifications,
            "failed_verifications": failed_verifications,
            "verification_results": verification_results,
            "message": f"Verified {len(recent_backups)} disaster recovery backups"
        }
        
    except Exception as exc:
        logger.error(f"Automated disaster recovery verification failed: {exc}")
        raise self.retry(exc=exc, countdown=300, max_retries=2)
    
    finally:
        if db:
            db.close()


@celery_app.task(bind=True, name="app.tasks.disaster_recovery_monitoring")
def disaster_recovery_monitoring(self):
    """Monitor disaster recovery backup status and health"""
    db = None
    try:
        logger.info("Starting disaster recovery monitoring")
        
        # Create database session
        db = SessionLocal()
        
        # Initialize disaster recovery service
        dr_service = DisasterRecoveryService(db)
        
        # Get recent disaster recovery backups
        recent_backups = dr_service.list_disaster_recovery_backups(limit=30)
        
        # Calculate monitoring metrics
        total_backups = len(recent_backups)
        successful_backups = len([b for b in recent_backups if b.get("file_size", 0) > 0])
        
        # Check for recent backup (within last 24 hours)
        from datetime import datetime, timezone, timedelta
        now = datetime.now(timezone.utc)
        recent_threshold = now - timedelta(hours=24)
        
        recent_backup_exists = False
        if recent_backups:
            latest_backup_time = datetime.fromisoformat(recent_backups[0]["created_at"].replace('Z', '+00:00'))
            recent_backup_exists = latest_backup_time > recent_threshold
        
        # Check storage provider connectivity
        storage_connectivity = dr_service.cloud_storage.test_connectivity()
        
        # Calculate total storage usage
        storage_usage = dr_service.cloud_storage.get_storage_usage()
        
        monitoring_result = {
            "status": "success",
            "timestamp": now.isoformat(),
            "backup_metrics": {
                "total_backups": total_backups,
                "successful_backups": successful_backups,
                "recent_backup_exists": recent_backup_exists,
                "latest_backup": recent_backups[0] if recent_backups else None
            },
            "storage_connectivity": storage_connectivity,
            "storage_usage": storage_usage,
            "alerts": []
        }
        
        # Generate alerts
        if not recent_backup_exists:
            monitoring_result["alerts"].append({
                "level": "warning",
                "message": "No disaster recovery backup created in the last 24 hours",
                "recommendation": "Check backup scheduling and system health"
            })
        
        if not storage_connectivity.get("backblaze_b2", {}).get("available", False):
            monitoring_result["alerts"].append({
                "level": "critical",
                "message": "Backblaze B2 storage is not accessible",
                "recommendation": "Check B2 credentials and network connectivity"
            })
        
        if not storage_connectivity.get("cloudflare_r2", {}).get("available", False):
            monitoring_result["alerts"].append({
                "level": "warning",
                "message": "Cloudflare R2 storage is not accessible",
                "recommendation": "Check R2 credentials and configuration"
            })
        
        # Check if backup success rate is low
        if total_backups > 0:
            success_rate = (successful_backups / total_backups) * 100
            if success_rate < 90:
                monitoring_result["alerts"].append({
                    "level": "warning",
                    "message": f"Disaster recovery backup success rate is {success_rate:.1f}%",
                    "recommendation": "Investigate backup failures and system issues"
                })
        
        logger.info(f"Disaster recovery monitoring completed: {len(monitoring_result['alerts'])} alerts")
        return monitoring_result
        
    except Exception as exc:
        logger.error(f"Disaster recovery monitoring failed: {exc}")
        raise self.retry(exc=exc, countdown=300, max_retries=2)
    
    finally:
        if db:
            db.close()