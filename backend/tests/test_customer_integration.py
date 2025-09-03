"""
Integration tests for customer management API
"""

import pytest
import uuid
from decimal import Decimal
from fastapi.testclient import TestClient

from app.main import app
from app.models.tenant import Tenant, SubscriptionType
from app.models.user import User, UserRole
from app.models.customer import Customer, CustomerStatus, CustomerType


class TestCustomerIntegration:
    """Integration tests for customer management"""
    
    @pytest.fixture
    def client(self):
        """Create test client"""
        return TestClient(app)
    
    def test_customer_api_endpoints_exist(self, client):
        """Test that customer API endpoints are accessible"""
        # Test that the endpoints exist (will return 401 without auth, but not 404)
        response = client.get("/api/customers/")
        assert response.status_code in [401, 403]  # Not 404
        
        response = client.get("/api/customers/stats")
        assert response.status_code in [401, 403]  # Not 404
        
        response = client.get("/api/customers/tags")
        assert response.status_code in [401, 403]  # Not 404
    
    def test_customer_model_creation(self, db_session):
        """Test customer model creation with database"""
        # Create tenant
        tenant = Tenant(
            id=uuid.uuid4(),
            name="Integration Test Tenant",
            domain="integration.example.com",
            email="integration@example.com",
            subscription_type=SubscriptionType.PRO,
            is_active=True
        )
        db_session.add(tenant)
        db_session.commit()
        
        # Create customer
        customer = Customer(
            tenant_id=tenant.id,
            name="Integration Test Customer",
            email="integration@example.com",
            phone="+1234567890",
            customer_type=CustomerType.INDIVIDUAL,
            status=CustomerStatus.ACTIVE,
            credit_limit=Decimal('5000'),
            tags=["test", "integration"]
        )
        db_session.add(customer)
        db_session.commit()
        db_session.refresh(customer)
        
        # Verify customer was created
        assert customer.id is not None
        assert customer.tenant_id == tenant.id
        assert customer.name == "Integration Test Customer"
        assert customer.email == "integration@example.com"
        assert customer.customer_type == CustomerType.INDIVIDUAL
        assert customer.status == CustomerStatus.ACTIVE
        assert customer.credit_limit == Decimal('5000')
        assert customer.tags == ["test", "integration"]
        assert customer.total_debt == Decimal('0')
        assert customer.total_gold_debt == Decimal('0')
        
        # Test computed properties
        assert customer.display_name == "Integration Test Customer"
        assert customer.primary_contact == "+1234567890"
        assert customer.is_vip is False
        assert customer.has_outstanding_debt is False
    
    def test_customer_service_integration(self, db_session):
        """Test customer service with real database operations"""
        from app.services.customer_service import CustomerService
        from app.schemas.customer import CustomerCreate
        
        # Create tenant
        tenant = Tenant(
            id=uuid.uuid4(),
            name="Service Test Tenant",
            domain="service.example.com",
            email="service@example.com",
            subscription_type=SubscriptionType.PRO,
            is_active=True
        )
        db_session.add(tenant)
        db_session.commit()
        
        # Create customer service
        service = CustomerService(db_session)
        
        # Create customer data
        customer_data = CustomerCreate(
            name="Service Test Customer",
            email="service@example.com",
            phone="+9876543210",
            city="Tehran",
            customer_type=CustomerType.BUSINESS,
            business_name="Test Business",
            tags=["service", "test"]
        )
        
        # Create customer
        customer = service.create_customer(customer_data, tenant.id)
        
        # Verify creation
        assert customer.id is not None
        assert customer.name == "Service Test Customer"
        assert customer.email == "service@example.com"
        assert customer.customer_type == CustomerType.BUSINESS
        assert customer.business_name == "Test Business"
        assert set(customer.tags) == {"service", "test"}
        
        # Test retrieval
        retrieved_customer = service.get_customer(customer.id, tenant.id)
        assert retrieved_customer is not None
        assert retrieved_customer.id == customer.id
        
        # Test search
        from app.schemas.customer import CustomerSearchRequest
        search_request = CustomerSearchRequest(query="Service", page=1, per_page=10)
        customers, total = service.search_customers(search_request, tenant.id)
        
        assert total == 1
        assert len(customers) == 1
        assert customers[0].id == customer.id
        
        # Test stats
        stats = service.get_customer_stats(tenant.id)
        assert stats.total_customers == 1
        assert stats.active_customers == 1
        assert stats.vip_customers == 0
        assert stats.customers_with_debt == 0
    
    def test_customer_interaction_integration(self, db_session):
        """Test customer interaction functionality"""
        from app.services.customer_service import CustomerService
        from app.schemas.customer import CustomerCreate, CustomerInteractionCreate
        from app.models.customer_interaction import InteractionType
        
        # Create tenant and user
        tenant = Tenant(
            id=uuid.uuid4(),
            name="Interaction Test Tenant",
            domain="interaction.example.com",
            email="interaction-tenant@example.com",
            subscription_type=SubscriptionType.PRO,
            is_active=True
        )
        db_session.add(tenant)
        
        user = User(
            id=uuid.uuid4(),
            tenant_id=tenant.id,
            email="interaction@example.com",
            password_hash="hashed_password",
            first_name="Test",
            last_name="User",
            role=UserRole.ADMIN,
            is_active=True
        )
        db_session.add(user)
        db_session.commit()
        
        # Create customer service
        service = CustomerService(db_session)
        
        # Create customer
        customer_data = CustomerCreate(
            name="Interaction Test Customer",
            email="interaction-customer@example.com"
        )
        customer = service.create_customer(customer_data, tenant.id)
        
        # Create interaction
        interaction_data = CustomerInteractionCreate(
            customer_id=str(customer.id),
            interaction_type=InteractionType.CALL,
            subject="Test Call",
            description="Called customer for follow-up"
        )
        
        interaction = service.create_interaction(interaction_data, tenant.id, user.id)
        
        # Verify interaction
        assert interaction.id is not None
        assert interaction.customer_id == customer.id
        assert interaction.user_id == user.id
        assert interaction.interaction_type == InteractionType.CALL
        assert interaction.subject == "Test Call"
        assert interaction.description == "Called customer for follow-up"
        
        # Test interaction retrieval
        interactions, total = service.get_customer_interactions(customer.id, tenant.id)
        assert total >= 1  # At least the one we created (plus system-generated ones)
        
        # Find our interaction
        our_interaction = next((i for i in interactions if i.subject == "Test Call"), None)
        assert our_interaction is not None
        assert our_interaction.id == interaction.id