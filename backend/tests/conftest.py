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
            'backup_logs', 'restore_logs', 'storage_locations',
            'invoices', 'products', 'product_categories', 'customers', 'users', 'tenants'
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