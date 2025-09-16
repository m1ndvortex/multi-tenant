#!/usr/bin/env python3
"""
Verify R2 credentials format and validity
"""

import os
import sys
import hashlib

# Add the backend directory to Python path
sys.path.insert(0, '/app')

from app.core.config import settings

def verify_r2_credentials():
    """Verify R2 credentials format and provide guidance"""
    print("🔍 R2 Credentials Verification")
    print("=" * 50)
    
    # Check if credentials are set
    if not all([
        settings.cloudflare_r2_access_key,
        settings.cloudflare_r2_secret_key,
        settings.cloudflare_r2_bucket,
        settings.cloudflare_r2_endpoint
    ]):
        print("❌ Missing R2 credentials")
        return False
    
    # Extract account ID from endpoint
    endpoint = settings.cloudflare_r2_endpoint
    if endpoint and ".r2.cloudflarestorage.com" in endpoint:
        account_id = endpoint.split("//")[1].split(".")[0]
        print(f"📋 Account ID (from endpoint): {account_id}")
        print(f"📋 Account ID length: {len(account_id)}")
    else:
        print("❌ Invalid endpoint format")
        return False
    
    # Check Access Key ID format
    access_key = settings.cloudflare_r2_access_key
    print(f"🔑 Access Key ID: {access_key[:10]}...")
    print(f"🔑 Access Key ID length: {len(access_key)}")
    
    # R2 Access Key IDs should be 32 characters (hex format)
    if len(access_key) != 32:
        print(f"❌ Access Key ID should be 32 characters, got {len(access_key)}")
        print("💡 R2 Access Key IDs are typically 32-character hex strings")
        return False
    
    # Check if it's valid hex
    try:
        int(access_key, 16)
        print("✅ Access Key ID appears to be valid hex format")
    except ValueError:
        print("❌ Access Key ID is not valid hex format")
        return False
    
    # Check Secret Access Key
    secret_key = settings.cloudflare_r2_secret_key
    print(f"🔐 Secret Access Key length: {len(secret_key)}")
    
    # R2 Secret Access Keys are typically 64 characters (SHA-256 hash)
    if len(secret_key) == 64:
        print("✅ Secret Access Key length matches SHA-256 hash format")
        try:
            int(secret_key, 16)
            print("✅ Secret Access Key appears to be valid hex format")
        except ValueError:
            print("❌ Secret Access Key is not valid hex format")
            return False
    else:
        print(f"⚠️  Secret Access Key length is {len(secret_key)}, expected 64 for SHA-256 hash")
        print("💡 R2 Secret Access Keys are SHA-256 hashes of the token value")
    
    # Check bucket name
    bucket = settings.cloudflare_r2_bucket
    print(f"🪣 Bucket name: {bucket}")
    
    # Bucket names should follow S3 naming conventions
    if len(bucket) < 3 or len(bucket) > 63:
        print("❌ Bucket name should be between 3 and 63 characters")
        return False
    
    if not bucket.islower():
        print("❌ Bucket name should be lowercase")
        return False
    
    print("✅ Bucket name format appears valid")
    
    print("\n" + "=" * 50)
    print("📋 Summary:")
    print(f"   Account ID: {account_id} ({'✅ Valid format' if len(account_id) == 32 else '❌ Invalid format'})")
    print(f"   Access Key: {'✅ Valid format' if len(access_key) == 32 else '❌ Invalid format'}")
    print(f"   Secret Key: {'✅ Valid format' if len(secret_key) == 64 else '❌ Invalid format'}")
    print(f"   Bucket: {'✅ Valid format' if 3 <= len(bucket) <= 63 and bucket.islower() else '❌ Invalid format'}")
    print(f"   Endpoint: {'✅ Valid format' if '.r2.cloudflarestorage.com' in endpoint else '❌ Invalid format'}")
    
    if len(access_key) == 32 and len(secret_key) == 64:
        print("\n✅ Credentials appear to be properly formatted R2 API tokens")
        return True
    else:
        print("\n❌ Credentials do not match R2 API token format")
        print("\n💡 To fix this:")
        print("1. Go to Cloudflare Dashboard > R2 > Manage API tokens")
        print("2. Create a new R2 API token with appropriate permissions")
        print("3. Use the Access Key ID and Secret Access Key from the token")
        print("4. The endpoint should be https://<ACCOUNT_ID>.r2.cloudflarestorage.com")
        return False

if __name__ == "__main__":
    verify_r2_credentials()