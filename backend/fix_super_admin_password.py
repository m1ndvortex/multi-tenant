#!/usr/bin/env python3
"""
Script to fix super admin password hash
"""
import bcrypt
from app.core.database import SessionLocal
from app.models.user import User

def fix_super_admin_password():
    """Fix super admin password hash"""
    
    # Create session
    db = SessionLocal()
    
    try:
        # Find super admin user
        user = db.query(User).filter(
            User.email == "admin@hesaabplus.com",
            User.is_super_admin == True
        ).first()
        
        if not user:
            print("Super admin user not found! Creating new one...")
            # Create new super admin user
            from app.models.user import UserRole, UserStatus
            import uuid
            
            user = User(
                id=uuid.uuid4(),
                email="admin@hesaabplus.com",
                first_name="Super",
                last_name="Admin",
                is_super_admin=True,
                role=UserRole.OWNER,
                status=UserStatus.ACTIVE,
                is_email_verified=True,
                language="fa",
                timezone="Asia/Tehran"
            )
            db.add(user)
        
        # Create new password hash
        password = "admin123"
        salt = bcrypt.gensalt()
        hash_val = bcrypt.hashpw(password.encode('utf-8'), salt)
        hash_str = hash_val.decode('utf-8')
        
        print(f"New hash: {hash_str}")
        
        # Verify the hash works
        verification = bcrypt.checkpw(password.encode('utf-8'), hash_val)
        print(f"Hash verification: {verification}")
        
        if verification:
            # Update user password
            user.password_hash = hash_str
            db.commit()
            print("Super admin password updated successfully!")
            print("Email: admin@hesaabplus.com")
            print("Password: admin123")
        else:
            print("Hash verification failed!")
        
    except Exception as e:
        print(f"Error fixing super admin password: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    fix_super_admin_password()