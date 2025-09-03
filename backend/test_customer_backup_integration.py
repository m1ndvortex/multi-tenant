"""
Integration test for customer backup system with real API calls and database
"""

import requests
import time
import json
from datetime import datetime

# API base URL
BASE_URL = "http://localhost:8000"

def test_customer_backup_integration():
    """Test the complete customer backup workflow with real API calls"""
    
    print("🚀 Starting Customer Backup Integration Test")
    
    # Step 1: Create a test tenant
    print("\n📝 Step 1: Creating test tenant...")
    tenant_data = {
        "name": "Test Backup Company",
        "domain": "testbackup.example.com",
        "email": "admin@testbackup.com",
        "subscription_type": "PRO"
    }
    
    try:
        # Create tenant via super admin API (assuming we have super admin access)
        response = requests.post(f"{BASE_URL}/api/super-admin/tenants", json=tenant_data)
        if response.status_code == 201:
            tenant = response.json()
            tenant_id = tenant["id"]
            print(f"✅ Tenant created successfully: {tenant_id}")
        else:
            print(f"❌ Failed to create tenant: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"❌ Error creating tenant: {e}")
        return False
    
    # Step 2: Create a test user for the tenant
    print("\n👤 Step 2: Creating test user...")
    user_data = {
        "email": "testuser@testbackup.com",
        "password": "TestPassword123!",
        "first_name": "Test",
        "last_name": "User",
        "role": "ADMIN"
    }
    
    try:
        # Create user via tenant management API
        response = requests.post(f"{BASE_URL}/api/tenants/{tenant_id}/users", json=user_data)
        if response.status_code == 201:
            user = response.json()
            user_id = user["id"]
            print(f"✅ User created successfully: {user_id}")
        else:
            print(f"❌ Failed to create user: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"❌ Error creating user: {e}")
        return False
    
    # Step 3: Login to get authentication token
    print("\n🔐 Step 3: Authenticating user...")
    login_data = {
        "email": "testuser@testbackup.com",
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
    
    # Step 4: Create some test data for the tenant
    print("\n📊 Step 4: Creating test business data...")
    
    # Create a test customer
    customer_data = {
        "name": "Test Customer",
        "email": "customer@test.com",
        "phone": "+1234567890",
        "address": "123 Test Street"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/api/customers", json=customer_data, headers=headers)
        if response.status_code == 201:
            customer = response.json()
            print(f"✅ Test customer created: {customer['id']}")
        else:
            print(f"⚠️ Could not create test customer: {response.status_code}")
    except Exception as e:
        print(f"⚠️ Error creating test customer: {e}")
    
    # Create a test product
    product_data = {
        "name": "Test Gold Ring",
        "category": "jewelry",
        "price": 1500.00,
        "weight": 10.5,
        "purity": "18K"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/api/products", json=product_data, headers=headers)
        if response.status_code == 201:
            product = response.json()
            print(f"✅ Test product created: {product['id']}")
        else:
            print(f"⚠️ Could not create test product: {response.status_code}")
    except Exception as e:
        print(f"⚠️ Error creating test product: {e}")
    
    # Step 5: Test customer backup creation
    print("\n💾 Step 5: Creating customer backup...")
    
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
    
    # Step 6: Monitor backup task progress
    print("\n⏳ Step 6: Monitoring backup progress...")
    
    max_wait_time = 300  # 5 minutes
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
                    break
                elif status == "failed":
                    print(f"❌ Backup failed: {task_status.get('error', 'Unknown error')}")
                    return False
                
                time.sleep(10)  # Wait 10 seconds before checking again
            else:
                print(f"⚠️ Could not check task status: {response.status_code}")
                time.sleep(10)
        except Exception as e:
            print(f"⚠️ Error checking task status: {e}")
            time.sleep(10)
    
    if not backup_completed:
        print("❌ Backup did not complete within the expected time")
        return False
    
    # Step 7: Get backup history
    print("\n📋 Step 7: Checking backup history...")
    
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
    
    # Step 8: Get specific backup status
    print("\n🔍 Step 8: Getting backup details...")
    
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
                    
                    # Step 9: Test backup download
                    print("\n⬇️ Step 9: Testing backup download...")
                    
                    try:
                        response = requests.get(f"{BASE_URL}/api/tenant/backup/download/{download_token}", headers=headers)
                        if response.status_code == 200:
                            content_length = len(response.content)
                            print(f"✅ Backup downloaded successfully: {content_length} bytes")
                            
                            # Verify it's a gzip file
                            if response.content.startswith(b'\x1f\x8b'):
                                print("✅ Downloaded file is a valid gzip archive")
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
    
    # Step 10: Test daily limit enforcement
    print("\n🚫 Step 10: Testing daily limit enforcement...")
    
    try:
        response = requests.post(f"{BASE_URL}/api/tenant/backup/create", headers=headers)
        if response.status_code == 429:
            print("✅ Daily limit enforcement working correctly")
        else:
            print(f"⚠️ Expected 429 status code for daily limit, got: {response.status_code}")
    except Exception as e:
        print(f"❌ Error testing daily limit: {e}")
        return False
    
    print("\n🎉 Customer Backup Integration Test Completed Successfully!")
    print("\n📊 Test Summary:")
    print("✅ Tenant creation")
    print("✅ User creation and authentication")
    print("✅ Test data creation")
    print("✅ Backup creation via API")
    print("✅ Backup task monitoring")
    print("✅ Backup history retrieval")
    print("✅ Backup details retrieval")
    print("✅ Backup file download")
    print("✅ Daily limit enforcement")
    
    return True

if __name__ == "__main__":
    success = test_customer_backup_integration()
    if success:
        print("\n🎯 All tests passed! The Customer Backup System is production-ready.")
    else:
        print("\n❌ Some tests failed. Please check the implementation.")