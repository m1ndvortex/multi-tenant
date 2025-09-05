"""
Data export tasks for CSV/JSON exports with progress tracking
"""

from celery import current_task
from app.celery_app import celery_app
from app.core.database import SessionLocal
from app.services.data_export_service import DataExportService
from app.models.backup import ExportFormat, ExportType
from app.models.tenant import Tenant, TenantStatus
import logging

logger = logging.getLogger(__name__)


@celery_app.task(bind=True, name="app.tasks.create_data_export")
def create_data_export(
    self, 
    tenant_id: str, 
    user_id: str, 
    export_format: str,
    export_type: str = "manual",
    tables: list = None
):
    """Create data export for a specific tenant"""
    db = None
    try:
        logger.info(f"Starting data export for tenant: {tenant_id}, format: {export_format}")
        
        # Create database session
        db = SessionLocal()
        
        # Initialize export service
        export_service = DataExportService(db)
        
        # Convert string enums to enum objects
        format_enum = ExportFormat(export_format)
        type_enum = ExportType(export_type)
        
        # Update task progress
        current_task.update_state(
            state='PROGRESS',
            meta={'current': 0, 'total': 100, 'status': 'Starting export...'}
        )
        
        # Perform data export
        result = export_service.create_data_export(
            tenant_id=tenant_id,
            user_id=user_id,
            export_format=format_enum,
            export_type=type_enum,
            tables=tables,
            task_id=self.request.id
        )
        
        # Update task progress to completion
        current_task.update_state(
            state='SUCCESS',
            meta={
                'current': 100, 
                'total': 100, 
                'status': 'Export completed successfully',
                'result': result
            }
        )
        
        logger.info(f"Data export completed successfully: {result}")
        return result
        
    except Exception as exc:
        logger.error(f"Data export failed for {tenant_id}: {exc}")
        
        # Update task progress to failure
        current_task.update_state(
            state='FAILURE',
            meta={
                'current': 0, 
                'total': 100, 
                'status': f'Export failed: {str(exc)}',
                'error': str(exc)
            }
        )
        
        raise self.retry(exc=exc, countdown=60, max_retries=3)
    
    finally:
        if db:
            db.close()


@celery_app.task(bind=True, name="app.tasks.create_bulk_data_export")
def create_bulk_data_export(
    self,
    tenant_ids: list,
    user_id: str,
    export_format: str,
    export_type: str = "manual",
    tables: list = None
):
    """Create data exports for multiple tenants"""
    db = None
    try:
        logger.info(f"Starting bulk data export for {len(tenant_ids)} tenants, format: {export_format}")
        
        # Create database session
        db = SessionLocal()
        
        # Initialize export service
        export_service = DataExportService(db)
        
        # Convert string enums to enum objects
        format_enum = ExportFormat(export_format)
        type_enum = ExportType(export_type)
        
        successful_exports = 0
        failed_exports = 0
        export_results = []
        
        total_tenants = len(tenant_ids)
        
        # Process each tenant
        for i, tenant_id in enumerate(tenant_ids):
            try:
                # Update task progress
                progress = int((i / total_tenants) * 100)
                current_task.update_state(
                    state='PROGRESS',
                    meta={
                        'current': progress, 
                        'total': 100, 
                        'status': f'Exporting tenant {i+1}/{total_tenants}: {tenant_id}'
                    }
                )
                
                logger.info(f"Exporting data for tenant: {tenant_id} ({i+1}/{total_tenants})")
                
                result = export_service.create_data_export(
                    tenant_id=tenant_id,
                    user_id=user_id,
                    export_format=format_enum,
                    export_type=type_enum,
                    tables=tables,
                    task_id=f"{self.request.id}_{i}"
                )
                
                export_results.append({
                    "tenant_id": tenant_id,
                    "status": "success",
                    "export_id": result["export_id"],
                    "total_records": result["total_records"],
                    "compressed_size": result["compressed_size"]
                })
                successful_exports += 1
                
            except Exception as e:
                logger.error(f"Failed to export data for tenant {tenant_id}: {e}")
                export_results.append({
                    "tenant_id": tenant_id,
                    "status": "failed",
                    "error": str(e)
                })
                failed_exports += 1
        
        # Final result
        final_result = {
            "status": "completed",
            "total_tenants": total_tenants,
            "successful_exports": successful_exports,
            "failed_exports": failed_exports,
            "export_results": export_results,
            "message": f"Bulk export completed: {successful_exports} successful, {failed_exports} failed"
        }
        
        # Update task progress to completion
        current_task.update_state(
            state='SUCCESS',
            meta={
                'current': 100, 
                'total': 100, 
                'status': 'Bulk export completed',
                'result': final_result
            }
        )
        
        logger.info(f"Bulk data export completed: {final_result}")
        return final_result
        
    except Exception as exc:
        logger.error(f"Bulk data export failed: {exc}")
        
        # Update task progress to failure
        current_task.update_state(
            state='FAILURE',
            meta={
                'current': 0, 
                'total': 100, 
                'status': f'Bulk export failed: {str(exc)}',
                'error': str(exc)
            }
        )
        
        raise self.retry(exc=exc, countdown=300, max_retries=2)
    
    finally:
        if db:
            db.close()


