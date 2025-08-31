# Design Document

## Overview

HesaabPlus is a sophisticated multi-tenant SaaS platform consisting of two separate applications: a Super Admin Platform for service management and a Tenant Application for customer business operations. The system is built with a modern microservices-inspired architecture using Docker containers, featuring comprehensive accounting capabilities, specialized gold market support, and advanced backup/recovery systems.

The platform uses a shared database, shared schema multi-tenancy model with strict data isolation, Persian RTL interface support, and a beautiful gradient-based design system. All components are containerized for easy deployment and scaling.

## Architecture

### System Architecture Overview

```mermaid
graph TB
    subgraph "Docker Environment"
        subgraph "Frontend Layer"
            SA[Super Admin React App]
            TA[Tenant Application React App]
        end
        
        subgraph "Backend Layer"
            API[FastAPI Backend]
            CELERY[Celery Workers]
        end
        
        subgraph "Data Layer"
            PG[(PostgreSQL Database)]
            REDIS[(Redis Cache)]
        end
        
        subgraph "External Services"
            R2[Cloudflare R2]
            B2[Backblaze B2]
            EMAIL[Email Service]
            SMS[SMS Service]
        end
    end
    
    SA --> API
    TA --> API
    API --> PG
    API --> REDIS
    CELERY --> PG
    CELERY --> REDIS
    CELERY --> R2
    CELERY --> B2
    CELERY --> EMAIL
    CELERY --> SMS
```

### Multi-Tenant Data Architecture

```mermaid
erDiagram
    TENANTS {
        uuid id PK
        string name
        string domain
        enum subscription_type
        datetime created_at
        datetime subscription_expires_at
        boolean is_active
    }
    
    USERS {
        uuid id PK
        uuid tenant_id FK
        string email
        string password_hash
        enum role
        boolean is_active
        datetime last_login
    }
    
    PRODUCTS {
        uuid id PK
        uuid tenant_id FK
        string name
        decimal price
        integer stock_quantity
        string category
        text description
        json images
    }
    
    CUSTOMERS {
        uuid id PK
        uuid tenant_id FK
        string name
        string email
        string phone
        text address
        json tags
        decimal total_debt
    }
    
    INVOICES {
        uuid id PK
        uuid tenant_id FK
        uuid customer_id FK
        enum invoice_type
        decimal total_amount
        boolean is_installment
        enum status
        datetime created_at
        string qr_code_token
    }
    
    INVOICE_ITEMS {
        uuid id PK
        uuid invoice_id FK
        uuid product_id FK
        integer quantity
        decimal unit_price
        decimal weight
        decimal labor_fee
        decimal profit
        decimal vat
    }
    
    INSTALLMENTS {
        uuid id PK
        uuid invoice_id FK
        decimal amount_due
        decimal gold_weight_due
        datetime due_date
        enum status
        datetime paid_at
        decimal gold_price_at_payment
    }
    
    JOURNAL_ENTRIES {
        uuid id PK
        uuid tenant_id FK
        datetime entry_date
        string description
        decimal total_amount
        string reference_type
        uuid reference_id
    }
    
    TENANTS ||--o{ USERS : has
    TENANTS ||--o{ PRODUCTS : owns
    TENANTS ||--o{ CUSTOMERS : manages
    TENANTS ||--o{ INVOICES : creates
    CUSTOMERS ||--o{ INVOICES : receives
    INVOICES ||--o{ INVOICE_ITEMS : contains
    INVOICES ||--o{ INSTALLMENTS : has
    TENANTS ||--o{ JOURNAL_ENTRIES : records
```

### Container Architecture

```yaml
# docker-compose.yml structure
services:
  postgres:
    image: postgres:15
    environment:
      - POSTGRES_DB=hesaabplus
      - POSTGRES_USER=hesaab
      - POSTGRES_PASSWORD=secure_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  backend:
    build: ./backend
    environment:
      - DATABASE_URL=postgresql://hesaab:secure_password@postgres:5432/hesaabplus
      - REDIS_URL=redis://redis:6379/0
      - JWT_SECRET_KEY=your_jwt_secret
      - CLOUDFLARE_R2_ACCESS_KEY=your_r2_key
      - BACKBLAZE_B2_ACCESS_KEY=your_b2_key
    depends_on:
      - postgres
      - redis
    ports:
      - "8000:8000"

  celery:
    build: ./backend
    command: celery -A app.celery worker --loglevel=info
    environment:
      - DATABASE_URL=postgresql://hesaab:secure_password@postgres:5432/hesaabplus
      - REDIS_URL=redis://redis:6379/0
    depends_on:
      - postgres
      - redis

  super-admin-frontend:
    build: ./super-admin-frontend
    ports:
      - "3000:3000"
    environment:
      - REACT_APP_API_URL=http://localhost:8000
      - REACT_APP_APP_TYPE=super-admin

  tenant-frontend:
    build: ./tenant-frontend
    ports:
      - "3001:3001"
    environment:
      - REACT_APP_API_URL=http://localhost:8000
      - REACT_APP_APP_TYPE=tenant
```

