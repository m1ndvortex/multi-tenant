"""
StorageLocation model for storage provider configuration
"""

from sqlalchemy import Column, String, DateTime, Boolean, Enum, Numeric, Integer, Index, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
import enum
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from ..base import BaseModel


class StorageProvider(enum.Enum):
    """Storage provider enumeration"""
    CLOUDFLARE_R2 = "cloudflare_r2"
    BACKBLAZE_B2 = "backblaze_b2"
    LOCAL = "local"
    AWS_S3 = "aws_s3"
    GOOGLE_CLOUD = "google_cloud"
    AZURE_BLOB = "azure_blob"


class StorageLocation(BaseModel):
    """
    Storage location configuration model
    """
    __tablename__ = "storage_locations"
    
    # Location Information
    name = Column(
        String(255), 
        nullable=False,
        unique=True,
        comment="Storage location name"
    )
    
    provider = Column(
        Enum(StorageProvider), 
        nullable=False,
        comment="Storage provider type"
    )
    
    description = Column(
        Text, 
        nullable=True,
        comment="Storage location description"
    )
    
    # Configuration
    endpoint = Column(
        String(500), 
        nullable=True,
        comment="Storage endpoint URL"
    )
    
    region = Column(
        String(100), 
        nullable=True,
        comment="Storage region"
    )
    
    bucket_name = Column(
        String(255), 
        nullable=True,
        comment="Bucket or container name"
    )
    
    # Credentials (encrypted)
    access_key = Column(
        String(500), 
        nullable=True,
        comment="Access key (encrypted)"
    )
    
    secret_key = Column(
        String(500), 
        nullable=True,
        comment="Secret key (encrypted)"
    )
    
    # Additional Configuration
    configuration = Column(
        JSONB, 
        nullable=True,
        comment="Additional provider-specific configuration"
    )
    
    # Status
    is_active = Column(
        Boolean, 
        default=True,
        nullable=False,
        comment="Whether location is active"
    )
    
    is_primary = Column(
        Boolean, 
        default=False,
        nullable=False,
        comment="Whether this is the primary storage location"
    )
    
    is_verified = Column(
        Boolean, 
        default=False,
        nullable=False,
        comment="Whether storage location connectivity is verified"
    )
    
    # Usage Statistics
    total_backups = Column(
        Integer, 
        default=0,
        nullable=False,
        comment="Total number of backups stored"
    )
    
    total_size = Column(
        Numeric(15, 0), 
        default=0,
        nullable=False,
        comment="Total storage used in bytes"
    )
    
    available_space = Column(
        Numeric(15, 0), 
        nullable=True,
        comment="Available storage space in bytes"
    )
    
    # Performance Metrics
    average_upload_speed = Column(
        Numeric(10, 2), 
        nullable=True,
        comment="Average upload speed in MB/s"
    )
    
    average_download_speed = Column(
        Numeric(10, 2), 
        nullable=True,
        comment="Average download speed in MB/s"
    )
    
    # Timestamps
    last_backup_at = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="Last backup timestamp"
    )
    
    last_verified_at = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="Last verification timestamp"
    )
    
    # Error Information
    last_error = Column(
        Text, 
        nullable=True,
        comment="Last error message"
    )
    
    error_count = Column(
        Integer, 
        default=0,
        nullable=False,
        comment="Total error count"
    )
    
    # Retention Policy
    retention_days = Column(
        Integer, 
        nullable=True,
        comment="Backup retention period in days"
    )
    
    max_backups = Column(
        Integer, 
        nullable=True,
        comment="Maximum number of backups to keep"
    )
    
    # Encryption
    encryption_enabled = Column(
        Boolean, 
        default=True,
        nullable=False,
        comment="Whether encryption is enabled"
    )
    
    encryption_key_id = Column(
        String(255), 
        nullable=True,
        comment="Encryption key identifier"
    )
    
    def __repr__(self):
        return f"<StorageLocation(id={self.id}, name='{self.name}', provider='{self.provider.value}')>"
    
    def update_usage_stats(self, backup_size: int):
        """Update usage statistics after backup"""
        self.total_backups += 1
        self.total_size += backup_size
        self.last_backup_at = datetime.now(timezone.utc)
    
    def record_error(self, error_message: str):
        """Record an error for this storage location"""
        self.last_error = error_message
        self.error_count += 1
        self.is_verified = False
    
    def mark_verified(self):
        """Mark storage location as verified"""
        self.is_verified = True
        self.last_verified_at = datetime.now(timezone.utc)
        self.last_error = None
    
    def update_performance_metrics(self, upload_speed: float = None, download_speed: float = None):
        """Update performance metrics"""
        if upload_speed is not None:
            if self.average_upload_speed:
                # Simple moving average
                self.average_upload_speed = (self.average_upload_speed + upload_speed) / 2
            else:
                self.average_upload_speed = upload_speed
        
        if download_speed is not None:
            if self.average_download_speed:
                # Simple moving average
                self.average_download_speed = (self.average_download_speed + download_speed) / 2
            else:
                self.average_download_speed = download_speed
    
    def get_usage_percentage(self) -> Optional[float]:
        """Calculate storage usage percentage"""
        if self.available_space and self.total_size:
            total_capacity = self.available_space + self.total_size
            return (self.total_size / total_capacity) * 100
        return None
    
    def is_healthy(self) -> bool:
        """Check if storage location is healthy"""
        return (self.is_active and 
                self.is_verified and 
                self.error_count < 10)  # Threshold for unhealthy
    
    def get_connection_config(self) -> Dict[str, Any]:
        """Get connection configuration (without sensitive data)"""
        config = {
            "provider": self.provider.value,
            "endpoint": self.endpoint,
            "region": self.region,
            "bucket_name": self.bucket_name,
            "encryption_enabled": self.encryption_enabled
        }
        
        if self.configuration:
            config.update(self.configuration)
        
        return config
    
    def get_credentials(self) -> Dict[str, str]:
        """Get decrypted credentials (implement encryption/decryption)"""
        # TODO: Implement proper encryption/decryption
        return {
            "access_key": self.access_key,
            "secret_key": self.secret_key
        }
    
    def set_credentials(self, access_key: str, secret_key: str):
        """Set encrypted credentials (implement encryption)"""
        # TODO: Implement proper encryption
        self.access_key = access_key
        self.secret_key = secret_key
    
    def get_stats_summary(self) -> Dict[str, Any]:
        """Get storage location statistics summary"""
        return {
            "name": self.name,
            "provider": self.provider.value,
            "is_active": self.is_active,
            "is_verified": self.is_verified,
            "total_backups": self.total_backups,
            "total_size_mb": float(self.total_size) / (1024 * 1024) if self.total_size else 0,
            "usage_percentage": self.get_usage_percentage(),
            "average_upload_speed": float(self.average_upload_speed) if self.average_upload_speed else None,
            "average_download_speed": float(self.average_download_speed) if self.average_download_speed else None,
            "error_count": self.error_count,
            "last_backup_at": self.last_backup_at,
            "last_verified_at": self.last_verified_at,
            "is_healthy": self.is_healthy()
        }
    
    @classmethod
    def get_active_locations(cls, db_session):
        """Get all active storage locations"""
        return db_session.query(cls).filter(
            cls.is_active == True,
            cls.is_verified == True
        ).all()
    
    @classmethod
    def get_primary_location(cls, db_session):
        """Get primary storage location"""
        return db_session.query(cls).filter(
            cls.is_active == True,
            cls.is_primary == True,
            cls.is_verified == True
        ).first()
    
    @classmethod
    def get_by_provider(cls, db_session, provider: StorageProvider):
        """Get storage locations by provider"""
        return db_session.query(cls).filter(
            cls.provider == provider,
            cls.is_active == True
        ).all()


# Create indexes for performance optimization
Index('idx_storage_location_name', StorageLocation.name)
Index('idx_storage_location_provider', StorageLocation.provider)
Index('idx_storage_location_active', StorageLocation.is_active)
Index('idx_storage_location_primary', StorageLocation.is_primary)
Index('idx_storage_location_verified', StorageLocation.is_verified)
Index('idx_storage_location_last_backup', StorageLocation.last_backup_at)
Index('idx_storage_location_last_verified', StorageLocation.last_verified_at)
Index('idx_storage_location_error_count', StorageLocation.error_count)
Index('idx_storage_location_bucket', StorageLocation.bucket_name)