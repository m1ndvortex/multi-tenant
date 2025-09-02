"""
Comprehensive tests for the Individual Tenant Backup System
Tests backup creation, encryption, dual-cloud upload, and integrity verification
Using REAL database and API endpoints for production-ready testing
"""

import pytest
import tempfile
import os
from pathlib import Path
from unittest.mock import Mock, patch, MagicMock, call
from datetime import datetime, timezone
import gzip
import hashlib
import uuid

from sqlalchemy.orm import Session
from fastapi.testclient import TestClient

from app.main import app
from app.core.database import get_db
from app.models.tenant import Tenant, TenantStatus, SubscriptionType
from app.models.backup import BackupLog, BackupType, BackupStatus
from app.models.user import User, UserRole
from app.services.backup_service import BackupService
from app.services.cloud_storage_service import CloudStorageService
from app.tasks.backup_tasks import backup_tenant_data, backup_all_tenants, verify_backup_integrity


class TestBackupService:
    """Test cases for BackupService"""
    
    @pytest.fixture
    def backup_service(self, db_session):
        """Create BackupService instance for testing"""
        return BackupService(db_session)
    
    @pytest.fixture
    def test_tenant(self, db_session):
        """Create a test tenant"""
        tenant = Tenant(
            name="Test Tenant",
            email="test@example.com",
            subscription_type=SubscriptionType.PRO,
            status=TenantStatus.ACTIVE
        )
        db_session.add(tenant)
        db_session.commit()
        db_session.refresh(tenant)
        return tenant
    
    def test_generate_encryption_key(self, backup_service):
        """Test encryption key generation"""
        tenant_id = "test-tenant-123"
        
        # Generate key
        key1 = backup_service.generate_encryption_key(tenant_id)
        key2 = backup_service.generate_encryption_key(tenant_id)
        
        # Keys should be consistent for same tenant
        assert key1 == key2
        assert len(key1) == 44  # Base64 encoded 32-byte key
        
        # Different tenant should have different key
        key3 = backup_service.generate_encryption_key("different-tenant")
        assert key1 != key3
    
    def test_encrypt_decrypt_file(self, backup_service):
        """Test file encryption and decryption"""
        tenant_id = "test-tenant-123"
        test_content = b"This is test backup data for encryption testing"
        
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            
            # Create test file
            original_file = temp_path / "test_backup.sql"
            with open(original_file, 'wb') as f:
                f.write(test_content)
            
            # Encrypt file
            encrypted_file = backup_service.encrypt_file(original_file, tenant_id)
            assert encrypted_file.exists()
            assert encrypted_file.suffix == '.enc'
            
            # Verify encrypted content is different
            with open(encrypted_file, 'rb') as f:
                encrypted_content = f.read()
            assert encrypted_content != test_content
            
            # Decrypt file
            decrypted_file = temp_path / "decrypted_backup.sql"
            result_file = backup_service.decrypt_file(encrypted_file, tenant_id, decrypted_file)
            
            # Verify decrypted content matches original
            with open(result_file, 'rb') as f:
                decrypted_content = f.read()
            assert decrypted_content == test_content
    
    def test_compress_file(self, backup_service):
        """Test file compression"""
        test_content = b"This is test data for compression. " * 100  # Repeatable content
        
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            
            # Create test file
            original_file = temp_path / "test_backup.sql"
            with open(original_file, 'wb') as f:
                f.write(test_content)
            
            original_size = original_file.stat().st_size
            
            # Compress file
            compressed_file = backup_service.compress_file(original_file)
            assert compressed_file.exists()
            assert compressed_file.suffix == '.gz'
            
            compressed_size = compressed_file.stat().st_size
            assert compressed_size < original_size  # Should be smaller
            
            # Verify compressed content can be decompressed
            with gzip.open(compressed_file, 'rb') as f:
                decompressed_content = f.read()
            assert decompressed_content == test_content
    
    def test_calculate_checksum(self, backup_service):
        """Test checksum calculation"""
        test_content = b"This is test data for checksum calculation"
        
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            
            # Create test file
            test_file = temp_path / "test_file.txt"
            with open(test_file, 'wb') as f:
                f.write(test_content)
            
            # Calculate checksum
            checksum = backup_service.calculate_checksum(test_file)
            
            # Verify checksum format and consistency
            assert len(checksum) == 64  # SHA-256 hex digest
            assert all(c in '0123456789abcdef' for c in checksum)
            
            # Same file should produce same checksum
            checksum2 = backup_service.calculate_checksum(test_file)
            assert checksum == checksum2
            
            # Verify against manual calculation
            expected_checksum = hashlib.sha256(test_content).hexdigest()
            assert checksum == expected_checksum
    
    @patch('app.services.backup_service.subprocess.run')
    def test_create_tenant_sql_dump(self, mock_subprocess, backup_service, test_tenant):
        """Test SQL dump creation for tenant"""
        # Mock successful pg_dump execution
        mock_result = Mock()
        mock_result.returncode = 0
        mock_result.stderr = ""
        mock_subprocess.return_value = mock_result
        
        # Create a mock dump file
        with tempfile.TemporaryDirectory() as temp_dir:
            backup_service.temp_dir = Path(temp_dir)
            
            # Create mock dump file that pg_dump would create
            def create_mock_dump(*args, **kwargs):
                # Find the --file argument in the command
                cmd_args = args[0]
                dump_file = None
                for i, arg in enumerate(cmd_args):
                    if arg.startswith('--file='):
                        dump_file = Path(arg.split('=', 1)[1])
                        break
                
                if not dump_file:
                    raise ValueError("No --file argument found in pg_dump command")
                
                # Create mock SQL dump content
                with open(dump_file, 'w') as f:
                    f.write("-- PostgreSQL database dump\n")
                    f.write("-- Tenant specific data\n")
                    f.write(f"-- Tenant ID: {test_tenant.id}\n")
                    f.write("CREATE TABLE test_table (id INTEGER);\n")
                    f.write("INSERT INTO test_table VALUES (1);\n")
                
                return mock_result
            
            mock_subprocess.side_effect = create_mock_dump
            
            # Test SQL dump creation
            dump_path = backup_service.create_tenant_sql_dump(str(test_tenant.id))
            
            # Verify dump file was created
            assert dump_path.exists()
            assert dump_path.stat().st_size > 0
            assert "tenant_" in dump_path.name
            assert dump_path.suffix == '.sql'
            
            # Verify pg_dump was called with correct parameters
            mock_subprocess.assert_called_once()
            call_args = mock_subprocess.call_args[0][0]
            assert "pg_dump" in call_args
            # Check for --file argument in the command
            file_arg_found = any(arg.startswith('--file=') for arg in call_args)
            assert file_arg_found
    
    @patch('app.services.backup_service.BackupService.create_tenant_sql_dump')
    @patch('app.services.cloud_storage_service.CloudStorageService.upload_to_b2')
    @patch('app.services.cloud_storage_service.CloudStorageService.upload_to_r2')
    def test_backup_tenant_success(self, mock_r2_upload, mock_b2_upload, mock_sql_dump, 
                                 backup_service, test_tenant, db_session):
        """Test successful tenant backup with dual-cloud upload"""
        # Setup mocks
        test_content = b"Mock SQL dump content for testing"
        
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            backup_service.temp_dir = temp_path
            
            # Create mock SQL dump file
            mock_dump_file = temp_path / "mock_dump.sql"
            with open(mock_dump_file, 'wb') as f:
                f.write(test_content)
            
            mock_sql_dump.return_value = mock_dump_file
            mock_b2_upload.return_value = "s3://securesyntax/tenant_123_backup.sql.gz.enc"
            mock_r2_upload.return_value = "s3://hesaabplus-backups/tenant_123_backup.sql.gz.enc"
            
            # Perform backup
            result = backup_service.backup_tenant(str(test_tenant.id))
            
            # Verify result
            assert result["status"] == "success"
            assert result["tenant_id"] == str(test_tenant.id)
            assert "backup_id" in result
            assert "backup_name" in result
            assert result["file_size"] == len(test_content)
            assert "checksum" in result
            assert len(result["storage_locations"]) == 2
            
            # Verify backup log was created
            backup_log = db_session.query(BackupLog).filter(
                BackupLog.id == result["backup_id"]
            ).first()
            assert backup_log is not None
            assert backup_log.status == BackupStatus.COMPLETED
            assert backup_log.tenant_id == test_tenant.id
            assert backup_log.backup_type == BackupType.TENANT_DAILY
            
            # Verify cloud uploads were called
            mock_b2_upload.assert_called_once()
            mock_r2_upload.assert_called_once()
    
    @patch('app.services.backup_service.BackupService.create_tenant_sql_dump')
    @patch('app.services.cloud_storage_service.CloudStorageService.upload_to_b2')
    @patch('app.services.cloud_storage_service.CloudStorageService.upload_to_r2')
    def test_backup_tenant_partial_failure(self, mock_r2_upload, mock_b2_upload, mock_sql_dump,
                                         backup_service, test_tenant, db_session):
        """Test tenant backup with one cloud provider failing"""
        test_content = b"Mock SQL dump content for testing"
        
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            backup_service.temp_dir = temp_path
            
            # Create mock SQL dump file
            mock_dump_file = temp_path / "mock_dump.sql"
            with open(mock_dump_file, 'wb') as f:
                f.write(test_content)
            
            mock_sql_dump.return_value = mock_dump_file
            mock_b2_upload.return_value = "s3://securesyntax/tenant_123_backup.sql.gz.enc"
            mock_r2_upload.side_effect = Exception("R2 upload failed")
            
            # Perform backup (should succeed with one provider)
            result = backup_service.backup_tenant(str(test_tenant.id))
            
            # Verify result
            assert result["status"] == "success"
            assert len(result["storage_locations"]) == 1
            assert result["storage_locations"][0]["provider"] == "backblaze_b2"
    
    def test_backup_tenant_complete_failure(self, backup_service, test_tenant, db_session):
        """Test tenant backup with complete failure"""
        with patch('app.services.backup_service.BackupService.create_tenant_sql_dump') as mock_sql_dump:
            mock_sql_dump.side_effect = Exception("SQL dump failed")
            
            # Perform backup (should fail)
            with pytest.raises(Exception, match="SQL dump failed"):
                backup_service.backup_tenant(str(test_tenant.id))
            
            # Verify backup log shows failure
            backup_log = db_session.query(BackupLog).filter(
                BackupLog.tenant_id == test_tenant.id,
                BackupLog.status == BackupStatus.FAILED
            ).first()
            assert backup_log is not None
            assert "SQL dump failed" in backup_log.error_message
    
    def test_list_tenant_backups(self, backup_service, test_tenant, db_session):
        """Test listing tenant backups"""
        # Create test backup logs with proper timestamps for ordering
        now = datetime.now(timezone.utc)
        
        backup1 = BackupLog(
            backup_type=BackupType.TENANT_DAILY,
            tenant_id=test_tenant.id,
            backup_name="tenant_123_20240101_120000",
            status=BackupStatus.COMPLETED,
            file_size=1024,
            compressed_size=512,
            checksum="abc123",
            storage_locations=[{"provider": "backblaze_b2", "location": "s3://test/backup1"}],
            created_at=now.replace(day=1)  # Earlier date
        )
        backup2 = BackupLog(
            backup_type=BackupType.TENANT_DAILY,
            tenant_id=test_tenant.id,
            backup_name="tenant_123_20240102_120000",
            status=BackupStatus.COMPLETED,
            file_size=2048,
            compressed_size=1024,
            checksum="def456",
            storage_locations=[{"provider": "backblaze_b2", "location": "s3://test/backup2"}],
            created_at=now.replace(day=2)  # Later date
        )
        
        db_session.add_all([backup1, backup2])
        db_session.commit()
        
        # List backups
        backups = backup_service.list_tenant_backups(str(test_tenant.id))
        
        # Verify results - should be ordered by created_at desc (most recent first)
        assert len(backups) == 2
        assert backups[0]["backup_name"] == "tenant_123_20240102_120000"  # Most recent first
        assert backups[1]["backup_name"] == "tenant_123_20240101_120000"
    
    def test_get_backup_info(self, backup_service, test_tenant, db_session):
        """Test getting backup information"""
        # Create test backup log
        backup = BackupLog(
            backup_type=BackupType.TENANT_DAILY,
            tenant_id=test_tenant.id,
            backup_name="tenant_123_20240101_120000",
            status=BackupStatus.COMPLETED,
            file_size=1024,
            compressed_size=512,
            checksum="abc123"
        )
        db_session.add(backup)
        db_session.commit()
        
        # Get backup info
        info = backup_service.get_backup_info(str(backup.id))
        
        # Verify info
        assert info is not None
        assert info["backup_id"] == str(backup.id)
        assert info["tenant_id"] == str(test_tenant.id)
        assert info["backup_name"] == "tenant_123_20240101_120000"
        assert info["status"] == "completed"
    
    @patch('app.services.cloud_storage_service.CloudStorageService.download_from_b2')
    def test_verify_backup_integrity_success(self, mock_download, backup_service, test_tenant, db_session):
        """Test successful backup integrity verification"""
        test_content = b"Test backup content for integrity verification"
        expected_checksum = hashlib.sha256(test_content).hexdigest()
        
        # Create test backup log
        backup = BackupLog(
            backup_type=BackupType.TENANT_DAILY,
            tenant_id=test_tenant.id,
            backup_name="tenant_123_20240101_120000",
            status=BackupStatus.COMPLETED,
            checksum=expected_checksum,
            storage_locations=[{"provider": "backblaze_b2", "location": "s3://test/backup"}]
        )
        db_session.add(backup)
        db_session.commit()
        
        # Mock download to create temporary file with test content
        def mock_download_func(location, local_path):
            with open(local_path, 'wb') as f:
                f.write(test_content)
            return local_path
        
        mock_download.side_effect = mock_download_func
        
        # Verify backup integrity
        is_valid = backup_service.verify_backup_integrity(str(backup.id), "backblaze_b2")
        
        # Verify result
        assert is_valid is True
        mock_download.assert_called_once()


