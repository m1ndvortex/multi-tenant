"""Create enhanced backup system tables with proper indexes

Revision ID: create_enhanced_backup_system_tables
Revises: backup_data_migration
Create Date: 2025-09-17 22:30:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = 'enhanced_backup_tables'
down_revision = 'backup_data_migration'
branch_labels = None
depends_on = None


def upgrade():
    """
    Create enhanced backup system tables with proper indexes using string types for simplicity
    """
    
    # Create backup_operations table
    op.create_table('backup_operations',
        sa.Column('id', sa.UUID(), nullable=False, comment='Primary key UUID'),
        sa.Column('operation_type', sa.String(length=50), nullable=False, comment='Type of backup operation (TENANT, DISASTER_RECOVERY, MANUAL, SCHEDULED)'),
        sa.Column('status', sa.String(length=50), nullable=False, default='PENDING', comment='Current operation status (PENDING, IN_PROGRESS, COMPLETED, FAILED, CANCELLED, PAUSED)'),
        sa.Column('tenant_ids', postgresql.ARRAY(sa.UUID()), nullable=True, comment='List of tenant IDs included in backup'),
        sa.Column('storage_providers', postgresql.ARRAY(sa.String()), nullable=False, comment='List of storage providers to use'),
        sa.Column('progress_percentage', sa.Float(), nullable=False, default=0.0, comment='Current progress percentage (0-100)'),
        sa.Column('current_step', sa.String(length=255), nullable=False, default='', comment='Current operation step description'),
        sa.Column('estimated_completion', sa.DateTime(timezone=True), nullable=True, comment='Estimated completion time'),
        sa.Column('backup_file_path', sa.String(length=500), nullable=True, comment='Local backup file path'),
        sa.Column('compressed_size', sa.Numeric(precision=15, scale=0), nullable=True, comment='Compressed backup file size in bytes'),
        sa.Column('uncompressed_size', sa.Numeric(precision=15, scale=0), nullable=True, comment='Uncompressed backup file size in bytes'),
        sa.Column('r2_location', sa.String(length=500), nullable=True, comment='Cloudflare R2 storage location'),
        sa.Column('b2_location', sa.String(length=500), nullable=True, comment='Backblaze B2 storage location'),
        sa.Column('checksum_md5', sa.String(length=32), nullable=True, comment='MD5 checksum for integrity verification'),
        sa.Column('checksum_sha256', sa.String(length=64), nullable=True, comment='SHA256 checksum for integrity verification'),
        sa.Column('integrity_verified', sa.Boolean(), nullable=False, default=False, comment='Whether backup integrity has been verified'),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=True, comment='Operation start time'),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True, comment='Operation completion time'),
        sa.Column('error_message', sa.Text(), nullable=True, comment='Error message if operation failed'),
        sa.Column('retry_count', sa.Integer(), nullable=False, default=0, comment='Number of retry attempts'),
        sa.Column('max_retries', sa.Integer(), nullable=False, default=3, comment='Maximum number of retry attempts'),
        sa.Column('backup_metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=True, comment='Additional backup metadata and configuration'),
        sa.Column('celery_task_id', sa.String(length=255), nullable=True, comment='Celery task ID for tracking'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False, comment='Record creation timestamp'),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False, comment='Record last update timestamp'),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True, comment='Soft delete flag'),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes for backup_operations
    op.create_index('idx_backup_operation_type', 'backup_operations', ['operation_type'])
    op.create_index('idx_backup_operation_status', 'backup_operations', ['status'])
    op.create_index('idx_backup_operation_tenant_ids', 'backup_operations', ['tenant_ids'], postgresql_using='gin')
    op.create_index('idx_backup_operation_progress', 'backup_operations', ['progress_percentage'])
    op.create_index('idx_backup_operation_started_at', 'backup_operations', ['started_at'])
    op.create_index('idx_backup_operation_completed_at', 'backup_operations', ['completed_at'])
    op.create_index('idx_backup_operation_integrity', 'backup_operations', ['integrity_verified'])
    op.create_index('idx_backup_operation_celery_task', 'backup_operations', ['celery_task_id'])
    op.create_index('idx_backup_operation_created_at', 'backup_operations', ['created_at'])
    op.create_index('idx_backup_operation_active', 'backup_operations', ['is_active'])
    
    # Create operation_logs table
    op.create_table('operation_logs',
        sa.Column('id', sa.UUID(), nullable=False, comment='Primary key UUID'),
        sa.Column('operation_id', sa.UUID(), nullable=False, comment='Reference to backup operation'),
        sa.Column('operation_type', sa.String(length=50), nullable=False, comment='Type of operation (BACKUP, RESTORE, ROLLBACK)'),
        sa.Column('log_level', sa.String(length=20), nullable=False, comment='Log level (DEBUG, INFO, WARNING, ERROR, CRITICAL)'),
        sa.Column('message', sa.Text(), nullable=False, comment='Log message'),
        sa.Column('details', postgresql.JSONB(astext_type=sa.Text()), nullable=True, comment='Additional log details and context'),
        sa.Column('step_name', sa.String(length=255), nullable=False, comment='Current operation step name'),
        sa.Column('progress_at_time', sa.Float(), nullable=False, comment='Progress percentage at time of log entry'),
        sa.Column('component', sa.String(length=100), nullable=True, comment='Component or service that generated the log'),
        sa.Column('function_name', sa.String(length=100), nullable=True, comment='Function or method name'),
        sa.Column('execution_time_ms', sa.Float(), nullable=True, comment='Execution time in milliseconds for this step'),
        sa.Column('memory_usage_mb', sa.Float(), nullable=True, comment='Memory usage in MB at time of log'),
        sa.Column('error_code', sa.String(length=50), nullable=True, comment='Error code for categorization'),
        sa.Column('stack_trace', sa.Text(), nullable=True, comment='Stack trace for errors'),
        sa.Column('tenant_id', sa.UUID(), nullable=True, comment='Tenant ID if log is tenant-specific'),
        sa.Column('storage_provider', sa.String(length=50), nullable=True, comment='Storage provider if log is storage-related'),
        sa.Column('file_path', sa.String(length=500), nullable=True, comment='File path if log is file-related'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False, comment='Record creation timestamp'),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False, comment='Record last update timestamp'),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True, comment='Soft delete flag'),
        sa.ForeignKeyConstraint(['operation_id'], ['backup_operations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes for operation_logs
    op.create_index('idx_operation_log_operation', 'operation_logs', ['operation_id'])
    op.create_index('idx_operation_log_operation_type', 'operation_logs', ['operation_type'])
    op.create_index('idx_operation_log_level', 'operation_logs', ['log_level'])
    op.create_index('idx_operation_log_step', 'operation_logs', ['step_name'])
    op.create_index('idx_operation_log_progress', 'operation_logs', ['progress_at_time'])
    op.create_index('idx_operation_log_component', 'operation_logs', ['component'])
    op.create_index('idx_operation_log_error_code', 'operation_logs', ['error_code'])
    op.create_index('idx_operation_log_tenant', 'operation_logs', ['tenant_id'])
    op.create_index('idx_operation_log_storage_provider', 'operation_logs', ['storage_provider'])
    op.create_index('idx_operation_log_created_at', 'operation_logs', ['created_at'])
    op.create_index('idx_operation_log_active', 'operation_logs', ['is_active'])
    
    # Create rollback_points table
    op.create_table('rollback_points',
        sa.Column('id', sa.UUID(), nullable=False, comment='Primary key UUID'),
        sa.Column('description', sa.String(length=500), nullable=False, comment='Description of the rollback point'),
        sa.Column('created_by_operation_id', sa.UUID(), nullable=False, comment='Backup operation that created this rollback point'),
        sa.Column('system_state', postgresql.JSONB(astext_type=sa.Text()), nullable=False, comment='Complete system state at rollback point creation'),
        sa.Column('container_states', postgresql.JSONB(astext_type=sa.Text()), nullable=False, comment='Container states and configurations'),
        sa.Column('volume_snapshots', postgresql.JSONB(astext_type=sa.Text()), nullable=False, comment='Volume snapshots and data locations'),
        sa.Column('database_state', postgresql.JSONB(astext_type=sa.Text()), nullable=True, comment='Database state and schema information'),
        sa.Column('rollback_data_location', sa.String(length=500), nullable=False, comment='Location of rollback data files'),
        sa.Column('rollback_size', sa.Numeric(precision=15, scale=0), nullable=False, comment='Total size of rollback data in bytes'),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True, comment='Rollback point expiration time'),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True, comment='Whether rollback point is active'),
        sa.Column('can_rollback', sa.Boolean(), nullable=False, default=True, comment='Whether rollback is possible'),
        sa.Column('integrity_verified', sa.Boolean(), nullable=False, default=False, comment='Whether rollback point integrity is verified'),
        sa.Column('verification_checksum', sa.String(length=64), nullable=True, comment='Checksum for rollback point verification'),
        sa.Column('rollback_count', sa.Integer(), nullable=False, default=0, comment='Number of times this rollback point was used'),
        sa.Column('last_rollback_at', sa.DateTime(timezone=True), nullable=True, comment='Last time this rollback point was used'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False, comment='Record creation timestamp'),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False, comment='Record last update timestamp'),
        sa.ForeignKeyConstraint(['created_by_operation_id'], ['backup_operations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes for rollback_points
    op.create_index('idx_rollback_point_operation', 'rollback_points', ['created_by_operation_id'])
    op.create_index('idx_rollback_point_active', 'rollback_points', ['is_active'])
    op.create_index('idx_rollback_point_can_rollback', 'rollback_points', ['can_rollback'])
    op.create_index('idx_rollback_point_expires_at', 'rollback_points', ['expires_at'])
    op.create_index('idx_rollback_point_verified', 'rollback_points', ['integrity_verified'])
    op.create_index('idx_rollback_point_created_at', 'rollback_points', ['created_at'])
    
    # Create disaster_recovery_backups table
    op.create_table('disaster_recovery_backups',
        sa.Column('id', sa.UUID(), nullable=False, comment='Primary key UUID'),
        sa.Column('backup_operation_id', sa.UUID(), nullable=False, comment='Reference to base backup operation'),
        sa.Column('backup_type', sa.String(length=50), nullable=False, comment='Type of disaster recovery backup (FULL_SYSTEM, CONTAINERS_ONLY, VOLUMES_ONLY, CONFIGS_ONLY, DATABASE_ONLY)'),
        sa.Column('includes_containers', sa.Boolean(), nullable=False, default=True, comment='Whether backup includes Docker containers'),
        sa.Column('includes_volumes', sa.Boolean(), nullable=False, default=True, comment='Whether backup includes Docker volumes'),
        sa.Column('includes_configs', sa.Boolean(), nullable=False, default=True, comment='Whether backup includes configuration files'),
        sa.Column('includes_database', sa.Boolean(), nullable=False, default=True, comment='Whether backup includes database'),
        sa.Column('docker_compose_version', sa.String(length=50), nullable=True, comment='Docker Compose version at backup time'),
        sa.Column('container_versions', postgresql.JSONB(astext_type=sa.Text()), nullable=True, comment='Container image versions and tags'),
        sa.Column('volume_mappings', postgresql.JSONB(astext_type=sa.Text()), nullable=True, comment='Docker volume mappings and configurations'),
        sa.Column('environment_variables', postgresql.JSONB(astext_type=sa.Text()), nullable=True, comment='Environment variables and configurations'),
        sa.Column('network_configurations', postgresql.JSONB(astext_type=sa.Text()), nullable=True, comment='Docker network configurations'),
        sa.Column('system_state', postgresql.JSONB(astext_type=sa.Text()), nullable=True, comment='Complete system state snapshot'),
        sa.Column('container_states', postgresql.JSONB(astext_type=sa.Text()), nullable=True, comment='Individual container states and configurations'),
        sa.Column('containers_backup_path', sa.String(length=500), nullable=True, comment='Path to containers backup file'),
        sa.Column('volumes_backup_path', sa.String(length=500), nullable=True, comment='Path to volumes backup file'),
        sa.Column('configs_backup_path', sa.String(length=500), nullable=True, comment='Path to configurations backup file'),
        sa.Column('database_backup_path', sa.String(length=500), nullable=True, comment='Path to database backup file'),
        sa.Column('containers_size', sa.Numeric(precision=15, scale=0), nullable=True, comment='Size of containers backup in bytes'),
        sa.Column('volumes_size', sa.Numeric(precision=15, scale=0), nullable=True, comment='Size of volumes backup in bytes'),
        sa.Column('configs_size', sa.Numeric(precision=15, scale=0), nullable=True, comment='Size of configurations backup in bytes'),
        sa.Column('database_size', sa.Numeric(precision=15, scale=0), nullable=True, comment='Size of database backup in bytes'),
        sa.Column('created_rollback_point_id', sa.UUID(), nullable=True, comment='Rollback point created during this backup'),
        sa.Column('platform_version', sa.String(length=100), nullable=True, comment='HesaabPlus platform version at backup time'),
        sa.Column('os_information', postgresql.JSONB(astext_type=sa.Text()), nullable=True, comment='Operating system information'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False, comment='Record creation timestamp'),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False, comment='Record last update timestamp'),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True, comment='Soft delete flag'),
        sa.ForeignKeyConstraint(['backup_operation_id'], ['backup_operations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['created_rollback_point_id'], ['rollback_points.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes for disaster_recovery_backups
    op.create_index('idx_disaster_recovery_backup_operation', 'disaster_recovery_backups', ['backup_operation_id'])
    op.create_index('idx_disaster_recovery_type', 'disaster_recovery_backups', ['backup_type'])
    op.create_index('idx_disaster_recovery_includes_containers', 'disaster_recovery_backups', ['includes_containers'])
    op.create_index('idx_disaster_recovery_includes_volumes', 'disaster_recovery_backups', ['includes_volumes'])
    op.create_index('idx_disaster_recovery_includes_database', 'disaster_recovery_backups', ['includes_database'])
    op.create_index('idx_disaster_recovery_rollback_point', 'disaster_recovery_backups', ['created_rollback_point_id'])
    op.create_index('idx_disaster_recovery_created_at', 'disaster_recovery_backups', ['created_at'])
    op.create_index('idx_disaster_recovery_active', 'disaster_recovery_backups', ['is_active'])
    
    # Create enhanced_storage_locations table
    op.create_table('enhanced_storage_locations',
        sa.Column('id', sa.UUID(), nullable=False, comment='Primary key UUID'),
        sa.Column('name', sa.String(length=255), nullable=False, unique=True, comment='Storage location name'),
        sa.Column('provider', sa.String(length=50), nullable=False, comment='Storage provider type (CLOUDFLARE_R2, BACKBLAZE_B2, LOCAL, AWS_S3, GOOGLE_CLOUD)'),
        sa.Column('description', sa.Text(), nullable=True, comment='Storage location description'),
        sa.Column('endpoint', sa.String(length=500), nullable=True, comment='Storage endpoint URL'),
        sa.Column('region', sa.String(length=100), nullable=True, comment='Storage region'),
        sa.Column('bucket_name', sa.String(length=255), nullable=True, comment='Bucket or container name'),
        sa.Column('access_key', sa.String(length=500), nullable=True, comment='Access key (encrypted)'),
        sa.Column('secret_key', sa.String(length=500), nullable=True, comment='Secret key (encrypted)'),
        sa.Column('configuration', postgresql.JSONB(astext_type=sa.Text()), nullable=True, comment='Additional provider-specific configuration'),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True, comment='Whether location is active'),
        sa.Column('is_primary', sa.Boolean(), nullable=False, default=False, comment='Whether this is the primary storage location'),
        sa.Column('is_verified', sa.Boolean(), nullable=False, default=False, comment='Whether storage location connectivity is verified'),
        sa.Column('total_backups', sa.Integer(), nullable=False, default=0, comment='Total number of backups stored'),
        sa.Column('total_size', sa.Numeric(precision=15, scale=0), nullable=False, default=0, comment='Total storage used in bytes'),
        sa.Column('available_space', sa.Numeric(precision=15, scale=0), nullable=True, comment='Available storage space in bytes'),
        sa.Column('average_upload_speed', sa.Numeric(precision=10, scale=2), nullable=True, comment='Average upload speed in MB/s'),
        sa.Column('average_download_speed', sa.Numeric(precision=10, scale=2), nullable=True, comment='Average download speed in MB/s'),
        sa.Column('last_backup_at', sa.DateTime(timezone=True), nullable=True, comment='Last backup timestamp'),
        sa.Column('last_verified_at', sa.DateTime(timezone=True), nullable=True, comment='Last verification timestamp'),
        sa.Column('last_error', sa.Text(), nullable=True, comment='Last error message'),
        sa.Column('error_count', sa.Integer(), nullable=False, default=0, comment='Total error count'),
        sa.Column('retention_days', sa.Integer(), nullable=True, comment='Backup retention period in days'),
        sa.Column('max_backups', sa.Integer(), nullable=True, comment='Maximum number of backups to keep'),
        sa.Column('encryption_enabled', sa.Boolean(), nullable=False, default=True, comment='Whether encryption is enabled'),
        sa.Column('encryption_key_id', sa.String(length=255), nullable=True, comment='Encryption key identifier'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False, comment='Record creation timestamp'),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False, comment='Record last update timestamp'),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes for enhanced_storage_locations
    op.create_index('idx_enhanced_storage_location_name', 'enhanced_storage_locations', ['name'])
    op.create_index('idx_enhanced_storage_location_provider', 'enhanced_storage_locations', ['provider'])
    op.create_index('idx_enhanced_storage_location_active', 'enhanced_storage_locations', ['is_active'])
    op.create_index('idx_enhanced_storage_location_primary', 'enhanced_storage_locations', ['is_primary'])
    op.create_index('idx_enhanced_storage_location_verified', 'enhanced_storage_locations', ['is_verified'])
    op.create_index('idx_enhanced_storage_location_bucket', 'enhanced_storage_locations', ['bucket_name'])
    op.create_index('idx_enhanced_storage_location_last_backup', 'enhanced_storage_locations', ['last_backup_at'])
    op.create_index('idx_enhanced_storage_location_last_verified', 'enhanced_storage_locations', ['last_verified_at'])
    op.create_index('idx_enhanced_storage_location_error_count', 'enhanced_storage_locations', ['error_count'])
    op.create_index('idx_enhanced_storage_location_created_at', 'enhanced_storage_locations', ['created_at'])
    
    print("Enhanced backup system tables created successfully!")
    print("- backup_operations: Main backup operation tracking")
    print("- operation_logs: Detailed operation logging")
    print("- rollback_points: System rollback point management")
    print("- disaster_recovery_backups: Disaster recovery specific data")
    print("- enhanced_storage_locations: Enhanced storage provider management")
    print("All tables include comprehensive indexes for optimal performance")


def downgrade():
    """
    Drop enhanced backup system tables
    """
    
    # Get database connection to check if tables exist
    connection = op.get_bind()
    
    # Check and drop tables in reverse order (respecting foreign key constraints)
    tables_to_drop = [
        'disaster_recovery_backups',
        'rollback_points', 
        'operation_logs',
        'enhanced_storage_locations',
        'backup_operations'
    ]
    
    for table_name in tables_to_drop:
        # Check if table exists before dropping
        result = connection.execute(text(f"""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = '{table_name}'
            );
        """))
        
        if result.scalar():
            op.drop_table(table_name)
            print(f"Dropped {table_name} table")
        else:
            print(f"Table {table_name} does not exist, skipping")
    
    print("Enhanced backup system tables cleanup completed!")


if __name__ == "__main__":
    print("This is an Alembic migration script")
    print("Run with: alembic upgrade head")