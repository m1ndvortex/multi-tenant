"""
Unit tests for analytics and monitoring features
"""

import pytest
from datetime import datetime, timedelta, timezone
from unittest.mock import Mock, patch, MagicMock
import json
import time

from app.services.analytics_service import AnalyticsService
from app.services.monitoring_service import MonitoringService
from app.schemas.analytics import TimeRange
from app.models.tenant import Tenant, SubscriptionType, TenantStatus
from app.models.user import User, UserStatus, UserRole
from app.models.invoice import Invoice
from app.models.activity_log import ActivityLog


class TestAnalyticsService:
    """Test cases for AnalyticsService"""
    
    def test_get_time_range_dates_last_24_hours(self):
        """Test time range calculation for last 24 hours"""
        service = AnalyticsService(Mock())
        
        start, end = service.get_time_range_dates(TimeRange.LAST_24_HOURS)
        
        # Should be approximately 24 hours apart
        time_diff = end - start
        assert abs(time_diff.total_seconds() - 86400) < 60  # Within 1 minute tolerance
    
    def test_get_time_range_dates_custom(self):
        """Test custom time range"""
        service = AnalyticsService(Mock())
        
        start_date = datetime(2024, 1, 1, tzinfo=timezone.utc)
        end_date = datetime(2024, 1, 31, tzinfo=timezone.utc)
        
        start, end = service.get_time_range_dates(
            TimeRange.CUSTOM, 
            start_date=start_date, 
            end_date=end_date
        )
        
        assert start == start_date
        assert end == end_date
    
    def test_get_time_range_dates_custom_missing_dates(self):
        """Test custom time range with missing dates raises error"""
        service = AnalyticsService(Mock())
        
        with pytest.raises(ValueError, match="Custom time range requires start_date and end_date"):
            service.get_time_range_dates(TimeRange.CUSTOM)
    
    @patch('app.services.analytics_service.redis_client')
    def test_record_user_heartbeat_success(self, mock_redis):
        """Test successful user heartbeat recording"""
        mock_redis.set.return_value = True
        mock_redis.sadd.return_value = 1
        mock_redis.expire.return_value = True
        mock_redis.get.return_value = 5
        
        service = AnalyticsService(Mock())
        
        result = service.record_user_heartbeat(
            user_id="user123",
            tenant_id="tenant456",
            session_id="session789",
            page="/dashboard"
        )
        
        assert result is True
        
        # Verify Redis calls
        assert mock_redis.set.call_count >= 1
        assert mock_redis.sadd.call_count >= 2
        assert mock_redis.expire.call_count >= 2
    
    @patch('app.services.analytics_service.redis_client')
    def test_record_user_heartbeat_failure(self, mock_redis):
        """Test user heartbeat recording failure"""
        mock_redis.set.side_effect = Exception("Redis error")
        
        service = AnalyticsService(Mock())
        
        result = service.record_user_heartbeat(
            user_id="user123",
            tenant_id="tenant456"
        )
        
        assert result is False
    
    @patch('app.services.analytics_service.redis_client')
    def test_get_user_activity_success(self, mock_redis):
        """Test successful user activity retrieval"""
        # Mock Redis responses
        mock_redis.smembers.return_value = {"user1", "user2", "user3"}
        mock_redis.get.side_effect = [
            {  # heartbeat data for user1
                "user_id": "user1",
                "tenant_id": "tenant1",
                "session_id": "session1",
                "page": "/dashboard",
                "last_seen": "2024-01-01T12:00:00Z"
            },
            {  # heartbeat data for user2
                "user_id": "user2", 
                "tenant_id": "tenant1",
                "session_id": "session2",
                "page": "/invoices",
                "last_seen": "2024-01-01T12:01:00Z"
            },
            {  # heartbeat data for user3
                "user_id": "user3",
                "tenant_id": "tenant2", 
                "session_id": "session3",
                "page": "/customers",
                "last_seen": "2024-01-01T12:02:00Z"
            },
            10  # peak users today
        ]
        
        service = AnalyticsService(Mock())
        
        result = service.get_user_activity()
        
        assert result["total_active_users"] == 3
        assert result["active_users_by_tenant"]["tenant1"] == 2
        assert result["active_users_by_tenant"]["tenant2"] == 1
        assert result["peak_concurrent_users"] == 10
        assert len(result["user_sessions"]) == 3
    
    def test_get_platform_analytics_with_real_db(self, db_session, sample_tenants):
        """Test platform analytics with real database"""
        service = AnalyticsService(db_session)
        
        result = service.get_platform_analytics(TimeRange.LAST_30_DAYS)
        
        # Verify basic structure and types
        assert isinstance(result["total_signups"], int)
        assert isinstance(result["signups_this_month"], int)
        assert isinstance(result["signups_last_month"], int)
        assert isinstance(result["signup_growth_rate"], float)
        assert isinstance(result["total_active_subscriptions"], int)
        assert isinstance(result["free_subscriptions"], int)
        assert isinstance(result["pro_subscriptions"], int)
        assert isinstance(result["subscription_conversion_rate"], float)
        assert isinstance(result["monthly_recurring_revenue"], float)
        assert isinstance(result["signup_trend"], list)
        assert isinstance(result["revenue_trend"], list)
        
        # Verify we have some data from sample_tenants
        assert result["total_signups"] == len(sample_tenants)
    
    def test_generate_signup_trend_with_real_db(self, db_session, sample_tenants):
        """Test signup trend generation with real database"""
        service = AnalyticsService(db_session)
        
        # Use a date range that includes our sample data
        end_date = datetime.now(timezone.utc)
        start_date = end_date - timedelta(days=60)  # 60 days to capture sample data
        
        result = service._generate_signup_trend(start_date, end_date)
        
        # Verify structure
        assert isinstance(result, list)
        for item in result:
            assert "date" in item
            assert "signups" in item
            assert isinstance(item["signups"], int)
    
    def test_get_api_error_logs_with_real_db(self, db_session, sample_tenants):
        """Test API error logs retrieval with real database"""
        # Create some error activity logs first
        for i, tenant in enumerate(sample_tenants[:3]):
            ActivityLog.log_action(
                db=db_session,
                tenant_id=tenant.id,
                action=f"test_action_{i}",
                status="failed",
                error_message=f"Test error {i}",
                details={"test": True}
            )
        
        service = AnalyticsService(db_session)
        
        result = service.get_api_error_logs(
            time_range=TimeRange.LAST_24_HOURS,
            limit=100,
            offset=0
        )
        
        # Verify structure and basic functionality
        assert isinstance(result["total_errors"], int)
        assert isinstance(result["error_rate"], float)
        assert isinstance(result["errors"], list)
        assert isinstance(result["most_common_errors"], list)
        assert isinstance(result["errors_by_endpoint"], dict)
        assert isinstance(result["errors_by_tenant"], dict)
        
        # Should have at least the errors we created
        assert result["total_errors"] >= 3


