"""
Webhook service for sending real-time notifications
"""

from typing import Dict, Any
from sqlalchemy.orm import Session
from ..models.api_key import WebhookEndpoint
from ..services.api_key_service import WebhookService as BaseWebhookService


class WebhookService(BaseWebhookService):
    """
    Extended webhook service with additional convenience methods
    """
    
    def __init__(self, db: Session):
        super().__init__(db)
    
    async def send_webhook(self, event_type: str, payload: Dict[str, Any], tenant_id: str):
        """
        Send webhook notifications for an event
        
        Args:
            event_type: Type of event (e.g., 'customer.created')
            payload: Event data to send
            tenant_id: ID of the tenant that triggered the event
        """
        await super().send_webhook(event_type, payload, tenant_id)