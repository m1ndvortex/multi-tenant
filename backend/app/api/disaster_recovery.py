"""
Disaster Recovery API endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Dict, Optional
import logging

from app.core.database import get_db
from app.core.auth import get_super_admin_user
from app.services.disaster_recovery_service import DisasterRecoveryService
from app.tasks.disaster_recovery_tasks import (
    create_disaster_recovery_backup,
    verify_disaster_recovery_backup,
    automated_disaster_recovery_verification,
    disaster_recovery_monitoring
)
from app.schemas.disaster_recovery import (
    DisasterRecoveryBackupResponse,
    DisasterRecoveryBackupListResponse,
    DisasterRecoveryVerificationResponse,
    DisasterRecoveryMonitoringResponse,
    DisasterRecoveryBackupInfoResponse
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/disaster-recovery", tags=["disaster-recovery"])


@router.post("/backup", response_model=Dict)
async def create_backup(
    background_tasks: BackgroundTasks,
    current_admin=Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    """
    Create a new disaster recovery backup
    """
    try:
        logger.info(f"Disaster recovery backup requested by admin: {current_admin.get('user_id')}")
        
        # Start backup task in background
        task = create_disaster_recovery_backup.delay()
        
        return {
            "status": "accepted",
            "message": "Disaster recovery backup started",
            "task_id": task.id,
            "estimated_duration": "15-30 minutes"
        }
        
    except Exception as e:
        logger.error(f"Failed to start disaster recovery backup: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to start backup: {str(e)}")


@router.get("/backups", response_model=List[DisasterRecoveryBackupResponse])
async def list_backups(
    limit: int = 50,
    current_admin=Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    """
    List disaster recovery backups
    """
    try:
        dr_service = DisasterRecoveryService(db)
        backups = dr_service.list_disaster_recovery_backups(limit=limit)
        
        return backups
        
    except Exception as e:
        logger.error(f"Failed to list disaster recovery backups: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to list backups: {str(e)}")


@router.get("/backups/{backup_id}", response_model=DisasterRecoveryBackupInfoResponse)
async def get_backup_info(
    backup_id: str,
    current_admin=Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get detailed information about a specific disaster recovery backup
    """
    try:
        dr_service = DisasterRecoveryService(db)
        backup_info = dr_service.get_disaster_recovery_backup_info(backup_id)
        
        if not backup_info:
            raise HTTPException(status_code=404, detail="Backup not found")
        
        return backup_info
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get backup info for {backup_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get backup info: {str(e)}")


@router.post("/verify/{backup_id}", response_model=Dict)
async def verify_backup(
    backup_id: str,
    storage_provider: str = "backblaze_b2",
    current_admin=Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    """
    Verify disaster recovery backup integrity
    """
    try:
        if storage_provider not in ["backblaze_b2", "cloudflare_r2"]:
            raise HTTPException(status_code=400, detail="Invalid storage provider")
        
        logger.info(f"Backup verification requested for {backup_id} on {storage_provider}")
        
        # Start verification task in background
        task = verify_disaster_recovery_backup.delay(backup_id, storage_provider)
        
        return {
            "status": "accepted",
            "message": "Backup verification started",
            "task_id": task.id,
            "backup_id": backup_id,
            "storage_provider": storage_provider
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to start backup verification: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to start verification: {str(e)}")


@router.post("/verify-all", response_model=Dict)
async def verify_all_recent_backups(
    current_admin=Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    """
    Verify all recent disaster recovery backups
    """
    try:
        logger.info("Automated verification of all recent backups requested")
        
        # Start automated verification task
        task = automated_disaster_recovery_verification.delay()
        
        return {
            "status": "accepted",
            "message": "Automated backup verification started",
            "task_id": task.id,
            "estimated_duration": "5-10 minutes"
        }
        
    except Exception as e:
        logger.error(f"Failed to start automated verification: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to start verification: {str(e)}")


@router.get("/monitoring", response_model=Dict)
async def get_monitoring_status(
    current_admin=Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get disaster recovery monitoring status
    """
    try:
        # Start monitoring task and wait for result
        task = disaster_recovery_monitoring.delay()
        result = task.get(timeout=30)  # Wait up to 30 seconds
        
        return result
        
    except Exception as e:
        logger.error(f"Failed to get monitoring status: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get monitoring status: {str(e)}")


@router.get("/storage-status", response_model=Dict)
async def get_storage_status(
    current_admin=Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get storage provider status and usage
    """
    try:
        dr_service = DisasterRecoveryService(db)
        
        # Test connectivity
        connectivity = dr_service.cloud_storage.test_connectivity()
        
        # Get usage statistics
        usage = dr_service.cloud_storage.get_storage_usage()
        
        return {
            "status": "success",
            "connectivity": connectivity,
            "usage": usage,
            "providers": {
                "backblaze_b2": {
                    "name": "Backblaze B2",
                    "role": "Primary Storage",
                    "available": connectivity.get("backblaze_b2", {}).get("available", False),
                    "error": connectivity.get("backblaze_b2", {}).get("error")
                },
                "cloudflare_r2": {
                    "name": "Cloudflare R2", 
                    "role": "Secondary Storage",
                    "available": connectivity.get("cloudflare_r2", {}).get("available", False),
                    "error": connectivity.get("cloudflare_r2", {}).get("error")
                }
            }
        }
        
    except Exception as e:
        logger.error(f"Failed to get storage status: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get storage status: {str(e)}")


@router.get("/health", response_model=Dict)
async def health_check(
    current_admin=Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    """
    Disaster recovery system health check
    """
    try:
        dr_service = DisasterRecoveryService(db)
        
        # Get recent backups
        recent_backups = dr_service.list_disaster_recovery_backups(limit=5)
        
        # Check storage connectivity
        connectivity = dr_service.cloud_storage.test_connectivity()
        
        # Calculate health score
        health_score = 100
        issues = []
        
        # Check if we have recent backups
        if not recent_backups:
            health_score -= 30
            issues.append("No disaster recovery backups found")
        
        # Check storage connectivity
        if not connectivity.get("backblaze_b2", {}).get("available", False):
            health_score -= 40
            issues.append("Primary storage (Backblaze B2) not accessible")
        
        if not connectivity.get("cloudflare_r2", {}).get("available", False):
            health_score -= 20
            issues.append("Secondary storage (Cloudflare R2) not accessible")
        
        # Determine overall status
        if health_score >= 90:
            status = "healthy"
        elif health_score >= 70:
            status = "warning"
        else:
            status = "critical"
        
        return {
            "status": status,
            "health_score": health_score,
            "total_backups": len(recent_backups),
            "latest_backup": recent_backups[0] if recent_backups else None,
            "storage_connectivity": connectivity,
            "issues": issues,
            "recommendations": [
                "Schedule regular disaster recovery backups",
                "Verify backup integrity regularly",
                "Monitor storage provider connectivity",
                "Test restore procedures periodically"
            ]
        }
        
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(status_code=500, detail=f"Health check failed: {str(e)}")