"""
Online Users Monitoring Service with Redis Integration
"""
import json
import asyncio
from typing import List, Dict, Optional, Set
from datetime import datetime, timezone, timedelta
from uuid import UUID
import redis.asyncio as redis
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc
from fastapi import WebSocket

from ..core.database import get_db
from ..core.config import settings
from ..models.user_online_status import UserOnlineStatus
from ..models.user import User
from ..models.tenant import Tenant
from ..schemas.online_users_monitoring import (
    OnlineUserResponse, OnlineUsersStatsResponse, 
    TenantOnlineUsersResponse, OnlineUsersWebSocketMessage
)


class OnlineUsersService:
    """Service for managing online users with Redis integration"""
    
    def __init__(self):
        self.redis_client = None
        self.websocket_connections: Set[WebSocket] = set()
        self.redis_key_prefix = "online_users:"
        self.user_activity_key = "user_activity:"
        self.stats_key = "online_stats"
        self.expiration_time = 300  # 5 minutes in seconds
    
    async def get_redis_client(self):
        """Get Redis client connection"""
        if not self.redis_client:
            self.redis_client = redis.Redis(
                host=settings.REDIS_HOST,
                port=settings.REDIS_PORT,
                db=settings.REDIS_DB,
                decode_responses=True
            )
        return self.redis_client
    
    async def update_user_activity(
        self, 
        user_id: UUID, 
        tenant_id: UUID, 
        session_id: str,
        user_agent: Optional[str] = None,
        ip_address: Optional[str] = None,
        db: Session = None
    ) -> bool:
        """Update user activity in Redis and database"""
        try:
            redis_client = await self.get_redis_client()
            
            # Create user activity data
            activity_data = {
                "user_id": str(user_id),
                "tenant_id": str(tenant_id),
                "session_id": session_id,
                "last_activity": datetime.now(timezone.utc).isoformat(),
                "user_agent": user_agent,
                "ip_address": ip_address,
                "is_online": True
            }
            
            # Store in Redis with expiration
            user_key = f"{self.user_activity_key}{user_id}"
            await redis_client.setex(
                user_key, 
                self.expiration_time, 
                json.dumps(activity_data)
            )
            
            # Update database if provided
            if db:
                await self._update_database_status(
                    user_id, tenant_id, session_id, 
                    user_agent, ip_address, db
                )
            
            # Broadcast update to WebSocket connections
            await self._broadcast_user_update(user_id, "activity_update", activity_data)
            
            return True
            
        except Exception as e:
            print(f"Error updating user activity: {e}")
            return False
    
    async def set_user_offline(self, user_id: UUID, db: Session = None) -> bool:
        """Set user as offline"""
        try:
            redis_client = await self.get_redis_client()
            
            # Remove from Redis
            user_key = f"{self.user_activity_key}{user_id}"
            await redis_client.delete(user_key)
            
            # Update database if provided
            if db:
                user_status = db.query(UserOnlineStatus).filter(
                    UserOnlineStatus.user_id == user_id,
                    UserOnlineStatus.is_online == True
                ).first()
                
                if user_status:
                    user_status.set_offline()
                    db.commit()
            
            # Broadcast offline status
            await self._broadcast_user_update(
                user_id, "user_offline", {"user_id": str(user_id)}
            )
            
            return True
            
        except Exception as e:
            print(f"Error setting user offline: {e}")
            return False
    
    async def get_online_users(
        self, 
        tenant_id: Optional[UUID] = None,
        limit: int = 50,
        offset: int = 0,
        db: Session = None
    ) -> List[OnlineUserResponse]:
        """Get list of currently online users"""
        try:
            redis_client = await self.get_redis_client()
            
            # Get all online user keys
            pattern = f"{self.user_activity_key}*"
            keys = await redis_client.keys(pattern)
            
            online_users = []
            
            for key in keys[offset:offset + limit]:
                try:
                    data = await redis_client.get(key)
                    if data:
                        user_data = json.loads(data)
                        
                        # Filter by tenant if specified
                        if tenant_id and user_data.get("tenant_id") != str(tenant_id):
                            continue
                        
                        # Get additional user info from database
                        if db:
                            user_info = await self._get_user_info(
                                UUID(user_data["user_id"]), db
                            )
                            if user_info:
                                user_data.update(user_info)
                        
                        # Calculate session duration
                        last_activity = datetime.fromisoformat(user_data["last_activity"])
                        session_duration = (datetime.now(timezone.utc) - last_activity).total_seconds() / 60
                        user_data["session_duration_minutes"] = int(session_duration)
                        
                        online_users.append(OnlineUserResponse(**user_data))
                        
                except Exception as e:
                    print(f"Error processing user data: {e}")
                    continue
            
            return online_users
            
        except Exception as e:
            print(f"Error getting online users: {e}")
            return []
    
    async def get_online_users_stats(self, db: Session = None) -> OnlineUsersStatsResponse:
        """Get online users statistics"""
        try:
            redis_client = await self.get_redis_client()
            
            # Get all online user keys
            pattern = f"{self.user_activity_key}*"
            keys = await redis_client.keys(pattern)
            
            total_online = len(keys)
            online_by_tenant = {}
            recent_activity_count = 0
            session_durations = []
            
            # Process each online user
            for key in keys:
                try:
                    data = await redis_client.get(key)
                    if data:
                        user_data = json.loads(data)
                        tenant_id = user_data.get("tenant_id")
                        
                        # Count by tenant
                        if tenant_id:
                            online_by_tenant[tenant_id] = online_by_tenant.get(tenant_id, 0) + 1
                        
                        # Check recent activity (last 5 minutes)
                        last_activity = datetime.fromisoformat(user_data["last_activity"])
                        if (datetime.now(timezone.utc) - last_activity).total_seconds() < 300:
                            recent_activity_count += 1
                        
                        # Calculate session duration
                        session_duration = (datetime.now(timezone.utc) - last_activity).total_seconds() / 60
                        session_durations.append(session_duration)
                        
                except Exception as e:
                    print(f"Error processing stats data: {e}")
                    continue
            
            # Get total offline users from database
            total_offline = 0
            if db:
                total_users = db.query(User).filter(User.tenant_id.isnot(None)).count()
                total_offline = max(0, total_users - total_online)
            
            # Calculate average session duration
            avg_session_duration = sum(session_durations) / len(session_durations) if session_durations else 0
            
            # Get peak online today (would need to be stored separately for real implementation)
            peak_online_today = total_online  # Simplified for now
            
            return OnlineUsersStatsResponse(
                total_online_users=total_online,
                total_offline_users=total_offline,
                online_by_tenant=online_by_tenant,
                recent_activity_count=recent_activity_count,
                peak_online_today=peak_online_today,
                average_session_duration=avg_session_duration
            )
            
        except Exception as e:
            print(f"Error getting online users stats: {e}")
            return OnlineUsersStatsResponse(
                total_online_users=0,
                total_offline_users=0,
                online_by_tenant={},
                recent_activity_count=0,
                peak_online_today=0,
                average_session_duration=0
            )
    
    async def get_tenant_online_users(
        self, 
        tenant_id: UUID, 
        db: Session = None
    ) -> TenantOnlineUsersResponse:
        """Get online users for a specific tenant"""
        try:
            # Get online users for tenant
            online_users = await self.get_online_users(tenant_id=tenant_id, db=db)
            
            # Get tenant info
            tenant_name = "Unknown Tenant"
            total_users = 0
            
            if db:
                tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
                if tenant:
                    tenant_name = tenant.name
                    total_users = db.query(User).filter(User.tenant_id == tenant_id).count()
            
            online_count = len(online_users)
            offline_count = max(0, total_users - online_count)
            
            return TenantOnlineUsersResponse(
                tenant_id=tenant_id,
                tenant_name=tenant_name,
                online_users_count=online_count,
                offline_users_count=offline_count,
                users=online_users
            )
            
        except Exception as e:
            print(f"Error getting tenant online users: {e}")
            return TenantOnlineUsersResponse(
                tenant_id=tenant_id,
                tenant_name="Error",
                online_users_count=0,
                offline_users_count=0,
                users=[]
            )
    
    async def cleanup_expired_users(self, db: Session = None):
        """Clean up expired user sessions"""
        try:
            redis_client = await self.get_redis_client()
            
            # Get all user keys
            pattern = f"{self.user_activity_key}*"
            keys = await redis_client.keys(pattern)
            
            expired_users = []
            
            for key in keys:
                try:
                    data = await redis_client.get(key)
                    if data:
                        user_data = json.loads(data)
                        last_activity = datetime.fromisoformat(user_data["last_activity"])
                        
                        # Check if expired (more than 5 minutes)
                        if (datetime.now(timezone.utc) - last_activity).total_seconds() > self.expiration_time:
                            user_id = UUID(user_data["user_id"])
                            expired_users.append(user_id)
                            
                            # Remove from Redis
                            await redis_client.delete(key)
                            
                            # Update database
                            if db:
                                user_status = db.query(UserOnlineStatus).filter(
                                    UserOnlineStatus.user_id == user_id,
                                    UserOnlineStatus.is_online == True
                                ).first()
                                
                                if user_status:
                                    user_status.set_offline()
                            
                            # Broadcast offline status
                            await self._broadcast_user_update(
                                user_id, "user_offline", {"user_id": str(user_id)}
                            )
                            
                except Exception as e:
                    print(f"Error processing expired user: {e}")
                    continue
            
            if db and expired_users:
                db.commit()
            
            return len(expired_users)
            
        except Exception as e:
            print(f"Error cleaning up expired users: {e}")
            return 0
    
    async def add_websocket_connection(self, websocket: WebSocket):
        """Add WebSocket connection for real-time updates"""
        self.websocket_connections.add(websocket)
    
    async def remove_websocket_connection(self, websocket: WebSocket):
        """Remove WebSocket connection"""
        self.websocket_connections.discard(websocket)
    
    async def _update_database_status(
        self, 
        user_id: UUID, 
        tenant_id: UUID, 
        session_id: str,
        user_agent: Optional[str],
        ip_address: Optional[str],
        db: Session
    ):
        """Update user online status in database"""
        try:
            # Find existing status or create new one
            user_status = db.query(UserOnlineStatus).filter(
                UserOnlineStatus.user_id == user_id,
                UserOnlineStatus.session_id == session_id
            ).first()
            
            if user_status:
                user_status.update_activity()
                if user_agent:
                    user_status.user_agent = user_agent
                if ip_address:
                    user_status.ip_address = ip_address
            else:
                user_status = UserOnlineStatus(
                    user_id=user_id,
                    tenant_id=tenant_id,
                    session_id=session_id,
                    user_agent=user_agent,
                    ip_address=ip_address,
                    is_online=True
                )
                db.add(user_status)
            
            db.commit()
            
        except Exception as e:
            print(f"Error updating database status: {e}")
            db.rollback()
    
    async def _get_user_info(self, user_id: UUID, db: Session) -> Optional[Dict]:
        """Get additional user information from database"""
        try:
            user = db.query(User).filter(User.id == user_id).first()
            if user:
                tenant = db.query(Tenant).filter(Tenant.id == user.tenant_id).first()
                return {
                    "user_email": user.email,
                    "user_full_name": user.full_name,
                    "tenant_name": tenant.name if tenant else "Unknown",
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            return None
            
        except Exception as e:
            print(f"Error getting user info: {e}")
            return None
    
    async def _broadcast_user_update(self, user_id: UUID, message_type: str, data: Dict):
        """Broadcast user update to all WebSocket connections"""
        if not self.websocket_connections:
            return
        
        message = OnlineUsersWebSocketMessage(
            type=message_type,
            data=data
        )
        
        # Send to all connected clients
        disconnected = set()
        for websocket in self.websocket_connections:
            try:
                await websocket.send_text(message.json())
            except Exception:
                disconnected.add(websocket)
        
        # Remove disconnected clients
        for websocket in disconnected:
            self.websocket_connections.discard(websocket)


# Global service instance
online_users_service = OnlineUsersService()