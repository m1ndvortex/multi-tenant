# Comprehensive Backup and Recovery System Design

## Overview

This design document outlines the comprehensive backup and recovery system for HesaabPlus, featuring three distinct backup types: Individual Tenant Backup, Customer Self-Backup, and Disaster Recovery. The system implements dual-cloud storage with Backblaze B2 as primary and Cloudflare R2 as secondary storage for maximum data protection and redundancy.

## Architecture

### System Components

```
Backup System Architecture
├── Backup Services
│   ├── TenantBackupService (Individual tenant SQL dumps)
│   ├── CustomerBackupService (Local-only customer backups)
│   ├── DisasterRecoveryService (Full platform backups)
│   └── CloudStorageService (Dual-cloud management)
├── Storage Providers
│   ├── Backblaze B2 (Primary - securesyntax bucket)
│   └── Cloudflare R2 (Secondary - redundancy)
├── Backup Types
│   ├── Individual Tenant Backup (Admin-controlled)
│   ├── Customer Self-Backup (Local download only)
│   └── Disaster Recovery (Full platform)
├── Security & Verification
│   ├── AES-256 Encryption
│   ├── Backup Integrity Verification
│   └── Secure Restore Workflows
└── Management Interfaces
    ├── Super Admin Dashboard
    └── Tenant Application Interface
```

## Backup Types

### 1. Individual Tenant Backup (Admin-Controlled)

**Purpose:** Allow platform administrators to backup and restore specific tenant data with flexible restore options.

**Process:**
- Automated daily Celery task iterates through all active tenants
- Creates logical SQL export for each tenant using `pg_dump` with tenant_id filtering
- Encrypts backup using AES-256 encryption with tenant-specific keys
- Compresses encrypted backup using gzip compression
- Uploads to both Backblaze B2 (primary) and Cloudflare R2 (secondary)
- Stores backup metadata in database with integrity checksums

**Restore Options:**
- Individual tenant restore (select specific tenant)
- Multiple tenant restore (select multiple tenants)
- All tenant restore (restore all tenants from backup point)
- Storage provider selection (restore from B2 or R2)

**Storage Location:** Dual-cloud (Backblaze B2 + Cloudflare R2)
**Retention:** Configurable (default: 30 days)
**Access:** Super Admin only

### 2. Customer Self-Backup (Local Only)

**Purpose:** Allow customers to backup their own business data for local storage and peace of mind.

**Process:**
- Customer initiates backup through Tenant Application interface
- System enforces daily limit (once per day per tenant)
- Creates comprehensive SQL export of all tenant business data
- Generates compressed archive with all related records
- Provides secure download link for local storage
- Automatically cleans up temporary files after download

**Limitations:**
- Once daily per tenant
- Local download only (no cloud storage)
- Temporary file cleanup after 24 hours
- Tenant data only (no platform configuration)

**Storage Location:** Local download only
**Retention:** 24 hours for download link
**Access:** Tenant users only

### 3. Disaster Recovery (Full Platform)

**Purpose:** Enable complete platform restoration in case of catastrophic failure.

**Process:**
- Nightly automated full PostgreSQL database backup using `pg_dump`
- Container configuration backup (docker-compose.yml, environment files)
- Application source code reference (Git commit hash)
- Encrypts full backup using platform-level encryption keys
- Uploads to both Backblaze B2 and Cloudflare R2 with verification
- Stores backup metadata with integrity verification

**Restore Process:**
- Deploy fresh infrastructure using backed-up configuration
- Restore full database from encrypted backup
- Verify data integrity and system functionality
- Update DNS and routing to new infrastructure

**Storage Location:** Dual-cloud (Backblaze B2 + Cloudflare R2)
**Retention:** Configurable (default: 90 days)
**Access:** Super Admin only

## Cloud Storage Configuration

### Backblaze B2 (Primary Storage)

```python
# Configuration
B2_BUCKET_NAME = "securesyntax"
B2_ENDPOINT_URL = "https://s3.us-east-005.backblaze2.com"
B2_ACCESS_KEY_ID = "005acba9882c2b80000000001"
B2_SECRET_ACCESS_KEY = "K005LzPhrovqG5Eq37oYWxIQiIKIHh8"
```

**Features:**
- Primary storage for all backup types
- Cost-effective long-term storage
- High durability and availability
- S3-compatible API for easy integration

### Cloudflare R2 (Secondary Storage)

