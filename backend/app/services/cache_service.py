from typing import Optional, Any, Dict, List
from app.core.redis_client import redis_client
import hashlib
import json
from datetime import datetime, timedelta
import asyncio

class CacheService:
    """Enterprise multi-layer caching service with Redis + in-memory fallback"""
    
    def __init__(self):
        self.memory_cache = {}  # In-memory fallback
        self.memory_ttl = {}    # TTL tracking for memory cache
        self.max_memory_items = 1000
        
        # Cache key prefixes
        self.prefixes = {
            "user": "user:",
            "project": "project:",
            "wireframe": "wireframe:",
            "conversation": "conversation:",
            "ui_component": "ui_component:",
            "ai_response": "ai_response:",
            "session": "session:"
        }
    
    def _generate_cache_key(self, prefix: str, identifier: str, suffix: str = None) -> str:
        """Generate standardized cache key"""
        key = f"{self.prefixes.get(prefix, prefix)}{identifier}"
        if suffix:
            key += f":{suffix}"
        return key
    
    def _generate_content_hash(self, data: Any) -> str:
        """Generate hash for content-based caching"""
        content_str = json.dumps(data, sort_keys=True, default=str)
        return hashlib.md5(content_str.encode()).hexdigest()[:12]
    
    async def get(self, cache_type: str, identifier: str, suffix: str = None) -> Optional[Any]:
        """Get from cache with Redis + memory fallback"""
        key = self._generate_cache_key(cache_type, identifier, suffix)
        
        # Try Redis first
        value = await redis_client.get(key)
        if value is not None:
            return value
        
        # Fallback to memory cache
        return self._get_from_memory(key)
    
    async def set(self, cache_type: str, identifier: str, value: Any, ttl: int = 3600, suffix: str = None) -> bool:
        """Set in cache with Redis + memory backup"""
        key = self._generate_cache_key(cache_type, identifier, suffix)
        
        # Set in Redis
        redis_success = await redis_client.set(key, value, ttl)
        
        # Always set in memory as backup
        self._set_in_memory(key, value, ttl)
        
        return redis_success
    
    async def delete(self, cache_type: str, identifier: str, suffix: str = None) -> bool:
        """Delete from cache"""
        key = self._generate_cache_key(cache_type, identifier, suffix)
        
        # Delete from Redis
        redis_success = await redis_client.delete(key)
        
        # Delete from memory
        self._delete_from_memory(key)
        
        return redis_success
    
    async def cache_user_data(self, user_id: str, user_data: Dict[str, Any], ttl: int = 1800) -> bool:
        """Cache user data"""
        return await self.set("user", user_id, user_data, ttl)
    
    async def get_user_data(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get cached user data"""
        return await self.get("user", user_id)
    
    async def cache_project_data(self, project_id: str, project_data: Dict[str, Any], ttl: int = 3600) -> bool:
        """Cache project data"""
        return await self.set("project", project_id, project_data, ttl)
    
    async def get_project_data(self, project_id: str) -> Optional[Dict[str, Any]]:
        """Get cached project data"""
        return await self.get("project", project_id)
    
    async def cache_wireframe_data(self, wireframe_id: str, wireframe_data: Dict[str, Any], ttl: int = 7200) -> bool:
        """Cache wireframe data"""
        return await self.set("wireframe", wireframe_id, wireframe_data, ttl)
    
    async def get_wireframe_data(self, wireframe_id: str) -> Optional[Dict[str, Any]]:
        """Get cached wireframe data"""
        return await self.get("wireframe", wireframe_id)
    
    async def cache_ai_response(self, prompt_hash: str, response: Dict[str, Any], ttl: int = 86400) -> bool:
        """Cache AI response for similar prompts"""
        return await self.set("ai_response", prompt_hash, response, ttl)
    
    async def get_cached_ai_response(self, prompt: str) -> Optional[Dict[str, Any]]:
        """Get cached AI response"""
        prompt_hash = self._generate_content_hash(prompt)
        return await self.get("ai_response", prompt_hash)
    
    async def cache_ui_components(self, category: str, components: List[Dict[str, Any]], ttl: int = 3600) -> bool:
        """Cache UI components by category"""
        return await self.set("ui_component", category, components, ttl)
    
    async def get_cached_ui_components(self, category: str) -> Optional[List[Dict[str, Any]]]:
        """Get cached UI components"""
        return await self.get("ui_component", category)
    
    async def cache_session_data(self, session_token: str, session_data: Dict[str, Any], ttl: int = 1800) -> bool:
        """Cache session data"""
        return await self.set("session", session_token, session_data, ttl)
    
    async def get_session_data(self, session_token: str) -> Optional[Dict[str, Any]]:
        """Get cached session data"""
        return await self.get("session", session_token)
    
    async def invalidate_user_cache(self, user_id: str) -> bool:
        """Invalidate all user-related cache"""
        tasks = [
            self.delete("user", user_id),
            self.delete("session", f"user_{user_id}")
        ]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        return any(results)
    
    async def invalidate_project_cache(self, project_id: str) -> bool:
        """Invalidate project-related cache"""
        return await self.delete("project", project_id)
    
    def _get_from_memory(self, key: str) -> Optional[Any]:
        """Get from in-memory cache"""
        if key not in self.memory_cache:
            return None
        
        # Check TTL
        if key in self.memory_ttl:
            if datetime.now() > self.memory_ttl[key]:
                self._delete_from_memory(key)
                return None
        
        return self.memory_cache[key]
    
    def _set_in_memory(self, key: str, value: Any, ttl: int):
        """Set in in-memory cache with TTL"""
        # Evict old items if cache is full
        if len(self.memory_cache) >= self.max_memory_items:
            self._evict_oldest_memory_items()
        
        self.memory_cache[key] = value
        self.memory_ttl[key] = datetime.now() + timedelta(seconds=ttl)
    
    def _delete_from_memory(self, key: str):
        """Delete from in-memory cache"""
        self.memory_cache.pop(key, None)
        self.memory_ttl.pop(key, None)
    
    def _evict_oldest_memory_items(self):
        """Evict oldest items from memory cache"""
        # Remove expired items first
        now = datetime.now()
        expired_keys = [k for k, ttl in self.memory_ttl.items() if now > ttl]
        for key in expired_keys:
            self._delete_from_memory(key)
        
        # If still too many items, remove oldest
        if len(self.memory_cache) >= self.max_memory_items:
            # Remove 10% of items (simple LRU approximation)
            items_to_remove = max(1, len(self.memory_cache) // 10)
            keys_to_remove = list(self.memory_cache.keys())[:items_to_remove]
            for key in keys_to_remove:
                self._delete_from_memory(key)
    
    async def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        memory_items = len(self.memory_cache)
        expired_items = sum(1 for ttl in self.memory_ttl.values() if datetime.now() > ttl)
        
        return {
            "memory_cache_items": memory_items,
            "memory_expired_items": expired_items,
            "memory_active_items": memory_items - expired_items,
            "redis_connected": redis_client.client is not None
        }

# Global cache service instance
cache_service = CacheService()
