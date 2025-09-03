#!/usr/bin/env python3
"""
Script to fix authentication issues in test files
"""

import re

def fix_test_file(file_path):
    """Fix authentication and user model issues in a test file"""
    
    with open(file_path, 'r') as f:
        content = f.read()
    
    # Remove UserStatus import since User model doesn't have status field
    content = re.sub(r'from app\.models\.user import.*UserStatus.*\n', 
                     lambda m: m.group(0).replace(', UserStatus', '').replace('UserStatus, ', '').replace('UserStatus', ''), 
                     content)
    
    # Fix User creation - replace status=UserStatus.ACTIVE with is_active=True
    content = re.sub(r'status=UserStatus\.ACTIVE', 'is_active=True', content)
    
    # Fix User model field names
    content = re.sub(r'username="[^"]*"', '', content)  # Remove username field
    content = re.sub(r'full_name="[^"]*"', '', content)  # Remove full_name field  
    content = re.sub(r'hashed_password="[^"]*"', 'password_hash="hashed_password"', content)  # Fix password field name
    
    # Fix auth_headers fixtures to use correct JWT payload
    old_auth_pattern = r'(\s+@pytest\.fixture\s+def auth_headers\(self, test_user\):\s+"""Create authentication headers"""\s+token = create_access_token\(data=\{"sub": str\(test_user\.id\)\}\)\s+return \{"Authorization": f"Bearer \{token\}"\})'
    new_auth = r'''\1
    @pytest.fixture
    def auth_headers(self, test_user, test_tenant):
        """Create authentication headers"""
        token = create_access_token(data={
            "user_id": str(test_user.id),
            "tenant_id": str(test_tenant.id)
        })
        return {"Authorization": f"Bearer {token}"}'''
    
    # This is complex, let's do it step by step
    # First, fix the JWT token payload
    content = re.sub(r'create_access_token\(data=\{"sub": str\(test_user\.id\)\}\)', 
                     'create_access_token(data={"user_id": str(test_user.id), "tenant_id": str(test_tenant.id)})', 
                     content)
    
    # Fix auth_headers function signatures to include test_tenant
    content = re.sub(r'def auth_headers\(self, test_user\):', 
                     'def auth_headers(self, test_user, test_tenant):', 
                     content)
    
    # Fix auth_headers1 and auth_headers2 for multi-tenant tests
    content = re.sub(r'create_access_token\(data=\{"sub": str\(user1\.id\)\}\)', 
                     'create_access_token(data={"user_id": str(user1.id), "tenant_id": str(tenant1.id)})', 
                     content)
    content = re.sub(r'create_access_token\(data=\{"sub": str\(user2\.id\)\}\)', 
                     'create_access_token(data={"user_id": str(user2.id), "tenant_id": str(tenant2.id)})', 
                     content)
    
    # Fix auth_headers1 and auth_headers2 function signatures
    content = re.sub(r'def auth_headers1\(self, user1\):', 
                     'def auth_headers1(self, user1, tenant1):', 
                     content)
    content = re.sub(r'def auth_headers2\(self, user2\):', 
                     'def auth_headers2(self, user2, tenant2):', 
                     content)
    
    with open(file_path, 'w') as f:
        f.write(content)
    
    print(f"Fixed {file_path}")

if __name__ == "__main__":
    fix_test_file("/app/tests/test_product_management.py")
    print("Test file fixed!")