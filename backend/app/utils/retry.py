"""Retry utilities with exponential backoff"""
import asyncio
import time
import random
from typing import Callable, Any, Optional, Type
from functools import wraps
import logging

logger = logging.getLogger(__name__)

class RetryConfig:
    """Configuration for retry behavior"""
    
    def __init__(
        self,
        max_attempts: int = 3,
        base_delay: float = 1.0,
        max_delay: float = 60.0,
        exponential_base: float = 2.0,
        jitter: bool = True,
        exceptions: tuple = (Exception,)
    ):
        self.max_attempts = max_attempts
        self.base_delay = base_delay
        self.max_delay = max_delay
        self.exponential_base = exponential_base
        self.jitter = jitter
        self.exceptions = exceptions

def calculate_delay(attempt: int, config: RetryConfig) -> float:
    """Calculate delay for retry attempt"""
    delay = config.base_delay * (config.exponential_base ** attempt)
    delay = min(delay, config.max_delay)
    
    if config.jitter:
        delay *= (0.5 + random.random() * 0.5)  # Add 0-50% jitter
    
    return delay

async def retry_async(func: Callable, config: RetryConfig, *args, **kwargs) -> Any:
    """Retry async function with exponential backoff"""
    last_exception = None
    
    for attempt in range(config.max_attempts):
        try:
            return await func(*args, **kwargs)
        except config.exceptions as e:
            last_exception = e
            
            if attempt == config.max_attempts - 1:
                logger.error(f"Function {func.__name__} failed after {config.max_attempts} attempts: {e}")
                break
            
            delay = calculate_delay(attempt, config)
            logger.warning(f"Attempt {attempt + 1} failed for {func.__name__}, retrying in {delay:.2f}s: {e}")
            await asyncio.sleep(delay)
    
    raise last_exception

def retry_sync(func: Callable, config: RetryConfig, *args, **kwargs) -> Any:
    """Retry sync function with exponential backoff"""
    last_exception = None
    
    for attempt in range(config.max_attempts):
        try:
            return func(*args, **kwargs)
        except config.exceptions as e:
            last_exception = e
            
            if attempt == config.max_attempts - 1:
                logger.error(f"Function {func.__name__} failed after {config.max_attempts} attempts: {e}")
                break
            
            delay = calculate_delay(attempt, config)
            logger.warning(f"Attempt {attempt + 1} failed for {func.__name__}, retrying in {delay:.2f}s: {e}")
            time.sleep(delay)
    
    raise last_exception

def with_retry(config: RetryConfig):
    """Decorator for automatic retry with exponential backoff"""
    def decorator(func: Callable):
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            return await retry_async(func, config, *args, **kwargs)
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            return retry_sync(func, config, *args, **kwargs)
        
        return async_wrapper if asyncio.iscoroutinefunction(func) else sync_wrapper
    
    return decorator
