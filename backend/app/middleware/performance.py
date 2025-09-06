"""Performance optimization middleware"""
import asyncio
import gzip
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import StreamingResponse
import time
from typing import Dict, Any
import json

class CompressionMiddleware(BaseHTTPMiddleware):
    """Compress responses to reduce bandwidth"""
    
    def __init__(self, app, minimum_size: int = 1000):
        super().__init__(app)
        self.minimum_size = minimum_size
    
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        
        # Check if client accepts gzip
        accept_encoding = request.headers.get("accept-encoding", "")
        if "gzip" not in accept_encoding:
            return response
        
        # Only compress text responses above minimum size
        content_type = response.headers.get("content-type", "")
        if not any(ct in content_type for ct in ["text/", "application/json", "application/javascript"]):
            return response
        
        # Get response body
        body = b""
        async for chunk in response.body_iterator:
            body += chunk
        
        # Compress if above minimum size
        if len(body) >= self.minimum_size:
            compressed_body = gzip.compress(body)
            response.headers["content-encoding"] = "gzip"
            response.headers["content-length"] = str(len(compressed_body))
            
            return Response(
                content=compressed_body,
                status_code=response.status_code,
                headers=dict(response.headers),
                media_type=response.media_type
            )
        
        return Response(
            content=body,
            status_code=response.status_code,
            headers=dict(response.headers),
            media_type=response.media_type
        )

class CacheControlMiddleware(BaseHTTPMiddleware):
    """Add appropriate cache headers"""
    
    CACHE_RULES = {
        "/api/v1/ui-components": "public, max-age=3600",  # 1 hour
        "/api/v1/health": "no-cache",
        "/docs": "public, max-age=86400",  # 1 day
        "/redoc": "public, max-age=86400",  # 1 day
    }
    
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        
        path = request.url.path
        
        # Apply cache rules
        for pattern, cache_header in self.CACHE_RULES.items():
            if path.startswith(pattern):
                response.headers["Cache-Control"] = cache_header
                break
        else:
            # Default: no cache for API endpoints
            if path.startswith("/api/"):
                response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
            else:
                response.headers["Cache-Control"] = "public, max-age=300"  # 5 minutes
        
        return response

class ConnectionPoolMiddleware(BaseHTTPMiddleware):
    """Monitor and optimize connection usage"""
    
    def __init__(self, app):
        super().__init__(app)
        self.active_connections = 0
        self.max_connections = 1000
    
    async def dispatch(self, request: Request, call_next):
        if self.active_connections >= self.max_connections:
            return Response(
                content="Server overloaded, please try again later",
                status_code=503
            )
        
        self.active_connections += 1
        try:
            response = await call_next(request)
            return response
        finally:
            self.active_connections -= 1
