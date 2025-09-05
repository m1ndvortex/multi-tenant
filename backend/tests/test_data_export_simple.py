"""
Simple tests for data export functionality
"""

import pytest
import json
import tempfile
from pathlib import Path
from datetime import datetime, timezone, timedelta
from unittest.mock import patch, MagicMock
from sqlalchemy.orm import Session

from app.models.tenant import Tenant, TenantStatus
from app.models.user import User, UserRole
from app.models.customer import Customer
from app.models.product import Product, ProductCategory
from app.models.backup import DataExportLog, ExportFormat, ExportType, ExportStatus
from app.services.data_export_service import DataExportService
from app.tasks.data_export_tasks import create_data_export, cleanup_expired_exports


class TestDataExportService:
    """Test data export service functionality"""
    
    def test_get_customers_data(self, db_session: Session, test_tenant: Tenant):
        """Test getting customer data for export"""
        # Create test customers
        customers = []
        for i in range(2):
            customer = Customer(
                tenant_id=test_tenant.id,
                name=f"Test Customer {i+1}",
                email=f"customer{i+1}@test.com",
                phone=f"123456789{i}",
                address=f"Address {i+1}",
                tags=["tag1", "tag2"],
                total_debt=100.50 * (i+1)
            )
            db_session.add(customer)
            customers.append(customer)
        
        db_session.commit()
        
        # Test export service
        export_service = DataExportService(db_session)
        data = export_service.get_customers_data(str(test_tenant.id))
        
        assert len(data) == 2
        assert data[0]["name"] == "Test Customer 1"
        assert data[0]["email"] == "customer1@test.com"
        assert data[0]["total_debt"] == 100.50
        assert data[0]["tags"] == ["tag1", "tag2"]
    
    def test_get_products_data(self, db_session: Session, test_tenant: Tenant):
        """Test getting product data for export"""
        # Create test category
        category = ProductCategory(
            tenant_id=test_tenant.id,
            name="Electronics"
        )
        db_session.add(category)
        db_session.commit()
        
        # Create test products
        products = []
        for i in range(2):
            product = Product(
                tenant_id=test_tenant.id,
                name=f"Test Product {i+1}",
                description=f"Description {i+1}",
                category_id=category.id,
                selling_price=50.25 * (i+1),
                cost_price=30.15 * (i+1),
                stock_quantity=10 * (i+1),
                images=["image1.jpg", "image2.jpg"]
            )
            db_session.add(product)
            products.append(product)
        
        db_session.commit()
        
        # Test export service
        export_service = DataExportService(db_session)
        data = export_service.get_products_data(str(test_tenant.id))
        
        assert len(data) == 2
        assert data[0]["name"] == "Test Product 1"
        assert data[0]["selling_price"] == 50.25
        assert data[0]["images"] == ["image1.jpg", "image2.jpg"]
    
    def test_export_table_to_csv(self, db_session: Session):
        """Test CSV export functionality"""
        export_service = DataExportService(db_session)
        
        # Test data
        test_data = [
            {"id": "1", "name": "Test 1", "value": 100.50, "created_at": datetime.now()},
            {"id": "2", "name": "Test 2", "value": 200.75, "created_at": datetime.now()}
        ]
        
        # Create temporary file
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as temp_file:
            temp_path = Path(temp_file.name)
        
        try:
            # Export to CSV
            record_count = export_service.export_table_to_csv("test_table", test_data, temp_path)
            
            assert record_count == 2
            assert temp_path.exists()
            
            # Read and verify CSV content
            with open(temp_path, 'r', encoding='utf-8') as f:
                content = f.read()
                assert "Test 1" in content
                assert "100.5" in content
                assert "Test 2" in content
                assert "200.75" in content
        
        finally:
            # Cleanup
            if temp_path.exists():
                temp_path.unlink()
    
    def test_export_table_to_json(self, db_session: Session):
        """Test JSON export functionality"""
        export_service = DataExportService(db_session)
        
        # Test data
        test_data = [
            {"id": "1", "name": "Test 1", "value": 100.50},
            {"id": "2", "name": "Test 2", "value": 200.75}
        ]
        
        # Create temporary file
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as temp_file:
            temp_path = Path(temp_file.name)
        
        try:
            # Export to JSON
            record_count = export_service.export_table_to_json("test_table", test_data, temp_path)
            
            assert record_count == 2
            assert temp_path.exists()
            
            # Read and verify JSON content
            with open(temp_path, 'r', encoding='utf-8') as f:
                content = json.load(f)
                assert content["table"] == "test_table"
                assert content["record_count"] == 2
                assert len(content["data"]) == 2
                assert content["data"][0]["name"] == "Test 1"
                assert content["data"][0]["value"] == 100.50
        
        finally:
            # Cleanup
            if temp_path.exists():
                temp_path.unlink()
    
    def test_list_tenant_exports(self, db_session: Session, test_tenant: Tenant):
        """Test listing tenant exports"""
        export_service = DataExportService(db_session)
        
        # Create test user
        test_user = User(
            tenant_id=test_tenant.id,
            email="testuser@example.com",
            first_name="Test",
            last_name="User",
            password_hash="dummy_hash",
            role=UserRole.ADMIN,
            is_active=True
        )
        db_session.add(test_user)
        db_session.commit()
        
        # Create test export logs with different timestamps
        import time
        export_logs = []
        for i in range(3):
            export_log = DataExportLog(
                tenant_id=test_tenant.id,
                initiated_by=test_user.id,
                export_name=f"test_export_{i+1}",
                export_format=ExportFormat.CSV,
                export_type=ExportType.MANUAL,
                status=ExportStatus.COMPLETED,
                total_records=100 * (i+1),
                file_size=1000 * (i+1),
                compressed_size=500 * (i+1)
            )
            db_session.add(export_log)
            export_logs.append(export_log)
            db_session.flush()  # Flush to get the ID and timestamp
            time.sleep(0.01)  # Small delay to ensure different timestamps
        
        db_session.commit()
        
        # List exports
        exports = export_service.list_tenant_exports(str(test_tenant.id))
        
        assert len(exports) == 3
        # Check that all exports are present
        export_names = [export["export_name"] for export in exports]
        assert "test_export_1" in export_names
        assert "test_export_2" in export_names
        assert "test_export_3" in export_names
        
        # Check format and status of first export
        assert exports[0]["export_format"] == "csv"
        assert exports[0]["status"] == "completed"
    
    def test_get_export_status(self, db_session: Session, test_tenant: Tenant):
        """Test getting export status"""
        export_service = DataExportService(db_session)
        
        # Create test user
        test_user = User(
            tenant_id=test_tenant.id,
            email="testuser2@example.com",
            first_name="Test",
            last_name="User 2",
            password_hash="dummy_hash",
            role=UserRole.ADMIN,
            is_active=True
        )
        db_session.add(test_user)
        db_session.commit()
        
        # Create test export log
        export_log = DataExportLog(
            tenant_id=test_tenant.id,
            initiated_by=test_user.id,
            export_name="test_export",
            export_format=ExportFormat.JSON,
            export_type=ExportType.MANUAL,
            status=ExportStatus.COMPLETED,
            total_records=150,
            file_size=2000,
            compressed_size=1000,
            checksum="test_checksum"
        )
        db_session.add(export_log)
        db_session.commit()
        
        # Get export status
        status = export_service.get_export_status(str(export_log.id), str(test_tenant.id))
        
        assert status is not None
        assert status["export_name"] == "test_export"
        assert status["export_format"] == "json"
        assert status["status"] == "completed"
        assert status["total_records"] == 150
        assert status["checksum"] == "test_checksum"
    
    def test_cleanup_expired_exports(self, db_session: Session, test_tenant: Tenant):
        """Test cleanup of expired exports"""
        export_service = DataExportService(db_session)
        
        # Create test user
        test_user = User(
            tenant_id=test_tenant.id,
            email="testuser3@example.com",
            first_name="Test",
            last_name="User 3",
            password_hash="dummy_hash",
            role=UserRole.ADMIN,
            is_active=True
        )
        db_session.add(test_user)
        db_session.commit()
        
        # Create expired export
        expired_export = DataExportLog(
            tenant_id=test_tenant.id,
            initiated_by=test_user.id,
            export_name="expired_export",
            export_format=ExportFormat.CSV,
            export_type=ExportType.MANUAL,
            status=ExportStatus.COMPLETED,
            download_expires_at=datetime.now(timezone.utc) - timedelta(hours=1),
            local_file_path="/tmp/expired_file.zip"
        )
        db_session.add(expired_export)
        
        # Create non-expired export
        active_export = DataExportLog(
            tenant_id=test_tenant.id,
            initiated_by=test_user.id,
            export_name="active_export",
            export_format=ExportFormat.CSV,
            export_type=ExportType.MANUAL,
            status=ExportStatus.COMPLETED,
            download_expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
            local_file_path="/tmp/active_file.zip"
        )
        db_session.add(active_export)
        db_session.commit()
        
        # Mock file operations
        with patch('pathlib.Path.exists', return_value=True), \
             patch('pathlib.Path.unlink') as mock_unlink:
            
            # Run cleanup
            cleaned_count = export_service.cleanup_expired_exports()
            
            assert cleaned_count == 1
            mock_unlink.assert_called_once()
            
            # Verify database was updated
            db_session.refresh(expired_export)
            assert expired_export.local_file_path is None


