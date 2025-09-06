"""
Invoice customization API endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
import uuid

from ..core.database import get_db
from ..core.auth import get_current_user
from ..models.user import User
from ..services.invoice_template_service import InvoiceTemplateService
from ..schemas.invoice_template import (
    # Template schemas
    InvoiceTemplate, InvoiceTemplateCreate, InvoiceTemplateUpdate, 
    InvoiceTemplateWithFields, TemplateListResponse,
    
    # Custom field schemas
    InvoiceCustomField, InvoiceCustomFieldCreate, InvoiceCustomFieldUpdate,
    CustomFieldListResponse,
    
    # Numbering scheme schemas
    InvoiceNumberingScheme, InvoiceNumberingSchemeCreate, InvoiceNumberingSchemeUpdate,
    NumberingSchemeListResponse, InvoiceNumberPreviewRequest, InvoiceNumberPreviewResponse,
    
    # Branding schemas
    InvoiceBranding, InvoiceBrandingCreate, InvoiceBrandingUpdate,
    BrandingListResponse,
    
    # Custom field value schemas
    InvoiceItemCustomFieldValue, InvoiceItemCustomFieldValueCreate, InvoiceItemCustomFieldValueUpdate,
    
    # Enums
    TemplateTypeEnum, FieldTypeEnum
)

router = APIRouter()


# Template Management Endpoints
@router.post("/templates", response_model=InvoiceTemplate)
async def create_template(
    template_data: InvoiceTemplateCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new invoice template"""
    service = InvoiceTemplateService(db)
    return service.create_template(current_user.tenant_id, template_data)


@router.get("/templates", response_model=TemplateListResponse)
async def get_templates(
    template_type: Optional[TemplateTypeEnum] = None,
    is_active: Optional[bool] = True,
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get invoice templates for the current tenant"""
    service = InvoiceTemplateService(db)
    skip = (page - 1) * per_page
    
    templates = service.get_templates(
        current_user.tenant_id, 
        template_type=template_type,
        is_active=is_active,
        skip=skip, 
        limit=per_page
    )
    
    # Get total count for pagination
    total_query = db.query(service.db.query(InvoiceTemplate).filter(
        InvoiceTemplate.tenant_id == current_user.tenant_id
    ))
    if template_type:
        total_query = total_query.filter(InvoiceTemplate.template_type == template_type)
    if is_active is not None:
        total_query = total_query.filter(InvoiceTemplate.is_active == is_active)
    
    total = total_query.count()
    
    return TemplateListResponse(
        templates=templates,
        total=total,
        page=page,
        per_page=per_page
    )


@router.get("/templates/{template_id}", response_model=InvoiceTemplateWithFields)
async def get_template(
    template_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific template with its custom fields and numbering schemes"""
    service = InvoiceTemplateService(db)
    template = service.get_template(current_user.tenant_id, template_id)
    
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found"
        )
    
    # Get related data
    custom_fields = service.get_custom_fields(current_user.tenant_id, template_id)
    numbering_schemes = [ns for ns in service.get_numbering_schemes(current_user.tenant_id) 
                        if ns.template_id == template_id]
    
    return InvoiceTemplateWithFields(
        **template.__dict__,
        custom_fields=custom_fields,
        numbering_schemes=numbering_schemes
    )