class TestMonitoringService:
    """Test cases for MonitoringService"""
    
    @patch('app.services.monitoring_service.psutil')
    @patch('app.services.monitoring_service.redis_client')
    def test_get_system_health_healthy(self, mock_redis, mock_psutil):
        """Test system health when all components are healthy"""
        # Mock psutil responses
        mock_psutil.cpu_percent.return_value = 45.0
        mock_memory = Mock()
        mock_memory.percent = 60.0
        mock_psutil.virtual_memory.return_value = mock_memory
        
        mock_disk = Mock()
        mock_disk.percent = 70.0
        mock_psutil.disk_usage.return_value = mock_disk
        
        # Mock Redis
        mock_redis.set.return_value = True
        
        service = MonitoringService()
        
        # Mock the health check methods
        service._check_database_health = Mock(return_value=True)
        service._check_redis_health = Mock(return_value=True)
        service._check_celery_health = Mock(return_value=True)
        service._get_database_metrics = Mock(return_value=(10, 25.5))
        service._get_celery_metrics = Mock(return_value={
            "active_tasks": 5,
            "pending_tasks": 2,
            "failed_tasks": 0,
            "workers": 3
        })
        service._get_performance_metrics = Mock(return_value={
            "average_response_time_ms": 150.0,
            "requests_per_minute": 45.0,
            "error_rate_percent": 2.0
        })
        
        result = service.get_system_health()
        
        assert result["status"] == "healthy"
        assert result["database_status"] is True
        assert result["redis_status"] is True
        assert result["celery_status"] is True
        assert result["cpu_usage_percent"] == 45.0
        assert result["memory_usage_percent"] == 60.0
        assert result["disk_usage_percent"] == 70.0
        assert result["database_connections"] == 10
        assert result["database_response_time_ms"] == 25.5
        assert result["celery_active_tasks"] == 5
    
    @patch('app.services.monitoring_service.psutil')
    def test_get_system_health_degraded(self, mock_psutil):
        """Test system health when performance is degraded"""
        # Mock high resource usage
        mock_psutil.cpu_percent.return_value = 85.0  # High CPU
        mock_memory = Mock()
        mock_memory.percent = 85.0  # High memory
        mock_psutil.virtual_memory.return_value = mock_memory
        
        mock_disk = Mock()
        mock_disk.percent = 95.0  # High disk usage
        mock_psutil.disk_usage.return_value = mock_disk
        
        service = MonitoringService()
        
        # Mock healthy components but high resource usage
        service._check_database_health = Mock(return_value=True)
        service._check_redis_health = Mock(return_value=True)
        service._check_celery_health = Mock(return_value=True)
        service._get_database_metrics = Mock(return_value=(10, 25.5))
        service._get_celery_metrics = Mock(return_value={
            "active_tasks": 5,
            "pending_tasks": 2,
            "failed_tasks": 0,
            "workers": 3
        })
        service._get_performance_metrics = Mock(return_value={
            "average_response_time_ms": 150.0,
            "requests_per_minute": 45.0,
            "error_rate_percent": 2.0
        })
        
        result = service.get_system_health()
        
        assert result["status"] == "degraded"
        assert result["cpu_usage_percent"] == 85.0
        assert result["memory_usage_percent"] == 85.0
        assert result["disk_usage_percent"] == 95.0
    
    def test_get_system_health_unhealthy(self):
        """Test system health when components are failing"""
        service = MonitoringService()
        
        # Mock failed components
        service._check_database_health = Mock(return_value=False)
        service._check_redis_health = Mock(return_value=False)
        service._check_celery_health = Mock(return_value=False)
        
        result = service.get_system_health()
        
        assert result["status"] == "unhealthy"
        assert result["database_status"] is False
        assert result["redis_status"] is False
        assert result["celery_status"] is False
    
    @patch('app.services.monitoring_service.SessionLocal')
    @patch('app.services.monitoring_service.redis_client')
    def test_check_database_health_success(self, mock_redis, mock_session_local):
        """Test successful database health check"""
        # Mock database session
        mock_db = Mock()
        mock_session_local.return_value = mock_db
        
        # Mock successful query execution
        mock_result = Mock()
        mock_result.fetchone.return_value = (1,)
        mock_db.execute.return_value = mock_result
        
        mock_redis.set.return_value = True
        
        service = MonitoringService()
        
        result = service._check_database_health()
        
        assert result is True
        mock_db.execute.assert_called_once()
        mock_db.close.assert_called_once()
    
    @patch('app.services.monitoring_service.SessionLocal')
    def test_check_database_health_failure(self, mock_session_local):
        """Test database health check failure"""
        # Mock database session that raises exception
        mock_db = Mock()
        mock_session_local.return_value = mock_db
        mock_db.execute.side_effect = Exception("Database connection failed")
        
        service = MonitoringService()
        
        result = service._check_database_health()
        
        assert result is False
    
    @patch('app.services.monitoring_service.redis_client')
    def test_check_redis_health_success(self, mock_redis):
        """Test successful Redis health check"""
        mock_redis.set.return_value = True
        mock_redis.get.return_value = "test_value"
        mock_redis.delete.return_value = 1
        
        service = MonitoringService()
        
        result = service._check_redis_health()
        
        assert result is True
        # Redis set is called twice - once for test and once for response time
        assert mock_redis.set.call_count >= 1
        mock_redis.get.assert_called_once()
        mock_redis.delete.assert_called_once()
    
    @patch('app.services.monitoring_service.redis_client')
    def test_check_redis_health_failure(self, mock_redis):
        """Test Redis health check failure"""
        mock_redis.set.side_effect = Exception("Redis connection failed")
        
        service = MonitoringService()
        
        result = service._check_redis_health()
        
        assert result is False
    
    @patch('app.services.monitoring_service.celery_app')
    def test_check_celery_health_success(self, mock_celery_app):
        """Test successful Celery health check"""
        # Mock Celery inspect
        mock_inspect = Mock()
        mock_celery_app.control.inspect.return_value = mock_inspect
        
        mock_inspect.active.return_value = {"worker1": []}
        mock_inspect.stats.return_value = {"worker1": {"status": "online"}}
        
        service = MonitoringService()
        
        result = service._check_celery_health()
        
        assert result is True
    
    @patch('app.services.monitoring_service.celery_app')
    def test_check_celery_health_failure(self, mock_celery_app):
        """Test Celery health check failure"""
        # Mock Celery inspect that returns no workers
        mock_inspect = Mock()
        mock_celery_app.control.inspect.return_value = mock_inspect
        
        mock_inspect.active.return_value = None
        
        service = MonitoringService()
        
        result = service._check_celery_health()
        
        assert result is False
    
    @patch('app.services.monitoring_service.redis_client')
    def test_record_api_metrics(self, mock_redis):
        """Test API metrics recording"""
        mock_redis.incr.return_value = 1
        mock_redis.expire.return_value = True
        mock_redis.get.return_value = []
        mock_redis.set.return_value = True
        
        service = MonitoringService()
        service._update_rolling_metrics = Mock()  # Mock this to avoid complexity
        
        service.record_api_metrics(
            endpoint="/api/invoices",
            method="POST",
            response_time_ms=150.5,
            status_code=201,
            tenant_id="tenant123"
        )
        
        # Verify Redis calls were made
        assert mock_redis.incr.call_count >= 1
        assert mock_redis.expire.call_count >= 1
        assert mock_redis.get.call_count >= 1
        assert mock_redis.set.call_count >= 1
    
    @patch('app.services.monitoring_service.redis_client')
    def test_update_rolling_metrics(self, mock_redis):
        """Test rolling metrics update"""
        # Mock Redis responses for metrics calculation
        mock_redis.get.side_effect = [
            5,    # requests minute 0
            0,    # errors minute 0
            [100, 150, 200],  # response times minute 0
            3,    # requests minute 1
            1,    # errors minute 1
            [120, 180],  # response times minute 1
            # ... continue for 5 minutes
            0, 0, [],  # minute 2
            0, 0, [],  # minute 3
            0, 0, []   # minute 4
        ]
        
        mock_redis.set.return_value = True
        
        service = MonitoringService()
        
        service._update_rolling_metrics()
        
        # Verify that rolling metrics were calculated and stored
        assert mock_redis.set.call_count == 3  # avg_response_time, requests_per_minute, error_rate
    
    @patch('app.services.monitoring_service.celery_app')
    @patch('app.services.monitoring_service.redis_client')
    def test_get_celery_monitoring(self, mock_redis, mock_celery_app):
        """Test Celery monitoring data retrieval"""
        # Mock Celery inspect
        mock_inspect = Mock()
        mock_celery_app.control.inspect.return_value = mock_inspect
        
        # Mock active tasks
        mock_inspect.active.return_value = {
            "worker1": [
                {
                    "id": "task1",
                    "name": "app.tasks.backup_task",
                    "time_start": time.time() - 30,  # 30 seconds ago
                    "args": [],
                    "kwargs": {}
                }
            ]
        }
        
        # Mock scheduled tasks
        mock_inspect.scheduled.return_value = {
            "worker1": [
                {
                    "request": {
                        "id": "task2",
                        "task": "app.tasks.notification_task",
                        "args": [],
                        "kwargs": {}
                    },
                    "eta": time.time() + 60  # 1 minute from now
                }
            ]
        }
        
        # Mock worker stats
        mock_inspect.stats.return_value = {
            "worker1": {
                "total": {"tasks.total": 100},
                "rusage": {"utime": 45.5, "maxrss": 1024}
            }
        }
        
        # Mock Redis responses for recent tasks
        mock_redis.get.side_effect = [[], []]  # failed and completed tasks
        
        service = MonitoringService()
        
        result = service.get_celery_monitoring()
        
        assert result["total_active"] == 1
        assert result["total_pending"] == 1
        assert result["worker_count"] == 1
        assert len(result["active_tasks"]) == 1
        assert len(result["pending_tasks"]) == 1
        assert result["active_tasks"][0]["task_id"] == "task1"
        assert result["pending_tasks"][0]["task_id"] == "task2"


