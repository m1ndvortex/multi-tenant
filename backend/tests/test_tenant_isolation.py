"""
Comprehensive tests for multi-tenant data isolation
"""

import pytest
import uuid
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from fastapi.testclient import TestClient
from fastapi import HTTPException

from app.main import app
from app.core.database import get_db, SessionLocal
from app.core.tenant_context import (
    TenantContext, TenantAwareQuery, TenantValidator,
    get_current_tenant_id, with_tenant_context
)
from app.core.tenant_operations import (
    TenantAwareOperations, TenantSwitchingUtility, TenantDataIsolationValidator
)
from app.core.auth import create_access_token
from app.models.tenant import Tenant, SubscriptionType, TenantStatus
from app.models.user import User, UserRole, UserStatus
from app.models.customer import Customer
from app.models.product import Product
from app.models.invoice import Invoice, InvoiceType


class TestTenantContext:
    """Test tenant context functionality"""
    
    def test_tenant_context_creation(self):
        """Test creating tenant context"""
        tenant_id = str(uuid.uuid4())
        user_id = str(uuid.uuid4())
        
        context = TenantContext(tenant_id=tenant_id, user_id=user_id)
        
        assert context.tenant_id == tenant_id
        assert context.user_id == user_id
        assert context.is_super_admin == False
        assert context.is_impersonation == False
    
    def test_tenant_context_activation(self):
        """Test tenant context activation"""
        tenant_id = str(uuid.uuid4())
        user_id = str(uuid.uuid4())
        
        context = TenantContext(tenant_id=tenant_id, user_id=user_id)
        
        with context.activate():
            assert get_current_tenant_id() == tenant_id
            current_context = TenantContext.get_current()
            assert current_context.tenant_id == tenant_id
            assert current_context.user_id == user_id
    
    def test_tenant_access_validation(self):
        """Test tenant access validation"""
        tenant_id = str(uuid.uuid4())
        other_tenant_id = str(uuid.uuid4())
        
        # Regular user context
        context = TenantContext(tenant_id=tenant_id, user_id=str(uuid.uuid4()))
        
        # Should allow access to own tenant
        assert context.validate_tenant_access(tenant_id) == True
        
        # Should deny access to other tenant
        assert context.validate_tenant_access(other_tenant_id) == False
        
        # Super admin should access any tenant
        super_admin_context = TenantContext(
            tenant_id=tenant_id, 
            user_id=str(uuid.uuid4()), 
            is_super_admin=True
        )
        assert super_admin_context.validate_tenant_access(other_tenant_id) == True
    
    def test_tenant_access_exception(self):
        """Test tenant access exception raising"""
        tenant_id = str(uuid.uuid4())
        other_tenant_id = str(uuid.uuid4())
        
        context = TenantContext(tenant_id=tenant_id, user_id=str(uuid.uuid4()))
        
        # Should raise exception for unauthorized access
        with pytest.raises(HTTPException) as exc_info:
            context.ensure_tenant_access(other_tenant_id)
        
        assert exc_info.value.status_code == 403