## Components and Interfaces

### Backend API Architecture

#### FastAPI Application Structure

```python
# app/main.py - Main FastAPI application
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.core.auth import get_current_user, get_super_admin_user
from app.core.database import get_db
from app.routers import (
    super_admin, tenants, auth, invoices, 
    customers, products, accounting, reports, notifications
)

app = FastAPI(title="HesaabPlus API", version="2.0.0")

# Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Super Admin Routes (Protected)
app.include_router(
    super_admin.router, 
    prefix="/api/super-admin", 
    dependencies=[Depends(get_super_admin_user)]
)

# Tenant Routes (Multi-tenant protected)
app.include_router(tenants.router, prefix="/api/tenants")
app.include_router(auth.router, prefix="/api/auth")
app.include_router(invoices.router, prefix="/api/invoices", dependencies=[Depends(get_current_user)])
app.include_router(customers.router, prefix="/api/customers", dependencies=[Depends(get_current_user)])
app.include_router(products.router, prefix="/api/products", dependencies=[Depends(get_current_user)])
app.include_router(accounting.router, prefix="/api/accounting", dependencies=[Depends(get_current_user)])
app.include_router(reports.router, prefix="/api/reports", dependencies=[Depends(get_current_user)])
app.include_router(notifications.router, prefix="/api/notifications", dependencies=[Depends(get_current_user)])
```

#### Authentication and Multi-Tenancy

```python
# app/core/auth.py - Authentication and tenant isolation
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.user import User
from app.models.tenant import Tenant
import jwt

security = HTTPBearer()

async def get_current_user(token: str = Depends(security), db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(token.credentials, JWT_SECRET_KEY, algorithms=["HS256"])
        user_id = payload.get("user_id")
        tenant_id = payload.get("tenant_id")
        is_impersonation = payload.get("is_impersonation", False)
        
        user = db.query(User).filter(
            User.id == user_id, 
            User.tenant_id == tenant_id,
            User.is_active == True
        ).first()
        
        if not user:
            raise HTTPException(status_code=401, detail="Invalid authentication")
            
        # Add tenant context to user object
        user.current_tenant_id = tenant_id
        user.is_impersonation = is_impersonation
        
        return user
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_super_admin_user(token: str = Depends(security), db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(token.credentials, JWT_SECRET_KEY, algorithms=["HS256"])
        user_id = payload.get("user_id")
        is_super_admin = payload.get("is_super_admin", False)
        
        if not is_super_admin:
            raise HTTPException(status_code=403, detail="Super admin access required")
            
        # Return super admin user object
        return {"user_id": user_id, "is_super_admin": True}
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
```

#### Database Models with Multi-Tenancy

```python
# app/models/base.py - Base model with tenant isolation
from sqlalchemy import Column, String, DateTime, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import Session
import uuid
from datetime import datetime

Base = declarative_base()

class TenantMixin:
    """Mixin to add tenant_id to all tenant-specific models"""
    tenant_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    
    @classmethod
    def get_for_tenant(cls, db: Session, tenant_id: uuid.UUID):
        """Get all records for a specific tenant"""
        return db.query(cls).filter(cls.tenant_id == tenant_id)
    
    @classmethod
    def create_for_tenant(cls, db: Session, tenant_id: uuid.UUID, **kwargs):
        """Create a new record for a specific tenant"""
        obj = cls(tenant_id=tenant_id, **kwargs)
        db.add(obj)
        db.commit()
        db.refresh(obj)
        return obj

class BaseModel(Base):
    __abstract__ = True
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_active = Column(Boolean, default=True)
```

#### Invoice System with Dual Types

