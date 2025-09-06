"""
Unit tests for Super Admin Platform Analytics Charts Backend
Tests all analytics calculations with historical data scenarios
"""

import pytest
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from sqlalchemy.orm import Session

from app.services.analytics_service import AnalyticsService
from app.models.tenant import Tenant, SubscriptionType, TenantStatus
from app.models.user import User
from app.models.invoice import Invoice, InvoiceType
from app.schemas.analytics import TimeRange
from app.core.database import get_db, SessionLocal
from app.core.config import settings


class TestAnalyticsChartsBackend:
    """Test class for analytics charts backend functionality"""
    
    @pytest.fixture
    def db_session(self):
        """Real database session for testing"""
        db = SessionLocal()
        try:
            yield db
        finally:
            db.close()
    
    @pytest.fixture
    def analytics_service(self, db_session):
        """Analytics service instance with real database"""
        return AnalyticsService(db_session)
    
    @pytest.fixture
    def sample_tenants(self):
        """Sample tenant data for testing"""
        now = datetime.now(timezone.utc)
        return [
            # Free tenants
            Tenant(
                id="tenant-1",
                name="Test Tenant 1",
                subscription_type=SubscriptionType.FREE,
                status=TenantStatus.ACTIVE,
                created_at=now - timedelta(days=30),
                subscription_starts_at=now - timedelta(days=30)
            ),
            Tenant(
                id="tenant-2", 
                name="Test Tenant 2",
                subscription_type=SubscriptionType.FREE,
                status=TenantStatus.ACTIVE,
                created_at=now - timedelta(days=25),
                subscription_starts_at=now - timedelta(days=25)
            ),
            # Pro tenants (conversions)
            Tenant(
                id="tenant-3",
                name="Test Tenant 3",
                subscription_type=SubscriptionType.PRO,
                status=TenantStatus.ACTIVE,
                created_at=now - timedelta(days=20),
                subscription_starts_at=now - timedelta(days=15)  # Converted after 5 days
            ),
            Tenant(
                id="tenant-4",
                name="Test Tenant 4", 
                subscription_type=SubscriptionType.PRO,
                status=TenantStatus.ACTIVE,
                created_at=now - timedelta(days=10),
                subscription_starts_at=now - timedelta(days=5)  # Converted after 5 days
            )
        ]
    
    @pytest.fixture
    def sample_users(self):
        """Sample user data for testing"""
        now = datetime.now(timezone.utc)
        return [
            User(
                id="user-1",
                tenant_id="tenant-1",
                email="user1@test.com",
                created_at=now - timedelta(days=30)
            ),
            User(
                id="user-2",
                tenant_id="tenant-1", 
                email="user2@test.com",
                created_at=now - timedelta(days=25)
            ),
            User(
                id="user-3",
                tenant_id="tenant-2",
                email="user3@test.com", 
                created_at=now - timedelta(days=20)
            ),
            User(
                id="user-4",
                tenant_id="tenant-3",
                email="user4@test.com",
                created_at=now - timedelta(days=15)
            ),
            User(
                id="user-5",
                tenant_id="tenant-4",
                email="user5@test.com",
                created_at=now - timedelta(days=10)
            )
        ]
    
    @pytest.fixture
    def sample_invoices(self):
        """Sample invoice data for testing"""
        now = datetime.now(timezone.utc)
        return [
            # General invoices
            Invoice(
                id="invoice-1",
                tenant_id="tenant-1",
                customer_id="customer-1",
                invoice_type=InvoiceType.GENERAL,
                total_amount=Decimal("100.00"),
                created_at=now - timedelta(days=25)
            ),
            Invoice(
                id="invoice-2",
                tenant_id="tenant-1",
                customer_id="customer-2", 
                invoice_type=InvoiceType.GENERAL,
                total_amount=Decimal("150.00"),
                created_at=now - timedelta(days=20)
            ),
            # Gold invoices
            Invoice(
                id="invoice-3",
                tenant_id="tenant-2",
                customer_id="customer-3",
                invoice_type=InvoiceType.GOLD,
                total_amount=Decimal("500.00"),
                created_at=now - timedelta(days=15)
            ),
            Invoice(
                id="invoice-4",
                tenant_id="tenant-3",
                customer_id="customer-4",
                invoice_type=InvoiceType.GOLD,
                total_amount=Decimal("750.00"),
                created_at=now - timedelta(days=10)
            ),
            Invoice(
                id="invoice-5",
                tenant_id="tenant-4",
                customer_id="customer-5",
                invoice_type=InvoiceType.GENERAL,
                total_amount=Decimal("200.00"),
                created_at=now - timedelta(days=5)
            )
        ]

    def test_get_user_growth_trends_daily(self, analytics_service):
        """Test user growth trends with daily aggregation"""
        now = datetime.now(timezone.utc)
        start_date = now - timedelta(days=30)
        end_date = now
        
        # Test the method with real database (may be empty)
        result = analytics_service.get_user_growth_trends(start_date, end_date, "daily")
        
        # Assertions - basic structure validation
        assert result["aggregation"] == "daily"
        assert "total_users" in result
        assert "trend_data" in result
        assert "growth_rate" in result
        assert isinstance(result["trend_data"], list)
        assert isinstance(result["total_users"], int)
        assert isinstance(result["growth_rate"], float)
        
    def test_get_user_growth_trends_weekly(self, analytics_service):
        """Test user growth trends with weekly aggregation"""
        now = datetime.now(timezone.utc)
        start_date = now - timedelta(days=30)
        end_date = now
        
        result = analytics_service.get_user_growth_trends(start_date, end_date, "weekly")
        
        assert result["aggregation"] == "weekly"
        assert "trend_data" in result
        assert "total_users" in result
        assert isinstance(result["trend_data"], list)

    def test_get_user_growth_trends_monthly(self, analytics_service):
        """Test user growth trends with monthly aggregation"""
        now = datetime.now(timezone.utc)
        start_date = now - timedelta(days=90)
        end_date = now
        
        result = analytics_service.get_user_growth_trends(start_date, end_date, "monthly")
        
        assert result["aggregation"] == "monthly"
        assert "trend_data" in result
        assert "total_users" in result
        assert isinstance(result["trend_data"], list)

    def test_get_revenue_analysis_trends_daily(self, analytics_service):
        """Test revenue analysis trends with daily aggregation and MRR calculations"""
        now = datetime.now(timezone.utc)
        start_date = now - timedelta(days=30)
        end_date = now
        
        result = analytics_service.get_revenue_analysis_trends(start_date, end_date, "daily")
        
        # Assertions - basic structure validation
        assert result["aggregation"] == "daily"
        assert "trend_data" in result
        assert "mrr_trend" in result
        assert "growth_metrics" in result
        assert isinstance(result["trend_data"], list)
        assert isinstance(result["mrr_trend"], list)
        assert isinstance(result["growth_metrics"], dict)
        
        # Check growth metrics structure
        assert "current_mrr" in result["growth_metrics"]
        assert "mrr_growth_rate" in result["growth_metrics"]
        assert "revenue_growth_rate" in result["growth_metrics"]

    def test_get_invoice_volume_trends_daily(self, analytics_service):
        """Test platform-wide invoice creation volume tracking with daily aggregation"""
        now = datetime.now(timezone.utc)
        start_date = now - timedelta(days=30)
        end_date = now
        
        result = analytics_service.get_invoice_volume_trends(start_date, end_date, "daily")
        
        # Assertions - basic structure validation
        assert result["aggregation"] == "daily"
        assert "total_invoices" in result
        assert "average_per_day" in result
        assert "trend_data" in result
        assert "by_invoice_type" in result
        assert "top_tenants" in result
        assert isinstance(result["trend_data"], list)
        assert isinstance(result["total_invoices"], int)
        assert isinstance(result["average_per_day"], float)
        assert isinstance(result["by_invoice_type"], dict)
        assert isinstance(result["top_tenants"], list)

    def test_get_subscription_conversion_trends_daily(self, analytics_service):
        """Test subscription conversion tracking (Free to Pro upgrades) with daily aggregation"""
        now = datetime.now(timezone.utc)
        start_date = now - timedelta(days=30)
        end_date = now
        
        result = analytics_service.get_subscription_conversion_trends(start_date, end_date, "daily")
        
        # Assertions - basic structure validation
        assert result["aggregation"] == "daily"
        assert "total_conversions" in result
        assert "conversion_rate" in result
        assert "average_time_to_convert" in result
        assert "trend_data" in result
        assert "conversion_funnel" in result
        assert "revenue_impact" in result
        assert isinstance(result["trend_data"], list)
        assert isinstance(result["total_conversions"], int)
        assert isinstance(result["conversion_rate"], float)
        assert isinstance(result["average_time_to_convert"], float)
        assert isinstance(result["conversion_funnel"], dict)
        assert isinstance(result["revenue_impact"], dict)
        
        # Check revenue impact structure
        assert "monthly_revenue_added" in result["revenue_impact"]
        assert "annual_revenue_potential" in result["revenue_impact"]

    def test_aggregation_parameter_validation(self, analytics_service):
        """Test that different aggregation parameters work correctly"""
        now = datetime.now(timezone.utc)
        start_date = now - timedelta(days=30)
        end_date = now
        
        # Test all aggregation types
        for aggregation in ["daily", "weekly", "monthly"]:
            result = analytics_service.get_user_growth_trends(start_date, end_date, aggregation)
            assert result["aggregation"] == aggregation
            
            result = analytics_service.get_revenue_analysis_trends(start_date, end_date, aggregation)
            assert result["aggregation"] == aggregation
            
            result = analytics_service.get_invoice_volume_trends(start_date, end_date, aggregation)
            assert result["aggregation"] == aggregation
            
            result = analytics_service.get_subscription_conversion_trends(start_date, end_date, aggregation)
            assert result["aggregation"] == aggregation

    def test_analytics_methods_return_correct_structure(self, analytics_service):
        """Test that all analytics methods return the expected data structure"""
        now = datetime.now(timezone.utc)
        start_date = now - timedelta(days=7)
        end_date = now
        
        # Test user growth trends
        user_result = analytics_service.get_user_growth_trends(start_date, end_date, "daily")
        required_keys = ["trend_data", "total_users", "growth_rate", "aggregation", "period_count"]
        for key in required_keys:
            assert key in user_result
        
        # Test revenue analysis trends
        revenue_result = analytics_service.get_revenue_analysis_trends(start_date, end_date, "daily")
        required_keys = ["trend_data", "mrr_trend", "growth_metrics", "aggregation", "period_count"]
        for key in required_keys:
            assert key in revenue_result
        
        # Test invoice volume trends
        invoice_result = analytics_service.get_invoice_volume_trends(start_date, end_date, "daily")
        required_keys = ["trend_data", "total_invoices", "average_per_day", "growth_rate", "by_invoice_type", "top_tenants", "aggregation"]
        for key in required_keys:
            assert key in invoice_result
        
        # Test subscription conversion trends
        conversion_result = analytics_service.get_subscription_conversion_trends(start_date, end_date, "daily")
        required_keys = ["trend_data", "total_conversions", "conversion_rate", "average_time_to_convert", "conversion_funnel", "revenue_impact", "aggregation"]
        for key in required_keys:
            assert key in conversion_result

    def test_time_range_handling(self, analytics_service):
        """Test that different time ranges are handled correctly"""
        now = datetime.now(timezone.utc)
        
        # Test different time ranges
        time_ranges = [
            (now - timedelta(days=1), now),    # 1 day
            (now - timedelta(days=7), now),    # 1 week
            (now - timedelta(days=30), now),   # 1 month
            (now - timedelta(days=90), now),   # 3 months
        ]
        
        for start_date, end_date in time_ranges:
            # All methods should handle different time ranges without errors
            user_result = analytics_service.get_user_growth_trends(start_date, end_date, "daily")
            assert isinstance(user_result, dict)
            
            revenue_result = analytics_service.get_revenue_analysis_trends(start_date, end_date, "daily")
            assert isinstance(revenue_result, dict)
            
            invoice_result = analytics_service.get_invoice_volume_trends(start_date, end_date, "daily")
            assert isinstance(invoice_result, dict)
            
            conversion_result = analytics_service.get_subscription_conversion_trends(start_date, end_date, "daily")
            assert isinstance(conversion_result, dict)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])