"""
Comprehensive Integration Tests for Inventory/Products API
Tests product management, stock operations, categories, and inventory tracking with real database
"""

import pytest
from fastapi.testclient import TestClient
from decimal import Decimal
import uuid
from datetime import datetime, date, timedelta

from app.main import app
from app.models.tenant import Tenant, TenantStatus, SubscriptionType
from app.models.user import User, UserRole, UserStatus
from app.models.product import Product, ProductCategory
from app.core.auth import get_password_hash


class TestInventoryAPIComprehensive:
    """Comprehensive integration tests for Inventory/Products API"""
    
    @pytest.fixture
    def client(self):
        """Create test client"""
        return TestClient(app)
    
    @pytest.fixture
    def setup_inventory_test_data(self, db_session):
        """Setup comprehensive test data for inventory tests"""
        # Create tenant
        tenant = Tenant(
            name="Inventory Test Business",
            domain="inventory-test.example.com",
            email="inventory@test.com",
            subscription_type=SubscriptionType.PRO,
            status=TenantStatus.ACTIVE,
            max_users=10,
            max_products=500,
            max_customers=200,
            max_monthly_invoices=1000
        )
        db_session.add(tenant)
        db_session.commit()
        
        # Create user
        user = User(
            tenant_id=tenant.id,
            email="inventory@test.com",
            password_hash=get_password_hash("inventory123"),
            first_name="Inventory",
            last_name="Manager",
            role=UserRole.ADMIN,
            status=UserStatus.ACTIVE
        )
        db_session.add(user)
        db_session.commit()
        
        # Create product categories
        categories = []
        category_data = [
            {"name": "Electronics", "description": "Electronic devices and accessories"},
            {"name": "Jewelry", "description": "Gold and silver jewelry items"},
            {"name": "Clothing", "description": "Apparel and fashion items"},
            {"name": "Home & Garden", "description": "Home improvement and garden supplies"},
            {"name": "Books", "description": "Books and educational materials"}
        ]
        
        for cat_data in category_data:
            category = ProductCategory(
                tenant_id=tenant.id,
                name=cat_data["name"],
                description=cat_data["description"],
                is_active=True
            )
            categories.append(category)
        
        db_session.add_all(categories)
        db_session.commit()
        
        return {
            'tenant': tenant,
            'user': user,
            'categories': categories
        }
    
    @pytest.fixture
    def auth_headers(self, client, setup_inventory_test_data):
        """Get authentication headers"""
        data = setup_inventory_test_data
        
        login_data = {
            "email": data['user'].email,
            "password": "inventory123"
        }
        
        response = client.post("/api/auth/login", json=login_data)
        assert response.status_code == 200
        
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}

    # ==================== PRODUCT CATEGORY TESTS ====================
    
    def test_create_product_category(self, client, auth_headers):
        """Test creating a new product category"""
        category_data = {
            "name": "API Test Category",
            "description": "Category created via API testing",
            "is_active": True
        }
        
        response = client.post(
            "/api/products/categories",
            json=category_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        assert result["name"] == "API Test Category"
        assert result["description"] == "Category created via API testing"
        assert result["is_active"] is True
        assert "id" in result
        assert "created_at" in result
    
    def test_list_product_categories(self, client, auth_headers, setup_inventory_test_data):
        """Test listing all product categories"""
        response = client.get(
            "/api/products/categories",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        assert len(result) >= 5  # At least the 5 we created in setup
        
        # Check category structure
        for category in result:
            assert "id" in category
            assert "name" in category
            assert "description" in category
            assert "is_active" in category
            assert "product_count" in category
        
        # Verify our test categories are present
        category_names = [cat["name"] for cat in result]
        assert "Electronics" in category_names
        assert "Jewelry" in category_names
    
    def test_get_category_by_id(self, client, auth_headers, setup_inventory_test_data):
        """Test getting category by ID"""
        data = setup_inventory_test_data
        category = data['categories'][0]  # Electronics category
        
        response = client.get(
            f"/api/products/categories/{category.id}",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        assert result["id"] == str(category.id)
        assert result["name"] == "Electronics"
        assert result["description"] == "Electronic devices and accessories"
    
    def test_update_product_category(self, client, auth_headers, setup_inventory_test_data):
        """Test updating a product category"""
        data = setup_inventory_test_data
        category = data['categories'][0]
        
        update_data = {
            "name": "Updated Electronics",
            "description": "Updated description for electronics category",
            "is_active": True
        }
        
        response = client.put(
            f"/api/products/categories/{category.id}",
            json=update_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        assert result["name"] == "Updated Electronics"
        assert result["description"] == "Updated description for electronics category"
        assert result["id"] == str(category.id)
    
    def test_delete_product_category(self, client, auth_headers):
        """Test deleting a product category"""
        # First create a category to delete
        category_data = {
            "name": "Category to Delete",
            "description": "This category will be deleted"
        }
        
        create_response = client.post(
            "/api/products/categories",
            json=category_data,
            headers=auth_headers
        )
        assert create_response.status_code == 200
        created_category = create_response.json()
        
        # Delete the category
        response = client.delete(
            f"/api/products/categories/{created_category['id']}",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        assert result["message"] == "Category deleted successfully"
        
        # Verify category is deleted
        get_response = client.get(
            f"/api/products/categories/{created_category['id']}",
            headers=auth_headers
        )
        assert get_response.status_code == 404

    # ==================== PRODUCT CRUD TESTS ====================
    
    def test_create_general_product(self, client, auth_headers, setup_inventory_test_data):
        """Test creating a general product"""
        data = setup_inventory_test_data
        category = data['categories'][0]  # Electronics
        
        product_data = {
            "category_id": str(category.id),
            "name": "API Test Laptop",
            "description": "High-performance laptop for testing",
            "sku": "LAPTOP001",
            "barcode": "1234567890123",
            "selling_price": "1299.99",
            "cost_price": "899.99",
            "stock_quantity": 25,
            "min_stock_level": 5,
            "max_stock_level": 100,
            "unit_of_measure": "piece",
            "brand": "TestBrand",
            "manufacturer": "TestManufacturer",
            "model": "TB-2024",
            "weight": "2.5",
            "dimensions": "35x25x2 cm",
            "color": "Silver",
            "warranty_period": 24,
            "is_active": True,
            "is_taxable": True,
            "tax_rate": "18.0"
        }
        
        response = client.post(
            "/api/products/",
            json=product_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        assert result["name"] == "API Test Laptop"
        assert result["sku"] == "LAPTOP001"
        assert Decimal(result["selling_price"]) == Decimal("1299.99")
        assert result["stock_quantity"] == 25
        assert result["category_id"] == str(category.id)
        assert result["is_gold_product"] is False
        assert "id" in result
    
    def test_create_gold_product(self, client, auth_headers, setup_inventory_test_data):
        """Test creating a gold product"""
        data = setup_inventory_test_data
        jewelry_category = next(cat for cat in data['categories'] if cat.name == "Jewelry")
        
        product_data = {
            "category_id": str(jewelry_category.id),
            "name": "API Gold Ring",
            "description": "18K gold ring with diamond",
            "sku": "GOLD_RING001",
            "selling_price": "8500000.00",
            "cost_price": "6800000.00",
            "stock_quantity": 5,
            "min_stock_level": 1,
            "max_stock_level": 20,
            "is_gold_product": True,
            "gold_purity": "18.000",
            "weight_per_unit": "12.500",
            "labor_cost": "500000.00",
            "stone_details": "1 carat diamond",
            "is_active": True
        }
        
        response = client.post(
            "/api/products/",
            json=product_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        assert result["name"] == "API Gold Ring"
        assert result["is_gold_product"] is True
        assert Decimal(result["gold_purity"]) == Decimal("18.000")
        assert Decimal(result["weight_per_unit"]) == Decimal("12.500")
        assert Decimal(result["labor_cost"]) == Decimal("500000.00")
        assert result["stone_details"] == "1 carat diamond"
    
    def test_create_service_product(self, client, auth_headers, setup_inventory_test_data):
        """Test creating a service product"""
        data = setup_inventory_test_data
        category = data['categories'][0]
        
        product_data = {
            "category_id": str(category.id),
            "name": "Laptop Repair Service",
            "description": "Professional laptop repair and maintenance",
            "sku": "SERVICE001",
            "selling_price": "150.00",
            "cost_price": "50.00",
            "is_service": True,
            "service_duration": 120,  # 2 hours
            "is_active": True
        }
        
        response = client.post(
            "/api/products/",
            json=product_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        assert result["name"] == "Laptop Repair Service"
        assert result["is_service"] is True
        assert result["service_duration"] == 120
        assert result["stock_quantity"] is None  # Services don't have stock
    
    def test_list_products_with_pagination(self, client, auth_headers, setup_inventory_test_data):
        """Test listing products with pagination"""
        data = setup_inventory_test_data
        category = data['categories'][0]
        
        # Create multiple products for pagination testing
        for i in range(15):
            product_data = {
                "category_id": str(category.id),
                "name": f"Test Product {i+1}",
                "sku": f"TEST{i+1:03d}",
                "selling_price": f"{100 + i*10}.00",
                "cost_price": f"{50 + i*5}.00",
                "stock_quantity": 10 + i
            }
            
            response = client.post(
                "/api/products/",
                json=product_data,
                headers=auth_headers
            )
            assert response.status_code == 200
        
        # Test pagination
        response = client.get(
            "/api/products/?page=1&page_size=10",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        assert result["total"] >= 15
        assert len(result["products"]) <= 10
        assert result["page"] == 1
        assert result["page_size"] == 10
        assert result["total_pages"] >= 2
    
    def test_search_products(self, client, auth_headers, setup_inventory_test_data):
        """Test product search functionality"""
        data = setup_inventory_test_data
        category = data['categories'][0]
        
        # Create products with searchable names
        products_to_create = [
            {"name": "Samsung Galaxy Phone", "sku": "SAMSUNG001"},
            {"name": "iPhone 15 Pro", "sku": "IPHONE001"},
            {"name": "Samsung Tablet", "sku": "SAMSUNG002"},
            {"name": "MacBook Pro", "sku": "APPLE001"}
        ]
        
        for prod_data in products_to_create:
            product_data = {
                "category_id": str(category.id),
                "name": prod_data["name"],
                "sku": prod_data["sku"],
                "selling_price": "999.99",
                "cost_price": "699.99",
                "stock_quantity": 10
            }
            
            response = client.post(
                "/api/products/",
                json=product_data,
                headers=auth_headers
            )
            assert response.status_code == 200
        
        # Search by name
        response = client.get(
            "/api/products/?query=Samsung",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        assert result["total"] >= 2  # Should find Samsung products
        for product in result["products"]:
            assert "Samsung" in product["name"]
        
        # Search by SKU
        response = client.get(
            "/api/products/?query=IPHONE001",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        assert result["total"] >= 1
        assert any(product["sku"] == "IPHONE001" for product in result["products"])
    
    def test_filter_products(self, client, auth_headers, setup_inventory_test_data):
        """Test product filtering"""
        data = setup_inventory_test_data
        electronics_category = data['categories'][0]
        jewelry_category = next(cat for cat in data['categories'] if cat.name == "Jewelry")
        
        # Create products in different categories
        electronics_product = {
            "category_id": str(electronics_category.id),
            "name": "Filter Test Electronics",
            "sku": "FILTER_ELEC001",
            "selling_price": "500.00",
            "stock_quantity": 20
        }
        
        jewelry_product = {
            "category_id": str(jewelry_category.id),
            "name": "Filter Test Jewelry",
            "sku": "FILTER_JEWEL001",
            "selling_price": "2000000.00",
            "stock_quantity": 5,
            "is_gold_product": True,
            "gold_purity": "22.000",
            "weight_per_unit": "10.000"
        }
        
        client.post("/api/products/", json=electronics_product, headers=auth_headers)
        client.post("/api/products/", json=jewelry_product, headers=auth_headers)
        
        # Filter by category
        response = client.get(
            f"/api/products/?category_id={electronics_category.id}",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        for product in result["products"]:
            assert product["category_id"] == str(electronics_category.id)
        
        # Filter by gold products
        response = client.get(
            "/api/products/?is_gold_product=true",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        for product in result["products"]:
            assert product["is_gold_product"] is True
        
        # Filter by price range
        response = client.get(
            "/api/products/?min_price=100&max_price=1000",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        for product in result["products"]:
            price = Decimal(product["selling_price"])
            assert Decimal("100") <= price <= Decimal("1000")
    
    def test_get_product_by_id(self, client, auth_headers, setup_inventory_test_data):
        """Test getting product by ID"""
        data = setup_inventory_test_data
        category = data['categories'][0]
        
        # Create a product
        product_data = {
            "category_id": str(category.id),
            "name": "Get By ID Test Product",
            "sku": "GETBYID001",
            "selling_price": "299.99",
            "cost_price": "199.99",
            "stock_quantity": 15
        }
        
        create_response = client.post(
            "/api/products/",
            json=product_data,
            headers=auth_headers
        )
        assert create_response.status_code == 200
        created_product = create_response.json()
        
        # Get product by ID
        response = client.get(
            f"/api/products/{created_product['id']}",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        assert result["id"] == created_product["id"]
        assert result["name"] == "Get By ID Test Product"
        assert result["sku"] == "GETBYID001"
    
    def test_update_product(self, client, auth_headers, setup_inventory_test_data):
        """Test updating a product"""
        data = setup_inventory_test_data
        category = data['categories'][0]
        
        # Create a product
        product_data = {
            "category_id": str(category.id),
            "name": "Original Product Name",
            "sku": "UPDATE001",
            "selling_price": "199.99",
            "stock_quantity": 10
        }
        
        create_response = client.post(
            "/api/products/",
            json=product_data,
            headers=auth_headers
        )
        assert create_response.status_code == 200
        created_product = create_response.json()
        
        # Update the product
        update_data = {
            "name": "Updated Product Name",
            "selling_price": "249.99",
            "description": "Updated product description",
            "stock_quantity": 15
        }
        
        response = client.put(
            f"/api/products/{created_product['id']}",
            json=update_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        assert result["name"] == "Updated Product Name"
        assert Decimal(result["selling_price"]) == Decimal("249.99")
        assert result["description"] == "Updated product description"
        assert result["stock_quantity"] == 15
        assert result["sku"] == "UPDATE001"  # Should remain unchanged
    
    def test_delete_product(self, client, auth_headers, setup_inventory_test_data):
        """Test deleting a product"""
        data = setup_inventory_test_data
        category = data['categories'][0]
        
        # Create a product
        product_data = {
            "category_id": str(category.id),
            "name": "Product to Delete",
            "sku": "DELETE001",
            "selling_price": "99.99",
            "stock_quantity": 5
        }
        
        create_response = client.post(
            "/api/products/",
            json=product_data,
            headers=auth_headers
        )
        assert create_response.status_code == 200
        created_product = create_response.json()
        
        # Delete the product
        response = client.delete(
            f"/api/products/{created_product['id']}",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        assert result["message"] == "Product deleted successfully"
        
        # Verify product is deleted
        get_response = client.get(
            f"/api/products/{created_product['id']}",
            headers=auth_headers
        )
        assert get_response.status_code == 404

    # ==================== STOCK MANAGEMENT TESTS ====================
    
    def test_stock_adjustment_increase(self, client, auth_headers, setup_inventory_test_data):
        """Test increasing stock quantity"""
        data = setup_inventory_test_data
        category = data['categories'][0]
        
        # Create a product
        product_data = {
            "category_id": str(category.id),
            "name": "Stock Test Product",
            "sku": "STOCK001",
            "selling_price": "150.00",
            "stock_quantity": 20
        }
        
        create_response = client.post(
            "/api/products/",
            json=product_data,
            headers=auth_headers
        )
        assert create_response.status_code == 200
        created_product = create_response.json()
        
        # Increase stock
        adjustment_data = {
            "quantity": 15,
            "adjustment_type": "increase",
            "reason": "Stock replenishment",
            "reference_number": "PO-2024-001"
        }
        
        response = client.post(
            f"/api/products/{created_product['id']}/stock/adjust",
            json=adjustment_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        assert result["stock_quantity"] == 35  # 20 + 15
        assert result["id"] == created_product["id"]
    
    def test_stock_adjustment_decrease(self, client, auth_headers, setup_inventory_test_data):
        """Test decreasing stock quantity"""
        data = setup_inventory_test_data
        category = data['categories'][0]
        
        # Create a product
        product_data = {
            "category_id": str(category.id),
            "name": "Stock Decrease Test",
            "sku": "STOCK002",
            "selling_price": "200.00",
            "stock_quantity": 50
        }
        
        create_response = client.post(
            "/api/products/",
            json=product_data,
            headers=auth_headers
        )
        assert create_response.status_code == 200
        created_product = create_response.json()
        
        # Decrease stock
        adjustment_data = {
            "quantity": 10,
            "adjustment_type": "decrease",
            "reason": "Damaged goods",
            "reference_number": "ADJ-2024-001"
        }
        
        response = client.post(
            f"/api/products/{created_product['id']}/stock/adjust",
            json=adjustment_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        assert result["stock_quantity"] == 40  # 50 - 10
    
    def test_stock_reservation(self, client, auth_headers, setup_inventory_test_data):
        """Test stock reservation functionality"""
        data = setup_inventory_test_data
        category = data['categories'][0]
        
        # Create a product
        product_data = {
            "category_id": str(category.id),
            "name": "Reservation Test Product",
            "sku": "RESERVE001",
            "selling_price": "300.00",
            "stock_quantity": 30
        }
        
        create_response = client.post(
            "/api/products/",
            json=product_data,
            headers=auth_headers
        )
        assert create_response.status_code == 200
        created_product = create_response.json()
        
        # Reserve stock
        reservation_data = {
            "quantity": 5,
            "reason": "Customer order",
            "reference_number": "ORDER-2024-001",
            "expires_at": (datetime.utcnow() + timedelta(hours=24)).isoformat()
        }
        
        response = client.post(
            f"/api/products/{created_product['id']}/stock/reserve",
            json=reservation_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        assert result["stock_quantity"] == 30  # Physical stock unchanged
        assert result["reserved_quantity"] == 5
        assert result["available_quantity"] == 25  # 30 - 5
    
    def test_stock_fulfillment(self, client, auth_headers, setup_inventory_test_data):
        """Test stock fulfillment (reducing both reserved and available stock)"""
        data = setup_inventory_test_data
        category = data['categories'][0]
        
        # Create a product
        product_data = {
            "category_id": str(category.id),
            "name": "Fulfillment Test Product",
            "sku": "FULFILL001",
            "selling_price": "400.00",
            "stock_quantity": 40
        }
        
        create_response = client.post(
            "/api/products/",
            json=product_data,
            headers=auth_headers
        )
        assert create_response.status_code == 200
        created_product = create_response.json()
        
        # First reserve some stock
        reservation_data = {
            "quantity": 8,
            "reason": "Customer order",
            "reference_number": "ORDER-2024-002"
        }
        
        reserve_response = client.post(
            f"/api/products/{created_product['id']}/stock/reserve",
            json=reservation_data,
            headers=auth_headers
        )
        assert reserve_response.status_code == 200
        
        # Fulfill the reserved stock
        response = client.post(
            f"/api/products/{created_product['id']}/stock/fulfill?quantity=8",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        assert result["stock_quantity"] == 32  # 40 - 8
        assert result["reserved_quantity"] == 0  # Reservation fulfilled
        assert result["available_quantity"] == 32
    
    def test_stock_release(self, client, auth_headers, setup_inventory_test_data):
        """Test releasing reserved stock"""
        data = setup_inventory_test_data
        category = data['categories'][0]
        
        # Create a product
        product_data = {
            "category_id": str(category.id),
            "name": "Release Test Product",
            "sku": "RELEASE001",
            "selling_price": "250.00",
            "stock_quantity": 25
        }
        
        create_response = client.post(
            "/api/products/",
            json=product_data,
            headers=auth_headers
        )
        assert create_response.status_code == 200
        created_product = create_response.json()
        
        # Reserve stock
        reservation_data = {
            "quantity": 6,
            "reason": "Customer order",
            "reference_number": "ORDER-2024-003"
        }
        
        reserve_response = client.post(
            f"/api/products/{created_product['id']}/stock/reserve",
            json=reservation_data,
            headers=auth_headers
        )
        assert reserve_response.status_code == 200
        
        # Release the reserved stock
        response = client.post(
            f"/api/products/{created_product['id']}/stock/release?quantity=6",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        assert result["stock_quantity"] == 25  # Physical stock unchanged
        assert result["reserved_quantity"] == 0  # Reservation released
        assert result["available_quantity"] == 25  # Back to full availability

    # ==================== INVENTORY ANALYTICS TESTS ====================
    
    def test_product_statistics(self, client, auth_headers, setup_inventory_test_data):
        """Test product statistics"""
        data = setup_inventory_test_data
        category = data['categories'][0]
        
        # Create various products for statistics
        products_data = [
            {"name": "Active Product 1", "stock_quantity": 50, "is_active": True},
            {"name": "Active Product 2", "stock_quantity": 0, "is_active": True},  # Out of stock
            {"name": "Inactive Product", "stock_quantity": 20, "is_active": False},
            {"name": "Low Stock Product", "stock_quantity": 2, "min_stock_level": 10, "is_active": True}
        ]
        
        for prod_data in products_data:
            product_data = {
                "category_id": str(category.id),
                "name": prod_data["name"],
                "sku": f"STAT{len(products_data)}",
                "selling_price": "100.00",
                "stock_quantity": prod_data["stock_quantity"],
                "min_stock_level": prod_data.get("min_stock_level", 5),
                "is_active": prod_data["is_active"]
            }
            
            response = client.post(
                "/api/products/",
                json=product_data,
                headers=auth_headers
            )
            assert response.status_code == 200
        
        # Get product statistics
        response = client.get(
            "/api/products/analytics/stats",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        assert "total_products" in result
        assert "active_products" in result
        assert "inactive_products" in result
        assert "out_of_stock_products" in result
        assert "low_stock_products" in result
        assert "total_stock_value" in result
        
        assert result["total_products"] >= 4
        assert result["active_products"] >= 3
        assert result["inactive_products"] >= 1
        assert result["out_of_stock_products"] >= 1
        assert result["low_stock_products"] >= 1
    
    def test_low_stock_alerts(self, client, auth_headers, setup_inventory_test_data):
        """Test low stock alerts"""
        data = setup_inventory_test_data
        category = data['categories'][0]
        
        # Create products with low stock
        low_stock_products = [
            {"name": "Low Stock Item 1", "stock_quantity": 3, "min_stock_level": 10},
            {"name": "Low Stock Item 2", "stock_quantity": 1, "min_stock_level": 5},
            {"name": "Normal Stock Item", "stock_quantity": 50, "min_stock_level": 10}
        ]
        
        for prod_data in low_stock_products:
            product_data = {
                "category_id": str(category.id),
                "name": prod_data["name"],
                "sku": f"LOW{len(low_stock_products)}",
                "selling_price": "75.00",
                "stock_quantity": prod_data["stock_quantity"],
                "min_stock_level": prod_data["min_stock_level"]
            }
            
            response = client.post(
                "/api/products/",
                json=product_data,
                headers=auth_headers
            )
            assert response.status_code == 200
        
        # Get low stock alerts
        response = client.get(
            "/api/products/analytics/low-stock",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        assert len(result) >= 2  # Should find at least 2 low stock items
        
        for alert in result:
            assert "product_id" in alert
            assert "product_name" in alert
            assert "current_stock" in alert
            assert "min_stock_level" in alert
            assert "shortage_quantity" in alert
            assert alert["current_stock"] < alert["min_stock_level"]

    # ==================== BULK OPERATIONS TESTS ====================
    
    def test_bulk_update_products(self, client, auth_headers, setup_inventory_test_data):
        """Test bulk updating multiple products"""
        data = setup_inventory_test_data
        category = data['categories'][0]
        
        # Create multiple products
        product_ids = []
        for i in range(5):
            product_data = {
                "category_id": str(category.id),
                "name": f"Bulk Update Product {i+1}",
                "sku": f"BULK{i+1:03d}",
                "selling_price": "100.00",
                "stock_quantity": 10
            }
            
            response = client.post(
                "/api/products/",
                json=product_data,
                headers=auth_headers
            )
            assert response.status_code == 200
            product_ids.append(response.json()["id"])
        
        # Bulk update
        bulk_update_data = {
            "product_ids": product_ids,
            "updates": {
                "selling_price": "120.00",
                "is_taxable": True,
                "tax_rate": "18.0"
            }
        }
        
        response = client.post(
            "/api/products/bulk/update",
            json=bulk_update_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        assert result["message"].startswith("Updated")
        assert len(result["updated_products"]) == 5
        assert len(result["failed_updates"]) == 0
        
        # Verify updates
        for updated_product in result["updated_products"]:
            assert Decimal(updated_product["selling_price"]) == Decimal("120.00")
            assert updated_product["is_taxable"] is True
    
    def test_bulk_delete_products(self, client, auth_headers, setup_inventory_test_data):
        """Test bulk deleting multiple products"""
        data = setup_inventory_test_data
        category = data['categories'][0]
        
        # Create multiple products
        product_ids = []
        for i in range(3):
            product_data = {
                "category_id": str(category.id),
                "name": f"Bulk Delete Product {i+1}",
                "sku": f"BULKDEL{i+1:03d}",
                "selling_price": "50.00",
                "stock_quantity": 5
            }
            
            response = client.post(
                "/api/products/",
                json=product_data,
                headers=auth_headers
            )
            assert response.status_code == 200
            product_ids.append(response.json()["id"])
        
        # Bulk delete
        bulk_delete_data = {
            "product_ids": product_ids
        }
        
        response = client.post(
            "/api/products/bulk/delete",
            json=bulk_delete_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        assert result["message"].startswith("Deleted")
        assert len(result["deleted_products"]) == 3
        assert len(result["failed_deletes"]) == 0
        
        # Verify deletions
        for product_id in product_ids:
            get_response = client.get(
                f"/api/products/{product_id}",
                headers=auth_headers
            )
            assert get_response.status_code == 404

    # ==================== VALIDATION AND ERROR HANDLING TESTS ====================
    
    def test_product_validation_errors(self, client, auth_headers, setup_inventory_test_data):
        """Test product validation errors"""
        data = setup_inventory_test_data
        category = data['categories'][0]
        
        # Test duplicate SKU
        product_data = {
            "category_id": str(category.id),
            "name": "First Product",
            "sku": "DUPLICATE_SKU",
            "selling_price": "100.00",
            "stock_quantity": 10
        }
        
        # Create first product
        response1 = client.post(
            "/api/products/",
            json=product_data,
            headers=auth_headers
        )
        assert response1.status_code == 200
        
        # Try to create duplicate SKU
        duplicate_data = {
            "category_id": str(category.id),
            "name": "Second Product",
            "sku": "DUPLICATE_SKU",  # Same SKU
            "selling_price": "200.00",
            "stock_quantity": 5
        }
        
        response2 = client.post(
            "/api/products/",
            json=duplicate_data,
            headers=auth_headers
        )
        assert response2.status_code == 400
        assert "already exists" in response2.json()["detail"].lower()
        
        # Test invalid price
        invalid_price_data = {
            "category_id": str(category.id),
            "name": "Invalid Price Product",
            "sku": "INVALID_PRICE",
            "selling_price": "-50.00",  # Negative price
            "stock_quantity": 10
        }
        
        response3 = client.post(
            "/api/products/",
            json=invalid_price_data,
            headers=auth_headers
        )
        assert response3.status_code == 400
        
        # Test invalid stock quantity
        invalid_stock_data = {
            "category_id": str(category.id),
            "name": "Invalid Stock Product",
            "sku": "INVALID_STOCK",
            "selling_price": "100.00",
            "stock_quantity": -5  # Negative stock
        }
        
        response4 = client.post(
            "/api/products/",
            json=invalid_stock_data,
            headers=auth_headers
        )
        assert response4.status_code == 400
    
    def test_stock_adjustment_validation(self, client, auth_headers, setup_inventory_test_data):
        """Test stock adjustment validation"""
        data = setup_inventory_test_data
        category = data['categories'][0]
        
        # Create a product
        product_data = {
            "category_id": str(category.id),
            "name": "Stock Validation Test",
            "sku": "STOCKVAL001",
            "selling_price": "100.00",
            "stock_quantity": 10
        }
        
        create_response = client.post(
            "/api/products/",
            json=product_data,
            headers=auth_headers
        )
        assert create_response.status_code == 200
        created_product = create_response.json()
        
        # Test invalid adjustment type
        invalid_adjustment = {
            "quantity": 5,
            "adjustment_type": "invalid_type",
            "reason": "Test"
        }
        
        response = client.post(
            f"/api/products/{created_product['id']}/stock/adjust",
            json=invalid_adjustment,
            headers=auth_headers
        )
        assert response.status_code == 400
        
        # Test negative quantity
        negative_adjustment = {
            "quantity": -5,
            "adjustment_type": "increase",
            "reason": "Test"
        }
        
        response2 = client.post(
            f"/api/products/{created_product['id']}/stock/adjust",
            json=negative_adjustment,
            headers=auth_headers
        )
        assert response2.status_code == 400
        
        # Test decreasing more stock than available
        excessive_decrease = {
            "quantity": 50,  # More than the 10 in stock
            "adjustment_type": "decrease",
            "reason": "Test"
        }
        
        response3 = client.post(
            f"/api/products/{created_product['id']}/stock/adjust",
            json=excessive_decrease,
            headers=auth_headers
        )
        assert response3.status_code == 400
    
    def test_nonexistent_resources(self, client, auth_headers):
        """Test accessing non-existent resources"""
        non_existent_id = str(uuid.uuid4())
        
        # Non-existent product
        response = client.get(
            f"/api/products/{non_existent_id}",
            headers=auth_headers
        )
        assert response.status_code == 404
        
        # Non-existent category
        response = client.get(
            f"/api/products/categories/{non_existent_id}",
            headers=auth_headers
        )
        assert response.status_code == 404
        
        # Stock adjustment on non-existent product
        adjustment_data = {
            "quantity": 5,
            "adjustment_type": "increase",
            "reason": "Test"
        }
        
        response = client.post(
            f"/api/products/{non_existent_id}/stock/adjust",
            json=adjustment_data,
            headers=auth_headers
        )
        assert response.status_code == 404

    # ==================== PERFORMANCE TESTS ====================
    
    def test_product_list_performance(self, client, auth_headers, setup_inventory_test_data):
        """Test product listing performance with large datasets"""
        import time
        
        # Test with pagination
        start_time = time.time()
        response = client.get(
            "/api/products/?page=1&page_size=50",
            headers=auth_headers
        )
        end_time = time.time()
        
        assert response.status_code == 200
        assert (end_time - start_time) < 5.0  # Should complete within 5 seconds
        
        # Test with search
        start_time = time.time()
        response = client.get(
            "/api/products/?query=test&page=1&page_size=20",
            headers=auth_headers
        )
        end_time = time.time()
        
        assert response.status_code == 200
        assert (end_time - start_time) < 3.0  # Search should be fast