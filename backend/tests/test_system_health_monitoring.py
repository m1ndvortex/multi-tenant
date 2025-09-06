"""
Comprehensive tests for Super Admin System Health Monitoring Backend
Tests real-time CPU and RAM monitoring, database performance metrics, 
Celery job queue monitoring, and system alerts functionality.
"""

import pytest
import time
import json
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.services.monitoring_service import MonitoringService
from app.core.redis_client import redis_client
from app.core.database import get_db
from app.models.user import User
from app.models.tenant import Tenant, SubscriptionType, TenantStatus


# Module-level fixtures
@pytest.fixture
def client():
    """Create test client"""
    return TestClient(app)

@pytest.fixture
def db_session():
    """Create database session for testing"""
    from app.core.database import SessionLocal
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@pytest.fixture
def super_admin_user(db_session):
    """Create super admin user for testing"""
    from app.models.user import UserRole, UserStatus
    import uuid
    
    user_id = uuid.uuid4()
    user = User(
        id=user_id,
        email="superadmin@test.com",
        password_hash="hashed_password",
        first_name="Super",
        last_name="Admin",
        role=UserRole.OWNER,  # Use OWNER role for super admin
        status=UserStatus.ACTIVE,
        is_super_admin=True,
        is_email_verified=True
    )
    db_session.add(user)
    db_session.commit()
    return user

@pytest.fixture
def super_admin_token(super_admin_user):
    """Create super admin JWT token"""
    from jose import jwt
    from app.core.config import settings
    
    payload = {
        "user_id": str(super_admin_user.id),
        "email": "superadmin@test.com",
        "role": "owner",
        "is_super_admin": True,
        "type": "access",
        "exp": datetime.utcnow() + timedelta(hours=1)
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)

@pytest.fixture
def monitoring_service(db_session):
    """Create monitoring service instance"""
    return MonitoringService(db_session)


