"""
Invoice template and customization schemas
"""

from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any, Union
from datetime import datetime
from enum import Enum
import uuid


class TemplateTypeEnum(str, Enum):
    GENERAL = "GENERAL"
    GOLD = "GOLD"
    CUSTOM = "CUSTOM"


class FieldTypeEnum(str, Enum):
    TEXT = "TEXT"
    NUMBER = "NUMBER"
    DECIMAL = "DECIMAL"
    DATE = "DATE"
    BOOLEAN = "BOOLEAN"
    SELECT = "SELECT"


# Invoice Template Schemas
class InvoiceTemplateBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    template_type: TemplateTypeEnum
    is_active: bool = True
    is_default: bool = False
    layout_config: Optional[Dict[str, Any]] = None
    header_config: Optional[Dict[str, Any]] = None
    footer_config: Optional[Dict[str, Any]] = None
    item_table_config: Optional[Dict[str, Any]] = None
    branding_config: Optional[Dict[str, Any]] = None
    custom_css: Optional[str] = None


class InvoiceTemplateCreate(InvoiceTemplateBase):
    pass


class InvoiceTemplateUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    template_type: Optional[TemplateTypeEnum] = None
    is_active: Optional[bool] = None
    is_default: Optional[bool] = None
    layout_config: Optional[Dict[str, Any]] = None
    header_config: Optional[Dict[str, Any]] = None
    footer_config: Optional[Dict[str, Any]] = None
    item_table_config: Optional[Dict[str, Any]] = None
    branding_config: Optional[Dict[str, Any]] = None
    custom_css: Optional[str] = None


class InvoiceTemplate(InvoiceTemplateBase):
    id: uuid.UUID
    tenant_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Custom Field Schemas
class InvoiceCustomFieldBase(BaseModel):
    field_name: str = Field(..., min_length=1, max_length=100)
    display_name: str = Field(..., min_length=1, max_length=255)
    field_type: FieldTypeEnum
    is_required: bool = False
    is_line_item_field: bool = True
    default_value: Optional[str] = None
    validation_rules: Optional[Dict[str, Any]] = None
    select_options: Optional[List[Dict[str, str]]] = None
    display_order: int = 0
    column_width: Optional[str] = None
    is_visible_on_print: bool = True

    @validator('field_name')
    def validate_field_name(cls, v):
        # Ensure field name is snake_case and valid
        import re
        if not re.match(r'^[a-z][a-z0-9_]*$', v):
            raise ValueError('Field name must be snake_case and start with a letter')
        return v

    @validator('select_options')
    def validate_select_options(cls, v, values):
        if values.get('field_type') == FieldTypeEnum.SELECT and not v:
            raise ValueError('SELECT fields must have select_options')
        return v


class InvoiceCustomFieldCreate(InvoiceCustomFieldBase):
    template_id: uuid.UUID


class InvoiceCustomFieldUpdate(BaseModel):
    field_name: Optional[str] = Field(None, min_length=1, max_length=100)
    display_name: Optional[str] = Field(None, min_length=1, max_length=255)
    field_type: Optional[FieldTypeEnum] = None
    is_required: Optional[bool] = None
    is_line_item_field: Optional[bool] = None
    default_value: Optional[str] = None
    validation_rules: Optional[Dict[str, Any]] = None
    select_options: Optional[List[Dict[str, str]]] = None
    display_order: Optional[int] = None
    column_width: Optional[str] = None
    is_visible_on_print: Optional[bool] = None


class InvoiceCustomField(InvoiceCustomFieldBase):
    id: uuid.UUID
    tenant_id: uuid.UUID
    template_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Numbering Scheme Schemas
class InvoiceNumberingSchemeBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    prefix: Optional[str] = Field(None, max_length=50)
    suffix: Optional[str] = Field(None, max_length=50)
    number_format: str = Field(default="{prefix}{year}{month:02d}{sequence:04d}{suffix}", max_length=100)
    current_sequence: int = Field(default=1, ge=1)
    sequence_reset_frequency: str = Field(default="NEVER", pattern="^(NEVER|YEARLY|MONTHLY|DAILY)$")
    is_active: bool = True
    is_default: bool = False


class InvoiceNumberingSchemeCreate(InvoiceNumberingSchemeBase):
    template_id: Optional[uuid.UUID] = None


class InvoiceNumberingSchemeUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    prefix: Optional[str] = Field(None, max_length=50)
    suffix: Optional[str] = Field(None, max_length=50)
    number_format: Optional[str] = Field(None, max_length=100)
    current_sequence: Optional[int] = Field(None, ge=1)
    sequence_reset_frequency: Optional[str] = Field(None, pattern="^(NEVER|YEARLY|MONTHLY|DAILY)$")
    is_active: Optional[bool] = None
    is_default: Optional[bool] = None


class InvoiceNumberingScheme(InvoiceNumberingSchemeBase):
    id: uuid.UUID
    tenant_id: uuid.UUID
    template_id: Optional[uuid.UUID] = None
    last_reset_date: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Branding Schemas
class InvoiceBrandingBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    logo_url: Optional[str] = Field(None, max_length=500)
    logo_width: Optional[str] = Field(None, max_length=20)
    logo_height: Optional[str] = Field(None, max_length=20)
    primary_color: Optional[str] = Field(None, pattern="^#[0-9A-Fa-f]{6}$")
    secondary_color: Optional[str] = Field(None, pattern="^#[0-9A-Fa-f]{6}$")
    accent_color: Optional[str] = Field(None, pattern="^#[0-9A-Fa-f]{6}$")
    text_color: Optional[str] = Field(None, pattern="^#[0-9A-Fa-f]{6}$")
    background_color: Optional[str] = Field(None, pattern="^#[0-9A-Fa-f]{6}$")
    font_family: Optional[str] = Field(None, max_length=100)
    header_font_size: Optional[str] = Field(None, max_length=20)
    body_font_size: Optional[str] = Field(None, max_length=20)
    company_name: Optional[str] = Field(None, max_length=255)
    company_address: Optional[str] = None
    company_phone: Optional[str] = Field(None, max_length=50)
    company_email: Optional[str] = Field(None, max_length=255)
    company_website: Optional[str] = Field(None, max_length=255)
    tax_id: Optional[str] = Field(None, max_length=50)
    is_active: bool = True
    is_default: bool = False


class InvoiceBrandingCreate(InvoiceBrandingBase):
    pass


class InvoiceBrandingUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    logo_url: Optional[str] = Field(None, max_length=500)
    logo_width: Optional[str] = Field(None, max_length=20)
    logo_height: Optional[str] = Field(None, max_length=20)
    primary_color: Optional[str] = Field(None, pattern="^#[0-9A-Fa-f]{6}$")
    secondary_color: Optional[str] = Field(None, pattern="^#[0-9A-Fa-f]{6}$")
    accent_color: Optional[str] = Field(None, pattern="^#[0-9A-Fa-f]{6}$")
    text_color: Optional[str] = Field(None, pattern="^#[0-9A-Fa-f]{6}$")
    background_color: Optional[str] = Field(None, pattern="^#[0-9A-Fa-f]{6}$")
    font_family: Optional[str] = Field(None, max_length=100)
    header_font_size: Optional[str] = Field(None, max_length=20)
    body_font_size: Optional[str] = Field(None, max_length=20)
    company_name: Optional[str] = Field(None, max_length=255)
    company_address: Optional[str] = None
    company_phone: Optional[str] = Field(None, max_length=50)
    company_email: Optional[str] = Field(None, max_length=255)
    company_website: Optional[str] = Field(None, max_length=255)
    tax_id: Optional[str] = Field(None, max_length=50)
    is_active: Optional[bool] = None
    is_default: Optional[bool] = None


class InvoiceBranding(InvoiceBrandingBase):
    id: uuid.UUID
    tenant_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Custom Field Value Schemas
class InvoiceItemCustomFieldValueBase(BaseModel):
    custom_field_id: uuid.UUID
    value: Union[str, int, float, bool, None] = None


class InvoiceItemCustomFieldValueCreate(InvoiceItemCustomFieldValueBase):
    invoice_item_id: uuid.UUID


class InvoiceItemCustomFieldValueUpdate(BaseModel):
    value: Union[str, int, float, bool, None] = None


class InvoiceItemCustomFieldValue(InvoiceItemCustomFieldValueBase):
    id: uuid.UUID
    invoice_item_id: uuid.UUID
    text_value: Optional[str] = None
    number_value: Optional[int] = None
    decimal_value: Optional[str] = None
    date_value: Optional[str] = None
    boolean_value: Optional[bool] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Template with Relations
class InvoiceTemplateWithFields(InvoiceTemplate):
    custom_fields: List[InvoiceCustomField] = []
    numbering_schemes: List[InvoiceNumberingScheme] = []


# Response Schemas
class TemplateListResponse(BaseModel):
    templates: List[InvoiceTemplate]
    total: int
    page: int
    per_page: int


class CustomFieldListResponse(BaseModel):
    custom_fields: List[InvoiceCustomField]
    total: int


class NumberingSchemeListResponse(BaseModel):
    numbering_schemes: List[InvoiceNumberingScheme]
    total: int


class BrandingListResponse(BaseModel):
    branding_configs: List[InvoiceBranding]
    total: int


# Preview and Generation Schemas
class InvoicePreviewRequest(BaseModel):
    template_id: uuid.UUID
    branding_id: Optional[uuid.UUID] = None
    sample_data: Optional[Dict[str, Any]] = None


class InvoiceNumberPreviewRequest(BaseModel):
    numbering_scheme_id: uuid.UUID
    count: int = Field(default=1, ge=1, le=10)


class InvoiceNumberPreviewResponse(BaseModel):
    scheme_name: str
    current_sequence: int
    preview_numbers: List[str]
    next_sequence: int
