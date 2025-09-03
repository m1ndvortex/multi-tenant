"""
Product API integration tests with real HTTP requests
Following Docker-first testing standards with real FastAPI endpoints
"""

import pytest
import uuid
import json
import tempfile
import os
from decimal import Decimal
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from unittest.mock import patch, MagicMock

from app.models.tenant import Tenant, SubscriptionType, TenantStatus
from app.models.user import User, UserRole, UserStatus
from app.models.product import Product, ProductCategory
from app.core.auth import create_access_token


class TestProductAPIIntegration:
    """Test complete product API workflows with real HTTP requests"""
    
    @pytest.fixture
    def test_tenant(self, db_session: Session):
        """Create a test tenant"""
        tenant = Tenant(
            id=uuid.uuid4(),
            name="API Test Gold Shop",
            email="api@goldshop.com",
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
            email="apiuser@goldshop.com",
            first_name="API Test",
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
    def auth_headers(self, test_user):
        """Create authentication headers"""
        token = create_access_token(data={
            "user_id": str(test_user.id),
            "tenant_id": str(test_user.tenant_id)
        })
        return {"Authorization": f"Bearer {token}"}
    
    def test_complete_product_lifecycle_api(self, client: TestClient, auth_headers):
        """Test complete product lifecycle through API endpoints"""
        
        # 1. Create category first
        category_data = {
            "name": "API Test Category",
            "description": "Category for API testing",
            "sort_order": 1
        }
        
        category_response = client.post(
            "/api/products/categories",
            json=category_data,
            headers=auth_headers
        )
        
        assert category_response.status_code == 200
        category = category_response.json()
        category_id = category["id"]
        
        # 2. Create product
        product_data = {
            "name": "API Test Gold Ring",
            "description": "18K gold ring for API testing",
            "sku": "API_GR_001",
            "barcode": "1234567890123",
            "category_id": category_id,
            "tags": ["gold", "ring", "api-test"],
            "cost_price": "150.00",
            "selling_price": "200.00",
            "min_price": "180.00",
            "max_price": "250.00",
            "is_gold_product": True,
            "gold_purity": "18.000",
            "weight_per_unit": "5.5",
            "track_inventory": True,
            "stock_quantity": 20,
            "min_stock_level": 5,
            "status": "active",
            "manufacturer": "API Gold Craft",
            "brand": "API Premium",
            "model": "API Ring Model",
            "length": "2.5",
            "width": "2.5",
            "height": "0.5",
            "weight": "5.5",
            "notes": "Created via API test"
        }
        
        create_response = client.post(
            "/api/products/",
            json=product_data,
            headers=auth_headers
        )
        
        assert create_response.status_code == 200
        product = create_response.json()
        product_id = product["id"]
        
        # Verify all fields were set correctly
        assert product["name"] == product_data["name"]
        assert product["sku"] == product_data["sku"]
        assert product["is_gold_product"] == True
        assert float(product["gold_purity"]) == 18.0
        assert product["stock_quantity"] == 20
        assert product["available_quantity"] == 20
        assert product["stock_status"] == "in_stock"
        
        # 3. Get product by ID
        get_response = client.get(
            f"/api/products/{product_id}",
            headers=auth_headers
        )
        
        assert get_response.status_code == 200
        retrieved_product = get_response.json()
        assert retrieved_product["id"] == product_id
        assert retrieved_product["name"] == product_data["name"]
        
        # 4. Update product
        update_data = {
            "name": "Updated API Gold Ring",
            "selling_price": "220.00",
            "description": "Updated description via API",
            "stock_quantity": 25
        }
        
        update_response = client.put(
            f"/api/products/{product_id}",
            json=update_data,
            headers=auth_headers
        )
        
        assert update_response.status_code == 200
        updated_product = update_response.json()
        assert updated_product["name"] == update_data["name"]
        assert float(updated_product["selling_price"]) == 220.0
        
        # 5. Search products
        search_response = client.get(
            "/api/products/?query=API&is_gold_product=true",
            headers=auth_headers
        )
        
        assert search_response.status_code == 200
        search_results = search_response.json()
        assert search_results["total"] == 1
        assert search_results["products"][0]["id"] == product_id
        
        # 6. Reserve stock
        reserve_data = {
            "quantity": 5,
            "reason": "API test reservation"
        }
        
        reserve_response = client.post(
            f"/api/products/{product_id}/stock/reserve",
            json=reserve_data,
            headers=auth_headers
        )
        
        assert reserve_response.status_code == 200
        reserved_product = reserve_response.json()
        assert reserved_product["reserved_quantity"] == 5
        assert reserved_product["available_quantity"] == 20  # 25 - 5
        
        # 7. Fulfill stock
        fulfill_response = client.post(
            f"/api/products/{product_id}/stock/fulfill?quantity=3",
            headers=auth_headers
        )
        
        assert fulfill_response.status_code == 200
        fulfilled_product = fulfill_response.json()
        assert fulfilled_product["reserved_quantity"] == 2  # 5 - 3
        assert fulfilled_product["stock_quantity"] == 22  # 25 - 3
        assert fulfilled_product["available_quantity"] == 20  # 22 - 2
        
        # 8. Get analytics
        stats_response = client.get(
            "/api/products/analytics/stats",
            headers=auth_headers
        )
        
        assert stats_response.status_code == 200
        stats = stats_response.json()
        assert stats["total_products"] == 1
        assert stats["gold_products"] == 1
        assert stats["categories_count"] == 1
        
        # 9. Delete product
        delete_response = client.delete(
            f"/api/products/{product_id}",
            headers=auth_headers
        )
        
        assert delete_response.status_code == 200
        
        # 10. Verify product is deleted
        get_deleted_response = client.get(
            f"/api/products/{product_id}",
            headers=auth_headers
        )
        
        assert get_deleted_response.status_code == 404
    
    def test_product_search_api_comprehensive(self, client: TestClient, auth_headers):
        """Test comprehensive product search API functionality"""
        
        # Create test category
        category_response = client.post(
            "/api/products/categories",
            json={"name": "Search Test Category"},
            headers=auth_headers
        )
        category_id = category_response.json()["id"]
        
        # Create diverse products for search testing
        test_products = [
            {
                "name": "Premium Gold Ring 18K",
                "sku": "PGR18K001",
                "selling_price": "500.00",
                "is_gold_product": True,
                "gold_purity": "18.000",
                "weight_per_unit": "8.0",
                "stock_quantity": 15,
                "min_stock_level": 5,
                "manufacturer": "Premium Crafts",
                "brand": "Luxury Gold",
                "category_id": category_id,
                "tags": ["premium", "gold", "ring"]
            },
            {
                "name": "Silver Chain Necklace",
                "sku": "SCN001",
                "selling_price": "75.00",
                "is_gold_product": False,
                "stock_quantity": 3,
                "min_stock_level": 5,  # Low stock
                "manufacturer": "Silver Works",
                "brand": "Classic Silver",
                "category_id": category_id,
                "tags": ["silver", "chain", "necklace"]
            },
            {
                "name": "Gold Bracelet 22K",
                "sku": "GB22K001",
                "selling_price": "800.00",
                "is_gold_product": True,
                "gold_purity": "22.000",
                "weight_per_unit": "12.0",
                "stock_quantity": 0,  # Out of stock
                "min_stock_level": 2,
                "manufacturer": "Premium Crafts",
                "brand": "Elite Gold",
                "category_id": category_id,
                "tags": ["premium", "gold", "bracelet"]
            },
            {
                "name": "Jewelry Cleaning Service",
                "sku": "JCS001",
                "selling_price": "30.00",
                "is_service": True,
                "track_inventory": False,
                "manufacturer": "In-House",
                "category_id": category_id,
                "tags": ["service", "cleaning"]
            }
        ]
        
        created_product_ids = []
        for product_data in test_products:
            response = client.post("/api/products/", json=product_data, headers=auth_headers)
            assert response.status_code == 200
            created_product_ids.append(response.json()["id"])
        
        # Test 1: Search by name
        response = client.get("/api/products/?query=Gold", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 2  # Gold Ring and Gold Bracelet
        
        # Test 2: Search by SKU
        response = client.get("/api/products/?query=PGR18K", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert data["products"][0]["sku"] == "PGR18K001"
        
        # Test 3: Filter by gold products
        response = client.get("/api/products/?is_gold_product=true", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 2
        
        # Test 4: Filter by services
        response = client.get("/api/products/?is_service=true", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert data["products"][0]["name"] == "Jewelry Cleaning Service"
        
        # Test 5: Filter by stock status - low stock
        response = client.get("/api/products/?stock_status=low_stock", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert data["products"][0]["name"] == "Silver Chain Necklace"
        
        # Test 6: Filter by stock status - out of stock
        response = client.get("/api/products/?stock_status=out_of_stock", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert data["products"][0]["name"] == "Gold Bracelet 22K"
        
        # Test 7: Filter by price range
        response = client.get("/api/products/?min_price=100&max_price=600", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert data["products"][0]["name"] == "Premium Gold Ring 18K"
        
        # Test 8: Filter by manufacturer
        response = client.get("/api/products/?manufacturer=Premium Crafts", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 2
        
        # Test 9: Filter by category
        response = client.get(f"/api/products/?category_id={category_id}", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 4  # All products
        
        # Test 10: Combined filters
        response = client.get(
            f"/api/products/?is_gold_product=true&manufacturer=Premium Crafts&min_price=400",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 2  # Both gold products from Premium Crafts
        
        # Test 11: Sorting by price descending
        response = client.get("/api/products/?sort_by=selling_price&sort_order=desc", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        prices = [float(p["selling_price"]) for p in data["products"]]
        assert prices == sorted(prices, reverse=True)
        
        # Test 12: Pagination
        response = client.get("/api/products/?page=1&page_size=2", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data["products"]) == 2
        assert data["page"] == 1
        assert data["page_size"] == 2
        assert data["total"] == 4
        assert data["total_pages"] == 2
        
        # Test 13: Second page
        response = client.get("/api/products/?page=2&page_size=2", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data["products"]) == 2
        assert data["page"] == 2
    
    def test_stock_management_api_workflow(self, client: TestClient, auth_headers):
        """Test complete stock management workflow through API"""
        
        # Create product with initial stock
        product_data = {
            "name": "Stock Test Product",
            "selling_price": "100.00",
            "track_inventory": True,
            "stock_quantity": 50,
            "min_stock_level": 10
        }
        
        create_response = client.post("/api/products/", json=product_data, headers=auth_headers)
        assert create_response.status_code == 200
        product_id = create_response.json()["id"]
        
        # 1. Adjust stock - increase
        adjust_data = {
            "quantity": 20,
            "reason": "New shipment received",
            "reference_type": "purchase_order",
            "reference_id": str(uuid.uuid4())
        }
        
        adjust_response = client.post(
            f"/api/products/{product_id}/stock/adjust",
            json=adjust_data,
            headers=auth_headers
        )
        
        assert adjust_response.status_code == 200
        adjusted_product = adjust_response.json()
        assert adjusted_product["stock_quantity"] == 70  # 50 + 20
        assert adjusted_product["available_quantity"] == 70
        
        # 2. Reserve stock for order
        reserve_data = {
            "quantity": 15,
            "reason": "Customer order #12345",
            "reference_type": "sales_order",
            "reference_id": str(uuid.uuid4())
        }
        
        reserve_response = client.post(
            f"/api/products/{product_id}/stock/reserve",
            json=reserve_data,
            headers=auth_headers
        )
        
        assert reserve_response.status_code == 200
        reserved_product = reserve_response.json()
        assert reserved_product["reserved_quantity"] == 15
        assert reserved_product["available_quantity"] == 55  # 70 - 15
        
        # 3. Reserve more stock
        reserve_data2 = {
            "quantity": 10,
            "reason": "Another customer order #12346"
        }
        
        reserve_response2 = client.post(
            f"/api/products/{product_id}/stock/reserve",
            json=reserve_data2,
            headers=auth_headers
        )
        
        assert reserve_response2.status_code == 200
        reserved_product2 = reserve_response2.json()
        assert reserved_product2["reserved_quantity"] == 25  # 15 + 10
        assert reserved_product2["available_quantity"] == 45  # 70 - 25
        
        # 4. Fulfill part of reservation (ship order)
        fulfill_response = client.post(
            f"/api/products/{product_id}/stock/fulfill?quantity=12",
            headers=auth_headers
        )
        
        assert fulfill_response.status_code == 200
        fulfilled_product = fulfill_response.json()
        assert fulfilled_product["reserved_quantity"] == 13  # 25 - 12
        assert fulfilled_product["stock_quantity"] == 58  # 70 - 12
        assert fulfilled_product["available_quantity"] == 45  # 58 - 13
        
        # 5. Release some reservation (order cancelled)
        release_response = client.post(
            f"/api/products/{product_id}/stock/release?quantity=8",
            headers=auth_headers
        )
        
        assert release_response.status_code == 200
        released_product = release_response.json()
        assert released_product["reserved_quantity"] == 5  # 13 - 8
        assert released_product["stock_quantity"] == 58  # Unchanged
        assert released_product["available_quantity"] == 53  # 58 - 5
        
        # 6. Adjust stock - decrease (damaged goods)
        adjust_data2 = {
            "quantity": -3,
            "reason": "Damaged items removed"
        }
        
        adjust_response2 = client.post(
            f"/api/products/{product_id}/stock/adjust",
            json=adjust_data2,
            headers=auth_headers
        )
        
        assert adjust_response2.status_code == 200
        final_product = adjust_response2.json()
        assert final_product["stock_quantity"] == 55  # 58 - 3
        assert final_product["reserved_quantity"] == 5  # Unchanged
        assert final_product["available_quantity"] == 50  # 55 - 5
        
        # 7. Verify final state
        get_response = client.get(f"/api/products/{product_id}", headers=auth_headers)
        assert get_response.status_code == 200
        final_state = get_response.json()
        assert final_state["stock_quantity"] == 55
        assert final_state["reserved_quantity"] == 5
        assert final_state["available_quantity"] == 50
        assert final_state["stock_status"] == "in_stock"
    
    def test_category_management_api_workflow(self, client: TestClient, auth_headers):
        """Test complete category management workflow through API"""
        
        # 1. Create parent category
        parent_data = {
            "name": "Jewelry",
            "description": "All jewelry products",
            "sort_order": 1
        }
        
        parent_response = client.post(
            "/api/products/categories",
            json=parent_data,
            headers=auth_headers
        )
        
        assert parent_response.status_code == 200
        parent_category = parent_response.json()
        parent_id = parent_category["id"]
        
        # 2. Create child categories
        child_categories = [
            {
                "name": "Rings",
                "description": "Ring products",
                "parent_id": parent_id,
                "sort_order": 1
            },
            {
                "name": "Necklaces",
                "description": "Necklace products",
                "parent_id": parent_id,
                "sort_order": 2
            },
            {
                "name": "Bracelets",
                "description": "Bracelet products",
                "parent_id": parent_id,
                "sort_order": 3
            }
        ]
        
        child_ids = []
        for child_data in child_categories:
            response = client.post(
                "/api/products/categories",
                json=child_data,
                headers=auth_headers
            )
            assert response.status_code == 200
            child_ids.append(response.json()["id"])
        
        # 3. Get all categories
        get_response = client.get("/api/products/categories", headers=auth_headers)
        assert get_response.status_code == 200
        categories = get_response.json()
        assert len(categories) == 4  # 1 parent + 3 children
        
        # Verify sorting by sort_order
        jewelry_cats = [cat for cat in categories if cat["parent_id"] == parent_id]
        sort_orders = [cat["sort_order"] for cat in jewelry_cats]
        assert sort_orders == [1, 2, 3]
        
        # 4. Create products in categories
        ring_product = {
            "name": "Gold Ring",
            "selling_price": "200.00",
            "category_id": child_ids[0]  # Rings category
        }
        
        product_response = client.post("/api/products/", json=ring_product, headers=auth_headers)
        assert product_response.status_code == 200
        
        # 5. Update category
        update_data = {
            "name": "Wedding Rings",
            "description": "Wedding and engagement rings",
            "sort_order": 10
        }
        
        update_response = client.put(
            f"/api/products/categories/{child_ids[0]}",
            json=update_data,
            headers=auth_headers
        )
        
        assert update_response.status_code == 200
        updated_category = update_response.json()
        assert updated_category["name"] == "Wedding Rings"
        assert updated_category["sort_order"] == 10
        
        # 6. Try to delete category with products (should fail)
        delete_response = client.delete(
            f"/api/products/categories/{child_ids[0]}",
            headers=auth_headers
        )
        
        assert delete_response.status_code == 400
        assert "Cannot delete category with" in delete_response.json()["detail"]
        
        # 7. Delete empty category (should succeed)
        delete_response2 = client.delete(
            f"/api/products/categories/{child_ids[1]}",  # Necklaces (empty)
            headers=auth_headers
        )
        
        assert delete_response2.status_code == 200
        
        # 8. Verify category is deleted
        get_response2 = client.get("/api/products/categories", headers=auth_headers)
        assert get_response2.status_code == 200
        remaining_categories = get_response2.json()
        assert len(remaining_categories) == 3  # 1 parent + 2 children
    
    @patch('app.tasks.media_tasks.process_product_image.delay')
    def test_image_upload_api_workflow(self, mock_celery_task, client: TestClient, auth_headers):
        """Test image upload workflow through API"""
        
        # Create product first
        product_data = {
            "name": "Image Test Product",
            "selling_price": "100.00"
        }
        
        create_response = client.post("/api/products/", json=product_data, headers=auth_headers)
        assert create_response.status_code == 200
        product_id = create_response.json()["id"]
        
        # Mock Celery task
        mock_task = MagicMock()
        mock_task.id = "test_task_id_123"
        mock_celery_task.return_value = mock_task
        
        # Create a temporary test image file
        with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as temp_file:
            # Write some dummy image data
            temp_file.write(b'\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00H\x00H\x00\x00\xff\xdb')
            temp_file_path = temp_file.name
        
        try:
            # Upload image
            with open(temp_file_path, 'rb') as image_file:
                files = {"file": ("test_image.jpg", image_file, "image/jpeg")}
                upload_response = client.post(
                    f"/api/products/{product_id}/images/upload",
                    files=files,
                    headers=auth_headers
                )
            
            assert upload_response.status_code == 200
            upload_data = upload_response.json()
            assert "image_url" in upload_data
            assert upload_data["original_filename"] == "test_image.jpg"
            assert upload_data["content_type"] == "image/jpeg"
            assert upload_data["processing_status"] == "processing"
            
            # Verify Celery task was called
            mock_celery_task.assert_called_once()
            
        finally:
            # Clean up temporary file
            os.unlink(temp_file_path)
        
        # Add image URLs directly
        image_data = {
            "image_urls": [
                "https://example.com/image1.jpg",
                "https://example.com/image2.jpg"
            ]
        }
        
        add_images_response = client.post(
            f"/api/products/{product_id}/images",
            json=image_data,
            headers=auth_headers
        )
        
        assert add_images_response.status_code == 200
        product_with_images = add_images_response.json()
        assert len(product_with_images["images"]) == 2
        
        # Remove an image
        remove_response = client.delete(
            f"/api/products/{product_id}/images?image_url=https://example.com/image1.jpg",
            headers=auth_headers
        )
        
        assert remove_response.status_code == 200
        product_after_removal = remove_response.json()
        assert len(product_after_removal["images"]) == 1
        assert "https://example.com/image2.jpg" in product_after_removal["images"]
    
    def test_analytics_api_comprehensive(self, client: TestClient, auth_headers):
        """Test comprehensive analytics API functionality"""
        
        # Create test data for analytics
        category_response = client.post(
            "/api/products/categories",
            json={"name": "Analytics Test Category"},
            headers=auth_headers
        )
        category_id = category_response.json()["id"]
        
        # Create diverse products for analytics
        analytics_products = [
            {
                "name": "High Value Gold Product",
                "selling_price": "1000.00",
                "cost_price": "800.00",
                "is_gold_product": True,
                "gold_purity": "22.000",
                "weight_per_unit": "10.0",
                "status": "active",
                "stock_quantity": 5,
                "min_stock_level": 3,
                "category_id": category_id
            },
            {
                "name": "Medium Value Product",
                "selling_price": "300.00",
                "cost_price": "200.00",
                "status": "active",
                "stock_quantity": 2,
                "min_stock_level": 5,  # Low stock
                "category_id": category_id
            },
            {
                "name": "Inactive Product",
                "selling_price": "150.00",
                "status": "inactive",
                "stock_quantity": 10,
                "category_id": category_id
            },
            {
                "name": "Out of Stock Product",
                "selling_price": "200.00",
                "status": "active",
                "stock_quantity": 0,
                "min_stock_level": 2,
                "category_id": category_id
            },
            {
                "name": "Service Product",
                "selling_price": "50.00",
                "is_service": True,
                "track_inventory": False,
                "category_id": category_id
            }
        ]
        
        for product_data in analytics_products:
            response = client.post("/api/products/", json=product_data, headers=auth_headers)
            assert response.status_code == 200
        
        # Test product statistics
        stats_response = client.get("/api/products/analytics/stats", headers=auth_headers)
        assert stats_response.status_code == 200
        stats = stats_response.json()
        
        # Verify counts
        assert stats["total_products"] == 5
        assert stats["active_products"] == 3  # Only products with status "active"
        assert stats["inactive_products"] == 1
        assert stats["gold_products"] == 1
        assert stats["service_products"] == 1
        assert stats["low_stock_products"] == 1
        assert stats["out_of_stock_products"] == 1
        assert stats["categories_count"] == 1
        
        # Verify inventory value calculation
        # High Value: 5 * 1000 = 5000
        # Medium Value: 2 * 300 = 600
        # Inactive: 10 * 150 = 1500
        # Total = 7100 (excluding services and out of stock)
        expected_value = Decimal("7100.00")
        assert Decimal(str(stats["total_inventory_value"])) == expected_value
        
        # Test low stock alerts
        alerts_response = client.get("/api/products/analytics/low-stock", headers=auth_headers)
        assert alerts_response.status_code == 200
        alerts = alerts_response.json()
        
        # Should have 2 alerts: low stock and out of stock
        assert len(alerts) == 2
        
        alert_names = [alert["product_name"] for alert in alerts]
        assert "Medium Value Product" in alert_names
        assert "Out of Stock Product" in alert_names
        
        # Verify alert details
        for alert in alerts:
            if alert["product_name"] == "Medium Value Product":
                assert alert["stock_status"] == "low_stock"
                assert alert["current_stock"] == 2
                assert alert["min_stock_level"] == 5
                assert alert["available_quantity"] == 2
            elif alert["product_name"] == "Out of Stock Product":
                assert alert["stock_status"] == "out_of_stock"
                assert alert["current_stock"] == 0
                assert alert["available_quantity"] == 0
    
    def test_error_handling_api(self, client: TestClient, auth_headers):
        """Test API error handling scenarios"""
        
        # Test 1: Create product with invalid data
        invalid_product = {
            "name": "",  # Empty name
            "selling_price": "-100.00"  # Negative price
        }
        
        response = client.post("/api/products/", json=invalid_product, headers=auth_headers)
        assert response.status_code == 422  # Validation error
        
        # Test 2: Get non-existent product
        fake_id = str(uuid.uuid4())
        response = client.get(f"/api/products/{fake_id}", headers=auth_headers)
        assert response.status_code == 404
        
        # Test 3: Update non-existent product
        response = client.put(f"/api/products/{fake_id}", json={"name": "Updated"}, headers=auth_headers)
        assert response.status_code == 404
        
        # Test 4: Delete non-existent product
        response = client.delete(f"/api/products/{fake_id}", headers=auth_headers)
        assert response.status_code == 404
        
        # Test 5: Invalid stock operations
        # Create a valid product first
        product_data = {"name": "Test Product", "selling_price": "100.00", "stock_quantity": 5}
        create_response = client.post("/api/products/", json=product_data, headers=auth_headers)
        product_id = create_response.json()["id"]
        
        # Try to reserve more than available
        reserve_data = {"quantity": 10, "reason": "Too much"}
        response = client.post(f"/api/products/{product_id}/stock/reserve", json=reserve_data, headers=auth_headers)
        assert response.status_code == 400
        assert "Insufficient stock" in response.json()["detail"]
        
        # Try to adjust stock to negative
        adjust_data = {"quantity": -10, "reason": "Invalid adjustment"}
        response = client.post(f"/api/products/{product_id}/stock/adjust", json=adjust_data, headers=auth_headers)
        assert response.status_code == 400
        assert "cannot be negative" in response.json()["detail"]
        
        # Test 6: Invalid category operations
        fake_category_id = str(uuid.uuid4())
        
        # Try to create product with non-existent category
        product_with_invalid_category = {
            "name": "Invalid Category Product",
            "selling_price": "100.00",
            "category_id": fake_category_id
        }
        
        response = client.post("/api/products/", json=product_with_invalid_category, headers=auth_headers)
        assert response.status_code == 400
        assert "Invalid category ID" in response.json()["detail"]
        
        # Test 7: Unauthorized access (no auth headers)
        response = client.get("/api/products/")
        assert response.status_code == 401
    
    def test_bulk_operations_api(self, client: TestClient, auth_headers):
        """Test bulk operations through API"""
        
        # Create multiple products for bulk operations
        products_data = [
            {"name": "Bulk Product 1", "selling_price": "100.00", "manufacturer": "Original Maker"},
            {"name": "Bulk Product 2", "selling_price": "150.00", "manufacturer": "Original Maker"},
            {"name": "Bulk Product 3", "selling_price": "200.00", "manufacturer": "Original Maker"}
        ]
        
        product_ids = []
        for product_data in products_data:
            response = client.post("/api/products/", json=product_data, headers=auth_headers)
            assert response.status_code == 200
            product_ids.append(response.json()["id"])
        
        # Test bulk update
        bulk_update_data = {
            "product_ids": product_ids,
            "updates": {
                "manufacturer": "Bulk Updated Manufacturer",
                "brand": "Bulk Brand",
                "notes": "Updated via bulk operation"
            }
        }
        
        update_response = client.post("/api/products/bulk/update", json=bulk_update_data, headers=auth_headers)
        assert update_response.status_code == 200
        
        update_result = update_response.json()
        assert len(update_result["updated_products"]) == 3
        assert len(update_result["failed_updates"]) == 0
        
        # Verify updates were applied
        for product_id in product_ids:
            get_response = client.get(f"/api/products/{product_id}", headers=auth_headers)
            product = get_response.json()
            assert product["manufacturer"] == "Bulk Updated Manufacturer"
            assert product["brand"] == "Bulk Brand"
            assert product["notes"] == "Updated via bulk operation"
        
        # Test bulk delete
        bulk_delete_data = {"product_ids": product_ids}
        
        delete_response = client.post("/api/products/bulk/delete", json=bulk_delete_data, headers=auth_headers)
        assert delete_response.status_code == 200
        
        delete_result = delete_response.json()
        assert len(delete_result["deleted_products"]) == 3
        assert len(delete_result["failed_deletes"]) == 0
        
        # Verify products are deleted
        for product_id in product_ids:
            get_response = client.get(f"/api/products/{product_id}", headers=auth_headers)
            assert get_response.status_code == 404
        
        # Test bulk operations with mixed results
        # Create some products and include non-existent IDs
        valid_product_data = {"name": "Valid Product", "selling_price": "100.00"}
        valid_response = client.post("/api/products/", json=valid_product_data, headers=auth_headers)
        valid_id = valid_response.json()["id"]
        
        fake_id = str(uuid.uuid4())
        mixed_ids = [valid_id, fake_id]
        
        mixed_update_data = {
            "product_ids": mixed_ids,
            "updates": {"brand": "Mixed Update"}
        }
        
        mixed_response = client.post("/api/products/bulk/update", json=mixed_update_data, headers=auth_headers)
        assert mixed_response.status_code == 200
        
        mixed_result = mixed_response.json()
        assert len(mixed_result["updated_products"]) == 1
        assert len(mixed_result["failed_updates"]) == 1
        assert mixed_result["failed_updates"][0]["product_id"] == fake_id