class TestTenantAwareOperations:
    """Test tenant-aware database operations"""
    
    @pytest.fixture
    def test_tenants(self, db_session):
        """Create test tenants"""
        tenant1 = Tenant(
            name="Test Tenant 1",
            email="tenant1@test.com",
            subscription_type=SubscriptionType.PRO,
            status=TenantStatus.ACTIVE
        )
        tenant2 = Tenant(
            name="Test Tenant 2", 
            email="tenant2@test.com",
            subscription_type=SubscriptionType.FREE,
            status=TenantStatus.ACTIVE
        )
        
        db_session.add_all([tenant1, tenant2])
        db_session.commit()
        db_session.refresh(tenant1)
        db_session.refresh(tenant2)
        
        return tenant1, tenant2
    
    @pytest.fixture
    def test_users(self, db_session, test_tenants):
        """Create test users"""
        tenant1, tenant2 = test_tenants
        
        user1 = User(
            tenant_id=tenant1.id,
            email="user1@test.com",
            password_hash="hashed_password",
            first_name="User",
            last_name="One",
            role=UserRole.OWNER,
            status=UserStatus.ACTIVE
        )
        
        user2 = User(
            tenant_id=tenant2.id,
            email="user2@test.com", 
            password_hash="hashed_password",
            first_name="User",
            last_name="Two",
            role=UserRole.OWNER,
            status=UserStatus.ACTIVE
        )
        
        super_admin = User(
            tenant_id=None,
            email="admin@test.com",
            password_hash="hashed_password",
            first_name="Super",
            last_name="Admin",
            role=UserRole.OWNER,
            status=UserStatus.ACTIVE,
            is_super_admin=True
        )
        
        db_session.add_all([user1, user2, super_admin])
        db_session.commit()
        db_session.refresh(user1)
        db_session.refresh(user2)
        db_session.refresh(super_admin)
        
        return user1, user2, super_admin
    
    def test_create_with_tenant_isolation(self, db_session, test_tenants, test_users):
        """Test creating records with tenant isolation"""
        tenant1, tenant2 = test_tenants
        user1, user2, super_admin = test_users
        
        # Test creating customer for tenant1
        context1 = TenantContext(tenant_id=str(tenant1.id), user_id=str(user1.id))
        with context1.activate():
            operations = TenantAwareOperations(db_session)
            
            customer_data = {
                "name": "Test Customer 1",
                "email": "customer1@test.com",
                "phone": "1234567890"
            }
            
            customer = operations.create(Customer, customer_data)
            
            assert customer.tenant_id == tenant1.id
            assert customer.name == "Test Customer 1"
    
    def test_get_with_tenant_isolation(self, db_session, test_tenants, test_users):
        """Test getting records with tenant isolation"""
        tenant1, tenant2 = test_tenants
        user1, user2, super_admin = test_users
        
        # Create customers for both tenants
        customer1 = Customer(
            tenant_id=tenant1.id,
            name="Customer 1",
            email="customer1@test.com"
        )
        customer2 = Customer(
            tenant_id=tenant2.id,
            name="Customer 2", 
            email="customer2@test.com"
        )
        
        db_session.add_all([customer1, customer2])
        db_session.commit()
        db_session.refresh(customer1)
        db_session.refresh(customer2)
        
        # Test tenant1 user can only see tenant1 customer
        context1 = TenantContext(tenant_id=str(tenant1.id), user_id=str(user1.id))
        with context1.activate():
            operations = TenantAwareOperations(db_session)
            
            # Should find tenant1 customer
            found_customer = operations.get_by_id(Customer, str(customer1.id))
            assert found_customer is not None
            assert found_customer.id == customer1.id
            
            # Should not find tenant2 customer
            not_found_customer = operations.get_by_id(Customer, str(customer2.id))
            assert not_found_customer is None
        
        # Test super admin can see all customers
        super_admin_context = TenantContext(
            tenant_id=str(tenant1.id), 
            user_id=str(super_admin.id), 
            is_super_admin=True
        )
        with super_admin_context.activate():
            operations = TenantAwareOperations(db_session)
            
            # Should find both customers
            found_customer1 = operations.get_by_id(Customer, str(customer1.id))
            found_customer2 = operations.get_by_id(Customer, str(customer2.id))
            
            assert found_customer1 is not None
            assert found_customer2 is not None
    
    def test_get_all_with_tenant_isolation(self, db_session, test_tenants, test_users):
        """Test getting all records with tenant isolation"""
        tenant1, tenant2 = test_tenants
        user1, user2, super_admin = test_users
        
        # Create multiple customers for both tenants
        customers_tenant1 = [
            Customer(tenant_id=tenant1.id, name=f"Customer T1-{i}", email=f"customer-t1-{i}@test.com")
            for i in range(3)
        ]
        customers_tenant2 = [
            Customer(tenant_id=tenant2.id, name=f"Customer T2-{i}", email=f"customer-t2-{i}@test.com")
            for i in range(2)
        ]
        
        db_session.add_all(customers_tenant1 + customers_tenant2)
        db_session.commit()
        
        # Test tenant1 user sees only tenant1 customers
        context1 = TenantContext(tenant_id=str(tenant1.id), user_id=str(user1.id))
        with context1.activate():
            operations = TenantAwareOperations(db_session)
            customers = operations.get_all(Customer)
            
            assert len(customers) == 3
            assert all(customer.tenant_id == tenant1.id for customer in customers)
        
        # Test tenant2 user sees only tenant2 customers
        context2 = TenantContext(tenant_id=str(tenant2.id), user_id=str(user2.id))
        with context2.activate():
            operations = TenantAwareOperations(db_session)
            customers = operations.get_all(Customer)
            
            assert len(customers) == 2
            assert all(customer.tenant_id == tenant2.id for customer in customers)
        
        # Test super admin sees all customers
        super_admin_context = TenantContext(
            tenant_id=str(tenant1.id), 
            user_id=str(super_admin.id), 
            is_super_admin=True
        )
        with super_admin_context.activate():
            operations = TenantAwareOperations(db_session)
            customers = operations.get_all(Customer)
            
            assert len(customers) == 5  # 3 + 2
    
    def test_update_with_tenant_isolation(self, db_session, test_tenants, test_users):
        """Test updating records with tenant isolation"""
        tenant1, tenant2 = test_tenants
        user1, user2, super_admin = test_users
        
        # Create customers for both tenants
        customer1 = Customer(
            tenant_id=tenant1.id,
            name="Customer 1",
            email="customer1@test.com"
        )
        customer2 = Customer(
            tenant_id=tenant2.id,
            name="Customer 2",
            email="customer2@test.com"
        )
        
        db_session.add_all([customer1, customer2])
        db_session.commit()
        db_session.refresh(customer1)
        db_session.refresh(customer2)
        
        # Test tenant1 user can update tenant1 customer
        context1 = TenantContext(tenant_id=str(tenant1.id), user_id=str(user1.id))
        with context1.activate():
            operations = TenantAwareOperations(db_session)
            
            updated_customer = operations.update(
                Customer, 
                str(customer1.id), 
                {"name": "Updated Customer 1"}
            )
            
            assert updated_customer is not None
            assert updated_customer.name == "Updated Customer 1"
            
            # Should not be able to update tenant2 customer
            not_updated = operations.update(
                Customer,
                str(customer2.id),
                {"name": "Should Not Update"}
            )
            
            assert not_updated is None
    
    def test_delete_with_tenant_isolation(self, db_session, test_tenants, test_users):
        """Test deleting records with tenant isolation"""
        tenant1, tenant2 = test_tenants
        user1, user2, super_admin = test_users
        
        # Create customers for both tenants
        customer1 = Customer(
            tenant_id=tenant1.id,
            name="Customer 1",
            email="customer1@test.com"
        )
        customer2 = Customer(
            tenant_id=tenant2.id,
            name="Customer 2",
            email="customer2@test.com"
        )
        
        db_session.add_all([customer1, customer2])
        db_session.commit()
        db_session.refresh(customer1)
        db_session.refresh(customer2)
        
        # Test tenant1 user can delete tenant1 customer
        context1 = TenantContext(tenant_id=str(tenant1.id), user_id=str(user1.id))
        with context1.activate():
            operations = TenantAwareOperations(db_session)
            
            # Should be able to delete tenant1 customer
            deleted = operations.delete(Customer, str(customer1.id))
            assert deleted == True
            
            # Should not be able to delete tenant2 customer
            not_deleted = operations.delete(Customer, str(customer2.id))
            assert not_deleted == False
    
    def test_search_with_tenant_isolation(self, db_session, test_tenants, test_users):
        """Test searching records with tenant isolation"""
        tenant1, tenant2 = test_tenants
        user1, user2, super_admin = test_users
        
        # Create customers with searchable names
        customers_tenant1 = [
            Customer(tenant_id=tenant1.id, name="John Doe", email="john@test.com"),
            Customer(tenant_id=tenant1.id, name="Jane Smith", email="jane@test.com"),
            Customer(tenant_id=tenant1.id, name="Bob Johnson", email="bob@test.com")
        ]
        customers_tenant2 = [
            Customer(tenant_id=tenant2.id, name="John Wilson", email="johnw@test.com"),
            Customer(tenant_id=tenant2.id, name="Alice Brown", email="alice@test.com")
        ]
        
        db_session.add_all(customers_tenant1 + customers_tenant2)
        db_session.commit()
        
        # Test tenant1 user search
        context1 = TenantContext(tenant_id=str(tenant1.id), user_id=str(user1.id))
        with context1.activate():
            operations = TenantAwareOperations(db_session)
            
            # Search for "John Doe" - should only find tenant1 John
            results = operations.search(Customer, "John Doe", ["name"])
            
            assert len(results) == 1
            assert results[0].name == "John Doe"
            assert results[0].tenant_id == tenant1.id
        
        # Test tenant2 user search
        context2 = TenantContext(tenant_id=str(tenant2.id), user_id=str(user2.id))
        with context2.activate():
            operations = TenantAwareOperations(db_session)
            
            # Search for "John Wilson" - should only find tenant2 John
            results = operations.search(Customer, "John Wilson", ["name"])
            
            assert len(results) == 1
            assert results[0].name == "John Wilson"
            assert results[0].tenant_id == tenant2.id


