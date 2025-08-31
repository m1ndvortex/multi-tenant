"""
HesaabPlus FastAPI Application
Multi-tenant SaaS platform for business management
"""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
import time
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI application
app = FastAPI(
    title="HesaabPlus API",
    description="Multi-tenant business management platform with Persian RTL support",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Security middleware
app.add_middleware(
    TrustedHostMiddleware, 
    allowed_hosts=["localhost", "127.0.0.1", "*.hesaabplus.com"]
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Super Admin Frontend
        "http://localhost:3001",  # Tenant Frontend
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["*"],
)

# Request timing middleware
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    return response

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint for Docker health checks"""
    return {
        "status": "healthy",
        "service": "hesaabplus-backend",
        "version": "2.0.0",
        "timestamp": time.time()
    }

# Root endpoint
@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "message": "HesaabPlus API v2.0.0",
        "description": "Multi-tenant business management platform",
        "docs": "/docs",
        "health": "/health"
    }

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error",
            "type": "internal_error"
        }
    )

# Startup event
@app.on_event("startup")
async def startup_event():
    logger.info("HesaabPlus API starting up...")
    # Database connection will be initialized here in future tasks

# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    logger.info("HesaabPlus API shutting down...")
    # Cleanup will be handled here in future tasks

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)