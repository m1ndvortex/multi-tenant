#!/usr/bin/env python3
"""
Test B2 with S3-compatible endpoint
"""

import os
import sys
import boto3
from botocore.exceptions import ClientError

# Add the backend directory to Python path
sys.path.insert(0, '/app')

from app.core.config import settings

def test_b2_s3_compatible():
    """Test B2 with S3-compatible endpoint"""
    print("🔧 Testing Backblaze B2 S3-Compatible API")
    print("=" * 50)
    
    print(f"B2 Access Key: {settings.backblaze_b2_access_key}")
    print(f"B2 Secret Key: {'*' * 20}" if settings.backblaze_b2_secret_key else "Not configured")
    print(f"B2 Bucket: {settings.backblaze_b2_bucket}")
    print()
    
    # Different B2 S3-compatible endpoints to try
    endpoints_to_test = [
        'https://s3.us-east-005.backblazeb2.com',  # Current
        'https://s3.us-west-000.backblazeb2.com',  # Alternative region
        'https://s3.us-west-001.backblazeb2.com',  # Alternative region
        'https://s3.us-west-002.backblazeb2.com',  # Alternative region
    ]
    
    for i, endpoint in enumerate(endpoints_to_test, 1):
        print(f"🔍 Test {i}: Trying endpoint: {endpoint}")
        
        try:
            client = boto3.client(
                's3',
                endpoint_url=endpoint,
                aws_access_key_id=settings.backblaze_b2_access_key,
                aws_secret_access_key=settings.backblaze_b2_secret_key,
                region_name='us-east-005'  # Try with region
            )
            
            # Test list buckets
            print("  📋 Testing list_buckets()...")
            response = client.list_buckets()
            print(f"  ✅ list_buckets() successful - Found {len(response['Buckets'])} buckets")
            
            for bucket in response['Buckets']:
                print(f"     - {bucket['Name']}")
            
            # Test head bucket
            print(f"  🔍 Testing head_bucket('{settings.backblaze_b2_bucket}')...")
            client.head_bucket(Bucket=settings.backblaze_b2_bucket)
            print(f"  ✅ head_bucket() successful - Bucket '{settings.backblaze_b2_bucket}' exists")
            
            print(f"  🎉 Endpoint {endpoint} works correctly!")
            return endpoint
            
        except ClientError as e:
            error_code = e.response['Error']['Code']
            print(f"  ❌ ClientError: {error_code} - {e}")
            
            if error_code == 'AccessDenied':
                print("     This might be a credentials issue")
            elif error_code == '404':
                print(f"     Bucket '{settings.backblaze_b2_bucket}' not found")
            
        except Exception as e:
            print(f"  ❌ Failed: {e}")
        
        print()
    
    print("❌ All B2 endpoints failed")
    return None

def test_b2_without_region():
    """Test B2 without specifying region"""
    print("\n🔧 Testing B2 without region specification")
    print("=" * 50)
    
    try:
        client = boto3.client(
            's3',
            endpoint_url='https://s3.us-east-005.backblazeb2.com',
            aws_access_key_id=settings.backblaze_b2_access_key,
            aws_secret_access_key=settings.backblaze_b2_secret_key
            # No region specified
        )
        
        response = client.list_buckets()
        print(f"✅ B2 without region works - Found {len(response['Buckets'])} buckets")
        return True
        
    except Exception as e:
        print(f"❌ B2 without region failed: {e}")
        return False

if __name__ == "__main__":
    working_endpoint = test_b2_s3_compatible()
    
    if not working_endpoint:
        test_b2_without_region()
    
    print("\n💡 B2 S3-compatible API requires:")
    print("1. Correct application key (not master key)")
    print("2. Correct application key ID")
    print("3. Bucket must exist and be accessible")
    print("4. Correct regional endpoint")