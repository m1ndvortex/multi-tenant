"""
Unit tests for invoice customization functionality
"""

import pytest
import uuid
from datetime import datetime
from sqlalchemy.orm import Session
from fastapi.testclient import TestClient
from fastapi import status

from app.models.tenant import Tenant
from app.models.user import User
from app.models.invoice_template import (
    InvoiceTemplate, InvoiceCustomField, InvoiceNumberingScheme, 
    InvoiceBranding, InvoiceItemCustomFieldValue, TemplateType, FieldType
)
from app.models.invoice import Invoice, InvoiceItem
from app.models.customer import Customer
from app.services.invoice_template_service import InvoiceTemplateService
from app.schemas.invoice_template import (
    InvoiceTemplateCreate, InvoiceCustomFieldCreate, 
    InvoiceNumberingSchemeCreate, InvoiceBrandingCreate
)


class TestInvoiceTemplateService:
    """Test invoice template service functionality"""
    
    def test_create_template(self, db_session: Session, test_tenant: Tenant):
        """Test creating a new invoice template"""
        service = InvoiceTemplateService(db_session)
        
        template_data = InvoiceTemplateCreate(
            name="Test Template",
            description="A test template",
            template_type=TemplateType.GENERAL,
            is_default=True,
            layout_config={"columns": 3},
            header_config={"show_logo": True},
            footer_config={"show_terms": True}
        )
        
        template = service.create_template(test_tenant.id, template_data)
        
        assert template.id is not None
        assert template.name == "Test Template"
        assert template.template_type == TemplateType.GENERAL
        assert template.is_default is True
        assert template.tenant_id == test_tenant.id
        assert template.layout_config == {"columns": 3}
    
    def test_create_default_template_unsets_others(self, db_session: Session, test_tenant: Tenant):
        """Test that creating a default template unsets other defaults of same type"""
        service = InvoiceTemplateService(db_session)
        
        # Create first default template
        template1_data = InvoiceTemplateCreate(
            name="Template 1",
            template_type=TemplateType.GENERAL,
            is_default=True
        )
        template1 = service.create_template(test_tenant.id, template1_data)
        
        # Create second default template
        template2_data = InvoiceTemplateCreate(
            name="Template 2",
            template_type=TemplateType.GENERAL,
            is_default=True
        )
        template2 = service.create_template(test_tenant.id, template2_data)
        
        # Refresh first template
        db_session.refresh(template1)
        
        assert template1.is_default is False
        assert template2.is_default is True
    
    def test_get_templates(self, db_session: Session, test_tenant: Tenant):
        """Test retrieving templates for a tenant"""
        service = InvoiceTemplateService(db_session)
        
        # Create templates
        template1_data = InvoiceTemplateCreate(
            name="General Template",
            template_type=TemplateType.GENERAL
        )
        template2_data = InvoiceTemplateCreate(
            name="Gold Template",
            template_type=TemplateType.GOLD
        )
        
        service.create_template(test_tenant.id, template1_data)
        service.create_template(test_tenant.id, template2_data)
        
        # Get all templates
        all_templates = service.get_templates(test_tenant.id)
        assert len(all_templates) == 2
        
        # Get only general templates
        general_templates = service.get_templates(test_tenant.id, template_type=TemplateType.GENERAL)
        assert len(general_templates) == 1
        assert general_templates[0].template_type == TemplateType.GENERAL
    
    def test_create_custom_field(self, db_session: Session, test_tenant: Tenant):
        """Test creating custom fields for templates"""
        service = InvoiceTemplateService(db_session)
        
        # Create template first
        template_data = InvoiceTemplateCreate(
            name="Test Template",
            template_type=TemplateType.GENERAL
        )
        template = service.create_template(test_tenant.id, template_data)
        
        # Create custom field
        field_data = InvoiceCustomFieldCreate(
            template_id=template.id,
            field_name="custom_notes",
            display_name="Custom Notes",
            field_type=FieldType.TEXT,
            is_required=True,
            default_value="Default note",
            validation_rules={"max_length": 500}
        )
        
        custom_field = service.create_custom_field(test_tenant.id, field_data)
        
        assert custom_field.id is not None
        assert custom_field.field_name == "custom_notes"
        assert custom_field.field_type == FieldType.TEXT
        assert custom_field.is_required is True
        assert custom_field.validation_rules == {"max_length": 500}
    
    def test_create_custom_field_duplicate_name_fails(self, db_session: Session, test_tenant: Tenant):
        """Test that duplicate field names in same template fail"""
        service = InvoiceTemplateService(db_session)
        
        # Create template
        template_data = InvoiceTemplateCreate(
            name="Test Template",
            template_type=TemplateType.GENERAL
        )
        template = service.create_template(test_tenant.id, template_data)
        
        # Create first field
        field_data1 = InvoiceCustomFieldCreate(
            template_id=template.id,
            field_name="custom_field",
            display_name="Custom Field 1",
            field_type=FieldType.TEXT
        )
        service.create_custom_field(test_tenant.id, field_data1)
        
        # Try to create duplicate field name
        field_data2 = InvoiceCustomFieldCreate(
            template_id=template.id,
            field_name="custom_field",  # Same name
            display_name="Custom Field 2",
            field_type=FieldType.NUMBER
        )
        
        with pytest.raises(Exception):  # Should raise HTTPException
            service.create_custom_field(test_tenant.id, field_data2)
    
    def test_create_numbering_scheme(self, db_session: Session, test_tenant: Tenant):
        """Test creating invoice numbering schemes"""
        service = InvoiceTemplateService(db_session)
        
        scheme_data = InvoiceNumberingSchemeCreate(
            name="Standard Numbering",
            description="Standard invoice numbering",
            prefix="INV-",
            suffix="",
            number_format="{prefix}{year}{month:02d}{sequence:04d}",
            current_sequence=1,
            sequence_reset_frequency="YEARLY",
            is_default=True
        )
        
        scheme = service.create_numbering_scheme(test_tenant.id, scheme_data)
        
        assert scheme.id is not None
        assert scheme.name == "Standard Numbering"
        assert scheme.prefix == "INV-"
        assert scheme.is_default is True
        assert scheme.current_sequence == 1
    
    def test_generate_invoice_number(self, db_session: Session, test_tenant: Tenant):
        """Test generating invoice numbers"""
        service = InvoiceTemplateService(db_session)
        
        # Create numbering scheme
        scheme_data = InvoiceNumberingSchemeCreate(
            name="Test Scheme",
            prefix="TEST-",
            number_format="{prefix}{sequence:04d}",
            current_sequence=1,
            is_default=True
        )
        scheme = service.create_numbering_scheme(test_tenant.id, scheme_data)
        
        # Generate first number
        number1 = service.generate_invoice_number(test_tenant.id, scheme.id)
        assert number1 == "TEST-0001"
        
        # Generate second number
        number2 = service.generate_invoice_number(test_tenant.id, scheme.id)
        assert number2 == "TEST-0002"
        
        # Check sequence was incremented
        db_session.refresh(scheme)
        assert scheme.current_sequence == 3
    
    def test_preview_invoice_numbers(self, db_session: Session, test_tenant: Tenant):
        """Test previewing invoice numbers without incrementing sequence"""
        service = InvoiceTemplateService(db_session)
        
        # Create numbering scheme
        scheme_data = InvoiceNumberingSchemeCreate(
            name="Preview Scheme",
            prefix="PREV-",
            number_format="{prefix}{sequence:03d}",
            current_sequence=5,
            is_default=True
        )
        scheme = service.create_numbering_scheme(test_tenant.id, scheme_data)
        
        # Preview numbers
        preview_numbers = service.preview_invoice_numbers(test_tenant.id, scheme.id, 3)
        
        assert len(preview_numbers) == 3
        assert preview_numbers[0] == "PREV-005"
        assert preview_numbers[1] == "PREV-006"
        assert preview_numbers[2] == "PREV-007"
        
        # Check sequence wasn't changed
        db_session.refresh(scheme)
        assert scheme.current_sequence == 5
    
    def test_create_branding(self, db_session: Session, test_tenant: Tenant):
        """Test creating branding configurations"""
        service = InvoiceTemplateService(db_session)
        
        branding_data = InvoiceBrandingCreate(
            name="Company Branding",
            description="Main company branding",
            logo_url="https://example.com/logo.png",
            primary_color="#007bff",
            secondary_color="#6c757d",
            company_name="Test Company",
            company_email="info@test.com",
            is_default=True
        )
        
        branding = service.create_branding(test_tenant.id, branding_data)
        
        assert branding.id is not None
        assert branding.name == "Company Branding"
        assert branding.primary_color == "#007bff"
        assert branding.company_name == "Test Company"
        assert branding.is_default is True
    
    def test_set_custom_field_value(self, db_session: Session, test_tenant: Tenant, test_customer: Customer):
        """Test setting custom field values on invoice items"""
        service = InvoiceTemplateService(db_session)
        
        # Create template and custom field
        template_data = InvoiceTemplateCreate(
            name="Test Template",
            template_type=TemplateType.GENERAL
        )
        template = service.create_template(test_tenant.id, template_data)
        
        field_data = InvoiceCustomFieldCreate(
            template_id=template.id,
            field_name="warranty_period",
            display_name="Warranty Period",
            field_type=FieldType.NUMBER
        )
        custom_field = service.create_custom_field(test_tenant.id, field_data)
        
        # Create invoice and item
        invoice = Invoice(
            tenant_id=test_tenant.id,
            customer_id=test_customer.id,
            invoice_number="TEST-001",
            invoice_type="GENERAL",
            total_amount=100.00
        )
        db_session.add(invoice)
        db_session.commit()
        
        invoice_item = InvoiceItem(
            invoice_id=invoice.id,
            description="Test Item",
            quantity=1,
            unit_price=100.00,
            line_total=100.00
        )
        db_session.add(invoice_item)
        db_session.commit()
        
        # Set custom field value
        field_value = service.set_custom_field_value(
            invoice_item.id,
            custom_field.id,
            12  # 12 months warranty
        )
        
        assert field_value.number_value == 12
        assert field_value.value == 12
    
    def test_validate_custom_field_values(self, db_session: Session, test_tenant: Tenant):
        """Test validation of custom field values"""
        service = InvoiceTemplateService(db_session)
        
        # Create template with required field
        template_data = InvoiceTemplateCreate(
            name="Test Template",
            template_type=TemplateType.GENERAL
        )
        template = service.create_template(test_tenant.id, template_data)
        
        field_data = InvoiceCustomFieldCreate(
            template_id=template.id,
            field_name="required_field",
            display_name="Required Field",
            field_type=FieldType.TEXT,
            is_required=True
        )
        service.create_custom_field(test_tenant.id, field_data)
        
        # Test validation with missing required field
        with pytest.raises(Exception):  # Should raise HTTPException
            service.validate_custom_field_values(template.id, {})
        
        # Test validation with valid values
        result = service.validate_custom_field_values(
            template.id, 
            {"required_field": "Some value"}
        )
        assert result is True


