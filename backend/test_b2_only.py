#!/usr/bin/env python3
"""
Test only B2 connectivity to see if we have valid credentials
"""

import os
import sys
import boto3
from botocore.exceptions import ClientError

# Add the backend directory to Python path
sys.path.insert(0, '/app')

from app.core.config import settings

def test_b2_connectivity():
    """Test B2 connectivity only"""
    print("🔧 Testing Backblaze B2 Connectivity")
    print("=" * 50)
    
    print(f"B2 Access Key: {settings.backblaze_b2_access_key}")
    print(f"B2 Secret Key: {'*' * 20}" if settings.backblaze_b2_secret_key else "Not configured")
    print(f"B2 Bucket: {settings.backblaze_b2_bucket}")
    print()
    
    if not all([
        settings.backblaze_b2_access_key,
        settings.backblaze_b2_secret_key,
        settings.backblaze_b2_bucket
    ]):
        print("❌ B2 credentials not configured")
        return False
    
    try:
        # Create B2 client
        client = boto3.client(
            's3',
            endpoint_url='https://s3.us-east-005.backblazeb2.com',
            aws_access_key_id=settings.backblaze_b2_access_key,
            aws_secret_access_key=settings.backblaze_b2_secret_key,
            region_name='us-east-005'
        )
        
        print("🔍 Testing B2 connectivity...")
        
        # Test list buckets
        response = client.list_buckets()
        print(f"✅ B2 connection successful - Found {len(response['Buckets'])} buckets")
        
        for bucket in response['Buckets']:
            print(f"   - {bucket['Name']}")
        
        # Test head bucket for our specific bucket
        try:
            client.head_bucket(Bucket=settings.backblaze_b2_bucket)
            print(f"✅ Bucket '{settings.backblaze_b2_bucket}' exists and is accessible")
            return True
        except ClientError as e:
            if e.response['Error']['Code'] == '404':
                print(f"❌ Bucket '{settings.backblaze_b2_bucket}' does not exist")
            else:
                print(f"❌ Error accessing bucket: {e}")
            return False
            
    except Exception as e:
        print(f"❌ B2 connection failed: {e}")
        return False

if __name__ == "__main__":
    success = test_b2_connectivity()
    if success:
        print("\n✅ B2 is working! We can proceed with B2-only backup testing")
        print("💡 For R2, we need valid credentials from Cloudflare Dashboard")
    else:
        print("\n❌ B2 is also not working. Need valid credentials for both services")