```python
# Configuration (to be provided)
R2_BUCKET_NAME = "hesaabplus-backups"
R2_ENDPOINT_URL = "https://[account-id].r2.cloudflarestorage.com"
R2_ACCESS_KEY_ID = "[to-be-provided]"
R2_SECRET_ACCESS_KEY = "[to-be-provided]"
```

**Features:**
- Secondary redundancy storage
- Zero egress fees for restore operations
- Global edge network for fast access
- Automatic failover capability

## Security Implementation

### Encryption Strategy

**Tenant Backups:**
- AES-256 encryption with tenant-specific keys
- Key derivation using tenant_id and platform secret
- Encrypted before cloud upload
- Decryption only during restore operations

**Disaster Recovery:**
- AES-256 encryption with platform master key
- Separate encryption for database and configuration
- Key rotation capability for enhanced security
- Secure key storage using environment variables

### Access Control

**Super Admin Access:**
- Full access to all backup operations
- Tenant backup/restore management
- Disaster recovery operations
- Storage provider configuration

**Tenant User Access:**
- Customer self-backup only
- Daily limit enforcement
- Local download only
- No cloud storage access

## Data Models

### BackupRecord Model

```python
class BackupRecord(Base):
    __tablename__ = "backup_records"
    
    id = Column(UUID, primary_key=True, default=uuid4)
    backup_type = Column(Enum(BackupType))  # TENANT, CUSTOMER, DISASTER
    tenant_id = Column(UUID, nullable=True)  # NULL for disaster recovery
    filename = Column(String, nullable=False)
    file_size = Column(BigInteger, nullable=False)
    checksum = Column(String, nullable=False)
    encryption_key_id = Column(String, nullable=False)
    
    # Storage locations
    b2_location = Column(String, nullable=True)
    r2_location = Column(String, nullable=True)
    local_path = Column(String, nullable=True)  # For customer backups
    
    # Status and verification
    status = Column(Enum(BackupStatus))
    verification_status = Column(Enum(VerificationStatus))
    error_message = Column(Text, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)
    verified_at = Column(DateTime, nullable=True)
    
    # Metadata
    metadata = Column(JSON, nullable=True)
```

### RestoreOperation Model

```python
class RestoreOperation(Base):
    __tablename__ = "restore_operations"
    
    id = Column(UUID, primary_key=True, default=uuid4)
    backup_record_id = Column(UUID, ForeignKey("backup_records.id"))
    restore_type = Column(Enum(RestoreType))  # INDIVIDUAL, MULTIPLE, FULL
    target_tenants = Column(JSON, nullable=True)  # List of tenant IDs
    storage_provider = Column(Enum(StorageProvider))  # B2, R2
    
    # Operation details
    status = Column(Enum(RestoreStatus))
    progress_percentage = Column(Integer, default=0)
    error_message = Column(Text, nullable=True)
    
    # Audit trail
    initiated_by = Column(UUID, ForeignKey("users.id"))
    initiated_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    
    # Rollback information
    rollback_available = Column(Boolean, default=False)
    rollback_data = Column(JSON, nullable=True)
```

## API Endpoints

### Super Admin Backup Management

```python
# Tenant backup management
POST /api/super-admin/backups/tenant/{tenant_id}  # Create tenant backup
GET /api/super-admin/backups/tenant/{tenant_id}   # List tenant backups
POST /api/super-admin/restore/tenant              # Restore tenant(s)

# Disaster recovery
POST /api/super-admin/backups/disaster            # Create disaster backup
GET /api/super-admin/backups/disaster             # List disaster backups
POST /api/super-admin/restore/disaster            # Restore full platform

# Storage management
GET /api/super-admin/storage/status               # Storage usage analytics
GET /api/super-admin/storage/verification         # Backup verification status
POST /api/super-admin/storage/verify              # Trigger verification
```

### Customer Self-Backup

```python
# Customer backup operations
POST /api/tenant/backup/create                    # Create customer backup
GET /api/tenant/backup/status                     # Check backup status
GET /api/tenant/backup/download/{backup_id}       # Download backup file
GET /api/tenant/backup/history                    # Backup history
```

## Frontend Interfaces

### Super Admin Dashboard

**Tenant Backup Management:**
- Tenant selection interface with search and filtering
- Backup creation with progress tracking
- Restore options: individual, multiple, or all tenants
- Storage provider selection for restore operations
- Backup verification status and integrity checking

