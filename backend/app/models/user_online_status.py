"""
User Online Status Model for Real-Time Monitoring
"""
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Text, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import uuid

from .base import Base


class UserOnlineStatus(Base):
    """
    Model for tracking user online status in real-time
    """
    __tablename__ = "user_online_status"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    is_online = Column(Boolean, default=True, nullable=False)
    last_activity = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    session_id = Column(String(255), nullable=False)
    user_agent = Column(Text)
    ip_address = Column(String(45))  # Support IPv6
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    user = relationship("User", back_populates="online_status")
    tenant = relationship("Tenant")

    # Indexes for performance
    __table_args__ = (
        Index('idx_user_online_status_user_id', 'user_id'),
        Index('idx_user_online_status_tenant_id', 'tenant_id'),
        Index('idx_user_online_status_session_id', 'session_id'),
        Index('idx_user_online_status_is_online', 'is_online'),
        Index('idx_user_online_status_last_activity', 'last_activity'),
        Index('idx_user_online_status_tenant_online', 'tenant_id', 'is_online'),
    )

    def __repr__(self):
        return f"<UserOnlineStatus(user_id={self.user_id}, tenant_id={self.tenant_id}, is_online={self.is_online})>"

    def to_dict(self):
        """Convert to dictionary for JSON serialization"""
        return {
            "id": str(self.id),
            "user_id": str(self.user_id),
            "tenant_id": str(self.tenant_id),
            "is_online": self.is_online,
            "last_activity": self.last_activity.isoformat() if self.last_activity else None,
            "session_id": self.session_id,
            "user_agent": self.user_agent,
            "ip_address": self.ip_address,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

    def update_activity(self):
        """Update last activity timestamp"""
        self.last_activity = datetime.now(timezone.utc)
        self.updated_at = datetime.now(timezone.utc)

    def set_offline(self):
        """Mark user as offline"""
        self.is_online = False
        self.updated_at = datetime.now(timezone.utc)

    def set_online(self):
        """Mark user as online"""
        self.is_online = True
        self.last_activity = datetime.now(timezone.utc)
        self.updated_at = datetime.now(timezone.utc)