"""
Base model classes with multi-tenant support
"""

from sqlalchemy import Column, String, DateTime, Boolean, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import Session, declared_attr
from sqlalchemy.sql import func
import uuid
from datetime import datetime
from typing import Optional, List, Any, Dict

Base = declarative_base()


class TenantMixin:
    """
    Mixin to add tenant_id to all tenant-specific models
    Provides automatic tenant isolation for multi-tenant architecture
    """
    
    @declared_attr
    def tenant_id(cls):
        from sqlalchemy import ForeignKey
        return Column(
            UUID(as_uuid=True), 
            ForeignKey('tenants.id'),
            nullable=False, 
            index=True,
            comment="Tenant ID for multi-tenant data isolation"
        )
    
    @classmethod
    def get_for_tenant(cls, db: Session, tenant_id: uuid.UUID, **filters):
        """Get all records for a specific tenant with optional filters"""
        query = db.query(cls).filter(cls.tenant_id == tenant_id)
        
        # Apply additional filters
        for key, value in filters.items():
            if hasattr(cls, key):
                query = query.filter(getattr(cls, key) == value)
        
        return query
    
    @classmethod
    def get_by_id_for_tenant(cls, db: Session, tenant_id: uuid.UUID, record_id: uuid.UUID):
        """Get a specific record by ID for a tenant"""
        return db.query(cls).filter(
            cls.tenant_id == tenant_id,
            cls.id == record_id
        ).first()
    
    @classmethod
    def create_for_tenant(cls, db: Session, tenant_id: uuid.UUID, **kwargs):
        """Create a new record for a specific tenant"""
        obj = cls(tenant_id=tenant_id, **kwargs)
        db.add(obj)
        db.commit()
        db.refresh(obj)
        return obj
    
    @classmethod
    def update_for_tenant(cls, db: Session, tenant_id: uuid.UUID, record_id: uuid.UUID, **kwargs):
        """Update a record for a specific tenant"""
        obj = cls.get_by_id_for_tenant(db, tenant_id, record_id)
        if obj:
            for key, value in kwargs.items():
                if hasattr(obj, key):
                    setattr(obj, key, value)
            obj.updated_at = datetime.utcnow()
            db.commit()
            db.refresh(obj)
        return obj
    
    @classmethod
    def delete_for_tenant(cls, db: Session, tenant_id: uuid.UUID, record_id: uuid.UUID):
        """Soft delete a record for a specific tenant"""
        obj = cls.get_by_id_for_tenant(db, tenant_id, record_id)
        if obj:
            obj.is_active = False
            obj.updated_at = datetime.utcnow()
            db.commit()
        return obj
    
    @classmethod
    def count_for_tenant(cls, db: Session, tenant_id: uuid.UUID, **filters):
        """Count records for a specific tenant with optional filters"""
        query = db.query(cls).filter(cls.tenant_id == tenant_id)
        
        # Apply additional filters
        for key, value in filters.items():
            if hasattr(cls, key):
                query = query.filter(getattr(cls, key) == value)
        
        return query.count()


class BaseModel(Base):
    """
    Base model class with common fields and functionality
    """
    __abstract__ = True
    
    id = Column(
        UUID(as_uuid=True), 
        primary_key=True, 
        default=uuid.uuid4,
        comment="Primary key UUID"
    )
    
    created_at = Column(
        DateTime(timezone=True), 
        server_default=func.now(),
        nullable=False,
        comment="Record creation timestamp"
    )
    
    updated_at = Column(
        DateTime(timezone=True), 
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
        comment="Record last update timestamp"
    )
    
    is_active = Column(
        Boolean, 
        default=True,
        nullable=False,
        comment="Soft delete flag"
    )
    
    def to_dict(self, exclude: Optional[List[str]] = None) -> Dict[str, Any]:
        """Convert model instance to dictionary"""
        exclude = exclude or []
        result = {}
        
        for column in self.__table__.columns:
            if column.name not in exclude:
                value = getattr(self, column.name)
                # Handle UUID and datetime serialization
                if isinstance(value, uuid.UUID):
                    value = str(value)
                elif isinstance(value, datetime):
                    value = value.isoformat()
                result[column.name] = value
        
        return result
    
    def update_from_dict(self, data: Dict[str, Any], exclude: Optional[List[str]] = None):
        """Update model instance from dictionary"""
        exclude = exclude or ['id', 'created_at', 'tenant_id']
        
        for key, value in data.items():
            if key not in exclude and hasattr(self, key):
                setattr(self, key, value)
        
        self.updated_at = datetime.utcnow()
    
    @classmethod
    def get_by_id(cls, db: Session, record_id: uuid.UUID):
        """Get record by ID"""
        return db.query(cls).filter(
            cls.id == record_id,
            cls.is_active == True
        ).first()
    
    @classmethod
    def get_all(cls, db: Session, skip: int = 0, limit: int = 100):
        """Get all active records with pagination"""
        return db.query(cls).filter(
            cls.is_active == True
        ).offset(skip).limit(limit).all()
    
    @classmethod
    def create(cls, db: Session, **kwargs):
        """Create a new record"""
        obj = cls(**kwargs)
        db.add(obj)
        db.commit()
        db.refresh(obj)
        return obj
    
    def save(self, db: Session):
        """Save the current instance"""
        self.updated_at = datetime.utcnow()
        db.add(self)
        db.commit()
        db.refresh(self)
        return self
    
    def delete(self, db: Session):
        """Soft delete the record"""
        self.is_active = False
        self.updated_at = datetime.utcnow()
        db.commit()
        return self


class TimestampMixin:
    """Mixin for models that need timestamp tracking"""
    
    created_at = Column(
        DateTime(timezone=True), 
        server_default=func.now(),
        nullable=False
    )
    
    updated_at = Column(
        DateTime(timezone=True), 
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )


class SoftDeleteMixin:
    """Mixin for models that need soft delete functionality"""
    
    is_active = Column(Boolean, default=True, nullable=False)
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    
    def soft_delete(self, db: Session):
        """Perform soft delete"""
        self.is_active = False
        self.deleted_at = datetime.utcnow()
        db.commit()
    
    def restore(self, db: Session):
        """Restore soft deleted record"""
        self.is_active = True
        self.deleted_at = None
        db.commit()


# Create indexes for common query patterns
def create_tenant_indexes():
    """Create database indexes for multi-tenant performance optimization"""
    indexes = [
        # Composite indexes for tenant-based queries
        Index('idx_tenant_created', 'tenant_id', 'created_at'),
        Index('idx_tenant_active', 'tenant_id', 'is_active'),
        Index('idx_tenant_updated', 'tenant_id', 'updated_at'),
    ]
    return indexes