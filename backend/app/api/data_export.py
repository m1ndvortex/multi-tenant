"""
Data export API endpoints for CSV/JSON exports
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Response
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
import logging
from pathlib import Path

from app.core.database import get_db
from app.core.auth import get_current_user, get_super_admin_user
from app.models.user import User
from app.services.data_export_service import DataExportService
from app.schemas.data_export import (
    DataExportRequest, DataExportResponse, BulkDataExportRequest, 
    BulkDataExportResponse, ExportStatusResponse, ExportListResponse,
    TaskProgressResponse, ExportScheduleRequest, ExportScheduleResponse,
    ExportScheduleListResponse, ExportDownloadResponse, ExportStatsResponse,
    CleanupResponse
)
from app.tasks.data_export_tasks import (
    create_data_export, create_bulk_data_export, scheduled_data_export,
    cleanup_expired_exports, automated_periodic_export, get_export_progress
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/data-export", tags=["Data Export"])


@router.post("/create", response_model=DataExportResponse)
async def create_tenant_data_export(
    request: DataExportRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create data export for current tenant"""
    try:
        logger.info(f"Creating data export for tenant {current_user.tenant_id}")
        
        # Start export task in background
        task = create_data_export.delay(
            tenant_id=str(current_user.tenant_id),
            user_id=str(current_user.id),
            export_format=request.export_format.value,
            export_type=request.export_type.value,
            tables=request.tables
        )
        
        # Return task information immediately
        return {
            "status": "started",
            "export_id": task.id,
            "tenant_id": str(current_user.tenant_id),
            "export_name": f"data_export_{current_user.tenant_id}_{task.id}",
            "export_format": request.export_format.value,
            "export_type": request.export_type.value,
            "exported_files": [],
            "total_records": 0,
            "file_size": 0,
            "compressed_size": 0,
            "checksum": "",
            "download_token": task.id,  # Use task ID as temporary token
            "download_expires_at": "2024-01-01T00:00:00Z",  # Will be updated when complete
            "duration_seconds": None
        }
        
    except Exception as e:
        logger.error(f"Failed to create data export: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create data export: {str(e)}")


