"""
Integration tests for multi-tenant data isolation
"""

import pytest
import uuid
from datetime import datetime
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.core.tenant_context import TenantContext
from app.core.tenant_operations import TenantAwareOperations, TenantSwitchingUtility
from app.models.tenant import Tenant, SubscriptionType, TenantStatus
from app.models.user import User, UserRole, UserStatus
from app.models.customer import Customer
from app.models.product import Product


class TestTenantIsolationIntegration:
    """Integration tests for complete tenant isolation"""
    
    def test_complete_tenant_isolation_workflow(self):
        """Test complete tenant isolation workflow with multiple tenants and users"""
        db = SessionLocal()
        try:
            # Clean up first
            db.query(Customer).delete()
            db.query(Product).delete()
            db.query(User).delete()
            db.query(Tenant).delete()
            db.commit()
            
            # Create two tenants
            tenant1 = Tenant(
                name="Gold Shop A",
                email="goldshopa@test.com",
                subscription_type=SubscriptionType.PRO,
                status=TenantStatus.ACTIVE
            )
            tenant2 = Tenant(
                name="General Store B",
                email="storeb@test.com",
                subscription_type=SubscriptionType.FREE,
                status=TenantStatus.ACTIVE
            )
            
            db.add_all([tenant1, tenant2])
            db.commit()
            db.refresh(tenant1)
            db.refresh(tenant2)
            
            # Create users for each tenant
            user1 = User(
                tenant_id=tenant1.id,
                email="owner1@goldshopa.com",
                password_hash="hashed_password",
                first_name="Owner",
                last_name="One",
                role=UserRole.OWNER,
                status=UserStatus.ACTIVE
            )
            
            user2 = User(
                tenant_id=tenant2.id,
                email="owner2@storeb.com",
                password_hash="hashed_password",
                first_name="Owner",
                last_name="Two",
                role=UserRole.OWNER,
                status=UserStatus.ACTIVE
            )
            
            super_admin = User(
                tenant_id=None,
                email="admin@hesaabplus.com",
                password_hash="hashed_password",
                first_name="Super",
                last_name="Admin",
                role=UserRole.OWNER,
                status=UserStatus.ACTIVE,
                is_super_admin=True
            )
            
            db.add_all([user1, user2, super_admin])
            db.commit()
            db.refresh(user1)
            db.refresh(user2)
            db.refresh(super_admin)
            
            # Test 1: Create data for tenant1
            context1 = TenantContext(tenant_id=str(tenant1.id), user_id=str(user1.id))
            with context1.activate():
                operations = TenantAwareOperations(db)
                
                # Create customers for tenant1
                customer1_data = {
                    "name": "Gold Customer 1",
                    "email": "goldcustomer1@test.com",
                    "phone": "1111111111"
                }
                customer1 = operations.create(Customer, customer1_data)
                
                # Create products for tenant1
                product1_data = {
                    "name": "Gold Ring",
                    "selling_price": 1500.00,
                    "stock_quantity": 10
                }
                product1 = operations.create(Product, product1_data)
                
                assert customer1.tenant_id == tenant1.id
                assert product1.tenant_id == tenant1.id
            
            # Test 2: Create data for tenant2
            context2 = TenantContext(tenant_id=str(tenant2.id), user_id=str(user2.id))
            with context2.activate():
                operations = TenantAwareOperations(db)
                
                # Create customers for tenant2
                customer2_data = {
                    "name": "Store Customer 1",
                    "email": "storecustomer1@test.com",
                    "phone": "2222222222"
                }
                customer2 = operations.create(Customer, customer2_data)
                
                # Create products for tenant2
                product2_data = {
                    "name": "General Item",
                    "selling_price": 25.00,
                    "stock_quantity": 100
                }
                product2 = operations.create(Product, product2_data)
                
                assert customer2.tenant_id == tenant2.id
                assert product2.tenant_id == tenant2.id
            
            # Test 3: Verify tenant1 can only see their own data
            with context1.activate():
                operations = TenantAwareOperations(db)
                
                # Should see only tenant1 customers
                customers = operations.get_all(Customer)
                assert len(customers) == 1
                assert customers[0].name == "Gold Customer 1"
                assert customers[0].tenant_id == tenant1.id
                
                # Should see only tenant1 products
                products = operations.get_all(Product)
                assert len(products) == 1
                assert products[0].name == "Gold Ring"
                assert products[0].tenant_id == tenant1.id
                
                # Should not be able to access tenant2's customer
                tenant2_customer = operations.get_by_id(Customer, str(customer2.id))
                assert tenant2_customer is None
                
                # Should not be able to access tenant2's product
                tenant2_product = operations.get_by_id(Product, str(product2.id))
                assert tenant2_product is None
            
            # Test 4: Verify tenant2 can only see their own data
            with context2.activate():
                operations = TenantAwareOperations(db)
                
                # Should see only tenant2 customers
                customers = operations.get_all(Customer)
                assert len(customers) == 1
                assert customers[0].name == "Store Customer 1"
                assert customers[0].tenant_id == tenant2.id
                
                # Should see only tenant2 products
                products = operations.get_all(Product)
                assert len(products) == 1
                assert products[0].name == "General Item"
                assert products[0].tenant_id == tenant2.id
                
                # Should not be able to access tenant1's customer
                tenant1_customer = operations.get_by_id(Customer, str(customer1.id))
                assert tenant1_customer is None
                
                # Should not be able to access tenant1's product
                tenant1_product = operations.get_by_id(Product, str(product1.id))
                assert tenant1_product is None
            
            # Test 5: Verify super admin can see all data
            super_admin_context = TenantContext(
                tenant_id=str(tenant1.id),
                user_id=str(super_admin.id),
                is_super_admin=True
            )
            
            with super_admin_context.activate():
                operations = TenantAwareOperations(db)
                
                # Should see all customers
                customers = operations.get_all(Customer)
                assert len(customers) == 2
                customer_names = [c.name for c in customers]
                assert "Gold Customer 1" in customer_names
                assert "Store Customer 1" in customer_names
                
                # Should see all products
                products = operations.get_all(Product)
                assert len(products) == 2
                product_names = [p.name for p in products]
                assert "Gold Ring" in product_names
                assert "General Item" in product_names
                
                # Should be able to access any customer by ID
                tenant1_customer = operations.get_by_id(Customer, str(customer1.id))
                tenant2_customer = operations.get_by_id(Customer, str(customer2.id))
                assert tenant1_customer is not None
                assert tenant2_customer is not None
                
                # Should be able to access any product by ID
                tenant1_product = operations.get_by_id(Product, str(product1.id))
                tenant2_product = operations.get_by_id(Product, str(product2.id))
                assert tenant1_product is not None
                assert tenant2_product is not None
            
            # Test 6: Test tenant switching utility
            switching_utility = TenantSwitchingUtility(db)
            
            # Regular user should only access their own tenant
            accessible_tenants_user1 = switching_utility.get_user_accessible_tenants(str(user1.id))
            assert len(accessible_tenants_user1) == 1
            assert accessible_tenants_user1[0]["id"] == str(tenant1.id)
            
            accessible_tenants_user2 = switching_utility.get_user_accessible_tenants(str(user2.id))
            assert len(accessible_tenants_user2) == 1
            assert accessible_tenants_user2[0]["id"] == str(tenant2.id)
            
            # Super admin should access all tenants
            accessible_tenants_admin = switching_utility.get_user_accessible_tenants(str(super_admin.id))
            assert len(accessible_tenants_admin) == 2
            tenant_ids = [t["id"] for t in accessible_tenants_admin]
            assert str(tenant1.id) in tenant_ids
            assert str(tenant2.id) in tenant_ids
            
            # Test 7: Test cross-tenant access prevention
            with context1.activate():
                operations = TenantAwareOperations(db)
                
                # Try to update tenant2's customer (should fail)
                updated_customer = operations.update(
                    Customer, 
                    str(customer2.id), 
                    {"name": "Hacked Customer"}
                )
                assert updated_customer is None
                
                # Verify tenant2's customer was not modified
                db.refresh(customer2)
                assert customer2.name == "Store Customer 1"
                
                # Try to delete tenant2's product (should fail)
                deleted = operations.delete(Product, str(product2.id))
                assert deleted == False
                
                # Verify tenant2's product still exists
                db.refresh(product2)
                assert product2.is_active == True
            
            print("✅ All tenant isolation tests passed!")
            
        finally:
            # Clean up
            try:
                db.query(Customer).delete()
                db.query(Product).delete()
                db.query(User).delete()
                db.query(Tenant).delete()
                db.commit()
            except:
                pass
            db.close()
    
    def test_tenant_context_security(self):
        """Test security aspects of tenant context"""
        db = SessionLocal()
        try:
            # Clean up first
            db.query(Customer).delete()
            db.query(User).delete()
            db.query(Tenant).delete()
            db.commit()
            
            # Create test tenant
            tenant = Tenant(
                name="Security Test Tenant",
                email="security@test.com",
                subscription_type=SubscriptionType.PRO,
                status=TenantStatus.ACTIVE
            )
            
            db.add(tenant)
            db.commit()
            db.refresh(tenant)
            
            # Create customer
            customer = Customer(
                tenant_id=tenant.id,
                name="Secure Customer",
                email="secure@test.com"
            )
            
            db.add(customer)
            db.commit()
            db.refresh(customer)
            
            # Test 1: No context should not allow access
            operations = TenantAwareOperations(db)
            
            # Without tenant context, should not find the customer
            found_customer = operations.get_by_id(Customer, str(customer.id))
            assert found_customer is None
            
            # Test 2: Wrong tenant context should not allow access
            wrong_tenant_id = str(uuid.uuid4())
            wrong_context = TenantContext(tenant_id=wrong_tenant_id, user_id=str(uuid.uuid4()))
            
            with wrong_context.activate():
                operations = TenantAwareOperations(db)
                found_customer = operations.get_by_id(Customer, str(customer.id))
                assert found_customer is None
            
            # Test 3: Correct tenant context should allow access
            correct_context = TenantContext(tenant_id=str(tenant.id), user_id=str(uuid.uuid4()))
            
            with correct_context.activate():
                operations = TenantAwareOperations(db)
                found_customer = operations.get_by_id(Customer, str(customer.id))
                assert found_customer is not None
                assert found_customer.id == customer.id
            
            print("✅ All tenant security tests passed!")
            
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


if __name__ == "__main__":
    pytest.main([__file__, "-v"])