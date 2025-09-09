"""
Enhanced Real-Time Error Logging API endpoints for Super Admin
Includes WebSocket support for real-time error monitoring
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks, WebSocket, WebSocketDisconnect
from fastapi import status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import uuid
import logging
import json
import asyncio

from ..core.database import get_db
from ..core.auth import get_super_admin_user
from ..models.user import User
from ..models.api_error_log import APIErrorLog, ErrorSeverity, ErrorCategory
from ..services.error_logging_service import ErrorLoggingService
from ..schemas.error_logging import (
    ErrorLogResponse, ErrorLogListResponse, ErrorLogFilters,
    ErrorResolutionRequest, ErrorStatisticsResponse, ErrorTrendsResponse,
    CriticalErrorAlert, BulkErrorActionRequest, BulkErrorActionResponse,
    ErrorExportRequest, ErrorExportResponse, ErrorNotificationSettings,
    RealTimeErrorStatistics
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/super-admin/errors", tags=["Super Admin - Enhanced Error Logging"])


class ErrorLogConnectionManager:
    """
    WebSocket connection manager for real-time error updates
    """
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.admin_connections: dict = {}  # Track admin user connections
    
    async def connect(self, websocket: WebSocket, admin_id: str):
        """Accept WebSocket connection and track admin"""
        await websocket.accept()
        self.active_connections.append(websocket)
        self.admin_connections[admin_id] = websocket
        logger.info(f"Admin {admin_id} connected to error logging WebSocket")
    
    def disconnect(self, websocket: WebSocket, admin_id: str = None):
        """Remove WebSocket connection"""
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        if admin_id and admin_id in self.admin_connections:
            del self.admin_connections[admin_id]
        logger.info(f"Admin {admin_id} disconnected from error logging WebSocket")
    
    async def broadcast_error_update(self, error_data: dict):
        """Broadcast error update to all connected admins"""
        if not self.active_connections:
            return
        
        message = json.dumps({
            "type": "error_update",
            "data": error_data,
            "timestamp": datetime.utcnow().isoformat()
        })
        
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception as e:
                logger.warning(f"Failed to send WebSocket message: {e}")
                disconnected.append(connection)
        
        # Remove disconnected connections
        for connection in disconnected:
            if connection in self.active_connections:
                self.active_connections.remove(connection)
    
    async def broadcast_error_resolved(self, error_id: str, resolved_by: str):
        """Broadcast error resolution to all connected admins"""
        await self.broadcast_error_update({
            "action": "resolved",
            "error_id": error_id,
            "resolved_by": resolved_by
        })
    
    async def broadcast_new_error(self, error_log: APIErrorLog):
        """Broadcast new error to all connected admins"""
        await self.broadcast_error_update({
            "action": "new_error",
            "error": {
                "id": str(error_log.id),
                "error_message": error_log.error_message,
                "error_type": error_log.error_type,
                "endpoint": error_log.endpoint,
                "method": error_log.method,
                "severity": error_log.severity.value,
                "category": error_log.category.value,
                "tenant_id": str(error_log.tenant_id) if error_log.tenant_id else None,
                "occurred_at": error_log.created_at.isoformat(),
                "occurrence_count": error_log.occurrence_count
            }
        })
    
    async def broadcast_statistics_update(self, statistics: dict):
        """Broadcast updated error statistics"""
        await self.broadcast_error_update({
            "action": "statistics_update",
            "statistics": statistics
        })


# Global connection manager instance
error_connection_manager = ErrorLogConnectionManager()


@router.websocket("/ws/{admin_id}")
async def websocket_endpoint(websocket: WebSocket, admin_id: str):
    """
    WebSocket endpoint for real-time error updates
    """
    try:
        await error_connection_manager.connect(websocket, admin_id)
        
        # Send initial connection confirmation
        await websocket.send_text(json.dumps({
            "type": "connection_established",
            "admin_id": admin_id,
            "timestamp": datetime.utcnow().isoformat()
        }))
        
        # Keep connection alive and handle incoming messages
        while True:
            try:
                # Wait for messages (ping/pong, requests, etc.)
                data = await websocket.receive_text()
                message = json.loads(data)
                
                # Handle different message types
                if message.get("type") == "ping":
                    await websocket.send_text(json.dumps({
                        "type": "pong",
                        "timestamp": datetime.utcnow().isoformat()
                    }))
                elif message.get("type") == "request_statistics":
                    # Send current statistics
                    from ..core.database import SessionLocal
                    db = SessionLocal()
                    try:
                        error_service = ErrorLoggingService(db)
                        stats = error_service.get_error_statistics()
                        await websocket.send_text(json.dumps({
                            "type": "statistics_update",
                            "data": stats,
                            "timestamp": datetime.utcnow().isoformat()
                        }))
                    finally:
                        db.close()
                        
            except WebSocketDisconnect:
                break
            except Exception as e:
                logger.error(f"WebSocket error for admin {admin_id}: {e}")
                break
                
    except Exception as e:
        logger.error(f"WebSocket connection error for admin {admin_id}: {e}")
    finally:
        error_connection_manager.disconnect(websocket, admin_id)


@router.get("/active", response_model=ErrorLogListResponse)
async def get_active_errors(
    tenant_id: Optional[uuid.UUID] = Query(None, description="Filter by tenant ID"),
    severity: Optional[ErrorSeverity] = Query(None, description="Filter by severity"),
    category: Optional[ErrorCategory] = Query(None, description="Filter by category"),
    endpoint: Optional[str] = Query(None, description="Filter by endpoint (partial match)"),
    error_type: Optional[str] = Query(None, description="Filter by error type (partial match)"),
    search_term: Optional[str] = Query(None, description="Search in error messages"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(50, ge=1, le=100, description="Maximum number of records to return"),
    current_user: User = Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get only currently active (unresolved) errors for real-time monitoring
    """
    try:
        error_service = ErrorLoggingService(db)
        
        # Only get unresolved errors
        errors, total = error_service.get_errors_with_filters(
            tenant_id=tenant_id,
            severity=severity,
            category=category,
            endpoint=endpoint,
            error_type=error_type,
            search_term=search_term,
            is_resolved=False,  # Only active/unresolved errors
            skip=skip,
            limit=limit,
            order_by="last_occurrence",  # Show most recent first
            order_desc=True
        )
        
        error_responses = [
            ErrorLogResponse.from_orm(error) for error in errors
        ]
        
        return ErrorLogListResponse(
            errors=error_responses,
            total=total,
            skip=skip,
            limit=limit,
            has_more=(skip + limit) < total
        )
        
    except Exception as e:
        logger.error(f"Failed to get active errors: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve active errors: {str(e)}"
        )


