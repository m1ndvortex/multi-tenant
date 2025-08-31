# Docker-First Development and Testing Standards

## Docker-First Development Approach

### Container-Based Development
- **ALL development must be done within Docker containers** - never install dependencies locally
- Use `docker-compose up` to start the entire development environment
- Run all commands through Docker containers using `docker exec` or `docker-compose exec`
- Database, Redis, backend, and frontend services must all run in separate containers
- Use Docker volumes for persistent data and development file mounting

### Command Execution Guidelines
- **Backend commands**: `docker-compose exec backend python -m pytest`
- **Frontend commands**: `docker-compose exec frontend npm test`
- **Database operations**: `docker-compose exec postgres psql -U hesaab -d hesaabplus`
- **Redis operations**: `docker-compose exec redis redis-cli`
- **Celery operations**: `docker-compose exec celery celery -A app.celery worker`

### Development Environment Setup
- Always use docker-compose.yml for service orchestration
- Configure proper networking between containers
- Use environment variables for all configuration
- Mount source code as volumes for live development
- Never install Python, Node.js, PostgreSQL, or Redis locally

## Real Database Testing Standards

### Production-Ready Testing Approach
- **Use REAL PostgreSQL database for ALL tests** - no SQLite or in-memory databases
- **Use REAL Redis instance for caching and Celery tests** - no mock Redis
- **Use REAL API calls in integration tests** - minimal mocking
- Test with actual data scenarios that mirror production usage
- Validate multi-tenant data isolation with real database queries
- We are not simplify anything just because it not working . if there is a problem we fix it
- Always check for task requirement before you start implement it to understand task better
### Database Testing Requirements
- Create separate test database container: `hesaabplus_test`
- Use real PostgreSQL with proper schema and constraints
- Test with realistic data volumes (hundreds of records, not just 1-2)
- Validate foreign key constraints and database triggers
- Test concurrent access scenarios with multiple tenants

### API Testing Standards
- **Integration tests must use real HTTP requests** to FastAPI endpoints
- Test complete request/response cycles including authentication
- Validate JSON serialization/deserialization with real data
- Test file uploads with actual image processing
- Validate email/SMS sending with test providers (not mocks)

### Celery and Async Testing
- Use real Redis broker for Celery task testing
- Test actual task execution with real database operations
- Validate backup file creation and cloud storage uploads
- Test notification sending with real email/SMS providers in test mode
- Validate image processing with actual file operations

## Production-Ready Quality Standards

### Test Coverage Requirements
- **ALL tests must pass before any code merge or deployment**
- Minimum 90% code coverage for backend APIs
- Minimum 80% code coverage for frontend components
- Zero tolerance for failing tests in production builds
- All edge cases and error scenarios must be tested

### Testing Hierarchy
1. **Unit Tests**: Test individual functions with real database connections
2. **Integration Tests**: Test complete workflows with real API calls
3. **End-to-End Tests**: Test complete user journeys through real interfaces
4. **Performance Tests**: Test with realistic data loads and concurrent users
5. **Security Tests**: Test authentication, authorization, and data isolation

### Quality Gates
- All tests must pass in Docker environment before deployment
- Database migrations must be tested with real data scenarios
- Multi-tenant isolation must be validated with concurrent test scenarios
- Backup and restore procedures must be tested with actual file operations
- Performance benchmarks must meet specified thresholds
- Always check for task requirement before you start implement it to understand task better
### Error Handling Standards
- Test all error scenarios with real database constraint violations
- Validate proper HTTP status codes and error messages
- Test transaction rollbacks with real database operations
- Validate proper cleanup of resources in failure scenarios
- Test system recovery from various failure modes

## Container Testing Best Practices

### Test Environment Setup
```yaml
# Use this pattern for test services in docker-compose.test.yml
test-postgres:
  image: postgres:15
  environment:
    POSTGRES_DB: hesaabplus_test
    POSTGRES_USER: test_user
    POSTGRES_PASSWORD: test_password
  volumes:
    - test_postgres_data:/var/lib/postgresql/data

test-redis:
  image: redis:7-alpine
  volumes:
    - test_redis_data:/data
```

### Test Execution Commands
- **Run all tests**: `docker-compose -f docker-compose.test.yml up --abort-on-container-exit`
- **Backend tests**: `docker-compose exec test-backend python -m pytest -v --cov=app`
- **Frontend tests**: `docker-compose exec test-frontend npm run test:coverage`
- **Integration tests**: `docker-compose exec test-backend python -m pytest tests/integration/ -v`

### Continuous Integration Requirements
- All tests must run in clean Docker containers
- No dependencies on local machine configuration
- Database must be seeded with realistic test data
- Tests must clean up after themselves but use real operations
- Performance tests must validate response times and throughput

## Specific Implementation Guidelines

### When Writing Tests
- **DO**: Use real PostgreSQL with test database
- **DO**: Make actual HTTP requests to test APIs
- **DO**: Use real file operations for image processing tests
- **DO**: Test with multiple tenants and realistic data volumes
- **DON'T**: Use SQLite or in-memory databases
- **DON'T**: Mock database operations or API calls unnecessarily
- **DON'T**: Use minimal test data that doesn't reflect real usage

### When Developing Features
- **DO**: Run all services in Docker containers
- **DO**: Use docker-compose for service orchestration
- **DO**: Test features with real database operations
- **DO**: Validate multi-tenant isolation with actual queries
- **DON'T**: Install any dependencies locally
- **DON'T**: Run services outside of Docker
- **DON'T**: Skip testing because "it should work"

### When Debugging Issues
- **DO**: Use Docker logs: `docker-compose logs service-name`
- **DO**: Access containers: `docker-compose exec service-name bash`
- **DO**: Check database directly: `docker-compose exec postgres psql`
- **DO**: Monitor Redis: `docker-compose exec redis redis-cli monitor`
- **DON'T**: Try to debug outside of Docker environment
- **DON'T**: Install debugging tools locally

This is a **production-ready application** - every line of code must be thoroughly tested with real systems, and all tests must pass before any deployment consideration.