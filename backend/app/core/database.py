from typing import Optional, List, Dict, Any
from supabase import create_client, Client
from .config import settings
import asyncio

class SupabaseDatabase:
    """Supabase cloud database service with async wrapper"""
    
    def __init__(self):
        self.client: Client = create_client(
            settings.SUPABASE_URL,
            settings.SUPABASE_SERVICE_ROLE_KEY  # Use service role for backend operations
        )
    
    # User operations
    async def create_user(self, user_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new user"""
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None, 
            lambda: self.client.table("users").insert(user_data).execute()
        )
        return result.data[0] if result.data else None
    
    async def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """Get user by email"""
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            lambda: self.client.table("users").select("*").eq("email", email).execute()
        )
        return result.data[0] if result.data else None
    
    async def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user by ID"""
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            lambda: self.client.table("users").select("*").eq("id", user_id).execute()
        )
        return result.data[0] if result.data else None
    
    # Project operations
    async def create_project(self, project_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new project"""
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            lambda: self.client.table("projects").insert(project_data).execute()
        )
        return result.data[0] if result.data else None
    
    async def get_user_projects(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all projects for a user"""
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            lambda: self.client.table("projects").select("*").eq("user_id", user_id).eq("is_active", True).execute()
        )
        return result.data or []
    
    # Wireframe operations
    async def create_wireframe(self, wireframe_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new wireframe"""
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            lambda: self.client.table("wireframes").insert(wireframe_data).execute()
        )
        return result.data[0] if result.data else None
    
    async def get_project_wireframes(self, project_id: str) -> List[Dict[str, Any]]:
        """Get all wireframes for a project"""
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            lambda: self.client.table("wireframes").select("*").eq("project_id", project_id).execute()
        )
        return result.data or []

# Global database instance
db = SupabaseDatabase()

# Dependency to get database instance
async def get_db():
    return db

# Test database connection
async def test_connection():
    """Test Supabase connection"""
    try:
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            lambda: db.client.table("users").select("count", count="exact").execute()
        )
        print("✅ Supabase cloud database connection successful!")
        return True
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return False
