"""
HesaabPlus FastAPI Application
Multi-tenant SaaS platform for business management with Persian RTL support
"""

from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import time
import logging
import sys

# Import core modules
from app.core.config import settings
from app.core.database import create_database_tables, check_database_connection
from app.core.redis_client import redis_client
from app.core.tenant_context import TenantMiddleware
from app.core.middleware import PermissionMiddleware, TenantIsolationMiddleware

# Import API routers
from app.api.health import router as health_router
from app.api.auth import router as auth_router
from app.api.tenant_management import router as tenant_router
from app.api.user_management import router as user_management_router
from app.api.super_admin import router as super_admin_router
from app.api.analytics import router as analytics_router
from app.api.impersonation import router as impersonation_router
from app.api.backup import router as backup_router
from app.api.restore import router as restore_router
from app.api.disaster_recovery import router as disaster_recovery_router
from app.api.customer_backup import router as customer_backup_router
from app.api.subscription import router as subscription_router
from app.api.customers import router as customers_router

# Configure logging
import os
os.makedirs("/app/logs", exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler("/app/logs/app.log")
    ]
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    # Startup
    logger.info("HesaabPlus API starting up...")
    
    try:
        # Initialize database tables
        create_database_tables()
        logger.info("Database tables initialized")
        
        # Check database connection
        try:
            from app.core.database import SessionLocal
            from sqlalchemy import text
            db = SessionLocal()
            db.execute(text("SELECT 1"))
            db.close()
            logger.info("Database connection successful")
        except Exception as e:
            logger.error(f"Database connection failed during startup: {e}")
            raise Exception("Database connection failed")
        
        # Check Redis connection
        try:
            redis_client.redis_client.ping()
            logger.info("Redis connection successful")
        except Exception as e:
            logger.error(f"Redis connection failed during startup: {e}")
            raise Exception("Redis connection failed")
        
        logger.info("All services initialized successfully")
        
    except Exception as e:
        logger.error(f"Startup failed: {e}")
        raise
    
    yield
    
    # Shutdown
    logger.info("HesaabPlus API shutting down...")
    # Cleanup will be handled here in future tasks


# Create FastAPI application
app = FastAPI(
    title=settings.app_name,
    description="Multi-tenant business management platform with Persian RTL support",
    version=settings.app_version,
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# Security middleware
app.add_middleware(
    TrustedHostMiddleware, 
    allowed_hosts=["localhost", "127.0.0.1", "*.hesaabplus.com", "*"]
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["*"],
)

# Tenant context middleware
app.add_middleware(TenantMiddleware)

# Permission validation middleware
app.add_middleware(PermissionMiddleware)

# Tenant isolation middleware
app.add_middleware(TenantIsolationMiddleware)

# Request timing and logging middleware
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    
    # Log request
    logger.info(f"Request: {request.method} {request.url}")
    
    response = await call_next(request)
    
    # Calculate and add process time
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(round(process_time, 4))
    
    # Log response
    logger.info(f"Response: {response.status_code} - {round(process_time * 1000, 2)}ms")
    
    # Record API metrics for monitoring
    try:
        from app.services.monitoring_service import MonitoringService
        monitoring_service = MonitoringService()
        
        # Extract tenant ID from request if available
        tenant_id = None
        if hasattr(request.state, 'current_user') and hasattr(request.state.current_user, 'tenant_id'):
            tenant_id = str(request.state.current_user.tenant_id)
        
        monitoring_service.record_api_metrics(
            endpoint=str(request.url.path),
            method=request.method,
            response_time_ms=process_time * 1000,
            status_code=response.status_code,
            tenant_id=tenant_id
        )
    except Exception as e:
        logger.warning(f"Failed to record API metrics: {e}")
    
    return response

# Include API routers
app.include_router(health_router, prefix="/api")
app.include_router(auth_router, prefix="/api")
app.include_router(tenant_router, prefix="/api")
app.include_router(user_management_router)
app.include_router(super_admin_router, prefix="/api")
app.include_router(analytics_router, prefix="/api")
app.include_router(impersonation_router, prefix="/api")
app.include_router(backup_router)
app.include_router(restore_router)
app.include_router(disaster_recovery_router, prefix="/api/super-admin")
app.include_router(customer_backup_router)
app.include_router(subscription_router)
app.include_router(customers_router)

# Root endpoint
@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "message": f"{settings.app_name} v{settings.app_version}",
        "description": "Multi-tenant business management platform with Persian RTL support",
        "docs": "/docs",
        "redoc": "/redoc",
        "health": "/api/health",
        "detailed_health": "/api/health/detailed",
        "system_health": "/api/health/system"
    }

# API status endpoint
@app.get("/api")
async def api_status():
    """API status and available endpoints"""
    return {
        "status": "operational",
        "version": settings.app_version,
        "endpoints": {
            "health": "/api/health",
            "detailed_health": "/api/health/detailed",
            "system_health": "/api/health/system",
            "readiness": "/api/health/readiness",
            "liveness": "/api/health/liveness",
            "auth": "/api/auth",
            "login": "/api/auth/login",
            "super_admin_login": "/api/auth/super-admin/login"
        },
        "features": {
            "multi_tenant": True,
            "persian_rtl": True,
            "dual_invoice_system": True,
            "gold_installments": True,
            "backup_recovery": True,
            "real_time_notifications": True
        }
    }

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global exception on {request.method} {request.url}: {exc}", exc_info=True)
    
    # Don't expose internal errors in production
    if settings.debug:
        return JSONResponse(
            status_code=500,
            content={
                "detail": str(exc),
                "type": "internal_error",
                "path": str(request.url)
            }
        )
    else:
        return JSONResponse(
            status_code=500,
            content={
                "detail": "Internal server error",
                "type": "internal_error"
            }
        )

# HTTP exception handler
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    logger.warning(f"HTTP exception on {request.method} {request.url}: {exc.status_code} - {exc.detail}")
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "detail": exc.detail,
            "type": "http_error",
            "status_code": exc.status_code
        }
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.debug,
        log_level="info"
    )