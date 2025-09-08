#!/usr/bin/env python3
"""
Create test tenants for development and testing
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from app.core.database import get_db, engine
from app.core.auth import get_password_hash
from app.models.tenant import Tenant, SubscriptionType, TenantStatus
from app.models.user import User, UserRole, UserStatus
import uuid

def create_test_tenants():
    """Create test tenants with various subscription types and statuses and ensure login users exist"""
    
    # Create database session
    db = Session(bind=engine)
    
    try:
        # Define desired test tenants (idempotent creation)
        test_tenants = [
            {
                "name": "Gold Shop ABC",
                "email": "goldshop@test.com",
                "phone": "+1234567890",
                "address": "123 Gold Street, City, State",
                "domain": "goldshop-abc",
                "business_type": "Gold Jewelry",
                "subscription_type": SubscriptionType.PRO,
                "status": TenantStatus.ACTIVE,
                "currency": "USD",
                "timezone": "UTC"
            },
            {
                "name": "Silver Jewelry Store",
                "email": "silver@test.com", 
                "phone": "+1234567891",
                "address": "456 Silver Avenue, City, State",
                "domain": "silver-jewelry",
                "business_type": "Silver Jewelry",
                "subscription_type": SubscriptionType.FREE,
                "status": TenantStatus.ACTIVE,
                "currency": "USD",
                "timezone": "UTC"
            },
            {
                "name": "Diamond Palace",
                "email": "diamond@test.com",
                "phone": "+1234567892", 
                "address": "789 Diamond Road, City, State",
                "domain": "diamond-palace",
                "business_type": "Diamond Jewelry",
                "subscription_type": SubscriptionType.PRO,
                "status": TenantStatus.PENDING,
                "currency": "USD",
                "timezone": "UTC"
            },
            {
                "name": "Precious Gems Ltd",
                "email": "gems@test.com",
                "phone": "+1234567893",
                "address": "321 Gem Street, City, State", 
                "domain": "precious-gems",
                "business_type": "Gemstones",
                "subscription_type": SubscriptionType.FREE,
                "status": TenantStatus.ACTIVE,
                "currency": "USD",
                "timezone": "UTC"
            },
            {
                "name": "Royal Jewelry House",
                "email": "royal@test.com",
                "phone": "+1234567894",
                "address": "654 Royal Boulevard, City, State",
                "domain": "royal-jewelry",
                "business_type": "Luxury Jewelry",
                "subscription_type": SubscriptionType.PRO,
                "status": TenantStatus.ACTIVE,
                "currency": "USD", 
                "timezone": "UTC"
            },
            {
                "name": "Budget Jewelry Shop",
                "email": "budget@test.com",
                "phone": "+1234567895",
                "address": "987 Budget Lane, City, State",
                "domain": "budget-jewelry",
                "business_type": "Affordable Jewelry",
                "subscription_type": SubscriptionType.FREE,
                "status": TenantStatus.SUSPENDED,
                "currency": "USD",
                "timezone": "UTC"
            }
        ]
        
        created_tenants = []
        tenants_to_use = []
        
        # Create tenants if they don't exist; collect existing ones
        for tenant_data in test_tenants:
            existing = db.query(Tenant).filter(Tenant.domain == tenant_data["domain"]).first()
            if existing:
                tenants_to_use.append(existing)
                continue
            
            tenant = Tenant(**tenant_data)
            
            # Set subscription dates for Pro tenants
            if tenant.subscription_type == SubscriptionType.PRO:
                if tenant.status == TenantStatus.ACTIVE:
                    tenant.subscription_starts_at = datetime.now(timezone.utc) - timedelta(days=30)
                    tenant.subscription_expires_at = datetime.now(timezone.utc) + timedelta(days=335)  # ~11 months left
                elif tenant.status == TenantStatus.PENDING:
                    # Pending Pro subscription (no dates set)
                    pass
            
            # Set limits based on subscription type
            if tenant.subscription_type == SubscriptionType.PRO:
                tenant.max_users = 5
                tenant.max_products = -1  # Unlimited
                tenant.max_customers = -1  # Unlimited
                tenant.max_monthly_invoices = -1  # Unlimited
            else:  # FREE
                tenant.max_users = 1
                tenant.max_products = 10
                tenant.max_customers = 10
                tenant.max_monthly_invoices = 10
            
            # Set creation dates (spread over last 60 days)
            days_ago = (len(created_tenants)) * 10  # Space them out
            tenant.created_at = datetime.now(timezone.utc) - timedelta(days=days_ago)
            tenant.updated_at = tenant.created_at
            
            # Add some activity for active tenants
            if tenant.status == TenantStatus.ACTIVE:
                tenant.last_activity_at = datetime.now(timezone.utc) - timedelta(hours=2)
            
            db.add(tenant)
            created_tenants.append(tenant)
            tenants_to_use.append(tenant)
        
        # Commit all tenants (new ones)
        if created_tenants:
            db.commit()
            print(f"Successfully created {len(created_tenants)} test tenants:")
            for tenant in created_tenants:
                print(f"  - {tenant.name} ({tenant.email}) - {tenant.subscription_type.value} - {tenant.status.value}")
        else:
            print("No new test tenants created (already exist).")
        
        # Ensure a known admin user exists for each tenant with a known password
        print("\nEnsuring per-tenant admin users exist...")
        default_password = "test1234"
        credentials = []
        for tenant in tenants_to_use:
            # Use a valid domain for email to pass email validation
            admin_email = f"admin+{tenant.domain}@hesaabplus.com"
            user = db.query(User).filter(User.tenant_id == tenant.id, User.email == admin_email).first()
            if not user:
                user = User(
                    tenant_id=tenant.id,
                    email=admin_email,
                    first_name="Admin",
                    last_name=tenant.name,
                    role=UserRole.OWNER,
                    status=UserStatus.ACTIVE,
                    is_email_verified=True,
                )
                # Backdate creation a bit for realism
                user.created_at = datetime.now(timezone.utc) - timedelta(days=7)
                user.updated_at = user.created_at
                db.add(user)
            
            # Set/Reset password to known default
            user.password_hash = get_password_hash(default_password)
            user.last_login_at = datetime.now(timezone.utc) - timedelta(minutes=5)
            user.last_activity_at = datetime.now(timezone.utc) - timedelta(minutes=2)
            
            credentials.append({
                "tenant_name": tenant.name,
                "tenant_id": str(tenant.id),
                "email": admin_email,
                "password": default_password,
            })
        
        db.commit()
        
        print(f"Created/updated {len(credentials)} admin users with default password.")
        print("\nUse the following test credentials to log in at http://localhost:3001:")
        for cred in credentials:
            print(f"  - Tenant: {cred['tenant_name']} | Tenant ID: {cred['tenant_id']} | Email: {cred['email']} | Password: {cred['password']}")
        
        print("\nTest data creation completed successfully!")
        print("You can now test the Tenant app with the above credentials.")
        
    except Exception as e:
        print(f"Error creating test tenants: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    create_test_tenants()