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
    include=[
        "app.tasks",
        "app.tasks.customer_backup_tasks"
    ]
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
        "app.tasks.validate_backup_integrity_task": {"queue": "backup"},
        "app.tasks.customer_backup_tasks.create_customer_backup_task": {"queue": "customer_backup"},
        "app.tasks.customer_backup_tasks.cleanup_expired_customer_backups_task": {"queue": "maintenance"},
        "app.tasks.create_disaster_recovery_backup": {"queue": "disaster_recovery"},
        "app.tasks.verify_disaster_recovery_backup": {"queue": "disaster_recovery"},
        "app.tasks.automated_disaster_recovery_verification": {"queue": "disaster_recovery"},
        "app.tasks.disaster_recovery_monitoring": {"queue": "monitoring"},
        "app.tasks.restore_single_tenant_task": {"queue": "restore"},
        "app.tasks.restore_multiple_tenants_task": {"queue": "restore"},
        "app.tasks.restore_all_tenants_task": {"queue": "restore"},
        "app.tasks.cleanup_restore_files_task": {"queue": "maintenance"},
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
        "nightly-disaster-recovery-backup": {
            "task": "app.tasks.create_disaster_recovery_backup",
            "schedule": 60.0 * 60.0 * 24.0,  # Daily at 2 AM
            "options": {"eta": "02:00"}
        },
        "weekly-disaster-recovery-verification": {
            "task": "app.tasks.automated_disaster_recovery_verification",
            "schedule": 60.0 * 60.0 * 24.0 * 7.0,  # Weekly on Sunday at 3 AM
            "options": {"eta": "03:00"}
        },
        "hourly-disaster-recovery-monitoring": {
            "task": "app.tasks.disaster_recovery_monitoring",
            "schedule": 60.0 * 60.0,  # Hourly
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
        "cleanup-restore-files": {
            "task": "app.tasks.periodic_restore_cleanup",
            "schedule": 60.0 * 60.0 * 24.0,  # Daily at 3 AM
            "options": {"eta": "03:00"}
        },
        "cleanup-expired-customer-backups": {
            "task": "app.tasks.customer_backup_tasks.cleanup_expired_customer_backups_task",
            "schedule": 60.0 * 60.0 * 6.0,  # Every 6 hours
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
    "app.tasks.create_disaster_recovery_backup": {
        "rate_limit": "1/h",
        "time_limit": 1800,  # 30 minutes
        "soft_time_limit": 1500,  # 25 minutes
    },
    "app.tasks.verify_disaster_recovery_backup": {
        "rate_limit": "10/m",
        "time_limit": 300,  # 5 minutes
        "soft_time_limit": 240,  # 4 minutes
    },
    "app.tasks.automated_disaster_recovery_verification": {
        "rate_limit": "1/h",
        "time_limit": 600,  # 10 minutes
        "soft_time_limit": 540,  # 9 minutes
    },
    "app.tasks.disaster_recovery_monitoring": {
        "rate_limit": "12/h",
        "time_limit": 120,  # 2 minutes
        "soft_time_limit": 90,  # 1.5 minutes
    },
    "app.tasks.validate_backup_integrity_task": {
        "rate_limit": "20/m",
        "time_limit": 180,  # 3 minutes
        "soft_time_limit": 150,  # 2.5 minutes
    },
    "app.tasks.restore_single_tenant_task": {
        "rate_limit": "5/m",
        "time_limit": 600,  # 10 minutes
        "soft_time_limit": 540,  # 9 minutes
    },
    "app.tasks.restore_multiple_tenants_task": {
        "rate_limit": "2/m",
        "time_limit": 1800,  # 30 minutes
        "soft_time_limit": 1500,  # 25 minutes
    },
    "app.tasks.restore_all_tenants_task": {
        "rate_limit": "1/h",
        "time_limit": 3600,  # 60 minutes
        "soft_time_limit": 3300,  # 55 minutes
    },
    "app.tasks.cleanup_restore_files_task": {
        "rate_limit": "1/h",
        "time_limit": 300,  # 5 minutes
        "soft_time_limit": 240,  # 4 minutes
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
    "app.tasks.customer_backup_tasks.create_customer_backup_task": {
        "rate_limit": "10/m",
        "time_limit": 300,  # 5 minutes
        "soft_time_limit": 240,  # 4 minutes
        "retry_kwargs": {"max_retries": 3, "countdown": 60},
    },
    "app.tasks.customer_backup_tasks.cleanup_expired_customer_backups_task": {
        "rate_limit": "1/h",
        "time_limit": 300,  # 5 minutes
        "soft_time_limit": 240,  # 4 minutes
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