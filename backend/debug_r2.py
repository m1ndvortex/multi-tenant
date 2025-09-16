#!/usr/bin/env python3
"""
Debug script for Cloudflare R2 connectivity issues
"""

import os
import sys
import boto3
from botocore.exceptions import ClientError, NoCredentialsError

# Add the backend directory to Python path
sys.path.insert(0, '/app')

from app.core.config import settings

def debug_r2_connection():
    """Debug R2 connection step by step"""
    print("🔧 Debugging Cloudflare R2 Connection")
    print("=" * 50)
    
    # Print configuration
    print("Configuration:")
    print(f"  Access Key: {settings.cloudflare_r2_access_key[:10]}..." if settings.cloudflare_r2_access_key else "  Access Key: Not set")
    print(f"  Secret Key: {'*' * 20}" if settings.cloudflare_r2_secret_key else "  Secret Key: Not set")
    print(f"  Bucket: {settings.cloudflare_r2_bucket}")
    print(f"  Endpoint: {settings.cloudflare_r2_endpoint}")
    print()
    
    # Extract account ID from endpoint
    account_id = settings.cloudflare_r2_endpoint.split('//')[1].split('.')[0] if settings.cloudflare_r2_endpoint else None
    print(f"  Account ID (extracted): {account_id}")
    print()
    
    # Test different endpoint formats
    endpoints_to_test = [
        settings.cloudflare_r2_endpoint,
    ]
    
    if account_id:
        endpoints_to_test.extend([
            f"https://{account_id}.r2.cloudflarestorage.com",
            f"https://r2.cloudflarestorage.com/{account_id}",
        ])
    
    for i, endpoint in enumerate(endpoints_to_test, 1):
        print(f"🔍 Test {i}: Trying endpoint: {endpoint}")
        
        try:
            # Create client with current endpoint
            client = boto3.client(
                's3',
                endpoint_url=endpoint,
                aws_access_key_id=settings.cloudflare_r2_access_key,
                aws_secret_access_key=settings.cloudflare_r2_secret_key,
                region_name='auto',
                config=boto3.session.Config(
                    signature_version='s3v4',
                    s3={'addressing_style': 'path'}
                )
            )
            
            # Test 1: List buckets (should work if credentials are correct)
            print("  📋 Testing list_buckets()...")
            try:
                response = client.list_buckets()
                print(f"  ✅ list_buckets() successful - Found {len(response['Buckets'])} buckets")
                for bucket in response['Buckets']:
                    print(f"     - {bucket['Name']}")
            except ClientError as e:
                print(f"  ❌ list_buckets() failed: {e}")
                continue
            
            # Test 2: Head bucket (check if our specific bucket exists)
            print(f"  🔍 Testing head_bucket('{settings.cloudflare_r2_bucket}')...")
            try:
                client.head_bucket(Bucket=settings.cloudflare_r2_bucket)
                print(f"  ✅ head_bucket() successful - Bucket '{settings.cloudflare_r2_bucket}' exists")
            except ClientError as e:
                print(f"  ❌ head_bucket() failed: {e}")
                if e.response['Error']['Code'] == '404':
                    print(f"     Bucket '{settings.cloudflare_r2_bucket}' does not exist")
                continue
            
            # Test 3: List objects in bucket
            print(f"  📂 Testing list_objects_v2('{settings.cloudflare_r2_bucket}')...")
            try:
                response = client.list_objects_v2(Bucket=settings.cloudflare_r2_bucket, MaxKeys=5)
                object_count = response.get('KeyCount', 0)
                print(f"  ✅ list_objects_v2() successful - Found {object_count} objects")
                if 'Contents' in response:
                    for obj in response['Contents'][:3]:
                        print(f"     - {obj['Key']} ({obj['Size']} bytes)")
            except ClientError as e:
                print(f"  ❌ list_objects_v2() failed: {e}")
                continue
            
            print(f"  🎉 Endpoint {endpoint} works correctly!")
            return endpoint
            
        except Exception as e:
            print(f"  ❌ Failed to create client or test endpoint: {e}")
            continue
        
        print()
    
    print("❌ All endpoint tests failed")
    return None

def test_alternative_configurations():
    """Test alternative R2 configurations"""
    print("\n🔧 Testing Alternative Configurations")
    print("=" * 50)
    
    # Test with different regions
    regions_to_test = ['auto', 'us-east-1', 'wnam']
    
    for region in regions_to_test:
        print(f"🌍 Testing with region: {region}")
        try:
            client = boto3.client(
                's3',
                endpoint_url=settings.cloudflare_r2_endpoint,
                aws_access_key_id=settings.cloudflare_r2_access_key,
                aws_secret_access_key=settings.cloudflare_r2_secret_key,
                region_name=region,
                config=boto3.session.Config(
                    signature_version='s3v4',
                    s3={'addressing_style': 'path'}
                )
            )
            
            response = client.list_buckets()
            print(f"  ✅ Region '{region}' works - Found {len(response['Buckets'])} buckets")
            return region
            
        except Exception as e:
            print(f"  ❌ Region '{region}' failed: {e}")
    
    print("❌ All region tests failed")
    return None

if __name__ == "__main__":
    print("🚀 Starting R2 Debug Session")
    print("=" * 50)
    
    # Test different endpoints
    working_endpoint = debug_r2_connection()
    
    if working_endpoint:
        print(f"\n✅ Working endpoint found: {working_endpoint}")
    else:
        print("\n❌ No working endpoint found")
        # Test alternative configurations
        working_region = test_alternative_configurations()
        if working_region:
            print(f"✅ Working region found: {working_region}")
    
    print("\n" + "=" * 50)
    print("🏁 Debug session completed!")