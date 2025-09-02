"""
Comprehensive tests for disaster recovery system
"""

import pytest
import tempfile
import os
import json
import gzip
from pathlib import Path
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime, timezone, timedelta

from sqlalchemy.orm import Session
from fastapi.testclient import TestClient

from app.main import app
from app.core.database import get_db, SessionLocal
from app.services.disaster_recovery_service import DisasterRecoveryService
from app.models.backup import BackupLog, BackupType, BackupStatus
from app.models.tenant import Tenant, TenantStatus
from app.models.user import User, UserRole
from app.tasks.disaster_recovery_tasks import (
    create_disaster_recovery_backup,
    verify_disaster_recovery_backup,
    automated_disaster_recovery_verification,
    disaster_recovery_monitoring
)
from app.core.auth import create_access_token


class TestDisasterRecoveryService:
    """Test disaster recovery service functionality"""
    
    @pytest.fixture
    def db_session(self):
        """Create test database session"""
        db = SessionLocal()
        try:
            yield db
        finally:
            db.close()
    
    @pytest.fixture
    def disaster_recovery_service(self, db_session):
        """Create disaster recovery service instance"""
        return DisasterRecoveryService(db_session)
    
    @pytest.fixture
    def mock_cloud_storage(self):
        """Mock cloud storage service"""
        with patch('app.services.disaster_recovery_service.CloudStorageService') as mock:
            mock_instance = Mock()
            mock_instance.upload_to_b2.return_value = "s3://securesyntax/disaster_recovery/test_backup.tar.gz.enc"
            mock_instance.upload_to_r2.return_value = "s3://hesaabplus-backups/disaster_recovery/test_backup.tar.gz.enc"
            mock_instance.test_connectivity.return_value = {
                "backblaze_b2": {"available": True, "error": None},
                "cloudflare_r2": {"available": True, "error": None}
            }
            mock_instance.get_storage_usage.return_value = {
                "backblaze_b2": {"available": True, "object_count": 10, "total_size": 1000000},
                "cloudflare_r2": {"available": True, "object_count": 10, "total_size": 1000000}
            }
            mock.return_value = mock_instance
            yield mock_instance
    
    def test_generate_platform_encryption_key(self, disaster_recovery_service):
        """Test platform encryption key generation"""
        key1 = disaster_recovery_service.generate_platform_encryption_key()
        key2 = disaster_recovery_service.generate_platform_encryption_key()
        
        # Keys should be consistent
        assert key1 == key2
        assert len(key1) == 44  # Base64 encoded 32-byte key
        assert isinstance(key1, bytes)
    
    def test_encrypt_decrypt_file(self, disaster_recovery_service):
        """Test file encryption and decryption"""
        # Create test file
        with tempfile.NamedTemporaryFile(mode='w', delete=False) as f:
            f.write("Test disaster recovery data")
            test_file = Path(f.name)
        
        try:
            # Encrypt file
            encrypted_file = disaster_recovery_service.encrypt_file(test_file)
            assert encrypted_file.exists()
            assert encrypted_file.suffix == '.enc'
            
            # Decrypt file
            decrypted_file = test_file.with_suffix('.decrypted')
            disaster_recovery_service.decrypt_file(encrypted_file, decrypted_file)
            
            # Verify content
            with open(decrypted_file, 'r') as f:
                content = f.read()
            assert content == "Test disaster recovery data"
            
        finally:
            # Cleanup
            for file_path in [test_file, encrypted_file, decrypted_file]:
                if file_path.exists():
                    file_path.unlink()
    
    def test_compress_file(self, disaster_recovery_service):
        """Test file compression"""
        # Create test file with compressible content
        test_content = "This is test data for compression. " * 100
        with tempfile.NamedTemporaryFile(mode='w', delete=False) as f:
            f.write(test_content)
            test_file = Path(f.name)
        
        try:
            # Compress file
            compressed_file = disaster_recovery_service.compress_file(test_file)
            assert compressed_file.exists()
            assert compressed_file.suffix == '.gz'
            
            # Verify compression worked
            original_size = test_file.stat().st_size
            compressed_size = compressed_file.stat().st_size
            assert compressed_size < original_size
            
            # Verify content can be decompressed
            with gzip.open(compressed_file, 'rt') as f:
                decompressed_content = f.read()
            assert decompressed_content == test_content
            
        finally:
            # Cleanup
            for file_path in [test_file, compressed_file]:
                if file_path.exists():
                    file_path.unlink()
    
    def test_calculate_checksum(self, disaster_recovery_service):
        """Test checksum calculation"""
        # Create test file
        test_content = "Test checksum data"
        with tempfile.NamedTemporaryFile(mode='w', delete=False) as f:
            f.write(test_content)
            test_file = Path(f.name)
        
        try:
            # Calculate checksum
            checksum1 = disaster_recovery_service.calculate_checksum(test_file)
            checksum2 = disaster_recovery_service.calculate_checksum(test_file)
            
            # Checksums should be consistent
            assert checksum1 == checksum2
            assert len(checksum1) == 64  # SHA-256 hex digest
            assert isinstance(checksum1, str)
            
        finally:
            test_file.unlink()
    
    @patch('subprocess.run')
    def test_create_full_database_dump(self, mock_subprocess, disaster_recovery_service):
        """Test full database dump creation"""
        # Mock successful pg_dump
        mock_result = Mock()
        mock_result.returncode = 0
        mock_result.stderr = ""
        mock_subprocess.return_value = mock_result
        
        # Create mock dump file
        with patch('pathlib.Path.exists', return_value=True), \
             patch('pathlib.Path.stat') as mock_stat:
            mock_stat.return_value.st_size = 1000000  # 1MB
            
            dump_path = disaster_recovery_service.create_full_database_dump()
            
            assert dump_path.name.startswith("platform_full_backup_")
            assert dump_path.suffix == ".sql"
            
            # Verify pg_dump was called with correct parameters
            mock_subprocess.assert_called_once()
            call_args = mock_subprocess.call_args[0][0]
            assert "pg_dump" in call_args
            assert "--clean" in call_args
            assert "--create" in call_args
    
    @patch('subprocess.run')
    @patch('shutil.copy2')
    @patch('shutil.copytree')
    def test_create_container_configuration_backup(self, mock_copytree, mock_copy2, mock_subprocess, disaster_recovery_service):
        """Test container configuration backup creation"""
        # Mock successful tar command
        mock_result = Mock()
        mock_result.returncode = 0
        mock_result.stderr = ""
        mock_subprocess.return_value = mock_result
        
        # Mock file operations
        with patch('pathlib.Path.exists', return_value=True), \
             patch('pathlib.Path.is_file', return_value=True), \
             patch('pathlib.Path.is_dir', return_value=False), \
             patch('pathlib.Path.stat') as mock_stat, \
             patch('pathlib.Path.mkdir'), \
             patch('shutil.rmtree'), \
             patch('builtins.open', create=True) as mock_open:
            
            mock_stat.return_value.st_size = 500000  # 500KB
            mock_open.return_value.__enter__.return_value = Mock()
            
            config_path = disaster_recovery_service.create_container_configuration_backup()
            
            assert config_path.name.startswith("platform_config_")
            assert config_path.suffix == ".gz"
            
            # Verify tar was called
            mock_subprocess.assert_called_once()
            call_args = mock_subprocess.call_args[0][0]
            assert "tar" in call_args
            assert "-czf" in call_args
    
    @patch('app.services.disaster_recovery_service.DisasterRecoveryService.create_full_database_dump')
    @patch('app.services.disaster_recovery_service.DisasterRecoveryService.create_container_configuration_backup')
    @patch('subprocess.run')
    def test_create_disaster_recovery_backup(self, mock_subprocess, mock_config_backup, mock_db_dump, disaster_recovery_service, mock_cloud_storage):
        """Test complete disaster recovery backup creation"""
        # Mock database dump
        db_dump_path = Path("/tmp/test_db_dump.sql")
        mock_db_dump.return_value = db_dump_path
        
        # Mock config backup
        config_backup_path = Path("/tmp/test_config.tar.gz")
        mock_config_backup.return_value = config_backup_path
        
        # Mock tar command for combining
        mock_result = Mock()
        mock_result.returncode = 0
        mock_result.stderr = ""
        mock_subprocess.return_value = mock_result
        
        # Mock file operations
        with patch('pathlib.Path.exists', return_value=True), \
             patch('pathlib.Path.stat') as mock_stat, \
             patch('pathlib.Path.unlink'), \
             patch('builtins.open', create=True):
            
            mock_stat.return_value.st_size = 1000000  # 1MB
            
            result = disaster_recovery_service.create_disaster_recovery_backup()
            
            assert result["status"] == "success"
            assert "backup_id" in result
            assert "backup_name" in result
            assert result["total_original_size"] > 0
            assert result["compressed_size"] > 0
            assert "checksum" in result
            assert len(result["storage_locations"]) > 0
            
            # Verify cloud uploads were called
            mock_cloud_storage.upload_to_b2.assert_called_once()
            mock_cloud_storage.upload_to_r2.assert_called_once()
    
    def test_list_disaster_recovery_backups(self, disaster_recovery_service, db_session):
        """Test listing disaster recovery backups"""
        # Create test backup records
        backup1 = BackupLog(
            backup_type=BackupType.FULL_PLATFORM,
            backup_name="disaster_recovery_20241201_020000",
            status=BackupStatus.COMPLETED,
            file_size=1000000,
            compressed_size=500000,
            checksum="test_checksum_1"
        )
        backup2 = BackupLog(
            backup_type=BackupType.FULL_PLATFORM,
            backup_name="disaster_recovery_20241202_020000",
            status=BackupStatus.COMPLETED,
            file_size=1200000,
            compressed_size=600000,
            checksum="test_checksum_2"
        )
        
        db_session.add_all([backup1, backup2])
        db_session.commit()
        
        # List backups
        backups = disaster_recovery_service.list_disaster_recovery_backups()
        
        assert len(backups) == 2
        assert backups[0]["backup_name"] == "disaster_recovery_20241202_020000"  # Most recent first
        assert backups[1]["backup_name"] == "disaster_recovery_20241201_020000"
    
    def test_verify_disaster_recovery_backup(self, disaster_recovery_service, db_session, mock_cloud_storage):
        """Test disaster recovery backup verification"""
        # Create test backup record
        backup = BackupLog(
            backup_type=BackupType.FULL_PLATFORM,
            backup_name="disaster_recovery_test",
            status=BackupStatus.COMPLETED,
            checksum="test_checksum",
            storage_locations=[
                {"provider": "backblaze_b2", "location": "s3://securesyntax/test_backup.tar.gz.enc"}
            ]
        )
        db_session.add(backup)
        db_session.commit()
        
        # Mock download and checksum calculation
        with patch('app.services.disaster_recovery_service.DisasterRecoveryService.calculate_checksum', return_value="test_checksum"), \
             patch('pathlib.Path.unlink'):
            
            is_valid = disaster_recovery_service.verify_disaster_recovery_backup(str(backup.id), "backblaze_b2")
            
            assert is_valid is True
            mock_cloud_storage.download_from_b2.assert_called_once()