```python
# app/models/invoice.py - Invoice model supporting both general and gold types
from sqlalchemy import Column, String, Decimal, Enum, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from app.models.base import BaseModel, TenantMixin
import enum

class InvoiceType(enum.Enum):
    GENERAL = "general"
    GOLD = "gold"

class InstallmentType(enum.Enum):
    NONE = "none"
    GENERAL = "general"
    GOLD = "gold"

class Invoice(BaseModel, TenantMixin):
    __tablename__ = "invoices"
    
    customer_id = Column(UUID(as_uuid=True), ForeignKey("customers.id"), nullable=False)
    invoice_number = Column(String(50), nullable=False)
    invoice_type = Column(Enum(InvoiceType), nullable=False)
    installment_type = Column(Enum(InstallmentType), default=InstallmentType.NONE)
    
    # Financial fields
    subtotal = Column(Decimal(15, 2), nullable=False, default=0)
    tax_amount = Column(Decimal(15, 2), nullable=False, default=0)
    total_amount = Column(Decimal(15, 2), nullable=False)
    
    # Gold-specific fields
    total_gold_weight = Column(Decimal(10, 3), nullable=True)  # For gold invoices
    gold_price_at_creation = Column(Decimal(15, 2), nullable=True)
    
    # Installment fields
    remaining_balance = Column(Decimal(15, 2), nullable=True)
    remaining_gold_weight = Column(Decimal(10, 3), nullable=True)
    
    # QR Code and sharing
    qr_code_token = Column(String(255), unique=True, nullable=True)
    is_shareable = Column(Boolean, default=True)
    
    # Status and metadata
    status = Column(String(20), default="draft")  # draft, sent, paid, overdue
    notes = Column(Text, nullable=True)
    
    # Relationships
    customer = relationship("Customer", back_populates="invoices")
    items = relationship("InvoiceItem", back_populates="invoice", cascade="all, delete-orphan")
    installments = relationship("Installment", back_populates="invoice", cascade="all, delete-orphan")
    
    def calculate_totals(self):
        """Calculate invoice totals based on items"""
        self.subtotal = sum(item.line_total for item in self.items)
        self.tax_amount = sum(item.vat_amount or 0 for item in self.items)
        self.total_amount = self.subtotal + self.tax_amount
        
        if self.invoice_type == InvoiceType.GOLD:
            self.total_gold_weight = sum(item.weight or 0 for item in self.items)

class InvoiceItem(BaseModel):
    __tablename__ = "invoice_items"
    
    invoice_id = Column(UUID(as_uuid=True), ForeignKey("invoices.id"), nullable=False)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id"), nullable=True)
    
    # Basic item fields
    description = Column(String(255), nullable=False)
    quantity = Column(Decimal(10, 3), nullable=False)
    unit_price = Column(Decimal(15, 2), nullable=False)
    line_total = Column(Decimal(15, 2), nullable=False)
    
    # Gold-specific fields
    weight = Column(Decimal(10, 3), nullable=True)  # گرم
    labor_fee = Column(Decimal(15, 2), nullable=True)  # اجرت
    profit = Column(Decimal(15, 2), nullable=True)  # سود
    vat_amount = Column(Decimal(15, 2), nullable=True)  # مالیات
    
    # Relationships
    invoice = relationship("Invoice", back_populates="items")
    product = relationship("Product")
```

#### Celery Task System

```python
# app/celery_app.py - Celery configuration and tasks
from celery import Celery
from app.core.config import settings
from app.core.database import SessionLocal
from app.services.backup_service import BackupService
from app.services.notification_service import NotificationService
import logging

celery_app = Celery(
    "hesaabplus",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["app.tasks"]
)

# Celery configuration
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_routes={
        "app.tasks.backup_tenant_data": {"queue": "backup"},
        "app.tasks.send_email": {"queue": "notifications"},
        "app.tasks.send_sms": {"queue": "notifications"},
        "app.tasks.process_image": {"queue": "media"},
    }
)

@celery_app.task(bind=True, max_retries=3)
def backup_tenant_data(self, tenant_id: str):
    """Daily backup task for individual tenant"""
    try:
        db = SessionLocal()
        backup_service = BackupService(db)
        result = backup_service.backup_tenant(tenant_id)
        db.close()
        return result
    except Exception as exc:
        logging.error(f"Backup failed for tenant {tenant_id}: {exc}")
        raise self.retry(exc=exc, countdown=60)

@celery_app.task(bind=True, max_retries=3)
def full_platform_backup(self):
    """Nightly full platform backup"""
    try:
        db = SessionLocal()
        backup_service = BackupService(db)
        result = backup_service.full_platform_backup()
        db.close()
        return result
    except Exception as exc:
        logging.error(f"Full platform backup failed: {exc}")
        raise self.retry(exc=exc, countdown=300)

@celery_app.task(bind=True, max_retries=3)
def send_invoice_email(self, invoice_id: str, recipient_email: str):
    """Send invoice via email"""
    try:
        db = SessionLocal()
        notification_service = NotificationService(db)
        result = notification_service.send_invoice_email(invoice_id, recipient_email)
        db.close()
        return result
    except Exception as exc:
        logging.error(f"Email sending failed for invoice {invoice_id}: {exc}")
        raise self.retry(exc=exc, countdown=60)
```

### Frontend Architecture

#### Super Admin React Application

```typescript
// super-admin-frontend/src/App.tsx - Main Super Admin application
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import Layout from '@/components/Layout';
import Dashboard from '@/pages/Dashboard';
import TenantManagement from '@/pages/TenantManagement';
import Analytics from '@/pages/Analytics';
import SystemHealth from '@/pages/SystemHealth';
import BackupRecovery from '@/pages/BackupRecovery';
import UserImpersonation from '@/pages/UserImpersonation';
import './App.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <Router>
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100" dir="rtl">
              <Layout>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/tenants" element={<TenantManagement />} />
                  <Route path="/analytics" element={<Analytics />} />
                  <Route path="/system-health" element={<SystemHealth />} />
                  <Route path="/backup-recovery" element={<BackupRecovery />} />
                  <Route path="/impersonation" element={<UserImpersonation />} />
                </Routes>
              </Layout>
              <Toaster />
            </div>
          </Router>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
```

