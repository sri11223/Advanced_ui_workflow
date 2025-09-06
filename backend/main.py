from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.core.config import settings
from app.core.database import test_connection
from app.core.redis_client import redis_client
from app.services.ai_service import ai_service
from app.api import (
    auth_router,
    projects_router,
    wireframes_router,
    conversations_router,
    ui_components_router,
    websockets_router,
    health_router
)
import asyncio
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize and cleanup services with robust error handling"""
    logger.info("🚀 Starting Advanced UI Workflow Backend...")
    
    # Test database connection with retry logic
    db_connected = False
    for attempt in range(3):
        try:
            db_connected = await test_connection()
            if db_connected:
                logger.info("✅ Supabase cloud database connected!")
                break
            else:
                logger.warning(f"❌ Database connection attempt {attempt + 1} failed")
                if attempt < 2:
                    await asyncio.sleep(2)
        except Exception as e:
            logger.error(f"Database connection error (attempt {attempt + 1}): {e}")
            if attempt < 2:
                await asyncio.sleep(2)
    
    if not db_connected:
        logger.error("❌ Database connection failed after 3 attempts")
        logger.warning("⚠️ Backend will continue but database operations may fail")
    
    # Initialize Redis connection (gracefully handle failure)
    try:
        redis_connected = await redis_client.connect()
        if redis_connected:
            logger.info("✅ Redis cache connected!")
        else:
            logger.info("⚠️ Using memory cache fallback (Redis not available)")
    except Exception as e:
        logger.warning(f"Redis initialization error: {e}")
        logger.info("⚠️ Using memory cache fallback")
    
    logger.info("🎉 Advanced UI Workflow Backend is ready!")
    logger.info("📚 API Documentation: http://localhost:8000/docs")
    logger.info("🔄 WebSocket endpoint: ws://localhost:8000/ws")
    
    yield
    
    # Cleanup with error handling
    logger.info("🛑 Shutting down...")
    try:
        await redis_client.close()
        logger.info("✅ Redis connection closed")
    except Exception as e:
        logger.warning(f"Redis cleanup error: {e}")
    
    try:
        await ai_service.close()
        logger.info("✅ AI service closed")
    except Exception as e:
        logger.warning(f"AI service cleanup error: {e}")
    
    logger.info("✅ Cleanup completed")

app = FastAPI(
    title="Advanced UI Workflow API",
    description="Enterprise-grade backend for AI-powered wireframe generation with real-time collaboration",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(auth_router, prefix="/api/v1")
app.include_router(projects_router, prefix="/api/v1")
app.include_router(wireframes_router, prefix="/api/v1")
app.include_router(conversations_router, prefix="/api/v1")
app.include_router(ui_components_router, prefix="/api/v1")
app.include_router(health_router, prefix="/api/v1")
app.include_router(websockets_router)

@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "message": "Advanced UI Workflow API",
        "version": "1.0.0",
        "status": "running",
        "features": [
            "JWT Authentication",
            "Project Management", 
            "AI-Powered Wireframe Generation",
            "Real-time Collaboration",
            "Multi-layer Caching",
            "WebSocket Support",
            "Export to HTML/React/Figma"
        ],
        "endpoints": {
            "docs": "/docs",
            "health": "/api/v1/health",
            "websocket": "/ws"
        }
    }

@app.get("/api/v1")
async def api_info():
    """API version information"""
    return {
        "version": "1.0.0",
        "endpoints": {
            "auth": "/api/v1/auth",
            "projects": "/api/v1/projects",
            "wireframes": "/api/v1/wireframes", 
            "conversations": "/api/v1/conversations",
            "ui-components": "/api/v1/ui-components",
            "health": "/api/v1/health"
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0", 
        port=8000,
        reload=True,
        log_level="info"
    )
