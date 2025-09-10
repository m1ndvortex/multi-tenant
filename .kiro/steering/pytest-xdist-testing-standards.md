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
# Run all tests with automatic worker detection and work stealing (RECOMMENDED)
docker-compose exec backend python -m pytest -n auto --dist worksteal

# Run specific test file with parallel execution and work stealing
docker-compose exec backend python -m pytest tests/test_file.py -n auto --dist worksteal

# Run specific test class with parallel execution and work stealing
docker-compose exec backend python -m pytest tests/test_file.py::TestClass -n auto --dist worksteal

# Run with specific number of workers and work stealing
docker-compose exec backend python -m pytest -n 6 --dist worksteal

# Run with coverage and parallel execution with work stealing
docker-compose exec backend python -m pytest -n auto --dist worksteal --cov=app --cov-report=html

# For maximum performance on multi-core systems (use logical CPU count)
docker-compose exec backend python -m pytest -n logical --dist worksteal
```

#### Test Execution Options
- **`-n auto`**: Automatically detect the number of CPU cores and create that many workers
- **`-n logical`**: Use the number of logical CPUs (includes hyperthreading) - **FASTEST OPTION**
- **`-n <number>`**: Specify exact number of worker processes (e.g., `-n 6` for 6 workers)
- **`--dist worksteal`**: **CRITICAL FOR PERFORMANCE** - Enables work stealing so all workers stay busy until completion
- **`--dist load`**: Default load balancing (less efficient, avoid this)
- **`--dist each`**: Run each test on every worker (only for special cases)

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
- **Work stealing efficiency**: `--dist worksteal` keeps all workers busy until the very end

#### Maximum Performance Configuration
```bash
# FASTEST: Use logical CPUs with work stealing
docker-compose exec backend python -m pytest -n logical --dist worksteal

# RECOMMENDED: Auto-detect with work stealing
docker-compose exec backend python -m pytest -n auto --dist worksteal

# CUSTOM: Specify exact worker count with work stealing
docker-compose exec backend python -m pytest -n 6 --dist worksteal
```

#### Work Stealing vs Load Balancing
- **`--dist worksteal`** (RECOMMENDED): Workers steal tests from each other when they finish early
  - Keeps all workers busy until completion
  - Better performance on mixed test durations
  - Optimal resource utilization
- **`--dist load`** (DEFAULT, SLOWER): Tests are pre-distributed to workers
  - Some workers may finish early and sit idle
  - Less efficient for tests with varying execution times

#### Test Organization for Parallelization
- Group related tests in the same file when they share fixtures
- Avoid tests that depend on specific execution order
- Use proper test isolation with database transactions
- Implement proper cleanup in teardown methods

### Docker Compose Integration

#### Backend Testing
```bash
# Standard backend test execution (RECOMMENDED)
docker-compose exec backend python -m pytest -n auto --dist worksteal -v

# Backend tests with coverage and work stealing
docker-compose exec backend python -m pytest -n auto --dist worksteal --cov=app --cov-report=term-missing

# Run specific test modules in parallel with work stealing
docker-compose exec backend python -m pytest tests/test_models/ -n auto --dist worksteal

# Maximum performance for large test suites
docker-compose exec backend python -m pytest -n logical --dist worksteal -v

# Quick test run with minimal output
docker-compose exec backend python -m pytest -n auto --dist worksteal -q
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
    --dist worksteal
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
    fast: marks tests as fast (for quick feedback loops)
```

#### Alternative High-Performance Configuration
```ini
[tool:pytest]
addopts = 
    -n logical
    --dist worksteal
    --strict-markers
    --strict-config
    --disable-warnings
    -ra
    --tb=short
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
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
    - docker-compose exec -T backend python -m pytest -n auto --dist worksteal --junitxml=test-results.xml --cov=app --cov-report=xml

# High-performance CI configuration
test-fast:
  script:
    - docker-compose up -d postgres redis
    - docker-compose exec -T backend python -m pytest -n logical --dist worksteal --junitxml=test-results.xml --cov=app --cov-report=xml --tb=short