#### Tenant React Application

```typescript
// tenant-frontend/src/App.tsx - Main Tenant application
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/contexts/AuthContext';
import { TenantProvider } from '@/contexts/TenantContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import Layout from '@/components/Layout';
import Dashboard from '@/pages/Dashboard';
import Invoices from '@/pages/Invoices';
import Customers from '@/pages/Customers';
import Products from '@/pages/Products';
import Accounting from '@/pages/Accounting';
import Reports from '@/pages/Reports';
import Settings from '@/pages/Settings';
import './App.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      cacheTime: 10 * 60 * 1000,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <TenantProvider>
            <Router>
              <div className="min-h-screen bg-gradient-to-br from-green-50/30 to-white" dir="rtl">
                <Layout>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/invoices/*" element={<Invoices />} />
                    <Route path="/customers/*" element={<Customers />} />
                    <Route path="/products/*" element={<Products />} />
                    <Route path="/accounting/*" element={<Accounting />} />
                    <Route path="/reports" element={<Reports />} />
                    <Route path="/settings/*" element={<Settings />} />
                  </Routes>
                </Layout>
                <Toaster />
              </div>
            </Router>
          </TenantProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
```

#### Shared UI Components with Gradient Design

```typescript
// shared/components/ui/Button.tsx - Enhanced button component
import React from 'react';
import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-lg text-sm font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        // Gradient variants
        'gradient-green': 'bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 text-white shadow-lg hover:shadow-xl',
        'gradient-blue': 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl',
        'gradient-purple': 'bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 text-white shadow-lg hover:shadow-xl',
        
        // Outline variants
        'outline-gradient': 'border-2 border-transparent bg-gradient-to-r from-green-500 to-teal-600 bg-clip-border hover:shadow-lg text-white',
        
        // Standard variants
        default: 'bg-slate-900 text-slate-50 hover:bg-slate-800',
        destructive: 'bg-red-500 text-slate-50 hover:bg-red-600',
        outline: 'border border-slate-200 bg-white hover:bg-slate-100 hover:text-slate-900',
        secondary: 'bg-slate-100 text-slate-900 hover:bg-slate-200',
        ghost: 'hover:bg-slate-100 hover:text-slate-900',
        link: 'text-slate-900 underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';

export { Button, buttonVariants };
```

```typescript
// shared/components/ui/Card.tsx - Enhanced card component
import React from 'react';
import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';

const cardVariants = cva(
  "rounded-xl transition-all duration-300",
  {
    variants: {
      variant: {
        // Professional cards
        professional: 'border-0 shadow-lg bg-white hover:shadow-xl',
        
        // Gradient background cards
        'gradient-green': 'border-0 shadow-lg bg-gradient-to-br from-green-50 to-teal-100/50 hover:shadow-xl',
        'gradient-blue': 'border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-100/50 hover:shadow-xl',
        'gradient-purple': 'border-0 shadow-lg bg-gradient-to-br from-purple-50 to-violet-100/50 hover:shadow-xl',
        
        // Filter/header cards
        filter: 'border-0 shadow-lg bg-gradient-to-r from-slate-50 to-slate-100/80',
        
        // Default
        default: 'border border-slate-200 bg-white shadow-sm',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ variant, className }))}
      {...props}
    />
  )
);

Card.displayName = 'Card';

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex flex-col space-y-1.5 p-6', className)}
    {...props}
  />
));

CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn('text-2xl font-semibold leading-none tracking-tight', className)}
    {...props}
  />
));

CardTitle.displayName = 'CardTitle';

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
));

CardContent.displayName = 'CardContent';

export { Card, CardHeader, CardTitle, CardContent, cardVariants };
```

## Data Models

### Database Schema Design

The system uses PostgreSQL with a comprehensive schema supporting multi-tenancy, dual invoice types, and complex financial operations:

