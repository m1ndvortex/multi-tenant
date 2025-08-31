"""
Celery tasks for activity logging and user management operations
"""

from celery import current_app as celery_app
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import uuid
import logging

from ..core.database import SessionLocal
from ..models.activity_log import ActivityLog
from ..models.user import User
from ..models.tenant import Tenant


logger = logging.getLogger(__name__)


@celery_app.task(bind=True, max_retries=3)
def log_user_activity(
    self,
    user_id: str,
    tenant_id: str,
    action: str,
    resource_type: str = None,
    resource_id: str = None,
    details: dict = None,
    ip_address: str = None,
    user_agent: str = None,
    session_id: str = None,
    status: str = "success",
    error_message: str = None,
    duration_ms: int = None
):
    """
    Log user activity asynchronously
    
    Args:
        user_id: User ID who performed the action
        tenant_id: Tenant ID
        action: Action name
        resource_type: Type of resource affected (optional)
        resource_id: ID of affected resource (optional)
        details: Additional details as dict (optional)
        ip_address: Request IP address (optional)
        user_agent: Request user agent (optional)
        session_id: Session ID (optional)
        status: Action status (default: "success")
        error_message: Error message if failed (optional)
        duration_ms: Action duration in milliseconds (optional)
    """
    try:
        db = SessionLocal()
        
        # Convert string UUIDs back to UUID objects
        user_uuid = uuid.UUID(user_id) if user_id else None
        tenant_uuid = uuid.UUID(tenant_id)
        resource_uuid = uuid.UUID(resource_id) if resource_id else None
        
        # Create activity log entry
        ActivityLog.log_action(
            db=db,
            tenant_id=tenant_uuid,
            user_id=user_uuid,
            action=action,
            resource_type=resource_type,
            resource_id=resource_uuid,
            details=details,
            ip_address=ip_address,
            user_agent=user_agent,
            session_id=session_id,
            status=status,
            error_message=error_message,
            duration_ms=duration_ms
        )
        
        logger.info(f"Activity logged: {action} by user {user_id} in tenant {tenant_id}")
        
    except Exception as exc:
        logger.error(f"Failed to log activity: {exc}")
        db.rollback()
        raise self.retry(exc=exc, countdown=60)
    finally:
        db.close()


@celery_app.task(bind=True, max_retries=3)
def log_system_activity(
    self,
    tenant_id: str,
    action: str,
    resource_type: str = None,
    resource_id: str = None,
    details: dict = None,
    status: str = "success",
    error_message: str = None
):
    """
    Log system activity (actions not performed by users)
    
    Args:
        tenant_id: Tenant ID
        action: Action name
        resource_type: Type of resource affected (optional)
        resource_id: ID of affected resource (optional)
        details: Additional details as dict (optional)
        status: Action status (default: "success")
        error_message: Error message if failed (optional)
    """
    try:
        db = SessionLocal()
        
        # Convert string UUIDs back to UUID objects
        tenant_uuid = uuid.UUID(tenant_id)
        resource_uuid = uuid.UUID(resource_id) if resource_id else None
        
        # Create activity log entry without user
        ActivityLog.log_action(
            db=db,
            tenant_id=tenant_uuid,
            user_id=None,  # System action
            action=action,
            resource_type=resource_type,
            resource_id=resource_uuid,
            details=details,
            status=status,
            error_message=error_message
        )
        
        logger.info(f"System activity logged: {action} in tenant {tenant_id}")
        
    except Exception as exc:
        logger.error(f"Failed to log system activity: {exc}")
        db.rollback()
        raise self.retry(exc=exc, countdown=60)
    finally:
        db.close()


