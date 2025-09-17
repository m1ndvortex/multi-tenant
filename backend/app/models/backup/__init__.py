"""
Enhanced backup and recovery system models
"""

# New enhanced backup models
from .backup_operation import BackupOperation, OperationStatus
from .backup_operation import BackupType as NewBackupType
from .disaster_recovery import DisasterRecoveryBackup, DisasterRecoveryType, RollbackPoint
from .operation_log import OperationLog, LogLevel
from .storage_location import StorageLocation as NewStorageLocation, StorageProvider as NewStorageProvider

# Legacy backup models for backward compatibility
from .legacy_backup import (
    BackupLog, RestoreLog, CustomerBackupLog, DataExportLog, ExportSchedule,
    BackupType, BackupStatus, StorageLocation, ExportFormat, ExportType, ExportStatus,
    LegacyStorageProvider
)

# Alias for backward compatibility
StorageProvider = LegacyStorageProvider

__all__ = [
    # New enhanced models
    'BackupOperation',
    'NewBackupType',
    'OperationStatus', 
    'DisasterRecoveryBackup',
    'DisasterRecoveryType',
    'RollbackPoint',
    'OperationLog',
    'LogLevel',
    'NewStorageLocation',
    'NewStorageProvider',
    # Legacy models
    'BackupLog',
    'BackupType', 
    'BackupStatus',
    'RestoreLog',
    'StorageLocation',
    'CustomerBackupLog',
    'DataExportLog',
    'ExportSchedule',
    'ExportFormat',
    'ExportType',
    'ExportStatus'
]