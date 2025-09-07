#!/usr/bin/env python3
"""
Simple script to create a super admin user
"""
import os
import sys
sys.path.append('/app')

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from passlib.context import CryptContext
import uuid

# Database URL
DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://hesaab:secure_password_2024@postgres:5432/hesaabplus')

# Create engine and session
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Password context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_super_admin():
    """Create super admin user"""
    db = SessionLocal()
    
    try:
        # Delete existing user if exists
        db.execute(
            text("DELETE FROM users WHERE email = :email"),
            {"email": "admin@hesaabplus.com"}
        )
        
        # Generate password hash
        password_hash = pwd_context.hash("admin123")
        print(f"Generated hash: {password_hash}")
        print(f"Hash length: {len(password_hash)}")
        
        # Create super admin user
        user_id = str(uuid.uuid4())
        
        db.execute(
            text("""
                INSERT INTO users (
                    id, email, password_hash, first_name, last_name, is_active, 
                    is_super_admin, role, status, is_email_verified, login_count,
                    language, timezone, created_at, updated_at, tenant_id
                ) VALUES (
                    :id, :email, :password_hash, :first_name, :last_name, :is_active,
                    :is_super_admin, :role, :status, :is_email_verified, :login_count,
                    :language, :timezone, NOW(), NOW(), :tenant_id
                )
            """),
            {
                "id": user_id,
                "email": "admin@hesaabplus.com",
                "password_hash": password_hash,
                "first_name": "Super",
                "last_name": "Admin",
                "is_active": True,
                "is_super_admin": True,
                "role": "OWNER",
                "status": "ACTIVE",
                "is_email_verified": True,
                "login_count": 0,
                "language": "fa",
                "timezone": "Asia/Tehran",
                "tenant_id": None
            }
        )
        
        db.commit()
        print("Super admin user created successfully!")
        print("Email: admin@hesaabplus.com")
        print("Password: admin123")
        
        # Verify the user was created
        result = db.execute(
            text("SELECT id, email, length(password_hash) FROM users WHERE email = :email"),
            {"email": "admin@hesaabplus.com"}
        )
        user = result.fetchone()
        if user:
            print(f"Verified: User ID {user[0]}, Email {user[1]}, Hash length {user[2]}")
        
    except Exception as e:
        print(f"Error creating super admin: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_super_admin()