class TestTenantSwitchingUtility:
    """Test tenant switching functionality"""
    
    @pytest.fixture
    def test_data(self, db_session):
        """Create test data"""
        # Create tenants
        tenant1 = Tenant(
            name="Tenant 1",
            email="tenant1@test.com",
            status=TenantStatus.ACTIVE
        )
        tenant2 = Tenant(
            name="Tenant 2",
            email="tenant2@test.com", 
            status=TenantStatus.ACTIVE
        )
        
        db_session.add_all([tenant1, tenant2])
        db_session.commit()
        db_session.refresh(tenant1)
        db_session.refresh(tenant2)
        
        # Create users
        regular_user = User(
            tenant_id=tenant1.id,
            email="user@test.com",
            password_hash="hashed",
            first_name="Regular",
            last_name="User",
            status=UserStatus.ACTIVE
        )
        
        super_admin = User(
            tenant_id=None,
            email="admin@test.com",
            password_hash="hashed",
            first_name="Super",
            last_name="Admin",
            status=UserStatus.ACTIVE,
            is_super_admin=True
        )
        
        db_session.add_all([regular_user, super_admin])
        db_session.commit()
        db_session.refresh(regular_user)
        db_session.refresh(super_admin)
        
        return {
            "tenant1": tenant1,
            "tenant2": tenant2,
            "regular_user": regular_user,
            "super_admin": super_admin
        }
    
    def test_regular_user_tenant_switching(self, db_session, test_data):
        """Test regular user tenant switching"""
        utility = TenantSwitchingUtility(db_session)
        
        regular_user = test_data["regular_user"]
        tenant1 = test_data["tenant1"]
        tenant2 = test_data["tenant2"]
        
        # Should be able to switch to own tenant
        context = utility.switch_tenant_context(str(regular_user.id), str(tenant1.id))
        assert context.tenant_id == str(tenant1.id)
        assert context.is_super_admin == False
        
        # Should not be able to switch to other tenant
        with pytest.raises(ValueError):
            utility.switch_tenant_context(str(regular_user.id), str(tenant2.id))
    
    def test_super_admin_tenant_switching(self, db_session, test_data):
        """Test super admin tenant switching"""
        utility = TenantSwitchingUtility(db_session)
        
        super_admin = test_data["super_admin"]
        tenant1 = test_data["tenant1"]
        tenant2 = test_data["tenant2"]
        
        # Should be able to switch to any tenant
        context1 = utility.switch_tenant_context(str(super_admin.id), str(tenant1.id))
        assert context1.tenant_id == str(tenant1.id)
        assert context1.is_super_admin == True
        
        context2 = utility.switch_tenant_context(str(super_admin.id), str(tenant2.id))
        assert context2.tenant_id == str(tenant2.id)
        assert context2.is_super_admin == True
    
    def test_get_accessible_tenants(self, db_session, test_data):
        """Test getting accessible tenants for users"""
        utility = TenantSwitchingUtility(db_session)
        
        regular_user = test_data["regular_user"]
        super_admin = test_data["super_admin"]
        
        # Regular user should only see their own tenant
        regular_tenants = utility.get_user_accessible_tenants(str(regular_user.id))
        assert len(regular_tenants) == 1
        assert regular_tenants[0]["id"] == str(test_data["tenant1"].id)
        
        # Super admin should see all tenants
        admin_tenants = utility.get_user_accessible_tenants(str(super_admin.id))
        assert len(admin_tenants) == 2


