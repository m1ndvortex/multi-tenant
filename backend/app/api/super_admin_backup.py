"""
Super Admin Backup Management API endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
import logging
from datetime import datetime, timedelta

from app.core.database import get_db
from app.core.auth import get_super_admin_user
from app.services.backup_service import BackupService
from app.services.cloud_storage_service import CloudStorageService
from app.tasks.backup_tasks import backup_tenant_data, backup_full_platform
from app.schemas.backup import (
    BackupResponse, BackupListResponse, BackupInfoResponse,
    StorageUsageResponse, ConnectivityTestResponse, TaskStatusResponse
)
from app.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/super-admin/backups", tags=["Super Admin - Backup Management"])


@router.get("/tenants", response_model=Dict[str, Any])
async def get_tenant_backups(
    page: int = Query(default=1, ge=1, description="Page number"),
    limit: int = Query(default=10, ge=1, le=100, description="Items per page"),
    tenant_id: Optional[str] = Query(None, description="Filter by tenant ID"),
    status: Optional[str] = Query(None, description="Filter by backup status"),
    provider: Optional[str] = Query(None, description="Filter by storage provider"),
    current_admin: User = Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    """Get list of tenant backups with pagination and filtering"""
    try:
        backup_service = BackupService(db)
        
        # Calculate offset
        offset = (page - 1) * limit
        
        # Get tenant backups with filters
        backups_data = backup_service.get_all_tenant_backups(
            offset=offset,
            limit=limit,
            tenant_id=tenant_id,
            status=status,
            provider=provider
        )
        
        # Get total count for pagination
        total_count = backup_service.get_tenant_backups_count(
            tenant_id=tenant_id,
            status=status,
            provider=provider
        )
        
        return {
            "backups": backups_data,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total_count,
                "totalPages": (total_count + limit - 1) // limit
            }
        }
        
    except Exception as e:
        logger.error(f"Failed to get tenant backups: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve tenant backups")


@router.post("/tenants/create", response_model=BackupResponse)
async def create_tenant_backup(
    tenant_ids: List[str],
    background_tasks: BackgroundTasks,
    storage_provider: str = Query(default="backblaze_b2", pattern="^(backblaze_b2|cloudflare_r2)$"),
    current_admin: User = Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    """Create backup for selected tenants"""
    try:
        # Validate tenants exist
        from app.models.tenant import Tenant
        valid_tenants = []
        
        for tenant_id in tenant_ids:
            tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
            if tenant:
                valid_tenants.append(tenant)
            else:
                logger.warning(f"Tenant {tenant_id} not found, skipping")
        
        if not valid_tenants:
            raise HTTPException(status_code=404, detail="No valid tenants found")
        
        # Start backup tasks for each tenant
        task_ids = []
        for tenant in valid_tenants:
            task = backup_tenant_data.delay(str(tenant.id), storage_provider)
            task_ids.append(task.id)
        
        logger.info(f"Super admin {current_admin.id} started backup for {len(valid_tenants)} tenants")
        
        return BackupResponse(
            status="started",
            message=f"Backup tasks started for {len(valid_tenants)} tenants",
            task_id=",".join(task_ids),  # Multiple task IDs
            tenant_id=",".join([str(t.id) for t in valid_tenants])
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to create tenant backups: {e}")
        raise HTTPException(status_code=500, detail="Failed to start backup tasks")


@router.get("/disaster-recovery", response_model=Dict[str, Any])
async def get_disaster_recovery_backups(
    page: int = Query(default=1, ge=1, description="Page number"),
    limit: int = Query(default=10, ge=1, le=100, description="Items per page"),
    backup_type: Optional[str] = Query(None, description="Filter by backup type"),
    current_admin: User = Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    """Get disaster recovery backups (full platform backups)"""
    try:
        backup_service = BackupService(db)
        
        # Calculate offset
        offset = (page - 1) * limit
        
        # Get disaster recovery backups
        backups_data = backup_service.get_disaster_recovery_backups(
            offset=offset,
            limit=limit,
            backup_type=backup_type
        )
        
        # Get total count
        total_count = backup_service.get_disaster_recovery_backups_count(backup_type)
        
        # Get storage provider statistics
        cloud_storage = CloudStorageService()
        storage_stats = {
            "cloudflare_r2": {"successful_backups": 0, "total_size": 0},
            "backblaze_b2": {"successful_backups": 0, "total_size": 0}
        }
        
        # Calculate stats from backup data
        for backup in backups_data:
            if backup.get("status") == "completed":
                for location in backup.get("storage_locations", []):
                    provider = location.get("provider", "")
                    if provider in storage_stats:
                        storage_stats[provider]["successful_backups"] += 1
                        storage_stats[provider]["total_size"] += backup.get("compressed_size", 0)
        
        return {
            "backups": backups_data,
            "storage_stats": storage_stats,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total_count,
                "totalPages": (total_count + limit - 1) // limit
            }
        }
        
    except Exception as e:
        logger.error(f"Failed to get disaster recovery backups: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve disaster recovery backups")


@router.post("/disaster-recovery/create", response_model=BackupResponse)
async def create_full_platform_backup(
    background_tasks: BackgroundTasks,
    storage_provider: str = Query(default="backblaze_b2", pattern="^(backblaze_b2|cloudflare_r2)$"),
    current_admin: User = Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    """Create full platform backup for disaster recovery"""
    try:
        # Start full platform backup task
        task = backup_full_platform.delay(storage_provider)
        
        logger.info(f"Super admin {current_admin.id} started full platform backup")
        
        return BackupResponse(
            status="started",
            message="Full platform backup task started",
            task_id=task.id
        )
        
    except Exception as e:
        logger.error(f"Failed to create full platform backup: {e}")
        raise HTTPException(status_code=500, detail="Failed to start full platform backup")


@router.get("/storage-usage", response_model=StorageUsageResponse)
async def get_storage_usage(
    current_admin: User = Depends(get_super_admin_user)
):
    """Get storage usage statistics for both cloud providers"""
    try:
        cloud_storage = CloudStorageService()
        usage_stats = cloud_storage.get_storage_usage()
        
        return StorageUsageResponse(
            status="success",
            storage_usage=usage_stats
        )
        
    except Exception as e:
        logger.error(f"Failed to get storage usage: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve storage usage")


@router.get("/restore-operations", response_model=Dict[str, Any])
async def get_restore_operations(
    page: int = Query(default=1, ge=1, description="Page number"),
    limit: int = Query(default=10, ge=1, le=100, description="Items per page"),
    status: Optional[str] = Query(None, description="Filter by operation status"),
    current_admin: User = Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    """Get restore operations history"""
    try:
        # This would typically come from a restore operations service
        # For now, return mock data structure
        operations_data = []
        
        # In a real implementation, you would query restore operations from database
        # restore_service = RestoreService(db)
        # operations_data = restore_service.get_restore_operations(...)
        
        return {
            "operations": operations_data,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": 0,
                "totalPages": 0
            }
        }
        
    except Exception as e:
        logger.error(f"Failed to get restore operations: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve restore operations")


@router.get("/connectivity-test", response_model=ConnectivityTestResponse)
async def test_storage_connectivity(
    current_admin: User = Depends(get_super_admin_user)
):
    """Test connectivity to both cloud storage providers"""
    try:
        cloud_storage = CloudStorageService()
        connectivity_results = cloud_storage.test_connectivity()
        
        return ConnectivityTestResponse(
            status="success",
            connectivity=connectivity_results
        )
        
    except Exception as e:
        logger.error(f"Failed to test storage connectivity: {e}")
        raise HTTPException(status_code=500, detail="Failed to test storage connectivity")


@router.get("/task/{task_id}", response_model=TaskStatusResponse)
async def get_backup_task_status(
    task_id: str,
    current_admin: User = Depends(get_super_admin_user)
):
    """Get status of a backup task"""
    try:
        from app.celery_app import celery_app
        
        # Handle multiple task IDs (comma-separated)
        task_ids = task_id.split(",")
        
        if len(task_ids) == 1:
            # Single task
            task_result = celery_app.AsyncResult(task_ids[0])
            
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
        else:
            # Multiple tasks
            task_results = []
            overall_status = "completed"
            
            for tid in task_ids:
                task_result = celery_app.AsyncResult(tid)
                task_results.append({
                    "task_id": tid,
                    "status": task_result.state.lower(),
                    "result": task_result.result if task_result.state == 'SUCCESS' else None,
                    "error": str(task_result.info) if task_result.state == 'FAILURE' else None
                })
                
                if task_result.state in ['PENDING', 'PROGRESS']:
                    overall_status = "in_progress"
                elif task_result.state == 'FAILURE' and overall_status != "in_progress":
                    overall_status = "failed"
            
            response = {
                "status": overall_status,
                "message": f"Status for {len(task_ids)} tasks",
                "result": {"tasks": task_results}
            }
        
        response["task_id"] = task_id
        return TaskStatusResponse(**response)
        
    except Exception as e:
        logger.error(f"Failed to get task status for {task_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve task status")


@router.delete("/backup/{backup_id}")
async def delete_backup(
    backup_id: str,
    storage_provider: Optional[str] = Query(None, pattern="^(backblaze_b2|cloudflare_r2|both)$"),
    current_admin: User = Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    """Delete a backup from storage and database"""
    try:
        backup_service = BackupService(db)
        
        # Get backup info first
        backup_info = backup_service.get_backup_info(backup_id)
        if not backup_info:
            raise HTTPException(status_code=404, detail="Backup not found")
        
        # Delete from storage
        cloud_storage = CloudStorageService()
        deletion_results = {}
        
        if storage_provider == "both" or storage_provider is None:
            # Delete from both providers
            try:
                cloud_storage.delete_from_b2(backup_info.get("backup_name", backup_id))
                deletion_results["backblaze_b2"] = "success"
            except Exception as e:
                deletion_results["backblaze_b2"] = f"error: {str(e)}"
            
            try:
                cloud_storage.delete_from_r2(backup_info.get("backup_name", backup_id))
                deletion_results["cloudflare_r2"] = "success"
            except Exception as e:
                deletion_results["cloudflare_r2"] = f"error: {str(e)}"
        
        elif storage_provider == "backblaze_b2":
            cloud_storage.delete_from_b2(backup_info.get("backup_name", backup_id))
            deletion_results["backblaze_b2"] = "success"
        
        elif storage_provider == "cloudflare_r2":
            cloud_storage.delete_from_r2(backup_info.get("backup_name", backup_id))
            deletion_results["cloudflare_r2"] = "success"
        
        # Delete from database
        backup_service.delete_backup_record(backup_id)
        
        logger.info(f"Super admin {current_admin.id} deleted backup {backup_id}")
        
        return {
            "status": "success",
            "message": f"Backup {backup_id} deleted successfully",
            "backup_id": backup_id,
            "deletion_results": deletion_results
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete backup {backup_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete backup")


@router.post("/cleanup/old-backups")
async def cleanup_old_backups(
    days_old: int = Query(default=30, ge=1, description="Delete backups older than this many days"),
    dry_run: bool = Query(default=True, description="Perform dry run without actual deletion"),
    current_admin: User = Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    """Cleanup old backups based on retention policy"""
    try:
        backup_service = BackupService(db)
        
        # Get old backups
        cutoff_date = datetime.utcnow() - timedelta(days=days_old)
        old_backups = backup_service.get_backups_older_than(cutoff_date)
        
        if dry_run:
            return {
                "status": "dry_run",
                "message": f"Found {len(old_backups)} backups older than {days_old} days",
                "backups_to_delete": [
                    {
                        "backup_id": backup["backup_id"],
                        "backup_name": backup["backup_name"],
                        "created_at": backup["created_at"],
                        "file_size": backup.get("compressed_size", 0)
                    }
                    for backup in old_backups
                ],
                "total_size_to_free": sum(backup.get("compressed_size", 0) for backup in old_backups)
            }
        
        # Actual cleanup
        deleted_count = 0
        total_size_freed = 0
        errors = []
        
        cloud_storage = CloudStorageService()
        
        for backup in old_backups:
            try:
                # Delete from storage providers
                backup_name = backup.get("backup_name", backup["backup_id"])
                
                try:
                    cloud_storage.delete_from_b2(backup_name)
                except Exception as e:
                    errors.append(f"B2 deletion failed for {backup_name}: {str(e)}")
                
                try:
                    cloud_storage.delete_from_r2(backup_name)
                except Exception as e:
                    errors.append(f"R2 deletion failed for {backup_name}: {str(e)}")
                
                # Delete from database
                backup_service.delete_backup_record(backup["backup_id"])
                
                deleted_count += 1
                total_size_freed += backup.get("compressed_size", 0)
                
            except Exception as e:
                errors.append(f"Failed to delete backup {backup['backup_id']}: {str(e)}")
        
        logger.info(f"Super admin {current_admin.id} cleaned up {deleted_count} old backups")
        
        return {
            "status": "completed",
            "message": f"Cleanup completed: {deleted_count} backups deleted",
            "deleted_count": deleted_count,
            "total_size_freed": total_size_freed,
            "errors": errors
        }
        
    except Exception as e:
        logger.error(f"Failed to cleanup old backups: {e}")
        raise HTTPException(status_code=500, detail="Failed to cleanup old backups")