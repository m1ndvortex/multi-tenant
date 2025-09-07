"""
Backup management API endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
import logging
from datetime import datetime

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


@router.get("/storage/health")
async def get_storage_health_status(
    current_admin=Depends(get_super_admin_user)
):
    """Get detailed health status for both storage providers"""
    try:
        # Get cloud storage service
        cloud_storage = CloudStorageService()
        
        # Get health status
        health_status = cloud_storage.get_health_status()
        
        return {
            "status": "success",
            "health_status": health_status
        }
        
    except Exception as e:
        logger.error(f"Failed to get storage health status: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve storage health status")


@router.get("/storage/cost-analytics")
async def get_storage_cost_analytics(
    current_admin=Depends(get_super_admin_user)
):
    """Get detailed cost analytics for both storage providers"""
    try:
        # Get cloud storage service
        cloud_storage = CloudStorageService()
        
        # Get cost analytics
        cost_analytics = cloud_storage.get_cost_analytics()
        
        return {
            "status": "success",
            "cost_analytics": cost_analytics
        }
        
    except Exception as e:
        logger.error(f"Failed to get storage cost analytics: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve cost analytics")


@router.get("/storage/redundancy")
async def get_storage_redundancy_status(
    current_admin=Depends(get_super_admin_user)
):
    """Get storage redundancy status across both providers"""
    try:
        # Get cloud storage service
        cloud_storage = CloudStorageService()
        
        # Get redundancy status
        redundancy_status = cloud_storage.get_storage_redundancy_status()
        
        return {
            "status": "success",
            "redundancy_status": redundancy_status
        }
        
    except Exception as e:
        logger.error(f"Failed to get storage redundancy status: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve redundancy status")


@router.post("/storage/failover-strategy")
async def set_failover_strategy(
    strategy: str = Query(..., pattern="^(primary_only|secondary_fallback|dual_upload)$"),
    current_admin=Depends(get_super_admin_user)
):
    """Set the failover strategy for storage operations"""
    try:
        from app.services.cloud_storage_service import StorageFailoverStrategy
        
        # Get cloud storage service
        cloud_storage = CloudStorageService()
        
        # Map string to enum
        strategy_map = {
            "primary_only": StorageFailoverStrategy.PRIMARY_ONLY,
            "secondary_fallback": StorageFailoverStrategy.SECONDARY_FALLBACK,
            "dual_upload": StorageFailoverStrategy.DUAL_UPLOAD
        }
        
        # Set failover strategy
        cloud_storage.set_failover_strategy(strategy_map[strategy])
        
        return {
            "status": "success",
            "message": f"Failover strategy set to {strategy}",
            "strategy": strategy
        }
        
    except Exception as e:
        logger.error(f"Failed to set failover strategy: {e}")
        raise HTTPException(status_code=500, detail="Failed to set failover strategy")


@router.post("/storage/reset-cost-tracking")
async def reset_cost_tracking(
    current_admin=Depends(get_super_admin_user)
):
    """Reset cost tracking counters"""
    try:
        # Get cloud storage service
        cloud_storage = CloudStorageService()
        
        # Reset cost tracking
        cloud_storage.reset_cost_tracking()
        
        return {
            "status": "success",
            "message": "Cost tracking counters have been reset"
        }
        
    except Exception as e:
        logger.error(f"Failed to reset cost tracking: {e}")
        raise HTTPException(status_code=500, detail="Failed to reset cost tracking")


@router.post("/storage/test-failover")
async def test_storage_failover(
    test_file_content: str = "Test failover content",
    current_admin=Depends(get_super_admin_user)
):
    """Test storage failover functionality with a test file"""
    try:
        import tempfile
        from pathlib import Path
        
        # Get cloud storage service
        cloud_storage = CloudStorageService()
        
        # Create a temporary test file
        with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as temp_file:
            temp_file.write(test_file_content)
            temp_path = Path(temp_file.name)
        
        try:
            # Test upload with failover
            object_key = f"failover_test_{int(datetime.now().timestamp())}.txt"
            upload_result = cloud_storage.upload_with_failover(
                temp_path, 
                object_key,
                metadata={"test": "failover", "timestamp": datetime.now().isoformat()}
            )
            
            # Clean up test file
            temp_path.unlink()
            
            # Clean up uploaded test files (optional)
            if upload_result["primary_upload"]:
                try:
                    cloud_storage.delete_from_b2(object_key)
                except:
                    pass  # Ignore cleanup errors
            
            if upload_result["secondary_upload"]:
                try:
                    cloud_storage.delete_from_r2(object_key)
                except:
                    pass  # Ignore cleanup errors
            
            return {
                "status": "success",
                "message": "Failover test completed",
                "test_result": upload_result
            }
            
        except Exception as e:
            # Clean up temp file on error
            if temp_path.exists():
                temp_path.unlink()
            raise e
        
    except Exception as e:
        logger.error(f"Failed to test storage failover: {e}")
        raise HTTPException(status_code=500, detail="Failed to test storage failover")


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