```sql
-- Core tenant and user tables
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(255) UNIQUE,
    subscription_type VARCHAR(20) DEFAULT 'free',
    subscription_expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user',
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, email)
);

-- Business entities
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    tags JSONB DEFAULT '[]',
    total_debt DECIMAL(15,2) DEFAULT 0,
    total_gold_debt DECIMAL(10,3) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    price DECIMAL(15,2) NOT NULL,
    cost DECIMAL(15,2),
    stock_quantity INTEGER DEFAULT 0,
    images JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Invoice system
CREATE TYPE invoice_type AS ENUM ('general', 'gold');
CREATE TYPE installment_type AS ENUM ('none', 'general', 'gold');
CREATE TYPE invoice_status AS ENUM ('draft', 'sent', 'paid', 'overdue', 'cancelled');

CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id),
    invoice_number VARCHAR(50) NOT NULL,
    invoice_type invoice_type NOT NULL,
    installment_type installment_type DEFAULT 'none',
    
    -- Financial fields
    subtotal DECIMAL(15,2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(15,2) NOT NULL,
    
    -- Gold-specific fields
    total_gold_weight DECIMAL(10,3),
    gold_price_at_creation DECIMAL(15,2),
    
    -- Installment tracking
    remaining_balance DECIMAL(15,2),
    remaining_gold_weight DECIMAL(10,3),
    
    -- QR Code and sharing
    qr_code_token VARCHAR(255) UNIQUE,
    is_shareable BOOLEAN DEFAULT true,
    
    status invoice_status DEFAULT 'draft',
    notes TEXT,
    due_date DATE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(tenant_id, invoice_number)
);

CREATE TABLE invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    
    description VARCHAR(255) NOT NULL,
    quantity DECIMAL(10,3) NOT NULL,
    unit_price DECIMAL(15,2) NOT NULL,
    line_total DECIMAL(15,2) NOT NULL,
    
    -- Gold-specific fields
    weight DECIMAL(10,3),  -- وزن
    labor_fee DECIMAL(15,2),  -- اجرت
    profit DECIMAL(15,2),  -- سود
    vat_amount DECIMAL(15,2),  -- مالیات
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Installment system
CREATE TYPE installment_status AS ENUM ('pending', 'paid', 'overdue');

CREATE TABLE installments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    installment_number INTEGER NOT NULL,
    
    -- General installment fields
    amount_due DECIMAL(15,2),
    amount_paid DECIMAL(15,2) DEFAULT 0,
    
    -- Gold installment fields
    gold_weight_due DECIMAL(10,3),
    gold_weight_paid DECIMAL(10,3) DEFAULT 0,
    gold_price_at_payment DECIMAL(15,2),
    
    due_date DATE NOT NULL,
    paid_at TIMESTAMP,
    status installment_status DEFAULT 'pending',
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Accounting system
CREATE TABLE chart_of_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    account_code VARCHAR(20) NOT NULL,
    account_name VARCHAR(255) NOT NULL,
    account_type VARCHAR(50) NOT NULL, -- asset, liability, equity, revenue, expense
    parent_account_id UUID REFERENCES chart_of_accounts(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(tenant_id, account_code)
);

CREATE TABLE journal_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    entry_number VARCHAR(50) NOT NULL,
    entry_date DATE NOT NULL,
    description TEXT NOT NULL,
    reference_type VARCHAR(50), -- invoice, payment, adjustment
    reference_id UUID,
    total_amount DECIMAL(15,2) NOT NULL,
    is_posted BOOLEAN DEFAULT false,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(tenant_id, entry_number)
);

CREATE TABLE journal_entry_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    journal_entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES chart_of_accounts(id),
    debit_amount DECIMAL(15,2) DEFAULT 0,
    credit_amount DECIMAL(15,2) DEFAULT 0,
    description TEXT,
    line_number INTEGER NOT NULL
);

-- Gold price tracking
CREATE TABLE gold_prices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    price_per_gram DECIMAL(15,2) NOT NULL,
    effective_date DATE NOT NULL,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(tenant_id, effective_date)
);

-- Backup and audit tables
CREATE TABLE backup_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    backup_type VARCHAR(20) NOT NULL, -- tenant, full_platform
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT,
    storage_provider VARCHAR(50) NOT NULL, -- r2, b2
    status VARCHAR(20) DEFAULT 'in_progress',
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    is_impersonation BOOLEAN DEFAULT false,
    impersonated_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_customers_tenant_id ON customers(tenant_id);
CREATE INDEX idx_products_tenant_id ON products(tenant_id);
CREATE INDEX idx_invoices_tenant_id ON invoices(tenant_id);
CREATE INDEX idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_installments_due_date ON installments(due_date);
CREATE INDEX idx_installments_status ON installments(status);
CREATE INDEX idx_journal_entries_tenant_id ON journal_entries(tenant_id);
CREATE INDEX idx_audit_logs_tenant_id ON audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
```

### API Response Models