@celery_app.task(bind=True, name="app.tasks.scheduled_data_export")
def scheduled_data_export(self, schedule_id: str):
    """Execute scheduled data export"""
    db = None
    try:
        logger.info(f"Starting scheduled data export: {schedule_id}")
        
        # Create database session
        db = SessionLocal()
        
        # Get export schedule
        from app.models.backup import ExportSchedule
        schedule = db.query(ExportSchedule).filter(
            ExportSchedule.id == schedule_id,
            ExportSchedule.is_active == True
        ).first()
        
        if not schedule:
            raise Exception(f"Export schedule {schedule_id} not found or inactive")
        
        # Initialize export service
        export_service = DataExportService(db)
        
        # Update task progress
        current_task.update_state(
            state='PROGRESS',
            meta={'current': 0, 'total': 100, 'status': 'Starting scheduled export...'}
        )
        
        # Perform scheduled export
        result = export_service.create_data_export(
            tenant_id=str(schedule.tenant_id),
            user_id=str(schedule.tenant_id),  # Use tenant_id as user_id for scheduled exports
            export_format=schedule.export_format,
            export_type=ExportType.SCHEDULED,
            tables=schedule.tables_to_export,
            task_id=self.request.id
        )
        
        # Update schedule statistics
        schedule.update_execution_stats(success=True)
        schedule.last_export_id = result["export_id"]
        db.commit()
        
        # Update task progress to completion
        current_task.update_state(
            state='SUCCESS',
            meta={
                'current': 100, 
                'total': 100, 
                'status': 'Scheduled export completed successfully',
                'result': result
            }
        )
        
        logger.info(f"Scheduled data export completed successfully: {result}")
        return result
        
    except Exception as exc:
        logger.error(f"Scheduled data export failed for {schedule_id}: {exc}")
        
        # Update schedule statistics
        if 'schedule' in locals() and schedule:
            try:
                schedule.update_execution_stats(success=False)
                db.commit()
            except Exception as e:
                logger.error(f"Failed to update schedule stats: {e}")
        
        # Update task progress to failure
        current_task.update_state(
            state='FAILURE',
            meta={
                'current': 0, 
                'total': 100, 
                'status': f'Scheduled export failed: {str(exc)}',
                'error': str(exc)
            }
        )
        
        raise self.retry(exc=exc, countdown=300, max_retries=2)
    
    finally:
        if db:
            db.close()


@celery_app.task(bind=True, name="app.tasks.cleanup_expired_exports")
def cleanup_expired_exports(self):
    """Clean up expired export files"""
    db = None
    try:
        logger.info("Starting cleanup of expired export files")
        
        # Create database session
        db = SessionLocal()
        
        # Initialize export service
        export_service = DataExportService(db)
        
        # Clean up expired exports
        cleaned_count = export_service.cleanup_expired_exports()
        
        result = {
            "status": "success",
            "cleaned_files": cleaned_count,
            "message": f"Cleaned up {cleaned_count} expired export files"
        }
        
        logger.info(f"Export cleanup completed: {result}")
        return result
        
    except Exception as exc:
        logger.error(f"Export cleanup failed: {exc}")
        raise self.retry(exc=exc, countdown=300, max_retries=2)
    
    finally:
        if db:
            db.close()


