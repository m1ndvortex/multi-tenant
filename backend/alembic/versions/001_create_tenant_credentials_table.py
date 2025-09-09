"""Create tenant credentials table

Revision ID: 001_tenant_credentials
Revises: efbc6dbd851d
Create Date: 2025-01-09 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '001_tenant_credentials'
down_revision = 'create_subscription_history'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create tenant credentials table with comprehensive tracking"""
    
    # Create tenant_credentials table
    op.create_table(
        'tenant_credentials',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, primary_key=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True),
        
        # Foreign Keys
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('changed_by_admin_id', postgresql.UUID(as_uuid=True), nullable=True),
        
        # Credentials Information
        sa.Column('username', sa.String(255), nullable=False),
        sa.Column('password_hash', sa.String(255), nullable=False),
        
        # Password Change Tracking
        sa.Column('password_changed_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('previous_password_hash', sa.String(255), nullable=True),
        sa.Column('password_change_count', sa.Integer(), nullable=False, default=0),
        
        # Security Information
        sa.Column('last_login_attempt', sa.DateTime(timezone=True), nullable=True),
        sa.Column('failed_login_attempts', sa.Integer(), nullable=False, default=0),
        sa.Column('account_locked_until', sa.DateTime(timezone=True), nullable=True),
        
        # Change History and Notes
        sa.Column('change_history', sa.Text(), nullable=True),
        sa.Column('admin_notes', sa.Text(), nullable=True),
        
        # Constraints
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['changed_by_admin_id'], ['users.id'], ondelete='SET NULL'),
        sa.UniqueConstraint('tenant_id', name='uq_tenant_credentials_tenant_id'),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes for performance optimization
    op.create_index('idx_tenant_credentials_tenant_id', 'tenant_credentials', ['tenant_id'], unique=True)
    op.create_index('idx_tenant_credentials_user_id', 'tenant_credentials', ['user_id'])
    op.create_index('idx_tenant_credentials_username', 'tenant_credentials', ['username'])
    op.create_index('idx_tenant_credentials_changed_at', 'tenant_credentials', ['password_changed_at'])
    op.create_index('idx_tenant_credentials_admin', 'tenant_credentials', ['changed_by_admin_id'])
    op.create_index('idx_tenant_credentials_locked', 'tenant_credentials', ['account_locked_until'])
    
    # Add comments to table and columns
    op.execute("COMMENT ON TABLE tenant_credentials IS 'Tracks tenant owner credentials and password changes with admin context'")
    op.execute("COMMENT ON COLUMN tenant_credentials.tenant_id IS 'Tenant ID'")
    op.execute("COMMENT ON COLUMN tenant_credentials.user_id IS 'Tenant owner user ID'")
    op.execute("COMMENT ON COLUMN tenant_credentials.username IS 'Current username/email for tenant owner'")
    op.execute("COMMENT ON COLUMN tenant_credentials.password_hash IS 'Current password hash'")
    op.execute("COMMENT ON COLUMN tenant_credentials.password_changed_at IS 'When password was last changed'")
    op.execute("COMMENT ON COLUMN tenant_credentials.changed_by_admin_id IS 'Admin user who changed the password (null if changed by owner)'")
    op.execute("COMMENT ON COLUMN tenant_credentials.previous_password_hash IS 'Previous password hash (for preventing reuse)'")
    op.execute("COMMENT ON COLUMN tenant_credentials.password_change_count IS 'Total number of password changes'")
    op.execute("COMMENT ON COLUMN tenant_credentials.last_login_attempt IS 'Last login attempt timestamp'")
    op.execute("COMMENT ON COLUMN tenant_credentials.failed_login_attempts IS 'Number of consecutive failed login attempts'")
    op.execute("COMMENT ON COLUMN tenant_credentials.account_locked_until IS 'Account lock expiration time'")
    op.execute("COMMENT ON COLUMN tenant_credentials.change_history IS 'JSON array of password change history'")
    op.execute("COMMENT ON COLUMN tenant_credentials.admin_notes IS 'Admin notes about credential changes'")


def downgrade() -> None:
    """Drop tenant credentials table"""
    
    # Drop indexes
    op.drop_index('idx_tenant_credentials_locked', table_name='tenant_credentials')
    op.drop_index('idx_tenant_credentials_admin', table_name='tenant_credentials')
    op.drop_index('idx_tenant_credentials_changed_at', table_name='tenant_credentials')
    op.drop_index('idx_tenant_credentials_username', table_name='tenant_credentials')
    op.drop_index('idx_tenant_credentials_user_id', table_name='tenant_credentials')
    op.drop_index('idx_tenant_credentials_tenant_id', table_name='tenant_credentials')
    
    # Drop table
    op.drop_table('tenant_credentials')