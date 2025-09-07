#!/usr/bin/env python3
"""
Script to create a super admin user for HesaabPlus
"""
import sys
from sqlalchemy import text
from app.core.config import settings
from app.core.auth import get_password_hash
from app.core.database import engine, SessionLocal
from app.models.base import Base
import uuid

def create_super_admin():
    """Create super admin user"""
    
    # Create tables if they don't exist
    Base.metadata.create_all(bind=engine)
    
    # Create session
    db = SessionLocal()
    
    try:
        # Check if super admin already exists
        result = db.execute(
            text("SELECT id FROM users WHERE email = :email AND is_super_admin = true"),
            {"email": "admin@hesaabplus.com"}
        )
        existing_user = result.fetchone()
        
        if existing_user:
            print("Super admin user already exists!")
            return
        
        # Create super admin user
        hashed_password = get_password_hash("admin123")
        
        # Insert super admin user
        db.execute(
            text("""
                INSERT INTO users (
                    id, email, hashed_password, name, is_active, 
                    is_super_admin, created_at, updated_at
                ) VALUES (
                    :id, :email, :hashed_password, :name, :is_active,
                    :is_super_admin, NOW(), NOW()
                )
            """),
            {
                "id": str(uuid.uuid4()),
                "email": "admin@hesaabplus.com",
                "hashed_password": hashed_password,
                "name": "Super Admin",
                "is_active": True,
                "is_super_admin": True
            }
        )
        
        db.commit()
        print("Super admin user created successfully!")
        print("Email: admin@hesaabplus.com")
        print("Password: admin123")
        
    except Exception as e:
        print(f"Error creating super admin: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_super_admin()