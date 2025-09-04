"""
QR Code generation service for invoice sharing
"""

import qrcode
from io import BytesIO
import base64
from typing import Optional
import logging

logger = logging.getLogger(__name__)


class QRCodeService:
    """Service for generating QR codes for invoice sharing"""
    
    def __init__(self, base_url: str = "https://app.hesaabplus.com"):
        self.base_url = base_url.rstrip('/')
    
    def generate_invoice_qr_code(
        self, 
        qr_token: str, 
        format: str = "PNG",
        size: int = 10,
        border: int = 4
    ) -> bytes:
        """
        Generate QR code for invoice sharing
        
        Args:
            qr_token: Unique token for the invoice
            format: Image format (PNG, JPEG, SVG)
            size: Size of the QR code (1-40)
            border: Border size around QR code
            
        Returns:
            QR code image as bytes
        """
        try:
            # Create the public invoice URL
            invoice_url = f"{self.base_url}/public/invoice/{qr_token}"
            
            # Create QR code instance
            qr = qrcode.QRCode(
                version=1,  # Controls the size of the QR Code
                error_correction=qrcode.constants.ERROR_CORRECT_L,
                box_size=size,
                border=border,
            )
            
            # Add data to QR code
            qr.add_data(invoice_url)
            qr.make(fit=True)
            
            # Create image
            img = qr.make_image(
                fill_color="black",
                back_color="white"
            )
            
            # Convert to bytes
            buffer = BytesIO()
            img.save(buffer, format=format.upper())
            buffer.seek(0)
            
            logger.info(f"Generated QR code for token {qr_token}")
            return buffer.getvalue()
            
        except Exception as e:
            logger.error(f"Failed to generate QR code for token {qr_token}: {e}")
            raise
    
    def generate_qr_code_base64(
        self, 
        qr_token: str, 
        format: str = "PNG",
        size: int = 10,
        border: int = 4
    ) -> str:
        """
        Generate QR code as base64 string for embedding in HTML/PDF
        
        Args:
            qr_token: Unique token for the invoice
            format: Image format (PNG, JPEG)
            size: Size of the QR code (1-40)
            border: Border size around QR code
            
        Returns:
            Base64 encoded QR code image
        """
        try:
            qr_bytes = self.generate_invoice_qr_code(qr_token, format, size, border)
            base64_string = base64.b64encode(qr_bytes).decode('utf-8')
            
            # Create data URL
            mime_type = f"image/{format.lower()}"
            data_url = f"data:{mime_type};base64,{base64_string}"
            
            return data_url
            
        except Exception as e:
            logger.error(f"Failed to generate base64 QR code for token {qr_token}: {e}")
            raise
    
    def generate_simple_qr_code(self, data: str, size: int = 10) -> bytes:
        """
        Generate a simple QR code for any data
        
        Args:
            data: Data to encode in QR code
            size: Size of the QR code
            
        Returns:
            QR code image as bytes
        """
        try:
            qr = qrcode.QRCode(
                version=1,
                error_correction=qrcode.constants.ERROR_CORRECT_L,
                box_size=size,
                border=4,
            )
            
            qr.add_data(data)
            qr.make(fit=True)
            
            img = qr.make_image(fill_color="black", back_color="white")
            
            buffer = BytesIO()
            img.save(buffer, format="PNG")
            buffer.seek(0)
            
            return buffer.getvalue()
            
        except Exception as e:
            logger.error(f"Failed to generate simple QR code: {e}")
            raise
    
    def validate_qr_token(self, qr_token: str) -> bool:
        """
        Validate QR token format
        
        Args:
            qr_token: Token to validate
            
        Returns:
            True if valid, False otherwise
        """
        if not qr_token or len(qr_token) < 10:
            return False
        
        # Add more validation logic as needed
        return True