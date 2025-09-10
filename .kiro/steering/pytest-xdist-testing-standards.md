# Pytest-xdist Multi-threaded Testing Standards

## Overview
All tests must be run using pytest-xdist for parallel execution to improve test performance and efficiency. This document outlines the standards for running tests with multi-threading capabilities in Docker containers.

## Pytest-xdist Configuration

### Installation Requirements
- **pytest-xdist==3.5.0** must be installed in the Docker container
- All test dependencies must be available in the container environment
- Tests must be compatible with parallel execution

### Command Standards

#### Standard Test Execution
```bash
# Run all tests with automatic worker detection
docker-compose exec backend python -m pytest -n auto

# Run specific test file with parallel execution
docker-compose exec backend python -m pytest tests/test_file.py -n auto

# Run specific test class with parallel execution
docker-compose exec backend python -m pytest tests/test_file.py::TestClass -n auto

# Run with specific number of workers
docker-compose exec backend python -m pytest -n 4

# Run with coverage and parallel execution
docker-compose exec backend python -m pytest -n auto --cov=app --cov-report=html
```

#### Test Execution Options
- **`-n auto`**: Automatically detect the number of CPU cores and create that many workers
- **`-n <number>`**: Specify exact number of worker processes
- **`-n logical`**: Use the number of logical CPUs (includes hyperthreading)
- **`--dist worksteal`**: Enable work stealing for better load balancing (default)

### Docker-First Testing Requirements

#### Container Execution
- **ALL tests must run inside Docker containers** - never run tests on the host machine
- Use `docker-compose exec backend` for all pytest commands
- Ensure all test dependencies are installed in the container
- Database and Redis connections must use container networking

#### Test Isolation and Parallel Safety
- Tests must be designed to work with parallel execution
- Database operations must use proper transaction isolation
- Avoid shared state between test functions
- Use unique test data identifiers (UUIDs, timestamps) to prevent conflicts
- Clean up test data properly in fixtures

### Performance Optimization

#### Parallel Execution Benefits
- **Faster test execution**: Utilize multiple CPU cores for concurrent test runs
- **Better resource utilization**: Distribute test load across available workers
- **Improved CI/CD performance**: Reduce overall pipeline execution time
- **Early failure detection**: Parallel execution can identify issues faster

#### Test Organization for Parallelization
- Group related tests in the same file when they share fixtures
- Avoid tests that depend on specific execution order
- Use proper test isolation with database transactions
- Implement proper cleanup in teardown methods

### Docker Compose Integration

#### Backend Testing
```bash
# Standard backend test execution
docker-compose exec backend python -m pytest -n auto -v

# Backend tests with coverage
docker-compose exec backend python -m pytest -n auto --cov=app --cov-report=term-missing

# Run specific test modules in parallel
docker-compose exec backend python -m pytest tests/test_models/ -n auto
```

#### Frontend Testing (if applicable)
```bash
# Frontend tests with parallel execution
docker-compose exec frontend npm test -- --maxWorkers=auto

# Frontend tests with coverage
docker-compose exec frontend npm run test:coverage -- --maxWorkers=auto
```

### Test Configuration Best Practices

#### Pytest Configuration (pytest.ini)
```ini
[tool:pytest]
addopts = 
    -n auto
    --strict-markers
    --strict-config
    --disable-warnings
    -ra
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
markers =
    slow: marks tests as slow (deselect with '-m "not slow"')
    integration: marks tests as integration tests
    unit: marks tests as unit tests
```

#### Parallel-Safe Test Design
- Use database transactions that auto-rollback
- Generate unique test data using UUIDs or timestamps
- Avoid global state modifications
- Use proper mocking for external dependencies
- Implement proper resource cleanup

### Continuous Integration Standards

#### CI Pipeline Requirements
- All CI/CD pipelines must use pytest-xdist for test execution
- Docker containers must be used for all test environments
- Parallel execution must be enabled in all test stages
- Test results must be collected and reported properly

#### Example CI Commands
```yaml
# Example GitHub Actions or similar CI configuration
test:
  script:
    - docker-compose up -d postgres redis
    - docker-compose exec -T backend python -m pytest -n auto --junitxml=test-results.xml --cov=app --cov-report=xml
```

### Troubleshooting Parallel Tests

#### Common Issues and Solutions
1. **Database conflicts**: Use proper transaction isolation and unique test data
2. **Shared resources**: Avoid shared files, use temporary directories
3. **Race conditions**: Implement proper synchronization in tests
4. **Memory usage**: Monitor container memory limits with multiple workers

#### Debugging Parallel Tests
```bash
# Run tests sequentially for debugging
docker-compose exec backend python -m pytest -n 0 -v -s

# Run with specific number of workers for debugging
docker-compose exec backend python -m pytest -n 1 -v -s

# Enable pytest-xdist logging
docker-compose exec backend python -m pytest -n auto --log-cli-level=DEBUG
```

### Performance Monitoring

#### Test Execution Metrics
- Monitor test execution time improvements with parallel execution
- Track resource utilization (CPU, memory) during test runs
- Measure test suite completion time before and after parallelization
- Identify bottlenecks in test execution

#### Expected Performance Improvements
- **2-4x faster execution** on multi-core systems
- **Better CI/CD pipeline performance** with reduced test time
- **Improved developer productivity** with faster feedback loops
- **Efficient resource utilization** in containerized environments

## Mandatory Requirements

### For All Test Execution
1. **MUST use Docker containers** for all test execution
2. **MUST use pytest-xdist** with `-n auto` for parallel execution
3. **MUST ensure tests are parallel-safe** and properly isolated
4. **MUST use real database connections** within Docker containers
5. **MUST clean up test data** properly to avoid conflicts

### For Test Development
1. **MUST design tests** to work with parallel execution
2. **MUST use unique identifiers** for test data to prevent conflicts
3. **MUST implement proper fixtures** for test isolation
4. **MUST avoid shared state** between test functions
5. **MUST use proper transaction management** for database tests

### For CI/CD Integration
1. **MUST configure CI pipelines** to use pytest-xdist
2. **MUST run all tests** in Docker containers
3. **MUST collect test results** and coverage reports properly
4. **MUST monitor test performance** and execution times
5. **MUST fail builds** if any tests fail in parallel execution

This ensures consistent, fast, and reliable test execution across all development and deployment environments while maximizing the benefits of parallel test execution.