"""
Unit tests for invoice sharing service
"""

import pytest
from unittest.mock import Mock, patch
from datetime import datetime, timedelta
import uuid
from sqlalchemy.orm import Session

from app.services.invoice_sharing_service import InvoiceSharingService
from app.models.invoice import Invoice, InvoiceType, InvoiceStatus
from app.models.invoice_access_log import InvoiceAccessLog
from app.models.customer import Customer
from app.models.tenant import Tenant
from app.core.exceptions import NotFoundError, ValidationError


class TestInvoiceSharingService:
    """Test cases for invoice sharing service"""
    
    def setup_method(self):
        """Setup test fixtures"""
        self.mock_db = Mock(spec=Session)
        self.service = InvoiceSharingService(self.mock_db)
        
        # Create test data
        self.tenant_id = uuid.uuid4()
        self.invoice_id = uuid.uuid4()
        self.qr_token = "test-qr-token-12345"
        
        # Mock customer
        self.mock_customer = Mock(spec=Customer)
        self.mock_customer.id = uuid.uuid4()
        self.mock_customer.name = "Test Customer"
        
        # Mock invoice
        self.mock_invoice = Mock(spec=Invoice)
        self.mock_invoice.id = self.invoice_id
        self.mock_invoice.tenant_id = self.tenant_id
        self.mock_invoice.qr_code_token = self.qr_token
        self.mock_invoice.is_shareable = True
        self.mock_invoice.is_active = True
        self.mock_invoice.invoice_number = "INV-2024-01-0001"
        self.mock_invoice.customer = self.mock_customer
        self.mock_invoice.items = []
        self.mock_invoice.installments = []
    
    def test_get_public_invoice_success(self):
        """Test successful public invoice retrieval"""
        # Setup mock query
        mock_query = Mock()
        mock_query.options.return_value = mock_query
        mock_query.filter.return_value = mock_query
        mock_query.first.return_value = self.mock_invoice
        self.mock_db.query.return_value = mock_query
        
        # Mock the _log_invoice_access method
        with patch.object(self.service, '_log_invoice_access'):
            result = self.service.get_public_invoice(
                qr_token=self.qr_token,
                access_ip="192.168.1.1",
                user_agent="Test Browser",
                referer="https://example.com"
            )
        
        assert result == self.mock_invoice
        self.mock_db.query.assert_called_once_with(Invoice)
    
    def test_get_public_invoice_not_found(self):
        """Test public invoice retrieval when invoice not found"""
        # Setup mock query to return None
        mock_query = Mock()
        mock_query.options.return_value = mock_query
        mock_query.filter.return_value = mock_query
        mock_query.first.return_value = None
        self.mock_db.query.return_value = mock_query
        
        result = self.service.get_public_invoice(self.qr_token)
        
        assert result is None
    
    def test_get_public_invoice_invalid_token(self):
        """Test public invoice retrieval with invalid token"""
        with pytest.raises(ValidationError, match="Invalid QR token"):
            self.service.get_public_invoice("")
        
        with pytest.raises(ValidationError, match="Invalid QR token"):
            self.service.get_public_invoice("short")
    
    def test_log_invoice_access_success(self):
        """Test successful invoice access logging"""
        self.service._log_invoice_access(
            invoice_id=self.invoice_id,
            qr_token=self.qr_token,
            access_ip="192.168.1.1",
            user_agent="Test Browser",
            referer="https://example.com",
            session_id="session123"
        )
        
        # Verify access log was created and added to database
        self.mock_db.add.assert_called_once()
        self.mock_db.commit.assert_called_once()
        
        # Verify the access log has correct data
        added_log = self.mock_db.add.call_args[0][0]
        assert isinstance(added_log, InvoiceAccessLog)
        assert added_log.invoice_id == self.invoice_id
        assert added_log.qr_token == self.qr_token
        assert added_log.access_ip == "192.168.1.1"
        assert added_log.user_agent == "Test Browser"
        assert added_log.referer == "https://example.com"
        assert added_log.session_id == "session123"
    
    def test_log_invoice_access_invalid_ip(self):
        """Test invoice access logging with invalid IP address"""
        with patch('app.services.invoice_sharing_service.logger') as mock_logger:
            # Reset mock to ensure clean state
            self.mock_db.reset_mock()
            
            # Use a clearly invalid IP format that will trigger AddressValueError
            invalid_ip = "999.999.999.999"
            
            # Should not raise exception even with invalid IP
            self.service._log_invoice_access(
                invoice_id=self.invoice_id,
                qr_token=self.qr_token,
                access_ip=invalid_ip
            )
            
            # Should still create log (method should not fail)
            self.mock_db.add.assert_called_once()
            added_log = self.mock_db.add.call_args[0][0]
            
            # IP should be None due to validation failure
            assert added_log.access_ip is None
            
            # Should log warning about invalid IP
            mock_logger.warning.assert_called_once()
    
    def test_log_invoice_access_error_handling(self):
        """Test error handling in access logging"""
        self.mock_db.add.side_effect = Exception("Database error")
        
        with patch('app.services.invoice_sharing_service.logger') as mock_logger:
            # Should not raise exception
            self.service._log_invoice_access(
                invoice_id=self.invoice_id,
                qr_token=self.qr_token
            )
            
            # Should log error
            mock_logger.error.assert_called_once()
    
    def test_get_invoice_access_logs_success(self):
        """Test successful retrieval of access logs"""
        # Mock access logs
        mock_logs = [Mock(spec=InvoiceAccessLog) for _ in range(3)]
        
        # Setup mock query
        mock_query = Mock()
        mock_query.join.return_value = mock_query
        mock_query.filter.return_value = mock_query
        mock_query.count.return_value = 10
        mock_query.order_by.return_value = mock_query
        mock_query.offset.return_value = mock_query
        mock_query.limit.return_value = mock_query
        mock_query.all.return_value = mock_logs
        self.mock_db.query.return_value = mock_query
        
        logs, total = self.service.get_invoice_access_logs(
            tenant_id=self.tenant_id,
            invoice_id=self.invoice_id,
            days_back=7,
            skip=0,
            limit=50
        )
        
        assert logs == mock_logs
        assert total == 10
        self.mock_db.query.assert_called_with(InvoiceAccessLog)
    
    def test_get_invoice_access_statistics_success(self):
        """Test successful retrieval of access statistics"""
        # Setup mock queries for statistics
        mock_base_query = Mock()
        mock_base_query.join.return_value = mock_base_query
        mock_base_query.filter.return_value = mock_base_query
        mock_base_query.count.return_value = 25
        mock_base_query.with_entities.return_value = mock_base_query
        mock_base_query.distinct.return_value = mock_base_query
        mock_base_query.group_by.return_value = mock_base_query
        mock_base_query.order_by.return_value = mock_base_query
        mock_base_query.limit.return_value = mock_base_query
        mock_base_query.all.return_value = []
        
        self.mock_db.query.return_value = mock_base_query
        
        stats = self.service.get_invoice_access_statistics(
            tenant_id=self.tenant_id,
            days_back=30
        )
        
        assert isinstance(stats, dict)
        assert 'total_accesses' in stats
        assert 'unique_ips' in stats
        assert 'daily_accesses' in stats
        assert 'top_ips' in stats
        assert 'most_accessed_invoices' in stats
        assert 'period_days' in stats
        assert stats['period_days'] == 30
    
    def test_update_invoice_sharing_settings_success(self):
        """Test successful update of invoice sharing settings"""
        # Setup mock query
        mock_query = Mock()
        mock_query.filter.return_value = mock_query
        mock_query.first.return_value = self.mock_invoice
        self.mock_db.query.return_value = mock_query
        
        result = self.service.update_invoice_sharing_settings(
            tenant_id=self.tenant_id,
            invoice_id=self.invoice_id,
            is_shareable=True,
            regenerate_token=True
        )
        
        assert result == self.mock_invoice
        self.mock_db.commit.assert_called_once()
        self.mock_db.refresh.assert_called_once_with(self.mock_invoice)
        
        # Verify generate_qr_token was called
        self.mock_invoice.generate_qr_token.assert_called_once()
    
    def test_update_invoice_sharing_settings_not_found(self):
        """Test update sharing settings when invoice not found"""
        # Setup mock query to return None
        mock_query = Mock()
        mock_query.filter.return_value = mock_query
        mock_query.first.return_value = None
        self.mock_db.query.return_value = mock_query
        
        with pytest.raises(NotFoundError, match="Invoice not found"):
            self.service.update_invoice_sharing_settings(
                tenant_id=self.tenant_id,
                invoice_id=self.invoice_id,
                is_shareable=True
            )
    
    def test_validate_qr_token_access_valid(self):
        """Test QR token validation with valid token"""
        # Setup mock query
        mock_query = Mock()
        mock_query.filter.return_value = mock_query
        mock_query.first.return_value = self.mock_invoice
        self.mock_db.query.return_value = mock_query
        
        result = self.service.validate_qr_token_access(self.qr_token)
        
        assert result['valid'] is True
        assert result['invoice_number'] == self.mock_invoice.invoice_number
    
    def test_validate_qr_token_access_invalid(self):
        """Test QR token validation with invalid token"""
        # Setup mock query to return None
        mock_query = Mock()
        mock_query.filter.return_value = mock_query
        mock_query.first.return_value = None
        self.mock_db.query.return_value = mock_query
        
        result = self.service.validate_qr_token_access("invalid-token")
        
        assert result['valid'] is False
        assert 'error' in result
    
    def test_validate_qr_token_access_rate_limiting(self):
        """Test QR token validation with rate limiting"""
        # Setup mock invoice query
        mock_invoice_query = Mock()
        mock_invoice_query.filter.return_value = mock_invoice_query
        mock_invoice_query.first.return_value = self.mock_invoice
        
        # Setup mock access log query for rate limiting
        mock_log_query = Mock()
        mock_log_query.filter.return_value = mock_log_query
        mock_log_query.count.return_value = 150  # Exceeds limit of 100
        
        # Configure db.query to return different mocks based on model
        def mock_query_side_effect(model):
            if model == Invoice:
                return mock_invoice_query
            elif model == InvoiceAccessLog:
                return mock_log_query
            return Mock()
        
        self.mock_db.query.side_effect = mock_query_side_effect
        
        result = self.service.validate_qr_token_access(
            self.qr_token,
            access_ip="192.168.1.1"
        )
        
        assert result['valid'] is False
        assert 'Rate limit exceeded' in result['error']
    
    def test_get_shareable_invoices_success(self):
        """Test successful retrieval of shareable invoices"""
        mock_invoices = [Mock(spec=Invoice) for _ in range(5)]
        
        # Setup mock query
        mock_query = Mock()
        mock_query.filter.return_value = mock_query
        mock_query.count.return_value = 15
        mock_query.order_by.return_value = mock_query
        mock_query.offset.return_value = mock_query
        mock_query.limit.return_value = mock_query
        mock_query.all.return_value = mock_invoices
        self.mock_db.query.return_value = mock_query
        
        invoices, total = self.service.get_shareable_invoices(
            tenant_id=self.tenant_id,
            skip=0,
            limit=10
        )
        
        assert invoices == mock_invoices
        assert total == 15
    
    def test_service_error_handling(self):
        """Test general error handling in service methods"""
        # Make database query fail
        self.mock_db.query.side_effect = Exception("Database connection failed")
        
        with pytest.raises(Exception):
            self.service.get_public_invoice(self.qr_token)
        
        with pytest.raises(Exception):
            self.service.get_invoice_access_logs(self.tenant_id)
        
        with pytest.raises(Exception):
            self.service.get_invoice_access_statistics(self.tenant_id)
        
        with pytest.raises(Exception):
            self.service.get_shareable_invoices(self.tenant_id)
    
    def test_access_log_data_truncation(self):
        """Test that long user agent and referer strings are truncated"""
        long_user_agent = "A" * 2000  # Very long user agent
        long_referer = "B" * 1000     # Very long referer
        
        self.service._log_invoice_access(
            invoice_id=self.invoice_id,
            qr_token=self.qr_token,
            user_agent=long_user_agent,
            referer=long_referer
        )
        
        # Verify data was truncated
        added_log = self.mock_db.add.call_args[0][0]
        assert len(added_log.user_agent) <= 1000
        assert len(added_log.referer) <= 500
    
    def test_concurrent_access_logging(self):
        """Test concurrent access logging doesn't cause issues"""
        import threading
        
        def log_access(suffix):
            self.service._log_invoice_access(
                invoice_id=self.invoice_id,
                qr_token=f"{self.qr_token}-{suffix}",
                access_ip=f"192.168.1.{suffix}"
            )
        
        # Create multiple threads
        threads = []
        for i in range(5):
            thread = threading.Thread(target=log_access, args=(i,))
            threads.append(thread)
        
        # Start all threads
        for thread in threads:
            thread.start()
        
        # Wait for completion
        for thread in threads:
            thread.join()
        
        # Verify all calls were made
        assert self.mock_db.add.call_count == 5
        assert self.mock_db.commit.call_count == 5