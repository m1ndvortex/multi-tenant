"""
Simple product test to verify basic functionality
"""

import pytest
import uuid
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.tenant import Tenant, SubscriptionType, TenantStatus
from app.models.user import User, UserRole, UserStatus
from app.core.auth import create_access_token


def test_simple_product_creation(client: TestClient, db_session: Session):
    """Test simple product creation"""
    
    # Create tenant
    tenant = Tenant(
        id=uuid.uuid4(),
        name="Simple Test Shop",
        email="simple@test.com",
        phone="+1234567890",
        subscription_type=SubscriptionType.PRO,
        status=TenantStatus.ACTIVE
    )
    db_session.add(tenant)
    db_session.commit()
    db_session.refresh(tenant)
    
    # Create user
    user = User(
        id=uuid.uuid4(),
        tenant_id=tenant.id,
        email="user@test.com",
        first_name="Test",
        last_name="User",
        password_hash="hashed_password",
        role=UserRole.ADMIN,
        status=UserStatus.ACTIVE
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    
    # Create auth headers
    token = create_access_token(data={
        "user_id": str(user.id),
        "tenant_id": str(tenant.id)
    })
    headers = {"Authorization": f"Bearer {token}"}
    
    # Create product
    product_data = {
        "name": "Simple Test Product",
        "selling_price": "100.00"
    }
    
    response = client.post("/api/products/", json=product_data, headers=headers)
    
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Simple Test Product"
    assert float(data["selling_price"]) == 100.0