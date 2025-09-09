"""
Tenant Credentials Model
Tracks tenant owner credentials and password changes with admin context
"""

from sqlalchemy import Column, String, DateTime, Text, Integer, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime, timezone
from .base import BaseModel


class TenantCredentials(BaseModel):
    """
    Tenant credentials tracking model
    Records tenant owner credentials and password change history
    """
    __tablename__ = "tenant_credentials"
    
    # Foreign Keys
    tenant_id = Column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,  # One credentials record per tenant
        comment="Tenant ID"
    )
    
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        comment="Tenant owner user ID"
    )
    
    # Credentials Information
    username = Column(
        String(255),
        nullable=False,
        comment="Current username/email for tenant owner"
    )
    
    password_hash = Column(
        String(255),
        nullable=False,
        comment="Current password hash"
    )
    
    # Password Change Tracking
    password_changed_at = Column(
        DateTime(timezone=True),
        default=func.now(),
        nullable=False,
        comment="When password was last changed"
    )
    
    changed_by_admin_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        comment="Admin user who changed the password (null if changed by owner)"
    )
    
    # Previous Password Tracking (for security)
    previous_password_hash = Column(
        String(255),
        nullable=True,
        comment="Previous password hash (for preventing reuse)"
    )
    
    password_change_count = Column(
        Integer,
        default=0,
        nullable=False,
        comment="Total number of password changes"
    )
    
    # Security Information
    last_login_attempt = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="Last login attempt timestamp"
    )
    
    failed_login_attempts = Column(
        Integer,
        default=0,
        nullable=False,
        comment="Number of consecutive failed login attempts"
    )
    
    account_locked_until = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="Account lock expiration time"
    )
    
    # Change History and Notes
    change_history = Column(
        Text,
        nullable=True,
        comment="JSON array of password change history"
    )
    
    admin_notes = Column(
        Text,
        nullable=True,
        comment="Admin notes about credential changes"
    )
    
    # Note: Relationships are commented out because we need to check foreign key constraints
    # tenant = relationship("Tenant", foreign_keys=[tenant_id])
    # user = relationship("User", foreign_keys=[user_id])
    # changed_by_admin = relationship("User", foreign_keys=[changed_by_admin_id])
    
    def __repr__(self):
        return f"<TenantCredentials(tenant_id={self.tenant_id}, username={self.username}, changed_at={self.password_changed_at})>"
    
    @classmethod
    def create_for_tenant(
        cls,
        tenant_id: str,
        user_id: str,
        username: str,
        password_hash: str,
        admin_id: str = None
    ):
        """Create new tenant credentials record"""
        return cls(
            tenant_id=tenant_id,
            user_id=user_id,
            username=username,
            password_hash=password_hash,
            password_changed_at=datetime.now(timezone.utc),
            changed_by_admin_id=admin_id,
            password_change_count=1
        )
    
    def update_password(
        self,
        new_password_hash: str,
        admin_id: str = None,
        notes: str = None
    ):
        """Update password with tracking"""
        # Store previous password
        self.previous_password_hash = self.password_hash
        
        # Update to new password
        self.password_hash = new_password_hash
        self.password_changed_at = datetime.now(timezone.utc)
        self.changed_by_admin_id = admin_id
        self.password_change_count += 1
        
        # Reset failed login attempts
        self.failed_login_attempts = 0
        self.account_locked_until = None
        
        # Add to change history
        import json
        history_entry = {
            "changed_at": datetime.now(timezone.utc).isoformat(),
            "changed_by_admin": admin_id,
            "notes": notes
        }
        
        if self.change_history:
            try:
                history = json.loads(self.change_history)
            except:
                history = []
        else:
            history = []
        
        history.append(history_entry)
        
        # Keep only last 10 changes
        if len(history) > 10:
            history = history[-10:]
        
        self.change_history = json.dumps(history)
        
        if notes:
            self.admin_notes = f"{self.admin_notes or ''}\n{datetime.now(timezone.utc)}: {notes}"
    
    def update_username(
        self,
        new_username: str,
        admin_id: str = None,
        notes: str = None
    ):
        """Update username with tracking"""
        old_username = self.username
        self.username = new_username
        
        # Add to admin notes
        change_note = f"Username changed from {old_username} to {new_username}"
        if admin_id:
            change_note += f" by admin {admin_id}"
        if notes:
            change_note += f" - {notes}"
        
        self.admin_notes = f"{self.admin_notes or ''}\n{datetime.now(timezone.utc)}: {change_note}"
    
    def record_login_attempt(self, success: bool):
        """Record login attempt"""
        self.last_login_attempt = datetime.now(timezone.utc)
        
        if success:
            self.failed_login_attempts = 0
            self.account_locked_until = None
        else:
            self.failed_login_attempts += 1
            
            # Lock account after 5 failed attempts for 30 minutes
            if self.failed_login_attempts >= 5:
                from datetime import timedelta
                self.account_locked_until = datetime.now(timezone.utc) + timedelta(minutes=30)
    
    def is_account_locked(self) -> bool:
        """Check if account is currently locked"""
        if not self.account_locked_until:
            return False
        
        return datetime.now(timezone.utc) < self.account_locked_until
    
    def unlock_account(self, admin_id: str = None):
        """Unlock account (admin action)"""
        self.failed_login_attempts = 0
        self.account_locked_until = None
        
        if admin_id:
            unlock_note = f"Account unlocked by admin {admin_id}"
            self.admin_notes = f"{self.admin_notes or ''}\n{datetime.now(timezone.utc)}: {unlock_note}"
    
    def get_change_history(self):
        """Get parsed change history"""
        if not self.change_history:
            return []
        
        try:
            import json
            return json.loads(self.change_history)
        except:
            return []


# Create indexes for performance optimization
Index('idx_tenant_credentials_tenant_id', TenantCredentials.tenant_id, unique=True)
Index('idx_tenant_credentials_user_id', TenantCredentials.user_id)
Index('idx_tenant_credentials_username', TenantCredentials.username)
Index('idx_tenant_credentials_changed_at', TenantCredentials.password_changed_at)
Index('idx_tenant_credentials_admin', TenantCredentials.changed_by_admin_id)
Index('idx_tenant_credentials_locked', TenantCredentials.account_locked_until)