```typescript
// Shared TypeScript interfaces for API responses
export interface Tenant {
  id: string;
  name: string;
  domain?: string;
  subscription_type: 'free' | 'pro';
  subscription_expires_at?: string;
  is_active: boolean;
  created_at: string;
  user_count: number;
  invoice_count: number;
  monthly_revenue: number;
}

export interface User {
  id: string;
  tenant_id: string;
  email: string;
  role: string;
  is_active: boolean;
  last_login?: string;
  created_at: string;
}

export interface Invoice {
  id: string;
  tenant_id: string;
  customer_id: string;
  invoice_number: string;
  invoice_type: 'general' | 'gold';
  installment_type: 'none' | 'general' | 'gold';
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  total_gold_weight?: number;
  gold_price_at_creation?: number;
  remaining_balance?: number;
  remaining_gold_weight?: number;
  qr_code_token?: string;
  is_shareable: boolean;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  due_date?: string;
  created_at: string;
  customer: Customer;
  items: InvoiceItem[];
  installments: Installment[];
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  product_id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  weight?: number;  // For gold items
  labor_fee?: number;  // اجرت
  profit?: number;  // سود
  vat_amount?: number;  // مالیات
  product?: Product;
}

export interface Installment {
  id: string;
  invoice_id: string;
  installment_number: number;
  amount_due?: number;
  amount_paid: number;
  gold_weight_due?: number;
  gold_weight_paid: number;
  gold_price_at_payment?: number;
  due_date: string;
  paid_at?: string;
  status: 'pending' | 'paid' | 'overdue';
  notes?: string;
}

export interface Customer {
  id: string;
  tenant_id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  tags: string[];
  total_debt: number;
  total_gold_debt: number;
  created_at: string;
}

export interface Product {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  category?: string;
  price: number;
  cost?: number;
  stock_quantity: number;
  images: string[];
  is_active: boolean;
  created_at: string;
}
```

## Error Handling

### Backend Error Handling

```python
# app/core/exceptions.py - Custom exception handling
from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError
import logging

class TenantNotFoundError(Exception):
    def __init__(self, tenant_id: str):
        self.tenant_id = tenant_id
        super().__init__(f"Tenant {tenant_id} not found")

class SubscriptionLimitExceededError(Exception):
    def __init__(self, limit_type: str, current: int, max_allowed: int):
        self.limit_type = limit_type
        self.current = current
        self.max_allowed = max_allowed
        super().__init__(f"{limit_type} limit exceeded: {current}/{max_allowed}")

class InsufficientPermissionsError(Exception):
    def __init__(self, required_permission: str):
        self.required_permission = required_permission
        super().__init__(f"Insufficient permissions: {required_permission} required")

async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler for the FastAPI application"""
    
    # Log the error
    logging.error(f"Unhandled exception: {exc}", exc_info=True)
    
    # Handle specific exceptions
    if isinstance(exc, TenantNotFoundError):
        return JSONResponse(
            status_code=404,
            content={"detail": "Tenant not found", "error_code": "TENANT_NOT_FOUND"}
        )
    
    if isinstance(exc, SubscriptionLimitExceededError):
        return JSONResponse(
            status_code=403,
            content={
                "detail": f"Subscription limit exceeded for {exc.limit_type}",
                "error_code": "SUBSCRIPTION_LIMIT_EXCEEDED",
                "current": exc.current,
                "max_allowed": exc.max_allowed
            }
        )
    
    if isinstance(exc, InsufficientPermissionsError):
        return JSONResponse(
            status_code=403,
            content={
                "detail": "Insufficient permissions",
                "error_code": "INSUFFICIENT_PERMISSIONS",
                "required_permission": exc.required_permission
            }
        )
    
    if isinstance(exc, IntegrityError):
        return JSONResponse(
            status_code=400,
            content={"detail": "Data integrity error", "error_code": "INTEGRITY_ERROR"}
        )
    
    # Default error response
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "error_code": "INTERNAL_ERROR"}
    )
```

### Frontend Error Handling

```typescript
// shared/hooks/useErrorHandler.ts - Centralized error handling
import { useToast } from '@/components/ui/use-toast';
import { useCallback } from 'react';

interface ApiError {
  detail: string;
  error_code?: string;
  [key: string]: any;
}

export const useErrorHandler = () => {
  const { toast } = useToast();

  const handleError = useCallback((error: any) => {
    let message = 'خطای غیرمنتظره‌ای رخ داد';
    let title = 'خطا';

    if (error?.response?.data) {
      const apiError: ApiError = error.response.data;
      
      switch (apiError.error_code) {
        case 'TENANT_NOT_FOUND':
          message = 'کسب‌وکار مورد نظر یافت نشد';
          break;
        case 'SUBSCRIPTION_LIMIT_EXCEEDED':
          message = `محدودیت اشتراک برای ${apiError.limit_type} به پایان رسیده است`;
          title = 'محدودیت اشتراک';
          break;
        case 'INSUFFICIENT_PERMISSIONS':
          message = 'شما دسترسی لازم برای این عملیات را ندارید';
          title = 'عدم دسترسی';
          break;
        case 'INTEGRITY_ERROR':
          message = 'خطا در اعتبارسنجی داده‌ها';
          break;
        default:
          message = apiError.detail || message;
      }
    } else if (error?.message) {
      message = error.message;
    }

    toast({
      title,
      description: message,
      variant: 'destructive',
    });
  }, [toast]);

  return { handleError };
};
```

## Testing Strategy

### Backend Testing

