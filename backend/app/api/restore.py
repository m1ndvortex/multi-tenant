"""
Flexible tenant restore API endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
import logging
from uuid import UUID

from app.core.database import get_db
from app.core.auth import get_super_admin_user
from app.services.restore_service import RestoreService
from app.tasks.restore_tasks import (
    restore_single_tenant_task, restore_multiple_tenants_task, 
    restore_all_tenants_task, validate_backup_integrity_task
)
from app.schemas.restore import (
    RestoreResponse, RestoreHistoryResponse, RestoreInfoResponse,
    RestorePointsResponse, ValidationResponse, SingleTenantRestoreRequest,
    MultipleTenantRestoreRequest, AllTenantsRestoreRequest
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/restore", tags=["restore"])


@router.post("/validate/{backup_id}", response_model=ValidationResponse)
async def validate_backup_integrity(
    backup_id: str,
    background_tasks: BackgroundTasks,
    storage_provider: str = Query(default="backblaze_b2", pattern="^(backblaze_b2|cloudflare_r2)$"),
    db: Session = Depends(get_db),
    current_admin=Depends(get_super_admin_user)
):
    """Validate backup file integrity before restore"""
    try:
        # Start validation task in background
        task = validate_backup_integrity_task.delay(backup_id, storage_provider)
        
        logger.info(f"Backup validation task started for {backup_id}: {task.id}")
        
        return ValidationResponse(
            status="started",
            message=f"Backup validation started for {backup_id}",
            task_id=task.id,
            backup_id=backup_id,
            storage_provider=storage_provider
        )
        
    except Exception as e:
        logger.error(f"Failed to start backup validation for {backup_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to start validation task")


@router.post("/tenant/{tenant_id}", response_model=RestoreResponse)
async def restore_single_tenant(
    tenant_id: str,
    request: SingleTenantRestoreRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_admin=Depends(get_super_admin_user)
):
    """Restore data for a single tenant"""
    try:
        # Validate tenant exists
        from app.models.tenant import Tenant
        tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
        if not tenant:
            raise HTTPException(status_code=404, detail="Tenant not found")
        
        # Validate backup exists
        from app.models.backup import BackupLog
        backup = db.query(BackupLog).filter(BackupLog.id == request.backup_id).first()
        if not backup:
            raise HTTPException(status_code=404, detail="Backup not found")
        
        # Start restore task in background
        task = restore_single_tenant_task.delay(
            tenant_id=tenant_id,
            backup_id=request.backup_id,
            storage_provider=request.storage_provider,
            initiated_by=str(current_admin["user_id"]),
            skip_validation=request.skip_validation
        )
        
        logger.info(f"Single tenant restore task started for {tenant_id}: {task.id}")
        
        return RestoreResponse(
            status="started",
            message=f"Restore task started for tenant {tenant.name}",
            task_id=task.id,
            tenant_id=tenant_id,
            backup_id=request.backup_id,
            storage_provider=request.storage_provider
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to start restore for tenant {tenant_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to start restore task")


@router.post("/multiple", response_model=RestoreResponse)
async def restore_multiple_tenants(
    request: MultipleTenantRestoreRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_admin=Depends(get_super_admin_user)
):
    """Restore data for multiple tenants"""
    try:
        # Validate all tenants exist
        from app.models.tenant import Tenant
        tenant_ids = [pair["tenant_id"] for pair in request.tenant_backup_pairs]
        tenants = db.query(Tenant).filter(Tenant.id.in_(tenant_ids)).all()
        
        if len(tenants) != len(tenant_ids):
            found_ids = {str(t.id) for t in tenants}
            missing_ids = set(tenant_ids) - found_ids
            raise HTTPException(
                status_code=404, 
                detail=f"Tenants not found: {', '.join(missing_ids)}"
            )
        
        # Validate all backups exist
        from app.models.backup import BackupLog
        backup_ids = [pair["backup_id"] for pair in request.tenant_backup_pairs]
        backups = db.query(BackupLog).filter(BackupLog.id.in_(backup_ids)).all()
        
        if len(backups) != len(backup_ids):
            found_ids = {str(b.id) for b in backups}
            missing_ids = set(backup_ids) - found_ids
            raise HTTPException(
                status_code=404, 
                detail=f"Backups not found: {', '.join(missing_ids)}"
            )
        
        # Start restore task in background
        task = restore_multiple_tenants_task.delay(
            tenant_backup_pairs=request.tenant_backup_pairs,
            storage_provider=request.storage_provider,
            initiated_by=str(current_admin["user_id"]),
            skip_validation=request.skip_validation
        )
        
        logger.info(f"Multiple tenant restore task started: {task.id}")
        
        return RestoreResponse(
            status="started",
            message=f"Restore task started for {len(request.tenant_backup_pairs)} tenants",
            task_id=task.id,
            storage_provider=request.storage_provider,
            tenant_count=len(request.tenant_backup_pairs)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to start multiple tenant restore: {e}")
        raise HTTPException(status_code=500, detail="Failed to start restore task")


@router.post("/all", response_model=RestoreResponse)
async def restore_all_tenants(
    request: AllTenantsRestoreRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_admin=Depends(get_super_admin_user)
):
    """Restore data for all active tenants"""
    try:
        # Count active tenants
        from app.models.tenant import Tenant
        tenant_count = db.query(Tenant).filter(Tenant.is_active == True).count()
        
        if tenant_count == 0:
            raise HTTPException(status_code=404, detail="No active tenants found")
        
        # Start restore task in background
        task = restore_all_tenants_task.delay(
            storage_provider=request.storage_provider,
            initiated_by=str(current_admin["user_id"]),
            backup_date=request.backup_date,
            skip_validation=request.skip_validation
        )
        
        logger.info(f"All tenants restore task started: {task.id}")
        
        return RestoreResponse(
            status="started",
            message=f"Restore task started for all {tenant_count} active tenants",
            task_id=task.id,
            storage_provider=request.storage_provider,
            tenant_count=tenant_count,
            backup_date=request.backup_date
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to start all tenants restore: {e}")
        raise HTTPException(status_code=500, detail="Failed to start restore task")


@router.get("/history", response_model=RestoreHistoryResponse)
async def get_restore_history(
    tenant_id: Optional[str] = Query(None, description="Filter by tenant ID"),
    limit: int = Query(default=50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_admin=Depends(get_super_admin_user)
):
    """Get restore operation history"""
    try:
        restore_service = RestoreService(db)
        
        # Get restore history
        restores = restore_service.list_restore_history(tenant_id, limit)
        
        return RestoreHistoryResponse(
            status="success",
            restores=restores,
            total_count=len(restores),
            tenant_id=tenant_id
        )
        
    except Exception as e:
        logger.error(f"Failed to get restore history: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve restore history")


@router.get("/info/{restore_id}", response_model=RestoreInfoResponse)
async def get_restore_info(
    restore_id: str,
    db: Session = Depends(get_db),
    current_admin=Depends(get_super_admin_user)
):
    """Get detailed information about a specific restore operation"""
    try:
        restore_service = RestoreService(db)
        
        # Get restore info
        restore_info = restore_service.get_restore_info(restore_id)
        if not restore_info:
            raise HTTPException(status_code=404, detail="Restore operation not found")
        
        return RestoreInfoResponse(
            status="success",
            restore=restore_info
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get restore info for {restore_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve restore information")


@router.get("/points/{tenant_id}", response_model=RestorePointsResponse)
async def get_restore_points(
    tenant_id: str,
    storage_provider: str = Query(default="backblaze_b2", pattern="^(backblaze_b2|cloudflare_r2)$"),
    db: Session = Depends(get_db),
    current_admin=Depends(get_super_admin_user)
):
    """Get available restore points for a tenant"""
    try:
        # Validate tenant exists
        from app.models.tenant import Tenant
        tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
        if not tenant:
            raise HTTPException(status_code=404, detail="Tenant not found")
        
        restore_service = RestoreService(db)
        
        # Get restore points
        restore_points = restore_service.get_available_restore_points(tenant_id, storage_provider)
        
        return RestorePointsResponse(
            status="success",
            tenant_id=tenant_id,
            tenant_name=tenant.name,
            storage_provider=storage_provider,
            restore_points=restore_points,
            total_count=len(restore_points)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get restore points for tenant {tenant_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve restore points")


@router.get("/task/{task_id}")
async def get_restore_task_status(
    task_id: str,
    current_admin=Depends(get_super_admin_user)
):
    """Get status of a restore task"""
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


@router.delete("/cleanup")
async def cleanup_old_restore_files(
    days_old: int = Query(default=7, ge=1, le=30, description="Delete files older than N days"),
    current_admin=Depends(get_super_admin_user)
):
    """Clean up old temporary restore files"""
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
        
        return {
            "status": "success",
            "message": f"Cleaned up {files_deleted} old restore files",
            "files_deleted": files_deleted,
            "days_old": days_old
        }
        
    except Exception as e:
        logger.error(f"Failed to clean up restore files: {e}")
        raise HTTPException(status_code=500, detail="Failed to clean up restore files")