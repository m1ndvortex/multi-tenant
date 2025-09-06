# HesaabPlus Comprehensive API Integration Tests

This directory contains comprehensive integration tests for all HesaabPlus API endpoints. These tests follow Docker-first development standards and test with real PostgreSQL database and Redis instances.

## 📋 Test Coverage

### Test Suites Included

1. **`test_comprehensive_api_integration.py`** - Core API endpoints (Auth, Customers, Products, Invoices, Analytics)
2. **`test_accounting_api_comprehensive.py`** - Chart of Accounts, Journal Entries, General Ledger
3. **`test_installments_api_comprehensive.py`** - General and Gold Installment systems
4. **`test_reports_api_comprehensive.py`** - Sales Trends, Profit/Loss, Customer Analytics, Aging Reports
5. **`test_notifications_api_comprehensive.py`** - Notification system, Marketing Campaigns, Templates
6. **`test_inventory_api_comprehensive.py`** - Product management, Stock operations, Categories

### API Endpoints Tested

- ✅ **Authentication API** - Login, logout, token refresh, user profiles
- ✅ **Customer Management** - CRUD, search, statistics, interactions
- ✅ **Product/Inventory Management** - Products, categories, stock operations
- ✅ **Invoice System** - General and Gold invoices, payments, QR codes
- ✅ **Installment System** - General and Gold installments, payments
- ✅ **Accounting System** - Chart of accounts, journal entries, trial balance
- ✅ **Reports & Analytics** - Sales trends, profit/loss, customer analytics
- ✅ **Notification System** - Email/SMS notifications, marketing campaigns
- ✅ **Business Intelligence** - KPIs, dashboards, alerts
- ✅ **Backup & Recovery** - Data backup, restore operations

## 🚀 Running Tests on Windows

### Prerequisites

