"""
Comprehensive Integration Tests for Reports API
Tests sales trends, profit/loss, customer analytics, and aging reports with real database
"""

import pytest
from fastapi.testclient import TestClient
from decimal import Decimal
import uuid
from datetime import datetime, date, timedelta

from app.main import app
from app.models.tenant import Tenant, TenantStatus, SubscriptionType
from app.models.user import User, UserRole, UserStatus
from app.models.customer import Customer, CustomerStatus, CustomerType
from app.models.product import Product
from app.models.invoice import Invoice, InvoiceType, InvoiceStatus
from app.core.auth import get_password_hash


class TestReportsAPIComprehensive:
    """Comprehensive integration tests for Reports API"""
    
    @pytest.fixture
    def client(self):
        """Create test client"""
        return TestClient(app)
    
    @pytest.fixture
    def setup_reports_test_data(self, db_session):
        """Setup comprehensive test data for reports"""
        # Create tenant
        tenant = Tenant(
            name="Reports Test Business",
            domain="reports-test.example.com",
            email="reports@test.com",
            subscription_type=SubscriptionType.PRO,
            status=TenantStatus.ACTIVE,
            max_users=10,
            max_products=200,
            max_customers=200,
            max_monthly_invoices=500
        )
        db_session.add(tenant)
        db_session.commit()
        
        # Create user
        user = User(
            tenant_id=tenant.id,
            email="reports@test.com",
            password_hash=get_password_hash("reports123"),
            first_name="Reports",
            last_name="User",
            role=UserRole.ADMIN,
            status=UserStatus.ACTIVE
        )
        db_session.add(user)
        db_session.commit()
        
        # Create customers with different characteristics
        customers = []
        customer_data = [
            {"name": "High Value Customer", "email": "highvalue@test.com", "credit_limit": Decimal('100000')},
            {"name": "Regular Customer", "email": "regular@test.com", "credit_limit": Decimal('50000')},
            {"name": "New Customer", "email": "new@test.com", "credit_limit": Decimal('25000')},
            {"name": "VIP Customer", "email": "vip@test.com", "credit_limit": Decimal('200000')},
            {"name": "Overdue Customer", "email": "overdue@test.com", "credit_limit": Decimal('30000')}
        ]
        
        for i, cust_data in enumerate(customer_data):
            customer = Customer(
                tenant_id=tenant.id,
                name=cust_data["name"],
                email=cust_data["email"],
                phone=f"+12345678{i:02d}",
                customer_type=CustomerType.BUSINESS if i % 2 == 0 else CustomerType.INDIVIDUAL,
                status=CustomerStatus.ACTIVE,
                credit_limit=cust_data["credit_limit"],
                tags=["reports", "test", f"tier{i+1}"]
            )
            customers.append(customer)
        
        db_session.add_all(customers)
        db_session.commit()
        
        # Create products with different categories and prices
        products = []
        product_data = [
            {"name": "Premium Product", "price": Decimal('5000.00'), "cost": Decimal('3000.00')},
            {"name": "Standard Product", "price": Decimal('2000.00'), "cost": Decimal('1200.00')},
            {"name": "Budget Product", "price": Decimal('500.00'), "cost": Decimal('300.00')},
            {"name": "Luxury Item", "price": Decimal('15000.00'), "cost": Decimal('10000.00')},
            {"name": "Gold Ring", "price": Decimal('8000000.00'), "cost": Decimal('6000000.00'), "is_gold": True}
        ]
        
        for i, prod_data in enumerate(product_data):
            product = Product(
                tenant_id=tenant.id,
                name=prod_data["name"],
                sku=f"RPT{i+1:03d}",
                selling_price=prod_data["price"],
                cost_price=prod_data["cost"],
                stock_quantity=100 + i*10,
                is_gold_product=prod_data.get("is_gold", False),
                gold_purity=Decimal('18.000') if prod_data.get("is_gold") else None,
                weight_per_unit=Decimal('15.000') if prod_data.get("is_gold") else None
            )
            products.append(product)
        
        db_session.add_all(products)
        db_session.commit()
        
        return {
            'tenant': tenant,
            'user': user,
            'customers': customers,
            'products': products
        }
    
    @pytest.fixture
    def auth_headers(self, client, setup_reports_test_data):
        """Get authentication headers"""
        data = setup_reports_test_data
        
        login_data = {
            "email": data['user'].email,
            "password": "reports123"
        }
        
        response = client.post("/api/auth/login", json=login_data)
        assert response.status_code == 200
        
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    @pytest.fixture
    def sample_invoices(self, client, auth_headers, setup_reports_test_data):
        """Create sample invoices for reporting tests"""
        data = setup_reports_test_data
        customers = data['customers']
        products = data['products']
        
        # Create invoices with different dates, amounts, and statuses
        invoice_scenarios = [
            {
                "customer": customers[0],
                "product": products[0],
                "quantity": "3.000",
                "date": "2024-01-15",
                "status": "paid"
            },
            {
                "customer": customers[1],
                "product": products[1],
                "quantity": "5.000",
                "date": "2024-01-20",
                "status": "sent"
            },
            {
                "customer": customers[2],
                "product": products[2],
                "quantity": "10.000",
                "date": "2024-02-01",
                "status": "paid"
            },
            {
                "customer": customers[3],
                "product": products[3],
                "quantity": "1.000",
                "date": "2024-02-10",
                "status": "partially_paid"
            },
            {
                "customer": customers[4],
                "product": products[0],
                "quantity": "2.000",
                "date": "2024-02-15",
                "status": "overdue"
            }
        ]
        
        created_invoices = []
        for scenario in invoice_scenarios:
            invoice_data = {
                "customer_id": str(scenario["customer"].id),
                "invoice_type": "gold" if scenario["product"].is_gold_product else "general",
                "invoice_date": scenario["date"],
                "items": [
                    {
                        "product_id": str(scenario["product"].id),
                        "description": scenario["product"].name,
                        "quantity": scenario["quantity"],
                        "unit_price": str(scenario["product"].selling_price)
                    }
                ]
            }
            
            if scenario["product"].is_gold_product:
                invoice_data["gold_price_at_creation"] = "500000.00"
                invoice_data["items"][0]["weight"] = str(float(scenario["quantity"]) * 15.0)
            
            response = client.post(
                "/api/invoices/",
                json=invoice_data,
                headers=auth_headers
            )
            assert response.status_code == 200
            invoice = response.json()
            
            # Update invoice status if needed
            if scenario["status"] == "sent":
                client.post(f"/api/invoices/{invoice['id']}/send", headers=auth_headers)
            elif scenario["status"] == "paid":
                client.post(f"/api/invoices/{invoice['id']}/send", headers=auth_headers)
                payment_data = {
                    "amount": invoice["total_amount"],
                    "payment_method": "cash"
                }
                client.post(f"/api/invoices/{invoice['id']}/payments", json=payment_data, headers=auth_headers)
            elif scenario["status"] == "partially_paid":
                client.post(f"/api/invoices/{invoice['id']}/send", headers=auth_headers)
                payment_data = {
                    "amount": str(float(invoice["total_amount"]) / 2),
                    "payment_method": "bank_transfer"
                }
                client.post(f"/api/invoices/{invoice['id']}/payments", json=payment_data, headers=auth_headers)
            
            created_invoices.append(invoice)
        
        return created_invoices

    # ==================== SALES TRENDS TESTS ====================
    
    def test_sales_trends_daily(self, client, auth_headers, sample_invoices):
        """Test daily sales trends report"""
        response = client.get(
            "/api/reports/sales-trends?period=daily&start_date=2024-01-01&end_date=2024-02-28",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        assert result["period"] == "daily"
        assert "data_points" in result
        assert "summary" in result
        assert len(result["data_points"]) > 0
        
        # Check data structure
        for data_point in result["data_points"]:
            assert "date" in data_point
            assert "total_sales" in data_point
            assert "invoice_count" in data_point
            assert "average_order_value" in data_point
        
        # Verify summary
        summary = result["summary"]
        assert "total_sales" in summary
        assert "total_invoices" in summary
        assert "average_daily_sales" in summary
        assert Decimal(summary["total_sales"]) > Decimal("0")
    
    def test_sales_trends_weekly(self, client, auth_headers, sample_invoices):
        """Test weekly sales trends report"""
        response = client.get(
            "/api/reports/sales-trends?period=weekly&start_date=2024-01-01&end_date=2024-02-28",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        assert result["period"] == "weekly"
        assert len(result["data_points"]) > 0
        
        # Weekly data should have week_start and week_end
        for data_point in result["data_points"]:
            assert "week_start" in data_point
            assert "week_end" in data_point
            assert "total_sales" in data_point
    
    def test_sales_trends_monthly(self, client, auth_headers, sample_invoices):
        """Test monthly sales trends report"""
        response = client.get(
            "/api/reports/sales-trends?period=monthly&start_date=2024-01-01&end_date=2024-12-31",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        assert result["period"] == "monthly"
        assert len(result["data_points"]) > 0
        
        # Monthly data should have month and year
        for data_point in result["data_points"]:
            assert "month" in data_point
            assert "year" in data_point
            assert "total_sales" in data_point
    
    def test_sales_trends_with_customer_filter(self, client, auth_headers, sample_invoices, setup_reports_test_data):
        """Test sales trends with customer filter"""
        data = setup_reports_test_data
        customer_id = str(data['customers'][0].id)
        
        response = client.get(
            f"/api/reports/sales-trends?period=daily&customer_ids={customer_id}",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        # Should only include sales from the specified customer
        assert len(result["data_points"]) > 0
        assert result["summary"]["total_invoices"] >= 1
    
    def test_sales_trends_post_method(self, client, auth_headers, sample_invoices, setup_reports_test_data):
        """Test sales trends using POST method with complex filters"""
        data = setup_reports_test_data
        
        request_data = {
            "period": "daily",
            "start_date": "2024-01-01",
            "end_date": "2024-02-28",
            "filters": {
                "customer_ids": [str(data['customers'][0].id), str(data['customers'][1].id)],
                "min_amount": "1000.00",
                "invoice_types": ["general"]
            }
        }
        
        response = client.post(
            "/api/reports/sales-trends",
            json=request_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        assert result["period"] == "daily"
        assert "data_points" in result
        assert "summary" in result

    # ==================== PROFIT/LOSS TESTS ====================
    
    def test_profit_loss_report_basic(self, client, auth_headers, sample_invoices):
        """Test basic profit/loss report"""
        response = client.get(
            "/api/reports/profit-loss?start_date=2024-01-01&end_date=2024-02-28",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        assert "period" in result
        assert "revenue" in result
        assert "cost_of_goods_sold" in result
        assert "gross_profit" in result
        assert "gross_profit_margin" in result
        
        # Verify calculations
        revenue = Decimal(result["revenue"])
        cogs = Decimal(result["cost_of_goods_sold"])
        gross_profit = Decimal(result["gross_profit"])
        
        assert gross_profit == revenue - cogs
        
        if revenue > 0:
            expected_margin = (gross_profit / revenue) * 100
            assert abs(Decimal(result["gross_profit_margin"]) - expected_margin) < Decimal("0.01")
    
    def test_profit_loss_with_categories(self, client, auth_headers, sample_invoices):
        """Test profit/loss report with category breakdown"""
        response = client.get(
            "/api/reports/profit-loss?start_date=2024-01-01&end_date=2024-02-28&include_categories=true",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        assert "category_breakdown" in result
        
        if result["category_breakdown"]:
            for category in result["category_breakdown"]:
                assert "category_name" in category
                assert "revenue" in category
                assert "cost_of_goods_sold" in category
                assert "gross_profit" in category
    
    def test_profit_loss_with_customer_filter(self, client, auth_headers, sample_invoices, setup_reports_test_data):
        """Test profit/loss report with customer filter"""
        data = setup_reports_test_data
        customer_id = str(data['customers'][0].id)
        
        response = client.get(
            f"/api/reports/profit-loss?start_date=2024-01-01&end_date=2024-02-28&customer_ids={customer_id}",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        assert "revenue" in result
        assert "cost_of_goods_sold" in result
        assert "gross_profit" in result

    # ==================== CUSTOMER ANALYTICS TESTS ====================
    
    def test_customer_analytics_basic(self, client, auth_headers, sample_invoices):
        """Test basic customer analytics report"""
        response = client.get(
            "/api/reports/customer-analytics?start_date=2024-01-01&end_date=2024-02-28",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        assert "customers" in result
        assert "summary" in result
        
        # Check customer data structure
        if result["customers"]:
            for customer in result["customers"]:
                assert "customer_id" in customer
                assert "customer_name" in customer
                assert "total_revenue" in customer
                assert "invoice_count" in customer
                assert "average_order_value" in customer
                assert "last_purchase_date" in customer
        
        # Check summary
        summary = result["summary"]
        assert "total_customers" in summary
        assert "total_revenue" in summary
        assert "average_revenue_per_customer" in summary
    
    def test_customer_analytics_top_customers(self, client, auth_headers, sample_invoices):
        """Test customer analytics with top customers limit"""
        response = client.get(
            "/api/reports/customer-analytics?start_date=2024-01-01&end_date=2024-02-28&limit=3",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        assert len(result["customers"]) <= 3
        
        # Customers should be sorted by revenue (descending)
        if len(result["customers"]) > 1:
            for i in range(len(result["customers"]) - 1):
                current_revenue = Decimal(result["customers"][i]["total_revenue"])
                next_revenue = Decimal(result["customers"][i + 1]["total_revenue"])
                assert current_revenue >= next_revenue
    
    def test_customer_analytics_with_filters(self, client, auth_headers, sample_invoices):
        """Test customer analytics with various filters"""
        request_data = {
            "start_date": "2024-01-01",
            "end_date": "2024-02-28",
            "min_revenue": "5000.00",
            "customer_types": ["business"],
            "include_inactive": False
        }
        
        response = client.post(
            "/api/reports/customer-analytics",
            json=request_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        # All customers should meet the minimum revenue requirement
        for customer in result["customers"]:
            assert Decimal(customer["total_revenue"]) >= Decimal("5000.00")

    # ==================== AGING REPORT TESTS ====================
    
    def test_aging_report_basic(self, client, auth_headers, sample_invoices):
        """Test basic aging report"""
        response = client.get(
            "/api/reports/aging-report",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        assert "customers" in result
        assert "summary" in result
        assert "aging_buckets" in result
        
        # Check aging buckets structure
        buckets = result["aging_buckets"]
        expected_buckets = ["current", "1-30", "31-60", "61-90", "over_90"]
        for bucket in expected_buckets:
            assert bucket in buckets
            assert "amount" in buckets[bucket]
            assert "count" in buckets[bucket]
        
        # Check customer data
        if result["customers"]:
            for customer in result["customers"]:
                assert "customer_id" in customer
                assert "customer_name" in customer
                assert "total_outstanding" in customer
                assert "aging_breakdown" in customer
    
    def test_aging_report_with_date(self, client, auth_headers, sample_invoices):
        """Test aging report as of specific date"""
        response = client.get(
            "/api/reports/aging-report?as_of_date=2024-02-28",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        assert result["as_of_date"] == "2024-02-28"
        assert "customers" in result
        assert "summary" in result
    
    def test_aging_report_customer_filter(self, client, auth_headers, sample_invoices, setup_reports_test_data):
        """Test aging report with customer filter"""
        data = setup_reports_test_data
        customer_id = str(data['customers'][4].id)  # Overdue customer
        
        response = client.get(
            f"/api/reports/aging-report?customer_ids={customer_id}",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        # Should only include the specified customer
        if result["customers"]:
            assert len(result["customers"]) == 1
            assert result["customers"][0]["customer_id"] == customer_id
    
    def test_aging_report_post_method(self, client, auth_headers, sample_invoices, setup_reports_test_data):
        """Test aging report using POST method with filters"""
        data = setup_reports_test_data
        
        request_data = {
            "as_of_date": "2024-02-28",
            "customer_ids": [str(data['customers'][3].id), str(data['customers'][4].id)],
            "min_outstanding_amount": "1000.00",
            "include_zero_balance": False
        }
        
        response = client.post(
            "/api/reports/aging-report",
            json=request_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        assert "customers" in result
        assert "summary" in result

    # ==================== REPORT EXPORT TESTS ====================
    
    def test_export_sales_trends_csv(self, client, auth_headers, sample_invoices):
        """Test exporting sales trends report as CSV"""
        export_data = {
            "report_type": "sales_trends",
            "format": "csv",
            "parameters": {
                "period": "daily",
                "start_date": "2024-01-01",
                "end_date": "2024-02-28"
            }
        }
        
        response = client.post(
            "/api/reports/export",
            json=export_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        assert response.headers["content-type"] == "text/csv; charset=utf-8"
        
        # Check CSV content
        csv_content = response.content.decode('utf-8')
        assert "date" in csv_content.lower()
        assert "total_sales" in csv_content.lower()
    
    def test_export_profit_loss_excel(self, client, auth_headers, sample_invoices):
        """Test exporting profit/loss report as Excel"""
        export_data = {
            "report_type": "profit_loss",
            "format": "excel",
            "parameters": {
                "start_date": "2024-01-01",
                "end_date": "2024-02-28",
                "include_categories": True
            }
        }
        
        response = client.post(
            "/api/reports/export",
            json=export_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        assert "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" in response.headers["content-type"]
    
    def test_export_customer_analytics_pdf(self, client, auth_headers, sample_invoices):
        """Test exporting customer analytics as PDF"""
        export_data = {
            "report_type": "customer_analytics",
            "format": "pdf",
            "parameters": {
                "start_date": "2024-01-01",
                "end_date": "2024-02-28",
                "limit": 10
            }
        }
        
        response = client.post(
            "/api/reports/export",
            json=export_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        assert response.headers["content-type"] == "application/pdf"

    # ==================== REPORT SCHEDULING TESTS ====================
    
    def test_schedule_report(self, client, auth_headers):
        """Test scheduling a report"""
        schedule_data = {
            "report_type": "sales_trends",
            "schedule_name": "Weekly Sales Report",
            "frequency": "weekly",
            "day_of_week": 1,  # Monday
            "time": "09:00",
            "format": "pdf",
            "email_recipients": ["manager@test.com", "owner@test.com"],
            "parameters": {
                "period": "weekly",
                "include_charts": True
            }
        }
        
        response = client.post(
            "/api/reports/schedule",
            json=schedule_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        assert result["schedule_name"] == "Weekly Sales Report"
        assert result["frequency"] == "weekly"
        assert result["is_active"] is True
        assert "schedule_id" in result
    
    def test_list_scheduled_reports(self, client, auth_headers):
        """Test listing scheduled reports"""
        # First create a scheduled report
        schedule_data = {
            "report_type": "profit_loss",
            "schedule_name": "Monthly P&L Report",
            "frequency": "monthly",
            "day_of_month": 1,
            "time": "08:00",
            "format": "excel",
            "email_recipients": ["accounting@test.com"]
        }
        
        create_response = client.post(
            "/api/reports/schedule",
            json=schedule_data,
            headers=auth_headers
        )
        assert create_response.status_code == 200
        
        # List scheduled reports
        response = client.get(
            "/api/reports/scheduled",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        assert "scheduled_reports" in result
        assert len(result["scheduled_reports"]) >= 1
        
        # Find our created report
        found_report = any(
            report["schedule_name"] == "Monthly P&L Report" 
            for report in result["scheduled_reports"]
        )
        assert found_report
    
    def test_update_scheduled_report(self, client, auth_headers):
        """Test updating a scheduled report"""
        # Create a scheduled report first
        schedule_data = {
            "report_type": "customer_analytics",
            "schedule_name": "Customer Report",
            "frequency": "weekly",
            "day_of_week": 5,
            "time": "10:00",
            "format": "csv",
            "email_recipients": ["sales@test.com"]
        }
        
        create_response = client.post(
            "/api/reports/schedule",
            json=schedule_data,
            headers=auth_headers
        )
        assert create_response.status_code == 200
        created_report = create_response.json()
        
        # Update the scheduled report
        update_data = {
            "schedule_name": "Updated Customer Report",
            "frequency": "monthly",
            "day_of_month": 15,
            "time": "14:00",
            "email_recipients": ["sales@test.com", "manager@test.com"]
        }
        
        response = client.put(
            f"/api/reports/scheduled/{created_report['schedule_id']}",
            json=update_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        assert result["schedule_name"] == "Updated Customer Report"
        assert result["frequency"] == "monthly"
        assert result["day_of_month"] == 15

    # ==================== REPORT VALIDATION AND ERROR HANDLING ====================
    
    def test_invalid_date_range(self, client, auth_headers):
        """Test reports with invalid date ranges"""
        # End date before start date
        response = client.get(
            "/api/reports/sales-trends?period=daily&start_date=2024-02-01&end_date=2024-01-01",
            headers=auth_headers
        )
        
        assert response.status_code == 400
        assert "invalid" in response.json()["detail"].lower()
    
    def test_invalid_period(self, client, auth_headers):
        """Test sales trends with invalid period"""
        response = client.get(
            "/api/reports/sales-trends?period=invalid_period",
            headers=auth_headers
        )
        
        assert response.status_code == 400
    
    def test_missing_required_parameters(self, client, auth_headers):
        """Test reports with missing required parameters"""
        # Profit/loss without date range
        response = client.get(
            "/api/reports/profit-loss",
            headers=auth_headers
        )
        
        assert response.status_code == 400
    
    def test_report_permissions(self, client, auth_headers):
        """Test report access permissions"""
        # All report endpoints should be accessible with admin user
        endpoints = [
            "/api/reports/sales-trends?period=daily&start_date=2024-01-01&end_date=2024-01-31",
            "/api/reports/profit-loss?start_date=2024-01-01&end_date=2024-01-31",
            "/api/reports/customer-analytics?start_date=2024-01-01&end_date=2024-01-31",
            "/api/reports/aging-report"
        ]
        
        for endpoint in endpoints:
            response = client.get(endpoint, headers=auth_headers)
            assert response.status_code == 200, f"Failed to access {endpoint}"

    # ==================== PERFORMANCE TESTS ====================
    
    def test_report_performance(self, client, auth_headers, sample_invoices):
        """Test report generation performance"""
        import time
        
        # Test sales trends performance
        start_time = time.time()
        response = client.get(
            "/api/reports/sales-trends?period=daily&start_date=2024-01-01&end_date=2024-12-31",
            headers=auth_headers
        )
        end_time = time.time()
        
        assert response.status_code == 200
        assert (end_time - start_time) < 10.0  # Should complete within 10 seconds
        
        # Test profit/loss performance
        start_time = time.time()
        response = client.get(
            "/api/reports/profit-loss?start_date=2024-01-01&end_date=2024-12-31&include_categories=true",
            headers=auth_headers
        )
        end_time = time.time()
        
        assert response.status_code == 200
        assert (end_time - start_time) < 10.0
    
    def test_large_dataset_handling(self, client, auth_headers, setup_reports_test_data):
        """Test reports with large datasets"""
        # This test would ideally create many invoices, but for now we'll test with existing data
        response = client.get(
            "/api/reports/customer-analytics?start_date=2020-01-01&end_date=2024-12-31&limit=1000",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        
        # Should handle large date ranges without errors
        assert "customers" in result
        assert "summary" in result