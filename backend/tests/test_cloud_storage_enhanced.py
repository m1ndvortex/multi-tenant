"""
Comprehensive tests for enhanced cloud storage service
Tests dual-cloud configuration, failover scenarios, health monitoring, and cost tracking
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
from pathlib import Path
import tempfile
from datetime import datetime, timezone
from botocore.exceptions import ClientError

from app.services.cloud_storage_service import (
    CloudStorageService, 
    StorageProvider, 
    StorageHealthStatus, 
    StorageFailoverStrategy
)


class TestCloudStorageConfiguration:
    """Test cloud storage configuration and initialization"""
    
    @pytest.fixture
    def mock_settings(self):
        """Mock settings with proper credentials"""
        with patch('app.services.cloud_storage_service.settings') as mock:
            mock.backblaze_b2_access_key = "test_b2_key"
            mock.backblaze_b2_secret_key = "test_b2_secret"
            mock.backblaze_b2_bucket = "securesyntax"
            mock.cloudflare_r2_access_key = "test_r2_key"
            mock.cloudflare_r2_secret_key = "test_r2_secret"
            mock.cloudflare_r2_bucket = "hesaabplus-backups"
            mock.cloudflare_r2_endpoint = "https://test.r2.cloudflarestorage.com"
            yield mock
    
    @patch('boto3.client')
    def test_initialize_clients_success(self, mock_boto3, mock_settings):
        """Test successful initialization of both storage clients"""
        # Mock successful client creation
        mock_b2_client = Mock()
        mock_r2_client = Mock()
        mock_boto3.side_effect = [mock_b2_client, mock_r2_client]
        
        service = CloudStorageService()
        
        # Verify both clients are initialized
        assert service.b2_client is not None
        assert service.r2_client is not None
        assert mock_boto3.call_count == 2
        
        # Verify B2 client configuration
        b2_call = mock_boto3.call_args_list[0]
        assert b2_call[1]['endpoint_url'] == 'https://s3.us-east-005.backblazeb2.com'
        assert b2_call[1]['aws_access_key_id'] == 'test_b2_key'
        assert b2_call[1]['region_name'] == 'us-east-005'
        
        # Verify R2 client configuration
        r2_call = mock_boto3.call_args_list[1]
        assert r2_call[1]['endpoint_url'] == 'https://test.r2.cloudflarestorage.com'
        assert r2_call[1]['aws_access_key_id'] == 'test_r2_key'
        assert r2_call[1]['region_name'] == 'auto'
    
    @patch('boto3.client')
    def test_initialize_clients_partial_failure(self, mock_boto3, mock_settings):
        """Test initialization when one client fails"""
        # Mock B2 success, R2 failure
        mock_b2_client = Mock()
        mock_boto3.side_effect = [mock_b2_client, Exception("R2 connection failed")]
        
        service = CloudStorageService()
        
        # Verify B2 client is initialized, R2 is not
        assert service.b2_client is not None
        assert service.r2_client is None
    
    def test_initialize_clients_missing_credentials(self):
        """Test initialization with missing credentials"""
        with patch('app.services.cloud_storage_service.settings') as mock_settings:
            mock_settings.backblaze_b2_access_key = None
            mock_settings.backblaze_b2_secret_key = None
            mock_settings.backblaze_b2_bucket = None
            mock_settings.cloudflare_r2_access_key = None
            mock_settings.cloudflare_r2_secret_key = None
            mock_settings.cloudflare_r2_bucket = None
            mock_settings.cloudflare_r2_endpoint = None
            
            service = CloudStorageService()
            
            # Verify no clients are initialized
            assert service.b2_client is None
            assert service.r2_client is None


class TestHealthMonitoring:
    """Test storage provider health monitoring"""
    
    @pytest.fixture
    def service_with_clients(self):
        """Create service with mocked clients"""
        service = CloudStorageService()
        service.b2_client = Mock()
        service.r2_client = Mock()
        return service
    
    def test_health_check_all_healthy(self, service_with_clients):
        """Test health check when all providers are healthy"""
        service = service_with_clients
        
        # Mock successful head_bucket calls
        service.b2_client.head_bucket.return_value = {}
        service.r2_client.head_bucket.return_value = {}
        
        connectivity = service.test_connectivity()
        
        # Verify results
        assert connectivity["backblaze_b2"]["available"] is True
        assert connectivity["backblaze_b2"]["error"] is None
        assert connectivity["backblaze_b2"]["response_time"] is not None
        
        assert connectivity["cloudflare_r2"]["available"] is True
        assert connectivity["cloudflare_r2"]["error"] is None
        assert connectivity["cloudflare_r2"]["response_time"] is not None
        
        # Verify health status is updated
        assert service.health_status[StorageProvider.BACKBLAZE_B2] == StorageHealthStatus.HEALTHY
        assert service.health_status[StorageProvider.CLOUDFLARE_R2] == StorageHealthStatus.HEALTHY
    
    def test_health_check_partial_failure(self, service_with_clients):
        """Test health check when one provider fails"""
        service = service_with_clients
        
        # Mock B2 success, R2 failure
        service.b2_client.head_bucket.return_value = {}
        service.r2_client.head_bucket.side_effect = ClientError(
            {'Error': {'Code': 'NoSuchBucket'}}, 'HeadBucket'
        )
        
        connectivity = service.test_connectivity()
        
        # Verify B2 is healthy, R2 is not
        assert connectivity["backblaze_b2"]["available"] is True
        assert connectivity["cloudflare_r2"]["available"] is False
        assert "NoSuchBucket" in connectivity["cloudflare_r2"]["error"]
        
        # Verify health status
        assert service.health_status[StorageProvider.BACKBLAZE_B2] == StorageHealthStatus.HEALTHY
        assert service.health_status[StorageProvider.CLOUDFLARE_R2] == StorageHealthStatus.UNAVAILABLE
    
    def test_get_health_status_detailed(self, service_with_clients):
        """Test detailed health status reporting"""
        service = service_with_clients
        
        # Mock successful connectivity
        service.b2_client.head_bucket.return_value = {}
        service.r2_client.head_bucket.return_value = {}
        
        health_status = service.get_health_status()
        
        # Verify structure
        assert "overall_status" in health_status
        assert "providers" in health_status
        assert "failover_strategy" in health_status
        
        # Verify provider details
        b2_status = health_status["providers"]["backblaze_b2"]
        assert b2_status["status"] == "healthy"
        assert b2_status["available"] is True
        assert b2_status["client_initialized"] is True
        
        r2_status = health_status["providers"]["cloudflare_r2"]
        assert r2_status["status"] == "healthy"
        assert r2_status["available"] is True
        assert r2_status["client_initialized"] is True
        
        # Verify overall status
        assert health_status["overall_status"] == "healthy"
    
    def test_overall_health_status_calculation(self, service_with_clients):
        """Test overall health status calculation logic"""
        service = service_with_clients
        
        # Test all healthy
        service.health_status[StorageProvider.BACKBLAZE_B2] = StorageHealthStatus.HEALTHY
        service.health_status[StorageProvider.CLOUDFLARE_R2] = StorageHealthStatus.HEALTHY
        assert service._get_overall_health_status() == "healthy"
        
        # Test degraded (one healthy, one unavailable)
        service.health_status[StorageProvider.BACKBLAZE_B2] = StorageHealthStatus.HEALTHY
        service.health_status[StorageProvider.CLOUDFLARE_R2] = StorageHealthStatus.UNAVAILABLE
        assert service._get_overall_health_status() == "degraded"
        
        # Test all unavailable
        service.health_status[StorageProvider.BACKBLAZE_B2] = StorageHealthStatus.UNAVAILABLE
        service.health_status[StorageProvider.CLOUDFLARE_R2] = StorageHealthStatus.UNAVAILABLE
        assert service._get_overall_health_status() == "unavailable"


class TestFailoverStrategies:
    """Test automated failover and redundancy management"""
    
    @pytest.fixture
    def service_with_mocked_uploads(self):
        """Create service with mocked upload methods"""
        service = CloudStorageService()
        service.b2_client = Mock()
        service.r2_client = Mock()
        
        # Mock upload methods
        service.upload_to_b2 = Mock(return_value="s3://securesyntax/test.txt")
        service.upload_to_r2 = Mock(return_value="s3://hesaabplus-backups/test.txt")
        
        return service
    
    def test_primary_only_strategy_success(self, service_with_mocked_uploads):
        """Test primary-only failover strategy with successful upload"""
        service = service_with_mocked_uploads
        service.set_failover_strategy(StorageFailoverStrategy.PRIMARY_ONLY)
        
        with tempfile.NamedTemporaryFile() as temp_file:
            temp_path = Path(temp_file.name)
            temp_path.write_text("test content")
            
            result = service.upload_with_failover(temp_path, "test.txt")
            
            # Verify only B2 upload was attempted
            service.upload_to_b2.assert_called_once()
            service.upload_to_r2.assert_not_called()
            
            # Verify result
            assert result["success"] is True
            assert result["primary_upload"] == "s3://securesyntax/test.txt"
            assert result["secondary_upload"] is None
            assert result["strategy_used"] == "primary_only"
    
    def test_primary_only_strategy_failure(self, service_with_mocked_uploads):
        """Test primary-only strategy with upload failure"""
        service = service_with_mocked_uploads
        service.set_failover_strategy(StorageFailoverStrategy.PRIMARY_ONLY)
        service.upload_to_b2.side_effect = Exception("B2 upload failed")
        
        with tempfile.NamedTemporaryFile() as temp_file:
            temp_path = Path(temp_file.name)
            temp_path.write_text("test content")
            
            result = service.upload_with_failover(temp_path, "test.txt")
            
            # Verify failure
            assert result["success"] is False
            assert "B2 upload failed" in result["errors"][0]
            assert result["primary_upload"] is None
    
    def test_secondary_fallback_strategy_success(self, service_with_mocked_uploads):
        """Test secondary fallback strategy with primary success"""
        service = service_with_mocked_uploads
        service.set_failover_strategy(StorageFailoverStrategy.SECONDARY_FALLBACK)
        
        with tempfile.NamedTemporaryFile() as temp_file:
            temp_path = Path(temp_file.name)
            temp_path.write_text("test content")
            
            result = service.upload_with_failover(temp_path, "test.txt")
            
            # Verify only B2 upload was attempted (primary succeeded)
            service.upload_to_b2.assert_called_once()
            service.upload_to_r2.assert_not_called()
            
            assert result["success"] is True
            assert result["primary_upload"] == "s3://securesyntax/test.txt"
    
    def test_secondary_fallback_strategy_fallback(self, service_with_mocked_uploads):
        """Test secondary fallback strategy with primary failure, secondary success"""
        service = service_with_mocked_uploads
        service.set_failover_strategy(StorageFailoverStrategy.SECONDARY_FALLBACK)
        service.upload_to_b2.side_effect = Exception("B2 upload failed")
        
        with tempfile.NamedTemporaryFile() as temp_file:
            temp_path = Path(temp_file.name)
            temp_path.write_text("test content")
            
            result = service.upload_with_failover(temp_path, "test.txt")
            
            # Verify both uploads were attempted
            service.upload_to_b2.assert_called_once()
            service.upload_to_r2.assert_called_once()
            
            assert result["success"] is True
            assert result["secondary_upload"] == "s3://hesaabplus-backups/test.txt"
            assert "B2 upload failed" in result["errors"][0]
    
    def test_dual_upload_strategy_both_success(self, service_with_mocked_uploads):
        """Test dual upload strategy with both uploads successful"""
        service = service_with_mocked_uploads
        service.set_failover_strategy(StorageFailoverStrategy.DUAL_UPLOAD)
        
        with tempfile.NamedTemporaryFile() as temp_file:
            temp_path = Path(temp_file.name)
            temp_path.write_text("test content")
            
            result = service.upload_with_failover(temp_path, "test.txt")
            
            # Verify both uploads were attempted
            service.upload_to_b2.assert_called_once()
            service.upload_to_r2.assert_called_once()
            
            assert result["success"] is True
            assert result["primary_upload"] == "s3://securesyntax/test.txt"
            assert result["secondary_upload"] == "s3://hesaabplus-backups/test.txt"
    
    def test_dual_upload_strategy_partial_success(self, service_with_mocked_uploads):
        """Test dual upload strategy with one upload failing"""
        service = service_with_mocked_uploads
        service.set_failover_strategy(StorageFailoverStrategy.DUAL_UPLOAD)
        service.upload_to_r2.side_effect = Exception("R2 upload failed")
        
        with tempfile.NamedTemporaryFile() as temp_file:
            temp_path = Path(temp_file.name)
            temp_path.write_text("test content")
            
            result = service.upload_with_failover(temp_path, "test.txt")
            
            # Verify both uploads were attempted
            service.upload_to_b2.assert_called_once()
            service.upload_to_r2.assert_called_once()
            
            assert result["success"] is True  # Success because B2 succeeded
            assert result["primary_upload"] == "s3://securesyntax/test.txt"
            assert result["secondary_upload"] is None
            assert "R2 upload failed" in result["errors"][0]


class TestDownloadFailover:
    """Test download failover functionality"""
    
    @pytest.fixture
    def service_with_mocked_downloads(self):
        """Create service with mocked download methods"""
        service = CloudStorageService()
        service.b2_client = Mock()
        service.r2_client = Mock()
        
        # Mock download methods
        service.download_from_b2 = Mock()
        service.download_from_r2 = Mock()
        
        return service
    
    def test_download_with_preferred_provider_success(self, service_with_mocked_downloads):
        """Test download with preferred provider success"""
        service = service_with_mocked_downloads
        
        with tempfile.TemporaryDirectory() as temp_dir:
            local_path = Path(temp_dir) / "downloaded.txt"
            service.download_from_b2.return_value = local_path
            
            # Create the file to simulate successful download
            local_path.write_text("downloaded content")
            
            result = service.download_with_failover(
                "test.txt", 
                local_path, 
                preferred_provider=StorageProvider.BACKBLAZE_B2
            )
            
            # Verify B2 download was attempted first
            service.download_from_b2.assert_called_once()
            service.download_from_r2.assert_not_called()
            
            assert result["success"] is True
            assert result["provider_used"] == "backblaze_b2"
    
    def test_download_with_failover_to_secondary(self, service_with_mocked_downloads):
        """Test download failover to secondary provider"""
        service = service_with_mocked_downloads
        service.download_from_b2.side_effect = Exception("B2 download failed")
        
        with tempfile.TemporaryDirectory() as temp_dir:
            local_path = Path(temp_dir) / "downloaded.txt"
            service.download_from_r2.return_value = local_path
            
            # Create the file to simulate successful download
            local_path.write_text("downloaded content")
            
            result = service.download_with_failover("test.txt", local_path)
            
            # Verify both downloads were attempted
            service.download_from_b2.assert_called_once()
            service.download_from_r2.assert_called_once()
            
            assert result["success"] is True
            assert result["provider_used"] == "cloudflare_r2"
            assert "B2 download failed" in result["errors"][0]


class TestCostTracking:
    """Test cost tracking and analytics"""
    
    @pytest.fixture
    def service_with_cost_tracking(self):
        """Create service with initialized cost tracking"""
        service = CloudStorageService()
        return service
    
    def test_track_operation_cost(self, service_with_cost_tracking):
        """Test operation cost tracking"""
        service = service_with_cost_tracking
        
        # Track some operations
        service._track_operation_cost(StorageProvider.BACKBLAZE_B2, "upload")
        service._track_operation_cost(StorageProvider.BACKBLAZE_B2, "download")
        service._track_operation_cost(StorageProvider.CLOUDFLARE_R2, "upload")
        
        # Verify tracking
        assert service.cost_tracking[StorageProvider.BACKBLAZE_B2]["operations"] == 2
        assert service.cost_tracking[StorageProvider.CLOUDFLARE_R2]["operations"] == 1
    
    def test_track_storage_cost(self, service_with_cost_tracking):
        """Test storage cost tracking"""
        service = service_with_cost_tracking
        
        # Track storage usage
        service._track_storage_cost(StorageProvider.BACKBLAZE_B2, 1.5)  # 1.5 GB
        service._track_storage_cost(StorageProvider.CLOUDFLARE_R2, 2.0)  # 2.0 GB
        
        # Verify tracking
        assert service.cost_tracking[StorageProvider.BACKBLAZE_B2]["storage_gb"] == 1.5
        assert service.cost_tracking[StorageProvider.CLOUDFLARE_R2]["storage_gb"] == 2.0
    
    def test_track_bandwidth_cost(self, service_with_cost_tracking):
        """Test bandwidth cost tracking"""
        service = service_with_cost_tracking
        
        # Track bandwidth usage
        service._track_bandwidth_cost(StorageProvider.BACKBLAZE_B2, 0.5)  # 0.5 GB
        service._track_bandwidth_cost(StorageProvider.CLOUDFLARE_R2, 1.0)  # 1.0 GB
        
        # Verify tracking
        assert service.cost_tracking[StorageProvider.BACKBLAZE_B2]["bandwidth_gb"] == 0.5
        assert service.cost_tracking[StorageProvider.CLOUDFLARE_R2]["bandwidth_gb"] == 1.0
    
    def test_get_cost_analytics(self, service_with_cost_tracking):
        """Test cost analytics calculation"""
        service = service_with_cost_tracking
        
        # Set up some usage data
        service._track_operation_cost(StorageProvider.BACKBLAZE_B2, "upload")
        service._track_storage_cost(StorageProvider.BACKBLAZE_B2, 10.0)  # 10 GB
        service._track_bandwidth_cost(StorageProvider.BACKBLAZE_B2, 5.0)  # 5 GB
        
        service._track_operation_cost(StorageProvider.CLOUDFLARE_R2, "upload")
        service._track_storage_cost(StorageProvider.CLOUDFLARE_R2, 8.0)  # 8 GB
        service._track_bandwidth_cost(StorageProvider.CLOUDFLARE_R2, 3.0)  # 3 GB
        
        analytics = service.get_cost_analytics()
        
        # Verify structure
        assert "backblaze_b2" in analytics
        assert "cloudflare_r2" in analytics
        assert "summary" in analytics
        
        # Verify B2 analytics
        b2_analytics = analytics["backblaze_b2"]
        assert b2_analytics["usage"]["storage_gb"] == 10.0
        assert b2_analytics["usage"]["bandwidth_gb"] == 5.0
        assert b2_analytics["usage"]["operations_count"] == 1
        
        # Verify cost calculations exist
        assert "estimated_monthly_cost" in b2_analytics
        assert "storage" in b2_analytics["estimated_monthly_cost"]
        assert "bandwidth" in b2_analytics["estimated_monthly_cost"]
        assert "operations" in b2_analytics["estimated_monthly_cost"]
        assert "total" in b2_analytics["estimated_monthly_cost"]
        
        # Verify summary
        assert "total_estimated_monthly_cost" in analytics["summary"]
        assert "cost_optimization_notes" in analytics["summary"]
    
    def test_reset_cost_tracking(self, service_with_cost_tracking):
        """Test cost tracking reset"""
        service = service_with_cost_tracking
        
        # Add some tracking data
        service._track_operation_cost(StorageProvider.BACKBLAZE_B2, "upload")
        service._track_storage_cost(StorageProvider.BACKBLAZE_B2, 5.0)
        
        # Verify data exists
        assert service.cost_tracking[StorageProvider.BACKBLAZE_B2]["operations"] == 1
        assert service.cost_tracking[StorageProvider.BACKBLAZE_B2]["storage_gb"] == 5.0
        
        # Reset tracking
        service.reset_cost_tracking()
        
        # Verify reset
        assert service.cost_tracking[StorageProvider.BACKBLAZE_B2]["operations"] == 0
        assert service.cost_tracking[StorageProvider.BACKBLAZE_B2]["storage_gb"] == 0
        assert service.cost_tracking[StorageProvider.CLOUDFLARE_R2]["operations"] == 0
        assert service.cost_tracking[StorageProvider.CLOUDFLARE_R2]["storage_gb"] == 0


class TestRedundancyManagement:
    """Test storage redundancy management"""
    
    @pytest.fixture
    def service_with_mocked_lists(self):
        """Create service with mocked list methods"""
        service = CloudStorageService()
        service.b2_client = Mock()
        service.r2_client = Mock()
        
        # Mock list methods
        service.list_b2_objects = Mock()
        service.list_r2_objects = Mock()
        
        return service
    
    def test_get_storage_redundancy_status_full_redundancy(self, service_with_mocked_lists):
        """Test redundancy status with full redundancy"""
        service = service_with_mocked_lists
        
        # Mock identical object lists
        objects = [
            {"key": "backup1.sql.gz", "size": 1000},
            {"key": "backup2.sql.gz", "size": 2000},
            {"key": "backup3.sql.gz", "size": 1500}
        ]
        service.list_b2_objects.return_value = objects
        service.list_r2_objects.return_value = objects
        
        status = service.get_storage_redundancy_status()
        
        # Verify full redundancy
        assert status["total_objects"]["backblaze_b2"] == 3
        assert status["total_objects"]["cloudflare_r2"] == 3
        assert status["redundancy"]["fully_redundant"] == 3
        assert status["redundancy"]["b2_only"] == 0
        assert status["redundancy"]["r2_only"] == 0
        assert status["redundancy"]["redundancy_percentage"] == 100.0
        
        # Verify recommendations
        assert "Excellent! All objects are fully redundant" in status["recommendations"][0]
    
    def test_get_storage_redundancy_status_partial_redundancy(self, service_with_mocked_lists):
        """Test redundancy status with partial redundancy"""
        service = service_with_mocked_lists
        
        # Mock different object lists
        b2_objects = [
            {"key": "backup1.sql.gz", "size": 1000},
            {"key": "backup2.sql.gz", "size": 2000},
            {"key": "backup3.sql.gz", "size": 1500}  # B2 only
        ]
        r2_objects = [
            {"key": "backup1.sql.gz", "size": 1000},
            {"key": "backup2.sql.gz", "size": 2000},
            {"key": "backup4.sql.gz", "size": 1800}  # R2 only
        ]
        
        service.list_b2_objects.return_value = b2_objects
        service.list_r2_objects.return_value = r2_objects
        
        status = service.get_storage_redundancy_status()
        
        # Verify partial redundancy
        assert status["redundancy"]["fully_redundant"] == 2
        assert status["redundancy"]["b2_only"] == 1
        assert status["redundancy"]["r2_only"] == 1
        assert status["redundancy"]["redundancy_percentage"] == 66.67  # 2/3 * 100
        
        # Verify object lists
        assert "backup3.sql.gz" in status["objects"]["b2_only"]
        assert "backup4.sql.gz" in status["objects"]["r2_only"]
        
        # Verify recommendations
        recommendations = status["recommendations"]
        assert any("B2-only objects to R2" in rec for rec in recommendations)
        assert any("R2-only objects to B2" in rec for rec in recommendations)
    
    def test_get_redundancy_recommendations(self, service_with_mocked_lists):
        """Test redundancy recommendations logic"""
        service = service_with_mocked_lists
        
        # Test with B2-only objects
        b2_only = {"backup1.sql.gz", "backup2.sql.gz"}
        r2_only = set()
        recommendations = service._get_redundancy_recommendations(b2_only, r2_only)
        assert len(recommendations) == 1
        assert "2 B2-only objects to R2" in recommendations[0]
        
        # Test with R2-only objects
        b2_only = set()
        r2_only = {"backup3.sql.gz"}
        recommendations = service._get_redundancy_recommendations(b2_only, r2_only)
        assert len(recommendations) == 1
        assert "1 R2-only objects to B2" in recommendations[0]
        
        # Test with no missing objects
        b2_only = set()
        r2_only = set()
        recommendations = service._get_redundancy_recommendations(b2_only, r2_only)
        assert len(recommendations) == 1
        assert "Excellent! All objects are fully redundant" in recommendations[0]


class TestIntegrationScenarios:
    """Test integration scenarios combining multiple features"""
    
    @pytest.fixture
    def full_service_mock(self):
        """Create fully mocked service for integration testing"""
        with patch('app.services.cloud_storage_service.settings') as mock_settings:
            mock_settings.backblaze_b2_access_key = "test_b2_key"
            mock_settings.backblaze_b2_secret_key = "test_b2_secret"
            mock_settings.backblaze_b2_bucket = "securesyntax"
            mock_settings.cloudflare_r2_access_key = "test_r2_key"
            mock_settings.cloudflare_r2_secret_key = "test_r2_secret"
            mock_settings.cloudflare_r2_bucket = "hesaabplus-backups"
            mock_settings.cloudflare_r2_endpoint = "https://test.r2.cloudflarestorage.com"
            
            with patch('boto3.client') as mock_boto3:
                mock_b2_client = Mock()
                mock_r2_client = Mock()
                mock_boto3.side_effect = [mock_b2_client, mock_r2_client]
                
                service = CloudStorageService()
                yield service
    
    def test_complete_backup_workflow_with_failover(self, full_service_mock):
        """Test complete backup workflow with health monitoring and failover"""
        service = full_service_mock
        
        # Mock health check - B2 healthy, R2 degraded
        service.b2_client.head_bucket.return_value = {}
        service.r2_client.head_bucket.side_effect = ClientError(
            {'Error': {'Code': 'SlowDown'}}, 'HeadBucket'
        )
        
        # Mock upload methods
        service.upload_to_b2 = Mock(return_value="s3://securesyntax/backup.sql.gz")
        service.upload_to_r2 = Mock(side_effect=Exception("R2 temporarily unavailable"))
        
        # Set dual upload strategy
        service.set_failover_strategy(StorageFailoverStrategy.DUAL_UPLOAD)
        
        with tempfile.NamedTemporaryFile() as temp_file:
            temp_path = Path(temp_file.name)
            temp_path.write_text("backup content")
            
            # Perform health check
            health_status = service.get_health_status()
            
            # Perform upload with failover
            upload_result = service.upload_with_failover(temp_path, "backup.sql.gz")
            
            # Get cost analytics
            cost_analytics = service.get_cost_analytics()
            
            # Verify health status shows degraded
            assert health_status["overall_status"] == "degraded"
            assert health_status["providers"]["backblaze_b2"]["available"] is True
            assert health_status["providers"]["cloudflare_r2"]["available"] is False
            
            # Verify upload succeeded on B2 but failed on R2
            assert upload_result["success"] is True
            assert upload_result["primary_upload"] == "s3://securesyntax/backup.sql.gz"
            assert upload_result["secondary_upload"] is None
            assert len(upload_result["errors"]) == 1
            
            # Verify cost tracking
            assert cost_analytics["backblaze_b2"]["usage"]["operations_count"] == 1
            assert cost_analytics["cloudflare_r2"]["usage"]["operations_count"] == 1  # Failed attempt still counted
    
    def test_disaster_recovery_scenario(self, full_service_mock):
        """Test disaster recovery scenario with provider switching"""
        service = full_service_mock
        
        # Simulate B2 complete failure
        service.b2_client.head_bucket.side_effect = Exception("B2 service unavailable")
        service.r2_client.head_bucket.return_value = {}
        
        # Mock download methods
        service.download_from_b2 = Mock(side_effect=Exception("B2 unavailable"))
        service.download_from_r2 = Mock()
        
        with tempfile.TemporaryDirectory() as temp_dir:
            local_path = Path(temp_dir) / "restored_backup.sql.gz"
            service.download_from_r2.return_value = local_path
            local_path.write_text("restored content")
            
            # Check health status
            health_status = service.get_health_status()
            
            # Attempt download with failover
            download_result = service.download_with_failover("backup.sql.gz", local_path)
            
            # Verify B2 is unavailable, R2 is healthy
            assert health_status["overall_status"] == "degraded"
            assert health_status["providers"]["backblaze_b2"]["available"] is False
            assert health_status["providers"]["cloudflare_r2"]["available"] is True
            
            # Verify download succeeded via R2 failover
            assert download_result["success"] is True
            assert download_result["provider_used"] == "cloudflare_r2"
            assert len(download_result["errors"]) == 1  # B2 failure recorded