class TestDataExportTasks:
    """Test data export Celery tasks"""
    
    @patch('app.services.data_export_service.DataExportService.create_data_export')
    @patch('app.tasks.data_export_tasks.current_task')
    def test_create_data_export_task(self, mock_current_task, mock_create_export, db_session: Session):
        """Test create data export Celery task"""
        # Mock the current task
        mock_current_task.request.id = "test_task_id"
        mock_current_task.update_state = MagicMock()
        
        # Mock the export service method
        mock_create_export.return_value = {
            "status": "success",
            "export_id": "test_export_id",
            "tenant_id": "test_tenant_id",
            "total_records": 100
        }
        
        # Execute task
        result = create_data_export(
            tenant_id="test_tenant_id",
            user_id="test_user_id",
            export_format="csv",
            export_type="manual",
            tables=["customers"]
        )
        
        assert result["status"] == "success"
        assert result["export_id"] == "test_export_id"
        assert result["total_records"] == 100
        
        # Verify service was called with correct parameters
        mock_create_export.assert_called_once()
        call_args = mock_create_export.call_args
        assert call_args[1]["tenant_id"] == "test_tenant_id"
        assert call_args[1]["user_id"] == "test_user_id"
        assert call_args[1]["export_format"] == ExportFormat.CSV
        assert call_args[1]["export_type"] == ExportType.MANUAL
        assert call_args[1]["tables"] == ["customers"]
    
    @patch('app.services.data_export_service.DataExportService.cleanup_expired_exports')
    def test_cleanup_expired_exports_task(self, mock_cleanup, db_session: Session):
        """Test cleanup expired exports Celery task"""
        # Mock the cleanup method
        mock_cleanup.return_value = 3
        
        # Execute task
        result = cleanup_expired_exports()
        
        assert result["status"] == "success"
        assert result["cleaned_files"] == 3
        assert "Cleaned up 3 expired export files" in result["message"]
        
        mock_cleanup.assert_called_once()


