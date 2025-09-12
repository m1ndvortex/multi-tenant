"""
Online Users Monitoring API Endpoints
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, Query, BackgroundTasks
from sqlalchemy.orm import Session
from uuid import UUID
import asyncio
import json
import logging

from ..core.database import get_db
from ..core.auth import get_super_admin_user, get_current_user, verify_token
from ..models.user import User, UserStatus
from ..services.online_users_service import online_users_service
from ..schemas.online_users_monitoring import (
    UserActivityUpdateRequest,
    OnlineUserResponse,
    OnlineUsersStatsResponse,
    TenantOnlineUsersResponse,
    OnlineUsersFilterRequest,
    UserSessionResponse,
    BulkUserStatusResponse,
    OnlineUsersWebSocketMessage
)

router = APIRouter(prefix="/online-users", tags=["Online Users Monitoring"])
logger = logging.getLogger(__name__)


@router.post("/activity/update")
async def update_user_activity(
    activity_data: UserActivityUpdateRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update user activity status (called by tenant applications)
    """
    try:
        # Update activity in Redis and database
        success = await online_users_service.update_user_activity(
            user_id=current_user.id,
            tenant_id=current_user.tenant_id,
            session_id=activity_data.session_id,
            user_agent=activity_data.user_agent,
            ip_address=activity_data.ip_address,
            db=db
        )
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to update user activity")
        
        return {
            "success": True,
            "message": "User activity updated successfully",
            "user_id": str(current_user.id),
            "timestamp": "now"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to update user activity: {str(e)}"
        )


@router.post("/activity/offline")
async def set_current_user_offline(
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Mark the current user as offline immediately (called by tenant app on logout/tab close)
    """
    try:
        success = await online_users_service.set_user_offline(current_user.id, db)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to set user offline")
        return {
            "success": True,
            "message": "User set offline successfully",
            "user_id": str(current_user.id)
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to set user offline: {str(e)}"
        )


@router.post("/activity/offline-beacon")
async def set_current_user_offline_beacon(
    token: str = Query(..., description="JWT access token for authentication (for sendBeacon)"),
    db: Session = Depends(get_db)
):
    """
    Beacon-friendly offline endpoint.
    Authenticates using JWT provided as a query param (to support navigator.sendBeacon which cannot set headers).
    """
    try:
        payload = verify_token(token)
        user_id = payload.get("user_id")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        try:
            user_uuid = UUID(user_id)
        except Exception:
            raise HTTPException(status_code=401, detail="Invalid token user id")

        # Optional: verify user exists
        user = db.query(User).filter(User.id == user_uuid).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        success = await online_users_service.set_user_offline(user_uuid, db)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to set user offline")
        return {"success": True, "message": "User set offline via beacon", "user_id": str(user_uuid)}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to set user offline (beacon): {str(e)}")


@router.post("/users/{user_id}/offline")
async def set_user_offline(
    user_id: UUID,
    current_admin: User = Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    """
    Manually set a user as offline (admin only)
    """
    try:
        success = await online_users_service.set_user_offline(user_id, db)
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to set user offline")
        
        return {
            "success": True,
            "message": "User set offline successfully",
            "user_id": str(user_id)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to set user offline: {str(e)}"
        )


@router.get("/users", response_model=List[OnlineUserResponse])
async def get_online_users(
    tenant_id: Optional[UUID] = Query(None, description="Filter by tenant ID"),
    limit: int = Query(50, ge=1, le=500, description="Maximum number of results"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
    current_admin: User = Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get list of currently online users (admin only)
    """
    try:
        online_users = await online_users_service.get_online_users(
            tenant_id=tenant_id,
            limit=limit,
            offset=offset,
            db=db
        )
        
        return online_users
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get online users: {str(e)}"
        )


@router.get("/stats", response_model=OnlineUsersStatsResponse)
async def get_online_users_stats(
    current_admin: User = Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get online users statistics (admin only)
    """
    try:
        stats = await online_users_service.get_online_users_stats(db)
        return stats
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get online users stats: {str(e)}"
        )


@router.get("/tenants/{tenant_id}", response_model=TenantOnlineUsersResponse)
async def get_tenant_online_users(
    tenant_id: UUID,
    current_admin: User = Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get online users for a specific tenant (admin only)
    """
    try:
        tenant_users = await online_users_service.get_tenant_online_users(tenant_id, db)
        return tenant_users
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get tenant online users: {str(e)}"
        )


