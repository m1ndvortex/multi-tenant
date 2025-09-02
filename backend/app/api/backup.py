"""
Backup management API endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
import logging

from app.core.database import get_db
from app.core.auth import get_super_admin_user
from app.services.backup_service import BackupService
from app.services.cloud_storage_service import CloudStorageService
from app.tasks.backup_tasks import backup_tenant_data, verify_backup_integrity
from app.schemas.backup import (
    BackupResponse, BackupListResponse, BackupInfoResponse,
    StorageUsageResponse, ConnectivityTestResponse
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/backup", tags=["backup"])


@router.post("/tenant/{tenant_id}", response_model=BackupResponse)
async def create_tenant_backup(
    tenant_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_admin=Depends(get_super_admin_user)
):
    """Create backup for a specific tenant"""
    try:
        # Validate tenant exists
        from app.models.tenant import Tenant
        tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
        if not tenant:
            raise HTTPException(status_code=404, detail="Tenant not found")
        
        # Start backup task in background
        task = backup_tenant_data.delay(tenant_id)
        
        logger.info(f"Backup task started for tenant {tenant_id}: {task.id}")
        
        return BackupResponse(
            status="started",
            message=f"Backup task started for tenant {tenant.name}",
            task_id=task.id,
            tenant_id=tenant_id
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to start backup for tenant {tenant_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to start backup task")


@router.get("/tenant/{tenant_id}", response_model=BackupListResponse)
async def list_tenant_backups(
    tenant_id: str,
    limit: int = Query(default=50, ge=1, le=100),
    current_admin=Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    """List available backups for a specific tenant"""
    try:
        # Validate tenant exists
        from app.models.tenant import Tenant
        tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
        if not tenant:
            raise HTTPException(status_code=404, detail="Tenant not found")
        
        # Get backup service
        backup_service = BackupService(db)
        
        # List tenant backups
        backups = backup_service.list_tenant_backups(tenant_id, limit)
        
        return BackupListResponse(
            status="success",
            tenant_id=tenant_id,
            tenant_name=tenant.name,
            backups=backups,
            total_count=len(backups)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to list backups for tenant {tenant_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve backup list")


@router.get("/info/{backup_id}", response_model=BackupInfoResponse)
async def get_backup_info(
    backup_id: str,
    current_admin=Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    """Get detailed information about a specific backup"""
    try:
        # Get backup service
        backup_service = BackupService(db)
        
        # Get backup info
        backup_info = backup_service.get_backup_info(backup_id)
        if not backup_info:
            raise HTTPException(status_code=404, detail="Backup not found")
        
        return BackupInfoResponse(
            status="success",
            backup=backup_info
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get backup info for {backup_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve backup information")


@router.post("/verify/{backup_id}")
async def verify_backup(
    backup_id: str,
    background_tasks: BackgroundTasks,
    storage_provider: str = Query(default="backblaze_b2", pattern="^(backblaze_b2|cloudflare_r2)$"),
    db: Session = Depends(get_db),
    current_admin=Depends(get_super_admin_user)
):
    """Verify backup file integrity"""
    try:
        # Validate backup exists
        backup_service = BackupService(db)
        backup_info = backup_service.get_backup_info(backup_id)
        if not backup_info:
            raise HTTPException(status_code=404, detail="Backup not found")
        
        # Start verification task in background
        task = verify_backup_integrity.delay(backup_id, storage_provider)
        
        logger.info(f"Backup verification task started for {backup_id}: {task.id}")
        
        return {
            "status": "started",
            "message": f"Backup verification started for {backup_id}",
            "task_id": task.id,
            "backup_id": backup_id,
            "storage_provider": storage_provider
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to start backup verification for {backup_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to start verification task")


@router.get("/storage/usage", response_model=StorageUsageResponse)
async def get_storage_usage(
    current_admin=Depends(get_super_admin_user)
):
    """Get storage usage statistics for both cloud providers"""
    try:
        # Get cloud storage service
        cloud_storage = CloudStorageService()
        
        # Get usage statistics
        usage_stats = cloud_storage.get_storage_usage()
        
        return StorageUsageResponse(
            status="success",
            storage_usage=usage_stats
        )
        
    except Exception as e:
        logger.error(f"Failed to get storage usage: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve storage usage")


@router.get("/storage/connectivity", response_model=ConnectivityTestResponse)
async def test_storage_connectivity(
    current_admin=Depends(get_super_admin_user)
):
    """Test connectivity to both cloud storage providers"""
    try:
        # Get cloud storage service
        cloud_storage = CloudStorageService()
        
        # Test connectivity
        connectivity_results = cloud_storage.test_connectivity()
        
        return ConnectivityTestResponse(
            status="success",
            connectivity=connectivity_results
        )
        
    except Exception as e:
        logger.error(f"Failed to test storage connectivity: {e}")
        raise HTTPException(status_code=500, detail="Failed to test storage connectivity")


@router.get("/task/{task_id}")
async def get_task_status(
    task_id: str,
    current_admin=Depends(get_super_admin_user)
):
    """Get status of a backup task"""
    try:
        from app.celery_app import celery_app
        
        # Get task result
        task_result = celery_app.AsyncResult(task_id)
        
        if task_result.state == 'PENDING':
            response = {
                "status": "pending",
                "message": "Task is waiting to be processed"
            }
        elif task_result.state == 'PROGRESS':
            response = {
                "status": "in_progress",
                "message": "Task is currently being processed",
                "progress": task_result.info
            }
        elif task_result.state == 'SUCCESS':
            response = {
                "status": "completed",
                "message": "Task completed successfully",
                "result": task_result.result
            }
        elif task_result.state == 'FAILURE':
            response = {
                "status": "failed",
                "message": "Task failed",
                "error": str(task_result.info)
            }
        else:
            response = {
                "status": task_result.state.lower(),
                "message": f"Task is in {task_result.state} state"
            }
        
        response["task_id"] = task_id
        return response
        
    except Exception as e:
        logger.error(f"Failed to get task status for {task_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve task status")