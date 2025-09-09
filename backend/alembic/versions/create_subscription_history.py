"""Create subscription history table

Revision ID: create_subscription_history
Revises: eeb4c0235184
Create Date: 2025-09-08 22:30:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'create_subscription_history'
down_revision = 'eeb4c0235184'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create subscription_history table
    op.create_table(
        'subscription_history',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False, comment='Primary key UUID'),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False, comment='Tenant ID'),
        sa.Column('admin_id', postgresql.UUID(as_uuid=True), nullable=True, comment='Admin user who made the change'),
        sa.Column('action', sa.String(50), nullable=False, comment='Type of subscription action'),
        sa.Column('old_subscription_type', sa.String(50), nullable=True, comment='Previous subscription type'),
        sa.Column('new_subscription_type', sa.String(50), nullable=False, comment='New subscription type'),
        sa.Column('duration_months', sa.Integer, nullable=True, comment='Duration in months (for extensions/renewals)'),
        sa.Column('old_expiry_date', sa.DateTime(timezone=True), nullable=True, comment='Previous expiry date'),
        sa.Column('new_expiry_date', sa.DateTime(timezone=True), nullable=True, comment='New expiry date'),
        sa.Column('reason', sa.Text, nullable=True, comment='Reason for the change'),
        sa.Column('notes', sa.Text, nullable=True, comment='Additional notes about the change'),
        sa.Column('change_date', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False, comment='When the change was made'),
        sa.Column('ip_address', sa.String(45), nullable=True, comment='IP address of admin making change'),
        sa.Column('user_agent', sa.Text, nullable=True, comment='User agent of admin making change'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False, comment='Record creation timestamp'),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False, comment='Record last update timestamp'),
        sa.Column('is_active', sa.Boolean, default=True, nullable=False, comment='Soft delete flag'),
    )
    
    # Add foreign key constraints
    op.create_foreign_key(
        'fk_subscription_history_tenant_id',
        'subscription_history', 'tenants',
        ['tenant_id'], ['id'],
        ondelete='CASCADE'
    )
    
    op.create_foreign_key(
        'fk_subscription_history_admin_id',
        'subscription_history', 'users',
        ['admin_id'], ['id'],
        ondelete='SET NULL'
    )
    
    # Create indexes
    op.create_index('idx_subscription_history_tenant_id', 'subscription_history', ['tenant_id'])
    op.create_index('idx_subscription_history_admin_id', 'subscription_history', ['admin_id'])
    op.create_index('idx_subscription_history_action', 'subscription_history', ['action'])
    op.create_index('idx_subscription_history_change_date', 'subscription_history', ['change_date'])
    op.create_index('idx_subscription_history_tenant_date', 'subscription_history', ['tenant_id', 'change_date'])


def downgrade() -> None:
    # Drop indexes
    op.drop_index('idx_subscription_history_tenant_date', 'subscription_history')
    op.drop_index('idx_subscription_history_change_date', 'subscription_history')
    op.drop_index('idx_subscription_history_action', 'subscription_history')
    op.drop_index('idx_subscription_history_admin_id', 'subscription_history')
    op.drop_index('idx_subscription_history_tenant_id', 'subscription_history')
    
    # Drop foreign key constraints
    op.drop_constraint('fk_subscription_history_admin_id', 'subscription_history', type_='foreignkey')
    op.drop_constraint('fk_subscription_history_tenant_id', 'subscription_history', type_='foreignkey')
    
    # Drop table
    op.drop_table('subscription_history')