# Backup and Restore System

## Overview

The HesaabPlus backup and restore system provides comprehensive tenant data backup and recovery capabilities with dual-cloud storage support and enterprise-grade security features.

## Features

### ✅ Completed Features

- **Individual Tenant Backups**: Create encrypted backups for specific tenants
- **Dual-Cloud Storage**: Primary (Backblaze B2) and secondary (Cloudflare R2) storage
- **Encryption & Compression**: AES encryption with tenant-specific keys and gzip compression
- **Integrity Validation**: SHA256 checksum verification for all backups
- **Flexible Restore**: Point-in-time restore with validation options
- **Backup Scheduling**: Automated daily backups via Celery tasks
- **Monitoring & Logging**: Comprehensive backup and restore activity tracking
- **Real-time Status**: Live backup/restore progress tracking

## Configuration

### Environment Variables

Add these to your `.env` file:

```bash
# Backblaze B2 Configuration
BACKBLAZE_B2_ACCESS_KEY=your_b2_access_key
BACKBLAZE_B2_SECRET_KEY=your_b2_secret_key
BACKBLAZE_B2_BUCKET=your_b2_bucket_name
B2_BUCKET_NAME=your_b2_bucket_name
B2_ENDPOINT_URL=https://s3.us-east-005.backblazeb2.com
B2_ACCESS_KEY_ID=your_b2_access_key
B2_SECRET_ACCESS_KEY=your_b2_secret_key

# Cloudflare R2 Configuration (Optional)
CLOUDFLARE_R2_ACCESS_KEY=your_r2_access_key
CLOUDFLARE_R2_SECRET_KEY=your_r2_secret_key
CLOUDFLARE_R2_BUCKET=your_r2_bucket_name
CLOUDFLARE_R2_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
```

## API Endpoints

### Backup Operations

#### Create Tenant Backup
```http
POST /api/backup/tenant/{tenant_id}
Authorization: Bearer {super_admin_token}
```

#### List Tenant Backups
```http
GET /api/backup/tenant/{tenant_id}
Authorization: Bearer {super_admin_token}
```

#### Get Backup Information
```http
GET /api/backup/info/{backup_id}
Authorization: Bearer {super_admin_token}
```

#### Verify Backup Integrity
```http
POST /api/backup/verify/{backup_id}?storage_provider=backblaze_b2
Authorization: Bearer {super_admin_token}
```

#### Get Storage Usage
```http
GET /api/backup/storage/usage
Authorization: Bearer {super_admin_token}
```

### Restore Operations

#### Validate Backup Integrity
```http
POST /api/restore/validate/{backup_id}?storage_provider=backblaze_b2
Authorization: Bearer {super_admin_token}
```

#### Restore Single Tenant
```http
POST /api/restore/tenant/{tenant_id}
Authorization: Bearer {super_admin_token}
Content-Type: application/json

{
  "backup_id": "backup-uuid",
  "storage_provider": "backblaze_b2",
  "skip_validation": false
}
```

#### Restore Multiple Tenants
```http
POST /api/restore/multiple
Authorization: Bearer {super_admin_token}
Content-Type: application/json

{
  "tenant_backup_pairs": [
    {"tenant_id": "tenant-1", "backup_id": "backup-1"},
    {"tenant_id": "tenant-2", "backup_id": "backup-2"}
  ],
  "storage_provider": "backblaze_b2",
  "skip_validation": false
}
```

#### Restore All Tenants
```http
POST /api/restore/all
Authorization: Bearer {super_admin_token}
Content-Type: application/json

{
  "storage_provider": "backblaze_b2",
  "backup_date": "2024-01-01T00:00:00Z",
  "skip_validation": false
}
```

#### Get Available Restore Points
```http
GET /api/restore/points/{tenant_id}?storage_provider=backblaze_b2
Authorization: Bearer {super_admin_token}
```

#### Get Restore History
```http
GET /api/restore/history?tenant_id={tenant_id}
Authorization: Bearer {super_admin_token}
```

