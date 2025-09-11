"""
Unit tests for Online Users Monitoring System
"""
import pytest
import asyncio
import json
from datetime import datetime, timezone, timedelta
from uuid import uuid4, UUID
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi.testclient import TestClient
from fastapi import WebSocket
from sqlalchemy.orm import Session

from app.main import app
from app.models.user import User, UserRole, UserStatus
from app.models.tenant import Tenant, SubscriptionType
from app.models.user_online_status import UserOnlineStatus
from app.services.online_users_service import OnlineUsersService, online_users_service
from app.schemas.online_users_monitoring import (
    UserActivityUpdateRequest,
    OnlineUserResponse,
    OnlineUsersStatsResponse,
    TenantOnlineUsersResponse
)


class TestOnlineUsersService:
    """Test cases for OnlineUsersService"""
    
    @pytest.fixture
    def service(self):
        """Create a fresh service instance for testing"""
        return OnlineUsersService()
    
    @pytest.fixture
    def mock_redis(self):
        """Mock Redis client"""
        mock_redis = AsyncMock()
        mock_redis.setex = AsyncMock(return_value=True)
        mock_redis.get = AsyncMock(return_value=None)
        mock_redis.delete = AsyncMock(return_value=True)
        mock_redis.keys = AsyncMock(return_value=[])
        return mock_redis
    
    @pytest.fixture
    def sample_user_data(self):
        """Sample user data for testing"""
        return {
            "user_id": str(uuid4()),
            "tenant_id": str(uuid4()),
            "session_id": "test_session_123",
            "last_activity": datetime.now(timezone.utc).isoformat(),
            "user_agent": "Mozilla/5.0 Test Browser",
            "ip_address": "192.168.1.100",
            "is_online": True
        }
    
    @pytest.mark.asyncio
    async def test_update_user_activity_success(self, service, mock_redis, sample_user_data, db_session):
        """Test successful user activity update"""
        # Mock Redis client
        with patch.object(service, 'get_redis_client', return_value=mock_redis):
            with patch.object(service, '_update_database_status', new_callable=AsyncMock) as mock_db_update:
                with patch.object(service, '_broadcast_user_update', new_callable=AsyncMock) as mock_broadcast:
                    
                    result = await service.update_user_activity(
                        user_id=UUID(sample_user_data["user_id"]),
                        tenant_id=UUID(sample_user_data["tenant_id"]),
                        session_id=sample_user_data["session_id"],
                        user_agent=sample_user_data["user_agent"],
                        ip_address=sample_user_data["ip_address"],
                        db=db_session
                    )
                    
                    assert result is True
                    mock_redis.setex.assert_called_once()
                    mock_db_update.assert_called_once()
                    mock_broadcast.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_set_user_offline_success(self, service, mock_redis, sample_user_data, db_session, test_tenant, test_user):
        """Test setting user offline"""
        # Create a mock user online status in database
        user_status = UserOnlineStatus(
            user_id=test_user.id,
            tenant_id=test_tenant.id,
            session_id=sample_user_data["session_id"],
            is_online=True
        )
        db_session.add(user_status)
        db_session.commit()
        
        with patch.object(service, 'get_redis_client', return_value=mock_redis):
            with patch.object(service, '_broadcast_user_update', new_callable=AsyncMock) as mock_broadcast:
                
                result = await service.set_user_offline(test_user.id, db_session)
                
                assert result is True
                mock_redis.delete.assert_called_once()
                mock_broadcast.assert_called_once()
                
                # Check database update
                updated_status = db_session.query(UserOnlineStatus).filter(
                    UserOnlineStatus.user_id == test_user.id
                ).first()
                assert updated_status.is_online is False
    
    @pytest.mark.asyncio
    async def test_get_online_users_empty(self, service, mock_redis):
        """Test getting online users when none are online"""
        mock_redis.keys.return_value = []
        
        with patch.object(service, 'get_redis_client', return_value=mock_redis):
            result = await service.get_online_users()
            
            assert result == []
            mock_redis.keys.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_get_online_users_with_data(self, service, mock_redis, sample_user_data, db_session, test_tenant, test_user):
        """Test getting online users with actual data"""
        # Update sample data to use test fixtures
        sample_user_data["user_id"] = str(test_user.id)
        sample_user_data["tenant_id"] = str(test_tenant.id)
        
        # Setup mock Redis data
        user_key = f"user_activity:{test_user.id}"
        mock_redis.keys.return_value = [user_key]
        mock_redis.get.return_value = json.dumps(sample_user_data)
        
        with patch.object(service, 'get_redis_client', return_value=mock_redis):
            result = await service.get_online_users(db=db_session)
            
            assert len(result) == 1
            assert result[0].user_id == test_user.id
            assert result[0].tenant_id == test_tenant.id
            assert result[0].is_online is True
    
    @pytest.mark.asyncio
    async def test_get_online_users_stats(self, service, mock_redis, sample_user_data, db_session, test_tenant, test_user):
        """Test getting online users statistics"""
        # Update sample data to use test fixtures
        sample_user_data["user_id"] = str(test_user.id)
        sample_user_data["tenant_id"] = str(test_tenant.id)
        
        # Setup mock Redis data
        user_key = f"user_activity:{test_user.id}"
        mock_redis.keys.return_value = [user_key]
        mock_redis.get.return_value = json.dumps(sample_user_data)
        
        with patch.object(service, 'get_redis_client', return_value=mock_redis):
            result = await service.get_online_users_stats(db_session)
            
            assert isinstance(result, OnlineUsersStatsResponse)
            assert result.total_online_users == 1
            assert result.total_offline_users >= 0
            assert str(test_tenant.id) in result.online_by_tenant
    
    @pytest.mark.asyncio
    async def test_cleanup_expired_users(self, service, mock_redis, sample_user_data, db_session, test_tenant, test_user):
        """Test cleanup of expired user sessions"""
        # Create expired user data (more than 5 minutes old)
        expired_time = datetime.now(timezone.utc) - timedelta(minutes=10)
        expired_data = sample_user_data.copy()
        expired_data["user_id"] = str(test_user.id)
        expired_data["tenant_id"] = str(test_tenant.id)
        expired_data["last_activity"] = expired_time.isoformat()
        
        user_key = f"user_activity:{test_user.id}"
        mock_redis.keys.return_value = [user_key]
        mock_redis.get.return_value = json.dumps(expired_data)
        
        # Create user online status in database
        user_status = UserOnlineStatus(
            user_id=test_user.id,
            tenant_id=test_tenant.id,
            session_id=sample_user_data["session_id"],
            is_online=True
        )
        db_session.add(user_status)
        db_session.commit()
        
        with patch.object(service, 'get_redis_client', return_value=mock_redis):
            with patch.object(service, '_broadcast_user_update', new_callable=AsyncMock):
                
                result = await service.cleanup_expired_users(db_session)
                
                assert result == 1  # One user cleaned up
                mock_redis.delete.assert_called_once_with(user_key)
                
                # Check database update
                updated_status = db_session.query(UserOnlineStatus).filter(
                    UserOnlineStatus.user_id == test_user.id
                ).first()
                assert updated_status.is_online is False
    
    @pytest.mark.asyncio
    async def test_websocket_connection_management(self, service):
        """Test WebSocket connection management"""
        mock_websocket = MagicMock(spec=WebSocket)
        
        # Test adding connection
        await service.add_websocket_connection(mock_websocket)
        assert mock_websocket in service.websocket_connections
        
        # Test removing connection
        await service.remove_websocket_connection(mock_websocket)
        assert mock_websocket not in service.websocket_connections
    
    @pytest.mark.asyncio
    async def test_broadcast_user_update(self, service):
        """Test broadcasting user updates to WebSocket connections"""
        mock_websocket1 = AsyncMock(spec=WebSocket)
        mock_websocket2 = AsyncMock(spec=WebSocket)
        
        # Add connections
        service.websocket_connections.add(mock_websocket1)
        service.websocket_connections.add(mock_websocket2)
        
        test_data = {"user_id": str(uuid4()), "status": "online"}
        
        await service._broadcast_user_update(
            UUID(test_data["user_id"]), "user_online", test_data
        )
        
        # Both connections should receive the message
        mock_websocket1.send_text.assert_called_once()
        mock_websocket2.send_text.assert_called_once()