```python
# tests/conftest.py - Test configuration and fixtures
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.core.database import get_db, Base
from app.models.tenant import Tenant
from app.models.user import User
import uuid

# Test database setup
SQLALCHEMY_DATABASE_URL = "postgresql://test:test@localhost:5433/hesaabplus_test"
engine = create_engine(SQLALCHEMY_DATABASE_URL)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="session")
def db_engine():
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)

@pytest.fixture
def db_session(db_engine):
    connection = db_engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    yield session
    session.close()
    transaction.rollback()
    connection.close()

@pytest.fixture
def client(db_session):
    def override_get_db():
        yield db_session
    
    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()

@pytest.fixture
def test_tenant(db_session):
    tenant = Tenant(
        id=uuid.uuid4(),
        name="Test Business",
        subscription_type="pro",
        is_active=True
    )
    db_session.add(tenant)
    db_session.commit()
    db_session.refresh(tenant)
    return tenant

@pytest.fixture
def test_user(db_session, test_tenant):
    user = User(
        id=uuid.uuid4(),
        tenant_id=test_tenant.id,
        email="test@example.com",
        password_hash="hashed_password",
        role="admin",
        is_active=True
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user

# tests/test_invoices.py - Invoice system tests
import pytest
from app.models.invoice import Invoice, InvoiceItem, InvoiceType
from app.models.customer import Customer
from app.models.product import Product

class TestInvoiceSystem:
    
    def test_create_general_invoice(self, db_session, test_tenant, test_user):
        # Create test customer
        customer = Customer(
            tenant_id=test_tenant.id,
            name="Test Customer",
            email="customer@test.com"
        )
        db_session.add(customer)
        db_session.commit()
        
        # Create test product
        product = Product(
            tenant_id=test_tenant.id,
            name="Test Product",
            price=100.00,
            stock_quantity=10
        )
        db_session.add(product)
        db_session.commit()
        
        # Create invoice
        invoice = Invoice(
            tenant_id=test_tenant.id,
            customer_id=customer.id,
            invoice_number="INV-001",
            invoice_type=InvoiceType.GENERAL,
            total_amount=100.00
        )
        db_session.add(invoice)
        db_session.commit()
        
        # Add invoice item
        item = InvoiceItem(
            invoice_id=invoice.id,
            product_id=product.id,
            description="Test Product",
            quantity=1,
            unit_price=100.00,
            line_total=100.00
        )
        db_session.add(item)
        db_session.commit()
        
        # Verify invoice creation
        assert invoice.id is not None
        assert invoice.invoice_type == InvoiceType.GENERAL
        assert invoice.total_amount == 100.00
        assert len(invoice.items) == 1
    
    def test_create_gold_invoice(self, db_session, test_tenant):
        # Create customer
        customer = Customer(
            tenant_id=test_tenant.id,
            name="Gold Customer",
            email="gold@test.com"
        )
        db_session.add(customer)
        db_session.commit()
        
        # Create gold invoice
        invoice = Invoice(
            tenant_id=test_tenant.id,
            customer_id=customer.id,
            invoice_number="GOLD-001",
            invoice_type=InvoiceType.GOLD,
            total_amount=1000.00,
            total_gold_weight=2.5,
            gold_price_at_creation=400.00
        )
        db_session.add(invoice)
        db_session.commit()
        
        # Add gold invoice item
        item = InvoiceItem(
            invoice_id=invoice.id,
            description="Gold Ring",
            quantity=1,
            unit_price=1000.00,
            line_total=1000.00,
            weight=2.5,
            labor_fee=100.00,
            profit=50.00,
            vat_amount=95.00
        )
        db_session.add(item)
        db_session.commit()
        
        # Verify gold invoice
        assert invoice.invoice_type == InvoiceType.GOLD
        assert invoice.total_gold_weight == 2.5
        assert item.weight == 2.5
        assert item.labor_fee == 100.00
    
    def test_tenant_data_isolation(self, db_session):
        # Create two tenants
        tenant1 = Tenant(name="Tenant 1", is_active=True)
        tenant2 = Tenant(name="Tenant 2", is_active=True)
        db_session.add_all([tenant1, tenant2])
        db_session.commit()
        
        # Create customers for each tenant
        customer1 = Customer(tenant_id=tenant1.id, name="Customer 1")
        customer2 = Customer(tenant_id=tenant2.id, name="Customer 2")
        db_session.add_all([customer1, customer2])
        db_session.commit()
        
        # Verify data isolation
        tenant1_customers = Customer.get_for_tenant(db_session, tenant1.id).all()
        tenant2_customers = Customer.get_for_tenant(db_session, tenant2.id).all()
        
        assert len(tenant1_customers) == 1
        assert len(tenant2_customers) == 1
        assert tenant1_customers[0].name == "Customer 1"
        assert tenant2_customers[0].name == "Customer 2"
```

### Frontend Testing