@router.get("/statistics/real-time", response_model=RealTimeErrorStatistics)
async def get_real_time_error_statistics(
    current_user: User = Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get real-time error statistics for dashboard monitoring
    """
    try:
        error_service = ErrorLoggingService(db)
        
        # Get statistics for active errors only
        statistics = error_service.get_real_time_statistics()
        
        return RealTimeErrorStatistics(**statistics)
        
    except Exception as e:
        logger.error(f"Failed to get real-time error statistics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve real-time error statistics: {str(e)}"
        )


@router.get("/", response_model=ErrorLogListResponse)
async def get_error_logs(
    tenant_id: Optional[uuid.UUID] = Query(None, description="Filter by tenant ID"),
    user_id: Optional[uuid.UUID] = Query(None, description="Filter by user ID"),
    severity: Optional[ErrorSeverity] = Query(None, description="Filter by severity"),
    category: Optional[ErrorCategory] = Query(None, description="Filter by category"),
    endpoint: Optional[str] = Query(None, description="Filter by endpoint (partial match)"),
    error_type: Optional[str] = Query(None, description="Filter by error type (partial match)"),
    status_code: Optional[int] = Query(None, description="Filter by HTTP status code"),
    is_resolved: Optional[bool] = Query(None, description="Filter by resolution status"),
    start_date: Optional[datetime] = Query(None, description="Filter errors after this date"),
    end_date: Optional[datetime] = Query(None, description="Filter errors before this date"),
    search_term: Optional[str] = Query(None, description="Search in error messages"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(50, ge=1, le=100, description="Maximum number of records to return"),
    order_by: str = Query("created_at", description="Field to sort by"),
    order_desc: bool = Query(True, description="Sort in descending order"),
    current_user: User = Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get error logs with comprehensive filtering and pagination
    """
    try:
        error_service = ErrorLoggingService(db)
        
        errors, total = error_service.get_errors_with_filters(
            tenant_id=tenant_id,
            user_id=user_id,
            severity=severity,
            category=category,
            endpoint=endpoint,
            error_type=error_type,
            status_code=status_code,
            is_resolved=is_resolved,
            start_date=start_date,
            end_date=end_date,
            search_term=search_term,
            skip=skip,
            limit=limit,
            order_by=order_by,
            order_desc=order_desc
        )
        
        error_responses = [
            ErrorLogResponse.from_orm(error) for error in errors
        ]
        
        return ErrorLogListResponse(
            errors=error_responses,
            total=total,
            skip=skip,
            limit=limit,
            has_more=(skip + limit) < total
        )
        
    except Exception as e:
        logger.error(f"Failed to get error logs: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve error logs: {str(e)}"
        )


@router.get("/{error_id}", response_model=ErrorLogResponse)
async def get_error_log(
    error_id: uuid.UUID,
    current_user: User = Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get specific error log by ID
    """
    try:
        error_log = db.query(APIErrorLog).filter(APIErrorLog.id == error_id).first()
        
        if not error_log:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Error log not found"
            )
        
        return ErrorLogResponse.from_orm(error_log)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get error log {error_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve error log: {str(e)}"
        )


@router.put("/{error_id}/resolve", response_model=ErrorLogResponse)
async def resolve_error(
    error_id: uuid.UUID,
    resolution_data: ErrorResolutionRequest,
    current_user: User = Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    """
    Mark an error as resolved with real-time broadcast
    """
    try:
        error_service = ErrorLoggingService(db)
        
        error_log = error_service.resolve_error(
            error_id=error_id,
            resolved_by=current_user.id,
            notes=resolution_data.notes
        )
        
        if not error_log:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Error log not found"
            )
        
        logger.info(f"Super admin {current_user.id} resolved error {error_id}")
        
        # Broadcast error resolution to all connected WebSocket clients
        await error_connection_manager.broadcast_error_resolved(
            error_id=str(error_id),
            resolved_by=current_user.email
        )
        
        # Broadcast updated statistics
        updated_stats = error_service.get_real_time_statistics()
        await error_connection_manager.broadcast_statistics_update(updated_stats)
        
        return ErrorLogResponse.from_orm(error_log)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to resolve error {error_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to resolve error: {str(e)}"
        )


@router.get("/statistics/overview", response_model=ErrorStatisticsResponse)
async def get_error_statistics(
    tenant_id: Optional[uuid.UUID] = Query(None, description="Filter by tenant ID"),
    start_date: Optional[datetime] = Query(None, description="Statistics start date"),
    end_date: Optional[datetime] = Query(None, description="Statistics end date"),
    current_user: User = Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get comprehensive error statistics
    """
    try:
        error_service = ErrorLoggingService(db)
        
        # Default to last 30 days if no dates provided
        if not start_date:
            start_date = datetime.utcnow() - timedelta(days=30)
        if not end_date:
            end_date = datetime.utcnow()
        
        statistics = error_service.get_error_statistics(
            tenant_id=tenant_id,
            start_date=start_date,
            end_date=end_date
        )
        
        return ErrorStatisticsResponse(**statistics)
        
    except Exception as e:
        logger.error(f"Failed to get error statistics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve error statistics: {str(e)}"
        )


@router.get("/statistics/trends", response_model=ErrorTrendsResponse)
async def get_error_trends(
    days: int = Query(7, ge=1, le=90, description="Number of days for trend analysis"),
    current_user: User = Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get error trends over specified time period
    """
    try:
        error_service = ErrorLoggingService(db)
        
        trends = error_service.get_error_trends(days=days)
        
        return ErrorTrendsResponse(**trends)
        
    except Exception as e:
        logger.error(f"Failed to get error trends: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve error trends: {str(e)}"
        )


@router.get("/alerts/critical", response_model=List[CriticalErrorAlert])
async def get_critical_errors(
    hours: int = Query(24, ge=1, le=168, description="Hours to look back for critical errors"),
    current_user: User = Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get critical errors from the specified time period
    """
    try:
        error_service = ErrorLoggingService(db)
        
        critical_errors = error_service.get_critical_errors(hours=hours)
        
        alerts = []
        for error in critical_errors:
            alert = CriticalErrorAlert(
                id=error.id,
                error_message=error.error_message,
                error_type=error.error_type,
                endpoint=error.endpoint,
                severity=error.severity,
                category=error.category,
                tenant_id=error.tenant_id,
                occurrence_count=error.occurrence_count,
                first_occurrence=error.first_occurrence,
                last_occurrence=error.last_occurrence
            )
            alerts.append(alert)
        
        return alerts
        
    except Exception as e:
        logger.error(f"Failed to get critical errors: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve critical errors: {str(e)}"
        )


@router.post("/bulk-action", response_model=BulkErrorActionResponse)
async def bulk_error_action(
    action_data: BulkErrorActionRequest,
    current_user: User = Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    """
    Perform bulk actions on multiple error logs
    """
    try:
        successful_error_ids = []
        failed_operations = []
        
        for error_id in action_data.error_ids:
            try:
                error_log = db.query(APIErrorLog).filter(APIErrorLog.id == error_id).first()
                
                if not error_log:
                    failed_operations.append({
                        "error_id": str(error_id),
                        "error": "Error log not found"
                    })
                    continue
                
                if action_data.action == "resolve":
                    error_log.mark_resolved(db, current_user.id, action_data.notes)
                elif action_data.action == "delete":
                    db.delete(error_log)
                
                successful_error_ids.append(error_id)
                
            except Exception as e:
                failed_operations.append({
                    "error_id": str(error_id),
                    "error": str(e)
                })
        
        db.commit()
        
        success_count = len(successful_error_ids)
        failed_count = len(failed_operations)
        
        logger.info(f"Super admin {current_user.id} performed bulk {action_data.action} on {success_count} error logs")
        
        return BulkErrorActionResponse(
            success_count=success_count,
            failed_count=failed_count,
            successful_error_ids=successful_error_ids,
            failed_operations=failed_operations,
            message=f"Bulk {action_data.action} completed: {success_count} successful, {failed_count} failed"
        )
        
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to perform bulk error action: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to perform bulk action: {str(e)}"
        )


@router.delete("/{error_id}")
async def delete_error_log(
    error_id: uuid.UUID,
    current_user: User = Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    """
    Delete an error log (hard delete - use with caution)
    """
    try:
        error_log = db.query(APIErrorLog).filter(APIErrorLog.id == error_id).first()
        
        if not error_log:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Error log not found"
            )
        
        db.delete(error_log)
        db.commit()
        
        logger.info(f"Super admin {current_user.id} deleted error log {error_id}")
        
        return {"message": "Error log deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to delete error log {error_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete error log: {str(e)}"
        )


@router.post("/export", response_model=ErrorExportResponse)
async def export_error_logs(
    export_request: ErrorExportRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    """
    Export error logs in specified format
    """
    try:
        # This would be implemented as a background task
        # For now, return a placeholder response
        
        filename = f"error_logs_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.{export_request.format}"
        download_url = f"/api/super-admin/errors/download/{filename}"
        expires_at = datetime.utcnow() + timedelta(hours=24)
        
        # Add background task to generate the export file
        # background_tasks.add_task(generate_error_export, export_request, filename)
        
        logger.info(f"Super admin {current_user.id} requested error log export in {export_request.format} format")
        
        return ErrorExportResponse(
            download_url=download_url,
            filename=filename,
            total_records=0,  # Would be calculated during export
            expires_at=expires_at
        )
        
    except Exception as e:
        logger.error(f"Failed to export error logs: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to export error logs: {str(e)}"
        )


@router.get("/health/check")
async def error_logging_health_check(
    current_user: User = Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    """
    Health check for error logging system
    """
    try:
        # Check if we can query error logs
        recent_errors = db.query(APIErrorLog).limit(1).all()
        
        # Check error logging service
        error_service = ErrorLoggingService(db)
        stats = error_service.get_error_statistics()
        
        return {
            "status": "healthy",
            "database_connection": "ok",
            "recent_errors_accessible": len(recent_errors) >= 0,
            "total_errors_in_system": stats.get("total_errors", 0),
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error logging health check failed: {e}")
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }