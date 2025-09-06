"""
Invoice template and customization models
"""

from sqlalchemy import Column, String, Text, Boolean, Enum, JSON, Integer, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import enum
from .base import BaseModel, TenantMixin


class TemplateType(enum.Enum):
    """Template type enumeration"""
    GENERAL = "GENERAL"
    GOLD = "GOLD"
    CUSTOM = "CUSTOM"


class FieldType(enum.Enum):
    """Custom field type enumeration"""
    TEXT = "TEXT"
    NUMBER = "NUMBER"
    DECIMAL = "DECIMAL"
    DATE = "DATE"
    BOOLEAN = "BOOLEAN"
    SELECT = "SELECT"


class InvoiceTemplate(BaseModel, TenantMixin):
    """
    Invoice template model for customizable layouts and branding
    """
    __tablename__ = "invoice_templates"
    
    # Basic Information
    name = Column(
        String(255), 
        nullable=False,
        comment="Template name"
    )
    
    description = Column(
        Text, 
        nullable=True,
        comment="Template description"
    )
    
    template_type = Column(
        Enum(TemplateType), 
        nullable=False,
        comment="Type of template (general, gold, custom)"
    )
    
    # Template Status
    is_active = Column(
        Boolean, 
        default=True,
        nullable=False,
        comment="Whether template is active"
    )
    
    is_default = Column(
        Boolean, 
        default=False,
        nullable=False,
        comment="Whether this is the default template for the type"
    )
    
    # Layout Configuration
    layout_config = Column(
        JSON, 
        nullable=True,
        comment="JSON configuration for template layout"
    )
    
    # Header Configuration
    header_config = Column(
        JSON, 
        nullable=True,
        comment="Header layout and content configuration"
    )
    
    # Footer Configuration
    footer_config = Column(
        JSON, 
        nullable=True,
        comment="Footer layout and content configuration"
    )
    
    # Item Table Configuration
    item_table_config = Column(
        JSON, 
        nullable=True,
        comment="Item table columns and layout configuration"
    )
    
    # Branding Configuration
    branding_config = Column(
        JSON, 
        nullable=True,
        comment="Branding colors, fonts, and styling"
    )
    
    # Custom CSS
    custom_css = Column(
        Text, 
        nullable=True,
        comment="Custom CSS for advanced styling"
    )
    
    # Relationships
    tenant = relationship("Tenant", back_populates="invoice_templates")
    custom_fields = relationship("InvoiceCustomField", back_populates="template", cascade="all, delete-orphan")
    numbering_schemes = relationship("InvoiceNumberingScheme", back_populates="template", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<InvoiceTemplate(id={self.id}, name='{self.name}', type='{self.template_type.value}')>"


class InvoiceCustomField(BaseModel, TenantMixin):
    """
    Custom fields for invoice line items and invoice headers
    """
    __tablename__ = "invoice_custom_fields"
    
    template_id = Column(
        UUID(as_uuid=True), 
        ForeignKey("invoice_templates.id"),
        nullable=False,
        comment="Template ID"
    )
    
    # Field Information
    field_name = Column(
        String(100), 
        nullable=False,
        comment="Internal field name (snake_case)"
    )
    
    display_name = Column(
        String(255), 
        nullable=False,
        comment="Display name for the field"
    )
    
    field_type = Column(
        Enum(FieldType), 
        nullable=False,
        comment="Type of the custom field"
    )
    
    # Field Configuration
    is_required = Column(
        Boolean, 
        default=False,
        nullable=False,
        comment="Whether field is required"
    )
    
    is_line_item_field = Column(
        Boolean, 
        default=True,
        nullable=False,
        comment="Whether field applies to line items (vs invoice header)"
    )
    
    default_value = Column(
        String(500), 
        nullable=True,
        comment="Default value for the field"
    )
    
    validation_rules = Column(
        JSON, 
        nullable=True,
        comment="Validation rules (min, max, pattern, etc.)"
    )
    
    # Select Field Options
    select_options = Column(
        JSON, 
        nullable=True,
        comment="Options for SELECT type fields"
    )
    
    # Display Configuration
    display_order = Column(
        Integer, 
        default=0,
        nullable=False,
        comment="Order for displaying the field"
    )
    
    column_width = Column(
        String(20), 
        nullable=True,
        comment="Column width for table display (e.g., '100px', '20%')"
    )
    
    is_visible_on_print = Column(
        Boolean, 
        default=True,
        nullable=False,
        comment="Whether field is visible on printed invoices"
    )
    
    # Relationships
    tenant = relationship("Tenant")
    template = relationship("InvoiceTemplate", back_populates="custom_fields")
    
    def __repr__(self):
        return f"<InvoiceCustomField(id={self.id}, name='{self.field_name}', type='{self.field_type.value}')>"


class InvoiceNumberingScheme(BaseModel, TenantMixin):
    """
    Invoice numbering schemes for automatic number generation
    """
    __tablename__ = "invoice_numbering_schemes"
    
    template_id = Column(
        UUID(as_uuid=True), 
        ForeignKey("invoice_templates.id"),
        nullable=True,
        comment="Template ID (optional, can be tenant-wide)"
    )
    
    # Scheme Information
    name = Column(
        String(255), 
        nullable=False,
        comment="Numbering scheme name"
    )
    
    description = Column(
        Text, 
        nullable=True,
        comment="Scheme description"
    )
    
    # Numbering Configuration
    prefix = Column(
        String(50), 
        nullable=True,
        comment="Prefix for invoice numbers (e.g., 'INV-')"
    )
    
    suffix = Column(
        String(50), 
        nullable=True,
        comment="Suffix for invoice numbers"
    )
    
    number_format = Column(
        String(100), 
        nullable=False,
        default="{prefix}{year}{month:02d}{sequence:04d}{suffix}",
        comment="Format string for number generation"
    )
    
    # Sequence Configuration
    current_sequence = Column(
        Integer, 
        default=1,
        nullable=False,
        comment="Current sequence number"
    )
    
    sequence_reset_frequency = Column(
        String(20), 
        default="NEVER",
        nullable=False,
        comment="How often to reset sequence (NEVER, YEARLY, MONTHLY, DAILY)"
    )
    
    last_reset_date = Column(
        String(10), 
        nullable=True,
        comment="Last reset date (YYYY-MM-DD format)"
    )
    
    # Status
    is_active = Column(
        Boolean, 
        default=True,
        nullable=False,
        comment="Whether scheme is active"
    )
    
    is_default = Column(
        Boolean, 
        default=False,
        nullable=False,
        comment="Whether this is the default scheme"
    )
    
    # Relationships
    tenant = relationship("Tenant")
    template = relationship("InvoiceTemplate", back_populates="numbering_schemes")
    
    def __repr__(self):
        return f"<InvoiceNumberingScheme(id={self.id}, name='{self.name}')>"
    
    def generate_next_number(self) -> str:
        """Generate the next invoice number"""
        from datetime import datetime
        
        now = datetime.now()
        
        # Check if we need to reset the sequence
        should_reset = False
        current_date_str = now.strftime("%Y-%m-%d")
        
        if self.sequence_reset_frequency == "DAILY":
            should_reset = self.last_reset_date != current_date_str
        elif self.sequence_reset_frequency == "MONTHLY":
            should_reset = self.last_reset_date != now.strftime("%Y-%m")
        elif self.sequence_reset_frequency == "YEARLY":
            should_reset = self.last_reset_date != now.strftime("%Y")
        
        if should_reset:
            self.current_sequence = 1
            self.last_reset_date = current_date_str
        
        # Generate the number
        format_vars = {
            'prefix': self.prefix or '',
            'suffix': self.suffix or '',
            'year': now.year,
            'month': now.month,
            'day': now.day,
            'sequence': self.current_sequence,
        }
        
        invoice_number = self.number_format.format(**format_vars)
        
        # Increment sequence for next use
        self.current_sequence += 1
        
        return invoice_number


class InvoiceBranding(BaseModel, TenantMixin):
    """
    Invoice branding configuration for tenants
    """
    __tablename__ = "invoice_branding"
    
    # Basic Information
    name = Column(
        String(255), 
        nullable=False,
        comment="Branding configuration name"
    )
    
    description = Column(
        Text, 
        nullable=True,
        comment="Branding description"
    )
    
    # Logo Configuration
    logo_url = Column(
        String(500), 
        nullable=True,
        comment="URL to company logo"
    )
    
    logo_width = Column(
        String(20), 
        nullable=True,
        comment="Logo width (e.g., '200px', '50%')"
    )
    
    logo_height = Column(
        String(20), 
        nullable=True,
        comment="Logo height (e.g., '100px', 'auto')"
    )
    
    # Color Scheme
    primary_color = Column(
        String(7), 
        nullable=True,
        comment="Primary brand color (hex code)"
    )
    
    secondary_color = Column(
        String(7), 
        nullable=True,
        comment="Secondary brand color (hex code)"
    )
    
    accent_color = Column(
        String(7), 
        nullable=True,
        comment="Accent color (hex code)"
    )
    
    text_color = Column(
        String(7), 
        nullable=True,
        comment="Primary text color (hex code)"
    )
    
    background_color = Column(
        String(7), 
        nullable=True,
        comment="Background color (hex code)"
    )
    
    # Typography
    font_family = Column(
        String(100), 
        nullable=True,
        comment="Font family for invoice text"
    )
    
    header_font_size = Column(
        String(20), 
        nullable=True,
        comment="Header font size (e.g., '24px', '1.5em')"
    )
    
    body_font_size = Column(
        String(20), 
        nullable=True,
        comment="Body font size (e.g., '14px', '1em')"
    )
    
    # Company Information
    company_name = Column(
        String(255), 
        nullable=True,
        comment="Company name for invoices"
    )
    
    company_address = Column(
        Text, 
        nullable=True,
        comment="Company address"
    )
    
    company_phone = Column(
        String(50), 
        nullable=True,
        comment="Company phone number"
    )
    
    company_email = Column(
        String(255), 
        nullable=True,
        comment="Company email"
    )
    
    company_website = Column(
        String(255), 
        nullable=True,
        comment="Company website"
    )
    
    tax_id = Column(
        String(50), 
        nullable=True,
        comment="Company tax ID"
    )
    
    # Status
    is_active = Column(
        Boolean, 
        default=True,
        nullable=False,
        comment="Whether branding is active"
    )
    
    is_default = Column(
        Boolean, 
        default=False,
        nullable=False,
        comment="Whether this is the default branding"
    )
    
    # Relationships
    tenant = relationship("Tenant", back_populates="invoice_branding_configs")
    
    def __repr__(self):
        return f"<InvoiceBranding(id={self.id}, name='{self.name}')>"


class InvoiceItemCustomFieldValue(BaseModel):
    """
    Values for custom fields on invoice items
    """
    __tablename__ = "invoice_item_custom_field_values"
    
    invoice_item_id = Column(
        UUID(as_uuid=True), 
        ForeignKey("invoice_items.id"),
        nullable=False,
        comment="Invoice item ID"
    )
    
    custom_field_id = Column(
        UUID(as_uuid=True), 
        ForeignKey("invoice_custom_fields.id"),
        nullable=False,
        comment="Custom field ID"
    )
    
    # Value Storage
    text_value = Column(
        Text, 
        nullable=True,
        comment="Text value for TEXT fields"
    )
    
    number_value = Column(
        Integer, 
        nullable=True,
        comment="Integer value for NUMBER fields"
    )
    
    decimal_value = Column(
        String(50), 
        nullable=True,
        comment="Decimal value as string for DECIMAL fields"
    )
    
    date_value = Column(
        String(10), 
        nullable=True,
        comment="Date value in YYYY-MM-DD format"
    )
    
    boolean_value = Column(
        Boolean, 
        nullable=True,
        comment="Boolean value for BOOLEAN fields"
    )
    
    # Relationships
    invoice_item = relationship("InvoiceItem", back_populates="custom_field_values")
    custom_field = relationship("InvoiceCustomField")
    
    def __repr__(self):
        return f"<InvoiceItemCustomFieldValue(item_id={self.invoice_item_id}, field_id={self.custom_field_id})>"
    
    @property
    def value(self):
        """Get the appropriate value based on field type"""
        if self.text_value is not None:
            return self.text_value
        elif self.number_value is not None:
            return self.number_value
        elif self.decimal_value is not None:
            return self.decimal_value
        elif self.date_value is not None:
            return self.date_value
        elif self.boolean_value is not None:
            return self.boolean_value
        return None
    
    def set_value(self, value, field_type: FieldType):
        """Set the appropriate value based on field type"""
        # Clear all values first
        self.text_value = None
        self.number_value = None
        self.decimal_value = None
        self.date_value = None
        self.boolean_value = None
        
        # Set the appropriate value
        if field_type == FieldType.TEXT or field_type == FieldType.SELECT:
            self.text_value = str(value) if value is not None else None
        elif field_type == FieldType.NUMBER:
            self.number_value = int(value) if value is not None else None
        elif field_type == FieldType.DECIMAL:
            self.decimal_value = str(value) if value is not None else None
        elif field_type == FieldType.DATE:
            self.date_value = str(value) if value is not None else None
        elif field_type == FieldType.BOOLEAN:
            self.boolean_value = bool(value) if value is not None else None