class TestCloudStorageService:
    """Test cases for CloudStorageService"""
    
    @pytest.fixture
    def cloud_storage(self):
        """Create CloudStorageService instance for testing"""
        return CloudStorageService()
    
    @patch('boto3.client')
    def test_upload_to_b2_success(self, mock_boto3_client, cloud_storage):
        """Test successful upload to Backblaze B2"""
        # Mock S3 client
        mock_client = Mock()
        mock_boto3_client.return_value = mock_client
        cloud_storage.b2_client = mock_client
        
        test_content = b"Test backup content"
        
        with tempfile.NamedTemporaryFile() as temp_file:
            temp_file.write(test_content)
            temp_file.flush()
            temp_path = Path(temp_file.name)
            
            # Test upload
            result = cloud_storage.upload_to_b2(temp_path, "test_backup.sql.gz.enc")
            
            # Verify result
            assert result.startswith("s3://")
            assert "test_backup.sql.gz.enc" in result
            mock_client.upload_fileobj.assert_called_once()
    
    @patch('boto3.client')
    def test_upload_to_r2_success(self, mock_boto3_client, cloud_storage):
        """Test successful upload to Cloudflare R2"""
        # Mock S3 client
        mock_client = Mock()
        mock_boto3_client.return_value = mock_client
        cloud_storage.r2_client = mock_client
        
        test_content = b"Test backup content"
        
        with tempfile.NamedTemporaryFile() as temp_file:
            temp_file.write(test_content)
            temp_file.flush()
            temp_path = Path(temp_file.name)
            
            # Test upload
            result = cloud_storage.upload_to_r2(temp_path, "test_backup.sql.gz.enc")
            
            # Verify result
            assert result.startswith("s3://")
            assert "test_backup.sql.gz.enc" in result
            mock_client.upload_fileobj.assert_called_once()
    
    def test_get_storage_usage(self, cloud_storage):
        """Test storage usage statistics"""
        with patch.object(cloud_storage, 'list_b2_objects') as mock_b2_list, \
             patch.object(cloud_storage, 'list_r2_objects') as mock_r2_list:
            
            # Mock object lists
            mock_b2_list.return_value = [
                {"key": "backup1.sql.gz.enc", "size": 1024},
                {"key": "backup2.sql.gz.enc", "size": 2048}
            ]
            mock_r2_list.return_value = [
                {"key": "backup1.sql.gz.enc", "size": 1024},
                {"key": "backup2.sql.gz.enc", "size": 2048}
            ]
            
            # Set clients as available
            cloud_storage.b2_client = Mock()
            cloud_storage.r2_client = Mock()
            
            # Get usage stats
            usage = cloud_storage.get_storage_usage()
            
            # Verify results
            assert usage["backblaze_b2"]["available"] is True
            assert usage["backblaze_b2"]["object_count"] == 2
            assert usage["backblaze_b2"]["total_size"] == 3072
            
            assert usage["cloudflare_r2"]["available"] is True
            assert usage["cloudflare_r2"]["object_count"] == 2
            assert usage["cloudflare_r2"]["total_size"] == 3072