1. **Docker Desktop** - Install from [docker.com](https://www.docker.com/products/docker-desktop/)
2. **Git** - For cloning the repository
3. **Windows 10/11** - With PowerShell or Command Prompt

### Quick Start (Recommended)

1. **Open Command Prompt or PowerShell as Administrator**
2. **Navigate to your project directory:**
   ```cmd
   cd path\to\your\hesaabplus-project
   ```

3. **Run the Windows test script:**
   ```cmd
   backend\tests\run_tests_windows.bat
   ```

This script will:
- ✅ Check Docker is running
- ✅ Stop any existing test containers
- ✅ Build fresh test images
- ✅ Start PostgreSQL and Redis test containers
- ✅ Run all 6 comprehensive test suites
- ✅ Show detailed results and cleanup

### Manual Docker Commands (Alternative)

If you prefer to run tests manually:

```cmd
# Navigate to project root
cd path\to\your\hesaabplus-project

# Stop existing test containers
docker-compose -f docker-compose.test.yml down --remove-orphans

# Clean up test volumes
docker volume rm hesaabplus_test_postgres_data
docker volume rm hesaabplus_test_redis_data

# Build and start test environment
docker-compose -f docker-compose.test.yml build --no-cache
docker-compose -f docker-compose.test.yml up -d

# Wait for services to be ready (about 30 seconds)
timeout /t 30

# Run individual test suites
docker exec hesaabplus_test_backend python -m pytest tests/test_comprehensive_api_integration.py -v
docker exec hesaabplus_test_backend python -m pytest tests/test_accounting_api_comprehensive.py -v
docker exec hesaabplus_test_backend python -m pytest tests/test_installments_api_comprehensive.py -v
docker exec hesaabplus_test_backend python -m pytest tests/test_reports_api_comprehensive.py -v
docker exec hesaabplus_test_backend python -m pytest tests/test_notifications_api_comprehensive.py -v
docker exec hesaabplus_test_backend python -m pytest tests/test_inventory_api_comprehensive.py -v

# Cleanup
docker-compose -f docker-compose.test.yml down --remove-orphans
```

### Running Specific Test Suites

To run only specific test suites:

```cmd
# Only authentication and customer tests
docker exec hesaabplus_test_backend python -m pytest tests/test_comprehensive_api_integration.py::TestComprehensiveAPIIntegration::test_auth_login_success -v

# Only accounting tests
docker exec hesaabplus_test_backend python -m pytest tests/test_accounting_api_comprehensive.py -v

# Only inventory tests
docker exec hesaabplus_test_backend python -m pytest tests/test_inventory_api_comprehensive.py -v

# Run tests with specific patterns
docker exec hesaabplus_test_backend python -m pytest -k "test_create" -v
docker exec hesaabplus_test_backend python -m pytest -k "invoice" -v
```

## 🐧 Running Tests on Linux/macOS

### Using the Shell Script

```bash
# Make script executable
chmod +x backend/tests/docker-test-setup.sh

# Run all tests
./backend/tests/docker-test-setup.sh

# Keep containers running for debugging
./backend/tests/docker-test-setup.sh --keep-running
```

### Using Python Test Runner

```bash
# Navigate to tests directory
cd backend/tests

# Run all comprehensive tests
python run_comprehensive_tests.py

# Run specific test file
python run_comprehensive_tests.py test_accounting_api_comprehensive.py
```

## 📊 Test Results and Reporting

### Expected Output

When all tests pass, you should see:
```
🎉 ALL TESTS PASSED!
✅ Comprehensive API Tests: PASSED
✅ Accounting API Tests: PASSED  
✅ Installments API Tests: PASSED
✅ Reports API Tests: PASSED
✅ Notifications API Tests: PASSED
✅ Inventory API Tests: PASSED
```

### Test Metrics

- **Total Tests**: ~300+ individual test cases
- **Coverage**: All major API endpoints and business logic
- **Database**: Real PostgreSQL with test data
- **Authentication**: JWT tokens with real user sessions
- **Multi-tenancy**: Proper tenant isolation testing

## 🔧 Troubleshooting

### Common Issues

1. **Docker not running**
   ```
   Error: Docker is not running
   Solution: Start Docker Desktop and wait for it to be ready
   ```

2. **Port conflicts**
   ```
   Error: Port 5434 already in use
   Solution: Stop other PostgreSQL instances or change ports in docker-compose.test.yml
   ```

3. **Memory issues**
   ```
   Error: Container killed (OOMKilled)
   Solution: Increase Docker Desktop memory allocation to 4GB+
   ```

4. **Test failures due to timing**
   ```
   Error: Connection refused
   Solution: Increase wait times in test setup or run tests again
   ```

### Debug Mode

To debug failing tests:

1. **Keep containers running:**
   ```cmd
   # When prompted, choose 'y' to keep containers running
   Keep test containers running for debugging? (y/N): y
   ```

2. **Access test database:**
   ```cmd
   docker exec -it hesaabplus_test_postgres psql -U test_user -d hesaabplus_test
   ```

3. **Check backend logs:**
   ```cmd
   docker-compose -f docker-compose.test.yml logs test-backend
   ```

4. **Run individual tests:**
   ```cmd
   docker exec hesaabplus_test_backend python -m pytest tests/test_comprehensive_api_integration.py::TestComprehensiveAPIIntegration::test_auth_login_success -v -s
   ```

## 📈 Performance Expectations

### Test Execution Times

- **Full test suite**: 10-15 minutes
- **Individual test suite**: 2-3 minutes
- **Single test**: 1-5 seconds

### Resource Requirements

- **RAM**: 4GB+ recommended
- **Disk**: 2GB+ free space
- **CPU**: 2+ cores recommended

## 🔒 Security Testing

These tests include:
- ✅ Authentication and authorization
- ✅ Tenant data isolation
- ✅ Input validation and sanitization
- ✅ SQL injection prevention
- ✅ XSS protection
- ✅ CSRF protection

## 📝 Adding New Tests

To add new test cases:

1. **Choose the appropriate test file** based on the API being tested
2. **Follow the existing test patterns:**
   ```python
   def test_new_feature(self, client, auth_headers, setup_test_data):
       """Test description"""
       # Arrange
       test_data = {...}
       
       # Act
       response = client.post("/api/endpoint", json=test_data, headers=auth_headers)
       
       # Assert
       assert response.status_code == 200
       result = response.json()
       assert result["field"] == "expected_value"
   ```

3. **Test both success and failure scenarios**
4. **Include data validation tests**
5. **Test permissions and tenant isolation**

## 🎯 Best Practices

1. **Always use real database operations** - No mocking of database calls
2. **Test with realistic data volumes** - Not just single records
3. **Validate tenant isolation** - Ensure data doesn't leak between tenants
4. **Test complete workflows** - End-to-end business processes
5. **Include error scenarios** - Test validation and error handling
6. **Performance testing** - Ensure APIs respond within acceptable time limits

## 📞 Support

If you encounter issues:

1. **Check the troubleshooting section above**
2. **Review Docker Desktop logs**
3. **Ensure all prerequisites are installed**
4. **Try running tests individually to isolate issues**
5. **Check system resources (RAM, disk space)**

---

**Note**: These tests are designed to run in a clean Docker environment and will create/destroy test data. Never run against production databases.