@router.post("/bulk", response_model=BulkDataExportResponse)
async def create_bulk_tenant_data_export(
    request: BulkDataExportRequest,
    background_tasks: BackgroundTasks,
    admin_user: dict = Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    """Create bulk data export for multiple tenants (Super Admin only)"""
    try:
        logger.info(f"Creating bulk data export for {len(request.tenant_ids)} tenants")
        
        # Start bulk export task in background
        task = create_bulk_data_export.delay(
            tenant_ids=request.tenant_ids,
            user_id=admin_user["user_id"],
            export_format=request.export_format.value,
            export_type=request.export_type.value,
            tables=request.tables
        )
        
        # Return task information immediately
        return {
            "status": "started",
            "total_tenants": len(request.tenant_ids),
            "successful_exports": 0,
            "failed_exports": 0,
            "export_results": [],
            "message": f"Bulk export started for {len(request.tenant_ids)} tenants. Task ID: {task.id}"
        }
        
    except Exception as e:
        logger.error(f"Failed to create bulk data export: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create bulk data export: {str(e)}")


@router.get("/status/{export_id}", response_model=ExportStatusResponse)
async def get_export_status(
    export_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get status of a specific data export"""
    try:
        export_service = DataExportService(db)
        
        # First check if it's a task ID (for in-progress exports)
        try:
            task_progress = get_export_progress.delay(export_id).get()
            if task_progress and task_progress.get('state') in ['PENDING', 'PROGRESS']:
                return {
                    "export_id": export_id,
                    "export_name": f"data_export_{current_user.tenant_id}_{export_id}",
                    "export_format": "unknown",
                    "export_type": "manual",
                    "status": task_progress['state'].lower(),
                    "created_at": "2024-01-01T00:00:00Z",
                    "completed_at": None,
                    "exported_tables": None,
                    "total_records": 0,
                    "file_size": None,
                    "compressed_size": None,
                    "checksum": None,
                    "download_token": None,
                    "download_expires_at": None,
                    "downloaded_at": None,
                    "is_download_expired": True,
                    "duration_seconds": None,
                    "error_message": task_progress.get('error')
                }
        except:
            pass  # Not a task ID, continue with database lookup
        
        # Check database for completed export
        export_status = export_service.get_export_status(export_id, str(current_user.tenant_id))
        
        if not export_status:
            raise HTTPException(status_code=404, detail="Export not found")
        
        return export_status
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get export status: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get export status: {str(e)}")


@router.get("/list", response_model=ExportListResponse)
async def list_tenant_exports(
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List data exports for current tenant"""
    try:
        export_service = DataExportService(db)
        exports = export_service.list_tenant_exports(str(current_user.tenant_id), limit)
        
        return {
            "exports": exports,
            "total": len(exports)
        }
        
    except Exception as e:
        logger.error(f"Failed to list exports: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to list exports: {str(e)}")


@router.get("/download/{download_token}")
async def download_export_file(
    download_token: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Download export file using download token"""
    try:
        export_service = DataExportService(db)
        
        # Get file path by token
        file_path = export_service.get_export_file_path(download_token)
        
        if not file_path:
            raise HTTPException(status_code=404, detail="Export file not found or expired")
        
        # Mark as downloaded
        export_service.mark_export_downloaded(download_token)
        
        # Return file
        return FileResponse(
            path=str(file_path),
            filename=file_path.name,
            media_type='application/octet-stream'
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to download export file: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to download export file: {str(e)}")


@router.get("/progress/{task_id}", response_model=TaskProgressResponse)
async def get_task_progress(
    task_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get progress of export task"""
    try:
        task_progress = get_export_progress.delay(task_id).get()
        return task_progress
        
    except Exception as e:
        logger.error(f"Failed to get task progress: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get task progress: {str(e)}")


@router.post("/schedule", response_model=ExportScheduleResponse)
async def create_export_schedule(
    request: ExportScheduleRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create scheduled export for current tenant"""
    try:
        from app.models.backup import ExportSchedule, ExportFormat
        from datetime import datetime, timezone
        
        # Create export schedule
        schedule = ExportSchedule(
            tenant_id=current_user.tenant_id,
            name=request.name,
            description=request.description,
            export_format=ExportFormat(request.export_format.value),
            tables_to_export=request.tables_to_export,
            cron_expression=request.cron_expression,
            timezone=request.timezone,
            is_active=request.is_active
        )
        
        db.add(schedule)
        db.commit()
        db.refresh(schedule)
        
        logger.info(f"Created export schedule {schedule.id} for tenant {current_user.tenant_id}")
        
        return {
            "id": str(schedule.id),
            "tenant_id": str(schedule.tenant_id),
            "name": schedule.name,
            "description": schedule.description,
            "export_format": schedule.export_format.value,
            "tables_to_export": schedule.tables_to_export,
            "cron_expression": schedule.cron_expression,
            "timezone": schedule.timezone,
            "is_active": schedule.is_active,
            "last_run_at": schedule.last_run_at,
            "next_run_at": schedule.next_run_at,
            "last_export_id": str(schedule.last_export_id) if schedule.last_export_id else None,
            "total_runs": schedule.total_runs,
            "successful_runs": schedule.successful_runs,
            "failed_runs": schedule.failed_runs,
            "success_rate": schedule.success_rate,
            "created_at": schedule.created_at,
            "updated_at": schedule.updated_at
        }
        
    except Exception as e:
        logger.error(f"Failed to create export schedule: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create export schedule: {str(e)}")


@router.get("/schedules", response_model=ExportScheduleListResponse)
async def list_export_schedules(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List export schedules for current tenant"""
    try:
        from app.models.backup import ExportSchedule
        
        schedules = (
            db.query(ExportSchedule)
            .filter(ExportSchedule.tenant_id == current_user.tenant_id)
            .order_by(ExportSchedule.created_at.desc())
            .all()
        )
        
        schedule_list = []
        for schedule in schedules:
            schedule_data = {
                "id": str(schedule.id),
                "tenant_id": str(schedule.tenant_id),
                "name": schedule.name,
                "description": schedule.description,
                "export_format": schedule.export_format.value,
                "tables_to_export": schedule.tables_to_export,
                "cron_expression": schedule.cron_expression,
                "timezone": schedule.timezone,
                "is_active": schedule.is_active,
                "last_run_at": schedule.last_run_at,
                "next_run_at": schedule.next_run_at,
                "last_export_id": str(schedule.last_export_id) if schedule.last_export_id else None,
                "total_runs": schedule.total_runs,
                "successful_runs": schedule.successful_runs,
                "failed_runs": schedule.failed_runs,
                "success_rate": schedule.success_rate,
                "created_at": schedule.created_at,
                "updated_at": schedule.updated_at
            }
            schedule_list.append(schedule_data)
        
        return {
            "schedules": schedule_list,
            "total": len(schedule_list)
        }
        
    except Exception as e:
        logger.error(f"Failed to list export schedules: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to list export schedules: {str(e)}")


@router.post("/schedule/{schedule_id}/run")
async def run_scheduled_export(
    schedule_id: str,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Manually run a scheduled export"""
    try:
        from app.models.backup import ExportSchedule
        
        # Verify schedule exists and belongs to tenant
        schedule = (
            db.query(ExportSchedule)
            .filter(
                ExportSchedule.id == schedule_id,
                ExportSchedule.tenant_id == current_user.tenant_id
            )
            .first()
        )
        
        if not schedule:
            raise HTTPException(status_code=404, detail="Export schedule not found")
        
        # Start scheduled export task
        task = scheduled_data_export.delay(schedule_id)
        
        logger.info(f"Manually triggered scheduled export {schedule_id}")
        
        return {
            "message": "Scheduled export started",
            "task_id": task.id,
            "schedule_id": schedule_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to run scheduled export: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to run scheduled export: {str(e)}")


@router.delete("/schedule/{schedule_id}")
async def delete_export_schedule(
    schedule_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete export schedule"""
    try:
        from app.models.backup import ExportSchedule
        
        # Find and delete schedule
        schedule = (
            db.query(ExportSchedule)
            .filter(
                ExportSchedule.id == schedule_id,
                ExportSchedule.tenant_id == current_user.tenant_id
            )
            .first()
        )
        
        if not schedule:
            raise HTTPException(status_code=404, detail="Export schedule not found")
        
        db.delete(schedule)
        db.commit()
        
        logger.info(f"Deleted export schedule {schedule_id}")
        
        return {"message": "Export schedule deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete export schedule: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete export schedule: {str(e)}")


@router.post("/cleanup", response_model=CleanupResponse)
async def cleanup_expired_export_files(
    background_tasks: BackgroundTasks,
    admin_user: dict = Depends(get_super_admin_user)
):
    """Clean up expired export files (Super Admin only)"""
    try:
        # Start cleanup task in background
        task = cleanup_expired_exports.delay()
        result = task.get()  # Wait for completion since it's usually quick
        
        logger.info(f"Export cleanup completed: {result}")
        return result
        
    except Exception as e:
        logger.error(f"Failed to cleanup expired exports: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to cleanup expired exports: {str(e)}")


@router.post("/automated-export")
async def trigger_automated_export(
    background_tasks: BackgroundTasks,
    admin_user: dict = Depends(get_super_admin_user)
):
    """Trigger automated periodic export for all tenants (Super Admin only)"""
    try:
        # Start automated export task in background
        task = automated_periodic_export.delay()
        
        logger.info(f"Automated periodic export started: {task.id}")
        
        return {
            "message": "Automated periodic export started",
            "task_id": task.id
        }
        
    except Exception as e:
        logger.error(f"Failed to trigger automated export: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to trigger automated export: {str(e)}")


@router.get("/stats", response_model=ExportStatsResponse)
async def get_export_statistics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get export statistics for current tenant"""
    try:
        from app.models.backup import DataExportLog, ExportStatus, ExportFormat, ExportType
        from sqlalchemy import func
        
        # Basic statistics
        total_exports = (
            db.query(func.count(DataExportLog.id))
            .filter(DataExportLog.tenant_id == current_user.tenant_id)
            .scalar()
        )
        
        successful_exports = (
            db.query(func.count(DataExportLog.id))
            .filter(
                DataExportLog.tenant_id == current_user.tenant_id,
                DataExportLog.status == ExportStatus.COMPLETED
            )
            .scalar()
        )
        
        failed_exports = (
            db.query(func.count(DataExportLog.id))
            .filter(
                DataExportLog.tenant_id == current_user.tenant_id,
                DataExportLog.status == ExportStatus.FAILED
            )
            .scalar()
        )
        
        # Aggregate statistics
        total_records = (
            db.query(func.sum(DataExportLog.total_records))
            .filter(
                DataExportLog.tenant_id == current_user.tenant_id,
                DataExportLog.status == ExportStatus.COMPLETED
            )
            .scalar() or 0
        )
        
        total_size = (
            db.query(func.sum(DataExportLog.compressed_size))
            .filter(
                DataExportLog.tenant_id == current_user.tenant_id,
                DataExportLog.status == ExportStatus.COMPLETED
            )
            .scalar() or 0
        )
        
        avg_time = (
            db.query(func.avg(DataExportLog.duration_seconds))
            .filter(
                DataExportLog.tenant_id == current_user.tenant_id,
                DataExportLog.status == ExportStatus.COMPLETED
            )
            .scalar()
        )
        
        # Success rate
        success_rate = (successful_exports / total_exports * 100) if total_exports > 0 else 0
        
        # Exports by format
        format_stats = (
            db.query(DataExportLog.export_format, func.count(DataExportLog.id))
            .filter(DataExportLog.tenant_id == current_user.tenant_id)
            .group_by(DataExportLog.export_format)
            .all()
        )
        exports_by_format = {format.value: count for format, count in format_stats}
        
        # Exports by type
        type_stats = (
            db.query(DataExportLog.export_type, func.count(DataExportLog.id))
            .filter(DataExportLog.tenant_id == current_user.tenant_id)
            .group_by(DataExportLog.export_type)
            .all()
        )
        exports_by_type = {type.value: count for type, count in type_stats}
        
        # Recent exports
        export_service = DataExportService(db)
        recent_exports = export_service.list_tenant_exports(str(current_user.tenant_id), 5)
        
        return {
            "total_exports": total_exports,
            "successful_exports": successful_exports,
            "failed_exports": failed_exports,
            "total_records_exported": total_records,
            "total_size_exported": total_size,
            "average_export_time": float(avg_time) if avg_time else None,
            "success_rate": success_rate,
            "exports_by_format": exports_by_format,
            "exports_by_type": exports_by_type,
            "recent_exports": recent_exports
        }
        
    except Exception as e:
        logger.error(f"Failed to get export statistics: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get export statistics: {str(e)}")


@router.delete("/export/{export_id}")
async def delete_export(
    export_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a specific export"""
    try:
        from app.models.backup import DataExportLog
        
        # Find export
        export = (
            db.query(DataExportLog)
            .filter(
                DataExportLog.id == export_id,
                DataExportLog.tenant_id == current_user.tenant_id
            )
            .first()
        )
        
        if not export:
            raise HTTPException(status_code=404, detail="Export not found")
        
        # Delete file if exists
        if export.local_file_path:
            try:
                file_path = Path(export.local_file_path)
                if file_path.exists():
                    file_path.unlink()
                    logger.info(f"Deleted export file: {file_path}")
            except Exception as e:
                logger.warning(f"Failed to delete export file: {e}")
        
        # Delete database record
        db.delete(export)
        db.commit()
        
        logger.info(f"Deleted export {export_id}")
        
        return {"message": "Export deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete export: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete export: {str(e)}")