class TestOnlineUsersAPI:
    """Test cases for Online Users Monitoring API endpoints"""
    
    @pytest.fixture
    def client(self):
        """Create test client"""
        return TestClient(app)
    
    @pytest.fixture
    def super_admin_headers(self, super_admin_token):
        """Headers with super admin authentication"""
        return {"Authorization": f"Bearer {super_admin_token}"}
    
    @pytest.fixture
    def user_headers(self, user_token):
        """Headers with regular user authentication"""
        return {"Authorization": f"Bearer {user_token}"}
    
    def test_update_user_activity_success(self, client, user_headers, db_session):
        """Test successful user activity update"""
        activity_data = {
            "session_id": "test_session_123",
            "user_agent": "Mozilla/5.0 Test Browser",
            "ip_address": "192.168.1.100"
        }
        
        with patch.object(online_users_service, 'update_user_activity', new_callable=AsyncMock) as mock_update:
            mock_update.return_value = True
            
            response = client.post(
                "/api/online-users/activity/update",
                json=activity_data,
                headers=user_headers
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert "user_id" in data
    
    def test_update_user_activity_unauthorized(self, client):
        """Test user activity update without authentication"""
        activity_data = {
            "session_id": "test_session_123",
            "user_agent": "Mozilla/5.0 Test Browser"
        }
        
        response = client.post(
            "/api/online-users/activity/update",
            json=activity_data
        )
        
        # Could be 401 (unauthorized) or 403 (forbidden) depending on middleware
        assert response.status_code in [401, 403]
    
    def test_get_online_users_success(self, client, super_admin_headers):
        """Test getting online users list"""
        mock_users = [
            OnlineUserResponse(
                id=uuid4(),
                user_id=uuid4(),
                tenant_id=uuid4(),
                user_email="test@example.com",
                user_full_name="Test User",
                tenant_name="Test Tenant",
                is_online=True,
                last_activity=datetime.now(timezone.utc),
                session_id="test_session",
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc)
            )
        ]
        
        with patch.object(online_users_service, 'get_online_users', new_callable=AsyncMock) as mock_get:
            mock_get.return_value = mock_users
            
            response = client.get(
                "/api/online-users/users",
                headers=super_admin_headers
            )
            
            assert response.status_code == 200
            data = response.json()
            assert len(data) == 1
            assert data[0]["user_email"] == "test@example.com"
    
    def test_get_online_users_unauthorized(self, client, user_headers):
        """Test getting online users without super admin access"""
        response = client.get(
            "/api/online-users/users",
            headers=user_headers
        )
        
        assert response.status_code == 403  # Forbidden for non-super-admin
    
    def test_get_online_users_stats_success(self, client, super_admin_headers):
        """Test getting online users statistics"""
        mock_stats = OnlineUsersStatsResponse(
            total_online_users=5,
            total_offline_users=10,
            online_by_tenant={"tenant1": 3, "tenant2": 2},
            recent_activity_count=4,
            peak_online_today=8,
            average_session_duration=45.5
        )
        
        with patch.object(online_users_service, 'get_online_users_stats', new_callable=AsyncMock) as mock_stats_func:
            mock_stats_func.return_value = mock_stats
            
            response = client.get(
                "/api/online-users/stats",
                headers=super_admin_headers
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["total_online_users"] == 5
            assert data["total_offline_users"] == 10
            assert "online_by_tenant" in data
    
    def test_set_user_offline_success(self, client, super_admin_headers):
        """Test manually setting user offline"""
        user_id = uuid4()
        
        with patch.object(online_users_service, 'set_user_offline', new_callable=AsyncMock) as mock_offline:
            mock_offline.return_value = True
            
            response = client.post(
                f"/api/online-users/users/{user_id}/offline",
                headers=super_admin_headers
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert data["user_id"] == str(user_id)
    
    def test_get_tenant_online_users_success(self, client, super_admin_headers):
        """Test getting online users for specific tenant"""
        tenant_id = uuid4()
        mock_tenant_users = TenantOnlineUsersResponse(
            tenant_id=tenant_id,
            tenant_name="Test Tenant",
            online_users_count=3,
            offline_users_count=2,
            users=[]
        )
        
        with patch.object(online_users_service, 'get_tenant_online_users', new_callable=AsyncMock) as mock_get:
            mock_get.return_value = mock_tenant_users
            
            response = client.get(
                f"/api/online-users/tenants/{tenant_id}",
                headers=super_admin_headers
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["tenant_name"] == "Test Tenant"
            assert data["online_users_count"] == 3
    
    def test_cleanup_expired_users_success(self, client, super_admin_headers):
        """Test manual cleanup of expired users"""
        response = client.post(
            "/api/online-users/cleanup",
            headers=super_admin_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "cleanup task started" in data["message"].lower()
    
    def test_bulk_set_users_offline_success(self, client, super_admin_headers):
        """Test bulk setting users offline"""
        user_ids = [str(uuid4()), str(uuid4()), str(uuid4())]
        
        with patch.object(online_users_service, 'set_user_offline', new_callable=AsyncMock) as mock_offline:
            mock_offline.return_value = True
            
            response = client.post(
                "/api/online-users/bulk/offline",
                json=user_ids,
                headers=super_admin_headers
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert data["updated_count"] == 3
            assert data["failed_count"] == 0


class TestUserOnlineStatusModel:
    """Test cases for UserOnlineStatus model"""
    
    def test_create_user_online_status(self, db_session, test_tenant, test_user):
        """Test creating user online status record"""
        status = UserOnlineStatus(
            user_id=test_user.id,
            tenant_id=test_tenant.id,
            session_id="test_session_123",
            user_agent="Mozilla/5.0 Test Browser",
            ip_address="192.168.1.100",
            is_online=True
        )
        
        db_session.add(status)
        db_session.commit()
        
        # Verify creation
        saved_status = db_session.query(UserOnlineStatus).filter(
            UserOnlineStatus.user_id == test_user.id
        ).first()
        
        assert saved_status is not None
        assert saved_status.user_id == test_user.id
        assert saved_status.tenant_id == test_tenant.id
        assert saved_status.session_id == "test_session_123"
        assert saved_status.is_online is True
    
    def test_update_activity(self, db_session, test_tenant, test_user):
        """Test updating user activity"""
        status = UserOnlineStatus(
            user_id=test_user.id,
            tenant_id=test_tenant.id,
            session_id="test_session",
            is_online=True
        )
        
        db_session.add(status)
        db_session.commit()
        
        original_activity = status.last_activity
        
        # Update activity
        status.update_activity()
        db_session.commit()
        
        assert status.last_activity > original_activity
    
    def test_set_offline(self, db_session, test_tenant, test_user):
        """Test setting user offline"""
        status = UserOnlineStatus(
            user_id=test_user.id,
            tenant_id=test_tenant.id,
            session_id="test_session",
            is_online=True
        )
        
        db_session.add(status)
        db_session.commit()
        
        # Set offline
        status.set_offline()
        db_session.commit()
        
        assert status.is_online is False
    
    def test_set_online(self, db_session, test_tenant, test_user):
        """Test setting user online"""
        status = UserOnlineStatus(
            user_id=test_user.id,
            tenant_id=test_tenant.id,
            session_id="test_session",
            is_online=False
        )
        
        db_session.add(status)
        db_session.commit()
        
        original_activity = status.last_activity
        
        # Set online
        status.set_online()
        db_session.commit()
        
        assert status.is_online is True
        assert status.last_activity > original_activity
    
    def test_to_dict(self, db_session, test_tenant, test_user):
        """Test converting model to dictionary"""
        status = UserOnlineStatus(
            user_id=test_user.id,
            tenant_id=test_tenant.id,
            session_id="test_session",
            user_agent="Test Browser",
            ip_address="192.168.1.100",
            is_online=True
        )
        
        db_session.add(status)
        db_session.commit()
        
        status_dict = status.to_dict()
        
        assert status_dict["user_id"] == str(test_user.id)
        assert status_dict["tenant_id"] == str(test_tenant.id)
        assert status_dict["session_id"] == "test_session"
        assert status_dict["is_online"] is True
        assert "last_activity" in status_dict
        assert "created_at" in status_dict


class TestRedisIntegration:
    """Test cases for Redis integration"""
    
    @pytest.mark.asyncio
    async def test_redis_user_activity_storage(self):
        """Test storing user activity in Redis"""
        service = OnlineUsersService()
        
        # Mock Redis operations
        mock_redis = AsyncMock()
        mock_redis.setex = AsyncMock(return_value=True)
        mock_redis.get = AsyncMock(return_value=None)
        
        user_data = {
            "user_id": str(uuid4()),
            "tenant_id": str(uuid4()),
            "session_id": "test_session",
            "is_online": True
        }
        
        with patch.object(service, 'get_redis_client', return_value=mock_redis):
            with patch.object(service, '_update_database_status', new_callable=AsyncMock):
                with patch.object(service, '_broadcast_user_update', new_callable=AsyncMock):
                    
                    result = await service.update_user_activity(
                        user_id=UUID(user_data["user_id"]),
                        tenant_id=UUID(user_data["tenant_id"]),
                        session_id=user_data["session_id"]
                    )
                    
                    assert result is True
                    mock_redis.setex.assert_called_once()
                    
                    # Verify the key and expiration time
                    call_args = mock_redis.setex.call_args
                    assert call_args[0][1] == 300  # 5 minutes expiration
    
    @pytest.mark.asyncio
    async def test_redis_key_expiration(self):
        """Test Redis key expiration for automatic cleanup"""
        service = OnlineUsersService()
        
        # Test that keys expire after 5 minutes
        assert service.expiration_time == 300
        
        # Test cleanup logic
        expired_data = {
            "user_id": str(uuid4()),
            "last_activity": (datetime.now(timezone.utc) - timedelta(minutes=10)).isoformat()
        }
        
        mock_redis = AsyncMock()
        mock_redis.keys.return_value = ["user_activity:test_user"]
        mock_redis.get.return_value = json.dumps(expired_data)
        mock_redis.delete = AsyncMock(return_value=True)
        
        with patch.object(service, 'get_redis_client', return_value=mock_redis):
            with patch.object(service, '_broadcast_user_update', new_callable=AsyncMock):
                
                cleaned_count = await service.cleanup_expired_users()
                
                assert cleaned_count == 1
                mock_redis.delete.assert_called_once()


if __name__ == "__main__":
    pytest.main([__file__, "-v"])