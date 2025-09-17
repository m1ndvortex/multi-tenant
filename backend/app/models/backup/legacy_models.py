"""
Legacy backup models for backward compatibility
These models are preserved from the original backup.py file
"""

from sqlalchemy import Column, String, DateTime, Boolean, Enum, Text, Numeric, Integer, Index, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from datetime import datetime, timezone
from ..base import BaseModel


class LegacyBackupType(enum.Enum):
    """Legacy backup type enumeration"""
    TENANT_DAILY = "tenant_daily"
    FULL_PLATFORM = "full_platform"
    MANUAL = "manual"
    CUSTOMER_SELF = "customer_self"


class LegacyBackupStatus(enum.Enum):
    """Legacy backup status enumeration"""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class LegacyStorageProvider(enum.Enum):
    """Legacy storage provider enumeration"""
    CLOUDFLARE_R2 = "cloudflare_r2"
    BACKBLAZE_B2 = "backblaze_b2"
    LOCAL = "local"


# Create aliases for backward compatibility
BackupType = LegacyBackupType
BackupStatus = LegacyBackupStatus
StorageProvider = LegacyStorageProvider