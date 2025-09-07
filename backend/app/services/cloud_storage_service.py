"""
Cloud storage service for dual-cloud backup storage
Supports Backblaze B2 (primary) and Cloudflare R2 (secondary)
Includes health monitoring, failover management, and cost tracking
"""

import boto3
from botocore.exceptions import ClientError, NoCredentialsError
from pathlib import Path
from typing import Dict, Optional, List, Tuple
import logging
from datetime import datetime, timezone, timedelta
import time
import json
from enum import Enum

from app.core.config import settings

logger = logging.getLogger(__name__)


class StorageProvider(Enum):
    """Storage provider enumeration"""
    BACKBLAZE_B2 = "backblaze_b2"
    CLOUDFLARE_R2 = "cloudflare_r2"


class StorageHealthStatus(Enum):
    """Storage health status enumeration"""
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNAVAILABLE = "unavailable"


class StorageFailoverStrategy(Enum):
    """Failover strategy enumeration"""
    PRIMARY_ONLY = "primary_only"
    SECONDARY_FALLBACK = "secondary_fallback"
    DUAL_UPLOAD = "dual_upload"


class CloudStorageService:
    """Service for managing dual-cloud storage operations with health monitoring and failover"""
    
    def __init__(self):
        self.b2_client = None
        self.r2_client = None
        self.health_status = {
            StorageProvider.BACKBLAZE_B2: StorageHealthStatus.UNAVAILABLE,
            StorageProvider.CLOUDFLARE_R2: StorageHealthStatus.UNAVAILABLE
        }
        self.last_health_check = {}
        self.failover_strategy = StorageFailoverStrategy.DUAL_UPLOAD
        self.cost_tracking = {
            StorageProvider.BACKBLAZE_B2: {"operations": 0, "storage_gb": 0, "bandwidth_gb": 0},
            StorageProvider.CLOUDFLARE_R2: {"operations": 0, "storage_gb": 0, "bandwidth_gb": 0}
        }
        self._initialize_clients()
    
    def _initialize_clients(self):
        """Initialize cloud storage clients"""
        # Initialize Backblaze B2 client
        if all([
            settings.backblaze_b2_access_key,
            settings.backblaze_b2_secret_key,
            settings.backblaze_b2_bucket
        ]):
            try:
                self.b2_client = boto3.client(
                    's3',
                    endpoint_url='https://s3.us-east-005.backblazeb2.com',
                    aws_access_key_id=settings.backblaze_b2_access_key,
                    aws_secret_access_key=settings.backblaze_b2_secret_key,
                    region_name='us-east-005'
                )
                logger.info(f"Backblaze B2 client initialized successfully with bucket: {settings.backblaze_b2_bucket}")
            except Exception as e:
                logger.error(f"Failed to initialize Backblaze B2 client: {e}")
        else:
            logger.warning(f"Backblaze B2 credentials not configured: access_key={bool(settings.backblaze_b2_access_key)}, secret_key={bool(settings.backblaze_b2_secret_key)}, bucket={bool(settings.backblaze_b2_bucket)}")
        
        # Initialize Cloudflare R2 client
        if all([
            settings.cloudflare_r2_access_key,
            settings.cloudflare_r2_secret_key,
            settings.cloudflare_r2_bucket,
            settings.cloudflare_r2_endpoint
        ]):
            try:
                self.r2_client = boto3.client(
                    's3',
                    endpoint_url=settings.cloudflare_r2_endpoint,
                    aws_access_key_id=settings.cloudflare_r2_access_key,
                    aws_secret_access_key=settings.cloudflare_r2_secret_key,
                    region_name='auto'
                )
                logger.info("Cloudflare R2 client initialized successfully")
            except Exception as e:
                logger.error(f"Failed to initialize Cloudflare R2 client: {e}")
        else:
            logger.warning("Cloudflare R2 credentials not configured")
    
    def upload_to_b2(self, file_path: Path, object_key: str, metadata: Dict = None) -> str:
        """Upload file to Backblaze B2"""
        if not self.b2_client:
            raise Exception("Backblaze B2 client not initialized")
        
        try:
            # Prepare metadata
            s3_metadata = {}
            if metadata:
                for key, value in metadata.items():
                    s3_metadata[f"x-amz-meta-{key}"] = str(value)
            
            # Add standard metadata
            s3_metadata.update({
                "x-amz-meta-uploaded-at": datetime.now(timezone.utc).isoformat(),
                "x-amz-meta-service": "hesaabplus-backup",
                "x-amz-meta-file-size": str(file_path.stat().st_size)
            })
            
            # Upload file
            logger.info(f"Uploading {file_path} to Backblaze B2 as {object_key}")
            
            with open(file_path, 'rb') as file_data:
                self.b2_client.upload_fileobj(
                    file_data,
                    settings.backblaze_b2_bucket,
                    object_key,
                    ExtraArgs={
                        'Metadata': s3_metadata,
                        'ServerSideEncryption': 'AES256'
                    }
                )
            
            # Return the object location
            location = f"s3://{settings.backblaze_b2_bucket}/{object_key}"
            logger.info(f"Successfully uploaded to Backblaze B2: {location}")
            return location
            
        except ClientError as e:
            error_code = e.response['Error']['Code']
            logger.error(f"Backblaze B2 upload failed ({error_code}): {e}")
            raise Exception(f"B2 upload failed: {error_code}")
        except Exception as e:
            logger.error(f"Backblaze B2 upload failed: {e}")
            raise
    
    def upload_to_r2(self, file_path: Path, object_key: str, metadata: Dict = None) -> str:
        """Upload file to Cloudflare R2"""
        if not self.r2_client:
            raise Exception("Cloudflare R2 client not initialized")
        
        try:
            # Prepare metadata
            s3_metadata = {}
            if metadata:
                for key, value in metadata.items():
                    s3_metadata[f"x-amz-meta-{key}"] = str(value)
            
            # Add standard metadata
            s3_metadata.update({
                "x-amz-meta-uploaded-at": datetime.now(timezone.utc).isoformat(),
                "x-amz-meta-service": "hesaabplus-backup",
                "x-amz-meta-file-size": str(file_path.stat().st_size)
            })
            
            # Upload file
            logger.info(f"Uploading {file_path} to Cloudflare R2 as {object_key}")
            
            with open(file_path, 'rb') as file_data:
                self.r2_client.upload_fileobj(
                    file_data,
                    settings.cloudflare_r2_bucket,
                    object_key,
                    ExtraArgs={
                        'Metadata': s3_metadata
                    }
                )
            
            # Return the object location
            location = f"s3://{settings.cloudflare_r2_bucket}/{object_key}"
            logger.info(f"Successfully uploaded to Cloudflare R2: {location}")
            return location
            
        except ClientError as e:
            error_code = e.response['Error']['Code']
            logger.error(f"Cloudflare R2 upload failed ({error_code}): {e}")
            raise Exception(f"R2 upload failed: {error_code}")
        except Exception as e:
            logger.error(f"Cloudflare R2 upload failed: {e}")
            raise
    
    def download_from_b2(self, object_key: str, local_path: Path) -> Path:
        """Download file from Backblaze B2"""
        if not self.b2_client:
            raise Exception("Backblaze B2 client not initialized")
        
        try:
            # Extract object key from S3 URL if needed
            if object_key.startswith("s3://"):
                object_key = object_key.split("/", 3)[-1]
            
            logger.info(f"Downloading {object_key} from Backblaze B2 to {local_path}")
            
            with open(local_path, 'wb') as file_data:
                self.b2_client.download_fileobj(
                    settings.backblaze_b2_bucket,
                    object_key,
                    file_data
                )
            
            logger.info(f"Successfully downloaded from Backblaze B2: {local_path}")
            return local_path
            
        except ClientError as e:
            error_code = e.response['Error']['Code']
            logger.error(f"Backblaze B2 download failed ({error_code}): {e}")
            raise Exception(f"B2 download failed: {error_code}")
        except Exception as e:
            logger.error(f"Backblaze B2 download failed: {e}")
            raise
    
    def download_from_r2(self, object_key: str, local_path: Path) -> Path:
        """Download file from Cloudflare R2"""
        if not self.r2_client:
            raise Exception("Cloudflare R2 client not initialized")
        
        try:
            # Extract object key from S3 URL if needed
            if object_key.startswith("s3://"):
                object_key = object_key.split("/", 3)[-1]
            
            logger.info(f"Downloading {object_key} from Cloudflare R2 to {local_path}")
            
            with open(local_path, 'wb') as file_data:
                self.r2_client.download_fileobj(
                    settings.cloudflare_r2_bucket,
                    object_key,
                    file_data
                )
            
            logger.info(f"Successfully downloaded from Cloudflare R2: {local_path}")
            return local_path
            
        except ClientError as e:
            error_code = e.response['Error']['Code']
            logger.error(f"Cloudflare R2 download failed ({error_code}): {e}")
            raise Exception(f"R2 download failed: {error_code}")
        except Exception as e:
            logger.error(f"Cloudflare R2 download failed: {e}")
            raise
    
    def list_b2_objects(self, prefix: str = "") -> list:
        """List objects in Backblaze B2 bucket"""
        if not self.b2_client:
            raise Exception("Backblaze B2 client not initialized")
        
        try:
            response = self.b2_client.list_objects_v2(
                Bucket=settings.backblaze_b2_bucket,
                Prefix=prefix
            )
            
            objects = []
            for obj in response.get('Contents', []):
                objects.append({
                    'key': obj['Key'],
                    'size': obj['Size'],
                    'last_modified': obj['LastModified'].isoformat(),
                    'etag': obj['ETag'].strip('"')
                })
            
            return objects
            
        except ClientError as e:
            logger.error(f"Failed to list B2 objects: {e}")
            raise
    
    def list_r2_objects(self, prefix: str = "") -> list:
        """List objects in Cloudflare R2 bucket"""
        if not self.r2_client:
            raise Exception("Cloudflare R2 client not initialized")
        
        try:
            response = self.r2_client.list_objects_v2(
                Bucket=settings.cloudflare_r2_bucket,
                Prefix=prefix
            )
            
            objects = []
            for obj in response.get('Contents', []):
                objects.append({
                    'key': obj['Key'],
                    'size': obj['Size'],
                    'last_modified': obj['LastModified'].isoformat(),
                    'etag': obj['ETag'].strip('"')
                })
            
            return objects
            
        except ClientError as e:
            logger.error(f"Failed to list R2 objects: {e}")
            raise
    
    def delete_from_b2(self, object_key: str) -> bool:
        """Delete object from Backblaze B2"""
        if not self.b2_client:
            raise Exception("Backblaze B2 client not initialized")
        
        try:
            # Extract object key from S3 URL if needed
            if object_key.startswith("s3://"):
                object_key = object_key.split("/", 3)[-1]
            
            self.b2_client.delete_object(
                Bucket=settings.backblaze_b2_bucket,
                Key=object_key
            )
            
            logger.info(f"Successfully deleted from Backblaze B2: {object_key}")
            return True
            
        except ClientError as e:
            logger.error(f"Failed to delete from B2: {e}")
            return False
    
    def delete_from_r2(self, object_key: str) -> bool:
        """Delete object from Cloudflare R2"""
        if not self.r2_client:
            raise Exception("Cloudflare R2 client not initialized")
        
        try:
            # Extract object key from S3 URL if needed
            if object_key.startswith("s3://"):
                object_key = object_key.split("/", 3)[-1]
            
            self.r2_client.delete_object(
                Bucket=settings.cloudflare_r2_bucket,
                Key=object_key
            )
            
            logger.info(f"Successfully deleted from Cloudflare R2: {object_key}")
            return True
            
        except ClientError as e:
            logger.error(f"Failed to delete from R2: {e}")
            return False
    
    def get_storage_usage(self) -> Dict:
        """Get storage usage statistics for both providers"""
        usage_stats = {
            "backblaze_b2": {"available": False, "object_count": 0, "total_size": 0},
            "cloudflare_r2": {"available": False, "object_count": 0, "total_size": 0}
        }
        
        # Get B2 usage
        if self.b2_client:
            try:
                b2_objects = self.list_b2_objects()
                usage_stats["backblaze_b2"] = {
                    "available": True,
                    "object_count": len(b2_objects),
                    "total_size": sum(obj["size"] for obj in b2_objects)
                }
            except Exception as e:
                logger.error(f"Failed to get B2 usage: {e}")
        
        # Get R2 usage
        if self.r2_client:
            try:
                r2_objects = self.list_r2_objects()
                usage_stats["cloudflare_r2"] = {
                    "available": True,
                    "object_count": len(r2_objects),
                    "total_size": sum(obj["size"] for obj in r2_objects)
                }
            except Exception as e:
                logger.error(f"Failed to get R2 usage: {e}")
        
        return usage_stats
    
    def test_connectivity(self) -> Dict:
        """Test connectivity to both storage providers"""
        results = {
            "backblaze_b2": {"available": False, "error": None, "response_time": None},
            "cloudflare_r2": {"available": False, "error": None, "response_time": None}
        }
        
        # Test B2 connectivity
        if self.b2_client:
            try:
                start_time = time.time()
                self.b2_client.head_bucket(Bucket=settings.backblaze_b2_bucket)
                response_time = time.time() - start_time
                results["backblaze_b2"]["available"] = True
                results["backblaze_b2"]["response_time"] = response_time
                self.health_status[StorageProvider.BACKBLAZE_B2] = StorageHealthStatus.HEALTHY
            except Exception as e:
                results["backblaze_b2"]["error"] = str(e)
                self.health_status[StorageProvider.BACKBLAZE_B2] = StorageHealthStatus.UNAVAILABLE
        else:
            results["backblaze_b2"]["error"] = "Client not initialized"
            self.health_status[StorageProvider.BACKBLAZE_B2] = StorageHealthStatus.UNAVAILABLE
        
        # Test R2 connectivity
        if self.r2_client:
            try:
                start_time = time.time()
                self.r2_client.head_bucket(Bucket=settings.cloudflare_r2_bucket)
                response_time = time.time() - start_time
                results["cloudflare_r2"]["available"] = True
                results["cloudflare_r2"]["response_time"] = response_time
                self.health_status[StorageProvider.CLOUDFLARE_R2] = StorageHealthStatus.HEALTHY
            except Exception as e:
                results["cloudflare_r2"]["error"] = str(e)
                self.health_status[StorageProvider.CLOUDFLARE_R2] = StorageHealthStatus.UNAVAILABLE
        else:
            results["cloudflare_r2"]["error"] = "Client not initialized"
            self.health_status[StorageProvider.CLOUDFLARE_R2] = StorageHealthStatus.UNAVAILABLE
        
        # Update last health check timestamp
        self.last_health_check = {
            StorageProvider.BACKBLAZE_B2: datetime.now(timezone.utc),
            StorageProvider.CLOUDFLARE_R2: datetime.now(timezone.utc)
        }
        
        return results
    
    def get_health_status(self) -> Dict:
        """Get detailed health status for both storage providers"""
        # Perform health check if not done recently (within 5 minutes)
        current_time = datetime.now(timezone.utc)
        should_check = False
        
        for provider in [StorageProvider.BACKBLAZE_B2, StorageProvider.CLOUDFLARE_R2]:
            last_check = self.last_health_check.get(provider)
            if not last_check or (current_time - last_check).total_seconds() > 300:
                should_check = True
                break
        
        if should_check:
            connectivity = self.test_connectivity()
        else:
            connectivity = self.test_connectivity()  # Always get fresh data for now
        
        return {
            "overall_status": self._get_overall_health_status(),
            "providers": {
                "backblaze_b2": {
                    "status": self.health_status[StorageProvider.BACKBLAZE_B2].value,
                    "available": connectivity["backblaze_b2"]["available"],
                    "error": connectivity["backblaze_b2"]["error"],
                    "response_time": connectivity["backblaze_b2"]["response_time"],
                    "last_check": self.last_health_check.get(StorageProvider.BACKBLAZE_B2),
                    "client_initialized": self.b2_client is not None
                },
                "cloudflare_r2": {
                    "status": self.health_status[StorageProvider.CLOUDFLARE_R2].value,
                    "available": connectivity["cloudflare_r2"]["available"],
                    "error": connectivity["cloudflare_r2"]["error"],
                    "response_time": connectivity["cloudflare_r2"]["response_time"],
                    "last_check": self.last_health_check.get(StorageProvider.CLOUDFLARE_R2),
                    "client_initialized": self.r2_client is not None
                }
            },
            "failover_strategy": self.failover_strategy.value
        }
    
    def _get_overall_health_status(self) -> str:
        """Determine overall health status based on individual provider status"""
        b2_status = self.health_status[StorageProvider.BACKBLAZE_B2]
        r2_status = self.health_status[StorageProvider.CLOUDFLARE_R2]
        
        if b2_status == StorageHealthStatus.HEALTHY and r2_status == StorageHealthStatus.HEALTHY:
            return "healthy"
        elif b2_status == StorageHealthStatus.HEALTHY or r2_status == StorageHealthStatus.HEALTHY:
            return "degraded"
        else:
            return "unavailable"
    
    def set_failover_strategy(self, strategy: StorageFailoverStrategy):
        """Set the failover strategy for storage operations"""
        self.failover_strategy = strategy
        logger.info(f"Failover strategy set to: {strategy.value}")
    
    def upload_with_failover(self, file_path: Path, object_key: str, metadata: Dict = None) -> Dict:
        """Upload file with automatic failover based on strategy"""
        results = {
            "success": False,
            "primary_upload": None,
            "secondary_upload": None,
            "errors": [],
            "strategy_used": self.failover_strategy.value
        }
        
        # Update cost tracking for operations
        self._track_operation_cost(StorageProvider.BACKBLAZE_B2, "upload")
        
        if self.failover_strategy == StorageFailoverStrategy.PRIMARY_ONLY:
            # Only upload to B2 (primary)
            try:
                location = self.upload_to_b2(file_path, object_key, metadata)
                results["primary_upload"] = location
                results["success"] = True
            except Exception as e:
                results["errors"].append(f"B2 upload failed: {str(e)}")
                
        elif self.failover_strategy == StorageFailoverStrategy.SECONDARY_FALLBACK:
            # Try B2 first, fallback to R2 if B2 fails
            try:
                location = self.upload_to_b2(file_path, object_key, metadata)
                results["primary_upload"] = location
                results["success"] = True
            except Exception as e:
                results["errors"].append(f"B2 upload failed: {str(e)}")
                logger.warning(f"B2 upload failed, attempting R2 fallback: {e}")
                
                try:
                    self._track_operation_cost(StorageProvider.CLOUDFLARE_R2, "upload")
                    location = self.upload_to_r2(file_path, object_key, metadata)
                    results["secondary_upload"] = location
                    results["success"] = True
                except Exception as r2_error:
                    results["errors"].append(f"R2 fallback failed: {str(r2_error)}")
                    
        elif self.failover_strategy == StorageFailoverStrategy.DUAL_UPLOAD:
            # Upload to both providers
            b2_success = False
            r2_success = False
            
            # Upload to B2
            try:
                location = self.upload_to_b2(file_path, object_key, metadata)
                results["primary_upload"] = location
                b2_success = True
            except Exception as e:
                results["errors"].append(f"B2 upload failed: {str(e)}")
            
            # Upload to R2
            try:
                self._track_operation_cost(StorageProvider.CLOUDFLARE_R2, "upload")
                location = self.upload_to_r2(file_path, object_key, metadata)
                results["secondary_upload"] = location
                r2_success = True
            except Exception as e:
                results["errors"].append(f"R2 upload failed: {str(e)}")
            
            results["success"] = b2_success or r2_success
        
        # Track storage usage
        if results["success"]:
            file_size_gb = file_path.stat().st_size / (1024 ** 3)
            if results["primary_upload"]:
                self._track_storage_cost(StorageProvider.BACKBLAZE_B2, file_size_gb)
            if results["secondary_upload"]:
                self._track_storage_cost(StorageProvider.CLOUDFLARE_R2, file_size_gb)
        
        return results
    
    def download_with_failover(self, object_key: str, local_path: Path, preferred_provider: StorageProvider = None) -> Dict:
        """Download file with automatic failover"""
        results = {
            "success": False,
            "provider_used": None,
            "local_path": None,
            "errors": []
        }
        
        # Determine download order based on preference and health
        providers_to_try = []
        
        if preferred_provider:
            providers_to_try.append(preferred_provider)
            # Add the other provider as fallback
            other_provider = (StorageProvider.CLOUDFLARE_R2 if preferred_provider == StorageProvider.BACKBLAZE_B2 
                            else StorageProvider.BACKBLAZE_B2)
            providers_to_try.append(other_provider)
        else:
            # Default order: B2 first, then R2
            providers_to_try = [StorageProvider.BACKBLAZE_B2, StorageProvider.CLOUDFLARE_R2]
        
        for provider in providers_to_try:
            try:
                if provider == StorageProvider.BACKBLAZE_B2 and self.b2_client:
                    self._track_operation_cost(provider, "download")
                    path = self.download_from_b2(object_key, local_path)
                    results["success"] = True
                    results["provider_used"] = provider.value
                    results["local_path"] = str(path)
                    
                    # Track bandwidth usage
                    file_size_gb = path.stat().st_size / (1024 ** 3)
                    self._track_bandwidth_cost(provider, file_size_gb)
                    break
                    
                elif provider == StorageProvider.CLOUDFLARE_R2 and self.r2_client:
                    self._track_operation_cost(provider, "download")
                    path = self.download_from_r2(object_key, local_path)
                    results["success"] = True
                    results["provider_used"] = provider.value
                    results["local_path"] = str(path)
                    
                    # Track bandwidth usage
                    file_size_gb = path.stat().st_size / (1024 ** 3)
                    self._track_bandwidth_cost(provider, file_size_gb)
                    break
                    
            except Exception as e:
                error_msg = f"{provider.value} download failed: {str(e)}"
                results["errors"].append(error_msg)
                logger.warning(error_msg)
        
        return results
    
    def _track_operation_cost(self, provider: StorageProvider, operation: str):
        """Track API operation costs"""
        if provider in self.cost_tracking:
            self.cost_tracking[provider]["operations"] += 1
    
    def _track_storage_cost(self, provider: StorageProvider, size_gb: float):
        """Track storage costs"""
        if provider in self.cost_tracking:
            self.cost_tracking[provider]["storage_gb"] += size_gb
    
    def _track_bandwidth_cost(self, provider: StorageProvider, size_gb: float):
        """Track bandwidth costs"""
        if provider in self.cost_tracking:
            self.cost_tracking[provider]["bandwidth_gb"] += size_gb
    
    def get_cost_analytics(self) -> Dict:
        """Get detailed cost analytics for both providers"""
        # Pricing information (approximate, as of 2024)
        pricing = {
            StorageProvider.BACKBLAZE_B2: {
                "storage_per_gb_month": 0.005,  # $0.005 per GB/month
                "download_per_gb": 0.01,        # $0.01 per GB
                "operations_per_1000": 0.004    # $0.004 per 1,000 operations
            },
            StorageProvider.CLOUDFLARE_R2: {
                "storage_per_gb_month": 0.015,  # $0.015 per GB/month
                "download_per_gb": 0.0,         # Free egress
                "operations_per_1000": 0.0036   # $0.36 per million operations
            }
        }
        
        analytics = {}
        total_estimated_cost = 0
        
        for provider, costs in self.cost_tracking.items():
            provider_pricing = pricing[provider]
            
            # Calculate estimated monthly costs
            storage_cost = costs["storage_gb"] * provider_pricing["storage_per_gb_month"]
            bandwidth_cost = costs["bandwidth_gb"] * provider_pricing["download_per_gb"]
            operations_cost = (costs["operations"] / 1000) * provider_pricing["operations_per_1000"]
            
            total_cost = storage_cost + bandwidth_cost + operations_cost
            total_estimated_cost += total_cost
            
            analytics[provider.value] = {
                "usage": {
                    "storage_gb": round(costs["storage_gb"], 3),
                    "bandwidth_gb": round(costs["bandwidth_gb"], 3),
                    "operations_count": costs["operations"]
                },
                "estimated_monthly_cost": {
                    "storage": round(storage_cost, 4),
                    "bandwidth": round(bandwidth_cost, 4),
                    "operations": round(operations_cost, 4),
                    "total": round(total_cost, 4)
                },
                "pricing_model": provider_pricing
            }
        
        analytics["summary"] = {
            "total_estimated_monthly_cost": round(total_estimated_cost, 4),
            "primary_provider": StorageProvider.BACKBLAZE_B2.value,
            "secondary_provider": StorageProvider.CLOUDFLARE_R2.value,
            "cost_optimization_notes": [
                "Cloudflare R2 offers free egress bandwidth",
                "Backblaze B2 has lower storage costs",
                "Consider data access patterns for cost optimization"
            ]
        }
        
        return analytics
    
    def reset_cost_tracking(self):
        """Reset cost tracking counters"""
        self.cost_tracking = {
            StorageProvider.BACKBLAZE_B2: {"operations": 0, "storage_gb": 0, "bandwidth_gb": 0},
            StorageProvider.CLOUDFLARE_R2: {"operations": 0, "storage_gb": 0, "bandwidth_gb": 0}
        }
        logger.info("Cost tracking counters reset")
    
    def get_storage_redundancy_status(self) -> Dict:
        """Get redundancy status across both providers"""
        b2_objects = []
        r2_objects = []
        
        try:
            if self.b2_client:
                b2_objects = self.list_b2_objects()
        except Exception as e:
            logger.error(f"Failed to list B2 objects for redundancy check: {e}")
        
        try:
            if self.r2_client:
                r2_objects = self.list_r2_objects()
        except Exception as e:
            logger.error(f"Failed to list R2 objects for redundancy check: {e}")
        
        # Create sets of object keys for comparison
        b2_keys = {obj["key"] for obj in b2_objects}
        r2_keys = {obj["key"] for obj in r2_objects}
        
        # Find objects that exist in both, only in B2, or only in R2
        redundant_objects = b2_keys.intersection(r2_keys)
        b2_only_objects = b2_keys - r2_keys
        r2_only_objects = r2_keys - b2_keys
        
        return {
            "total_objects": {
                "backblaze_b2": len(b2_objects),
                "cloudflare_r2": len(r2_objects)
            },
            "redundancy": {
                "fully_redundant": len(redundant_objects),
                "b2_only": len(b2_only_objects),
                "r2_only": len(r2_only_objects),
                "redundancy_percentage": (len(redundant_objects) / max(len(b2_keys), 1)) * 100
            },
            "objects": {
                "redundant": list(redundant_objects),
                "b2_only": list(b2_only_objects),
                "r2_only": list(r2_only_objects)
            },
            "recommendations": self._get_redundancy_recommendations(b2_only_objects, r2_only_objects)
        }
    
    def _get_redundancy_recommendations(self, b2_only: set, r2_only: set) -> List[str]:
        """Get recommendations for improving redundancy"""
        recommendations = []
        
        if b2_only:
            recommendations.append(f"Consider uploading {len(b2_only)} B2-only objects to R2 for redundancy")
        
        if r2_only:
            recommendations.append(f"Consider uploading {len(r2_only)} R2-only objects to B2 for redundancy")
        
        if not b2_only and not r2_only:
            recommendations.append("Excellent! All objects are fully redundant across both providers")
        
        return recommendations