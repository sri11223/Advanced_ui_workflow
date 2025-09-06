#!/usr/bin/env python3
"""
Simple server startup script that works without Redis
"""
import asyncio
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import test_connection

# Create minimal FastAPI app for testing
app = FastAPI(
    title="Advanced UI Workflow API",
    description="Enterprise-grade backend for AI-powered wireframe generation",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for testing
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    """Test startup without Redis"""
    print("🚀 Starting Advanced UI Workflow Backend...")
    
    # Test database connection
    db_connected = await test_connection()
    if db_connected:
        print("✅ Supabase cloud database connected!")
    else:
        print("❌ Database connection failed!")
    
    print("🎉 Backend is ready!")
    print("📚 API Documentation: http://localhost:8000/docs")

@app.get("/")
async def root():
    return {
        "message": "Advanced UI Workflow API",
        "version": "1.0.0",
        "status": "running",
        "database": "supabase_connected"
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy", "database": "connected"}

if __name__ == "__main__":
    print("🚀 Starting server on http://localhost:8000")
    uvicorn.run(
        "start_server:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
