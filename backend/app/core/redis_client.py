"""
Redis client configuration and utilities
"""

import redis
import json
import logging
from typing import Any, Optional, Union
from app.core.config import settings

logger = logging.getLogger(__name__)


class RedisClient:
    """Redis client wrapper with utility methods"""
    
    def __init__(self):
        self.redis_client = None
        self._connect()
    
    def _connect(self):
        """Initialize Redis connection"""
        try:
            self.redis_client = redis.from_url(
                settings.redis_url,
                decode_responses=True,
                socket_connect_timeout=5,
                socket_timeout=5,
                retry_on_timeout=True,
                health_check_interval=30
            )
            # Test connection
            self.redis_client.ping()
            logger.info("Redis connection established successfully")
        except Exception as e:
            logger.error(f"Failed to connect to Redis: {e}")
            raise
    
    async def check_connection(self) -> bool:
        """Check if Redis connection is healthy"""
        try:
            self.redis_client.ping()
            return True
        except Exception as e:
            logger.error(f"Redis connection check failed: {e}")
            return False
    
    def set(self, key: str, value: Any, expire: Optional[int] = None) -> bool:
        """Set a key-value pair with optional expiration"""
        try:
            if isinstance(value, (dict, list)):
                value = json.dumps(value)
            
            result = self.redis_client.set(key, value, ex=expire)
            return result
        except Exception as e:
            logger.error(f"Redis SET error for key {key}: {e}")
            return False
    
    def get(self, key: str, default: Any = None) -> Any:
        """Get value by key"""
        try:
            value = self.redis_client.get(key)
            if value is None:
                return default
            
            # Try to parse as JSON
            try:
                return json.loads(value)
            except (json.JSONDecodeError, TypeError):
                return value
        except Exception as e:
            logger.error(f"Redis GET error for key {key}: {e}")
            return default
    
    def delete(self, *keys: str) -> int:
        """Delete one or more keys"""
        try:
            return self.redis_client.delete(*keys)
        except Exception as e:
            logger.error(f"Redis DELETE error for keys {keys}: {e}")
            return 0
    
    def exists(self, key: str) -> bool:
        """Check if key exists"""
        try:
            return bool(self.redis_client.exists(key))
        except Exception as e:
            logger.error(f"Redis EXISTS error for key {key}: {e}")
            return False
    
    def expire(self, key: str, seconds: int) -> bool:
        """Set expiration for a key"""
        try:
            return bool(self.redis_client.expire(key, seconds))
        except Exception as e:
            logger.error(f"Redis EXPIRE error for key {key}: {e}")
            return False
    
    def incr(self, key: str, amount: int = 1) -> Optional[int]:
        """Increment a key's value"""
        try:
            return self.redis_client.incr(key, amount)
        except Exception as e:
            logger.error(f"Redis INCR error for key {key}: {e}")
            return None
    
    def hset(self, name: str, mapping: dict) -> int:
        """Set hash fields"""
        try:
            # Convert dict values to JSON strings if needed
            processed_mapping = {}
            for k, v in mapping.items():
                if isinstance(v, (dict, list)):
                    processed_mapping[k] = json.dumps(v)
                else:
                    processed_mapping[k] = str(v)
            
            return self.redis_client.hset(name, mapping=processed_mapping)
        except Exception as e:
            logger.error(f"Redis HSET error for hash {name}: {e}")
            return 0
    
    def hget(self, name: str, key: str) -> Any:
        """Get hash field value"""
        try:
            value = self.redis_client.hget(name, key)
            if value is None:
                return None
            
            # Try to parse as JSON
            try:
                return json.loads(value)
            except (json.JSONDecodeError, TypeError):
                return value
        except Exception as e:
            logger.error(f"Redis HGET error for hash {name}, key {key}: {e}")
            return None
    
    def hgetall(self, name: str) -> dict:
        """Get all hash fields"""
        try:
            result = self.redis_client.hgetall(name)
            # Try to parse JSON values
            processed_result = {}
            for k, v in result.items():
                try:
                    processed_result[k] = json.loads(v)
                except (json.JSONDecodeError, TypeError):
                    processed_result[k] = v
            return processed_result
        except Exception as e:
            logger.error(f"Redis HGETALL error for hash {name}: {e}")
            return {}
    
    def sadd(self, name: str, *values: str) -> int:
        """Add members to a set"""
        try:
            return self.redis_client.sadd(name, *values)
        except Exception as e:
            logger.error(f"Redis SADD error for set {name}: {e}")
            return 0
    
    def srem(self, name: str, *values: str) -> int:
        """Remove members from a set"""
        try:
            return self.redis_client.srem(name, *values)
        except Exception as e:
            logger.error(f"Redis SREM error for set {name}: {e}")
            return 0
    
    def smembers(self, name: str) -> set:
        """Get all members of a set"""
        try:
            return self.redis_client.smembers(name)
        except Exception as e:
            logger.error(f"Redis SMEMBERS error for set {name}: {e}")
            return set()
    
    def sismember(self, name: str, value: str) -> bool:
        """Check if value is member of set"""
        try:
            return bool(self.redis_client.sismember(name, value))
        except Exception as e:
            logger.error(f"Redis SISMEMBER error for set {name}: {e}")
            return False
    
    def flushdb(self) -> bool:
        """Flush current database (use with caution!)"""
        try:
            self.redis_client.flushdb()
            return True
        except Exception as e:
            logger.error(f"Redis FLUSHDB error: {e}")
            return False


# Global Redis client instance
redis_client = RedisClient()