#### Get Restore Information
```http
GET /api/restore/info/{restore_id}
Authorization: Bearer {super_admin_token}
```

## Testing

### Run All Tests

```bash
# Run backup tests
docker-compose exec backend python -m pytest tests/test_backup_system.py -v

# Run restore tests  
docker-compose exec backend python -m pytest tests/test_restore_system.py -v

# Run real B2 integration tests
docker-compose exec backend python -m pytest tests/test_restore_real_b2.py -v
```

### Test B2 Connectivity

```bash
# Test B2 connection
docker-compose exec backend python test_b2_connection.py

# Test B2 operations (upload/download/delete)
docker-compose exec backend python test_b2_comprehensive.py

# Test B2 deletion functionality
docker-compose exec backend python test_b2_delete.py
```

### Run Restore Tests with Real B2

```bash
# Run complete restore test suite with real B2 integration
docker-compose exec backend python run_restore_tests_with_b2.py
```

## Architecture

### Components

1. **BackupService** (`app/services/backup_service.py`)
   - Handles backup creation, encryption, and compression
   - Manages SQL dump generation and file operations

2. **RestoreService** (`app/services/restore_service.py`)
   - Handles backup validation and restore operations
   - Manages download, decryption, and decompression

3. **CloudStorageService** (`app/services/cloud_storage_service.py`)
   - Manages dual-cloud storage operations
   - Handles B2 and R2 upload/download/delete operations

4. **Backup Tasks** (`app/tasks/backup_tasks.py`)
   - Celery tasks for automated backup operations
   - Scheduled daily backups and integrity verification

5. **Restore Tasks** (`app/tasks/restore_tasks.py`)
   - Celery tasks for restore operations
   - Async restore processing with progress tracking

### Database Models

- **BackupLog**: Tracks backup operations and metadata
- **RestoreLog**: Tracks restore operations and history
- **Tenant**: Multi-tenant isolation and management

### Security Features

- **Tenant-Specific Encryption**: Each tenant has unique encryption keys
- **Checksum Validation**: SHA256 integrity verification
- **Secure Storage**: Encrypted files in cloud storage
- **Access Control**: Super admin only access to backup/restore operations

## Monitoring

### Backup Monitoring

- Real-time backup status tracking
- Storage usage monitoring across providers
- Backup success/failure rates
- Performance metrics and timing

### Restore Monitoring

- Restore operation progress tracking
- Pre-restore snapshot creation
- Restore history and audit trails
- Error tracking and recovery

## Production Deployment

### Prerequisites

1. **Backblaze B2 Account**: Set up B2 bucket and API keys
2. **Cloudflare R2 Account** (Optional): Set up R2 bucket for redundancy
3. **PostgreSQL Database**: Production database with proper backups
4. **Redis Instance**: For Celery task queue
5. **Celery Workers**: For background task processing

### Deployment Steps

1. Configure environment variables in production
2. Set up automated backup schedules
3. Configure monitoring and alerting
4. Test backup and restore procedures
5. Implement disaster recovery procedures

### Best Practices

- **Regular Testing**: Test restore procedures monthly
- **Multiple Storage Locations**: Use both B2 and R2 for redundancy
- **Monitoring**: Set up alerts for backup failures
- **Documentation**: Maintain disaster recovery runbooks
- **Security**: Rotate encryption keys periodically

## Troubleshooting

### Common Issues

1. **B2 Connection Failures**
   - Check API credentials and bucket permissions
   - Verify network connectivity to B2 endpoints

2. **Backup Failures**
   - Check disk space for temporary files
   - Verify database connectivity and permissions

3. **Restore Failures**
   - Validate backup integrity before restore
   - Check target database permissions

### Logs and Debugging

- Check application logs: `docker-compose logs backend`
- Check Celery logs: `docker-compose logs celery`
- Monitor backup/restore status via API endpoints

## Support

For issues or questions:
1. Check the logs for error messages
2. Verify configuration and credentials
3. Test connectivity with provided test scripts
4. Review API documentation for proper usage