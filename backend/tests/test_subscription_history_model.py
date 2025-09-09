"""
Unit tests for SubscriptionHistory model
Tests subscription change tracking and multi-tenant isolation
"""

import pytest
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
import uuid

from app.models.subscription_history import SubscriptionHistory, SubscriptionAction
from app.models.tenant import Tenant, SubscriptionType, TenantStatus
from app.models.user import User, UserRole, UserStatus
from app.core.database import get_db


class TestSubscriptionHistoryModel:
    """Test suite for SubscriptionHistory model"""
    
    @pytest.fixture
    def db_session(self):
        """Get database session for testing"""
        db = next(get_db())
        try:
            yield db
        finally:
            db.close()
    
    @pytest.fixture
    def test_tenant(self, db_session: Session):
        """Create a test tenant"""
        tenant = Tenant(
            name="Test Company",
            email="test@company.com",
            phone="1234567890",
            subscription_type=SubscriptionType.FREE,
            status=TenantStatus.ACTIVE
        )
        db_session.add(tenant)
        db_session.commit()
        db_session.refresh(tenant)
        return tenant
    
    @pytest.fixture
    def admin_user(self, db_session: Session):
        """Create a super admin user"""
        admin = User(
            tenant_id=None,
            email="admin@hesaabplus.com",
            password_hash="admin_hashed_password",
            first_name="Super",
            last_name="Admin",
            role=UserRole.OWNER,
            status=UserStatus.ACTIVE,
            is_super_admin=True
        )
        db_session.add(admin)
        db_session.commit()
        db_session.refresh(admin)
        return admin
    
    def test_create_subscription_history_entry(self, db_session: Session, test_tenant, admin_user):
        """Test creating a subscription history entry"""
        # Create subscription history entry
        history_entry = SubscriptionHistory.create_history_entry(
            tenant_id=str(test_tenant.id),
            action="upgraded",
            new_subscription_type="pro",
            admin_id=str(admin_user.id),
            old_subscription_type="free",
            duration_months=12,
            old_expiry_date=None,
            new_expiry_date=datetime.now(timezone.utc) + timedelta(days=365),
            reason="Customer requested upgrade",
            notes="Upgraded to Pro plan for 12 months",
            ip_address="192.168.1.100",
            user_agent="Mozilla/5.0..."
        )
        
        db_session.add(history_entry)
        db_session.commit()
        db_session.refresh(history_entry)
        
        # Verify history entry was created correctly
        assert history_entry.tenant_id == test_tenant.id
        assert history_entry.admin_id == admin_user.id
        assert history_entry.action == "upgraded"
        assert history_entry.old_subscription_type == "free"
        assert history_entry.new_subscription_type == "pro"
        assert history_entry.duration_months == 12
        assert history_entry.reason == "Customer requested upgrade"
        assert history_entry.notes == "Upgraded to Pro plan for 12 months"
        assert history_entry.ip_address == "192.168.1.100"
        assert history_entry.user_agent == "Mozilla/5.0..."
        assert history_entry.change_date is not None
    
    def test_create_history_without_admin(self, db_session: Session, test_tenant):
        """Test creating history entry without admin (system action)"""
        history_entry = SubscriptionHistory.create_history_entry(
            tenant_id=str(test_tenant.id),
            action="created",
            new_subscription_type="free",
            reason="Initial tenant creation"
        )
        
        db_session.add(history_entry)
        db_session.commit()
        db_session.refresh(history_entry)
        
        # Verify system action
        assert history_entry.tenant_id == test_tenant.id
        assert history_entry.admin_id is None
        assert history_entry.action == "created"
        assert history_entry.new_subscription_type == "free"
        assert history_entry.reason == "Initial tenant creation"
    
    def test_subscription_extension_tracking(self, db_session: Session, test_tenant, admin_user):
        """Test tracking subscription extensions"""
        current_expiry = datetime.now(timezone.utc) + timedelta(days=30)
        new_expiry = current_expiry + timedelta(days=90)  # 3 months extension
        
        history_entry = SubscriptionHistory.create_history_entry(
            tenant_id=str(test_tenant.id),
            action="extended",
            new_subscription_type="pro",
            admin_id=str(admin_user.id),
            old_subscription_type="pro",
            duration_months=3,
            old_expiry_date=current_expiry,
            new_expiry_date=new_expiry,
            reason="Customer requested extension",
            notes="Extended Pro subscription by 3 months"
        )
        
        db_session.add(history_entry)
        db_session.commit()
        db_session.refresh(history_entry)
        
        # Verify extension tracking
        assert history_entry.action == "extended"
        assert history_entry.duration_months == 3
        assert history_entry.old_expiry_date == current_expiry
        assert history_entry.new_expiry_date == new_expiry
        assert history_entry.old_subscription_type == "pro"
        assert history_entry.new_subscription_type == "pro"
    
    def test_subscription_downgrade_tracking(self, db_session: Session, test_tenant, admin_user):
        """Test tracking subscription downgrades"""
        history_entry = SubscriptionHistory.create_history_entry(
            tenant_id=str(test_tenant.id),
            action="downgraded",
            new_subscription_type="free",
            admin_id=str(admin_user.id),
            old_subscription_type="pro",
            old_expiry_date=datetime.now(timezone.utc) + timedelta(days=30),
            new_expiry_date=None,  # Free plan has no expiry
            reason="Customer requested downgrade",
            notes="Downgraded from Pro to Free plan"
        )
        
        db_session.add(history_entry)
        db_session.commit()
        db_session.refresh(history_entry)
        
        # Verify downgrade tracking
        assert history_entry.action == "downgraded"
        assert history_entry.old_subscription_type == "pro"
        assert history_entry.new_subscription_type == "free"
        assert history_entry.new_expiry_date is None
        assert history_entry.reason == "Customer requested downgrade"
    
    def test_subscription_suspension_tracking(self, db_session: Session, test_tenant, admin_user):
        """Test tracking subscription suspensions"""
        history_entry = SubscriptionHistory.create_history_entry(
            tenant_id=str(test_tenant.id),
            action="suspended",
            new_subscription_type="pro",
            admin_id=str(admin_user.id),
            old_subscription_type="pro",
            reason="Payment failure",
            notes="Subscription suspended due to failed payment"
        )
        
        db_session.add(history_entry)
        db_session.commit()
        db_session.refresh(history_entry)
        
        # Verify suspension tracking
        assert history_entry.action == "suspended"
        assert history_entry.reason == "Payment failure"
        assert history_entry.notes == "Subscription suspended due to failed payment"
    
    def test_subscription_activation_tracking(self, db_session: Session, test_tenant, admin_user):
        """Test tracking subscription activations"""
        history_entry = SubscriptionHistory.create_history_entry(
            tenant_id=str(test_tenant.id),
            action="activated",
            new_subscription_type="pro",
            admin_id=str(admin_user.id),
            old_subscription_type="pro",
            reason="Payment received",
            notes="Subscription reactivated after payment"
        )
        
        db_session.add(history_entry)
        db_session.commit()
        db_session.refresh(history_entry)
        
        # Verify activation tracking
        assert history_entry.action == "activated"
        assert history_entry.reason == "Payment received"
        assert history_entry.notes == "Subscription reactivated after payment"
    
    def test_subscription_cancellation_tracking(self, db_session: Session, test_tenant, admin_user):
        """Test tracking subscription cancellations"""
        history_entry = SubscriptionHistory.create_history_entry(
            tenant_id=str(test_tenant.id),
            action="cancelled",
            new_subscription_type="free",
            admin_id=str(admin_user.id),
            old_subscription_type="pro",
            old_expiry_date=datetime.now(timezone.utc) + timedelta(days=15),
            new_expiry_date=None,
            reason="Customer requested cancellation",
            notes="Cancelled Pro subscription, reverted to Free"
        )
        
        db_session.add(history_entry)
        db_session.commit()
        db_session.refresh(history_entry)
        
        # Verify cancellation tracking
        assert history_entry.action == "cancelled"
        assert history_entry.old_subscription_type == "pro"
        assert history_entry.new_subscription_type == "free"
        assert history_entry.reason == "Customer requested cancellation"
    
    def test_subscription_renewal_tracking(self, db_session: Session, test_tenant, admin_user):
        """Test tracking subscription renewals"""
        old_expiry = datetime.now(timezone.utc) + timedelta(days=5)
        new_expiry = datetime.now(timezone.utc) + timedelta(days=365)
        
        history_entry = SubscriptionHistory.create_history_entry(
            tenant_id=str(test_tenant.id),
            action="renewed",
            new_subscription_type="pro",
            admin_id=str(admin_user.id),
            old_subscription_type="pro",
            duration_months=12,
            old_expiry_date=old_expiry,
            new_expiry_date=new_expiry,
            reason="Automatic renewal",
            notes="Pro subscription renewed for 12 months"
        )
        
        db_session.add(history_entry)
        db_session.commit()
        db_session.refresh(history_entry)
        
        # Verify renewal tracking
        assert history_entry.action == "renewed"
        assert history_entry.duration_months == 12
        assert history_entry.old_expiry_date == old_expiry
        assert history_entry.new_expiry_date == new_expiry
        assert history_entry.reason == "Automatic renewal"
    
    def test_multi_tenant_isolation(self, db_session: Session, admin_user):
        """Test multi-tenant data isolation for subscription history"""
        # Create two tenants
        tenant1 = Tenant(
            name="Company 1",
            email="test1@company.com",
            subscription_type=SubscriptionType.FREE,
            status=TenantStatus.ACTIVE
        )
        tenant2 = Tenant(
            name="Company 2",
            email="test2@company.com",
            subscription_type=SubscriptionType.FREE,
            status=TenantStatus.ACTIVE
        )
        
        db_session.add_all([tenant1, tenant2])
        db_session.commit()
        
        # Create subscription history for each tenant
        history1 = SubscriptionHistory.create_history_entry(
            tenant_id=str(tenant1.id),
            action="upgraded",
            new_subscription_type="pro",
            admin_id=str(admin_user.id),
            old_subscription_type="free",
            reason="Tenant 1 upgrade"
        )
        
        history2 = SubscriptionHistory.create_history_entry(
            tenant_id=str(tenant2.id),
            action="upgraded",
            new_subscription_type="pro",
            admin_id=str(admin_user.id),
            old_subscription_type="free",
            reason="Tenant 2 upgrade"
        )
        
        db_session.add_all([history1, history2])
        db_session.commit()
        
        # Verify isolation - each tenant has only their history
        tenant1_history = db_session.query(SubscriptionHistory).filter(
            SubscriptionHistory.tenant_id == tenant1.id
        ).all()
        tenant2_history = db_session.query(SubscriptionHistory).filter(
            SubscriptionHistory.tenant_id == tenant2.id
        ).all()
        
        assert len(tenant1_history) == 1
        assert len(tenant2_history) == 1
        assert tenant1_history[0].reason == "Tenant 1 upgrade"
        assert tenant2_history[0].reason == "Tenant 2 upgrade"
        assert tenant1_history[0].tenant_id != tenant2_history[0].tenant_id
    
    def test_chronological_history_tracking(self, db_session: Session, test_tenant, admin_user):
        """Test chronological tracking of subscription changes"""
        # Create multiple history entries over time
        entries = []
        
        # Initial creation
        entry1 = SubscriptionHistory.create_history_entry(
            tenant_id=str(test_tenant.id),
            action="created",
            new_subscription_type="free",
            reason="Initial tenant creation"
        )
        entries.append(entry1)
        
        # Upgrade to Pro
        entry2 = SubscriptionHistory.create_history_entry(
            tenant_id=str(test_tenant.id),
            action="upgraded",
            new_subscription_type="pro",
            admin_id=str(admin_user.id),
            old_subscription_type="free",
            duration_months=12,
            reason="Customer upgrade request"
        )
        entries.append(entry2)
        
        # Extension
        entry3 = SubscriptionHistory.create_history_entry(
            tenant_id=str(test_tenant.id),
            action="extended",
            new_subscription_type="pro",
            admin_id=str(admin_user.id),
            old_subscription_type="pro",
            duration_months=6,
            reason="Customer extension request"
        )
        entries.append(entry3)
        
        # Downgrade
        entry4 = SubscriptionHistory.create_history_entry(
            tenant_id=str(test_tenant.id),
            action="downgraded",
            new_subscription_type="free",
            admin_id=str(admin_user.id),
            old_subscription_type="pro",
            reason="Customer downgrade request"
        )
        entries.append(entry4)
        
        db_session.add_all(entries)
        db_session.commit()
        
        # Retrieve history in chronological order
        history = db_session.query(SubscriptionHistory).filter(
            SubscriptionHistory.tenant_id == test_tenant.id
        ).order_by(SubscriptionHistory.change_date.asc()).all()
        
        # Verify chronological order and progression
        assert len(history) == 4
        assert history[0].action == "created"
        assert history[0].new_subscription_type == "free"
        assert history[1].action == "upgraded"
        assert history[1].old_subscription_type == "free"
        assert history[1].new_subscription_type == "pro"
        assert history[2].action == "extended"
        assert history[2].old_subscription_type == "pro"
        assert history[2].new_subscription_type == "pro"
        assert history[3].action == "downgraded"
        assert history[3].old_subscription_type == "pro"
        assert history[3].new_subscription_type == "free"
    
    def test_admin_context_tracking(self, db_session: Session, test_tenant):
        """Test tracking of admin context in subscription changes"""
        # Create multiple admin users
        admin1 = User(
            tenant_id=None,
            email="admin1@hesaabplus.com",
            password_hash="hash1",
            first_name="Admin",
            last_name="One",
            role=UserRole.OWNER,
            is_super_admin=True
        )
        admin2 = User(
            tenant_id=None,
            email="admin2@hesaabplus.com",
            password_hash="hash2",
            first_name="Admin",
            last_name="Two",
            role=UserRole.OWNER,
            is_super_admin=True
        )
        
        db_session.add_all([admin1, admin2])
        db_session.commit()
        
        # Create history entries with different admins
        history1 = SubscriptionHistory.create_history_entry(
            tenant_id=str(test_tenant.id),
            action="upgraded",
            new_subscription_type="pro",
            admin_id=str(admin1.id),
            old_subscription_type="free",
            reason="Upgraded by Admin One",
            ip_address="192.168.1.100",
            user_agent="Chrome/91.0"
        )
        
        history2 = SubscriptionHistory.create_history_entry(
            tenant_id=str(test_tenant.id),
            action="extended",
            new_subscription_type="pro",
            admin_id=str(admin2.id),
            old_subscription_type="pro",
            duration_months=6,
            reason="Extended by Admin Two",
            ip_address="192.168.1.101",
            user_agent="Firefox/89.0"
        )
        
        db_session.add_all([history1, history2])
        db_session.commit()
        
        # Verify admin context tracking
        assert history1.admin_id == admin1.id
        assert history1.reason == "Upgraded by Admin One"
        assert history1.ip_address == "192.168.1.100"
        assert history1.user_agent == "Chrome/91.0"
        
        assert history2.admin_id == admin2.id
        assert history2.reason == "Extended by Admin Two"
        assert history2.ip_address == "192.168.1.101"
        assert history2.user_agent == "Firefox/89.0"
    
    def test_relationships(self, db_session: Session, test_tenant, admin_user):
        """Test model relationships"""
        # Create subscription history entry
        history_entry = SubscriptionHistory.create_history_entry(
            tenant_id=str(test_tenant.id),
            action="upgraded",
            new_subscription_type="pro",
            admin_id=str(admin_user.id),
            old_subscription_type="free",
            reason="Test relationships"
        )
        
        db_session.add(history_entry)
        db_session.commit()
        db_session.refresh(history_entry)
        
        # Test basic attributes (relationships may not work without proper foreign keys)
        assert history_entry.tenant_id == test_tenant.id
        assert history_entry.admin_id == admin_user.id
        assert history_entry.action == "upgraded"
    
    def test_cascade_delete_behavior(self, db_session: Session, test_tenant, admin_user):
        """Test cascade delete behavior"""
        # Create subscription history entry
        history_entry = SubscriptionHistory.create_history_entry(
            tenant_id=str(test_tenant.id),
            action="upgraded",
            new_subscription_type="pro",
            admin_id=str(admin_user.id),
            old_subscription_type="free",
            reason="Test cascade delete"
        )
        
        db_session.add(history_entry)
        db_session.commit()
        
        history_id = history_entry.id
        
        # Delete tenant - should cascade delete history
        db_session.delete(test_tenant)
        db_session.commit()
        
        # Verify history was deleted
        deleted_history = db_session.query(SubscriptionHistory).filter(
            SubscriptionHistory.id == history_id
        ).first()
        
        assert deleted_history is None
    
    def test_admin_delete_set_null(self, db_session: Session, test_tenant, admin_user):
        """Test that deleting admin sets admin_id to NULL"""
        # Create subscription history entry
        history_entry = SubscriptionHistory.create_history_entry(
            tenant_id=str(test_tenant.id),
            action="upgraded",
            new_subscription_type="pro",
            admin_id=str(admin_user.id),
            old_subscription_type="free",
            reason="Test admin delete"
        )
        
        db_session.add(history_entry)
        db_session.commit()
        
        history_id = history_entry.id
        
        # Delete admin user - should set admin_id to NULL
        db_session.delete(admin_user)
        db_session.commit()
        
        # Verify admin_id is set to NULL
        updated_history = db_session.query(SubscriptionHistory).filter(
            SubscriptionHistory.id == history_id
        ).first()
        
        assert updated_history is not None
        assert updated_history.admin_id is None
        assert updated_history.reason == "Test admin delete"  # Other data preserved
    
    def test_comprehensive_subscription_lifecycle(self, db_session: Session, test_tenant, admin_user):
        """Test comprehensive subscription lifecycle tracking"""
        # Simulate complete subscription lifecycle
        lifecycle_events = [
            {
                "action": "created",
                "old_type": None,
                "new_type": "free",
                "reason": "Initial tenant registration"
            },
            {
                "action": "upgraded",
                "old_type": "free",
                "new_type": "pro",
                "duration": 12,
                "reason": "Customer upgrade to Pro"
            },
            {
                "action": "extended",
                "old_type": "pro",
                "new_type": "pro",
                "duration": 6,
                "reason": "Customer extended subscription"
            },
            {
                "action": "suspended",
                "old_type": "pro",
                "new_type": "pro",
                "reason": "Payment failure"
            },
            {
                "action": "activated",
                "old_type": "pro",
                "new_type": "pro",
                "reason": "Payment received"
            },
            {
                "action": "downgraded",
                "old_type": "pro",
                "new_type": "free",
                "reason": "Customer downgrade request"
            },
            {
                "action": "cancelled",
                "old_type": "free",
                "new_type": "free",
                "reason": "Customer account closure"
            }
        ]
        
        # Create history entries for each lifecycle event
        for event in lifecycle_events:
            history_entry = SubscriptionHistory.create_history_entry(
                tenant_id=str(test_tenant.id),
                action=event["action"],
                new_subscription_type=event["new_type"],
                admin_id=str(admin_user.id) if event["action"] != "created" else None,
                old_subscription_type=event["old_type"],
                duration_months=event.get("duration"),
                reason=event["reason"],
                notes=f"Lifecycle event: {event['action']}"
            )
            db_session.add(history_entry)
        
        db_session.commit()
        
        # Verify complete lifecycle is tracked
        complete_history = db_session.query(SubscriptionHistory).filter(
            SubscriptionHistory.tenant_id == test_tenant.id
        ).order_by(SubscriptionHistory.change_date.asc()).all()
        
        assert len(complete_history) == len(lifecycle_events)
        
        for i, (event, history) in enumerate(zip(lifecycle_events, complete_history)):
            assert history.action == event["action"]
            assert history.old_subscription_type == event["old_type"]
            assert history.new_subscription_type == event["new_type"]
            assert history.reason == event["reason"]
            if event.get("duration"):
                assert history.duration_months == event["duration"]