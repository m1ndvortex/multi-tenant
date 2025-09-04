"""
Multi-tenant isolation tests for product management system
Following Docker-first testing standards with real database scenarios
"""

import pytest
import uuid
from decimal import Decimal
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.models.tenant import Tenant, SubscriptionType, TenantStatus
from app.models.user import User, UserRole, UserStatus
from app.models.product import Product, ProductCategory
from app.core.auth import create_access_token


class TestProductMultiTenantIsolation:
    """Test multi-tenant data isolation for products with real database queries"""
    
    @pytest.fixture
    def tenant1(self, db_session: Session):
        """Create first test tenant"""
        tenant = Tenant(
            id=uuid.uuid4(),
            name="Gold Shop Alpha",
            email="alpha@goldshop.com",
            phone="+1234567890",
            subscription_type=SubscriptionType.PRO,
            status=TenantStatus.ACTIVE
        )
        db_session.add(tenant)
        db_session.commit()
        db_session.refresh(tenant)
        return tenant
    
    @pytest.fixture
    def tenant2(self, db_session: Session):
        """Create second test tenant"""
        tenant = Tenant(
            id=uuid.uuid4(),
            name="Gold Shop Beta",
            email="beta@goldshop.com",
            phone="+1234567891",
            subscription_type=SubscriptionType.PRO,
            status=TenantStatus.ACTIVE
        )
        db_session.add(tenant)
        db_session.commit()
        db_session.refresh(tenant)
        return tenant
    
    @pytest.fixture
    def tenant3(self, db_session: Session):
        """Create third test tenant for comprehensive testing"""
        tenant = Tenant(
            id=uuid.uuid4(),
            name="Gold Shop Gamma",
            email="gamma@goldshop.com",
            phone="+1234567892",
            subscription_type=SubscriptionType.FREE,
            status=TenantStatus.ACTIVE
        )
        db_session.add(tenant)
        db_session.commit()
        db_session.refresh(tenant)
        return tenant
    
    @pytest.fixture
    def user1(self, db_session: Session, tenant1):
        """Create user for tenant 1"""
        user = User(
            id=uuid.uuid4(),
            tenant_id=tenant1.id,
            email="user1@goldshop.com",
            first_name="User",
            last_name="Alpha",
            password_hash="hashed_password",
            role=UserRole.ADMIN,
            status=UserStatus.ACTIVE
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
        return user
    
    @pytest.fixture
    def user2(self, db_session: Session, tenant2):
        """Create user for tenant 2"""
        user = User(
            id=uuid.uuid4(),
            tenant_id=tenant2.id,
            email="user2@goldshop.com",
            first_name="User",
            last_name="Beta",
            password_hash="hashed_password",
            role=UserRole.ADMIN,
            status=UserStatus.ACTIVE
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
        return user
    
    @pytest.fixture
    def user3(self, db_session: Session, tenant3):
        """Create user for tenant 3"""
        user = User(
            id=uuid.uuid4(),
            tenant_id=tenant3.id,
            email="user3@goldshop.com",
            first_name="User",
            last_name="Gamma",
            password_hash="hashed_password",
            role=UserRole.ADMIN,
            status=UserStatus.ACTIVE
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
        return user
    
    @pytest.fixture
    def auth_headers1(self, user1):
        """Create auth headers for user 1"""
        token = create_access_token(data={
            "user_id": str(user1.id),
            "tenant_id": str(user1.tenant_id)
        })
        return {"Authorization": f"Bearer {token}"}
    
    @pytest.fixture
    def auth_headers2(self, user2):
        """Create auth headers for user 2"""
        token = create_access_token(data={
            "user_id": str(user2.id),
            "tenant_id": str(user2.tenant_id)
        })
        return {"Authorization": f"Bearer {token}"}
    
    @pytest.fixture
    def auth_headers3(self, user3):
        """Create auth headers for user 3"""
        token = create_access_token(data={
            "user_id": str(user3.id),
            "tenant_id": str(user3.tenant_id)
        })
        return {"Authorization": f"Bearer {token}"}
    
    def test_product_data_isolation_comprehensive(self, client: TestClient, auth_headers1, auth_headers2, auth_headers3):
        """Test comprehensive product data isolation between multiple tenants"""
        
        # Create products for each tenant with overlapping data
        tenant1_products = [
            {
                "name": "Gold Ring Premium",
                "sku": "GRP001",
                "barcode": "1111111111111",
                "selling_price": "500.00",
                "is_gold_product": True,
                "gold_purity": "18.000",
                "weight_per_unit": "5.0",
                "stock_quantity": 10,
                "tags": ["premium", "gold", "ring"]
            },
            {
                "name": "Silver Necklace",
                "sku": "SN001",
                "barcode": "2222222222222",
                "selling_price": "150.00",
                "stock_quantity": 20,
                "tags": ["silver", "necklace"]
            }
        ]
        
        tenant2_products = [
            {
                "name": "Gold Ring Premium",  # Same name as tenant 1
                "sku": "GRP001",  # Same SKU as tenant 1 (should be allowed)
                "barcode": "1111111111111",  # Same barcode as tenant 1 (should be allowed)
                "selling_price": "600.00",  # Different price
                "is_gold_product": True,
                "gold_purity": "22.000",  # Different purity
                "weight_per_unit": "6.0",
                "stock_quantity": 5,
                "tags": ["premium", "gold", "ring"]
            },
            {
                "name": "Diamond Earrings",
                "sku": "DE001",
                "selling_price": "1200.00",
                "stock_quantity": 3,
                "tags": ["diamond", "earrings", "luxury"]
            }
        ]
        
        tenant3_products = [
            {
                "name": "Basic Gold Ring",
                "sku": "BGR001",
                "selling_price": "200.00",
                "is_gold_product": True,
                "gold_purity": "14.000",
                "weight_per_unit": "3.0",
                "stock_quantity": 15,
                "tags": ["basic", "gold", "ring"]
            }
        ]
        
        # Create products for each tenant
        tenant1_created = []
        for product_data in tenant1_products:
            response = client.post("/api/products/", json=product_data, headers=auth_headers1)
            assert response.status_code == 200
            tenant1_created.append(response.json())
        
        tenant2_created = []
        for product_data in tenant2_products:
            response = client.post("/api/products/", json=product_data, headers=auth_headers2)
            assert response.status_code == 200
            tenant2_created.append(response.json())
        
        tenant3_created = []
        for product_data in tenant3_products:
            response = client.post("/api/products/", json=product_data, headers=auth_headers3)
            assert response.status_code == 200
            tenant3_created.append(response.json())
        
        # Test 1: Each tenant should only see their own products
        response1 = client.get("/api/products/", headers=auth_headers1)
        assert response1.status_code == 200
        data1 = response1.json()
        assert data1["total"] == 2
        product_names1 = [p["name"] for p in data1["products"]]
        assert "Gold Ring Premium" in product_names1
        assert "Silver Necklace" in product_names1
        assert "Diamond Earrings" not in product_names1
        assert "Basic Gold Ring" not in product_names1
        
        response2 = client.get("/api/products/", headers=auth_headers2)
        assert response2.status_code == 200
        data2 = response2.json()
        assert data2["total"] == 2
        product_names2 = [p["name"] for p in data2["products"]]
        assert "Gold Ring Premium" in product_names2
        assert "Diamond Earrings" in product_names2
        assert "Silver Necklace" not in product_names2
        assert "Basic Gold Ring" not in product_names2
        
        response3 = client.get("/api/products/", headers=auth_headers3)
        assert response3.status_code == 200
        data3 = response3.json()
        assert data3["total"] == 1
        assert data3["products"][0]["name"] == "Basic Gold Ring"
        
        # Test 2: Cross-tenant product access should fail
        tenant1_product_id = tenant1_created[0]["id"]
        tenant2_product_id = tenant2_created[0]["id"]
        
        # Tenant 2 cannot access tenant 1's product
        response = client.get(f"/api/products/{tenant1_product_id}", headers=auth_headers2)
        assert response.status_code == 404
        
        # Tenant 1 cannot access tenant 2's product
        response = client.get(f"/api/products/{tenant2_product_id}", headers=auth_headers1)
        assert response.status_code == 404
        
        # Test 3: Cross-tenant product updates should fail
        update_data = {"name": "Hacked Product Name"}
        
        response = client.put(f"/api/products/{tenant1_product_id}", json=update_data, headers=auth_headers2)
        assert response.status_code == 404
        
        response = client.put(f"/api/products/{tenant2_product_id}", json=update_data, headers=auth_headers1)
        assert response.status_code == 404
        
        # Test 4: Cross-tenant product deletion should fail
        response = client.delete(f"/api/products/{tenant1_product_id}", headers=auth_headers2)
        assert response.status_code == 404
        
        response = client.delete(f"/api/products/{tenant2_product_id}", headers=auth_headers1)
        assert response.status_code == 404
        
        # Test 5: Search results should be tenant-isolated
        # Search for "Gold Ring Premium" - both tenants have it but should only see their own
        response1 = client.get("/api/products/?query=Gold Ring Premium", headers=auth_headers1)
        assert response1.status_code == 200
        data1 = response1.json()
        assert data1["total"] == 1
        assert float(data1["products"][0]["selling_price"]) == 500.0  # Tenant 1's price
        
        response2 = client.get("/api/products/?query=Gold Ring Premium", headers=auth_headers2)
        assert response2.status_code == 200
        data2 = response2.json()
        assert data2["total"] == 1
        assert float(data2["products"][0]["selling_price"]) == 600.0  # Tenant 2's price
        
        # Test 6: SKU and barcode uniqueness is per-tenant
        # Both tenant 1 and 2 have same SKU and barcode, which should be allowed
        assert tenant1_created[0]["sku"] == tenant2_created[0]["sku"] == "GRP001"
        assert tenant1_created[0]["barcode"] == tenant2_created[0]["barcode"] == "1111111111111"
        
        # But within same tenant, duplicates should fail
        duplicate_product = {
            "name": "Duplicate SKU Product",
            "sku": "GRP001",  # Same as existing product in tenant 1
            "selling_price": "100.00"
        }
        
        response = client.post("/api/products/", json=duplicate_product, headers=auth_headers1)
        assert response.status_code == 400
        assert "already exists" in response.json()["detail"]["message"]
    
    def test_category_isolation_comprehensive(self, client: TestClient, auth_headers1, auth_headers2, auth_headers3):
        """Test comprehensive category isolation between tenants"""
        
        # Create categories for each tenant
        tenant1_categories = [
            {"name": "Gold Jewelry", "description": "Gold jewelry products", "sort_order": 1},
            {"name": "Silver Jewelry", "description": "Silver jewelry products", "sort_order": 2}
        ]
        
        tenant2_categories = [
            {"name": "Gold Jewelry", "description": "Premium gold jewelry", "sort_order": 1},  # Same name
            {"name": "Diamond Jewelry", "description": "Diamond jewelry products", "sort_order": 2}
        ]
        
        tenant3_categories = [
            {"name": "Basic Jewelry", "description": "Basic jewelry products", "sort_order": 1}
        ]
        
        # Create categories for each tenant
        tenant1_cat_ids = []
        for cat_data in tenant1_categories:
            response = client.post("/api/products/categories", json=cat_data, headers=auth_headers1)
            assert response.status_code == 200
            tenant1_cat_ids.append(response.json()["id"])
        
        tenant2_cat_ids = []
        for cat_data in tenant2_categories:
            response = client.post("/api/products/categories", json=cat_data, headers=auth_headers2)
            assert response.status_code == 200
            tenant2_cat_ids.append(response.json()["id"])
        
        tenant3_cat_ids = []
        for cat_data in tenant3_categories:
            response = client.post("/api/products/categories", json=cat_data, headers=auth_headers3)
            assert response.status_code == 200
            tenant3_cat_ids.append(response.json()["id"])
        
        # Test 1: Each tenant should only see their own categories
        response1 = client.get("/api/products/categories", headers=auth_headers1)
        assert response1.status_code == 200
        categories1 = response1.json()
        assert len(categories1) == 2
        cat_names1 = [cat["name"] for cat in categories1]
        assert "Gold Jewelry" in cat_names1
        assert "Silver Jewelry" in cat_names1
        assert "Diamond Jewelry" not in cat_names1
        assert "Basic Jewelry" not in cat_names1
        
        response2 = client.get("/api/products/categories", headers=auth_headers2)
        assert response2.status_code == 200
        categories2 = response2.json()
        assert len(categories2) == 2
        cat_names2 = [cat["name"] for cat in categories2]
        assert "Gold Jewelry" in cat_names2
        assert "Diamond Jewelry" in cat_names2
        assert "Silver Jewelry" not in cat_names2
        assert "Basic Jewelry" not in cat_names2
        
        response3 = client.get("/api/products/categories", headers=auth_headers3)
        assert response3.status_code == 200
        categories3 = response3.json()
        assert len(categories3) == 1
        assert categories3[0]["name"] == "Basic Jewelry"
        
        # Test 2: Cross-tenant category usage should fail
        # Try to create product in tenant 2 using tenant 1's category
        product_data = {
            "name": "Cross-tenant Product",
            "selling_price": "100.00",
            "category_id": tenant1_cat_ids[0]  # Tenant 1's category
        }
        
        response = client.post("/api/products/", json=product_data, headers=auth_headers2)
        assert response.status_code == 400
        assert "Invalid category ID" in response.json()["detail"]
        
        # Test 3: Cross-tenant category updates should fail
        update_data = {"name": "Hacked Category"}
        
        response = client.put(f"/api/products/categories/{tenant1_cat_ids[0]}", json=update_data, headers=auth_headers2)
        assert response.status_code == 404
        
        # Test 4: Cross-tenant category deletion should fail
        response = client.delete(f"/api/products/categories/{tenant1_cat_ids[0]}", headers=auth_headers2)
        assert response.status_code == 404
        
        # Test 5: Same category names allowed across tenants
        # Both tenant 1 and 2 have "Gold Jewelry" category
        gold_cats_t1 = [cat for cat in categories1 if cat["name"] == "Gold Jewelry"]
        gold_cats_t2 = [cat for cat in categories2 if cat["name"] == "Gold Jewelry"]
        
        assert len(gold_cats_t1) == 1
        assert len(gold_cats_t2) == 1
        assert gold_cats_t1[0]["id"] != gold_cats_t2[0]["id"]  # Different IDs
        assert gold_cats_t1[0]["description"] != gold_cats_t2[0]["description"]  # Different descriptions
    
    def test_stock_operations_isolation(self, client: TestClient, auth_headers1, auth_headers2):
        """Test stock operations are isolated between tenants"""
        
        # Create identical products for both tenants
        product_data = {
            "name": "Stock Test Product",
            "sku": "STP001",
            "selling_price": "100.00",
            "track_inventory": True,
            "stock_quantity": 50,
            "min_stock_level": 10
        }
        
        # Create for tenant 1
        response1 = client.post("/api/products/", json=product_data, headers=auth_headers1)
        assert response1.status_code == 200
        product1_id = response1.json()["id"]
        
        # Create for tenant 2
        response2 = client.post("/api/products/", json=product_data, headers=auth_headers2)
        assert response2.status_code == 200
        product2_id = response2.json()["id"]
        
        # Perform stock operations on tenant 1's product
        adjust_data = {"quantity": 20, "reason": "New stock"}
        response = client.post(f"/api/products/{product1_id}/stock/adjust", json=adjust_data, headers=auth_headers1)
        assert response.status_code == 200
        
        reserve_data = {"quantity": 15, "reason": "Customer order"}
        response = client.post(f"/api/products/{product1_id}/stock/reserve", json=reserve_data, headers=auth_headers1)
        assert response.status_code == 200
        
        # Verify tenant 1's product state
        response = client.get(f"/api/products/{product1_id}", headers=auth_headers1)
        assert response.status_code == 200
        product1_state = response.json()
        assert product1_state["stock_quantity"] == 70  # 50 + 20
        assert product1_state["reserved_quantity"] == 15
        
        # Verify tenant 2's product is unchanged
        response = client.get(f"/api/products/{product2_id}", headers=auth_headers2)
        assert response.status_code == 200
        product2_state = response.json()
        assert product2_state["stock_quantity"] == 50  # Original amount
        assert product2_state["reserved_quantity"] == 0  # No reservations
        
        # Test cross-tenant stock operations fail
        response = client.post(f"/api/products/{product1_id}/stock/adjust", json=adjust_data, headers=auth_headers2)
        assert response.status_code == 404
        
        response = client.post(f"/api/products/{product2_id}/stock/reserve", json=reserve_data, headers=auth_headers1)
        assert response.status_code == 404
    
    def test_analytics_isolation(self, client: TestClient, auth_headers1, auth_headers2, auth_headers3):
        """Test analytics are isolated between tenants"""
        
        # Create different product portfolios for each tenant
        # Tenant 1: High-value gold products
        tenant1_products = [
            {
                "name": "Premium Gold Ring",
                "selling_price": "1000.00",
                "cost_price": "800.00",
                "is_gold_product": True,
                "gold_purity": "22.000",
                "weight_per_unit": "8.0",
                "status": "active",
                "stock_quantity": 5,
                "min_stock_level": 2
            },
            {
                "name": "Gold Necklace",
                "selling_price": "1500.00",
                "cost_price": "1200.00",
                "is_gold_product": True,
                "gold_purity": "18.000",
                "weight_per_unit": "12.0",
                "status": "active",
                "stock_quantity": 3,
                "min_stock_level": 1
            }
        ]
        
        # Tenant 2: Mixed products with some low stock
        tenant2_products = [
            {
                "name": "Silver Ring",
                "selling_price": "200.00",
                "status": "active",
                "stock_quantity": 1,  # Low stock
                "min_stock_level": 5
            },
            {
                "name": "Repair Service",
                "selling_price": "50.00",
                "is_service": True,
                "track_inventory": False
            },
            {
                "name": "Out of Stock Item",
                "selling_price": "300.00",
                "status": "inactive",
                "stock_quantity": 0,
                "min_stock_level": 2
            }
        ]
        
        # Tenant 3: Basic products
        tenant3_products = [
            {
                "name": "Basic Ring",
                "selling_price": "100.00",
                "status": "active",
                "stock_quantity": 10,
                "min_stock_level": 3
            }
        ]
        
        # Create products for each tenant
        for products, headers in [(tenant1_products, auth_headers1), 
                                 (tenant2_products, auth_headers2), 
                                 (tenant3_products, auth_headers3)]:
            for product_data in products:
                response = client.post("/api/products/", json=product_data, headers=headers)
                assert response.status_code == 200
        
        # Test analytics isolation
        # Tenant 1 analytics
        response1 = client.get("/api/products/analytics/stats", headers=auth_headers1)
        assert response1.status_code == 200
        stats1 = response1.json()
        assert stats1["total_products"] == 2
        assert stats1["gold_products"] == 2
        assert stats1["service_products"] == 0
        assert stats1["low_stock_products"] == 0
        assert stats1["out_of_stock_products"] == 0
        
        # Inventory value: (5 * 1000) + (3 * 1500) = 9500
        expected_value1 = Decimal("9500.00")
        assert Decimal(str(stats1["total_inventory_value"])) == expected_value1
        
        # Tenant 2 analytics
        response2 = client.get("/api/products/analytics/stats", headers=auth_headers2)
        assert response2.status_code == 200
        stats2 = response2.json()
        assert stats2["total_products"] == 3
        assert stats2["gold_products"] == 0
        assert stats2["service_products"] == 1
        assert stats2["low_stock_products"] == 1  # Silver Ring
        assert stats2["out_of_stock_products"] == 1  # Out of Stock Item
        
        # Inventory value: (1 * 200) + (0 * 300) = 200 (excluding services)
        expected_value2 = Decimal("200.00")
        assert Decimal(str(stats2["total_inventory_value"])) == expected_value2
        
        # Tenant 3 analytics
        response3 = client.get("/api/products/analytics/stats", headers=auth_headers3)
        assert response3.status_code == 200
        stats3 = response3.json()
        assert stats3["total_products"] == 1
        assert stats3["gold_products"] == 0
        assert stats3["service_products"] == 0
        assert stats3["low_stock_products"] == 0
        assert stats3["out_of_stock_products"] == 0
        
        # Inventory value: 10 * 100 = 1000
        expected_value3 = Decimal("1000.00")
        assert Decimal(str(stats3["total_inventory_value"])) == expected_value3
        
        # Test low stock alerts isolation
        alerts1_response = client.get("/api/products/analytics/low-stock", headers=auth_headers1)
        assert alerts1_response.status_code == 200
        alerts1 = alerts1_response.json()
        assert len(alerts1) == 0  # No low stock items
        
        alerts2_response = client.get("/api/products/analytics/low-stock", headers=auth_headers2)
        assert alerts2_response.status_code == 200
        alerts2 = alerts2_response.json()
        assert len(alerts2) == 2  # Silver Ring (low stock) and Out of Stock Item
        
        alerts3_response = client.get("/api/products/analytics/low-stock", headers=auth_headers3)
        assert alerts3_response.status_code == 200
        alerts3 = alerts3_response.json()
        assert len(alerts3) == 0  # No low stock items
    
    def test_bulk_operations_isolation(self, client: TestClient, auth_headers1, auth_headers2):
        """Test bulk operations are isolated between tenants"""
        
        # Create products for both tenants
        product_data_template = {
            "name": "Bulk Test Product",
            "selling_price": "100.00",
            "manufacturer": "Original Maker"
        }
        
        # Create 3 products for tenant 1
        tenant1_ids = []
        for i in range(3):
            product_data = product_data_template.copy()
            product_data["name"] = f"Tenant 1 Product {i+1}"
            response = client.post("/api/products/", json=product_data, headers=auth_headers1)
            assert response.status_code == 200
            tenant1_ids.append(response.json()["id"])
        
        # Create 2 products for tenant 2
        tenant2_ids = []
        for i in range(2):
            product_data = product_data_template.copy()
            product_data["name"] = f"Tenant 2 Product {i+1}"
            response = client.post("/api/products/", json=product_data, headers=auth_headers2)
            assert response.status_code == 200
            tenant2_ids.append(response.json()["id"])
        
        # Test 1: Bulk update with tenant 1's products using tenant 1's auth
        bulk_update_data = {
            "product_ids": tenant1_ids,
            "updates": {"manufacturer": "Tenant 1 Updated Manufacturer"}
        }
        
        response = client.post("/api/products/bulk/update", json=bulk_update_data, headers=auth_headers1)
        assert response.status_code == 200
        result = response.json()
        assert len(result["updated_products"]) == 3
        assert len(result["failed_updates"]) == 0
        
        # Test 2: Bulk update with tenant 1's products using tenant 2's auth (should fail)
        response = client.post("/api/products/bulk/update", json=bulk_update_data, headers=auth_headers2)
        assert response.status_code == 200
        result = response.json()
        assert len(result["updated_products"]) == 0
        assert len(result["failed_updates"]) == 3  # All should fail
        
        # Test 3: Mixed bulk update (tenant 1 tries to update both tenant's products)
        mixed_ids = tenant1_ids[:2] + tenant2_ids  # 2 from tenant 1, 2 from tenant 2
        mixed_update_data = {
            "product_ids": mixed_ids,
            "updates": {"brand": "Mixed Brand"}
        }
        
        response = client.post("/api/products/bulk/update", json=mixed_update_data, headers=auth_headers1)
        assert response.status_code == 200
        result = response.json()
        assert len(result["updated_products"]) == 2  # Only tenant 1's products
        assert len(result["failed_updates"]) == 2  # Tenant 2's products should fail
        
        # Test 4: Bulk delete isolation
        bulk_delete_data = {"product_ids": tenant2_ids}
        
        # Tenant 1 tries to delete tenant 2's products (should fail)
        response = client.post("/api/products/bulk/delete", json=bulk_delete_data, headers=auth_headers1)
        assert response.status_code == 200
        result = response.json()
        assert len(result["deleted_products"]) == 0
        assert len(result["failed_deletes"]) == 2
        
        # Tenant 2 deletes their own products (should succeed)
        response = client.post("/api/products/bulk/delete", json=bulk_delete_data, headers=auth_headers2)
        assert response.status_code == 200
        result = response.json()
        assert len(result["deleted_products"]) == 2
        assert len(result["failed_deletes"]) == 0
        
        # Verify tenant 2's products are deleted
        for product_id in tenant2_ids:
            response = client.get(f"/api/products/{product_id}", headers=auth_headers2)
            assert response.status_code == 404
        
        # Verify tenant 1's products still exist
        for product_id in tenant1_ids:
            response = client.get(f"/api/products/{product_id}", headers=auth_headers1)
            assert response.status_code == 200
    
    def test_database_level_isolation(self, db_session: Session, tenant1, tenant2):
        """Test database-level isolation with direct SQL queries"""
        
        # Create products directly in database for both tenants
        product1 = Product(
            id=uuid.uuid4(),
            tenant_id=tenant1.id,
            name="DB Test Product 1",
            selling_price=Decimal("100.00"),
            stock_quantity=10,
            is_active=True
        )
        
        product2 = Product(
            id=uuid.uuid4(),
            tenant_id=tenant2.id,
            name="DB Test Product 2",
            selling_price=Decimal("200.00"),
            stock_quantity=20,
            is_active=True
        )
        
        db_session.add_all([product1, product2])
        db_session.commit()
        
        # Test 1: Query with tenant filter should only return tenant's products
        tenant1_products = db_session.query(Product).filter(
            Product.tenant_id == tenant1.id,
            Product.is_active == True
        ).all()
        
        assert len(tenant1_products) == 1
        assert tenant1_products[0].name == "DB Test Product 1"
        
        tenant2_products = db_session.query(Product).filter(
            Product.tenant_id == tenant2.id,
            Product.is_active == True
        ).all()
        
        assert len(tenant2_products) == 1
        assert tenant2_products[0].name == "DB Test Product 2"
        
        # Test 2: Query without tenant filter should return all products (for verification)
        all_products = db_session.query(Product).filter(Product.is_active == True).all()
        assert len(all_products) >= 2  # At least our test products
        
        # Test 3: Verify tenant_id constraint prevents cross-tenant access
        # This would be enforced by application logic, not database constraints
        # But we can verify the data is properly segregated
        
        # Count products per tenant
        tenant1_count = db_session.query(Product).filter(
            Product.tenant_id == tenant1.id
        ).count()
        
        tenant2_count = db_session.query(Product).filter(
            Product.tenant_id == tenant2.id
        ).count()
        
        assert tenant1_count >= 1
        assert tenant2_count >= 1
        
        # Test 4: Verify no products exist without tenant_id (data integrity)
        orphaned_products = db_session.query(Product).filter(
            Product.tenant_id.is_(None)
        ).count()
        
        assert orphaned_products == 0
        
        # Test 5: Test aggregate queries are tenant-isolated
        tenant1_total_value = db_session.query(
            db_session.query(Product.stock_quantity * Product.selling_price).filter(
                Product.tenant_id == tenant1.id,
                Product.is_active == True
            ).label('total_value')
        ).scalar()
        
        tenant2_total_value = db_session.query(
            db_session.query(Product.stock_quantity * Product.selling_price).filter(
                Product.tenant_id == tenant2.id,
                Product.is_active == True
            ).label('total_value')
        ).scalar()
        
        # Values should be different and specific to each tenant
        assert tenant1_total_value != tenant2_total_value
        
        # Test 6: Verify foreign key relationships respect tenant boundaries
        # Create categories for each tenant
        category1 = ProductCategory(
            id=uuid.uuid4(),
            tenant_id=tenant1.id,
            name="Tenant 1 Category",
            is_active=True
        )
        
        category2 = ProductCategory(
            id=uuid.uuid4(),
            tenant_id=tenant2.id,
            name="Tenant 2 Category",
            is_active=True
        )
        
        db_session.add_all([category1, category2])
        db_session.commit()
        
        # Update products to use categories
        product1.category_id = category1.id
        product2.category_id = category2.id
        db_session.commit()
        
        # Verify relationships are properly isolated
        tenant1_products_with_cats = db_session.query(Product).join(ProductCategory).filter(
            Product.tenant_id == tenant1.id,
            ProductCategory.tenant_id == tenant1.id
        ).all()
        
        assert len(tenant1_products_with_cats) == 1
        assert tenant1_products_with_cats[0].category_id == category1.id
        
        # Cross-tenant join should return no results
        cross_tenant_query = db_session.query(Product).join(ProductCategory).filter(
            Product.tenant_id == tenant1.id,
            ProductCategory.tenant_id == tenant2.id
        ).all()
        
        assert len(cross_tenant_query) == 0