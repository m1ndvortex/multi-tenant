"""
Unit tests for OperationLog model with real database operations
"""

import pytest
import uuid
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.models.backup.backup_operation import BackupOperation, BackupType
from app.models.backup.operation_log import OperationLog, LogLevel


class TestOperationLog:
    """Test OperationLog model functionality"""
    
    def test_create_operation_log(self, db_session: Session):
        """Test creating a new operation log entry"""
        # Create base backup operation
        backup_op = BackupOperation(
            operation_type=BackupType.TENANT,
            storage_providers=["cloudflare_r2"]
        )
        db_session.add(backup_op)
        db_session.commit()
        
        # Create operation log
        log_entry = OperationLog(
            operation_id=backup_op.id,
            operation_type="BACKUP",
            log_level=LogLevel.INFO,
            message="Starting tenant backup process",
            step_name="Initialize Backup",
            progress_at_time=5.0,
            component="BackupService",
            function_name="create_tenant_backup"
        )
        
        db_session.add(log_entry)
        db_session.commit()
        db_session.refresh(log_entry)
        
        # Verify creation
        assert log_entry.id is not None
        assert log_entry.operation_id == backup_op.id
        assert log_entry.operation_type == "BACKUP"
        assert log_entry.log_level == LogLevel.INFO
        assert log_entry.message == "Starting tenant backup process"
        assert log_entry.step_name == "Initialize Backup"
        assert log_entry.progress_at_time == 5.0
        assert log_entry.component == "BackupService"
        assert log_entry.function_name == "create_tenant_backup"
    
    def test_create_log_class_methods(self, db_session: Session):
        """Test class methods for creating different log levels"""
        # Create base backup operation
        backup_op = BackupOperation(
            operation_type=BackupType.DISASTER_RECOVERY,
            storage_providers=["backblaze_b2"]
        )
        db_session.add(backup_op)
        db_session.commit()
        
        operation_id = str(backup_op.id)
        
        # Test debug log
        debug_log = OperationLog.log_debug(
            operation_id, "BACKUP", "Debug message", "Debug Step", 10.0,
            component="TestComponent"
        )
        db_session.add(debug_log)
        
        # Test info log
        info_log = OperationLog.log_info(
            operation_id, "BACKUP", "Info message", "Info Step", 25.0,
            component="TestComponent"
        )
        db_session.add(info_log)
        
        # Test warning log
        warning_log = OperationLog.log_warning(
            operation_id, "BACKUP", "Warning message", "Warning Step", 50.0,
            component="TestComponent"
        )
        db_session.add(warning_log)
        
        # Test error log
        error_log = OperationLog.log_error(
            operation_id, "BACKUP", "Error message", "Error Step", 75.0,
            error_code="STORAGE_ERROR", stack_trace="Stack trace here",
            component="TestComponent"
        )
        db_session.add(error_log)
        
        # Test critical log
        critical_log = OperationLog.log_critical(
            operation_id, "BACKUP", "Critical message", "Critical Step", 90.0,
            error_code="SYSTEM_FAILURE", stack_trace="Critical stack trace",
            component="TestComponent"
        )
        db_session.add(critical_log)
        
        db_session.commit()
        
        # Verify all log levels
        assert debug_log.log_level == LogLevel.DEBUG
        assert info_log.log_level == LogLevel.INFO
        assert warning_log.log_level == LogLevel.WARNING
        assert error_log.log_level == LogLevel.ERROR
        assert critical_log.log_level == LogLevel.CRITICAL
        
        # Verify error-specific fields
        assert error_log.error_code == "STORAGE_ERROR"
        assert error_log.stack_trace == "Stack trace here"
        assert critical_log.error_code == "SYSTEM_FAILURE"
        assert critical_log.stack_trace == "Critical stack trace"
    
    def test_log_with_details_and_context(self, db_session: Session):
        """Test log entry with detailed context information"""
        # Create base backup operation
        backup_op = BackupOperation(
            operation_type=BackupType.MANUAL,
            storage_providers=["cloudflare_r2", "backblaze_b2"]
        )
        db_session.add(backup_op)
        db_session.commit()
        
        # Create tenant for context
        tenant_id = uuid.uuid4()
        
        # Create detailed log entry
        log_entry = OperationLog(
            operation_id=backup_op.id,
            operation_type="BACKUP",
            log_level=LogLevel.INFO,
            message="Uploading backup file to storage",
            step_name="Upload to Cloud Storage",
            progress_at_time=65.5,
            component="StorageService",
            function_name="upload_to_provider",
            execution_time_ms=2500.75,
            memory_usage_mb=128.5,
            tenant_id=tenant_id,
            storage_provider="cloudflare_r2",
            file_path="/tmp/backup_tenant_123.tar.gz",
            details={
                "file_size_mb": 256.7,
                "compression_ratio": 0.65,
                "upload_speed_mbps": 12.3,
                "retry_attempt": 1
            }
        )
        
        db_session.add(log_entry)
        db_session.commit()
        
        # Verify detailed information
        assert log_entry.execution_time_ms == 2500.75
        assert log_entry.memory_usage_mb == 128.5
        assert log_entry.tenant_id == tenant_id
        assert log_entry.storage_provider == "cloudflare_r2"
        assert log_entry.file_path == "/tmp/backup_tenant_123.tar.gz"
        assert log_entry.details["file_size_mb"] == 256.7
        assert log_entry.details["compression_ratio"] == 0.65
        assert log_entry.details["upload_speed_mbps"] == 12.3
        assert log_entry.details["retry_attempt"] == 1
    
    def test_add_detail_method(self, db_session: Session):
        """Test adding details to log entry"""
        # Create base backup operation
        backup_op = BackupOperation(
            operation_type=BackupType.SCHEDULED,
            storage_providers=["cloudflare_r2"]
        )
        db_session.add(backup_op)
        db_session.commit()
        
        # Create log entry
        log_entry = OperationLog(
            operation_id=backup_op.id,
            operation_type="BACKUP",
            log_level=LogLevel.INFO,
            message="Processing backup",
            step_name="Process Data",
            progress_at_time=30.0
        )
        
        db_session.add(log_entry)
        db_session.commit()
        
        # Add details
        log_entry.add_detail("processed_records", 1500)
        log_entry.add_detail("processing_rate", 25.5)
        log_entry.add_detail("estimated_remaining", "5 minutes")
        db_session.commit()
        
        # Verify details
        assert log_entry.details["processed_records"] == 1500
        assert log_entry.details["processing_rate"] == 25.5
        assert log_entry.details["estimated_remaining"] == "5 minutes"
    
    def test_add_performance_metrics(self, db_session: Session):
        """Test adding performance metrics to log entry"""
        # Create base backup operation
        backup_op = BackupOperation(
            operation_type=BackupType.TENANT,
            storage_providers=["backblaze_b2"]
        )
        db_session.add(backup_op)
        db_session.commit()
        
        # Create log entry
        log_entry = OperationLog(
            operation_id=backup_op.id,
            operation_type="RESTORE",
            log_level=LogLevel.INFO,
            message="Restoring database",
            step_name="Database Restore",
            progress_at_time=80.0
        )
        
        db_session.add(log_entry)
        db_session.commit()
        
        # Add performance metrics
        log_entry.add_performance_metrics(5432.1, 256.8)
        db_session.commit()
        
        # Verify metrics
        assert log_entry.execution_time_ms == 5432.1
        assert log_entry.memory_usage_mb == 256.8
    
    def test_log_level_checks(self, db_session: Session):
        """Test log level checking methods"""
        # Create base backup operation
        backup_op = BackupOperation(
            operation_type=BackupType.DISASTER_RECOVERY,
            storage_providers=["cloudflare_r2"]
        )
        db_session.add(backup_op)
        db_session.commit()
        
        # Create logs of different levels
        debug_log = OperationLog.log_debug(
            str(backup_op.id), "BACKUP", "Debug", "Debug Step", 10.0
        )
        info_log = OperationLog.log_info(
            str(backup_op.id), "BACKUP", "Info", "Info Step", 20.0
        )
        warning_log = OperationLog.log_warning(
            str(backup_op.id), "BACKUP", "Warning", "Warning Step", 30.0
        )
        error_log = OperationLog.log_error(
            str(backup_op.id), "BACKUP", "Error", "Error Step", 40.0
        )
        critical_log = OperationLog.log_critical(
            str(backup_op.id), "BACKUP", "Critical", "Critical Step", 50.0
        )
        
        db_session.add_all([debug_log, info_log, warning_log, error_log, critical_log])
        db_session.commit()
        
        # Test is_error method
        assert debug_log.is_error() is False
        assert info_log.is_error() is False
        assert warning_log.is_error() is False
        assert error_log.is_error() is True
        assert critical_log.is_error() is True
        
        # Test is_warning_or_above method
        assert debug_log.is_warning_or_above() is False
        assert info_log.is_warning_or_above() is False
        assert warning_log.is_warning_or_above() is True
        assert error_log.is_warning_or_above() is True
        assert critical_log.is_warning_or_above() is True
    
    def test_formatted_message(self, db_session: Session):
        """Test formatted message generation"""
        # Create base backup operation
        backup_op = BackupOperation(
            operation_type=BackupType.MANUAL,
            storage_providers=["cloudflare_r2"]
        )
        db_session.add(backup_op)
        db_session.commit()
        
        tenant_id = uuid.uuid4()
        
        # Create log entry with context
        log_entry = OperationLog(
            operation_id=backup_op.id,
            operation_type="BACKUP",
            log_level=LogLevel.WARNING,
            message="Storage provider slow response",
            step_name="Upload Verification",
            progress_at_time=75.5,
            component="StorageService",
            tenant_id=tenant_id
        )
        
        db_session.add(log_entry)
        db_session.commit()
        
        # Get formatted message
        formatted = log_entry.get_formatted_message()
        
        # Verify formatted message contains expected elements
        assert "[WARNING]" in formatted
        assert "[75.5%]" in formatted
        assert "Upload Verification:" in formatted
        assert "Storage provider slow response" in formatted
        assert "[StorageService]" in formatted
        assert f"[Tenant: {tenant_id}]" in formatted
        
        # Test without optional fields
        simple_log = OperationLog(
            operation_id=backup_op.id,
            operation_type="BACKUP",
            log_level=LogLevel.INFO,
            message="Simple message",
            step_name="Simple Step",
            progress_at_time=50.0
        )
        
        db_session.add(simple_log)
        db_session.commit()
        
        simple_formatted = simple_log.get_formatted_message()
        assert "[INFO]" in simple_formatted
        assert "[50.0%]" in simple_formatted
        assert "Simple Step:" in simple_formatted
        assert "Simple message" in simple_formatted
        assert "[StorageService]" not in simple_formatted  # No component
        assert "[Tenant:" not in simple_formatted  # No tenant
    
    def test_to_dict_method(self, db_session: Session):
        """Test converting log entry to dictionary"""
        # Create base backup operation
        backup_op = BackupOperation(
            operation_type=BackupType.TENANT,
            storage_providers=["backblaze_b2"]
        )
        db_session.add(backup_op)
        db_session.commit()
        
        tenant_id = uuid.uuid4()
        
        # Create comprehensive log entry
        log_entry = OperationLog(
            operation_id=backup_op.id,
            operation_type="RESTORE",
            log_level=LogLevel.ERROR,
            message="Database connection failed",
            step_name="Database Connection",
            progress_at_time=25.0,
            component="DatabaseService",
            function_name="connect_to_database",
            execution_time_ms=1500.0,
            memory_usage_mb=64.0,
            error_code="DB_CONNECTION_ERROR",
            tenant_id=tenant_id,
            storage_provider="backblaze_b2",
            file_path="/tmp/restore_data.sql",
            details={
                "connection_attempts": 3,
                "timeout_seconds": 30,
                "error_details": "Connection refused"
            }
        )
        
        db_session.add(log_entry)
        db_session.commit()
        
        # Convert to dictionary
        log_dict = log_entry.to_dict()
        
        # Verify dictionary contents
        assert log_dict["id"] == str(log_entry.id)
        assert log_dict["operation_id"] == str(backup_op.id)
        assert log_dict["operation_type"] == "RESTORE"
        assert log_dict["log_level"] == "error"
        assert log_dict["message"] == "Database connection failed"
        assert log_dict["step_name"] == "Database Connection"
        assert log_dict["progress_at_time"] == 25.0
        assert log_dict["component"] == "DatabaseService"
        assert log_dict["function_name"] == "connect_to_database"
        assert log_dict["execution_time_ms"] == 1500.0
        assert log_dict["memory_usage_mb"] == 64.0
        assert log_dict["error_code"] == "DB_CONNECTION_ERROR"
        assert log_dict["tenant_id"] == str(tenant_id)
        assert log_dict["storage_provider"] == "backblaze_b2"
        assert log_dict["file_path"] == "/tmp/restore_data.sql"
        assert log_dict["details"]["connection_attempts"] == 3
        assert log_dict["created_at"] is not None
        assert log_dict["formatted_message"] is not None
    
    def test_query_logs_by_operation(self, db_session: Session):
        """Test querying logs by operation"""
        # Create two backup operations
        backup_op1 = BackupOperation(
            operation_type=BackupType.TENANT,
            storage_providers=["cloudflare_r2"]
        )
        backup_op2 = BackupOperation(
            operation_type=BackupType.DISASTER_RECOVERY,
            storage_providers=["backblaze_b2"]
        )
        
        db_session.add_all([backup_op1, backup_op2])
        db_session.commit()
        
        # Create logs for first operation
        for i in range(3):
            log_entry = OperationLog.log_info(
                str(backup_op1.id), "BACKUP", f"Message {i+1}", f"Step {i+1}", i*10.0
            )
            db_session.add(log_entry)
        
        # Create logs for second operation
        for i in range(2):
            log_entry = OperationLog.log_info(
                str(backup_op2.id), "BACKUP", f"DR Message {i+1}", f"DR Step {i+1}", i*20.0
            )
            db_session.add(log_entry)
        
        db_session.commit()
        
        # Query logs for first operation
        op1_logs = db_session.query(OperationLog).filter(
            OperationLog.operation_id == backup_op1.id
        ).all()
        
        # Query logs for second operation
        op2_logs = db_session.query(OperationLog).filter(
            OperationLog.operation_id == backup_op2.id
        ).all()
        
        # Verify correct log counts
        assert len(op1_logs) == 3
        assert len(op2_logs) == 2
        
        # Verify log content
        assert all("Message" in log.message for log in op1_logs)
        assert all("DR Message" in log.message for log in op2_logs)
    
    def test_query_logs_by_level(self, db_session: Session):
        """Test querying logs by level"""
        # Create backup operation
        backup_op = BackupOperation(
            operation_type=BackupType.MANUAL,
            storage_providers=["cloudflare_r2"]
        )
        db_session.add(backup_op)
        db_session.commit()
        
        operation_id = str(backup_op.id)
        
        # Create logs of different levels
        debug_logs = [
            OperationLog.log_debug(operation_id, "BACKUP", f"Debug {i}", f"Step {i}", i*5.0)
            for i in range(2)
        ]
        
        error_logs = [
            OperationLog.log_error(operation_id, "BACKUP", f"Error {i}", f"Step {i}", i*10.0)
            for i in range(3)
        ]
        
        info_logs = [
            OperationLog.log_info(operation_id, "BACKUP", f"Info {i}", f"Step {i}", i*15.0)
            for i in range(4)
        ]
        
        db_session.add_all(debug_logs + error_logs + info_logs)
        db_session.commit()
        
        # Query error logs only
        error_only = db_session.query(OperationLog).filter(
            OperationLog.operation_id == backup_op.id,
            OperationLog.log_level == LogLevel.ERROR
        ).all()
        
        # Query warning and above (should include errors)
        warning_and_above = db_session.query(OperationLog).filter(
            OperationLog.operation_id == backup_op.id,
            OperationLog.log_level.in_([LogLevel.WARNING, LogLevel.ERROR, LogLevel.CRITICAL])
        ).all()
        
        # Verify results
        assert len(error_only) == 3
        assert len(warning_and_above) == 3  # Only errors in this case
        assert all(log.log_level == LogLevel.ERROR for log in error_only)
    
    def test_operation_log_repr(self, db_session: Session):
        """Test string representation"""
        # Create backup operation
        backup_op = BackupOperation(
            operation_type=BackupType.TENANT,
            storage_providers=["cloudflare_r2"]
        )
        db_session.add(backup_op)
        db_session.commit()
        
        log_entry = OperationLog(
            operation_id=backup_op.id,
            operation_type="BACKUP",
            log_level=LogLevel.WARNING,
            message="Test message",
            step_name="Test Step",
            progress_at_time=42.5
        )
        
        db_session.add(log_entry)
        db_session.commit()
        
        repr_str = repr(log_entry)
        assert "OperationLog" in repr_str
        assert "warning" in repr_str
        assert "Test Step" in repr_str
        assert str(log_entry.id) in repr_str