"""
WebSocket API endpoints for real-time updates
"""

import uuid
import json
import asyncio
from datetime import datetime
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException
from fastapi import status
from sqlalchemy.orm import Session
from typing import Optional

from ..core.database import get_db
from ..core.auth import get_current_user, get_super_admin_user
from ..models.user import User
from ..services.websocket_manager import websocket_manager, publish_cache_invalidation, publish_data_update

router = APIRouter(prefix="/ws", tags=["WebSocket"])


@router.websocket("/admin")
async def websocket_admin_endpoint(websocket: WebSocket):
    """WebSocket endpoint for admin real-time updates"""
    connection_id = str(uuid.uuid4())
    
    try:
        await websocket_manager.connect(
            websocket=websocket,
            connection_id=connection_id,
            user_type="admin"
        )
        
        while True:
            # Wait for messages from client (like ping responses)
            try:
                data = await asyncio.wait_for(websocket.receive_text(), timeout=30.0)
                message = json.loads(data)
                
                if message.get("type") == "pong":
                    # Update last ping time
                    if connection_id in websocket_manager.connection_info:
                        websocket_manager.connection_info[connection_id]["last_ping"] = datetime.utcnow()
                
            except asyncio.TimeoutError:
                # Send ping to keep connection alive
                ping_message = {
                    "type": "ping",
                    "timestamp": datetime.utcnow().isoformat()
                }
                await websocket.send_text(json.dumps(ping_message))
                
    except WebSocketDisconnect:
        await websocket_manager.disconnect(connection_id)
    except Exception as e:
        await websocket_manager.disconnect(connection_id)
        raise


@router.websocket("/tenant/{tenant_id}")
async def websocket_tenant_endpoint(websocket: WebSocket, tenant_id: str):
    """WebSocket endpoint for tenant-specific real-time updates"""
    connection_id = str(uuid.uuid4())
    
    try:
        await websocket_manager.connect(
            websocket=websocket,
            connection_id=connection_id,
            user_type="tenant",
            tenant_id=tenant_id
        )
        
        while True:
            try:
                data = await asyncio.wait_for(websocket.receive_text(), timeout=30.0)
                message = json.loads(data)
                
                if message.get("type") == "pong":
                    if connection_id in websocket_manager.connection_info:
                        websocket_manager.connection_info[connection_id]["last_ping"] = datetime.utcnow()
                
            except asyncio.TimeoutError:
                ping_message = {
                    "type": "ping",
                    "timestamp": datetime.utcnow().isoformat()
                }
                await websocket.send_text(json.dumps(ping_message))
                
    except WebSocketDisconnect:
        await websocket_manager.disconnect(connection_id)
    except Exception as e:
        await websocket_manager.disconnect(connection_id)
        raise


# HTTP endpoints for manual cache invalidation and testing
@router.post("/invalidate-cache")
async def invalidate_cache_endpoint(
    cache_key: str,
    target_type: str = "all",
    tenant_id: Optional[str] = None,
    current_user: User = Depends(get_super_admin_user)
):
    """Manually invalidate cache (admin only)"""
    try:
        await publish_cache_invalidation(
            cache_key=cache_key,
            target_type=target_type,
            tenant_id=tenant_id
        )
        
        return {
            "success": True,
            "message": f"Cache invalidation sent for key: {cache_key}",
            "target_type": target_type,
            "tenant_id": tenant_id
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to invalidate cache: {str(e)}"
        )


@router.post("/notify-update")
async def notify_update_endpoint(
    update_type: str,
    entity: str,
    data: dict,
    tenant_id: Optional[str] = None,
    current_user: User = Depends(get_super_admin_user)
):
    """Manually send data update notification (admin only)"""
    try:
        await publish_data_update(
            update_type=update_type,
            entity=entity,
            data=data,
            tenant_id=tenant_id
        )
        
        return {
            "success": True,
            "message": f"Update notification sent for {entity}",
            "update_type": update_type,
            "entity": entity,
            "tenant_id": tenant_id
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send update notification: {str(e)}"
        )


@router.get("/stats")
async def get_websocket_stats(current_user: User = Depends(get_super_admin_user)):
    """Get WebSocket connection statistics (admin only)"""
    return {
        "success": True,
        "stats": websocket_manager.get_connection_stats()
    }