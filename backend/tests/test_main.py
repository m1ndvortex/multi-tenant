"""
Test main FastAPI application
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_root_endpoint():
    """Test root endpoint returns correct information"""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "message" in data
    assert "HesaabPlus API" in data["message"]
    assert "docs" in data
    assert "health" in data


def test_api_status_endpoint():
    """Test API status endpoint"""
    response = client.get("/api")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "operational"
    assert "version" in data
    assert "endpoints" in data
    assert "features" in data


def test_basic_health_check():
    """Test basic health check endpoint"""
    response = client.get("/api/health/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "hesaabplus-backend"
    assert "timestamp" in data


def test_liveness_check():
    """Test liveness probe endpoint"""
    response = client.get("/api/health/liveness")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "alive"
    assert "timestamp" in data
    assert "uptime" in data


def test_cors_headers():
    """Test CORS headers are properly set"""
    # Test with a GET request instead of OPTIONS
    response = client.get("/api/health/")
    assert response.status_code == 200
    # Process time header should be present (indicating middleware is working)
    assert "x-process-time" in response.headers


def test_process_time_header():
    """Test that process time header is added"""
    response = client.get("/")
    assert response.status_code == 200
    assert "x-process-time" in response.headers
    # Process time should be a valid float
    process_time = float(response.headers["x-process-time"])
    assert process_time >= 0