class TestDataExportIntegration:
    """Integration tests for data export functionality"""
    
    def test_multi_tenant_isolation(self, db_session: Session):
        """Test that exports are properly isolated between tenants"""
        # Create two tenants with required email field
        tenant1 = Tenant(
            name="Tenant 1", 
            domain="tenant1.test", 
            email="tenant1@test.com",
            status=TenantStatus.ACTIVE
        )
        tenant2 = Tenant(
            name="Tenant 2", 
            domain="tenant2.test", 
            email="tenant2@test.com",
            status=TenantStatus.ACTIVE
        )
        db_session.add_all([tenant1, tenant2])
        db_session.commit()
        
        # Create customers for each tenant
        customer1 = Customer(tenant_id=tenant1.id, name="Customer 1", email="c1@tenant1.test")
        customer2 = Customer(tenant_id=tenant2.id, name="Customer 2", email="c2@tenant2.test")
        db_session.add_all([customer1, customer2])
        db_session.commit()
        
        # Test export service
        export_service = DataExportService(db_session)
        
        # Get customers for tenant 1
        tenant1_customers = export_service.get_customers_data(str(tenant1.id))
        assert len(tenant1_customers) == 1
        assert tenant1_customers[0]["name"] == "Customer 1"
        
        # Get customers for tenant 2
        tenant2_customers = export_service.get_customers_data(str(tenant2.id))
        assert len(tenant2_customers) == 1
        assert tenant2_customers[0]["name"] == "Customer 2"
        
        # Verify no cross-tenant data leakage
        assert tenant1_customers[0]["email"] != tenant2_customers[0]["email"]
    
    def test_large_dataset_export(self, db_session: Session, test_tenant: Tenant):
        """Test export with large dataset"""
        # Create large number of customers
        customers = []
        for i in range(50):  # Reduced from 100 for faster testing
            customer = Customer(
                tenant_id=test_tenant.id,
                name=f"Customer {i+1:03d}",
                email=f"customer{i+1:03d}@test.com",
                total_debt=100.00 * (i+1)
            )
            customers.append(customer)
        
        db_session.add_all(customers)
        db_session.commit()
        
        # Test export
        export_service = DataExportService(db_session)
        data = export_service.get_customers_data(str(test_tenant.id))
        
        assert len(data) == 50
        assert data[0]["name"] == "Customer 001"
        assert data[49]["name"] == "Customer 050"
        assert data[49]["total_debt"] == 5000.00
    
    def test_export_with_special_characters(self, db_session: Session, test_tenant: Tenant):
        """Test export with special characters and Persian text"""
        # Create customer with Persian name and special characters
        customer = Customer(
            tenant_id=test_tenant.id,
            name="مشتری تست با کاراکترهای خاص",
            email="test@example.com",
            address="آدرس: خیابان ولیعصر، پلاک ۱۲۳",
            tags=["تگ فارسی", "special-chars!@#$%"]
        )
        db_session.add(customer)
        db_session.commit()
        
        # Test export service
        export_service = DataExportService(db_session)
        data = export_service.get_customers_data(str(test_tenant.id))
        
        assert len(data) == 1
        assert "مشتری تست" in data[0]["name"]
        assert "ولیعصر" in data[0]["address"]
        assert "تگ فارسی" in data[0]["tags"]
        assert "special-chars!@#$%" in data[0]["tags"]