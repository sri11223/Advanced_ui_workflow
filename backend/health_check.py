#!/usr/bin/env python3
"""
Health check script for Advanced UI Workflow Backend
"""
import asyncio
import sys
import os

# Add the backend directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

async def health_check():
    """Perform comprehensive health check"""
    print("🏥 Advanced UI Workflow Backend Health Check")
    print("=" * 50)
    
    checks_passed = 0
    total_checks = 4
    
    # Test 1: Database connection
    print("\n1. Database Connection...")
    try:
        from app.core.database import test_connection
        db_connected = await test_connection()
        if db_connected:
            print("   ✅ Supabase database: Connected")
            checks_passed += 1
        else:
            print("   ❌ Supabase database: Failed")
    except Exception as e:
        print(f"   ❌ Database error: {e}")
    
    # Test 2: Cache system
    print("\n2. Cache System...")
    try:
        from app.core.redis_client import redis_client
        redis_connected = await redis_client.connect()
        if redis_connected:
            print("   ✅ Redis cache: Connected")
        else:
            print("   ⚠️ Redis cache: Using memory fallback")
        checks_passed += 1
    except Exception as e:
        print(f"   ❌ Cache error: {e}")
    
    # Test 3: Core services
    print("\n3. Core Services...")
    try:
        from app.services.auth_service import AuthService
        from app.services.project_service import ProjectService
        from app.services.cache_service import cache_service
        print("   ✅ All core services: Available")
        checks_passed += 1
    except Exception as e:
        print(f"   ❌ Services error: {e}")
    
    # Test 4: API routes
    print("\n4. API Routes...")
    try:
        from app.api.health import router as health_router
        from app.api.auth import router as auth_router
        print("   ✅ API routes: Available")
        checks_passed += 1
    except Exception as e:
        print(f"   ❌ API routes error: {e}")
    
    # Summary
    print("\n" + "=" * 50)
    print(f"🎯 Health Check Results: {checks_passed}/{total_checks} passed")
    
    if checks_passed == total_checks:
        print("🎉 Backend is fully operational!")
        return True
    elif checks_passed >= 2:
        print("⚠️ Backend is partially operational")
        return True
    else:
        print("❌ Backend has critical issues")
        return False

if __name__ == "__main__":
    result = asyncio.run(health_check())
    sys.exit(0 if result else 1)