# Parallel test stages for large projects
test-unit:
  script:
    - docker-compose exec -T backend python -m pytest tests/unit/ -n auto --dist worksteal -m "not slow"
    
test-integration:
  script:
    - docker-compose exec -T backend python -m pytest tests/integration/ -n auto --dist worksteal
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

# Enable pytest-xdist logging with work stealing
docker-compose exec backend python -m pytest -n auto --dist worksteal --log-cli-level=DEBUG

# Debug with minimal parallelism but still use work stealing
docker-compose exec backend python -m pytest -n 2 --dist worksteal -v -s

# Profile test performance
docker-compose exec backend python -m pytest -n auto --dist worksteal --durations=10
```

### Performance Monitoring

#### Test Execution Metrics
- Monitor test execution time improvements with parallel execution
- Track resource utilization (CPU, memory) during test runs
- Measure test suite completion time before and after parallelization
- Identify bottlenecks in test execution

#### Expected Performance Improvements
- **2-4x faster execution** on multi-core systems with `-n auto --dist worksteal`
- **3-6x faster execution** on hyperthreaded systems with `-n logical --dist worksteal`
- **Better CI/CD pipeline performance** with reduced test time
- **Improved developer productivity** with faster feedback loops
- **Efficient resource utilization** in containerized environments
- **Optimal worker utilization** - no idle workers until all tests complete

#### Performance Benchmarks
```bash
# Measure performance improvement
time docker-compose exec backend python -m pytest  # Sequential baseline
time docker-compose exec backend python -m pytest -n auto --dist load  # Default parallel
time docker-compose exec backend python -m pytest -n auto --dist worksteal  # Optimized parallel
time docker-compose exec backend python -m pytest -n logical --dist worksteal  # Maximum parallel
```

## Mandatory Requirements

### For All Test Execution
1. **MUST use Docker containers** for all test execution
2. **MUST use pytest-xdist** with `-n auto --dist worksteal` for optimal parallel execution
3. **MUST ensure tests are parallel-safe** and properly isolated
4. **MUST use real database connections** within Docker containers
5. **MUST clean up test data** properly to avoid conflicts
6. **MUST use work stealing** (`--dist worksteal`) to maximize worker efficiency

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

## Advanced Performance Tuning

### Optimal Worker Configuration

#### System-Specific Recommendations
```bash
# For development machines (4-8 cores)
docker-compose exec backend python -m pytest -n auto --dist worksteal

# For CI/CD servers (8+ cores)
docker-compose exec backend python -m pytest -n logical --dist worksteal

# For containers with limited CPU
docker-compose exec backend python -m pytest -n 4 --dist worksteal

# For very large test suites (1000+ tests)
docker-compose exec backend python -m pytest -n logical --dist worksteal --maxfail=5
```

#### Memory Considerations
- Each worker uses additional memory
- Monitor container memory limits: `docker stats`
- Adjust worker count if hitting memory limits:
  ```bash
  # Reduce workers if memory constrained
  docker-compose exec backend python -m pytest -n 4 --dist worksteal
  ```

#### Test Suite Optimization
```bash
# Run fast tests first for quick feedback
docker-compose exec backend python -m pytest -n auto --dist worksteal -m "not slow"

# Run slow tests separately if needed
docker-compose exec backend python -m pytest -n logical --dist worksteal -m "slow"

# Profile test execution to identify bottlenecks
docker-compose exec backend python -m pytest -n auto --dist worksteal --durations=20
```

### Work Stealing Deep Dive

#### How Work Stealing Works
1. Tests are initially distributed among workers
2. When a worker finishes its assigned tests, it "steals" tests from busy workers
3. This continues until all tests are complete
4. **Result**: All workers stay busy until the very end

#### Benefits Over Default Load Balancing
- **No idle workers**: Traditional load balancing can leave workers idle
- **Better handling of mixed test durations**: Fast and slow tests are balanced automatically
- **Optimal resource utilization**: CPU cores stay busy throughout the entire test run
- **Faster completion**: Typically 20-40% faster than default distribution

This ensures consistent, fast, and reliable test execution across all development and deployment environments while maximizing the benefits of parallel test execution with optimal worker utilization.