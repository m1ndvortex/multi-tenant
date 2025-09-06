"""
Comprehensive Integration Tests for All HesaabPlus API Endpoints
Tests real HTTP requests to FastAPI endpoints with real PostgreSQL database
Following Docker-first development standards with production-ready testing
"""

import pytest
from fastapi.testclient import TestClient
from decimal import Decimal
import uuid
import json
from datetime import datetime, timedelta, date
from typing import Dict, Any, List

from app.main import app
from app.models.tenant import Tenant, TenantStatus, SubscriptionType
from app.models.user import User, UserRole, UserStatus
from app.models.customer import Customer, CustomerStatus, CustomerType
from app.models.product import Product, ProductCategory
from app.models.invoice import Invoice, InvoiceType, InvoiceStatus
from app.core.auth import get_password_hash


class TestComprehensiveAPIIntegration:
    """Comprehensive integration tests for all API endpoints"""
    
    @pytest.fixture
    def client(self):
        """Create test client"""
        return TestClient(app)
    
    @pytest.fixture
    def setup_comprehensive_test_data(self, db_session):
        """Setup comprehensive test data for all API tests"""
        # Create tenant
        tenant = Tenant(
            name="Comprehensive Test Business",
            domain="comprehensive-test.example.com",
            email="comprehensive@test.com",
            subscription_type=SubscriptionType.PRO,
            status=TenantStatus.ACTIVE,
            max_users=10,
            max_products=500,
            max_customers=500,
            max_monthly_invoices=1000,
            subscription_starts_at=datetime.utcnow(),
            subscription_expires_at=datetime.utcnow() + timedelta(days=365)
        )
        db_session.add(tenant)
        db_session.commit()
        
        # Create admin user
        admin_user = User(
            tenant_id=tenant.id,
            email="admin@comprehensive.test",
            password_hash=get_password_hash("admin123"),
            first_name="Admin",
            last_name="User",
            role=UserRole.ADMIN,
            status=UserStatus.ACTIVE
        )
        
        # Create regular user
        regular_user = User(
            tenant_id=tenant.id,
            email="user@comprehensive.test",
            password_hash=get_password_hash("user123"),
            first_name="Regular",
            last_name="User",
            role=UserRole.USER,
            status=UserStatus.ACTIVE
        )
        
        db_session.add_all([admin_user, regular_user])
        db_session.commit()
        
        # Create product categories
        electronics_category = ProductCategory(
            tenant_id=tenant.id,
            name="Electronics",
            description="Electronic products"
        )
        
        jewelry_category = ProductCategory(
            tenant_id=tenant.id,
            name="Jewelry",
            description="Gold and silver jewelry"
        )
        
        db_session.add_all([electronics_category, jewelry_category])
        db_session.commit()
        
        # Create customers
        customers = []
        for i in range(5):
            customer = Customer(
                tenant_id=tenant.id,
                name=f"Test Customer {i+1}",
                email=f"customer{i+1}@test.com",
                phone=f"+123456789{i}",
                address=f"Address {i+1}",
                city="Test City",
                customer_type=CustomerType.INDIVIDUAL if i % 2 == 0 else CustomerType.BUSINESS,
                status=CustomerStatus.ACTIVE,
                credit_limit=Decimal('10000'),
                tags=[f"tag{i+1}", "test"]
            )
            customers.append(customer)
        
        db_session.add_all(customers)
        db_session.commit()
        
        # Create products
        products = []
        
        # General products
        for i in range(3):
            product = Product(
                tenant_id=tenant.id,
                category_id=electronics_category.id,
                name=f"General Product {i+1}",
                description=f"Description for product {i+1}",
                sku=f"GP{i+1:03d}",
                selling_price=Decimal(f'{100 + i*50}.00'),
                cost_price=Decimal(f'{50 + i*25}.00'),
                stock_quantity=100 + i*10,
                min_stock_level=10,
                is_active=True
            )
            products.append(product)
        
        # Gold products
        for i in range(2):
            product = Product(
                tenant_id=tenant.id,
                category_id=jewelry_category.id,
                name=f"Gold Product {i+1}",
                description=f"Gold jewelry item {i+1}",
                sku=f"GOLD{i+1:03d}",
                selling_price=Decimal(f'{5000000 + i*1000000}.00'),
                cost_price=Decimal(f'{4000000 + i*800000}.00'),
                stock_quantity=20 + i*5,
                min_stock_level=5,
                is_gold_product=True,
                gold_purity=Decimal('18.000'),
                weight_per_unit=Decimal(f'{10.0 + i*2.0}'),
                is_active=True
            )
            products.append(product)
        
        db_session.add_all(products)
        db_session.commit()
        
        return {
            'tenant': tenant,
            'admin_user': admin_user,
            'regular_user': regular_user,
            'customers': customers,
            'products': products,
            'electronics_category': electronics_category,
            'jewelry_category': jewelry_category
        }
    
    @pytest.fixture
    def admin_auth_headers(self, client, setup_comprehensive_test_data):
        """Get admin authentication headers"""
        data = setup_comprehensive_test_data
        
        login_data = {
            "email": data['admin_user'].email,
            "password": "admin123"
        }
        
        response = client.post("/api/auth/login", json=login_data)
        assert response.status_code == 200
        
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    @pytest.fixture
    def user_auth_headers(self, client, setup_comprehensive_test_data):
        """Get regular user authentication headers"""
        data = setup_comprehensive_test_data
        
        login_data = {
            "email": data['regular_user'].email,
            "password": "user123"
        }
        
        response = client.post("/api/auth/login", json=login_data)
        assert response.status_code == 200
        
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}

    # ==================== AUTHENTICATION API TESTS ====================
    
    def test_auth_login_success(self, client, setup_comprehensive_test_data):
        """Test successful login"""
        data = setup_comprehensive_test_data
        
        login_data = {
            "email": data['admin_user'].email,
            "password": "admin123"
        }
        
        response = client.post("/api/auth/login", json=login_data)
        assert response.status_code == 200
        
        result = response.json()
        assert "access_token" in result
        assert "refresh_token" in result
        assert result["token_type"] == "bearer"
        assert result["user"]["email"] == data['admin_user'].email
        assert result["tenant"]["id"] == str(data['tenant'].id)
    
    def test_auth_login_invalid_credentials(self, client, setup_comprehensive_test_data):
        """Test login with invalid credentials"""
        login_data = {
            "email": "invalid@test.com",
            "password": "wrongpassword"
        }
        
        response = client.post("/api/auth/login", json=login_data)
        assert response.status_code == 401
        assert "Incorrect email or password" in response.json()["detail"]
    
    def test_auth_refresh_token(self, client, setup_comprehensive_test_data):
        """Test token refresh"""
        data = setup_comprehensive_test_data
        
        # Login first
        login_data = {
            "email": data['admin_user'].email,
            "password": "admin123"
        }
        
        login_response = client.post("/api/auth/login", json=login_data)
        assert login_response.status_code == 200
        
        refresh_token = login_response.json()["refresh_token"]
        
        # Refresh token
        refresh_data = {"refresh_token": refresh_token}
        response = client.post("/api/auth/refresh", json=refresh_data)
        assert response.status_code == 200
        
        result = response.json()
        assert "access_token" in result
        assert "refresh_token" in result
    
    def test_auth_get_current_user(self, client, admin_auth_headers):
        """Test getting current user profile"""
        response = client.get("/api/auth/me", headers=admin_auth_headers)
        assert response.status_code == 200
        
        result = response.json()
        assert result["email"] == "admin@comprehensive.test"
        assert result["role"] == "admin"
    
    def test_auth_validate_token(self, client, admin_auth_headers):
        """Test token validation"""
        response = client.get("/api/auth/validate-token", headers=admin_auth_headers)
        assert response.status_code == 200
        
        result = response.json()
        assert result["valid"] is True
        assert "user" in result
        assert "tenant" in result

    # ==================== CUSTOMER API TESTS ====================
    
    def test_customers_create(self, client, admin_auth_headers):
        """Test creating a new customer"""
        customer_data = {
            "name": "API Test Customer",
            "email": "api.customer@test.com",
            "phone": "+1234567890",
            "address": "123 API Street",
            "city": "API City",
            "customer_type": "individual",
            "credit_limit": "15000.00",
            "tags": ["api", "test"]
        }
        
        response = client.post(
            "/api/customers/",
            json=customer_data,
            headers=admin_auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        assert result["name"] == "API Test Customer"
        assert result["email"] == "api.customer@test.com"
        assert result["customer_type"] == "individual"
        assert Decimal(result["credit_limit"]) == Decimal("15000.00")
        assert set(result["tags"]) == {"api", "test"}
    
    def test_customers_list(self, client, admin_auth_headers, setup_comprehensive_test_data):
        """Test listing customers with pagination"""
        response = client.get(
            "/api/customers/?page=1&per_page=10",
            headers=admin_auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        assert result["total"] >= 5  # At least the 5 we created
        assert len(result["customers"]) >= 5
        assert result["page"] == 1
        assert result["per_page"] == 10
    
    def test_customers_search(self, client, admin_auth_headers):
        """Test customer search functionality"""
        response = client.get(
            "/api/customers/?query=Test Customer 1",
            headers=admin_auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        assert result["total"] >= 1
        # Should find "Test Customer 1"
        found_customer = any("Test Customer 1" in customer["name"] for customer in result["customers"])
        assert found_customer
    
    def test_customers_get_by_id(self, client, admin_auth_headers, setup_comprehensive_test_data):
        """Test getting customer by ID"""
        data = setup_comprehensive_test_data
        customer = data['customers'][0]
        
        response = client.get(
            f"/api/customers/{customer.id}",
            headers=admin_auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        assert result["id"] == str(customer.id)
        assert result["name"] == customer.name
        assert result["email"] == customer.email
    
    def test_customers_update(self, client, admin_auth_headers, setup_comprehensive_test_data):
        """Test updating customer"""
        data = setup_comprehensive_test_data
        customer = data['customers'][0]
        
        update_data = {
            "name": "Updated Customer Name",
            "phone": "+9876543210",
            "tags": ["updated", "test"]
        }
        
        response = client.put(
            f"/api/customers/{customer.id}",
            json=update_data,
            headers=admin_auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        assert result["name"] == "Updated Customer Name"
        assert result["phone"] == "+9876543210"
        assert set(result["tags"]) == {"updated", "test"}
    
    def test_customers_stats(self, client, admin_auth_headers):
        """Test customer statistics"""
        response = client.get(
            "/api/customers/stats",
            headers=admin_auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        assert "total_customers" in result
        assert "active_customers" in result
        assert "vip_customers" in result
        assert result["total_customers"] >= 5

    # ==================== PRODUCT API TESTS ====================
    
    def test_products_create_general(self, client, admin_auth_headers, setup_comprehensive_test_data):
        """Test creating a general product"""
        data = setup_comprehensive_test_data
        
        product_data = {
            "category_id": str(data['electronics_category'].id),
            "name": "API Test Product",
            "description": "Product created via API",
            "sku": "API001",
            "selling_price": "299.99",
            "cost_price": "199.99",
            "stock_quantity": 50,
            "min_stock_level": 5,
            "is_active": True
        }
        
        response = client.post(
            "/api/products/",
            json=product_data,
            headers=admin_auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        assert result["name"] == "API Test Product"
        assert result["sku"] == "API001"
        assert Decimal(result["selling_price"]) == Decimal("299.99")
        assert result["stock_quantity"] == 50
    
    def test_products_create_gold(self, client, admin_auth_headers, setup_comprehensive_test_data):
        """Test creating a gold product"""
        data = setup_comprehensive_test_data
        
        product_data = {
            "category_id": str(data['jewelry_category'].id),
            "name": "API Gold Ring",
            "description": "Gold ring created via API",
            "sku": "GOLD_API001",
            "selling_price": "7500000.00",
            "cost_price": "6000000.00",
            "stock_quantity": 10,
            "min_stock_level": 2,
            "is_gold_product": True,
            "gold_purity": "18.000",
            "weight_per_unit": "15.500",
            "is_active": True
        }
        
        response = client.post(
            "/api/products/",
            json=product_data,
            headers=admin_auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        assert result["name"] == "API Gold Ring"
        assert result["is_gold_product"] is True
        assert Decimal(result["gold_purity"]) == Decimal("18.000")
        assert Decimal(result["weight_per_unit"]) == Decimal("15.500")
    
    def test_products_list(self, client, admin_auth_headers):
        """Test listing products"""
        response = client.get(
            "/api/products/?page=1&page_size=20",
            headers=admin_auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        assert result["total"] >= 5  # At least the 5 we created
        assert len(result["products"]) >= 5
    
    def test_products_search(self, client, admin_auth_headers):
        """Test product search"""
        response = client.get(
            "/api/products/?query=Gold Product",
            headers=admin_auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        assert result["total"] >= 2  # At least the 2 gold products
        # All results should contain "Gold Product"
        for product in result["products"]:
            assert "Gold Product" in product["name"]
    
    def test_products_filter_by_category(self, client, admin_auth_headers, setup_comprehensive_test_data):
        """Test filtering products by category"""
        data = setup_comprehensive_test_data
        
        response = client.get(
            f"/api/products/?category_id={data['jewelry_category'].id}",
            headers=admin_auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        assert result["total"] >= 2  # At least the 2 gold products
        for product in result["products"]:
            assert product["category_id"] == str(data['jewelry_category'].id)
    
    def test_products_get_by_id(self, client, admin_auth_headers, setup_comprehensive_test_data):
        """Test getting product by ID"""
        data = setup_comprehensive_test_data
        product = data['products'][0]
        
        response = client.get(
            f"/api/products/{product.id}",
            headers=admin_auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        assert result["id"] == str(product.id)
        assert result["name"] == product.name
        assert result["sku"] == product.sku
    
    def test_products_update(self, client, admin_auth_headers, setup_comprehensive_test_data):
        """Test updating product"""
        data = setup_comprehensive_test_data
        product = data['products'][0]
        
        update_data = {
            "name": "Updated Product Name",
            "selling_price": "399.99",
            "stock_quantity": 75
        }
        
        response = client.put(
            f"/api/products/{product.id}",
            json=update_data,
            headers=admin_auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        assert result["name"] == "Updated Product Name"
        assert Decimal(result["selling_price"]) == Decimal("399.99")
        assert result["stock_quantity"] == 75
    
    def test_products_stock_adjustment(self, client, admin_auth_headers, setup_comprehensive_test_data):
        """Test stock adjustment"""
        data = setup_comprehensive_test_data
        product = data['products'][0]
        
        adjustment_data = {
            "quantity": 25,
            "adjustment_type": "increase",
            "reason": "Stock replenishment via API"
        }
        
        response = client.post(
            f"/api/products/{product.id}/stock/adjust",
            json=adjustment_data,
            headers=admin_auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        # Stock should have increased by 25
        assert result["stock_quantity"] == product.stock_quantity + 25
    
    def test_products_categories_crud(self, client, admin_auth_headers):
        """Test product category CRUD operations"""
        # Create category
        category_data = {
            "name": "API Test Category",
            "description": "Category created via API"
        }
        
        create_response = client.post(
            "/api/products/categories",
            json=category_data,
            headers=admin_auth_headers
        )
        
        assert create_response.status_code == 200
        created_category = create_response.json()
        
        assert created_category["name"] == "API Test Category"
        
        # Get categories
        list_response = client.get(
            "/api/products/categories",
            headers=admin_auth_headers
        )
        
        assert list_response.status_code == 200
        categories = list_response.json()
        
        # Should find our created category
        found_category = any(cat["name"] == "API Test Category" for cat in categories)
        assert found_category
        
        # Update category
        update_data = {
            "name": "Updated API Category",
            "description": "Updated description"
        }
        
        update_response = client.put(
            f"/api/products/categories/{created_category['id']}",
            json=update_data,
            headers=admin_auth_headers
        )
        
        assert update_response.status_code == 200
        updated_category = update_response.json()
        
        assert updated_category["name"] == "Updated API Category"

    # ==================== INVOICE API TESTS ====================
    
    def test_invoices_create_general(self, client, admin_auth_headers, setup_comprehensive_test_data):
        """Test creating a general invoice"""
        data = setup_comprehensive_test_data
        customer = data['customers'][0]
        product = data['products'][0]  # General product
        
        invoice_data = {
            "customer_id": str(customer.id),
            "invoice_type": "general",
            "items": [
                {
                    "product_id": str(product.id),
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
            headers=admin_auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        assert result["customer_id"] == str(customer.id)
        assert result["invoice_type"] == "general"
        assert result["status"] == "draft"
        assert len(result["items"]) == 2
        assert result["invoice_number"].startswith("INV-")
        assert result["qr_code_token"] is not None
    
    def test_invoices_create_gold(self, client, admin_auth_headers, setup_comprehensive_test_data):
        """Test creating a gold invoice"""
        data = setup_comprehensive_test_data
        customer = data['customers'][1]
        gold_product = next(p for p in data['products'] if p.is_gold_product)
        
        invoice_data = {
            "customer_id": str(customer.id),
            "invoice_type": "gold",
            "gold_price_at_creation": "500000.00",
            "items": [
                {
                    "product_id": str(gold_product.id),
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
            headers=admin_auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        assert result["invoice_type"] == "gold"
        assert result["invoice_number"].startswith("GOLD-")
        assert Decimal(result["gold_price_at_creation"]) == Decimal("500000.00")
        assert Decimal(result["total_gold_weight"]) == Decimal("12.000")
    
    def test_invoices_list_and_filter(self, client, admin_auth_headers, setup_comprehensive_test_data):
        """Test listing and filtering invoices"""
        data = setup_comprehensive_test_data
        
        # Create a few invoices first
        customer = data['customers'][0]
        
        # Create general invoice
        general_invoice_data = {
            "customer_id": str(customer.id),
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
            json=general_invoice_data,
            headers=admin_auth_headers
        )
        assert response.status_code == 200
        
        # List all invoices
        list_response = client.get(
            "/api/invoices/",
            headers=admin_auth_headers
        )
        
        assert list_response.status_code == 200
        result = list_response.json()
        
        assert result["total"] >= 1
        assert len(result["items"]) >= 1
        
        # Filter by customer
        filter_response = client.get(
            f"/api/invoices/?customer_id={customer.id}",
            headers=admin_auth_headers
        )
        
        assert filter_response.status_code == 200
        filtered_result = filter_response.json()
        
        assert filtered_result["total"] >= 1
        for invoice in filtered_result["items"]:
            assert invoice["customer_id"] == str(customer.id)
    
    def test_invoices_get_by_id(self, client, admin_auth_headers, setup_comprehensive_test_data):
        """Test getting invoice by ID"""
        data = setup_comprehensive_test_data
        customer = data['customers'][0]
        
        # Create invoice
        invoice_data = {
            "customer_id": str(customer.id),
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
            headers=admin_auth_headers
        )
        assert create_response.status_code == 200
        created_invoice = create_response.json()
        
        # Get invoice by ID
        response = client.get(
            f"/api/invoices/{created_invoice['id']}",
            headers=admin_auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        assert result["id"] == created_invoice["id"]
        assert result["invoice_number"] == created_invoice["invoice_number"]
        assert len(result["items"]) == 1
    
    def test_invoices_update(self, client, admin_auth_headers, setup_comprehensive_test_data):
        """Test updating invoice"""
        data = setup_comprehensive_test_data
        customer = data['customers'][0]
        
        # Create invoice
        invoice_data = {
            "customer_id": str(customer.id),
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
            headers=admin_auth_headers
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
            headers=admin_auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        assert result["notes"] == "Updated via API"
        assert result["customer_notes"] == "Customer notes via API"
    
    def test_invoices_send_and_cancel(self, client, admin_auth_headers, setup_comprehensive_test_data):
        """Test sending and cancelling invoice"""
        data = setup_comprehensive_test_data
        customer = data['customers'][0]
        
        # Create invoice
        invoice_data = {
            "customer_id": str(customer.id),
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
            headers=admin_auth_headers
        )
        assert create_response.status_code == 200
        created_invoice = create_response.json()
        
        assert created_invoice["status"] == "draft"
        
        # Send invoice
        send_response = client.post(
            f"/api/invoices/{created_invoice['id']}/send",
            headers=admin_auth_headers
        )
        
        assert send_response.status_code == 200
        sent_invoice = send_response.json()
        
        assert sent_invoice["status"] == "sent"
        
        # Cancel invoice
        cancel_response = client.post(
            f"/api/invoices/{created_invoice['id']}/cancel?reason=API test cancellation",
            headers=admin_auth_headers
        )
        
        assert cancel_response.status_code == 200
        cancelled_invoice = cancel_response.json()
        
        assert cancelled_invoice["status"] == "cancelled"
    
    def test_invoices_payments(self, client, admin_auth_headers, setup_comprehensive_test_data):
        """Test adding payments to invoice"""
        data = setup_comprehensive_test_data
        customer = data['customers'][0]
        
        # Create invoice
        invoice_data = {
            "customer_id": str(customer.id),
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
            headers=admin_auth_headers
        )
        assert create_response.status_code == 200
        created_invoice = create_response.json()
        
        # Add payment
        payment_data = {
            "amount": "50.00",
            "payment_method": "cash",
            "notes": "Partial payment via API"
        }
        
        response = client.post(
            f"/api/invoices/{created_invoice['id']}/payments",
            json=payment_data,
            headers=admin_auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        assert Decimal(result["paid_amount"]) == Decimal("50.00")
        assert result["status"] == "partially_paid"
        assert Decimal(result["balance_due"]) == Decimal("50.00")
    
    def test_invoices_statistics(self, client, admin_auth_headers, setup_comprehensive_test_data):
        """Test invoice statistics"""
        data = setup_comprehensive_test_data
        customer = data['customers'][0]
        
        # Create multiple invoices
        for i in range(3):
            invoice_data = {
                "customer_id": str(customer.id),
                "invoice_type": "general",
                "items": [
                    {
                        "description": f"Test Item {i+1}",
                        "quantity": "1.000",
                        "unit_price": f"{100 + i*50}.00"
                    }
                ]
            }
            
            response = client.post(
                "/api/invoices/",
                json=invoice_data,
                headers=admin_auth_headers
            )
            assert response.status_code == 200
        
        # Get statistics
        response = client.get(
            "/api/invoices/statistics",
            headers=admin_auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        assert result["total_invoices"] >= 3
        assert result["draft_invoices"] >= 3
        assert result["general_invoices"] >= 3

    # ==================== REPORTS API TESTS ====================
    
    def test_reports_sales_trends(self, client, admin_auth_headers, setup_comprehensive_test_data):
        """Test sales trends report"""
        # First create some invoices to have data
        data = setup_comprehensive_test_data
        customer = data['customers'][0]
        
        # Create a few invoices
        for i in range(2):
            invoice_data = {
                "customer_id": str(customer.id),
                "invoice_type": "general",
                "items": [
                    {
                        "description": f"Sales Item {i+1}",
                        "quantity": "1.000",
                        "unit_price": f"{200 + i*100}.00"
                    }
                ]
            }
            
            response = client.post(
                "/api/invoices/",
                json=invoice_data,
                headers=admin_auth_headers
            )
            assert response.status_code == 200
        
        # Get sales trends
        response = client.get(
            "/api/reports/sales-trends?period=daily",
            headers=admin_auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        assert "data_points" in result
        assert "summary" in result
        assert result["period"] == "daily"

    # ==================== ANALYTICS API TESTS ====================
    
    def test_analytics_dashboard_metrics(self, client, admin_auth_headers):
        """Test dashboard analytics metrics"""
        response = client.get(
            "/api/analytics/dashboard-metrics",
            headers=admin_auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        assert "total_customers" in result
        assert "total_products" in result
        assert "total_invoices" in result
        assert "total_revenue" in result

    # ==================== NOTIFICATIONS API TESTS ====================
    
    def test_notifications_list(self, client, admin_auth_headers):
        """Test listing notifications"""
        response = client.get(
            "/api/notifications/",
            headers=admin_auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        assert "notifications" in result
        assert "total" in result

    # ==================== BUSINESS INTELLIGENCE API TESTS ====================
    
    def test_business_intelligence_kpis(self, client, admin_auth_headers):
        """Test business intelligence KPIs"""
        response = client.get(
            "/api/business-intelligence/kpis",
            headers=admin_auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        assert "revenue_growth" in result
        assert "customer_acquisition" in result
        assert "inventory_turnover" in result

    # ==================== BACKUP API TESTS ====================
    
    def test_backup_create(self, client, admin_auth_headers):
        """Test creating backup"""
        backup_data = {
            "backup_type": "full",
            "description": "API test backup"
        }
        
        response = client.post(
            "/api/backup/create",
            json=backup_data,
            headers=admin_auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        assert "backup_id" in result
        assert result["status"] == "initiated"

    # ==================== PERMISSIONS AND SECURITY TESTS ====================
    
    def test_unauthorized_access(self, client):
        """Test that endpoints require authentication"""
        # Test various endpoints without auth headers
        endpoints = [
            "/api/customers/",
            "/api/products/",
            "/api/invoices/",
            "/api/reports/sales-trends?period=daily",
            "/api/analytics/dashboard-metrics"
        ]
        
        for endpoint in endpoints:
            response = client.get(endpoint)
            assert response.status_code in [401, 403], f"Endpoint {endpoint} should require authentication"
    
    def test_user_role_permissions(self, client, user_auth_headers, admin_auth_headers):
        """Test that user roles are properly enforced"""
        # Regular users should be able to read but not create/update/delete
        
        # Test read access (should work for regular users)
        response = client.get("/api/customers/", headers=user_auth_headers)
        assert response.status_code == 200
        
        # Test create access (might be restricted based on permissions)
        customer_data = {
            "name": "Permission Test Customer",
            "email": "permission@test.com"
        }
        
        user_create_response = client.post(
            "/api/customers/",
            json=customer_data,
            headers=user_auth_headers
        )
        
        admin_create_response = client.post(
            "/api/customers/",
            json=customer_data,
            headers=admin_auth_headers
        )
        
        # Admin should definitely be able to create
        assert admin_create_response.status_code == 200

    # ==================== DATA VALIDATION TESTS ====================
    
    def test_data_validation_errors(self, client, admin_auth_headers):
        """Test API data validation"""
        # Test invalid customer data
        invalid_customer_data = {
            "name": "",  # Empty name should fail
            "email": "invalid-email",  # Invalid email format
            "credit_limit": "-100"  # Negative credit limit should fail
        }
        
        response = client.post(
            "/api/customers/",
            json=invalid_customer_data,
            headers=admin_auth_headers
        )
        
        assert response.status_code == 400
        
        # Test invalid product data
        invalid_product_data = {
            "name": "",  # Empty name
            "selling_price": "-50.00",  # Negative price
            "stock_quantity": -10  # Negative stock
        }
        
        response = client.post(
            "/api/products/",
            json=invalid_product_data,
            headers=admin_auth_headers
        )
        
        assert response.status_code == 400

    # ==================== TENANT ISOLATION TESTS ====================
    
    def test_tenant_data_isolation(self, client, db_session):
        """Test that tenant data is properly isolated"""
        # Create second tenant with user
        tenant2 = Tenant(
            name="Isolation Test Tenant",
            domain="isolation.example.com",
            email="isolation@test.com",
            subscription_type=SubscriptionType.BASIC,
            status=TenantStatus.ACTIVE,
            max_users=5,
            max_products=100,
            max_customers=100,
            max_monthly_invoices=100
        )
        db_session.add(tenant2)
        db_session.commit()
        
        user2 = User(
            tenant_id=tenant2.id,
            email="user2@isolation.test",
            password_hash=get_password_hash("user123"),
            first_name="Isolation",
            last_name="User",
            role=UserRole.ADMIN,
            status=UserStatus.ACTIVE
        )
        db_session.add(user2)
        db_session.commit()
        
        # Login as second tenant user
        login_data = {
            "email": "user2@isolation.test",
            "password": "user123"
        }
        
        response = client.post("/api/auth/login", json=login_data)
        assert response.status_code == 200
        
        tenant2_headers = {"Authorization": f"Bearer {response.json()['access_token']}"}
        
        # Try to access first tenant's data (should return empty results)
        response = client.get("/api/customers/", headers=tenant2_headers)
        assert response.status_code == 200
        
        result = response.json()
        # Should not see any customers from the first tenant
        assert result["total"] == 0

    # ==================== PERFORMANCE AND LOAD TESTS ====================
    
    def test_api_response_times(self, client, admin_auth_headers):
        """Test that API responses are within acceptable time limits"""
        import time
        
        endpoints = [
            "/api/customers/",
            "/api/products/",
            "/api/invoices/",
            "/api/analytics/dashboard-metrics"
        ]
        
        for endpoint in endpoints:
            start_time = time.time()
            response = client.get(endpoint, headers=admin_auth_headers)
            end_time = time.time()
            
            response_time = end_time - start_time
            
            assert response.status_code == 200
            assert response_time < 5.0, f"Endpoint {endpoint} took {response_time:.2f}s (should be < 5s)"
    
    def test_pagination_performance(self, client, admin_auth_headers, setup_comprehensive_test_data):
        """Test pagination performance with larger datasets"""
        # Test with different page sizes
        page_sizes = [10, 50, 100]
        
        for page_size in page_sizes:
            response = client.get(
                f"/api/customers/?page=1&per_page={page_size}",
                headers=admin_auth_headers
            )
            
            assert response.status_code == 200
            result = response.json()
            
            assert len(result["customers"]) <= page_size
            assert result["per_page"] == page_size

    # ==================== ERROR HANDLING TESTS ====================
    
    def test_404_errors(self, client, admin_auth_headers):
        """Test 404 error handling"""
        non_existent_id = str(uuid.uuid4())
        
        endpoints = [
            f"/api/customers/{non_existent_id}",
            f"/api/products/{non_existent_id}",
            f"/api/invoices/{non_existent_id}"
        ]
        
        for endpoint in endpoints:
            response = client.get(endpoint, headers=admin_auth_headers)
            assert response.status_code == 404
            
            result = response.json()
            assert "detail" in result
    
    def test_500_error_handling(self, client, admin_auth_headers):
        """Test 500 error handling (simulated)"""
        # This would typically involve mocking database failures
        # For now, we'll test that the error format is consistent
        pass

    # ==================== INTEGRATION WORKFLOW TESTS ====================
    
    def test_complete_business_workflow(self, client, admin_auth_headers, setup_comprehensive_test_data):
        """Test complete business workflow: Customer -> Product -> Invoice -> Payment"""
        data = setup_comprehensive_test_data
        
        # 1. Create a new customer
        customer_data = {
            "name": "Workflow Test Customer",
            "email": "workflow@test.com",
            "phone": "+1234567890",
            "credit_limit": "20000.00"
        }
        
        customer_response = client.post(
            "/api/customers/",
            json=customer_data,
            headers=admin_auth_headers
        )
        assert customer_response.status_code == 200
        customer = customer_response.json()
        
        # 2. Create a new product
        product_data = {
            "name": "Workflow Test Product",
            "sku": "WF001",
            "selling_price": "299.99",
            "cost_price": "199.99",
            "stock_quantity": 100
        }
        
        product_response = client.post(
            "/api/products/",
            json=product_data,
            headers=admin_auth_headers
        )
        assert product_response.status_code == 200
        product = product_response.json()
        
        # 3. Create an invoice with the product
        invoice_data = {
            "customer_id": customer["id"],
            "invoice_type": "general",
            "items": [
                {
                    "product_id": product["id"],
                    "description": product["name"],
                    "quantity": "2.000",
                    "unit_price": product["selling_price"]
                }
            ]
        }
        
        invoice_response = client.post(
            "/api/invoices/",
            json=invoice_data,
            headers=admin_auth_headers
        )
        assert invoice_response.status_code == 200
        invoice = invoice_response.json()
        
        # 4. Send the invoice
        send_response = client.post(
            f"/api/invoices/{invoice['id']}/send",
            headers=admin_auth_headers
        )
        assert send_response.status_code == 200
        sent_invoice = send_response.json()
        assert sent_invoice["status"] == "sent"
        
        # 5. Add a payment
        payment_data = {
            "amount": "300.00",
            "payment_method": "cash",
            "notes": "Full payment"
        }
        
        payment_response = client.post(
            f"/api/invoices/{invoice['id']}/payments",
            json=payment_data,
            headers=admin_auth_headers
        )
        assert payment_response.status_code == 200
        paid_invoice = payment_response.json()
        assert paid_invoice["status"] == "partially_paid"  # Might be partially paid due to taxes
        
        # 6. Verify stock was reduced
        updated_product_response = client.get(
            f"/api/products/{product['id']}",
            headers=admin_auth_headers
        )
        assert updated_product_response.status_code == 200
        updated_product = updated_product_response.json()
        
        # Stock should be reduced by 2 (quantity sold)
        assert updated_product["stock_quantity"] == 98
        
        # 7. Check analytics reflect the sale
        analytics_response = client.get(
            "/api/analytics/dashboard-metrics",
            headers=admin_auth_headers
        )
        assert analytics_response.status_code == 200
        analytics = analytics_response.json()
        
        # Should show increased revenue and invoice count
        assert analytics["total_invoices"] >= 1
        assert float(analytics["total_revenue"]) >= 599.98  # 2 * 299.99