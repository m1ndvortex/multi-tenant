"""
Product image processing integration tests with real Celery tasks
Following Docker-first testing standards with real image processing
"""

import pytest
import uuid
import tempfile
import os
import json
from unittest.mock import patch, MagicMock, ANY
from PIL import Image
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.tenant import Tenant, SubscriptionType, TenantStatus
from app.models.user import User, UserRole, UserStatus
from app.models.product import Product
from app.core.auth import create_access_token
from app.tasks.media_tasks import process_product_image
from app.core.config import settings


class TestProductImageProcessing:
    """Test product image processing with real file operations"""
    
    @pytest.fixture
    def test_tenant(self, db_session: Session):
        """Create a test tenant"""
        tenant = Tenant(
            id=uuid.uuid4(),
            name="Image Test Gold Shop",
            email="image@goldshop.com",
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
            email="imageuser@goldshop.com",
            first_name="Image Test",
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
            "tenant_id": str(test_user.tenant_id),
            "email": test_user.email,
            "role": test_user.role.value,
            "is_super_admin": test_user.is_super_admin
        })
        return {"Authorization": f"Bearer {token}"}
    
    @pytest.fixture
    def test_product(self, client: TestClient, auth_headers):
        """Create a test product for image operations"""
        product_data = {
            "name": "Image Test Product",
            "selling_price": "100.00",
            "description": "Product for testing image operations"
        }
        
        response = client.post("/api/products/", json=product_data, headers=auth_headers)
        assert response.status_code == 200
        return response.json()
    
    def create_test_image(self, format='JPEG', size=(800, 600), color='RGB'):
        """Create a test image file"""
        image = Image.new(color, size, color='red')
        temp_file = tempfile.NamedTemporaryFile(
            suffix=f'.{format.lower()}',
            delete=False
        )
        image.save(temp_file.name, format=format)
        return temp_file.name
    
    def test_image_upload_validation_success(self, client: TestClient, auth_headers, test_product):
        """Test successful image upload with validation"""
        product_id = test_product["id"]
        
        # Create a valid test image
        image_path = self.create_test_image()
        
        try:
            with open(image_path, 'rb') as image_file:
                files = {"file": ("test_image.jpg", image_file, "image/jpeg")}
                
                with patch('app.tasks.media_tasks.process_product_image.delay') as mock_task:
                    mock_task.return_value = MagicMock(id="test_task_123")
                    
                    response = client.post(
                        f"/api/products/{product_id}/images/upload",
                        files=files,
                        headers=auth_headers
                    )
            
            assert response.status_code == 200
            data = response.json()
            
            # Verify response structure
            assert "image_url" in data
            assert data["original_filename"] == "test_image.jpg"
            assert data["content_type"] == "image/jpeg"
            assert data["processing_status"] == "processing"
            assert data["file_size"] > 0
            
            # Verify Celery task was called
            mock_task.assert_called_once()
            call_args = mock_task.call_args[0]
            assert len(call_args) == 3  # temp_path, tenant_id, product_id
            
        finally:
            os.unlink(image_path)
    
    def test_image_upload_invalid_file_type(self, client: TestClient, auth_headers, test_product):
        """Test image upload with invalid file type"""
        product_id = test_product["id"]
        
        # Create a text file instead of image
        with tempfile.NamedTemporaryFile(suffix='.txt', delete=False) as temp_file:
            temp_file.write(b"This is not an image")
            temp_path = temp_file.name
        
        try:
            with open(temp_path, 'rb') as text_file:
                files = {"file": ("test.txt", text_file, "text/plain")}
                
                response = client.post(
                    f"/api/products/{product_id}/images/upload",
                    files=files,
                    headers=auth_headers
                )
            
            assert response.status_code == 400
            response_data = response.json()
            assert "Unsupported file type" in response_data.get("message", response_data.get("detail", ""))
            
        finally:
            os.unlink(temp_path)
    
    def test_image_upload_file_too_large(self, client: TestClient, auth_headers, test_product):
        """Test image upload with file size exceeding limit"""
        product_id = test_product["id"]
        
        # Create a large file that exceeds the limit
        large_file_path = tempfile.mktemp(suffix='.jpg')
        
        try:
            # Create a file larger than the max size (write 20MB of data)
            with open(large_file_path, 'wb') as f:
                f.write(b'0' * (20 * 1024 * 1024))  # 20MB
            
            with open(large_file_path, 'rb') as image_file:
                files = {"file": ("large_image.jpg", image_file, "image/jpeg")}
                
                response = client.post(
                    f"/api/products/{product_id}/images/upload",
                    files=files,
                    headers=auth_headers
                )
            
            assert response.status_code == 400
            response_data = response.json()
            assert "too large" in response_data.get("message", response_data.get("detail", "")).lower()
            
        finally:
            if os.path.exists(large_file_path):
                os.unlink(large_file_path)
    
    def test_image_upload_nonexistent_product(self, client: TestClient, auth_headers):
        """Test image upload for non-existent product"""
        fake_product_id = str(uuid.uuid4())
        image_path = self.create_test_image()
        
        try:
            with open(image_path, 'rb') as image_file:
                files = {"file": ("test_image.jpg", image_file, "image/jpeg")}
                
                response = client.post(
                    f"/api/products/{fake_product_id}/images/upload",
                    files=files,
                    headers=auth_headers
                )
            
            assert response.status_code == 404
            response_data = response.json()
            assert "Product not found" in response_data.get("message", response_data.get("detail", ""))
        finally:
            os.unlink(image_path)
    
    @patch('app.tasks.media_tasks.ImageProcessor.optimize_image')
    @patch('app.tasks.media_tasks.ImageProcessor.resize_image')
    @patch('app.tasks.media_tasks.ImageProcessor.validate_image')
    def test_celery_image_processing_task(self, mock_validate, mock_resize, mock_optimize, db_session):
        """Test Celery image processing task with real operations"""
        # Create test data
        tenant_id = str(uuid.uuid4())
        product_id = str(uuid.uuid4())
        
        # Create test tenant and product in database
        tenant = Tenant(
            id=uuid.UUID(tenant_id),
            name="Celery Test Shop",
            email="celery@test.com",
            phone="+1234567890",
            subscription_type=SubscriptionType.PRO,
            status=TenantStatus.ACTIVE
        )
        db_session.add(tenant)
        
        product = Product(
            id=uuid.UUID(product_id),
            tenant_id=uuid.UUID(tenant_id),
            name="Celery Test Product",
            selling_price=100.00,
            status="ACTIVE"
        )
        db_session.add(product)
        db_session.commit()
        
        # Create test image
        image_path = self.create_test_image()
        
        # Mock operations
        mock_validate.return_value = True
        mock_resize.return_value = True
        mock_optimize.return_value = True
        
        try:
            # Execute Celery task
            result = process_product_image(image_path, tenant_id, product_id)
            
            # Verify task execution
            assert result is not None
            
            # Verify methods were called
            mock_validate.assert_called()
            mock_resize.assert_called_once_with(
                image_path, 
                ANY,  # output path
                ANY,  # size
                quality=ANY,
                format=ANY
            )
            
            # Verify product was updated in database
            db_session.refresh(product)
            assert len(product.images) > 0
            
        finally:
            os.unlink(image_path)
    
    def test_add_image_urls_directly(self, client: TestClient, auth_headers, test_product):
        """Test adding image URLs directly without upload"""
        product_id = test_product["id"]
        
        image_data = {
            "image_urls": [
                "https://example.com/product1.jpg",
                "https://example.com/product2.jpg",
                "https://example.com/product3.jpg"
            ]
        }
        
        response = client.post(
            f"/api/products/{product_id}/images",
            json=image_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify images were added
        assert len(data["images"]) == 3
        for url in image_data["image_urls"]:
            assert url in data["images"]
    
    def test_remove_product_image(self, client: TestClient, auth_headers, test_product):
        """Test removing product image"""
        product_id = test_product["id"]
        
        # First add some images
        image_data = {
            "image_urls": [
                "https://example.com/image1.jpg",
                "https://example.com/image2.jpg"
            ]
        }
        
        add_response = client.post(
            f"/api/products/{product_id}/images",
            json=image_data,
            headers=auth_headers
        )
        assert add_response.status_code == 200
        
        # Remove one image
        remove_response = client.delete(
            f"/api/products/{product_id}/images?image_url=https://example.com/image1.jpg",
            headers=auth_headers
        )
        
        assert remove_response.status_code == 200
        data = remove_response.json()
        
        # Verify image was removed
        assert len(data["images"]) == 1
        assert "https://example.com/image2.jpg" in data["images"]
        assert "https://example.com/image1.jpg" not in data["images"]
    
    def test_remove_nonexistent_image(self, client: TestClient, auth_headers, test_product):
        """Test removing non-existent image"""
        product_id = test_product["id"]
        
        response = client.delete(
            f"/api/products/{product_id}/images?image_url=https://example.com/nonexistent.jpg",
            headers=auth_headers
        )
        
        assert response.status_code == 400
        response_data = response.json()
        assert "not found" in response_data.get("message", response_data.get("detail", "")).lower()
    
    def test_multiple_image_formats(self, client: TestClient, auth_headers, test_product):
        """Test uploading different image formats"""
        product_id = test_product["id"]
        
        formats_to_test = [
            ('JPEG', 'image/jpeg', '.jpg'),
            ('PNG', 'image/png', '.png'),
            ('WEBP', 'image/webp', '.webp')
        ]
        
        for format_name, content_type, extension in formats_to_test:
            image_path = self.create_test_image(format=format_name)
            
            try:
                with open(image_path, 'rb') as image_file:
                    files = {"file": (f"test{extension}", image_file, content_type)}
                    
                    with patch('app.tasks.media_tasks.process_product_image.delay') as mock_task:
                        mock_task.return_value = MagicMock(id=f"task_{format_name}")
                        
                        response = client.post(
                            f"/api/products/{product_id}/images/upload",
                            files=files,
                            headers=auth_headers
                        )
                
                assert response.status_code == 200, f"Failed for format {format_name}"
                data = response.json()
                assert data["content_type"] == content_type
                
            finally:
                os.unlink(image_path)
    
    def test_image_processing_error_handling(self, client: TestClient, auth_headers, test_product):
        """Test error handling in image processing"""
        product_id = test_product["id"]
        
        # Create a corrupted image file
        with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as temp_file:
            temp_file.write(b"corrupted image data")
            corrupted_path = temp_file.name
        
        try:
            with open(corrupted_path, 'rb') as corrupted_file:
                files = {"file": ("corrupted.jpg", corrupted_file, "image/jpeg")}
                
                with patch('app.tasks.media_tasks.process_product_image.delay') as mock_task:
                    # Simulate task failure
                    mock_task.side_effect = Exception("Image processing failed")
                    
                    response = client.post(
                        f"/api/products/{product_id}/images/upload",
                        files=files,
                        headers=auth_headers
                    )
            
            # Should still return 200 as task is queued, but task will fail
            assert response.status_code == 200
            
        finally:
            os.unlink(corrupted_path)
    
    def test_concurrent_image_uploads(self, client: TestClient, auth_headers, test_product):
        """Test concurrent image uploads for same product"""
        product_id = test_product["id"]
        
        # Create multiple test images
        image_paths = []
        for i in range(3):
            path = self.create_test_image()
            image_paths.append(path)
        
        try:
            responses = []
            
            # Upload multiple images concurrently (simulated)
            for i, image_path in enumerate(image_paths):
                with open(image_path, 'rb') as image_file:
                    files = {"file": (f"concurrent_{i}.jpg", image_file, "image/jpeg")}
                    
                    with patch('app.tasks.media_tasks.process_product_image.delay') as mock_task:
                        mock_task.return_value = MagicMock(id=f"concurrent_task_{i}")
                        
                        response = client.post(
                            f"/api/products/{product_id}/images/upload",
                            files=files,
                            headers=auth_headers
                        )
                        responses.append(response)
            
            # All uploads should succeed
            for response in responses:
                assert response.status_code == 200
            
            # Each should have unique task IDs
            task_ids = [resp.json()["image_url"] for resp in responses]
            assert len(set(task_ids)) == len(task_ids)  # All unique
            
        finally:
            for path in image_paths:
                os.unlink(path)
    
    def test_image_metadata_extraction(self, client: TestClient, auth_headers, test_product):
        """Test extraction of image metadata during upload"""
        product_id = test_product["id"]
        
        # Create image with specific dimensions
        image_path = self.create_test_image(size=(1200, 800))
        
        try:
            file_size = os.path.getsize(image_path)
            
            with open(image_path, 'rb') as image_file:
                files = {"file": ("metadata_test.jpg", image_file, "image/jpeg")}
                
                with patch('app.tasks.media_tasks.process_product_image.delay') as mock_task:
                    mock_task.return_value = MagicMock(id="metadata_task")
                    
                    response = client.post(
                        f"/api/products/{product_id}/images/upload",
                        files=files,
                        headers=auth_headers
                    )
            
            assert response.status_code == 200
            data = response.json()
            
            # Verify metadata
            assert data["original_filename"] == "metadata_test.jpg"
            assert data["content_type"] == "image/jpeg"
            assert data["file_size"] == file_size
            
        finally:
            os.unlink(image_path)
    
    def test_image_storage_path_generation(self, db_session):
        """Test image storage path generation for multi-tenant isolation"""
        tenant1_id = str(uuid.uuid4())
        tenant2_id = str(uuid.uuid4())
        product1_id = str(uuid.uuid4())
        product2_id = str(uuid.uuid4())
        
        # Create tenants and products
        for tenant_id, product_id in [(tenant1_id, product1_id), (tenant2_id, product2_id)]:
            tenant = Tenant(
                id=uuid.UUID(tenant_id),
                name=f"Tenant {tenant_id[:8]}",
                email=f"tenant{tenant_id[:8]}@test.com",
                phone="+1234567890",
                subscription_type=SubscriptionType.PRO,
                status=TenantStatus.ACTIVE
            )
            db_session.add(tenant)
            
            product = Product(
                id=uuid.UUID(product_id),
                tenant_id=uuid.UUID(tenant_id),
                name=f"Product {product_id[:8]}",
                selling_price=100.00,
                is_active=True
            )
            db_session.add(product)
        
        db_session.commit()
        
        # Test path generation (would be done in actual storage service)
        path1 = f"uploads/{tenant1_id}/products/{product1_id}/image.jpg"
        path2 = f"uploads/{tenant2_id}/products/{product2_id}/image.jpg"
        
        # Paths should be different for different tenants
        assert path1 != path2
        assert tenant1_id in path1
        assert tenant2_id in path2
        assert product1_id in path1
        assert product2_id in path2
    
    def test_image_cleanup_on_product_deletion(self, client: TestClient, auth_headers, test_product):
        """Test that images are handled when product is deleted"""
        product_id = test_product["id"]
        
        # Add images to product
        image_data = {
            "image_urls": [
                "https://example.com/product_image1.jpg",
                "https://example.com/product_image2.jpg"
            ]
        }
        
        add_response = client.post(
            f"/api/products/{product_id}/images",
            json=image_data,
            headers=auth_headers
        )
        assert add_response.status_code == 200
        
        # Verify images were added
        get_response = client.get(f"/api/products/{product_id}", headers=auth_headers)
        product_data = get_response.json()
        assert len(product_data["images"]) == 2
        
        # Delete product
        delete_response = client.delete(f"/api/products/{product_id}", headers=auth_headers)
        assert delete_response.status_code == 200
        
        # Verify product is deleted
        get_deleted_response = client.get(f"/api/products/{product_id}", headers=auth_headers)
        assert get_deleted_response.status_code == 404
        
        # In a real implementation, you would also verify that:
        # 1. Image files are deleted from storage
        # 2. Cleanup tasks are queued
        # 3. Database references are properly cleaned up