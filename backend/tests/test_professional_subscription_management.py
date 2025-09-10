"""
Comprehensive tests for Professional Subscription Management Backend APIs
Tests full manual subscription control, extension, status management, and history tracking
"""

import pytest
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
import json

from app.main import app
from app.core.database import get_db
from app.models.tenant import Tenant, SubscriptionType, TenantStatus
from app.models.user import User, UserRole, UserStatus
from app.core.auth import create_access_token


class TestProfessionalSubscriptionManagementAPI:
    """Test Professional Subscription Management API endpoints"""
    
    @pytest.fixture
    def client(self):
        """Create test client"""
        return TestClient(app)
    
    @pytest.fixture
    def db_session(self):
        """Create test database session with real PostgreSQL"""
        from app.core.database import SessionLocal, engine
        from app.models.base import BaseModel
        
        # Create tables in real PostgreSQL
        BaseModel.metadata.create_all(bind=engine)
        
        db = SessionLocal()
        try:
            yield db
        finally:
            # Clean up test data in correct order to avoid foreign key violations
            try:
                # Delete tables that reference users first
                db.execute("DELETE FROM activity_logs")
                db.execute("DELETE FROM backup_records") 
                db.execute("DELETE FROM restore_operations")
                db.execute("DELETE FROM customer_interactions")
                db.execute("DELETE FROM stock_movements")
                db.execute("DELETE FROM subscription_history")
                
                # Then delete users and tenants
                db.query(User).delete()
                db.query(Tenant).delete()
                db.commit()
            except Exception as e:
                db.rollback()
                print(f"Error cleaning database: {e}")
            finally:
                db.close()
    
    @pytest.fixture
    def super_admin_user(self, db_session):
        """Create super admin user for testing"""
        # Create super admin tenant
        admin_tenant = Tenant(
            name="Super Admin Tenant",
            email="admin@hesaabplus.com",
            subscription_type=SubscriptionType.PRO,
            status=TenantStatus.ACTIVE
        )
        db_session.add(admin_tenant)
        db_session.commit()
        
        # Create super admin user
        admin_user = User(
            tenant_id=admin_tenant.id,
            email="superadmin@hesaabplus.com",
            password_hash="hashed_password",
            first_name="Super",
            last_name="Admin",
            role=UserRole.ADMIN,
            status=UserStatus.ACTIVE,
            is_super_admin=True
        )
        db_session.add(admin_user)
        db_session.commit()
        db_session.refresh(admin_user)
        
        return admin_user
    
    @pytest.fixture
    def super_admin_headers(self, super_admin_user):
        """Create super admin authentication headers"""
        token = create_access_token(
            data={
                "user_id": str(super_admin_user.id),
                "tenant_id": str(super_admin_user.tenant_id),
                "email": super_admin_user.email,
                "is_super_admin": True
            }
        )
        return {"Authorization": f"Bearer {token}"}
    
    @pytest.fixture
    def test_tenants(self, db_session):
        """Create test tenants with different subscription states"""
        tenants = []
        
        # Free tenant
        free_tenant = Tenant(
            name="Free Test Tenant",
            email="free@test.com",
            subscription_type=SubscriptionType.FREE,
            status=TenantStatus.ACTIVE
        )
        db_session.add(free_tenant)
        
        # Active Pro tenant
        pro_tenant = Tenant(
            name="Pro Test Tenant",
            email="pro@test.com",
            subscription_type=SubscriptionType.PRO,
            status=TenantStatus.ACTIVE,
            subscription_starts_at=datetime.now(timezone.utc) - timedelta(days=30),
            subscription_expires_at=datetime.now(timezone.utc) + timedelta(days=30)
        )
        pro_tenant.upgrade_to_pro(12)
        db_session.add(pro_tenant)
        
        # Expired Pro tenant
        expired_tenant = Tenant(
            name="Expired Test Tenant",
            email="expired@test.com",
            subscription_type=SubscriptionType.PRO,
            status=TenantStatus.ACTIVE,
            subscription_starts_at=datetime.now(timezone.utc) - timedelta(days=60),
            subscription_expires_at=datetime.now(timezone.utc) - timedelta(days=1)
        )
        db_session.add(expired_tenant)
        
        # Expiring soon tenant
        expiring_tenant = Tenant(
            name="Expiring Test Tenant",
            email="expiring@test.com",
            subscription_type=SubscriptionType.PRO,
            status=TenantStatus.ACTIVE,
            subscription_starts_at=datetime.now(timezone.utc) - timedelta(days=330),
            subscription_expires_at=datetime.now(timezone.utc) + timedelta(days=5)
        )
        db_session.add(expiring_tenant)
        
        db_session.commit()
        
        for tenant in [free_tenant, pro_tenant, expired_tenant, expiring_tenant]:
            db_session.refresh(tenant)
            tenants.append(tenant)
        
        return tenants
    
    def test_get_subscription_overview(self, client, super_admin_headers, db_session, test_tenants):
        """Test GET /api/subscription-management/overview endpoint"""
        with patch('app.core.database.get_db', return_value=db_session):
            response = client.get(
                "/api/subscription-management/overview",
                headers=super_admin_headers
            )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify overview structure
        assert 'total_tenants' in data
        assert 'free_subscriptions' in data
        assert 'pro_subscriptions' in data
        assert 'active_pro_subscriptions' in data
        assert 'expiring_soon' in data
        assert 'expired_subscriptions' in data
        assert 'conversion_rate' in data
        assert 'recent_upgrades' in data
        assert 'last_updated' in data
        
        # Verify counts (including super admin tenant + test tenants)
        assert data['total_tenants'] >= 4  # At least our test tenants
        assert data['free_subscriptions'] >= 1
        assert data['pro_subscriptions'] >= 3
        assert data['expiring_soon'] >= 1
        assert data['expired_subscriptions'] >= 1
    
    def test_get_tenant_subscriptions(self, client, super_admin_headers, db_session, test_tenants):
        """Test GET /api/subscription-management/tenants endpoint"""
        with patch('app.core.database.get_db', return_value=db_session):
            response = client.get(
                "/api/subscription-management/tenants",
                headers=super_admin_headers
            )
        
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        assert len(data) >= 4  # At least our test tenants
        
        # Verify tenant structure
        tenant_data = data[0]
        assert 'id' in tenant_data
        assert 'name' in tenant_data
        assert 'email' in tenant_data
        assert 'subscription_type' in tenant_data
        assert 'status' in tenant_data
        assert 'is_subscription_active' in tenant_data
        assert 'days_until_expiry' in tenant_data
    
    def test_get_tenant_subscriptions_with_filters(self, client, super_admin_headers, db_session, test_tenants):
        """Test GET /api/subscription-management/tenants with filters"""
        with patch('app.core.database.get_db', return_value=db_session):
            # Filter by subscription type
            response = client.get(
                "/api/subscription-management/tenants?subscription_type=free",
                headers=super_admin_headers
            )
        
        assert response.status_code == 200
        data = response.json()
        
        # All returned tenants should be free
        for tenant in data:
            assert tenant['subscription_type'] == 'free'
        
        with patch('app.core.database.get_db', return_value=db_session):
            # Filter by status
            response = client.get(
                "/api/subscription-management/tenants?status_filter=expired",
                headers=super_admin_headers
            )
        
        assert response.status_code == 200
        data = response.json()
        
        # Should have at least one expired tenant
        assert len(data) >= 1
    
    def test_extend_subscription(self, client, super_admin_headers, db_session, test_tenants):
        """Test POST /api/subscription-management/tenants/{tenant_id}/extend endpoint"""
        free_tenant = test_tenants[0]  # Free tenant
        
        extension_data = {
            "months": 6,
            "reason": "Test extension for customer satisfaction",
            "keep_current_plan": False
        }
        
        with patch('app.core.database.get_db', return_value=db_session):
            response = client.post(
                f"/api/subscription-management/tenants/{free_tenant.id}/extend",
                json=extension_data,
                headers=super_admin_headers
            )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data['success'] == True
        assert data['tenant_id'] == str(free_tenant.id)
        assert data['months_added'] == 6
        assert data['subscription_type'] == 'pro'  # Should upgrade to Pro
        assert data['new_expiration_date'] is not None
        
        # Verify tenant was updated in database
        db_session.refresh(free_tenant)
        assert free_tenant.subscription_type == SubscriptionType.PRO
        assert free_tenant.subscription_expires_at is not None
        assert "SUBSCRIPTION EXTENSION" in free_tenant.notes
    
    def test_extend_subscription_keep_current_plan(self, client, super_admin_headers, db_session, test_tenants):
        """Test extending subscription while keeping current plan"""
        free_tenant = test_tenants[0]  # Free tenant
        
        extension_data = {
            "months": 3,
            "reason": "Extension without upgrade",
            "keep_current_plan": True
        }
        
        with patch('app.core.database.get_db', return_value=db_session):
            response = client.post(
                f"/api/subscription-management/tenants/{free_tenant.id}/extend",
                json=extension_data,
                headers=super_admin_headers
            )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data['success'] == True
        assert data['subscription_type'] == 'free'  # Should remain Free
    
    def test_update_subscription_status_activate(self, client, super_admin_headers, db_session, test_tenants):
        """Test PUT /api/subscription-management/tenants/{tenant_id}/status - activate"""
        free_tenant = test_tenants[0]
        
        status_data = {
            "action": "activate",
            "subscription_type": "pro",
            "reason": "Customer payment confirmed"
        }
        
        with patch('app.core.database.get_db', return_value=db_session):
            response = client.put(
                f"/api/subscription-management/tenants/{free_tenant.id}/status",
                json=status_data,
                headers=super_admin_headers
            )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data['success'] == True
        assert data['new_status'] == 'active'
        assert data['subscription_type'] == 'pro'
        assert data['action_performed'] == 'activate'
        
        # Verify tenant was updated
        db_session.refresh(free_tenant)
        assert free_tenant.status == TenantStatus.ACTIVE
        assert free_tenant.subscription_type == SubscriptionType.PRO
        assert "SUBSCRIPTION STATUS UPDATE" in free_tenant.notes
    
    def test_update_subscription_status_suspend(self, client, super_admin_headers, db_session, test_tenants):
        """Test PUT /api/subscription-management/tenants/{tenant_id}/status - suspend"""
        pro_tenant = test_tenants[1]  # Active Pro tenant
        
        status_data = {
            "action": "suspend",
            "reason": "Payment overdue"
        }
        
        with patch('app.core.database.get_db', return_value=db_session):
            response = client.put(
                f"/api/subscription-management/tenants/{pro_tenant.id}/status",
                json=status_data,
                headers=super_admin_headers
            )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data['success'] == True
        assert data['new_status'] == 'suspended'
        assert data['action_performed'] == 'suspend'
        
        # Verify tenant was updated
        db_session.refresh(pro_tenant)
        assert pro_tenant.status == TenantStatus.SUSPENDED
    
    def test_switch_subscription_plan(self, client, super_admin_headers, db_session, test_tenants):
        """Test PUT /api/subscription-management/tenants/{tenant_id}/plan endpoint"""
        free_tenant = test_tenants[0]
        
        plan_data = {
            "new_plan": "pro",
            "duration_months": 12,
            "reason": "Customer upgrade request"
        }
        
        with patch('app.core.database.get_db', return_value=db_session):
            response = client.put(
                f"/api/subscription-management/tenants/{free_tenant.id}/plan",
                json=plan_data,
                headers=super_admin_headers
            )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data['success'] == True
        assert data['old_plan'] == 'free'
        assert data['new_plan'] == 'pro'
        assert data['immediate_effect'] == True
        assert data['subscription_expires_at'] is not None
        
        # Verify tenant was updated
        db_session.refresh(free_tenant)
        assert free_tenant.subscription_type == SubscriptionType.PRO
        assert free_tenant.max_users == 5
        assert free_tenant.max_products == -1  # Unlimited
        assert "SUBSCRIPTION PLAN SWITCH" in free_tenant.notes
    
    def test_switch_subscription_plan_downgrade(self, client, super_admin_headers, db_session, test_tenants):
        """Test downgrading from Pro to Free"""
        pro_tenant = test_tenants[1]  # Active Pro tenant
        
        plan_data = {
            "new_plan": "free",
            "reason": "Customer downgrade request"
        }
        
        with patch('app.core.database.get_db', return_value=db_session):
            response = client.put(
                f"/api/subscription-management/tenants/{pro_tenant.id}/plan",
                json=plan_data,
                headers=super_admin_headers
            )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data['success'] == True
        assert data['old_plan'] == 'pro'
        assert data['new_plan'] == 'free'
        
        # Verify tenant was updated
        db_session.refresh(pro_tenant)
        assert pro_tenant.subscription_type == SubscriptionType.FREE
        assert pro_tenant.max_users == 1
        assert pro_tenant.max_products == 10
        assert pro_tenant.subscription_expires_at is None
    
    def test_full_subscription_control(self, client, super_admin_headers, db_session, test_tenants):
        """Test PUT /api/subscription-management/tenants/{tenant_id}/full-control endpoint"""
        pro_tenant = test_tenants[1]
        
        # Custom dates for full control
        custom_start = datetime.now(timezone.utc) - timedelta(days=10)
        custom_end = datetime.now(timezone.utc) + timedelta(days=90)
        
        control_data = {
            "subscription_type": "pro",
            "custom_start_date": custom_start.isoformat(),
            "custom_end_date": custom_end.isoformat(),
            "max_users": 10,
            "max_products": 500,
            "max_customers": 1000,
            "max_monthly_invoices": 200,
            "status": "active",
            "admin_notes": "Custom configuration for enterprise client"
        }
        
        with patch('app.core.database.get_db', return_value=db_session):
            response = client.put(
                f"/api/subscription-management/tenants/{pro_tenant.id}/full-control",
                json=control_data,
                headers=super_admin_headers
            )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data['success'] == True
        assert data['changes_applied'] > 0
        assert len(data['changes']) > 0
        assert data['current_subscription_type'] == 'pro'
        assert data['current_status'] == 'active'
        assert data['current_limits']['max_users'] == 10
        assert data['current_limits']['max_products'] == 500
        
        # Verify tenant was updated
        db_session.refresh(pro_tenant)
        assert pro_tenant.max_users == 10
        assert pro_tenant.max_products == 500
        assert pro_tenant.max_customers == 1000
        assert pro_tenant.max_monthly_invoices == 200
        assert "FULL MANUAL SUBSCRIPTION CONTROL" in pro_tenant.notes
        assert "Custom configuration for enterprise client" in pro_tenant.notes
    
    def test_get_subscription_history(self, client, super_admin_headers, db_session, test_tenants):
        """Test GET /api/subscription-management/tenants/{tenant_id}/history endpoint"""
        # First, make some changes to create history
        pro_tenant = test_tenants[1]
        
        # Add some manual notes to simulate history
        pro_tenant.notes = """
        === SUBSCRIPTION EXTENSION ===
        Extended by: Admin admin@test.com (ID: 123)
        Extension: 6 months
        Old expiration: 2024-01-01 00:00:00+00:00
        New expiration: 2024-07-01 00:00:00+00:00
        Reason: Customer satisfaction
        Timestamp: 2024-01-15 10:00:00+00:00
        ================================
        
        === SUBSCRIPTION STATUS UPDATE ===
        Updated by: Admin admin@test.com (ID: 123)
        Action: activate
        Old status: pending
        New status: active
        Reason: Payment confirmed
        Timestamp: 2024-01-10 09:00:00+00:00
        ===================================
        """
        db_session.commit()
        
        with patch('app.core.database.get_db', return_value=db_session):
            response = client.get(
                f"/api/subscription-management/tenants/{pro_tenant.id}/history",
                headers=super_admin_headers
            )
        
        assert response.status_code == 200
        data = response.json()
        
        assert 'tenant_id' in data
        assert 'tenant_name' in data
        assert 'history' in data
        assert 'total_entries' in data
        assert 'current_subscription_type' in data
        assert 'current_status' in data
        
        assert data['tenant_id'] == str(pro_tenant.id)
        assert isinstance(data['history'], list)
        assert data['total_entries'] >= 0
    
    def test_get_subscription_statistics(self, client, super_admin_headers, db_session, test_tenants):
        """Test GET /api/subscription-management/stats endpoint"""
        with patch('app.core.database.get_db', return_value=db_session):
            response = client.get(
                "/api/subscription-management/stats?period=month",
                headers=super_admin_headers
            )
        
        assert response.status_code == 200
        data = response.json()
        
        assert 'period' in data
        assert 'period_start' in data
        assert 'period_end' in data
        assert 'total_tenants' in data
        assert 'free_subscriptions' in data
        assert 'pro_subscriptions' in data
        assert 'active_pro_subscriptions' in data
        assert 'expired_pro_subscriptions' in data
        assert 'new_signups_in_period' in data
        assert 'upgrades_in_period' in data
        assert 'conversion_rate' in data
        assert 'upgrade_rate' in data
        assert 'last_updated' in data
        
        assert data['period'] == 'month'
        assert data['total_tenants'] >= 4
    
    def test_unauthorized_access(self, client, db_session):
        """Test API endpoints without super admin authentication"""
        # Test without any authentication
        response = client.get("/api/subscription-management/overview")
        assert response.status_code in [401, 403]  # Either unauthorized or forbidden
        
        # Test with regular user authentication
        regular_tenant = Tenant(
            name="Regular Tenant",
            email="regular@test.com",
            subscription_type=SubscriptionType.FREE,
            status=TenantStatus.ACTIVE
        )
        db_session.add(regular_tenant)
        db_session.commit()
        
        regular_user = User(
            tenant_id=regular_tenant.id,
            email="regular@test.com",
            password_hash="hashed",
            first_name="Regular",
            last_name="User",
            role=UserRole.USER,
            status=UserStatus.ACTIVE,
            is_super_admin=False
        )
        db_session.add(regular_user)
        db_session.commit()
        
        regular_token = create_access_token(
            data={
                "user_id": str(regular_user.id),
                "tenant_id": str(regular_tenant.id),
                "email": regular_user.email,
                "is_super_admin": False
            }
        )
        regular_headers = {"Authorization": f"Bearer {regular_token}"}
        
        response = client.get("/api/subscription-management/overview", headers=regular_headers)
        assert response.status_code == 403  # Forbidden for non-super-admin
    
    def test_tenant_not_found_errors(self, client, super_admin_headers, db_session):
        """Test error handling for non-existent tenant"""
        fake_tenant_id = "00000000-0000-0000-0000-000000000000"
        
        with patch('app.core.database.get_db', return_value=db_session):
            # Test extend subscription
            response = client.post(
                f"/api/subscription-management/tenants/{fake_tenant_id}/extend",
                json={"months": 6, "reason": "Test"},
                headers=super_admin_headers
            )
        assert response.status_code == 404
        
        with patch('app.core.database.get_db', return_value=db_session):
            # Test update status
            response = client.put(
                f"/api/subscription-management/tenants/{fake_tenant_id}/status",
                json={"action": "activate"},
                headers=super_admin_headers
            )
        assert response.status_code == 404
        
        with patch('app.core.database.get_db', return_value=db_session):
            # Test plan switch
            response = client.put(
                f"/api/subscription-management/tenants/{fake_tenant_id}/plan",
                json={"new_plan": "pro"},
                headers=super_admin_headers
            )
        assert response.status_code == 404
    
    def test_validation_errors(self, client, super_admin_headers, db_session, test_tenants):
        """Test request validation errors"""
        tenant = test_tenants[0]
        
        with patch('app.core.database.get_db', return_value=db_session):
            # Test invalid months for extension
            response = client.post(
                f"/api/subscription-management/tenants/{tenant.id}/extend",
                json={"months": 0, "reason": "Test"},  # Invalid: months must be >= 1
                headers=super_admin_headers
            )
        assert response.status_code == 422
        
        with patch('app.core.database.get_db', return_value=db_session):
            # Test invalid action for status update
            response = client.put(
                f"/api/subscription-management/tenants/{tenant.id}/status",
                json={"action": "invalid_action"},  # Invalid action
                headers=super_admin_headers
            )
        assert response.status_code == 422
        
        with patch('app.core.database.get_db', return_value=db_session):
            # Test invalid subscription type for plan switch
            response = client.put(
                f"/api/subscription-management/tenants/{tenant.id}/plan",
                json={"new_plan": "invalid_plan"},  # Invalid plan
                headers=super_admin_headers
            )
        assert response.status_code == 422


