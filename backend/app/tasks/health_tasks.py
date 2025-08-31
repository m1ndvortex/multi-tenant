"""
Health check and maintenance tasks
"""

from celery import current_task
from app.celery_app import celery_app
from app.core.redis_client import redis_client
from app.core.database import check_database_connection
import logging
import psutil
import time

logger = logging.getLogger(__name__)


@celery_app.task(bind=True, name="app.tasks.cleanup_expired_sessions")
def cleanup_expired_sessions(self):
    """Clean up expired user sessions from Redis"""
    try:
        # This will be implemented when authentication is added
        logger.info("Cleaning up expired sessions")
        
        # For now, just return success
        return {
            "status": "success",
            "message": "Session cleanup completed",
            "cleaned_sessions": 0
        }
    except Exception as exc:
        logger.error(f"Session cleanup failed: {exc}")
        raise self.retry(exc=exc, countdown=60, max_retries=3)


@celery_app.task(bind=True, name="app.tasks.system_health_check")
def system_health_check(self):
    """Perform comprehensive system health check"""
    try:
        health_data = {
            "timestamp": time.time(),
            "database": False,
            "redis": False,
            "cpu_percent": 0,
            "memory_percent": 0,
            "disk_usage": 0,
            "status": "unhealthy"
        }
        
        # Check database connection
        from app.core.database import SessionLocal
        from sqlalchemy import text
        try:
            db = SessionLocal()
            db.execute(text("SELECT 1"))
            db.close()
            health_data["database"] = True
        except Exception:
            health_data["database"] = False
        
        # Check Redis connection
        try:
            redis_client.redis_client.ping()
            health_data["redis"] = True
        except Exception:
            health_data["redis"] = False
        
        # Get system metrics
        health_data["cpu_percent"] = psutil.cpu_percent(interval=1)
        health_data["memory_percent"] = psutil.virtual_memory().percent
        health_data["disk_usage"] = psutil.disk_usage('/').percent
        
        # Determine overall status
        if health_data["database"] and health_data["redis"]:
            if (health_data["cpu_percent"] < 80 and 
                health_data["memory_percent"] < 80 and 
                health_data["disk_usage"] < 90):
                health_data["status"] = "healthy"
            else:
                health_data["status"] = "degraded"
        
        # Store health data in Redis for monitoring
        redis_client.set("system:health", health_data, expire=300)  # 5 minutes
        
        logger.info(f"System health check completed: {health_data['status']}")
        return health_data
        
    except Exception as exc:
        logger.error(f"System health check failed: {exc}")
        raise self.retry(exc=exc, countdown=60, max_retries=3)