class TestBackupTasks:
    """Test cases for Celery backup tasks"""
    
    @patch('app.tasks.backup_tasks.BackupService')
    @patch('app.tasks.backup_tasks.SessionLocal')
    def test_backup_tenant_data_task_success(self, mock_session, mock_backup_service):
        """Test successful tenant backup task"""
        # Mock database session
        mock_db = Mock()
        mock_session.return_value = mock_db
        
        # Mock backup service
        mock_service = Mock()
        mock_backup_service.return_value = mock_service
        mock_service.backup_tenant.return_value = {
            "status": "success",
            "backup_id": "backup-123",
            "tenant_id": "tenant-123"
        }
        
        # Execute task
        result = backup_tenant_data("tenant-123")
        
        # Verify result
        assert result["status"] == "success"
        assert result["tenant_id"] == "tenant-123"
        mock_service.backup_tenant.assert_called_once_with("tenant-123")
    
    @patch('app.tasks.backup_tasks.BackupService')
    @patch('app.tasks.backup_tasks.SessionLocal')
    def test_backup_all_tenants_task_success(self, mock_session, mock_backup_service):
        """Test successful all tenants backup task"""
        # Mock database session and query
        mock_db = Mock()
        mock_session.return_value = mock_db
        
        # Mock tenants
        mock_tenant1 = Mock()
        mock_tenant1.id = "tenant-1"
        mock_tenant1.name = "Tenant 1"
        mock_tenant2 = Mock()
        mock_tenant2.id = "tenant-2"
        mock_tenant2.name = "Tenant 2"
        
        mock_query = Mock()
        mock_query.filter.return_value = mock_query
        mock_query.all.return_value = [mock_tenant1, mock_tenant2]
        mock_db.query.return_value = mock_query
        
        # Mock backup service
        mock_service = Mock()
        mock_backup_service.return_value = mock_service
        mock_service.backup_tenant.return_value = {"backup_id": "backup-123"}
        
        # Execute task
        result = backup_all_tenants()
        
        # Verify result
        assert result["status"] == "completed"
        assert result["total_tenants"] == 2
        assert result["successful_backups"] == 2
        assert result["failed_backups"] == 0
        assert mock_service.backup_tenant.call_count == 2


