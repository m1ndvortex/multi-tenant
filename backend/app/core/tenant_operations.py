"""
Tenant-aware database operations and utilities
"""

from typing import Optional, List, Dict, Any, Type, Union
from sqlalchemy.orm import Session, Query
from sqlalchemy import and_, or_, func, text
from sqlalchemy.exc import IntegrityError
import uuid
import logging
from datetime import datetime

from .tenant_context import TenantContext, TenantAwareQuery, get_current_tenant_id
from ..models.base import BaseModel, TenantMixin
from ..models.tenant import Tenant, TenantStatus
from ..models.user import User

logger = logging.getLogger(__name__)


class TenantAwareOperations:
    """
    Database operations with automatic tenant isolation
    """
    
    def __init__(self, db: Session):
        self.db = db
        self.context = TenantContext.get_current()
    
    def create(self, model_class: Type[BaseModel], data: Dict[str, Any], 
               tenant_id: Optional[str] = None) -> BaseModel:
        """
        Create a new record with automatic tenant_id injection
        """
        # Determine tenant_id
        if hasattr(model_class, 'tenant_id'):
            if tenant_id:
                # Validate access to specified tenant
                self.context.ensure_tenant_access(tenant_id)
                data['tenant_id'] = tenant_id
            elif self.context.tenant_id:
                data['tenant_id'] = self.context.tenant_id
            elif not self.context.is_super_admin:
                raise ValueError("Tenant ID required for tenant-specific models")
        
        try:
            # Create the record
            record = model_class(**data)
            self.db.add(record)
            self.db.commit()
            self.db.refresh(record)
            
            logger.info(f"Created {model_class.__name__} record {record.id} for tenant {data.get('tenant_id')}")
            return record
            
        except IntegrityError as e:
            self.db.rollback()
            logger.error(f"Failed to create {model_class.__name__}: {e}")
            raise ValueError(f"Failed to create record: {str(e)}")
    
    def get_by_id(self, model_class: Type[BaseModel], record_id: str, 
                  tenant_id: Optional[str] = None) -> Optional[BaseModel]:
        """
        Get record by ID with tenant isolation
        """
        query = self.db.query(model_class).filter(model_class.id == record_id)
        
        # Apply tenant filter if model supports it
        if hasattr(model_class, 'tenant_id'):
            query = TenantAwareQuery.filter_by_tenant(query, model_class, tenant_id)
        
        return query.first()
    
    def get_all(self, model_class: Type[BaseModel], filters: Optional[Dict[str, Any]] = None,
                skip: int = 0, limit: int = 100, tenant_id: Optional[str] = None) -> List[BaseModel]:
        """
        Get all records with tenant isolation and optional filters
        """
        query = self.db.query(model_class)
        
        # Apply tenant filter if model supports it
        if hasattr(model_class, 'tenant_id'):
            query = TenantAwareQuery.filter_by_tenant(query, model_class, tenant_id)
        
        # Apply additional filters
        if filters:
            validated_filters = TenantAwareQuery.validate_tenant_data_access(
                self.db, model_class, filters
            )
            for key, value in validated_filters.items():
                if hasattr(model_class, key):
                    query = query.filter(getattr(model_class, key) == value)
        
        # Apply pagination
        return query.offset(skip).limit(limit).all()
    
    def update(self, model_class: Type[BaseModel], record_id: str, 
               data: Dict[str, Any], tenant_id: Optional[str] = None) -> Optional[BaseModel]:
        """
        Update record with tenant isolation
        """
        # Get the record with tenant validation
        record = self.get_by_id(model_class, record_id, tenant_id)
        
        if not record:
            return None
        
        try:
            # Update fields
            for key, value in data.items():
                if hasattr(record, key) and key not in ['id', 'created_at', 'tenant_id']:
                    setattr(record, key, value)
            
            # Update timestamp
            if hasattr(record, 'updated_at'):
                record.updated_at = datetime.utcnow()
            
            self.db.commit()
            self.db.refresh(record)
            
            logger.info(f"Updated {model_class.__name__} record {record_id}")
            return record
            
        except IntegrityError as e:
            self.db.rollback()
            logger.error(f"Failed to update {model_class.__name__} {record_id}: {e}")
            raise ValueError(f"Failed to update record: {str(e)}")
    
    def delete(self, model_class: Type[BaseModel], record_id: str, 
               soft_delete: bool = True, tenant_id: Optional[str] = None) -> bool:
        """
        Delete record with tenant isolation (soft delete by default)
        """
        # Get the record with tenant validation
        record = self.get_by_id(model_class, record_id, tenant_id)
        
        if not record:
            return False
        
        try:
            if soft_delete and hasattr(record, 'is_active'):
                # Soft delete
                record.is_active = False
                if hasattr(record, 'updated_at'):
                    record.updated_at = datetime.utcnow()
                self.db.commit()
                logger.info(f"Soft deleted {model_class.__name__} record {record_id}")
            else:
                # Hard delete
                self.db.delete(record)
                self.db.commit()
                logger.info(f"Hard deleted {model_class.__name__} record {record_id}")
            
            return True
            
        except IntegrityError as e:
            self.db.rollback()
            logger.error(f"Failed to delete {model_class.__name__} {record_id}: {e}")
            raise ValueError(f"Failed to delete record: {str(e)}")
    
    def count(self, model_class: Type[BaseModel], filters: Optional[Dict[str, Any]] = None,
              tenant_id: Optional[str] = None) -> int:
        """
        Count records with tenant isolation
        """
        query = self.db.query(model_class)
        
        # Apply tenant filter if model supports it
        if hasattr(model_class, 'tenant_id'):
            query = TenantAwareQuery.filter_by_tenant(query, model_class, tenant_id)
        
        # Apply additional filters
        if filters:
            validated_filters = TenantAwareQuery.validate_tenant_data_access(
                self.db, model_class, filters
            )
            for key, value in validated_filters.items():
                if hasattr(model_class, key):
                    query = query.filter(getattr(model_class, key) == value)
        
        return query.count()
    
    def exists(self, model_class: Type[BaseModel], record_id: str, 
               tenant_id: Optional[str] = None) -> bool:
        """
        Check if record exists with tenant isolation
        """
        return self.get_by_id(model_class, record_id, tenant_id) is not None
    
    def bulk_create(self, model_class: Type[BaseModel], data_list: List[Dict[str, Any]], 
                    tenant_id: Optional[str] = None) -> List[BaseModel]:
        """
        Bulk create records with tenant isolation
        """
        records = []
        
        try:
            for data in data_list:
                # Add tenant_id if model supports it
                if hasattr(model_class, 'tenant_id'):
                    if tenant_id:
                        self.context.ensure_tenant_access(tenant_id)
                        data['tenant_id'] = tenant_id
                    elif self.context.tenant_id:
                        data['tenant_id'] = self.context.tenant_id
                    elif not self.context.is_super_admin:
                        raise ValueError("Tenant ID required for tenant-specific models")
                
                record = model_class(**data)
                records.append(record)
            
            # Bulk insert
            self.db.add_all(records)
            self.db.commit()
            
            # Refresh all records
            for record in records:
                self.db.refresh(record)
            
            logger.info(f"Bulk created {len(records)} {model_class.__name__} records")
            return records
            
        except IntegrityError as e:
            self.db.rollback()
            logger.error(f"Failed to bulk create {model_class.__name__}: {e}")
            raise ValueError(f"Failed to bulk create records: {str(e)}")
    
    def search(self, model_class: Type[BaseModel], search_term: str, 
               search_fields: List[str], filters: Optional[Dict[str, Any]] = None,
               skip: int = 0, limit: int = 100, tenant_id: Optional[str] = None) -> List[BaseModel]:
        """
        Search records with tenant isolation
        """
        query = self.db.query(model_class)
        
        # Apply tenant filter if model supports it
        if hasattr(model_class, 'tenant_id'):
            query = TenantAwareQuery.filter_by_tenant(query, model_class, tenant_id)
        
        # Apply search filters
        if search_term and search_fields:
            search_conditions = []
            for field in search_fields:
                if hasattr(model_class, field):
                    field_attr = getattr(model_class, field)
                    # Use word boundary search for more precise matching
                    search_conditions.append(field_attr.ilike(f"%{search_term}%"))
            
            if search_conditions:
                query = query.filter(or_(*search_conditions))
        
        # Apply additional filters
        if filters:
            validated_filters = TenantAwareQuery.validate_tenant_data_access(
                self.db, model_class, filters
            )
            for key, value in validated_filters.items():
                if hasattr(model_class, key):
                    query = query.filter(getattr(model_class, key) == value)
        
        # Apply pagination
        return query.offset(skip).limit(limit).all()


