"""
Integration tests for invoice sharing API endpoints
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
import uuid
from datetime import datetime, timedelta
from unittest.mock import patch, Mock

from app.main import app
from app.core.database import get_db
from app.models.tenant import Tenant
from app.models.user import User, UserRole
from app.models.customer import Customer
from app.models.invoice import Invoice, InvoiceItem, InvoiceType, InvoiceStatus
from app.models.invoice_access_log import InvoiceAccessLog
from app.core.auth import create_access_token


@pytest.fixture
def client():
    """Create test client"""
    return TestClient(app)


@pytest.fixture
def db_session():
    """Create test database session"""
    from app.core.database import SessionLocal, engine
    from app.models.base import Base
    
    # Create tables
    Base.metadata.create_all(bind=engine)
    
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def test_tenant(db_session):
    """Create test tenant"""
    tenant = Tenant(
        name="Test Company",
        domain="test.hesaabplus.com",
        subscription_type="pro",
        is_active=True
    )
    db_session.add(tenant)
    db_session.commit()
    db_session.refresh(tenant)
    return tenant


@pytest.fixture
def test_user(db_session, test_tenant):
    """Create test user"""
    user = User(
        tenant_id=test_tenant.id,
        email="test@example.com",
        password_hash="hashed_password",
        role=UserRole.ADMIN,
        is_active=True
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def test_customer(db_session, test_tenant):
    """Create test customer"""
    customer = Customer(
        tenant_id=test_tenant.id,
        name="Test Customer",
        email="customer@example.com",
        phone="123-456-7890"
    )
    db_session.add(customer)
    db_session.commit()
    db_session.refresh(customer)
    return customer


@pytest.fixture
def test_invoice(db_session, test_tenant, test_customer):
    """Create test invoice"""
    invoice = Invoice(
        tenant_id=test_tenant.id,
        customer_id=test_customer.id,
        invoice_number="INV-2024-01-0001",
        invoice_type=InvoiceType.GENERAL,
        status=InvoiceStatus.SENT,
        total_amount=1000.00,
        is_shareable=True
    )
    invoice.generate_qr_token()
    
    db_session.add(invoice)
    db_session.commit()
    db_session.refresh(invoice)
    return invoice


@pytest.fixture
def auth_headers(test_user):
    """Create authentication headers"""
    token = create_access_token(
        data={
            "user_id": str(test_user.id),
            "tenant_id": str(test_user.tenant_id),
            "email": test_user.email
        }
    )
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def override_db(db_session):
    """Override database dependency"""
    def _override_get_db():
        try:
            yield db_session
        finally:
            pass
    
    app.dependency_overrides[get_db] = _override_get_db
    yield
    app.dependency_overrides.clear()


class TestInvoiceSharingAPIIntegration:
    """Integration tests for invoice sharing API"""
    
    def test_generate_qr_code_success(self, client, override_db, test_invoice, auth_headers):
        """Test successful QR code generation"""
        with patch('app.services.qr_service.QRCodeService') as mock_qr_service:
            # Mock QR service
            mock_service = Mock()
            mock_service.generate_qr_code_base64.return_value = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
            mock_qr_service.return_value = mock_service
            
            response = client.post(
                f"/api/invoices/{test_invoice.id}/qr-code",
                json={
                    "regenerate": False,
                    "size": 10,
                    "format": "PNG"
                },
                headers=auth_headers
            )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "qr_token" in data
        assert "qr_url" in data
        assert "qr_base64" in data
        assert data["invoice_number"] == test_invoice.invoice_number
        assert data["is_shareable"] is True
    
    def test_generate_qr_code_invoice_not_found(self, client, override_db, auth_headers):
        """Test QR code generation for non-existent invoice"""
        fake_invoice_id = uuid.uuid4()
        
        response = client.post(
            f"/api/invoices/{fake_invoice_id}/qr-code",
            json={"regenerate": False},
            headers=auth_headers
        )
        
        assert response.status_code == 404
        assert "Invoice not found" in response.json()["detail"]
    
    def test_generate_qr_code_unauthorized(self, client, override_db, test_invoice):
        """Test QR code generation without authentication"""
        response = client.post(
            f"/api/invoices/{test_invoice.id}/qr-code",
            json={"regenerate": False}
        )
        
        assert response.status_code == 401
    
    def test_get_qr_code_image_success(self, client, override_db, test_invoice, auth_headers):
        """Test successful QR code image retrieval"""
        with patch('app.services.qr_service.QRCodeService') as mock_qr_service:
            # Mock QR service to return PNG bytes
            mock_service = Mock()
            mock_service.generate_invoice_qr_code.return_value = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\rIDATx\x9cc\xf8\xff\x9f\x81\x1e\x00\x07\x82\x02\x7f<\xc8H\xef\x00\x00\x00\x00IEND\xaeB`\x82'
            mock_qr_service.return_value = mock_service
            
            response = client.get(
                f"/api/invoices/{test_invoice.id}/qr-code/image",
                params={"format": "PNG", "size": 10},
                headers=auth_headers
            )
        
        assert response.status_code == 200
        assert response.headers["content-type"] == "image/png"
        assert "qr_code_" in response.headers["content-disposition"]
    
    def test_get_qr_code_image_no_token(self, client, override_db, test_customer, test_tenant, auth_headers):
        """Test QR code image retrieval for invoice without QR token"""
        # Create invoice without QR token
        invoice_without_qr = Invoice(
            tenant_id=test_tenant.id,
            customer_id=test_customer.id,
            invoice_number="INV-2024-01-0002",
            invoice_type=InvoiceType.GENERAL,
            total_amount=500.00,
            is_shareable=True
        )
        # Don't generate QR token
        
        from app.core.database import SessionLocal
        db = SessionLocal()
        db.add(invoice_without_qr)
        db.commit()
        db.refresh(invoice_without_qr)
        db.close()
        
        response = client.get(
            f"/api/invoices/{invoice_without_qr.id}/qr-code/image",
            headers=auth_headers
        )
        
        assert response.status_code == 400
        assert "does not have a QR code" in response.json()["detail"]
    
    def test_update_sharing_settings_success(self, client, override_db, test_invoice, auth_headers):
        """Test successful sharing settings update"""
        response = client.put(
            f"/api/invoices/{test_invoice.id}/sharing",
            json={
                "is_shareable": True,
                "regenerate_token": True
            },
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["invoice_id"] == str(test_invoice.id)
        assert data["is_shareable"] is True
        assert "qr_token" in data
        assert "qr_url" in data
    
    def test_update_sharing_settings_disable_sharing(self, client, override_db, test_invoice, auth_headers):
        """Test disabling invoice sharing"""
        response = client.put(
            f"/api/invoices/{test_invoice.id}/sharing",
            json={
                "is_shareable": False,
                "regenerate_token": False
            },
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["is_shareable"] is False
    
    def test_generate_invoice_pdf_success(self, client, override_db, test_invoice, auth_headers):
        """Test successful PDF generation"""
        with patch('app.services.pdf_service.PDFService') as mock_pdf_service:
            # Mock PDF service
            mock_service = Mock()
            mock_service.generate_invoice_pdf.return_value = b'%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n'
            mock_pdf_service.return_value = mock_service
            
            response = client.get(
                f"/api/invoices/{test_invoice.id}/pdf",
                params={"include_qr": True},
                headers=auth_headers
            )
        
        assert response.status_code == 200
        assert response.headers["content-type"] == "application/pdf"
        assert "invoice_" in response.headers["content-disposition"]
        assert "attachment" in response.headers["content-disposition"]
    
    def test_get_access_logs_success(self, client, override_db, test_invoice, auth_headers, db_session):
        """Test successful access logs retrieval"""
        # Create some access logs
        for i in range(3):
            access_log = InvoiceAccessLog(
                invoice_id=test_invoice.id,
                qr_token=test_invoice.qr_code_token,
                access_ip=f"192.168.1.{i+1}",
                user_agent="Test Browser",
                access_method="qr_code"
            )
            db_session.add(access_log)
        
        db_session.commit()
        
        response = client.get(
            "/api/invoices/access-logs",
            params={
                "invoice_id": str(test_invoice.id),
                "days_back": 7,
                "skip": 0,
                "limit": 10
            },
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        assert len(data) == 3
        
        for log in data:
            assert "id" in log
            assert "invoice_id" in log
            assert "access_ip" in log
            assert "access_method" in log
            assert "created_at" in log
    
    def test_get_access_statistics_success(self, client, override_db, test_invoice, auth_headers, db_session):
        """Test successful access statistics retrieval"""
        # Create some access logs
        for i in range(5):
            access_log = InvoiceAccessLog(
                invoice_id=test_invoice.id,
                qr_token=test_invoice.qr_code_token,
                access_ip=f"192.168.1.{i % 3 + 1}",  # Some duplicate IPs
                user_agent="Test Browser",
                access_method="qr_code"
            )
            db_session.add(access_log)
        
        db_session.commit()
        
        response = client.get(
            "/api/invoices/access-stats",
            params={
                "invoice_id": str(test_invoice.id),
                "days_back": 30
            },
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "total_accesses" in data
        assert "unique_ips" in data
        assert "daily_accesses" in data
        assert "top_ips" in data
        assert "most_accessed_invoices" in data
        assert "period_days" in data
        assert data["period_days"] == 30
    
    def test_get_public_invoice_success(self, client, override_db, test_invoice):
        """Test successful public invoice retrieval"""
        response = client.get(f"/api/public/invoice/{test_invoice.qr_code_token}")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["id"] == str(test_invoice.id)
        assert data["invoice_number"] == test_invoice.invoice_number
        assert data["invoice_type"] == test_invoice.invoice_type.value
        assert "customer" in data
    
    def test_get_public_invoice_not_found(self, client, override_db):
        """Test public invoice retrieval with invalid token"""
        response = client.get("/api/public/invoice/invalid-token-12345")
        
        assert response.status_code == 404
        assert "Invoice not found or not shareable" in response.json()["detail"]
    
    def test_validate_qr_token_success(self, client, override_db, test_invoice):
        """Test successful QR token validation"""
        response = client.get(f"/api/public/invoice/{test_invoice.qr_code_token}/validate")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["valid"] is True
        assert data["invoice_number"] == test_invoice.invoice_number
        assert data["customer_name"] == test_invoice.customer.name
    
    def test_validate_qr_token_invalid(self, client, override_db):
        """Test QR token validation with invalid token"""
        response = client.get("/api/public/invoice/invalid-token/validate")
        
        assert response.status_code == 400
        data = response.json()
        
        assert "Invalid or expired QR code" in data["detail"]
    
    def test_get_public_invoice_pdf_success(self, client, override_db, test_invoice):
        """Test successful public PDF retrieval"""
        with patch('app.services.pdf_service.PDFService') as mock_pdf_service:
            # Mock PDF service
            mock_service = Mock()
            mock_service.generate_invoice_pdf.return_value = b'%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n'
            mock_pdf_service.return_value = mock_service
            
            response = client.get(f"/api/public/invoice/{test_invoice.qr_code_token}/pdf")
        
        assert response.status_code == 200
        assert response.headers["content-type"] == "application/pdf"
        assert "invoice_" in response.headers["content-disposition"]
        assert "inline" in response.headers["content-disposition"]
    
    def test_public_endpoints_no_auth_required(self, client, override_db, test_invoice):
        """Test that public endpoints don't require authentication"""
        # These should all work without auth headers
        
        # Validate token
        response = client.get(f"/api/public/invoice/{test_invoice.qr_code_token}/validate")
        assert response.status_code == 200
        
        # Get public invoice
        response = client.get(f"/api/public/invoice/{test_invoice.qr_code_token}")
        assert response.status_code == 200
        
        # Get public PDF (with mocked PDF service)
        with patch('app.services.pdf_service.PDFService') as mock_pdf_service:
            mock_service = Mock()
            mock_service.generate_invoice_pdf.return_value = b'%PDF-1.4\n'
            mock_pdf_service.return_value = mock_service
            
            response = client.get(f"/api/public/invoice/{test_invoice.qr_code_token}/pdf")
            assert response.status_code == 200
    
    def test_protected_endpoints_require_auth(self, client, override_db, test_invoice):
        """Test that protected endpoints require authentication"""
        # These should all fail without auth headers
        
        # Generate QR code
        response = client.post(f"/api/invoices/{test_invoice.id}/qr-code", json={})
        assert response.status_code == 401
        
        # Get QR code image
        response = client.get(f"/api/invoices/{test_invoice.id}/qr-code/image")
        assert response.status_code == 401
        
        # Update sharing settings
        response = client.put(f"/api/invoices/{test_invoice.id}/sharing", json={})
        assert response.status_code == 401
        
        # Generate PDF
        response = client.get(f"/api/invoices/{test_invoice.id}/pdf")
        assert response.status_code == 401
        
        # Get access logs
        response = client.get("/api/invoices/access-logs")
        assert response.status_code == 401
        
        # Get access statistics
        response = client.get("/api/invoices/access-stats")
        assert response.status_code == 401
    
    def test_tenant_isolation(self, client, override_db, test_invoice, db_session):
        """Test that users can only access their own tenant's invoices"""
        # Create another tenant and user
        other_tenant = Tenant(
            name="Other Company",
            domain="other.hesaabplus.com",
            subscription_type="free",
            is_active=True
        )
        db_session.add(other_tenant)
        db_session.commit()
        
        other_user = User(
            tenant_id=other_tenant.id,
            email="other@example.com",
            password_hash="hashed_password",
            role=UserRole.ADMIN,
            is_active=True
        )
        db_session.add(other_user)
        db_session.commit()
        
        # Create auth headers for other user
        other_token = create_access_token(
            data={
                "user_id": str(other_user.id),
                "tenant_id": str(other_user.tenant_id),
                "email": other_user.email
            }
        )
        other_auth_headers = {"Authorization": f"Bearer {other_token}"}
        
        # Try to access test_invoice (belongs to different tenant)
        response = client.post(
            f"/api/invoices/{test_invoice.id}/qr-code",
            json={"regenerate": False},
            headers=other_auth_headers
        )
        
        assert response.status_code == 404  # Should not find invoice from other tenant