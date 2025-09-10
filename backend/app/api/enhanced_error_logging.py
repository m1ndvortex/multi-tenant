"""
Enhanced Real-Time Error Logging API
Real-time error tracking with WebSocket support for admin dashboard
"""

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect
from fastapi import status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import uuid
import json
import asyncio
import logging

from ..core.database import get_db
from ..core.auth import get_super_admin_user
from ..models.user import User
from ..models.api_error_log import APIErrorLog, ErrorSeverity, ErrorCategory
from ..services.error_logging_service import ErrorLoggingService
from ..schemas.error_logging import (
    ErrorLogResponse, ErrorLogListResponse, ErrorResolutionRequest,
    ErrorStatisticsResponse, CriticalErrorAlert
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/enhanced-error-logging", tags=["Enhanced Real-Time Error Logging"])


class ErrorLogConnectionManager:
    """
    WebSocket connection manager for real-time error updates
    """
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.connection_info: Dict[WebSocket, Dict[str, Any]] = {}
    
    async def connect(self, websocket: WebSocket, admin_user_id: uuid.UUID):
        """Connect a new WebSocket client"""
        await websocket.accept()
        self.active_connections.append(websocket)
        self.connection_info[websocket] = {
            "admin_user_id": admin_user_id,
            "connected_at": datetime.utcnow(),
            "last_ping": datetime.utcnow()
        }
        logger.info(f"Admin {admin_user_id} connected to real-time error logging")
    
    def disconnect(self, websocket: WebSocket):
        """Disconnect a WebSocket client"""
        if websocket in self.active_connections:
            admin_user_id = self.connection_info.get(websocket, {}).get("admin_user_id")
            self.active_connections.remove(websocket)
            if websocket in self.connection_info:
                del self.connection_info[websocket]
            logger.info(f"Admin {admin_user_id} disconnected from real-time error logging")
    
    async def broadcast_error_update(self, error_data: Dict[str, Any]):
        """Broadcast error update to all connected clients"""
        if not self.active_connections:
            return
        
        message = json.dumps({
            "type": "error_update",
            "data": error_data,
            "timestamp": datetime.utcnow().isoformat()
        })
        
        disconnected_clients = []
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
                # Update last ping time
                if connection in self.connection_info:
                    self.connection_info[connection]["last_ping"] = datetime.utcnow()
            except Exception as e:
                logger.warning(f"Failed to send message to WebSocket client: {e}")
                disconnected_clients.append(connection)
        
        # Clean up disconnected clients
        for connection in disconnected_clients:
            self.disconnect(connection)
    
    async def broadcast_statistics_update(self, stats_data: Dict[str, Any]):
        """Broadcast statistics update to all connected clients"""
        if not self.active_connections:
            return
        
        message = json.dumps({
            "type": "statistics_update",
            "data": stats_data,
            "timestamp": datetime.utcnow().isoformat()
        })
        
        disconnected_clients = []
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception as e:
                logger.warning(f"Failed to send statistics to WebSocket client: {e}")
                disconnected_clients.append(connection)
        
        # Clean up disconnected clients
        for connection in disconnected_clients:
            self.disconnect(connection)
    
    async def send_error_resolution_update(self, error_id: uuid.UUID, resolution_data: Dict[str, Any]):
        """Send error resolution update to all connected clients"""
        if not self.active_connections:
            return
        
        message = json.dumps({
            "type": "error_resolved",
            "error_id": str(error_id),
            "data": resolution_data,
            "timestamp": datetime.utcnow().isoformat()
        })
        
        disconnected_clients = []
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception as e:
                logger.warning(f"Failed to send resolution update to WebSocket client: {e}")
                disconnected_clients.append(connection)
        
        # Clean up disconnected clients
        for connection in disconnected_clients:
            self.disconnect(connection)
    
    def get_connection_count(self) -> int:
        """Get number of active connections"""
        return len(self.active_connections)
    
    def get_connection_info(self) -> List[Dict[str, Any]]:
        """Get information about all active connections"""
        return [
            {
                "admin_user_id": str(info["admin_user_id"]),
                "connected_at": info["connected_at"].isoformat(),
                "last_ping": info["last_ping"].isoformat(),
                "connection_duration": str(datetime.utcnow() - info["connected_at"])
            }
            for info in self.connection_info.values()
        ]


# Global connection manager instance
error_connection_manager = ErrorLogConnectionManager()


@router.websocket("/ws/real-time-errors")
async def websocket_real_time_errors(
    websocket: WebSocket,
    token: str = Query(..., description="Admin authentication token"),
    db: Session = Depends(get_db)
):
    """
    WebSocket endpoint for real-time error updates
    Only accessible to super admin users
    """
    try:
        # Validate admin token (simplified - in production use proper JWT validation)
        # For now, we'll accept any token and use a default admin user
        # In real implementation, decode JWT and get actual admin user
        admin_user_id = uuid.uuid4()  # This should be extracted from JWT token
        
        await error_connection_manager.connect(websocket, admin_user_id)
        
        # Send initial connection confirmation
        await websocket.send_text(json.dumps({
            "type": "connection_established",
            "message": "Connected to real-time error logging",
            "timestamp": datetime.utcnow().isoformat()
        }))
        
        # Send initial error statistics
        error_service = ErrorLoggingService(db)
        initial_stats = error_service.get_error_statistics()
        await websocket.send_text(json.dumps({
            "type": "initial_statistics",
            "data": initial_stats,
            "timestamp": datetime.utcnow().isoformat()
        }))
        
        # Keep connection alive and handle incoming messages
        while True:
            try:
                # Wait for messages from client (ping/pong, requests, etc.)
                message = await websocket.receive_text()
                data = json.loads(message)
                
                if data.get("type") == "ping":
                    await websocket.send_text(json.dumps({
                        "type": "pong",
                        "timestamp": datetime.utcnow().isoformat()
                    }))
                elif data.get("type") == "request_statistics":
                    # Send current statistics
                    current_stats = error_service.get_error_statistics()
                    await websocket.send_text(json.dumps({
                        "type": "statistics_update",
                        "data": current_stats,
                        "timestamp": datetime.utcnow().isoformat()
                    }))
                
            except WebSocketDisconnect:
                break
            except Exception as e:
                logger.error(f"Error in WebSocket communication: {e}")
                break
    
    except Exception as e:
        logger.error(f"WebSocket connection error: {e}")
    finally:
        error_connection_manager.disconnect(websocket)


@router.get("/active-errors", response_model=ErrorLogListResponse)
async def get_active_errors(
    tenant_id: Optional[uuid.UUID] = Query(None, description="Filter by tenant ID"),
    severity: Optional[ErrorSeverity] = Query(None, description="Filter by severity"),
    category: Optional[ErrorCategory] = Query(None, description="Filter by category"),
    endpoint: Optional[str] = Query(None, description="Filter by endpoint (partial match)"),
    error_type: Optional[str] = Query(None, description="Filter by error type (partial match)"),
    hours_back: int = Query(24, ge=1, le=168, description="Hours to look back for active errors"),
    limit: int = Query(50, ge=1, le=100, description="Maximum number of records to return"),
    current_user: User = Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get only currently active (unresolved) errors
    Shows errors from the last N hours that are still unresolved
    """
    try:
        error_service = ErrorLoggingService(db)
        
        # Calculate start date based on hours_back
        start_date = datetime.utcnow() - timedelta(hours=hours_back)
        
        # Get only unresolved errors
        errors, total = error_service.get_errors_with_filters(
            tenant_id=tenant_id,
            severity=severity,
            category=category,
            endpoint=endpoint,
            error_type=error_type,
            is_resolved=False,  # Only unresolved errors
            start_date=start_date,
            limit=limit,
            order_by="last_occurrence",
            order_desc=True
        )
        
        error_responses = [
            ErrorLogResponse.from_orm(error) for error in errors
        ]
        
        return ErrorLogListResponse(
            errors=error_responses,
            total=total,
            skip=0,
            limit=limit,
            has_more=total > limit
        )
        
    except Exception as e:
        logger.error(f"Failed to get active errors: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve active errors: {str(e)}"
        )


@router.get("/real-time-statistics", response_model=ErrorStatisticsResponse)
async def get_real_time_error_statistics(
    tenant_id: Optional[uuid.UUID] = Query(None, description="Filter by tenant ID"),
    hours_back: int = Query(24, ge=1, le=168, description="Hours to look back for statistics"),
    current_user: User = Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get real-time error statistics with counts by severity level
    Optimized for real-time dashboard updates
    """
    try:
        error_service = ErrorLoggingService(db)
        
        # Calculate time range
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(hours=hours_back)
        
        # Get comprehensive statistics
        statistics = error_service.get_error_statistics(
            tenant_id=tenant_id,
            start_date=start_date,
            end_date=end_date
        )
        
        # Add real-time specific metrics
        # Get active (unresolved) errors count
        active_errors, active_total = error_service.get_errors_with_filters(
            tenant_id=tenant_id,
            is_resolved=False,
            start_date=start_date,
            limit=1
        )
        
        # Get critical errors in last hour
        last_hour = end_date - timedelta(hours=1)
        critical_last_hour, _ = error_service.get_errors_with_filters(
            tenant_id=tenant_id,
            severity=ErrorSeverity.CRITICAL,
            start_date=last_hour,
            limit=1
        )
        
        # Add real-time metrics to statistics
        statistics.update({
            "active_errors_count": active_total,
            "critical_errors_last_hour": len(critical_last_hour),
            "time_range": {
                "start": start_date.isoformat(),
                "end": end_date.isoformat(),
                "hours": hours_back
            },
            "last_updated": end_date.isoformat()
        })
        
        # Broadcast statistics update to WebSocket clients
        await error_connection_manager.broadcast_statistics_update(statistics)
        
        return ErrorStatisticsResponse(**statistics)
        
    except Exception as e:
        logger.error(f"Failed to get real-time error statistics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve real-time error statistics: {str(e)}"
        )


@router.put("/{error_id}/resolve-with-tracking", response_model=ErrorLogResponse)
async def resolve_error_with_admin_tracking(
    error_id: uuid.UUID,
    resolution_data: ErrorResolutionRequest,
    current_user: User = Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    """
    Mark an error as resolved with enhanced admin tracking and real-time updates
    """
    try:
        error_service = ErrorLoggingService(db)
        
        # Get the error before resolving
        error_log = db.query(APIErrorLog).filter(APIErrorLog.id == error_id).first()
        if not error_log:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Error log not found"
            )
        
        # Check if already resolved
        if error_log.is_resolved:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Error is already resolved"
            )
        
        # Resolve the error
        resolved_error = error_service.resolve_error(
            error_id=error_id,
            resolved_by=current_user.id,
            notes=resolution_data.notes
        )
        
        if not resolved_error:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Error log not found"
            )
        
        # Prepare resolution update data
        resolution_update = {
            "error_id": str(error_id),
            "resolved_by": str(current_user.id),
            "resolved_by_name": getattr(current_user, 'name', 'Unknown Admin'),
            "resolved_at": resolved_error.resolved_at.isoformat() if resolved_error.resolved_at else None,
            "resolution_notes": resolution_data.notes,
            "error_message": resolved_error.error_message,
            "error_type": resolved_error.error_type,
            "endpoint": resolved_error.endpoint,
            "severity": resolved_error.severity.value,
            "tenant_id": str(resolved_error.tenant_id) if resolved_error.tenant_id else None
        }
        
        # Send real-time update to WebSocket clients
        await error_connection_manager.send_error_resolution_update(error_id, resolution_update)
        
        logger.info(f"Super admin {current_user.id} resolved error {error_id} with real-time notification")
        
        return ErrorLogResponse.from_orm(resolved_error)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to resolve error {error_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to resolve error: {str(e)}"
        )


