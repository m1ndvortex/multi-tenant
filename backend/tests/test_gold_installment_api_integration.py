"""
Integration tests for Gold Installment API endpoints
Tests real HTTP requests with actual database operations
"""

import pytest
from fastapi.testclient import TestClient
from decimal import Decimal
from datetime import datetime, timedelta, date
import uuid
import json

from app.main import app
from app.core.database import get_db
from app.models.tenant import Tenant
from app.models.user import User
from app.models.customer import Customer
from app.models.product import Product
from app.models.invoice import Invo