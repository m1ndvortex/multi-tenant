"""
Unit tests for QR code generation service
"""

import pytest
from unittest.mock import Mock, patch
from io import BytesIO
import base64

from app.services.qr_service import QRCodeService


class TestQRCodeService:
    """Test cases for QR code generation service"""
    
    def setup_method(self):
        """Setup test fixtures"""
        self.qr_service = QRCodeService(base_url="https://test.hesaabplus.com")
    
    def test_qr_service_initialization(self):
        """Test QR service initialization"""
        service = QRCodeService()
        assert service.base_url == "https://app.hesaabplus.com"
        
        service_with_url = QRCodeService("https://custom.domain.com/")
        assert service_with_url.base_url == "https://custom.domain.com"
    
    def test_generate_invoice_qr_code_success(self):
        """Test successful QR code generation"""
        qr_token = "test-token-12345"
        
        qr_bytes = self.qr_service.generate_invoice_qr_code(qr_token)
        
        assert isinstance(qr_bytes, bytes)
        assert len(qr_bytes) > 0
        
        # Verify it's a valid PNG image (starts with PNG signature)
        assert qr_bytes.startswith(b'\x89PNG\r\n\x1a\n')
    
    def test_generate_qr_code_different_formats(self):
        """Test QR code generation with different formats"""
        qr_token = "test-token-format"
        
        # Test PNG format
        png_bytes = self.qr_service.generate_invoice_qr_code(qr_token, format="PNG")
        assert png_bytes.startswith(b'\x89PNG\r\n\x1a\n')
        
        # Test JPEG format
        jpeg_bytes = self.qr_service.generate_invoice_qr_code(qr_token, format="JPEG")
        assert jpeg_bytes.startswith(b'\xff\xd8\xff')  # JPEG signature
    
    def test_generate_qr_code_different_sizes(self):
        """Test QR code generation with different sizes"""
        qr_token = "test-token-size"
        
        # Small size
        small_qr = self.qr_service.generate_invoice_qr_code(qr_token, size=5)
        
        # Large size
        large_qr = self.qr_service.generate_invoice_qr_code(qr_token, size=15)
        
        # Large QR should be bigger than small QR
        assert len(large_qr) > len(small_qr)
    
    def test_generate_qr_code_base64_success(self):
        """Test base64 QR code generation"""
        qr_token = "test-token-base64"
        
        base64_string = self.qr_service.generate_qr_code_base64(qr_token)
        
        assert isinstance(base64_string, str)
        assert base64_string.startswith("data:image/png;base64,")
        
        # Verify it's valid base64
        base64_data = base64_string.split(",")[1]
        decoded_bytes = base64.b64decode(base64_data)
        assert decoded_bytes.startswith(b'\x89PNG\r\n\x1a\n')
    
    def test_generate_qr_code_base64_jpeg(self):
        """Test base64 QR code generation with JPEG format"""
        qr_token = "test-token-base64-jpeg"
        
        base64_string = self.qr_service.generate_qr_code_base64(qr_token, format="JPEG")
        
        assert base64_string.startswith("data:image/jpeg;base64,")
        
        # Verify it's valid base64 JPEG
        base64_data = base64_string.split(",")[1]
        decoded_bytes = base64.b64decode(base64_data)
        assert decoded_bytes.startswith(b'\xff\xd8\xff')
    
    def test_generate_simple_qr_code(self):
        """Test simple QR code generation for any data"""
        test_data = "https://example.com/test"
        
        qr_bytes = self.qr_service.generate_simple_qr_code(test_data)
        
        assert isinstance(qr_bytes, bytes)
        assert len(qr_bytes) > 0
        assert qr_bytes.startswith(b'\x89PNG\r\n\x1a\n')
    
    def test_validate_qr_token_valid(self):
        """Test QR token validation with valid tokens"""
        valid_tokens = [
            "valid-token-123",
            "another-valid-token-456",
            "uuid-style-token-789abc"
        ]
        
        for token in valid_tokens:
            assert self.qr_service.validate_qr_token(token) is True
    
    def test_validate_qr_token_invalid(self):
        """Test QR token validation with invalid tokens"""
        invalid_tokens = [
            "",
            None,
            "short",
            "123456789"  # Exactly 9 characters (too short)
        ]
        
        for token in invalid_tokens:
            assert self.qr_service.validate_qr_token(token) is False
    
    def test_qr_code_contains_correct_url(self):
        """Test that QR code contains the correct URL"""
        qr_token = "test-url-token"
        expected_url = f"https://test.hesaabplus.com/public/invoice/{qr_token}"
        
        # We can't easily decode QR codes in tests, but we can verify
        # the service is called with correct parameters
        with patch('qrcode.QRCode') as mock_qr:
            mock_instance = Mock()
            mock_qr.return_value = mock_instance
            
            self.qr_service.generate_invoice_qr_code(qr_token)
            
            # Verify add_data was called with correct URL
            mock_instance.add_data.assert_called_once_with(expected_url)
    
    @patch('app.services.qr_service.logger')
    def test_qr_code_generation_error_handling(self, mock_logger):
        """Test error handling in QR code generation"""
        with patch('qrcode.QRCode') as mock_qr:
            mock_qr.side_effect = Exception("QR generation failed")
            
            with pytest.raises(Exception):
                self.qr_service.generate_invoice_qr_code("test-token")
            
            # Verify error was logged
            mock_logger.error.assert_called_once()
    
    @patch('app.services.qr_service.logger')
    def test_base64_generation_error_handling(self, mock_logger):
        """Test error handling in base64 QR code generation"""
        with patch.object(self.qr_service, 'generate_invoice_qr_code') as mock_generate:
            mock_generate.side_effect = Exception("Generation failed")
            
            with pytest.raises(Exception):
                self.qr_service.generate_qr_code_base64("test-token")
            
            # Verify error was logged
            mock_logger.error.assert_called_once()
    
    def test_qr_code_customization_options(self):
        """Test QR code customization options"""
        qr_token = "test-customization"
        
        # Test with custom border
        qr_with_border = self.qr_service.generate_invoice_qr_code(
            qr_token, 
            size=8, 
            border=6
        )
        
        # Test with minimal border
        qr_minimal_border = self.qr_service.generate_invoice_qr_code(
            qr_token, 
            size=8, 
            border=1
        )
        
        # Both should be valid images
        assert qr_with_border.startswith(b'\x89PNG\r\n\x1a\n')
        assert qr_minimal_border.startswith(b'\x89PNG\r\n\x1a\n')
        
        # QR with larger border should be bigger
        assert len(qr_with_border) > len(qr_minimal_border)
    
    def test_qr_service_thread_safety(self):
        """Test that QR service can handle concurrent requests"""
        import threading
        import time
        
        results = []
        errors = []
        
        def generate_qr(token_suffix):
            try:
                qr_token = f"concurrent-test-{token_suffix}"
                qr_bytes = self.qr_service.generate_invoice_qr_code(qr_token)
                results.append((token_suffix, len(qr_bytes)))
            except Exception as e:
                errors.append((token_suffix, str(e)))
        
        # Create multiple threads
        threads = []
        for i in range(5):
            thread = threading.Thread(target=generate_qr, args=(i,))
            threads.append(thread)
        
        # Start all threads
        for thread in threads:
            thread.start()
        
        # Wait for all threads to complete
        for thread in threads:
            thread.join()
        
        # Verify all succeeded
        assert len(errors) == 0
        assert len(results) == 5
        
        # Verify all results are valid
        for suffix, size in results:
            assert size > 0
    
    def test_qr_code_url_encoding(self):
        """Test QR code generation with special characters in token"""
        special_tokens = [
            "token-with-dashes",
            "token_with_underscores",
            "token123with456numbers",
            "UPPERCASE-TOKEN"
        ]
        
        for token in special_tokens:
            qr_bytes = self.qr_service.generate_invoice_qr_code(token)
            assert isinstance(qr_bytes, bytes)
            assert len(qr_bytes) > 0