class TestSystemHealthMonitoring:
    """Test system health monitoring functionality"""
    
    def test_get_system_health_endpoint(self, client, super_admin_user, super_admin_token):
        """Test system health endpoint returns comprehensive health data"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        
        with patch('app.services.monitoring_service.MonitoringService.get_system_health') as mock_health:
            mock_health.return_value = {
                "status": "healthy",
                "database_status": True,
                "redis_status": True,
                "celery_status": True,
                "cpu_usage_percent": 45.2,
                "memory_usage_percent": 62.8,
                "disk_usage_percent": 35.1,
                "database_connections": 12,
                "database_response_time_ms": 25.5,
                "celery_active_tasks": 3,
                "celery_pending_tasks": 1,
                "celery_failed_tasks": 0,
                "celery_workers": 2,
                "average_response_time_ms": 85.3,
                "requests_per_minute": 150.0,
                "error_rate_percent": 1.2,
                "last_health_check": datetime.now(timezone.utc),
                "uptime_seconds": 86400
            }
            
            response = client.get("/api/super-admin/system/health", headers=headers)
            
            assert response.status_code == 200
            data = response.json()
            
            # Verify all required fields are present
            assert data["status"] == "healthy"
            assert data["database_status"] is True
            assert data["redis_status"] is True
            assert data["celery_status"] is True
            assert data["cpu_usage_percent"] == 45.2
            assert data["memory_usage_percent"] == 62.8
            assert data["disk_usage_percent"] == 35.1
            assert data["database_connections"] == 12
            assert data["database_response_time_ms"] == 25.5
            assert data["celery_active_tasks"] == 3
            assert data["celery_pending_tasks"] == 1
            assert data["celery_failed_tasks"] == 0
            assert data["celery_workers"] == 2
            assert data["average_response_time_ms"] == 85.3
            assert data["requests_per_minute"] == 150.0
            assert data["error_rate_percent"] == 1.2
            assert data["uptime_seconds"] == 86400
            assert "last_health_check" in data
    
    def test_get_celery_monitoring_endpoint(self, client, super_admin_user, super_admin_token):
        """Test Celery monitoring endpoint returns detailed task information"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        
        mock_celery_data = {
            "active_tasks": [
                {
                    "task_id": "task-123",
                    "task_name": "backup_tenant_data",
                    "state": "ACTIVE",
                    "worker": "worker-1",
                    "timestamp": datetime.now(timezone.utc),
                    "runtime": 45.2,
                    "args": ["tenant-id-123"],
                    "kwargs": {}
                }
            ],
            "pending_tasks": [
                {
                    "task_id": "task-456",
                    "task_name": "send_email",
                    "state": "PENDING",
                    "worker": "worker-2",
                    "timestamp": datetime.now(timezone.utc),
                    "args": ["email@test.com"],
                    "kwargs": {"subject": "Test"}
                }
            ],
            "failed_tasks": [],
            "completed_tasks": [
                {
                    "task_id": "task-789",
                    "task_name": "process_image",
                    "state": "SUCCESS",
                    "worker": "worker-1",
                    "timestamp": datetime.now(timezone.utc),
                    "runtime": 12.5,
                    "args": ["image.jpg"],
                    "kwargs": {}
                }
            ],
            "total_active": 1,
            "total_pending": 1,
            "total_failed": 0,
            "total_completed": 1,
            "active_workers": [
                {
                    "name": "worker-1",
                    "status": "online",
                    "processed_tasks": 150,
                    "active_tasks": 1,
                    "load_avg": 0.75,
                    "memory_usage": 256000
                }
            ],
            "worker_count": 1,
            "average_task_duration": 28.9,
            "tasks_per_minute": 5.2,
            "failure_rate": 0.5,
            "last_updated": datetime.now(timezone.utc)
        }
        
        with patch('app.services.monitoring_service.MonitoringService.get_celery_monitoring') as mock_celery:
            mock_celery.return_value = mock_celery_data
            
            response = client.get("/api/super-admin/system/celery", headers=headers)
            
            assert response.status_code == 200
            data = response.json()
            
            # Verify task information
            assert len(data["active_tasks"]) == 1
            assert data["active_tasks"][0]["task_name"] == "backup_tenant_data"
            assert data["active_tasks"][0]["state"] == "ACTIVE"
            
            assert len(data["pending_tasks"]) == 1
            assert data["pending_tasks"][0]["task_name"] == "send_email"
            
            assert len(data["completed_tasks"]) == 1
            assert data["completed_tasks"][0]["task_name"] == "process_image"
            
            # Verify metrics
            assert data["total_active"] == 1
            assert data["total_pending"] == 1
            assert data["total_failed"] == 0
            assert data["worker_count"] == 1
            assert data["average_task_duration"] == 28.9
            assert data["tasks_per_minute"] == 5.2
            assert data["failure_rate"] == 0.5
    
    def test_get_database_metrics_endpoint(self, client, super_admin_user, super_admin_token):
        """Test database metrics endpoint returns performance data"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        
        mock_db_metrics = {
            "connection_count": 15,
            "max_connections": 100,
            "connection_usage_percent": 15.0,
            "average_query_time_ms": 45.2,
            "slow_queries_count": 2,
            "database_size_mb": 1024.5,
            "cache_hit_ratio": 95.8,
            "transactions_per_second": 125.3,
            "locks_count": 5,
            "deadlocks_count": 0,
            "last_updated": datetime.now(timezone.utc)
        }
        
        with patch('app.services.monitoring_service.MonitoringService.get_database_metrics') as mock_db:
            mock_db.return_value = mock_db_metrics
            
            response = client.get("/api/super-admin/system/database", headers=headers)
            
            assert response.status_code == 200
            data = response.json()
            
            # Verify database metrics
            assert data["connection_count"] == 15
            assert data["max_connections"] == 100
            assert data["connection_usage_percent"] == 15.0
            assert data["average_query_time_ms"] == 45.2
            assert data["slow_queries_count"] == 2
            assert data["database_size_mb"] == 1024.5
            assert data["cache_hit_ratio"] == 95.8
            assert data["transactions_per_second"] == 125.3
            assert data["locks_count"] == 5
            assert data["deadlocks_count"] == 0
            assert "last_updated" in data
    
    def test_get_system_alerts_endpoint(self, client, super_admin_user, super_admin_token):
        """Test system alerts endpoint returns alert information"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        
        mock_alerts = {
            "critical_alerts": [
                {
                    "type": "high_cpu",
                    "message": "Critical CPU usage: 95.2%",
                    "timestamp": datetime.now(timezone.utc),
                    "threshold": 90,
                    "current_value": 95.2
                }
            ],
            "warning_alerts": [
                {
                    "type": "high_memory",
                    "message": "High memory usage: 85.5%",
                    "timestamp": datetime.now(timezone.utc),
                    "threshold": 80,
                    "current_value": 85.5
                }
            ],
            "info_alerts": [
                {
                    "type": "failed_tasks",
                    "message": "3 failed Celery tasks",
                    "timestamp": datetime.now(timezone.utc),
                    "current_value": 3
                }
            ],
            "total_alerts": 3,
            "last_updated": datetime.now(timezone.utc)
        }
        
        with patch('app.services.monitoring_service.MonitoringService.get_system_alerts') as mock_alerts_func:
            mock_alerts_func.return_value = mock_alerts
            
            response = client.get("/api/super-admin/system/alerts", headers=headers)
            
            assert response.status_code == 200
            data = response.json()
            
            # Verify alerts structure
            assert len(data["critical_alerts"]) == 1
            assert data["critical_alerts"][0]["type"] == "high_cpu"
            assert data["critical_alerts"][0]["current_value"] == 95.2
            
            assert len(data["warning_alerts"]) == 1
            assert data["warning_alerts"][0]["type"] == "high_memory"
            
            assert len(data["info_alerts"]) == 1
            assert data["info_alerts"][0]["type"] == "failed_tasks"
            
            assert data["total_alerts"] == 3
    
    def test_get_performance_metrics_endpoint(self, client, super_admin_user, super_admin_token):
        """Test performance metrics endpoint with historical data"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        
        mock_performance = {
            "current_metrics": {
                "cpu_usage": 45.2,
                "memory_usage": 62.8,
                "disk_usage": 35.1,
                "response_time": 85.3,
                "requests_per_minute": 150.0,
                "error_rate": 1.2
            },
            "hourly_metrics": [
                {
                    "timestamp": datetime.now(timezone.utc),
                    "cpu_usage": 45.2,
                    "memory_usage": 62.8,
                    "response_time": 85.3,
                    "requests_per_minute": 150.0,
                    "error_rate": 1.2
                }
            ],
            "daily_metrics": [
                {
                    "date": datetime.now(timezone.utc).date(),
                    "avg_cpu_usage": 42.5,
                    "avg_memory_usage": 58.3,
                    "avg_response_time": 78.9,
                    "total_requests": 216000,
                    "avg_error_rate": 0.8
                }
            ],
            "trends": {
                "cpu_usage": "stable",
                "memory_usage": "up",
                "response_time": "down"
            },
            "thresholds": {
                "cpu_usage_warning": 80.0,
                "cpu_usage_critical": 90.0,
                "memory_usage_warning": 80.0,
                "memory_usage_critical": 90.0,
                "response_time_warning": 100.0,
                "response_time_critical": 500.0
            },
            "last_updated": datetime.now(timezone.utc)
        }
        
        with patch('app.services.monitoring_service.MonitoringService.get_performance_metrics') as mock_perf:
            mock_perf.return_value = mock_performance
            
            response = client.get("/api/super-admin/system/performance?hours=24", headers=headers)
            
            assert response.status_code == 200
            data = response.json()
            
            # Verify performance data structure
            assert "current_metrics" in data
            assert data["current_metrics"]["cpu_usage"] == 45.2
            assert data["current_metrics"]["memory_usage"] == 62.8
            
            assert "hourly_metrics" in data
            assert len(data["hourly_metrics"]) >= 1
            
            assert "trends" in data
            assert data["trends"]["cpu_usage"] == "stable"
            assert data["trends"]["memory_usage"] == "up"
            
            assert "thresholds" in data
            assert data["thresholds"]["cpu_usage_warning"] == 80.0


class TestMonitoringService:
    """Test MonitoringService class functionality"""
    
    @pytest.fixture
    def monitoring_service(self):
        """Create monitoring service instance"""
        return MonitoringService()
    
    @patch('psutil.cpu_percent')
    @patch('psutil.virtual_memory')
    @patch('psutil.disk_usage')
    def test_get_system_health_with_mock_metrics(self, mock_disk, mock_memory, mock_cpu, monitoring_service):
        """Test system health with mocked system metrics"""
        # Mock system metrics
        mock_cpu.return_value = 45.2
        mock_memory.return_value = Mock(percent=62.8)
        mock_disk.return_value = Mock(percent=35.1)
        
        # Mock database and Redis health checks
        with patch.object(monitoring_service, '_check_database_health', return_value=True), \
             patch.object(monitoring_service, '_check_redis_health', return_value=True), \
             patch.object(monitoring_service, '_check_celery_health', return_value=True), \
             patch.object(monitoring_service, '_get_database_metrics', return_value=(12, 25.5)), \
             patch.object(monitoring_service, '_get_celery_metrics', return_value={
                 "active_tasks": 3, "pending_tasks": 1, "failed_tasks": 0, "workers": 2
             }), \
             patch.object(monitoring_service, '_get_performance_metrics', return_value={
                 "average_response_time_ms": 85.3, "requests_per_minute": 150.0, "error_rate_percent": 1.2
             }):
            
            health_data = monitoring_service.get_system_health()
            
            # Verify health status
            assert health_data["status"] == "healthy"
            assert health_data["database_status"] is True
            assert health_data["redis_status"] is True
            assert health_data["celery_status"] is True
            
            # Verify system metrics
            assert health_data["cpu_usage_percent"] == 45.2
            assert health_data["memory_usage_percent"] == 62.8
            assert health_data["disk_usage_percent"] == 35.1
            
            # Verify database metrics
            assert health_data["database_connections"] == 12
            assert health_data["database_response_time_ms"] == 25.5
            
            # Verify Celery metrics
            assert health_data["celery_active_tasks"] == 3
            assert health_data["celery_pending_tasks"] == 1
            assert health_data["celery_failed_tasks"] == 0
            assert health_data["celery_workers"] == 2
    
    def test_system_health_degraded_status(self, monitoring_service):
        """Test system health returns degraded status when thresholds exceeded"""
        with patch('psutil.cpu_percent', return_value=85.0), \
             patch('psutil.virtual_memory', return_value=Mock(percent=85.0)), \
             patch('psutil.disk_usage', return_value=Mock(percent=40.0)), \
             patch.object(monitoring_service, '_check_database_health', return_value=True), \
             patch.object(monitoring_service, '_check_redis_health', return_value=True), \
             patch.object(monitoring_service, '_check_celery_health', return_value=True), \
             patch.object(monitoring_service, '_get_database_metrics', return_value=(12, 25.5)), \
             patch.object(monitoring_service, '_get_celery_metrics', return_value={
                 "active_tasks": 3, "pending_tasks": 1, "failed_tasks": 0, "workers": 2
             }), \
             patch.object(monitoring_service, '_get_performance_metrics', return_value={
                 "average_response_time_ms": 85.3, "requests_per_minute": 150.0, "error_rate_percent": 1.2
             }):
            
            health_data = monitoring_service.get_system_health()
            
            # Should be degraded due to high CPU and memory
            assert health_data["status"] == "degraded"
            assert health_data["cpu_usage_percent"] == 85.0
            assert health_data["memory_usage_percent"] == 85.0
    
    def test_system_health_unhealthy_status(self, monitoring_service):
        """Test system health returns unhealthy status when services are down"""
        with patch('psutil.cpu_percent', return_value=45.0), \
             patch('psutil.virtual_memory', return_value=Mock(percent=60.0)), \
             patch('psutil.disk_usage', return_value=Mock(percent=40.0)), \
             patch.object(monitoring_service, '_check_database_health', return_value=False), \
             patch.object(monitoring_service, '_check_redis_health', return_value=True), \
             patch.object(monitoring_service, '_check_celery_health', return_value=True), \
             patch.object(monitoring_service, '_get_database_metrics', return_value=(0, 0.0)), \
             patch.object(monitoring_service, '_get_celery_metrics', return_value={
                 "active_tasks": 0, "pending_tasks": 0, "failed_tasks": 0, "workers": 0
             }), \
             patch.object(monitoring_service, '_get_performance_metrics', return_value={
                 "average_response_time_ms": 0.0, "requests_per_minute": 0.0, "error_rate_percent": 0.0
             }):
            
            health_data = monitoring_service.get_system_health()
            
            # Should be unhealthy due to database failure
            assert health_data["status"] == "unhealthy"
            assert health_data["database_status"] is False
    
    @patch('app.services.monitoring_service.celery_app')
    def test_get_celery_monitoring_with_mock_data(self, mock_celery_app, monitoring_service):
        """Test Celery monitoring with mocked Celery data"""
        # Mock Celery inspect
        mock_inspect = Mock()
        mock_celery_app.control.inspect.return_value = mock_inspect
        
        # Mock active tasks
        mock_inspect.active.return_value = {
            "worker-1": [
                {
                    "id": "task-123",
                    "name": "backup_tenant_data",
                    "time_start": time.time() - 30,
                    "args": ["tenant-id-123"],
                    "kwargs": {}
                }
            ]
        }
        
        # Mock scheduled tasks
        mock_inspect.scheduled.return_value = {
            "worker-1": [
                {
                    "request": {
                        "id": "task-456",
                        "task": "send_email",
                        "args": ["email@test.com"],
                        "kwargs": {"subject": "Test"}
                    },
                    "eta": time.time() + 60
                }
            ]
        }
        
        # Mock worker stats
        mock_inspect.stats.return_value = {
            "worker-1": {
                "total": {"tasks.total": 150},
                "rusage": {"utime": 0.75, "maxrss": 256000}
            }
        }
        
        # Mock Redis data for failed/completed tasks
        with patch.object(monitoring_service, '_get_recent_failed_tasks', return_value=[]), \
             patch.object(monitoring_service, '_get_recent_completed_tasks', return_value=[
                 {
                     "task_id": "task-789",
                     "task_name": "process_image",
                     "state": "SUCCESS",
                     "runtime": 12.5
                 }
             ]):
            
            celery_data = monitoring_service.get_celery_monitoring()
            
            # Verify active tasks
            assert len(celery_data["active_tasks"]) == 1
            assert celery_data["active_tasks"][0]["task_name"] == "backup_tenant_data"
            assert celery_data["active_tasks"][0]["state"] == "ACTIVE"
            
            # Verify pending tasks
            assert len(celery_data["pending_tasks"]) == 1
            assert celery_data["pending_tasks"][0]["task_name"] == "send_email"
            
            # Verify workers
            assert len(celery_data["active_workers"]) == 1
            assert celery_data["active_workers"][0]["name"] == "worker-1"
            assert celery_data["active_workers"][0]["processed_tasks"] == 150
            
            # Verify metrics
            assert celery_data["total_active"] == 1
            assert celery_data["total_pending"] == 1
            assert celery_data["worker_count"] == 1
    
    def test_get_system_alerts_critical_conditions(self, monitoring_service):
        """Test system alerts generation for critical conditions"""
        # Mock system health with critical conditions - include all required fields
        mock_health_data = {
            "status": "unhealthy",
            "database_status": False,
            "redis_status": True,
            "celery_status": True,
            "cpu_usage_percent": 95.2,
            "memory_usage_percent": 92.8,
            "disk_usage_percent": 97.1,
            "database_connections": 50,
            "database_response_time_ms": 250.0,
            "celery_active_tasks": 5,
            "celery_pending_tasks": 2,
            "celery_failed_tasks": 3,
            "celery_workers": 1,
            "average_response_time_ms": 150.0,
            "requests_per_minute": 100.0,
            "error_rate_percent": 8.5,
            "last_health_check": datetime.now(timezone.utc),
            "uptime_seconds": 3600
        }
        
        with patch.object(monitoring_service, 'get_system_health', return_value=mock_health_data):
            alerts_data = monitoring_service.get_system_alerts()
            
            # Should have multiple critical alerts
            assert len(alerts_data["critical_alerts"]) >= 3
            
            # Check for specific critical alerts
            alert_types = [alert["type"] for alert in alerts_data["critical_alerts"]]
            assert "system_health" in alert_types
            assert "high_cpu" in alert_types
            assert "high_memory" in alert_types
            assert "high_disk" in alert_types
            
            # Verify total alerts count
            assert alerts_data["total_alerts"] > 0
    
    def test_record_api_metrics(self, monitoring_service):
        """Test API metrics recording functionality"""
        # Mock Redis operations
        with patch.object(redis_client, 'incr') as mock_incr, \
             patch.object(redis_client, 'expire') as mock_expire, \
             patch.object(redis_client, 'get', return_value=[]), \
             patch.object(redis_client, 'set') as mock_set, \
             patch.object(monitoring_service, '_update_rolling_metrics') as mock_update:
            
            # Record API metrics
            monitoring_service.record_api_metrics(
                endpoint="/api/invoices",
                method="GET",
                response_time_ms=85.3,
                status_code=200,
                tenant_id="tenant-123"
            )
            
            # Verify Redis operations were called
            assert mock_incr.called
            assert mock_expire.called
            assert mock_set.called
            assert mock_update.called
    
    def test_performance_metrics_with_historical_data(self, monitoring_service):
        """Test performance metrics with historical data generation"""
        # Mock current system metrics
        with patch('psutil.cpu_percent', return_value=45.2), \
             patch('psutil.virtual_memory', return_value=Mock(percent=62.8)), \
             patch('psutil.disk_usage', return_value=Mock(percent=35.1)), \
             patch.object(redis_client, 'get') as mock_redis_get:
            
            # Mock Redis responses for performance metrics
            mock_redis_get.side_effect = lambda key, default=0: {
                "api:avg_response_time": 85.3,
                "api:requests_per_minute": 150.0,
                "api:error_rate": 1.2
            }.get(key, default)
            
            performance_data = monitoring_service.get_performance_metrics(hours=24)
            
            # Verify current metrics
            assert performance_data["current_metrics"]["cpu_usage"] == 45.2
            assert performance_data["current_metrics"]["memory_usage"] == 62.8
            assert performance_data["current_metrics"]["response_time"] == 85.3
            
            # Verify historical data structure
            assert "hourly_metrics" in performance_data
            assert "daily_metrics" in performance_data
            assert "trends" in performance_data
            assert "thresholds" in performance_data
            
            # Verify thresholds are defined
            assert performance_data["thresholds"]["cpu_usage_warning"] == 80.0
            assert performance_data["thresholds"]["cpu_usage_critical"] == 90.0


class TestSystemHealthIntegration:
    """Integration tests for system health monitoring"""
    
    def test_unauthorized_access_to_health_endpoints(self, client):
        """Test that health endpoints require super admin authentication"""
        # Test without token - should return 403 (Forbidden) due to middleware
        response = client.get("/api/super-admin/system/health")
        assert response.status_code == 403
        
        # Test with invalid token
        headers = {"Authorization": "Bearer invalid-token"}
        response = client.get("/api/super-admin/system/health", headers=headers)
        assert response.status_code in [401, 403]  # Either is acceptable for invalid token
    
    def test_regular_user_cannot_access_health_endpoints(self, client):
        """Test that regular users cannot access health endpoints"""
        from jose import jwt
        from app.core.config import settings
        
        # Create regular user token (not super admin)
        payload = {
            "user_id": "regular-user-id",
            "tenant_id": "tenant-123",
            "is_super_admin": False,
            "exp": datetime.utcnow() + timedelta(hours=1)
        }
        token = jwt.encode(payload, settings.jwt_secret_key, algorithm="HS256")
        headers = {"Authorization": f"Bearer {token}"}
        
        response = client.get("/api/super-admin/system/health", headers=headers)
        assert response.status_code == 403
    
    def test_health_endpoint_error_handling(self, client, super_admin_user, super_admin_token):
        """Test error handling in health endpoints"""
        headers = {"Authorization": f"Bearer {super_admin_token}"}
        
        # Mock service to raise exception
        with patch('app.services.monitoring_service.MonitoringService.get_system_health') as mock_health:
            mock_health.side_effect = Exception("Service unavailable")
            
            response = client.get("/api/super-admin/system/health", headers=headers)
            
            assert response.status_code == 500
            assert "Failed to retrieve system health" in response.json()["detail"]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])