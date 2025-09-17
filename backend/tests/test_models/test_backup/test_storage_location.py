"""
Unit tests for StorageLocation model with real database operations
"""

import pytest
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from app.models.backup.storage_location import StorageLocation, StorageProvider


class TestStorageLocation:
    """Test StorageLocation model functionality"""
    
    def test_create_storage_location(self, db_session: Session):
        """Test creating a new storage location"""
        storage_location = StorageLocation(
            name="Primary R2 Storage",
            provider=StorageProvider.CLOUDFLARE_R2,
            description="Primary Cloudflare R2 storage for backups",
            endpoint="https://account.r2.cloudflarestorage.com",
            region="auto",
            bucket_name="hesaabplus-backups",
            access_key="encrypted_access_key",
            secret_key="encrypted_secret_key",
            is_primary=True,
            configuration={
                "max_concurrent_uploads": 5,
                "chunk_size_mb": 64,
                "timeout_seconds": 300
            }
        )
        
        db_session.add(storage_location)
        db_session.commit()
        db_session.refresh(storage_location)
        
        # Verify creation
        assert storage_location.id is not None
        assert storage_location.name == "Primary R2 Storage"
        assert storage_location.provider == StorageProvider.CLOUDFLARE_R2
        assert storage_location.description == "Primary Cloudflare R2 storage for backups"
        assert storage_location.endpoint == "https://account.r2.cloudflarestorage.com"
        assert storage_location.region == "auto"
        assert storage_location.bucket_name == "hesaabplus-backups"
        assert storage_location.access_key == "encrypted_access_key"
        assert storage_location.secret_key == "encrypted_secret_key"
        assert storage_location.is_active is True
        assert storage_location.is_primary is True
        assert storage_location.is_verified is False
        assert storage_location.total_backups == 0
        assert storage_location.total_size == 0
        assert storage_location.error_count == 0
        assert storage_location.encryption_enabled is True
        assert storage_location.configuration["max_concurrent_uploads"] == 5
    
    def test_create_backblaze_b2_storage(self, db_session: Session):
        """Test creating Backblaze B2 storage location"""
        storage_location = StorageLocation(
            name="Secondary B2 Storage",
            provider=StorageProvider.BACKBLAZE_B2,
            description="Secondary Backblaze B2 storage for redundancy",
            endpoint="https://s3.us-west-002.backblazeb2.com",
            region="us-west-002",
            bucket_name="hesaabplus-backup-secondary",
            access_key="b2_access_key",
            secret_key="b2_secret_key",
            is_primary=False,
            retention_days=90,
            max_backups=100,
            encryption_enabled=True,
            encryption_key_id="b2_encryption_key_001"
        )
        
        db_session.add(storage_location)
        db_session.commit()
        
        # Verify B2 specific configuration
        assert storage_location.provider == StorageProvider.BACKBLAZE_B2
        assert storage_location.region == "us-west-002"
        assert storage_location.is_primary is False
        assert storage_location.retention_days == 90
        assert storage_location.max_backups == 100
        assert storage_location.encryption_key_id == "b2_encryption_key_001"
    
    def test_update_usage_stats(self, db_session: Session):
        """Test updating usage statistics"""
        storage_location = StorageLocation(
            name="Test Storage",
            provider=StorageProvider.CLOUDFLARE_R2,
            bucket_name="test-bucket"
        )
        
        db_session.add(storage_location)
        db_session.commit()
        
        # Update usage stats
        backup_size = 1073741824  # 1GB
        storage_location.update_usage_stats(backup_size)
        db_session.commit()
        
        # Verify stats update
        assert storage_location.total_backups == 1
        assert storage_location.total_size == backup_size
        assert storage_location.last_backup_at is not None
        
        # Update again
        storage_location.update_usage_stats(backup_size)
        db_session.commit()
        
        assert storage_location.total_backups == 2
        assert storage_location.total_size == backup_size * 2
    
    def test_record_error(self, db_session: Session):
        """Test recording errors"""
        storage_location = StorageLocation(
            name="Test Storage",
            provider=StorageProvider.BACKBLAZE_B2,
            bucket_name="test-bucket",
            is_verified=True
        )
        
        db_session.add(storage_location)
        db_session.commit()
        
        # Record error
        error_message = "Connection timeout after 30 seconds"
        storage_location.record_error(error_message)
        db_session.commit()
        
        # Verify error recording
        assert storage_location.last_error == error_message
        assert storage_location.error_count == 1
        assert storage_location.is_verified is False
        
        # Record another error
        storage_location.record_error("Authentication failed")
        db_session.commit()
        
        assert storage_location.error_count == 2
        assert storage_location.last_error == "Authentication failed"
    
    def test_mark_verified(self, db_session: Session):
        """Test marking storage location as verified"""
        storage_location = StorageLocation(
            name="Test Storage",
            provider=StorageProvider.CLOUDFLARE_R2,
            bucket_name="test-bucket",
            is_verified=False,
            last_error="Previous error",
            error_count=3
        )
        
        db_session.add(storage_location)
        db_session.commit()
        
        # Mark as verified
        storage_location.mark_verified()
        db_session.commit()
        
        # Verify verification
        assert storage_location.is_verified is True
        assert storage_location.last_verified_at is not None
        assert storage_location.last_error is None
        # Note: error_count is not reset, it's historical data
        assert storage_location.error_count == 3
    
    def test_update_performance_metrics(self, db_session: Session):
        """Test updating performance metrics"""
        storage_location = StorageLocation(
            name="Test Storage",
            provider=StorageProvider.CLOUDFLARE_R2,
            bucket_name="test-bucket"
        )
        
        db_session.add(storage_location)
        db_session.commit()
        
        # Update upload speed only
        storage_location.update_performance_metrics(upload_speed=25.5)
        db_session.commit()
        
        assert storage_location.average_upload_speed == 25.5
        assert storage_location.average_download_speed is None
        
        # Update download speed only
        storage_location.update_performance_metrics(download_speed=30.2)
        db_session.commit()
        
        assert storage_location.average_upload_speed == 25.5
        assert storage_location.average_download_speed == 30.2
        
        # Update both (should average with existing values)
        storage_location.update_performance_metrics(upload_speed=35.0, download_speed=40.0)
        db_session.commit()
        
        # Should be average of 25.5 and 35.0 = 30.25
        assert storage_location.average_upload_speed == 30.25
        # Should be average of 30.2 and 40.0 = 35.1
        assert storage_location.average_download_speed == 35.1
    
    def test_get_usage_percentage(self, db_session: Session):
        """Test calculating usage percentage"""
        storage_location = StorageLocation(
            name="Test Storage",
            provider=StorageProvider.BACKBLAZE_B2,
            bucket_name="test-bucket",
            total_size=2147483648,      # 2GB used
            available_space=8589934592  # 8GB available
        )
        
        db_session.add(storage_location)
        db_session.commit()
        
        # Calculate usage percentage
        usage_percentage = storage_location.get_usage_percentage()
        
        # Total capacity = 2GB + 8GB = 10GB
        # Usage = 2GB / 10GB = 20%
        assert abs(usage_percentage - 20.0) < 0.01
        
        # Test with no available space info
        storage_location.available_space = None
        db_session.commit()
        
        assert storage_location.get_usage_percentage() is None
    
    def test_is_healthy(self, db_session: Session):
        """Test health check functionality"""
        # Create healthy storage location
        healthy_storage = StorageLocation(
            name="Healthy Storage",
            provider=StorageProvider.CLOUDFLARE_R2,
            bucket_name="healthy-bucket",
            is_active=True,
            is_verified=True,
            error_count=2  # Below threshold
        )
        
        db_session.add(healthy_storage)
        db_session.commit()
        
        assert healthy_storage.is_healthy() is True
        
        # Create unhealthy storage (too many errors)
        unhealthy_storage = StorageLocation(
            name="Unhealthy Storage",
            provider=StorageProvider.BACKBLAZE_B2,
            bucket_name="unhealthy-bucket",
            is_active=True,
            is_verified=True,
            error_count=15  # Above threshold
        )
        
        db_session.add(unhealthy_storage)
        db_session.commit()
        
        assert unhealthy_storage.is_healthy() is False
        
        # Create inactive storage
        inactive_storage = StorageLocation(
            name="Inactive Storage",
            provider=StorageProvider.LOCAL,
            bucket_name="inactive-bucket",
            is_active=False,
            is_verified=True,
            error_count=0
        )
        
        db_session.add(inactive_storage)
        db_session.commit()
        
        assert inactive_storage.is_healthy() is False
        
        # Create unverified storage
        unverified_storage = StorageLocation(
            name="Unverified Storage",
            provider=StorageProvider.CLOUDFLARE_R2,
            bucket_name="unverified-bucket",
            is_active=True,
            is_verified=False,
            error_count=0
        )
        
        db_session.add(unverified_storage)
        db_session.commit()
        
        assert unverified_storage.is_healthy() is False
    
    def test_get_connection_config(self, db_session: Session):
        """Test getting connection configuration"""
        storage_location = StorageLocation(
            name="Test Storage",
            provider=StorageProvider.CLOUDFLARE_R2,
            endpoint="https://test.r2.cloudflarestorage.com",
            region="auto",
            bucket_name="test-bucket",
            encryption_enabled=True,
            configuration={
                "timeout": 300,
                "retry_count": 3,
                "custom_setting": "value"
            }
        )
        
        db_session.add(storage_location)
        db_session.commit()
        
        # Get connection config
        config = storage_location.get_connection_config()
        
        # Verify config (should not include sensitive data)
        assert config["provider"] == "cloudflare_r2"
        assert config["endpoint"] == "https://test.r2.cloudflarestorage.com"
        assert config["region"] == "auto"
        assert config["bucket_name"] == "test-bucket"
        assert config["encryption_enabled"] is True
        assert config["timeout"] == 300
        assert config["retry_count"] == 3
        assert config["custom_setting"] == "value"
        
        # Should not include sensitive data
        assert "access_key" not in config
        assert "secret_key" not in config
    
    def test_credentials_methods(self, db_session: Session):
        """Test credential getter and setter methods"""
        storage_location = StorageLocation(
            name="Test Storage",
            provider=StorageProvider.BACKBLAZE_B2,
            bucket_name="test-bucket"
        )
        
        db_session.add(storage_location)
        db_session.commit()
        
        # Set credentials
        storage_location.set_credentials("test_access_key", "test_secret_key")
        db_session.commit()
        
        # Get credentials
        credentials = storage_location.get_credentials()
        
        # Verify credentials (in real implementation, these would be encrypted/decrypted)
        assert credentials["access_key"] == "test_access_key"
        assert credentials["secret_key"] == "test_secret_key"
    
    def test_get_stats_summary(self, db_session: Session):
        """Test getting statistics summary"""
        storage_location = StorageLocation(
            name="Test Storage",
            provider=StorageProvider.CLOUDFLARE_R2,
            bucket_name="test-bucket",
            is_active=True,
            is_verified=True,
            total_backups=25,
            total_size=5368709120,  # 5GB
            available_space=21474836480,  # 20GB
            average_upload_speed=15.5,
            average_download_speed=22.3,
            error_count=3
        )
        
        # Set timestamps
        storage_location.last_backup_at = datetime.now(timezone.utc) - timedelta(hours=2)
        storage_location.last_verified_at = datetime.now(timezone.utc) - timedelta(minutes=30)
        
        db_session.add(storage_location)
        db_session.commit()
        
        # Get stats summary
        stats = storage_location.get_stats_summary()
        
        # Verify stats
        assert stats["name"] == "Test Storage"
        assert stats["provider"] == "cloudflare_r2"
        assert stats["is_active"] is True
        assert stats["is_verified"] is True
        assert stats["total_backups"] == 25
        assert abs(stats["total_size_mb"] - 5120.0) < 1.0  # 5GB in MB
        assert abs(stats["usage_percentage"] - 20.0) < 0.01  # 5GB / 25GB = 20%
        assert stats["average_upload_speed"] == 15.5
        assert stats["average_download_speed"] == 22.3
        assert stats["error_count"] == 3
        assert stats["last_backup_at"] == storage_location.last_backup_at
        assert stats["last_verified_at"] == storage_location.last_verified_at
        assert stats["is_healthy"] is True
    
    def test_class_methods(self, db_session: Session):
        """Test class methods for querying storage locations"""
        # Create multiple storage locations
        locations = [
            StorageLocation(
                name="Primary R2",
                provider=StorageProvider.CLOUDFLARE_R2,
                bucket_name="primary-r2",
                is_active=True,
                is_verified=True,
                is_primary=True
            ),
            StorageLocation(
                name="Secondary B2",
                provider=StorageProvider.BACKBLAZE_B2,
                bucket_name="secondary-b2",
                is_active=True,
                is_verified=True,
                is_primary=False
            ),
            StorageLocation(
                name="Inactive Local",
                provider=StorageProvider.LOCAL,
                bucket_name="local-storage",
                is_active=False,
                is_verified=False,
                is_primary=False
            ),
            StorageLocation(
                name="Unverified R2",
                provider=StorageProvider.CLOUDFLARE_R2,
                bucket_name="unverified-r2",
                is_active=True,
                is_verified=False,
                is_primary=False
            )
        ]
        
        db_session.add_all(locations)
        db_session.commit()
        
        # Test get_active_locations
        active_locations = StorageLocation.get_active_locations(db_session)
        assert len(active_locations) == 2  # Only active and verified
        active_names = [loc.name for loc in active_locations]
        assert "Primary R2" in active_names
        assert "Secondary B2" in active_names
        
        # Test get_primary_location
        primary_location = StorageLocation.get_primary_location(db_session)
        assert primary_location is not None
        assert primary_location.name == "Primary R2"
        assert primary_location.is_primary is True
        
        # Test get_by_provider
        r2_locations = StorageLocation.get_by_provider(db_session, StorageProvider.CLOUDFLARE_R2)
        assert len(r2_locations) == 2  # Both R2 locations (active only)
        r2_names = [loc.name for loc in r2_locations]
        assert "Primary R2" in r2_names
        assert "Unverified R2" in r2_names
        
        b2_locations = StorageLocation.get_by_provider(db_session, StorageProvider.BACKBLAZE_B2)
        assert len(b2_locations) == 1
        assert b2_locations[0].name == "Secondary B2"
    
    def test_multiple_providers_configuration(self, db_session: Session):
        """Test configuration for different storage providers"""
        # AWS S3 configuration
        s3_storage = StorageLocation(
            name="AWS S3 Storage",
            provider=StorageProvider.AWS_S3,
            endpoint="https://s3.amazonaws.com",
            region="us-east-1",
            bucket_name="hesaabplus-s3-backups",
            configuration={
                "storage_class": "STANDARD_IA",
                "server_side_encryption": "AES256"
            }
        )
        
        # Google Cloud Storage configuration
        gcs_storage = StorageLocation(
            name="Google Cloud Storage",
            provider=StorageProvider.GOOGLE_CLOUD,
            endpoint="https://storage.googleapis.com",
            region="us-central1",
            bucket_name="hesaabplus-gcs-backups",
            configuration={
                "storage_class": "NEARLINE",
                "uniform_bucket_level_access": True
            }
        )
        
        # Azure Blob Storage configuration
        azure_storage = StorageLocation(
            name="Azure Blob Storage",
            provider=StorageProvider.AZURE_BLOB,
            endpoint="https://hesaabplus.blob.core.windows.net",
            region="eastus",
            bucket_name="backups-container",
            configuration={
                "access_tier": "Cool",
                "replication_type": "LRS"
            }
        )
        
        db_session.add_all([s3_storage, gcs_storage, azure_storage])
        db_session.commit()
        
        # Verify different provider configurations
        assert s3_storage.provider == StorageProvider.AWS_S3
        assert s3_storage.configuration["storage_class"] == "STANDARD_IA"
        
        assert gcs_storage.provider == StorageProvider.GOOGLE_CLOUD
        assert gcs_storage.configuration["uniform_bucket_level_access"] is True
        
        assert azure_storage.provider == StorageProvider.AZURE_BLOB
        assert azure_storage.configuration["access_tier"] == "Cool"
    
    def test_storage_location_repr(self, db_session: Session):
        """Test string representation"""
        storage_location = StorageLocation(
            name="Test Storage Location",
            provider=StorageProvider.CLOUDFLARE_R2,
            bucket_name="test-bucket"
        )
        
        db_session.add(storage_location)
        db_session.commit()
        
        repr_str = repr(storage_location)
        assert "StorageLocation" in repr_str
        assert "Test Storage Location" in repr_str
        assert "cloudflare_r2" in repr_str
        assert str(storage_location.id) in repr_str