@celery_app.task(bind=True, max_retries=3)
def cleanup_old_activity_logs(self, days_to_keep: int = 365):
    """
    Clean up old activity logs to manage database size
    
    Args:
        days_to_keep: Number of days to keep logs (default: 365)
    """
    try:
        db = SessionLocal()
        
        cutoff_date = datetime.utcnow() - timedelta(days=days_to_keep)
        
        # Delete old activity logs
        deleted_count = db.query(ActivityLog).filter(
            ActivityLog.created_at < cutoff_date
        ).delete()
        
        db.commit()
        
        logger.info(f"Cleaned up {deleted_count} old activity logs older than {days_to_keep} days")
        
        return {
            "deleted_count": deleted_count,
            "cutoff_date": cutoff_date.isoformat(),
            "days_kept": days_to_keep
        }
        
    except Exception as exc:
        logger.error(f"Failed to cleanup activity logs: {exc}")
        db.rollback()
        raise self.retry(exc=exc, countdown=300)
    finally:
        db.close()


@celery_app.task(bind=True, max_retries=3)
def generate_activity_report(
    self,
    tenant_id: str,
    start_date: str,
    end_date: str,
    user_id: str = None,
    format: str = "json"
):
    """
    Generate activity report for a tenant
    
    Args:
        tenant_id: Tenant ID
        start_date: Start date (ISO format)
        end_date: End date (ISO format)
        user_id: Filter by user ID (optional)
        format: Report format (json, csv)
    """
    try:
        db = SessionLocal()
        
        # Parse dates
        start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
        end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
        
        tenant_uuid = uuid.UUID(tenant_id)
        user_uuid = uuid.UUID(user_id) if user_id else None
        
        # Get activity logs
        logs = ActivityLog.get_user_activities(
            db=db,
            tenant_id=tenant_uuid,
            user_id=user_uuid,
            start_date=start_dt,
            end_date=end_dt,
            limit=10000  # Large limit for reports
        )
        
        # Get summary statistics
        summary = ActivityLog.get_activity_summary(
            db=db,
            tenant_id=tenant_uuid,
            start_date=start_dt,
            end_date=end_dt
        )
        
        if format == "json":
            report_data = {
                "summary": summary,
                "logs": [log.to_dict() for log in logs],
                "generated_at": datetime.utcnow().isoformat(),
                "parameters": {
                    "tenant_id": tenant_id,
                    "start_date": start_date,
                    "end_date": end_date,
                    "user_id": user_id,
                    "format": format
                }
            }
        elif format == "csv":
            # Convert to CSV format
            import csv
            import io
            
            output = io.StringIO()
            writer = csv.writer(output)
            
            # Write header
            writer.writerow([
                'Date', 'User ID', 'Action', 'Resource Type', 'Resource ID',
                'Status', 'IP Address', 'Details'
            ])
            
            # Write data
            for log in logs:
                writer.writerow([
                    log.created_at.isoformat() if log.created_at else '',
                    str(log.user_id) if log.user_id else '',
                    log.action,
                    log.resource_type or '',
                    str(log.resource_id) if log.resource_id else '',
                    log.status,
                    log.ip_address or '',
                    str(log.details) if log.details else ''
                ])
            
            report_data = output.getvalue()
        
        logger.info(f"Generated activity report for tenant {tenant_id}: {len(logs)} entries")
        
        return {
            "status": "success",
            "report_data": report_data,
            "log_count": len(logs),
            "summary": summary
        }
        
    except Exception as exc:
        logger.error(f"Failed to generate activity report: {exc}")
        raise self.retry(exc=exc, countdown=60)
    finally:
        db.close()


@celery_app.task(bind=True, max_retries=3)
def update_user_activity_timestamp(self, user_id: str, tenant_id: str):
    """
    Update user's last activity timestamp
    
    Args:
        user_id: User ID
        tenant_id: Tenant ID
    """
    try:
        db = SessionLocal()
        
        user_uuid = uuid.UUID(user_id)
        tenant_uuid = uuid.UUID(tenant_id)
        
        # Update user's last activity
        user = db.query(User).filter(
            User.id == user_uuid,
            User.tenant_id == tenant_uuid
        ).first()
        
        if user:
            user.update_activity()
            db.commit()
            
            # Also update tenant's last activity
            tenant = db.query(Tenant).filter(Tenant.id == tenant_uuid).first()
            if tenant:
                tenant.update_activity()
                db.commit()
        
    except Exception as exc:
        logger.error(f"Failed to update user activity timestamp: {exc}")
        db.rollback()
        raise self.retry(exc=exc, countdown=30)
    finally:
        db.close()


