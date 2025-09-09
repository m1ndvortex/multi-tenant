"""Create enhanced error logs table

Revision ID: 002_enhanced_error_logs
Revises: 001_tenant_credentials
Create Date: 2025-01-09 10:15:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '002_enhanced_error_logs'
down_revision = '001_tenant_credentials'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create enhanced error logs table with real-time capabilities"""
    
    # Create error severity enum
    error_severity_enum = postgresql.ENUM(
        'low', 'medium', 'high', 'critical',
        name='errorseverity',
        create_type=False
    )
    error_severity_enum.create(op.get_bind(), checkfirst=True)
    
    # Create error status enum
    error_status_enum = postgresql.ENUM(
        'active', 'acknowledged', 'resolved', 'ignored',
        name='errorstatus',
        create_type=False
    )
    error_status_enum.create(op.get_bind(), checkfirst=True)
    
    # Create error category enum
    error_category_enum = postgresql.ENUM(
        'authentication', 'authorization', 'validation', 'database',
        'external_api', 'business_logic', 'system', 'network',
        'performance', 'security', 'tenant_isolation', 'subscription', 'unknown',
        name='errorcategory',
        create_type=False
    )
    error_category_enum.create(op.get_bind(), checkfirst=True)
    
    # Create error_logs table
    op.create_table(
        'error_logs',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, primary_key=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True),
        
        # Tenant Context
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=True),
        
        # Error Classification
        sa.Column('error_type', sa.String(255), nullable=False),
        sa.Column('error_message', sa.Text(), nullable=False),
        sa.Column('error_code', sa.String(50), nullable=True),
        sa.Column('severity', error_severity_enum, nullable=False, default='medium'),
        sa.Column('status', error_status_enum, nullable=False, default='active'),
        sa.Column('category', error_category_enum, nullable=False, default='unknown'),
        
        # Request Context
        sa.Column('endpoint', sa.String(500), nullable=True),
        sa.Column('method', sa.String(10), nullable=True),
        sa.Column('status_code', sa.Integer(), nullable=True),
        sa.Column('request_id', sa.String(255), nullable=True),
        sa.Column('session_id', sa.String(255), nullable=True),
        
        # Client Context
        sa.Column('ip_address', sa.String(45), nullable=True),
        sa.Column('user_agent', sa.Text(), nullable=True),
        
        # Error Details
        sa.Column('stack_trace', sa.Text(), nullable=True),
        sa.Column('context_data', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('request_data', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('response_data', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        
        # Occurrence Tracking
        sa.Column('occurrence_count', sa.Integer(), nullable=False, default=1),
        sa.Column('first_occurred_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('last_occurred_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        
        # Resolution Tracking
        sa.Column('resolved_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('resolved_by_admin_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('resolution_notes', sa.Text(), nullable=True),
        
        # Notification Tracking
        sa.Column('notification_sent', sa.Boolean(), nullable=False, default=False),
        sa.Column('notification_sent_at', sa.DateTime(timezone=True), nullable=True),
        
        # Performance Impact
        sa.Column('response_time_ms', sa.Integer(), nullable=True),
        sa.Column('memory_usage_mb', sa.Integer(), nullable=True),
        
        # Constraints
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['resolved_by_admin_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create comprehensive indexes for performance optimization
    op.create_index('idx_error_log_tenant_status', 'error_logs', ['tenant_id', 'status'])
    op.create_index('idx_error_log_severity_status', 'error_logs', ['severity', 'status'])
    op.create_index('idx_error_log_category_status', 'error_logs', ['category', 'status'])
    op.create_index('idx_error_log_status_occurred', 'error_logs', ['status', 'last_occurred_at'])
    op.create_index('idx_error_log_tenant_severity', 'error_logs', ['tenant_id', 'severity'])
    op.create_index('idx_error_log_type_tenant', 'error_logs', ['error_type', 'tenant_id'])
    op.create_index('idx_error_log_endpoint_status', 'error_logs', ['endpoint', 'status'])
    op.create_index('idx_error_log_notification', 'error_logs', ['notification_sent', 'severity'])
    op.create_index('idx_error_log_occurrence_count', 'error_logs', ['occurrence_count'])
    op.create_index('idx_error_log_resolved_by', 'error_logs', ['resolved_by_admin_id'])
    op.create_index('idx_error_log_first_occurred', 'error_logs', ['first_occurred_at'])
    
    # Create composite index for duplicate detection
    op.create_index(
        'idx_error_log_duplicate_detection', 
        'error_logs', 
        ['error_type', 'error_message', 'tenant_id', 'status', 'last_occurred_at']
    )
    
    # Individual field indexes
    op.create_index('idx_error_log_tenant_id', 'error_logs', ['tenant_id'])
    op.create_index('idx_error_log_user_id', 'error_logs', ['user_id'])
    op.create_index('idx_error_log_error_type', 'error_logs', ['error_type'])
    op.create_index('idx_error_log_severity', 'error_logs', ['severity'])
    op.create_index('idx_error_log_status', 'error_logs', ['status'])
    op.create_index('idx_error_log_category', 'error_logs', ['category'])
    op.create_index('idx_error_log_endpoint', 'error_logs', ['endpoint'])
    op.create_index('idx_error_log_status_code', 'error_logs', ['status_code'])
    op.create_index('idx_error_log_request_id', 'error_logs', ['request_id'])
    op.create_index('idx_error_log_session_id', 'error_logs', ['session_id'])
    op.create_index('idx_error_log_ip_address', 'error_logs', ['ip_address'])
    
    # Add comments to table and columns
    op.execute("COMMENT ON TABLE error_logs IS 'Enhanced error log model for comprehensive error tracking with real-time capabilities'")
    op.execute("COMMENT ON COLUMN error_logs.tenant_id IS 'Tenant ID for tenant-specific errors'")
    op.execute("COMMENT ON COLUMN error_logs.user_id IS 'User ID if error is user-specific'")
    op.execute("COMMENT ON COLUMN error_logs.error_type IS 'Error type/class name'")
    op.execute("COMMENT ON COLUMN error_logs.error_message IS 'Error message'")
    op.execute("COMMENT ON COLUMN error_logs.error_code IS 'Application-specific error code'")
    op.execute("COMMENT ON COLUMN error_logs.severity IS 'Error severity level'")
    op.execute("COMMENT ON COLUMN error_logs.status IS 'Error resolution status'")
    op.execute("COMMENT ON COLUMN error_logs.category IS 'Error category for classification'")
    op.execute("COMMENT ON COLUMN error_logs.endpoint IS 'API endpoint where error occurred'")
    op.execute("COMMENT ON COLUMN error_logs.method IS 'HTTP method'")
    op.execute("COMMENT ON COLUMN error_logs.status_code IS 'HTTP status code'")
    op.execute("COMMENT ON COLUMN error_logs.request_id IS 'Request tracking ID'")
    op.execute("COMMENT ON COLUMN error_logs.session_id IS 'User session ID'")
    op.execute("COMMENT ON COLUMN error_logs.ip_address IS 'Client IP address'")
    op.execute("COMMENT ON COLUMN error_logs.user_agent IS 'User agent string'")
    op.execute("COMMENT ON COLUMN error_logs.stack_trace IS 'Full stack trace'")
    op.execute("COMMENT ON COLUMN error_logs.context_data IS 'Additional error context data'")
    op.execute("COMMENT ON COLUMN error_logs.request_data IS 'Sanitized request data'")
    op.execute("COMMENT ON COLUMN error_logs.response_data IS 'Sanitized response data'")
    op.execute("COMMENT ON COLUMN error_logs.occurrence_count IS 'Number of times this error occurred'")
    op.execute("COMMENT ON COLUMN error_logs.first_occurred_at IS 'First occurrence timestamp'")
    op.execute("COMMENT ON COLUMN error_logs.last_occurred_at IS 'Last occurrence timestamp'")
    op.execute("COMMENT ON COLUMN error_logs.resolved_at IS 'Resolution timestamp'")
    op.execute("COMMENT ON COLUMN error_logs.resolved_by_admin_id IS 'Admin user who resolved the error'")
    op.execute("COMMENT ON COLUMN error_logs.resolution_notes IS 'Resolution notes and actions taken'")
    op.execute("COMMENT ON COLUMN error_logs.notification_sent IS 'Whether notification was sent'")
    op.execute("COMMENT ON COLUMN error_logs.notification_sent_at IS 'Notification timestamp'")
    op.execute("COMMENT ON COLUMN error_logs.response_time_ms IS 'Response time in milliseconds'")
    op.execute("COMMENT ON COLUMN error_logs.memory_usage_mb IS 'Memory usage in MB at time of error'")


def downgrade() -> None:
    """Drop enhanced error logs table"""
    
    # Drop indexes
    op.drop_index('idx_error_log_ip_address', table_name='error_logs')
    op.drop_index('idx_error_log_session_id', table_name='error_logs')
    op.drop_index('idx_error_log_request_id', table_name='error_logs')
    op.drop_index('idx_error_log_status_code', table_name='error_logs')
    op.drop_index('idx_error_log_endpoint', table_name='error_logs')
    op.drop_index('idx_error_log_category', table_name='error_logs')
    op.drop_index('idx_error_log_status', table_name='error_logs')
    op.drop_index('idx_error_log_severity', table_name='error_logs')
    op.drop_index('idx_error_log_error_type', table_name='error_logs')
    op.drop_index('idx_error_log_user_id', table_name='error_logs')
    op.drop_index('idx_error_log_tenant_id', table_name='error_logs')
    op.drop_index('idx_error_log_duplicate_detection', table_name='error_logs')
    op.drop_index('idx_error_log_first_occurred', table_name='error_logs')
    op.drop_index('idx_error_log_resolved_by', table_name='error_logs')
    op.drop_index('idx_error_log_occurrence_count', table_name='error_logs')
    op.drop_index('idx_error_log_notification', table_name='error_logs')
    op.drop_index('idx_error_log_endpoint_status', table_name='error_logs')
    op.drop_index('idx_error_log_type_tenant', table_name='error_logs')
    op.drop_index('idx_error_log_tenant_severity', table_name='error_logs')
    op.drop_index('idx_error_log_status_occurred', table_name='error_logs')
    op.drop_index('idx_error_log_category_status', table_name='error_logs')
    op.drop_index('idx_error_log_severity_status', table_name='error_logs')
    op.drop_index('idx_error_log_tenant_status', table_name='error_logs')
    
    # Drop table
    op.drop_table('error_logs')
    
    # Drop enums
    op.execute('DROP TYPE IF EXISTS errorcategory')
    op.execute('DROP TYPE IF EXISTS errorstatus')
    op.execute('DROP TYPE IF EXISTS errorseverity')