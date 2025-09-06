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
    
    async def get_project_by_id(self, project_id: str) -> Optional[Dict[str, Any]]:
        """Get project by ID"""
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            lambda: self.client.table("projects").select("*").eq("id", project_id).execute()
        )
        return result.data[0] if result.data else None
    
    async def get_wireframe_by_id(self, wireframe_id: str) -> Optional[Dict[str, Any]]:
        """Get wireframe by ID"""
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            lambda: self.client.table("wireframes").select("*").eq("id", wireframe_id).execute()
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
    
    # Conversation operations
    async def create_conversation(self, conversation_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new conversation"""
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            lambda: self.client.table("conversations").insert(conversation_data).execute()
        )
        return result.data[0] if result.data else None
    
    async def get_conversation_by_id(self, conversation_id: str) -> Optional[Dict[str, Any]]:
        """Get conversation by ID"""
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            lambda: self.client.table("conversations").select("*").eq("id", conversation_id).execute()
        )
        return result.data[0] if result.data else None
    
    async def get_project_conversations(self, project_id: str) -> List[Dict[str, Any]]:
        """Get all conversations for a project"""
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            lambda: self.client.table("conversations").select("*").eq("project_id", project_id).execute()
        )
        return result.data or []
    
    # UI Components operations
    async def get_ui_components(self, category: str = None) -> List[Dict[str, Any]]:
        """Get UI components, optionally filtered by category"""
        loop = asyncio.get_event_loop()
        if category:
            result = await loop.run_in_executor(
                None,
                lambda: self.client.table("ui_components").select("*").eq("category", category).execute()
            )
        else:
            result = await loop.run_in_executor(
                None,
                lambda: self.client.table("ui_components").select("*").execute()
            )
        return result.data or []
    
    async def create_ui_component(self, component_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new UI component"""
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            lambda: self.client.table("ui_components").insert(component_data).execute()
        )
        return result.data[0] if result.data else None
    
    # User Profile operations
    async def create_user_profile(self, profile_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new user profile"""
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            lambda: self.client.table("user_profiles").insert(profile_data).execute()
        )
        return result.data[0] if result.data else None
    
    async def get_user_profile(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user profile by user ID"""
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            lambda: self.client.table("user_profiles").select("*").eq("user_id", user_id).execute()
        )
        return result.data[0] if result.data else None
    
    # Context Brief operations
    async def create_context_brief(self, brief_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new context brief"""
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            lambda: self.client.table("context_briefs").insert(brief_data).execute()
        )
        return result.data[0] if result.data else None
    
    # Export operations
    async def create_export(self, export_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new export"""
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            lambda: self.client.table("exports").insert(export_data).execute()
        )
        return result.data[0] if result.data else None
    
    async def update_wireframe(self, wireframe_id: str, wireframe_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update wireframe data"""
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            lambda: self.client.table("wireframes").update(wireframe_data).eq("id", wireframe_id).execute()
        )
        return result.data[0] if result.data else None
    
    async def create_wireframe_version(self, version_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new wireframe version"""
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            lambda: self.client.table("wireframe_versions").insert(version_data).execute()
        )
        return result.data[0] if result.data else None

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
