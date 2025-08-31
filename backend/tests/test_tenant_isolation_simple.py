"""
Simplified tests for multi-tenant data isolation
"""

import pytest
import uuid
from datetime import datetime
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.core.tenant_context import TenantContext, TenantAwareQuery
from app.core.tenant_operations import TenantAwareOperations
from app.models.tenant import Tenant, SubscriptionType, TenantStatus
from app.models.user import User, UserRole, UserStatus
from app.models.customer import Customer


class TestBasicTenantIsolation:
    """Test basic tenant isolation functionality"""
    
    def test_tenant_context_creation_and_activation(self):
        """Test creating and activating tenant context"""
        tenant_id = str(uuid.uuid4())
        user_id = str(uuid.uuid4())
        
        context = TenantContext(tenant_id=tenant_id, user_id=user_id)
        
        assert context.tenant_id == tenant_id
        assert context.user_id == user_id
        assert context.is_super_admin == False
        
        # Test activation
        with context.activate():
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
    
    def test_tenant_aware_query_filtering(self):
        """Test tenant-aware query filtering"""
        db = SessionLocal()
        try:
            # Clean up first
            db.query(Customer).delete()
            db.query(User).delete()
            db.query(Tenant).delete()
            db.commit()
            
            # Create test tenants
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
            
            db.add_all([tenant1, tenant2])
            db.commit()
            db.refresh(tenant1)
            db.refresh(tenant2)
            
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
            
            db.add_all([customer1, customer2])
            db.commit()
            
            # Test tenant filtering
            query = db.query(Customer)
            
            # Filter for tenant1
            filtered_query = TenantAwareQuery.filter_by_tenant(query, Customer, str(tenant1.id))
            results = filtered_query.all()
            
            assert len(results) == 1
            assert results[0].tenant_id == tenant1.id
            
            # Test super admin context (should see all)
            super_admin_context = TenantContext(
                tenant_id=str(tenant1.id),
                user_id=str(uuid.uuid4()),
                is_super_admin=True
            )
            
            with super_admin_context.activate():
                filtered_query = TenantAwareQuery.filter_by_tenant(query, Customer)
                results = filtered_query.all()
                assert len(results) == 2  # Should see all customers
            
        finally:
            # Clean up
            try:
                db.query(Customer).delete()
                db.query(User).delete()
                db.query(Tenant).delete()
                db.commit()
            except:
                pass
            db.close()
    
    def test_tenant_aware_operations_create(self):
        """Test tenant-aware create operations"""
        db = SessionLocal()
        try:
            # Clean up first
            db.query(Customer).delete()
            db.query(User).delete()
            db.query(Tenant).delete()
            db.commit()
            
            # Create test tenant
            tenant = Tenant(
                name="Test Tenant",
                email="tenant@test.com",
                subscription_type=SubscriptionType.PRO,
                status=TenantStatus.ACTIVE
            )
            
            db.add(tenant)
            db.commit()
            db.refresh(tenant)
            
            # Test creating customer with tenant context
            context = TenantContext(tenant_id=str(tenant.id), user_id=str(uuid.uuid4()))
            
            with context.activate():
                operations = TenantAwareOperations(db)
                
                customer_data = {
                    "name": "Test Customer",
                    "email": "customer@test.com",
                    "phone": "1234567890"
                }
                
                customer = operations.create(Customer, customer_data)
                
                assert customer.tenant_id == tenant.id
                assert customer.name == "Test Customer"
                assert customer.email == "customer@test.com"
            
        finally:
            # Clean up
            try:
                db.query(Customer).delete()
                db.query(User).delete()
                db.query(Tenant).delete()
                db.commit()
            except:
                pass
            db.close()
    
    def test_tenant_aware_operations_get(self):
        """Test tenant-aware get operations"""
        db = SessionLocal()
        try:
            # Clean up first
            db.query(Customer).delete()
            db.query(User).delete()
            db.query(Tenant).delete()
            db.commit()
            
            # Create test tenants
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
            
            db.add_all([tenant1, tenant2])
            db.commit()
            db.refresh(tenant1)
            db.refresh(tenant2)
            
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
            
            db.add_all([customer1, customer2])
            db.commit()
            db.refresh(customer1)
            db.refresh(customer2)
            
            # Test tenant1 context can only see tenant1 customer
            context1 = TenantContext(tenant_id=str(tenant1.id), user_id=str(uuid.uuid4()))
            
            with context1.activate():
                operations = TenantAwareOperations(db)
                
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
                user_id=str(uuid.uuid4()),
                is_super_admin=True
            )
            
            with super_admin_context.activate():
                operations = TenantAwareOperations(db)
                
                # Should find both customers
                found_customer1 = operations.get_by_id(Customer, str(customer1.id))
                found_customer2 = operations.get_by_id(Customer, str(customer2.id))
                
                assert found_customer1 is not None
                assert found_customer2 is not None
            
        finally:
            # Clean up
            try:
                db.query(Customer).delete()
                db.query(User).delete()
                db.query(Tenant).delete()
                db.commit()
            except:
                pass
            db.close()
    
    def test_tenant_context_decorator(self):
        """Test the with_tenant_context decorator"""
        from app.core.tenant_context import with_tenant_context, get_current_tenant_id
        
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


if __name__ == "__main__":
    pytest.main([__file__, "-v"])