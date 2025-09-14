#!/bin/bash

# HesaabPlus Production Quick Start Script

set -e

echo "🚀 HesaabPlus Production Deployment"
echo "=================================="

# Check if docker and docker-compose are installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Check if .env.production exists
if [ ! -f ".env.production" ]; then
    echo "⚠️  .env.production not found. Creating from template..."
    cp .env.production.template .env.production
    echo "📝 Please edit .env.production with your actual values:"
    echo "   - POSTGRES_PASSWORD"
    echo "   - JWT_SECRET_KEY"
    echo "   - Cloudflare R2 or Backblaze B2 credentials"
    echo "   - Email and SMS configuration"
    echo ""
    echo "After editing .env.production, run this script again."
    exit 0
fi

echo "📋 Environment file found: .env.production"

# Validate required environment variables
source .env.production

required_vars=("POSTGRES_PASSWORD" "JWT_SECRET_KEY")
missing_vars=()

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        missing_vars+=("$var")
    fi
done

if [ ${#missing_vars[@]} -ne 0 ]; then
    echo "❌ Missing required environment variables:"
    printf '   - %s\n' "${missing_vars[@]}"
    echo "Please update .env.production and try again."
    exit 1
fi

echo "✅ Environment validation passed"

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p nginx/ssl
mkdir -p backend/logs
mkdir -p backend/uploads

# Build and start services
echo "🏗️  Building and starting services..."
docker-compose -f docker-compose.prod.yml --env-file .env.production down
docker-compose -f docker-compose.prod.yml --env-file .env.production build --no-cache
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 30

# Check service health
echo "🔍 Checking service health..."
for service in postgres redis backend super-admin-frontend tenant-frontend; do
    status=$(docker-compose -f docker-compose.prod.yml ps -q $service | xargs docker inspect --format '{{.State.Health.Status}}' 2>/dev/null || echo "unknown")
    if [ "$status" = "healthy" ] || [ "$status" = "unknown" ]; then
        echo "✅ $service: OK"
    else
        echo "❌ $service: $status"
    fi
done

# Show access URLs
echo ""
echo "🌐 Application URLs:"
echo "   Admin Panel: http://localhost:3000"
echo "   Tenant App:  http://localhost:3001"
echo "   Backend API: http://localhost:8000"
echo "   API Docs:    http://localhost:8000/docs"
echo ""
echo "📊 With nginx proxy (add to /etc/hosts):"
echo "   127.0.0.1 admin.hesaabplus.local"
echo "   127.0.0.1 app.hesaabplus.local"
echo "   127.0.0.1 api.hesaabplus.local"
echo ""
echo "   Admin Panel: http://admin.hesaabplus.local"
echo "   Tenant App:  http://app.hesaabplus.local"
echo "   Backend API: http://api.hesaabplus.local"

# Show log monitoring command
echo ""
echo "📝 Monitor logs:"
echo "   docker-compose -f docker-compose.prod.yml logs -f"
echo ""
echo "🎉 Deployment complete! Your HesaabPlus application is ready."
echo "   Features:"
echo "   ✅ Real-time cache invalidation (no more frontend restarts!)"
echo "   ✅ WebSocket connections for live updates"
echo "   ✅ Production-optimized builds"
echo "   ✅ Health monitoring and auto-restart"
echo "   ✅ Service worker for offline support"