**Disaster Recovery Dashboard:**
- Full platform backup status and scheduling
- Disaster recovery restore interface with confirmation workflows
- Storage redundancy status across B2 and R2
- Backup integrity monitoring and alerts

**Storage Analytics:**
- Usage analytics for both Backblaze B2 and Cloudflare R2
- Cost monitoring and projection
- Storage performance metrics
- Backup retention policy management

### Tenant Application Interface

**Customer Self-Backup:**
- Simple backup creation interface
- Daily limit status indicator
- Backup progress tracking
- Download management with secure links
- Backup history with download status

## Monitoring and Alerting

### Backup Monitoring

**Success Metrics:**
- Backup completion rates
- Upload success to both storage providers
- Backup verification success rates
- Storage provider availability

**Failure Alerts:**
- Backup creation failures
- Cloud storage upload failures
- Backup verification failures
- Storage provider connectivity issues

### Performance Monitoring

**Backup Performance:**
- Backup creation time by tenant size
- Upload speed to storage providers
- Compression efficiency metrics
- Encryption/decryption performance

**Storage Performance:**
- Storage provider response times
- Upload/download throughput
- Storage cost per GB trends
- Retention policy effectiveness

## Error Handling and Recovery

### Backup Failures

**Creation Failures:**
- Automatic retry with exponential backoff
- Fallback to smaller batch sizes for large tenants
- Error logging with detailed diagnostics
- Admin notification for persistent failures

**Upload Failures:**
- Retry failed uploads to both storage providers
- Fallback to single provider if one fails
- Local backup retention until successful upload
- Manual retry interface for administrators

### Restore Failures

**Validation Failures:**
- Pre-restore backup integrity verification
- Rollback capability for failed restores
- Transaction-safe restore operations
- Detailed error reporting and diagnostics

**Recovery Procedures:**
- Automated rollback for failed restores
- Manual intervention workflows
- Data consistency verification
- Audit trail for all operations

## Testing Strategy

### Unit Testing

**Backup Services:**
- Tenant data export accuracy
- Encryption/decryption functionality
- Cloud storage upload/download
- Backup verification algorithms

**Restore Services:**
- Individual tenant restore accuracy
- Multiple tenant restore coordination
- Disaster recovery procedures
- Rollback functionality

### Integration Testing

**End-to-End Workflows:**
- Complete backup creation and upload
- Full restore procedures with verification
- Cross-storage provider operations
- Customer self-backup workflows

**Performance Testing:**
- Large dataset backup performance
- Concurrent backup operations
- Storage provider failover scenarios
- Network interruption recovery

### Security Testing

**Encryption Validation:**
- Backup encryption strength
- Key management security
- Access control enforcement
- Data isolation verification

**Penetration Testing:**
- Backup file access attempts
- Storage provider security
- API endpoint security
- Authentication bypass attempts

## Deployment and Configuration

### Environment Variables

```bash
# Backblaze B2 Configuration
B2_BUCKET_NAME=securesyntax
B2_ENDPOINT_URL=https://s3.us-east-005.backblaze2.com
B2_ACCESS_KEY_ID=005acba9882c2b80000000001
B2_SECRET_ACCESS_KEY=K005LzPhrovqG5Eq37oYWxIQiIKIHh8

# Cloudflare R2 Configuration (to be provided)
R2_BUCKET_NAME=hesaabplus-backups
R2_ENDPOINT_URL=[to-be-provided]
R2_ACCESS_KEY_ID=[to-be-provided]
R2_SECRET_ACCESS_KEY=[to-be-provided]

# Backup Configuration
BACKUP_ENCRYPTION_KEY=[platform-secret]
BACKUP_RETENTION_DAYS=30
DISASTER_BACKUP_RETENTION_DAYS=90
CUSTOMER_BACKUP_DAILY_LIMIT=1
```

### Docker Configuration

```yaml
# Additional volumes for backup storage
volumes:
  backup_temp:
    driver: local
  backup_logs:
    driver: local

# Backup service configuration
services:
  backup-worker:
    build: ./backend
    command: celery -A app.celery worker -Q backup_queue
    volumes:
      - backup_temp:/tmp/backups
      - backup_logs:/var/log/backups
    environment:
      - CELERY_BROKER_URL=redis://redis:6379/0
      - DATABASE_URL=postgresql://hesaab:${POSTGRES_PASSWORD}@postgres:5432/hesaabplus
```

This comprehensive backup system ensures maximum data protection, flexible restore options, and robust disaster recovery capabilities while maintaining security and performance standards.