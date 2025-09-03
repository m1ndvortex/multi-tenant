"""
Comprehensive tests for product management system with real database scenarios
Following Docker-first testing standards with real PostgreSQL database
"""

import pytest
import uuid
from decimal import Decimal
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.tenant import Tenant, SubscriptionType, TenantStatus
from app.models.user import User, UserRole, UserStatus
from app.models.product import Product, ProductCategory, ProductStatus, StockStatus
from app.schemas.product import (
    ProductCreate, ProductUpdate, ProductSearchRequest,
    ProductCategoryCreate, ProductCategoryUpdate,
    StockAdjustmentRequest, StockReservationRequest
)
from app.services.product_service import ProductService
from app.core.auth import create_access_token


class TestProductCRUDOperations:
    """Test product CRUD operations with real database"""
    
    @pytest.fixture
    def test_tenant(self, db_session: Session):
        """Create a test tenant"""
        tenant = Tenant(
            id=uuid.uuid4(),
            name="Test Gold Shop",
            email="test@goldshop.com",
            phone="+1234567890",
            subscription_type=SubscriptionType.PRO,
            status=TenantStatus.ACTIVE
        )
        db_session.add(tenant)
        db_session.commit()
        db_session.refresh(tenant)
        return tenant
    
    @pytest.fixture
    def test_user(self, db_session: Session, test_tenant):
        """Create a test user"""
        user = User(
            id=uuid.uuid4(),
            tenant_id=test_tenant.id,
            email="user@goldshop.com",
            first_name="Test",
            last_name="User",
            password_hash="hashed_password",
            role=UserRole.ADMIN,
            status=UserStatus.ACTIVE
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
        return user
    
    @pytest.fixture
    def auth_headers(self, test_user, test_tenant):
        """Create authentication headers"""
        token = create_access_token(data={"user_id": str(test_user.id), "tenant_id": str(test_tenant.id)})
        return {"Authorization": f"Bearer {token}"}
    
    @pytest.fixture
    def test_category(self, db_session: Session, test_tenant):
        """Create a test product category"""
        category = ProductCategory(
            id=uuid.uuid4(),
            tenant_id=test_tenant.id,
            name="Gold Jewelry",
            description="Gold jewelry products",
            sort_order=1,
            is_active=True
        )
        db_session.add(category)
        db_session.commit()
        db_session.refresh(category)
        return category
    
    def test_create_product_success(self, client: TestClient, auth_headers, test_category):
        """Test successful product creation"""
        product_data = {
            "name": "Gold Ring 18K",
            "description": "Beautiful 18K gold ring",
            "sku": "GR18K001",
            "barcode": "1234567890123",
            "category_id": str(test_category.id),
            "tags": ["gold", "jewelry", "ring"],
            "cost_price": "150.00",
            "selling_price": "200.00",
            "min_price": "180.00",
            "max_price": "250.00",
            "is_gold_product": True,
            "gold_purity": "18.000",
            "weight_per_unit": "5.5",
            "track_inventory": True,
            "stock_quantity": 10,
            "min_stock_level": 2,
            "status": "ACTIVE",
            "manufacturer": "Gold Craft Inc",
            "brand": "Premium Gold",
            "model": "Classic Ring"
        }
        
        response = client.post("/api/products/", json=product_data, headers=auth_headers)
        
        if response.status_code != 200:
            print(f"Response status: {response.status_code}")
            print(f"Response body: {response.json()}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == product_data["name"]
        assert data["sku"] == product_data["sku"]
        assert data["is_gold_product"] == True
        assert float(data["gold_purity"]) == 18.0
        assert data["stock_quantity"] == 10
        assert data["available_quantity"] == 10  # stock - reserved
        assert data["stock_status"] == "in_stock"
    
    def test_create_product_duplicate_sku(self, client: TestClient, auth_headers, test_category):
        """Test product creation with duplicate SKU fails"""
        # Create first product
        product_data = {
            "name": "Gold Ring 1",
            "sku": "DUPLICATE_SKU",
            "selling_price": "200.00",
            "category_id": str(test_category.id)
        }
        
        response1 = client.post("/api/products/", json=product_data, headers=auth_headers)
        assert response1.status_code == 200
        
        # Try to create second product with same SKU
        product_data["name"] = "Gold Ring 2"
        response2 = client.post("/api/products/", json=product_data, headers=auth_headers)
        
        assert response2.status_code == 400
        response_data = response2.json()
        # The error message is nested in detail.message
        error_message = response_data.get("detail", {}).get("message", "")
        assert "already exists" in error_message
    
    def test_create_gold_product_validation(self, client: TestClient, auth_headers, test_category):
        """Test gold product validation requirements"""
        # Missing gold_purity
        product_data = {
            "name": "Gold Ring",
            "selling_price": "200.00",
            "is_gold_product": True,
            "weight_per_unit": "5.5"
        }
        
        response = client.post("/api/products/", json=product_data, headers=auth_headers)
        assert response.status_code == 422
        
        # Missing weight_per_unit
        product_data = {
            "name": "Gold Ring",
            "selling_price": "200.00",
            "is_gold_product": True,
            "gold_purity": "18.000"
        }
        
        response = client.post("/api/products/", json=product_data, headers=auth_headers)
        assert response.status_code == 422
    
    def test_get_product_success(self, client: TestClient, auth_headers, test_category):
        """Test successful product retrieval"""
        # Create product first
        product_data = {
            "name": "Test Product",
            "selling_price": "100.00",
            "category_id": str(test_category.id)
        }
        
        create_response = client.post("/api/products/", json=product_data, headers=auth_headers)
        product_id = create_response.json()["id"]
        
        # Get product
        response = client.get(f"/api/products/{product_id}", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == product_id
        assert data["name"] == product_data["name"]
    
    def test_get_nonexistent_product(self, client: TestClient, auth_headers):
        """Test getting non-existent product returns 404"""
        fake_id = str(uuid.uuid4())
        response = client.get(f"/api/products/{fake_id}", headers=auth_headers)
        
        assert response.status_code == 404
    
    def test_update_product_success(self, client: TestClient, auth_headers, test_category):
        """Test successful product update"""
        # Create product first
        product_data = {
            "name": "Original Product",
            "selling_price": "100.00",
            "stock_quantity": 5
        }
        
        create_response = client.post("/api/products/", json=product_data, headers=auth_headers)
        product_id = create_response.json()["id"]
        
        # Update product
        update_data = {
            "name": "Updated Product",
            "selling_price": "150.00",
            "description": "Updated description"
        }
        
        response = client.put(f"/api/products/{product_id}", json=update_data, headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == update_data["name"]
        assert float(data["selling_price"]) == 150.0
        assert data["description"] == update_data["description"]
        assert data["stock_quantity"] == 5  # Unchanged
    
    def test_delete_product_success(self, client: TestClient, auth_headers):
        """Test successful product deletion (soft delete)"""
        # Create product first
        product_data = {
            "name": "Product to Delete",
            "selling_price": "100.00"
        }
        
        create_response = client.post("/api/products/", json=product_data, headers=auth_headers)
        product_id = create_response.json()["id"]
        
        # Delete product
        response = client.delete(f"/api/products/{product_id}", headers=auth_headers)
        
        assert response.status_code == 200
        assert "deleted successfully" in response.json()["message"]
        
        # Verify product is not accessible
        get_response = client.get(f"/api/products/{product_id}", headers=auth_headers)
        assert get_response.status_code == 404


class TestProductSearch:
    """Test product search and filtering with realistic data"""
    
    @pytest.fixture
    def test_tenant(self, db_session: Session):
        """Create a test tenant"""
        tenant = Tenant(
            id=uuid.uuid4(),
            name="Test Gold Shop",
            email="test@goldshop.com",
            phone="+1234567890",
            subscription_type=SubscriptionType.PRO,
            status=TenantStatus.ACTIVE
        )
        db_session.add(tenant)
        db_session.commit()
        db_session.refresh(tenant)
        return tenant
    
    @pytest.fixture
    def test_user(self, db_session: Session, test_tenant):
        """Create a test user"""
        user = User(
            id=uuid.uuid4(),
            tenant_id=test_tenant.id,
            email="user@goldshop.com",
            first_name="Test",
            last_name="User",
            password_hash="hashed_password",
            role=UserRole.ADMIN,
            status=UserStatus.ACTIVE
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
        return user
    
    @pytest.fixture
    def auth_headers(self, test_user, test_tenant):
        """Create authentication headers"""
        token = create_access_token(data={"user_id": str(test_user.id), "tenant_id": str(test_tenant.id)})
        return {"Authorization": f"Bearer {token}"}
    
    @pytest.fixture
    def sample_products(self, client: TestClient, auth_headers):
        """Create sample products for testing"""
        products_data = [
            {
                "name": "Gold Ring 18K",
                "sku": "GR18K001",
                "selling_price": "200.00",
                "is_gold_product": True,
                "gold_purity": "18.000",
                "weight_per_unit": "5.5",
                "stock_quantity": 10,
                "manufacturer": "Gold Craft",
                "brand": "Premium",
                "tags": ["gold", "jewelry", "ring"]
            },
            {
                "name": "Silver Necklace",
                "sku": "SN001",
                "selling_price": "50.00",
                "is_gold_product": False,
                "stock_quantity": 5,
                "min_stock_level": 3,
                "manufacturer": "Silver Works",
                "brand": "Classic",
                "tags": ["silver", "jewelry", "necklace"]
            },
            {
                "name": "Gold Bracelet 22K",
                "sku": "GB22K001",
                "selling_price": "300.00",
                "is_gold_product": True,
                "gold_purity": "22.000",
                "weight_per_unit": "8.0",
                "stock_quantity": 0,  # Out of stock
                "manufacturer": "Gold Craft",
                "brand": "Luxury",
                "tags": ["gold", "jewelry", "bracelet"]
            },
            {
                "name": "Jewelry Repair Service",
                "sku": "JRS001",
                "selling_price": "25.00",
                "is_service": True,
                "track_inventory": False,
                "manufacturer": "In-House",
                "tags": ["service", "repair"]
            }
        ]
        
        created_products = []
        for product_data in products_data:
            response = client.post("/api/products/", json=product_data, headers=auth_headers)
            assert response.status_code == 200
            created_products.append(response.json())
        
        return created_products
    
    def test_search_by_name(self, client: TestClient, auth_headers, sample_products):
        """Test searching products by name"""
        response = client.get("/api/products/?query=Gold", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 2  # Gold Ring and Gold Bracelet
        
        product_names = [p["name"] for p in data["products"]]
        assert "Gold Ring 18K" in product_names
        assert "Gold Bracelet 22K" in product_names
    
    def test_search_by_sku(self, client: TestClient, auth_headers, sample_products):
        """Test searching products by SKU"""
        response = client.get("/api/products/?query=GR18K", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert data["products"][0]["sku"] == "GR18K001"
    
    def test_filter_by_gold_products(self, client: TestClient, auth_headers, sample_products):
        """Test filtering by gold products"""
        response = client.get("/api/products/?is_gold_product=true", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 2
        
        for product in data["products"]:
            assert product["is_gold_product"] == True
    
    def test_filter_by_services(self, client: TestClient, auth_headers, sample_products):
        """Test filtering by service products"""
        response = client.get("/api/products/?is_service=true", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert data["products"][0]["name"] == "Jewelry Repair Service"
    
    def test_filter_by_stock_status(self, client: TestClient, auth_headers, sample_products):
        """Test filtering by stock status"""
        # Test out of stock
        response = client.get("/api/products/?stock_status=out_of_stock", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert data["products"][0]["name"] == "Gold Bracelet 22K"
        assert data["products"][0]["stock_status"] == "out_of_stock"
        
        # Test low stock
        response = client.get("/api/products/?stock_status=low_stock", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert data["products"][0]["name"] == "Silver Necklace"
        assert data["products"][0]["stock_status"] == "low_stock"
    
    def test_filter_by_price_range(self, client: TestClient, auth_headers, sample_products):
        """Test filtering by price range"""
        response = client.get("/api/products/?min_price=100&max_price=250", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert data["products"][0]["name"] == "Gold Ring 18K"
    
    def test_filter_by_manufacturer(self, client: TestClient, auth_headers, sample_products):
        """Test filtering by manufacturer"""
        response = client.get("/api/products/?manufacturer=Gold Craft", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 2
        
        for product in data["products"]:
            assert product["manufacturer"] == "Gold Craft"
    
    def test_sorting_and_pagination(self, client: TestClient, auth_headers, sample_products):
        """Test sorting and pagination"""
        # Test sorting by price descending
        response = client.get("/api/products/?sort_by=selling_price&sort_order=desc", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        prices = [float(p["selling_price"]) for p in data["products"]]
        assert prices == sorted(prices, reverse=True)
        
        # Test pagination
        response = client.get("/api/products/?page=1&page_size=2", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert len(data["products"]) == 2
        assert data["page"] == 1
        assert data["page_size"] == 2
        assert data["total"] == 4
        assert data["total_pages"] == 2


class TestStockManagement:
    """Test stock management operations with real database scenarios"""
    
    @pytest.fixture
    def test_tenant(self, db_session: Session):
        """Create a test tenant"""
        tenant = Tenant(
            id=uuid.uuid4(),
            name="Test Gold Shop",
            email="test@goldshop.com",
            phone="+1234567890",
            subscription_type=SubscriptionType.PRO,
            status=TenantStatus.ACTIVE
        )
        db_session.add(tenant)
        db_session.commit()
        db_session.refresh(tenant)
        return tenant
    
    @pytest.fixture
    def test_user(self, db_session: Session, test_tenant):
        """Create a test user"""
        user = User(
            id=uuid.uuid4(),
            tenant_id=test_tenant.id,
            email="user@goldshop.com",
            first_name="Test",
            last_name="User",
            password_hash="hashed_password",
            role=UserRole.ADMIN,
            status=UserStatus.ACTIVE
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
        return user
    
    @pytest.fixture
    def auth_headers(self, test_user, test_tenant):
        """Create authentication headers"""
        token = create_access_token(data={"user_id": str(test_user.id), "tenant_id": str(test_tenant.id)})
        return {"Authorization": f"Bearer {token}"}
    
    @pytest.fixture
    def test_product(self, client: TestClient, auth_headers):
        """Create a test product for stock operations"""
        product_data = {
            "name": "Test Product for Stock",
            "selling_price": "100.00",
            "track_inventory": True,
            "stock_quantity": 20,
            "min_stock_level": 5
        }
        
        response = client.post("/api/products/", json=product_data, headers=auth_headers)
        assert response.status_code == 200
        return response.json()
    
    def test_adjust_stock_increase(self, client: TestClient, auth_headers, test_product):
        """Test increasing stock quantity"""
        product_id = test_product["id"]
        adjustment_data = {
            "quantity": 10,
            "reason": "New stock received"
        }
        
        response = client.post(
            f"/api/products/{product_id}/stock/adjust",
            json=adjustment_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["stock_quantity"] == 30  # 20 + 10
        assert data["available_quantity"] == 30
    
    def test_adjust_stock_decrease(self, client: TestClient, auth_headers, test_product):
        """Test decreasing stock quantity"""
        product_id = test_product["id"]
        adjustment_data = {
            "quantity": -5,
            "reason": "Damaged items removed"
        }
        
        response = client.post(
            f"/api/products/{product_id}/stock/adjust",
            json=adjustment_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["stock_quantity"] == 15  # 20 - 5
        assert data["available_quantity"] == 15
    
    def test_adjust_stock_negative_result(self, client: TestClient, auth_headers, test_product):
        """Test that stock cannot go negative"""
        product_id = test_product["id"]
        adjustment_data = {
            "quantity": -25,  # More than current stock
            "reason": "Invalid adjustment"
        }
        
        response = client.post(
            f"/api/products/{product_id}/stock/adjust",
            json=adjustment_data,
            headers=auth_headers
        )
        
        assert response.status_code == 422
        assert "cannot be negative" in response.json()["message"]
    
    def test_reserve_stock_success(self, client: TestClient, auth_headers, test_product):
        """Test successful stock reservation"""
        product_id = test_product["id"]
        reservation_data = {
            "quantity": 5,
            "reason": "Customer order"
        }
        
        response = client.post(
            f"/api/products/{product_id}/stock/reserve",
            json=reservation_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["reserved_quantity"] == 5
        assert data["available_quantity"] == 15  # 20 - 5
        assert data["stock_status"] == "in_stock"
    
    def test_reserve_insufficient_stock(self, client: TestClient, auth_headers, test_product):
        """Test reserving more stock than available"""
        product_id = test_product["id"]
        reservation_data = {
            "quantity": 25,  # More than available
            "reason": "Large order"
        }
        
        response = client.post(
            f"/api/products/{product_id}/stock/reserve",
            json=reservation_data,
            headers=auth_headers
        )
        
        assert response.status_code == 422
        assert "Insufficient stock" in response.json()["message"]
    
    def test_release_reserved_stock(self, client: TestClient, auth_headers, test_product):
        """Test releasing reserved stock"""
        product_id = test_product["id"]
        
        # First reserve some stock
        reservation_data = {"quantity": 8, "reason": "Test reservation"}
        reserve_response = client.post(
            f"/api/products/{product_id}/stock/reserve",
            json=reservation_data,
            headers=auth_headers
        )
        assert reserve_response.status_code == 200
        
        # Then release some of it
        response = client.post(
            f"/api/products/{product_id}/stock/release?quantity=3",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["reserved_quantity"] == 5  # 8 - 3
        assert data["available_quantity"] == 15  # 20 - 5
    
    def test_fulfill_reserved_stock(self, client: TestClient, auth_headers, test_product):
        """Test fulfilling reserved stock (reduces both reserved and total stock)"""
        product_id = test_product["id"]
        
        # First reserve some stock
        reservation_data = {"quantity": 6, "reason": "Customer order"}
        reserve_response = client.post(
            f"/api/products/{product_id}/stock/reserve",
            json=reservation_data,
            headers=auth_headers
        )
        assert reserve_response.status_code == 200
        
        # Then fulfill part of it
        response = client.post(
            f"/api/products/{product_id}/stock/fulfill?quantity=4",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["reserved_quantity"] == 2  # 6 - 4
        assert data["stock_quantity"] == 16  # 20 - 4
        assert data["available_quantity"] == 14  # 16 - 2
    
    def test_stock_status_calculation(self, client: TestClient, auth_headers):
        """Test stock status calculation for different scenarios"""
        # Create product with low stock
        low_stock_product = {
            "name": "Low Stock Product",
            "selling_price": "50.00",
            "track_inventory": True,
            "stock_quantity": 3,
            "min_stock_level": 5
        }
        
        response = client.post("/api/products/", json=low_stock_product, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["stock_status"] == "low_stock"
        
        # Create product with no stock
        out_of_stock_product = {
            "name": "Out of Stock Product",
            "selling_price": "75.00",
            "track_inventory": True,
            "stock_quantity": 0,
            "min_stock_level": 2
        }
        
        response = client.post("/api/products/", json=out_of_stock_product, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["stock_status"] == "out_of_stock"


class TestProductCategories:
    """Test product category management with real database scenarios"""
    
    @pytest.fixture
    def test_tenant(self, db_session: Session):
        """Create a test tenant"""
        tenant = Tenant(
            id=uuid.uuid4(),
            name="Test Gold Shop",
            email="test@goldshop.com",
            phone="+1234567890",
            subscription_type=SubscriptionType.PRO,
            status=TenantStatus.ACTIVE
        )
        db_session.add(tenant)
        db_session.commit()
        db_session.refresh(tenant)
        return tenant
    
    @pytest.fixture
    def test_user(self, db_session: Session, test_tenant):
        """Create a test user"""
        user = User(
            id=uuid.uuid4(),
            tenant_id=test_tenant.id,
            email="user@goldshop.com",
            first_name="Test",
            last_name="User",
            password_hash="hashed_password",
            role=UserRole.ADMIN,
            status=UserStatus.ACTIVE
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
        return user
    
    @pytest.fixture
    def auth_headers(self, test_user, test_tenant):
        """Create authentication headers"""
        token = create_access_token(data={"user_id": str(test_user.id), "tenant_id": str(test_tenant.id)})
        return {"Authorization": f"Bearer {token}"}
    
    def test_create_category_success(self, client: TestClient, auth_headers):
        """Test successful category creation"""
        category_data = {
            "name": "Gold Jewelry",
            "description": "All gold jewelry products",
            "sort_order": 1
        }
        
        response = client.post("/api/products/categories", json=category_data, headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == category_data["name"]
        assert data["description"] == category_data["description"]
        assert data["sort_order"] == 1
    
    def test_create_duplicate_category_name(self, client: TestClient, auth_headers):
        """Test creating category with duplicate name fails"""
        category_data = {
            "name": "Duplicate Category",
            "description": "First category"
        }
        
        # Create first category
        response1 = client.post("/api/products/categories", json=category_data, headers=auth_headers)
        assert response1.status_code == 200
        
        # Try to create second category with same name
        category_data["description"] = "Second category"
        response2 = client.post("/api/products/categories", json=category_data, headers=auth_headers)
        
        assert response2.status_code == 400
        assert "already exists" in response2.json()["message"]
    
    def test_create_subcategory(self, client: TestClient, auth_headers):
        """Test creating subcategory with parent"""
        # Create parent category
        parent_data = {
            "name": "Jewelry",
            "description": "All jewelry products"
        }
        
        parent_response = client.post("/api/products/categories", json=parent_data, headers=auth_headers)
        assert parent_response.status_code == 200
        parent_id = parent_response.json()["id"]
        
        # Create subcategory
        child_data = {
            "name": "Rings",
            "description": "Ring products",
            "parent_id": parent_id
        }
        
        response = client.post("/api/products/categories", json=child_data, headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == child_data["name"]
        assert data["parent_id"] == parent_id
    
    def test_get_categories(self, client: TestClient, auth_headers):
        """Test getting all categories"""
        # Create multiple categories
        categories_data = [
            {"name": "Category 1", "sort_order": 2},
            {"name": "Category 2", "sort_order": 1},
            {"name": "Category 3", "sort_order": 3}
        ]
        
        for category_data in categories_data:
            response = client.post("/api/products/categories", json=category_data, headers=auth_headers)
            assert response.status_code == 200
        
        # Get all categories
        response = client.get("/api/products/categories", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 3
        
        # Check sorting by sort_order
        sort_orders = [cat["sort_order"] for cat in data]
        assert sort_orders == [1, 2, 3]
    
    def test_update_category(self, client: TestClient, auth_headers):
        """Test updating category"""
        # Create category
        category_data = {
            "name": "Original Category",
            "description": "Original description"
        }
        
        create_response = client.post("/api/products/categories", json=category_data, headers=auth_headers)
        assert create_response.status_code == 200
        category_id = create_response.json()["id"]
        
        # Update category
        update_data = {
            "name": "Updated Category",
            "description": "Updated description",
            "sort_order": 5
        }
        
        response = client.put(f"/api/products/categories/{category_id}", json=update_data, headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == update_data["name"]
        assert data["description"] == update_data["description"]
        assert data["sort_order"] == 5
    
    def test_delete_empty_category(self, client: TestClient, auth_headers):
        """Test deleting category with no products"""
        # Create category
        category_data = {
            "name": "Category to Delete",
            "description": "Will be deleted"
        }
        
        create_response = client.post("/api/products/categories", json=category_data, headers=auth_headers)
        assert create_response.status_code == 200
        category_id = create_response.json()["id"]
        
        # Delete category
        response = client.delete(f"/api/products/categories/{category_id}", headers=auth_headers)
        
        assert response.status_code == 200
        assert "deleted successfully" in response.json()["message"]
    
    def test_delete_category_with_products(self, client: TestClient, auth_headers):
        """Test that category with products cannot be deleted"""
        # Create category
        category_data = {
            "name": "Category with Products",
            "description": "Has products"
        }
        
        create_response = client.post("/api/products/categories", json=category_data, headers=auth_headers)
        assert create_response.status_code == 200
        category_id = create_response.json()["id"]
        
        # Create product in category
        product_data = {
            "name": "Product in Category",
            "selling_price": "100.00",
            "category_id": category_id
        }
        
        product_response = client.post("/api/products/", json=product_data, headers=auth_headers)
        assert product_response.status_code == 200
        
        # Try to delete category
        response = client.delete(f"/api/products/categories/{category_id}", headers=auth_headers)
        
        assert response.status_code == 422
        assert "Cannot delete category with" in response.json()["message"]


class TestProductAnalytics:
    """Test product analytics and reporting with real data"""
    
    @pytest.fixture
    def test_tenant(self, db_session: Session):
        """Create a test tenant"""
        tenant = Tenant(
            id=uuid.uuid4(),
            name="Test Gold Shop",
            email="test@goldshop.com",
            phone="+1234567890",
            subscription_type=SubscriptionType.PRO,
            status=TenantStatus.ACTIVE
        )
        db_session.add(tenant)
        db_session.commit()
        db_session.refresh(tenant)
        return tenant
    
    @pytest.fixture
    def test_user(self, db_session: Session, test_tenant):
        """Create a test user"""
        user = User(
            id=uuid.uuid4(),
            tenant_id=test_tenant.id,
            email="user@goldshop.com",
            first_name="Test",
            last_name="User",
            password_hash="hashed_password",
            role=UserRole.ADMIN,
            status=UserStatus.ACTIVE
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
        return user
    
    @pytest.fixture
    def auth_headers(self, test_user, test_tenant):
        """Create authentication headers"""
        token = create_access_token(data={"user_id": str(test_user.id), "tenant_id": str(test_tenant.id)})
        return {"Authorization": f"Bearer {token}"}
    
    @pytest.fixture
    def analytics_test_data(self, client: TestClient, auth_headers):
        """Create test data for analytics"""
        # Create categories
        category_response = client.post("/api/products/categories", json={
            "name": "Test Category",
            "description": "For analytics testing"
        }, headers=auth_headers)
        category_id = category_response.json()["id"]
        
        # Create various products for analytics
        products_data = [
            {
                "name": "Active Gold Product",
                "selling_price": "200.00",
                "cost_price": "150.00",
                "is_gold_product": True,
                "gold_purity": "18.000",
                "weight_per_unit": "5.0",
                "status": "ACTIVE",
                "stock_quantity": 10,
                "min_stock_level": 5,
                "category_id": category_id
            },
            {
                "name": "Inactive Product",
                "selling_price": "100.00",
                "status": "inactive",
                "stock_quantity": 5,
                "category_id": category_id
            },
            {
                "name": "Service Product",
                "selling_price": "50.00",
                "is_service": True,
                "track_inventory": False,
                "category_id": category_id
            },
            {
                "name": "Low Stock Product",
                "selling_price": "75.00",
                "stock_quantity": 2,
                "min_stock_level": 5,
                "category_id": category_id
            },
            {
                "name": "Out of Stock Product",
                "selling_price": "125.00",
                "stock_quantity": 0,
                "min_stock_level": 3,
                "category_id": category_id
            }
        ]
        
        created_products = []
        for product_data in products_data:
            response = client.post("/api/products/", json=product_data, headers=auth_headers)
            assert response.status_code == 200
            created_products.append(response.json())
        
        return created_products
    
    def test_get_product_stats(self, client: TestClient, auth_headers, analytics_test_data):
        """Test getting product statistics"""
        response = client.get("/api/products/analytics/stats", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify counts
        assert data["total_products"] == 5
        assert data["active_products"] == 1  # Only one with status "active"
        assert data["inactive_products"] == 1
        assert data["gold_products"] == 1
        assert data["service_products"] == 1
        assert data["low_stock_products"] == 1
        assert data["out_of_stock_products"] == 1
        assert data["categories_count"] == 1
        
        # Verify inventory value calculation
        # Active Gold Product: 10 * 200 = 2000
        # Low Stock Product: 2 * 75 = 150
        # Total = 2150 (excluding services and out of stock)
        expected_value = Decimal("2150.00")
        assert Decimal(str(data["total_inventory_value"])) == expected_value
    
    def test_get_low_stock_alerts(self, client: TestClient, auth_headers, analytics_test_data):
        """Test getting low stock alerts"""
        response = client.get("/api/products/analytics/low-stock", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        
        # Should have 2 alerts: low stock and out of stock
        assert len(data) == 2
        
        # Check alert details
        alert_names = [alert["product_name"] for alert in data]
        assert "Low Stock Product" in alert_names
        assert "Out of Stock Product" in alert_names
        
        # Check stock statuses
        for alert in data:
            if alert["product_name"] == "Low Stock Product":
                assert alert["stock_status"] == "low_stock"
                assert alert["available_quantity"] == 2
            elif alert["product_name"] == "Out of Stock Product":
                assert alert["stock_status"] == "out_of_stock"
                assert alert["available_quantity"] == 0


class TestMultiTenantIsolation:
    """Test multi-tenant data isolation for products"""
    
    @pytest.fixture
    def tenant1(self, db_session: Session):
        """Create first test tenant"""
        tenant = Tenant(
            id=uuid.uuid4(),
            name="Gold Shop 1",
            email="shop1@goldshop.com",
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
            name="Gold Shop 2",
            email="shop2@goldshop.com",
            phone="+1234567891",
            subscription_type=SubscriptionType.PRO,
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
            email="user@goldshop.com",
            first_name="Test",
            last_name="User",
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
            email="user@goldshop.com",
            first_name="Test",
            last_name="User",
            password_hash="hashed_password",
            role=UserRole.ADMIN,
            status=UserStatus.ACTIVE
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
        return user
    
    @pytest.fixture
    def auth_headers1(self, user1, tenant1):
        """Create auth headers for user 1"""
        token = create_access_token(data={"user_id": str(user1.id), "tenant_id": str(tenant1.id)})
        return {"Authorization": f"Bearer {token}"}
    
    @pytest.fixture
    def auth_headers2(self, user2, tenant2):
        """Create auth headers for user 2"""
        token = create_access_token(data={"user_id": str(user2.id), "tenant_id": str(tenant2.id)})
        return {"Authorization": f"Bearer {token}"}
    
    def test_product_isolation_between_tenants(self, client: TestClient, auth_headers1, auth_headers2):
        """Test that products are isolated between tenants"""
        # Create product for tenant 1
        product1_data = {
            "name": "Tenant 1 Product",
            "sku": "T1P001",
            "selling_price": "100.00"
        }
        
        response1 = client.post("/api/products/", json=product1_data, headers=auth_headers1)
        assert response1.status_code == 200
        product1_id = response1.json()["id"]
        
        # Create product for tenant 2
        product2_data = {
            "name": "Tenant 2 Product",
            "sku": "T2P001",
            "selling_price": "200.00"
        }
        
        response2 = client.post("/api/products/", json=product2_data, headers=auth_headers2)
        assert response2.status_code == 200
        product2_id = response2.json()["id"]
        
        # Tenant 1 should only see their product
        response = client.get("/api/products/", headers=auth_headers1)
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert data["products"][0]["name"] == "Tenant 1 Product"
        
        # Tenant 2 should only see their product
        response = client.get("/api/products/", headers=auth_headers2)
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert data["products"][0]["name"] == "Tenant 2 Product"
        
        # Tenant 1 cannot access tenant 2's product
        response = client.get(f"/api/products/{product2_id}", headers=auth_headers1)
        assert response.status_code == 404
        
        # Tenant 2 cannot access tenant 1's product
        response = client.get(f"/api/products/{product1_id}", headers=auth_headers2)
        assert response.status_code == 404
    
    def test_category_isolation_between_tenants(self, client: TestClient, auth_headers1, auth_headers2):
        """Test that categories are isolated between tenants"""
        # Create category for tenant 1
        category1_data = {
            "name": "Tenant 1 Category",
            "description": "Category for tenant 1"
        }
        
        response1 = client.post("/api/products/categories", json=category1_data, headers=auth_headers1)
        assert response1.status_code == 200
        category1_id = response1.json()["id"]
        
        # Create category for tenant 2
        category2_data = {
            "name": "Tenant 2 Category",
            "description": "Category for tenant 2"
        }
        
        response2 = client.post("/api/products/categories", json=category2_data, headers=auth_headers2)
        assert response2.status_code == 200
        
        # Tenant 1 should only see their category
        response = client.get("/api/products/categories", headers=auth_headers1)
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["name"] == "Tenant 1 Category"
        
        # Tenant 2 should only see their category
        response = client.get("/api/products/categories", headers=auth_headers2)
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["name"] == "Tenant 2 Category"
        
        # Tenant 2 cannot use tenant 1's category for products
        product_data = {
            "name": "Cross-tenant Product",
            "selling_price": "100.00",
            "category_id": category1_id
        }
        
        response = client.post("/api/products/", json=product_data, headers=auth_headers2)
        assert response.status_code == 422
        assert "Invalid category ID" in response.json()["message"]
    
    def test_duplicate_sku_allowed_across_tenants(self, client: TestClient, auth_headers1, auth_headers2):
        """Test that same SKU can exist in different tenants"""
        # Create product with same SKU for both tenants
        product_data = {
            "name": "Same SKU Product",
            "sku": "SAME_SKU_001",
            "selling_price": "100.00"
        }
        
        # Create for tenant 1
        response1 = client.post("/api/products/", json=product_data, headers=auth_headers1)
        assert response1.status_code == 200
        
        # Create for tenant 2 with same SKU - should succeed
        response2 = client.post("/api/products/", json=product_data, headers=auth_headers2)
        assert response2.status_code == 200
        
        # Both products should exist independently
        assert response1.json()["id"] != response2.json()["id"]
        assert response1.json()["sku"] == response2.json()["sku"]


class TestBulkOperations:
    """Test bulk product operations"""
    
    @pytest.fixture
    def test_tenant(self, db_session: Session):
        """Create a test tenant"""
        tenant = Tenant(
            id=uuid.uuid4(),
            name="Test Gold Shop",
            email="test@goldshop.com",
            phone="+1234567890",
            subscription_type=SubscriptionType.PRO,
            status=TenantStatus.ACTIVE
        )
        db_session.add(tenant)
        db_session.commit()
        db_session.refresh(tenant)
        return tenant
    
    @pytest.fixture
    def test_user(self, db_session: Session, test_tenant):
        """Create a test user"""
        user = User(
            id=uuid.uuid4(),
            tenant_id=test_tenant.id,
            email="user@goldshop.com",
            first_name="Test",
            last_name="User",
            password_hash="hashed_password",
            role=UserRole.ADMIN,
            status=UserStatus.ACTIVE
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
        return user
    
    @pytest.fixture
    def auth_headers(self, test_user, test_tenant):
        """Create authentication headers"""
        token = create_access_token(data={"user_id": str(test_user.id), "tenant_id": str(test_tenant.id)})
        return {"Authorization": f"Bearer {token}"}
    
    @pytest.fixture
    def bulk_test_products(self, client: TestClient, auth_headers):
        """Create multiple products for bulk operations"""
        products_data = [
            {"name": "Bulk Product 1", "selling_price": "100.00"},
            {"name": "Bulk Product 2", "selling_price": "150.00"},
            {"name": "Bulk Product 3", "selling_price": "200.00"}
        ]
        
        created_products = []
        for product_data in products_data:
            response = client.post("/api/products/", json=product_data, headers=auth_headers)
            assert response.status_code == 200
            created_products.append(response.json())
        
        return created_products
    
    def test_bulk_update_products(self, client: TestClient, auth_headers, bulk_test_products):
        """Test bulk updating multiple products"""
        product_ids = [product["id"] for product in bulk_test_products]
        
        bulk_update_data = {
            "product_ids": product_ids,
            "updates": {
                "manufacturer": "Bulk Updated Manufacturer",
                "brand": "Bulk Brand"
            }
        }
        
        response = client.post("/api/products/bulk/update", json=bulk_update_data, headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert len(data["updated_products"]) == 3
        assert len(data["failed_updates"]) == 0
        
        # Verify updates were applied
        for product_id in product_ids:
            get_response = client.get(f"/api/products/{product_id}", headers=auth_headers)
            product_data = get_response.json()
            assert product_data["manufacturer"] == "Bulk Updated Manufacturer"
            assert product_data["brand"] == "Bulk Brand"
    
    def test_bulk_delete_products(self, client: TestClient, auth_headers, bulk_test_products):
        """Test bulk deleting multiple products"""
        product_ids = [product["id"] for product in bulk_test_products]
        
        bulk_delete_data = {"product_ids": product_ids}
        
        response = client.post("/api/products/bulk/delete", json=bulk_delete_data, headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert len(data["deleted_products"]) == 3
        assert len(data["failed_deletes"]) == 0
        
        # Verify products are deleted (not accessible)
        for product_id in product_ids:
            get_response = client.get(f"/api/products/{product_id}", headers=auth_headers)
            assert get_response.status_code == 404