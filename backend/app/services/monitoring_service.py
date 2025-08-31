"""
System monitoring service for health checks and performance metrics
"""

import logging
import psutil
import time
from typing import Dict, List, Any, Optional
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import text
import json

from ..core.redis_client import redis_client
from ..core.database import SessionLocal
from ..celery_app import celery_app

logger = logging.getLogger(__name__)


class MonitoringService:
    """Service for system health monitoring and performance metrics"""
    
    def __init__(self, db: Optional[Session] = None):
        self.db = db
        self.start_time = time.time()
    
    def get_system_health(self) -> Dict[str, Any]:
        """Get comprehensive system health status"""
        try:
            now = datetime.now(timezone.utc)
            
            # Check component health
            database_status = self._check_database_health()
            redis_status = self._check_redis_health()
            celery_status = self._check_celery_health()
            
            # Get system metrics
            cpu_usage = psutil.cpu_percent(interval=1)
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')
            
            # Database metrics
            db_connections, db_response_time = self._get_database_metrics()
            
            # Celery metrics
            celery_metrics = self._get_celery_metrics()
            
            # Performance metrics
            perf_metrics = self._get_performance_metrics()
            
            # Determine overall status
            status = "healthy"
            if not database_status or not redis_status or not celery_status:
                status = "unhealthy"
            elif (cpu_usage > 80 or memory.percent > 80 or disk.percent > 90 or 
                  perf_metrics["error_rate_percent"] > 5):
                status = "degraded"
            
            # Calculate uptime
            uptime_seconds = int(time.time() - self.start_time)
            
            health_data = {
                "status": status,
                "database_status": database_status,
                "redis_status": redis_status,
                "celery_status": celery_status,
                "cpu_usage_percent": round(cpu_usage, 2),
                "memory_usage_percent": round(memory.percent, 2),
                "disk_usage_percent": round(disk.percent, 2),
                "database_connections": db_connections,
                "database_response_time_ms": round(db_response_time, 2),
                "celery_active_tasks": celery_metrics["active_tasks"],
                "celery_pending_tasks": celery_metrics["pending_tasks"],
                "celery_failed_tasks": celery_metrics["failed_tasks"],
                "celery_workers": celery_metrics["workers"],
                "average_response_time_ms": perf_metrics["average_response_time_ms"],
                "requests_per_minute": perf_metrics["requests_per_minute"],
                "error_rate_percent": perf_metrics["error_rate_percent"],
                "last_health_check": now,
                "uptime_seconds": uptime_seconds
            }
            
            # Store health data in Redis for monitoring
            redis_client.set("system:health", health_data, expire=300)  # 5 minutes
            
            return health_data
            
        except Exception as e:
            logger.error(f"Failed to get system health: {e}")
            return {
                "status": "unhealthy",
                "error": str(e),
                "last_health_check": datetime.now(timezone.utc)
            }
    
    def _check_database_health(self) -> bool:
        """Check database connection and basic query performance"""
        try:
            db = SessionLocal()
            start_time = time.time()
            
            # Execute a simple query
            result = db.execute(text("SELECT 1 as health_check"))
            result.fetchone()
            
            end_time = time.time()
            response_time = (end_time - start_time) * 1000  # Convert to milliseconds
            
            db.close()
            
            # Store response time for metrics
            redis_client.set("db:last_response_time", response_time, expire=300)
            
            # Consider healthy if response time is under 100ms
            return response_time < 100
            
        except Exception as e:
            logger.error(f"Database health check failed: {e}")
            return False
    
    def _check_redis_health(self) -> bool:
        """Check Redis connection and performance"""
        try:
            start_time = time.time()
            
            # Test Redis operations
            test_key = "health_check_test"
            redis_client.set(test_key, "test_value", expire=10)
            value = redis_client.get(test_key)
            redis_client.delete(test_key)
            
            end_time = time.time()
            response_time = (end_time - start_time) * 1000
            
            # Store response time
            redis_client.set("redis:last_response_time", response_time, expire=300)
            
            return value == "test_value" and response_time < 50
            
        except Exception as e:
            logger.error(f"Redis health check failed: {e}")
            return False
    
    def _check_celery_health(self) -> bool:
        """Check Celery worker status"""
        try:
            # Get active workers
            inspect = celery_app.control.inspect()
            active_workers = inspect.active()
            
            if not active_workers:
                return False
            
            # Check if workers are responding
            stats = inspect.stats()
            return bool(stats and len(stats) > 0)
            
        except Exception as e:
            logger.error(f"Celery health check failed: {e}")
            return False
    
    def _get_database_metrics(self) -> tuple[int, float]:
        """Get database connection count and response time"""
        try:
            db = SessionLocal()
            
            # Get connection count
            result = db.execute(text("""
                SELECT count(*) as connections 
                FROM pg_stat_activity 
                WHERE state = 'active'
            """))
            connections = result.fetchone()[0]
            
            # Get last response time from Redis
            response_time = redis_client.get("db:last_response_time", 0)
            if isinstance(response_time, str):
                response_time = float(response_time)
            
            db.close()
            return connections, response_time
            
        except Exception as e:
            logger.error(f"Failed to get database metrics: {e}")
            return 0, 0.0
    
    def _get_celery_metrics(self) -> Dict[str, int]:
        """Get Celery task and worker metrics"""
        try:
            inspect = celery_app.control.inspect()
            
            # Get active tasks
            active_tasks = inspect.active() or {}
            total_active = sum(len(tasks) for tasks in active_tasks.values())
            
            # Get scheduled tasks (pending)
            scheduled_tasks = inspect.scheduled() or {}
            total_pending = sum(len(tasks) for tasks in scheduled_tasks.values())
            
            # Get worker count
            stats = inspect.stats() or {}
            worker_count = len(stats)
            
            # Get failed tasks from Redis (we'll store this separately)
            failed_tasks = redis_client.get("celery:failed_tasks_count", 0)
            if isinstance(failed_tasks, str):
                failed_tasks = int(failed_tasks)
            
            return {
                "active_tasks": total_active,
                "pending_tasks": total_pending,
                "failed_tasks": failed_tasks,
                "workers": worker_count
            }
            
        except Exception as e:
            logger.error(f"Failed to get Celery metrics: {e}")
            return {
                "active_tasks": 0,
                "pending_tasks": 0,
                "failed_tasks": 0,
                "workers": 0
            }
    
    def _get_performance_metrics(self) -> Dict[str, float]:
        """Get API performance metrics"""
        try:
            # Get metrics from Redis (these would be updated by middleware)
            avg_response_time = redis_client.get("api:avg_response_time", 0)
            requests_per_minute = redis_client.get("api:requests_per_minute", 0)
            error_rate = redis_client.get("api:error_rate", 0)
            
            # Convert to float if string
            if isinstance(avg_response_time, str):
                avg_response_time = float(avg_response_time)
            if isinstance(requests_per_minute, str):
                requests_per_minute = float(requests_per_minute)
            if isinstance(error_rate, str):
                error_rate = float(error_rate)
            
            return {
                "average_response_time_ms": avg_response_time,
                "requests_per_minute": requests_per_minute,
                "error_rate_percent": error_rate
            }
            
        except Exception as e:
            logger.error(f"Failed to get performance metrics: {e}")
            return {
                "average_response_time_ms": 0.0,
                "requests_per_minute": 0.0,
                "error_rate_percent": 0.0
            }
    
    def get_celery_monitoring(self) -> Dict[str, Any]:
        """Get detailed Celery monitoring information"""
        try:
            inspect = celery_app.control.inspect()
            
            # Get active tasks with details
            active_tasks_raw = inspect.active() or {}
            active_tasks = []
            for worker, tasks in active_tasks_raw.items():
                for task in tasks:
                    active_tasks.append({
                        "task_id": task.get("id"),
                        "task_name": task.get("name"),
                        "state": "ACTIVE",
                        "worker": worker,
                        "timestamp": datetime.fromtimestamp(task.get("time_start", 0), tz=timezone.utc) if task.get("time_start") else None,
                        "runtime": time.time() - task.get("time_start", time.time()) if task.get("time_start") else None,
                        "args": task.get("args"),
                        "kwargs": task.get("kwargs")
                    })
            
            # Get scheduled tasks
            scheduled_tasks_raw = inspect.scheduled() or {}
            pending_tasks = []
            for worker, tasks in scheduled_tasks_raw.items():
                for task in tasks:
                    pending_tasks.append({
                        "task_id": task.get("request", {}).get("id"),
                        "task_name": task.get("request", {}).get("task"),
                        "state": "PENDING",
                        "worker": worker,
                        "timestamp": datetime.fromtimestamp(task.get("eta", 0), tz=timezone.utc) if task.get("eta") else None,
                        "args": task.get("request", {}).get("args"),
                        "kwargs": task.get("request", {}).get("kwargs")
                    })
            
            # Get worker information
            stats = inspect.stats() or {}
            workers = []
            for worker_name, worker_stats in stats.items():
                workers.append({
                    "name": worker_name,
                    "status": "online",
                    "processed_tasks": worker_stats.get("total", {}).get("tasks.total", 0),
                    "active_tasks": len(active_tasks_raw.get(worker_name, [])),
                    "load_avg": worker_stats.get("rusage", {}).get("utime", 0),
                    "memory_usage": worker_stats.get("rusage", {}).get("maxrss", 0)
                })
            
            # Get recent failed and completed tasks from Redis
            failed_tasks = self._get_recent_failed_tasks()
            completed_tasks = self._get_recent_completed_tasks()
            
            # Calculate performance metrics
            total_active = len(active_tasks)
            total_pending = len(pending_tasks)
            total_failed = len(failed_tasks)
            total_completed = len(completed_tasks)
            
            # Calculate average task duration from completed tasks
            avg_duration = 0.0
            if completed_tasks:
                durations = [task.get("runtime", 0) for task in completed_tasks if task.get("runtime")]
                avg_duration = sum(durations) / len(durations) if durations else 0.0
            
            # Calculate tasks per minute (simplified)
            tasks_per_minute = total_completed  # This would be more sophisticated in production
            
            # Calculate failure rate
            total_tasks = total_completed + total_failed
            failure_rate = (total_failed / total_tasks * 100) if total_tasks > 0 else 0.0
            
            return {
                "active_tasks": active_tasks,
                "pending_tasks": pending_tasks,
                "failed_tasks": failed_tasks,
                "completed_tasks": completed_tasks,
                "total_active": total_active,
                "total_pending": total_pending,
                "total_failed": total_failed,
                "total_completed": total_completed,
                "active_workers": workers,
                "worker_count": len(workers),
                "average_task_duration": round(avg_duration, 2),
                "tasks_per_minute": tasks_per_minute,
                "failure_rate": round(failure_rate, 2),
                "last_updated": datetime.now(timezone.utc)
            }
            
        except Exception as e:
            logger.error(f"Failed to get Celery monitoring data: {e}")
            return {
                "active_tasks": [],
                "pending_tasks": [],
                "failed_tasks": [],
                "completed_tasks": [],
                "total_active": 0,
                "total_pending": 0,
                "total_failed": 0,
                "total_completed": 0,
                "active_workers": [],
                "worker_count": 0,
                "average_task_duration": 0.0,
                "tasks_per_minute": 0.0,
                "failure_rate": 0.0,
                "last_updated": datetime.now(timezone.utc)
            }
    
    def _get_recent_failed_tasks(self) -> List[Dict[str, Any]]:
        """Get recent failed tasks from Redis"""
        try:
            # This would be populated by Celery task failure handlers
            failed_tasks_data = redis_client.get("celery:recent_failed_tasks", [])
            if isinstance(failed_tasks_data, str):
                failed_tasks_data = json.loads(failed_tasks_data)
            
            return failed_tasks_data if isinstance(failed_tasks_data, list) else []
            
        except Exception as e:
            logger.error(f"Failed to get recent failed tasks: {e}")
            return []
    
    def _get_recent_completed_tasks(self) -> List[Dict[str, Any]]:
        """Get recent completed tasks from Redis"""
        try:
            # This would be populated by Celery task success handlers
            completed_tasks_data = redis_client.get("celery:recent_completed_tasks", [])
            if isinstance(completed_tasks_data, str):
                completed_tasks_data = json.loads(completed_tasks_data)
            
            return completed_tasks_data if isinstance(completed_tasks_data, list) else []
            
        except Exception as e:
            logger.error(f"Failed to get recent completed tasks: {e}")
            return []
    
    def record_api_metrics(self, endpoint: str, method: str, response_time_ms: float, 
                          status_code: int, tenant_id: Optional[str] = None):
        """Record API performance metrics"""
        try:
            now = datetime.now(timezone.utc)
            minute_key = f"api:metrics:{now.strftime('%Y-%m-%d:%H:%M')}"
            
            # Increment request count
            redis_client.incr(f"{minute_key}:requests")
            redis_client.expire(f"{minute_key}:requests", 3600)  # 1 hour
            
            # Track response times
            response_times_key = f"{minute_key}:response_times"
            current_times = redis_client.get(response_times_key, [])
            if isinstance(current_times, str):
                current_times = json.loads(current_times)
            elif not isinstance(current_times, list):
                current_times = []
            
            current_times.append(response_time_ms)
            redis_client.set(response_times_key, current_times, expire=3600)
            
            # Track errors
            if status_code >= 400:
                redis_client.incr(f"{minute_key}:errors")
                redis_client.expire(f"{minute_key}:errors", 3600)
            
            # Update rolling averages
            self._update_rolling_metrics()
            
        except Exception as e:
            logger.error(f"Failed to record API metrics: {e}")
    
    def _update_rolling_metrics(self):
        """Update rolling average metrics"""
        try:
            now = datetime.now(timezone.utc)
            
            # Calculate metrics for last 5 minutes
            total_requests = 0
            total_errors = 0
            all_response_times = []
            
            for i in range(5):
                minute = now - timedelta(minutes=i)
                minute_key = f"api:metrics:{minute.strftime('%Y-%m-%d:%H:%M')}"
                
                requests = redis_client.get(f"{minute_key}:requests", 0)
                errors = redis_client.get(f"{minute_key}:errors", 0)
                response_times = redis_client.get(f"{minute_key}:response_times", [])
                
                if isinstance(requests, str):
                    requests = int(requests)
                if isinstance(errors, str):
                    errors = int(errors)
                if isinstance(response_times, str):
                    response_times = json.loads(response_times)
                elif not isinstance(response_times, list):
                    response_times = []
                
                total_requests += requests
                total_errors += errors
                all_response_times.extend(response_times)
            
            # Calculate averages
            avg_response_time = sum(all_response_times) / len(all_response_times) if all_response_times else 0
            requests_per_minute = total_requests / 5 if total_requests > 0 else 0
            error_rate = (total_errors / total_requests * 100) if total_requests > 0 else 0
            
            # Store rolling metrics
            redis_client.set("api:avg_response_time", avg_response_time, expire=300)
            redis_client.set("api:requests_per_minute", requests_per_minute, expire=300)
            redis_client.set("api:error_rate", error_rate, expire=300)
            
        except Exception as e:
            logger.error(f"Failed to update rolling metrics: {e}")