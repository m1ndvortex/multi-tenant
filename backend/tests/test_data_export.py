"""
Comprehensive tests for data export functionality
"""

import pytest
import json
import tempfile
import zipfile
from pathlib import Path
from datetime import datetime, timezone, timedelta
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.core.database import get_db
from app.models.tenant import Tenant, TenantStatus
from app.models.user import User, UserRole
from app.models.customer import Customer
from app.models.product import Product
from app.models.invoice import Invoice, InvoiceType, InvoiceStatus
from app.models.invoice import InvoiceItem
from app.models.installment import Installment, InstallmentStatus
from app.models.backup import DataExportLog, ExportFormat, ExportType, ExportStatus, ExportSchedule
from app.services.data_export_service import DataExportService
from app.tasks.data_export_tasks import create_data_export, cleanup_expired_exports


class TestDataExportService:
    """Test data export service functionality"""
    
    def test_get_customers_data(self, db_session: Session, test_tenant: Tenant):
        """Test getting customer data for export"""
        # Create test customers
        customers = []
        for i in range(3):
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
        
        assert len(data) == 3
        assert data[0]["name"] == "Test Customer 1"
        assert data[0]["email"] == "customer1@test.com"
        assert data[0]["total_debt"] == 100.50
        assert data[0]["tags"] == ["tag1", "tag2"]
    
    def test_get_products_data(self, test_db: Session, sample_tenant: Tenant):
        """Test getting product data for export"""
        # Create test products
        products = []
        for i in range(2):
            product = Product(
                tenant_id=sample_tenant.id,
                name=f"Test Product {i+1}",
                description=f"Description {i+1}",
                category="Electronics",
                price=50.25 * (i+1),
                cost=30.15 * (i+1),
                stock_quantity=10 * (i+1),
                images=["image1.jpg", "image2.jpg"]
            )
            test_db.add(product)
            products.append(product)
        
        test_db.commit()
        
        # Test export service
        export_service = DataExportService(test_db)
        data = export_service.get_products_data(str(sample_tenant.id))
        
        assert len(data) == 2
        assert data[0]["name"] == "Test Product 1"
        assert data[0]["category"] == "Electronics"
        assert data[0]["price"] == 50.25
        assert data[0]["images"] == ["image1.jpg", "image2.jpg"]
    
    def test_get_invoices_data(self, test_db: Session, sample_tenant: Tenant, sample_customer: Customer, sample_product: Product):
        """Test getting invoice data for export"""
        # Create test invoice
        invoice = Invoice(
            tenant_id=sample_tenant.id,
            customer_id=sample_customer.id,
            invoice_number="INV-001",
            invoice_type=InvoiceType.GENERAL,
            subtotal=100.00,
            tax_amount=10.00,
            total_amount=110.00,
            status=InvoiceStatus.SENT
        )
        test_db.add(invoice)
        test_db.commit()
        
        # Create invoice items
        item = InvoiceItem(
            invoice_id=invoice.id,
            product_id=sample_product.id,
            description="Test Item",
            quantity=2,
            unit_price=50.00,
            line_total=100.00
        )
        test_db.add(item)
        test_db.commit()
        
        # Test export service
        export_service = DataExportService(test_db)
        data = export_service.get_invoices_data(str(sample_tenant.id))
        
        assert len(data) == 1
        assert data[0]["invoice_number"] == "INV-001"
        assert data[0]["invoice_type"] == "general"
        assert data[0]["total_amount"] == 110.00
        assert len(data[0]["items"]) == 1
        assert data[0]["items"][0]["description"] == "Test Item"
        assert data[0]["items"][0]["quantity"] == 2.0
    
    def test_export_table_to_csv(self, test_db: Session):
        """Test CSV export functionality"""
        export_service = DataExportService(test_db)
        
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
    
    def test_export_table_to_json(self, test_db: Session):
        """Test JSON export functionality"""
        export_service = DataExportService(test_db)
        
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
    
    def test_compress_archive(self, test_db: Session):
        """Test archive compression functionality"""
        export_service = DataExportService(test_db)
        
        # Create temporary files
        temp_files = []
        for i in range(2):
            temp_file = tempfile.NamedTemporaryFile(mode='w', suffix=f'.txt', delete=False)
            temp_file.write(f"Test content {i+1}")
            temp_file.close()
            temp_files.append(Path(temp_file.name))
        
        try:
            # Create archive
            archive_path = export_service.compress_archive(temp_files, "test_archive")
            
            assert archive_path.exists()
            assert archive_path.suffix == '.zip'
            
            # Verify archive contents
            with zipfile.ZipFile(archive_path, 'r') as zipf:
                file_list = zipf.namelist()
                assert len(file_list) == 2
                
                # Read content from archive
                for temp_file in temp_files:
                    assert temp_file.name in file_list
        
        finally:
            # Cleanup
            for temp_file in temp_files:
                if temp_file.exists():
                    temp_file.unlink()
            if 'archive_path' in locals() and archive_path.exists():
                archive_path.unlink()
    
    def test_create_data_export_csv(self, test_db: Session, sample_tenant: Tenant, sample_user: User, sample_customer: Customer, sample_product: Product):
        """Test complete data export in CSV format"""
        export_service = DataExportService(test_db)
        
        # Mock the temporary directory to use a test directory
        with patch.object(export_service, 'temp_dir') as mock_temp_dir:
            test_temp_dir = Path(tempfile.mkdtemp())
            mock_temp_dir.__truediv__ = lambda self, other: test_temp_dir / other
            mock_temp_dir.mkdir = MagicMock()
            
            try:
                # Create export
                result = export_service.create_data_export(
                    tenant_id=str(sample_tenant.id),
                    user_id=str(sample_user.id),
                    export_format=ExportFormat.CSV,
                    export_type=ExportType.MANUAL,
                    tables=["customers", "products"]
                )
                
                assert result["status"] == "success"
                assert result["tenant_id"] == str(sample_tenant.id)
                assert result["export_format"] == "csv"
                assert result["export_type"] == "manual"
                assert result["total_records"] >= 2  # At least customer and product
                assert "download_token" in result
                assert "checksum" in result
                
                # Verify export log was created
                export_log = test_db.query(DataExportLog).filter(
                    DataExportLog.id == result["export_id"]
                ).first()
                
                assert export_log is not None
                assert export_log.status == ExportStatus.COMPLETED
                assert export_log.export_format == ExportFormat.CSV
                assert export_log.tenant_id == sample_tenant.id
            
            finally:
                # Cleanup test directory
                import shutil
                if test_temp_dir.exists():
                    shutil.rmtree(test_temp_dir)
    
    def test_create_data_export_json(self, test_db: Session, sample_tenant: Tenant, sample_user: User, sample_customer: Customer, sample_product: Product):
        """Test complete data export in JSON format"""
        export_service = DataExportService(test_db)
        
        # Mock the temporary directory
        with patch.object(export_service, 'temp_dir') as mock_temp_dir:
            test_temp_dir = Path(tempfile.mkdtemp())
            mock_temp_dir.__truediv__ = lambda self, other: test_temp_dir / other
            mock_temp_dir.mkdir = MagicMock()
            
            try:
                # Create export
                result = export_service.create_data_export(
                    tenant_id=str(sample_tenant.id),
                    user_id=str(sample_user.id),
                    export_format=ExportFormat.JSON,
                    export_type=ExportType.MANUAL,
                    tables=["customers", "products"]
                )
                
                assert result["status"] == "success"
                assert result["export_format"] == "json"
                assert result["total_records"] >= 2
                
                # Verify export log
                export_log = test_db.query(DataExportLog).filter(
                    DataExportLog.id == result["export_id"]
                ).first()
                
                assert export_log.export_format == ExportFormat.JSON
            
            finally:
                # Cleanup
                import shutil
                if test_temp_dir.exists():
                    shutil.rmtree(test_temp_dir)
    
    def test_list_tenant_exports(self, test_db: Session, sample_tenant: Tenant, sample_user: User):
        """Test listing tenant exports"""
        export_service = DataExportService(test_db)
        
        # Create test export logs
        for i in range(3):
            export_log = DataExportLog(
                tenant_id=sample_tenant.id,
                initiated_by=sample_user.id,
                export_name=f"test_export_{i+1}",
                export_format=ExportFormat.CSV,
                export_type=ExportType.MANUAL,
                status=ExportStatus.COMPLETED,
                total_records=100 * (i+1),
                file_size=1000 * (i+1),
                compressed_size=500 * (i+1)
            )
            test_db.add(export_log)
        
        test_db.commit()
        
        # List exports
        exports = export_service.list_tenant_exports(str(sample_tenant.id))
        
        assert len(exports) == 3
        assert exports[0]["export_name"] == "test_export_3"  # Most recent first
        assert exports[0]["export_format"] == "csv"
        assert exports[0]["status"] == "completed"
    
    def test_get_export_status(self, test_db: Session, sample_tenant: Tenant, sample_user: User):
        """Test getting export status"""
        export_service = DataExportService(test_db)
        
        # Create test export log
        export_log = DataExportLog(
            tenant_id=sample_tenant.id,
            initiated_by=sample_user.id,
            export_name="test_export",
            export_format=ExportFormat.JSON,
            export_type=ExportType.MANUAL,
            status=ExportStatus.COMPLETED,
            total_records=150,
            file_size=2000,
            compressed_size=1000,
            checksum="test_checksum"
        )
        test_db.add(export_log)
        test_db.commit()
        
        # Get export status
        status = export_service.get_export_status(str(export_log.id), str(sample_tenant.id))
        
        assert status is not None
        assert status["export_name"] == "test_export"
        assert status["export_format"] == "json"
        assert status["status"] == "completed"
        assert status["total_records"] == 150
        assert status["checksum"] == "test_checksum"
    
    def test_cleanup_expired_exports(self, test_db: Session, sample_tenant: Tenant, sample_user: User):
        """Test cleanup of expired exports"""
        export_service = DataExportService(test_db)
        
        # Create expired export
        expired_export = DataExportLog(
            tenant_id=sample_tenant.id,
            initiated_by=sample_user.id,
            export_name="expired_export",
            export_format=ExportFormat.CSV,
            export_type=ExportType.MANUAL,
            status=ExportStatus.COMPLETED,
            download_expires_at=datetime.now(timezone.utc) - timedelta(hours=1),
            local_file_path="/tmp/expired_file.zip"
        )
        test_db.add(expired_export)
        
        # Create non-expired export
        active_export = DataExportLog(
            tenant_id=sample_tenant.id,
            initiated_by=sample_user.id,
            export_name="active_export",
            export_format=ExportFormat.CSV,
            export_type=ExportType.MANUAL,
            status=ExportStatus.COMPLETED,
            download_expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
            local_file_path="/tmp/active_file.zip"
        )
        test_db.add(active_export)
        test_db.commit()
        
        # Mock file operations
        with patch('pathlib.Path.exists', return_value=True), \
             patch('pathlib.Path.unlink') as mock_unlink:
            
            # Run cleanup
            cleaned_count = export_service.cleanup_expired_exports()
            
            assert cleaned_count == 1
            mock_unlink.assert_called_once()
            
            # Verify database was updated
            test_db.refresh(expired_export)
            assert expired_export.local_file_path is None


