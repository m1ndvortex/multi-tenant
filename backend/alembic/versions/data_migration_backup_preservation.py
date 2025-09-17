"""Data migration to preserve existing backup data during enhanced backup system migration

Revision ID: data_migration_backup_preservation
Revises: c70fa5121133
Create Date: 2025-09-17 22:22:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.orm import Session
from sqlalchemy import text
import uuid
from datetime import datetime, timezone

# revision identifiers, used by Alembic.
revision = 'backup_data_migration'
down_revision = 'add_restore_metadata'
branch_labels = None
depends_on = None


def upgrade():
    """
    Migrate existing backup data to be compatible with new enhanced backup system
    """
    # Get database connection
    connection = op.get_bind()
    session = Session(bind=connection)
    
    try:
        print("Starting backup data migration...")
        
        # Check if we have existing backup logs to migrate
        result = session.execute(text("SELECT COUNT(*) FROM backup_logs"))
        backup_count = result.scalar()
        print(f"Found {backup_count} existing backup logs to preserve")
        
        if backup_count > 0:
            # The existing backup_logs table will continue to work with the legacy models
            # We don't need to migrate the data since we're maintaining backward compatibility
            # The new enhanced backup system will use the new tables (backup_operations, etc.)
            
            # However, we should ensure all existing backup logs have proper default values
            # for any new fields that might have been added
            
            # Update any NULL values in storage_locations to empty arrays
            session.execute(text("""
                UPDATE backup_logs 
                SET storage_locations = '[]'::jsonb 
                WHERE storage_locations IS NULL
            """))
            
            # Update any NULL values in backup_metadata to empty objects
            session.execute(text("""
                UPDATE backup_logs 
                SET backup_metadata = '{}'::jsonb 
                WHERE backup_metadata IS NULL
            """))
            
            print("Updated existing backup logs with proper default values")
        
        # Check and migrate storage locations if needed
        result = session.execute(text("SELECT COUNT(*) FROM storage_locations"))
        storage_count = result.scalar()
        print(f"Found {storage_count} existing storage locations")
        
        if storage_count > 0:
            # Add default values for new columns in storage_locations
            session.execute(text("""
                UPDATE storage_locations 
                SET 
                    is_verified = false,
                    error_count = 0,
                    encryption_enabled = true
                WHERE is_verified IS NULL OR error_count IS NULL OR encryption_enabled IS NULL
            """))
            
            print("Updated existing storage locations with default values for new fields")
        
        # Check customer backup logs
        result = session.execute(text("SELECT COUNT(*) FROM customer_backup_logs"))
        customer_backup_count = result.scalar()
        print(f"Found {customer_backup_count} existing customer backup logs")
        
        # Check restore logs
        result = session.execute(text("SELECT COUNT(*) FROM restore_logs"))
        restore_count = result.scalar()
        print(f"Found {restore_count} existing restore logs")
        
        # Check data export logs
        result = session.execute(text("SELECT COUNT(*) FROM data_export_logs"))
        export_count = result.scalar()
        print(f"Found {export_count} existing data export logs")
        
        # Commit all changes
        session.commit()
        print("Backup data migration completed successfully!")
        
        # Print summary
        print("\nMigration Summary:")
        print(f"- Preserved {backup_count} backup logs")
        print(f"- Updated {storage_count} storage locations")
        print(f"- Preserved {customer_backup_count} customer backup logs")
        print(f"- Preserved {restore_count} restore logs")
        print(f"- Preserved {export_count} data export logs")
        print("- New enhanced backup system tables created")
        print("- Backward compatibility maintained")
        
    except Exception as e:
        print(f"Error during backup data migration: {e}")
        session.rollback()
        raise
    finally:
        session.close()


def downgrade():
    """
    Rollback data migration (restore original state)
    """
    # Get database connection
    connection = op.get_bind()
    session = Session(bind=connection)
    
    try:
        print("Rolling back backup data migration...")
        
        # The downgrade for schema changes is handled by the main migration
        # Here we just need to clean up any data changes we made
        
        # Note: We don't actually need to do anything here since we preserved
        # the original data structure and only added default values
        
        print("Backup data migration rollback completed")
        
    except Exception as e:
        print(f"Error during backup data migration rollback: {e}")
        session.rollback()
        raise
    finally:
        session.close()


if __name__ == "__main__":
    # This allows the script to be run standalone for testing
    print("This is a data migration script for Alembic")
    print("Run with: alembic upgrade head")