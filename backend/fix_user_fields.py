#!/usr/bin/env python3
"""
Script to fix User model field issues in test files
"""

import re

def fix_user_fields(file_path):
    """Fix User model field issues in a test file"""
    
    with open(file_path, 'r') as f:
        content = f.read()
    
    # Fix User creation with empty commas
    content = re.sub(r'email="[^"]*",\s*,\s*,\s*password_hash=', 
                     'email="user@goldshop.com",\n            first_name="Test",\n            last_name="User",\n            password_hash=', 
                     content)
    
    # Fix any remaining empty comma patterns
    content = re.sub(r',\s*,\s*,', ',', content)
    content = re.sub(r',\s*,', ',', content)
    
    with open(file_path, 'w') as f:
        f.write(content)
    
    print(f"Fixed {file_path}")

if __name__ == "__main__":
    fix_user_fields("/app/tests/test_product_management.py")
    print("User field issues fixed!")