class TestDisasterRecoveryTasks:
    """Test disaster recovery Celery tasks"""
    
    @patch('app.tasks.disaster_recovery_tasks.DisasterRecoveryService')
    def test_create_disaster_recovery_backup_task(self, mock_service_class):
        """Test disaster recovery backup task"""
        # Mock service
        mock_service = Mock()
        mock_service.create_disaster_recovery_backup.return_value = {
            "status": "success",
            "backup_id": "test_backup_id",
            "backup_name": "disaster_recovery_test"
        }
        mock_service_class.return_value = mock_service
        
        # Mock database session
        with patch('app.tasks.disaster_recovery_tasks.SessionLocal') as mock_session:
            mock_db = Mock()
            mock_session.return_value = mock_db
            
            # Execute task
            result = create_disaster_recovery_backup.apply()
            
            assert result.successful()
            task_result = result.get()
            assert task_result["status"] == "success"
            assert task_result["backup_id"] == "test_backup_id"
    
    @patch('app.tasks.disaster_recovery_tasks.DisasterRecoveryService')
    def test_verify_disaster_recovery_backup_task(self, mock_service_class):
        """Test disaster recovery backup verification task"""
        # Mock service
        mock_service = Mock()
        mock_service.verify_disaster_recovery_backup.return_value = True
        mock_service_class.return_value = mock_service
        
        # Mock database session
        with patch('app.tasks.disaster_recovery_tasks.SessionLocal') as mock_session:
            mock_db = Mock()
            mock_session.return_value = mock_db
            
            # Execute task
            result = verify_disaster_recovery_backup.apply(args=["test_backup_id", "backblaze_b2"])
            
            assert result.successful()
            task_result = result.get()
            assert task_result["status"] == "success"
            assert task_result["is_valid"] is True
    
    @patch('app.tasks.disaster_recovery_tasks.DisasterRecoveryService')
    def test_automated_disaster_recovery_verification_task(self, mock_service_class):
        """Test automated disaster recovery verification task"""
        # Mock service
        mock_service = Mock()
        mock_service.list_disaster_recovery_backups.return_value = [
            {"backup_id": "backup1", "backup_name": "test_backup_1"},
            {"backup_id": "backup2", "backup_name": "test_backup_2"}
        ]
        mock_service.verify_disaster_recovery_backup.return_value = True
        mock_service_class.return_value = mock_service
        
        # Mock database session
        with patch('app.tasks.disaster_recovery_tasks.SessionLocal') as mock_session:
            mock_db = Mock()
            mock_session.return_value = mock_db
            
            # Execute task
            result = automated_disaster_recovery_verification.apply()
            
            assert result.successful()
            task_result = result.get()
            assert task_result["status"] == "completed"
            assert task_result["total_backups"] == 2
    
    @patch('app.tasks.disaster_recovery_tasks.DisasterRecoveryService')
    def test_disaster_recovery_monitoring_task(self, mock_service_class):
        """Test disaster recovery monitoring task"""
        # Mock service
        mock_service = Mock()
        mock_service.list_disaster_recovery_backups.return_value = [
            {
                "backup_id": "backup1",
                "backup_name": "test_backup_1",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "file_size": 1000000
            }
        ]
        mock_service.cloud_storage.test_connectivity.return_value = {
            "backblaze_b2": {"available": True, "error": None},
            "cloudflare_r2": {"available": True, "error": None}
        }
        mock_service.cloud_storage.get_storage_usage.return_value = {
            "backblaze_b2": {"available": True, "object_count": 10, "total_size": 1000000},
            "cloudflare_r2": {"available": True, "object_count": 10, "total_size": 1000000}
        }
        mock_service_class.return_value = mock_service
        
        # Mock database session
        with patch('app.tasks.disaster_recovery_tasks.SessionLocal') as mock_session:
            mock_db = Mock()
            mock_session.return_value = mock_db
            
            # Execute task
            result = disaster_recovery_monitoring.apply()
            
            assert result.successful()
            task_result = result.get()
            assert task_result["status"] == "success"
            assert "backup_metrics" in task_result
            assert "storage_connectivity" in task_result


