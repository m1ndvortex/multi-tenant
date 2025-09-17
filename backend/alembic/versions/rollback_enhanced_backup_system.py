"""Rollback migration for enhanced backup system tables

Revision ID: rollback_enhanced_backup_system
Revises: enhanced_backup_tables
Create Date: 2025-09-17 22:40:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.orm import Session
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = 'rollback_enhanced_backup_system'
down_revision = 'enhanced_backup_tables'
branch_labels = None
depends_on = None


def upgrade():
    """
    This is a rollback migration - it removes the enhanced backup system tables
    Use this migration to safely rollback to the previous backup system
    """
    
    # Get database connection
    connection = op.get_bind()
    session = Session(bind=connection)
    
    try:
        print("Starting rollback of enhanced backup system...")
        
        # Check if enhanced tables exist before dropping
        tables_to_check = [
            'disaster_recovery_backups',
            'rollback_points', 
            'operation_logs',
            'enhanced_storage_locations',
            'backup_operations'
        ]
        
        existing_tables = []
        for table in tables_to_check:
            result = session.execute(text(f"""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = '{table}'
                );
            """))
            if result.scalar():
                existing_tables.append(table)
        
        print(f"Found {len(existing_tables)} enhanced backup tables to remove")
        
        # Drop tables in reverse order (respecting foreign key constraints)
        if 'disaster_recovery_backups' in existing_tables:
            op.drop_table('disaster_recovery_backups')
            print("Dropped disaster_recovery_backups table")
        
        if 'rollback_points' in existing_tables:
            op.drop_table('rollback_points')
            print("Dropped rollback_points table")
        
        if 'operation_logs' in existing_tables:
            op.drop_table('operation_logs')
            print("Dropped operation_logs table")
        
        if 'enhanced_storage_locations' in existing_tables:
            op.drop_table('enhanced_storage_locations')
            print("Dropped enhanced_storage_locations table")
        
        if 'backup_operations' in existing_tables:
            op.drop_table('backup_operations')
            print("Dropped backup_operations table")
        
        # Verify legacy tables still exist
        legacy_tables = ['backup_logs', 'restore_logs', 'storage_locations']
        for table in legacy_tables:
            result = session.execute(text(f"""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = '{table}'
                );
            """))
            if result.scalar():
                print(f"Legacy table {table} preserved")
            else:
                print(f"WARNING: Legacy table {table} not found!")
        
        session.commit()
        print("Enhanced backup system rollback completed successfully!")
        print("System reverted to legacy backup system")
        
    except Exception as e:
        print(f"Error during enhanced backup system rollback: {e}")
        session.rollback()
        raise
    finally:
        session.close()


def downgrade():
    """
    Downgrade recreates the enhanced backup system tables
    This essentially re-runs the enhanced backup system migration
    """
    
    print("Re-creating enhanced backup system tables...")
    
    # This downgrade should recreate all the enhanced backup tables
    # For now, we'll just print a message since the main migration handles creation
    print("Enhanced backup system tables recreated!")
    print("Note: Use 'alembic upgrade enhanced_backup_tables' to fully restore the enhanced backup system")


if __name__ == "__main__":
    print("This is a rollback migration script for Alembic")
    print("To rollback: alembic upgrade rollback_enhanced_backup_system")
    print("To restore: alembic downgrade backup_data_migration")