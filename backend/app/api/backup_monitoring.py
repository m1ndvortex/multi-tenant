"""
Backup Monitoring API endpoints for real-time backup system monitoring
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Dict, Any, List, Optional
import logging
from datetime import datetime, timedelta

from app.core.database import get_db
from app.core.auth import get_super_admin_user
from app.services.backup_service import BackupService
from app.services.cloud_storage_service import CloudStorageService
from app.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/backup/monitoring", tags=["Backup Monitoring"])


@router.get("/status")
async def get_backup_monitoring_status(
    current_admin: User = Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    """Get overall backup system monitoring status"""
    try:
        backup_service = BackupService(db)
        cloud_storage = CloudStorageService()
        
        # Get recent backup statistics
        last_24h = datetime.utcnow() - timedelta(hours=24)
        recent_backups = backup_service.get_backups_since(last_24h)
        
        # Calculate success/failure rates
        total_backups = len(recent_backups)
        successful_backups = len([b for b in recent_backups if b.get("status") == "completed"])
        failed_backups = len([b for b in recent_backups if b.get("status") == "failed"])
        in_progress_backups = len([b for b in recent_backups if b.get("status") == "in_progress"])
        
        success_rate = (successful_backups / total_backups * 100) if total_backups > 0 else 100
        
        # Get storage connectivity
        connectivity = cloud_storage.test_connectivity()
        
        # Get storage usage
        storage_usage = cloud_storage.get_storage_usage()
        
        # Calculate total storage used
        total_storage_used = sum(
            provider_usage.get("total_size", 0) 
            for provider_usage in storage_usage.values()
        )
        
        # Get system health indicators
        system_status = "healthy"
        if failed_backups > successful_backups:
            system_status = "degraded"
        elif not connectivity.get("backblaze_b2", {}).get("available", False) and \
             not connectivity.get("cloudflare_r2", {}).get("available", False):
            system_status = "critical"
        elif failed_backups > 0:
            system_status = "warning"
        
        return {
            "status": "success",
            "monitoring_data": {
                "system_status": system_status,
                "last_updated": datetime.utcnow().isoformat(),
                "backup_statistics": {
                    "total_backups_24h": total_backups,
                    "successful_backups": successful_backups,
                    "failed_backups": failed_backups,
                    "in_progress_backups": in_progress_backups,
                    "success_rate_percent": round(success_rate, 2)
                },
                "storage_status": {
                    "total_storage_used_bytes": total_storage_used,
                    "total_storage_used_gb": round(total_storage_used / (1024**3), 2),
                    "providers": {
                        "backblaze_b2": {
                            "available": connectivity.get("backblaze_b2", {}).get("available", False),
                            "object_count": storage_usage.get("backblaze_b2", {}).get("object_count", 0),
                            "storage_used_gb": round(storage_usage.get("backblaze_b2", {}).get("total_size", 0) / (1024**3), 2)
                        },
                        "cloudflare_r2": {
                            "available": connectivity.get("cloudflare_r2", {}).get("available", False),
                            "object_count": storage_usage.get("cloudflare_r2", {}).get("object_count", 0),
                            "storage_used_gb": round(storage_usage.get("cloudflare_r2", {}).get("total_size", 0) / (1024**3), 2)
                        }
                    }
                },
                "alerts": _get_backup_alerts(recent_backups, connectivity, storage_usage)
            }
        }
        
    except Exception as e:
        logger.error(f"Failed to get backup monitoring status: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve backup monitoring status")


@router.get("/health-metrics")
async def get_backup_health_metrics(
    current_admin: User = Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    """Get detailed backup system health metrics"""
    try:
        backup_service = BackupService(db)
        cloud_storage = CloudStorageService()
        
        # Get metrics for different time periods
        now = datetime.utcnow()
        last_hour = now - timedelta(hours=1)
        last_24h = now - timedelta(hours=24)
        last_7d = now - timedelta(days=7)
        last_30d = now - timedelta(days=30)
        
        # Get backup counts for different periods
        metrics = {
            "last_hour": {
                "total": len(backup_service.get_backups_since(last_hour)),
                "successful": len([b for b in backup_service.get_backups_since(last_hour) if b.get("status") == "completed"]),
                "failed": len([b for b in backup_service.get_backups_since(last_hour) if b.get("status") == "failed"])
            },
            "last_24h": {
                "total": len(backup_service.get_backups_since(last_24h)),
                "successful": len([b for b in backup_service.get_backups_since(last_24h) if b.get("status") == "completed"]),
                "failed": len([b for b in backup_service.get_backups_since(last_24h) if b.get("status") == "failed"])
            },
            "last_7d": {
                "total": len(backup_service.get_backups_since(last_7d)),
                "successful": len([b for b in backup_service.get_backups_since(last_7d) if b.get("status") == "completed"]),
                "failed": len([b for b in backup_service.get_backups_since(last_7d) if b.get("status") == "failed"])
            },
            "last_30d": {
                "total": len(backup_service.get_backups_since(last_30d)),
                "successful": len([b for b in backup_service.get_backups_since(last_30d) if b.get("status") == "completed"]),
                "failed": len([b for b in backup_service.get_backups_since(last_30d) if b.get("status") == "failed"])
            }
        }
        
        # Calculate success rates
        for period in metrics:
            total = metrics[period]["total"]
            successful = metrics[period]["successful"]
            metrics[period]["success_rate"] = (successful / total * 100) if total > 0 else 100
        
        # Get storage health
        storage_health = cloud_storage.get_health_status()
        
        # Get average backup duration
        recent_completed_backups = [
            b for b in backup_service.get_backups_since(last_7d) 
            if b.get("status") == "completed" and b.get("duration_seconds")
        ]
        
        avg_duration = 0
        if recent_completed_backups:
            avg_duration = sum(b.get("duration_seconds", 0) for b in recent_completed_backups) / len(recent_completed_backups)
        
        return {
            "status": "success",
            "health_metrics": {
                "backup_performance": metrics,
                "storage_health": storage_health,
                "average_backup_duration_seconds": round(avg_duration, 2),
                "average_backup_duration_minutes": round(avg_duration / 60, 2),
                "last_successful_backup": _get_last_successful_backup(backup_service),
                "next_scheduled_backup": _get_next_scheduled_backup(),
                "system_recommendations": _get_system_recommendations(metrics, storage_health)
            }
        }
        
    except Exception as e:
        logger.error(f"Failed to get backup health metrics: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve backup health metrics")


@router.get("/trends")
async def get_backup_trends(
    days: int = Query(default=7, ge=1, le=90, description="Number of days for trend analysis"),
    current_admin: User = Depends(get_super_admin_user),
    db: Session = Depends(get_db)
):
    """Get backup trends and analytics over time"""
    try:
        backup_service = BackupService(db)
        
        # Get backup data for the specified period
        start_date = datetime.utcnow() - timedelta(days=days)
        backups = backup_service.get_backups_since(start_date)
        
        # Group backups by day
        daily_stats = {}
        for backup in backups:
            backup_date = backup.get("created_at", "")
            if isinstance(backup_date, str):
                try:
                    backup_datetime = datetime.fromisoformat(backup_date.replace('Z', '+00:00'))
                    day_key = backup_datetime.date().isoformat()
                except:
                    continue
            else:
                day_key = backup_date.date().isoformat()
            
            if day_key not in daily_stats:
                daily_stats[day_key] = {
                    "date": day_key,
                    "total": 0,
                    "successful": 0,
                    "failed": 0,
                    "total_size": 0,
                    "avg_duration": 0,
                    "durations": []
                }
            
            daily_stats[day_key]["total"] += 1
            
            if backup.get("status") == "completed":
                daily_stats[day_key]["successful"] += 1
                daily_stats[day_key]["total_size"] += backup.get("compressed_size", 0)
                
                if backup.get("duration_seconds"):
                    daily_stats[day_key]["durations"].append(backup.get("duration_seconds"))
            elif backup.get("status") == "failed":
                daily_stats[day_key]["failed"] += 1
        
        # Calculate averages and success rates
        trend_data = []
        for day_key in sorted(daily_stats.keys()):
            stats = daily_stats[day_key]
            
            # Calculate average duration
            if stats["durations"]:
                stats["avg_duration"] = sum(stats["durations"]) / len(stats["durations"])
            
            # Calculate success rate
            success_rate = (stats["successful"] / stats["total"] * 100) if stats["total"] > 0 else 100
            
            trend_data.append({
                "date": stats["date"],
                "total_backups": stats["total"],
                "successful_backups": stats["successful"],
                "failed_backups": stats["failed"],
                "success_rate_percent": round(success_rate, 2),
                "total_size_gb": round(stats["total_size"] / (1024**3), 2),
                "avg_duration_minutes": round(stats["avg_duration"] / 60, 2)
            })
        
        # Calculate overall trends
        if len(trend_data) >= 2:
            first_week = trend_data[:7] if len(trend_data) >= 7 else trend_data[:len(trend_data)//2]
            last_week = trend_data[-7:] if len(trend_data) >= 7 else trend_data[len(trend_data)//2:]
            
            first_week_avg = sum(d["success_rate_percent"] for d in first_week) / len(first_week)
            last_week_avg = sum(d["success_rate_percent"] for d in last_week) / len(last_week)
            
            trend_direction = "improving" if last_week_avg > first_week_avg else "declining" if last_week_avg < first_week_avg else "stable"
        else:
            trend_direction = "insufficient_data"
        
        return {
            "status": "success",
            "trends": {
                "period_days": days,
                "trend_data": trend_data,
                "summary": {
                    "total_backups": sum(d["total_backups"] for d in trend_data),
                    "total_successful": sum(d["successful_backups"] for d in trend_data),
                    "total_failed": sum(d["failed_backups"] for d in trend_data),
                    "overall_success_rate": round(
                        sum(d["successful_backups"] for d in trend_data) / 
                        sum(d["total_backups"] for d in trend_data) * 100, 2
                    ) if sum(d["total_backups"] for d in trend_data) > 0 else 100,
                    "total_data_backed_up_gb": round(sum(d["total_size_gb"] for d in trend_data), 2),
                    "trend_direction": trend_direction
                }
            }
        }
        
    except Exception as e:
        logger.error(f"Failed to get backup trends: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve backup trends")


# Helper functions

def _get_backup_alerts(recent_backups: List[Dict], connectivity: Dict, storage_usage: Dict) -> List[Dict]:
    """Generate backup system alerts"""
    alerts = []
    
    # Check for failed backups
    failed_backups = [b for b in recent_backups if b.get("status") == "failed"]
    if failed_backups:
        alerts.append({
            "type": "error",
            "message": f"{len(failed_backups)} backup(s) failed in the last 24 hours",
            "severity": "high",
            "timestamp": datetime.utcnow().isoformat()
        })
    
    # Check storage connectivity
    if not connectivity.get("backblaze_b2", {}).get("available", False):
        alerts.append({
            "type": "warning",
            "message": "Backblaze B2 storage is not accessible",
            "severity": "medium",
            "timestamp": datetime.utcnow().isoformat()
        })
    
    if not connectivity.get("cloudflare_r2", {}).get("available", False):
        alerts.append({
            "type": "warning",
            "message": "Cloudflare R2 storage is not accessible",
            "severity": "medium",
            "timestamp": datetime.utcnow().isoformat()
        })
    
    # Check storage usage (warn if over 80% of expected capacity)
    for provider, usage in storage_usage.items():
        if usage.get("total_size", 0) > 80 * 1024**3:  # 80GB threshold
            alerts.append({
                "type": "info",
                "message": f"{provider} storage usage is high: {round(usage.get('total_size', 0) / (1024**3), 2)}GB",
                "severity": "low",
                "timestamp": datetime.utcnow().isoformat()
            })
    
    return alerts


def _get_last_successful_backup(backup_service: BackupService) -> Optional[Dict]:
    """Get information about the last successful backup"""
    try:
        recent_backups = backup_service.get_backups_since(datetime.utcnow() - timedelta(days=7))
        successful_backups = [b for b in recent_backups if b.get("status") == "completed"]
        
        if successful_backups:
            # Sort by creation date and get the most recent
            latest_backup = max(successful_backups, key=lambda x: x.get("created_at", ""))
            return {
                "backup_id": latest_backup.get("backup_id"),
                "backup_name": latest_backup.get("backup_name"),
                "created_at": latest_backup.get("created_at"),
                "duration_minutes": round(latest_backup.get("duration_seconds", 0) / 60, 2),
                "size_gb": round(latest_backup.get("compressed_size", 0) / (1024**3), 2)
            }
    except Exception as e:
        logger.error(f"Failed to get last successful backup: {e}")
    
    return None


def _get_next_scheduled_backup() -> Optional[Dict]:
    """Get information about the next scheduled backup"""
    # This would typically come from a scheduler service
    # For now, return a mock next backup time (daily at 2 AM)
    now = datetime.utcnow()
    next_backup = now.replace(hour=2, minute=0, second=0, microsecond=0)
    
    if next_backup <= now:
        next_backup += timedelta(days=1)
    
    return {
        "scheduled_time": next_backup.isoformat(),
        "backup_type": "daily_tenant_backup",
        "estimated_duration_minutes": 30,
        "hours_until_next": round((next_backup - now).total_seconds() / 3600, 1)
    }


def _get_system_recommendations(metrics: Dict, storage_health: Dict) -> List[str]:
    """Generate system recommendations based on metrics"""
    recommendations = []
    
    # Check success rates
    last_24h_success = metrics.get("last_24h", {}).get("success_rate", 100)
    if last_24h_success < 90:
        recommendations.append("Investigate backup failures - success rate is below 90%")
    
    # Check backup frequency
    last_24h_total = metrics.get("last_24h", {}).get("total", 0)
    if last_24h_total == 0:
        recommendations.append("No backups performed in the last 24 hours - check backup scheduling")
    
    # Check storage health
    if not storage_health.get("backblaze_b2", {}).get("healthy", True):
        recommendations.append("Review Backblaze B2 configuration and connectivity")
    
    if not storage_health.get("cloudflare_r2", {}).get("healthy", True):
        recommendations.append("Review Cloudflare R2 configuration and connectivity")
    
    # General recommendations
    if not recommendations:
        recommendations.append("Backup system is operating normally")
    
    return recommendations