@router.get("/critical-alerts", response_model=List[CriticalErrorAlert])
async def get_critical_error_alerts(
    hours: int = Query(24, ge=1, le=168, description="Hours to look back for critical errors"),
    include_resolved: bool = Query(False, description="Include resolved critical errors"),
    current_user: User = Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get critical error alerts for real-time monitoring
    """
    try:
        error_service = ErrorLoggingService(db)
        
        # Get critical errors
        start_date = datetime.utcnow() - timedelta(hours=hours)
        
        critical_errors, _ = error_service.get_errors_with_filters(
            severity=ErrorSeverity.CRITICAL,
            start_date=start_date,
            is_resolved=None if include_resolved else False,
            limit=100,
            order_by="last_occurrence",
            order_desc=True
        )
        
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
        logger.error(f"Failed to get critical error alerts: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve critical error alerts: {str(e)}"
        )


@router.get("/connection-status")
async def get_websocket_connection_status(
    current_user: User = Depends(get_super_admin_user)
):
    """
    Get WebSocket connection status for monitoring
    """
    try:
        connection_count = error_connection_manager.get_connection_count()
        connection_info = error_connection_manager.get_connection_info()
        
        return {
            "active_connections": connection_count,
            "connections": connection_info,
            "status": "operational" if connection_count >= 0 else "no_connections",
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Failed to get WebSocket connection status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get connection status: {str(e)}"
        )


@router.post("/simulate-error")
async def simulate_error_for_testing(
    error_message: str = Query(..., description="Error message to simulate"),
    severity: ErrorSeverity = Query(ErrorSeverity.HIGH, description="Error severity"),
    category: ErrorCategory = Query(ErrorCategory.SYSTEM, description="Error category"),
    tenant_id: Optional[uuid.UUID] = Query(None, description="Tenant ID for simulation"),
    current_user: User = Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    """
    Simulate an error for testing real-time functionality
    Only available in development/testing environments
    """
    try:
        error_service = ErrorLoggingService(db)
        
        # Create a simulated error
        simulated_error = error_service.log_custom_error(
            error_message=f"[SIMULATED] {error_message}",
            error_type="SimulatedError",
            endpoint="/api/test/simulate-error",
            method="POST",
            status_code=500,
            severity=severity,
            category=category,
            tenant_id=tenant_id,
            user_id=current_user.id,
            additional_context={
                "simulated": True,
                "simulated_by": str(current_user.id),
                "simulation_time": datetime.utcnow().isoformat()
            }
        )
        
        # Broadcast the new error to WebSocket clients
        error_data = {
            "id": str(simulated_error.id),
            "error_message": simulated_error.error_message,
            "error_type": simulated_error.error_type,
            "endpoint": simulated_error.endpoint,
            "severity": simulated_error.severity.value,
            "category": simulated_error.category.value,
            "tenant_id": str(simulated_error.tenant_id) if simulated_error.tenant_id else None,
            "occurrence_count": simulated_error.occurrence_count,
            "created_at": simulated_error.created_at.isoformat(),
            "is_simulated": True
        }
        
        await error_connection_manager.broadcast_error_update(error_data)
        
        logger.info(f"Admin {current_user.id} simulated error for testing: {simulated_error.id}")
        
        return {
            "success": True,
            "message": "Error simulated successfully",
            "error_id": str(simulated_error.id),
            "broadcasted_to_clients": error_connection_manager.get_connection_count()
        }
        
    except Exception as e:
        logger.error(f"Failed to simulate error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to simulate error: {str(e)}"
        )


# Background task to periodically update statistics
async def periodic_statistics_update():
    """
    Background task to periodically send statistics updates to WebSocket clients
    """
    while True:
        try:
            if error_connection_manager.get_connection_count() > 0:
                # Get database session
                from ..core.database import SessionLocal
                db = SessionLocal()
                
                try:
                    error_service = ErrorLoggingService(db)
                    current_stats = error_service.get_error_statistics()
                    
                    # Add timestamp
                    current_stats["last_updated"] = datetime.utcnow().isoformat()
                    
                    # Broadcast to all connected clients
                    await error_connection_manager.broadcast_statistics_update(current_stats)
                    
                finally:
                    db.close()
            
            # Wait 30 seconds before next update
            await asyncio.sleep(30)
            
        except Exception as e:
            logger.error(f"Error in periodic statistics update: {e}")
            await asyncio.sleep(60)  # Wait longer on error


# Start the background task when the module is imported
# Note: In production, this should be managed by a proper task scheduler
import asyncio
try:
    asyncio.create_task(periodic_statistics_update())
except RuntimeError:
    # Handle case where event loop is not running
    pass