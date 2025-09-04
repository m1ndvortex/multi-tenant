"""
Minimal marketing API for testing
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.user import User
from app.services.marketing_service import MarketingService

router = APIRouter(prefix="/marketing", tags=["marketing"])

@router.get("/test")
async def test_marketing_api():
    """Test endpoint for marketing API"""
    return {"message": "Marketing API is working"}

@router.get("/campaigns")
async def list_campaigns_minimal(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Minimal campaign listing endpoint"""
    marketing_service = MarketingService(db)
    
    campaigns = marketing_service.list_campaigns(
        tenant_id=str(current_user.tenant_id),
        limit=10
    )
    
    return {"campaigns": [{"id": str(c.id), "name": c.name} for c in campaigns]}