class TestTenantDataIsolationValidator:
    """Test tenant data isolation validation"""
    
    @pytest.fixture
    def test_data(self, db_session):
        """Create test data"""
        # Create tenants
        tenant1 = Tenant(
            name="Tenant 1",
            email="tenant1@test.com",
            status=TenantStatus.ACTIVE
        )
        tenant2 = Tenant(
            name="Tenant 2",
            email="tenant2@test.com",
            status=TenantStatus.ACTIVE
        )
        
        db_session.add_all([tenant1, tenant2])
        db_session.commit()
        db_session.refresh(tenant1)
        db_session.refresh(tenant2)
        
        # Create customers
        customer1 = Customer(
            tenant_id=tenant1.id,
            name="Customer 1",
            email="customer1@test.com"
        )
        customer2 = Customer(
            tenant_id=tenant2.id,
            name="Customer 2",
            email="customer2@test.com"
        )
        
        db_session.add_all([customer1, customer2])
        db_session.commit()
        db_session.refresh(customer1)
        db_session.refresh(customer2)
        
        return {
            "tenant1": tenant1,
            "tenant2": tenant2,
            "customer1": customer1,
            "customer2": customer2
        }
    
    def test_cross_tenant_access_validation(self, db_session, test_data):
        """Test cross-tenant access validation"""
        validator = TenantDataIsolationValidator(db_session)
        
        tenant1 = test_data["tenant1"]
        customer1 = test_data["customer1"]
        customer2 = test_data["customer2"]
        
        record_ids = [str(customer1.id), str(customer2.id)]
        
        # Validate against tenant1 - should only allow customer1
        results = validator.validate_cross_tenant_access(
            Customer, record_ids, str(tenant1.id)
        )
        
        assert results[str(customer1.id)] == True
        assert results[str(customer2.id)] == False
    
    def test_tenant_data_integrity_check(self, db_session, test_data):
        """Test tenant data integrity checking"""
        validator = TenantDataIsolationValidator(db_session)
        
        tenant1 = test_data["tenant1"]
        
        # Check data integrity for tenant1
        integrity_report = validator.check_tenant_data_integrity(str(tenant1.id))
        
        assert integrity_report["tenant_id"] == str(tenant1.id)
        assert "checks" in integrity_report
        assert "customers" in integrity_report["checks"]
        assert integrity_report["checks"]["customers"]["count"] == 1


