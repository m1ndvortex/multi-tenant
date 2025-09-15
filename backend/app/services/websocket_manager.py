"""
WebSocket Connection Manager for Real-Time Updates
Handles cache invalidation and data synchronization
"""

import json
import asyncio
import logging
from typing import Dict, List, Set, Any, Optional
from fastapi import WebSocket, WebSocketDisconnect
from datetime import datetime
import uuid
import redis.asyncio as redis
from ..core.redis_client import redis_client
from ..core.config import settings

logger = logging.getLogger(__name__)


class WebSocketConnectionManager:
    """Manages WebSocket connections and real-time updates"""
    
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.connection_info: Dict[str, Dict[str, Any]] = {}
        self.admin_connections: Set[str] = set()
        self.tenant_connections: Dict[str, Set[str]] = {}  # tenant_id -> connection_ids
        self.redis_pubsub = None
        self.pubsub_task = None
        
    async def connect(self, websocket: WebSocket, connection_id: str, user_type: str = "admin", user_id: Optional[str] = None, tenant_id: Optional[str] = None):
        """Connect a new WebSocket client"""
        try:
            await websocket.accept()
            
            self.active_connections[connection_id] = websocket
            self.connection_info[connection_id] = {
                "user_type": user_type,
                "user_id": user_id,
                "tenant_id": tenant_id,
                "connected_at": datetime.utcnow(),
                "last_ping": datetime.utcnow()
            }
            
            if user_type == "admin":
                self.admin_connections.add(connection_id)
            elif user_type == "tenant" and tenant_id:
                if tenant_id not in self.tenant_connections:
                    self.tenant_connections[tenant_id] = set()
                self.tenant_connections[tenant_id].add(connection_id)
            
            # Start Redis pub/sub listener if not already running
            if not self.pubsub_task:
                await self.start_redis_listener()
                
            logger.info(f"WebSocket connected: {connection_id} ({user_type})")
            
            # Send initial connection confirmation
            await self.send_personal_message(connection_id, {
                "type": "connection_established",
                "connection_id": connection_id,
                "timestamp": datetime.utcnow().isoformat()
            })
            
        except Exception as e:
            logger.error(f"WebSocket connection error: {e}")
            raise
    
    async def disconnect(self, connection_id: str):
        """Disconnect a WebSocket client"""
        if connection_id in self.active_connections:
            # Remove from connection tracking
            connection_info = self.connection_info.get(connection_id, {})
            user_type = connection_info.get("user_type")
            tenant_id = connection_info.get("tenant_id")
            
            if user_type == "admin":
                self.admin_connections.discard(connection_id)
            elif user_type == "tenant" and tenant_id:
                if tenant_id in self.tenant_connections:
                    self.tenant_connections[tenant_id].discard(connection_id)
                    if not self.tenant_connections[tenant_id]:
                        del self.tenant_connections[tenant_id]
            
            # Clean up
            del self.active_connections[connection_id]
            del self.connection_info[connection_id]
            
            logger.info(f"WebSocket disconnected: {connection_id}")
            
            # Stop Redis listener if no connections
            if not self.active_connections and self.pubsub_task:
                await self.stop_redis_listener()
    
    async def send_personal_message(self, connection_id: str, message: dict):
        """Send message to specific connection"""
        if connection_id in self.active_connections:
            try:
                websocket = self.active_connections[connection_id]
                await websocket.send_text(json.dumps(message))
            except Exception as e:
                logger.error(f"Error sending message to {connection_id}: {e}")
                await self.disconnect(connection_id)
    
    async def broadcast_to_admins(self, message: dict):
        """Broadcast message to all admin connections"""
        if self.admin_connections:
            tasks = []
            for connection_id in list(self.admin_connections):
                tasks.append(self.send_personal_message(connection_id, message))
            await asyncio.gather(*tasks, return_exceptions=True)
    
    async def broadcast_to_tenant(self, tenant_id: str, message: dict):
        """Broadcast message to all connections for specific tenant"""
        if tenant_id in self.tenant_connections:
            tasks = []
            for connection_id in list(self.tenant_connections[tenant_id]):
                tasks.append(self.send_personal_message(connection_id, message))
            await asyncio.gather(*tasks, return_exceptions=True)
    
    async def broadcast_cache_invalidation(self, cache_key: str, data: Optional[dict] = None, target_type: str = "all", tenant_id: Optional[str] = None):
        """Broadcast cache invalidation to appropriate connections"""
        message = {
            "type": "cache_invalidation",
            "cache_key": cache_key,
            "data": data,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        if target_type == "admin" or target_type == "all":
            await self.broadcast_to_admins(message)
        
        if target_type == "tenant" and tenant_id:
            await self.broadcast_to_tenant(tenant_id, message)
        elif target_type == "all":
            # Broadcast to all tenants
            for tid in self.tenant_connections:
                await self.broadcast_to_tenant(tid, message)

        # Additionally, emit a lightweight data_update for common entities inferred from cache key
        try:
            inferred_entity = None
            key_lower = cache_key.lower()
            if any(k in key_lower for k in ("invoice", "invoices")):
                inferred_entity = "invoice"
            elif any(k in key_lower for k in ("customer", "customers")):
                inferred_entity = "customer"
            elif any(k in key_lower for k in ("product", "products")):
                inferred_entity = "product"
            elif "dashboard" in key_lower:
                inferred_entity = "dashboard"
            elif any(k in key_lower for k in ("installment", "installments")):
                inferred_entity = "installment"

            if inferred_entity:
                update_payload = {
                    "source": "cache_invalidation",
                    "cache_key": cache_key,
                    "meta": (data or {})
                }
                if target_type == "tenant" and tenant_id:
                    await self.notify_data_update("update", inferred_entity, update_payload, tenant_id=tenant_id)
                elif target_type == "all":
                    # Notify all current tenant connections
                    for tid in self.tenant_connections:
                        await self.notify_data_update("update", inferred_entity, update_payload, tenant_id=tid)
                else:
                    # Admin-only invalidations still notify admins
                    await self.notify_data_update("update", inferred_entity, update_payload, tenant_id=None)
        except Exception as e:
            logger.error(f"Failed to emit inferred data_update for cache key {cache_key}: {e}")
    
    async def notify_data_update(self, update_type: str, entity: str, data: dict, tenant_id: Optional[str] = None):
        """Notify about data updates"""
        message = {
            "type": "data_update",
            "update_type": update_type,  # create, update, delete
            "entity": entity,  # tenant, user, subscription, etc.
            "data": data,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Always notify admins
        await self.broadcast_to_admins(message)
        
        # Notify specific tenant if applicable
        if tenant_id:
            await self.broadcast_to_tenant(tenant_id, message)
    
    async def start_redis_listener(self):
        """Start Redis pub/sub listener for external cache invalidation"""
        try:
            # Create Redis connection for pub/sub
            self.redis_pubsub = redis.from_url(settings.redis_url).pubsub()
            # Use pattern subscription so we can listen to all dynamic channels
            await self.redis_pubsub.psubscribe(
                "cache_invalidation:*",
                "data_update:*",
                "system_notification:*"
            )
            
            # Start background task
            self.pubsub_task = asyncio.create_task(self._redis_listener())
            logger.info("Redis pub/sub listener started")
            
        except Exception as e:
            logger.error(f"Failed to start Redis listener: {e}")
    
    async def stop_redis_listener(self):
        """Stop Redis pub/sub listener"""
        if self.pubsub_task:
            self.pubsub_task.cancel()
            try:
                await self.pubsub_task
            except asyncio.CancelledError:
                pass
            self.pubsub_task = None
        
        if self.redis_pubsub:
            # Use punsubscribe to match psubscribe used when starting listener
            try:
                await self.redis_pubsub.punsubscribe()
            except Exception:
                # Fallback in case implementation requires unsubscribe
                await self.redis_pubsub.unsubscribe()
            await self.redis_pubsub.close()
            self.redis_pubsub = None
            
        logger.info("Redis pub/sub listener stopped")
    
    async def _redis_listener(self):
        """Background task to listen for Redis pub/sub messages"""
        try:
            async for message in self.redis_pubsub.listen():
                # Handle both direct and pattern messages
                if message['type'] in ('message', 'pmessage'):
                    try:
                        # Parse channel and data
                        channel = message['channel'].decode('utf-8') if isinstance(message.get('channel'), (bytes, bytearray)) else str(message.get('channel'))
                        data = json.loads(message['data'].decode('utf-8'))
                        
                        if channel.startswith('cache_invalidation:'):
                            cache_key = channel.replace('cache_invalidation:', '')
                            await self.broadcast_cache_invalidation(
                                cache_key, 
                                data.get('data'),
                                data.get('target_type', 'all'),
                                data.get('tenant_id')
                            )
                        
                        elif channel.startswith('data_update:'):
                            await self.notify_data_update(
                                data.get('update_type'),
                                data.get('entity'),
                                data.get('data'),
                                data.get('tenant_id')
                            )
                        
                        elif channel.startswith('system_notification:'):
                            await self.broadcast_to_admins({
                                "type": "system_notification",
                                "data": data,
                                "timestamp": datetime.utcnow().isoformat()
                            })
                            
                    except Exception as e:
                        logger.error(f"Error processing Redis message: {e}")
                        
        except asyncio.CancelledError:
            logger.info("Redis listener task cancelled")
        except Exception as e:
            logger.error(f"Redis listener error: {e}")
    
    async def ping_connections(self):
        """Send ping to all connections to keep them alive"""
        if self.active_connections:
            ping_message = {
                "type": "ping",
                "timestamp": datetime.utcnow().isoformat()
            }
            
            tasks = []
            for connection_id in list(self.active_connections.keys()):
                tasks.append(self.send_personal_message(connection_id, ping_message))
            
            await asyncio.gather(*tasks, return_exceptions=True)
    
    def get_connection_stats(self) -> dict:
        """Get connection statistics"""
        return {
            "total_connections": len(self.active_connections),
            "admin_connections": len(self.admin_connections),
            "tenant_connections": sum(len(conns) for conns in self.tenant_connections.values()),
            "tenants_with_connections": len(self.tenant_connections),
            "redis_listener_active": self.pubsub_task is not None and not self.pubsub_task.done()
        }


# Global WebSocket manager instance
websocket_manager = WebSocketConnectionManager()


# Helper functions for Redis pub/sub
async def publish_cache_invalidation(cache_key: str, data: Optional[dict] = None, target_type: str = "all", tenant_id: Optional[str] = None):
    """Publish cache invalidation event to Redis"""
    try:
        message = {
            "data": data,
            "target_type": target_type,
            "tenant_id": tenant_id,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        redis_conn = redis.from_url(settings.redis_url)
        await redis_conn.publish(f"cache_invalidation:{cache_key}", json.dumps(message))
        await redis_conn.close()
        
    except Exception as e:
        logger.error(f"Failed to publish cache invalidation: {e}")


async def publish_data_update(update_type: str, entity: str, data: dict, tenant_id: Optional[str] = None):
    """Publish data update event to Redis"""
    try:
        message = {
            "update_type": update_type,
            "entity": entity,
            "data": data,
            "tenant_id": tenant_id,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        redis_conn = redis.from_url(settings.redis_url)
        await redis_conn.publish(f"data_update:{entity}", json.dumps(message))
        await redis_conn.close()
        
    except Exception as e:
        logger.error(f"Failed to publish data update: {e}")