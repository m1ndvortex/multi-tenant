#!/usr/bin/env python3
import os
import sys
sys.path.insert(0, '/app')
from app.core.config import settings

print(f"Access Key: '{settings.cloudflare_r2_access_key}'")
print(f"Length: {len(settings.cloudflare_r2_access_key) if settings.cloudflare_r2_access_key else 0}")
print(f"Repr: {repr(settings.cloudflare_r2_access_key)}")