class TestDataExportAPI:
    """Test data export API endpoints"""
    
    def test_create_data_export_endpoint(self, client: TestClient, auth_headers: dict, sample_tenant: Tenant):
        """Test create data export API endpoint"""
        with patch('app.tasks.data_export_tasks.create_data_export.delay') as mock_task:
            mock_task.return_value.id = "test_task_id"
            
            response = client.post(
                "/api/data-export/create",
                json={
                    "export_format": "csv",
                    "export_type": "manual",
                    "tables": ["customers", "products"]
                },
                headers=auth_headers
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "started"
            assert data["export_format"] == "csv"
            assert data["export_type"] == "manual"
            assert data["export_id"] == "test_task_id"
            
            # Verify task was called
            mock_task.assert_called_once()
    
    def test_create_bulk_export_endpoint(self, client: TestClient, super_admin_headers: dict):
        """Test bulk data export API endpoint"""
        with patch('app.tasks.data_export_tasks.create_bulk_data_export.delay') as mock_task:
            mock_task.return_value.id = "bulk_task_id"
            
            response = client.post(
                "/api/data-export/bulk",
                json={
                    "tenant_ids": ["tenant1", "tenant2"],
                    "export_format": "json",
                    "export_type": "manual",
                    "tables": ["customers"]
                },
                headers=super_admin_headers
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "started"
            assert data["total_tenants"] == 2
            
            mock_task.assert_called_once()
    
    def test_get_export_status_endpoint(self, client: TestClient, auth_headers: dict, test_db: Session, sample_tenant: Tenant, sample_user: User):
        """Test get export status API endpoint"""
        # Create test export log
        export_log = DataExportLog(
            tenant_id=sample_tenant.id,
            initiated_by=sample_user.id,
            export_name="test_export",
            export_format=ExportFormat.CSV,
            export_type=ExportType.MANUAL,
            status=ExportStatus.COMPLETED,
            total_records=100
        )
        test_db.add(export_log)
        test_db.commit()
        
        response = client.get(
            f"/api/data-export/status/{export_log.id}",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["export_name"] == "test_export"
        assert data["export_format"] == "csv"
        assert data["status"] == "completed"
        assert data["total_records"] == 100
    
    def test_list_exports_endpoint(self, client: TestClient, auth_headers: dict, test_db: Session, sample_tenant: Tenant, sample_user: User):
        """Test list exports API endpoint"""
        # Create test export logs
        for i in range(2):
            export_log = DataExportLog(
                tenant_id=sample_tenant.id,
                initiated_by=sample_user.id,
                export_name=f"export_{i+1}",
                export_format=ExportFormat.JSON,
                export_type=ExportType.MANUAL,
                status=ExportStatus.COMPLETED
            )
            test_db.add(export_log)
        
        test_db.commit()
        
        response = client.get("/api/data-export/list", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 2
        assert len(data["exports"]) == 2
    
    def test_create_export_schedule_endpoint(self, client: TestClient, auth_headers: dict):
        """Test create export schedule API endpoint"""
        response = client.post(
            "/api/data-export/schedule",
            json={
                "name": "Daily Export",
                "description": "Daily automated export",
                "export_format": "json",
                "tables_to_export": ["customers", "products"],
                "cron_expression": "0 2 * * *",
                "timezone": "UTC",
                "is_active": True
            },
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Daily Export"
        assert data["export_format"] == "json"
        assert data["cron_expression"] == "0 2 * * *"
        assert data["is_active"] is True
    
    def test_list_export_schedules_endpoint(self, client: TestClient, auth_headers: dict, test_db: Session, sample_tenant: Tenant):
        """Test list export schedules API endpoint"""
        # Create test schedule
        schedule = ExportSchedule(
            tenant_id=sample_tenant.id,
            name="Test Schedule",
            export_format=ExportFormat.CSV,
            tables_to_export=["customers"],
            cron_expression="0 1 * * *",
            is_active=True
        )
        test_db.add(schedule)
        test_db.commit()
        
        response = client.get("/api/data-export/schedules", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert len(data["schedules"]) == 1
        assert data["schedules"][0]["name"] == "Test Schedule"
    
    def test_get_export_statistics_endpoint(self, client: TestClient, auth_headers: dict, test_db: Session, sample_tenant: Tenant, sample_user: User):
        """Test get export statistics API endpoint"""
        # Create test export logs
        for i in range(3):
            status = ExportStatus.COMPLETED if i < 2 else ExportStatus.FAILED
            export_log = DataExportLog(
                tenant_id=sample_tenant.id,
                initiated_by=sample_user.id,
                export_name=f"export_{i+1}",
                export_format=ExportFormat.CSV,
                export_type=ExportType.MANUAL,
                status=status,
                total_records=100 * (i+1) if status == ExportStatus.COMPLETED else 0,
                compressed_size=1000 * (i+1) if status == ExportStatus.COMPLETED else 0,
                duration_seconds=60 * (i+1) if status == ExportStatus.COMPLETED else None
            )
            test_db.add(export_log)
        
        test_db.commit()
        
        response = client.get("/api/data-export/stats", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["total_exports"] == 3
        assert data["successful_exports"] == 2
        assert data["failed_exports"] == 1
        assert data["total_records_exported"] == 300  # 100 + 200
        assert data["total_size_exported"] == 3000  # 1000 + 2000
        assert data["success_rate"] == pytest.approx(66.67, rel=1e-2)
        assert "csv" in data["exports_by_format"]
        assert "manual" in data["exports_by_type"]
    
    def test_cleanup_expired_exports_endpoint(self, client: TestClient, super_admin_headers: dict):
        """Test cleanup expired exports API endpoint"""
        with patch('app.tasks.data_export_tasks.cleanup_expired_exports.delay') as mock_task:
            mock_task.return_value.get.return_value = {
                "status": "success",
                "cleaned_files": 5,
                "message": "Cleaned up 5 expired export files"
            }
            
            response = client.post("/api/data-export/cleanup", headers=super_admin_headers)
            
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "success"
            assert data["cleaned_files"] == 5
            
            mock_task.assert_called_once()
    
    def test_unauthorized_access(self, client: TestClient):
        """Test unauthorized access to export endpoints"""
        # Test without authentication
        response = client.post("/api/data-export/create", json={"export_format": "csv"})
        assert response.status_code == 401
        
        response = client.get("/api/data-export/list")
        assert response.status_code == 401
    
    def test_invalid_export_format(self, client: TestClient, auth_headers: dict):
        """Test invalid export format"""
        response = client.post(
            "/api/data-export/create",
            json={
                "export_format": "invalid_format",
                "export_type": "manual"
            },
            headers=auth_headers
        )
        
        assert response.status_code == 422  # Validation error
    
    def test_invalid_tables(self, client: TestClient, auth_headers: dict):
        """Test invalid table names"""
        response = client.post(
            "/api/data-export/create",
            json={
                "export_format": "csv",
                "export_type": "manual",
                "tables": ["invalid_table", "customers"]
            },
            headers=auth_headers
        )
        
        assert response.status_code == 422  # Validation error


class TestDataExportTasks:
    """Test data export Celery tasks"""
    
    @patch('app.services.data_export_service.DataExportService.create_data_export')
    def test_create_data_export_task(self, mock_create_export, test_db: Session):
        """Test create data export Celery task"""
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
    def test_cleanup_expired_exports_task(self, mock_cleanup, test_db: Session):
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
    
    def test_complete_export_workflow(self, test_db: Session, sample_tenant: Tenant, sample_user: User):
        """Test complete export workflow from creation to download"""
        # Create test data
        customer = Customer(
            tenant_id=sample_tenant.id,
            name="Integration Test Customer",
            email="integration@test.com",
            total_debt=500.00
        )
        test_db.add(customer)
        
        product = Product(
            tenant_id=sample_tenant.id,
            name="Integration Test Product",
            price=100.00,
            stock_quantity=50
        )
        test_db.add(product)
        test_db.commit()
        
        # Create export
        export_service = DataExportService(test_db)
        
        with patch.object(export_service, 'temp_dir') as mock_temp_dir:
            test_temp_dir = Path(tempfile.mkdtemp())
            mock_temp_dir.__truediv__ = lambda self, other: test_temp_dir / other
            mock_temp_dir.mkdir = MagicMock()
            
            try:
                result = export_service.create_data_export(
                    tenant_id=str(sample_tenant.id),
                    user_id=str(sample_user.id),
                    export_format=ExportFormat.JSON,
                    export_type=ExportType.MANUAL,
                    tables=["customers", "products"]
                )
                
                # Verify export was created
                assert result["status"] == "success"
                assert result["total_records"] == 2
                
                # Verify export log
                export_log = test_db.query(DataExportLog).filter(
                    DataExportLog.id == result["export_id"]
                ).first()
                
                assert export_log.status == ExportStatus.COMPLETED
                assert export_log.total_records == 2
                assert export_log.download_token is not None
                
                # Test file retrieval
                file_path = export_service.get_export_file_path(export_log.download_token)
                assert file_path is not None
                
                # Mark as downloaded
                export_service.mark_export_downloaded(export_log.download_token)
                test_db.refresh(export_log)
                assert export_log.downloaded_at is not None
            
            finally:
                # Cleanup
                import shutil
                if test_temp_dir.exists():
                    shutil.rmtree(test_temp_dir)
    
    def test_multi_tenant_isolation(self, test_db: Session):
        """Test that exports are properly isolated between tenants"""
        # Create two tenants
        tenant1 = Tenant(name="Tenant 1", domain="tenant1.test", status=TenantStatus.ACTIVE)
        tenant2 = Tenant(name="Tenant 2", domain="tenant2.test", status=TenantStatus.ACTIVE)
        test_db.add_all([tenant1, tenant2])
        test_db.commit()
        
        # Create users for each tenant
        user1 = User(tenant_id=tenant1.id, email="user1@tenant1.test", password_hash="hash1", role=UserRole.ADMIN)
        user2 = User(tenant_id=tenant2.id, email="user2@tenant2.test", password_hash="hash2", role=UserRole.ADMIN)
        test_db.add_all([user1, user2])
        test_db.commit()
        
        # Create customers for each tenant
        customer1 = Customer(tenant_id=tenant1.id, name="Customer 1", email="c1@tenant1.test")
        customer2 = Customer(tenant_id=tenant2.id, name="Customer 2", email="c2@tenant2.test")
        test_db.add_all([customer1, customer2])
        test_db.commit()
        
        # Test export service
        export_service = DataExportService(test_db)
        
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
    
    def test_large_dataset_export(self, test_db: Session, sample_tenant: Tenant, sample_user: User):
        """Test export with large dataset"""
        # Create large number of customers
        customers = []
        for i in range(100):
            customer = Customer(
                tenant_id=sample_tenant.id,
                name=f"Customer {i+1:03d}",
                email=f"customer{i+1:03d}@test.com",
                total_debt=100.00 * (i+1)
            )
            customers.append(customer)
        
        test_db.add_all(customers)
        test_db.commit()
        
        # Test export
        export_service = DataExportService(test_db)
        data = export_service.get_customers_data(str(sample_tenant.id))
        
        assert len(data) == 100
        assert data[0]["name"] == "Customer 001"
        assert data[99]["name"] == "Customer 100"
        assert data[99]["total_debt"] == 10000.00
    
    def test_export_with_special_characters(self, test_db: Session, sample_tenant: Tenant, sample_user: User):
        """Test export with special characters and Persian text"""
        # Create customer with Persian name and special characters
        customer = Customer(
            tenant_id=sample_tenant.id,
            name="مشتری تست با کاراکترهای خاص",
            email="test@example.com",
            address="آدرس: خیابان ولیعصر، پلاک ۱۲۳",
            tags=["تگ فارسی", "special-chars!@#$%"]
        )
        test_db.add(customer)
        test_db.commit()
        
        # Test export service
        export_service = DataExportService(test_db)
        data = export_service.get_customers_data(str(sample_tenant.id))
        
        assert len(data) == 1
        assert "مشتری تست" in data[0]["name"]
        assert "ولیعصر" in data[0]["address"]
        assert "تگ فارسی" in data[0]["tags"]
        assert "special-chars!@#$%" in data[0]["tags"]