class TestSubscriptionManagementIntegration:
    """Integration tests for subscription management with real database operations"""
    
    @pytest.fixture
    def db_session(self):
        """Create test database session with real PostgreSQL"""
        from app.core.database import SessionLocal, engine
        from app.models.base import BaseModel
        
        BaseModel.metadata.create_all(bind=engine)
        
        db = SessionLocal()
        try:
            yield db
        finally:
            # Clean up test data
            db.query(User).delete()
            db.query(Tenant).delete()
            db.commit()
            db.close()
    
    def test_complete_subscription_lifecycle(self, db_session):
        """Test complete subscription lifecycle from Free to Pro with extensions"""
        # Create Free tenant
        tenant = Tenant(
            name="Lifecycle Test Tenant",
            email="lifecycle@test.com",
            subscription_type=SubscriptionType.FREE,
            status=TenantStatus.ACTIVE
        )
        db_session.add(tenant)
        db_session.commit()
        db_session.refresh(tenant)
        
        # Verify initial state
        assert tenant.subscription_type == SubscriptionType.FREE
        assert tenant.max_users == 1
        assert tenant.max_products == 10
        assert tenant.subscription_expires_at is None
        
        # Upgrade to Pro (simulate API call logic)
        tenant.subscription_type = SubscriptionType.PRO
        tenant.subscription_starts_at = datetime.now(timezone.utc)
        tenant.subscription_expires_at = datetime.now(timezone.utc) + timedelta(days=365)
        tenant.max_users = 5
        tenant.max_products = -1
        tenant.max_customers = -1
        tenant.max_monthly_invoices = -1
        
        upgrade_note = f"\n=== SUBSCRIPTION PLAN SWITCH ===\n"
        upgrade_note += f"Old plan: free\n"
        upgrade_note += f"New plan: pro\n"
        upgrade_note += f"Duration: 12 months\n"
        upgrade_note += f"Timestamp: {datetime.now(timezone.utc)}\n"
        upgrade_note += "================================\n"
        tenant.notes = (tenant.notes or "") + upgrade_note
        
        db_session.commit()
        db_session.refresh(tenant)
        
        # Verify upgrade
        assert tenant.subscription_type == SubscriptionType.PRO
        assert tenant.max_users == 5
        assert tenant.max_products == -1
        assert tenant.subscription_expires_at is not None
        assert "SUBSCRIPTION PLAN SWITCH" in tenant.notes
        
        # Extend subscription (simulate API call logic)
        old_expiration = tenant.subscription_expires_at
        new_expiration = old_expiration + timedelta(days=180)  # 6 months
        tenant.subscription_expires_at = new_expiration
        
        extension_note = f"\n=== SUBSCRIPTION EXTENSION ===\n"
        extension_note += f"Extension: 6 months\n"
        extension_note += f"Old expiration: {old_expiration}\n"
        extension_note += f"New expiration: {new_expiration}\n"
        extension_note += f"Timestamp: {datetime.now(timezone.utc)}\n"
        extension_note += "================================\n"
        tenant.notes = (tenant.notes or "") + extension_note
        
        db_session.commit()
        db_session.refresh(tenant)
        
        # Verify extension
        assert tenant.subscription_expires_at == new_expiration
        assert "SUBSCRIPTION EXTENSION" in tenant.notes
        
        # Test full manual control (simulate API call logic)
        tenant.max_users = 10
        tenant.max_products = 1000
        tenant.max_customers = 2000
        
        control_note = f"\n=== FULL MANUAL SUBSCRIPTION CONTROL ===\n"
        control_note += f"Changes applied:\n"
        control_note += f"  - Max users: 5 → 10\n"
        control_note += f"  - Max products: -1 → 1000\n"
        control_note += f"  - Max customers: -1 → 2000\n"
        control_note += f"Timestamp: {datetime.now(timezone.utc)}\n"
        control_note += "=========================================\n"
        tenant.notes = (tenant.notes or "") + control_note
        
        db_session.commit()
        db_session.refresh(tenant)
        
        # Verify full control changes
        assert tenant.max_users == 10
        assert tenant.max_products == 1000
        assert tenant.max_customers == 2000
        assert "FULL MANUAL SUBSCRIPTION CONTROL" in tenant.notes
        
        # Verify complete history is preserved
        assert tenant.notes.count("===") >= 6  # At least 3 operations with start/end markers
    
    def test_subscription_status_management(self, db_session):
        """Test subscription status management operations"""
        # Create tenant
        tenant = Tenant(
            name="Status Test Tenant",
            email="status@test.com",
            subscription_type=SubscriptionType.PRO,
            status=TenantStatus.PENDING
        )
        db_session.add(tenant)
        db_session.commit()
        db_session.refresh(tenant)
        
        # Test activation
        old_status = tenant.status
        tenant.status = TenantStatus.ACTIVE
        
        status_note = f"\n=== SUBSCRIPTION STATUS UPDATE ===\n"
        status_note += f"Action: activate\n"
        status_note += f"Old status: {old_status.value}\n"
        status_note += f"New status: {tenant.status.value}\n"
        status_note += f"Timestamp: {datetime.now(timezone.utc)}\n"
        status_note += "===================================\n"
        tenant.notes = (tenant.notes or "") + status_note
        
        db_session.commit()
        db_session.refresh(tenant)
        
        assert tenant.status == TenantStatus.ACTIVE
        assert "SUBSCRIPTION STATUS UPDATE" in tenant.notes
        
        # Test suspension
        old_status = tenant.status
        tenant.status = TenantStatus.SUSPENDED
        
        status_note = f"\n=== SUBSCRIPTION STATUS UPDATE ===\n"
        status_note += f"Action: suspend\n"
        status_note += f"Old status: {old_status.value}\n"
        status_note += f"New status: {tenant.status.value}\n"
        status_note += f"Reason: Payment overdue\n"
        status_note += f"Timestamp: {datetime.now(timezone.utc)}\n"
        status_note += "===================================\n"
        tenant.notes = (tenant.notes or "") + status_note
        
        db_session.commit()
        db_session.refresh(tenant)
        
        assert tenant.status == TenantStatus.SUSPENDED
        assert tenant.notes.count("SUBSCRIPTION STATUS UPDATE") == 2
    
    def test_subscription_statistics_calculation(self, db_session):
        """Test subscription statistics calculation with real data"""
        # Create multiple tenants with different states
        tenants_data = [
            ("Free Tenant 1", "free1@test.com", SubscriptionType.FREE, TenantStatus.ACTIVE, None),
            ("Free Tenant 2", "free2@test.com", SubscriptionType.FREE, TenantStatus.ACTIVE, None),
            ("Pro Tenant 1", "pro1@test.com", SubscriptionType.PRO, TenantStatus.ACTIVE, datetime.now(timezone.utc) + timedelta(days=30)),
            ("Pro Tenant 2", "pro2@test.com", SubscriptionType.PRO, TenantStatus.ACTIVE, datetime.now(timezone.utc) + timedelta(days=5)),  # Expiring soon
            ("Expired Tenant", "expired@test.com", SubscriptionType.PRO, TenantStatus.ACTIVE, datetime.now(timezone.utc) - timedelta(days=1)),
            ("Recent Upgrade", "recent@test.com", SubscriptionType.PRO, TenantStatus.ACTIVE, datetime.now(timezone.utc) + timedelta(days=365)),
        ]
        
        created_tenants = []
        for name, email, sub_type, status, expires_at in tenants_data:
            tenant = Tenant(
                name=name,
                email=email,
                subscription_type=sub_type,
                status=status,
                subscription_expires_at=expires_at
            )
            
            if sub_type == SubscriptionType.PRO:
                tenant.subscription_starts_at = datetime.now(timezone.utc) - timedelta(days=10)
                tenant.upgrade_to_pro(12)
            
            db_session.add(tenant)
            created_tenants.append(tenant)
        
        db_session.commit()
        
        # Calculate statistics (simulate API logic)
        total_tenants = db_session.query(Tenant).count()
        free_tenants = db_session.query(Tenant).filter(Tenant.subscription_type == SubscriptionType.FREE).count()
        pro_tenants = db_session.query(Tenant).filter(Tenant.subscription_type == SubscriptionType.PRO).count()
        
        # Expiring soon (next 30 days)
        now = datetime.now(timezone.utc)
        thirty_days_from_now = now + timedelta(days=30)
        expiring_soon = db_session.query(Tenant).filter(
            Tenant.subscription_type == SubscriptionType.PRO,
            Tenant.subscription_expires_at.isnot(None),
            Tenant.subscription_expires_at <= thirty_days_from_now,
            Tenant.subscription_expires_at > now
        ).count()
        
        # Expired
        expired = db_session.query(Tenant).filter(
            Tenant.subscription_type == SubscriptionType.PRO,
            Tenant.subscription_expires_at.isnot(None),
            Tenant.subscription_expires_at < datetime.now(timezone.utc)
        ).count()
        
        # Verify statistics
        assert total_tenants >= 6
        assert free_tenants >= 2
        assert pro_tenants >= 4
        assert expiring_soon >= 1  # Pro Tenant 2
        assert expired >= 1  # Expired Tenant
        
        # Calculate conversion rate
        conversion_rate = (pro_tenants / total_tenants * 100) if total_tenants > 0 else 0
        assert conversion_rate > 0
    
    def test_multi_tenant_isolation_in_subscription_management(self, db_session):
        """Test that subscription management maintains tenant isolation"""
        # Create tenants for different "companies"
        tenant_a = Tenant(
            name="Company A",
            email="companya@test.com",
            subscription_type=SubscriptionType.PRO,
            status=TenantStatus.ACTIVE
        )
        
        tenant_b = Tenant(
            name="Company B",
            email="companyb@test.com",
            subscription_type=SubscriptionType.FREE,
            status=TenantStatus.ACTIVE
        )
        
        db_session.add_all([tenant_a, tenant_b])
        db_session.commit()
        db_session.refresh(tenant_a)
        db_session.refresh(tenant_b)
        
        # Modify tenant A's subscription
        tenant_a.max_users = 20
        tenant_a.notes = "Custom configuration for Company A"
        
        # Modify tenant B's subscription
        tenant_b.subscription_type = SubscriptionType.PRO
        tenant_b.upgrade_to_pro(6)
        tenant_b.notes = "Upgraded Company B to Pro"
        
        db_session.commit()
        
        # Verify isolation - changes to one tenant don't affect the other
        db_session.refresh(tenant_a)
        db_session.refresh(tenant_b)
        
        assert tenant_a.max_users == 20
        assert tenant_a.subscription_type == SubscriptionType.PRO
        assert "Company A" in tenant_a.notes
        assert "Company B" not in tenant_a.notes
        
        assert tenant_b.max_users == 5  # Pro default
        assert tenant_b.subscription_type == SubscriptionType.PRO
        assert "Company B" in tenant_b.notes
        assert "Company A" not in tenant_b.notes
        
        # Verify each tenant has independent subscription settings
        assert tenant_a.id != tenant_b.id
        assert tenant_a.email != tenant_b.email
        assert tenant_a.notes != tenant_b.notes


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])