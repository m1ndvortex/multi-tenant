"""
Test configuration and fixtures
"""

import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.core.database import Base, get_db, SessionLocal
from app.main import app
from fastapi.testclient import TestClient
import os


# Use the same database session as the main app for testing
# This ensures we're using the Docker database connection
TestingSessionLocal = SessionLocal


class TestDatabase:
    """Test database helper class"""
    
    def __init__(self):
        self.session = None
    
    def get_session(self):
        """Get a test database session"""
        if not self.session:
            self.session = TestingSessionLocal()
        return self.session
    
    def cleanup(self):
        """Clean up test data"""
        if self.session:
            try:
                # Clean up test data
                tables = [
                    'installments', 'invoice_items', 'invoices', 
                    'products', 'customers', 'users', 'tenants'
                ]
                
                # Disable foreign key checks temporarily
                self.session.execute(text("SET session_replication_role = replica;"))
                
                # Truncate tables in reverse order to handle dependencies
                for table in reversed(tables):
                    try:
                        self.session.execute(text(f"TRUNCATE TABLE {table} CASCADE;"))
                    except Exception:
                        pass  # Table might not exist
                
                # Re-enable foreign key checks
                self.session.execute(text("SET session_replication_role = DEFAULT;"))
                
                self.session.commit()
            except Exception as e:
                self.session.rollback()
                print(f"Error cleaning test database: {e}")
            finally:
                self.session.close()
                self.session = None


@pytest.fixture(scope="session", autouse=True)
def setup_test_database():
    """Setup test database schema - tables should already exist in Docker"""
    # Tables are already created by the main app initialization
    yield
    # Don't drop tables as they're shared with the main app


@pytest.fixture(autouse=True)
def clean_database():
    """Clean database before each test"""
    db = TestingSessionLocal()
    try:
        # Get all table names
        tables = [
            'bank_reconciliation_items', 'bank_reconciliations', 'bank_transactions', 'bank_statements', 'bank_accounts',
            'payment_matching', 'customer_payments', 'supplier_payments', 'supplier_bills',
            'suppliers', 'journal_entry_lines', 'journal_entries', 'accounts', 'payment_methods',
            'transactions', 'backup_logs', 'restore_logs', 'storage_locations',
            'installments', 'invoice_items', 'invoices', 'products', 'product_categories', 
            'customers', 'users', 'tenants'
        ]
        
        # Disable foreign key checks temporarily
        db.execute(text("SET session_replication_role = replica;"))
        
        # Truncate all tables
        for table in tables:
            try:
                db.execute(text(f"TRUNCATE TABLE {table} CASCADE;"))
            except Exception:
                pass  # Table might not exist yet
        
        # Re-enable foreign key checks
        db.execute(text("SET session_replication_role = DEFAULT;"))
        
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Error cleaning database: {e}")
    finally:
        db.close()


@pytest.fixture
def db_session():
    """Create a database session for testing"""
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture
def test_tenant(db_session):
    """Create a test tenant"""
    from app.models.tenant import Tenant, SubscriptionType, TenantStatus
    from datetime import datetime, timedelta
    import uuid
    
    # Use unique domain to avoid conflicts
    unique_id = str(uuid.uuid4())[:8]
    
    tenant = Tenant(
        name=f"Test Tenant {unique_id}",
        domain=f"test-{unique_id}.example.com",
        email=f"test-{unique_id}@example.com",
        subscription_type=SubscriptionType.PRO,
        subscription_starts_at=datetime.utcnow(),
        subscription_expires_at=datetime.utcnow() + timedelta(days=365),
        status=TenantStatus.ACTIVE
    )
    db_session.add(tenant)
    db_session.commit()
    db_session.refresh(tenant)
    return tenant


@pytest.fixture
def test_customer(db_session, test_tenant):
    """Create a test customer"""
    from app.models.customer import Customer
    
    customer = Customer(
        tenant_id=test_tenant.id,
        name="Test Customer",
        email="customer@test.com",
        phone="+1234567890",
        address="123 Test Street",
        city="Test City",
        is_active=True
    )
    db_session.add(customer)
    db_session.commit()
    db_session.refresh(customer)
    return customer


@pytest.fixture
def test_user(db_session, test_tenant):
    """Create a test user"""
    from app.models.user import User, UserRole, UserStatus
    from app.core.auth import get_password_hash
    
    user = User(
        tenant_id=test_tenant.id,
        email="test@example.com",
        password_hash=get_password_hash("testpassword"),
        full_name="Test User",
        role=UserRole.ADMIN,
        status=UserStatus.ACTIVE,
        is_active=True
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def auth_headers(test_user):
    """Create authentication headers for testing"""
    from app.core.auth import create_access_token
    from datetime import timedelta
    
    # Create a mock user token
    token_data = {
        "sub": test_user.email,
        "user_id": str(test_user.id),
        "tenant_id": str(test_user.tenant_id),
        "role": test_user.role.value
    }
    token = create_access_token(
        data=token_data,
        expires_delta=timedelta(hours=1)
    )
    
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def super_admin_headers():
    """Create super admin authentication headers for testing"""
    from app.core.auth import create_access_token
    from datetime import timedelta
    
    # Create a mock super admin token
    token_data = {
        "sub": "admin@hesaabplus.com",
        "user_id": "super-admin-id",
        "role": "super_admin"
    }
    token = create_access_token(
        data=token_data,
        expires_delta=timedelta(hours=1)
    )
    
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def client():
    """Create a test client"""
    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()
    
    # Override the tenant context dependency for testing
    def override_get_current_tenant_context():
        from app.core.tenant_context import TenantContext
        return TenantContext()
    
    app.dependency_overrides[get_db] = override_get_db
    
    with TestClient(app) as test_client:
        yield test_client
    
    app.dependency_overrides.clear()