@celery_app.task(bind=True, name="app.tasks.automated_periodic_export")
def automated_periodic_export(self):
    """Automated periodic export for all active tenants"""
    db = None
    try:
        logger.info("Starting automated periodic export for all tenants")
        
        # Create database session
        db = SessionLocal()
        
        # Get all active tenants
        active_tenants = db.query(Tenant).filter(
            Tenant.status == TenantStatus.ACTIVE,
            Tenant.is_active == True
        ).all()
        
        if not active_tenants:
            logger.info("No active tenants found for automated export")
            return {
                "status": "success",
                "exported_tenants": 0,
                "message": "No active tenants to export"
            }
        
        # Initialize export service
        export_service = DataExportService(db)
        
        successful_exports = 0
        failed_exports = 0
        export_results = []
        
        total_tenants = len(active_tenants)
        
        # Export data for each tenant
        for i, tenant in enumerate(active_tenants):
            try:
                # Update task progress
                progress = int((i / total_tenants) * 100)
                current_task.update_state(
                    state='PROGRESS',
                    meta={
                        'current': progress, 
                        'total': 100, 
                        'status': f'Automated export for tenant {i+1}/{total_tenants}: {tenant.name}'
                    }
                )
                
                logger.info(f"Automated export for tenant: {tenant.id} ({tenant.name})")
                
                result = export_service.create_data_export(
                    tenant_id=str(tenant.id),
                    user_id=str(tenant.id),  # Use tenant_id as user_id for automated exports
                    export_format=ExportFormat.JSON,  # Default to JSON for automated exports
                    export_type=ExportType.AUTOMATED,
                    tables=["customers", "products", "invoices", "installments", "accounting"],
                    task_id=f"{self.request.id}_{i}"
                )
                
                export_results.append({
                    "tenant_id": str(tenant.id),
                    "tenant_name": tenant.name,
                    "status": "success",
                    "export_id": result["export_id"],
                    "total_records": result["total_records"]
                })
                successful_exports += 1
                
            except Exception as e:
                logger.error(f"Failed automated export for tenant {tenant.id}: {e}")
                export_results.append({
                    "tenant_id": str(tenant.id),
                    "tenant_name": tenant.name,
                    "status": "failed",
                    "error": str(e)
                })
                failed_exports += 1
        
        # Final result
        final_result = {
            "status": "completed",
            "total_tenants": total_tenants,
            "successful_exports": successful_exports,
            "failed_exports": failed_exports,
            "export_results": export_results,
            "message": f"Automated periodic export completed: {successful_exports} successful, {failed_exports} failed"
        }
        
        # Update task progress to completion
        current_task.update_state(
            state='SUCCESS',
            meta={
                'current': 100, 
                'total': 100, 
                'status': 'Automated periodic export completed',
                'result': final_result
            }
        )
        
        logger.info(f"Automated periodic export completed: {final_result}")
        return final_result
        
    except Exception as exc:
        logger.error(f"Automated periodic export failed: {exc}")
        
        # Update task progress to failure
        current_task.update_state(
            state='FAILURE',
            meta={
                'current': 0, 
                'total': 100, 
                'status': f'Automated export failed: {str(exc)}',
                'error': str(exc)
            }
        )
        
        raise self.retry(exc=exc, countdown=300, max_retries=2)
    
    finally:
        if db:
            db.close()


@celery_app.task(bind=True, name="app.tasks.get_export_progress")
def get_export_progress(self, task_id: str):
    """Get progress of a data export task"""
    try:
        # Get task result
        from celery.result import AsyncResult
        task_result = AsyncResult(task_id, app=celery_app)
        
        if task_result.state == 'PENDING':
            response = {
                'state': task_result.state,
                'current': 0,
                'total': 100,
                'status': 'Task is waiting to be processed...'
            }
        elif task_result.state == 'PROGRESS':
            response = {
                'state': task_result.state,
                'current': task_result.info.get('current', 0),
                'total': task_result.info.get('total', 100),
                'status': task_result.info.get('status', 'Processing...')
            }
        elif task_result.state == 'SUCCESS':
            response = {
                'state': task_result.state,
                'current': 100,
                'total': 100,
                'status': 'Task completed successfully',
                'result': task_result.info.get('result', task_result.result)
            }
        else:  # FAILURE
            response = {
                'state': task_result.state,
                'current': 0,
                'total': 100,
                'status': task_result.info.get('status', 'Task failed'),
                'error': str(task_result.info)
            }
        
        return response
        
    except Exception as exc:
        logger.error(f"Failed to get export progress for task {task_id}: {exc}")
        return {
            'state': 'FAILURE',
            'current': 0,
            'total': 100,
            'status': 'Failed to get task progress',
            'error': str(exc)
        }