@router.put("/templates/{template_id}", response_model=InvoiceTemplate)
async def update_template(
    template_id: uuid.UUID,
    template_data: InvoiceTemplateUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update an existing template"""
    service = InvoiceTemplateService(db)
    template = service.update_template(current_user.tenant_id, template_id, template_data)
    
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found"
        )
    
    return template


@router.delete("/templates/{template_id}")
async def delete_template(
    template_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a template"""
    service = InvoiceTemplateService(db)
    success = service.delete_template(current_user.tenant_id, template_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found"
        )
    
    return {"message": "Template deleted successfully"}


@router.get("/templates/default/{template_type}", response_model=InvoiceTemplate)
async def get_default_template(
    template_type: TemplateTypeEnum,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get the default template for a specific type"""
    service = InvoiceTemplateService(db)
    template = service.get_default_template(current_user.tenant_id, template_type)
    
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No default template found for type {template_type}"
        )
    
    return template


# Custom Field Management Endpoints
@router.post("/custom-fields", response_model=InvoiceCustomField)
async def create_custom_field(
    field_data: InvoiceCustomFieldCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new custom field"""
    service = InvoiceTemplateService(db)
    return service.create_custom_field(current_user.tenant_id, field_data)


@router.get("/custom-fields", response_model=CustomFieldListResponse)
async def get_custom_fields(
    template_id: Optional[uuid.UUID] = None,
    is_line_item_field: Optional[bool] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get custom fields for a tenant or template"""
    service = InvoiceTemplateService(db)
    custom_fields = service.get_custom_fields(
        current_user.tenant_id, 
        template_id=template_id,
        is_line_item_field=is_line_item_field
    )
    
    return CustomFieldListResponse(
        custom_fields=custom_fields,
        total=len(custom_fields)
    )


@router.put("/custom-fields/{field_id}", response_model=InvoiceCustomField)
async def update_custom_field(
    field_id: uuid.UUID,
    field_data: InvoiceCustomFieldUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a custom field"""
    service = InvoiceTemplateService(db)
    custom_field = service.update_custom_field(current_user.tenant_id, field_id, field_data)
    
    if not custom_field:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Custom field not found"
        )
    
    return custom_field


@router.delete("/custom-fields/{field_id}")
async def delete_custom_field(
    field_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a custom field"""
    service = InvoiceTemplateService(db)
    success = service.delete_custom_field(current_user.tenant_id, field_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Custom field not found"
        )
    
    return {"message": "Custom field deleted successfully"}


# Numbering Scheme Management Endpoints
@router.post("/numbering-schemes", response_model=InvoiceNumberingScheme)
async def create_numbering_scheme(
    scheme_data: InvoiceNumberingSchemeCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new numbering scheme"""
    service = InvoiceTemplateService(db)
    return service.create_numbering_scheme(current_user.tenant_id, scheme_data)


@router.get("/numbering-schemes", response_model=NumberingSchemeListResponse)
async def get_numbering_schemes(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get numbering schemes for the current tenant"""
    service = InvoiceTemplateService(db)
    schemes = service.get_numbering_schemes(current_user.tenant_id)
    
    return NumberingSchemeListResponse(
        numbering_schemes=schemes,
        total=len(schemes)
    )


@router.get("/numbering-schemes/default", response_model=InvoiceNumberingScheme)
async def get_default_numbering_scheme(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get the default numbering scheme"""
    service = InvoiceTemplateService(db)
    scheme = service.get_default_numbering_scheme(current_user.tenant_id)
    
    if not scheme:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No default numbering scheme found"
        )
    
    return scheme


@router.post("/numbering-schemes/{scheme_id}/preview", response_model=InvoiceNumberPreviewResponse)
async def preview_invoice_numbers(
    scheme_id: uuid.UUID,
    preview_request: InvoiceNumberPreviewRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Preview the next invoice numbers for a scheme"""
    service = InvoiceTemplateService(db)
    
    # Get the scheme
    scheme = db.query(InvoiceNumberingScheme).filter(
        InvoiceNumberingScheme.tenant_id == current_user.tenant_id,
        InvoiceNumberingScheme.id == scheme_id,
        InvoiceNumberingScheme.is_active == True
    ).first()
    
    if not scheme:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Numbering scheme not found"
        )
    
    preview_numbers = service.preview_invoice_numbers(
        current_user.tenant_id, 
        scheme_id, 
        preview_request.count
    )
    
    return InvoiceNumberPreviewResponse(
        scheme_name=scheme.name,
        current_sequence=scheme.current_sequence,
        preview_numbers=preview_numbers,
        next_sequence=scheme.current_sequence + preview_request.count
    )


@router.post("/generate-invoice-number")
async def generate_invoice_number(
    scheme_id: Optional[uuid.UUID] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate the next invoice number"""
    service = InvoiceTemplateService(db)
    invoice_number = service.generate_invoice_number(current_user.tenant_id, scheme_id)
    
    return {"invoice_number": invoice_number}


# Branding Management Endpoints
@router.post("/branding", response_model=InvoiceBranding)
async def create_branding(
    branding_data: InvoiceBrandingCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new branding configuration"""
    service = InvoiceTemplateService(db)
    return service.create_branding(current_user.tenant_id, branding_data)


@router.get("/branding", response_model=BrandingListResponse)
async def get_branding_configs(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get branding configurations for the current tenant"""
    service = InvoiceTemplateService(db)
    branding_configs = service.get_branding_configs(current_user.tenant_id)
    
    return BrandingListResponse(
        branding_configs=branding_configs,
        total=len(branding_configs)
    )


@router.get("/branding/default", response_model=InvoiceBranding)
async def get_default_branding(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get the default branding configuration"""
    service = InvoiceTemplateService(db)
    branding = service.get_default_branding(current_user.tenant_id)
    
    if not branding:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No default branding configuration found"
        )
    
    return branding


@router.put("/branding/{branding_id}", response_model=InvoiceBranding)
async def update_branding(
    branding_id: uuid.UUID,
    branding_data: InvoiceBrandingUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a branding configuration"""
    service = InvoiceTemplateService(db)
    branding = service.update_branding(current_user.tenant_id, branding_id, branding_data)
    
    if not branding:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Branding configuration not found"
        )
    
    return branding


@router.delete("/branding/{branding_id}")
async def delete_branding(
    branding_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a branding configuration"""
    service = InvoiceTemplateService(db)
    
    branding = db.query(InvoiceBranding).filter(
        InvoiceBranding.tenant_id == current_user.tenant_id,
        InvoiceBranding.id == branding_id,
        InvoiceBranding.is_active == True
    ).first()
    
    if not branding:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Branding configuration not found"
        )
    
    branding.is_active = False
    db.commit()
    
    return {"message": "Branding configuration deleted successfully"}


# Custom Field Value Management Endpoints
@router.post("/invoice-items/{item_id}/custom-field-values", response_model=InvoiceItemCustomFieldValue)
async def set_custom_field_value(
    item_id: uuid.UUID,
    value_data: InvoiceItemCustomFieldValueCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Set a custom field value for an invoice item"""
    service = InvoiceTemplateService(db)
    
    # Verify the invoice item belongs to the current tenant
    from ..models.invoice import InvoiceItem, Invoice
    invoice_item = db.query(InvoiceItem).join(Invoice).filter(
        InvoiceItem.id == item_id,
        Invoice.tenant_id == current_user.tenant_id
    ).first()
    
    if not invoice_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice item not found"
        )
    
    return service.set_custom_field_value(
        item_id, 
        value_data.custom_field_id, 
        value_data.value
    )


@router.get("/invoice-items/{item_id}/custom-field-values", response_model=List[InvoiceItemCustomFieldValue])
async def get_custom_field_values(
    item_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get custom field values for an invoice item"""
    service = InvoiceTemplateService(db)
    
    # Verify the invoice item belongs to the current tenant
    from ..models.invoice import InvoiceItem, Invoice
    invoice_item = db.query(InvoiceItem).join(Invoice).filter(
        InvoiceItem.id == item_id,
        Invoice.tenant_id == current_user.tenant_id
    ).first()
    
    if not invoice_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice item not found"
        )
    
    return service.get_custom_field_values(item_id)