class TestTenantIsolationIntegration:
    """Integration tests for tenant isolation"""
    
    @pytest.fixture
    def client(self):
        """Create test client"""
        return TestClient(app)
    
    @pytest.fixture
    def test_data(self, db_session):
        """Create test data"""
        # Create tenants
        tenant1 = Tenant(
            name="Test Tenant 1",
            email="tenant1@test.com",
            status=TenantStatus.ACTIVE
        )
        tenant2 = Tenant(
            name="Test Tenant 2",
            email="tenant2@test.com",
            status=TenantStatus.ACTIVE
        )
        
        db_session.add_all([tenant1, tenant2])
        db_session.commit()
        db_session.refresh(tenant1)
        db_session.refresh(tenant2)
        
        # Create users
        user1 = User(
            tenant_id=tenant1.id,
            email="user1@test.com",
            password_hash="hashed_password",
            first_name="User",
            last_name="One",
            role=UserRole.OWNER,
            status=UserStatus.ACTIVE
        )
        
        user2 = User(
            tenant_id=tenant2.id,
            email="user2@test.com",
            password_hash="hashed_password",
            first_name="User",
            last_name="Two",
            role=UserRole.OWNER,
            status=UserStatus.ACTIVE
        )
        
        db_session.add_all([user1, user2])
        db_session.commit()
        db_session.refresh(user1)
        db_session.refresh(user2)
        
        return {
            "tenant1": tenant1,
            "tenant2": tenant2,
            "user1": user1,
            "user2": user2
        }
    
    def test_api_tenant_isolation_with_jwt(self, client, test_data):
        """Test API tenant isolation with JWT tokens"""
        user1 = test_data["user1"]
        user2 = test_data["user2"]
        tenant1 = test_data["tenant1"]
        tenant2 = test_data["tenant2"]
        
        # Create JWT tokens for both users
        token1_data = {
            "user_id": str(user1.id),
            "tenant_id": str(tenant1.id),
            "email": user1.email,
            "role": user1.role.value,
            "is_super_admin": False
        }
        token1 = create_access_token(data=token1_data)
        
        token2_data = {
            "user_id": str(user2.id),
            "tenant_id": str(tenant2.id),
            "email": user2.email,
            "role": user2.role.value,
            "is_super_admin": False
        }
        token2 = create_access_token(data=token2_data)
        
        # Test that each user can only access their own tenant's data
        # This would require actual API endpoints to test properly
        # For now, we verify the tokens are created correctly
        
        assert token1 is not None
        assert token2 is not None
        assert token1 != token2


