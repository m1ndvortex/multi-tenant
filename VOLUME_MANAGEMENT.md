# Docker Volume Management Guide

## Persistent Volumes Added

Your HesaabPlus application now has comprehensive persistent storage for all data. Here are all the volumes that have been configured:

### Database & Cache Volumes
- **`postgres_data`**: PostgreSQL database files - Contains all your database tables, user data, tenant data, etc.
- **`redis_data`**: Redis cache and session data - Contains cached data, sessions, and Celery broker data

### Backend Application Volumes  
- **`backend_uploads`**: User uploaded files - Documents, images, invoices, etc.
- **`backend_logs`**: Application log files - Error logs, access logs, debug information
- **`backend_cache`**: Backend application cache - Python cache, temporary files

### Celery (Background Tasks) Volumes
- **`celery_data`**: Celery worker persistent data - Task results, worker state
- **`celery_beat_data`**: Celery beat scheduler data - Scheduled task information, periodic task state

### Super Admin Frontend Volumes
- **`super_admin_node_modules`**: Node.js dependencies - npm packages for development
- **`super_admin_dist`**: Built application files - Production build files
- **`super_admin_cache`**: Build cache - Vite build cache, faster rebuilds

### Tenant Frontend Volumes  
- **`tenant_node_modules`**: Node.js dependencies - npm packages for development
- **`tenant_dist`**: Built application files - Production build files
- **`tenant_cache`**: Build cache - Vite build cache, faster rebuilds

## What This Means for You

✅ **Data Persistence**: All your data will survive container restarts, rebuilds, and even host reboots
✅ **Development Speed**: Node modules and build caches are preserved, so rebuilds are much faster
✅ **Production Ready**: File uploads, logs, and database data are safely stored
✅ **Zero Data Loss**: You can safely run `docker compose down` and `docker compose up` without losing data

## Useful Commands

### View all volumes
```powershell
docker volume ls | findstr python-management
```

### Inspect a specific volume
```powershell
docker volume inspect python-management_postgres_data
```

### Backup a volume (example: database)
```powershell
docker run --rm -v python-management_postgres_data:/data -v ${PWD}:/backup alpine tar czf /backup/postgres_backup.tar.gz -C /data .
```

### Restore a volume (example: database)
```powershell
docker run --rm -v python-management_postgres_data:/data -v ${PWD}:/backup alpine tar xzf /backup/postgres_backup.tar.gz -C /data
```

### Remove all volumes (⚠️ DANGER - This will delete all data!)
```powershell
docker compose down -v
```

### View volume usage
```powershell
docker system df -v
```

## Volume Locations on Host

Docker volumes are typically stored in:
- **Windows**: `C:\ProgramData\docker\volumes\`
- **WSL2**: `/var/lib/docker/volumes/`

## Best Practices

1. **Regular Backups**: Backup your volumes regularly, especially `postgres_data` and `backend_uploads`
2. **Monitor Disk Space**: Keep an eye on volume sizes as they grow with usage
3. **Clean Old Volumes**: Periodically clean up unused volumes with `docker volume prune`
4. **Environment Separation**: Use different volume names for different environments (dev, staging, prod)

## Migration Guide

If you need to move data to a new environment:

1. **Export data**:
   ```powershell
   docker exec hesaabplus_postgres pg_dump -U hesaab hesaabplus > backup.sql
   ```

2. **Copy upload files**:
   ```powershell
   docker cp hesaabplus_backend:/app/uploads ./uploads_backup
   ```

3. **Import in new environment**:
   ```powershell
   docker exec -i hesaabplus_postgres psql -U hesaab hesaabplus < backup.sql
   docker cp ./uploads_backup hesaabplus_backend:/app/uploads
   ```

## Troubleshooting

### Volume Permission Issues
If you encounter permission issues:
```powershell
docker exec -it hesaabplus_backend chown -R app:app /app/uploads /app/logs
```

### Volume Space Issues  
If volumes are taking too much space:
```powershell
# Clean unused volumes
docker volume prune

# View volume sizes
docker system df -v
```

### Reset Everything (⚠️ DANGER)
To start completely fresh (will delete all data):
```powershell
docker compose down -v
docker volume prune -f
docker compose up -d
```