```typescript
// tests/components/Invoice.test.tsx - Frontend component tests
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import InvoiceForm from '@/components/invoices/InvoiceForm';
import { vi } from 'vitest';

// Mock API calls
vi.mock('@/services/api', () => ({
  createInvoice: vi.fn(),
  getCustomers: vi.fn(),
  getProducts: vi.fn(),
}));

const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('InvoiceForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders invoice type selection', () => {
    render(
      <TestWrapper>
        <InvoiceForm />
      </TestWrapper>
    );

    expect(screen.getByText('نوع فاکتور')).toBeInTheDocument();
    expect(screen.getByText('فاکتور عمومی')).toBeInTheDocument();
    expect(screen.getByText('فاکتور طلا')).toBeInTheDocument();
  });

  test('shows gold-specific fields when gold invoice is selected', async () => {
    render(
      <TestWrapper>
        <InvoiceForm />
      </TestWrapper>
    );

    // Select gold invoice type
    fireEvent.click(screen.getByText('فاکتور طلا'));

    await waitFor(() => {
      expect(screen.getByText('وزن (گرم)')).toBeInTheDocument();
      expect(screen.getByText('اجرت')).toBeInTheDocument();
      expect(screen.getByText('سود')).toBeInTheDocument();
      expect(screen.getByText('مالیات')).toBeInTheDocument();
    });
  });

  test('calculates totals correctly for general invoice', async () => {
    const mockCreateInvoice = vi.fn().mockResolvedValue({ id: '123' });
    vi.mocked(require('@/services/api').createInvoice).mockImplementation(mockCreateInvoice);

    render(
      <TestWrapper>
        <InvoiceForm />
      </TestWrapper>
    );

    // Fill in invoice details
    fireEvent.change(screen.getByLabelText('توضیحات'), {
      target: { value: 'Test Product' }
    });
    fireEvent.change(screen.getByLabelText('تعداد'), {
      target: { value: '2' }
    });
    fireEvent.change(screen.getByLabelText('قیمت واحد'), {
      target: { value: '100' }
    });

    // Check calculated total
    await waitFor(() => {
      expect(screen.getByDisplayValue('200')).toBeInTheDocument();
    });
  });

  test('handles form submission correctly', async () => {
    const mockCreateInvoice = vi.fn().mockResolvedValue({ id: '123' });
    vi.mocked(require('@/services/api').createInvoice).mockImplementation(mockCreateInvoice);

    render(
      <TestWrapper>
        <InvoiceForm />
      </TestWrapper>
    );

    // Fill and submit form
    fireEvent.change(screen.getByLabelText('شماره فاکتور'), {
      target: { value: 'INV-001' }
    });
    fireEvent.click(screen.getByText('ذخیره فاکتور'));

    await waitFor(() => {
      expect(mockCreateInvoice).toHaveBeenCalledWith(
        expect.objectContaining({
          invoice_number: 'INV-001',
          invoice_type: 'general'
        })
      );
    });
  });
});

// tests/integration/invoice-flow.test.tsx - Integration tests
describe('Invoice Creation Flow', () => {
  test('complete invoice creation and payment flow', async () => {
    // Mock API responses
    const mockCustomers = [{ id: '1', name: 'Test Customer' }];
    const mockProducts = [{ id: '1', name: 'Test Product', price: 100 }];
    const mockInvoice = { id: '123', invoice_number: 'INV-001', total_amount: 200 };

    vi.mocked(require('@/services/api').getCustomers).mockResolvedValue(mockCustomers);
    vi.mocked(require('@/services/api').getProducts).mockResolvedValue(mockProducts);
    vi.mocked(require('@/services/api').createInvoice).mockResolvedValue(mockInvoice);

    render(
      <TestWrapper>
        <InvoiceForm />
      </TestWrapper>
    );

    // Select customer
    fireEvent.click(screen.getByText('انتخاب مشتری'));
    await waitFor(() => {
      fireEvent.click(screen.getByText('Test Customer'));
    });

    // Add product
    fireEvent.click(screen.getByText('افزودن محصول'));
    await waitFor(() => {
      fireEvent.click(screen.getByText('Test Product'));
    });

    // Set quantity
    fireEvent.change(screen.getByLabelText('تعداد'), {
      target: { value: '2' }
    });

    // Submit invoice
    fireEvent.click(screen.getByText('ذخیره فاکتور'));

    await waitFor(() => {
      expect(screen.getByText('فاکتور با موفقیت ایجاد شد')).toBeInTheDocument();
    });
  });
});
```

This comprehensive design document covers all aspects of the HesaabPlus platform including architecture, database design, API structure, frontend components, error handling, and testing strategies. The design ensures proper multi-tenancy, supports both general and gold-specific business operations, and follows modern development practices with Docker containerization and comprehensive testing coverage.

<function_calls>
<invoke name="userInput">
<parameter name="question">**Does the design look good? If so, we can move on to the implementation plan.**