class TestInvoiceCustomizationAPI:
    """Test invoice customization API endpoints"""
    
    def test_create_template_endpoint(self, client: TestClient, auth_headers: dict, test_tenant: Tenant):
        """Test creating template via API"""
        template_data = {
            "name": "API Test Template",
            "description": "Created via API",
            "template_type": "GENERAL",
            "is_default": True,
            "layout_config": {"columns": 2}
        }
        
        response = client.post(
            "/api/invoice-customization/templates",
            json=template_data,
            headers=auth_headers
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["name"] == "API Test Template"
        assert data["template_type"] == "GENERAL"
        assert data["is_default"] is True
    
    def test_get_templates_endpoint(self, client: TestClient, auth_headers: dict, test_tenant: Tenant):
        """Test retrieving templates via API"""
        # Create a template first
        template_data = {
            "name": "Test Template",
            "template_type": "GENERAL"
        }
        
        client.post(
            "/api/invoice-customization/templates",
            json=template_data,
            headers=auth_headers
        )
        
        # Get templates
        response = client.get(
            "/api/invoice-customization/templates",
            headers=auth_headers
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "templates" in data
        assert len(data["templates"]) >= 1
        assert data["templates"][0]["name"] == "Test Template"
    
    def test_create_custom_field_endpoint(self, client: TestClient, auth_headers: dict, test_tenant: Tenant):
        """Test creating custom field via API"""
        # Create template first
        template_data = {
            "name": "Field Test Template",
            "template_type": "GENERAL"
        }
        
        template_response = client.post(
            "/api/invoice-customization/templates",
            json=template_data,
            headers=auth_headers
        )
        template_id = template_response.json()["id"]
        
        # Create custom field
        field_data = {
            "template_id": template_id,
            "field_name": "api_custom_field",
            "display_name": "API Custom Field",
            "field_type": "TEXT",
            "is_required": False,
            "default_value": "API Default"
        }
        
        response = client.post(
            "/api/invoice-customization/custom-fields",
            json=field_data,
            headers=auth_headers
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["field_name"] == "api_custom_field"
        assert data["field_type"] == "TEXT"
        assert data["default_value"] == "API Default"
    
    def test_create_numbering_scheme_endpoint(self, client: TestClient, auth_headers: dict, test_tenant: Tenant):
        """Test creating numbering scheme via API"""
        scheme_data = {
            "name": "API Numbering Scheme",
            "description": "Created via API",
            "prefix": "API-",
            "number_format": "{prefix}{sequence:05d}",
            "current_sequence": 1,
            "is_default": True
        }
        
        response = client.post(
            "/api/invoice-customization/numbering-schemes",
            json=scheme_data,
            headers=auth_headers
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["name"] == "API Numbering Scheme"
        assert data["prefix"] == "API-"
        assert data["is_default"] is True
    
    def test_generate_invoice_number_endpoint(self, client: TestClient, auth_headers: dict, test_tenant: Tenant):
        """Test generating invoice number via API"""
        # Create numbering scheme first
        scheme_data = {
            "name": "Generation Test Scheme",
            "prefix": "GEN-",
            "number_format": "{prefix}{sequence:03d}",
            "current_sequence": 1,
            "is_default": True
        }
        
        scheme_response = client.post(
            "/api/invoice-customization/numbering-schemes",
            json=scheme_data,
            headers=auth_headers
        )
        scheme_id = scheme_response.json()["id"]
        
        # Generate invoice number
        response = client.post(
            f"/api/invoice-customization/generate-invoice-number?scheme_id={scheme_id}",
            headers=auth_headers
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "invoice_number" in data
        assert data["invoice_number"] == "GEN-001"
    
    def test_create_branding_endpoint(self, client: TestClient, auth_headers: dict, test_tenant: Tenant):
        """Test creating branding configuration via API"""
        branding_data = {
            "name": "API Branding",
            "description": "Created via API",
            "primary_color": "#ff0000",
            "company_name": "API Test Company",
            "company_email": "api@test.com",
            "is_default": True
        }
        
        response = client.post(
            "/api/invoice-customization/branding",
            json=branding_data,
            headers=auth_headers
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["name"] == "API Branding"
        assert data["primary_color"] == "#ff0000"
        assert data["company_name"] == "API Test Company"
    
    def test_unauthorized_access_fails(self, client: TestClient):
        """Test that unauthorized access to endpoints fails"""
        response = client.get("/api/invoice-customization/templates")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_template_not_found(self, client: TestClient, auth_headers: dict):
        """Test accessing non-existent template returns 404"""
        fake_id = str(uuid.uuid4())
        response = client.get(
            f"/api/invoice-customization/templates/{fake_id}",
            headers=auth_headers
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND


class TestInvoiceCustomFieldValues:
    """Test custom field value functionality"""
    
    def test_field_value_type_conversion(self, db_session: Session):
        """Test that field values are stored and retrieved with correct types"""
        # Create a custom field value
        field_value = InvoiceItemCustomFieldValue(
            invoice_item_id=uuid.uuid4(),
            custom_field_id=uuid.uuid4()
        )
        
        # Test text value
        field_value.set_value("Test text", FieldType.TEXT)
        assert field_value.text_value == "Test text"
        assert field_value.value == "Test text"
        
        # Test number value
        field_value.set_value(42, FieldType.NUMBER)
        assert field_value.number_value == 42
        assert field_value.value == 42
        
        # Test decimal value
        field_value.set_value("123.45", FieldType.DECIMAL)
        assert field_value.decimal_value == "123.45"
        assert field_value.value == "123.45"
        
        # Test boolean value
        field_value.set_value(True, FieldType.BOOLEAN)
        assert field_value.boolean_value is True
        assert field_value.value is True
    
    def test_field_validation_rules(self, db_session: Session, test_tenant: Tenant):
        """Test custom field validation rules"""
        service = InvoiceTemplateService(db_session)
        
        # Create template
        template_data = InvoiceTemplateCreate(
            name="Validation Test Template",
            template_type=TemplateType.GENERAL
        )
        template = service.create_template(test_tenant.id, template_data)
        
        # Create field with validation rules
        field_data = InvoiceCustomFieldCreate(
            template_id=template.id,
            field_name="validated_number",
            display_name="Validated Number",
            field_type=FieldType.NUMBER,
            validation_rules={"min": 1, "max": 100}
        )
        custom_field = service.create_custom_field(test_tenant.id, field_data)
        
        # Test validation with valid value
        service._validate_field_value(50, custom_field)  # Should not raise
        
        # Test validation with invalid values
        with pytest.raises(Exception):
            service._validate_field_value(0, custom_field)  # Below min
        
        with pytest.raises(Exception):
            service._validate_field_value(101, custom_field)  # Above max


class TestNumberingSchemeGeneration:
    """Test invoice numbering scheme generation logic"""
    
    def test_sequence_reset_yearly(self, db_session: Session, test_tenant: Tenant):
        """Test yearly sequence reset"""
        service = InvoiceTemplateService(db_session)
        
        scheme_data = InvoiceNumberingSchemeCreate(
            name="Yearly Reset Scheme",
            prefix="YR-",
            number_format="{prefix}{year}{sequence:03d}",
            current_sequence=50,
            sequence_reset_frequency="YEARLY",
            last_reset_date="2023-01-01"  # Old date to trigger reset
        )
        scheme = service.create_numbering_scheme(test_tenant.id, scheme_data)
        
        # Generate number (should reset sequence)
        number = scheme.generate_next_number()
        
        # Should start from 1 again with current year
        current_year = datetime.now().year
        expected = f"YR-{current_year}001"
        assert number == expected
        assert scheme.current_sequence == 2  # Incremented after generation
    
    def test_sequence_no_reset(self, db_session: Session, test_tenant: Tenant):
        """Test no sequence reset"""
        service = InvoiceTemplateService(db_session)
        
        scheme_data = InvoiceNumberingSchemeCreate(
            name="No Reset Scheme",
            prefix="NR-",
            number_format="{prefix}{sequence:04d}",
            current_sequence=100,
            sequence_reset_frequency="NEVER"
        )
        scheme = service.create_numbering_scheme(test_tenant.id, scheme_data)
        
        # Generate number
        number = scheme.generate_next_number()
        
        assert number == "NR-0100"
        assert scheme.current_sequence == 101
    
    def test_complex_number_format(self, db_session: Session, test_tenant: Tenant):
        """Test complex number format with multiple variables"""
        service = InvoiceTemplateService(db_session)
        
        scheme_data = InvoiceNumberingSchemeCreate(
            name="Complex Format Scheme",
            prefix="COMP",
            suffix="END",
            number_format="{prefix}-{year}-{month:02d}-{sequence:05d}-{suffix}",
            current_sequence=1
        )
        scheme = service.create_numbering_scheme(test_tenant.id, scheme_data)
        
        # Generate number
        number = scheme.generate_next_number()
        
        now = datetime.now()
        expected = f"COMP-{now.year}-{now.month:02d}-00001-END"
        assert number == expected


# Fixtures for testing
@pytest.fixture
def test_tenant(db_session: Session) -> Tenant:
    """Create a test tenant"""
    tenant = Tenant(
        name="Test Tenant",
        email="test@example.com",
        subscription_type="FREE"
    )
    db_session.add(tenant)
    db_session.commit()
    db_session.refresh(tenant)
    return tenant


@pytest.fixture
def test_customer(db_session: Session, test_tenant: Tenant) -> Customer:
    """Create a test customer"""
    customer = Customer(
        tenant_id=test_tenant.id,
        name="Test Customer",
        email="customer@example.com"
    )
    db_session.add(customer)
    db_session.commit()
    db_session.refresh(customer)
    return customer


@pytest.fixture
def auth_headers(test_tenant: Tenant) -> dict:
    """Create authentication headers for API tests"""
    # This would normally create a JWT token
    # For now, we'll mock it
    return {"Authorization": "Bearer test-token"}