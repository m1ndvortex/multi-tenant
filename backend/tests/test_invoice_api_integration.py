"""
Integration tests for Invoice API endpoints
Tests real HTTP requests to FastAPI endpoints with real database
"""

import pytest
from fastapi.testclient import TestClient
from decimal import Decimal
import uuid
import json

from app.main import app
from app.models.tenant import Tenant, TenantStatus
from app.models.user import User
from app.models.customer import Customer
from app.models.product import Product
from app.models.invoice import Invoice, InvoiceType, InvoiceStatus


class TestInvoiceAPIIntegration:
    """Integration tests for Invoice API endpoints"""
    
    @pytest.fixture
    def client(self):
        """Create test client"""
        return TestClient(app)
    
    @pytest.fixture
    def setup_test_data(self, db_session):
        """Setup test data for API tests"""
        # Create tenant
        from app.models.tenant import TenantStatus
        tenant = Tenant(
            name="API Test Business",
            email="api@test.com",
            subscription_type="PRO",
            status=TenantStatus.ACTIVE,
            max_users=5,
            max_products=100,
            max_customers=100,
            max_monthly_invoices=100
        )
        db_session.add(tenant)
        db_session.commit()
        
        # Create user with properly hashed password
        from passlib.context import CryptContext
        pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        from app.models.user import UserRole, UserStatus
        user = User(
            tenant_id=tenant.id,
            email="apiuser@test.com",
            password_hash=pwd_context.hash("secret"),
            first_name="API",
            last_name="User",
            role=UserRole.ADMIN,
            status=UserStatus.ACTIVE
        )
        db_session.add(user)
        db_session.commit()
        
        # Create customers
        customer1 = Customer(
            tenant_id=tenant.id,
            name="API Customer 1",
            email="customer1@api.com",
            phone="+1234567890"
        )
        
        customer2 = Customer(
            tenant_id=tenant.id,
            name="API Gold Customer",
            email="goldcustomer@api.com",
            phone="+1234567891"
        )
        
        db_session.add_all([customer1, customer2])
        db_session.commit()
        
        # Create products
        general_product = Product(
            tenant_id=tenant.id,
            name="API General Product",
            selling_price=Decimal('150.00'),
            stock_quantity=100
        )
        
        gold_product = Product(
            tenant_id=tenant.id,
            name="API Gold Ring",
            selling_price=Decimal('6000000.00'),
            is_gold_product=True,
            gold_purity=Decimal('18.000'),
            weight_per_unit=Decimal('12.000'),
            stock_quantity=20
        )
        
        db_session.add_all([general_product, gold_product])
        db_session.commit()
        
        return {
            'tenant': tenant,
            'user': user,
            'customer1': customer1,
            'customer2': customer2,
            'general_product': general_product,
            'gold_product': gold_product
        }
    
    @pytest.fixture
    def auth_headers(self, client, setup_test_data):
        """Get authentication headers"""
        data = setup_test_data
        
        # Login to get token
        login_data = {
            "email": data['user'].email,
            "password": "secret"
        }
        
        response = client.post("/api/auth/login", json=login_data)
        assert response.status_code == 200
        
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_create_general_invoice_api(self, client, setup_test_data, auth_headers):
        """Test creating general invoice via API"""
        data = setup_test_data
        
        invoice_data = {
            "customer_id": str(data['customer1'].id),
            "invoice_type": "general",
            "items": [
                {
                    "product_id": str(data['general_product'].id),
                    "description": "API General Product",
                    "quantity": "2.000",
                    "unit_price": "150.00",
                    "tax_rate": "9.00"
                },
                {
                    "description": "Custom API Service",
                    "quantity": "1.000",
                    "unit_price": "75.00",
                    "tax_rate": "9.00"
                }
            ]
        }
        
        response = client.post(
            "/api/invoices/",
            json=invoice_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        assert result["customer_id"] == str(data['customer1'].id)
        assert result["invoice_type"] == "general"
        assert result["status"] == "draft"
        assert len(result["items"]) == 2
        assert result["invoice_number"].startswith("INV-")
        assert result["qr_code_token"] is not None
        
        # Check calculations
        # Item 1: 2 * 150 = 300, tax = 27, total = 327
        # Item 2: 1 * 75 = 75, tax = 6.75, total = 81.75
        # Total: 408.75
        assert Decimal(result["subtotal"]) == Decimal("408.75")
        assert Decimal(result["total_amount"]) == Decimal("408.75")
    
    def test_create_gold_invoice_api(self, client, setup_test_data, auth_headers):
        """Test creating gold invoice via API"""
        data = setup_test_data
        
        invoice_data = {
            "customer_id": str(data['customer2'].id),
            "invoice_type": "gold",
            "gold_price_at_creation": "500000.00",
            "items": [
                {
                    "product_id": str(data['gold_product'].id),
                    "description": "API Gold Ring",
                    "quantity": "1.000",
                    "unit_price": "5000000.00",
                    "weight": "12.000",
                    "labor_fee": "600000.00",
                    "profit": "300000.00",
                    "vat_amount": "100000.00"
                }
            ]
        }
        
        response = client.post(
            "/api/invoices/",
            json=invoice_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        assert result["invoice_type"] == "gold"
        assert result["invoice_number"].startswith("GOLD-")
        assert Decimal(result["gold_price_at_creation"]) == Decimal("500000.00")
        assert Decimal(result["total_gold_weight"]) == Decimal("12.000")
        
        # Check gold item
        item = result["items"][0]
        assert Decimal(item["weight"]) == Decimal("12.000")
        assert Decimal(item["labor_fee"]) == Decimal("600000.00")
        assert Decimal(item["profit"]) == Decimal("300000.00")
        assert Decimal(item["vat_amount"]) == Decimal("100000.00")
    
    def test_get_invoices_api(self, client, setup_test_data, auth_headers):
        """Test getting invoices list via API"""
        data = setup_test_data
        
        # Create a few invoices first
        invoice_data = {
            "customer_id": str(data['customer1'].id),
            "invoice_type": "general",
            "items": [
                {
                    "description": "Test Item",
                    "quantity": "1.000",
                    "unit_price": "100.00"
                }
            ]
        }
        
        # Create multiple invoices
        for i in range(3):
            response = client.post(
                "/api/invoices/",
                json=invoice_data,
                headers=auth_headers
            )
            assert response.status_code == 200
        
        # Get invoices list
        response = client.get(
            "/api/invoices/",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        assert result["total"] == 3
        assert len(result["items"]) == 3
        assert result["page"] == 1
        assert result["per_page"] == 50
    
    def test_get_invoices_with_filters_api(self, client, setup_test_data, auth_headers):
        """Test getting invoices with filters via API"""
        data = setup_test_data
        
        # Create general invoice
        general_invoice_data = {
            "customer_id": str(data['customer1'].id),
            "invoice_type": "GENERAL",
            "items": [
                {
                    "description": "General Item",
                    "quantity": "1.000",
                    "unit_price": "100.00"
                }
            ]
        }
        
        response = client.post(
            "/api/invoices/",
            json=general_invoice_data,
            headers=auth_headers
        )
        assert response.status_code == 200
        
        # Create gold invoice
        gold_invoice_data = {
            "customer_id": str(data['customer2'].id),
            "invoice_type": "GOLD",
            "gold_price_at_creation": "500000.00",
            "items": [
                {
                    "description": "Gold Item",
                    "quantity": "1.000",
                    "unit_price": "1000000.00",
                    "weight": "5.000"
                }
            ]
        }
        
        response = client.post(
            "/api/invoices/",
            json=gold_invoice_data,
            headers=auth_headers
        )
        assert response.status_code == 200
        
        # Filter by invoice type
        response = client.get(
            "/api/invoices/?invoice_type=GENERAL",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        assert result["total"] == 1
        assert result["items"][0]["invoice_type"] == "GENERAL"
        
        # Filter by customer
        response = client.get(
            f"/api/invoices/?customer_id={data['customer2'].id}",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        assert result["total"] == 1
        assert result["items"][0]["customer_id"] == str(data['customer2'].id)
        
        # Search
        response = client.get(
            "/api/invoices/?search=Gold",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        assert result["total"] == 1
    
    def test_get_invoice_by_id_api(self, client, setup_test_data, auth_headers):
        """Test getting specific invoice by ID via API"""
        data = setup_test_data
        
        # Create invoice
        invoice_data = {
            "customer_id": str(data['customer1'].id),
            "invoice_type": "general",
            "items": [
                {
                    "description": "Test Item",
                    "quantity": "1.000",
                    "unit_price": "100.00"
                }
            ]
        }
        
        create_response = client.post(
            "/api/invoices/",
            json=invoice_data,
            headers=auth_headers
        )
        assert create_response.status_code == 200
        created_invoice = create_response.json()
        
        # Get invoice by ID
        response = client.get(
            f"/api/invoices/{created_invoice['id']}",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        assert result["id"] == created_invoice["id"]
        assert result["invoice_number"] == created_invoice["invoice_number"]
        assert len(result["items"]) == 1
    
    def test_update_invoice_api(self, client, setup_test_data, auth_headers):
        """Test updating invoice via API"""
        data = setup_test_data
        
        # Create invoice
        invoice_data = {
            "customer_id": str(data['customer1'].id),
            "invoice_type": "general",
            "items": [
                {
                    "description": "Test Item",
                    "quantity": "1.000",
                    "unit_price": "100.00"
                }
            ]
        }
        
        create_response = client.post(
            "/api/invoices/",
            json=invoice_data,
            headers=auth_headers
        )
        assert create_response.status_code == 200
        created_invoice = create_response.json()
        
        # Update invoice
        update_data = {
            "notes": "Updated via API",
            "customer_notes": "Customer notes via API"
        }
        
        response = client.put(
            f"/api/invoices/{created_invoice['id']}",
            json=update_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        assert result["notes"] == "Updated via API"
        assert result["customer_notes"] == "Customer notes via API"
    
    def test_send_invoice_api(self, client, setup_test_data, auth_headers):
        """Test sending invoice via API"""
        data = setup_test_data
        
        # Create invoice
        invoice_data = {
            "customer_id": str(data['customer1'].id),
            "invoice_type": "general",
            "items": [
                {
                    "description": "Test Item",
                    "quantity": "1.000",
                    "unit_price": "100.00"
                }
            ]
        }
        
        create_response = client.post(
            "/api/invoices/",
            json=invoice_data,
            headers=auth_headers
        )
        assert create_response.status_code == 200
        created_invoice = create_response.json()
        
        assert created_invoice["status"] == "draft"
        
        # Send invoice
        response = client.post(
            f"/api/invoices/{created_invoice['id']}/send",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        assert result["status"] == "sent"
        assert result["qr_code_token"] is not None
    
    def test_add_payment_api(self, client, setup_test_data, auth_headers):
        """Test adding payment to invoice via API"""
        data = setup_test_data
        
        # Create invoice
        invoice_data = {
            "customer_id": str(data['customer1'].id),
            "invoice_type": "general",
            "items": [
                {
                    "description": "Test Item",
                    "quantity": "1.000",
                    "unit_price": "100.00"
                }
            ]
        }
        
        create_response = client.post(
            "/api/invoices/",
            json=invoice_data,
            headers=auth_headers
        )
        assert create_response.status_code == 200
        created_invoice = create_response.json()
        
        # Add payment
        payment_data = {
            "amount": "50.00",
            "payment_method": "cash",
            "notes": "Partial payment"
        }
        
        response = client.post(
            f"/api/invoices/{created_invoice['id']}/payments",
            json=payment_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        assert Decimal(result["paid_amount"]) == Decimal("50.00")
        assert result["status"] == "partially_paid"
        assert Decimal(result["balance_due"]) == Decimal("50.00")
    
    def test_add_gold_payment_api(self, client, setup_test_data, auth_headers):
        """Test adding gold payment to gold installment invoice via API"""
        data = setup_test_data
        
        # Create gold installment invoice
        invoice_data = {
            "customer_id": str(data['customer2'].id),
            "invoice_type": "gold",
            "gold_price_at_creation": "500000.00",
            "is_installment": True,
            "installment_type": "gold",
            "items": [
                {
                    "description": "Gold Jewelry",
                    "quantity": "1.000",
                    "unit_price": "2500000.00",
                    "weight": "10.000"
                }
            ]
        }
        
        create_response = client.post(
            "/api/invoices/",
            json=invoice_data,
            headers=auth_headers
        )
        assert create_response.status_code == 200
        created_invoice = create_response.json()
        
        # Add gold payment
        payment_data = {
            "amount": "1250000.00",  # 2.5 grams * 500000
            "gold_weight": "2.500",
            "gold_price": "500000.00",
            "payment_method": "gold"
        }
        
        response = client.post(
            f"/api/invoices/{created_invoice['id']}/payments",
            json=payment_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        assert Decimal(result["remaining_gold_weight"]) == Decimal("7.500")
        assert Decimal(result["paid_amount"]) == Decimal("1250000.00")
    
    def test_cancel_invoice_api(self, client, setup_test_data, auth_headers):
        """Test cancelling invoice via API"""
        data = setup_test_data
        
        # Create invoice
        invoice_data = {
            "customer_id": str(data['customer1'].id),
            "invoice_type": "general",
            "items": [
                {
                    "description": "Test Item",
                    "quantity": "1.000",
                    "unit_price": "100.00"
                }
            ]
        }
        
        create_response = client.post(
            "/api/invoices/",
            json=invoice_data,
            headers=auth_headers
        )
        assert create_response.status_code == 200
        created_invoice = create_response.json()
        
        # Cancel invoice
        response = client.post(
            f"/api/invoices/{created_invoice['id']}/cancel?reason=API test cancellation",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        assert result["status"] == "cancelled"
        assert "Cancelled: API test cancellation" in result["notes"]
    
    def test_delete_invoice_api(self, client, setup_test_data, auth_headers):
        """Test deleting invoice via API"""
        data = setup_test_data
        
        # Create invoice
        invoice_data = {
            "customer_id": str(data['customer1'].id),
            "invoice_type": "general",
            "items": [
                {
                    "description": "Test Item",
                    "quantity": "1.000",
                    "unit_price": "100.00"
                }
            ]
        }
        
        create_response = client.post(
            "/api/invoices/",
            json=invoice_data,
            headers=auth_headers
        )
        assert create_response.status_code == 200
        created_invoice = create_response.json()
        
        # Delete invoice
        response = client.delete(
            f"/api/invoices/{created_invoice['id']}",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        assert result["message"] == "Invoice deleted successfully"
        
        # Verify invoice is deleted
        get_response = client.get(
            f"/api/invoices/{created_invoice['id']}",
            headers=auth_headers
        )
        assert get_response.status_code == 404
    
    def test_get_invoice_statistics_api(self, client, setup_test_data, auth_headers):
        """Test getting invoice statistics via API"""
        data = setup_test_data
        
        # Create multiple invoices
        invoices_data = [
            {
                "customer_id": str(data['customer1'].id),
                "invoice_type": "general",
                "items": [
                    {
                        "description": "General Item",
                        "quantity": "1.000",
                        "unit_price": "100.00"
                    }
                ]
            },
            {
                "customer_id": str(data['customer2'].id),
                "invoice_type": "gold",
                "gold_price_at_creation": "500000.00",
                "items": [
                    {
                        "description": "Gold Item",
                        "quantity": "1.000",
                        "unit_price": "1000000.00",
                        "weight": "5.000"
                    }
                ]
            }
        ]
        
        created_invoices = []
        for invoice_data in invoices_data:
            response = client.post(
                "/api/invoices/",
                json=invoice_data,
                headers=auth_headers
            )
            assert response.status_code == 200
            created_invoices.append(response.json())
        
        # Send one invoice
        client.post(
            f"/api/invoices/{created_invoices[0]['id']}/send",
            headers=auth_headers
        )
        
        # Get statistics
        response = client.get(
            "/api/invoices/statistics",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        assert result["total_invoices"] == 2
        assert result["draft_invoices"] == 1
        assert result["sent_invoices"] == 1
        assert result["general_invoices"] == 1
        assert result["gold_invoices"] == 1
        assert Decimal(result["total_gold_weight"]) == Decimal("5.000")
    
    def test_get_qr_code_api(self, client, setup_test_data, auth_headers):
        """Test getting QR code for invoice via API"""
        data = setup_test_data
        
        # Create shareable invoice
        invoice_data = {
            "customer_id": str(data['customer1'].id),
            "invoice_type": "general",
            "is_shareable": True,
            "items": [
                {
                    "description": "Shareable Item",
                    "quantity": "1.000",
                    "unit_price": "100.00"
                }
            ]
        }
        
        create_response = client.post(
            "/api/invoices/",
            json=invoice_data,
            headers=auth_headers
        )
        assert create_response.status_code == 200
        created_invoice = create_response.json()
        
        # Get QR code
        response = client.get(
            f"/api/invoices/{created_invoice['id']}/qr",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        assert result["qr_code_token"] is not None
        assert "public/invoice/" in result["public_url"]
        assert result["qr_code_token"] in result["public_url"]
    
    def test_public_invoice_access_api(self, client, setup_test_data, auth_headers):
        """Test public invoice access via QR token"""
        data = setup_test_data
        
        # Create shareable invoice
        invoice_data = {
            "customer_id": str(data['customer1'].id),
            "invoice_type": "general",
            "is_shareable": True,
            "customer_notes": "Public customer notes",
            "items": [
                {
                    "description": "Public Item",
                    "quantity": "1.000",
                    "unit_price": "100.00"
                }
            ]
        }
        
        create_response = client.post(
            "/api/invoices/",
            json=invoice_data,
            headers=auth_headers
        )
        assert create_response.status_code == 200
        created_invoice = create_response.json()
        
        # Access public invoice (no auth required)
        response = client.get(
            f"/api/invoices/public/{created_invoice['qr_code_token']}"
        )
        
        assert response.status_code == 200
        result = response.json()
        
        assert result["invoice_number"] == created_invoice["invoice_number"]
        assert result["invoice_type"] == "general"
        assert result["customer_notes"] == "Public customer notes"
        assert len(result["items"]) == 1
        
        # Verify limited information is returned
        assert "tenant_id" not in result
        assert "customer_id" not in result
    
    def test_invoice_item_management_api(self, client, setup_test_data, auth_headers):
        """Test invoice item management via API"""
        data = setup_test_data
        
        # Create invoice with one item
        invoice_data = {
            "customer_id": str(data['customer1'].id),
            "invoice_type": "general",
            "items": [
                {
                    "description": "Initial Item",
                    "quantity": "1.000",
                    "unit_price": "100.00"
                }
            ]
        }
        
        create_response = client.post(
            "/api/invoices/",
            json=invoice_data,
            headers=auth_headers
        )
        assert create_response.status_code == 200
        created_invoice = create_response.json()
        
        # Add new item
        new_item_data = {
            "description": "Additional Item",
            "quantity": "2.000",
            "unit_price": "50.00"
        }
        
        response = client.post(
            f"/api/invoices/{created_invoice['id']}/items",
            json=new_item_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        new_item = response.json()
        
        assert new_item["description"] == "Additional Item"
        assert Decimal(new_item["quantity"]) == Decimal("2.000")
        assert Decimal(new_item["unit_price"]) == Decimal("50.00")
        
        # Update item
        update_data = {
            "quantity": "3.000",
            "unit_price": "60.00"
        }
        
        response = client.put(
            f"/api/invoices/{created_invoice['id']}/items/{new_item['id']}",
            json=update_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        updated_item = response.json()
        
        assert Decimal(updated_item["quantity"]) == Decimal("3.000")
        assert Decimal(updated_item["unit_price"]) == Decimal("60.00")
        
        # Delete item (should fail - can't delete last item)
        # First get the invoice to see all items
        get_response = client.get(
            f"/api/invoices/{created_invoice['id']}",
            headers=auth_headers
        )
        invoice_with_items = get_response.json()
        
        # Try to delete an item (should work since we have 2 items)
        response = client.delete(
            f"/api/invoices/{created_invoice['id']}/items/{new_item['id']}",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        assert result["message"] == "Invoice item deleted successfully"
    
    def test_validation_errors_api(self, client, setup_test_data, auth_headers):
        """Test API validation errors"""
        data = setup_test_data
        
        # Test invalid invoice data
        invalid_invoice_data = {
            "customer_id": str(uuid.uuid4()),  # Non-existent customer
            "invoice_type": "general",
            "items": [
                {
                    "description": "Test Item",
                    "quantity": "1.000",
                    "unit_price": "100.00"
                }
            ]
        }
        
        response = client.post(
            "/api/invoices/",
            json=invalid_invoice_data,
            headers=auth_headers
        )
        
        assert response.status_code == 404
        assert "Customer not found" in response.json()["detail"]
        
        # Test gold invoice without gold price
        invalid_gold_data = {
            "customer_id": str(data['customer2'].id),
            "invoice_type": "gold",
            # Missing gold_price_at_creation
            "items": [
                {
                    "description": "Gold Item",
                    "quantity": "1.000",
                    "unit_price": "1000000.00",
                    "weight": "5.000"
                }
            ]
        }
        
        response = client.post(
            "/api/invoices/",
            json=invalid_gold_data,
            headers=auth_headers
        )
        
        assert response.status_code == 422  # Validation error
    
    def test_multi_tenant_isolation_api(self, client, setup_test_data, auth_headers, db_session):
        """Test multi-tenant isolation via API"""
        data = setup_test_data
        
        # Create another tenant and user
        tenant2 = Tenant(
            name="Another API Business",
            email="another-api@test.com",
            status=TenantStatus.ACTIVE
        )
        db_session.add(tenant2)
        db_session.commit()
        
        user2 = User(
            tenant_id=tenant2.id,
            email="user2@api.com",
            password_hash=pwd_context.hash("secret"),
            first_name="User",
            last_name="Two",
            role=UserRole.ADMIN,
            status=UserStatus.ACTIVE
        )
        db_session.add(user2)
        db_session.commit()
        
        # Login as second user
        login_data = {
            "email": user2.email,
            "password": "secret"
        }
        
        response = client.post("/api/auth/login", json=login_data)
        assert response.status_code == 200
        
        token2 = response.json()["access_token"]
        auth_headers2 = {"Authorization": f"Bearer {token2}"}
        
        # Create invoice as first user
        invoice_data = {
            "customer_id": str(data['customer1'].id),
            "invoice_type": "general",
            "items": [
                {
                    "description": "Tenant1 Item",
                    "quantity": "1.000",
                    "unit_price": "100.00"
                }
            ]
        }
        
        response = client.post(
            "/api/invoices/",
            json=invoice_data,
            headers=auth_headers
        )
        assert response.status_code == 200
        invoice1 = response.json()
        
        # Try to access invoice1 as second user - should fail
        response = client.get(
            f"/api/invoices/{invoice1['id']}",
            headers=auth_headers2
        )
        assert response.status_code == 404
        
        # Get invoices as second user - should be empty
        response = client.get(
            "/api/invoices/",
            headers=auth_headers2
        )
        assert response.status_code == 200
        result = response.json()
        assert result["total"] == 0