class TestAnalyticsAPI:
    """Test cases for Analytics API endpoints"""
    
    @pytest.fixture
    def mock_analytics_service(self):
        """Mock analytics service"""
        with patch('app.api.analytics.AnalyticsService') as mock:
            yield mock
    
    @pytest.fixture
    def mock_monitoring_service(self):
        """Mock monitoring service"""
        with patch('app.api.analytics.MonitoringService') as mock:
            yield mock
    
    @pytest.fixture
    def mock_super_admin_user(self):
        """Mock super admin user for testing"""
        return {
            "user_id": "super_admin_123",
            "is_super_admin": True,
            "token": "mock_super_admin_token"
        }
    
    def test_platform_analytics_endpoint_success(self, client, mock_super_admin_user, mock_analytics_service):
        """Test successful platform analytics endpoint"""
        # Mock service response
        mock_service_instance = mock_analytics_service.return_value
        mock_service_instance.get_platform_analytics.return_value = {
            "total_signups": 100,
            "signups_this_month": 15,
            "signups_last_month": 10,
            "signup_growth_rate": 50.0,
            "total_active_subscriptions": 80,
            "free_subscriptions": 60,
            "pro_subscriptions": 20,
            "subscription_conversion_rate": 20.0,
            "monthly_recurring_revenue": 1000.0,
            "mrr_growth_rate": 25.0,
            "average_revenue_per_user": 12.5,
            "total_invoices_created": 500,
            "invoices_this_month": 75,
            "active_tenants_last_30_days": 65,
            "signup_trend": [],
            "revenue_trend": [],
            "generated_at": datetime.now(timezone.utc),
            "time_range": "30d"
        }
        
        response = client.get(
            "/api/super-admin/analytics/platform",
            headers={"Authorization": f"Bearer {mock_super_admin_user['token']}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["total_signups"] == 100
        assert data["monthly_recurring_revenue"] == 1000.0
        assert data["signup_growth_rate"] == 50.0
    
    def test_user_activity_endpoint_success(self, client, mock_super_admin_user, mock_analytics_service):
        """Test successful user activity endpoint"""
        # Mock service response
        mock_service_instance = mock_analytics_service.return_value
        mock_service_instance.get_user_activity.return_value = {
            "total_active_users": 25,
            "active_users_by_tenant": {"tenant1": 15, "tenant2": 10},
            "user_sessions": [],
            "peak_concurrent_users": 45,
            "average_session_duration": 28.5,
            "last_updated": datetime.now(timezone.utc),
            "refresh_interval": 30
        }
        
        response = client.get(
            "/api/super-admin/analytics/user-activity",
            headers={"Authorization": f"Bearer {mock_super_admin_user['token']}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["total_active_users"] == 25
        assert data["peak_concurrent_users"] == 45
    
    def test_system_health_endpoint_success(self, client, mock_super_admin_user, mock_monitoring_service):
        """Test successful system health endpoint"""
        # Mock service response
        mock_service_instance = mock_monitoring_service.return_value
        mock_service_instance.get_system_health.return_value = {
            "status": "healthy",
            "database_status": True,
            "redis_status": True,
            "celery_status": True,
            "cpu_usage_percent": 45.0,
            "memory_usage_percent": 60.0,
            "disk_usage_percent": 70.0,
            "database_connections": 10,
            "database_response_time_ms": 25.5,
            "celery_active_tasks": 5,
            "celery_pending_tasks": 2,
            "celery_failed_tasks": 0,
            "celery_workers": 3,
            "average_response_time_ms": 150.0,
            "requests_per_minute": 45.0,
            "error_rate_percent": 2.0,
            "last_health_check": datetime.now(timezone.utc),
            "uptime_seconds": 86400
        }
        
        response = client.get(
            "/api/super-admin/analytics/system-health",
            headers={"Authorization": f"Bearer {mock_super_admin_user['token']}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["cpu_usage_percent"] == 45.0
        assert data["database_status"] is True
    
    def test_heartbeat_endpoint_success(self, client, mock_analytics_service):
        """Test successful heartbeat endpoint"""
        # Mock service response
        mock_service_instance = mock_analytics_service.return_value
        mock_service_instance.record_user_heartbeat.return_value = True
        
        heartbeat_data = {
            "user_id": "user123",
            "tenant_id": "tenant456",
            "session_id": "session789",
            "page": "/dashboard"
        }
        
        response = client.post(
            "/api/super-admin/analytics/heartbeat",
            json=heartbeat_data
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["next_heartbeat_in"] == 30
    
    def test_error_logs_endpoint_success(self, client, mock_super_admin_user, mock_analytics_service):
        """Test successful error logs endpoint"""
        # Mock service response
        mock_service_instance = mock_analytics_service.return_value
        mock_service_instance.get_api_error_logs.return_value = {
            "errors": [
                {
                    "id": "error1",
                    "action": "invoice_created",
                    "error_message": "Database error",
                    "created_at": "2024-01-01T12:00:00Z"
                }
            ],
            "total_errors": 1,
            "error_rate": 5.0,
            "most_common_errors": [{"action": "invoice_created", "count": 1}],
            "errors_by_endpoint": {"invoice_created": 1},
            "errors_by_tenant": {"tenant1": 1},
            "time_range": "24h",
            "generated_at": datetime.now(timezone.utc)
        }
        
        response = client.get(
            "/api/super-admin/analytics/error-logs",
            headers={"Authorization": f"Bearer {mock_super_admin_user['token']}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["total_errors"] == 1
        assert data["error_rate"] == 5.0
        assert len(data["errors"]) == 1
    
    def test_analytics_endpoint_unauthorized(self, client):
        """Test analytics endpoint without authentication"""
        response = client.get("/api/super-admin/analytics/platform")
        
        # Should return 403 Forbidden for super admin endpoints without proper auth
        assert response.status_code == 403
    
    def test_analytics_endpoint_service_error(self, client, mock_super_admin_user, mock_analytics_service):
        """Test analytics endpoint with service error"""
        # Mock service to raise exception
        mock_service_instance = mock_analytics_service.return_value
        mock_service_instance.get_platform_analytics.side_effect = Exception("Service error")
        
        response = client.get(
            "/api/super-admin/analytics/platform",
            headers={"Authorization": f"Bearer {mock_super_admin_user['token']}"}
        )
        
        assert response.status_code == 500
        assert "Failed to retrieve platform analytics" in response.json()["detail"]


# Integration test fixtures and helpers
@pytest.fixture
def sample_tenants(db_session):
    """Create sample tenants for testing"""
    tenants = []
    
    # Create tenants with different subscription types and statuses
    for i in range(10):
        tenant = Tenant(
            name=f"Test Business {i}",
            email=f"business{i}@test.com",
            subscription_type=SubscriptionType.PRO if i % 3 == 0 else SubscriptionType.FREE,
            status=TenantStatus.ACTIVE if i % 4 != 3 else TenantStatus.SUSPENDED,
            created_at=datetime.now(timezone.utc) - timedelta(days=i*5)
        )
        db_session.add(tenant)
        tenants.append(tenant)
    
    db_session.commit()
    return tenants


@pytest.fixture
def sample_users(db_session, sample_tenants):
    """Create sample users for testing"""
    users = []
    
    for i, tenant in enumerate(sample_tenants[:5]):  # Only first 5 tenants
        user = User(
            tenant_id=tenant.id,
            email=f"user{i}@{tenant.email}",
            password_hash="hashed_password",
            role=UserRole.ADMIN if i == 0 else UserRole.USER,
            status=UserStatus.ACTIVE,
            created_at=datetime.now(timezone.utc) - timedelta(days=i*3)
        )
        db_session.add(user)
        users.append(user)
    
    db_session.commit()
    return users


@pytest.fixture
def sample_customers(db_session, sample_tenants):
    """Create sample customers for testing"""
    from app.models.customer import Customer
    customers = []
    
    for i, tenant in enumerate(sample_tenants[:3]):  # Only first 3 tenants
        customer = Customer(
            tenant_id=tenant.id,
            name=f"Test Customer {i}",
            email=f"customer{i}@test.com",
            phone=f"123456789{i}",
            created_at=datetime.now(timezone.utc) - timedelta(days=i*2)
        )
        db_session.add(customer)
        customers.append(customer)
    
    db_session.commit()
    return customers


@pytest.fixture
def sample_invoices(db_session, sample_tenants, sample_customers):
    """Create sample invoices for testing"""
    invoices = []
    
    for i, (tenant, customer) in enumerate(zip(sample_tenants[:3], sample_customers)):  # Only first 3 tenants
        for j in range(5):  # 5 invoices per tenant
            from app.models.invoice import InvoiceType
            invoice = Invoice(
                tenant_id=tenant.id,
                customer_id=customer.id,
                invoice_number=f"INV-{i}-{j}",
                invoice_type=InvoiceType.GENERAL,  # Required field
                total_amount=100.0 + (i * 50) + (j * 10),
                created_at=datetime.now(timezone.utc) - timedelta(days=i*2 + j)
            )
            db_session.add(invoice)
            invoices.append(invoice)
    
    db_session.commit()
    return invoices


class TestAnalyticsIntegration:
    """Integration tests for analytics with real database"""
    
    def test_platform_analytics_with_real_data(self, db_session, sample_tenants, sample_customers, sample_invoices):
        """Test platform analytics with real database data"""
        service = AnalyticsService(db_session)
        
        result = service.get_platform_analytics(TimeRange.LAST_30_DAYS)
        
        # Verify basic metrics
        assert result["total_signups"] == len(sample_tenants)
        assert result["total_invoices_created"] == len(sample_invoices)
        assert result["pro_subscriptions"] >= 0
        assert result["free_subscriptions"] >= 0
        assert isinstance(result["signup_trend"], list)
        assert isinstance(result["revenue_trend"], list)
    
    def test_error_logs_with_real_data(self, db_session, sample_tenants):
        """Test error logs with real activity log data"""
        # Create some error activity logs
        for i, tenant in enumerate(sample_tenants[:3]):
            ActivityLog.log_action(
                db=db_session,
                tenant_id=tenant.id,
                action=f"test_action_{i}",
                status="failed",
                error_message=f"Test error {i}",
                details={"test": True}
            )
        
        service = AnalyticsService(db_session)
        
        result = service.get_api_error_logs(
            time_range=TimeRange.LAST_24_HOURS,
            limit=10,
            offset=0
        )
        
        assert result["total_errors"] >= 3
        assert len(result["errors"]) >= 3
        assert result["error_rate"] >= 0
        assert len(result["most_common_errors"]) > 0