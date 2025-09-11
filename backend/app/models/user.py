"""
User model with multi-tenant support and role-based access
"""

from sqlalchemy import Column, String, DateTime, Boolean, Enum, ForeignKey, Index, Text, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from datetime import datetime, timedelta
from .base import BaseModel


class UserRole(enum.Enum):
    """User role enumeration"""
    OWNER = "owner"          # Tenant owner (full access)
    ADMIN = "admin"          # Tenant admin (most access)
    MANAGER = "manager"      # Manager (limited admin access)
    USER = "user"           # Regular user (basic access)
    VIEWER = "viewer"       # Read-only access


class UserStatus(enum.Enum):
    """User status enumeration"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"
    PENDING = "pending"


class User(BaseModel):
    """
    User model with multi-tenant support
    Represents users within tenant organizations
    """
    __tablename__ = "users"
    
    # Override tenant_id to allow null for super admin users
    tenant_id = Column(
        UUID(as_uuid=True), 
        ForeignKey('tenants.id'),
        nullable=True,  # Allow null for super admin users
        index=True,
        comment="Tenant ID for multi-tenant data isolation (null for super admin)"
    )
    
    # Basic Information
    email = Column(
        String(255), 
        nullable=False,
        comment="User email address (unique within tenant)"
    )
    
    password_hash = Column(
        String(255), 
        nullable=False,
        comment="Hashed password"
    )
    
    first_name = Column(
        String(100), 
        nullable=False,
        comment="User first name"
    )
    
    last_name = Column(
        String(100), 
        nullable=False,
        comment="User last name"
    )
    
    phone = Column(
        String(50), 
        nullable=True,
        comment="User phone number"
    )
    
    # Role and Permissions
    role = Column(
        Enum(UserRole), 
        default=UserRole.USER,
        nullable=False,
        comment="User role within tenant"
    )
    
    status = Column(
        Enum(UserStatus), 
        default=UserStatus.ACTIVE,
        nullable=False,
        comment="User account status"
    )
    
    # Authentication and Security
    is_email_verified = Column(
        Boolean, 
        default=False,
        nullable=False,
        comment="Email verification status"
    )
    
    email_verification_token = Column(
        String(255), 
        nullable=True,
        comment="Email verification token"
    )
    
    password_reset_token = Column(
        String(255), 
        nullable=True,
        comment="Password reset token"
    )
    
    password_reset_expires = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="Password reset token expiration"
    )
    
    # Activity Tracking
    last_login_at = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="Last login timestamp"
    )
    
    last_activity_at = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="Last activity timestamp"
    )
    
    login_count = Column(
        Integer, 
        default=0,
        nullable=False,
        comment="Total login count"
    )
    
    # Preferences and Settings
    language = Column(
        String(10), 
        default="fa",
        nullable=False,
        comment="User interface language"
    )
    
    timezone = Column(
        String(50), 
        default="Asia/Tehran",
        nullable=False,
        comment="User timezone"
    )
    
    preferences = Column(
        Text, 
        nullable=True,
        comment="JSON user preferences"
    )
    
    # Super Admin Fields
    is_super_admin = Column(
        Boolean, 
        default=False,
        nullable=False,
        comment="Super admin flag (platform owner)"
    )
    
    # Relationships
    tenant = relationship("Tenant", back_populates="users")
    
    # Impersonation session relationships
    admin_impersonation_sessions = relationship(
        "ImpersonationSession", 
        foreign_keys="ImpersonationSession.admin_user_id",
        back_populates="admin_user",
        cascade="all, delete-orphan"
    )
    target_impersonation_sessions = relationship(
        "ImpersonationSession", 
        foreign_keys="ImpersonationSession.target_user_id",
        back_populates="target_user",
        cascade="all, delete-orphan"
    )
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if self.login_count is None:
            self.login_count = 0
        if self.is_email_verified is None:
            self.is_email_verified = False
        if self.status is None:
            self.status = UserStatus.ACTIVE
    
    def __repr__(self):
        return f"<User(id={self.id}, email='{self.email}', role='{self.role.value}')>"
    
    @property
    def full_name(self) -> str:
        """Get user's full name"""
        return f"{self.first_name} {self.last_name}".strip()
    
    @property
    def is_online(self) -> bool:
        """Check if user is currently online (active in last 5 minutes)"""
        if not self.last_activity_at:
            return False
        
        from datetime import timezone
        now = datetime.now(timezone.utc)
        return (now - self.last_activity_at).total_seconds() < 300
    
    def update_activity(self):
        """Update last activity timestamp"""
        from datetime import timezone
        self.last_activity_at = datetime.now(timezone.utc)
    
    def update_login(self):
        """Update login information"""
        from datetime import timezone
        self.last_login_at = datetime.now(timezone.utc)
        self.login_count = (self.login_count or 0) + 1
        self.update_activity()
    
    def can_access_resource(self, resource: str, action: str = "read") -> bool:
        """Check if user can access a specific resource"""
        if self.is_super_admin:
            return True
        
        if self.status != UserStatus.ACTIVE:
            return False
        
        # Role-based permissions
        permissions = {
            UserRole.OWNER: {
                "all": ["create", "read", "update", "delete", "manage"]
            },
            UserRole.ADMIN: {
                "users": ["create", "read", "update"],
                "customers": ["create", "read", "update", "delete"],
                "products": ["create", "read", "update", "delete"],
                "invoices": ["create", "read", "update", "delete"],
                "reports": ["read"],
                "settings": ["read", "update"]
            },
            UserRole.MANAGER: {
                "customers": ["create", "read", "update"],
                "products": ["create", "read", "update"],
                "invoices": ["create", "read", "update"],
                "reports": ["read"]
            },
            UserRole.USER: {
                "customers": ["read", "update"],
                "products": ["read"],
                "invoices": ["create", "read", "update"],
                "reports": ["read"]
            },
            UserRole.VIEWER: {
                "customers": ["read"],
                "products": ["read"],
                "invoices": ["read"],
                "reports": ["read"]
            }
        }
        
        role_permissions = permissions.get(self.role, {})
        
        # Check if user has access to all resources
        if "all" in role_permissions:
            return action in role_permissions["all"]
        
        # Check specific resource permissions
        resource_permissions = role_permissions.get(resource, [])
        return action in resource_permissions
    
    def set_password_reset_token(self, token: str):
        """Set password reset token with expiration"""
        from datetime import timezone
        self.password_reset_token = token
        self.password_reset_expires = datetime.now(timezone.utc) + timedelta(hours=24)
    
    def clear_password_reset_token(self):
        """Clear password reset token"""
        self.password_reset_token = None
        self.password_reset_expires = None
    
    def is_password_reset_valid(self) -> bool:
        """Check if password reset token is valid"""
        if not self.password_reset_token or not self.password_reset_expires:
            return False
        
        from datetime import timezone
        return datetime.now(timezone.utc) < self.password_reset_expires
    
    def verify_email(self):
        """Mark email as verified"""
        self.is_email_verified = True
        self.email_verification_token = None
    
    def suspend(self, reason: str = None):
        """Suspend user account"""
        self.status = UserStatus.SUSPENDED
        # Could add suspension reason to preferences or separate table
    
    def activate(self):
        """Activate user account"""
        self.status = UserStatus.ACTIVE
    
    def deactivate(self):
        """Deactivate user account"""
        self.status = UserStatus.INACTIVE
    
    @classmethod
    def get_for_tenant(cls, db, tenant_id):
        """Get all users for a specific tenant"""
        return db.query(cls).filter(cls.tenant_id == tenant_id)
    
    @classmethod
    def create_for_tenant(cls, db, tenant_id, **kwargs):
        """Create a new user for a specific tenant"""
        obj = cls(tenant_id=tenant_id, **kwargs)
        db.add(obj)
        db.commit()
        db.refresh(obj)
        return obj


# Create indexes for performance optimization
Index('idx_user_tenant_email', User.tenant_id, User.email, unique=True)
Index('idx_user_tenant_role', User.tenant_id, User.role)
Index('idx_user_tenant_status', User.tenant_id, User.status)
Index('idx_user_last_activity', User.last_activity_at)
Index('idx_user_email_verification', User.email_verification_token)
Index('idx_user_password_reset', User.password_reset_token)
Index('idx_user_super_admin', User.is_super_admin)