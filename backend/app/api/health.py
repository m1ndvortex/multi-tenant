"""
Health check endpoints
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db, check_database_connection
from app.core.redis_client import redis_client
from app.core.config import settings
from app.tasks.health_tasks import system_health_check
import time
import psutil
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/health", tags=["Health"])


@router.get("/")
async def basic_health_check():
    """Basic health check endpoint for Docker health checks"""
    return {
        "status": "healthy",
        "service": "hesaabplus-backend",
        "version": settings.app_version,
        "timestamp": time.time()
    }


@router.get("/detailed")
async def detailed_health_check(db: Session = Depends(get_db)):
    """Detailed health check with database and Redis status"""
    health_status = {
        "status": "healthy",
        "service": "hesaabplus-backend",
        "version": settings.app_version,
        "timestamp": time.time(),
        "checks": {
            "database": {"status": "unknown", "response_time": 0},
            "redis": {"status": "unknown", "response_time": 0},
            "system": {
                "cpu_percent": 0,
                "memory_percent": 0,
                "disk_usage": 0
            }
        }
    }
    
    # Check database connection
    try:
        start_time = time.time()
        db_healthy = await check_database_connection()
        response_time = (time.time() - start_time) * 1000  # Convert to milliseconds
        
        health_status["checks"]["database"] = {
            "status": "healthy" if db_healthy else "unhealthy",
            "response_time": round(response_time, 2)
        }
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        health_status["checks"]["database"] = {
            "status": "unhealthy",
            "response_time": 0,
            "error": str(e)
        }
    
    # Check Redis connection
    try:
        start_time = time.time()
        redis_healthy = await redis_client.check_connection()
        response_time = (time.time() - start_time) * 1000
        
        health_status["checks"]["redis"] = {
            "status": "healthy" if redis_healthy else "unhealthy",
            "response_time": round(response_time, 2)
        }
    except Exception as e:
        logger.error(f"Redis health check failed: {e}")
        health_status["checks"]["redis"] = {
            "status": "unhealthy",
            "response_time": 0,
            "error": str(e)
        }
    
    # Get system metrics
    try:
        health_status["checks"]["system"] = {
            "cpu_percent": round(psutil.cpu_percent(interval=0.1), 2),
            "memory_percent": round(psutil.virtual_memory().percent, 2),
            "disk_usage": round(psutil.disk_usage('/').percent, 2)
        }
    except Exception as e:
        logger.error(f"System metrics check failed: {e}")
        health_status["checks"]["system"]["error"] = str(e)
    
    # Determine overall status
    database_ok = health_status["checks"]["database"]["status"] == "healthy"
    redis_ok = health_status["checks"]["redis"]["status"] == "healthy"
    
    if not (database_ok and redis_ok):
        health_status["status"] = "unhealthy"
    elif (health_status["checks"]["system"]["cpu_percent"] > 80 or
          health_status["checks"]["system"]["memory_percent"] > 80 or
          health_status["checks"]["system"]["disk_usage"] > 90):
        health_status["status"] = "degraded"
    
    return health_status


@router.get("/system")
async def system_health():
    """Get comprehensive system health information"""
    try:
        # Try to get cached health data first
        cached_health = redis_client.get("system:health")
        if cached_health:
            return cached_health
        
        # If no cached data, trigger health check task
        task = system_health_check.delay()
        
        return {
            "status": "checking",
            "message": "System health check in progress",
            "task_id": task.id
        }
    except Exception as e:
        logger.error(f"System health check failed: {e}")
        raise HTTPException(status_code=500, detail="System health check failed")


@router.get("/readiness")
async def readiness_check(db: Session = Depends(get_db)):
    """Kubernetes readiness probe endpoint"""
    try:
        # Check if all critical services are ready
        db_ready = await check_database_connection()
        redis_ready = await redis_client.check_connection()
        
        if db_ready and redis_ready:
            return {"status": "ready"}
        else:
            raise HTTPException(
                status_code=503,
                detail={
                    "status": "not_ready",
                    "database": db_ready,
                    "redis": redis_ready
                }
            )
    except Exception as e:
        logger.error(f"Readiness check failed: {e}")
        raise HTTPException(status_code=503, detail="Service not ready")


@router.get("/liveness")
async def liveness_check():
    """Kubernetes liveness probe endpoint"""
    try:
        # Basic liveness check - just ensure the application is running
        return {
            "status": "alive",
            "timestamp": time.time(),
            "uptime": time.time() - getattr(liveness_check, 'start_time', time.time())
        }
    except Exception as e:
        logger.error(f"Liveness check failed: {e}")
        raise HTTPException(status_code=500, detail="Service not alive")


# Set start time for uptime calculation
liveness_check.start_time = time.time()