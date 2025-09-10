"""
Tenant Credentials model for tracking password changes and admin actions
"""

from sqlalchemy import Column, String, DateTime, ForeignKey, Index, Text, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime, timezone
from .base import BaseModel


class TenantCredentials(BaseModel):
    """
    Model for tracking tenant owner credential changes
    Provides audit trail for password and email changes by admins
    """
    __tablename__ = "tenant_credentials"
    
    # Foreign Keys
    tenant_id = Column(
        UUID(as_uuid=True), 
        ForeignKey('tenants.id'),
        nullable=False,
        index=True,
        comment="Reference to tenant"
    )
    
    user_id = Column(
        UUID(as_uuid=True), 
        ForeignKey('users.id'),
        nullable=False,
        index=True,
        comment="Reference to tenant owner user"
    )
    
    changed_by_admin_id = Column(
        UUID(as_uuid=True), 
        ForeignKey('users.id'),
        nullable=False,
        index=True,
        comment="Super admin who made the change"
    )
    
    # Credential Information
    old_email = Column(
        String(255), 
        nullable=True,
        comment="Previous email address"
    )
    
    new_email = Column(
        String(255), 
        nullable=True,
        comment="New email address"
    )
    
    password_changed = Column(
        Boolean, 
        default=False,
        nullable=False,
        comment="Whether password was changed in this update"
    )
    
    # Change Details
    change_reason = Column(
        Text, 
        nullable=True,
        comment="Reason for credential change"
    )
    
    change_type = Column(
        String(50), 
        nullable=False,
        comment="Type of change: email, password, both"
    )
    
    # Metadata
    client_ip = Column(
        String(45), 
        nullable=True,
        comment="IP address of admin making change"
    )
    
    user_agent = Column(
        Text, 
        nullable=True,
        comment="User agent of admin making change"
    )
    
    # Relationships
    tenant = relationship("Tenant", foreign_keys=[tenant_id])
    user = relationship("User", foreign_keys=[user_id])
    admin = relationship("User", foreign_keys=[changed_by_admin_id])
    
    def __repr__(self):
        return f"<TenantCredentials(tenant_id={self.tenant_id}, change_type='{self.change_type}')>"
    
    @classmethod
    def log_credential_change(
        cls, 
        db, 
        tenant_id: str, 
        user_id: str, 
        admin_id: str,
        change_type: str,
        old_email: str = None,
        new_email: str = None,
        password_changed: bool = False,
        reason: str = None,
        client_ip: str = None,
        user_agent: str = None
    ):
        """
        Log a credential change event
        """
        credential_log = cls(
            tenant_id=tenant_id,
            user_id=user_id,
            changed_by_admin_id=admin_id,
            old_email=old_email,
            new_email=new_email,
            password_changed=password_changed,
            change_type=change_type,
            change_reason=reason,
            client_ip=client_ip,
            user_agent=user_agent
        )
        
        db.add(credential_log)
        db.commit()
        db.refresh(credential_log)
        return credential_log
    
    @classmethod
    def get_tenant_credential_history(cls, db, tenant_id: str, limit: int = 50):
        """
        Get credential change history for a tenant
        """
        return db.query(cls).filter(
            cls.tenant_id == tenant_id
        ).order_by(cls.created_at.desc()).limit(limit).all()
    
    @classmethod
    def get_admin_credential_changes(cls, db, admin_id: str, limit: int = 100):
        """
        Get all credential changes made by a specific admin
        """
        return db.query(cls).filter(
            cls.changed_by_admin_id == admin_id
        ).order_by(cls.created_at.desc()).limit(limit).all()


# Create indexes for performance optimization
Index('idx_tenant_credentials_tenant', TenantCredentials.tenant_id, TenantCredentials.created_at)
Index('idx_tenant_credentials_admin', TenantCredentials.changed_by_admin_id, TenantCredentials.created_at)
Index('idx_tenant_credentials_user', TenantCredentials.user_id, TenantCredentials.created_at)
Index('idx_tenant_credentials_type', TenantCredentials.change_type)