class TestTenantContextDecorator:
    """Test tenant context decorator functionality"""
    
    def test_with_tenant_context_decorator(self):
        """Test the with_tenant_context decorator"""
        tenant_id = str(uuid.uuid4())
        user_id = str(uuid.uuid4())
        
        @with_tenant_context(tenant_id, user_id, is_super_admin=False)
        def test_function():
            context = TenantContext.get_current()
            return {
                "tenant_id": context.tenant_id,
                "user_id": context.user_id,
                "is_super_admin": context.is_super_admin
            }
        
        result = test_function()
        
        assert result["tenant_id"] == tenant_id
        assert result["user_id"] == user_id
        assert result["is_super_admin"] == False
    
    def test_nested_tenant_contexts(self):
        """Test nested tenant contexts"""
        tenant1_id = str(uuid.uuid4())
        tenant2_id = str(uuid.uuid4())
        user1_id = str(uuid.uuid4())
        user2_id = str(uuid.uuid4())
        
        context1 = TenantContext(tenant_id=tenant1_id, user_id=user1_id)
        context2 = TenantContext(tenant_id=tenant2_id, user_id=user2_id)
        
        with context1.activate():
            assert get_current_tenant_id() == tenant1_id
            
            with context2.activate():
                assert get_current_tenant_id() == tenant2_id
            
            # Should restore previous context
            assert get_current_tenant_id() == tenant1_id


if __name__ == "__main__":
    pytest.main([__file__, "-v"])