@celery_app.task(bind=True, max_retries=3)
def send_user_invitation_email(
    self,
    tenant_id: str,
    inviter_name: str,
    email: str,
    role: str,
    invitation_token: str
):
    """
    Send user invitation email
    
    Args:
        tenant_id: Tenant ID
        inviter_name: Name of person sending invitation
        email: Email address to send invitation to
        role: Role being assigned
        invitation_token: Invitation token for signup
    """
    try:
        db = SessionLocal()
        
        tenant_uuid = uuid.UUID(tenant_id)
        tenant = db.query(Tenant).filter(Tenant.id == tenant_uuid).first()
        
        if not tenant:
            raise ValueError(f"Tenant {tenant_id} not found")
        
        # Prepare email content
        subject = f"دعوت به پیوستن به {tenant.name} در سیستم حسابداری"
        
        # This would integrate with the email service
        # For now, just log the invitation
        logger.info(f"User invitation sent to {email} for tenant {tenant.name} with role {role}")
        
        # Log the invitation activity
        log_system_activity.delay(
            tenant_id=tenant_id,
            action="user_invitation_sent",
            details={
                "inviter_name": inviter_name,
                "invited_email": email,
                "role": role,
                "invitation_token": invitation_token
            }
        )
        
        return {
            "status": "success",
            "email": email,
            "tenant_name": tenant.name,
            "invitation_token": invitation_token
        }
        
    except Exception as exc:
        logger.error(f"Failed to send user invitation email: {exc}")
        raise self.retry(exc=exc, countdown=60)
    finally:
        db.close()


@celery_app.task(bind=True, max_retries=3)
def audit_user_permissions(self, tenant_id: str):
    """
    Audit user permissions and generate security report
    
    Args:
        tenant_id: Tenant ID to audit
    """
    try:
        db = SessionLocal()
        
        tenant_uuid = uuid.UUID(tenant_id)
        
        # Get all users in tenant
        users = db.query(User).filter(
            User.tenant_id == tenant_uuid,
            User.is_active == True
        ).all()
        
        audit_results = {
            "tenant_id": tenant_id,
            "audit_date": datetime.utcnow().isoformat(),
            "total_users": len(users),
            "users_by_role": {},
            "inactive_users": 0,
            "users_without_recent_activity": [],
            "potential_issues": []
        }
        
        # Analyze users
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        
        for user in users:
            # Count by role
            role_name = user.role.value
            audit_results["users_by_role"][role_name] = audit_results["users_by_role"].get(role_name, 0) + 1
            
            # Check for inactive users
            if user.status != "active":
                audit_results["inactive_users"] += 1
            
            # Check for users without recent activity
            if not user.last_activity_at or user.last_activity_at < thirty_days_ago:
                audit_results["users_without_recent_activity"].append({
                    "user_id": str(user.id),
                    "email": user.email,
                    "role": role_name,
                    "last_activity": user.last_activity_at.isoformat() if user.last_activity_at else None
                })
        
        # Check for potential security issues
        owner_count = audit_results["users_by_role"].get("owner", 0)
        if owner_count == 0:
            audit_results["potential_issues"].append("No owner users found")
        elif owner_count > 2:
            audit_results["potential_issues"].append(f"Multiple owners ({owner_count}) - consider limiting")
        
        admin_count = audit_results["users_by_role"].get("admin", 0)
        if admin_count > 3:
            audit_results["potential_issues"].append(f"Many admin users ({admin_count}) - review necessity")
        
        logger.info(f"User permissions audit completed for tenant {tenant_id}")
        
        return audit_results
        
    except Exception as exc:
        logger.error(f"Failed to audit user permissions: {exc}")
        raise self.retry(exc=exc, countdown=120)
    finally:
        db.close()