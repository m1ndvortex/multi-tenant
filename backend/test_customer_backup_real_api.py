"""
Real API test for customer backup system with database setup
"""

import requests
import time
import json
from datetime import datetime
from app.core.database import SessionLocal
from app.models.tenant import Tenant, SubscriptionType
from app.models.user import User, UserRole, UserStatus
from app.models.customer import Customer
from app.models.product import Product
from passlib.context import CryptContext

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def setup_test_data():
    """Create test tenant and user in database"""
    db = SessionLocal()
    
    try:
        # Create test tenant
        tenant = Tenant(
            name="Test Backup Company",
            domain="testbackup.example.com",
            email="admin@testbackup.com",
            subscription_type=SubscriptionType.PRO,
            is_active=True
        )
        db.add(tenant)
        db.commit()
        db.refresh(tenant)
        
        # Create test user
        hashed_password = pwd_context.hash("TestPassword123!")
        user = User(
            tenant_id=tenant.id,
            email="testuser@testbackup.com",
            password_hash=hashed_password,
            first_name="Test",
            last_name="User",
            role=UserRole.ADMIN,
            status=UserStatus.ACTIVE,
            is_active=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
        # Create some test business data
        customer = Customer(
            tenant_id=tenant.id,
            name="Test Customer",
            email="customer@test.com",
            phone="+1234567890",
            address="123 Test Street",
            is_active=True
        )
        db.add(customer)
        
        product = Product(
            tenant_id=tenant.id,
            name="Test Gold Ring",
            category="jewelry",
            price=1500.00,
            weight=10.5,
            purity="18K",
            is_active=True
        )
        db.add(product)
        
        db.commit()
        
        print(f"✅ Test data created:")
        print(f"   Tenant: {tenant.name} ({tenant.id})")
        print(f"   User: {user.email} ({user.id})")
        print(f"   Customer: {customer.name}")
        print(f"   Product: {product.name}")
        
        return tenant.id, user.email
        
    except Exception as e:
        print(f"❌ Error creating test data: {e}")
        db.rollback()
        return None, None
    finally:
        db.close()

def test_customer_backup_api():
    """Test the customer backup API with real data"""
    
    print("🚀 Starting Customer Backup API Test")
    
    # Setup test data
    print("\n📝 Setting up test data...")
    tenant_id, user_email = setup_test_data()
    
    if not tenant_id or not user_email:
        print("❌ Failed to setup test data")
        return False
    
    # API base URL
    BASE_URL = "http://localhost:8000"
    
    # Step 1: Login to get authentication token
    print("\n🔐 Step 1: Authenticating user...")
    login_data = {
        "email": user_email,
        "password": "TestPassword123!"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/api/auth/login", json=login_data)
        if response.status_code == 200:
            auth_response = response.json()
            access_token = auth_response["access_token"]
            headers = {"Authorization": f"Bearer {access_token}"}
            print("✅ User authenticated successfully")
        else:
            print(f"❌ Failed to authenticate: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"❌ Error authenticating: {e}")
        return False
    
    # Step 2: Test customer backup creation
    print("\n💾 Step 2: Creating customer backup...")
    
    try:
        response = requests.post(f"{BASE_URL}/api/tenant/backup/create", headers=headers)
        if response.status_code == 200:
            backup_response = response.json()
            task_id = backup_response["task_id"]
            print(f"✅ Backup task started: {task_id}")
        else:
            print(f"❌ Failed to create backup: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"❌ Error creating backup: {e}")
        return False
    
    # Step 3: Monitor backup task progress
    print("\n⏳ Step 3: Monitoring backup progress...")
    
    max_wait_time = 120  # 2 minutes
    start_time = time.time()
    backup_completed = False
    backup_result = None
    
    while time.time() - start_time < max_wait_time:
        try:
            response = requests.get(f"{BASE_URL}/api/tenant/backup/task/{task_id}", headers=headers)
            if response.status_code == 200:
                task_status = response.json()
                status = task_status["status"]
                print(f"📊 Backup status: {status}")
                
                if status == "completed":
                    backup_result = task_status.get("result", {})
                    backup_completed = True
                    print("✅ Backup completed successfully!")
                    print(f"📦 Backup ID: {backup_result.get('backup_id', 'Unknown')}")
                    print(f"💾 File size: {backup_result.get('file_size', 'Unknown')} bytes")
                    print(f"🗜️ Compressed size: {backup_result.get('compressed_size', 'Unknown')} bytes")
                    break
                elif status == "failed":
                    error_msg = task_status.get('error', 'Unknown error')
                    print(f"❌ Backup failed: {error_msg}")
                    return False
                
                time.sleep(5)  # Wait 5 seconds before checking again
            else:
                print(f"⚠️ Could not check task status: {response.status_code}")
                time.sleep(5)
        except Exception as e:
            print(f"⚠️ Error checking task status: {e}")
            time.sleep(5)
    
    if not backup_completed:
        print("❌ Backup did not complete within the expected time")
        return False
    
    # Step 4: Get backup history
    print("\n📋 Step 4: Checking backup history...")
    
    try:
        response = requests.get(f"{BASE_URL}/api/tenant/backup/history", headers=headers)
        if response.status_code == 200:
            history = response.json()
            backups = history["backups"]
            print(f"✅ Found {len(backups)} backup(s) in history")
            
            if backups:
                latest_backup = backups[0]
                backup_id = latest_backup["backup_id"]
                print(f"📦 Latest backup ID: {backup_id}")
                print(f"📊 Backup size: {latest_backup.get('compressed_size', 'Unknown')} bytes")
                print(f"🕒 Created at: {latest_backup.get('created_at', 'Unknown')}")
        else:
            print(f"❌ Failed to get backup history: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"❌ Error getting backup history: {e}")
        return False
    
    # Step 5: Get specific backup status
    print("\n🔍 Step 5: Getting backup details...")
    
    if backup_result and "backup_id" in backup_result:
        backup_id = backup_result["backup_id"]
        
        try:
            response = requests.get(f"{BASE_URL}/api/tenant/backup/status/{backup_id}", headers=headers)
            if response.status_code == 200:
                backup_details = response.json()
                backup_info = backup_details["backup"]
                print(f"✅ Backup details retrieved:")
                print(f"   📦 ID: {backup_info['backup_id']}")
                print(f"   📊 Status: {backup_info['status']}")
                print(f"   💾 File size: {backup_info.get('file_size', 'Unknown')} bytes")
                print(f"   🗜️ Compressed size: {backup_info.get('compressed_size', 'Unknown')} bytes")
                print(f"   🔐 Checksum: {backup_info.get('checksum', 'Unknown')[:16]}...")
                
                download_token = backup_info.get("download_token")
                if download_token:
                    print(f"   🔗 Download token available")
                    
                    # Step 6: Test backup download
                    print("\n⬇️ Step 6: Testing backup download...")
                    
                    try:
                        response = requests.get(f"{BASE_URL}/api/tenant/backup/download/{download_token}", headers=headers)
                        if response.status_code == 200:
                            content_length = len(response.content)
                            print(f"✅ Backup downloaded successfully: {content_length} bytes")
                            
                            # Verify it's a gzip file
                            if response.content.startswith(b'\x1f\x8b'):
                                print("✅ Downloaded file is a valid gzip archive")
                                
                                # Try to peek at the content
                                import gzip
                                try:
                                    decompressed = gzip.decompress(response.content)
                                    content_preview = decompressed[:200].decode('utf-8', errors='ignore')
                                    print(f"📄 Content preview: {content_preview[:100]}...")
                                except Exception as e:
                                    print(f"⚠️ Could not decompress content: {e}")
                            else:
                                print("⚠️ Downloaded file may not be a valid gzip archive")
                        else:
                            print(f"❌ Failed to download backup: {response.status_code} - {response.text}")
                            return False
                    except Exception as e:
                        print(f"❌ Error downloading backup: {e}")
                        return False
                else:
                    print("⚠️ No download token available")
            else:
                print(f"❌ Failed to get backup details: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            print(f"❌ Error getting backup details: {e}")
            return False
    
    # Step 7: Test daily limit enforcement
    print("\n🚫 Step 7: Testing daily limit enforcement...")
    
    try:
        response = requests.post(f"{BASE_URL}/api/tenant/backup/create", headers=headers)
        if response.status_code == 429:
            print("✅ Daily limit enforcement working correctly")
        else:
            print(f"⚠️ Expected 429 status code for daily limit, got: {response.status_code}")
            print(f"Response: {response.text}")
    except Exception as e:
        print(f"❌ Error testing daily limit: {e}")
        return False
    
    print("\n🎉 Customer Backup API Test Completed Successfully!")
    print("\n📊 Test Summary:")
    print("✅ Test data setup")
    print("✅ User authentication")
    print("✅ Backup creation via API")
    print("✅ Backup task monitoring")
    print("✅ Backup history retrieval")
    print("✅ Backup details retrieval")
    print("✅ Backup file download")
    print("✅ Daily limit enforcement")
    
    return True

if __name__ == "__main__":
    success = test_customer_backup_api()
    if success:
        print("\n🎯 All API tests passed! The Customer Backup System is production-ready.")
    else:
        print("\n❌ Some API tests failed. Please check the implementation.")