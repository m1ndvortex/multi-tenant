"""
Test marketing API file
"""

from fastapi import APIRouter

router = APIRouter(prefix="/marketing-test", tags=["marketing-test"])

@router.get("/test")
async def test_endpoint():
    return {"message": "Marketing API test successful"}