# HesaabPlus Development Makefile

.PHONY: help build up down logs test clean restart

# Default target
help:
	@echo "HesaabPlus Development Commands:"
	@echo "  make build     - Build all Docker containers"
	@echo "  make up        - Start development environment"
	@echo "  make down      - Stop development environment"
	@echo "  make logs      - View logs from all services"
	@echo "  make test      - Run all tests"
	@echo "  make clean     - Clean up containers and volumes"
	@echo "  make restart   - Restart all services"
	@echo "  make backend   - Access backend container"
	@echo "  make db        - Access PostgreSQL database"
	@echo "  make redis     - Access Redis CLI"

# Build all containers
build:
	docker-compose build

# Start development environment
up:
	docker-compose up -d
	@echo "Services starting..."
	@echo "Super Admin: http://localhost:3000"
	@echo "Tenant App:  http://localhost:3001"
	@echo "Backend API: http://localhost:8000"
	@echo "API Docs:    http://localhost:8000/docs"

# Stop development environment
down:
	docker-compose down

# View logs
logs:
	docker-compose logs -f

# Run all tests
test:
	docker-compose -f docker-compose.test.yml up --abort-on-container-exit
	docker-compose -f docker-compose.test.yml down

# Clean up everything
clean:
	docker-compose down -v
	docker system prune -f
	docker volume prune -f

# Restart all services
restart:
	docker-compose restart

# Access backend container
backend:
	docker-compose exec backend bash

# Access database
db:
	docker-compose exec postgres psql -U hesaab -d hesaabplus

# Access Redis
redis:
	docker-compose exec redis redis-cli

# Backend specific commands
backend-test:
	docker-compose exec backend python -m pytest -v --cov=app

backend-lint:
	docker-compose exec backend black app/
	docker-compose exec backend isort app/
	docker-compose exec backend flake8 app/

# Frontend specific commands
frontend-test:
	docker-compose exec super-admin-frontend npm test -- --coverage --watchAll=false
	docker-compose exec tenant-frontend npm test -- --coverage --watchAll=false

# Development helpers
dev-setup:
	cp .env.example .env
	@echo "Please edit .env file with your configuration"

# Health check
health:
	@echo "Checking service health..."
	@curl -f http://localhost:8000/health || echo "Backend not ready"
	@curl -f http://localhost:3000 || echo "Super Admin not ready"
	@curl -f http://localhost:3001 || echo "Tenant App not ready"