"""Async utilities and helpers for better performance"""
import asyncio
from typing import List, Callable, Any, Optional, Dict
from concurrent.futures import ThreadPoolExecutor
import time
import logging

logger = logging.getLogger(__name__)

class AsyncBatch:
    """Batch async operations for better performance"""
    
    def __init__(self, batch_size: int = 10, max_wait_time: float = 1.0):
        self.batch_size = batch_size
        self.max_wait_time = max_wait_time
        self.pending_operations: List[tuple] = []
        self.last_batch_time = time.time()
        
    async def add_operation(self, func: Callable, *args, **kwargs) -> Any:
        """Add operation to batch"""
        future = asyncio.Future()
        self.pending_operations.append((func, args, kwargs, future))
        
        # Process batch if size reached or timeout exceeded
        if (len(self.pending_operations) >= self.batch_size or 
            time.time() - self.last_batch_time >= self.max_wait_time):
            await self._process_batch()
        
        return await future
    
    async def _process_batch(self):
        """Process current batch of operations"""
        if not self.pending_operations:
            return
        
        operations = self.pending_operations.copy()
        self.pending_operations.clear()
        self.last_batch_time = time.time()
        
        # Execute all operations concurrently
        tasks = []
        for func, args, kwargs, future in operations:
            task = asyncio.create_task(self._execute_with_future(func, args, kwargs, future))
            tasks.append(task)
        
        await asyncio.gather(*tasks, return_exceptions=True)
    
    async def _execute_with_future(self, func: Callable, args: tuple, kwargs: dict, future: asyncio.Future):
        """Execute function and set result on future"""
        try:
            if asyncio.iscoroutinefunction(func):
                result = await func(*args, **kwargs)
            else:
                result = func(*args, **kwargs)
            future.set_result(result)
        except Exception as e:
            future.set_exception(e)

class AsyncCache:
    """Simple async cache with TTL"""
    
    def __init__(self, default_ttl: int = 300):
        self.cache: Dict[str, tuple] = {}  # key -> (value, expiry_time)
        self.default_ttl = default_ttl
        
    async def get(self, key: str) -> Optional[Any]:
        """Get value from cache"""
        if key in self.cache:
            value, expiry = self.cache[key]
            if time.time() < expiry:
                return value
            else:
                del self.cache[key]
        return None
    
    async def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        """Set value in cache"""
        ttl = ttl or self.default_ttl
        expiry = time.time() + ttl
        self.cache[key] = (value, expiry)
    
    async def delete(self, key: str) -> None:
        """Delete key from cache"""
        self.cache.pop(key, None)
    
    async def clear_expired(self) -> None:
        """Clear expired entries"""
        current_time = time.time()
        expired_keys = [
            key for key, (_, expiry) in self.cache.items() 
            if current_time >= expiry
        ]
        for key in expired_keys:
            del self.cache[key]

async def run_in_thread_pool(func: Callable, *args, max_workers: int = 4, **kwargs) -> Any:
    """Run CPU-intensive function in thread pool"""
    loop = asyncio.get_event_loop()
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        return await loop.run_in_executor(executor, func, *args)

async def timeout_after(seconds: float, coro):
    """Add timeout to coroutine"""
    try:
        return await asyncio.wait_for(coro, timeout=seconds)
    except asyncio.TimeoutError:
        logger.warning(f"Operation timed out after {seconds} seconds")
        raise

async def gather_with_limit(limit: int, *coros):
    """Gather coroutines with concurrency limit"""
    semaphore = asyncio.Semaphore(limit)
    
    async def limited_coro(coro):
        async with semaphore:
            return await coro
    
    return await asyncio.gather(*[limited_coro(coro) for coro in coros])

class AsyncRateLimiter:
    """Rate limiter for async operations"""
    
    def __init__(self, max_calls: int, time_window: float):
        self.max_calls = max_calls
        self.time_window = time_window
        self.calls: List[float] = []
        self.lock = asyncio.Lock()
    
    async def acquire(self):
        """Acquire permission to make a call"""
        async with self.lock:
            now = time.time()
            
            # Remove old calls outside time window
            self.calls = [call_time for call_time in self.calls if now - call_time < self.time_window]
            
            if len(self.calls) >= self.max_calls:
                # Calculate wait time
                oldest_call = min(self.calls)
                wait_time = self.time_window - (now - oldest_call)
                await asyncio.sleep(wait_time)
                return await self.acquire()
            
            self.calls.append(now)
            return True
