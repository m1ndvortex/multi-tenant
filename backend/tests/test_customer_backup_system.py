"""
Comprehensive tests for customer self-backup system
"""

import pytest
import tempfile
import os
from datetime import datetime, timezone, timedelta
from pathlib import Path
from unittest.mock import patch, MagicMock
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.models.tenant import Tenant, SubscriptionType
from app.models.user import User, UserRole
from app.models.backup import CustomerBackupLog, BackupStatus
from app.services.customer_backup_service import CustomerBackupService
from app.tasks.customer_backup_tasks import create_customer_backup_task, cleanup_expired_customer_backups_task


class TestCustomerBackupService:
    """Test customer backup service functionality"""
    
    @pytest.fixture
    def db_session(self):
        """Create test database session"""
        db = SessionLocal()
        try:
            yield db
        finally:
            db.close()
    
    @pytest.fixture
    def test_tenant(self, db_session: Session):
        """Create test tenant"""
        tenant = Tenant(
            name="Test Company",
            domain="test.example.com",
            email="test@company.com",
            subscription_type=SubscriptionType.PRO,
            is_active=True
        )
        db_session.add(tenant)
        db_session.commit()
        db_session.refresh(tenant)
        return tenant
    
    @pytest.fixture
    def test_user(self, db_session: Session, test_tenant: Tenant):
        """Create test user"""
        user = User(
            tenant_id=test_tenant.id,
            email="test@example.com",
            password_hash="hashed_password",
            first_name="Test",
            last_name="User",
            role=UserRole.ADMIN,
            is_active=True
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
        return user
    
    @pytest.fixture
    def backup_service(self, db_session: Session):
        """Create backup service instance"""
        return CustomerBackupService(db_session)
    
    def test_check_daily_limit_no_existing_backup(self, backup_service: CustomerBackupService, test_tenant: Tenant):
        """Test daily limit check when no backup exists today"""
        result = backup_service.check_daily_limit(str(test_tenant.id))
        assert result is True
    
    def test_check_daily_limit_existing_backup_today(self, backup_service: CustomerBackupService, 
                                                   test_tenant: Tenant, test_user: User, db_session: Session):
        """Test daily limit check when backup already exists today"""
        # Create existing backup for today
        existing_backup = CustomerBackupLog(
            tenant_id=test_tenant.id,
            initiated_by=test_user.id,
            backup_name="existing_backup",
            status=BackupStatus.COMPLETED,
            started_at=datetime.now(timezone.utc)
        )
        db_session.add(existing_backup)
        db_session.commit()
        
        result = backup_service.check_daily_limit(str(test_tenant.id))
        assert result is False
    
    def test_check_daily_limit_existing_backup_yesterday(self, backup_service: CustomerBackupService,
                                                       test_tenant: Tenant, test_user: User, db_session: Session):
        """Test daily limit check when backup exists from yesterday"""
        # Create existing backup for yesterday
        yesterday = datetime.now(timezone.utc) - timedelta(days=1)
        existing_backup = CustomerBackupLog(
            tenant_id=test_tenant.id,
            initiated_by=test_user.id,
            backup_name="yesterday_backup",
            status=BackupStatus.COMPLETED,
            started_at=yesterday
        )
        db_session.add(existing_backup)
        db_session.commit()
        
        result = backup_service.check_daily_limit(str(test_tenant.id))
        assert result is True
    
    def test_generate_download_token(self, backup_service: CustomerBackupService):
        """Test download token generation"""
        token = backup_service.generate_download_token()
        assert isinstance(token, str)
        assert len(token) > 20  # Should be a reasonably long token
        
        # Generate another token and ensure they're different
        token2 = backup_service.generate_download_token()
        assert token != token2
    
    def test_calculate_checksum(self, backup_service: CustomerBackupService):
        """Test file checksum calculation"""
        # Create temporary file with known content
        with tempfile.NamedTemporaryFile(mode='w', delete=False) as temp_file:
            temp_file.write("test content for checksum")
            temp_path = Path(temp_file.name)
        
        try:
            checksum = backup_service.calculate_checksum(temp_path)
            assert isinstance(checksum, str)
            assert len(checksum) == 64  # SHA-256 produces 64-character hex string
            
            # Calculate again and ensure it's the same
            checksum2 = backup_service.calculate_checksum(temp_path)
            assert checksum == checksum2
        finally:
            temp_path.unlink()
    
    def test_compress_file(self, backup_service: CustomerBackupService):
        """Test file compression"""
        # Create temporary file with content
        with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.sql') as temp_file:
            temp_file.write("SELECT * FROM test_table;\n" * 1000)  # Repeatable content for compression
            temp_path = Path(temp_file.name)
        
        try:
            compressed_path = backup_service.compress_file(temp_path)
            
            # Check compressed file exists and has .gz extension
            assert compressed_path.exists()
            assert compressed_path.suffix == '.gz'
            
            # Check compressed file is smaller than original
            original_size = temp_path.stat().st_size
            compressed_size = compressed_path.stat().st_size
            assert compressed_size < original_size
            
            compressed_path.unlink()
        finally:
            temp_path.unlink()
    
    def test_create_customer_backup_daily_limit_exceeded(self, backup_service: CustomerBackupService,
                                                       test_tenant: Tenant, test_user: User, db_session: Session):
        """Test customer backup creation when daily limit is exceeded"""
        # Create existing backup for today
        existing_backup = CustomerBackupLog(
            tenant_id=test_tenant.id,
            initiated_by=test_user.id,
            backup_name="existing_backup",
            status=BackupStatus.COMPLETED,
            started_at=datetime.now(timezone.utc)
        )
        db_session.add(existing_backup)
        db_session.commit()
        
        with pytest.raises(Exception) as exc_info:
            backup_service.create_customer_backup(str(test_tenant.id), str(test_user.id))
        
        assert "Daily backup limit reached" in str(exc_info.value)
    
    def test_create_customer_backup_tenant_not_found(self, backup_service: CustomerBackupService):
        """Test customer backup creation when tenant doesn't exist"""
        fake_tenant_id = "00000000-0000-0000-0000-000000000000"
        fake_user_id = "00000000-0000-0000-0000-000000000001"
        
        with pytest.raises(Exception) as exc_info:
            backup_service.create_customer_backup(fake_tenant_id, fake_user_id)
        
        assert "Tenant" in str(exc_info.value) and "not found" in str(exc_info.value)
    
    def test_create_customer_backup_user_not_found(self, backup_service: CustomerBackupService, 
                                                  test_tenant: Tenant):
        """Test customer backup creation when user doesn't exist"""
        fake_user_id = "00000000-0000-0000-0000-000000000001"
        
        with pytest.raises(Exception) as exc_info:
            backup_service.create_customer_backup(str(test_tenant.id), fake_user_id)
        
        assert "User" in str(exc_info.value) and "not found" in str(exc_info.value)
    
    def test_get_backup_file_path_invalid_token(self, backup_service: CustomerBackupService):
        """Test getting backup file path with invalid token"""
        result_path = backup_service.get_backup_file_path("invalid_token")
        assert result_path is None
    
    def test_list_customer_backups(self, backup_service: CustomerBackupService,
                                 test_tenant: Tenant, test_user: User, db_session: Session):
        """Test listing customer backups"""
        # Create multiple backup logs
        for i in range(3):
            backup_log = CustomerBackupLog(
                tenant_id=test_tenant.id,
                initiated_by=test_user.id,
                backup_name=f"test_backup_{i}",
                status=BackupStatus.COMPLETED,
                file_size=1000 + i,
                compressed_size=500 + i,
                checksum=f"checksum_{i}"
            )
            db_session.add(backup_log)
        db_session.commit()
        
        backups = backup_service.list_customer_backups(str(test_tenant.id))
        
        assert len(backups) == 3
        for backup in backups:
            assert "backup_id" in backup
            assert "backup_name" in backup
            assert "status" in backup
            assert backup["status"] == "completed"
    
    def test_get_backup_status(self, backup_service: CustomerBackupService,
                             test_tenant: Tenant, test_user: User, db_session: Session):
        """Test getting backup status"""
        backup_log = CustomerBackupLog(
            tenant_id=test_tenant.id,
            initiated_by=test_user.id,
            backup_name="test_backup",
            status=BackupStatus.COMPLETED,
            file_size=1000,
            compressed_size=500,
            checksum="test_checksum"
        )
        db_session.add(backup_log)
        db_session.commit()
        
        status = backup_service.get_backup_status(str(backup_log.id), str(test_tenant.id))
        
        assert status is not None
        assert status["backup_id"] == str(backup_log.id)
        assert status["status"] == "completed"
        assert status["file_size"] == 1000
        assert status["compressed_size"] == 500
        assert status["checksum"] == "test_checksum"
    
    def test_get_backup_status_not_found(self, backup_service: CustomerBackupService, test_tenant: Tenant):
        """Test getting backup status for non-existent backup"""
        fake_backup_id = "00000000-0000-0000-0000-000000000000"
        status = backup_service.get_backup_status(fake_backup_id, str(test_tenant.id))
        assert status is None


class TestCustomerBackupTasks:
    """Test customer backup Celery tasks"""
    
    @patch('app.tasks.customer_backup_tasks.SessionLocal')
    @patch.object(CustomerBackupService, 'create_customer_backup')
    def test_create_customer_backup_task_success(self, mock_create_backup, mock_session_local):
        """Test successful customer backup task execution"""
        # Mock database session
        mock_db = MagicMock()
        mock_session_local.return_value = mock_db
        
        # Mock successful backup creation
        mock_create_backup.return_value = {
            "status": "success",
            "backup_id": "test_backup_id",
            "tenant_id": "test_tenant_id",
            "download_token": "test_token"
        }
        
        # Execute task
        result = create_customer_backup_task("test_tenant_id", "test_user_id")
        
        # Verify result
        assert result["status"] == "success"
        assert result["backup_id"] == "test_backup_id"
        assert result["tenant_id"] == "test_tenant_id"
        
        # Verify service was called correctly
        mock_create_backup.assert_called_once_with("test_tenant_id", "test_user_id")
        
        # Verify database session was closed
        mock_db.close.assert_called_once()
    
    @patch('app.tasks.customer_backup_tasks.SessionLocal')
    @patch.object(CustomerBackupService, 'create_customer_backup')
    def test_create_customer_backup_task_failure(self, mock_create_backup, mock_session_local):
        """Test customer backup task failure handling"""
        # Mock database session
        mock_db = MagicMock()
        mock_session_local.return_value = mock_db
        
        # Mock backup creation failure
        mock_create_backup.side_effect = Exception("Backup creation failed")
        
        # Execute task and expect exception
        with pytest.raises(Exception) as exc_info:
            create_customer_backup_task("test_tenant_id", "test_user_id")
        
        assert "Backup creation failed" in str(exc_info.value)
        
        # Verify database session was closed even on failure
        mock_db.close.assert_called_once()
    
    @patch('app.tasks.customer_backup_tasks.SessionLocal')
    @patch.object(CustomerBackupService, 'cleanup_expired_backups')
    def test_cleanup_expired_customer_backups_task_success(self, mock_cleanup, mock_session_local):
        """Test successful cleanup task execution"""
        # Mock database session
        mock_db = MagicMock()
        mock_session_local.return_value = mock_db
        
        # Mock successful cleanup
        mock_cleanup.return_value = 5
        
        # Execute task
        result = cleanup_expired_customer_backups_task()
        
        # Verify result
        assert result["status"] == "success"
        assert result["cleaned_count"] == 5
        assert "Cleaned up 5 expired backup files" in result["message"]
        
        # Verify service was called
        mock_cleanup.assert_called_once()
        
        # Verify database session was closed
        mock_db.close.assert_called_once()


if __name__ == "__main__":
    pytest.main([__file__, "-v"])