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
from app.models.tenant import Tenant, SubscriptionType, TenantStatus
from app.models.user import User
import uuid

def create_test_tenants():
    """Create test tenants with various subscription types and statuses"""
    
    # Create database session
    db = Session(bind=engine)
    
    try:
        # Check if test tenants already exist
        existing_tenants = db.query(Tenant).filter(Tenant.email.like('%test%')).count()
        if existing_tenants > 0:
            print(f"Found {existing_tenants} existing test tenants. Skipping creation.")
            return
        
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
        
        for tenant_data in test_tenants:
            # Create tenant
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
            days_ago = len(created_tenants) * 10  # Space them out
            tenant.created_at = datetime.now(timezone.utc) - timedelta(days=days_ago)
            tenant.updated_at = tenant.created_at
            
            # Add some activity for active tenants
            if tenant.status == TenantStatus.ACTIVE:
                tenant.last_activity_at = datetime.now(timezone.utc) - timedelta(hours=2)
            
            db.add(tenant)
            created_tenants.append(tenant)
        
        # Commit all tenants
        db.commit()
        
        print(f"Successfully created {len(created_tenants)} test tenants:")
        for tenant in created_tenants:
            print(f"  - {tenant.name} ({tenant.email}) - {tenant.subscription_type.value} - {tenant.status.value}")
        
        # Create test users for some tenants
        print("\nCreating test users...")
        
        test_users = [
            {
                "tenant_id": created_tenants[0].id,  # Gold Shop ABC
                "email": "owner@goldshop.test.com",
                "first_name": "John",
                "last_name": "Doe",
                "password_hash": "$2b$12$dummy_hash_for_testing",
                "is_active": True,
                "last_login_at": datetime.now(timezone.utc) - timedelta(minutes=30)
            },
            {
                "tenant_id": created_tenants[1].id,  # Silver Jewelry Store
                "email": "manager@silver.test.com",
                "first_name": "Jane", 
                "last_name": "Smith",
                "password_hash": "$2b$12$dummy_hash_for_testing",
                "is_active": True,
                "last_login_at": datetime.now(timezone.utc) - timedelta(hours=2)
            },
            {
                "tenant_id": created_tenants[4].id,  # Royal Jewelry House
                "email": "admin@royal.test.com",
                "first_name": "Mike",
                "last_name": "Johnson",
                "password_hash": "$2b$12$dummy_hash_for_testing", 
                "is_active": True,
                "last_login_at": datetime.now(timezone.utc) - timedelta(minutes=10),
                "last_activity_at": datetime.now(timezone.utc) - timedelta(minutes=5)
            }
        ]
        
        created_users = []
        for user_data in test_users:
            user = User(**user_data)
            user.created_at = datetime.now(timezone.utc) - timedelta(days=20)
            user.updated_at = user.created_at
            
            db.add(user)
            created_users.append(user)
        
        db.commit()
        
        print(f"Successfully created {len(created_users)} test users:")
        for user in created_users:
            tenant = db.query(Tenant).filter(Tenant.id == user.tenant_id).first()
            print(f"  - {user.email} for {tenant.name}")
        
        print("\nTest data creation completed successfully!")
        print("You can now test the Super Admin dashboard with real data.")
        
    except Exception as e:
        print(f"Error creating test tenants: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    create_test_tenants()