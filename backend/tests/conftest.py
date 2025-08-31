"""
Test configuration and fixtures
"""

import pytest
import os
import uuid
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.models.base import Base
from app.core.config import settings

# Override database URL for testing - use existing database with different database name
TEST_DATABASE_URL = "postgresql://hesaab:secure_password@postgres:5432/hesaabplus"

@pytest.fixture(scope="session")
def engine():
    """Create test database engine"""
    engine = create_engine(
        TEST_DATABASE_URL,
        echo=False,
        pool_pre_ping=True,
        poolclass=StaticPool,
    )
    
    # Create all tables
    Base.metadata.create_all(bind=engine)
    
    yield engine
    
    # Drop all tables after tests
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def db_session(engine):
    """Create a database session for each test"""
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = SessionLocal()
    
    yield session
    
    # Rollback any changes and close session
    session.rollback()
    session.close()


@pytest.fixture
def sample_tenant_id():
    """Generate a sample tenant ID"""
    return uuid.uuid4()


@pytest.fixture
def sample_user_id():
    """Generate a sample user ID"""
    return uuid.uuid4()


@pytest.fixture
def sample_customer_id():
    """Generate a sample customer ID"""
    return uuid.uuid4()


@pytest.fixture
def sample_product_id():
    """Generate a sample product ID"""
    return uuid.uuid4()