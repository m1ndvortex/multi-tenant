"""Create impersonation sessions table

Revision ID: 7f9936d88f4e
Revises: 8cccaaba4c14
Create Date: 2025-09-11 08:18:24.717656

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = '7f9936d88f4e'
down_revision = '8cccaaba4c14'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Check if table exists first
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    
    if 'impersonation_sessions' not in inspector.get_table_names():
        # Create impersonation_sessions table
        op.create_table(
        'impersonation_sessions',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('session_id', sa.String(255), nullable=False),
        sa.Column('admin_user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('target_user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('target_tenant_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('ended_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True),
        sa.Column('is_window_based', sa.Boolean(), nullable=False, default=False),
        sa.Column('window_closed_detected', sa.Boolean(), nullable=False, default=False),
        sa.Column('ip_address', sa.String(45), nullable=True),
        sa.Column('user_agent', sa.Text(), nullable=True),
        sa.Column('reason', sa.Text(), nullable=True),
        sa.Column('jwt_token_hash', sa.String(255), nullable=True),
        sa.Column('last_activity_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('activity_count', sa.Integer(), nullable=False, default=0),
        sa.Column('termination_reason', sa.String(100), nullable=True),
        sa.Column('terminated_by_admin_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['admin_user_id'], ['users.id']),
        sa.ForeignKeyConstraint(['target_user_id'], ['users.id']),
        sa.ForeignKeyConstraint(['target_tenant_id'], ['tenants.id']),
        sa.ForeignKeyConstraint(['terminated_by_admin_id'], ['users.id'])
    )
    
        # Create indexes for better performance
        op.create_index('ix_impersonation_sessions_session_id', 'impersonation_sessions', ['session_id'], unique=True)
        op.create_index('ix_impersonation_sessions_admin_user_id', 'impersonation_sessions', ['admin_user_id'])
        op.create_index('ix_impersonation_sessions_target_user_id', 'impersonation_sessions', ['target_user_id'])
        op.create_index('ix_impersonation_sessions_target_tenant_id', 'impersonation_sessions', ['target_tenant_id'])
        op.create_index('ix_impersonation_sessions_is_active', 'impersonation_sessions', ['is_active'])
        op.create_index('ix_impersonation_sessions_started_at', 'impersonation_sessions', ['started_at'])
        op.create_index('ix_impersonation_sessions_expires_at', 'impersonation_sessions', ['expires_at'])


def downgrade() -> None:
    # Check if table exists before dropping
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    
    if 'impersonation_sessions' in inspector.get_table_names():
        # Drop indexes
        op.drop_index('ix_impersonation_sessions_expires_at', 'impersonation_sessions')
        op.drop_index('ix_impersonation_sessions_started_at', 'impersonation_sessions')
        op.drop_index('ix_impersonation_sessions_is_active', 'impersonation_sessions')
        op.drop_index('ix_impersonation_sessions_target_tenant_id', 'impersonation_sessions')
        op.drop_index('ix_impersonation_sessions_target_user_id', 'impersonation_sessions')
        op.drop_index('ix_impersonation_sessions_admin_user_id', 'impersonation_sessions')
        op.drop_index('ix_impersonation_sessions_session_id', 'impersonation_sessions')
        
        # Drop table
        op.drop_table('impersonation_sessions')