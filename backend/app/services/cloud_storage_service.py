"""
Cloud storage service for dual-cloud backup storage
Supports Backblaze B2 (primary) and Cloudflare R2 (secondary)
"""

import boto3
from botocore.exceptions import ClientError, NoCredentialsError
from pathlib import Path
from typing import Dict, Optional
import logging
from datetime import datetime, timezone

from app.core.config import settings

logger = logging.getLogger(__name__)


class CloudStorageService:
    """Service for managing dual-cloud storage operations"""
    
    def __init__(self):
        self.b2_client = None
        self.r2_client = None
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
                logger.info("Backblaze B2 client initialized successfully")
            except Exception as e:
                logger.error(f"Failed to initialize Backblaze B2 client: {e}")
        else:
            logger.warning("Backblaze B2 credentials not configured")
        
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
            "backblaze_b2": {"available": False, "error": None},
            "cloudflare_r2": {"available": False, "error": None}
        }
        
        # Test B2 connectivity
        if self.b2_client:
            try:
                self.b2_client.head_bucket(Bucket=settings.backblaze_b2_bucket)
                results["backblaze_b2"]["available"] = True
            except Exception as e:
                results["backblaze_b2"]["error"] = str(e)
        else:
            results["backblaze_b2"]["error"] = "Client not initialized"
        
        # Test R2 connectivity
        if self.r2_client:
            try:
                self.r2_client.head_bucket(Bucket=settings.cloudflare_r2_bucket)
                results["cloudflare_r2"]["available"] = True
            except Exception as e:
                results["cloudflare_r2"]["error"] = str(e)
        else:
            results["cloudflare_r2"]["error"] = "Client not initialized"
        
        return results