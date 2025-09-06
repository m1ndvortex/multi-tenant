"""add_invoice_customization_tables

Revision ID: d104c6468599
Revises: 7142b019c8c7
Create Date: 2025-09-06 12:04:58.443667

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'd104c6468599'
down_revision = '7142b019c8c7'
branch_labels = None
depends_on = None


def upgrade() -> None:
    
    # Create invoice_templates table
    op.create_table('invoice_templates',
        sa.Column('id', sa.UUID(), nullable=False, comment='Primary key UUID'),
        sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False, comment='Record creation timestamp'),
        sa.Column('updated_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False, comment='Record last update timestamp'),
        sa.Column('is_active', sa.Boolean(), nullable=False, comment='Soft delete flag'),
        sa.Column('tenant_id', sa.UUID(), nullable=False, comment='Tenant ID for multi-tenant data isolation'),
        sa.Column('name', sa.String(length=255), nullable=False, comment='Template name'),
        sa.Column('description', sa.Text(), nullable=True, comment='Template description'),
        sa.Column('template_type', sa.String(20), nullable=False, comment='Type of template (general, gold, custom)'),
        sa.Column('is_default', sa.Boolean(), nullable=False, comment='Whether this is the default template for the type'),
        sa.Column('layout_config', postgresql.JSON(astext_type=sa.Text()), nullable=True, comment='JSON configuration for template layout'),
        sa.Column('header_config', postgresql.JSON(astext_type=sa.Text()), nullable=True, comment='Header layout and content configuration'),
        sa.Column('footer_config', postgresql.JSON(astext_type=sa.Text()), nullable=True, comment='Footer layout and content configuration'),
        sa.Column('item_table_config', postgresql.JSON(astext_type=sa.Text()), nullable=True, comment='Item table columns and layout configuration'),
        sa.Column('branding_config', postgresql.JSON(astext_type=sa.Text()), nullable=True, comment='Branding colors, fonts, and styling'),
        sa.Column('custom_css', sa.Text(), nullable=True, comment='Custom CSS for advanced styling'),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # Create invoice_custom_fields table
    op.create_table('invoice_custom_fields',
        sa.Column('id', sa.UUID(), nullable=False, comment='Primary key UUID'),
        sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False, comment='Record creation timestamp'),
        sa.Column('updated_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False, comment='Record last update timestamp'),
        sa.Column('is_active', sa.Boolean(), nullable=False, comment='Soft delete flag'),
        sa.Column('tenant_id', sa.UUID(), nullable=False, comment='Tenant ID for multi-tenant data isolation'),
        sa.Column('template_id', sa.UUID(), nullable=False, comment='Template ID'),
        sa.Column('field_name', sa.String(length=100), nullable=False, comment='Internal field name (snake_case)'),
        sa.Column('display_name', sa.String(length=255), nullable=False, comment='Display name for the field'),
        sa.Column('field_type', sa.String(20), nullable=False, comment='Type of the custom field'),
        sa.Column('is_required', sa.Boolean(), nullable=False, comment='Whether field is required'),
        sa.Column('is_line_item_field', sa.Boolean(), nullable=False, comment='Whether field applies to line items (vs invoice header)'),
        sa.Column('default_value', sa.String(length=500), nullable=True, comment='Default value for the field'),
        sa.Column('validation_rules', postgresql.JSON(astext_type=sa.Text()), nullable=True, comment='Validation rules (min, max, pattern, etc.)'),
        sa.Column('select_options', postgresql.JSON(astext_type=sa.Text()), nullable=True, comment='Options for SELECT type fields'),
        sa.Column('display_order', sa.Integer(), nullable=False, comment='Order for displaying the field'),
        sa.Column('column_width', sa.String(length=20), nullable=True, comment="Column width for table display (e.g., '100px', '20%')"),
        sa.Column('is_visible_on_print', sa.Boolean(), nullable=False, comment='Whether field is visible on printed invoices'),
        sa.ForeignKeyConstraint(['template_id'], ['invoice_templates.id'], ),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # Create invoice_numbering_schemes table
    op.create_table('invoice_numbering_schemes',
        sa.Column('id', sa.UUID(), nullable=False, comment='Primary key UUID'),
        sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False, comment='Record creation timestamp'),
        sa.Column('updated_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False, comment='Record last update timestamp'),
        sa.Column('is_active', sa.Boolean(), nullable=False, comment='Soft delete flag'),
        sa.Column('tenant_id', sa.UUID(), nullable=False, comment='Tenant ID for multi-tenant data isolation'),
        sa.Column('template_id', sa.UUID(), nullable=True, comment='Template ID (optional, can be tenant-wide)'),
        sa.Column('name', sa.String(length=255), nullable=False, comment='Numbering scheme name'),
        sa.Column('description', sa.Text(), nullable=True, comment='Scheme description'),
        sa.Column('prefix', sa.String(length=50), nullable=True, comment="Prefix for invoice numbers (e.g., 'INV-')"),
        sa.Column('suffix', sa.String(length=50), nullable=True, comment='Suffix for invoice numbers'),
        sa.Column('number_format', sa.String(length=100), nullable=False, comment='Format string for number generation'),
        sa.Column('current_sequence', sa.Integer(), nullable=False, comment='Current sequence number'),
        sa.Column('sequence_reset_frequency', sa.String(length=20), nullable=False, comment='How often to reset sequence (NEVER, YEARLY, MONTHLY, DAILY)'),
        sa.Column('last_reset_date', sa.String(length=10), nullable=True, comment='Last reset date (YYYY-MM-DD format)'),
        sa.Column('is_default', sa.Boolean(), nullable=False, comment='Whether this is the default scheme'),
        sa.ForeignKeyConstraint(['template_id'], ['invoice_templates.id'], ),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # Create invoice_branding table
    op.create_table('invoice_branding',
        sa.Column('id', sa.UUID(), nullable=False, comment='Primary key UUID'),
        sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False, comment='Record creation timestamp'),
        sa.Column('updated_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False, comment='Record last update timestamp'),
        sa.Column('is_active', sa.Boolean(), nullable=False, comment='Soft delete flag'),
        sa.Column('tenant_id', sa.UUID(), nullable=False, comment='Tenant ID for multi-tenant data isolation'),
        sa.Column('name', sa.String(length=255), nullable=False, comment='Branding configuration name'),
        sa.Column('description', sa.Text(), nullable=True, comment='Branding description'),
        sa.Column('logo_url', sa.String(length=500), nullable=True, comment='URL to company logo'),
        sa.Column('logo_width', sa.String(length=20), nullable=True, comment="Logo width (e.g., '200px', '50%')"),
        sa.Column('logo_height', sa.String(length=20), nullable=True, comment="Logo height (e.g., '100px', 'auto')"),
        sa.Column('primary_color', sa.String(length=7), nullable=True, comment='Primary brand color (hex code)'),
        sa.Column('secondary_color', sa.String(length=7), nullable=True, comment='Secondary brand color (hex code)'),
        sa.Column('accent_color', sa.String(length=7), nullable=True, comment='Accent color (hex code)'),
        sa.Column('text_color', sa.String(length=7), nullable=True, comment='Primary text color (hex code)'),
        sa.Column('background_color', sa.String(length=7), nullable=True, comment='Background color (hex code)'),
        sa.Column('font_family', sa.String(length=100), nullable=True, comment='Font family for invoice text'),
        sa.Column('header_font_size', sa.String(length=20), nullable=True, comment="Header font size (e.g., '24px', '1.5em')"),
        sa.Column('body_font_size', sa.String(length=20), nullable=True, comment="Body font size (e.g., '14px', '1em')"),
        sa.Column('company_name', sa.String(length=255), nullable=True, comment='Company name for invoices'),
        sa.Column('company_address', sa.Text(), nullable=True, comment='Company address'),
        sa.Column('company_phone', sa.String(length=50), nullable=True, comment='Company phone number'),
        sa.Column('company_email', sa.String(length=255), nullable=True, comment='Company email'),
        sa.Column('company_website', sa.String(length=255), nullable=True, comment='Company website'),
        sa.Column('tax_id', sa.String(length=50), nullable=True, comment='Company tax ID'),
        sa.Column('is_default', sa.Boolean(), nullable=False, comment='Whether this is the default branding'),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # Create invoice_item_custom_field_values table
    op.create_table('invoice_item_custom_field_values',
        sa.Column('id', sa.UUID(), nullable=False, comment='Primary key UUID'),
        sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False, comment='Record creation timestamp'),
        sa.Column('updated_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False, comment='Record last update timestamp'),
        sa.Column('is_active', sa.Boolean(), nullable=False, comment='Soft delete flag'),
        sa.Column('invoice_item_id', sa.UUID(), nullable=False, comment='Invoice item ID'),
        sa.Column('custom_field_id', sa.UUID(), nullable=False, comment='Custom field ID'),
        sa.Column('text_value', sa.Text(), nullable=True, comment='Text value for TEXT fields'),
        sa.Column('number_value', sa.Integer(), nullable=True, comment='Integer value for NUMBER fields'),
        sa.Column('decimal_value', sa.String(length=50), nullable=True, comment='Decimal value as string for DECIMAL fields'),
        sa.Column('date_value', sa.String(length=10), nullable=True, comment='Date value in YYYY-MM-DD format'),
        sa.Column('boolean_value', sa.Boolean(), nullable=True, comment='Boolean value for BOOLEAN fields'),
        sa.ForeignKeyConstraint(['custom_field_id'], ['invoice_custom_fields.id'], ),
        sa.ForeignKeyConstraint(['invoice_item_id'], ['invoice_items.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # Add new columns to invoices table
    op.add_column('invoices', sa.Column('template_id', sa.UUID(), nullable=True, comment='Invoice template ID'))
    op.add_column('invoices', sa.Column('branding_id', sa.UUID(), nullable=True, comment='Invoice branding ID'))
    op.add_column('invoices', sa.Column('numbering_scheme_id', sa.UUID(), nullable=True, comment='Numbering scheme ID'))

    # Create foreign keys for invoices table
    op.create_foreign_key(None, 'invoices', 'invoice_templates', ['template_id'], ['id'])
    op.create_foreign_key(None, 'invoices', 'invoice_branding', ['branding_id'], ['id'])
    op.create_foreign_key(None, 'invoices', 'invoice_numbering_schemes', ['numbering_scheme_id'], ['id'])

    # Set default values for new columns
    op.execute("UPDATE invoices SET is_active = true WHERE is_active IS NULL")
    op.execute("UPDATE invoice_templates SET is_active = true WHERE is_active IS NULL")
    op.execute("UPDATE invoice_custom_fields SET is_active = true WHERE is_active IS NULL")
    op.execute("UPDATE invoice_numbering_schemes SET is_active = true WHERE is_active IS NULL")
    op.execute("UPDATE invoice_branding SET is_active = true WHERE is_active IS NULL")
    op.execute("UPDATE invoice_item_custom_field_values SET is_active = true WHERE is_active IS NULL")

    # Drop activity_logs table if it exists (cleanup from previous migrations)
    op.execute("DROP TABLE IF EXISTS activity_logs CASCADE")


def downgrade() -> None:
    # Drop foreign keys from invoices table
    op.drop_constraint(None, 'invoices', type_='foreignkey')
    op.drop_constraint(None, 'invoices', type_='foreignkey')
    op.drop_constraint(None, 'invoices', type_='foreignkey')
    
    # Drop new columns from invoices table
    op.drop_column('invoices', 'numbering_scheme_id')
    op.drop_column('invoices', 'branding_id')
    op.drop_column('invoices', 'template_id')
    
    # Drop new tables
    op.drop_table('invoice_item_custom_field_values')
    op.drop_table('invoice_branding')
    op.drop_table('invoice_numbering_schemes')
    op.drop_table('invoice_custom_fields')
    op.drop_table('invoice_templates')
    
