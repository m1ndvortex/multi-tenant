"""
RollbackPoint model for disaster recovery rollback functionality
"""

from sqlalchemy import Column, String, DateTime, Boolean, Text, Numeric, Integer, Index, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from ..base import BaseModel


class RollbackPoint(BaseModel):
    """
    Rollback point model for disaster recovery rollback functionality
    """
    __tablename__ = "rollback_points"
    __table_args__ = {'extend_existing': True}
    
    # Basic Information
    description = Column(
        String(500), 
        nullable=False,
        comment="Description of the rollback point"
    )
    
    created_by_operation_id = Column(
        UUID(as_uuid=True), 
        ForeignKey("backup_operations.id", ondelete="CASCADE"),
        nullable=False,
        comment="Backup operation that created this rollback point"
    )
    
    # System State Information
    system_state = Column(
        JSONB, 
        nullable=False,
        comment="Complete system state at rollback point creation"
    )
    
    container_states = Column(
        JSONB, 
        nullable=False,
        comment="Container states and configurations"
    )
    
    volume_snapshots = Column(
        JSONB, 
        nullable=False,
        comment="Volume snapshots and data locations"
    )
    
    database_state = Column(
        JSONB, 
        nullable=True,
        comment="Database state and schema information"
    )
    
    # Storage Information
    rollback_data_location = Column(
        String(500), 
        nullable=False,
        comment="Location of rollback data files"
    )
    
    rollback_size = Column(
        Numeric(15, 0), 
        nullable=False,
        comment="Total size of rollback data in bytes"
    )
    
    # Expiration and Status
    expires_at = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="Rollback point expiration time"
    )
    
    is_active = Column(
        Boolean, 
        default=True,
        nullable=False,
        comment="Whether rollback point is active"
    )
    
    can_rollback = Column(
        Boolean, 
        default=True,
        nullable=False,
        comment="Whether rollback is possible"
    )
    
    # Integrity Information
    integrity_verified = Column(
        Boolean, 
        default=False,
        nullable=False,
        comment="Whether rollback point integrity is verified"
    )
    
    verification_checksum = Column(
        String(64), 
        nullable=True,
        comment="Checksum for rollback point verification"
    )
    
    # Usage Statistics
    rollback_count = Column(
        Integer, 
        default=0,
        nullable=False,
        comment="Number of times this rollback point was used"
    )
    
    last_rollback_at = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="Last time this rollback point was used"
    )
    
    # Relationships
    created_by_operation = relationship("BackupOperation", back_populates="rollback_points")
    
    def __repr__(self):
        return f"<RollbackPoint(id={self.id}, description='{self.description}', active={self.is_active})>"
    
    def verify_integrity(self, checksum: str):
        """Mark rollback point integrity as verified"""
        self.integrity_verified = True
        self.verification_checksum = checksum
    
    def use_rollback_point(self):
        """Mark rollback point as used"""
        self.rollback_count += 1
        self.last_rollback_at = datetime.now(timezone.utc)
    
    def deactivate(self):
        """Deactivate rollback point"""
        self.is_active = False
        self.can_rollback = False
    
    def expire(self):
        """Mark rollback point as expired"""
        self.expires_at = datetime.now(timezone.utc)
        self.can_rollback = False
    
    @property
    def is_expired(self) -> bool:
        """Check if rollback point has expired"""
        if not self.expires_at:
            return False
        return datetime.now(timezone.utc) > self.expires_at
    
    @property
    def is_usable(self) -> bool:
        """Check if rollback point can be used"""
        return self.is_active and self.can_rollback and not self.is_expired
    
    @property
    def age_days(self) -> int:
        """Get age of rollback point in days"""
        if self.created_at:
            delta = datetime.now(timezone.utc) - self.created_at
            return delta.days
        return 0
    
    def get_system_info(self) -> Dict[str, Any]:
        """Get system information summary"""
        return {
            "containers": len(self.container_states) if self.container_states else 0,
            "volumes": len(self.volume_snapshots) if self.volume_snapshots else 0,
            "has_database": bool(self.database_state),
            "size_mb": float(self.rollback_size) / (1024 * 1024) if self.rollback_size else 0,
            "usage_count": self.rollback_count,
            "age_days": self.age_days
        }


# Create indexes for performance optimization
Index('idx_rollback_point_operation', RollbackPoint.created_by_operation_id)
Index('idx_rollback_point_active', RollbackPoint.is_active)
Index('idx_rollback_point_can_rollback', RollbackPoint.can_rollback)
Index('idx_rollback_point_expires_at', RollbackPoint.expires_at)
Index('idx_rollback_point_verified', RollbackPoint.integrity_verified)
Index('idx_rollback_point_created_at', RollbackPoint.created_at)