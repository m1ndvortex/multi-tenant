"""
Impersonation Session Model

Enhanced database model for tracking impersonation sessions with better
session management, automatic cleanup detection, and comprehensive audit logging.
"""

from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import Column, String, DateTime, Boolean, Text, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid

from .base import Base


class ImpersonationSession(Base):
    """
    Enhanced impersonation session model for better tracking and management
    
    This model provides persistent storage for impersonation sessions alongside
    Redis storage, enabling better audit trails and session management.
    """
    __tablename__ = "impersonation_sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(String(255), unique=True, nullable=False, index=True)
    
    # User relationships
    admin_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    target_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    target_tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=True)
    
    # Session timing
    started_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    expires_at = Column(DateTime(timezone=True), nullable=False)
    ended_at = Column(DateTime(timezone=True), nullable=True)
    
    # Session status and management
    is_active = Column(Boolean, default=True, nullable=False)
    is_window_based = Column(Boolean, default=False, nullable=False)  # New: tracks if opened in new window
    window_closed_detected = Column(Boolean, default=False, nullable=False)  # New: automatic cleanup detection
    
    # Session metadata
    ip_address = Column(String(45), nullable=True)  # IPv6 support
    user_agent = Column(Text, nullable=True)
    reason = Column(Text, nullable=True)
    
    # Enhanced tracking
    jwt_token_hash = Column(String(255), nullable=True)  # Hash of JWT token for validation
    last_activity_at = Column(DateTime(timezone=True), nullable=True)
    activity_count = Column(Integer, default=0, nullable=False)
    
    # Termination details
    termination_reason = Column(String(100), nullable=True)  # manual, expired, window_closed, admin_terminated
    terminated_by_admin_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    
    # Audit fields
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    admin_user = relationship("User", foreign_keys=[admin_user_id], back_populates="admin_impersonation_sessions")
    target_user = relationship("User", foreign_keys=[target_user_id], back_populates="target_impersonation_sessions")
    target_tenant = relationship("Tenant", back_populates="impersonation_sessions")
    terminated_by_admin = relationship("User", foreign_keys=[terminated_by_admin_id])

    def __repr__(self):
        return f"<ImpersonationSession(session_id='{self.session_id}', admin_user_id='{self.admin_user_id}', target_user_id='{self.target_user_id}', is_active={self.is_active})>"

    @property
    def is_expired(self) -> bool:
        """Check if session is expired"""
        return datetime.now(timezone.utc) > self.expires_at

    @property
    def duration_minutes(self) -> Optional[int]:
        """Get session duration in minutes"""
        if self.ended_at:
            return int((self.ended_at - self.started_at).total_seconds() / 60)
        return int((datetime.now(timezone.utc) - self.started_at).total_seconds() / 60)

    def mark_activity(self):
        """Mark session activity for tracking"""
        self.last_activity_at = datetime.now(timezone.utc)
        self.activity_count += 1

    def end_session(self, reason: str = "manual", terminated_by_admin_id: Optional[str] = None):
        """End the impersonation session"""
        self.is_active = False
        self.ended_at = datetime.now(timezone.utc)
        self.termination_reason = reason
        if terminated_by_admin_id:
            self.terminated_by_admin_id = terminated_by_admin_id

    def detect_window_closure(self):
        """Mark session as window closed for automatic cleanup"""
        self.window_closed_detected = True
        self.end_session(reason="window_closed")

    def to_dict(self) -> dict:
        """Convert session to dictionary for API responses"""
        return {
            "id": str(self.id),
            "session_id": self.session_id,
            "admin_user_id": str(self.admin_user_id),
            "target_user_id": str(self.target_user_id),
            "target_tenant_id": str(self.target_tenant_id) if self.target_tenant_id else None,
            "started_at": self.started_at.isoformat(),
            "expires_at": self.expires_at.isoformat(),
            "ended_at": self.ended_at.isoformat() if self.ended_at else None,
            "is_active": self.is_active,
            "is_window_based": self.is_window_based,
            "window_closed_detected": self.window_closed_detected,
            "ip_address": self.ip_address,
            "user_agent": self.user_agent,
            "reason": self.reason,
            "last_activity_at": self.last_activity_at.isoformat() if self.last_activity_at else None,
            "activity_count": self.activity_count,
            "termination_reason": self.termination_reason,
            "terminated_by_admin_id": str(self.terminated_by_admin_id) if self.terminated_by_admin_id else None,
            "duration_minutes": self.duration_minutes,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat()
        }