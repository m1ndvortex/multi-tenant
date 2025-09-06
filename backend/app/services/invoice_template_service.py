"""
Invoice template and customization service
"""

from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from typing import List, Optional, Dict, Any
from fastapi import HTTPException, status
import uuid
from datetime import datetime

from ..models.invoice_template import (
    InvoiceTemplate, InvoiceCustomField, InvoiceNumberingScheme, 
    InvoiceBranding, InvoiceItemCustomFieldValue, TemplateType, FieldType
)
from ..models.invoice import Invoice, InvoiceItem
from ..schemas.invoice_template import (
    InvoiceTemplateCreate, InvoiceTemplateUpdate,
    InvoiceCustomFieldCreate, InvoiceCustomFieldUpdate,
    InvoiceNumberingSchemeCreate, InvoiceNumberingSchemeUpdate,
    InvoiceBrandingCreate, InvoiceBrandingUpdate,
    InvoiceItemCustomFieldValueCreate, InvoiceItemCustomFieldValueUpdate
)


class InvoiceTemplateService:
    """Service for managing invoice templates and customization"""
    
    def __init__(self, db: Session):
        self.db = db
    
    # Template Management
    def create_template(self, tenant_id: uuid.UUID, template_data: InvoiceTemplateCreate) -> InvoiceTemplate:
        """Create a new invoice template"""
        # Check if setting as default
        if template_data.is_default:
            # Unset other default templates of the same type
            self.db.query(InvoiceTemplate).filter(
                and_(
                    InvoiceTemplate.tenant_id == tenant_id,
                    InvoiceTemplate.template_type == template_data.template_type,
                    InvoiceTemplate.is_default == True
                )
            ).update({"is_default": False})
        
        template = InvoiceTemplate(
            tenant_id=tenant_id,
            **template_data.dict()
        )
        
        self.db.add(template)
        self.db.commit()
        self.db.refresh(template)
        
        return template
    
    def get_template(self, tenant_id: uuid.UUID, template_id: uuid.UUID) -> Optional[InvoiceTemplate]:
        """Get a specific template"""
        return self.db.query(InvoiceTemplate).filter(
            and_(
                InvoiceTemplate.tenant_id == tenant_id,
                InvoiceTemplate.id == template_id,
                InvoiceTemplate.is_active == True
            )
        ).first()
    
    def get_templates(
        self, 
        tenant_id: uuid.UUID, 
        template_type: Optional[TemplateType] = None,
        is_active: Optional[bool] = True,
        skip: int = 0, 
        limit: int = 100
    ) -> List[InvoiceTemplate]:
        """Get templates for a tenant"""
        query = self.db.query(InvoiceTemplate).filter(InvoiceTemplate.tenant_id == tenant_id)
        
        if template_type:
            query = query.filter(InvoiceTemplate.template_type == template_type)
        
        if is_active is not None:
            query = query.filter(InvoiceTemplate.is_active == is_active)
        
        return query.offset(skip).limit(limit).all()
    
    def update_template(
        self, 
        tenant_id: uuid.UUID, 
        template_id: uuid.UUID, 
        template_data: InvoiceTemplateUpdate
    ) -> Optional[InvoiceTemplate]:
        """Update an existing template"""
        template = self.get_template(tenant_id, template_id)
        if not template:
            return None
        
        update_data = template_data.dict(exclude_unset=True)
        
        # Handle default template logic
        if update_data.get('is_default'):
            # Unset other default templates of the same type
            self.db.query(InvoiceTemplate).filter(
                and_(
                    InvoiceTemplate.tenant_id == tenant_id,
                    InvoiceTemplate.template_type == template.template_type,
                    InvoiceTemplate.id != template_id,
                    InvoiceTemplate.is_default == True
                )
            ).update({"is_default": False})
        
        for field, value in update_data.items():
            setattr(template, field, value)
        
        template.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(template)
        
        return template
    
    def delete_template(self, tenant_id: uuid.UUID, template_id: uuid.UUID) -> bool:
        """Delete a template (soft delete)"""
        template = self.get_template(tenant_id, template_id)
        if not template:
            return False
        
        # Check if template is in use
        invoices_using_template = self.db.query(Invoice).filter(
            Invoice.template_id == template_id
        ).count()
        
        if invoices_using_template > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete template that is in use by invoices"
            )
        
        template.is_active = False
        template.updated_at = datetime.utcnow()
        self.db.commit()
        
        return True
    
    def get_default_template(self, tenant_id: uuid.UUID, template_type: TemplateType) -> Optional[InvoiceTemplate]:
        """Get the default template for a specific type"""
        return self.db.query(InvoiceTemplate).filter(
            and_(
                InvoiceTemplate.tenant_id == tenant_id,
                InvoiceTemplate.template_type == template_type,
                InvoiceTemplate.is_default == True,
                InvoiceTemplate.is_active == True
            )
        ).first()
    
    # Custom Field Management
    def create_custom_field(
        self, 
        tenant_id: uuid.UUID, 
        field_data: InvoiceCustomFieldCreate
    ) -> InvoiceCustomField:
        """Create a new custom field"""
        # Verify template belongs to tenant
        template = self.get_template(tenant_id, field_data.template_id)
        if not template:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Template not found"
            )
        
        # Check for duplicate field names within template
        existing_field = self.db.query(InvoiceCustomField).filter(
            and_(
                InvoiceCustomField.template_id == field_data.template_id,
                InvoiceCustomField.field_name == field_data.field_name
            )
        ).first()
        
        if existing_field:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Field name already exists in this template"
            )
        
        custom_field = InvoiceCustomField(
            tenant_id=tenant_id,
            **field_data.dict()
        )
        
        self.db.add(custom_field)
        self.db.commit()
        self.db.refresh(custom_field)
        
        return custom_field
    
    def get_custom_fields(
        self, 
        tenant_id: uuid.UUID, 
        template_id: Optional[uuid.UUID] = None,
        is_line_item_field: Optional[bool] = None
    ) -> List[InvoiceCustomField]:
        """Get custom fields for a tenant or template"""
        query = self.db.query(InvoiceCustomField).filter(InvoiceCustomField.tenant_id == tenant_id)
        
        if template_id:
            query = query.filter(InvoiceCustomField.template_id == template_id)
        
        if is_line_item_field is not None:
            query = query.filter(InvoiceCustomField.is_line_item_field == is_line_item_field)
        
        return query.order_by(InvoiceCustomField.display_order).all()
    
    def update_custom_field(
        self, 
        tenant_id: uuid.UUID, 
        field_id: uuid.UUID, 
        field_data: InvoiceCustomFieldUpdate
    ) -> Optional[InvoiceCustomField]:
        """Update a custom field"""
        custom_field = self.db.query(InvoiceCustomField).filter(
            and_(
                InvoiceCustomField.tenant_id == tenant_id,
                InvoiceCustomField.id == field_id
            )
        ).first()
        
        if not custom_field:
            return None
        
        update_data = field_data.dict(exclude_unset=True)
        
        for field, value in update_data.items():
            setattr(custom_field, field, value)
        
        custom_field.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(custom_field)
        
        return custom_field
    
    def delete_custom_field(self, tenant_id: uuid.UUID, field_id: uuid.UUID) -> bool:
        """Delete a custom field"""
        custom_field = self.db.query(InvoiceCustomField).filter(
            and_(
                InvoiceCustomField.tenant_id == tenant_id,
                InvoiceCustomField.id == field_id
            )
        ).first()
        
        if not custom_field:
            return False
        
        # Check if field has values
        field_values = self.db.query(InvoiceItemCustomFieldValue).filter(
            InvoiceItemCustomFieldValue.custom_field_id == field_id
        ).count()
        
        if field_values > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete custom field that has values"
            )
        
        self.db.delete(custom_field)
        self.db.commit()
        
        return True
    
    # Numbering Scheme Management
    def create_numbering_scheme(
        self, 
        tenant_id: uuid.UUID, 
        scheme_data: InvoiceNumberingSchemeCreate
    ) -> InvoiceNumberingScheme:
        """Create a new numbering scheme"""
        # Check if setting as default
        if scheme_data.is_default:
            # Unset other default schemes
            self.db.query(InvoiceNumberingScheme).filter(
                and_(
                    InvoiceNumberingScheme.tenant_id == tenant_id,
                    InvoiceNumberingScheme.is_default == True
                )
            ).update({"is_default": False})
        
        numbering_scheme = InvoiceNumberingScheme(
            tenant_id=tenant_id,
            **scheme_data.dict()
        )
        
        self.db.add(numbering_scheme)
        self.db.commit()
        self.db.refresh(numbering_scheme)
        
        return numbering_scheme
    
    def get_numbering_schemes(self, tenant_id: uuid.UUID) -> List[InvoiceNumberingScheme]:
        """Get numbering schemes for a tenant"""
        return self.db.query(InvoiceNumberingScheme).filter(
            and_(
                InvoiceNumberingScheme.tenant_id == tenant_id,
                InvoiceNumberingScheme.is_active == True
            )
        ).all()
    
    def get_default_numbering_scheme(self, tenant_id: uuid.UUID) -> Optional[InvoiceNumberingScheme]:
        """Get the default numbering scheme"""
        return self.db.query(InvoiceNumberingScheme).filter(
            and_(
                InvoiceNumberingScheme.tenant_id == tenant_id,
                InvoiceNumberingScheme.is_default == True,
                InvoiceNumberingScheme.is_active == True
            )
        ).first()
    
    def generate_invoice_number(
        self, 
        tenant_id: uuid.UUID, 
        scheme_id: Optional[uuid.UUID] = None
    ) -> str:
        """Generate the next invoice number"""
        if scheme_id:
            scheme = self.db.query(InvoiceNumberingScheme).filter(
                and_(
                    InvoiceNumberingScheme.tenant_id == tenant_id,
                    InvoiceNumberingScheme.id == scheme_id,
                    InvoiceNumberingScheme.is_active == True
                )
            ).first()
        else:
            scheme = self.get_default_numbering_scheme(tenant_id)
        
        if not scheme:
            # Fallback to simple sequential numbering
            last_invoice = self.db.query(Invoice).filter(
                Invoice.tenant_id == tenant_id
            ).order_by(Invoice.created_at.desc()).first()
            
            if last_invoice and last_invoice.invoice_number.isdigit():
                return str(int(last_invoice.invoice_number) + 1)
            else:
                return "1"
        
        invoice_number = scheme.generate_next_number()
        self.db.commit()  # Save the updated sequence
        
        return invoice_number
    
    def preview_invoice_numbers(
        self, 
        tenant_id: uuid.UUID, 
        scheme_id: uuid.UUID, 
        count: int = 5
    ) -> List[str]:
        """Preview the next invoice numbers without incrementing sequence"""
        scheme = self.db.query(InvoiceNumberingScheme).filter(
            and_(
                InvoiceNumberingScheme.tenant_id == tenant_id,
                InvoiceNumberingScheme.id == scheme_id,
                InvoiceNumberingScheme.is_active == True
            )
        ).first()
        
        if not scheme:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Numbering scheme not found"
            )
        
        # Generate preview numbers without saving
        preview_numbers = []
        original_sequence = scheme.current_sequence
        
        for i in range(count):
            preview_numbers.append(scheme.generate_next_number())
        
        # Reset sequence to original value
        scheme.current_sequence = original_sequence
        
        return preview_numbers
    
    # Branding Management
    def create_branding(self, tenant_id: uuid.UUID, branding_data: InvoiceBrandingCreate) -> InvoiceBranding:
        """Create a new branding configuration"""
        # Check if setting as default
        if branding_data.is_default:
            # Unset other default branding
            self.db.query(InvoiceBranding).filter(
                and_(
                    InvoiceBranding.tenant_id == tenant_id,
                    InvoiceBranding.is_default == True
                )
            ).update({"is_default": False})
        
        branding = InvoiceBranding(
            tenant_id=tenant_id,
            **branding_data.dict()
        )
        
        self.db.add(branding)
        self.db.commit()
        self.db.refresh(branding)
        
        return branding
    
    def get_branding_configs(self, tenant_id: uuid.UUID) -> List[InvoiceBranding]:
        """Get branding configurations for a tenant"""
        return self.db.query(InvoiceBranding).filter(
            and_(
                InvoiceBranding.tenant_id == tenant_id,
                InvoiceBranding.is_active == True
            )
        ).all()
    
    def get_default_branding(self, tenant_id: uuid.UUID) -> Optional[InvoiceBranding]:
        """Get the default branding configuration"""
        return self.db.query(InvoiceBranding).filter(
            and_(
                InvoiceBranding.tenant_id == tenant_id,
                InvoiceBranding.is_default == True,
                InvoiceBranding.is_active == True
            )
        ).first()
    
    def update_branding(
        self, 
        tenant_id: uuid.UUID, 
        branding_id: uuid.UUID, 
        branding_data: InvoiceBrandingUpdate
    ) -> Optional[InvoiceBranding]:
        """Update a branding configuration"""
        branding = self.db.query(InvoiceBranding).filter(
            and_(
                InvoiceBranding.tenant_id == tenant_id,
                InvoiceBranding.id == branding_id,
                InvoiceBranding.is_active == True
            )
        ).first()
        
        if not branding:
            return None
        
        update_data = branding_data.dict(exclude_unset=True)
        
        # Handle default branding logic
        if update_data.get('is_default'):
            # Unset other default branding
            self.db.query(InvoiceBranding).filter(
                and_(
                    InvoiceBranding.tenant_id == tenant_id,
                    InvoiceBranding.id != branding_id,
                    InvoiceBranding.is_default == True
                )
            ).update({"is_default": False})
        
        for field, value in update_data.items():
            setattr(branding, field, value)
        
        branding.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(branding)
        
        return branding
    
    # Custom Field Values Management
    def set_custom_field_value(
        self, 
        invoice_item_id: uuid.UUID, 
        custom_field_id: uuid.UUID, 
        value: Any
    ) -> InvoiceItemCustomFieldValue:
        """Set a custom field value for an invoice item"""
        # Get the custom field to determine type
        custom_field = self.db.query(InvoiceCustomField).filter(
            InvoiceCustomField.id == custom_field_id
        ).first()
        
        if not custom_field:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Custom field not found"
            )
        
        # Check if value already exists
        field_value = self.db.query(InvoiceItemCustomFieldValue).filter(
            and_(
                InvoiceItemCustomFieldValue.invoice_item_id == invoice_item_id,
                InvoiceItemCustomFieldValue.custom_field_id == custom_field_id
            )
        ).first()
        
        if not field_value:
            field_value = InvoiceItemCustomFieldValue(
                invoice_item_id=invoice_item_id,
                custom_field_id=custom_field_id
            )
            self.db.add(field_value)
        
        # Set the value based on field type
        field_value.set_value(value, custom_field.field_type)
        
        self.db.commit()
        self.db.refresh(field_value)
        
        return field_value
    
    def get_custom_field_values(self, invoice_item_id: uuid.UUID) -> List[InvoiceItemCustomFieldValue]:
        """Get all custom field values for an invoice item"""
        return self.db.query(InvoiceItemCustomFieldValue).filter(
            InvoiceItemCustomFieldValue.invoice_item_id == invoice_item_id
        ).all()
    
    def validate_custom_field_values(self, template_id: uuid.UUID, field_values: Dict[str, Any]) -> bool:
        """Validate custom field values against field definitions"""
        custom_fields = self.get_custom_fields(template_id=template_id)
        
        for field in custom_fields:
            if field.is_required and field.field_name not in field_values:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Required field '{field.display_name}' is missing"
                )
            
            if field.field_name in field_values:
                value = field_values[field.field_name]
                
                # Validate based on field type and rules
                if field.validation_rules:
                    self._validate_field_value(value, field)
        
        return True
    
    def _validate_field_value(self, value: Any, field: InvoiceCustomField):
        """Validate a single field value"""
        rules = field.validation_rules or {}
        
        if field.field_type == FieldType.NUMBER:
            if not isinstance(value, (int, float)):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Field '{field.display_name}' must be a number"
                )
            
            if 'min' in rules and value < rules['min']:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Field '{field.display_name}' must be at least {rules['min']}"
                )
            
            if 'max' in rules and value > rules['max']:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Field '{field.display_name}' must be at most {rules['max']}"
                )
        
        elif field.field_type == FieldType.TEXT:
            if not isinstance(value, str):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Field '{field.display_name}' must be text"
                )
            
            if 'min_length' in rules and len(value) < rules['min_length']:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Field '{field.display_name}' must be at least {rules['min_length']} characters"
                )
            
            if 'max_length' in rules and len(value) > rules['max_length']:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Field '{field.display_name}' must be at most {rules['max_length']} characters"
                )
        
        elif field.field_type == FieldType.SELECT:
            if field.select_options:
                valid_values = [opt.get('value') for opt in field.select_options]
                if value not in valid_values:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Field '{field.display_name}' must be one of: {', '.join(valid_values)}"
                    )