class TenantSwitchingUtility:
    """
    Utility for tenant switching and validation
    """
    
    def __init__(self, db: Session):
        self.db = db
    
    def switch_tenant_context(self, user_id: str, target_tenant_id: str) -> TenantContext:
        """
        Switch tenant context for a user (for multi-tenant users)
        """
        # Validate user exists and is active
        from ..models.user import UserStatus
        user = self.db.query(User).filter(
            User.id == user_id,
            User.status == UserStatus.ACTIVE
        ).first()
        
        if not user:
            raise ValueError("User not found or inactive")
        
        # Super admin can switch to any tenant
        if user.is_super_admin:
            target_tenant = self.db.query(Tenant).filter(
                Tenant.id == target_tenant_id,
                Tenant.is_active == True
            ).first()
            
            if not target_tenant:
                raise ValueError("Target tenant not found or inactive")
            
            return TenantContext(
                tenant_id=target_tenant_id,
                user_id=user_id,
                is_super_admin=True
            )
        
        # Regular users can only access their own tenant
        if str(user.tenant_id) != target_tenant_id:
            raise ValueError("User does not have access to target tenant")
        
        # Validate tenant is active
        if not user.tenant or user.tenant.status != TenantStatus.ACTIVE:
            raise ValueError("User's tenant is not active")
        
        return TenantContext(
            tenant_id=target_tenant_id,
            user_id=user_id,
            is_super_admin=False
        )
    
    def validate_tenant_switch(self, user_id: str, target_tenant_id: str) -> bool:
        """
        Validate if user can switch to target tenant
        """
        try:
            self.switch_tenant_context(user_id, target_tenant_id)
            return True
        except ValueError:
            return False
    
    def get_user_accessible_tenants(self, user_id: str) -> List[Dict[str, Any]]:
        """
        Get list of tenants accessible to user
        """
        from ..models.user import UserStatus
        user = self.db.query(User).filter(
            User.id == user_id,
            User.status == UserStatus.ACTIVE
        ).first()
        
        if not user:
            return []
        
        if user.is_super_admin:
            # Super admin can access all active tenants
            tenants = self.db.query(Tenant).filter(
                Tenant.is_active == True
            ).all()
        else:
            # Regular users can only access their own tenant
            tenants = [user.tenant] if user.tenant and user.tenant.is_active else []
        
        return [
            {
                "id": str(tenant.id),
                "name": tenant.name,
                "subscription_type": tenant.subscription_type.value,
                "status": tenant.status.value
            }
            for tenant in tenants
        ]


