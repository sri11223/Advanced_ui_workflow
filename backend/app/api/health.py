from fastapi import APIRouter, Depends
from typing import Dict, Any
from app.core.database import test_connection
from app.core.redis_client import redis_client
from app.services.cache_service import cache_service
from app.core.websocket_manager import websocket_manager
import asyncio
from datetime import datetime

router = APIRouter(prefix="/health", tags=["health"])

@router.get("/")
async def health_check():
    """Basic health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "Advanced UI Workflow Backend"
    }

@router.get("/detailed")
async def detailed_health_check():
    """Detailed health check with all service statuses"""
    
    # Test database connection
    db_healthy = await test_connection()
    
    # Test Redis connection
    redis_healthy = redis_client.client is not None
    if redis_healthy:
        try:
            await redis_client.client.ping()
        except:
            redis_healthy = False
    
    # Get cache statistics
    cache_stats = await cache_service.get_cache_stats()
    
    # Get WebSocket statistics
    ws_stats = await websocket_manager.get_connection_stats()
    
    return {
        "status": "healthy" if db_healthy else "degraded",
        "timestamp": datetime.utcnow().isoformat(),
        "services": {
            "database": {
                "status": "healthy" if db_healthy else "unhealthy",
                "type": "supabase_cloud"
            },
            "redis": {
                "status": "healthy" if redis_healthy else "unhealthy",
                "connected": redis_healthy
            },
            "cache": {
                "status": "healthy",
                "stats": cache_stats
            },
            "websockets": {
                "status": "healthy",
                "stats": ws_stats
            }
        }
    }

@router.get("/metrics")
async def get_metrics():
    """Get application metrics"""
    
    # Get cache statistics
    cache_stats = await cache_service.get_cache_stats()
    
    # Get WebSocket statistics
    ws_stats = await websocket_manager.get_connection_stats()
    
    return {
        "timestamp": datetime.utcnow().isoformat(),
        "metrics": {
            "cache": cache_stats,
            "websockets": ws_stats,
            "uptime": "healthy"
        }
    }