class TestDisasterRecoveryAPI:
    """Test disaster recovery API endpoints"""
    
    @pytest.fixture
    def client(self):
        """Create test client"""
        return TestClient(app)
    
    @pytest.fixture
    def super_admin_token(self):
        """Create super admin token"""
        return create_access_token(
            data={"user_id": "test_admin", "is_super_admin": True},
            expires_delta=timedelta(hours=1)
        )
    
    def test_create_disaster_recovery_backup_endpoint(self, client, super_admin_token):
        """Test disaster recovery backup creation endpoint"""
        with patch('app.api.disaster_recovery.create_disaster_recovery_backup') as mock_task:
            mock_task.delay.return_value.id = "test_task_id"
            
            response = client.post(
                "/api/super-admin/disaster-recovery/backup",
                headers={"Authorization": f"Bearer {super_admin_token}"}
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "accepted"
            assert data["task_id"] == "test_task_id"
    
    def test_list_disaster_recovery_backups_endpoint(self, client, super_admin_token):
        """Test disaster recovery backups listing endpoint"""
        with patch('app.api.disaster_recovery.DisasterRecoveryService') as mock_service_class:
            mock_service = Mock()
            mock_service.list_disaster_recovery_backups.return_value = [
                {
                    "backup_id": "backup1",
                    "backup_name": "disaster_recovery_test",
                    "created_at": "2024-12-01T02:00:00Z",
                    "file_size": 1000000,
                    "compressed_size": 500000
                }
            ]
            mock_service_class.return_value = mock_service
            
            response = client.get(
                "/api/super-admin/disaster-recovery/backups",
                headers={"Authorization": f"Bearer {super_admin_token}"}
            )
            
            assert response.status_code == 200
            data = response.json()
            assert len(data) == 1
            assert data[0]["backup_id"] == "backup1"
    
    def test_verify_disaster_recovery_backup_endpoint(self, client, super_admin_token):
        """Test disaster recovery backup verification endpoint"""
        with patch('app.api.disaster_recovery.verify_disaster_recovery_backup') as mock_task:
            mock_task.delay.return_value.id = "test_verify_task_id"
            
            response = client.post(
                "/api/super-admin/disaster-recovery/verify/test_backup_id?storage_provider=backblaze_b2",
                headers={"Authorization": f"Bearer {super_admin_token}"}
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "accepted"
            assert data["task_id"] == "test_verify_task_id"
            assert data["backup_id"] == "test_backup_id"
    
    def test_get_storage_status_endpoint(self, client, super_admin_token):
        """Test storage status endpoint"""
        with patch('app.api.disaster_recovery.DisasterRecoveryService') as mock_service_class:
            mock_service = Mock()
            mock_service.cloud_storage.test_connectivity.return_value = {
                "backblaze_b2": {"available": True, "error": None},
                "cloudflare_r2": {"available": False, "error": "Not configured"}
            }
            mock_service.cloud_storage.get_storage_usage.return_value = {
                "backblaze_b2": {"available": True, "object_count": 10, "total_size": 1000000},
                "cloudflare_r2": {"available": False, "object_count": 0, "total_size": 0}
            }
            mock_service_class.return_value = mock_service
            
            response = client.get(
                "/api/super-admin/disaster-recovery/storage-status",
                headers={"Authorization": f"Bearer {super_admin_token}"}
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "success"
            assert data["connectivity"]["backblaze_b2"]["available"] is True
            assert data["connectivity"]["cloudflare_r2"]["available"] is False
    
    def test_health_check_endpoint(self, client, super_admin_token):
        """Test disaster recovery health check endpoint"""
        with patch('app.api.disaster_recovery.DisasterRecoveryService') as mock_service_class:
            mock_service = Mock()
            mock_service.list_disaster_recovery_backups.return_value = [
                {
                    "backup_id": "backup1",
                    "backup_name": "recent_backup",
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
            ]
            mock_service.cloud_storage.test_connectivity.return_value = {
                "backblaze_b2": {"available": True, "error": None},
                "cloudflare_r2": {"available": True, "error": None}
            }
            mock_service_class.return_value = mock_service
            
            response = client.get(
                "/api/super-admin/disaster-recovery/health",
                headers={"Authorization": f"Bearer {super_admin_token}"}
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "healthy"
            assert data["health_score"] == 100
            assert data["total_backups"] == 1
    
    def test_unauthorized_access(self, client):
        """Test unauthorized access to disaster recovery endpoints"""
        response = client.get("/api/super-admin/disaster-recovery/backups")
        assert response.status_code == 401
        
        response = client.post("/api/super-admin/disaster-recovery/backup")
        assert response.status_code == 401


class TestDisasterRecoveryIntegration:
    """Integration tests for disaster recovery system"""
    
    @pytest.fixture
    def db_session(self):
        """Create test database session"""
        db = SessionLocal()
        try:
            yield db
        finally:
            db.close()
    
    def test_end_to_end_backup_workflow(self, db_session):
        """Test complete backup workflow from creation to verification"""
        # This test would require real database and storage setup
        # For now, we'll test the workflow with mocks
        
        with patch('subprocess.run') as mock_subprocess, \
             patch('app.services.disaster_recovery_service.CloudStorageService') as mock_cloud_storage_class:
            
            # Mock successful operations
            mock_subprocess.return_value.returncode = 0
            mock_subprocess.return_value.stderr = ""
            
            mock_cloud_storage = Mock()
            mock_cloud_storage.upload_to_b2.return_value = "s3://securesyntax/test_backup.tar.gz.enc"
            mock_cloud_storage.upload_to_r2.return_value = "s3://hesaabplus-backups/test_backup.tar.gz.enc"
            mock_cloud_storage_class.return_value = mock_cloud_storage
            
            # Mock file operations
            with patch('pathlib.Path.exists', return_value=True), \
                 patch('pathlib.Path.stat') as mock_stat, \
                 patch('pathlib.Path.unlink'), \
                 patch('builtins.open', create=True), \
                 patch('shutil.rmtree'):
                
                mock_stat.return_value.st_size = 1000000
                
                # Create disaster recovery service
                dr_service = DisasterRecoveryService(db_session)
                
                # Create backup
                result = dr_service.create_disaster_recovery_backup()
                
                assert result["status"] == "success"
                backup_id = result["backup_id"]
                
                # Verify backup was logged in database
                backup_log = db_session.query(BackupLog).filter(BackupLog.id == backup_id).first()
                assert backup_log is not None
                assert backup_log.backup_type == BackupType.FULL_PLATFORM
                assert backup_log.status == BackupStatus.COMPLETED
                
                # Test backup listing
                backups = dr_service.list_disaster_recovery_backups()
                assert len(backups) == 1
                assert backups[0]["backup_id"] == backup_id
                
                # Test backup info retrieval
                backup_info = dr_service.get_disaster_recovery_backup_info(backup_id)
                assert backup_info is not None
                assert backup_info["backup_id"] == backup_id
    
    def test_backup_failure_handling(self, db_session):
        """Test backup failure scenarios"""
        with patch('subprocess.run') as mock_subprocess:
            # Mock failed pg_dump
            mock_subprocess.return_value.returncode = 1
            mock_subprocess.return_value.stderr = "pg_dump failed"
            
            dr_service = DisasterRecoveryService(db_session)
            
            # Attempt backup creation
            with pytest.raises(Exception, match="Full database dump failed"):
                dr_service.create_disaster_recovery_backup()
            
            # Verify failure was logged
            failed_backups = db_session.query(BackupLog).filter(
                BackupLog.backup_type == BackupType.FULL_PLATFORM,
                BackupLog.status == BackupStatus.FAILED
            ).all()
            
            assert len(failed_backups) == 1
            assert "Full database dump failed" in failed_backups[0].error_message
    
    def test_storage_provider_failover(self, db_session):
        """Test backup with storage provider failures"""
        with patch('subprocess.run') as mock_subprocess, \
             patch('app.services.disaster_recovery_service.CloudStorageService') as mock_cloud_storage_class:
            
            # Mock successful database operations
            mock_subprocess.return_value.returncode = 0
            mock_subprocess.return_value.stderr = ""
            
            # Mock storage service with B2 failure, R2 success
            mock_cloud_storage = Mock()
            mock_cloud_storage.upload_to_b2.side_effect = Exception("B2 upload failed")
            mock_cloud_storage.upload_to_r2.return_value = "s3://hesaabplus-backups/test_backup.tar.gz.enc"
            mock_cloud_storage_class.return_value = mock_cloud_storage
            
            # Mock file operations
            with patch('pathlib.Path.exists', return_value=True), \
                 patch('pathlib.Path.stat') as mock_stat, \
                 patch('pathlib.Path.unlink'), \
                 patch('builtins.open', create=True), \
                 patch('shutil.rmtree'):
                
                mock_stat.return_value.st_size = 1000000
                
                dr_service = DisasterRecoveryService(db_session)
                
                # Create backup (should succeed with R2 only)
                result = dr_service.create_disaster_recovery_backup()
                
                assert result["status"] == "success"
                assert len(result["storage_locations"]) == 1
                assert result["storage_locations"][0]["provider"] == "cloudflare_r2"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])