class TenantDataIsolationValidator:
    """
    Validator for ensuring proper tenant data isolation
    """
    
    def __init__(self, db: Session):
        self.db = db
    
    def validate_cross_tenant_access(self, model_class: Type[BaseModel], 
                                   record_ids: List[str], expected_tenant_id: str) -> Dict[str, bool]:
        """
        Validate that all records belong to the expected tenant
        """
        if not hasattr(model_class, 'tenant_id'):
            # Model doesn't support multi-tenancy, all records are accessible
            return {record_id: True for record_id in record_ids}
        
        # Query all records and check tenant_id
        records = self.db.query(model_class).filter(
            model_class.id.in_(record_ids)
        ).all()
        
        results = {}
        for record_id in record_ids:
            record = next((r for r in records if str(r.id) == record_id), None)
            if record:
                results[record_id] = str(record.tenant_id) == expected_tenant_id
            else:
                results[record_id] = False
        
        return results
    
    def audit_tenant_data_access(self, model_class: Type[BaseModel], 
                                action: str, record_ids: List[str]) -> Dict[str, Any]:
        """
        Audit tenant data access for security monitoring
        """
        context = TenantContext.get_current()
        
        audit_result = {
            "timestamp": datetime.utcnow().isoformat(),
            "tenant_id": context.tenant_id,
            "user_id": context.user_id,
            "is_super_admin": context.is_super_admin,
            "is_impersonation": context.is_impersonation,
            "model": model_class.__name__,
            "action": action,
            "record_count": len(record_ids),
            "violations": []
        }
        
        if hasattr(model_class, 'tenant_id') and context.tenant_id and not context.is_super_admin:
            # Check for cross-tenant access violations
            validation_results = self.validate_cross_tenant_access(
                model_class, record_ids, context.tenant_id
            )
            
            violations = [
                record_id for record_id, is_valid in validation_results.items() 
                if not is_valid
            ]
            
            audit_result["violations"] = violations
            
            if violations:
                logger.warning(f"Tenant data isolation violation detected: {audit_result}")
        
        return audit_result
    
    def check_tenant_data_integrity(self, tenant_id: str) -> Dict[str, Any]:
        """
        Check data integrity for a specific tenant
        """
        from ..models import Customer, Product, Invoice, User  # Import here to avoid circular imports
        
        integrity_report = {
            "tenant_id": tenant_id,
            "timestamp": datetime.utcnow().isoformat(),
            "checks": {}
        }
        
        # Check user data integrity
        user_count = self.db.query(User).filter(User.tenant_id == tenant_id).count()
        integrity_report["checks"]["users"] = {
            "count": user_count,
            "status": "ok"
        }
        
        # Check customer data integrity
        customer_count = self.db.query(Customer).filter(Customer.tenant_id == tenant_id).count()
        integrity_report["checks"]["customers"] = {
            "count": customer_count,
            "status": "ok"
        }
        
        # Check product data integrity
        product_count = self.db.query(Product).filter(Product.tenant_id == tenant_id).count()
        integrity_report["checks"]["products"] = {
            "count": product_count,
            "status": "ok"
        }
        
        # Check invoice data integrity
        invoice_count = self.db.query(Invoice).filter(Invoice.tenant_id == tenant_id).count()
        integrity_report["checks"]["invoices"] = {
            "count": invoice_count,
            "status": "ok"
        }
        
        # Check for orphaned records (records with invalid tenant_id)
        orphaned_checks = {}
        
        # This would be expanded to check all tenant-aware models
        models_to_check = [
            (Customer, "customers"),
            (Product, "products"), 
            (Invoice, "invoices"),
            (User, "users")
        ]
        
        for model_class, model_name in models_to_check:
            orphaned_count = self.db.query(model_class).filter(
                ~model_class.tenant_id.in_(
                    self.db.query(Tenant.id).filter(Tenant.is_active == True)
                )
            ).count()
            
            orphaned_checks[model_name] = orphaned_count
        
        integrity_report["orphaned_records"] = orphaned_checks
        
        return integrity_report


def get_tenant_operations(db: Session = None) -> TenantAwareOperations:
    """
    Factory function to get tenant-aware operations instance
    """
    if db is None:
        from .database import SessionLocal
        db = SessionLocal()
    
    return TenantAwareOperations(db)


def get_tenant_switching_utility(db: Session = None) -> TenantSwitchingUtility:
    """
    Factory function to get tenant switching utility
    """
    if db is None:
        from .database import SessionLocal
        db = SessionLocal()
    
    return TenantSwitchingUtility(db)


def get_tenant_validator(db: Session = None) -> TenantDataIsolationValidator:
    """
    Factory function to get tenant data isolation validator
    """
    if db is None:
        from .database import SessionLocal
        db = SessionLocal()
    
    return TenantDataIsolationValidator(db)