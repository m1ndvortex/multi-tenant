"""
Tenant-Aware Database Repository System

This module provides repository classes that automatically enforce tenant isolation
for all database operations, ensuring data security in multi-tenant architecture.
"""

from typing import Optional, List, Dict, Any, Type, Union, Tuple
from sqlalchemy.orm import Session, Query
from sqlalchemy import and_, or_, func, desc, asc
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from fastapi import HTTPException, status
import uuid
import logging
from datetime import datetime
from abc import ABC, abstractmethod

from .tenant_context import tenant_context, TenantValidator
from ..models.base import BaseModel, TenantMixin

logger = logging.getLogger(__name__)


class TenantRepositoryError(Exception):
    """Exception raised for tenant repository errors"""
    pass


class BaseTenantRepository(ABC):
    """
    Abstract base class for tenant-aware repositories
    
    Provides common functionality for all tenant-aware database operations
    with automatic tenant isolation and security validation.
    """
    
    def __init__(self, db: Session, model_class: Type[BaseModel]):
        self.db = db
        self.model_class = model_class
        self.is_tenant_aware = hasattr(model_class, 'tenant_id')
    
    def _get_base_query(self) -> Query:
        """Get base query with tenant filtering if applicable"""
        query = self.db.query(self.model_class)
        
        # Apply tenant filtering for tenant-aware models
        if self.is_tenant_aware and not tenant_context.is_super_admin:
            tenant_id = tenant_context.require_tenant_context()
            query = query.filter(self.model_class.tenant_id == tenant_id)
        
        # Apply soft delete filtering
        if hasattr(self.model_class, 'is_active'):
            query = query.filter(self.model_class.is_active == True)
        
        return query
    
    def _validate_tenant_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate and inject tenant_id into data if needed
        
        Args:
            data: Data dictionary for create/update operations
            
        Returns:
            Validated data with tenant_id injected if applicable
        """
        if not self.is_tenant_aware:
            return data
        
        # Super admins must explicitly provide tenant_id
        if tenant_context.is_super_admin:
            if 'tenant_id' not in data:
                raise TenantRepositoryError(
                    "Super admin must explicitly provide tenant_id for tenant-aware resources"
                )
            
            # Validate provided tenant exists
            tenant_id = data['tenant_id']
            if isinstance(tenant_id, str):
                tenant_id = uuid.UUID(tenant_id)
            
            TenantValidator.validate_tenant_exists(self.db, tenant_id)
            data['tenant_id'] = tenant_id
        else:
            # Regular users get automatic tenant_id injection
            tenant_id = tenant_context.require_tenant_context()
            data['tenant_id'] = tenant_id
        
        return data 
   
    def _validate_resource_access(self, resource: BaseModel) -> BaseModel:
        """
        Validate that current user can access the resource
        
        Args:
            resource: Resource to validate access for
            
        Returns:
            Resource if access is valid
            
        Raises:
            HTTPException: If access is denied
        """
        if not resource:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"{self.model_class.__name__} not found"
            )
        
        # Validate tenant access for tenant-aware resources
        if self.is_tenant_aware and not tenant_context.is_super_admin:
            tenant_context.validate_tenant_access(resource.tenant_id)
        
        return resource
    
    def _log_operation(
        self,
        operation: str,
        resource_id: Optional[uuid.UUID] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        """Log repository operation for audit purposes"""
        log_data = {
            'operation': operation,
            'model': self.model_class.__name__,
            'resource_id': str(resource_id) if resource_id else None,
            'tenant_id': str(tenant_context.current_tenant_id) if tenant_context.current_tenant_id else None,
            'user_id': str(tenant_context.current_user_id) if tenant_context.current_user_id else None,
            'is_super_admin': tenant_context.is_super_admin,
            'is_impersonation': tenant_context.is_impersonation,
            'timestamp': datetime.utcnow().isoformat(),
            'details': details or {}
        }
        
        logger.info(f"Repository operation: {log_data}")


class TenantAwareRepository(BaseTenantRepository):
    """
    Concrete implementation of tenant-aware repository
    
    Provides full CRUD operations with automatic tenant isolation,
    subscription limit validation, and comprehensive security checks.
    """
    
    def get_by_id(self, resource_id: uuid.UUID) -> Optional[BaseModel]:
        """
        Get resource by ID with tenant validation
        
        Args:
            resource_id: ID of resource to retrieve
            
        Returns:
            Resource if found and accessible, None otherwise
        """
        try:
            query = self._get_base_query()
            resource = query.filter(self.model_class.id == resource_id).first()
            
            if resource:
                self._validate_resource_access(resource)
                self._log_operation('get_by_id', resource_id)
            
            return resource
            
        except Exception as e:
            logger.error(f"Error getting {self.model_class.__name__} by ID {resource_id}: {e}")
            if isinstance(e, (HTTPException, TenantRepositoryError)):
                raise
            raise TenantRepositoryError(f"Failed to get resource: {e}")
    
    def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        filters: Optional[Dict[str, Any]] = None,
        order_by: Optional[str] = None,
        order_desc: bool = False
    ) -> List[BaseModel]:
        """
        Get all resources with pagination and filtering
        
        Args:
            skip: Number of records to skip
            limit: Maximum number of records to return
            filters: Dictionary of field filters
            order_by: Field name to order by
            order_desc: Whether to order in descending order
            
        Returns:
            List of resources
        """
        try:
            query = self._get_base_query()
            
            # Apply filters
            if filters:
                for field, value in filters.items():
                    if hasattr(self.model_class, field):
                        if isinstance(value, list):
                            query = query.filter(getattr(self.model_class, field).in_(value))
                        elif isinstance(value, dict) and 'operator' in value:
                            # Support for complex filters like {'operator': 'gte', 'value': 100}
                            field_attr = getattr(self.model_class, field)
                            operator = value['operator']
                            filter_value = value['value']
                            
                            if operator == 'gte':
                                query = query.filter(field_attr >= filter_value)
                            elif operator == 'lte':
                                query = query.filter(field_attr <= filter_value)
                            elif operator == 'gt':
                                query = query.filter(field_attr > filter_value)
                            elif operator == 'lt':
                                query = query.filter(field_attr < filter_value)
                            elif operator == 'like':
                                query = query.filter(field_attr.like(f"%{filter_value}%"))
                            elif operator == 'ilike':
                                query = query.filter(field_attr.ilike(f"%{filter_value}%"))
                            else:
                                query = query.filter(field_attr == filter_value)
                        else:
                            query = query.filter(getattr(self.model_class, field) == value)
            
            # Apply ordering
            if order_by and hasattr(self.model_class, order_by):
                order_field = getattr(self.model_class, order_by)
                if order_desc:
                    query = query.order_by(desc(order_field))
                else:
                    query = query.order_by(asc(order_field))
            else:
                # Default ordering by created_at desc
                if hasattr(self.model_class, 'created_at'):
                    query = query.order_by(desc(self.model_class.created_at))
            
            # Apply pagination
            resources = query.offset(skip).limit(limit).all()
            
            self._log_operation('get_all', details={
                'count': len(resources),
                'skip': skip,
                'limit': limit,
                'filters': filters
            })
            
            return resources
            
        except Exception as e:
            logger.error(f"Error getting all {self.model_class.__name__}: {e}")
            raise TenantRepositoryError(f"Failed to get resources: {e}")
    
    def count(self, filters: Optional[Dict[str, Any]] = None) -> int:
        """
        Count resources with optional filtering
        
        Args:
            filters: Dictionary of field filters
            
        Returns:
            Count of matching resources
        """
        try:
            query = self._get_base_query()
            
            # Apply filters
            if filters:
                for field, value in filters.items():
                    if hasattr(self.model_class, field):
                        if isinstance(value, list):
                            query = query.filter(getattr(self.model_class, field).in_(value))
                        else:
                            query = query.filter(getattr(self.model_class, field) == value)
            
            count = query.count()
            
            self._log_operation('count', details={'count': count, 'filters': filters})
            
            return count
            
        except Exception as e:
            logger.error(f"Error counting {self.model_class.__name__}: {e}")
            raise TenantRepositoryError(f"Failed to count resources: {e}")    

    def create(self, data: Dict[str, Any]) -> BaseModel:
        """
        Create new resource with tenant validation and limit checking
        
        Args:
            data: Data for creating the resource
            
        Returns:
            Created resource
        """
        try:
            # Validate and inject tenant data
            validated_data = self._validate_tenant_data(data.copy())
            
            # Check subscription limits for tenant-aware resources
            if self.is_tenant_aware and not tenant_context.is_super_admin:
                # Determine resource type for limit checking
                resource_type = self._get_resource_type_for_limits()
                if resource_type:
                    TenantValidator.validate_subscription_limits(self.db, resource_type)
            
            # Create the resource
            resource = self.model_class(**validated_data)
            self.db.add(resource)
            self.db.commit()
            self.db.refresh(resource)
            
            self._log_operation('create', resource.id, {'data': validated_data})
            
            return resource
            
        except IntegrityError as e:
            self.db.rollback()
            logger.error(f"Integrity error creating {self.model_class.__name__}: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Data integrity constraint violation"
            )
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error creating {self.model_class.__name__}: {e}")
            if isinstance(e, (HTTPException, TenantRepositoryError)):
                raise
            raise TenantRepositoryError(f"Failed to create resource: {e}")
    
    def update(self, resource_id: uuid.UUID, data: Dict[str, Any]) -> BaseModel:
        """
        Update resource with tenant validation
        
        Args:
            resource_id: ID of resource to update
            data: Data for updating the resource
            
        Returns:
            Updated resource
        """
        try:
            # Get existing resource with tenant validation
            resource = self.get_by_id(resource_id)
            if not resource:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"{self.model_class.__name__} not found"
                )
            
            # Prevent tenant_id changes for security
            if 'tenant_id' in data and self.is_tenant_aware:
                if not tenant_context.is_super_admin:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Cannot change tenant_id"
                    )
                
                # Validate new tenant exists
                new_tenant_id = data['tenant_id']
                if isinstance(new_tenant_id, str):
                    new_tenant_id = uuid.UUID(new_tenant_id)
                TenantValidator.validate_tenant_exists(self.db, new_tenant_id)
            
            # Update resource fields
            for field, value in data.items():
                if hasattr(resource, field) and field not in ['id', 'created_at']:
                    setattr(resource, field, value)
            
            # Update timestamp
            if hasattr(resource, 'updated_at'):
                resource.updated_at = datetime.utcnow()
            
            self.db.commit()
            self.db.refresh(resource)
            
            self._log_operation('update', resource_id, {'data': data})
            
            return resource
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error updating {self.model_class.__name__} {resource_id}: {e}")
            if isinstance(e, (HTTPException, TenantRepositoryError)):
                raise
            raise TenantRepositoryError(f"Failed to update resource: {e}")
    
    def delete(self, resource_id: uuid.UUID, hard_delete: bool = False) -> bool:
        """
        Delete resource (soft delete by default)
        
        Args:
            resource_id: ID of resource to delete
            hard_delete: Whether to perform hard delete
            
        Returns:
            True if deleted successfully
        """
        try:
            # Get existing resource with tenant validation
            resource = self.get_by_id(resource_id)
            if not resource:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"{self.model_class.__name__} not found"
                )
            
            if hard_delete:
                # Hard delete - remove from database
                self.db.delete(resource)
            else:
                # Soft delete - mark as inactive
                if hasattr(resource, 'is_active'):
                    resource.is_active = False
                    if hasattr(resource, 'updated_at'):
                        resource.updated_at = datetime.utcnow()
                    if hasattr(resource, 'deleted_at'):
                        resource.deleted_at = datetime.utcnow()
                else:
                    # Model doesn't support soft delete, perform hard delete
                    self.db.delete(resource)
                    hard_delete = True
            
            self.db.commit()
            
            self._log_operation(
                'hard_delete' if hard_delete else 'soft_delete',
                resource_id
            )
            
            return True
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error deleting {self.model_class.__name__} {resource_id}: {e}")
            if isinstance(e, (HTTPException, TenantRepositoryError)):
                raise
            raise TenantRepositoryError(f"Failed to delete resource: {e}")
    
    def _get_resource_type_for_limits(self) -> Optional[str]:
        """
        Get resource type name for subscription limit checking
        
        Returns:
            Resource type name or None if not applicable
        """
        model_name = self.model_class.__name__.lower()
        
        # Map model names to resource types for limit checking
        resource_type_mapping = {
            'user': 'users',
            'customer': 'customers',
            'product': 'products',
            'invoice': 'monthly_invoices'
        }
        
        return resource_type_mapping.get(model_name)


# Repository factory function
def get_tenant_repository(db: Session, model_class: Type[BaseModel]) -> TenantAwareRepository:
    """
    Factory function to get tenant-aware repository for a model
    
    Args:
        db: Database session
        model_class: SQLAlchemy model class
        
    Returns:
        TenantAwareRepository instance
    """
    return TenantAwareRepository(db, model_class)


class TenantAwareQueryBuilder:
    """
    Advanced query builder for tenant-aware complex queries
    """
    
    def __init__(self, db: Session, model_class: Type[BaseModel]):
        self.db = db
        self.model_class = model_class
        self.is_tenant_aware = hasattr(model_class, 'tenant_id')
        self._query = self._get_base_query()
    
    def _get_base_query(self) -> Query:
        """Get base query with tenant filtering"""
        query = self.db.query(self.model_class)
        
        # Apply tenant filtering for tenant-aware models
        if self.is_tenant_aware and not tenant_context.is_super_admin:
            tenant_id = tenant_context.require_tenant_context()
            query = query.filter(self.model_class.tenant_id == tenant_id)
        
        # Apply soft delete filtering
        if hasattr(self.model_class, 'is_active'):
            query = query.filter(self.model_class.is_active == True)
        
        return query
    
    def filter_by(self, **kwargs) -> 'TenantAwareQueryBuilder':
        """Add filter conditions"""
        for field, value in kwargs.items():
            if hasattr(self.model_class, field):
                self._query = self._query.filter(getattr(self.model_class, field) == value)
        return self
    
    def filter(self, *conditions) -> 'TenantAwareQueryBuilder':
        """Add custom filter conditions"""
        self._query = self._query.filter(*conditions)
        return self
    
    def order_by(self, *columns) -> 'TenantAwareQueryBuilder':
        """Add ordering"""
        self._query = self._query.order_by(*columns)
        return self
    
    def limit(self, limit: int) -> 'TenantAwareQueryBuilder':
        """Add limit"""
        self._query = self._query.limit(limit)
        return self
    
    def offset(self, offset: int) -> 'TenantAwareQueryBuilder':
        """Add offset"""
        self._query = self._query.offset(offset)
        return self
    
    def all(self) -> List[BaseModel]:
        """Execute query and return all results"""
        return self._query.all()
    
    def first(self) -> Optional[BaseModel]:
        """Execute query and return first result"""
        return self._query.first()
    
    def count(self) -> int:
        """Execute query and return count"""
        return self._query.count()
    
    def paginate(self, page: int, per_page: int) -> Tuple[List[BaseModel], int]:
        """
        Execute query with pagination
        
        Returns:
            Tuple of (results, total_count)
        """
        total_count = self._query.count()
        results = self._query.offset((page - 1) * per_page).limit(per_page).all()
        return results, total_count


# Query builder factory function
def get_tenant_query_builder(db: Session, model_class: Type[BaseModel]) -> TenantAwareQueryBuilder:
    """
    Factory function to get tenant-aware query builder for a model
    
    Args:
        db: Database session
        model_class: SQLAlchemy model class
        
    Returns:
        TenantAwareQueryBuilder instance
    """
    return TenantAwareQueryBuilder(db, model_class)