@router.post("/cleanup")
async def cleanup_expired_users(
    background_tasks: BackgroundTasks,
    current_admin: User = Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    """
    Manually trigger cleanup of expired user sessions (admin only)
    """
    try:
        # Run cleanup in background
        background_tasks.add_task(online_users_service.cleanup_expired_users, db)
        
        return {
            "success": True,
            "message": "Cleanup task started",
            "timestamp": "now"
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to start cleanup: {str(e)}"
        )


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    db: Session = Depends(get_db)
):
    """
    WebSocket endpoint for real-time online users updates
    Auth: expects JWT in query param `token` belonging to an active super admin
    Only active when admin is watching (conserves resources)
    """

    # Authenticate via JWT in query params before accepting the connection
    try:
        token = websocket.query_params.get("token")
        if not token:
            await websocket.close(code=1008, reason="Missing authentication token")
            return

        payload = verify_token(token)
        user_id = payload.get("user_id")
        is_super_admin = payload.get("is_super_admin", False)

        if not user_id or not is_super_admin:
            await websocket.close(code=1008, reason="Super admin access required")
            return

        # Validate user exists and is active super admin
        # Ensure DB comparison uses UUID type
        try:
            user_uuid = UUID(user_id) if not isinstance(user_id, UUID) else user_id
        except Exception:
            await websocket.close(code=1008, reason="Invalid user identifier in token")
            return

        user = db.query(User).filter(User.id == user_uuid, User.is_super_admin == True).first()
        if not user or not user.is_super_admin or user.status != UserStatus.ACTIVE:
            await websocket.close(code=1008, reason="User not authorized or inactive")
            return
    except Exception as e:
        try:
            # Provide a consistent auth failure close without exposing internals
            await websocket.close(code=1008, reason="Invalid or expired token")
        finally:
            return

    # Accept connection after successful authentication
    await websocket.accept()
    logger.info(f"[OnlineUsers][WS] Connection accepted for super admin: {user_id}")
    
    try:
        # Add connection to service
        await online_users_service.add_websocket_connection(websocket)
        
        # Send initial stats
        try:
            initial_stats = await online_users_service.get_online_users_stats(db)
            initial_message = OnlineUsersWebSocketMessage(
                type="initial_stats",
                data=initial_stats.dict()
            )
            # Use json with default=str to avoid serialization issues
            await websocket.send_text(json.dumps(initial_message.dict(), default=str))
        except Exception as send_err:
            logger.error(f"[OnlineUsers][WS] Failed sending initial stats: {send_err}")
            raise
        
        # Keep connection alive and handle messages
        while True:
            try:
                # Wait for client messages (ping/pong, etc.)
                data = await websocket.receive_text()
                message = json.loads(data)
                
                # Handle different message types
                if message.get("type") == "ping":
                    await websocket.send_text(json.dumps({"type": "pong"}))
                
                elif message.get("type") == "request_stats":
                    # Send current stats
                    stats = await online_users_service.get_online_users_stats(db)
                    stats_message = OnlineUsersWebSocketMessage(
                        type="stats_update",
                        data=stats.dict()
                    )
                    await websocket.send_text(json.dumps(stats_message.dict(), default=str))
                
                elif message.get("type") == "request_users":
                    # Send current online users
                    tenant_id = message.get("tenant_id")
                    if tenant_id:
                        tenant_id = UUID(tenant_id)
                    
                    users = await online_users_service.get_online_users(
                        tenant_id=tenant_id, db=db
                    )
                    users_data = [user.dict() for user in users]
                    users_message = OnlineUsersWebSocketMessage(
                        type="users_update",
                        data={"users": users_data}
                    )
                    await websocket.send_text(json.dumps(users_message.dict(), default=str))
                
            except WebSocketDisconnect:
                logger.info(f"[OnlineUsers][WS] Client disconnected: {user_id}")
                break
            except Exception as e:
                logger.error(f"[OnlineUsers][WS] Error in message loop: {e}")
                break
    
    except WebSocketDisconnect:
        logger.info(f"[OnlineUsers][WS] Disconnected: {user_id}")
    except Exception as e:
        logger.error(f"[OnlineUsers][WS] Connection error: {e}")
    finally:
        # Remove connection from service
        await online_users_service.remove_websocket_connection(websocket)


@router.get("/users/{user_id}/session", response_model=UserSessionResponse)
async def get_user_session_info(
    user_id: UUID,
    current_admin: User = Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get detailed session information for a specific user (admin only)
    """
    try:
        # Get user info from database
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Get online status from Redis
        online_users = await online_users_service.get_online_users(db=db)
        user_session = None
        
        for online_user in online_users:
            if online_user.user_id == user_id:
                user_session = UserSessionResponse(
                    user_id=online_user.user_id,
                    tenant_id=online_user.tenant_id,
                    session_id=online_user.session_id,
                    is_online=online_user.is_online,
                    last_activity=online_user.last_activity,
                    session_start=online_user.created_at,
                    session_duration_minutes=online_user.session_duration_minutes or 0,
                    ip_address=online_user.ip_address,
                    user_agent=online_user.user_agent
                )
                break
        
        if not user_session:
            # User is offline, create offline response
            user_session = UserSessionResponse(
                user_id=user_id,
                tenant_id=user.tenant_id,
                session_id="",
                is_online=False,
                last_activity=user.last_activity_at or user.updated_at,
                session_start=user.last_login_at or user.created_at,
                session_duration_minutes=0
            )
        
        return user_session
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get user session info: {str(e)}"
        )


@router.post("/bulk/offline", response_model=BulkUserStatusResponse)
async def bulk_set_users_offline(
    user_ids: List[UUID],
    current_admin: User = Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    """
    Set multiple users as offline (admin only)
    """
    try:
        updated_count = 0
        failed_count = 0
        errors = []
        
        for user_id in user_ids:
            try:
                success = await online_users_service.set_user_offline(user_id, db)
                if success:
                    updated_count += 1
                else:
                    failed_count += 1
                    errors.append(f"Failed to set user {user_id} offline")
            except Exception as e:
                failed_count += 1
                errors.append(f"Error with user {user_id}: {str(e)}")
        
        return BulkUserStatusResponse(
            success=failed_count == 0,
            message=f"Updated {updated_count} users, {failed_count} failed",
            updated_count=updated_count,
            failed_count=failed_count,
            errors=errors
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to bulk update users: {str(e)}"
        )


# Background task to periodically clean up expired users
async def periodic_cleanup():
    """Background task to clean up expired users every minute"""
    while True:
        try:
            # Get database session
            db = next(get_db())
            
            # Run cleanup
            cleaned_count = await online_users_service.cleanup_expired_users(db)
            
            if cleaned_count > 0:
                print(f"Cleaned up {cleaned_count} expired user sessions")
            
            # Close database session
            db.close()
            
        except Exception as e:
            print(f"Error in periodic cleanup: {e}")
        
        # Wait 1 minute before next cleanup
        await asyncio.sleep(60)


# Background cleanup task can be started manually or via scheduler
# asyncio.create_task(periodic_cleanup()) - This should be started in the application lifespan