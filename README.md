# HesaabPlus - Multi-Tenant Business Management Platform

HesaabPlus is an elite, multi-tenant, cloud-native business management SaaS platform designed primarily for the Iranian market with Persian (RTL) interface support. The system consists of two separate applications: a Super Admin Platform for service management and a Tenant Application for customer business operations.

## ✨ NEW: Zero-Restart Production Ready!

� **Major Update**: Frontend restart requirement **ELIMINATED**! 
- ⚡ Real-time cache invalidation via WebSocket
- 🔄 Automatic UI updates without manual restarts
- 🚀 Production-ready deployment with monitoring
- 📱 Enhanced service worker with offline support

## �🏗️ Architecture

- **Backend**: FastAPI with PostgreSQL, Redis, and WebSocket support
- **Super Admin Frontend**: React with TypeScript + Real-time updates (Port 3000)
- **Tenant Frontend**: React with TypeScript + Real-time updates (Port 3001)  
- **Task Queue**: Celery with Redis broker
- **Database**: PostgreSQL 15 with multi-tenant architecture
- **Caching**: Multi-layer caching with intelligent invalidation
- **Real-time**: WebSocket connections for live updates
- **Containerization**: Docker with multi-stage builds

## 🚀 Quick Start

### Development Mode (with hot reload)

1. **Clone and setup**
   ```bash
   git clone <repository-url>
   cd hesaabplus
   cp .env.example .env
   # Edit .env with your configuration
   ```

2. **Start development environment**
   ```bash
   docker-compose up -d
   ```

3. **Access applications** 
   - Super Admin: http://localhost:3000
   - Tenant App: http://localhost:3001
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/docs

### Production Deployment

1. **Quick deploy script (Windows)**
   ```bash
   deploy-production.bat
   ```

2. **Manual production setup**
   ```bash
   cp .env.production.template .env.production
   # Edit .env.production with your values
   docker-compose -f docker-compose.prod.yml --env-file .env.production up -d
   ```

3. **Production URLs**
   - Admin: http://admin.hesaabplus.local
   - Tenant: http://app.hesaabplus.local  
   - API: http://api.hesaabplus.local

📖 **Complete Guide**: See [PRODUCTION_DEPLOYMENT_GUIDE.md](PRODUCTION_DEPLOYMENT_GUIDE.md)

## 🧪 Testing

### Run all tests
```bash
docker-compose -f docker-compose.test.yml up --abort-on-container-exit
```

### Run specific service tests
```bash
# Backend tests
docker-compose exec backend python -m pytest -v --cov=app

# Frontend tests
docker-compose exec super-admin-frontend npm test
docker-compose exec tenant-frontend npm test
```

## 📁 Project Structure

```
hesaabplus/
├── backend/                    # FastAPI backend application
│   ├── app/                   # Application code
│   ├── Dockerfile             # Backend container configuration
│   ├── requirements.txt       # Python dependencies
│   └── init.sql              # Database initialization
├── super-admin-frontend/       # Super Admin React application
│   ├── src/                   # Source code
│   ├── public/                # Static assets
│   ├── Dockerfile             # Frontend container configuration
│   └── package.json           # Node.js dependencies
├── tenant-frontend/            # Tenant React application
│   ├── src/                   # Source code
│   ├── public/                # Static assets
│   ├── Dockerfile             # Frontend container configuration
│   └── package.json           # Node.js dependencies
├── docker-compose.yml          # Development environment
├── docker-compose.test.yml     # Testing environment
└── .env.example               # Environment variables template
```

## 🔧 Development

### Backend Development
```bash
# Access backend container
docker-compose exec backend bash

# Run migrations (when implemented)
docker-compose exec backend alembic upgrade head

# View logs
docker-compose logs backend
```

### Frontend Development
```bash
# Access frontend containers
docker-compose exec super-admin-frontend bash
docker-compose exec tenant-frontend bash

# Install new dependencies
docker-compose exec super-admin-frontend npm install <package>
```

### Database Operations
```bash
# Access PostgreSQL
docker-compose exec postgres psql -U hesaab -d hesaabplus

# View Redis data
docker-compose exec redis redis-cli
```

## 🌟 Key Features

### Super Admin Platform
- Multi-tenant management
- User impersonation system
- Platform analytics and monitoring
- Backup and recovery management
- System health monitoring

### Tenant Application
- Dual invoice system (General & Gold)
- Gold installment management with weight tracking
- Comprehensive accounting system
- Advanced reporting and analytics
- Notification system (Email & SMS)
- Inventory management
- Customer relationship management

## 🔒 Security Features

- JWT-based authentication
- Multi-tenant data isolation
- Role-based access control
- Audit logging for sensitive operations
- Encrypted backups
- CORS protection

## 🌐 Internationalization

- Persian (Farsi) RTL interface
- Multi-language support ready
- Persian date handling
- Currency formatting for Iranian Rial

## 📊 Monitoring & Observability

- Health check endpoints
- Request timing middleware
- Structured logging
- Performance monitoring
- Error tracking

## 🔄 Backup & Recovery

- Daily per-tenant backups
- Full platform disaster recovery
- Dual-cloud storage (Cloudflare R2 + Backblaze B2)
- Automated backup verification

## 📈 Scalability

- Horizontal scaling ready
- Microservices architecture
- Async task processing
- Database connection pooling
- Redis caching layer

## 🤝 Contributing

1. Follow Docker-first development approach
2. All tests must pass before merging
3. Use real database connections for testing
4. Follow Persian RTL design guidelines
5. Maintain multi-tenant data isolation

## 📝 License

This project is proprietary software. All rights reserved.

## 🆘 Support

For technical support and documentation, please refer to the internal documentation or contact the development team.