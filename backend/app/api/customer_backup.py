"""
Customer self-backup API endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
import logging
from pathlib import Path

from app.core.database import get_db
from app.core.auth import get_current_user
from app.services.customer_backup_service import CustomerBackupService
from app.tasks.customer_backup_tasks import create_customer_backup_task
from app.schemas.customer_backup import (
    CustomerBackupResponse, CustomerBackupListResponse, 
    CustomerBackupStatusResponse, CustomerBackupCreateRequest
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/tenant/backup", tags=["customer-backup"])


@router.post("/create", response_model=CustomerBackupResponse)
async def create_customer_backup(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Create customer self-backup for local download"""
    try:
        # Get customer backup service
        backup_service = CustomerBackupService(db)
        
        # Check daily limit
        if not backup_service.check_daily_limit(current_user.tenant_id):
            raise HTTPException(
                status_code=429, 
                detail="Daily backup limit reached. You can only create one backup per day."
            )
        
        # Start backup task in background
        task = create_customer_backup_task.delay(
            str(current_user.tenant_id), 
            str(current_user.id)
        )
        
        logger.info(f"Customer backup task started for tenant {current_user.tenant_id}: {task.id}")
        
        return CustomerBackupResponse(
            status="started",
            message="Customer backup task started",
            task_id=task.id,
            tenant_id=str(current_user.tenant_id)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to start customer backup for tenant {current_user.tenant_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to start backup task")


@router.get("/status/{backup_id}", response_model=CustomerBackupStatusResponse)
async def get_backup_status(
    backup_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Get status of a specific customer backup"""
    try:
        # Get customer backup service
        backup_service = CustomerBackupService(db)
        
        # Get backup status
        backup_status = backup_service.get_backup_status(backup_id, str(current_user.tenant_id))
        if not backup_status:
            raise HTTPException(status_code=404, detail="Backup not found")
        
        return CustomerBackupStatusResponse(
            status="success",
            backup=backup_status
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get backup status for {backup_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve backup status")


@router.get("/history", response_model=CustomerBackupListResponse)
async def get_backup_history(
    limit: int = Query(default=50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Get customer backup history"""
    try:
        # Get customer backup service
        backup_service = CustomerBackupService(db)
        
        # List customer backups
        backups = backup_service.list_customer_backups(str(current_user.tenant_id), limit)
        
        return CustomerBackupListResponse(
            status="success",
            tenant_id=str(current_user.tenant_id),
            backups=backups,
            total_count=len(backups)
        )
        
    except Exception as e:
        logger.error(f"Failed to get backup history for tenant {current_user.tenant_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve backup history")


@router.get("/download/{download_token}")
async def download_backup(
    download_token: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Download customer backup file"""
    try:
        # Get customer backup service
        backup_service = CustomerBackupService(db)
        
        # Get backup file path
        file_path = backup_service.get_backup_file_path(download_token)
        if not file_path:
            raise HTTPException(
                status_code=404, 
                detail="Backup file not found or download link has expired"
            )
        
        # Mark backup as downloaded
        backup_service.mark_backup_downloaded(download_token)
        
        # Return file response
        return FileResponse(
            path=str(file_path),
            filename=file_path.name,
            media_type='application/gzip',
            headers={
                "Content-Disposition": f"attachment; filename={file_path.name}",
                "Cache-Control": "no-cache, no-store, must-revalidate",
                "Pragma": "no-cache",
                "Expires": "0"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to download backup with token {download_token}: {e}")
        raise HTTPException(status_code=500, detail="Failed to download backup file")


@router.get("/task/{task_id}")
async def get_task_status(
    task_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Get status of a customer backup task"""
    try:
        # First check if we have a backup record with this task_id
        backup_service = CustomerBackupService(db)
        
        # Look for backup with this task_id
        from app.models.backup import CustomerBackupLog
        backup = db.query(CustomerBackupLog).filter(
            CustomerBackupLog.task_id == task_id,
            CustomerBackupLog.tenant_id == str(current_user.tenant_id)
        ).first()
        
        if backup:
            # We have a backup record, return its status
            if backup.status == "completed":
                response = {
                    "status": "completed",
                    "message": "Backup task completed successfully",
                    "result": {
                        "backup_id": str(backup.id),
                        "file_size": backup.file_size,
                        "compressed_size": backup.compressed_size,
                        "checksum": backup.checksum,
                        "download_token": backup.download_token,
                        "duration_seconds": backup.duration_seconds
                    }
                }
            elif backup.status == "failed":
                response = {
                    "status": "failed",
                    "message": "Backup task failed",
                    "error": backup.error_message or "Unknown error"
                }
            elif backup.status == "in_progress":
                response = {
                    "status": "in_progress",
                    "message": "Backup task is currently being processed"
                }
            else:
                response = {
                    "status": backup.status,
                    "message": f"Backup task is in {backup.status} state"
                }
        else:
            # No backup record yet, try Celery backend as fallback
            try:
                from app.celery_app import celery_app
                task_result = celery_app.AsyncResult(task_id)
                
                if task_result.state == 'PENDING':
                    response = {
                        "status": "pending",
                        "message": "Backup task is waiting to be processed"
                    }
                elif task_result.state == 'PROGRESS':
                    response = {
                        "status": "in_progress", 
                        "message": "Backup task is currently being processed",
                        "progress": task_result.info if hasattr(task_result, 'info') else None
                    }
                else:
                    response = {
                        "status": "pending",
                        "message": "Backup task is waiting to be processed"
                    }
            except Exception:
                # Celery backend error, assume pending
                response = {
                    "status": "pending",
                    "message": "Backup task is waiting to be processed"
                }
        
        response["task_id"] = task_id
        return response
        
    except Exception as e:
        logger.error(f"Failed to get task status for {task_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve task status")


@router.post("/cleanup")
async def cleanup_expired_backups(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Cleanup expired backup files (admin only)"""
    try:
        # Check if user has admin role
        if current_user.role != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Get customer backup service
        backup_service = CustomerBackupService(db)
        
        # Cleanup expired backups
        cleaned_count = backup_service.cleanup_expired_backups()
        
        return {
            "status": "success",
            "message": f"Cleaned up {cleaned_count} expired backup files",
            "cleaned_count": cleaned_count
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to cleanup expired backups: {e}")
        raise HTTPException(status_code=500, detail="Failed to cleanup expired backups")