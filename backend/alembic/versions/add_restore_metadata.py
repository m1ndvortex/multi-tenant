"""Add restore_metadata to restore_logs

Revision ID: add_restore_metadata
Revises: 572646850d0a
Create Date: 2024-12-19 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_restore_metadata'
down_revision = 'd0316d20450f'
branch_labels = None
depends_on = None


def upgrade():
    # Add restore_metadata column to restore_logs table
    op.add_column('restore_logs', sa.Column('restore_metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=True, comment='Additional restore operation metadata'))


def downgrade():
    # Remove restore_metadata column from restore_logs table
    op.drop_column('restore_logs', 'restore_metadata')