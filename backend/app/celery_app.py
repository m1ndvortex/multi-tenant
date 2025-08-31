"""
Celery application configuration
"""

from celery import Celery
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

# Create Celery application
celery_app = Celery(
    "hesaabplus",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
    include=["app.tasks"]
)

# Celery configuration
celery_app.conf.update(
    # Serialization
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    
    # Timezone
    timezone="UTC",
    enable_utc=True,
    
    # Task routing
    task_routes={
        "app.tasks.backup_tenant_data": {"queue": "backup"},
        "app.tasks.full_platform_backup": {"queue": "backup"},
        "app.tasks.send_email": {"queue": "notifications"},
        "app.tasks.send_sms": {"queue": "notifications"},
        "app.tasks.process_image": {"queue": "media"},
        "app.tasks.generate_report": {"queue": "reports"},
    },
    
    # Task execution
    task_always_eager=False,
    task_eager_propagates=True,
    task_ignore_result=False,
    task_store_eager_result=True,
    
    # Worker configuration
    worker_prefetch_multiplier=1,
    worker_max_tasks_per_child=1000,
    worker_disable_rate_limits=False,
    
    # Result backend
    result_expires=3600,  # 1 hour
    result_persistent=True,
    
    # Beat schedule for periodic tasks
    beat_schedule={
        "daily-tenant-backups": {
            "task": "app.tasks.backup_all_tenants",
            "schedule": 60.0 * 60.0 * 24.0,  # Daily at midnight
        },
        "nightly-platform-backup": {
            "task": "app.tasks.full_platform_backup",
            "schedule": 60.0 * 60.0 * 24.0,  # Daily at 2 AM
            "options": {"eta": "02:00"}
        },
        "cleanup-expired-sessions": {
            "task": "app.tasks.cleanup_expired_sessions",
            "schedule": 60.0 * 60.0,  # Hourly
        },
        "send-installment-reminders": {
            "task": "app.tasks.send_installment_reminders",
            "schedule": 60.0 * 60.0 * 24.0,  # Daily at 9 AM
            "options": {"eta": "09:00"}
        },
    },
)

# Task annotations for specific configurations
celery_app.conf.task_annotations = {
    "app.tasks.backup_tenant_data": {
        "rate_limit": "10/m",
        "time_limit": 300,  # 5 minutes
        "soft_time_limit": 240,  # 4 minutes
    },
    "app.tasks.full_platform_backup": {
        "rate_limit": "1/h",
        "time_limit": 1800,  # 30 minutes
        "soft_time_limit": 1500,  # 25 minutes
    },
    "app.tasks.send_email": {
        "rate_limit": "100/m",
        "time_limit": 30,
        "retry_kwargs": {"max_retries": 3, "countdown": 60},
    },
    "app.tasks.send_sms": {
        "rate_limit": "50/m",
        "time_limit": 30,
        "retry_kwargs": {"max_retries": 3, "countdown": 60},
    },
}


@celery_app.task(bind=True)
def debug_task(self):
    """Debug task for testing Celery functionality"""
    logger.info(f"Request: {self.request!r}")
    return {"status": "success", "message": "Celery is working correctly"}


# Celery signals
@celery_app.on_after_configure.connect
def setup_periodic_tasks(sender, **kwargs):
    """Setup periodic tasks after Celery configuration"""
    logger.info("Celery periodic tasks configured")


@celery_app.on_after_finalize.connect
def setup_celery_logging(sender, **kwargs):
    """Setup Celery logging"""
    logger.info("Celery application finalized and ready")