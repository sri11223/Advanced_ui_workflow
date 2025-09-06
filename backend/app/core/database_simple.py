from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

# Simple connection for testing
DATABASE_URL = "postgresql+asyncpg://postgres:wireframe123%21%40%23@db.fbkddxynrmbxyiuhcssq.supabase.co:5432/postgres"

# Create async engine with simpler config
engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    pool_size=5,
    max_overflow=0
)

# Create async session factory
AsyncSessionLocal = sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

# Base class for models
Base = declarative_base()

# Test connection function
async def test_simple_connection():
    try:
        async with engine.begin() as conn:
            result = await conn.execute("SELECT 1 as test")
            row = result.fetchone()
            print(f"✅ Database connection successful! Test result: {row[0]}")
            return True
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return False
