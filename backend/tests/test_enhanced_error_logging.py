"""
Comprehensive tests for Enhanced Real-Time Error Logging System
Tests real-time WebSocket functionality, active error retrieval, and error resolution
"""

import pytest
import asyncio
import json
import uuid
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from fastapi import WebSocket
from sqlalchemy.orm import Session
from unittest.mock import Mock, patch, AsyncMock

from app.main import app
from app.core.database import get_db, SessionLocal
from app.models.api_error_log import APIErrorLog, ErrorSeverity, ErrorCategory
from app.models.user import User, UserRole, UserStatus
from app.models.tenant import Tenant, SubscriptionType, TenantStatus
from app.services.error_logging_service import ErrorLoggingService
from app.api.error_logging import error_connection_manager
from app.core.auth import get_super_admin_user


class TestEnhancedErrorLogging:
    """Test suite for enhanced real-time error logging functionality"""
    
    @pytest.fixture
    def db_session(self):
        """Create a test database session"""
        db = SessionLocal()
        try:
            yield db
        finally:
            db.close()
    
    @pytest.fixture
    def test_client(self):
        """Create a test client"""
        return TestClient(app)
    
    @pytest.fixture
    def super_admin_user(self, db_session):
        """Create a test super admin user"""
        admin_user = User(
            id=uuid.uuid4(),
            email="admin@hesaabplus.com",
            first_name="Super",
            last_name="Admin",
            password_hash="hashed_password",
            role=UserRole.OWNER,  # Use valid UserRole enum value
            status=UserStatus.ACTIVE,  # Use valid UserStatus enum value
            is_super_admin=True
        )
        db_session.add(admin_user)
        db_session.commit()
        db_session.refresh(admin_user)
        return admin_user
    
    @pytest.fixture
    def test_tenant(self, db_session):
        """Create a test tenant"""
        # Use unique domain to avoid conflicts
        unique_id = str(uuid.uuid4())[:8]
        tenant = Tenant(
            id=uuid.uuid4(),
            name=f"Test Tenant {unique_id}",
            email=f"tenant-{unique_id}@test.com",
            domain=f"test-{unique_id}.hesaabplus.com",
            subscription_type=SubscriptionType.PRO,
            status=TenantStatus.ACTIVE
        )
        db_session.add(tenant)
        db_session.commit()
        db_session.refresh(tenant)
        return tenant
    
    @pytest.fixture
    def sample_error_logs(self, db_session, test_tenant):
        """Create sample error logs for testing"""
        errors = []
        
        # Create critical error
        critical_error = APIErrorLog(
            id=uuid.uuid4(),
            tenant_id=test_tenant.id,
            error_message="Database connection failed",
            error_type="DatabaseError",
            endpoint="/api/customers",
            method="GET",
            status_code=500,
            severity=ErrorSeverity.CRITICAL,
            category=ErrorCategory.DATABASE,
            is_resolved=False,
            occurrence_count=1,
            first_occurrence=datetime.utcnow(),
            last_occurrence=datetime.utcnow()
        )
        errors.append(critical_error)
        
        # Create high priority error
        high_error = APIErrorLog(
            id=uuid.uuid4(),
            tenant_id=test_tenant.id,
            error_message="Authentication failed",
            error_type="AuthenticationError",
            endpoint="/api/auth/login",
            method="POST",
            status_code=401,
            severity=ErrorSeverity.HIGH,
            category=ErrorCategory.AUTHENTICATION,
            is_resolved=False,
            occurrence_count=3,
            first_occurrence=datetime.utcnow() - timedelta(hours=2),
            last_occurrence=datetime.utcnow()
        )
        errors.append(high_error)
        
        # Create resolved error
        resolved_error = APIErrorLog(
            id=uuid.uuid4(),
            tenant_id=test_tenant.id,
            error_message="Validation error",
            error_type="ValidationError",
            endpoint="/api/products",
            method="POST",
            status_code=422,
            severity=ErrorSeverity.MEDIUM,
            category=ErrorCategory.VALIDATION,
            is_resolved=True,
            resolved_at=datetime.utcnow() - timedelta(hours=1),
            occurrence_count=1,
            first_occurrence=datetime.utcnow() - timedelta(hours=3),
            last_occurrence=datetime.utcnow() - timedelta(hours=3)
        )
        errors.append(resolved_error)
        
        for error in errors:
            db_session.add(error)
        
        db_session.commit()
        
        for error in errors:
            db_session.refresh(error)
        
        return errors
    
    def test_get_active_errors_only_unresolved(self, test_client, super_admin_user, sample_error_logs):
        """Test that active errors endpoint returns only unresolved errors"""
        
        # Mock authentication
        def mock_get_super_admin():
            return super_admin_user
        
        app.dependency_overrides[get_super_admin_user] = mock_get_super_admin
        
        try:
            response = test_client.get("/api/super-admin/errors/active")
            
            assert response.status_code == 200
            data = response.json()
            
            # Should return only unresolved errors (2 out of 3)
            assert data["total"] == 2
            assert len(data["errors"]) == 2
            
            # Verify all returned errors are unresolved
            for error in data["errors"]:
                assert error["is_resolved"] == False
            
            # Verify critical and high priority errors are included
            severities = [error["severity"] for error in data["errors"]]
            assert "critical" in severities
            assert "high" in severities
            
        finally:
            app.dependency_overrides.clear()
    
    def test_get_active_errors_with_filters(self, test_client, super_admin_user, sample_error_logs):
        """Test active errors endpoint with various filters"""
        
        def mock_get_super_admin():
            return super_admin_user
        
        app.dependency_overrides[get_super_admin_user] = mock_get_super_admin
        
        try:
            # Test severity filter
            response = test_client.get("/api/super-admin/errors/active?severity=critical")
            assert response.status_code == 200
            data = response.json()
            assert data["total"] == 1
            assert data["errors"][0]["severity"] == "critical"
            
            # Test category filter
            response = test_client.get("/api/super-admin/errors/active?category=authentication")
            assert response.status_code == 200
            data = response.json()
            assert data["total"] == 1
            assert data["errors"][0]["category"] == "authentication"
            
            # Test endpoint filter
            response = test_client.get("/api/super-admin/errors/active?endpoint=customers")
            assert response.status_code == 200
            data = response.json()
            assert data["total"] == 1
            assert "customers" in data["errors"][0]["endpoint"]
            
        finally:
            app.dependency_overrides.clear()
    
    def test_real_time_error_statistics(self, test_client, super_admin_user, sample_error_logs):
        """Test real-time error statistics endpoint"""
        
        def mock_get_super_admin():
            return super_admin_user
        
        app.dependency_overrides[get_super_admin_user] = mock_get_super_admin
        
        try:
            response = test_client.get("/api/super-admin/errors/statistics/real-time")
            
            assert response.status_code == 200
            data = response.json()
            
            # Verify statistics structure
            assert "total_active_errors" in data
            assert "critical_errors" in data
            assert "high_priority_errors" in data
            assert "medium_priority_errors" in data
            assert "low_priority_errors" in data
            assert "errors_last_24h" in data
            assert "category_breakdown" in data
            assert "top_error_endpoints" in data
            assert "last_updated" in data
            
            # Verify counts (at least 2 active errors: 1 critical, 1 high from our test data)
            assert data["total_active_errors"] >= 2
            assert data["critical_errors"] >= 1
            assert data["high_priority_errors"] >= 1
            # These could be 0 or more depending on other test data
            assert data["medium_priority_errors"] >= 0
            assert data["low_priority_errors"] >= 0
            
            # Verify category breakdown (at least our test data)
            assert data["category_breakdown"]["database"] >= 1
            assert data["category_breakdown"]["authentication"] >= 1
            
        finally:
            app.dependency_overrides.clear()
    
    def test_resolve_error_with_notes(self, test_client, super_admin_user, sample_error_logs, db_session):
        """Test error resolution with admin notes"""
        
        def mock_get_super_admin():
            return super_admin_user
        
        app.dependency_overrides[get_super_admin_user] = mock_get_super_admin
        
        try:
            # Get an unresolved error
            unresolved_error = next(error for error in sample_error_logs if not error.is_resolved)
            error_id = str(unresolved_error.id)
            
            # Mock WebSocket broadcast
            with patch.object(error_connection_manager, 'broadcast_error_resolved', new_callable=AsyncMock) as mock_broadcast_resolved, \
                 patch.object(error_connection_manager, 'broadcast_statistics_update', new_callable=AsyncMock) as mock_broadcast_stats:
                
                resolution_data = {
                    "notes": "Fixed database connection pool configuration"
                }
                
                response = test_client.put(
                    f"/api/super-admin/errors/{error_id}/resolve",
                    json=resolution_data
                )
                
                assert response.status_code == 200
                data = response.json()
                
                # Verify error is marked as resolved
                assert data["is_resolved"] == True
                assert data["resolution_notes"] == resolution_data["notes"]
                assert data["resolved_by"] == str(super_admin_user.id)
                assert data["resolved_at"] is not None
                
                # Verify WebSocket broadcasts were called
                mock_broadcast_resolved.assert_called_once()
                mock_broadcast_stats.assert_called_once()
                
                # Verify database state
                db_session.refresh(unresolved_error)
                assert unresolved_error.is_resolved == True
                assert unresolved_error.resolution_notes == resolution_data["notes"]
                assert unresolved_error.resolved_by == super_admin_user.id
                
        finally:
            app.dependency_overrides.clear()
    
    def test_error_logging_service_real_time_statistics(self, db_session, sample_error_logs):
        """Test ErrorLoggingService real-time statistics method"""
        
        service = ErrorLoggingService(db_session)
        stats = service.get_real_time_statistics()
        
        # Verify statistics structure and values
        assert stats["total_active_errors"] == 2
        assert stats["critical_errors"] == 1
        assert stats["high_priority_errors"] == 1
        assert stats["medium_priority_errors"] == 0
        assert stats["low_priority_errors"] == 0
        assert stats["errors_last_24h"] >= 2  # All errors are recent
        
        # Verify category breakdown
        assert stats["category_breakdown"]["database"] == 1
        assert stats["category_breakdown"]["authentication"] == 1
        
        # Verify top endpoints
        assert len(stats["top_error_endpoints"]) >= 1
        assert "last_updated" in stats
    
    @pytest.mark.asyncio
    async def test_websocket_connection_manager(self):
        """Test WebSocket connection manager functionality"""
        
        # Create mock WebSocket connections
        mock_websocket1 = Mock(spec=WebSocket)
        mock_websocket1.accept = AsyncMock()
        mock_websocket1.send_text = AsyncMock()
        
        mock_websocket2 = Mock(spec=WebSocket)
        mock_websocket2.accept = AsyncMock()
        mock_websocket2.send_text = AsyncMock()
        
        # Test connection management
        await error_connection_manager.connect(mock_websocket1, "admin1")
        await error_connection_manager.connect(mock_websocket2, "admin2")
        
        assert len(error_connection_manager.active_connections) == 2
        assert "admin1" in error_connection_manager.admin_connections
        assert "admin2" in error_connection_manager.admin_connections
        
        # Test broadcasting
        test_data = {"test": "message"}
        await error_connection_manager.broadcast_error_update(test_data)
        
        # Verify both connections received the message
        mock_websocket1.send_text.assert_called_once()
        mock_websocket2.send_text.assert_called_once()
        
        # Test disconnection
        error_connection_manager.disconnect(mock_websocket1, "admin1")
        assert len(error_connection_manager.active_connections) == 1
        assert "admin1" not in error_connection_manager.admin_connections
        assert "admin2" in error_connection_manager.admin_connections
    
    @pytest.mark.asyncio
    async def test_websocket_error_resolution_broadcast(self, sample_error_logs):
        """Test WebSocket broadcast when error is resolved"""
        
        mock_websocket = Mock(spec=WebSocket)
        mock_websocket.accept = AsyncMock()
        mock_websocket.send_text = AsyncMock()
        
        # Connect admin
        await error_connection_manager.connect(mock_websocket, "admin1")
        
        # Broadcast error resolution
        error_id = str(sample_error_logs[0].id)
        await error_connection_manager.broadcast_error_resolved(error_id, "admin@test.com")
        
        # Verify message was sent
        mock_websocket.send_text.assert_called()
        
        # Verify message content
        call_args = mock_websocket.send_text.call_args[0][0]
        message = json.loads(call_args)
        
        assert message["type"] == "error_update"
        assert message["data"]["action"] == "resolved"
        assert message["data"]["error_id"] == error_id
        assert message["data"]["resolved_by"] == "admin@test.com"
        assert "timestamp" in message
    
    @pytest.mark.asyncio
    async def test_websocket_new_error_broadcast(self, sample_error_logs):
        """Test WebSocket broadcast when new error occurs"""
        
        mock_websocket = Mock(spec=WebSocket)
        mock_websocket.accept = AsyncMock()
        mock_websocket.send_text = AsyncMock()
        
        # Connect admin
        await error_connection_manager.connect(mock_websocket, "admin1")
        
        # Broadcast new error
        error_log = sample_error_logs[0]
        await error_connection_manager.broadcast_new_error(error_log)
        
        # Verify message was sent
        mock_websocket.send_text.assert_called()
        
        # Verify message content
        call_args = mock_websocket.send_text.call_args[0][0]
        message = json.loads(call_args)
        
        assert message["type"] == "error_update"
        assert message["data"]["action"] == "new_error"
        assert message["data"]["error"]["id"] == str(error_log.id)
        assert message["data"]["error"]["error_message"] == error_log.error_message
        assert message["data"]["error"]["severity"] == error_log.severity.value
        assert "timestamp" in message
    
    @pytest.mark.asyncio
    async def test_websocket_statistics_broadcast(self):
        """Test WebSocket broadcast of updated statistics"""
        
        mock_websocket = Mock(spec=WebSocket)
        mock_websocket.accept = AsyncMock()
        mock_websocket.send_text = AsyncMock()
        
        # Connect admin
        await error_connection_manager.connect(mock_websocket, "admin1")
        
        # Broadcast statistics update
        test_stats = {
            "total_active_errors": 5,
            "critical_errors": 2,
            "high_priority_errors": 1
        }
        await error_connection_manager.broadcast_statistics_update(test_stats)
        
        # Verify message was sent
        mock_websocket.send_text.assert_called()
        
        # Verify message content
        call_args = mock_websocket.send_text.call_args[0][0]
        message = json.loads(call_args)
        
        assert message["type"] == "error_update"
        assert message["data"]["action"] == "statistics_update"
        assert message["data"]["statistics"] == test_stats
        assert "timestamp" in message
    
    def test_error_logging_service_broadcast_integration(self, db_session, test_tenant):
        """Test that ErrorLoggingService broadcasts new errors"""
        
        service = ErrorLoggingService(db_session)
        
        # Mock the broadcast method
        with patch.object(service, '_broadcast_new_error') as mock_broadcast:
            
            # Create a new error (should trigger broadcast)
            error_log = service.log_custom_error(
                error_message="Test error for broadcast",
                error_type="TestError",
                endpoint="/api/test",
                method="POST",
                status_code=500,
                severity=ErrorSeverity.HIGH,
                category=ErrorCategory.SYSTEM,
                tenant_id=test_tenant.id
            )
            
            # Verify broadcast was called for new error
            mock_broadcast.assert_called_once_with(error_log)
    
    def test_websocket_connection_cleanup_on_error(self):
        """Test WebSocket connection cleanup when send fails"""
        
        # Create mock WebSocket that fails on send
        mock_websocket_good = Mock(spec=WebSocket)
        mock_websocket_good.accept = AsyncMock()
        mock_websocket_good.send_text = AsyncMock()
        
        mock_websocket_bad = Mock(spec=WebSocket)
        mock_websocket_bad.accept = AsyncMock()
        mock_websocket_bad.send_text = AsyncMock(side_effect=Exception("Connection lost"))
        
        async def test_cleanup():
            # Connect both WebSockets
            await error_connection_manager.connect(mock_websocket_good, "admin1")
            await error_connection_manager.connect(mock_websocket_bad, "admin2")
            
            assert len(error_connection_manager.active_connections) == 2
            
            # Broadcast message (should remove failed connection)
            await error_connection_manager.broadcast_error_update({"test": "data"})
            
            # Verify failed connection was removed
            assert len(error_connection_manager.active_connections) == 1
            assert mock_websocket_good in error_connection_manager.active_connections
            assert mock_websocket_bad not in error_connection_manager.active_connections
        
        asyncio.run(test_cleanup())
    
    def test_error_filtering_by_tenant(self, test_client, super_admin_user, sample_error_logs, test_tenant):
        """Test filtering active errors by tenant ID"""
        
        def mock_get_super_admin():
            return super_admin_user
        
        app.dependency_overrides[get_super_admin_user] = mock_get_super_admin
        
        try:
            # Filter by tenant ID
            response = test_client.get(f"/api/super-admin/errors/active?tenant_id={test_tenant.id}")
            
            assert response.status_code == 200
            data = response.json()
            
            # All returned errors should belong to the specified tenant
            for error in data["errors"]:
                assert error["tenant_id"] == str(test_tenant.id)
            
        finally:
            app.dependency_overrides.clear()
    
    def test_error_search_functionality(self, test_client, super_admin_user, sample_error_logs):
        """Test error search by message content"""
        
        def mock_get_super_admin():
            return super_admin_user
        
        app.dependency_overrides[get_super_admin_user] = mock_get_super_admin
        
        try:
            # Search for database-related errors
            response = test_client.get("/api/super-admin/errors/active?search_term=Database")
            
            assert response.status_code == 200
            data = response.json()
            
            # Should find the database connection error
            assert data["total"] >= 1
            found_database_error = any("Database" in error["error_message"] for error in data["errors"])
            assert found_database_error
            
        finally:
            app.dependency_overrides.clear()
    
    def test_error_pagination(self, test_client, super_admin_user, sample_error_logs):
        """Test error pagination functionality"""
        
        def mock_get_super_admin():
            return super_admin_user
        
        app.dependency_overrides[get_super_admin_user] = mock_get_super_admin
        
        try:
            # Test with limit
            response = test_client.get("/api/super-admin/errors/active?limit=1")
            
            assert response.status_code == 200
            data = response.json()
            
            assert len(data["errors"]) == 1
            assert data["limit"] == 1
            assert data["skip"] == 0
            assert data["has_more"] == True  # Should have more errors
            
            # Test with skip
            response = test_client.get("/api/super-admin/errors/active?skip=1&limit=1")
            
            assert response.status_code == 200
            data = response.json()
            
            assert len(data["errors"]) == 1
            assert data["skip"] == 1
            
        finally:
            app.dependency_overrides.clear()


if __name__ == "__main__":
    pytest.main([__file__, "-v"])