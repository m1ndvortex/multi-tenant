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
                    id, email, password_hash, first_name, last_name, is_active, 
                    is_super_admin, role, status, is_email_verified, login_count,
                    language, timezone, created_at, updated_at
                ) VALUES (
                    :id, :email, :password_hash, :first_name, :last_name, :is_active,
                    :is_super_admin, :role, :status, :is_email_verified, :login_count,
                    :language, :timezone, NOW(), NOW()
                )
            """),
            {
                "id": str(uuid.uuid4()),
                "email": "admin@hesaabplus.com",
                "password_hash": hashed_password,
                "first_name": "Super",
                "last_name": "Admin",
                "is_active": True,
                "is_super_admin": True,
                "role": "OWNER",
                "status": "ACTIVE",
                "is_email_verified": True,
                "login_count": 0,
                "language": "fa",
                "timezone": "Asia/Tehran"
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