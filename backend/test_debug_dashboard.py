#!/usr/bin/env python3

"""
Debug script to test super admin dashboard endpoint
"""

import sys
import os
sys.path.append('/app')

from fastapi.testclient import TestClient
from unittest.mock import Mock, patch
from datetime import datetime, timezone

from app.main import app
from app.core.database import get_db
from app.core.auth import get_super_admin_user
from app.models.user import User

def test_dashboard_debug():
    """Debug dashboard endpoint"""
    
    # Setup mocks
    mock_db = Mock()
    
    # Mock database queries to return proper counts
    mock_query = Mock()
    mock_query.filter.return_value.count.return_value = 5
    mock_db.query.return_value = mock_query
    
    mock_user = Mock(spec=User)
    mock_user.id = "admin-123"
    mock_user.email = "admin@test.com"
    mock_user.is_super_admin = True
    
    # Override dependencies
    app.dependency_overrides[get_db] = lambda: mock_db
    app.dependency_overrides[get_super_admin_user] = lambda: mock_user
    
    # Create test client
    client = TestClient(app)
    
    # Mock analytics service
    with patch('app.api.super_admin_dashboard.AnalyticsService') as mock_analytics_class:
        with patch('app.api.super_admin_dashboard.MonitoringService') as mock_monitoring_class:
            with patch('app.api.super_admin_dashboard.redis_client') as mock_redis:
                
                # Setup analytics mock
                mock_analytics = Mock()
                mock_analytics.get_platform_analytics.return_value = {
                    "total_signups": 150,
                    "signups_this_month": 25,
                    "signups_last_month": 20,
                    "signup_growth_rate": 25.0,
                    "total_active_subscriptions": 120,
                    "free_subscriptions": 100,
                    "pro_subscriptions": 20,
                    "subscription_conversion_rate": 13.33,
                    "monthly_recurring_revenue": 1000.0,
                    "mrr_growth_rate": 15.0,
                    "average_revenue_per_user": 8.33,
                    "total_invoices_created": 500,
                    "invoices_this_month": 75,
                    "active_tenants_last_30_days": 95,
                    "signup_trend": [
                        {"date": "2024-01-01", "signups": 5},
                        {"date": "2024-01-02", "signups": 8}
                    ],
                    "revenue_trend": [
                        {"date": "2024-01-01", "revenue": 250.0, "new_subscriptions": 5},
                        {"date": "2024-01-02", "revenue": 400.0, "new_subscriptions": 8}
                    ],
                    "generated_at": datetime.now(timezone.utc),
                    "time_range": "last_30_days"
                }
                
                mock_analytics.get_user_activity.return_value = {
                    "total_active_users": 45,
                    "active_users_by_tenant": {"tenant-1": 10, "tenant-2": 15},
                    "user_sessions": [
                        {
                            "user_id": "user-1",
                            "tenant_id": "tenant-1",
                            "session_id": "session-1",
                            "page": "/dashboard",
                            "last_seen": datetime.now(timezone.utc).isoformat()
                        }
                    ],
                    "peak_concurrent_users": 60,
                    "average_session_duration": 25.5,
                    "last_updated": datetime.now(timezone.utc),
                    "refresh_interval": 30
                }
                
                mock_analytics.get_revenue_analysis_trends.return_value = {
                    "trend_data": [
                        {"period": "2024-01-01", "new_subscriptions": 5, "new_revenue": 250.0, "cumulative_revenue": 250.0, "period_mrr": 250.0}
                    ],
                    "mrr_trend": [{"period": "2024-01-01", "mrr": 250.0}],
                    "growth_metrics": {
                        "current_mrr": 1000.0,
                        "mrr_growth_rate": 15.0,
                        "revenue_growth_rate": 20.0,
                        "total_revenue": 5000.0,
                        "average_revenue_per_period": 250.0
                    },
                    "aggregation": "daily",
                    "period_count": 30
                }
                
                mock_analytics.get_user_growth_trends.return_value = {
                    "trend_data": [
                        {"period": "2024-01-01", "new_users": 10, "cumulative_users": 100, "new_tenants": 5}
                    ],
                    "total_users": 500,
                    "growth_rate": 12.5,
                    "aggregation": "daily",
                    "period_count": 30
                }
                
                mock_analytics.get_invoice_volume_trends.return_value = {
                    "trend_data": [
                        {"period": "2024-01-01", "invoice_count": 10, "total_value": 1000.0}
                    ],
                    "total_invoices": 500,
                    "total_value": 25000.0,
                    "aggregation": "daily",
                    "period_count": 30
                }
                
                # Setup monitoring mock
                mock_monitoring = Mock()
                mock_monitoring.get_system_health.return_value = {
                    "status": "healthy",
                    "database_status": True,
                    "redis_status": True,
                    "celery_status": True,
                    "cpu_usage_percent": 45.2,
                    "memory_usage_percent": 62.8,
                    "disk_usage_percent": 35.1,
                    "database_connections": 15,
                    "database_response_time_ms": 25.5,
                    "celery_active_tasks": 3,
                    "celery_pending_tasks": 1,
                    "celery_failed_tasks": 0,
                    "celery_workers": 2,
                    "average_response_time_ms": 120.5,
                    "requests_per_minute": 45.0,
                    "error_rate_percent": 1.2,
                    "last_health_check": datetime.now(timezone.utc),
                    "uptime_seconds": 86400
                }
                
                mock_monitoring.get_system_alerts.return_value = {
                    "critical_alerts": [],
                    "warning_alerts": [
                        {
                            "type": "high_cpu",
                            "message": "High CPU usage: 85.5%",
                            "timestamp": datetime.now(timezone.utc),
                            "threshold": 80,
                            "current_value": 85.5
                        }
                    ],
                    "info_alerts": [],
                    "total_alerts": 1,
                    "last_updated": datetime.now(timezone.utc)
                }
                
                # Wire up mocks
                mock_analytics_class.return_value = mock_analytics
                mock_monitoring_class.return_value = mock_monitoring
                mock_redis.set = Mock()
                
                # Make request
                print("Making request to dashboard endpoint...")
                try:
                    response = client.get("/api/super-admin/dashboard/")
                except Exception as e:
                    print(f"Exception during request: {e}")
                    import traceback
                    traceback.print_exc()
                    return
                
                print(f"Response status: {response.status_code}")
                if response.status_code != 200:
                    print(f"Response content: {response.content}")
                    print(f"Response text: {response.text}")
                else:
                    print("Success!")
                    data = response.json()
                    print(f"Response keys: {list(data.keys())}")
    
    # Clean up
    app.dependency_overrides.clear()

if __name__ == "__main__":
    test_dashboard_debug()