class TestBackupAPI:
    """Test cases for Backup API endpoints using REAL database and API"""
    
    @pytest.fixture
    def super_admin_user(self, db_session):
        """Create a super admin user for testing"""
        user = User(
            email="admin@hesaabplus.com",
            first_name="Super",
            last_name="Admin",
            role=UserRole.OWNER,  # Use OWNER role for super admin
            is_active=True,
            is_super_admin=True,
            tenant_id=None  # Super admin has no tenant
        )
        user.set_password("admin123")
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
        return user
    
    @pytest.fixture
    def super_admin_token(self, super_admin_user):
        """Create super admin JWT token for testing"""
        from app.core.auth import create_access_token
        return create_access_token(
            data={
                "user_id": str(super_admin_user.id), 
                "email": super_admin_user.email,
                "is_super_admin": True
            }
        )
    
    @patch('app.api.backup.backup_tenant_data.delay')
    def test_create_tenant_backup_endpoint(self, mock_task, client, super_admin_token, db_session):
        """Test create tenant backup API endpoint with real database"""
        # Create test tenant in real database
        tenant = Tenant(
            name="Test Tenant API",
            email="test-api@example.com",
            status=TenantStatus.ACTIVE,
            subscription_type=SubscriptionType.PRO
        )
        db_session.add(tenant)
        db_session.commit()
        db_session.refresh(tenant)
        
        # Mock Celery task
        mock_task_result = Mock()
        mock_task_result.id = "task-123"
        mock_task.return_value = mock_task_result
        
        # Make API request
        response = client.post(
            f"/api/backup/tenant/{tenant.id}",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        
        # Verify response
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "started"
        assert data["task_id"] == "task-123"
        assert data["tenant_id"] == str(tenant.id)
        assert "Test Tenant API" in data["message"]
    
    def test_list_tenant_backups_endpoint(self, client, super_admin_token, db_session):
        """Test list tenant backups API endpoint with real database"""
        # Create test tenant in real database
        tenant = Tenant(
            name="Test Tenant List",
            email="test-list@example.com",
            status=TenantStatus.ACTIVE,
            subscription_type=SubscriptionType.PRO
        )
        db_session.add(tenant)
        db_session.commit()
        db_session.refresh(tenant)
        
        # Create test backup in real database
        backup = BackupLog(
            backup_type=BackupType.TENANT_DAILY,
            tenant_id=tenant.id,
            backup_name="tenant_api_test_20240101_120000",
            status=BackupStatus.COMPLETED,
            file_size=1024,
            compressed_size=512,
            checksum="abc123def456",
            storage_locations=[{"provider": "backblaze_b2", "location": "s3://test/backup1"}]
        )
        db_session.add(backup)
        db_session.commit()
        
        # Make API request
        response = client.get(
            f"/api/backup/tenant/{tenant.id}",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        
        # Verify response
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert data["tenant_id"] == str(tenant.id)
        assert data["tenant_name"] == "Test Tenant List"
        assert len(data["backups"]) == 1
        assert data["backups"][0]["backup_name"] == "tenant_api_test_20240101_120000"
        assert data["backups"][0]["file_size"] == 1024
        assert data["backups"][0]["checksum"] == "abc123def456"
    
    def test_get_backup_info_endpoint(self, client, super_admin_token, db_session):
        """Test get backup info API endpoint with real database"""
        # Create test tenant
        tenant = Tenant(
            name="Test Tenant Info",
            email="test-info@example.com",
            status=TenantStatus.ACTIVE
        )
        db_session.add(tenant)
        db_session.commit()
        
        # Create test backup
        backup = BackupLog(
            backup_type=BackupType.TENANT_DAILY,
            tenant_id=tenant.id,
            backup_name="tenant_info_test_20240101_120000",
            status=BackupStatus.COMPLETED,
            file_size=2048,
            compressed_size=1024,
            checksum="info123test456"
        )
        db_session.add(backup)
        db_session.commit()
        db_session.refresh(backup)
        
        # Make API request
        response = client.get(
            f"/api/backup/info/{backup.id}",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        
        # Verify response
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert data["backup"]["backup_id"] == str(backup.id)
        assert data["backup"]["tenant_id"] == str(tenant.id)
        assert data["backup"]["backup_name"] == "tenant_info_test_20240101_120000"
        assert data["backup"]["status"] == "completed"
        assert data["backup"]["file_size"] == 2048
    
    @patch('app.api.backup.CloudStorageService')
    def test_get_storage_usage_endpoint(self, mock_cloud_storage, client, super_admin_token):
        """Test get storage usage API endpoint"""
        # Mock cloud storage service
        mock_service = Mock()
        mock_cloud_storage.return_value = mock_service
        mock_service.get_storage_usage.return_value = {
            "backblaze_b2": {"available": True, "object_count": 10, "total_size": 1024000},
            "cloudflare_r2": {"available": True, "object_count": 10, "total_size": 1024000}
        }
        
        # Make API request
        response = client.get(
            "/api/backup/storage/usage",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        
        # Verify response
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert "storage_usage" in data
        assert data["storage_usage"]["backblaze_b2"]["available"] is True
        assert data["storage_usage"]["backblaze_b2"]["object_count"] == 10
        assert data["storage_usage"]["backblaze_b2"]["total_size"] == 1024000
    
    @patch('app.api.backup.verify_backup_integrity.delay')
    def test_verify_backup_endpoint(self, mock_task, client, super_admin_token, db_session):
        """Test verify backup API endpoint with real database"""
        # Create test tenant and backup
        tenant = Tenant(
            name="Test Tenant Verify",
            email="test-verify@example.com",
            status=TenantStatus.ACTIVE
        )
        db_session.add(tenant)
        db_session.commit()
        
        backup = BackupLog(
            backup_type=BackupType.TENANT_DAILY,
            tenant_id=tenant.id,
            backup_name="tenant_verify_test_20240101_120000",
            status=BackupStatus.COMPLETED,
            checksum="verify123test456",
            storage_locations=[{"provider": "backblaze_b2", "location": "s3://test/verify_backup"}]
        )
        db_session.add(backup)
        db_session.commit()
        db_session.refresh(backup)
        
        # Mock Celery task
        mock_task_result = Mock()
        mock_task_result.id = "verify-task-123"
        mock_task.return_value = mock_task_result
        
        # Make API request
        response = client.post(
            f"/api/backup/verify/{backup.id}?storage_provider=backblaze_b2",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        
        # Verify response
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "started"
        assert data["task_id"] == "verify-task-123"
        assert data["backup_id"] == str(backup.id)
        assert data["storage_provider"] == "backblaze_b2"
    
    def test_unauthorized_access(self, client, db_session):
        """Test that backup endpoints require super admin authentication"""
        # Create test tenant
        tenant = Tenant(
            name="Test Tenant Unauthorized",
            email="test-unauth@example.com",
            status=TenantStatus.ACTIVE
        )
        db_session.add(tenant)
        db_session.commit()
        
        # Try to access without authentication
        response = client.post(f"/api/backup/tenant/{tenant.id}")
        assert response.status_code == 403  # FastAPI returns 403 for missing auth
        
        response = client.get(f"/api/backup/tenant/{tenant.id}")
        assert response.status_code == 403
        
        response = client.get("/api/backup/storage/usage")
        assert response.status_code == 403


class TestRealDatabaseIntegration:
    """Integration tests using real PostgreSQL database"""
    
    def test_backup_service_with_real_database(self, db_session):
        """Test BackupService with real database operations"""
        # Create real tenant in database
        tenant = Tenant(
            name="Real DB Test Tenant",
            email="realdb@example.com",
            status=TenantStatus.ACTIVE,
            subscription_type=SubscriptionType.PRO
        )
        db_session.add(tenant)
        db_session.commit()
        db_session.refresh(tenant)
        
        # Initialize backup service with real database session
        backup_service = BackupService(db_session)
        
        # Test encryption key generation
        key1 = backup_service.generate_encryption_key(str(tenant.id))
        key2 = backup_service.generate_encryption_key(str(tenant.id))
        assert key1 == key2  # Should be consistent
        
        # Test file operations with larger content for better compression
        test_content = b"Real database backup test content. " * 100  # Larger content for compression
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            
            # Test file creation and encryption
            test_file = temp_path / "test_backup.sql"
            with open(test_file, 'wb') as f:
                f.write(test_content)
            
            # Test compression
            compressed_file = backup_service.compress_file(test_file)
            assert compressed_file.exists()
            # For larger repetitive content, compression should work
            assert compressed_file.stat().st_size < test_file.stat().st_size
            
            # Test encryption
            encrypted_file = backup_service.encrypt_file(compressed_file, str(tenant.id))
            assert encrypted_file.exists()
            assert encrypted_file.suffix == '.enc'
            
            # Test checksum calculation
            checksum = backup_service.calculate_checksum(encrypted_file)
            assert len(checksum) == 64  # SHA-256 hex digest
            
            # Test decryption
            decrypted_file = temp_path / "decrypted.sql.gz"
            backup_service.decrypt_file(encrypted_file, str(tenant.id), decrypted_file)
            assert decrypted_file.exists()
            
            # Verify decrypted content matches original compressed content
            with open(compressed_file, 'rb') as f1, open(decrypted_file, 'rb') as f2:
                assert f1.read() == f2.read()
    
    def test_backup_log_database_operations(self, db_session):
        """Test BackupLog model with real database operations"""
        # Create real tenant
        tenant = Tenant(
            name="Backup Log Test Tenant",
            email="backuplog@example.com",
            status=TenantStatus.ACTIVE
        )
        db_session.add(tenant)
        db_session.commit()
        db_session.refresh(tenant)
        
        # Create backup log
        backup_log = BackupLog(
            backup_type=BackupType.TENANT_DAILY,
            tenant_id=tenant.id,
            backup_name=f"tenant_{tenant.id}_test_backup",
            status=BackupStatus.PENDING
        )
        db_session.add(backup_log)
        db_session.commit()
        db_session.refresh(backup_log)
        
        # Test backup lifecycle methods
        backup_log.start_backup()
        assert backup_log.status == BackupStatus.IN_PROGRESS
        assert backup_log.started_at is not None
        
        # Complete backup
        storage_locations = [
            {"provider": "backblaze_b2", "location": "s3://test/backup1"},
            {"provider": "cloudflare_r2", "location": "s3://test/backup2"}
        ]
        backup_log.complete_backup(
            file_size=1024,
            compressed_size=512,
            checksum="test123checksum",
            storage_locations=storage_locations
        )
        
        assert backup_log.status == BackupStatus.COMPLETED
        assert backup_log.completed_at is not None
        assert backup_log.file_size == 1024
        assert backup_log.compressed_size == 512
        assert backup_log.checksum == "test123checksum"
        assert backup_log.storage_locations == storage_locations
        assert backup_log.duration_seconds is not None
        
        # Test properties
        assert backup_log.is_successful is True
        assert backup_log.compression_ratio > 0
        
        # Save to database and verify
        db_session.commit()
        
        # Query back from database
        retrieved_backup = db_session.query(BackupLog).filter(
            BackupLog.id == backup_log.id
        ).first()
        
        assert retrieved_backup is not None
        assert retrieved_backup.tenant_id == tenant.id
        assert retrieved_backup.status == BackupStatus.COMPLETED
        assert retrieved_backup.storage_locations == storage_locations
    
    def test_multiple_tenants_backup_listing(self, db_session):
        """Test backup listing with multiple tenants in real database"""
        # Create multiple tenants
        tenant1 = Tenant(name="Tenant 1", email="tenant1@example.com", status=TenantStatus.ACTIVE)
        tenant2 = Tenant(name="Tenant 2", email="tenant2@example.com", status=TenantStatus.ACTIVE)
        
        db_session.add_all([tenant1, tenant2])
        db_session.commit()
        db_session.refresh(tenant1)
        db_session.refresh(tenant2)
        
        # Create backups for each tenant
        now = datetime.now(timezone.utc)
        
        backups = [
            BackupLog(
                backup_type=BackupType.TENANT_DAILY,
                tenant_id=tenant1.id,
                backup_name="tenant1_backup_1",
                status=BackupStatus.COMPLETED,
                created_at=now.replace(hour=10)
            ),
            BackupLog(
                backup_type=BackupType.TENANT_DAILY,
                tenant_id=tenant1.id,
                backup_name="tenant1_backup_2",
                status=BackupStatus.COMPLETED,
                created_at=now.replace(hour=12)
            ),
            BackupLog(
                backup_type=BackupType.TENANT_DAILY,
                tenant_id=tenant2.id,
                backup_name="tenant2_backup_1",
                status=BackupStatus.COMPLETED,
                created_at=now.replace(hour=11)
            )
        ]
        
        db_session.add_all(backups)
        db_session.commit()
        
        # Test backup service listing
        backup_service = BackupService(db_session)
        
        # List backups for tenant1
        tenant1_backups = backup_service.list_tenant_backups(str(tenant1.id))
        assert len(tenant1_backups) == 2
        assert tenant1_backups[0]["backup_name"] == "tenant1_backup_2"  # Most recent first
        assert tenant1_backups[1]["backup_name"] == "tenant1_backup_1"
        
        # List backups for tenant2
        tenant2_backups = backup_service.list_tenant_backups(str(tenant2.id))
        assert len(tenant2_backups) == 1
        assert tenant2_backups[0]["backup_name"] == "tenant2_backup_1"
        
        # Verify tenant isolation
        assert len(tenant1_backups) != len(tenant2_backups)
        backup_names_1 = [b["backup_name"] for b in tenant1_backups]
        backup_names_2 = [b["backup_name"] for b in tenant2_backups]
        assert not set(backup_names_1).intersection(set(backup_names_2))


if __name__ == "__main__":
    pytest.main([__file__, "-v"])