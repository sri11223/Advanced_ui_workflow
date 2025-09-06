import redis.asyncio as redis
from typing import Optional, Any, Dict
import json
import asyncio
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

class RedisClient:
    """Enterprise Redis client with connection pooling and caching patterns"""
    
    def __init__(self):
        self.redis_url = settings.REDIS_URL
        self.pool = None
        self.client = None
        self.default_ttl = 3600  # 1 hour
    
    async def connect(self):
        """Initialize Redis connection pool"""
        try:
            # Skip Redis if localhost not available
            if "localhost" in self.redis_url:
                logger.info("⚠️ Redis localhost not available - using memory cache only")
                return False
                
            self.pool = redis.ConnectionPool.from_url(
                self.redis_url,
                max_connections=20,
                retry_on_timeout=True,
                decode_responses=True
            )
            self.client = redis.Redis(connection_pool=self.pool)
            
            # Test connection
            await self.client.ping()
            logger.info("✅ Redis connection established")
            return True
            
        except Exception as e:
            logger.info(f"⚠️ Redis not available - using memory cache fallback")
            return False
    
    async def get(self, key: str) -> Optional[Any]:
        """Get value from cache"""
        if not self.client:
            return None
        
        try:
            value = await self.client.get(key)
            if value:
                return json.loads(value)
            return None
        except Exception as e:
            logger.error(f"Redis GET error: {e}")
            return None
    
    async def set(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """Set value in cache with TTL"""
        if not self.client:
            return False
        
        try:
            serialized_value = json.dumps(value, default=str)
            ttl = ttl or self.default_ttl
            await self.client.setex(key, ttl, serialized_value)
            return True
        except Exception as e:
            logger.error(f"Redis SET error: {e}")
            return False
    
    async def delete(self, key: str) -> bool:
        """Delete key from cache"""
        if not self.client:
            return False
        
        try:
            result = await self.client.delete(key)
            return result > 0
        except Exception as e:
            logger.error(f"Redis DELETE error: {e}")
            return False
    
    async def exists(self, key: str) -> bool:
        """Check if key exists"""
        if not self.client:
            return False
        
        try:
            result = await self.client.exists(key)
            return result > 0
        except Exception as e:
            logger.error(f"Redis EXISTS error: {e}")
            return False
    
    async def increment(self, key: str, amount: int = 1) -> Optional[int]:
        """Increment counter"""
        if not self.client:
            return None
        
        try:
            result = await self.client.incrby(key, amount)
            return result
        except Exception as e:
            logger.error(f"Redis INCREMENT error: {e}")
            return None
    
    async def set_hash(self, key: str, mapping: Dict[str, Any], ttl: Optional[int] = None) -> bool:
        """Set hash values"""
        if not self.client:
            return False
        
        try:
            # Serialize values
            serialized_mapping = {k: json.dumps(v, default=str) for k, v in mapping.items()}
            await self.client.hset(key, mapping=serialized_mapping)
            
            if ttl:
                await self.client.expire(key, ttl)
            
            return True
        except Exception as e:
            logger.error(f"Redis HSET error: {e}")
            return False
    
    async def get_hash(self, key: str, field: Optional[str] = None) -> Optional[Any]:
        """Get hash values"""
        if not self.client:
            return None
        
        try:
            if field:
                value = await self.client.hget(key, field)
                return json.loads(value) if value else None
            else:
                values = await self.client.hgetall(key)
                return {k: json.loads(v) for k, v in values.items()} if values else None
        except Exception as e:
            logger.error(f"Redis HGET error: {e}")
            return None
    
    async def add_to_list(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """Add item to list"""
        if not self.client:
            return False
        
        try:
            serialized_value = json.dumps(value, default=str)
            await self.client.lpush(key, serialized_value)
            
            if ttl:
                await self.client.expire(key, ttl)
            
            return True
        except Exception as e:
            logger.error(f"Redis LPUSH error: {e}")
            return False
    
    async def get_list(self, key: str, start: int = 0, end: int = -1) -> Optional[list]:
        """Get list items"""
        if not self.client:
            return None
        
        try:
            values = await self.client.lrange(key, start, end)
            return [json.loads(v) for v in values] if values else []
        except Exception as e:
            logger.error(f"Redis LRANGE error: {e}")
            return None
    
    async def close(self):
        """Close Redis connection"""
        if self.client:
            await self.client.close()
        if self.pool:
            await self.pool.disconnect()

# Global Redis client instance
redis_client = RedisClient()
